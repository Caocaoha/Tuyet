// desktop-bridge/src/routes/search.ts
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

interface SearchResult {
  title: string;
  content: string;
  path: string;
  lastModified: string;
}

function parseLocalDate(dateStr: string, endOfDay: boolean): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Use local time to avoid UTC midnight timezone issues (e.g. UTC+7)
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function parseDateRange(dateRange: string): { start: Date | null; end: Date | null } {
  if (!dateRange) return { start: null, end: null };

  if (dateRange.includes('..')) {
    const [startStr, endStr] = dateRange.split('..');
    return { start: parseLocalDate(startStr, false), end: parseLocalDate(endStr, true) };
  }

  // Single date — full day in local time
  return { start: parseLocalDate(dateRange, false), end: parseLocalDate(dateRange, true) };
}

async function searchVault(
  vaultPath: string,
  query: string,
  dateRange: string,
  limit = 20
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const { start, end } = parseDateRange(dateRange);
  const queryLower = query.toLowerCase();

  async function scanDir(dir: string) {
    if (results.length >= limit) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= limit) break;
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.md')) {
        try {
          const stats = await fs.stat(fullPath);

          if (start && end) {
            if (stats.mtime < start || stats.mtime > end) continue;
          }

          const content = await fs.readFile(fullPath, 'utf-8');
          const matches = !queryLower || content.toLowerCase().includes(queryLower) ||
            entry.name.toLowerCase().includes(queryLower);

          if (matches) {
            const relativePath = path.relative(vaultPath, fullPath);
            results.push({
              title: entry.name.replace(/\.md$/, ''),
              content: content.slice(0, 3000),
              path: relativePath,
              lastModified: stats.mtime.toISOString(),
            });
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  if (vaultPath) await scanDir(vaultPath);
  return results;
}

// POST /search — called by Next.js report API route
router.post('/', async (req, res) => {
  try {
    const vaultPath = process.env.VAULT_PATH || '';

    if (!vaultPath) {
      return res.json({ results: [] });
    }

    const { query = '', username, dateRange = '' } = req.body;

    const results = await searchVault(vaultPath, query, dateRange);

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: (error as Error).message, results: [] });
  }
});

export default router;
