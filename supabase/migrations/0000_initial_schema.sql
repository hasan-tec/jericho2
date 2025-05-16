-- Create ENUM types
CREATE TYPE public.task_type AS ENUM ('Bug', 'Feature', 'Task');
CREATE TYPE public.task_status AS ENUM ('To Do', 'In Progress', 'Done');

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type public.task_type NOT NULL,
    assignee TEXT,
    status public.task_status DEFAULT 'To Do'::public.task_status NOT NULL
);

-- Optional: Add a function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();

-- Enable RLS (Row Level Security) on the tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
-- Allow authenticated users to perform all actions on tasks for MVP
CREATE POLICY "Allow all access to authenticated users" 
ON public.tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant usage on schema and types to necessary roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TYPE public.task_type TO postgres, anon, authenticated, service_role;
GRANT ALL ON TYPE public.task_status TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.tasks TO postgres, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.trigger_set_timestamp() TO postgres, anon, authenticated, service_role;
