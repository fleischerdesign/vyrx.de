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
    ? { adminGroups: [], locales: ['de', 'en'], hosts: [], services: data }
    : {
        adminGroups: data.adminGroups || [],
        locales: data.locales || [],
        hosts: data.hosts || [],
        services: data.services || [],
      };
}

export const visibleServices = (services, groups) =>
  services.filter((s) => !s.groups?.length || s.groups.some((g) => groups.includes(g)));

// Copy ships bilingual in the contract; the view picks the locale, with the default locale as fallback.
export const localized = (value, locale) =>
  typeof value === 'string' ? value : value?.[locale] || value?.de || '';

// Live status, read from the one series the alerting uses. A service is `up` only when every probe
// series the collector holds for it is 1, `down` when any is 0, and `unknown` when the collector does
// not answer or holds no series at all - never "down" by default.
//
// Hosts come from `up`: a direct scrape labels `instance` with the host name, while a blackbox scrape
// labels it with the service. Keeping only the instances the registry knows is therefore both the
// filter and the join, and it names no service here.
const fetchJson = async (url) => {
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
};

export async function loadStatus(hostNames = []) {
  const known = new Set(hostNames);
  const [probes, scrapes] = await Promise.all([fetchJson('/api/status'), fetchJson('/api/hosts')]);
  if (!probes && !scrapes) return null;
  const services = new Map();
  const hosts = new Map();
  let asOf = 0;
  const at = (value) => {
    const stamp = Number(value?.[0]) * 1000;
    if (stamp > asOf) asOf = stamp;
    return stamp;
  };
  for (const series of probes?.data?.result || []) {
    const when = at(series.value);
    const state = series.value?.[1] === '1' ? 'up' : 'down';
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
    const when = at(series.value);
    const { instance } = series.metric || {};
    if (instance && known.has(instance)) {
      hosts.set(instance, { state: series.value?.[1] === '1' ? 'up' : 'down', asOf: when });
    }
  }
  return { asOf: asOf || Date.now(), services, hosts };
}

// The four states a tile can show: not monitored by contract, up, down, or unknown (no data).
export function serviceState(service, status) {
  if (service.monitored === false) return { state: 'unmonitored' };
  const entry = status?.services?.get(service.id);
  if (!entry) return { state: 'unknown' };
  return entry;
}

export function hostState(host, status) {
  if (host.monitored === false) return 'unmonitored';
  return status?.hosts?.get(host.name)?.state || 'unknown';
}

// The role a host is assigned, as an i18n key. `hostType` is the inventory's own vocabulary, so the
// portal renders a role instead of inventing a hardware label it cannot derive.
export const ROLE_KEY = {
  server: 'roleServer',
  workstation: 'roleWorkstation',
  client: 'roleClient',
  embedded: 'roleEmbedded',
};

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
