// ============================================================
// desktop-bridge/src/middleware/auth.ts
// ============================================================
import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header('x-api-key');
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_API_KEY'
    });
  }
  
  next();
}
