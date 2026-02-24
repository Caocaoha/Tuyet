// ============================================================
// app/api/transcribe/route.ts — Whisper API Integration
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const requestSchema = z.object({
  audio: z.string(), // base64
  mimeType: z.string()
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, mimeType } = requestSchema.parse(body);
    
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    
    // Determine file extension from mimeType
    const ext = getExtensionFromMimeType(mimeType);
    
    // Create a File object for Whisper API
    const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });
    
    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: undefined, // Auto-detect
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });
    
    // Parse segments and calculate confidence
    const segments = (transcription as any).segments?.map((seg: any) => ({
      startMs: Math.floor(seg.start * 1000),
      endMs: Math.floor(seg.end * 1000),
      text: seg.text,
      confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.9
    })) || [];
    
    const detectedLanguage = (transcription as any).language === 'vietnamese' ? 'vi' : 'en';
    
    return NextResponse.json({
      transcript: transcription.text,
      detectedLanguage,
      segments
    });
    
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', code: 'TRANSCRIBE_ERROR' },
      { status: 500 }
    );
  }
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'mp4',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3'
  };
  return map[mimeType] || 'webm';
}
