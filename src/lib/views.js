// One view per route. Each returns markup built exclusively from daisyUI components; the app mounts it and
// delegates the few interactions. Views know the catalogue shape, never a service name.

import { esc } from './dom.js';
import { icon } from './icons.js';
import { categories, localized, serviceState, hostState, ROLE_KEY } from './api.js';

const SCOPE = { public: 'scopePublic', internal: 'scopeInternal', mesh: 'scopeMesh', isolated: 'scopeIsolated' };
const scopeBadge = (s, t) => `<span class="badge badge-ghost badge-sm">${esc(t[SCOPE[s.scope]] || t.scopeIsolated)}</span>`;

const stateLabel = (state, t) =>
  ({ up: t.online, down: t.offlineService, unknown: t.unknown, unmonitored: t.unmonitored })[state] || t.unknown;
// daisyUI's `status` component: a dot that carries meaning, always paired with its label.
const stateDot = (state, t) => {
  const label = stateLabel(state, t);
  const tone = state === 'up' ? 'status-success' : state === 'down' ? 'status-error' : 'status-neutral';
  return `<span class="status ${tone}" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span>`;
};
const roleLabel = (type, t) => t[ROLE_KEY[type]] || type;

function statusBadge(s, ctx) {
  const { state } = serviceState(s, ctx.status);
  if (state === 'unmonitored') return `<span class="badge badge-ghost badge-sm">${esc(ctx.t.unmonitored)}</span>`;
  // Before the first live read there is no state to show - a spinner is honest, "unknown" is not yet true.
  if (!ctx.status) return `<span class="loading loading-spinner loading-xs" role="status" aria-label="${esc(ctx.t.catalogLoading)}"></span>`;
  return `${stateDot(state, ctx.t)}<span class="text-xs opacity-60">${esc(stateLabel(state, ctx.t))}</span>`;
}

function tile(s, ctx) {
  const t = ctx.t;
  const fav = ctx.favorites.includes(s.id);
  const label = fav ? t.removeFavorite : t.addFavorite;
  return `<article class="card border border-base-300 bg-base-200" data-tile="${esc(s.id)}">
  <div class="card-body gap-3 p-4">
    <div class="flex items-start gap-2">
      <h3 class="card-title mr-auto text-base leading-tight">${esc(s.name)}</h3>
      <button class="btn btn-square btn-ghost btn-xs tooltip tooltip-bottom" data-tip="${esc(label)}"
        type="button" data-action="favorite" data-id="${esc(s.id)}" aria-pressed="${fav}" aria-label="${esc(label)}">${icon('star', { filled: fav, size: 'size-4' })}</button>
    </div>
    ${localized(s.description, ctx.locale) ? `<p class="text-sm opacity-70">${esc(localized(s.description, ctx.locale))}</p>` : ''}
    <div class="card-actions mt-auto flex-wrap items-center gap-2">
      ${scopeBadge(s, t)}
      ${s.admin?.length ? `<span class="badge badge-sm">${esc(t.navAdmin)}</span>` : ''}
      ${statusBadge(s, ctx)}
      <a class="btn btn-primary btn-sm ml-auto" href="${esc(s.url)}" target="_blank" rel="noreferrer"
        data-action="open" data-id="${esc(s.id)}">${esc(t.open)}</a>
    </div>
  </div>
</article>`;
}

const grid = (list, ctx) => `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${list.map((s) => tile(s, ctx)).join('')}</div>`;
// The loading state, declared once: the shell shows it before the catalogue arrives, the views show it
// before the first live read. It used to exist twice - here (dead, never called) and as a string literal in
// `app.js` - which is the kind of duplicate that drifts the day one of them gets a different height.
export const skeletonGrid = (count = 6) =>
  `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${Array.from({ length: count }, () => '<div class="skeleton h-36"></div>').join('')}</div>`;

