// app/review/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateTranscriptSegment } from '@/lib/audio/db';
import type { ConfidenceSegment } from '@/lib/audio/db';

interface TranscriptRecord {
  id: string;
  audioId: string;
  transcript: string;
  detectedLanguage: string;
  tags: string[];
  lowConfidenceSegments: ConfidenceSegment[];
  savedToObsidian: boolean;
  obsidianFilePath: string;
  createdAt: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const [records, setRecords] = useState<TranscriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
  }, []);

  async function loadFromDB() {
    try {
      const { db } = await import('@/lib/audio/db');
      const transcripts = await db.transcripts.toArray();
      const sorted = transcripts.sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setRecords(sorted as TranscriptRecord[]);
    } catch (e) {
      setError('Không đọc được dữ liệu: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFromDB(); }, []);

  const handleAcceptCorrection = async (
    transcriptId: string, segmentIndex: number, correctedText: string
  ) => {
    const key = `${transcriptId}-${segmentIndex}`;
    setSavingId(key);
    try {
      await updateTranscriptSegment(transcriptId, segmentIndex, correctedText);
      await loadFromDB();
      setDismissed(prev => new Set(prev).add(key));
    } finally {
      setSavingId(null);
    }
  };

  const handleDismiss = (transcriptId: string, segmentIndex: number) => {
    const key = `${transcriptId}-${segmentIndex}`;
    setDismissed(prev => new Set(prev).add(key));
  };

  return (
    <div style={{ padding:'24px 16px', maxWidth:600, margin:'0 auto', paddingBottom: 96 }}>
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
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
              {r.tags.map(t => (
                <span key={t} style={{
                  padding:'2px 8px', background:'#ebf8ff',
                  color:'#2b6cb0', borderRadius:4, fontSize:12
                }}>#{t}</span>
              ))}
            </div>
          )}

          {/* F5: Voice Accuracy Review Panel — desktop only */}
          {isDesktop && r.lowConfidenceSegments?.length > 0 && (() => {
            const visibleSegments = r.lowConfidenceSegments.filter(
              (_, idx) => !dismissed.has(`${r.id}-${idx}`)
            );
            if (visibleSegments.length === 0) return null;
            const isExpanded = expandedId === r.id;
            return (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  style={{
                    background: 'none', border: '1px solid #e2e8f0',
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, color: '#718096', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {isExpanded ? '▾' : '▸'} {visibleSegments.length} đoạn cần xem lại
                </button>
                {isExpanded && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {r.lowConfidenceSegments.map((seg, idx) => {
                      const key = `${r.id}-${idx}`;
                      if (dismissed.has(key)) return null;
                      const correctionKey = key;
                      const currentText = corrections[correctionKey] ?? seg.text;
                      const isSaving = savingId === key;
                      return (
                        <div key={idx} style={{
                          background: '#fffbeb',
                          border: '1px solid #f6e05e',
                          borderRadius: 8,
                          padding: '10px 12px',
                        }}>
                          <div style={{ fontSize: 11, color: '#b7791f', marginBottom: 4 }}>
                            Độ chính xác: {Math.round(seg.confidence * 100)}%
                          </div>
                          <input
                            value={currentText}
                            onChange={e => setCorrections(prev => ({ ...prev, [correctionKey]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #e2e8f0',
                              borderRadius: 6,
                              fontSize: 14,
                              marginBottom: 8,
                              boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleAcceptCorrection(r.id, idx, currentText)}
                              disabled={isSaving}
                              style={{
                                background: '#48bb78', color: '#fff',
                                border: 'none', borderRadius: 6,
                                padding: '4px 12px', fontSize: 13,
                                cursor: isSaving ? 'default' : 'pointer',
                                opacity: isSaving ? 0.6 : 1,
                              }}
                            >
                              {isSaving ? 'Đang lưu...' : 'Chấp nhận'}
                            </button>
                            <button
                              onClick={() => handleDismiss(r.id, idx)}
                              style={{
                                background: 'none', color: '#718096',
                                border: '1px solid #e2e8f0', borderRadius: 6,
                                padding: '4px 12px', fontSize: 13,
                                cursor: 'pointer',
                              }}
                            >
                              Bỏ qua
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
