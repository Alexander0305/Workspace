import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that don't require authentication (route handlers manage their own auth logic)
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/seed',
  '/api/auth/setup',
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/change-password',
]

// Paths that require admin role
const ADMIN_PATHS = [
  '/api/admin',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply to /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow public auth routes
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Get token from Authorization header or cookie
  let token: string | null = null

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }

  if (!token) {
    const cookieToken = request.cookies.get('nova-session')?.value
    if (cookieToken) {
      token = cookieToken
    }
  }

  // No token found - reject
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // For admin routes, we need to check the user role
  // But we can't do async DB calls in proxy
  // So we pass the token along and let the API route handler verify admin access
  // We add a header with the token so the route handler can use it
  if (ADMIN_PATHS.some((path) => pathname.startsWith(path))) {
    // Add a custom header to indicate admin check is needed
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-admin-check', 'required')
    requestHeaders.set('x-session-token', token)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // For regular authenticated routes, add the token to headers for easy access
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-session-token', token)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