const section = (title, count, body) =>
  `<section class="section mb-8"><div class="mb-3 flex items-baseline gap-3">
    <h2 class="text-lg font-semibold">${esc(title)}</h2>${count ? `<span class="text-sm opacity-50">${count}</span>` : ''}
  </div>${body}</section>`;

const head = (title, desc, actions = '') =>
  `<div class="mb-6 flex flex-wrap items-start gap-4"><div class="mr-auto">
    <h1 class="text-2xl font-semibold">${esc(title)}</h1>${desc ? `<p class="opacity-60">${esc(desc)}</p>` : ''}
  </div>${actions}</div>`;

const empty = (title, hint = '') =>
  `<div class="alert alert-soft"><div><h3 class="font-semibold">${esc(title)}</h3>${hint ? `<p class="text-sm opacity-70">${esc(hint)}</p>` : ''}</div></div>`;

const stat = (value, label) =>
  `<div class="stat place-items-center"><div class="stat-value text-2xl">${esc(String(value))}</div><div class="stat-title">${esc(label)}</div></div>`;

export function overview(ctx) {
  const t = ctx.t;
  const name = ctx.identity.name || ctx.identity.username;
  const favs = ctx.services.filter((s) => ctx.favorites.includes(s.id));
  const recent = ctx.recents.map((id) => ctx.services.find((s) => s.id === id)).filter(Boolean);
  const up = ctx.status ? ctx.services.filter((s) => serviceState(s, ctx.status).state === 'up').length : '–';
  return (
    head(`${t.userGreeting}, ${name}`, `${ctx.services.length} ${t.navServices}`) +
    `<div class="stats stats-vertical mb-8 border border-base-300 bg-base-200 sm:stats-horizontal">
      ${stat(ctx.services.length, t.navServices)}${stat(up, t.online)}${stat(favs.length, t.favorites)}${stat(ctx.hosts.length, t.statusNodes)}
    </div>` +
    (favs.length ? section(t.favorites, favs.length, grid(favs, ctx)) : section(t.favorites, 0, empty(t.noFavorites))) +
    (recent.length ? section(t.recent, recent.length, grid(recent, ctx)) : '') +
    categories(ctx.services).slice(0, 3).map(([cat, list]) => section(cat, list.length, grid(list, ctx))).join('')
  );
}

export function services(ctx) {
  const t = ctx.t;
  if (!ctx.services.length) return head(t.navServices, t.allServices) + empty(t.noServices, t.noServicesHint);
  const search = `<input class="input w-64" id="service-filter" type="search" autocomplete="off"
    placeholder="${esc(t.searchPlaceholder)}" aria-label="${esc(t.searchPlaceholder)}">`;
  // daisyUI `filter`: a radio group, which is what a single-choice filter actually is.
  const chips = `<div class="filter mb-4" role="radiogroup" aria-label="${esc(t.navCategories)}">
    <input class="btn btn-xs filter-reset" type="radio" name="category" value="" aria-label="${esc(t.allCategories)}" checked="">
    ${categories(ctx.services)
      .map(([cat, list]) => `<input class="btn btn-xs" type="radio" name="category" value="${esc(cat)}" aria-label="${esc(cat)} · ${list.length}">`)
      .join('')}
  </div>`;
  const body = categories(ctx.services)
    .map(([cat, list]) => section(cat, list.length, grid(list, ctx)))
    .join('');
  return (
    head(t.navServices, t.allServices, search) +
    chips +
    `<div id="services-body">${body}<div id="services-empty" hidden>${empty(t.noResults)}</div></div>`
  );
}

// Infrastructure only: the launcher, with scope and audience, is the Dienste view. Hosts come from the
// registry and their state from the live read.
export function status(ctx) {
  const t = ctx.t;
  const hosts = ctx.hosts || [];
  if (!hosts.length) return head(t.statusTitle, t.statusDesc) + empty(t.meshChecking);
  const monitored = hosts.filter((h) => h.monitored !== false).length;
  const meta = ctx.status ? ` · ${t.statusAsOf} ${new Date(ctx.status.asOf).toLocaleTimeString(ctx.locale)}` : '';
  return (
    head(t.statusTitle, `${t.statusDesc}${meta}`) +
    `<div class="stats stats-vertical mb-8 border border-base-300 bg-base-200 sm:stats-horizontal">
      ${stat(hosts.length, t.statusNodes)}${stat(monitored, t.online)}${stat(hosts.length - monitored, t.unmonitored)}
    </div>` +
    section(t.statusNodes, hosts.length, `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${hosts.map((host) => hostCard(host, ctx)).join('')}</div>`)
  );
}

