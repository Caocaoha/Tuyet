import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const enableIntelligence = process.env.NEXT_PUBLIC_ENABLE_INTELLIGENCE === 'true';
    if (!enableIntelligence) {
      return NextResponse.json({
        tags: [],
        confidence: 0,
        error: 'Intelligence features disabled',
      });
    }

    const body = await req.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
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

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Phân tích nội dung sau và gán 3-5 tags phù hợp. Tags nên là từ khóa ngắn gọn, viết thường, không dấu, cách nhau bởi dấu phẩy. Chỉ trả về danh sách tags, không giải thích.

Nội dung:
${transcript}

Tags:`,
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

    const tagsText = content.text.trim();
    const tags = tagsText
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0)
      .slice(0, 5);

    return NextResponse.json({
      tags,
      confidence: 0.85,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Auto-tag failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
