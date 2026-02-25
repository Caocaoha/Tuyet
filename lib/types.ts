export interface TranscriptRecord {
  id: string;
  audioId: string;
  transcript: string;
  createdAt: string;
  savedToObsidian: boolean;
  obsidianFilePath?: string;
  username: string;
  engine: 'soniox' | 'whisper' | 'assemblyai';
  confidence?: number;
  autoTags?: string[];
  linkedNotes?: string[];
  intelligenceApplied: boolean;
  bookmarked?: boolean;
  bookmarkedAt?: string | null;
  lastSyncAttempt?: string | null;
}

export interface AudioRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  duration: number;
  createdAt: string;
  username: string;
  transcriptionEngine?: 'soniox' | 'whisper' | 'assemblyai';
}

export interface TaskRecord {
  id: string;
  content: string;
  dueDate?: string;
  completed: boolean;
  sourceNote: string;
  obsidianUrl: string;
  createdAt: string;
  username: string;
}

export interface BridgeConfig {
  bridgeUrl: string;
  bridgeKey: string;
  obsidianApiKey: string;
  vaultName: string;
  username: string;
}

export interface TranscriptionResponse {
  transcript: string;
  engine: 'soniox' | 'whisper' | 'assemblyai';
  confidence?: number;
  error?: string;
}

export interface IntelligenceResponse {
  tags: string[];
  confidence: number;
  error?: string;
}

export interface AutoLinkResponse {
  linkedNotes: Array<{
    title: string;
    path: string;
    url: string;
  }>;
  error?: string;
}

export interface ReportRequest {
  topic?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  type: 'topic' | 'daily' | 'weekly';
}

export interface ReportResponse {
  title: string;
  summary: string;
  details: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
  generatedAt: string;
  error?: string;
}
