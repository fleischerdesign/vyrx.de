/*
 * Der Assistent: Kontext lesen, eine Frage stellen, die Antwort streaming
 * zurückgeben.
 *
 * Die Grenze liegt hier: der Browser schickt Nachrichten und den Pfad der
 * Seite, aber niemals eine Dienstliste, eine Gruppe oder einen Systemprompt.
 * Alles, was das Modell sieht, entsteht aus der Sitzung - dieselbe Regel wie
 * bei jeder Seite.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { activeAnnouncements, announcementText } from './announcements.ts';
import type { AssistantBlock } from './assistant-blocks.ts';
import { ASSISTANT_TOOLS, executeTool, intentBlocks, navigationFor, type ToolDefinition } from './assistant-tools.ts';
import {
  buildAssistantContext,
  type AssistantArticle,
  type AssistantData,
  type AssistantService,
} from './assistant-context.ts';
import { articleSlug, articlesFor, canReadArticle } from './knowledge.ts';
import { routeFrom, type Locale } from './locale.ts';
import { loadHistory, loadStatus, stateOf, type StateChange } from './status.ts';
import { favoritesOf, maintenanceFrom } from './store.ts';
import { SseParser } from './sse.ts';
import type { Session } from './session.ts';

export interface AssistantConfig {
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string;
  readonly maxTokens: number;
  readonly timeoutMs: number;
}

export interface AssistantMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export class AssistantProviderError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AssistantProviderError';
  }
}

const number = (value: string | undefined, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
};

function keyFromFile(): string | null {
  const explicit = process.env.PORTAL_ASSISTANT_API_KEY_FILE?.trim();
  const credentials = process.env.CREDENTIALS_DIRECTORY?.trim();
  const path = explicit || (credentials ? resolve(credentials, 'assistant-key') : null);
  if (!path) return null;
  try {
    return readFileSync(path, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

/** `null` heißt: für diesen Bau ist kein Anbieter eingerichtet. */
export function assistantConfig(): AssistantConfig | null {
  const baseUrl = process.env.PORTAL_ASSISTANT_BASE_URL?.trim();
  const model = process.env.PORTAL_ASSISTANT_MODEL?.trim();
  const apiKey = process.env.PORTAL_ASSISTANT_API_KEY?.trim() || keyFromFile();
  if (!baseUrl || !model || !apiKey) return null;

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
    apiKey,
    maxTokens: number(process.env.PORTAL_ASSISTANT_MAX_TOKENS, 700, 100, 2000),
    timeoutMs: number(process.env.PORTAL_ASSISTANT_TIMEOUT_MS, 30_000, 5_000, 60_000),
  };
}

/**
 * Baut den Kontext aus der Sitzung.
 *
 * `query` entscheidet nur, welche Artikel zusätzlich vollständig mitgehen; die
 * Auswahl kommt aus `articlesFor` und `canReadArticle`, nie aus dem Browser.
 */
