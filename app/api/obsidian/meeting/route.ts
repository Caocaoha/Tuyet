// app/api/obsidian/meeting/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const speakerSchema = z.object({
  speakerId: z.string(),
  displayName: z.string(),
  text: z.string().min(1),
});

const meetingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  speakers: z.array(speakerSchema).min(1),
  summary: z.string().min(10).max(5000),
  actionItems: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = meetingSchema.parse(await req.json());

    const bridgeUrl = (process.env.OBSIDIAN_BRIDGE_URL || 'http://localhost:3001').replace(/\/$/, '');
    const bridgeKey = process.env.BRIDGE_API_KEY || '';

    if (!bridgeUrl) {
      return NextResponse.json({ error: 'Bridge not configured' }, { status: 400 });
    }

    const filePath = `1. Nháp hàng ngày/${body.date}-meeting.md`;

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
    }
    markdown += '---\n';

    let response: Response;
    try {
      response = await fetch(`${bridgeUrl}/notes/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': bridgeKey },
        body: JSON.stringify({ filePath, content: markdown, createIfMissing: true }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (fetchErr) {
      return NextResponse.json({ error: `Bridge unreachable: ${(fetchErr as Error).message}` }, { status: 503 });
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Bridge error ${response.status}: ${text}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, filePath });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
