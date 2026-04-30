import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// AUTH TEMPORARILY DISABLED — allow all routes without a token
// Re-enable by restoring the token check below before go-live
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*', '/instructor/:path*', '/admin/:path*'],
}
