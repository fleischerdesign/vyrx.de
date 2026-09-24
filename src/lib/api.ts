// The portal's data layer. Two same-origin reads and a catalogue projection - nothing else touches the
// network, and no token is ever exposed to the page.
//
// The shapes it answers with are written down in `./contract.ts`, and the functions here do two things:
// read, and merge. Merging is the only place where the portal interprets: a series is `1` or not, a host
// is known or not, and "no answer" stays distinguishable from "down".

import type {
  Catalog,
  Copy,
  Host,
  HostType,
  Identity,
  Live,
  PrometheusVector,
  Service,
  ServiceState,
  StatusSnapshot,
} from './contract.ts';
import type { Locale } from '../i18n/index.ts';

const splitGroups = (value: string | null): string[] =>
  (value || '')
    .split('|')
    .map((group) => group.trim())
    .filter(Boolean);

/** The browser's own storage, keyed per person: favourites and history are two kinds of one thing. */
const key = (username: string, kind: 'fav' | 'recent') => `vyrx.portal.${kind}.${username}`;

/**
 * Every read answers or gives up. A read that hangs is a hang, not a state: the skeleton would stay a
 * skeleton and the reader would have no way to tell waiting from broken. The routes give the collector five
 * seconds, so the browser waits a little longer than the thing it asked.
 */
const TIMEOUT_MS = 8000;
const deadline = (): AbortSignal => AbortSignal.timeout(TIMEOUT_MS);

/** The caller's own claims. `null` means "not signed in", which is a state and not a failure. */
export async function loadIdentity(): Promise<Identity | null> {
  try {
    const res = await fetch('/api/me', {
      credentials: 'same-origin',
      redirect: 'manual',
      headers: { Accept: 'application/json' },
      signal: deadline(),
    });
    if (!res.ok || res.type === 'opaqueredirect') return null;
    // The username *is* the claim: a response without one is not an identity with empty fields, it is
    // nobody, and the portal has a state for that. Reading it as a name would have made every anonymous
    // reader look signed in.
    const username = res.headers.get('X-Portal-Username') || '';
    if (!username) return null;
    return {
      username,
      name: res.headers.get('X-Portal-Name') || '',
      groups: splitGroups(res.headers.get('X-Portal-Groups')),
    };
  } catch {
    return null;
  }
}

/** The catalogue. It used to be a bare array; today it is an object, and both shapes are still read. */
export async function loadCatalog(): Promise<Catalog> {
  const res = await fetch('/portal.json', { credentials: 'same-origin', signal: deadline() });
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const data: unknown = await res.json();
  if (Array.isArray(data)) {
    return { adminGroups: [], locales: [], hosts: [], services: data as readonly Service[] };
  }
  const catalog = data as Partial<Catalog>;
  return {
    adminGroups: catalog.adminGroups ?? [],
    locales: catalog.locales ?? [],
    hosts: catalog.hosts ?? [],
    services: catalog.services ?? [],
  };
}

/** What the viewer may see: no groups means everybody, otherwise one of the viewer's groups has to match. */
export const visibleServices = (services: readonly Service[], groups: readonly string[]): readonly Service[] =>
  services.filter((service) => !service.groups?.length || service.groups.some((group) => groups.includes(group)));

/** Copy ships bilingual in the contract; the view picks the locale, with the default locale as fallback. */
export const localized = (value: Copy, locale: Locale): string =>
  typeof value === 'string' ? value : value?.[locale] || value?.de || '';

// Live status, read from the one series the alerting uses. A service is `up` only when every probe
// series the collector holds for it is 1, `down` when any is 0, and `unknown` when the collector does
// not answer or holds no series at all - never "down" by default.
//
// Hosts come from `up`: a direct scrape labels `instance` with the host name, while a blackbox scrape
// labels it with the service. Keeping only the instances the registry knows is therefore both the
// filter and the join, and it names no service here.
const fetchVector = async (url: string): Promise<PrometheusVector | null> => {
  try {
    const res = await fetch(url, { credentials: 'same-origin', signal: deadline() });
    return res.ok ? ((await res.json()) as PrometheusVector) : null;
  } catch {
    return null;
  }
};

