import Dexie, { Table } from 'dexie';
import type { AudioRecord, TranscriptRecord, TaskRecord } from '../types';

export class TuyetDatabase extends Dexie {
  transcripts!: Table<TranscriptRecord, string>;
  audio!: Table<AudioRecord, string>;
  tasks!: Table<TaskRecord, string>;

  constructor(username: string) {
    super(`tuyet-${username}`);
    
    this.version(1).stores({
      transcripts: 'id, audioId, username, createdAt',
      audio: 'id, username, createdAt',
    });

    this.version(2).stores({
      transcripts: 'id, audioId, username, createdAt, intelligenceApplied',
      audio: 'id, username, createdAt, transcriptionEngine',
      tasks: 'id, username, dueDate, completed, createdAt',
    });

    this.version(3).stores({
      transcripts: 'id, audioId, username, createdAt, intelligenceApplied, bookmarked',
      audio: 'id, username, createdAt, transcriptionEngine',
      tasks: 'id, username, dueDate, completed, createdAt',
    }).upgrade(tx => {
      return tx.table('transcripts').toCollection().modify(record => {
        if (record.bookmarked === undefined) record.bookmarked = false;
        if (record.bookmarkedAt === undefined) record.bookmarkedAt = null;
        if (record.lastSyncAttempt === undefined) record.lastSyncAttempt = null;
      });
    });
  }
}

let dbInstance: TuyetDatabase | null = null;

export async function getDb(username: string): Promise<TuyetDatabase> {
  if (!dbInstance || dbInstance.name !== `tuyet-${username}`) {
    dbInstance = new TuyetDatabase(username);
  }
  return dbInstance;
}

export async function saveAudio(
  username: string,
  blob: Blob,
  mimeType: string,
  duration: number
): Promise<string> {
  const db = await getDb(username);
  const id = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await db.audio.add({
    id,
    blob,
    mimeType,
    duration,
    createdAt: new Date().toISOString(),
    username,
  });
  return id;
}

export async function saveTranscript(
  username: string,
  audioId: string,
  transcript: string,
  engine: 'soniox' | 'whisper' | 'assemblyai',
  confidence?: number
): Promise<string> {
  const db = await getDb(username);
  const id = `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await db.transcripts.add({
    id,
    audioId,
    transcript,
    createdAt: new Date().toISOString(),
    savedToObsidian: false,
    username,
    engine,
    confidence,
    intelligenceApplied: false,
  });
  return id;
}

export async function updateTranscriptIntelligence(
  username: string,
  transcriptId: string,
  updates: {
    autoTags?: string[];
    linkedNotes?: string[];
    savedToObsidian?: boolean;
    obsidianFilePath?: string;
  }
): Promise<void> {
  const db = await getDb(username);
  await db.transcripts.update(transcriptId, {
    ...updates,
    intelligenceApplied: true,
  });
}

export async function getRecentTranscripts(
  username: string,
  limit: number = 20
): Promise<TranscriptRecord[]> {
  const db = await getDb(username);
  return db.transcripts
    .where('username')
    .equals(username)
    .reverse()
    .sortBy('createdAt')
    .then(records => records.slice(0, limit));
}

export async function saveTasks(
  username: string,
  tasks: Array<Omit<TaskRecord, 'id' | 'createdAt' | 'username'>>
): Promise<void> {
  const db = await getDb(username);
  const records = tasks.map(task => ({
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    username,
  }));
  await db.tasks.bulkAdd(records);
}

export async function getTasks(
  username: string,
  filter?: { overdue?: boolean; upcoming?: boolean }
): Promise<TaskRecord[]> {
  const db = await getDb(username);
  let query = db.tasks.where('username').equals(username);
  
  const allTasks = await query.toArray();
  
  if (!filter) return allTasks;
  
  const now = new Date().toISOString();
  return allTasks.filter(task => {
    if (!task.dueDate) return false;
    if (filter.overdue && task.dueDate < now && !task.completed) return true;
    if (filter.upcoming && task.dueDate >= now && !task.completed) return true;
    return false;
  });
}

export async function toggleBookmark(
  username: string,
  transcriptId: string
): Promise<void> {
  const db = await getDb(username);
  const record = await db.transcripts.get(transcriptId);
  if (!record) return;
  const now = new Date().toISOString();
  await db.transcripts.update(transcriptId, {
    bookmarked: !record.bookmarked,
    bookmarkedAt: !record.bookmarked ? now : null,
  });
}

export async function updateTranscriptSyncStatus(
  username: string,
  transcriptId: string,
  synced: boolean
): Promise<void> {
  const db = await getDb(username);
  const now = new Date().toISOString();
  await db.transcripts.update(transcriptId, {
    savedToObsidian: synced,
    lastSyncAttempt: now,
  });
}

export async function deleteOldRecords(username: string): Promise<number> {
  const db = await getDb(username);
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const old = await db.transcripts
    .filter(t => !t.bookmarked && t.createdAt < fiveDaysAgo)
    .toArray();
  const audioIds = old.map(t => t.audioId);
  await db.transcripts.bulkDelete(old.map(t => t.id));
  await db.audio.bulkDelete(audioIds);
  return old.length;
}

export async function updateTask(
  username: string,
  taskId: string,
  updates: Partial<TaskRecord>
): Promise<void> {
  const db = await getDb(username);
  await db.tasks.update(taskId, updates);
}
