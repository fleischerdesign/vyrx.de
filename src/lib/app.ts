// The portal shell: one router, one navigation, one command palette, one place that talks to the data
// layer. Views are pure renderers, so adding a view is a route entry plus a function in views.ts.

import { esc, el, delegate, toast } from './dom.ts';
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
} from './api.ts';
import * as views from './views.ts';
// The navigation is declared once, in `lib/nav.ts` - which derives it from the route table, so an entry
// cannot name an address the routing does not serve.
import { NAV } from './nav.ts';
import { pathFor, selectedPathFor } from './routes.ts';
import type { Route } from './routes.ts';
import type { AppState, Catalog, Messages, StatusSnapshot } from './contract.ts';
import type { Locale } from '../i18n/index.ts';

/** What the layout hands the app: the translations, the language, the page and the two ways out. */
export interface BootOptions {
  readonly messages: Messages;
  readonly locale: Locale;
  /** The view this page is; the routing decided it, the client does not decide it again. */
  readonly route: Route['name'];
  /** The service the catalogue page has selected, if the address carried one. */
  readonly selected: string | null;
  readonly accountUrl: string;
}

// Navigation is navigation: a link is an address and the browser is good at addresses. The portal used to
// keep a router of its own over the fragment, which meant an address nobody else could read, a second
// place that knew the routes, and a page that only worked once the script had run.
const navigate = (path: string): void => location.assign(path);

// The language switch leads to the same view in the other language. Its address is rendered by the server
// from the route table; the selection lives in a query, and a prerendered file cannot know which query it
// was opened with - so the browser, which does know, hands it to the switch.
function carrySelection(selected: string | null): void {
  if (!selected) return;
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-locale-switch]')) {
    const target = link.dataset.localeSwitch as Locale | undefined;
    if (target) link.href = selectedPathFor(target, selected);
  }
}

// The application state lives exactly once, and it is handed to the views as a whole: a view that reaches
// for anything else is reaching past its contract. It is `undefined` until the identity answers, which is
// the state the shell renders as a visitor's page.
let state: AppState | undefined;

/** The page this document is: the view and, for the catalogue, the selection it was opened with. */
let page: { route: Route['name']; selected: string | null } | undefined;

