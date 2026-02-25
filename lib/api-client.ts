export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

export async function transcribeAudio(
  audioBlob: Blob,
  mimeType: string,
  engine: 'soniox' | 'whisper' | 'assemblyai' = 'soniox'
): Promise<{ transcript: string; engine: string; confidence?: number }> {
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  return apiCall('/api/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audio: base64, mimeType, engine }),
    signal: AbortSignal.timeout(60000),
  });
}

export async function analyzeForTags(
  transcript: string
): Promise<{ tags: string[]; confidence: number }> {
  return apiCall('/api/intelligence/auto-tag', {
    method: 'POST',
    body: JSON.stringify({ transcript }),
    signal: AbortSignal.timeout(30000),
  });
}

export async function saveToObsidian(
  content: string,
  tags: string[],
  autoLink: boolean = true
): Promise<{
  success: boolean;
  filePath?: string;
  linkedNotes?: string[];
  error?: string;
}> {
  return apiCall('/api/obsidian/note', {
    method: 'POST',
    body: JSON.stringify({ content, tags, autoLink }),
    signal: AbortSignal.timeout(30000),
  });
}

export async function extractTasks(
  transcript: string
): Promise<Array<{ content: string; dueDate?: string | null }>> {
  const result = await apiCall<{ tasks: Array<{ content: string; dueDate?: string | null }> }>(
    '/api/intelligence/extract-tasks',
    {
      method: 'POST',
      body: JSON.stringify({ transcript }),
      signal: AbortSignal.timeout(30000),
    }
  );
  return result.tasks || [];
}

export async function generateReport(
  request: {
    topic?: string;
    dateRange?: { start: string; end: string };
    type: 'topic' | 'daily' | 'weekly';
  }
): Promise<{
  title: string;
  summary: string;
  details: string;
  sources: Array<{ title: string; url: string }>;
}> {
  return apiCall('/api/intelligence/report', {
    method: 'POST',
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(60000),
  });
}

export async function fetchTasks(): Promise<
  Array<{
    id: string;
    content: string;
    dueDate?: string;
    completed: boolean;
    sourceNote: string;
    obsidianUrl: string;
  }>
> {
  return apiCall('/api/tasks', {
    method: 'GET',
    signal: AbortSignal.timeout(15000),
  });
}
