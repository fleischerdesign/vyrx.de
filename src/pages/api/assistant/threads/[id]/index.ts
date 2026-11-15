import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../../../lib/http.ts';
import { readSession } from '../../../../../lib/session.ts';
import {
  assistantThreadOf,
  deleteAssistantThread,
  pinAssistantThread,
  renameAssistantThread,
} from '../../../../../lib/store.ts';

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const ownerOf = (request: Request): string | null => {
  const session = readSession(request);
  return session.identity?.username ?? null;
};

const validId = (id: string | undefined): id is string => Boolean(id && /^[A-Za-z0-9_-]{16,64}$/.test(id));

export const GET: APIRoute = async ({ request, params }) => {
  const owner = ownerOf(request);
  if (!owner) return reply(401, { error: 'not_signed_in' });
  if (!validId(params.id)) return reply(400, { error: 'invalid_id' });
  const thread = assistantThreadOf(params.id, owner);
  if (!thread) return reply(404, { error: 'not_found' });
  return reply(200, { thread });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const owner = ownerOf(request);
  if (!owner) return reply(401, { error: 'not_signed_in' });
  if (!validId(params.id)) return reply(400, { error: 'invalid_id' });

  let body: { title?: unknown; pinned?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'invalid_body' });
  }

  let changed = false;
  if (typeof body.title === 'string') changed = renameAssistantThread(params.id, owner, body.title) || changed;
  if (typeof body.pinned === 'boolean') changed = pinAssistantThread(params.id, owner, body.pinned) || changed;
  if (!changed) return reply(404, { error: 'not_found' });
  const thread = assistantThreadOf(params.id, owner);
  if (!thread) return reply(404, { error: 'not_found' });
  return reply(200, { thread: { ...thread, messages: undefined } });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const owner = ownerOf(request);
  if (!owner) return reply(401, { error: 'not_signed_in' });
  if (!validId(params.id)) return reply(400, { error: 'invalid_id' });
  if (!deleteAssistantThread(params.id, owner)) return reply(404, { error: 'not_found' });
  return reply(200, { ok: true });
};
