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