export async function contextFor(
  session: Session,
  locale: Locale,
  pathname: string,
  query: string,
): Promise<ReturnType<typeof buildAssistantContext> & { data: AssistantData }> {
  const route = routeFrom(pathname);
  const visible = session.services;
  const status = visible.length > 0 ? await loadStatus(visible.map((service) => service.id)) : null;
  // Die Historie ist teurer als der aktuelle Zustand: Sie wird nur geladen,
  // wenn die Seite oder die Frage sie braucht.
  const wantsHistory =
    route.name === 'status' ||
    route.name === 'service' ||
    /gestern|seit wann|verlauf|zustandswechsel|passiert|history|since|last change/i.test(query);
  const history: ReadonlyMap<string, readonly StateChange[]> =
    wantsHistory && visible.length > 0 ? await loadHistory(visible.map((service) => service.id), 24) : new Map();

  let favorites = new Set<string>();
  if (session.identity) {
    try {
      favorites = new Set(favoritesOf(session.identity.username));
    } catch {
      // Ein nicht erreichbarer Speicher nimmt den Assistenten nicht mit.
    }
  }

  const services: readonly AssistantService[] = visible.map((service) => {
    const live = stateOf(service, status);
    return {
      id: service.id,
      name: service.name,
      summary: service.summary,
      scope: service.scope,
      state: live.state,
      asOf: live.asOf,
      monitored: service.monitored,
      accessGroups: service.accessGroups,
      favorite: favorites.has(service.id),
      dependsOn: service.dependsOn,
    };
  });

  const historyChanges = [...history.entries()].flatMap(([serviceId, changes]) =>
    changes.map((change) => ({ serviceId, at: change.at, state: change.state })),
  );

  const readable = (await articlesFor(locale)).filter((article) => canReadArticle(article, session.identity));
  const articles: readonly AssistantArticle[] = readable.map((article) => ({
    slug: articleSlug(article),
    title: article.data.title,
    summary: article.data.summary,
    kind: article.data.kind,
    body: article.body ?? '',
    services: article.data.services,
    visibility: article.data.visibility,
    order: article.data.order,
  }));

  const pageServiceId =
    route.name === 'service' && route.param && visible.some((service) => service.id === route.param)
      ? route.param
      : undefined;
  const pageArticleSlug =
    route.name === 'article' && route.param && readable.some((article) => articleSlug(article) === route.param)
      ? route.param
      : undefined;

  const announcements = session.identity
    ? activeAnnouncements(session.identity.groups).map((entry) => ({
        text: announcementText(entry, locale),
        href: entry.href,
        hrefLabel: entry.hrefLabel?.[locale] || entry.hrefLabel?.de,
      }))
    : [];

  let maintenance: ReturnType<typeof maintenanceFrom> = [];
  try {
    maintenance = maintenanceFrom();
  } catch {
    // Ein nicht erreichbarer Speicher darf den Assistenten nicht mitnehmen.
    maintenance = [];
  }

  const page = { route: route.name, serviceId: pageServiceId, articleSlug: pageArticleSlug };
  const groups = session.identity?.groups ?? [];
  const data: AssistantData = { page, services, articles, announcements, maintenance, history: historyChanges, groups };
  const built = buildAssistantContext({
    locale,
    page,
    personName: session.identity?.name || session.identity?.username || '',
    services,
    articles,
    announcements,
    maintenance,
    history: historyChanges,
    groups,
    now: new Date().toISOString(),
    query,
  });

  return { ...built, data };
}

type ProviderRole = 'system' | 'user' | 'assistant' | 'tool';

interface ProviderToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: { readonly name: string; readonly arguments: string };
}

interface ProviderMessage {
  readonly role: ProviderRole;
  readonly content: string;
  readonly tool_calls?: readonly ProviderToolCall[];
  readonly tool_call_id?: string;
}

interface StreamedTurn {
  readonly text: string;
  readonly toolCalls: readonly { id: string; name: string; arguments: string }[];
}

export type AssistantEvent =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'ui'; readonly nodes: readonly AssistantBlock[] }
  | { readonly type: 'navigate'; readonly href: string; readonly label: string };

const MAX_TOOL_ROUNDS = 3;
const MAX_TOOL_CALLS = 4;

/** Eine Karte für genau die Seite, die daneben schon steht, ist Lärm. */
function redundantBlock(block: AssistantBlock, data: AssistantData): boolean {
  if (block.type === 'summary' && data.page.route === 'status') return true;
  if (block.type === 'status' && data.page.route === 'status') return true;
  if ((block.type === 'service' || block.type === 'status') && block.serviceId === data.page.serviceId) return true;
  if (block.type === 'article' && block.slug === data.page.articleSlug) return true;
  return false;
}

