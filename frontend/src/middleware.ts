import { NextResponse, type NextRequest } from 'next/server';

/** Must match AUTH_COOKIE in backend/src/lib/cookies.ts */
const AUTH_COOKIE = 'kb_token';
const PUBLIC_PATHS = ['/login'];

/**
 * Fast route guard that runs before any page renders. It only checks that a
 * session cookie exists; the backend verifies the JWT on every API call and
 * clears the cookie if it's invalid.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(AUTH_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API proxy, Next internals and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
