// desktop-bridge/src/routes/notes.ts
import { Router } from 'express';
import { appendToNote, searchNotes, getFileContent } from '../obsidian/local-rest-api';
import path from 'path';

const router = Router();

// POST /notes — endpoint chính để lưu voice note vào Obsidian
router.post('/', async (req, res) => {
  try {
    const { date, content, tags } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    // Tạo tên file theo ngày: 2024-01-15.md
    const dateStr = date || new Date().toISOString().split('T')[0];
    const filePath = `Tuyet/${dateStr}.md`;

    // Format nội dung
    const now = new Date();
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const tagStr = tags?.length ? `\nTags: ${tags.map((t: string) => `#${t}`).join(' ')}` : '';

    const noteContent = `\n## ${time}\n${content}${tagStr}\n`;

    await appendToNote(filePath, noteContent, true);

    res.json({ success: true, filePath });
  } catch (error) {
    console.error('Save note error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// POST /notes/append — legacy endpoint
router.post('/append', async (req, res) => {
  try {
    const { filePath, content, createIfMissing } = req.body;
    await appendToNote(filePath, content, createIfMissing);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: 'Query required' });
    const days = req.query.days ? parseInt(req.query.days as string) : undefined;
    const results = await searchNotes(query, days);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
