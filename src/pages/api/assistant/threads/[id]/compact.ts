import type { APIRoute } from 'astro';
import { summarizeConversation } from '../../../../../lib/assistant-summary.ts';
import { isSameOrigin } from '../../../../../lib/http.ts';
import { readSession } from '../../../../../lib/session.ts';
import {
  assistantThreadOf,
  assistantThreadSummaryOf,
  setAssistantThreadSummary,
} from '../../../../../lib/store.ts';

export const prerender = false;

const RECENT_MESSAGES = 12;
const MIN_OLD_MESSAGES = 4;
const MAX_TRANSCRIPT = 20_000;
const compacting = new Set<string>();

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const validId = (id: string | undefined): id is string => Boolean(id && /^[A-Za-z0-9_-]{16,64}$/.test(id));

const transcriptOf = (messages: readonly { role: 'user' | 'assistant'; content: string; ui?: unknown }[]): string => {
  const lines = messages.map((message) => {
    const label = message.role === 'user' ? 'Person' : 'Assistent';
    const content = message.content.trim() || (message.ui ? '[Antwort mit UI]' : '[leer]');
    return `${label}: ${content}`;
  });
  const text = lines.join('\n\n');
  return text.length > MAX_TRANSCRIPT ? text.slice(-MAX_TRANSCRIPT) : text;
};

export const POST: APIRoute = async ({ request, params }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const session = readSession(request);
  const owner = session.identity?.username;
  if (!owner) return reply(401, { error: 'not_signed_in' });
  if (!validId(params.id)) return reply(400, { error: 'invalid_id' });

  let body: { locale?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Lokale ist optional.
  }
  const locale = body.locale === 'en' ? 'en' : 'de';
  const thread = assistantThreadOf(params.id, owner);
  if (!thread) return reply(404, { error: 'not_found' });
  if (thread.messages.length <= RECENT_MESSAGES) {
    return reply(200, { compacted: false, summary: thread.summary, summaryUntilId: thread.summaryUntilId });
  }

  const cutoff = thread.messages[thread.messages.length - RECENT_MESSAGES - 1];
  if (!cutoff) return reply(200, { compacted: false, summary: thread.summary, summaryUntilId: thread.summaryUntilId });
  const since = thread.summaryUntilId ?? 0;
  const older = thread.messages.filter((message) => message.id > since && message.id <= cutoff.id);
  if (older.length < MIN_OLD_MESSAGES) {
    return reply(200, { compacted: false, summary: thread.summary, summaryUntilId: thread.summaryUntilId });
  }

  if (compacting.has(params.id)) return reply(202, { compacted: false, pending: true });
  compacting.add(params.id);
  try {
    const summary = await summarizeConversation(thread.summary, transcriptOf(older), locale);
    if (!summary) {
      return reply(200, {
        compacted: false,
        summary: thread.summary,
        summaryUntilId: thread.summaryUntilId,
      });
    }
    if (!setAssistantThreadSummary(params.id, owner, summary, cutoff.id)) {
      return reply(404, { error: 'not_found' });
    }
    const current = assistantThreadSummaryOf(params.id, owner);
    return reply(200, {
      compacted: true,
      summary: current?.summary ?? summary,
      summaryUntilId: current?.summaryUntilId ?? cutoff.id,
    });
  } finally {
    compacting.delete(params.id);
  }
};
