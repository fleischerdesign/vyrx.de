/*
 * Die internen Werkzeuge des Assistenten.
 *
 * Sie lesen ausschließlich Daten, die die Sitzung bereits freigegeben hat:
 * sichtbare Dienste, lesbare Artikel, gemessene Zustände. Es gibt kein
 * Dienst-API, kein MCP und keine Aktion. `open_page` gibt nur eine geprüfte
 * Adresse zurück; der Client entscheidet, ob er sie öffnet.
 */

import type { AssistantBlock } from './assistant-blocks.ts';
import { validateUiNodes } from './assistant-ui.ts';
import type {
  AssistantArticle,
  AssistantData,
  AssistantService,
} from './assistant-context.ts';
import { pathFor, routeFrom, type Locale } from './locale.ts';
import { loadHistory } from './status.ts';
import type { Session } from './session.ts';

export interface ToolDefinition {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

export interface ToolOutcome {
  readonly content: unknown;
  readonly blocks?: readonly AssistantBlock[];
  readonly navigate?: { readonly href: string; readonly label: string };
}

export const ASSISTANT_TOOLS: readonly ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Search the knowledge articles released for this person. Returns matching articles and article cards; do not repeat the card details in prose.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'What the person is looking for.' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_service',
      description: 'Read one visible service, its measured state, access groups, dependencies and related articles. Returns a service card; keep the prose to one sentence.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'The service id, never its display name.' } },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_status',
      description: 'Read the measured state and measurement time of visible services. Returns status cards; do not repeat the list in prose.',
      parameters: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' }, description: 'Optional service ids. Omit for every visible service.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_history',
      description: 'Read state changes for visible services in a bounded time window. The window ends at the last measurement, not at the current time.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Optional service id. Omit for every visible service.' },
          hours: { type: 'number', description: 'Window in hours, 1 to 168. Defaults to 24.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_maintenance',
      description: 'Read current and upcoming maintenance windows for visible services. Returns maintenance cards.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_page',
      description: 'Return a validated portal link for a page the person is allowed to open. Use this only when the person explicitly asks to open or show a page.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'A local portal path, for example /status/.' } },
        required: ['path'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'render_ui',
      description:
        'Compose a native UI tree. Use only these node types: stack, grid, card, section, text, heading, list, keyValue, badge, callout, divider, stat, progress, chart, timeline, table, details, link, status, service, article, suggestions. No HTML, no styles, no markdown tables, no ::: directives. status, service and article take only serviceId or slug and are filled from the session. summary, maintenance and step are server-only; use get_status, get_maintenance or ask_step for those. Example: {"nodes":[{"type":"card","title":"Vergleich","children":[{"type":"grid","columns":2,"children":[{"type":"stat","label":"Medienwünsche","value":"nicht erreichbar"},{"type":"stat","label":"Mediathek","value":"erreichbar"}]},{"type":"callout","tone":"accent","title":"Empfehlung","text":"Nutze zuerst die Mediathek."}]}]}',
      parameters: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: { type: { type: 'string' } },
              required: ['type'],
              additionalProperties: true,
            },
          },
        },
        required: ['nodes'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_step',
      description: 'Show one guided troubleshooting step with a short question and two to four answer options. The UI renders the options; do not repeat the question in prose. Wait for the person to choose before continuing.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['label', 'value'],
              additionalProperties: false,
            },
          },
          step: { type: 'number' },
          total: { type: 'number' },
        },
        required: ['question', 'options'],
        additionalProperties: false,
      },
    },
  },
];

const asString = (value: unknown, max = 200): string | null =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;

const asStringList = (value: unknown, max = 50): readonly string[] | null => {
  if (!Array.isArray(value) || value.length > max) return null;
  const out: string[] = [];
  for (const entry of value) {
    const text = asString(entry, 80);
    if (!text) return null;
    out.push(text);
  }
  return out;
};

const serviceRef = (data: AssistantData, id: string): string | null => {
  const index = data.services.findIndex((service) => service.id === id);
  return index >= 0 ? `S${index + 1}` : null;
};

const articleRef = (data: AssistantData, slug: string): string | null => {
  const index = data.articles.findIndex((article) => article.slug === slug);
  return index >= 0 ? `A${index + 1}` : null;
};

