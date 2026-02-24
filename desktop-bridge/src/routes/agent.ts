// desktop-bridge/src/routes/agent.ts
import { Router, Request, Response } from 'express';
import { obsidianClient } from '../obsidian/local-rest-api';

const router = Router();

// GET /agent/status — check agent/automation status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const vaultPath = process.env.VAULT_PATH || '';
    res.json({
      status: 'active',
      vault_path: vaultPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Agent status check failed' });
  }
});

// POST /agent/hook — trigger from Obsidian automation
router.post('/hook', async (req: Request, res: Response) => {
  try {
    const { action, payload } = req.body;
    console.log(`Agent hook: ${action}`, payload);
    res.json({ success: true, action, received: true });
  } catch (error) {
    res.status(500).json({ error: 'Agent hook failed' });
  }
});

export default router;
