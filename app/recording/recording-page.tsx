// app/recording/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecorder } from '@/lib/hooks/useRecorder';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RecordingPage() {
  const router = useRouter();
  const { isRecording, isProcessing, status, duration, transcript, error, startRecording, stopRecording } = useRecorder();

  // Auto-start khi vào trang
  useEffect(() => {
    startRecording();
  }, []);

  // Tự navigate về home khi saved
  useEffect(() => {
    if (status === 'saved') {
      setTimeout(() => router.push('/'), 1500);
    }
  }, [status]);

  const handleStop = () => {
    stopRecording(); // không await — để UI cập nhật ngay
  };

  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px', background: '#fff5f5' }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e3a5f' }}>TUYẾT</h1>
      </header>

      <main style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>

        {/* Timer */}
        <div style={{ fontSize: 48, fontWeight: 300, marginBottom: 8, color: '#111' }}>
          {isRecording && <span style={{ color: '#e53e3e', marginRight: 8 }}>🔴</span>}
          {isProcessing && <span style={{ marginRight: 8 }}>⏳</span>}
          {status === 'saved' && <span style={{ marginRight: 8 }}>✅</span>}
          {formatDuration(duration)}
        </div>

        {/* Status text */}
        <div style={{ fontSize: 14, color: '#666', marginBottom: 32, minHeight: 20 }}>
          {isRecording && 'Đang ghi âm...'}
          {isProcessing && 'Đang xử lý và lưu...'}
          {status === 'saved' && 'Đã lưu! Đang chuyển về...'}
          {status === 'error' && ''}
        </div>

        {/* Nút dừng */}
        <button
          onClick={handleStop}
          disabled={!isRecording}
          style={{
            padding: '16px 40px',
            fontSize: 18,
            fontWeight: 600,
            background: isRecording ? '#e53e3e' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            cursor: isRecording ? 'pointer' : 'not-allowed',
            marginBottom: 32,
          }}
        >
          {isRecording ? '⏹️ Dừng & Lưu' : isProcessing ? '⏳ Đang lưu...' : '✅ Đã lưu'}
        </button>

        {/* Transcript preview */}
        {transcript && (
          <div style={{
            textAlign: 'left', padding: 16,
            background: '#fff', borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: 15, lineHeight: 1.6,
            color: '#333',
          }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Xem trước:</div>
            {transcript}
          </div>
        )}

        {/* Lỗi */}
        {error && (
          <div style={{
            marginTop: 16, padding: 12,
            background: '#fff5f5', border: '1px solid #fc8181',
            borderRadius: 8, color: '#c53030', fontSize: 14
          }}>
            ❌ {error}
            <br />
            <button
              onClick={() => router.push('/')}
              style={{ marginTop: 8, color: '#3182ce', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
            >
              Về trang chủ
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
