'use client';

import { useEffect } from 'react';
import { deleteOldRecords } from '@/lib/audio/db';
import HistoryList from '@/components/HistoryList';

function getUsername(): string {
  if (typeof document === 'undefined') return 'default';
  return (
    document.cookie
      .split('; ')
      .find(row => row.startsWith('tuyet_user='))
      ?.split('=')[1] || 'default'
  );
}

export default function HistoryPage() {
  useEffect(() => {
    async function cleanupOldRecords() {
      try {
        const deleted = await deleteOldRecords(getUsername());
        if (deleted > 0) {
          console.log(`Auto-deleted ${deleted} old records`);
        }
      } catch (err) {
        console.error('Auto-delete failed:', err);
      }
    }

    cleanupOldRecords();

    const interval = setInterval(cleanupOldRecords, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-screen-sm mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ghi chú tự động xóa sau 5 ngày nếu không bookmark
          </p>
        </header>

        <HistoryList />
      </div>
    </div>
  );
}
