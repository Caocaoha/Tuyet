// lib/obsidian/bridge.ts
export async function saveNoteToObsidian(
  content: string,
  tags: string[],
  timestamp?: Date
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const now = timestamp || new Date();
  const date = now.toISOString().split('T')[0];

  try {
    const res = await fetch('/api/obsidian/note', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, content, tags, timestamp: now.toISOString() }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
    return JSON.parse(text);
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function checkBridgeConnection(): Promise<boolean> {
  try {
    const res = await fetch('/api/config/status', {
      credentials: 'include',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.obsidianConnected === true;
  } catch { return false; }
}
