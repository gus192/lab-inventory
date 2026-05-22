import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through static assets, login page, and auth API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login'
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('lab_auth')?.value
  const expected = process.env.AUTH_SECRET
    ? Buffer.from(process.env.AUTH_SECRET).toString('base64')
    : null

  if (!token || !expected || token !== expected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