export function hostCard(host, ctx) {
  const t = ctx.t;
  const state = hostState(host, ctx.status);
  const rows = [
    { label: t[host.zone === 'mesh' ? 'addrWan' : 'addrZone'], value: host.ipv4 || t.dhcp },
    { label: t.addrMesh, value: host.wireguardIpv4 || t.dhcp },
  ];
  const badges = [
    roleLabel(host.type, t),
    host.zone ? `${host.zone}${host.cidr ? ` · ${host.cidr}` : ''}` : null,
    host.relay ? t.capRelay : null,
    host.ingress ? t.capIngress : null,
  ].filter(Boolean);
  const services = host.services || [];
  const shown = services.slice(0, 6);
  const rest = services.slice(shown.length);
  return `<article class="card border border-base-300 bg-base-200">
  <div class="card-body gap-3 p-4">
    <div class="flex items-center gap-2">
      <h3 class="card-title mr-auto font-mono text-base">${esc(host.name)}</h3>
      ${state === 'unmonitored' ? `<span class="badge badge-ghost badge-sm">${esc(t.unmonitored)}</span>` : `${stateDot(state, t)}<span class="text-xs opacity-60">${esc(stateLabel(state, t))}</span>`}
    </div>
    <div class="flex flex-wrap gap-1">${badges.map((b) => `<span class="badge badge-ghost badge-sm">${esc(b)}</span>`).join('')}</div>
    <ul class="list">
      ${rows
        .map(
          (row) =>
            `<li class="list-row items-baseline gap-3 px-2 py-1"><span class="w-14 text-xs uppercase tracking-wider opacity-50">${esc(row.label)}</span><span class="font-mono text-sm opacity-80">${esc(row.value)}</span></li>`,
        )
        .join('')}
    </ul>
    ${
      services.length
        ? `<div class="flex flex-wrap gap-1">${shown.map((s) => `<span class="badge badge-sm">${esc(s)}</span>`).join('')}</div>${
            rest.length
              ? `<div class="collapse collapse-arrow rounded-box bg-base-100/50">
                   <input type="checkbox" />
                   <div class="collapse-title min-h-0 px-3 py-2 text-xs">+${rest.length} ${esc(t.navServices)}</div>
                   <div class="collapse-content px-3"><div class="flex flex-wrap gap-1 pb-2">${rest.map((s) => `<span class="badge badge-sm">${esc(s)}</span>`).join('')}</div></div>
                 </div>`
              : ''
          }`
        : ''
    }
  </div>
</article>`;
}

export function account(ctx) {
  const t = ctx.t;
  const i = ctx.identity;
  const groups = i.groups.length
    ? i.groups.map((g) => `<span class="badge badge-sm">${esc(g)}</span>`).join(' ')
    : `<span class="badge badge-ghost badge-sm">–</span>`;
  return (
    head(t.accountTitle, t.accountDesc) +
    `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div class="card border border-base-300 bg-base-200"><div class="card-body gap-3 p-4">
        <div class="flex items-center gap-3">
          <div class="avatar avatar-placeholder"><div class="w-10 rounded-full bg-primary text-primary-content"><span>${esc((i.name || i.username || 'U').charAt(0).toUpperCase())}</span></div></div>
          <div><h2 class="font-semibold">${esc(i.name || i.username)}</h2><p class="text-sm opacity-60">${esc(i.username)}</p></div>
        </div>
      </div></div>
      <div class="card border border-base-300 bg-base-200"><div class="card-body gap-3 p-4">
        <h2 class="font-semibold">${esc(t.accountGroups)}</h2><div class="flex flex-wrap gap-1">${groups}</div>
      </div></div>
      <div class="card border border-base-300 bg-base-200"><div class="card-body gap-3 p-4">
        <h2 class="font-semibold">${esc(t.accountSecurity)}</h2><p class="text-sm opacity-70">${esc(t.accountPasskeyHint)}</p>
        <div class="card-actions"><a class="btn btn-sm" href="${esc(ctx.accountUrl)}" target="_blank" rel="noreferrer">${esc(t.accountManage)}</a></div>
      </div></div>
    </div>`
  );
}

