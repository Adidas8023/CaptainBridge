import { NextResponse, type NextRequest } from 'next/server';

// Wallet pages (/bridge, /history) are server-rendered in the visitor's language
// so the first paint matches what the client picks: ?lang, then the saved choice
// (cookie mirrors localStorage), then the browser language. Without this the page
// rendered in English and switched to Chinese after hydration.
const LANGUAGE_COOKIE = 'cctp-language';

function pickLanguage(request: NextRequest): 'en' | 'zh' {
  const query = request.nextUrl.searchParams.get('lang');
  if (query === 'en' || query === 'zh') return query;
  const saved = request.cookies.get(LANGUAGE_COOKIE)?.value;
  if (saved === 'en' || saved === 'zh') return saved;
  const accept = request.headers.get('accept-language') ?? '';
  return accept.trim().toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Overwrite any incoming value: only the request itself decides the language.
  headers.set('x-site-language', pickLanguage(request));
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/bridge', '/history'] };
