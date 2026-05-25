import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('brixgate_token')?.value
  const { pathname } = request.nextUrl

  // Not logged in — redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = (request.cookies.get('brixgate_role')?.value ?? '').toUpperCase()

  // Admin routes — only ADMIN role
  if (pathname.startsWith('/admin')) {
    if (role && role !== 'ADMIN') {
      const dest = role === 'INSTRUCTOR' ? '/instructor/dashboard' : '/student/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  // Instructor routes — only INSTRUCTOR (or ADMIN as fallback)
  if (pathname.startsWith('/instructor')) {
    if (role && role !== 'INSTRUCTOR' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/student/dashboard', request.url))
    }
  }

  // Student routes — not for ADMIN or INSTRUCTOR
  if (pathname.startsWith('/student')) {
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    if (role === 'INSTRUCTOR') {
      return NextResponse.redirect(new URL('/instructor/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*', '/instructor/:path*', '/admin/:path*'],
}
