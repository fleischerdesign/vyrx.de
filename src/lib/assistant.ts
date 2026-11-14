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
import { buildAssistantContext, type AssistantArticle, type AssistantService } from './assistant-context.ts';
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
): Promise<ReturnType<typeof buildAssistantContext>> {
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

  return buildAssistantContext({
    locale,
    page: { route: route.name, serviceId: pageServiceId, articleSlug: pageArticleSlug },
    personName: session.identity?.name || session.identity?.username || '',
    services,
    articles,
    announcements,
    maintenance,
    history: historyChanges,
    groups: session.identity?.groups ?? [],
    now: new Date().toISOString(),
    query,
  });
}

/**
 * Liest den OpenAI-kompatiblen Stream des Anbieters und gibt nur Textstücke
 * weiter. Denkanstöße, Rollen und `finish_reason` bleiben beim Anbieter.
 */
export async function* streamAnswer(
  config: AssistantConfig,
  messages: readonly AssistantMessage[],
  system: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
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
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: config.maxTokens,
      temperature: 0.2,
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

  const parser = new SseParser((event) => {
    if (event.data === '[DONE]') {
      finished = true;
      return;
    }
    try {
      const payload = JSON.parse(event.data) as {
        choices?: readonly { delta?: { content?: unknown }; finish_reason?: unknown }[];
        error?: { message?: string };
      };
      if (payload.error?.message) {
        failure = new AssistantProviderError(502, 'provider stream error');
        return;
      }
      const choice = payload.choices?.[0];
      if (typeof choice?.finish_reason === 'string') {
        finished = true;
        if (choice.finish_reason !== 'stop') {
          failure = new AssistantProviderError(502, `provider stopped with ${choice.finish_reason}`);
        }
      }
      const content = choice?.delta?.content;
      if (typeof content === 'string' && content.length > 0) queue.push(content);
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
}
