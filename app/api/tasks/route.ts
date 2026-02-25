import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const username = req.cookies.get('tuyet_user')?.value;
    if (!username) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const bridgeUrl = (process.env.OBSIDIAN_BRIDGE_URL || 'http://localhost:3001')
      .replace(/\/$/, '');
    const bridgeKey = process.env.BRIDGE_API_KEY || '';

    let response: Response;
    try {
      response = await fetch(`${bridgeUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': bridgeKey,
        },
        body: JSON.stringify({ username }),
        signal: AbortSignal.timeout(30000),
      });
    } catch (fetchErr) {
      return NextResponse.json(
        { error: `Bridge unreachable: ${(fetchErr as Error).message}` },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Bridge error ${response.status}: ${text}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result.tasks || []);
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch tasks failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
