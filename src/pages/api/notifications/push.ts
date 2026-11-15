import type { APIRoute } from 'astro';
import { readSession } from '../../../lib/session.ts';
import { publicVapidKey, pushConfigured } from '../../../lib/web-push.ts';

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  const session = readSession(request);
  if (!session.identity) return reply(401, { error: 'not_signed_in' });
  return reply(200, { enabled: pushConfigured(), publicKey: publicVapidKey() });
};
