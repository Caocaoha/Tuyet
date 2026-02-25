import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const importSchema = z.object({
  rawTranscript: z.string().min(10), // Will add size check separately
  source: z.enum(['zoom', 'meet', 'other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

// BUG-023 fix: Size limit check
const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    // Check content-length header first
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_IMPORT_SIZE) {
      return NextResponse.json(
        { 
          error: 'Payload too large', 
          code: 'SIZE_LIMIT',
          maxSize: '5MB',
          receivedSize: `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 413 }
      );
    }

    const body = importSchema.parse(await req.json());

    // Double-check actual transcript size
    const transcriptSize = Buffer.byteLength(body.rawTranscript, 'utf-8');
    if (transcriptSize > MAX_IMPORT_SIZE) {
      return NextResponse.json(
        { 
          error: 'Transcript too large', 
          code: 'SIZE_LIMIT',
          maxSize: '5MB',
          receivedSize: `${(transcriptSize / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 413 }
      );
    }

    // Parse transcript based on source format
    const parsed = parseTranscript(body.rawTranscript, body.source);

    if (!parsed.speakers || parsed.speakers.length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not parse speakers', 
          code: 'PARSE_ERROR',
          suggestion: 'Ensure transcript contains speaker names/timestamps'
        },
        { status: 400 }
      );
    }

    // Save to meeting file (reuse meeting endpoint logic)
    const meetingResponse = await fetch(`${req.nextUrl.origin}/api/obsidian/meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        date: body.date,
        startTime: body.startTime,
        speakers: parsed.speakers,
        summary: parsed.summary || 'Imported from ' + body.source,
        actionItems: parsed.actionItems || [],
      }),
    });

    if (!meetingResponse.ok) {
      const error = await meetingResponse.json();
      return NextResponse.json(error, { status: meetingResponse.status });
    }

    return NextResponse.json({
      success: true,
      filePath: `1. Nháp hàng ngày/${body.date}-meeting.md`,
      speakersFound: parsed.speakers.length,
      actionItemsFound: parsed.actionItems?.length || 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', code: 'INVALID_INPUT', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Import error:', { message: (error as Error).message });
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

function parseTranscript(text: string, source: string) {
  // Simplified parser (full implementation would be more robust)
  const lines = text.split('\n').filter(l => l.trim());
  const speakers: any[] = [];
  let currentSpeaker: any = null;

  for (const line of lines) {
    // Zoom format: "00:01:23 John Doe: text"
    const zoomMatch = line.match(/^(\d{2}:\d{2}:\d{2})\s+([^:]+):\s*(.+)$/);
    if (zoomMatch && source === 'zoom') {
      if (currentSpeaker) speakers.push(currentSpeaker);
      currentSpeaker = {
        speakerId: `SPEAKER_${speakers.length}`,
        displayName: zoomMatch[2].trim(),
        text: zoomMatch[3].trim(),
      };
      continue;
    }

    // Generic format: "Name: text"
    const genericMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (genericMatch) {
      if (currentSpeaker) speakers.push(currentSpeaker);
      currentSpeaker = {
        speakerId: `SPEAKER_${speakers.length}`,
        displayName: genericMatch[1].trim(),
        text: genericMatch[2].trim(),
      };
      continue;
    }

    // Continuation of previous speaker
    if (currentSpeaker && line.trim()) {
      currentSpeaker.text += ' ' + line.trim();
    }
  }

  if (currentSpeaker) speakers.push(currentSpeaker);

  return {
    speakers,
    summary: null,
    actionItems: [],
  };
}
