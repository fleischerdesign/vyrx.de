/*
 * Adapter: wie das Portal einen Dienst nach etwas fragt, ohne seinen Namen zu
 * kennen.
 *
 * Die Regel, die alles trägt: **die Produktkenntnis lebt in der Deklaration,
 * nicht im Code.** Die Deklaration sagt, welcher Treiber spricht, welchen Weg
 * er geht und welches Feld aus welcher Stelle der Antwort kommt. Die Oberfläche
 * liest danach nur noch Felder - sie kennt keinen Dienst.
 *
 * Deshalb braucht fast jede Anbindung **keinen eigenen Code**: der generische
 * Treiber `http-json` (ein Aufruf, JSON, Felder über Zeiger) deckt den
 * Normalfall. Ein eigener Treiber entsteht nur, wo eine Schnittstelle mehr
 * braucht als Weg und Zeiger - und dann hinter derselben Schnittstelle.
 *
 * Was hier bewusst nicht passiert:
 *   - kein Schreiben in einen Dienst außer über eine deklarierte Aktion,
 *   - kein Zugangsschlüssel im Browser (Zugangsdaten kommen aus der Umgebung),
 *   - keine Rohantwort an die Oberfläche, sondern nur deklarierte Felder,
 *   - kein Zwischenspeicher in der Datenbank: Werte leben für die Dauer der
 *     Anfrage.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'astro/zod';
import { isDevBuild } from './env.ts';
import type { Locale } from './locale.ts';

const localized = z.object({ de: z.string().min(1), en: z.string().min(1) });

/** Wofür ein Wert steht - die Darstellung entscheidet der Typ, nicht der Treiber. */
export const FIELD_TYPES = ['text', 'number', 'duration', 'status', 'bytes', 'date'] as const;

const fieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  label: localized,
  type: z.enum(FIELD_TYPES),
  /** Zeiger in die Antwort (RFC 6901, Teilmenge): `/requests/pending`. */
  pointer: z.string().startsWith('/'),
});

/**
 * Eine Liste ist eine Sammlung, keine Zahl - und deshalb eine eigene Form.
 *
 * `max` ist Pflicht und gedeckelt: eine Deklaration darf nicht „alle Zeilen"
 * verlangen. Was hier nicht steht, wird auch nicht gelesen.
 */
const listSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  label: localized,
  pointer: z.string().startsWith('/'),
  max: z.number().int().min(1).max(10).default(5),
  items: z.array(fieldSchema).min(1),
});

const actionSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  label: localized,
  /** Was vor dem Auslösen dasteht. Eine Aktion ohne diesen Satz gibt es nicht. */
  confirm: localized,
  method: z.enum(['POST', 'PUT', 'DELETE']),
  path: z.string().startsWith('/'),
  /** Vorerst nur Verwaltung: eine Aktion ohne Recht ist keine Aktion (E-0009, R3). */
  permission: z.literal('admin'),
});

const capabilitySchema = z.object({
  driver: z.string().min(1),
  auth: z.enum(['none', 'bearer', 'header', 'basic']).default('none'),
  read: z
    .object({ method: z.literal('GET').default('GET'), path: z.string().startsWith('/') })
    .optional(),
  fields: z.array(fieldSchema).default([]),
  lists: z.array(listSchema).default([]),
  actions: z.array(actionSchema).default([]),
});

export const adaptersSchema = z.object({
  schema: z.literal(1),
  services: z.record(z.string(), capabilitySchema),
  /** Nur für den Entwicklungsbetrieb: die Antwort, die sonst das Netz liefert. */
  examples: z.record(z.string(), z.unknown()).default({}),
});

export type Capability = z.infer<typeof capabilitySchema>;
export type AdapterField = z.infer<typeof fieldSchema>;
export type AdapterList = z.infer<typeof listSchema>;
export type AdapterAction = z.infer<typeof actionSchema>;
export type Adapters = z.infer<typeof adaptersSchema>;

// ------------------------------------------------------------------------------------------------
// Woher die Deklaration kommt
// ------------------------------------------------------------------------------------------------

function source(): string | null {
  const explicit = process.env.PORTAL_ADAPTERS?.trim();
  if (explicit) return resolve(explicit);
  if (isDevBuild()) return resolve('fixtures/adapters.example.json');
  return null;
}

let cache: { path: string; value: Adapters | null } | null = null;

