import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../../../lib/http.ts';
import { readSession } from '../../../../../lib/session.ts';
import { appendAssistantMessages } from '../../../../../lib/store.ts';

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const validId = (id: string | undefined): id is string => Boolean(id && /^[A-Za-z0-9_-]{16,64}$/.test(id));

export const POST: APIRoute = async ({ request, params }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const session = readSession(request);
  const owner = session.identity?.username;
  if (!owner) return reply(401, { error: 'not_signed_in' });
  if (!validId(params.id)) return reply(400, { error: 'invalid_id' });

  let body: { messages?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'invalid_body' });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 20) {
    return reply(400, { error: 'invalid_messages' });
  }

  const messages: {
    role: 'user' | 'assistant';
    content: string;
    ui?: readonly unknown[] | null;
    sources?: readonly unknown[] | null;
    navigations?: readonly unknown[] | null;
  }[] = [];
  for (const entry of body.messages) {
    if (entry === null || typeof entry !== 'object') return reply(400, { error: 'invalid_message' });
    const value = entry as Record<string, unknown>;
    if (value.role !== 'user' && value.role !== 'assistant') return reply(400, { error: 'invalid_role' });
    if (typeof value.content !== 'string' || value.content.length > 20_000) return reply(400, { error: 'invalid_content' });
    const ui = Array.isArray(value.ui) ? value.ui : null;
    const sources = Array.isArray(value.sources) ? value.sources : null;
    const navigations = Array.isArray(value.navigations) ? value.navigations : null;
    if ((ui?.length ?? 0) + (sources?.length ?? 0) + (navigations?.length ?? 0) > 500) {
      return reply(400, { error: 'message_too_large' });
    }
    if (JSON.stringify({ ui, sources, navigations }).length > 200_000) {
      return reply(400, { error: 'message_too_large' });
    }
    messages.push({ role: value.role, content: value.content, ui, sources, navigations });
  }

  if (!appendAssistantMessages(params.id, owner, messages)) return reply(404, { error: 'not_found' });
  return reply(200, { ok: true, count: messages.length });
};
