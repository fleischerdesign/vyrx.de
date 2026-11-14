import type { APIRoute } from 'astro';
import {
  AssistantProviderError,
  assistantConfig,
  contextFor,
  streamAnswer,
  type AssistantMessage,
} from '../../lib/assistant.ts';
import { isSameOrigin, localPath } from '../../lib/http.ts';
import type { Locale } from '../../lib/locale.ts';
import { readSession } from '../../lib/session.ts';

/*
 * Der eine Eingang des Assistenten.
 *
 * Er ist kein allgemeiner Modell-Proxy: die Anfrage trägt nur den Verlauf und
 * den Pfad der Seite. Kontext, Rechte und Systemprompt entstehen serverseitig.
 * Ohne Anmeldung gibt es keine Antwort; ohne eingerichteten Anbieter sagt der
 * Endpunkt das, statt eine leere Fläche zu zeigen.
 */
export const prerender = false;

const MAX_BODY = 64 * 1024;
const MAX_MESSAGES = 10;
const MAX_MESSAGE = 2000;
const MAX_TOTAL = 12_000;
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

const json = (error: string, status: number, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });

function readMessages(value: unknown): readonly AssistantMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;

  const messages: AssistantMessage[] = [];
  let total = 0;

  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') return null;
    const role = (entry as { role?: unknown }).role;
    const content = (entry as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE) return null;
    total += trimmed.length;
    messages.push({ role, content: trimmed });
  }

  if (total > MAX_TOTAL) return null;
  if (messages[messages.length - 1]?.role !== 'user') return null;
  return messages;
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json('forbidden', 403);

  const session = readSession(request);
  if (!session.identity) return json('unauthorized', 401);

  const config = assistantConfig();
  if (!config) return json('unconfigured', 503);

  const length = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(length) && length > MAX_BODY) return json('too_large', 413);

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json('invalid', 400);
  }
  if (raw.length > MAX_BODY) return json('too_large', 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json('invalid', 400);
  }
  if (body === null || typeof body !== 'object') return json('invalid', 400);

  const messages = readMessages((body as { messages?: unknown }).messages);
  if (!messages) return json('invalid', 400);

  const localeValue = (body as { locale?: unknown }).locale;
  const locale: Locale = localeValue === 'en' ? 'en' : 'de';
  const page = localPath((body as { page?: unknown }).page, '/overview/');

  if (rateLimited(session.identity.username)) {
    return json('rate', 429, { 'retry-after': '60' });
  }

  const last = messages[messages.length - 1];
  if (!last) return json('invalid', 400);

  let context: Awaited<ReturnType<typeof contextFor>>;
  try {
    context = await contextFor(session, locale, page, last.content);
  } catch {
    return json('context', 500);
  }

  const encoder = new TextEncoder();
  const abort = new AbortController();
  const abortFromRequest = (): void => abort.abort();
  request.signal.addEventListener('abort', abortFromRequest, { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      try {
        send('sources', { sources: context.sources });
        for await (const delta of streamAnswer(config, messages, context.system, abort.signal)) {
          send('delta', { text: delta });
        }
        send('done', {});
      } catch (error) {
        if (!request.signal.aborted) {
          const message = error instanceof AssistantProviderError && error.status === 429 ? 'rate' : 'provider';
          try {
            send('error', { message });
          } catch {
            // Der Browser hat die Verbindung bereits geschlossen.
          }
        }
      } finally {
        clearInterval(heartbeat);
        request.signal.removeEventListener('abort', abortFromRequest);
        try {
          controller.close();
        } catch {
          // Bereits geschlossen.
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
};
