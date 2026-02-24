import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  // Only allow if no key exists yet
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  if (envContent.includes('APP_API_KEY=')) {
    return NextResponse.json(
      { error: 'API key already exists', code: 'KEY_EXISTS' },
      { status: 400 }
    );
  }

  // Generate secure random key
  const apiKey = crypto.randomBytes(32).toString('hex');

  // Append to .env.local
  fs.appendFileSync(envPath, `\nAPP_API_KEY=${apiKey}\n`);

  return NextResponse.json({
    success: true,
    apiKey, // Return once for client to store
    message: 'Save this key securely. It will not be shown again.'
  });
}
