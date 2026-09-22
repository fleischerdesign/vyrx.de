// The portal's data layer. Two same-origin reads and a catalogue projection - nothing else touches the
// network, and no token is ever exposed to the page.

const splitGroups = (value) => (value || '').split('|').map((g) => g.trim()).filter(Boolean);
const key = (username, kind) => `vyrx.portal.${kind}.${username}`;

export async function loadIdentity() {
  try {
    const res = await fetch('/api/me', {
      credentials: 'same-origin',
      redirect: 'manual',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok || res.type === 'opaqueredirect') return null;
    return {
      username: res.headers.get('X-Portal-Username') || '',
      name: res.headers.get('X-Portal-Name') || '',
      groups: splitGroups(res.headers.get('X-Portal-Groups')),
    };
  } catch {
    return null;
  }
}

export async function loadCatalog() {
  const res = await fetch('/portal.json', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const data = await res.json();
  return Array.isArray(data)
    ? { adminGroups: [], services: data }
    : { adminGroups: data.adminGroups || [], services: data.services || [] };
}

export const visibleServices = (services, groups) =>
  services.filter((s) => !s.groups?.length || s.groups.some((g) => groups.includes(g)));

// Copy ships bilingual in the contract; the view picks the locale, with the default locale as fallback.
export const localized = (value, locale) =>
  typeof value === 'string' ? value : value?.[locale] || value?.de || '';

// Live status, read from the one series the alerting uses. A service is `up` only when every probe
// series the collector holds for it is 1, `down` when any is 0, and `unknown` when the collector does
// not answer or holds no series at all - never "down" by default.
export async function loadStatus() {
  try {
    const res = await fetch('/api/status', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = await res.json();
    const services = new Map();
    const hosts = new Map();
    let asOf = 0;
    for (const series of body?.data?.result || []) {
      const [seconds, value] = series.value || [];
      const at = Number(seconds) * 1000;
      if (at > asOf) asOf = at;
      const state = value === '1' ? 'up' : 'down';
      const { service, host, probe_type: probeType } = series.metric || {};
      if (service) {
        const current = services.get(service);
        services.set(service, {
          state: current?.state === 'down' || state === 'down' ? 'down' : 'up',
          asOf: at,
        });
      }
      if (host && probeType === 'icmp_mesh') hosts.set(host, { state, asOf: at });
    }
    return { asOf: asOf || Date.now(), services, hosts };
  } catch {
    return null;
  }
}

// The four states a tile can show: not monitored by contract, up, down, or unknown (no data).
export function serviceState(service, status) {
  if (service.monitored === false) return { state: 'unmonitored' };
  const entry = status?.services?.get(service.id);
  if (!entry) return { state: 'unknown' };
  return entry;
}

export function hostState(name, status) {
  return status?.hosts?.get(name)?.state || 'unknown';
}

export const isAdmin = (identity, adminGroups) =>
  Boolean(identity) && adminGroups.some((g) => identity.groups.includes(g));

export function categories(services) {
  const map = new Map();
  for (const service of services) {
    const name = service.category || 'Services';
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(service);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const read = (username, kind) => {
  try {
    return JSON.parse(localStorage.getItem(key(username, kind)) || '[]');
  } catch {
    return [];
  }
};
const write = (username, kind, value) => localStorage.setItem(key(username, kind), JSON.stringify(value));

export const favorites = (username) => read(username, 'fav');
export const recents = (username) => read(username, 'recent');

export function toggleFavorite(username, id) {
  const list = favorites(username);
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  write(username, 'fav', next);
  return next;
}

export function pushRecent(username, id) {
  const next = [id, ...recents(username).filter((x) => x !== id)].slice(0, 8);
  write(username, 'recent', next);
}
