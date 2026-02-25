'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MicButton from '@/components/MicButton';
import TaskList from '@/components/TaskList';
import {
  saveAudio,
  saveTranscript,
  updateTranscriptIntelligence,
} from '@/lib/audio/db';
import {
  transcribeAudio,
  analyzeForTags,
  saveToObsidian,
} from '@/lib/api-client';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = document.cookie
      .split('; ')
      .find(row => row.startsWith('tuyet_user='))
      ?.split('=')[1];
    setUsername(user || null);
  }, []);

  const handleRecordingComplete = async (
    blob: Blob,
    mimeType: string,
    duration: number
  ) => {
    if (!username) {
      setError('User not authenticated');
      setStatus('error');
      return;
    }

    try {
      setStatus('processing');
      setError(null);

      const audioId = await saveAudio(username, blob, mimeType, duration);

      const { transcript, engine, confidence } = await transcribeAudio(blob, mimeType);

      const transcriptId = await saveTranscript(
        username,
        audioId,
        transcript,
        engine as 'soniox' | 'whisper' | 'assemblyai',
        confidence
      );

      setStatus('saving');

      const enableIntelligence = process.env.NEXT_PUBLIC_ENABLE_INTELLIGENCE === 'true';
      let tags: string[] = [];
      
      if (enableIntelligence) {
        try {
          const tagResult = await analyzeForTags(transcript);
          tags = tagResult.tags;
        } catch (tagErr) {
          console.warn('Auto-tag failed:', tagErr);
        }
      }

      const saveResult = await saveToObsidian(transcript, tags, true);

      if (saveResult.success) {
        await updateTranscriptIntelligence(username, transcriptId, {
          autoTags: tags,
          linkedNotes: saveResult.linkedNotes || [],
          savedToObsidian: true,
          obsidianFilePath: saveResult.filePath,
        });

        setStatus('saved');
        setTimeout(() => {
          setStatus('idle');
        }, 2000);
      } else {
        throw new Error(saveResult.error || 'Failed to save to Obsidian');
      }
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  };

  const handleError = (err: string) => {
    setError(err);
    setStatus('error');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/setup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Tuyết v2</h1>
            {username && (
              <p className="text-gray-600">👋 Xin chào, {username}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
          >
            Đăng xuất
          </button>
        </header>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex flex-col items-center gap-6">
              {status === 'idle' && (
                <>
                  <p className="text-gray-700 text-center mb-4">
                    Nhấn để ghi âm ghi chú
                  </p>
                  <MicButton
                    onRecordingComplete={handleRecordingComplete}
                    onError={handleError}
                  />
                </>
              )}

              {status === 'processing' && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-700">Đang xử lý...</p>
                </div>
              )}

              {status === 'saving' && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-700">Đang lưu vào Obsidian...</p>
                </div>
              )}

              {status === 'saved' && (
                <div className="text-center">
                  <div className="text-6xl mb-4">✓</div>
                  <p className="text-green-600 font-semibold">Đã lưu thành công!</p>
                </div>
              )}

              {status === 'error' && error && (
                <div className="bg-red-50 rounded-lg p-4 w-full">
                  <p className="text-red-700 text-sm">{error}</p>
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setError(null);
                    }}
                    className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded text-sm transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Tasks</h2>
              <button
                onClick={() => router.push('/reports')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                📊 Báo cáo
              </button>
            </div>
            <TaskList />
          </div>
        </div>
      </div>
    </div>
  );
}
