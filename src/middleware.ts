import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Overwrite any incoming value: only the URL controls the server locale.
  headers.set('x-site-language', request.nextUrl.pathname === '/zh' ? 'zh' : 'en');
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/', '/en', '/zh', '/bridge', '/history'] };
