import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/http.ts';
import { readSession } from '../../../lib/session.ts';
import { savePushSubscription } from '../../../lib/store.ts';
import { pushConfigured } from '../../../lib/web-push.ts';

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
  if (!pushConfigured()) return reply(503, { error: 'push_not_configured' });

  let body: { subscription?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'invalid_body' });
  }
  if (body.subscription === null || typeof body.subscription !== 'object') {
    return reply(400, { error: 'invalid_subscription' });
  }
  const subscription = body.subscription as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  if (
    typeof subscription.endpoint !== 'string' ||
    !subscription.endpoint.startsWith('https://') ||
    subscription.endpoint.length > 500 ||
    typeof subscription.keys?.p256dh !== 'string' ||
    subscription.keys.p256dh.length > 300 ||
    typeof subscription.keys?.auth !== 'string' ||
    subscription.keys.auth.length > 200
  ) {
    return reply(400, { error: 'invalid_subscription' });
  }

  savePushSubscription(owner, {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: request.headers.get('user-agent'),
  });
  return reply(201, { ok: true });
};
