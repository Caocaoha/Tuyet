// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = [
  '/_next', '/static', '/favicon', '/icon-', '/manifest.json',
  '/setup',
  '/api/auth/login',     // login endpoint
  '/api/auth/logout',
  '/api/config/test-bridge',
  '/api/config/generate-key',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bỏ qua public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Kiểm tra session cookie
  const session = req.cookies.get('tuyet_session')?.value;
  const validSession = process.env.APP_API_KEY
    ? session === process.env.APP_API_KEY
    : false;

  // API routes → trả JSON 401
  if (pathname.startsWith('/api')) {
    if (!validSession) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'NO_SESSION' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Page routes → redirect về /setup
  if (!validSession) {
    return NextResponse.redirect(new URL('/setup', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
