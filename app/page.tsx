// app/page.tsx — History / Review Page
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { bookmarkTranscript, cleanupExpiredRecords, updateTranscriptSegment } from '@/lib/audio/db';
import type { ConfidenceSegment } from '@/lib/audio/db';
import { useOfflineQueue } from '@/lib/hooks/useOfflineQueue';

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
  bookmarked?: boolean;
}

interface AudioRecord {
  id: string;
  duration: number;
  timestamp: string;
  status: string;
}

function daysUntilExpiry(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const expiry = created + 5 * 24 * 60 * 60 * 1000;
  return Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function HomePage() {
  const router = useRouter();
  const [records, setRecords] = useState<TranscriptRecord[]>([]);
  const [offlineAudio, setOfflineAudio] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Pull-to-refresh state
  const touchStartY = useRef(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const { isProcessing, processQueue, pendingCount } = useOfflineQueue();

  const loadFromDB = useCallback(async () => {
    try {
      const { db } = await import('@/lib/audio/db');
      const transcripts = await db.transcripts.toArray();
      const sorted = transcripts.sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setRecords(sorted as TranscriptRecord[]);

      const offline = await db.audioRecords.where('status').equals('offline_pending').toArray();
      setOfflineAudio(offline as AudioRecord[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const config = localStorage.getItem('appConfig');
    if (!config) {
      router.push('/setup');
      return;
    }

    setIsDesktop(window.innerWidth >= 768);
    setIsReady(true);

    // Daily cleanup
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('lastCleanupDate') !== today) {
      cleanupExpiredRecords().then(() => {
        localStorage.setItem('lastCleanupDate', today);
        loadFromDB();
      });
    } else {
      loadFromDB();
    }
  }, []);

  const handleSyncNow = async () => {
    await processQueue();
    await loadFromDB();
  };

  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    await processQueue();
    await loadFromDB();
    setIsPullRefreshing(false);
  };

  const handleBookmark = async (id: string, current: boolean | undefined) => {
    await bookmarkTranscript(id, !current);
    await loadFromDB();
  };

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

  // Pull-to-refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const scrollTop = (e.currentTarget as HTMLElement).scrollTop;
    if (deltaY > 60 && scrollTop === 0 && !isPullRefreshing) {
      await handlePullRefresh();
    }
  };

  if (!isReady) return null;

  return (
    <div
      style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto', paddingBottom: 96 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1e3a5f' }}>TUYẾT</h1>
        {isPullRefreshing && (
          <span style={{ fontSize: 13, color: '#888' }}>⟳ Đang đồng bộ...</span>
        )}
      </div>

      {loading && <p style={{ color: '#888' }}>Đang tải...</p>}

      {/* Offline records section */}
      {(offlineAudio.length > 0 || pendingCount > 0) && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, color: '#92400e' }}>
            📶 {offlineAudio.length} ghi âm chờ xử lý
          </span>
          <button
            onClick={handleSyncNow}
            disabled={isProcessing}
            style={{
              background: isProcessing ? '#d97706' : '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: isProcessing ? 'default' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {isProcessing ? 'Đang sync...' : 'Sync ngay'}
          </button>
        </div>
      )}

      {/* Offline audio cards */}
      {offlineAudio.map((audio) => (
        <div key={audio.id} style={{
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 16,
          marginBottom: 12,
          background: '#f7fafc',
          opacity: 0.7,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#888' }}>
              {audio.timestamp ? new Date(audio.timestamp).toLocaleString('vi-VN') : 'Không rõ thời gian'}
            </span>
            <span style={{ fontSize: 12, color: '#d69e2e' }}>⏳ Chờ xử lý...</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>
            Ghi âm {audio.duration ? `${Math.floor(audio.duration)}s` : ''} — chờ kết nối mạng
          </p>
        </div>
      ))}

      {/* Empty state */}
      {!loading && records.length === 0 && offlineAudio.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎙️</div>
          <p>Chưa có ghi âm nào.<br />Bấm micro để bắt đầu!</p>
        </div>
      )}

      {/* Transcript cards */}
      {records.map((r, i) => {
        const daysLeft = r.createdAt ? daysUntilExpiry(r.createdAt) : null;
        return (
          <div key={r.id || i} style={{
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 16,
            marginBottom: 12,
            background: '#fff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#888' }}>
                {r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : 'Không rõ thời gian'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: r.savedToObsidian ? '#38a169' : '#e53e3e' }}>
                  {r.savedToObsidian ? '✅ Đã lưu' : '⚠️ Chưa lưu'}
                </span>
                <button
                  onClick={() => handleBookmark(r.id, r.bookmarked)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                  title={r.bookmarked ? 'Bỏ bookmark' : 'Bookmark để giữ'}
                >
                  {r.bookmarked ? '⭐' : '☆'}
                </button>
              </div>
            </div>

            <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>{r.transcript}</p>

            {r.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {r.tags.map(t => (
                  <span key={t} style={{
                    padding: '2px 8px', background: '#ebf8ff',
                    color: '#2b6cb0', borderRadius: 4, fontSize: 12,
                  }}>#{t}</span>
                ))}
              </div>
            )}

            {/* Expiry label — only for non-bookmarked records */}
            {!r.bookmarked && daysLeft !== null && daysLeft > 0 && (
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>
                Tự xóa sau {daysLeft} ngày — bookmark để giữ lại
              </div>
            )}
            {!r.bookmarked && daysLeft !== null && daysLeft <= 0 && (
              <div style={{ fontSize: 11, color: '#e53e3e', marginBottom: 6 }}>
                Sẽ bị xóa hôm nay — bookmark để giữ lại
              </div>
            )}

            {/* Low-confidence review panel — desktop only */}
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
                        const currentText = corrections[key] ?? seg.text;
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
                              onChange={e => setCorrections(prev => ({ ...prev, [key]: e.target.value }))}
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
        );
      })}
    </div>
  );
}
