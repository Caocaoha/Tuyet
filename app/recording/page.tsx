// app/recording/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecorder } from '@/lib/hooks/useRecorder';

function fmt(s: number) {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

export default function RecordingPage() {
  const router = useRouter();
  const {
    isRecording, isProcessing, status, duration, transcript, error, offlineSaved,
    voiceCommandDetected,
    startRecording, stopRecording
  } = useRecorder();

  useEffect(() => { startRecording(); }, []);

  useEffect(() => {
    if (status === 'saved') {
      const t = setTimeout(() => router.push('/'), 2000);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <div style={{ minHeight:'100vh', padding:'32px 16px', background: status === 'saved' ? '#f0fff4' : '#fff5f5' }}>
      <header style={{ marginBottom:32 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#666' }}>
          ← Về trang chủ
        </button>
        <h1 style={{ fontSize:28, fontWeight:700, color:'#1e3a5f', margin:'8px 0 0' }}>TUYẾT</h1>
      </header>

      <main style={{ maxWidth:400, margin:'0 auto', textAlign:'center' }}>
        {/* Timer */}
        <div style={{ fontSize:56, fontWeight:200, letterSpacing:4, marginBottom:8 }}>
          {isRecording && <span style={{ color:'#e53e3e' }}>🔴</span>}
          {isProcessing && <span>⏳</span>}
          {status === 'saved' && <span>✅</span>}
          {status === 'error' && <span>❌</span>}
          {' '}{fmt(duration)}
        </div>

        <div style={{ fontSize:14, color:'#888', marginBottom:24, minHeight:20 }}>
          {isRecording && 'Đang ghi âm — bấm nút hoặc nói "Save" / "Stop" để dừng'}
          {isProcessing && 'Đang xử lý với Whisper AI...'}
          {status === 'saved' && '✅ Đã lưu vào Obsidian! Đang về trang chủ...'}
          {status === 'error' && ''}
        </div>

        {/* Offline saved banner */}
        {offlineSaved && (
          <div style={{
            marginBottom: 16,
            padding: '10px 16px',
            background: '#f0fff4',
            border: '1px solid #9ae6b4',
            borderRadius: 8,
            color: '#276749',
            fontSize: 14,
          }}>
            📶 Không có mạng — ghi âm đã lưu, sẽ xử lý khi có kết nối.
          </div>
        )}

        {/* Voice command detected banner */}
        {voiceCommandDetected && (
          <div style={{
            marginBottom: 16,
            padding: '10px 16px',
            background: '#f0fff4',
            border: '1px solid #9ae6b4',
            borderRadius: 8,
            color: '#276749',
            fontSize: 14,
            fontWeight: 500,
          }}>
            Voice command detected: &quot;{voiceCommandDetected}&quot; — stopping...
          </div>
        )}

        {/* Nút dừng */}
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{
            width:160, height:160, borderRadius:'50%',
            fontSize:16, fontWeight:600,
            background: isRecording ? '#e53e3e' : isProcessing ? '#d69e2e' : '#48bb78',
            color:'#fff', border:'none',
            cursor: isRecording ? 'pointer' : 'default',
            boxShadow: isRecording ? '0 0 0 8px rgba(229,62,62,0.2)' : 'none',
            transition: 'all 0.3s',
          }}
        >
          {isRecording ? '⏹️\nDừng & Lưu' : isProcessing ? '⏳\nĐang lưu...' : status === 'saved' ? '✅\nĐã lưu!' : '⏹️\nDừng & Lưu'}
        </button>

        {/* Transcript */}
        {transcript && (
          <div style={{ marginTop:32, textAlign:'left', padding:16, background:'#fff', borderRadius:8, border:'1px solid #e2e8f0', fontSize:15, lineHeight:1.7 }}>
            <div style={{ fontSize:11, color:'#999', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Transcript</div>
            {transcript}
          </div>
        )}

        {/* Lỗi */}
        {error && (
          <div style={{ marginTop:16, padding:16, background:'#fff5f5', border:'1px solid #fc8181', borderRadius:8, color:'#c53030', fontSize:14, textAlign:'left' }}>
            {error}
            <br/>
            <button onClick={() => router.push('/')} style={{ marginTop:8, color:'#3182ce', background:'none', border:'none', cursor:'pointer' }}>
              Về trang chủ
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
