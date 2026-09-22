// One view per route. Each returns HTML; the app mounts it and delegates the few interactions. Views know
// the catalogue shape, never a service name.

import { esc } from './dom.js';
import { categories, localized, serviceState, hostState } from './api.js';

const SCOPE = { public: 'scopePublic', internal: 'scopeInternal', mesh: 'scopeMesh', isolated: 'scopeIsolated' };
const scopeBadge = (s, t) => `<span class="badge badge--scope">${esc(t[SCOPE[s.scope]] || t.scopeIsolated)}</span>`;

const stateLabel = (state, t) =>
  ({ up: t.online, down: t.offlineService, unknown: t.unknown, unmonitored: t.unmonitored })[state] || t.unknown;
const stateClass = (state) => (state === 'up' ? 'ok' : state === 'down' ? 'off' : 'unknown');

// Four states, never two: a service that is not probed says so, and a missing answer is `unknown` -
// rendering it as `down` would be a different lie than rendering a constant as `up`.
function statusBadge(s, ctx) {
  const { state } = serviceState(s, ctx.status);
  if (state === 'unmonitored') return `<span class="badge">${esc(ctx.t.unmonitored)}</span>`;
  const label = stateLabel(state, ctx.t);
  return `<span class="status-dot status-dot--${stateClass(state)}" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span><span class="tile__status">${esc(label)}</span>`;
}

function tile(s, ctx) {
  const t = ctx.t;
  const fav = ctx.favorites.includes(s.id);
  const label = fav ? t.removeFavorite : t.addFavorite;
  return `<article class="tile" data-tile="${esc(s.id)}">
    <div class="tile__top">
      <div class="tile__icon" aria-hidden="true">${esc((s.name || '?').charAt(0))}</div>
      <div class="tile__title">${esc(s.name)}</div>
      <div class="tile__actions">
        <button class="icon-btn" type="button" data-action="favorite" data-id="${esc(s.id)}"
          aria-pressed="${fav}" aria-label="${esc(label)}" title="${esc(label)}">★</button>
      </div>
    </div>
    ${localized(s.description, ctx.locale) ? `<p class="tile__desc">${esc(localized(s.description, ctx.locale))}</p>` : ''}
    <div class="tile__foot">
      ${scopeBadge(s, t)}
      ${statusBadge(s, ctx)}
      ${s.admin?.length ? `<span class="badge">${esc(t.navAdmin)}</span>` : ''}
      <span class="tile__url">${esc((s.url || '').replace('https://', ''))}</span>
      <a class="btn" href="${esc(s.url)}" target="_blank" rel="noreferrer" data-action="open" data-id="${esc(s.id)}">${esc(t.open)}</a>
    </div>
  </article>`;
}

const grid = (list, ctx) => `<div class="grid">${list.map((s) => tile(s, ctx)).join('')}</div>`;

const section = (title, count, body) =>
  `<section class="section"><div class="section__head"><h3>${esc(title)}</h3>${count ? `<span>${count}</span>` : ''}</div>${body}</section>`;

const head = (title, desc, actions = '') =>
  `<div class="view-head"><div><h2>${esc(title)}</h2>${desc ? `<p>${esc(desc)}</p>` : ''}</div>${actions ? `<div class="view-head__actions">${actions}</div>` : ''}</div>`;

const empty = (title, hint = '') =>
  `<div class="state"><div class="state__title">${esc(title)}</div>${hint ? `<div>${esc(hint)}</div>` : ''}</div>`;

export function overview(ctx) {
  const t = ctx.t;
  const name = ctx.identity.name || ctx.identity.username;
  const favs = ctx.services.filter((s) => ctx.favorites.includes(s.id));
  const recent = ctx.recents.map((id) => ctx.services.find((s) => s.id === id)).filter(Boolean);
  const top = categories(ctx.services).slice(0, 3);
  return (
    head(`${t.userGreeting}, ${name}`, `${ctx.services.length} ${t.navServices}`) +
    (favs.length
      ? section(t.favorites, favs.length, grid(favs, ctx))
      : section(t.favorites, 0, empty(t.noFavorites))) +
    (recent.length ? section(t.recent, recent.length, grid(recent, ctx)) : '') +
    top.map(([cat, list]) => section(cat, list.length, grid(list, ctx))).join('')
  );
}

export function services(ctx) {
  const t = ctx.t;
  if (!ctx.services.length) return head(t.navServices, t.allServices) + empty(t.noServices, t.noServicesHint);
  const filter = `<input class="input" id="service-filter" type="search" autocomplete="off"
    placeholder="${esc(t.searchPlaceholder)}" aria-label="${esc(t.searchPlaceholder)}">`;
  const body = categories(ctx.services)
    .map(([cat, list]) => section(cat, list.length, grid(list, ctx)))
    .join('');
  return (
    head(t.navServices, t.allServices, filter) +
    `<div id="services-body">${body}<div class="state" id="services-empty" hidden><div class="state__title">${esc(t.noResults)}</div></div></div>`
  );
}

