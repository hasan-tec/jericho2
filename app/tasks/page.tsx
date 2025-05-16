import TaskList from '@/app/components/TaskList';

export default function TasksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Task List</h1>
      <TaskList />
    </div>
  );
}
