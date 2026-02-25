// app/recording/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecorder } from '@/lib/hooks/useRecorder';
import { useMicPermission } from '@/lib/hooks/useMicPermission';

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

  const { permissionState, checkPermission, requestPermission } = useMicPermission();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [showMicConfirm, setShowMicConfirm] = useState(false);

  // Check permission on mount — no prompt, no getUserMedia outside user gesture
  useEffect(() => {
    checkPermission().then(() => setPermissionChecked(true));
  }, []);

  // Auto-start only if already granted
  useEffect(() => {
    if (permissionChecked && permissionState === 'granted') {
      localStorage.setItem('has_allowed_mic', 'true');
      startRecording();
    }
  }, [permissionChecked, permissionState]);

  useEffect(() => {
    if (status === 'saved') {
      const t = setTimeout(() => router.push('/'), 2000);
      return () => clearTimeout(t);
    }
  }, [status]);

  // User tap handler — safe user gesture for iOS getUserMedia
  const handleActivateMic = async () => {
    const granted = await requestPermission();
    if (granted) {
      localStorage.setItem('has_allowed_mic', 'true');
      setShowMicConfirm(true);
      setTimeout(() => {
        setShowMicConfirm(false);
        startRecording();
      }, 1500);
    }
  };

  // Permission checking spinner
  if (!permissionChecked) {
    return (
      <div style={{ minHeight:'100vh', padding:'32px 16px', background: '#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'#888' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🎙️</div>
          <p>Đang kiểm tra quyền micro...</p>
        </div>
      </div>
    );
  }

  // Step 3 — waveform confirmation after permission granted
  if (showMicConfirm) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0fff4' }}>
        <style>{`
          @keyframes waveBar {
            from { height: 6px; }
            to { height: 28px; }
          }
        `}</style>
        <div style={{ textAlign:'center' }}>
          <div style={{ display:'flex', gap:5, alignItems:'center', justifyContent:'center', height:40, marginBottom:20 }}>
            {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
              <div key={i} style={{
                width:5, borderRadius:3,
                background:'#38a169',
                animation:`waveBar 0.7s ease-in-out ${delay}s infinite alternate`,
              }} />
            ))}
          </div>
          <p style={{ fontSize:18, fontWeight:600, color:'#276749' }}>Kết nối an toàn thành công</p>
        </div>
      </div>
    );
  }

  // Mic denied
  if (permissionState === 'denied' || permissionState === 'unavailable') {
    return (
      <div style={{ minHeight:'100vh', padding:'32px 16px', background: '#fffbeb' }}>
        <header style={{ marginBottom:32 }}>
          <button onClick={() => router.push('/')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#666' }}>
            ← Về trang chủ
          </button>
          <h1 style={{ fontSize:28, fontWeight:700, color:'#1e3a5f', margin:'8px 0 0' }}>TUYẾT</h1>
        </header>
        <div style={{ maxWidth:400, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🚫</div>
          <div style={{
            background:'#fef3c7', border:'1px solid #f59e0b',
            borderRadius:10, padding:'16px 20px', marginBottom:24,
            color:'#92400e', fontSize:14, textAlign:'left'
          }}>
            <strong>Quyền micro bị từ chối.</strong><br /><br />
            Để dùng tính năng ghi âm, hãy vào Cài đặt iPhone → Safari → Microphone → Cho phép, rồi tải lại trang.
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              background:'#1e3a5f', color:'#fff', border:'none',
              borderRadius:8, padding:'12px 24px', fontSize:15,
              fontWeight:600, cursor:'pointer'
            }}
          >
            ← Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Steps 1 & 2 — explanation overlay + activate button (user gesture required for iOS)
  if (permissionState === 'prompt' || permissionState === 'unknown') {
    const isRevoked = localStorage.getItem('has_allowed_mic') === 'true';
    return (
      <div style={{ minHeight:'100vh', padding:'32px 16px', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ maxWidth:360, textAlign:'center' }}>
          <div style={{ fontSize:52, marginBottom:20 }}>🎙️</div>
          <p style={{ fontSize:16, color:'#2d3748', lineHeight:1.7, marginBottom:32 }}>
            {isRevoked
              ? 'Để đảm bảo tính riêng tư, iOS đã tạm ngắt kết nối Micro. Nhấn để tái kết nối.'
              : 'Chào Hà, để thuận tiện cho bạn tôi cần kết nối với Micro.'}
          </p>
          <button
            onClick={handleActivateMic}
            style={{
              width:'100%', maxWidth:280,
              padding:'16px 24px',
              fontSize:16, fontWeight:700,
              background:'#2b6cb0', color:'#fff',
              border:'none', borderRadius:12,
              cursor:'pointer',
              boxShadow:'0 4px 14px rgba(43,108,176,0.35)',
            }}
          >
            🔒 Kích hoạt Micro & Bảo mật
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ marginTop:16, background:'none', border:'none', color:'#999', fontSize:13, cursor:'pointer', display:'block', margin:'16px auto 0' }}
          >
            Để sau
          </button>
        </div>
      </div>
    );
  }

  // Permission granted — normal recording UI
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
