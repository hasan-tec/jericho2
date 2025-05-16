'use client';

import { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { supabase } from '@/lib/supabaseClient';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'; // Using a well-maintained fork
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, GripVertical, Loader2, AlertCircle, Bug, CheckSquare, Bookmark } from 'lucide-react'; // Added Bug, CheckSquare, Bookmark for task types
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Task {
  id: string;
  title: string;
  status: string;
  assignee?: string | null; // Make assignee optional and allow null
  description?: string;
  type?: string;
  order: number;
  profile?: { full_name?: string | null; avatar_url?: string | null } | null; // Nested profile type
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

// Helper to get initials for avatar
const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U'; // Unassigned
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

const getTypeIcon = (type: Task['type']) => {
  switch (type) {
    case 'Bug':
      return <Bug className="h-4 w-4 text-red-500" />;
    case 'Feature':
      return <Bookmark className="h-4 w-4 text-blue-500" />;
    case 'Task':
      return <CheckSquare className="h-4 w-4 text-green-500" />;
    default:
      return null;
  }
};

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensure DND only runs on client
  }, []);

  const fetchTasks = useCallback(async () => { // Wrapped in useCallback
    setLoading(true);
    setError(null);
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('order', { ascending: true });

      if (tasksError) throw tasksError;

      const newTasks: Record<string, Task[]> = {};
      (tasksData || []).forEach((task: Task) => {
        if (!newTasks[task.status]) {
          newTasks[task.status] = [];
        }
        newTasks[task.status].push(task);
      });

      Object.keys(newTasks).forEach(status => {
        newTasks[status].sort((a, b) => a.order - b.order);
      });

      setTasks(newTasks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      console.error("Error fetching tasks:", e);
    } finally {
      setLoading(false);
    }
  }, []); // Added dependency array for useCallback

  const fetchUsers = useCallback(async () => { // Wrapped in useCallback
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');

      if (profilesError) throw profilesError;

      setProfiles(profilesData || []);
    } catch (e: unknown) {
      console.error("Error fetching profiles:", e);
    }
  }, []); // Added dependency array for useCallback

  useEffect(() => {
    const tasksChannel = supabase
      .channel('tasks-board-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    // Fetch initial tasks
    fetchTasks();
    fetchUsers();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [fetchTasks, fetchUsers]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // If dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const startColumnStatus = source.droppableId;
    const endColumnStatus = destination.droppableId;

    const startTasks = Array.from(tasks[startColumnStatus] || []);
    const [movedTask] = startTasks.splice(source.index, 1);

    // Optimistic update for UI
    const newTasksState = { ...tasks };
    newTasksState[startColumnStatus] = startTasks;

    if (startColumnStatus === endColumnStatus) {
      // Moved within the same column
      startTasks.splice(destination.index, 0, movedTask);
      newTasksState[startColumnStatus] = startTasks.map((task, index) => ({ ...task, order: index }));
    } else {
      // Moved to a different column
      const endTasks = Array.from(tasks[endColumnStatus] || []);
      endTasks.splice(destination.index, 0, { ...movedTask, status: endColumnStatus });
      newTasksState[endColumnStatus] = endTasks.map((task, index) => ({ ...task, order: index }));
      // Update order for source column as well
      newTasksState[startColumnStatus] = startTasks.map((task, index) => ({ ...task, order: index }));
    }
    setTasks(newTasksState);

    // Update database
    try {
      if (startColumnStatus === endColumnStatus) {
        // Reorder within the same column
        const updates = newTasksState[startColumnStatus].map(task => ({ id: task.id, order: task.order }));
        await supabase.from('tasks').upsert(updates);
      } else {
        // Update status and order for moved task, and reorder both columns
        const movedTaskUpdate = { id: draggableId, status: endColumnStatus, order: destination.index };
        const sourceColumnUpdates = newTasksState[startColumnStatus].map(task => ({ id: task.id, order: task.order }));
        const destinationColumnUpdates = newTasksState[endColumnStatus].map(task => ({ id: task.id, order: task.order }));

        await supabase.from('tasks').upsert([movedTaskUpdate, ...sourceColumnUpdates, ...destinationColumnUpdates]);
      }
    } catch (err: unknown) {
      console.error('Error updating task order/status:', err);
      fetchTasks();
      if (err instanceof Error) {
        alert(`Error updating task: ${err.message}`);
      } else {
        alert('An unexpected error occurred.');
      }
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (loading && Object.keys(tasks).length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-semibold">Error loading Kanban board</p>
        <p className="text-sm">{error}</p>
        <Button variant="outline" onClick={fetchTasks} className="mt-4">
          Try Reloading
        </Button>
      </div>
    );
  }

  const profileMap = new Map(profiles.map(p => [p.full_name, p]));

  return (
    <div className="p-4 md:p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kanban Board</h1>
        <Button asChild>
          <Link href="/tasks/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Task
          </Link>
        </Button>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive/50 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {Object.keys(tasks).map(status => {
            const columnTasks = tasks[status] || [];
            return (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <Card
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col min-h-[200px] transition-colors duration-200 ease-in-out 
                              ${snapshot.isDraggingOver ? 'bg-primary/10' : 'bg-card'}`}
                  >
                    <CardHeader className="border-b sticky top-0 bg-card z-10 py-3 px-4">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {status}
                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {columnTasks.length}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-2 flex-grow overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center text-sm text-muted-foreground py-10">
                          Drag tasks here or create new ones.
                        </div>
                      )}
                      {columnTasks.map((task, index) => {
                        const assigneeName = task.assignee || 'Unassigned';
                        const assigneeProfile = profileMap.get(assigneeName);
                        const avatarUrl = assigneeProfile?.avatar_url;

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-3 shadow-sm hover:shadow-md transition-shadow 
                                        ${snapshot.isDragging ? 'bg-primary/20 ring-2 ring-primary' : 'bg-card'}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <Link href={`/tasks/${task.id}`}>
                                    <span className="font-medium hover:underline text-sm leading-tight">
                                      {task.title}
                                    </span>
                                  </Link>
                                  <div {...provided.dragHandleProps} className="ml-2 p-1 -mr-1 -mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                </div>

                                {task.description && (
                                  <p className="text-xs text-muted-foreground mb-2 truncate">
                                    {task.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    {getTypeIcon(task.type)}
                                    <Badge variant={task.type === 'Bug' ? 'destructive' : task.type === 'Feature' ? 'default' : 'secondary'} className="text-xs px-1.5 py-0.5">
                                      {task.type}
                                    </Badge>
                                    <span className="font-mono text-[10px]">ID-{task.id.substring(0, 4)}</span>
                                  </div>
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={avatarUrl || `https://ui-avatars.com/api/?name=${assigneeName}&background=random&size=64`} />
                                    <AvatarFallback>{getInitials(assigneeName)}</AvatarFallback>
                                  </Avatar>
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </CardContent>
                  </Card>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

