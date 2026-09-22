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

let app;
let state;

export async function boot({ messages, locale, mesh, loginUrl, accountUrl }) {
  app = document.getElementById('app');
  if (!app) return;

  const identity = await loadIdentity();
  if (!identity) {
    document.getElementById('landing')?.removeAttribute('hidden');
    return;
  }
  document.getElementById('landing')?.setAttribute('hidden', '');

  state = {
    t: messages,
    locale,
    mesh,
    loginUrl,
    accountUrl,
    identity,
    services: [],
    allServices: [],
    adminGroups: [],
    favorites: favorites(identity.username),
    recents: recents(identity.username),
    isAdmin: false,
    offline: !navigator.onLine,
  };

  app.dataset.ready = '';
  app.innerHTML = shell();
  installPalette();
  window.addEventListener('hashchange', render);
  window.addEventListener('online', () => setOffline(false));
  window.addEventListener('offline', () => setOffline(true));
  delegate(app, 'click', '[data-action="favorite"]', (e, node) => {
    e.preventDefault();
    state.favorites = toggleFavorite(state.identity.username, node.dataset.id);
    toast(state.favorites.includes(node.dataset.id) ? state.t.addFavorite : state.t.removeFavorite);
    render();
  });
  delegate(app, 'click', '[data-action="open"]', (_e, node) => pushRecent(state.identity.username, node.dataset.id));

  render(); // shell first, so the user sees navigation immediately
  await loadCatalog().then(applyCatalog).catch((error) => {
    console.error(error);
    state.catalogError = true;
    render();
  });
  startStatusPolling();
}

// Status is live, not baked: one request to the same-origin route, refreshed while the tab is visible.
// A failed read leaves the previous answer in place and the page keeps working - the state model already
// distinguishes "no answer" from "down".
function startStatusPolling() {
  const tick = async () => {
    if (document.visibilityState !== 'visible') return;
    const status = await loadStatus();
    if (!status) return;
    state.status = status;
    render();
  };
  tick();
  setInterval(tick, 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
}

function applyCatalog({ adminGroups, services }) {
  state.adminGroups = adminGroups;
  state.allServices = services;
  state.services = visibleServices(services, state.identity.groups);
  state.isAdmin = isAdmin(state.identity, adminGroups);
  render();
}

function shell() {
  const t = state.t;
  const nav = (items, mobile = false) =>
    items
      .map(
        (item) =>
          `<a class="nav-item" href="${item.hash}" data-nav="${item.name}"><span aria-hidden="true">${item.icon}</span><span>${esc(
            t[item.key],
          )}</span></a>`,
      )
      .join('');
  const primary = NAV.filter((n) => !n.admin || state.isAdmin);
  const cats = categories(state.services)
    .map(([cat, list]) => `<a class="nav-item" href="#/dienste" data-category="${esc(cat)}">${esc(cat)}<span class="nav-item__count">${list.length}</span></a>`)
    .join('');
  const initials = esc((state.identity.name || state.identity.username || 'U').charAt(0).toUpperCase());
  return `
    <header class="app__topbar">
      <a class="app__brand" href="#/">VYRX<span>.</span></a>
      <button class="app__search" type="button" data-action="palette" aria-haspopup="dialog">
        <span aria-hidden="true">⌕</span><span>${esc(t.searchPlaceholder)}</span><span class="kbd" style="margin-left:auto">⌘K</span>
      </button>
      <div class="app__topbar-right">
        <span class="avatar" role="img" aria-label="${esc(state.identity.name || state.identity.username)}">${initials}</span>
      </div>
    </header>
    <aside class="app__sidebar">
      <nav class="app__nav" aria-label="${esc(t.navOverview)}">${nav(primary)}</nav>
      ${cats ? `<div><div class="app__nav-label">${esc(t.navCategories)}</div><div class="app__nav">${cats}</div></div>` : ''}
    </aside>
    <main class="app__main" id="main" tabindex="-1"></main>
    <nav class="app__bottomnav" aria-label="${esc(t.navOverview)}">${nav(primary).replaceAll('class="nav-item"', 'class="nav-item"')}</nav>`;
}

let lastRoute = null;

function render() {
  if (!state) return;
  const main = app.querySelector('#main');
  if (!main) return;
  const route = parseHash();
  let html;
  let active = route.name;
  if (state.catalogError) {
    html = `<div class="state" role="alert"><div class="state__title">${esc(state.t.catalogError)}</div>
      <div class="state__actions"><button class="btn btn--primary" data-action="retry">${esc(state.t.retry)}</button></div></div>`;
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
  for (const node of app.querySelectorAll('[data-nav]')) {
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
  const input = app.querySelector('#service-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const tile of app.querySelectorAll('#services-body [data-tile]')) {
      const service = state.services.find((s) => s.id === tile.dataset.tile);
      const text = `${service?.name} ${localized(service?.description, state.locale)} ${service?.category}`.toLowerCase();
      const hit = !q || text.includes(q);
      tile.hidden = !hit;
      if (hit) shown += 1;
    }
    for (const section of app.querySelectorAll('#services-body .section')) {
      section.hidden = ![...section.querySelectorAll('[data-tile]')].some((t) => !t.hidden);
    }
    app.querySelector('#services-empty').hidden = shown > 0;
  });
}

function setOffline(value) {
  state.offline = value;
  render();
}

// ---------- command palette ----------

function installPalette() {
  const t = state.t;
  const palette = el(`<div class="palette" id="palette" hidden role="dialog" aria-modal="true" aria-label="${esc(t.searchPlaceholder)}">
    <div class="palette__box">
      <input class="palette__input" id="palette-input" type="text" autocomplete="off" placeholder="${esc(t.searchPlaceholder)}" aria-controls="palette-list" aria-expanded="true" role="combobox">
      <ul class="palette__list" id="palette-list" role="listbox"></ul>
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
        return `<li class="palette__group" role="presentation">${esc(group)}</li>` +
          entries
            .map((e, i) => `<li class="palette__item" role="option" data-index="${offset + i}" aria-selected="${offset + i === 0}">${esc(e.label)}<small>${esc(e.hint || '')}</small></li>`)
            .join('');
      })
      .join('');
    cursor = 0;
  };
  const move = (delta) => {
    if (!items.length) return;
    cursor = (cursor + delta + items.length) % items.length;
    for (const node of list.querySelectorAll('.palette__item'))
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
    const node = e.target.closest('.palette__item');
    if (node) { cursor = Number(node.dataset.index); choose(); }
  });
  palette.addEventListener('click', (e) => { if (e.target === palette) close(); });

  delegate(app, 'click', '[data-action="palette"]', () => open());
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? open() : close(); }
    else if (e.key === '/' && !/^(input|textarea)$/i.test(document.activeElement?.tagName) && palette.hidden) { e.preventDefault(); open(); }
  });
}
