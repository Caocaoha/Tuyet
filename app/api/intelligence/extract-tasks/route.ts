import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const enableIntelligence = process.env.NEXT_PUBLIC_ENABLE_INTELLIGENCE === 'true';
    if (!enableIntelligence) {
      return NextResponse.json({ tasks: [] });
    }

    const body = await req.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ tasks: [] });
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Trích xuất các công việc cần làm (action items/tasks) từ nội dung sau. Nếu không có tasks thì trả về mảng rỗng.

Trả về JSON theo format:
{"tasks": [{"content": "tên task", "dueDate": "YYYY-MM-DD hoặc null"}]}

Chỉ trả về JSON, không giải thích.

Nội dung:
${transcript}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ tasks: [] });
    }

    // Extract JSON object from anywhere in Claude's response (handles markdown fences, extra text)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ tasks: [] });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    return NextResponse.json({ tasks });
  } catch (err) {
    console.error('Extract tasks error:', err);
    return NextResponse.json({ tasks: [] });
  }
}
