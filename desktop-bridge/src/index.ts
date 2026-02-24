// ============================================================
// desktop-bridge/src/index.ts — Bridge Server Entry
// ============================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth';
import healthRouter from './routes/health';
import notesRouter from './routes/notes';
import agentRouter from './routes/agent';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Public routes
app.use('/health', healthRouter);

// Protected routes
app.use(authMiddleware);
app.use('/notes', notesRouter);
app.use('/agent', agentRouter);

app.listen(PORT, () => {
  console.log(`🚀 Desktop Bridge running on http://localhost:${PORT}`);
  console.log(`📁 Vault path: ${process.env.VAULT_PATH}`);
  
  if (process.env.NGROK_AUTH_TOKEN) {
    console.log('🌐 Starting ngrok tunnel...');
    // ngrok setup would go here
  }
});
