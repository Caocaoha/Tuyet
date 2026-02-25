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

export async function updateTask(
  username: string,
  taskId: string,
  updates: Partial<TaskRecord>
): Promise<void> {
  const db = await getDb(username);
  await db.tasks.update(taskId, updates);
}
