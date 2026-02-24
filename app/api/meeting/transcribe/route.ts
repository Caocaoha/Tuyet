import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const meetingSchema = z.object({
  audio: z.string().min(1), // base64
  mimeType: z.string(),
});

export async function POST(req: NextRequest) {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    return NextResponse.json(
      { error: 'AssemblyAI not configured', code: 'NO_API_KEY' },
      { status: 503 }
    );
  }

  try {
    const body = meetingSchema.parse(await req.json());

    // Upload audio to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        'content-type': body.mimeType,
      },
      body: Buffer.from(body.audio, 'base64'),
    });

    const { upload_url } = await uploadResponse.json();

    // Start transcription with speaker diarization
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: process.env.ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: true, // Enable diarization
        auto_chapters: true, // For summary
      }),
    });

    const { id } = await transcriptResponse.json();

    // BUG-018 fix: Poll with explicit timeout
    const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    let transcript: any;

    while (true) {
      if (Date.now() - startTime > MAX_WAIT_TIME) {
        return NextResponse.json(
          { 
            error: 'Transcription timeout', 
            code: 'ASSEMBLYAI_TIMEOUT',
            message: 'Processing took longer than 5 minutes'
          },
          { status: 504 }
        );
      }

      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY,
        },
      });

      transcript = await pollResponse.json();

      if (transcript.status === 'completed') break;
      if (transcript.status === 'error') {
        return NextResponse.json(
          { error: 'Transcription failed', code: 'ASSEMBLYAI_ERROR', details: transcript.error },
          { status: 500 }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    }

    // Extract speakers
    const speakers = transcript.utterances.map((utt: any) => ({
      speakerId: `SPEAKER_${utt.speaker}`,
      displayName: `Speaker ${utt.speaker}`,
      text: utt.text,
      startMs: utt.start,
      endMs: utt.end,
    }));

    // Generate summary from chapters
    const summary = transcript.chapters
      ?.map((ch: any) => ch.summary)
      .join('\n') || 'No summary available';

    // BUG-019 fix: Improved action item extraction
    const actionItems = extractActionItems(transcript.text);

    return NextResponse.json({
      speakers,
      summary,
      actionItems,
      rawTranscript: transcript.text,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', code: 'INVALID_INPUT', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Meeting transcribe error:', { message: (error as Error).message });
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// BUG-019 fix: More precise action item extraction
function extractActionItems(text: string): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const actionItems: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    
    // Must contain action verb + target + optional deadline
    const actionPattern = /\b(will|should|must|need to|have to)\s+(.{10,})\b(by|before|until|next)/i;
    const match = trimmed.match(actionPattern);
    
    if (match) {
      actionItems.push(trimmed);
    }
  }

  return actionItems;
}