export async function boot({ messages, locale, route, selected, accountUrl }: BootOptions): Promise<void> {
  const main = document.getElementById('main');
  if (!main) return;
  page = { route, selected };
  carrySelection(selected);

  // The registry is public and is read first: the landing shows the fleet to everyone, and the same
  // answer feeds the signed-in app, so there is one fetch and one truth.
  const registry: Catalog | null = await loadCatalog().catch(() => null);
  if (registry) renderLandingHosts(registry, messages, locale);
  // Live state belongs to the pages that show it. The account page shows none of it, so polling there
  // would be a request every twenty seconds for nothing.
  const showsLiveState = route !== 'account';
  if (showsLiveState) startStatusPolling();

  const identity = await loadIdentity();
  // A reader without an identity already has the view in front of them: the build rendered it, and it is
  // what belongs to everyone. There is nothing to replace and nothing to claim.
  if (!identity) return;

  // The shell is already in the document in both states; signing in reveals its signed-in chrome.
  setAuthed(true);
  for (const node of document.querySelectorAll('[data-field="username"]')) node.textContent = identity.name || identity.username;
  for (const node of document.querySelectorAll('[data-field="initial"]')) node.textContent = (identity.name || identity.username || 'U').charAt(0).toUpperCase();
  // The catalogue is one fetch away; skeletons are honest, the landing behind the app chrome is not.
  // The shape of a skeleton is a view concern, so it comes from the views and is not spelled out here.
  // The shell is already in the document; the first line of `boot` is what proves it.
  document.getElementById('main')!.innerHTML = views.skeletonGrid(6);

  state = {
    t: messages,
    locale,
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

  installPalette(state);
  window.addEventListener('online', () => setOffline(false));
  window.addEventListener('offline', () => setOffline(true));
  delegate(document, 'click', '[data-action="favorite"]', (e, node) => {
    e.preventDefault();
    const id = node.dataset.id;
    if (!id || !state) return;
    state.favorites = toggleFavorite(state.identity.username, id);
    toast(state.favorites.includes(id) ? state.t.addFavorite : state.t.removeFavorite);
    render();
  });
  delegate(document, 'click', '[data-action="open"]', (_e, node) => {
    const id = node.dataset.id;
    if (id && state) pushRecent(state.identity.username, id);
  });

  if (registry) applyCatalog(registry);
  else {
    state.catalogError = true;
    render();
  }
}

// The fleet cards on the public landing: the same renderer as the Status view, so the two cannot look or
// read differently.
function renderLandingHosts(registry: Catalog, t: Messages, locale: Locale): void {
  const grid = document.getElementById('hosts-grid');
  if (!grid) return;
  landing = { registry, t, locale };
  grid.innerHTML = (registry.hosts || []).map((host) => views.hostCard(host, { t, locale, status: landingStatus })).join('');
}

// Status is live, not baked: one request to the same-origin route, refreshed while the tab is visible.
// A failed read leaves the previous answer in place and the page keeps working - the state model already
// distinguishes "no answer" from "down".
function startStatusPolling(): void {
  const tick = async (): Promise<void> => {
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

function applyCatalog({ adminGroups, locales: catalogueLocales, hosts, services }: Catalog): void {
  if (!state) return;
  state.adminGroups = adminGroups;
  // The catalogue announces its languages; nothing reads them yet, so the field is carried, not used.
  state.locales = catalogueLocales;
  state.allServices = services;
  state.hosts = hosts;
  state.services = visibleServices(services, state.identity.groups);
  state.isAdmin = isAdmin(state.identity, adminGroups);
  render();
}


let landing: { registry: Catalog; t: Messages; locale: Locale } | null = null;
let landingStatus: StatusSnapshot | null = null;

// One place decides what the page shows, and it decides from the page's own declaration - not from an
// address it parses again. The selection is the catalogue's, so it belongs to the catalogue view.
function viewFor(source: AppState): string {
  if (!page) return views.overview(source);
  if (page.route === 'services' && page.selected) return views.detail(source, page.selected);
  switch (page.route) {
    case 'services': return views.services(source);
    case 'status': return views.status(source);
    case 'account': return views.account(source);
    case 'admin': return source.isAdmin ? views.admin(source) : views.forbidden(source);
    default: return views.overview(source);
  }
}

function render(): void {
  if (!state) return;
  const main = document.querySelector<HTMLElement>('#main');
  if (!main) return;
  if (state.catalogError) {
    main.innerHTML = `<div class="state" role="alert"><div class="state__title">${esc(state.t.catalogError)}</div>
      <div class="state__actions"><button class="btn btn-primary" data-action="retry">${esc(state.t.retry)}</button></div></div>`;
    main.querySelector('[data-action="retry"]')?.addEventListener('click', () =>
      loadCatalog().then(applyCatalog).catch(() => render()),
    );
    return;
  }
  const banner = state.offline ? `<div class="banner banner--warn" role="status">${esc(state.t.offline)}</div>` : '';
  main.innerHTML = banner + viewFor(state);
  wireFilter();
}

function wireFilter(): void {
  const app = state;
  if (!app) return;
  const input = document.querySelector<HTMLInputElement>('#service-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const tile of document.querySelectorAll<HTMLElement>('#services-body [data-tile]')) {
      const service = app.services.find((s) => s.id === tile.dataset.tile);
      const text = `${service?.name} ${localized(service?.description, app.locale)} ${service?.category}`.toLowerCase();
      const hit = !q || text.includes(q);
      tile.hidden = !hit;
      if (hit) shown += 1;
    }
    for (const section of document.querySelectorAll<HTMLElement>('#services-body .section')) {
      section.hidden = ![...section.querySelectorAll<HTMLElement>('[data-tile]')].some((tile) => !tile.hidden);
    }
    document.querySelector<HTMLElement>('#services-empty')!.hidden = shown > 0;
    // The radios and the search box are two spellings of one filter. Without this, the chip stays
    // selected after typing and claims a filter that no longer applies - the same defect as a
    // checkbox whose state outlives its breakpoint.
    for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="category"]')) {
      radio.checked = radio.value === input.value.trim();
    }
  });
  // The category filter is a radio group (daisyUI `filter`); a change drives the same text filter.
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="category"]')) {
    radio.addEventListener('change', () => {
      input.value = radio.value;
      input.dispatchEvent(new Event('input'));
    });
  }
}

