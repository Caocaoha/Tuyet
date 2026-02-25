// lib/audio/db.ts
import Dexie, { Table } from 'dexie';

export interface AudioRecord {
  id: string;
  audioBlob: Blob;
  duration: number;
  timestamp: string;
  status: 'processing' | 'saved' | 'review_pending' | 'reviewed' | 'offline_pending' | 'error';
  transcriptId: string;
}

export interface TranscriptRecord {
  id: string;
  audioId: string;
  transcript: string;
  detectedLanguage: 'vi' | 'en';
  tags: string[];
  lowConfidenceSegments: ConfidenceSegment[];
  savedToObsidian: boolean;
  obsidianFilePath: string;
  createdAt: string;
  bookmarked?: boolean;
}

export interface ConfidenceSegment {
  startMs: number;
  endMs: number;
  text: string;
  confidence: number;
}

export interface MeetingRecord {
  id: string;
  audioId: string | null;
  rawTranscript: string;
  speakers: SpeakerSegment[];
  summary: string;
  actionItems: string[];
  meetingDate: string;
  startTime: string;
  savedToObsidian: boolean;
}

export interface SpeakerSegment {
  speakerId: string;
  displayName: string;
  text: string;
}

export interface OfflineQueueItem {
  id: string;
  audioId: string;
  audioBlob: Blob;
  mimeType: string;
  duration: number;
  timestamp: string;
  queuedAt: string;
  retryCount: number;
}

class TuyetDatabase extends Dexie {
  audioRecords!: Table<AudioRecord, string>;
  transcripts!: Table<TranscriptRecord, string>;
  meetings!: Table<MeetingRecord, string>;
  offlineQueue!: Table<OfflineQueueItem, string>;

  constructor() {
    super('TuyetDB');
    this.version(1).stores({
      audioRecords: 'id, timestamp, status',
      transcripts: 'id, audioId, savedToObsidian',
      meetings: 'id, audioId, meetingDate, savedToObsidian'
    });
    this.version(2).stores({
      audioRecords: 'id, timestamp, status',
      transcripts: 'id, audioId, savedToObsidian, createdAt',
      meetings: 'id, audioId, meetingDate, savedToObsidian'
    });
    this.version(3).stores({
      audioRecords: 'id, timestamp, status',
      transcripts: 'id, audioId, savedToObsidian, createdAt',
      meetings: 'id, audioId, meetingDate, savedToObsidian',
      offlineQueue: 'id, audioId, queuedAt'
    });
    this.version(4).stores({
      audioRecords: 'id, timestamp, status',
      transcripts: 'id, audioId, savedToObsidian, createdAt, bookmarked',
      meetings: 'id, audioId, meetingDate, savedToObsidian',
      offlineQueue: 'id, audioId, queuedAt'
    });
  }
}

export const db = new TuyetDatabase();

export async function saveAudioRecord(record: Omit<AudioRecord, 'id'>): Promise<string> {
  const id = crypto.randomUUID();
  await db.audioRecords.add({ ...record, id });
  return id;
}

export async function saveTranscript(transcript: Omit<TranscriptRecord, 'id'>): Promise<string> {
  const id = crypto.randomUUID();
  await db.transcripts.add({
    ...transcript,
    id,
    createdAt: transcript.createdAt || new Date().toISOString(),
  });
  return id;
}

export async function getLastSaveStatus(): Promise<{ timestamp: string } | null> {
  const record = await db.audioRecords
    .where('status').equals('saved')
    .reverse().first();
  return record ? { timestamp: record.timestamp } : null;
}

export async function getPendingReviews(): Promise<TranscriptRecord[]> {
  const audioRecords = await db.audioRecords
    .where('status').equals('review_pending').toArray();
  const ids = audioRecords.map(r => r.transcriptId);
  return db.transcripts.where('id').anyOf(ids).toArray();
}

// Offline Queue helpers

export async function saveToOfflineQueue(
  audioBlob: Blob, mimeType: string, duration: number, timestamp: string
): Promise<string> {
  const id = crypto.randomUUID();
  const audioId = crypto.randomUUID();
  await db.audioRecords.add({
    id: audioId, audioBlob, duration, timestamp,
    status: 'offline_pending', transcriptId: '',
  });
  await db.offlineQueue.add({
    id, audioId, audioBlob, mimeType, duration, timestamp,
    queuedAt: new Date().toISOString(),
    retryCount: 0,
  });
  return id;
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  return db.offlineQueue.orderBy('queuedAt').toArray();
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  await db.offlineQueue.delete(id);
}

export async function incrementRetryCount(id: string): Promise<void> {
  const item = await db.offlineQueue.get(id);
  if (item) {
    await db.offlineQueue.update(id, { retryCount: item.retryCount + 1 });
  }
}

// Bookmark helpers

export async function bookmarkTranscript(id: string, bookmarked: boolean): Promise<void> {
  await db.transcripts.update(id, { bookmarked });
}

export async function cleanupExpiredRecords(): Promise<number> {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const expired = await db.transcripts
    .filter(t => t.bookmarked !== true && (t.createdAt || '') < fiveDaysAgo)
    .toArray();
  if (expired.length === 0) return 0;
  const expiredIds = expired.map(t => t.id);
  const audioIds = expired.map(t => t.audioId).filter(Boolean);
  await db.transcripts.bulkDelete(expiredIds);
  if (audioIds.length > 0) await db.audioRecords.bulkDelete(audioIds);
  return expired.length;
}

// F5: Update a low-confidence segment text and reflect in main transcript
export async function updateTranscriptSegment(
  transcriptId: string, segmentIndex: number, correctedText: string
): Promise<void> {
  const record = await db.transcripts.get(transcriptId);
  if (!record) return;

  const segments = [...(record.lowConfidenceSegments || [])];
  if (segmentIndex < 0 || segmentIndex >= segments.length) return;

  const oldText = segments[segmentIndex].text;
  segments[segmentIndex] = { ...segments[segmentIndex], text: correctedText };

  const updatedTranscript = record.transcript.replace(oldText, correctedText);

  await db.transcripts.update(transcriptId, {
    lowConfidenceSegments: segments,
    transcript: updatedTranscript,
  });
}
