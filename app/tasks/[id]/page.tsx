
'use client';

import TaskDetailView from '@/app/components/TaskDetailView';
import { useParams } from 'next/navigation';

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = typeof params.id === 'string' ? params.id : undefined;

  if (!taskId) {
    // This case should ideally be handled by Next.js routing if `id` is missing,
    // or you could redirect / show a specific error component.
    return <p className="text-center mt-8">Task ID is missing.</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <TaskDetailView taskId={taskId} />
    </div>
  );
}
