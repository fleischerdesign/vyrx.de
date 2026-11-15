import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../../lib/http.ts';
import { readSession } from '../../../../lib/session.ts';
import { assistantThreadsOf, createAssistantThread } from '../../../../lib/store.ts';

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

export const GET: APIRoute = async ({ request, url }) => {
  const owner = ownerOf(request);
  if (!owner) return reply(401, { error: 'not_signed_in' });
  const q = url.searchParams.get('q') ?? '';
  const limit = Number(url.searchParams.get('limit') ?? 50);
  return reply(200, { threads: assistantThreadsOf(owner, Number.isFinite(limit) ? limit : 50, q) });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const owner = ownerOf(request);
  if (!owner) return reply(401, { error: 'not_signed_in' });

  let body: { title?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'invalid_body' });
  }
  const title = typeof body.title === 'string' ? body.title : '';
  return reply(201, { thread: createAssistantThread(owner, title) });
};
