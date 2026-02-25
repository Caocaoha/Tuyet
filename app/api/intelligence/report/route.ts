import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const enableIntelligence = process.env.NEXT_PUBLIC_ENABLE_INTELLIGENCE === 'true';
    if (!enableIntelligence) {
      return NextResponse.json(
        { error: 'Intelligence features disabled' },
        { status: 503 }
      );
    }

    const username = req.cookies.get('tuyet_user')?.value;
    if (!username) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { topic, dateRange, type } = body;

    if (!type || !['topic', 'daily', 'weekly'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be: topic, daily, or weekly' },
        { status: 400 }
      );
    }

    const bridgeUrl = (process.env.OBSIDIAN_BRIDGE_URL || 'http://localhost:3001')
      .replace(/\/$/, '');
    const bridgeKey = process.env.BRIDGE_API_KEY || '';

    if (!bridgeUrl || !bridgeKey) {
      return NextResponse.json(
        { error: 'Bridge not configured' },
        { status: 500 }
      );
    }

    let searchQuery = '';
    let dateFilter = '';

    if (type === 'topic') {
      if (!topic || typeof topic !== 'string') {
        return NextResponse.json(
          { error: 'Topic is required for topic report' },
          { status: 400 }
        );
      }
      searchQuery = topic;
    } else if (type === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      searchQuery = '';
      dateFilter = today;
    } else if (type === 'weekly') {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const startDate = weekAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      searchQuery = '';
      dateFilter = `${startDate}..${endDate}`;
    }

    let bridgeResponse: Response;
    try {
      bridgeResponse = await fetch(`${bridgeUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': bridgeKey,
        },
        body: JSON.stringify({
          query: searchQuery,
          username,
          dateRange: dateFilter,
        }),
        signal: AbortSignal.timeout(30000),
      });
    } catch (fetchErr) {
      return NextResponse.json(
        { error: `Bridge unreachable: ${(fetchErr as Error).message}` },
        { status: 503 }
      );
    }

    if (!bridgeResponse.ok) {
      const text = await bridgeResponse.text();
      return NextResponse.json(
        { error: `Bridge search failed (${bridgeResponse.status}): ${text}` },
        { status: 502 }
      );
    }

    const searchResult = await bridgeResponse.json();
    const notes = searchResult.notes || searchResult.results || [];

    if (notes.length === 0) {
      return NextResponse.json({
        title: type === 'topic' ? `Báo cáo: ${topic}` : `Báo cáo ${type}`,
        summary: 'Không tìm thấy ghi chú nào phù hợp với tiêu chí tìm kiếm.',
        details: 'Hãy thử lại với tiêu chí khác hoặc kiểm tra xem Obsidian Bridge có đang hoạt động không.',
        sources: [],
        generatedAt: new Date().toISOString(),
      });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Limit to 10 notes, 800 chars each to avoid Claude timeout
    const notesContent = notes
      .slice(0, 10)
      .map((n: any) => {
        const title = n.title || n.name || 'Untitled';
        const content = (n.content || n.text || '').slice(0, 800);
        return `## ${title}\n${content}`;
      })
      .join('\n\n');

    let prompt = '';
    if (type === 'topic') {
      prompt = `Tạo báo cáo tổng hợp về chủ đề "${topic}" dựa trên các ghi chú sau. Viết phần tóm tắt 3 câu ngắn gọn, sau đó là chi tiết đầy đủ.`;
    } else if (type === 'daily') {
      prompt = `Tạo báo cáo tổng hợp các hoạt động trong ngày hôm nay dựa trên các ghi chú. Viết phần tóm tắt 3 câu, sau đó là chi tiết.`;
    } else {
      prompt = `Tạo báo cáo tổng hợp các hoạt động trong tuần qua dựa trên các ghi chú. Viết phần tóm tắt 3 câu, sau đó là chi tiết.`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${prompt}

Ghi chú:
${notesContent}

Trả về theo format:
SUMMARY: [3 câu tóm tắt]
---
DETAILS: [chi tiết đầy đủ]`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response format from Claude' },
        { status: 500 }
      );
    }

    const responseText = content.text;
    const parts = responseText.split('---');
    const summary = parts[0]?.replace('SUMMARY:', '').trim() || '';
    const details = parts[1]?.replace('DETAILS:', '').trim() || responseText;

    const sources = notes.slice(0, 10).map((n: any) => {
      const title = n.title || n.name || 'Untitled';
      const path = n.path || n.file || '';
      const vault = n.vault || 'default';
      return {
        title,
        url: n.url || `obsidian://open?vault=${vault}&file=${encodeURIComponent(path)}`,
      };
    });

    return NextResponse.json({
      title: type === 'topic' ? `Báo cáo: ${topic}` : `Báo cáo ${type}`,
      summary,
      details,
      sources,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Report generation error:', err);
    return NextResponse.json(
      { error: `Report generation failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
