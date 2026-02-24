// app/api/config/test-bridge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  bridgeUrl: z.string().url(),
  apiKey: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bridgeUrl, apiKey } = requestSchema.parse(body);

    console.log('test-bridge: calling', `${bridgeUrl}/health`);

    let response: Response;
    try {
      response = await fetch(`${bridgeUrl}/health`, {
        headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(5000)
      });
    } catch (fetchError) {
      console.error('test-bridge fetch error:', fetchError);
      return NextResponse.json({
        success: false,
        error: `Không thể reach Bridge: ${(fetchError as Error).message}`
      });
    }

    const text = await response.text();
    console.log('test-bridge response:', response.status, text);

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Bridge trả về ${response.status}: ${text}`
      });
    }

    const data = JSON.parse(text);

    if (!data.obsidianConnected) {
      return NextResponse.json({
        success: false,
        error: `Bridge kết nối OK nhưng Obsidian chưa connect. VaultPath: ${data.vaultPath}`
      });
    }

    return NextResponse.json({
      success: true,
      vaultPath: data.vaultPath
    });

  } catch (error) {
    console.error('test-bridge error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    });
  }
}