export function admin(ctx) {
  const t = ctx.t;
  const rows = ctx.allServices
    .map(
      (s) => `<tr><td class="font-medium">${esc(s.name)}</td><td><code class="text-xs opacity-70">${esc(s.id)}</code></td>
      <td>${(s.groups || []).map((g) => `<span class="badge badge-sm">${esc(g)}</span>`).join(' ') || `<span class="badge badge-ghost badge-sm">–</span>`}</td>
      <td><code class="text-xs opacity-70">${esc(s.scope)}</code></td></tr>`,
    )
    .join('');
  const adminServices = ctx.allServices.filter((s) => s.admin?.length);
  return (
    head(t.adminTitle, t.adminDesc) +
    section(
      t.adminMatrix,
      ctx.allServices.length,
      `<div class="overflow-x-auto rounded-box border border-base-300"><table class="table table-zebra"><thead><tr>
        <th>${esc(t.navServices)}</th><th>ID</th><th>${esc(t.serviceAudience)}</th><th>${esc(t.serviceScope)}</th>
      </tr></thead><tbody>${rows}</tbody></table></div>`,
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
  return `<nav class="breadcrumbs mb-4 text-sm"><ul><li><a href="#/dienste">${esc(t.navServices)}</a></li><li>${esc(s.name)}</li></ul></nav>
  <div class="mb-6 flex flex-wrap items-start gap-4"><div class="mr-auto">
    <h1 class="text-2xl font-semibold">${esc(s.name)}</h1>
    ${localized(s.description, ctx.locale) ? `<p class="opacity-70">${esc(localized(s.description, ctx.locale))}</p>` : ''}
  </div>
  <div class="flex items-center gap-2">
    <button class="btn btn-square btn-ghost btn-sm tooltip tooltip-bottom" data-tip="${esc(label)}" type="button" data-action="favorite" data-id="${esc(s.id)}" aria-pressed="${fav}" aria-label="${esc(label)}">${icon('star', { filled: fav })}</button>
    <a class="btn btn-primary btn-sm" href="${esc(s.url)}" target="_blank" rel="noreferrer" data-action="open" data-id="${esc(s.id)}">${esc(t.open)}</a>
  </div></div>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <div class="card border border-base-300 bg-base-200"><div class="card-body gap-2 p-4">
      <h2 class="text-sm uppercase tracking-wider opacity-50">${esc(t.serviceAudience)}</h2>
      <div class="flex flex-wrap gap-1">${(s.groups || []).map((g) => `<span class="badge badge-sm">${esc(g)}</span>`).join(' ') || `<span class="badge badge-ghost badge-sm">–</span>`}</div>
    </div></div>
    <div class="card border border-base-300 bg-base-200"><div class="card-body gap-2 p-4">
      <h2 class="text-sm uppercase tracking-wider opacity-50">${esc(t.serviceScope)}</h2>
      <div class="flex flex-wrap items-center gap-2">${scopeBadge(s, t)}${statusBadge(s, ctx)}</div>
    </div></div>
    <div class="card border border-base-300 bg-base-200"><div class="card-body gap-2 p-4">
      <h2 class="text-sm uppercase tracking-wider opacity-50">${esc(t.category)}</h2>
      <div><span class="badge badge-sm">${esc(s.category)}</span></div>
    </div></div>
  </div>`;
}
