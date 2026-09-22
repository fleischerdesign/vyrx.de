// The portal shell: one router, one navigation, one command palette, one place that talks to the data
// layer. Views are pure renderers, so adding a view is a route entry plus a function in views.js.

import { esc, el, delegate, toast } from './dom.js';
import {
  loadIdentity,
  loadCatalog,
  visibleServices,
  isAdmin,
  categories,
  favorites,
  recents,
  toggleFavorite,
  pushRecent,
  localized,
  loadStatus,
} from './api.js';
import * as views from './views.js';

const NAV = [
  { hash: '#/', name: 'overview', key: 'navOverview', icon: '◉' },
  { hash: '#/dienste', name: 'services', key: 'navServices', icon: '▤' },
  { hash: '#/status', name: 'status', key: 'navStatus', icon: '◍' },
  { hash: '#/konto', name: 'account', key: 'navAccount', icon: '⚙' },
  { hash: '#/admin', name: 'admin', key: 'navAdmin', icon: '⛨', admin: true },
];

const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};


let state;

export async function boot({ messages, locale, loginUrl, accountUrl }) {
  if (!document.getElementById('main')) return;

  // The registry is public and is read first: the landing shows the fleet to everyone, and the same
  // answer feeds the signed-in app, so there is one fetch and one truth.
  const registry = await loadCatalog().catch(() => null);
  if (registry) renderLandingHosts(registry, messages, locale);
  startStatusPolling();

  const identity = await loadIdentity();
  if (!identity) return;

  // The shell is already in the document in both states; signing in reveals its signed-in chrome.
  setAuthed(true);
  for (const node of document.querySelectorAll('[data-field="username"]')) node.textContent = identity.name || identity.username;
  for (const node of document.querySelectorAll('[data-field="initial"]')) node.textContent = (identity.name || identity.username || 'U').charAt(0).toUpperCase();

  state = {
    t: messages,
    locale,
    loginUrl,
    accountUrl,
    identity,
    services: [],
    allServices: [],
    hosts: registry?.hosts || [],
    adminGroups: [],
    favorites: favorites(identity.username),
    recents: recents(identity.username),
    isAdmin: false,
    offline: !navigator.onLine,
  };

  installPalette();
  window.addEventListener('hashchange', render);
  window.addEventListener('online', () => setOffline(false));
  window.addEventListener('offline', () => setOffline(true));
  delegate(document, 'click', '[data-action="favorite"]', (e, node) => {
    e.preventDefault();
    state.favorites = toggleFavorite(state.identity.username, node.dataset.id);
    toast(state.favorites.includes(node.dataset.id) ? state.t.addFavorite : state.t.removeFavorite);
    render();
  });
  delegate(document, 'click', '[data-action="open"]', (_e, node) => pushRecent(state.identity.username, node.dataset.id));
  delegate(document, 'click', '[data-filter-category]', (_e, node) => {
    const input = document.querySelector('#service-filter');
    if (!input) return;
    input.value = node.dataset.filterCategory;
    input.dispatchEvent(new Event('input'));
  });

  if (registry) applyCatalog(registry);
  else {
    state.catalogError = true;
    render();
  }
}

// The fleet cards on the public landing: the same renderer as the Status view, so the two cannot look or
// read differently.
function renderLandingHosts(registry, t, locale) {
  const grid = document.getElementById('hosts-grid');
  if (!grid) return;
  landing = { registry, t, locale };
  grid.innerHTML = (registry.hosts || []).map((host) => views.hostCard(host, { t, locale, status: landingStatus })).join('');
}

// Status is live, not baked: one request to the same-origin route, refreshed while the tab is visible.
// A failed read leaves the previous answer in place and the page keeps working - the state model already
// distinguishes "no answer" from "down".
function startStatusPolling() {
  const tick = async () => {
    if (document.visibilityState !== 'visible') return;
    const hosts = state?.hosts || landing?.registry.hosts || [];
    const status = await loadStatus(hosts.map((host) => host.name));
    if (!status) return;
    landingStatus = status;
    if (landing) renderLandingHosts(landing.registry, landing.t, landing.locale);
    if (state) {
      state.status = status;
      render();
    }
  };
  tick();
  setInterval(tick, 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
}

function applyCatalog({ adminGroups, locales, hosts, services }) {
  state.adminGroups = adminGroups;
  state.locales = locales;
  state.allServices = services;
  state.hosts = hosts;
  state.services = visibleServices(services, state.identity.groups);
  state.isAdmin = isAdmin(state.identity, adminGroups);
  render();
}


let lastRoute = null;
let landing = null;
let landingStatus = null;

function render() {
  if (!state) return;
  const main = document.querySelector('#main');
  if (!main) return;
  const route = parseHash();
  let html;
  let active = route.name;
  if (state.catalogError) {
    html = `<div class="state" role="alert"><div class="state__title">${esc(state.t.catalogError)}</div>
      <div class="state__actions"><button class="btn btn-primary" data-action="retry">${esc(state.t.retry)}</button></div></div>`;
    main.innerHTML = html;
    main.querySelector('[data-action="retry"]')?.addEventListener('click', () =>
      loadCatalog().then(applyCatalog).catch(() => render()),
    );
    return;
  }
  if (!state.allServices.length) active = 'overview';
  switch (route.name) {
    case 'services': html = views.services(state); break;
    case 'status': html = views.status(state); break;
    case 'account': html = views.account(state); break;
    case 'admin': html = state.isAdmin ? views.admin(state) : views.forbidden(state); break;
    case 'detail': html = views.detail(state, route.id); active = 'services'; break;
    default: html = views.overview(state); active = 'overview';
  }
  const banner = state.offline ? `<div class="banner banner--warn" role="status">${esc(state.t.offline)}</div>` : '';
  main.innerHTML = banner + html;
  for (const node of document.querySelectorAll('[data-nav]')) {
    if (node.dataset.nav === active) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  }
  wireFilter();
  if (lastRoute && lastRoute !== location.hash) main.focus();
  lastRoute = location.hash;
}

function parseHash() {
  const path = location.hash.replace(/^#\/?/, '');
  if (path.startsWith('dienst/')) return { name: 'detail', id: decodeURIComponent(path.slice('dienst/'.length)) };
  const named = { '': 'overview', dienste: 'services', status: 'status', konto: 'account', admin: 'admin' };
  return { name: named[path] || 'overview' };
}

function wireFilter() {
  const input = document.querySelector('#service-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const tile of document.querySelectorAll('#services-body [data-tile]')) {
      const service = state.services.find((s) => s.id === tile.dataset.tile);
      const text = `${service?.name} ${localized(service?.description, state.locale)} ${service?.category}`.toLowerCase();
      const hit = !q || text.includes(q);
      tile.hidden = !hit;
      if (hit) shown += 1;
    }
    for (const section of document.querySelectorAll('#services-body .section')) {
      section.hidden = ![...section.querySelectorAll('[data-tile]')].some((t) => !t.hidden);
    }
    document.querySelector('#services-empty').hidden = shown > 0;
  });
}

