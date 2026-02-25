'use client';

import { useEffect, useState } from 'react';
import { getDb, toggleBookmark, updateTranscriptSyncStatus } from '@/lib/audio/db';
import type { TranscriptRecord } from '@/lib/types';
import { Bookmark, RefreshCw, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

function getUsername(): string {
  if (typeof document === 'undefined') return 'default';
  return (
    document.cookie
      .split('; ')
      .find(row => row.startsWith('tuyet_user='))
      ?.split('=')[1] || 'default'
  );
}

export default function HistoryList() {
  const [records, setRecords] = useState<TranscriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      const username = getUsername();
      const db = await getDb(username);
      const allRecords = await db.transcripts
        .orderBy('createdAt')
        .reverse()
        .toArray();
      setRecords(allRecords);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleBookmark(id: string) {
    try {
      await toggleBookmark(getUsername(), id);
      await loadRecords();
    } catch (err) {
      console.error('Toggle bookmark failed:', err);
    }
  }

  async function handleManualSync(id: string) {
    const record = records.find(r => r.id === id);
    if (!record) return;

    setSyncing(id);
    try {
      const response = await fetch('/api/obsidian/note', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: record.transcript,
          tags: record.autoTags || [],
          autoLink: true,
        }),
      });

      if (response.ok) {
        await updateTranscriptSyncStatus(getUsername(), id, true);
        await loadRecords();
      } else {
        const error = await response.json();
        alert(`Sync thất bại: ${error.error || 'Unknown error'}`);
        await updateTranscriptSyncStatus(getUsername(), id, false);
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
      alert(`Sync thất bại: ${(err as Error).message}`);
      await updateTranscriptSyncStatus(getUsername(), id, false);
    } finally {
      setSyncing(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa ghi chú này? Hành động không thể hoàn tác.')) return;

    try {
      const username = getUsername();
      const db = await getDb(username);
      const record = await db.transcripts.get(id);
      if (record) {
        await db.audio.delete(record.audioId);
        await db.transcripts.delete(id);
        await loadRecords();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function getSyncStatusIcon(record: TranscriptRecord) {
    if (record.savedToObsidian) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (record.lastSyncAttempt && !record.savedToObsidian) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <Clock className="w-4 h-4 text-gray-400" />;
  }

  function formatDate(isoString: string) {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hôm nay ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Hôm qua ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Chưa có ghi chú nào</p>
        <p className="text-sm text-gray-400 mt-2">Bắt đầu ghi âm để tạo ghi chú đầu tiên</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div
          key={record.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 line-clamp-3 mb-2">
                {record.transcript}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {getSyncStatusIcon(record)}
                <span>{formatDate(record.createdAt)}</span>
                {record.bookmarked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                    <Bookmark className="w-3 h-3 fill-current" />
                    Đã bookmark
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleBookmark(record.id)}
                className={`p-2 rounded-lg transition-colors ${
                  record.bookmarked
                    ? 'text-yellow-600 hover:bg-yellow-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={record.bookmarked ? 'Bỏ bookmark' : 'Bookmark'}
              >
                <Bookmark className={`w-4 h-4 ${record.bookmarked ? 'fill-current' : ''}`} />
              </button>

              {!record.savedToObsidian && (
                <button
                  onClick={() => handleManualSync(record.id)}
                  disabled={syncing === record.id}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Sync thủ công"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing === record.id ? 'animate-spin' : ''}`} />
                </button>
              )}

              <button
                onClick={() => handleDelete(record.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
