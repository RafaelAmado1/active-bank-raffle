import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  // Derive wss:// from https:// for Supabase Realtime WebSocket
  const supabaseWs = supabaseUrl.replace(/^https:/, 'wss:')

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    // unsafe-inline needed for Three.js/R3F inline styles on canvas
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    // wss: for Supabase Realtime; blob: for Three.js worker URLs
    `connect-src 'self' ${supabaseUrl} ${supabaseWs} blob:`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join('; ')

  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', csp)
  // Pass nonce to layout so it can be applied to inline Next.js scripts
  response.headers.set('x-nonce', nonce)
  return response
}

export const config = {
  matcher: [
    // Apply to all routes except static assets and _next internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