function setOffline(value: boolean): void {
  if (!state) return;
  state.offline = value;
  render();
}

// ---------- command palette ----------

function installPalette(app: AppState): void {
  const t = app.t;
  const palette = el<HTMLDialogElement>(`<dialog class="modal" id="palette" aria-label="${esc(t.searchPlaceholder)}">
    <div class="modal-box max-w-xl overflow-hidden p-0">
      <input class="input input-lg w-full rounded-none border-0 border-b border-base-300" id="palette-input" type="text" autocomplete="off" placeholder="${esc(t.searchPlaceholder)}" aria-controls="palette-list" aria-expanded="true" role="combobox">
      <ul class="menu max-h-[50vh] w-full flex-nowrap overflow-y-auto p-2" id="palette-list" role="listbox"></ul>
    </div>
    <form method="dialog" class="modal-backdrop"><button>${esc(t.back)}</button></form>
  </dialog>`);
  document.body.append(palette);
  const input = palette.querySelector<HTMLInputElement>('#palette-input')!;
  const list = palette.querySelector<HTMLElement>('#palette-list')!;
  /** What the palette offers: a label, a hint and the step to take. The list is rebuilt per keystroke. */
  interface Entry {
    label: string;
    hint?: string;
    run: () => void;
  }
  let items: Entry[] = [];
  let cursor = 0;

  const close = (): void => {
    palette.close();
    input.value = '';
  };
  const open = (): void => {
    palette.showModal();
    input.focus();
    render_items('');
  };
  const render_items = (query: string): void => {
    const q = query.trim().toLowerCase();
    const groups: Record<string, Entry[]> = { [t.cmdServices]: [], [t.cmdCategories]: [], [t.cmdActions]: [] };
    for (const service of app.services) {
      if (!q || `${service.name} ${localized(service.description, app.locale)} ${service.category}`.toLowerCase().includes(q))
        groups[t.cmdServices]!.push({
          label: service.name,
          hint: service.category,
          run: () => navigate(selectedPathFor(app.locale, service.id)),
        });
    }
    for (const [category, entries] of categories(app.services)) {
      if (!q || category.toLowerCase().includes(q))
        groups[t.cmdCategories]!.push({
          label: category,
          hint: String(entries.length),
          run: () => navigate(pathFor(app.locale, 'services')),
        });
    }
    for (const item of NAV.filter((entry) => !entry.admin || app.isAdmin)) {
      if (!q || t[item.key].toLowerCase().includes(q))
        groups[t.cmdActions]!.push({ label: t[item.key], hint: t.cmdGoTo, run: () => navigate(pathFor(app.locale, item.name)) });
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
  const move = (delta: number): void => {
    if (!items.length) return;
    cursor = (cursor + delta + items.length) % items.length;
    for (const node of list.querySelectorAll<HTMLElement>('.palette__item, [role="option"]'))
      node.setAttribute('aria-selected', String(Number(node.dataset.index) === cursor));
    list.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  const choose = (): void => {
    const item = items[cursor];
    if (!item) return;
    close();
    item.run();
  };

  input.addEventListener('input', () => render_items(input.value));
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const node = e.target.closest<HTMLElement>('[role="option"]');
    if (node) { cursor = Number(node.dataset.index); choose(); }
  });
  delegate(document, 'click', '[data-action="palette"]', () => open());
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? close() : open(); }
    else if (e.key === '/' && !/^(input|textarea)$/i.test(document.activeElement?.tagName ?? '') && !palette.open) { e.preventDefault(); open(); }
  });
}

// The shell is rendered server-side and shipped in both states; signing in only reveals the parts that
// belong to it, so there is no second markup for the signed-in case.
function setAuthed(on: boolean): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-auth]')) {
    node.hidden = (node.dataset.auth === 'in') !== on;
  }
  // The navigation rail belongs to the signed-in shell; a visitor must not get an empty one.
  document.getElementById('shell-drawer')?.classList.toggle('lg:drawer-open', on);
}
