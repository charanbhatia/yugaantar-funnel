// The call list holds names, emails and phone numbers, so it is staff-only (HTTP Basic auth).
// Fails closed: until STAFF_PASSWORD is set in Vercel the list can't be opened at all.
import { NextResponse } from 'next/server';

export const config = { matcher: ['/calls', '/api/calls/:path*', '/api/calls'] };

function same(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function middleware(req) {
  const password = process.env.STAFF_PASSWORD;
  if (!password) {
    return new NextResponse('The call list is locked. Set STAFF_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.', {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
  const [scheme, encoded] = (req.headers.get('authorization') || '').split(' ');
  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try { decoded = atob(encoded); } catch { /* bad header: treat as wrong password */ }
    const given = decoded.slice(decoded.indexOf(':') + 1);
    if (decoded.includes(':') && same(given, password)) {
      const res = NextResponse.next();
      res.headers.set('Cache-Control', 'private, no-store');
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
  }
  return new NextResponse('Staff only. Use any username and the staff password.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Yugaantar staff call list", charset="UTF-8"', 'Cache-Control': 'no-store' },
  });
}
