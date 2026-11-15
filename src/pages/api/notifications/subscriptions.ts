import type { APIRoute } from 'astro';
import { deviceLabel } from '../../../lib/device-label.ts';
import { readSession } from '../../../lib/session.ts';
import { pushSubscriptionsOf } from '../../../lib/store.ts';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = readSession(request);
  const owner = session.identity?.username;
  if (!owner) {
    return new Response(JSON.stringify({ error: 'not_signed_in' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return new Response(
    JSON.stringify({
      subscriptions: pushSubscriptionsOf(owner).map((subscription) => ({
        endpoint: subscription.endpoint,
        label: deviceLabel(subscription.userAgent),
        createdAt: subscription.createdAt,
      })),
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    },
  );
};
