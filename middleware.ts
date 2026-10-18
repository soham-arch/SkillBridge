import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/orders',
  '/my-services',
  '/bookings',
  '/requests',
  '/services/create',
  '/profile',
  '/admin',
];

const AUTH_ONLY_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sb-access-token')?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If visiting a protected marketplace route without auth token cookie, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If visiting login/register while already possessing an auth token, allow or continue
  // (client AuthGuard will verify validity and redirect if necessary)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/orders/:path*',
    '/my-services/:path*',
    '/bookings/:path*',
    '/requests/:path*',
    '/services/create/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/forgot-password',
  ],
};
