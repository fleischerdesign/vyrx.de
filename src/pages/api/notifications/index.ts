import type { APIRoute } from 'astro';
import { readSession } from '../../../lib/session.ts';
import { notificationsOf, unreadNotificationCount } from '../../../lib/store.ts';

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request, url }) => {
  const session = readSession(request);
  const owner = session.identity?.username;
  if (!owner) return reply(401, { error: 'not_signed_in' });
  const limit = Number(url.searchParams.get('limit') ?? 30);
  return reply(200, {
    notifications: notificationsOf(owner, Number.isFinite(limit) ? limit : 30),
    unread: unreadNotificationCount(owner),
  });
};
