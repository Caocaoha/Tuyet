// desktop-bridge/src/routes/health.ts
import { Router } from 'express';
import { checkObsidianConnection } from '../obsidian/local-rest-api';

const router = Router();

router.get('/', async (req, res) => {
  console.log('Health check called');
  
  try {
    console.log('Checking Obsidian connection...');
    console.log('OBSIDIAN_API_KEY:', process.env.OBSIDIAN_API_KEY ? 'SET' : 'NOT SET');
    console.log('OBSIDIAN_PORT:', process.env.OBSIDIAN_PORT || '27123 (default)');
    
    const obsidianConnected = await checkObsidianConnection();
    console.log('obsidianConnected:', obsidianConnected);

    res.json({
      status: 'ok',
      vaultPath: process.env.VAULT_PATH,
      obsidianConnected
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: (error as Error).message
    });
  }
});

export default router;
