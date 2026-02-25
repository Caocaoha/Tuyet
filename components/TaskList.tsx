'use client';

import { useState, useEffect } from 'react';
import { fetchTasks } from '@/lib/api-client';

interface Task {
  id: string;
  content: string;
  dueDate?: string;
  completed: boolean;
  sourceNote: string;
  obsidianUrl: string;
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openInObsidian = (url: string) => {
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  const now = new Date().toISOString();
  const activeTasks = tasks.filter(t => !t.completed);
  const overdueTasks = activeTasks.filter(t => t.dueDate && t.dueDate < now);
  const upcomingTasks = activeTasks.filter(t => t.dueDate && t.dueDate >= now);
  const noDateTasks = activeTasks.filter(t => !t.dueDate);

  if (activeTasks.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Không có task nào</p>
      </div>
    );
  }

  const TaskCard = ({ task, borderColor = 'border-gray-200' }: { task: Task; borderColor?: string }) => (
    <div
      key={task.id}
      className={`bg-white rounded p-3 border ${borderColor} ${task.obsidianUrl ? 'cursor-pointer hover:border-blue-400' : ''} transition-colors`}
      onClick={() => task.obsidianUrl && openInObsidian(task.obsidianUrl)}
    >
      <p className="text-sm text-gray-800">{task.content}</p>
      <p className="text-xs text-gray-400 mt-1">{task.sourceNote}</p>
      {task.dueDate && (
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(task.dueDate).toLocaleDateString('vi-VN')}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Quá hạn ({overdueTasks.length})</h3>
          <div className="space-y-2">
            {overdueTasks.map((task, i) => (
              <TaskCard key={task.id || i} task={task} borderColor="border-red-200" />
            ))}
          </div>
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Sắp tới ({upcomingTasks.length})</h3>
          <div className="space-y-2">
            {upcomingTasks.map((task, i) => (
              <TaskCard key={task.id || i} task={task} />
            ))}
          </div>
        </div>
      )}

      {noDateTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Cần làm ({noDateTasks.length})</h3>
          <div className="space-y-2">
            {noDateTasks.map((task, i) => (
              <TaskCard key={task.id || i} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
