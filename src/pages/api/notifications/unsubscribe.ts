import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/http.ts';
import { readSession } from '../../../lib/session.ts';
import { removePushSubscription } from '../../../lib/store.ts';

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const session = readSession(request);
  const owner = session.identity?.username;
  if (!owner) return reply(401, { error: 'not_signed_in' });

  let body: { endpoint?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'invalid_body' });
  }
  if (typeof body.endpoint !== 'string' || body.endpoint.length > 500) {
    return reply(400, { error: 'invalid_endpoint' });
  }
  return reply(200, { ok: true, removed: removePushSubscription(owner, body.endpoint) });
};
