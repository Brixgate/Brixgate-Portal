/**
 * /api/proxy/[...path]
 *
 * Server-side proxy to api.brixgate.com — bypasses CORS entirely because
 * the request is made server-to-server (Vercel → API), not browser → API.
 *
 * The browser calls /api/proxy/users/me  →  this route calls
 * https://api.brixgate.com/api/v1/users/me and returns the result.
 *
 * Authorization headers are forwarded as-is so authenticated endpoints
 * continue to work once the backend issues tokens.
 */

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.brixgate.com/api/v1'

// Headers we forward from the incoming request to the upstream API
const FORWARD_HEADERS = ['authorization', 'content-type', 'accept']

async function handler(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const upstreamPath = params.path.join('/')
  const search      = request.nextUrl.search          // preserves ?role=STUDENT&page=1 etc.
  const upstreamUrl = `${API_BASE}/${upstreamPath}${search}`

  // Build forwarded headers
  const headers: Record<string, string> = {}
  for (const key of FORWARD_HEADERS) {
    const val = request.headers.get(key)
    if (val) headers[key] = val
  }
  if (!headers['accept']) headers['accept'] = 'application/json'

  // Forward body for POST / PUT / PATCH
  let body: string | undefined
  if (!['GET', 'HEAD', 'DELETE'].includes(request.method)) {
    body = await request.text()
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method:  request.method,
      headers,
      body,
      // Don't cache — always fresh
      cache: 'no-store',
    })

    const responseBody = await upstream.text()

    return new NextResponse(responseBody, {
      status:  upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    })
  } catch (err) {
    console.error('[proxy] upstream error', upstreamUrl, err)
    return NextResponse.json(
      { success: false, message: 'Upstream API unreachable' },
      { status: 502 }
    )
  }
}

export const GET    = handler
export const POST   = handler
export const PUT    = handler
export const PATCH  = handler
export const DELETE = handler