/** The value pair a series carries, or nothing when the collector answered without one. */
type PrometheusSeriesValue = readonly [number | string, string] | undefined;

const seconds = (value: PrometheusSeriesValue): number => Number(value?.[0]) * 1000;

export async function loadStatus(hostNames: readonly string[] = []): Promise<StatusSnapshot | null> {
  const known = new Set(hostNames);
  const [probes, scrapes] = await Promise.all([fetchVector('/api/status'), fetchVector('/api/hosts')]);
  if (!probes && !scrapes) return null;
  const services = new Map<string, Live>();
  const hosts = new Map<string, Live>();
  let asOf = 0;
  const measured = (value: PrometheusSeriesValue): number => {
    const stamp = seconds(value);
    if (stamp > asOf) asOf = stamp;
    return stamp;
  };
  for (const series of probes?.data?.result || []) {
    const when = measured(series.value);
    const state: ServiceState = series.value?.[1] === '1' ? 'up' : 'down';
    const { service, probe_type: probeType, target_host: targetHost } = series.metric || {};
    if (service) {
      const current = services.get(service);
      services.set(service, {
        state: current?.state === 'down' || state === 'down' ? 'down' : 'up',
        asOf: when,
      });
    }
    if (probeType === 'icmp_mesh' && targetHost && known.has(targetHost)) {
      hosts.set(targetHost, { state, asOf: when });
    }
  }
  for (const series of scrapes?.data?.result || []) {
    const when = measured(series.value);
    const { instance } = series.metric || {};
    if (instance && known.has(instance)) {
      hosts.set(instance, { state: series.value?.[1] === '1' ? 'up' : 'down', asOf: when });
    }
  }
  return { asOf: asOf || Date.now(), services, hosts };
}

/** A service or a host without a live read: not monitored by contract, or nobody answered. */
const unmeasured = (monitored: boolean | undefined, state: ServiceState): Live => ({ state: monitored === false ? 'unmonitored' : state });

// `serviceState` and `hostState` answer the same shape, so a dot and its label render through one path for
// both kinds of tile. They used to differ (an object for services, a bare string for hosts), which is the
// kind of asymmetry only a reader notices and only a compiler finds.
export function serviceState(service: Service, status?: StatusSnapshot | null): Live {
  if (service.monitored === false) return unmeasured(false, 'unknown');
  return status?.services?.get(service.id) ?? unmeasured(true, 'unknown');
}

export function hostState(host: Host, status?: StatusSnapshot | null): Live {
  if (host.monitored === false) return unmeasured(false, 'unknown');
  return status?.hosts?.get(host.name) ?? unmeasured(true, 'unknown');
}

// The role a host is assigned, as an i18n key. `hostType` is the inventory's own vocabulary, so the
// portal renders a role instead of inventing a hardware label it cannot derive.
export const ROLE_KEY: Readonly<Record<HostType, string>> = {
  server: 'roleServer',
  workstation: 'roleWorkstation',
  client: 'roleClient',
  embedded: 'roleEmbedded',
};

export const isAdmin = (identity: Identity | null, adminGroups: readonly string[]): boolean =>
  identity !== null && adminGroups.some((group) => identity.groups.includes(group));

/** The catalogue in its own grouping. The catalogue decides the categories; the view only lays them out. */
export function categories(services: readonly Service[]): readonly (readonly [string, readonly Service[]])[] {
  const map = new Map<string, Service[]>();
  for (const service of services) {
    const name = service.category || 'Services';
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(service);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const read = (username: string, kind: 'fav' | 'recent'): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key(username, kind)) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const write = (username: string, kind: 'fav' | 'recent', value: readonly string[]): void =>
  localStorage.setItem(key(username, kind), JSON.stringify(value));

export const favorites = (username: string): string[] => read(username, 'fav');
export const recents = (username: string): string[] => read(username, 'recent');

export function toggleFavorite(username: string, id: string): string[] {
  const list = favorites(username);
  const next = list.includes(id) ? list.filter((entry) => entry !== id) : [id, ...list];
  write(username, 'fav', next);
  return next;
}

export function pushRecent(username: string, id: string): string[] {
  const next = [id, ...recents(username).filter((entry) => entry !== id)].slice(0, 8);
  write(username, 'recent', next);
  return next;
}
