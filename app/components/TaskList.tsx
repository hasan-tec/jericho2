'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertCircle, PlusCircle, Edit, Bug, CheckSquare, Bookmark, Filter, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interface for Task, aligning with Supabase schema
interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  type: 'Bug' | 'Feature' | 'Task'; // ENUM types
  assignee: string | null;
  status: 'To Do' | 'In Progress' | 'Done'; // ENUM types
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

// Define sortable keys
type SortKey = 'title' | 'type' | 'status' | 'assignee' | 'updated_at';
type SortOrder = 'asc' | 'desc';

// Helper to get initials for avatar (can be moved to utils if used elsewhere)
const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

const getTypeIcon = (type: Task['type']) => {
  switch (type) {
    case 'Bug':
      return <Bug className="h-4 w-4 text-red-500 mr-1" />;
    case 'Feature':
      return <Bookmark className="h-4 w-4 text-blue-500 mr-1" />;
    case 'Task':
      return <CheckSquare className="h-4 w-4 text-green-500 mr-1" />;
    default:
      return null;
  }
};

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]); // State for profiles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    const fetchTasksAndProfiles = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url');
        
        if (profilesError) throw profilesError;
        setProfiles(profilesData || []);

      } catch (e: unknown) { // Changed any to unknown
        console.error("Error fetching data:", e);
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unexpected error occurred while fetching data.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTasksAndProfiles();

    // Set up a real-time subscription for tasks
    const taskChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (/*payload*/) => { // payload commented out
          fetchTasksAndProfiles(); // Re-fetch both tasks and profiles on task change
        }
      )
      .subscribe();

    // Set up a real-time subscription for profiles
    const profileChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (/*payload*/) => { // payload commented out
          fetchTasksAndProfiles(); // Re-fetch both tasks and profiles on profile change
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(profileChannel);
    };
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const getStatusBadgeVariant = (status: Task['status']) => {
    switch (status) {
      case 'To Do':
        return 'destructive';
      case 'In Progress':
        return 'secondary';
      case 'Done':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getTypeBadgeVariant = (type: Task['type']) => {
    switch (type) {
      case 'Bug':
        return 'destructive';
      case 'Feature':
        return 'default';
      case 'Task':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const assignees = Array.from(new Set(tasks.map(task => task.assignee || 'Unassigned'))).sort();

  const filteredTasks = tasks.filter(task => 
    (statusFilter === 'all' || task.status === statusFilter) &&
    (assigneeFilter === 'all' || (task.assignee || 'Unassigned') === assigneeFilter)
  );

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];

    let comparison = 0;

    if (valA === null || valA === undefined) comparison = 1;
    else if (valB === null || valB === undefined) comparison = -1;
    else if (typeof valA === 'string' && typeof valB === 'string') {
      comparison = valA.localeCompare(valB);
    } else if (sortKey === 'updated_at') {
      comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
    } else {
      if (valA < valB) comparison = -1;
      if (valA > valB) comparison = 1;
    }
    return sortOrder === 'asc' ? comparison : comparison * -1;
  });

  // Create a map for quick profile lookup by full_name
  const profileMap = new Map(profiles.map(p => [p.full_name, p]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="font-semibold">Error loading tasks</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <CardTitle>Task List</CardTitle>
          <CardDescription>All current tasks in the system. Filter by status or assignee below.</CardDescription>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Task['status'] | 'all')}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={assigneeFilter} onValueChange={(value) => setAssigneeFilter(value as string | 'all')}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {assignees.map(assignee => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild className="mt-2 md:mt-0 w-full md:w-auto">
            <Link href="/tasks/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Task
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedTasks.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">
              { (statusFilter === 'all' && assigneeFilter === 'all') ? 'No tasks found.' : `No tasks match the current filters.`}
            </p>
            { (statusFilter === 'all' && assigneeFilter === 'all') && <p className="text-sm text-muted-foreground">Why not create one?</p>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('title')}>
                  <div className="flex items-center">Title {getSortIcon('title')}</div>
                </TableHead>
                <TableHead className="hidden md:table-cell w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('type')}>
                  <div className="flex items-center">Type {getSortIcon('type')}</div>
                </TableHead>
                <TableHead className="hidden sm:table-cell w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                  <div className="flex items-center">Status {getSortIcon('status')}</div>
                </TableHead>
                <TableHead className="hidden lg:table-cell w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('assignee')}>
                  <div className="flex items-center">Assignee {getSortIcon('assignee')}</div>
                </TableHead>
                <TableHead className="hidden lg:table-cell w-[15%] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('updated_at')}>
                  <div className="flex items-center">Last Updated {getSortIcon('updated_at')}</div>
                </TableHead>
                <TableHead className="text-right w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => {
                const assigneeName = task.assignee || 'Unassigned';
                const assigneeProfile = profileMap.get(assigneeName);
                const avatarUrl = assigneeProfile?.avatar_url;

                return (
                  <TableRow key={task.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/tasks/${task.id}`} className="hover:underline group">
                        <div className="flex items-center">
                          {getTypeIcon(task.type)}
                          <span className="group-hover:underline">{task.title}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={getTypeBadgeVariant(task.type)} className="text-xs px-1.5 py-0.5">
                        {task.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={avatarUrl || `https://ui-avatars.com/api/?name=${assigneeName}&background=random&size=32`} />
                          <AvatarFallback>{getInitials(assigneeName)}</AvatarFallback>
                        </Avatar>
                        <span>{assigneeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(task.updated_at).toLocaleDateString()} {new Date(task.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/tasks/${task.id}`}>
                          <Edit className="mr-1 h-3 w-3" /> View/Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
