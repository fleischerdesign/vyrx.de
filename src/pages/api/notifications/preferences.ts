import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/http.ts';
import { readSession } from '../../../lib/session.ts';
import {
  notificationPreferencesOf,
  saveNotificationPreferences,
} from '../../../lib/store.ts';

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const validTime = (value: unknown): value is string | null =>
  value === null || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value));

export const GET: APIRoute = async ({ request }) => {
  const session = readSession(request);
  const owner = session.identity?.username;
  if (!owner) return reply(401, { error: 'not_signed_in' });
  return reply(200, { preferences: notificationPreferencesOf(owner) });
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const session = readSession(request);
  const owner = session.identity?.username;
  if (!owner) return reply(401, { error: 'not_signed_in' });

  let body: {
    push?: unknown;
    quietStart?: unknown;
    quietEnd?: unknown;
    request?: unknown;
    routine?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'invalid_body' });
  }

  const patch: {
    push?: boolean;
    quietStart?: string | null;
    quietEnd?: string | null;
    request?: boolean;
    routine?: boolean;
  } = {};
  if (typeof body.push === 'boolean') patch.push = body.push;
  if (typeof body.request === 'boolean') patch.request = body.request;
  if (typeof body.routine === 'boolean') patch.routine = body.routine;
  if (body.quietStart !== undefined) {
    if (!validTime(body.quietStart)) return reply(400, { error: 'invalid_time' });
    patch.quietStart = body.quietStart;
  }
  if (body.quietEnd !== undefined) {
    if (!validTime(body.quietEnd)) return reply(400, { error: 'invalid_time' });
    patch.quietEnd = body.quietEnd;
  }
  return reply(200, { preferences: saveNotificationPreferences(owner, patch) });
};
