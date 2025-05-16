'use client';

import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Edit, Save, XCircle, ArrowLeft, UserCircle, CalendarDays, Tag } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  type: 'Bug' | 'Feature' | 'Task';
  assignee: string | null; // This will now be a Profile ID (UUID)
  status: 'To Do' | 'In Progress' | 'Done';
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
}

interface TaskDetailViewProps {
  taskId: string;
}

export default function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<'Bug' | 'Feature' | 'Task'>('Task');
  const [assignee, setAssignee] = useState<string | null>(null); // Stores Profile ID
  const [status, setStatus] = useState<'To Do' | 'In Progress' | 'Done'>('To Do');
  
  const [profiles, setProfiles] = useState<Profile[]>([]); // State for profiles list
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profileMap, setProfileMap] = useState<Map<string, Profile>>(new Map()); // For displaying assignee name

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTaskAndProfiles = async () => {
      if (!taskId) return;
      setLoading(true);
      setLoadingProfiles(true);
      setError(null);
      try {
        // Fetch task details
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (taskError) throw taskError;
        if (taskData) {
          setTask(taskData);
          setTitle(taskData.title);
          setDescription(taskData.description || '');
          setTaskType(taskData.type);
          setAssignee(taskData.assignee); // Assignee is now an ID
          setStatus(taskData.status);
        } else {
          setError('Task not found.');
        }

        // Fetch profiles for the assignee dropdown and for displaying name
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url'); // Fetch avatar_url if you want to display it here too

        if (profilesError) throw profilesError;
        setProfiles(profilesData || []);
        const newProfileMap = new Map((profilesData || []).map(p => [p.id, p]));
        setProfileMap(newProfileMap);

      } catch (e: any) {
        setError(e.message);
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
        setLoadingProfiles(false);
      }
    };
    fetchTaskAndProfiles();
  }, [taskId]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSubmitting(true);
    setError(null);

    const updatedData = {
      title,
      description: description || null,
      type: taskType,
      assignee: assignee, // Assignee is already the ID or null
      status,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updatedData)
        .eq('id', task.id);

      if (updateError) throw updateError;
      
      setTask(prevTask => prevTask ? { ...prevTask, ...updatedData } : null);
      setIsEditing(false);
    } catch (e: any) {
      setError(e.message);
      console.error("Error updating task:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: Task['status']) => {
    switch (status) {
      case 'To Do': return 'destructive';
      case 'In Progress': return 'secondary';
      case 'Done': return 'default';
      default: return 'outline';
    }
  };

  const getTypeBadgeVariant = (type: Task['type']) => {
    switch (type) {
      case 'Bug': return 'destructive';
      case 'Feature': return 'default';
      case 'Task': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading task details...</p>
      </div>
    );
  }

  if (error && !task) { // Only show full page error if task couldn't be loaded at all
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-destructive">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-xl font-semibold">Error loading task</p>
        <p>{error}</p>
        <Button variant="outline" onClick={() => router.push('/tasks')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Task List
        </Button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-xl font-semibold">Task not found</p>
        <Button variant="outline" onClick={() => router.push('/tasks')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Task List
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl bg-muted/40 min-h-screen">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="w-full shadow-lg">
        {isEditing ? (
          <form onSubmit={handleUpdate}>
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Edit Task</CardTitle>
              <CardDescription>Modify the details of your task. Required fields are marked with *</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-semibold">Title <span className="text-destructive">*</span></Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Enter task description (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="taskType" className="font-semibold">Type <span className="text-destructive">*</span></Label>
                  <Select value={taskType} onValueChange={(value) => setTaskType(value as Task['type'])} disabled={submitting}>
                    <SelectTrigger id="taskType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Task">Task</SelectItem>
                      <SelectItem value="Bug">Bug</SelectItem>
                      <SelectItem value="Feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="font-semibold">Status <span className="text-destructive">*</span></Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as Task['status'])} disabled={submitting}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">To Do</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee" className="font-semibold">Assignee</Label>
                <Select 
                  value={assignee || 'unassigned'} 
                  onValueChange={(value) => setAssignee(value === 'unassigned' ? null : value)}
                  disabled={submitting || loadingProfiles}
                >
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder={loadingProfiles ? "Loading users..." : "Select assignee"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || 'Unnamed User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {error && 
                <div className="flex items-center p-3 rounded-md bg-destructive/10 border border-destructive/50 text-destructive text-sm">
                  <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Error: {error}</span>
                </div>
              }

            </CardContent>
            <CardFooter className="flex justify-end space-x-3 border-t pt-6">
              <Button variant="outline" type="button" onClick={() => {
                setIsEditing(false);
                // Reset form fields to original task data if user cancels
                if(task) {
                    setTitle(task.title);
                    setDescription(task.description || '');
                    setTaskType(task.type);
                    setAssignee(task.assignee || null);
                    setStatus(task.status);
                    setError(null); // Clear previous form errors
                }
              }}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl font-bold break-words mb-1">{task.title}</CardTitle>
                  <div className="text-xs text-muted-foreground flex items-center space-x-2">
                    <Tag className="h-3 w-3" />
                    <span>ID: {task.id.substring(0,8)}</span>
                    <span className="mx-1">•</span>
                    <span>Last updated: {new Date(task.updated_at).toLocaleString()}</span>
                  </div>
                </div>
                <Button variant="default" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              {task.description && (
                <div>
                  <h3 className="text-base font-semibold mb-2 text-foreground">Description</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap break-words p-3 bg-muted rounded-md">
                    {task.description}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Type</h3>
                  <Badge variant={getTypeBadgeVariant(task.type)} className="text-sm px-2 py-1">{task.type}</Badge>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Status</h3>
                  <Badge variant={getStatusBadgeVariant(task.status)} className="text-sm px-2 py-1">{task.status}</Badge>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Assignee</h3>
                  <div className="flex items-center space-x-2">
                    <UserCircle className="h-5 w-5 text-muted-foreground" /> 
                    <span className="text-sm text-foreground">
                      {task.assignee && profileMap.get(task.assignee)?.full_name ? 
                        profileMap.get(task.assignee)?.full_name : 
                        'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                 <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Created</h3>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" /> 
                    <span className="text-sm text-foreground">{new Date(task.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Last Updated</h3>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" /> 
                    <span className="text-sm text-foreground">{new Date(task.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
                <p className="text-xs text-muted-foreground">Task ID: {task.id}</p>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

