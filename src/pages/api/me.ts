import type { APIRoute } from 'astro';

// The caller's own claims, and nothing else.
//
// The reverse proxy runs the outpost and forwards the identity headers; this route renames them into the
// response, so the browser reads them from a same-origin response and no token ever reaches JavaScript.
// The client cannot forge them: Caddy deletes these headers from the incoming request before the outpost
// writes them, and nothing but Caddy can reach this process.
export const prerender = false;

const HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['x-authentik-username', 'x-portal-username'],
  ['x-authentik-name', 'x-portal-name'],
  ['x-authentik-groups', 'x-portal-groups'],
];

export const GET: APIRoute = ({ request }) => {
  const headers = new Headers({ 'cache-control': 'no-store' });
  for (const [from, to] of HEADERS) headers.set(to, request.headers.get(from) ?? '');
  return new Response(null, { status: 200, headers });
};
