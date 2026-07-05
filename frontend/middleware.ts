import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token');

  // 1. If user is logged in and trying to access auth pages, send them to the home router
  if (accessToken && pathname.startsWith('/authentication')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. If user is NOT logged in and trying to access dashboard pages, send them to login
  const protectedPaths = ['/admin', '/analyst', '/user'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  if (!accessToken && isProtected) {
    return NextResponse.redirect(new URL('/authentication/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/authentication/:path*',
    '/admin/:path*',
    '/analyst/:path*',
    '/user/:path*',
  ],
};
