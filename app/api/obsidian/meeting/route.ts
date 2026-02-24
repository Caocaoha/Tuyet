import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBridgeConfig } from '@/lib/bridge-config';

// BUG-022 fix: Comprehensive schema validation
const speakerSchema = z.object({
  speakerId: z.string(),
  displayName: z.string(),
  text: z.string().min(1),
});

const meetingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  speakers: z.array(speakerSchema).min(1),
  summary: z.string().min(10).max(5000), // Required, min 10 chars
  actionItems: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = meetingSchema.parse(await req.json());

    const { url, apiKey } = getBridgeConfig();
    if (!url) {
      return NextResponse.json(
        { error: 'Bridge not configured', code: 'NO_BRIDGE' },
        { status: 400 }
      );
    }

    const filePath = `1. Nháp hàng ngày/${body.date}-meeting.md`;

    // Format meeting content
    let markdown = `\n## Cuộc họp — ${body.startTime}\n\n`;
    markdown += `### Tóm tắt\n${body.summary}\n\n`;
    markdown += `### Chi tiết\n`;
    
    for (const speaker of body.speakers) {
      markdown += `**${speaker.displayName}:** ${speaker.text}\n\n`;
    }

    if (body.actionItems.length > 0) {
      markdown += `### Action Items\n`;
      for (const item of body.actionItems) {
        markdown += `- [ ] ${item}\n`;
      }
      markdown += '\n';
    }

    markdown += '---\n';

    const response = await fetch(`${url}/notes/append`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        filePath,
        content: markdown,
        createIfMissing: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Bridge error', code: 'BRIDGE_ERROR', details: error },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, filePath });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', code: 'INVALID_INPUT', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Meeting save error:', { message: (error as Error).message });
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