const localized = (service: AssistantService, locale: Locale): string => service.name[locale] || service.name.de;
const localizedArticle = (article: AssistantArticle): string => article.title;

const serviceName = (data: AssistantData, id: string, locale: Locale): string | null => {
  const service = data.services.find((entry) => entry.id === id);
  return service ? localized(service, locale) : null;
};

const articleHref = (article: AssistantArticle, locale: Locale): string =>
  pathFor(locale, 'article', article.slug);

const kindText = (kind: string, locale: Locale): string => {
  const labels: Record<string, { de: string; en: string }> = {
    guide: { de: 'Anleitung', en: 'Guide' },
    explanation: { de: 'Erklärung', en: 'Explanation' },
    troubleshooting: { de: 'Problemlösung', en: 'Troubleshooting' },
    reference: { de: 'Referenz', en: 'Reference' },
  };
  return labels[kind]?.[locale] ?? kind;
};

const articleBlock = (article: AssistantArticle, locale: Locale): AssistantBlock => ({
  type: 'article',
  slug: article.slug,
  title: localizedArticle(article),
  summary: article.summary,
  kind: article.kind,
  kindText: kindText(article.kind, locale),
  href: articleHref(article, locale),
});

const stateLabel = (state: AssistantService['state'], locale: Locale): string =>
  state === 'up'
    ? locale === 'de'
      ? 'erreichbar'
      : 'reachable'
    : state === 'down'
      ? locale === 'de'
        ? 'nicht erreichbar'
        : 'not reachable'
      : state === 'unmonitored'
        ? locale === 'de'
          ? 'nicht überwacht'
          : 'not monitored'
        : locale === 'de'
          ? 'unbekannt'
          : 'unknown';

const serviceBlock = (service: AssistantService, locale: Locale): AssistantBlock => ({
  type: 'service',
  serviceId: service.id,
  name: localized(service, locale),
  summary: service.summary[locale] || service.summary.de,
  stateText: stateLabel(service.state, locale),
  asOf: service.asOf,
  href: pathFor(locale, 'service', service.id),
});

const statusBlock = (service: AssistantService, locale: Locale): AssistantBlock => ({
  type: 'status',
  serviceId: service.id,
  name: localized(service, locale),
  state: service.state,
  stateText: stateLabel(service.state, locale),
  asOf: service.asOf,
  href: pathFor(locale, 'status'),
});

const tokens = (query: string): readonly string[] =>
  [...new Set(query.toLocaleLowerCase('de').split(/[^\p{L}\p{N}]+/u).filter((term) => term.length >= 3))];

const scoreArticle = (article: AssistantArticle, query: string): number => {
  const words = tokens(query);
  if (words.length === 0) return 0;
  const title = article.title.toLocaleLowerCase('de');
  const summary = article.summary.toLocaleLowerCase('de');
  const body = article.body.toLocaleLowerCase('de');
  let score = 0;
  for (const word of words) {
    if (title.includes(word)) score += 4;
    if (summary.includes(word)) score += 2;
    if (body.includes(word)) score += 1;
  }
  return score;
};