export function status(ctx) {
  const t = ctx.t;
  const nodes = ctx.mesh?.nodes || [];
  if (!nodes.length) return head(t.statusTitle, t.statusDesc) + empty(t.meshChecking);
  const meta = ctx.status ? ` · ${t.statusAsOf} ${new Date(ctx.status.asOf).toLocaleTimeString(ctx.locale)}` : '';
  const nodeGrid = `<div class="grid">${nodes
    .map(
      (n) => {
        const label = stateLabel(hostState(n.name, ctx.status), t);
        return `<article class="tile">
      <div class="tile__top"><div class="tile__icon" aria-hidden="true">${esc(n.name.charAt(0))}</div>
        <div class="tile__title">${esc(n.name)}</div>
        <span class="status-dot status-dot--${stateClass(hostState(n.name, ctx.status))}" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span></div>
      ${n.role ? `<p class="tile__desc">${esc((n.role || {})[ctx.locale] || (n.role || {}).de || '')}</p>` : ''}
      <div class="tile__foot" style="flex-wrap:wrap">
        <span class="badge">${esc(n.zone)}</span>
        ${n.wireguardIp ? `<span class="tile__url">${esc(n.wireguardIp)}</span>` : ''}
      </div>
      ${(n.services || []).length ? `<div class="tile__foot" style="flex-wrap:wrap">${n.services.map((s) => `<span class="badge">${esc(s)}</span>`).join('')}</div>` : ''}
    </article>`;
      },
    )
    .join('')}</div>`;
  // Infrastructure only: the service launcher, with its scope and audience, is the Dienste view. A
  // second grid of the same tiles here was duplication, not information.
  return head(t.statusTitle, `${t.statusDesc}${meta}`) + section(t.statusNodes, nodes.length, nodeGrid);
}

export function account(ctx) {
  const t = ctx.t;
  const i = ctx.identity;
  const groups = i.groups.length
    ? i.groups.map((g) => `<span class="badge">${esc(g)}</span>`).join(' ')
    : `<span class="badge">–</span>`;
  return (
    head(t.accountTitle, t.accountDesc) +
    `<div class="grid">
      <article class="tile"><div class="tile__top"><div class="avatar" aria-hidden="true">${esc((i.name || i.username || 'U').charAt(0).toUpperCase())}</div>
        <div class="tile__title">${esc(i.name || i.username)}</div></div>
        <p class="tile__desc">${esc(i.username)}</p></article>
      <article class="tile"><div class="tile__title">${esc(t.accountGroups)}</div>
        <div class="tile__foot" style="flex-wrap:wrap">${groups}</div></article>
      <article class="tile"><div class="tile__title">${esc(t.accountSecurity)}</div>
        <p class="tile__desc">${esc(t.accountPasskeyHint)}</p>
        <div class="tile__foot"><a class="btn" href="${esc(ctx.accountUrl)}" target="_blank" rel="noreferrer">${esc(t.accountManage)}</a></div></article>
    </div>`
  );
}

export function admin(ctx) {
  const t = ctx.t;
  const rows = ctx.allServices
    .map(
      (s) => `<tr><td>${esc(s.name)}</td><td><code>${esc(s.id)}</code></td>
      <td>${(s.groups || []).map((g) => `<span class="badge">${esc(g)}</span>`).join(' ') || `<span class="badge">–</span>`}</td>
      <td><code>${esc(s.scope)}</code></td></tr>`,
    )
    .join('');
  const adminServices = ctx.allServices.filter((s) => s.admin?.length);
  return (
    head(t.adminTitle, t.adminDesc) +
    section(
      t.adminMatrix,
      ctx.allServices.length,
      `<table class="matrix"><thead><tr><th>${esc(t.navServices)}</th><th>ID</th><th>${esc(t.serviceAudience)}</th><th>${esc(t.serviceScope)}</th></tr></thead><tbody>${rows}</tbody></table>`,
    ) +
    (adminServices.length ? section(t.adminSecurity, adminServices.length, grid(adminServices, ctx)) : '')
  );
}

export function forbidden(ctx) {
  return head(ctx.t.forbidden) + empty(ctx.t.adminOnly);
}

export function detail(ctx, id) {
  const t = ctx.t;
  const s = ctx.services.find((x) => x.id === id);
  if (!s) return head(t.notFound) + empty(t.notFound);
  const fav = ctx.favorites.includes(s.id);
  const label = fav ? t.removeFavorite : t.addFavorite;
  return `<nav class="breadcrumb"><a href="#/dienste">${esc(t.navServices)}</a><span>/</span><span>${esc(s.name)}</span></nav>
    <div class="view-head"><div><h2>${esc(s.name)}</h2><p>${esc(localized(s.description, ctx.locale))}</p></div>
      <div class="view-head__actions">
        <button class="icon-btn" type="button" data-action="favorite" data-id="${esc(s.id)}" aria-pressed="${fav}" aria-label="${esc(label)}" title="${esc(label)}">★</button>
        <a class="btn btn--primary" href="${esc(s.url)}" target="_blank" rel="noreferrer" data-action="open" data-id="${esc(s.id)}">${esc(t.open)}</a>
      </div></div>
    <div class="grid">
      <article class="tile"><div class="tile__title">${esc(t.serviceAudience)}</div>
        <div class="tile__foot" style="flex-wrap:wrap">${(s.groups || []).map((g) => `<span class="badge">${esc(g)}</span>`).join(' ') || `<span class="badge">–</span>`}</div></article>
      <article class="tile"><div class="tile__title">${esc(t.serviceScope)}</div>
        <div class="tile__foot">${scopeBadge(s, t)}<span class="tile__url">${esc(s.url.replace('https://', ''))}</span></div></article>
      <article class="tile"><div class="tile__title">${esc(t.category)}</div>
        <div class="tile__foot"><span class="badge">${esc(s.category)}</span></div></article>
    </div>`;
}
