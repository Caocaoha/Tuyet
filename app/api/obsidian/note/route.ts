// app/api/obsidian/note/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { date, content, tags, timestamp } = await req.json();

    if (!content) {
      return NextResponse.json({ success: false, error: 'content required' }, { status: 400 });
    }

    const bridgeUrl = (process.env.OBSIDIAN_BRIDGE_URL || 'http://localhost:3001').replace(/\/$/, '');
    const bridgeKey = process.env.BRIDGE_API_KEY || '';

    // Tính thời gian từ timestamp
    const now = timestamp ? new Date(timestamp) : new Date();
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date || now.toISOString().split('T')[0];

    let response: Response;
    try {
      response = await fetch(`${bridgeUrl}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': bridgeKey,
        },
        body: JSON.stringify({ date: dateStr, time, content, tags }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (fetchErr) {
      return NextResponse.json({
        success: false,
        error: `Bridge không phản hồi: ${(fetchErr as Error).message}`
      }, { status: 503 });
    }

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Bridge lỗi ${response.status}: ${text}`
      }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(text));
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