const search = (data: AssistantData, query: string): readonly { article: AssistantArticle; ref: string; score: number }[] =>
  data.articles
    .map((article, index) => ({ article, ref: `A${index + 1}`, score: scoreArticle(article, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.article.order - b.article.order)
    .slice(0, 3);

function openPage(path: string, data: AssistantData, session: Session, locale: Locale): ToolOutcome {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return { content: { error: 'invalid_path' } };
  }

  const route = routeFrom(path);
  const pageLabels: Partial<Record<string, { de: string; en: string }>> = {
    start: { de: 'Start', en: 'Home' },
    project: { de: 'Projekt', en: 'Project' },
    help: { de: 'Hilfe', en: 'Help' },
    overview: { de: 'Übersicht', en: 'Overview' },
    services: { de: 'Anwendungen', en: 'Applications' },
    knowledge: { de: 'Wissen', en: 'Knowledge' },
    status: { de: 'Status', en: 'Status' },
    account: { de: 'Konto', en: 'Account' },
    admin: { de: 'Verwaltung', en: 'Administration' },
  };

  if (route.name === 'notFound') return { content: { error: 'not_found' } };

  if (route.name === 'service') {
    const service = data.services.find((entry) => entry.id === route.param);
    if (!service) return { content: { error: 'not_released' } };
    return {
      content: { href: pathFor(locale, 'service', service.id), label: localized(service, locale) },
      navigate: { href: pathFor(locale, 'service', service.id), label: localized(service, locale) },
    };
  }

  if (route.name === 'article') {
    const article = data.articles.find((entry) => entry.slug === route.param);
    if (!article) return { content: { error: 'not_released' } };
    return {
      content: { href: articleHref(article, locale), label: article.title },
      navigate: { href: articleHref(article, locale), label: article.title },
    };
  }

  if (route.name === 'admin' && !session.isAdmin) return { content: { error: 'not_released' } };

  const label = pageLabels[route.name]?.[locale] ?? (locale === 'de' ? 'Seite' : 'Page');
  const href = pathFor(locale, route.name, route.param ?? undefined);
  return { content: { href, label }, navigate: { href, label } };
}

/**
 * Ein explizites „öffne/zeige“ ist eine Navigation, auch wenn das Modell
 * vergisst, `open_page` aufzurufen. Die Auflösung bleibt serverseitig und
 * respektiert dieselben Freigaben wie der Kontext.
 */
export function navigationFor(
  query: string,
  data: AssistantData,
  session: Session,
  locale: Locale,
): { readonly href: string; readonly label: string } | null {
  if (!/(öffne|zeige|geh zu|open|show|navigate)/i.test(query)) return null;
  const lower = query.toLocaleLowerCase('de');

  const service = data.services.find((entry) => lower.includes(localized(entry, locale).toLocaleLowerCase('de')));
  if (service) {
    return { href: pathFor(locale, 'service', service.id), label: localized(service, locale) };
  }

  const article = data.articles.find((entry) => lower.includes(entry.title.toLocaleLowerCase('de')));
  if (article) {
    return { href: articleHref(article, locale), label: article.title };
  }

  const hasWord = (word: string): boolean =>
    new RegExp(`(?:^|[\\s.,!?])${word}(?:$|[\\s.,!?])`, 'i').test(lower);

  if (hasWord('status')) return { href: pathFor(locale, 'status'), label: 'Status' };
  if (hasWord('übersicht') || hasWord('overview')) return { href: pathFor(locale, 'overview'), label: locale === 'de' ? 'Übersicht' : 'Overview' };
  if (hasWord('anwendungen') || hasWord('applications') || hasWord('apps')) return { href: pathFor(locale, 'services'), label: locale === 'de' ? 'Anwendungen' : 'Applications' };
  if (hasWord('wissen') || hasWord('knowledge')) return { href: pathFor(locale, 'knowledge'), label: locale === 'de' ? 'Wissen' : 'Knowledge' };
  if (hasWord('konto') || hasWord('account')) return { href: pathFor(locale, 'account'), label: locale === 'de' ? 'Konto' : 'Account' };
  if ((hasWord('verwaltung') || hasWord('admin') || hasWord('administration')) && session.isAdmin) {
    return { href: pathFor(locale, 'admin'), label: locale === 'de' ? 'Verwaltung' : 'Administration' };
  }

  return null;
}

/**
 * Eine Statusfrage bekommt ihre Karte auch dann, wenn das Modell kein Werkzeug
 * aufruft. Das ist keine zweite Wahrheit: Dieselben Daten, derselbe Filter.
 */
export function intentBlocks(query: string, data: AssistantData, locale: Locale): readonly AssistantBlock[] {
  const lower = query.toLocaleLowerCase('de');
  const has = (word: string): boolean =>
    new RegExp(`(?:^|[\\s.,!?])${word}(?:$|[\\s.,!?])`, 'i').test(lower);
  const statusIntent =
    has('status') ||
    has('störung') ||
    has('gestört') ||
    has('ausfall') ||
    has('erreichbar') ||
    has('down') ||
    has('läuft') ||
    has('zustand') ||
    has('los');
  if (!statusIntent) return [];

  const matched = data.services.find((service) => lower.includes(localized(service, locale).toLocaleLowerCase('de')));
  if (matched) return [statusBlock(matched, locale)];
  if (data.page.route === 'status') return [];

  const services = data.services;
  const down = services.filter((service) => service.state === 'down').length;
  const unmeasured = services.filter((service) => service.state === 'unknown' || service.state === 'unmonitored').length;
  const asOf = services.reduce<number | null>((latest, service) => {
    return service.asOf !== null && (latest === null || service.asOf > latest) ? service.asOf : latest;
  }, null);
  const tone = down > 0 ? 'warn' : unmeasured > 0 ? 'unknown' : 'ok';
  const title =
    down > 0
      ? `${down} ${down === 1 ? 'Dienst' : 'Dienste'} nicht erreichbar`
      : unmeasured > 0
        ? `${unmeasured} ${unmeasured === 1 ? 'Dienst' : 'Dienste'} ohne aktuelle Messung`
        : 'Alles erreichbar';
  const text = `${services.length} ${services.length === 1 ? 'Dienst' : 'Dienste'} geprüft`;
  const all = ['alle', 'aller', 'allen', 'jeder', 'jede', 'sämtliche', 'all'].some(has);
  const cards = (all ? services : services.filter((service) => service.state !== 'up')).slice(0, 6);

  return [
    {
      type: 'summary',
      tone,
      title,
      text,
      asOf,
      href: pathFor(locale, 'status'),
    },
    ...cards.map((service) => statusBlock(service, locale)),
  ];
}

/**
 * Führt einen Tool-Aufruf aus. Fehler werden als Daten an das Modell
 * zurückgegeben, nie als interne Ausnahme an den Browser.
 */
export async function executeTool(
  name: string,
  rawArguments: string,
  data: AssistantData,
  session: Session,
  locale: Locale,
): Promise<ToolOutcome> {
  let args: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawArguments || '{}') as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { content: { error: 'invalid_arguments' } };
    }
    args = parsed as Record<string, unknown>;
  } catch {
    return { content: { error: 'invalid_arguments' } };
  }

  try {
    switch (name) {
      case 'search_knowledge': {
        const query = asString(args.query, 200);
        if (!query) return { content: { error: 'invalid_query' } };
        const results = search(data, query);
        return {
          content: {
            results: results.map(({ article, ref }) => ({
              ref,
              slug: article.slug,
              title: article.title,
              summary: article.summary,
              kind: article.kind,
              body: article.body.slice(0, 2500),
            })),
          },
          blocks: results.map(({ article }) => articleBlock(article, locale)),
        };
      }

      case 'get_service': {
        const id = asString(args.id, 80);
        if (!id) return { content: { error: 'invalid_id' } };
        const index = data.services.findIndex((service) => service.id === id);
        if (index < 0) return { content: { error: 'not_released' } };
        const service = data.services[index];
        if (!service) return { content: { error: 'not_released' } };
        const ref = `S${index + 1}`;
        const visibleDeps = service.dependsOn.flatMap((dependency) => {
          const dependencyRef = serviceRef(data, dependency);
          return dependencyRef ? [dependencyRef] : [];
        });
        return {
          content: {
            ref,
            id: service.id,
            name: localized(service, locale),
            summary: service.summary[locale] || service.summary.de,
            scope: service.scope,
            stateText: stateLabel(service.state, locale),
            asOf: service.asOf === null ? null : new Date(service.asOf).toISOString(),
            accessGroups: service.accessGroups,
            accessText:
              service.accessGroups.length === 0
                ? locale === 'de'
                  ? 'für alle sichtbar'
                  : 'visible to everyone'
                : service.accessGroups.some((group) => data.groups.includes(group))
                  ? locale === 'de'
                    ? `sichtbar über ${service.accessGroups.filter((group) => data.groups.includes(group)).join(', ')}`
                    : `visible via ${service.accessGroups.filter((group) => data.groups.includes(group)).join(', ')}`
                  : locale === 'de'
                    ? 'nicht sichtbar'
                    : 'not visible',
            favorite: service.favorite,
            dependsOn: visibleDeps,
            dependsOnHidden: service.dependsOn.some((dependency) => !serviceRef(data, dependency)),
            articles: data.articles
              .filter((article) => article.services.includes(service.id))
              .map((article) => ({ ref: articleRef(data, article.slug), title: article.title, href: articleHref(article, locale) })),
          },
          blocks: [serviceBlock(service, locale)],
        };
      }

      case 'get_status': {
        const requested = args.ids === undefined ? null : asStringList(args.ids, 20);
        if (args.ids !== undefined && requested === null) return { content: { error: 'invalid_ids' } };
        const services = data.services.filter((service) => requested === null || requested.includes(service.id));
        return {
          content: {
            services: services.map((service) => ({
              ref: serviceRef(data, service.id),
              id: service.id,
              name: localized(service, locale),
              stateText: stateLabel(service.state, locale),
              asOf: service.asOf === null ? null : new Date(service.asOf).toISOString(),
            })),
          },
          blocks: services.slice(0, 6).map((service) => statusBlock(service, locale)),
        };
      }

      case 'get_history': {
        const id = args.id === undefined ? null : asString(args.id, 80);
        if (args.id !== undefined && !id) return { content: { error: 'invalid_id' } };
        const hoursRaw = typeof args.hours === 'number' ? args.hours : 24;
        const hours = Math.min(168, Math.max(1, Math.trunc(hoursRaw)));
        const services = id ? data.services.filter((service) => service.id === id) : data.services;
        if (id && services.length === 0) return { content: { error: 'not_released' } };
        const history = await loadHistory(services.map((service) => service.id), hours);
        const changes = [...history.entries()].flatMap(([serviceId, entries]) => {
          const ref = serviceRef(data, serviceId);
          return ref
            ? entries.map((change) => ({
                service: ref,
                at: new Date(change.at).toISOString(),
                state: change.state,
                stateText: stateLabel(change.state, locale),
              }))
            : [];
        });
        return {
          content: {
            windowHours: hours,
            changes,
            note: 'The window ends at the last measurement, not at the current time.',
          },
        };
      }

      case 'get_maintenance': {
        return {
          content: {
            windows: data.maintenance.map((window) => ({
              service: window.serviceId ? serviceRef(data, window.serviceId) : null,
              serviceName: window.serviceId ? serviceName(data, window.serviceId, locale) : null,
              startsAt: window.startsAt,
              endsAt: window.endsAt,
              note: window.note,
            })),
          },
          blocks: data.maintenance.slice(0, 4).map((window) => ({
            type: 'maintenance',
            serviceId: window.serviceId,
            serviceName: window.serviceId ? serviceName(data, window.serviceId, locale) : null,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
            note: window.note,
          })),
        };
      }

      case 'open_page': {
        const path = asString(args.path, 300);
        if (!path) return { content: { error: 'invalid_path' } };
        return openPage(path, data, session, locale);
      }

      case 'render_ui': {
        const result = validateUiNodes(args.nodes, data, session, locale);
        if (result.error) return { content: { error: 'invalid_ui', details: result.error } };
        return { content: { ok: true, count: result.nodes.length }, blocks: result.nodes };
      }

      case 'ask_step': {
        const question = asString(args.question, 300);
        const optionsRaw = args.options;
        if (!question || !Array.isArray(optionsRaw) || optionsRaw.length < 2 || optionsRaw.length > 4) {
          return { content: { error: 'invalid_step' } };
        }
        const options = optionsRaw.flatMap((option) => {
          if (option === null || typeof option !== 'object') return [];
          const label = asString((option as { label?: unknown }).label, 80);
          const value = asString((option as { value?: unknown }).value, 200);
          return label && value ? [{ label, value }] : [];
        });
        if (options.length !== optionsRaw.length) return { content: { error: 'invalid_step' } };
        const step = typeof args.step === 'number' && Number.isFinite(args.step) ? Math.max(1, Math.trunc(args.step)) : undefined;
        const total = typeof args.total === 'number' && Number.isFinite(args.total) ? Math.max(step ?? 1, Math.trunc(args.total)) : undefined;
        return {
          content: { ok: true },
          blocks: [{ type: 'step', question, options, ...(step ? { step } : {}), ...(total ? { total } : {}) }],
        };
      }

      default:
        return { content: { error: 'unknown_tool' } };
    }
  } catch {
    return { content: { error: 'tool_failed' } };
  }
}
