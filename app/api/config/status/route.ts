// app/api/config/status/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const bridgeUrl = (process.env.OBSIDIAN_BRIDGE_URL || 'http://localhost:3001').replace(/\/$/, '');
    const bridgeKey = process.env.BRIDGE_API_KEY || '';

    if (!bridgeUrl) {
      return NextResponse.json({ configured: false, bridgeConnected: false });
    }

    try {
      const response = await fetch(`${bridgeUrl}/health`, {
        headers: { 'x-api-key': bridgeKey },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return NextResponse.json({ configured: true, bridgeConnected: false, error: 'Bridge returned error' });
      }

      const data = await response.json();
      return NextResponse.json({
        configured: true,
        bridgeConnected: true,
        obsidianConnected: data.obsidianConnected,
        vaultPath: data.vaultPath,
      });
    } catch {
      return NextResponse.json({ configured: true, bridgeConnected: false, error: 'Bridge unreachable' });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
