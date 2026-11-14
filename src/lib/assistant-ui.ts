/*
 * Der Prüfer für den generativen UI-Baum.
 *
 * Das Modell darf Layout und Präsentation komponieren. Es darf aber keine
 * Fakten erfinden: `status`, `service` und `article` werden aus der Sitzung
 * neu gebaut, `summary`, `maintenance` und `step` sind Server-Werkzeugen
 * vorbehalten. Jede Adresse wird gegen die sichtbaren Daten geprüft.
 */

import {
  localBlockHref,
  type UiCardTone,
  type UiGap,
  type UiNode,
  type UiTextVariant,
  type UiTone,
} from './assistant-blocks.ts';
import type { AssistantData, AssistantService } from './assistant-context.ts';
import { pathFor, routeFrom, type Locale } from './locale.ts';
import type { Session } from './session.ts';

export interface UiValidationResult {
  readonly nodes: readonly UiNode[];
  readonly error?: string;
}

const MAX_NODES = 80;
const MAX_DEPTH = 6;
const MAX_CHILDREN = 12;

const TONES: readonly UiTone[] = ['neutral', 'accent', 'ok', 'warn', 'bad', 'unknown'];
const GAPS: readonly UiGap[] = ['none', 'xs', 'sm', 'md', 'lg'];
const TEXT_VARIANTS: readonly UiTextVariant[] = ['body', 'small', 'muted', 'lead'];
const CARD_TONES: readonly UiCardTone[] = ['default', 'subtle', 'accent'];

const asObject = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asText = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
};

const optionalText = (value: unknown, max: number): string | undefined => {
  if (value === undefined) return undefined;
  return asText(value, max) ?? undefined;
};

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asTone = (value: unknown, fallback: UiTone = 'neutral'): UiTone =>
  typeof value === 'string' && (TONES as readonly string[]).includes(value) ? (value as UiTone) : fallback;

const asGap = (value: unknown, fallback: UiGap = 'md'): UiGap =>
  typeof value === 'string' && (GAPS as readonly string[]).includes(value) ? (value as UiGap) : fallback;

const asTextVariant = (value: unknown, fallback: UiTextVariant = 'body'): UiTextVariant =>
  typeof value === 'string' && (TEXT_VARIANTS as readonly string[]).includes(value)
    ? (value as UiTextVariant)
    : fallback;

const asCardTone = (value: unknown, fallback: UiCardTone = 'default'): UiCardTone =>
  typeof value === 'string' && (CARD_TONES as readonly string[]).includes(value)
    ? (value as UiCardTone)
    : fallback;

const serviceName = (service: AssistantService, locale: Locale): string => service.name[locale] || service.name.de;

const stateText = (state: AssistantService['state'], locale: Locale): string =>
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

const kindText = (kind: string, locale: Locale): string => {
  const labels: Record<string, { de: string; en: string }> = {
    guide: { de: 'Anleitung', en: 'Guide' },
    explanation: { de: 'Erklärung', en: 'Explanation' },
    troubleshooting: { de: 'Problemlösung', en: 'Troubleshooting' },
    reference: { de: 'Referenz', en: 'Reference' },
  };
  return labels[kind]?.[locale] ?? kind;
};

/**
 * Prüft einen UI-Baum. Fehler sind ein Ergebnis, keine Ausnahme: Der Aufrufer
 * gibt sie an das Modell zurück, damit es den Baum korrigieren kann.
 */
