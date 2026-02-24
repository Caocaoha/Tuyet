// desktop-bridge/src/obsidian/local-rest-api.ts
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const OBSIDIAN_API_URL = `http://127.0.0.1:${process.env.OBSIDIAN_PORT || 27123}`;
const VAULT_PATH = process.env.VAULT_PATH || '';

// Auth header cho mọi request đến Obsidian
function obsidianHeaders() {
  return {
    'Authorization': `Bearer ${process.env.OBSIDIAN_API_KEY || ''}`,
    'Content-Type': 'application/json'
  };
}

export async function checkObsidianConnection(): Promise<boolean> {
  try {
    const response = await axios.get(`${OBSIDIAN_API_URL}/vault/`, {
      headers: obsidianHeaders(),
      timeout: 3000
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

export async function appendToNote(
  filePath: string,
  content: string,
  createIfMissing: boolean = true
): Promise<void> {
  try {
    await axios.post(
      `${OBSIDIAN_API_URL}/vault/${encodeURIComponent(filePath)}`,
      content,
      {
        headers: {
          ...obsidianHeaders(),
          'Content-Type': 'text/markdown'
        },
        params: { append: 'true' }
      }
    );
  } catch (error) {
    if (createIfMissing) {
      const fullPath = path.join(VAULT_PATH, filePath);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      let existingContent = '';
      try { existingContent = await fs.readFile(fullPath, 'utf-8'); } catch {}
      await fs.writeFile(fullPath, existingContent + content, 'utf-8');
    } else {
      throw error;
    }
  }
}

export async function searchNotes(
  query: string,
  days?: number,
  limit: number = 20
): Promise<Array<{ path: string; title: string; snippet: string; lastModified: string }>> {
  try {
    const response = await axios.get(`${OBSIDIAN_API_URL}/search/`, {
      headers: obsidianHeaders(),
      params: { query }
    });
    let results = response.data.results || [];
    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      results = results.filter((r: any) => new Date(r.lastModified) >= cutoff);
    }
    return results.slice(0, limit);
  } catch {
    return manualSearch(query, days, limit);
  }
}

async function manualSearch(
  query: string,
  days?: number,
  limit: number = 20
): Promise<Array<{ path: string; title: string; snippet: string; lastModified: string }>> {
  const results: Array<{ path: string; title: string; snippet: string; lastModified: string }> = [];
  const queryLower = query.toLowerCase();

  async function searchDir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= limit) break;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await searchDir(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const stats = await fs.stat(fullPath);
        if (days) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          if (stats.mtime < cutoff) continue;
        }
        const content = await fs.readFile(fullPath, 'utf-8');
        if (content.toLowerCase().includes(queryLower)) {
          const relativePath = path.relative(VAULT_PATH, fullPath);
          const matchLine = content.split('\n').find(l => l.toLowerCase().includes(queryLower)) || '';
          results.push({
            path: relativePath,
            title: entry.name.replace('.md', ''),
            snippet: matchLine.slice(0, 200),
            lastModified: stats.mtime.toISOString()
          });
        }
      }
    }
  }

  await searchDir(VAULT_PATH);
  return results;
}

export async function getFileContent(filePath: string): Promise<string> {
  try {
    const response = await axios.get(
      `${OBSIDIAN_API_URL}/vault/${encodeURIComponent(filePath)}`,
      { headers: obsidianHeaders() }
    );
    return response.data;
  } catch {
    const fullPath = path.join(VAULT_PATH, filePath);
    return fs.readFile(fullPath, 'utf-8');
  }
}

export const obsidianClient = { checkObsidianConnection, appendToNote, searchNotes, getFileContent };
