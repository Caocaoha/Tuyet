import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bridgeUrl, bridgeKey } = body;

    if (!bridgeUrl || !bridgeKey) {
      return NextResponse.json(
        { error: 'bridgeUrl and bridgeKey are required' },
        { status: 400 }
      );
    }

    const url = `${bridgeUrl.replace(/\/$/, '')}/health`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': bridgeKey },
        signal: AbortSignal.timeout(5000),
      });
    } catch (fetchErr) {
      return NextResponse.json({
        status: 'error',
        error: `Network error: ${(fetchErr as Error).message}`,
      });
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({
        status: 'error',
        error: `HTTP ${response.status}: ${text}`,
      });
    }

    const result = await response.json();
    return NextResponse.json({
      status: 'ok',
      version: result.version,
      obsidianConnected: result.obsidianConnected,
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', error: (err as Error).message },
      { status: 500 }
    );
  }
}