function setOffline(value) {
  state.offline = value;
  render();
}

// ---------- command palette ----------

function installPalette() {
  const t = state.t;
  const palette = el(`<div class="fixed inset-0 z-50 items-start justify-center bg-black/60 pt-[12vh]" id="palette" hidden role="dialog" aria-modal="true" aria-label="${esc(t.searchPlaceholder)}">
    <div class="w-full max-w-xl overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-2xl">
      <input class="input input-lg w-full rounded-none border-0 border-b border-base-300" id="palette-input" type="text" autocomplete="off" placeholder="${esc(t.searchPlaceholder)}" aria-controls="palette-list" aria-expanded="true" role="combobox">
      <ul class="menu max-h-[50vh] w-full flex-nowrap overflow-y-auto p-2" id="palette-list" role="listbox"></ul>
    </div>
  </div>`);
  document.body.append(palette);
  const input = palette.querySelector('#palette-input');
  const list = palette.querySelector('#palette-list');
  let items = [];
  let cursor = 0;

  const close = () => {
    palette.hidden = true;
    input.value = '';
  };
  const open = () => {
    palette.hidden = false;
    input.focus();
    render_items('');
  };
  const render_items = (query) => {
    const q = query.trim().toLowerCase();
    const groups = { [t.cmdServices]: [], [t.cmdCategories]: [], [t.cmdActions]: [] };
    for (const s of state.services) {
      if (!q || `${s.name} ${localized(s.description, state.locale)} ${s.category}`.toLowerCase().includes(q))
        groups[t.cmdServices].push({ label: s.name, hint: s.category, run: () => go(`#/dienst/${s.id}`) });
    }
    for (const [cat, list] of categories(state.services)) {
      if (!q || cat.toLowerCase().includes(q))
        groups[t.cmdCategories].push({ label: cat, hint: String(list.length), run: () => go('#/dienste') });
    }
    for (const item of NAV.filter((n) => !n.admin || state.isAdmin)) {
      if (!q || t[item.key].toLowerCase().includes(q)) groups[t.cmdActions].push({ label: t[item.key], hint: t.cmdGoTo, run: () => go(item.hash) });
    }
    items = [];
    list.innerHTML = Object.entries(groups)
      .filter(([, list]) => list.length)
      .map(([group, entries]) => {
        const offset = items.length;
        items.push(...entries);
        return `<li class="px-3 pt-3 pb-1 text-xs uppercase tracking-wider opacity-50" role="presentation">${esc(group)}</li>` +
          entries
            .map((e, i) => `<li class="cursor-pointer rounded-lg px-3 py-2 aria-selected:bg-base-200" role="option" data-index="${offset + i}" aria-selected="${offset + i === 0}">${esc(e.label)}<small class="ml-auto opacity-50">${esc(e.hint || '')}</small></li>`)
            .join('');
      })
      .join('');
    cursor = 0;
  };
  const move = (delta) => {
    if (!items.length) return;
    cursor = (cursor + delta + items.length) % items.length;
    for (const node of list.querySelectorAll('.palette__item, [role="option"]'))
      node.setAttribute('aria-selected', String(Number(node.dataset.index) === cursor));
    list.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  const choose = () => {
    const item = items[cursor];
    if (!item) return;
    close();
    item.run();
  };

  input.addEventListener('input', () => render_items(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('click', (e) => {
    const node = e.target.closest('[role="option"]');
    if (node) { cursor = Number(node.dataset.index); choose(); }
  });
  palette.addEventListener('click', (e) => { if (e.target === palette) close(); });

  delegate(document, 'click', '[data-action="palette"]', () => open());
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? open() : close(); }
    else if (e.key === '/' && !/^(input|textarea)$/i.test(document.activeElement?.tagName) && palette.hidden) { e.preventDefault(); open(); }
  });
}

// The shell is rendered server-side and shipped in both states; signing in only reveals the parts that
// belong to it, so there is no second markup for the signed-in case.
function setAuthed(on) {
  for (const node of document.querySelectorAll('[data-auth]')) {
    node.hidden = (node.dataset.auth === 'in') !== on;
  }
  // The navigation rail belongs to the signed-in shell; a visitor must not get an empty one.
  document.getElementById('shell-drawer')?.classList.toggle('lg:drawer-open', on);
}
