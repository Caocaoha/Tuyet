import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = [
  '/_next',
  '/static',
  '/favicon.ico',
  '/icon-',
  '/manifest.json',
  '/setup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/config/test-bridge',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const userCookie = req.cookies.get('tuyet_user')?.value;
  
  if (!userCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/setup', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
