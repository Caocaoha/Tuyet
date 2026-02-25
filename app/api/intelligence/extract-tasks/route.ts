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
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Trích xuất TẤT CẢ việc cần làm từ văn bản sau. Bao gồm mọi câu có dạng: "nhắc tôi...", "cần làm...", "phải làm...", "việc cần làm là...", "cần nhớ...", "đừng quên...", "làm ơn...", "hãy...".

Ví dụ:
- "Nhắc tôi mua sữa" → task: "Mua sữa"
- "Việc cần làm là gọi điện cho khách" → task: "Gọi điện cho khách"
- "Nhắc tôi đi ngủ trước 12h tối nay" → task: "Đi ngủ trước 12h tối nay"
- "Cần đặt vé máy bay ngày mai" → task: "Đặt vé máy bay"
- "Đừng quên nộp báo cáo thứ Sáu" → task: "Nộp báo cáo thứ Sáu"

Chỉ trả về JSON:
{"tasks": [{"content": "tên task", "dueDate": "YYYY-MM-DD hoặc null"}]}

Văn bản:
${transcript}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ tasks: [] });
    }

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