function blockIdentity(block: AssistantBlock): string | null {
  switch (block.type) {
    case 'summary':
      return 'summary';
    case 'status':
    case 'service':
      return 'service:' + block.serviceId;
    case 'article':
      return 'article:' + block.slug;
    case 'media':
      return 'media:' + block.mediaType + ':' + block.tmdbId;
    case 'confirm':
      return 'confirm:' + block.proposalId;
    case 'maintenance':
      return 'maintenance:' + block.startsAt + ':' + block.endsAt + ':' + (block.serviceId ?? 'all');
    case 'step':
      return 'step:' + block.question;
    case 'suggestions':
      return 'suggestions';
    default:
      // Generische Layout- und Inhalt-Knoten sind keine Fakten und werden
      // nicht über ihren Typ dedupliziert.
      return null;
  }
}

function asProviderMessages(system: string, messages: readonly AssistantMessage[]): ProviderMessage[] {
  return [{ role: 'system', content: system }, ...messages.map((message) => ({ role: message.role, content: message.content }))];
}

/**
 * Ein einzelner Anbieter-Turn. Textstücke werden sofort weitergegeben;
 * Werkzeugaufrufe werden gesammelt und erst am Ende des Turns zurückgegeben.
 */
async function* streamTurn(
  config: AssistantConfig,
  messages: readonly ProviderMessage[],
  tools: readonly ToolDefinition[] | null,
  signal: AbortSignal,
): AsyncGenerator<string, StreamedTurn, void> {
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const combined = AbortSignal.any([signal, timeout]);
  const openrouter = config.baseUrl.includes('openrouter.ai');
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
      accept: 'text/event-stream',
      // OpenRouter nutzt diese beiden nur für die Anbieter-Zuordnung.
      'http-referer': 'https://vyrx.de',
      'x-title': 'VYRX Assistant',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: 0.2,
      ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
      // Der Assistent soll antworten, nicht intern nachdenken: Denk-Tokens
      // kosten Latenz und können das Antwortbudget vorzeitig aufbrauchen.
      // Nur OpenRouter kennt diesen Schalter; andere Anbieter bleiben unberührt.
      ...(openrouter ? { reasoning: { enabled: false } } : {}),
      stream: true,
    }),
    signal: combined,
  });

  if (!response.ok) {
    // Der Antwortkörper kann Anbieter-Details enthalten; nicht an den Browser
    // weiterreichen und nicht mit der Anfrage vermischen.
    await response.text().catch(() => '');
    throw new AssistantProviderError(response.status, 'provider rejected the request');
  }
  if (!response.body) throw new AssistantProviderError(502, 'provider returned no body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const queue: string[] = [];
  let failure: Error | null = null;
  let finished = false;
  let text = '';
  const calls = new Map<number, { id: string; name: string; arguments: string }>();

  const parser = new SseParser((event) => {
    if (event.data === '[DONE]') {
      finished = true;
      return;
    }
    try {
      const payload = JSON.parse(event.data) as {
        choices?: readonly {
          delta?: {
            content?: unknown;
            tool_calls?: readonly {
              index?: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }[];
          };
          finish_reason?: unknown;
        }[];
        error?: { message?: string };
      };
      if (payload.error?.message) {
        failure = new AssistantProviderError(502, 'provider stream error');
        return;
      }
      const choice = payload.choices?.[0];
      if (typeof choice?.finish_reason === 'string') {
        finished = true;
        if (choice.finish_reason !== 'stop' && choice.finish_reason !== 'tool_calls') {
          failure = new AssistantProviderError(502, `provider stopped with ${choice.finish_reason}`);
        }
      }
      const content = choice?.delta?.content;
      if (typeof content === 'string' && content.length > 0) {
        text += content;
        queue.push(content);
      }
      const toolCalls = choice?.delta?.tool_calls;
      if (Array.isArray(toolCalls)) {
        for (const call of toolCalls) {
          const index = typeof call.index === 'number' ? call.index : 0;
          const current = calls.get(index) ?? { id: '', name: '', arguments: '' };
          if (typeof call.id === 'string' && call.id) current.id = call.id;
          if (typeof call.function?.name === 'string' && call.function.name) current.name = call.function.name;
          if (typeof call.function?.arguments === 'string') current.arguments += call.function.arguments;
          calls.set(index, current);
        }
      }
    } catch {
      // Ein unbekannter Rahmen ist kein Grund, den ganzen Stream abzubrechen.
    }
  });

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
      while (queue.length > 0) {
        const next = queue.shift();
        if (next) yield next;
      }
      if (failure) throw failure;
    }
    parser.end();
    while (queue.length > 0) {
      const next = queue.shift();
      if (next) yield next;
    }
    if (!finished) throw new AssistantProviderError(502, 'provider stream ended early');
    if (failure) throw failure;
  } finally {
    reader.releaseLock();
  }

  return {
    text,
    toolCalls: [...calls.entries()]
      .sort(([left], [right]) => left - right)
      .map(([index, call]) => ({
        id: call.id || `call_${index}`,
        name: call.name,
        arguments: call.arguments || '{}',
      }))
      .filter((call) => call.name.length > 0),
  };
}