export function validateUiNodes(
  value: unknown,
  data: AssistantData,
  session: Session,
  locale: Locale,
): UiValidationResult {
  let count = 0;
  let failure: string | null = null;

  const fail = (message: string): null => {
    failure ??= message;
    return null;
  };

  const safeHref = (value: unknown): string | null => {
    if (!localBlockHref(value)) return null;
    const route = routeFrom(value);
    if (route.name === 'notFound') return null;

    if (route.name === 'service') {
      const service = data.services.find((entry) => entry.id === route.param);
      return service ? pathFor(locale, 'service', service.id) : null;
    }
    if (route.name === 'article') {
      const article = data.articles.find((entry) => entry.slug === route.param);
      return article ? pathFor(locale, 'article', article.slug) : null;
    }
    if (route.name === 'admin' && !session.isAdmin) return null;

    const allowed: readonly string[] = ['start', 'project', 'help', 'overview', 'services', 'knowledge', 'status', 'account'];
    if (allowed.includes(route.name)) return pathFor(locale, route.name, route.param ?? undefined);
    return null;
  };

  const visitChildren = (value: unknown, depth: number): readonly UiNode[] | null => {
    if (!Array.isArray(value) || value.length > MAX_CHILDREN) return fail('invalid_children');
    const nodes: UiNode[] = [];
    for (const child of value) {
      const node = visit(child, depth + 1);
      if (!node) return null;
      nodes.push(node);
    }
    return nodes;
  };

  const visit = (value: unknown, depth: number): UiNode | null => {
    if (depth > MAX_DEPTH) return fail('too_deep');
    if (++count > MAX_NODES) return fail('too_large');

    const node = asObject(value);
    if (!node || typeof node.type !== 'string') return fail('invalid_node');

    switch (node.type) {
      case 'stack': {
        const children = visitChildren(node.children, depth);
        if (!children) return null;
        return { type: 'stack', gap: asGap(node.gap), children };
      }

      case 'grid': {
        const columns = node.columns === 1 || node.columns === 2 || node.columns === 3 ? node.columns : 2;
        const children = visitChildren(node.children, depth);
        if (!children) return null;
        return { type: 'grid', columns, gap: asGap(node.gap), children };
      }

      case 'card': {
        const children = visitChildren(node.children, depth);
        if (!children) return null;
        return {
          type: 'card',
          ...(optionalText(node.title, 160) ? { title: optionalText(node.title, 160) } : {}),
          ...(optionalText(node.description, 400) ? { description: optionalText(node.description, 400) } : {}),
          tone: asCardTone(node.tone),
          children,
        };
      }

      case 'section': {
        const children = visitChildren(node.children, depth);
        if (!children) return null;
        return {
          type: 'section',
          ...(optionalText(node.title, 160) ? { title: optionalText(node.title, 160) } : {}),
          ...(optionalText(node.description, 400) ? { description: optionalText(node.description, 400) } : {}),
          children,
        };
      }

      case 'text': {
        const text = asText(node.value, 4000);
        if (!text) return fail('invalid_text');
        return { type: 'text', value: text, variant: asTextVariant(node.variant) };
      }

      case 'heading': {
        const text = asText(node.value, 200);
        if (!text) return fail('invalid_heading');
        const level = node.level === 2 || node.level === 3 || node.level === 4 ? node.level : 3;
        return { type: 'heading', value: text, level };
      }

      case 'list': {
        if (!Array.isArray(node.items) || node.items.length === 0 || node.items.length > 20) return fail('invalid_list');
        const items: string[] = [];
        for (const item of node.items) {
          const text = asText(item, 200);
          if (!text) return fail('invalid_list');
          items.push(text);
        }
        return { type: 'list', items, ordered: asBoolean(node.ordered) };
      }

      case 'keyValue': {
        if (!Array.isArray(node.items) || node.items.length === 0 || node.items.length > 20) return fail('invalid_keyvalue');
        const items: { label: string; value: string }[] = [];
        for (const entry of node.items) {
          const object = asObject(entry);
          const label = object ? asText(object.label, 80) : null;
          const text = object ? asText(object.value, 500) : null;
          if (!label || !text) return fail('invalid_keyvalue');
          items.push({ label, value: text });
        }
        return { type: 'keyValue', items };
      }

      case 'badge': {
        const label = asText(node.label, 80);
        if (!label) return fail('invalid_badge');
        return { type: 'badge', label, tone: asTone(node.tone) };
      }

      case 'callout': {
        const text = asText(node.text, 1200);
        if (!text) return fail('invalid_callout');
        return {
          type: 'callout',
          tone: asTone(node.tone),
          ...(optionalText(node.title, 160) ? { title: optionalText(node.title, 160) } : {}),
          text,
        };
      }

      case 'divider':
        return { type: 'divider' };

      case 'stat': {
        const label = asText(node.label, 80);
        const text = asText(node.value, 160);
        if (!label || !text) return fail('invalid_stat');
        return {
          type: 'stat',
          label,
          value: text,
          ...(optionalText(node.hint, 200) ? { hint: optionalText(node.hint, 200) } : {}),
          tone: asTone(node.tone),
        };
      }

      case 'progress': {
        const label = asText(node.label, 80);
        const value = typeof node.value === 'number' && Number.isFinite(node.value) && node.value >= 0 ? Math.min(node.value, 1_000_000) : null;
        const max = node.max === undefined ? undefined : typeof node.max === 'number' && Number.isFinite(node.max) && node.max > 0 ? Math.min(node.max, 1_000_000) : null;
        if (!label || value === null || max === null) return fail('invalid_progress');
        return {
          type: 'progress',
          label,
          value,
          ...(max !== undefined ? { max } : {}),
          tone: asTone(node.tone),
          ...(optionalText(node.hint, 200) ? { hint: optionalText(node.hint, 200) } : {}),
        };
      }

      case 'chart': {
        const kind = node.kind === 'sparkline' ? 'sparkline' : 'bar';
        if (!Array.isArray(node.points) || node.points.length === 0 || node.points.length > 12) return fail('invalid_chart');
        const points: { label: string; value: number }[] = [];
        for (const entry of node.points) {
          const object = asObject(entry);
          const label = object ? asText(object.label, 40) : null;
          const value = object && typeof object.value === 'number' && Number.isFinite(object.value) && object.value >= 0 ? Math.min(object.value, 1_000_000_000) : null;
          if (!label || value === null) return fail('invalid_chart');
          points.push({ label, value });
        }
        const max = node.max === undefined ? undefined : typeof node.max === 'number' && Number.isFinite(node.max) && node.max > 0 ? Math.min(node.max, 1_000_000_000) : null;
        if (max === null) return fail('invalid_chart');
        return {
          type: 'chart',
          kind,
          points,
          ...(optionalText(node.label, 120) ? { label: optionalText(node.label, 120) } : {}),
          ...(max !== undefined ? { max } : {}),
          tone: asTone(node.tone),
          ...(optionalText(node.hint, 200) ? { hint: optionalText(node.hint, 200) } : {}),
        };
      }

      case 'timeline': {
        if (!Array.isArray(node.items) || node.items.length === 0 || node.items.length > 12) return fail('invalid_timeline');
        const items: { time: string; title: string; text?: string; tone?: UiTone }[] = [];
        for (const entry of node.items) {
          const object = asObject(entry);
          const time = object ? asText(object.time, 80) : null;
          const title = object ? asText(object.title, 160) : null;
          if (!time || !title) return fail('invalid_timeline');
          items.push({
            time,
            title,
            ...(optionalText(object?.text, 500) ? { text: optionalText(object?.text, 500) } : {}),
            tone: asTone(object?.tone),
          });
        }
        return { type: 'timeline', items };
      }

      case 'table': {
        if (!Array.isArray(node.columns) || node.columns.length === 0 || node.columns.length > 5) return fail('invalid_table');
        const columns: { key: string; label: string }[] = [];
        for (const entry of node.columns) {
          const object = asObject(entry);
          const key = object ? asText(object.key, 40) : null;
          const label = object ? asText(object.label, 80) : null;
          if (!key || !/^[a-z][a-z0-9_-]{0,31}$/.test(key) || !label) return fail('invalid_table');
          columns.push({ key, label });
        }
        if (!Array.isArray(node.rows) || node.rows.length === 0 || node.rows.length > 10) return fail('invalid_table');
        const rows: Record<string, string>[] = [];
        for (const entry of node.rows) {
          const object = asObject(entry);
          if (!object) return fail('invalid_table');
          const row: Record<string, string> = {};
          for (const column of columns) {
            const cell = object[column.key];
            if (cell !== undefined && typeof cell !== 'string') return fail('invalid_table');
            row[column.key] = typeof cell === 'string' ? cell.slice(0, 500) : '';
          }
          rows.push(row);
        }
        return { type: 'table', columns, rows };
      }

      case 'details': {
        const summary = asText(node.summary, 200);
        const children = visitChildren(node.children, depth);
        if (!summary || !children) return fail('invalid_details');
        return { type: 'details', summary, children };
      }

      case 'link': {
        const label = asText(node.label, 120);
        const href = safeHref(node.href);
        if (!label || !href) return fail('invalid_link');
        return { type: 'link', label, href };
      }

      case 'status': {
        const serviceId = asText(node.serviceId, 80);
        const service = serviceId ? data.services.find((entry) => entry.id === serviceId) : undefined;
        if (!service) return fail('service_not_released');
        return {
          type: 'status',
          serviceId: service.id,
          name: serviceName(service, locale),
          state: service.state,
          stateText: stateText(service.state, locale),
          asOf: service.asOf,
          href: pathFor(locale, 'status'),
        };
      }

      case 'service': {
        const serviceId = asText(node.serviceId, 80);
        const service = serviceId ? data.services.find((entry) => entry.id === serviceId) : undefined;
        if (!service) return fail('service_not_released');
        return {
          type: 'service',
          serviceId: service.id,
          name: serviceName(service, locale),
          summary: service.summary[locale] || service.summary.de,
          stateText: stateText(service.state, locale),
          asOf: service.asOf,
          href: pathFor(locale, 'service', service.id),
        };
      }

      case 'article': {
        const slug = asText(node.slug, 120);
        const article = slug ? data.articles.find((entry) => entry.slug === slug) : undefined;
        if (!article) return fail('article_not_released');
        return {
          type: 'article',
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          kind: article.kind,
          kindText: kindText(article.kind, locale),
          href: pathFor(locale, 'article', article.slug),
        };
      }

      case 'suggestions': {
        if (!Array.isArray(node.items) || node.items.length === 0 || node.items.length > 5) return fail('invalid_suggestions');
        const items: string[] = [];
        for (const entry of node.items) {
          const text = asText(entry, 120);
          if (!text) return fail('invalid_suggestions');
          items.push(text);
        }
        return { type: 'suggestions', items };
      }

      // Trust facts and interactive steps come from server tools, not free-form UI.
      case 'summary':
      case 'maintenance':
      case 'step':
      case 'confirm':
      case 'media':
        return fail('server_only_component');

      default:
        return fail('unknown_component');
    }
  };

  if (!Array.isArray(value) || value.length === 0) return { nodes: [], error: 'invalid_nodes' };
  const nodes: UiNode[] = [];
  for (const entry of value) {
    const node = visit(entry, 0);
    if (!node) return { nodes: [], error: failure ?? 'invalid_node' };
    nodes.push(node);
  }

  return { nodes };
}
