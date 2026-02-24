// ============================================================
// app/api/obsidian/search/route.ts — Search Vault
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { formatSearchReport } from '@/lib/obsidian/formatter';

const requestSchema = z.object({
  query: z.string(),
  days: z.number().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, days = 30 } = requestSchema.parse(body);
    
    const config = JSON.parse(process.env.APP_CONFIG || '{}');
    const bridgeUrl = config.desktopBridgeUrl;
    const apiKey = config.bridgeApiKey;
    
    if (!bridgeUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Bridge not configured', code: 'BRIDGE_NOT_CONFIGURED' },
        { status: 400 }
      );
    }
    
    // Search with date filter
    const response = await fetch(
      `${bridgeUrl}/notes/search?q=${encodeURIComponent(query)}&days=${days}&limit=20`,
      {
        headers: {
          'x-api-key': apiKey
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Bridge search failed');
    }
    
    let { results } = await response.json();
    
    // If fewer than 3 results, expand search to full vault
    if (results.length < 3) {
      const fullResponse = await fetch(
        `${bridgeUrl}/notes/search?q=${encodeURIComponent(query)}&limit=20`,
        {
          headers: {
            'x-api-key': apiKey
          }
        }
      );
      
      if (fullResponse.ok) {
        const fullData = await fullResponse.json();
        results = fullData.results;
      }
    }
    
    // Generate report
    const now = new Date();
    const timestamp = now.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const report = formatSearchReport(query, results, timestamp);
    
    // Save report to today's note
    const date = now.toISOString().split('T')[0];
    const filePath = `1. Nháp hàng ngày/${date}.md`;
    
    await fetch(`${bridgeUrl}/notes/append`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        filePath,
        content: report,
        createIfMissing: true
      })
    });
    
    return NextResponse.json({
      results: results.map((r: any) => ({
        path: r.path,
        snippet: r.snippet,
        score: r.score || 0
      })),
      report
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', code: 'SEARCH_ERROR' },
      { status: 500 }
    );
  }
}
