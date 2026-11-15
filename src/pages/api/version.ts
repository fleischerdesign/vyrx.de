import type { APIRoute } from 'astro';
import { buildId } from '../../lib/build.ts';
import { readSession } from '../../lib/session.ts';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = readSession(request);
  if (!session.identity) {
    return new Response(JSON.stringify({ error: 'not_signed_in' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return new Response(JSON.stringify({ version: buildId }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
