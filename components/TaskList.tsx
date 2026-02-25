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
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < now);
  const upcomingTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate >= now);

  if (tasks.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Không có task nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Quá hạn ({overdueTasks.length})</h3>
          <div className="space-y-2">
            {overdueTasks.map(task => (
              <div
                key={task.id}
                className="bg-white rounded p-3 border border-red-200 cursor-pointer hover:border-red-400 transition-colors"
                onClick={() => openInObsidian(task.obsidianUrl)}
              >
                <p className="text-sm text-gray-800">{task.content}</p>
                {task.dueDate && (
                  <p className="text-xs text-red-600 mt-1">
                    {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Sắp tới ({upcomingTasks.length})</h3>
          <div className="space-y-2">
            {upcomingTasks.map(task => (
              <div
                key={task.id}
                className="bg-gray-50 rounded p-3 border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => openInObsidian(task.obsidianUrl)}
              >
                <p className="text-sm text-gray-800">{task.content}</p>
                {task.dueDate && (
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
