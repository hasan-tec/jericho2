'use client';

import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertCircle } from 'lucide-react';

// Define the Task type based on your Supabase schema
interface TaskInput {
  title: string;
  description: string | null;
  type: 'Bug' | 'Feature' | 'Task';
  assignee: string | null; // Will store Profile ID (UUID)
  status: 'To Do' | 'In Progress' | 'Done';
}

interface Profile {
  id: string;
  full_name: string | null;
}

export default function CreateTaskForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<'Bug' | 'Feature' | 'Task'>('Task');
  const [assignee, setAssignee] = useState<string | null>(null); // Stores selected profile ID
  const [status, setStatus] = useState<'To Do' | 'In Progress' | 'Done'>('To Do');
  const [profiles, setProfiles] = useState<Profile[]>([]); // State for profiles
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoadingProfiles(true);
      try {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name', { ascending: true });

        if (profilesError) throw profilesError;
        setProfiles(data || []);
      } catch (err: unknown) {
        console.error("Error fetching profiles:", err);
      } finally {
        setLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const taskData: TaskInput = {
      title,
      description: description || null,
      type: taskType,
      assignee: assignee || null,
      status,
    };

    try {
      const { error: insertError } = await supabase
        .from('tasks')
        .insert([taskData]);

      if (insertError) {
        throw insertError;
      }
      router.push('/tasks');
    } catch (err: unknown) {
      console.error("Error submitting task:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(String((err as { message: string }).message));
      } else {
        setError('An unexpected error occurred while creating the task.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create New Task</CardTitle>
          <CardDescription>Fill in the details below to create a new task. Required fields are marked with *</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-semibold">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Enter task title"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-semibold">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Enter task description"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="taskType" className="font-semibold">Type <span className="text-destructive">*</span></Label>
                <Select 
                  value={taskType} 
                  onValueChange={(value: 'Bug' | 'Feature' | 'Task') => setTaskType(value)}
                  disabled={submitting}
                >
                  <SelectTrigger id="taskType">
                    <SelectValue placeholder="Select task type" />
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
                <Select 
                  value={status} 
                  onValueChange={(value: 'To Do' | 'In Progress' | 'Done') => setStatus(value)}
                  disabled={submitting}
                >
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
                value={assignee || ''} 
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

            <Button type="submit" className="w-full !mt-8" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Creating Task...' : 'Create Task'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

