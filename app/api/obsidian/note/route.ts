import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const username = req.cookies.get('tuyet_user')?.value;
    if (!username) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { content, tags = [], autoLink = true } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const bridgeUrl = (process.env.OBSIDIAN_BRIDGE_URL || 'http://localhost:3001')
      .replace(/\/$/, '');
    const bridgeKey = process.env.BRIDGE_API_KEY || '';

    let linkedNotes: string[] = [];

    if (autoLink) {
      try {
        const linkResponse = await fetch(`${bridgeUrl}/smart-connections/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': bridgeKey,
          },
          body: JSON.stringify({ query: content, username }),
          signal: AbortSignal.timeout(10000),
        });

        if (linkResponse.ok) {
          const linkResult = await linkResponse.json();
          linkedNotes = (linkResult.related || []).map((note: any) => note.url);
        }
      } catch (linkErr) {
        console.warn('Auto-link failed:', linkErr);
      }
    }

    let finalContent = content;
    if (linkedNotes.length > 0) {
      const linkSection = '\n\nRelated:\n' + linkedNotes
        .map(url => `- ${url.replace(/^obsidian:\/\/open\?.*file=/, '[[').replace(/%20/g, ' ').replace(/\.md$/, ']]')}`)
        .join('\n');
      finalContent += linkSection;
    }

    if (tags.length > 0) {
      finalContent += '\n\n' + tags.map((t: string) => `#${t}`).join(' ');
    }

    const today = new Date().toISOString().split('T')[0];

    let saveResponse: Response;
    try {
      saveResponse = await fetch(`${bridgeUrl}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': bridgeKey,
        },
        body: JSON.stringify({
          date: today,
          content: finalContent,
          username,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (fetchErr) {
      return NextResponse.json(
        { error: `Bridge unreachable: ${(fetchErr as Error).message}` },
        { status: 503 }
      );
    }

    if (!saveResponse.ok) {
      const text = await saveResponse.text();
      return NextResponse.json(
        { error: `Bridge error ${saveResponse.status}: ${text}` },
        { status: 502 }
      );
    }

    const result = await saveResponse.json();

    return NextResponse.json({
      success: true,
      filePath: result.filePath || `Tuyet-${username}/${today}.md`,
      linkedNotes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Save to Obsidian failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
