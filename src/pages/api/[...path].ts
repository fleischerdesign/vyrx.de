import type { APIRoute } from 'astro';

// Everything under /api/ that has no route of its own.
//
// The pages and the API are served by the same process, so without this file an unknown API path would
// be answered with the HTML 404 page. A caller that asked for JSON should not have to parse a document to
// learn that the path does not exist - and the reverse proxy cannot tell the two apart, which is why this
// belongs here and not in the ingress configuration.
//
// `ALL` answers every method: what does not exist does not exist for GET any more than for POST. Specific
// routes win over this one, so `/api/me`, `/api/status` and `/api/hosts` are untouched.
export const prerender = false;

export const ALL: APIRoute = ({ request, url }) =>
  new Response(JSON.stringify({ error: 'not_found', method: request.method, path: url.pathname }), {
    status: 404,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
