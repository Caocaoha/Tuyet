// app/api/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  audio: z.string(),
  mimeType: z.string()
});

// Không khởi tạo OpenAI ở module level — chỉ khởi tạo trong function
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, mimeType } = requestSchema.parse(body);

    // Check size limit (Vercel 4.5MB limit)
    const audioBuffer = Buffer.from(audio, 'base64');
    const sizeMB = audioBuffer.length / (1024 * 1024);
    if (sizeMB > 4) {
      return NextResponse.json(
        {
          error: 'Audio file too large',
          code: 'SIZE_LIMIT_EXCEEDED',
          details: `File size: ${sizeMB.toFixed(2)}MB (max 4MB)`
        },
        { status: 413 }
      );
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not set');
      return NextResponse.json(
        {
          error: 'Server misconfigured',
          code: 'API_KEY_MISSING'
        },
        { status: 500 }
      );
    }

    // Khởi tạo bên trong function để tránh lỗi lúc build
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const ext = getExtensionFromMimeType(mimeType);
    const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Transcription error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      apiKeyExists: !!process.env.OPENAI_API_KEY,
    });
    return NextResponse.json(
      {
        error: 'Transcription failed',
        code: 'TRANSCRIBE_ERROR',
        details: errorMessage
      },
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
