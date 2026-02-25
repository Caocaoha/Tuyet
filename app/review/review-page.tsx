// app/review/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TranscriptRecord {
  id: number;
  audioId: number;
  transcript: string;
  detectedLanguage: string;
  tags: string[];
  savedToObsidian: boolean;
  obsidianFilePath: string;
  createdAt: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const [records, setRecords] = useState<TranscriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Đọc từ IndexedDB trực tiếp — không cần API call
    async function loadFromDB() {
      try {
        const { getDb } = await import('@/lib/audio/db');
        const db = await getDb('default');
        const transcripts = await db.transcripts.toArray();
        // Sắp xếp mới nhất lên đầu
        const sorted = transcripts.sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setRecords(sorted as any);
      } catch (e) {
        setError('Không đọc được dữ liệu: ' + (e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadFromDB();
  }, []);

  return (
    <div style={{ padding:'24px 16px', maxWidth:600, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20 }}>←</button>
        <h1 style={{ margin:0, fontSize:22, fontWeight:700 }}>Xem lại ghi âm</h1>
      </div>

      {loading && <p style={{ color:'#888' }}>Đang tải...</p>}
      {error && <p style={{ color:'#e53e3e' }}>❌ {error}</p>}

      {!loading && records.length === 0 && (
        <div style={{ textAlign:'center', padding:40, color:'#888' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎙️</div>
          <p>Chưa có ghi âm nào.<br/>Bấm micro để bắt đầu!</p>
        </div>
      )}

      {records.map((r, i) => (
        <div key={r.id || i} style={{
          border:'1px solid #e2e8f0', borderRadius:10,
          padding:16, marginBottom:12, background:'#fff',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:12, color:'#888' }}>
              {r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : 'Không rõ thời gian'}
            </span>
            <span style={{ fontSize:12, color: r.savedToObsidian ? '#38a169' : '#e53e3e' }}>
              {r.savedToObsidian ? '✅ Đã lưu Obsidian' : '⚠️ Chưa lưu'}
            </span>
          </div>
          <p style={{ margin:'0 0 8px', lineHeight:1.6 }}>{r.transcript}</p>
          {r.tags?.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {r.tags.map(t => (
                <span key={t} style={{
                  padding:'2px 8px', background:'#ebf8ff',
                  color:'#2b6cb0', borderRadius:4, fontSize:12
                }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
