import { NextResponse } from 'next/server';
import { getBridgeConfig, isBridgeConfigured } from '@/lib/bridge-config';

export async function GET() {
  try {
    if (!isBridgeConfigured()) {
      return NextResponse.json({
        configured: false,
        bridgeConnected: false,
      });
    }

    const { url, apiKey } = getBridgeConfig();

    // Test bridge connection
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
        },
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (!response.ok) {
        return NextResponse.json({
          configured: true,
          bridgeConnected: false,
          error: 'Bridge returned error',
        });
      }

      const data = await response.json();

      return NextResponse.json({
        configured: true,
        bridgeConnected: true,
        vaultPath: data.vaultPath,
        version: data.version || 'unknown',
        obsidianConnected: data.obsidianConnected,
      });
    } catch (fetchError) {
      return NextResponse.json({
        configured: true,
        bridgeConnected: false,
        error: 'Bridge unreachable',
      });
    }
  } catch (error) {
    console.error('Config status error:', { message: (error as Error).message });
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
