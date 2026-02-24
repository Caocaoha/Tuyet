// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json();

  if (!apiKey || apiKey !== process.env.APP_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Sai API Key' },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ success: true });

  // Set httpOnly cookie — không accessible từ JS
  res.cookies.set('tuyet_session', apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 ngày
    path: '/',
  });

  return res;
}
