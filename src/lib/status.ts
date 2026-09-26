/*
 * Der gemessene Zustand kommt aus dem Kollektor - nicht aus der Nix-Deklaration.
 *
 * "Soll existieren" (Vertrag) und "antwortet gerade" (Messung) sind zwei
 * verschiedene Tatsachen. Deshalb wird hier nie geraten: antwortet der
 * Kollektor nicht, ist der Zustand `unknown`, und `unmonitored` bleibt etwas
 * anderes als `down`.
 *
 * Im Entwicklungsbetrieb antwortet eine Datei in **Prometheus-Form**. Derselbe
 * Parser liest also Beispiel und Wirklichkeit; getauscht wird nur, woher die
 * Antwort kommt.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDevBuild } from './env.ts';
import type { FleetService } from './fleet.ts';

export type ServiceState = 'up' | 'down' | 'unknown' | 'unmonitored';

export interface Live {
  readonly state: ServiceState;
  /** Der Zeitpunkt der Messung in Millisekunden, oder `null`. */
  readonly asOf: number | null;
}

export interface StatusSnapshot {
  /** Der jüngste gemessene Zeitpunkt über alle Dienste, oder `null`. */
  readonly asOf: number | null;
  readonly services: ReadonlyMap<string, Live>;
}

/** Ein Zustandswechsel: wann ein Dienst von einem Zustand in den anderen ging. */
export interface StateChange {
  readonly serviceId: string;
  readonly at: number;
  readonly state: ServiceState;
}

interface PrometheusSeries {
  readonly metric?: Readonly<Record<string, string>>;
  readonly value?: readonly [number | string, string];
  readonly values?: readonly (readonly [number | string, string])[];
}

interface PrometheusResult {
  readonly status: string;
  readonly data?: { readonly resultType?: string; readonly result?: readonly PrometheusSeries[] };
}

// ------------------------------------------------------------------------------------------------
// Woher die Antwort kommt: Kollektor oder Beispiel
// ------------------------------------------------------------------------------------------------

const collector = (): string | null => process.env.PORTAL_PROMETHEUS_URL?.trim() || null;

/** Der Pfad eines Beispiels: ausdrücklich gesetzt, sonst nur in der Entwicklung. */
function examplePath(name: string, variable: string): string | null {
  const explicit = process.env[variable]?.trim();
  if (explicit) return resolve(explicit);
  if (isDevBuild() && !collector()) return resolve(`fixtures/${name}`);
  return null;
}

function readExample(path: string): PrometheusResult | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PrometheusResult;
  } catch {
    return null;
  }
}

async function ask(url: URL): Promise<PrometheusResult | null> {
  const base = collector();
  if (!base) return null;
  try {
    const target = new URL(url.pathname + url.search, base);
    const response = await fetch(target, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    return (await response.json()) as PrometheusResult;
  } catch {
    return null;
  }
}

const vector = async (expression: string): Promise<PrometheusResult | null> => {
  const example = examplePath('status.example.json', 'PORTAL_STATUS_FIXTURE');
  if (example) return readExample(example);
  const url = new URL('/api/v1/query', 'http://collector');
  url.searchParams.set('query', expression);
  return ask(url);
};

const matrix = async (expression: string, hours: number): Promise<PrometheusResult | null> => {
  const example = examplePath('status-history.example.json', 'PORTAL_STATUS_HISTORY_FIXTURE');
  if (example) return readExample(example);
  const url = new URL('/api/v1/query_range', 'http://collector');
  const end = Math.floor(Date.now() / 1000);
  url.searchParams.set('query', expression);
  url.searchParams.set('start', String(end - hours * 3600));
  url.searchParams.set('end', String(end));
  url.searchParams.set('step', '300');
  return ask(url);
};

const seconds = (value: readonly [number | string, string] | undefined): number | null =>
  value ? Number(value[0]) * 1000 : null;

// ------------------------------------------------------------------------------------------------
// Der aktuelle Zustand
// ------------------------------------------------------------------------------------------------

export async function loadStatus(serviceIds: readonly string[]): Promise<StatusSnapshot | null> {
  if (serviceIds.length === 0) return null;
  const wanted = new Set(serviceIds);
  const body = await vector('probe_success');
  if (!body) return null;

  const services = new Map<string, Live>();
  let asOf: number | null = null;

  for (const series of body.data?.result ?? []) {
    const id = series.metric?.service;
    if (!id || !wanted.has(id)) continue;
    const at = seconds(series.value);
    if (at !== null && (asOf === null || at > asOf)) asOf = at;
    const state: ServiceState = series.value?.[1] === '1' ? 'up' : 'down';
    const previous = services.get(id);
    services.set(id, {
      // Ein Dienst ist `down`, sobald eine seiner Messungen `down` ist.
      state: previous?.state === 'down' || state === 'down' ? 'down' : 'up',
      asOf: at ?? previous?.asOf ?? null,
    });
  }

  return { asOf, services };
}

/** Der Zustand eines Dienstes aus einem Schnappschuss - nie geraten. */
export function stateOf(service: Pick<FleetService, 'id' | 'monitored'>, snapshot: StatusSnapshot | null): Live {
  if (service.monitored === false) return { state: 'unmonitored', asOf: null };
  return snapshot?.services.get(service.id) ?? { state: 'unknown', asOf: null };
}

// ------------------------------------------------------------------------------------------------
// Der Verlauf: Wechsel statt Kurven
// ------------------------------------------------------------------------------------------------

/**
 * Die Wechsel eines Dienstes in den letzten Stunden, in zeitlicher Folge.
 *
 * Kein Diagramm: „war das gestern auch schon?" beantwortet eine Liste von
 * Wechseln genauer als eine Kurve, die niemand liest - und ein Diagramm wäre
 * ein eigenes Thema (eigene Bibliothek, eigene Farben, eigener Maßstab).
 */
export async function loadHistory(serviceIds: readonly string[], hours = 24): Promise<ReadonlyMap<string, readonly StateChange[]>> {
  const wanted = new Set(serviceIds);
  const body = await matrix('probe_success', hours);
  const history = new Map<string, StateChange[]>();
  if (!body) return history;

  for (const series of body.data?.result ?? []) {
    const id = series.metric?.service;
    if (!id || !wanted.has(id)) continue;
    const changes: StateChange[] = [];
    let previous: ServiceState | null = null;
    for (const point of series.values ?? []) {
      const at = seconds(point);
      if (at === null) continue;
      const state: ServiceState = point[1] === '1' ? 'up' : 'down';
      if (state !== previous) {
        changes.push({ serviceId: id, at, state });
        previous = state;
      }
    }
    if (changes.length > 0) history.set(id, changes);
  }

  return history;
}
