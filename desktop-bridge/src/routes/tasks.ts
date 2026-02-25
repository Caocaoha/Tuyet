// desktop-bridge/src/routes/tasks.ts
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

interface Task {
  content: string;
  dueDate?: string;
  completed: boolean;
  sourceNote: string;
  filePath: string;
}

function parseTasksFromContent(content: string, relPath: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^[-*]\s+\[( |x)\]\s+(.+)$/);
    if (!match) continue;

    const completed = match[1] === 'x';
    let taskContent = match[2].trim();

    // Parse due date: 📅 YYYY-MM-DD
    let dueDate: string | undefined;
    const dueDateMatch = taskContent.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    if (dueDateMatch) {
      dueDate = dueDateMatch[1];
      taskContent = taskContent.replace(/📅\s*\d{4}-\d{2}-\d{2}/, '').trim();
    }

    tasks.push({
      content: taskContent,
      dueDate,
      completed,
      sourceNote: path.basename(relPath, '.md'),
      filePath: relPath,
    });
  }

  return tasks;
}

async function scanVaultForTasks(vaultPath: string): Promise<Task[]> {
  const allTasks: Task[] = [];

  async function scanDir(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.md')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const relPath = path.relative(vaultPath, fullPath);
          allTasks.push(...parseTasksFromContent(content, relPath));
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  if (vaultPath) await scanDir(vaultPath);
  return allTasks;
}

// POST /tasks — called by Next.js API route
router.post('/', async (req, res) => {
  try {
    const vaultPath = process.env.VAULT_PATH || '';

    if (!vaultPath) {
      return res.json({ tasks: [] });
    }

    const allTasks = await scanVaultForTasks(vaultPath);
    const uncompleted = allTasks.filter(t => !t.completed);

    res.json({ tasks: uncompleted });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({ error: (error as Error).message, tasks: [] });
  }
});

export default router;
