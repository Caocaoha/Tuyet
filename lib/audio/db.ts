// lib/audio/db.ts
import Dexie, { Table } from 'dexie';

export interface AudioRecord {
  id: string;
  audioBlob: Blob;
  duration: number;
  timestamp: string;
  status: 'processing' | 'saved' | 'review_pending' | 'reviewed';
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
  createdAt: string;  // ← thêm field này
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

class TuyetDatabase extends Dexie {
  audioRecords!: Table<AudioRecord, string>;
  transcripts!: Table<TranscriptRecord, string>;
  meetings!: Table<MeetingRecord, string>;

  constructor() {
    super('TuyetDB');
    this.version(1).stores({
      audioRecords: 'id, timestamp, status',
      transcripts: 'id, audioId, savedToObsidian',
      meetings: 'id, audioId, meetingDate, savedToObsidian'
    });
    // Version 2: thêm index createdAt
    this.version(2).stores({
      audioRecords: 'id, timestamp, status',
      transcripts: 'id, audioId, savedToObsidian, createdAt',
      meetings: 'id, audioId, meetingDate, savedToObsidian'
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
    createdAt: transcript.createdAt || new Date().toISOString(), // ← luôn có timestamp
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
