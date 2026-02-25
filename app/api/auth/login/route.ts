import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, apiKey } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be 2-20 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain a-z, 0-9, and hyphens' },
        { status: 400 }
      );
    }

    if (apiKey !== process.env.APP_API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, username });
    response.cookies.set('tuyet_user', username, {
      httpOnly: false,  // must be readable by document.cookie client-side
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: `Login failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
