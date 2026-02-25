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
          content: `Đây là ứng dụng ghi chú bằng giọng nói. Người dùng nói ra để tạo việc cần làm (task). Hãy trích xuất TẤT CẢ các task từ văn bản sau.

Quy tắc:
- Bất kỳ hành động nào cũng là task, dù có hay không có "nhắc tôi", "cần", "phải"
- "Đi ngủ" → task, "Đi chạy" → task, "Tập gym" → task
- "Nhắc tôi mua sữa" → task: "Mua sữa"
- "Việc cần làm là gọi điện" → task: "Gọi điện"
- "Đừng quên nộp báo cáo thứ Sáu" → task: "Nộp báo cáo thứ Sáu", dueDate: ngày thứ Sáu gần nhất
- Nếu có ngày giờ cụ thể → điền dueDate dạng YYYY-MM-DD, nếu không → null

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