/**
 * Der ganze Assistenten-Turn: Text streamen, interne Werkzeuge ausführen,
 * mit den Ergebnissen erneut fragen. Der Browser sieht nur Text, fertige
 * Blöcke und geprüfte Navigationsziele.
 */
export async function* runAssistant(
  config: AssistantConfig,
  messages: readonly AssistantMessage[],
  context: { readonly system: string },
  data: AssistantData,
  session: Session,
  locale: Locale,
  signal: AbortSignal,
): AsyncGenerator<AssistantEvent, void, void> {
  const provider = asProviderMessages(context.system, messages);
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
  const autoNavigation = navigationFor(lastUser, data, session, locale);
  if (autoNavigation) yield { type: 'navigate', href: autoNavigation.href, label: autoNavigation.label };

  const emitted = new Set<string>();
  let summaryEmitted = false;
  const takeBlocks = (blocks: readonly AssistantBlock[], fromIntent = false): AssistantBlock[] => {
    const fresh = blocks.filter((block) => {
      const identity = blockIdentity(block);
      if (redundantBlock(block, data) || (identity !== null && emitted.has(identity))) return false;
      if (!fromIntent && summaryEmitted && block.type === 'status' && block.state === 'up') return false;
      return true;
    });
    for (const block of fresh) {
      const identity = blockIdentity(block);
      if (identity !== null) emitted.add(identity);
      if (block.type === 'summary') summaryEmitted = true;
    }
    return fresh;
  };

  const intent = takeBlocks(intentBlocks(lastUser, data, locale), true);
  if (intent.length > 0) yield { type: 'ui', nodes: intent };

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const allowTools = round < MAX_TOOL_ROUNDS;
    const iterator = streamTurn(config, provider, allowTools ? ASSISTANT_TOOLS : null, signal);
    let step = await iterator.next();
    while (!step.done) {
      yield { type: 'text', text: step.value };
      step = await iterator.next();
    }

    const turn = step.value;
    if (turn.toolCalls.length === 0 || !allowTools) return;

    // Zwei Runden sind zwei Textstücke. Ohne Trenner klebt der letzte Satz
    // der Vorbemerkung am ersten Satz der Antwort.
    if (turn.text && !/\s$/.test(turn.text)) {
      yield { type: 'text', text: ' ' };
    }

    const calls = turn.toolCalls.slice(0, MAX_TOOL_CALLS);
    provider.push({
      role: 'assistant',
      content: turn.text,
      tool_calls: calls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments },
      })),
    });

    for (const call of calls) {
      const outcome = await executeTool(call.name, call.arguments, data, session, locale);
      const blocks = takeBlocks(outcome.blocks ?? []);
      if (blocks.length > 0) {
        yield { type: 'ui', nodes: blocks };
      }
      if (outcome.navigate) {
        yield { type: 'navigate', href: outcome.navigate.href, label: outcome.navigate.label };
      }
      provider.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(outcome.content),
      });
    }
  }
}