export function loadAdapters(): Adapters | null {
  const path = source();
  if (!path) return null;
  if (cache?.path === path) return cache.value;
  try {
    const parsed = adaptersSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    cache = { path, value: parsed.success ? parsed.data : null };
    return cache.value;
  } catch {
    cache = { path, value: null };
    return null;
  }
}

export const capabilityOf = (adapters: Adapters | null, serviceId: string): Capability | undefined =>
  adapters?.services[serviceId];

// ------------------------------------------------------------------------------------------------
// Ein Wert trägt seinen Zustand - nie eine nackte Zahl
// ------------------------------------------------------------------------------------------------

export type ValueState = 'ok' | 'unavailable' | 'unauthorized' | 'unsupported' | 'missing';

export interface FieldValue {
  readonly state: ValueState;
  /** Der rohe Wert; die Darstellung formt ihn nach `type`. */
  readonly value: unknown;
}

/** Eine gelesene Liste: höchstens `max` Zeilen, jede mit ihren Feldern. */
export interface ListValue {
  readonly state: ValueState;
  readonly rows: readonly ReadonlyMap<string, FieldValue>[];
}

/** Ein Zeiger in ein Dokument (RFC 6901, ohne Escapes - unsere Pfade sind schlicht). */
function pointer(document: unknown, path: string): unknown {
  if (path === '' || path === '/') return document;
  return path
    .split('/')
    .slice(1)
    .reduce<unknown>((current, segment) => {
      if (current === null || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, document);
}

function mapFields(fields: readonly AdapterField[], body: unknown): ReadonlyMap<string, FieldValue> {
  const values = new Map<string, FieldValue>();
  for (const field of fields) {
    const value = pointer(body, field.pointer);
    values.set(field.id, value === undefined ? { state: 'missing', value: null } : { state: 'ok', value });
  }
  return values;
}

function mapLists(lists: readonly AdapterList[], body: unknown): ReadonlyMap<string, ListValue> {
  const values = new Map<string, ListValue>();
  for (const list of lists) {
    const raw = pointer(body, list.pointer);
    if (!Array.isArray(raw)) {
      values.set(list.id, { state: raw === undefined ? 'missing' : 'missing', rows: [] });
      continue;
    }
    const rows = raw.slice(0, list.max).map((item) => mapFields(list.items, item));
    values.set(list.id, { state: 'ok', rows });
  }
  return values;
}

// ------------------------------------------------------------------------------------------------
// Der Aufruf
// ------------------------------------------------------------------------------------------------

export interface DetailResult {
  readonly state: ValueState;
  readonly asOf: number | null;
  readonly values: ReadonlyMap<string, FieldValue>;
  readonly lists: ReadonlyMap<string, ListValue>;
}

const NO_VALUES: ReadonlyMap<string, FieldValue> = new Map();
const NO_LISTS: ReadonlyMap<string, ListValue> = new Map();
const EMPTY: DetailResult = { state: 'unsupported', asOf: null, values: NO_VALUES, lists: NO_LISTS };

/** Zugangsdaten kommen aus der Umgebung - nie aus der Deklaration, nie in den Browser (E-0004). */
function credential(serviceId: string): string | null {
  return process.env[`PORTAL_CREDENTIAL_${serviceId.toUpperCase().replace(/-/g, '_')}`]?.trim() || null;
}

function withAuth(headers: Headers, auth: Capability['auth'], secret: string | null): void {
  if (!secret) return;
  if (auth === 'bearer') headers.set('authorization', `Bearer ${secret}`);
  else if (auth === 'header') headers.set('x-api-key', secret);
  else if (auth === 'basic') headers.set('authorization', `Basic ${secret}`);
}

/**
 * Fragt einen Dienst nach den deklarierten Feldern.
 *
 * Ein Beispiel im Entwicklungsbetrieb ersetzt nur **den Rumpf**, nicht den Weg:
 * Zeiger und Typen werden in beiden Fällen von derselben Funktion gelesen.
 */
export async function readDetail(
  serviceId: string,
  baseUrl: string,
  adapters: Adapters | null,
): Promise<DetailResult> {
  const capability = capabilityOf(adapters, serviceId);
  if (!capability || !capability.read) return EMPTY;
  if (capability.fields.length === 0 && capability.lists.length === 0) return EMPTY;

  const example = adapters?.examples[serviceId];
  if (example !== undefined) {
    return { state: 'ok', asOf: Date.now(), values: mapFields(capability.fields, example), lists: mapLists(capability.lists, example) };
  }

  // Ein Treiber, den es nicht gibt, ist eine ehrliche Antwort - nicht ein Fehler.
  if (capability.driver !== 'http-json') return EMPTY;

  const secret = credential(serviceId);
  if (capability.auth !== 'none' && !secret) {
    return { state: 'unauthorized', asOf: null, values: NO_VALUES, lists: NO_LISTS };
  }

  const headers = new Headers({ accept: 'application/json' });
  withAuth(headers, capability.auth, secret);

  try {
    const url = new URL(capability.read.path, baseUrl);
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
    if (response.status === 401 || response.status === 403) {
      return { state: 'unauthorized', asOf: null, values: NO_VALUES, lists: NO_LISTS };
    }
    if (!response.ok) return { state: 'unavailable', asOf: null, values: NO_VALUES, lists: NO_LISTS };
    const body: unknown = await response.json();
    return { state: 'ok', asOf: Date.now(), values: mapFields(capability.fields, body), lists: mapLists(capability.lists, body) };
  } catch {
    return { state: 'unavailable', asOf: null, values: NO_VALUES, lists: NO_LISTS };
  }
}

// ------------------------------------------------------------------------------------------------
// Aktionen: nur was deklariert ist, nur mit Zugang, immer mit Spur
// ------------------------------------------------------------------------------------------------

export type ActionOutcome = 'accepted' | 'refused' | 'failed' | 'unsupported';

/**
 * Löst eine deklarierte Aktion aus.
 *
 * `accepted` heißt: der Dienst hat den Auftrag angenommen - **nicht**, dass er
 * erledigt ist. Ob es gewirkt hat, sagt die nächste Messung, nicht diese
 * Antwort. Deshalb gibt es hier keinen Zustand „erledigt".
 */
export async function performAction(
  serviceId: string,
  baseUrl: string,
  adapters: Adapters | null,
  actionId: string,
): Promise<ActionOutcome> {
  const capability = capabilityOf(adapters, serviceId);
  const action = capability?.actions.find((entry) => entry.id === actionId);
  if (!capability || !action) return 'unsupported';

  // Im Beispielbetrieb wird nichts angefasst: angenommen, ohne das Netz zu berühren.
  if (adapters?.examples[serviceId] !== undefined) return 'accepted';
  if (capability.driver !== 'http-json') return 'unsupported';

  const secret = credential(serviceId);
  if (capability.auth !== 'none' && !secret) return 'refused';

  const headers = new Headers({ accept: 'application/json' });
  withAuth(headers, capability.auth, secret);

  try {
    const response = await fetch(new URL(action.path, baseUrl), {
      method: action.method,
      headers,
      signal: AbortSignal.timeout(6000),
    });
    if (response.status === 401 || response.status === 403) return 'refused';
    return response.ok ? 'accepted' : 'failed';
  } catch {
    return 'failed';
  }
}

// ------------------------------------------------------------------------------------------------
// Darstellung: der Wert wird nach seinem Typ geformt
// ------------------------------------------------------------------------------------------------

export function formatValue(field: AdapterField, value: unknown, locale: Locale): string {
  if (value === null || value === undefined) return '';
  switch (field.type) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString(locale) : String(value);
    case 'bytes': {
      const amount = Number(value);
      if (!Number.isFinite(amount)) return String(value);
      const units = ['B', 'kB', 'MB', 'GB', 'TB'];
      let size = amount;
      let unit = 0;
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
      }
      return `${size.toLocaleString(locale, { maximumFractionDigits: 1 })} ${units[unit]}`;
    }
    case 'duration': {
      const seconds = Number(value);
      if (!Number.isFinite(seconds)) return String(value);
      const days = Math.floor(seconds / 86_400);
      const hours = Math.floor((seconds % 86_400) / 3_600);
      const minutes = Math.floor((seconds % 3_600) / 60);
      const parts = days > 0 ? [`${days} d`, `${hours} h`] : hours > 0 ? [`${hours} h`, `${minutes} min`] : [`${minutes} min`];
      return parts.join(' ');
    }
    case 'date': {
      const at = Date.parse(String(value));
      return Number.isFinite(at) ? new Date(at).toLocaleDateString(locale, { dateStyle: 'medium' }) : String(value);
    }
    case 'status':
      return String(value);
    default:
      return String(value);
  }
}
