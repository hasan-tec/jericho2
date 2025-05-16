'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'; // Using a well-maintained fork
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added CardDescription
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, GripVertical, Loader2, AlertCircle, Bug, CheckSquare, Bookmark } from 'lucide-react'; // Added Bug, CheckSquare, Bookmark for task types
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  type: 'Bug' | 'Feature' | 'Task';
  assignee: string | null; // For now, just a name. Later, could be a user ID.
  status: 'To Do' | 'In Progress' | 'Done';
  order: number; // To maintain order within columns
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TaskUpdate {
  id: string;
  order: number;
  status: Task['status'];
  updated_at: string;
}

interface Column {
  id: 'To Do' | 'In Progress' | 'Done';
  title: string;
  tasks: Task[];
}

const initialColumns: Record<'To Do' | 'In Progress' | 'Done', Column> = {
  'To Do': {
    id: 'To Do',
    title: 'To Do',
    tasks: [],
  },
  'In Progress': {
    id: 'In Progress',
    title: 'In Progress',
    tasks: [],
  },
  'Done': {
    id: 'Done',
    title: 'Done',
    tasks: [],
  },
};

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
  const [columns, setColumns] = useState<Record<'To Do' | 'In Progress' | 'Done', Column>>(initialColumns);
  const [profiles, setProfiles] = useState<Profile[]>([]); // State for profiles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensure DND only runs on client
  }, []);

  const fetchTasksAndProfiles = async () => { // Renamed for clarity
    setLoading(true);
    setError(null);
    try {
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('order', { ascending: true });

      if (tasksError) throw tasksError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');
      
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      const newColumns = { ...initialColumns };
      newColumns['To Do'] = { ...newColumns['To Do'], tasks: [] };
      newColumns['In Progress'] = { ...newColumns['In Progress'], tasks: [] };
      newColumns['Done'] = { ...newColumns['Done'], tasks: [] };

      (tasksData || []).forEach((task: Task) => {
        if (task.status && newColumns[task.status]) {
          newColumns[task.status].tasks.push(task);
        }
      });
      
      Object.values(newColumns).forEach(column => {
        column.tasks.sort((a, b) => a.order - b.order);
      });

      setColumns(newColumns);
    } catch (e: any) {
      setError(e.message);
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndProfiles(); // Call the combined fetch function

    const taskChannel = supabase
      .channel('tasks-board-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          fetchTasksAndProfiles(); // Re-fetch both tasks and profiles
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel('profiles-board-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          fetchTasksAndProfiles(); // Re-fetch both tasks and profiles
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(profileChannel);
    };
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return; // Item dropped in the same place
    }

    const startColumn = columns[source.droppableId as keyof typeof columns];
    const endColumn = columns[destination.droppableId as keyof typeof columns];
    const draggedTask = startColumn.tasks.find(task => task.id === draggableId);

    if (!draggedTask) return;

    // Optimistic UI Update
    const newStartTasks = Array.from(startColumn.tasks);
    newStartTasks.splice(source.index, 1);

    const newEndTasks = Array.from(endColumn.tasks);
    if (source.droppableId === destination.droppableId) {
      // Moving within the same column
      newEndTasks.splice(destination.index, 0, draggedTask);
    } else {
      // Moving to a different column
      draggedTask.status = destination.droppableId as Task['status']; // Update status
      newEndTasks.splice(destination.index, 0, draggedTask);
    }
    
    // Update order for all affected tasks
    const updateTaskOrder = (tasks: Task[], columnId: string) => {
      return tasks.map((task, index) => ({ ...task, order: index, status: columnId as Task['status'] }));
    };

    const updatedStartTasks = updateTaskOrder(newStartTasks, startColumn.id);
    const updatedEndTasks = source.droppableId === destination.droppableId ? updatedStartTasks : updateTaskOrder(newEndTasks, endColumn.id);

    const newColumnsState = {
      ...columns,
      [startColumn.id]: {
        ...startColumn,
        tasks: updatedStartTasks,
      },
      [endColumn.id]: {
        ...endColumn,
        tasks: updatedEndTasks,
      },
    };
    setColumns(newColumnsState);

    // Persist changes to Supabase
    try {
      const now = new Date().toISOString();
      const finalTasksToUpsert: Task[] = [];
      const affectedTaskIds = new Set<string>();

      // Add all tasks from the start column if it's different from the end column
      // These tasks are from the optimistically updated newColumnsState
      if (startColumn.id !== endColumn.id) {
          newColumnsState[startColumn.id].tasks.forEach(task => {
              if (!affectedTaskIds.has(task.id)) {
                  finalTasksToUpsert.push({ ...task, updated_at: now });
                  affectedTaskIds.add(task.id);
              }
          });
      }

      // Add all tasks from the end column
      // These tasks are also from the optimistically updated newColumnsState
      newColumnsState[endColumn.id].tasks.forEach(task => {
          if (!affectedTaskIds.has(task.id)) {
              finalTasksToUpsert.push({ ...task, updated_at: now });
              affectedTaskIds.add(task.id);
          }
      });

      // Ensure there are tasks to update before calling Supabase
      if (finalTasksToUpsert.length > 0) {
        // Log a summary of what's being sent, including title, to verify
        console.log("Tasks to upsert:", JSON.stringify(finalTasksToUpsert.map(t => ({id: t.id, title: t.title, order: t.order, status: t.status, updated_at: t.updated_at})), null, 2));
        
        const { error: updateError } = await supabase
          .from('tasks')
          .upsert(finalTasksToUpsert, { onConflict: 'id' }); // Send full task objects

        if (updateError) {
          // Throw the Supabase error to be caught by the catch block
          throw updateError;
        }
      }

    } catch (e: any) {
      console.error("Full error object during task update:", e); // Log the full error
      let displayMessage = e.message || JSON.stringify(e);
      if (displayMessage === '{}') {
        displayMessage = "Received an empty error object from Supabase. Check console for details.";
      }
      setError(`Failed to update task order/status: ${displayMessage}`);
      alert(`Failed to update task: ${displayMessage}. Please check the console for the full error object.`); // Added alert
    }
  };

  if (!isClient) {
    // Render a placeholder or null on the server to avoid DND hydration errors
    return (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading board...</p>
        </div>
    );
  }

  if (loading && !Object.values(columns).some(col => col.tasks.length > 0)) {
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
        <Button variant="outline" onClick={fetchTasksAndProfiles} className="mt-4"> {/* Ensure this calls the correct fetch function */}
            Try Reloading
        </Button>
      </div>
    );
  }

  // Create a map for quick profile lookup by full_name
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
          {Object.values(columns).map((column) => {
            return (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                <Card
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col min-h-[200px] transition-colors duration-200 ease-in-out 
                              ${snapshot.isDraggingOver ? 'bg-primary/10' : 'bg-card'}`}
                >
                  <CardHeader className="border-b sticky top-0 bg-card z-10 py-3 px-4">
                  <CardTitle className="text-lg flex items-center justify-between">
                      {column.title}
                      <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {column.tasks.length}
                      </span>
                  </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2 flex-grow overflow-y-auto" style={{maxHeight: 'calc(100vh - 300px)'}}>
                  {column.tasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center text-sm text-muted-foreground py-10">
                        Drag tasks here or create new ones.
                      </div>
                  )}
                  {column.tasks.map((task, index) => {
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
                                <span className="font-mono text-[10px]">ID-{task.id.substring(0,4)}</span>
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

