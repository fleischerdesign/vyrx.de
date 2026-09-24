// One view per route. Each returns markup built exclusively from daisyUI components; the app mounts it and
// delegates the few interactions. Views know the catalogue shape, never a service name.

import { esc } from './dom.ts';
import { icon } from './icons.ts';
import { categories, localized, serviceState, hostState, ROLE_KEY } from './api.ts';
import { pathFor } from './routes.ts';
import type { AppState, Host, HostType, HostView, Messages, Scope, Service, ServiceState } from './contract.ts';

const SCOPE: Readonly<Record<Scope, string>> = {
  public: 'scopePublic',
  internal: 'scopeInternal',
  mesh: 'scopeMesh',
  isolated: 'scopeIsolated',
};
const scopeBadge = (s: Service, t: Messages) => `<span class="badge badge-ghost badge-sm">${esc(t[SCOPE[s.scope]] || t.scopeIsolated)}</span>`;

const stateLabel = (state: ServiceState, t: Messages): string =>
  ({ up: t.online, down: t.offlineService, unknown: t.unknown, unmonitored: t.unmonitored })[state] || t.unknown;
// daisyUI's `status` component: a dot that carries meaning, always paired with its label.
const stateDot = (state: ServiceState, t: Messages) => {
  const label = stateLabel(state, t);
  const tone = state === 'up' ? 'status-success' : state === 'down' ? 'status-error' : 'status-neutral';
  return `<span class="status ${tone}" role="img" aria-label="${esc(label)}" title="${esc(label)}"></span>`;
};
// The inventory's vocabulary is optional: a host without a role renders no badge instead of the marker for
// a missing translation, which is what `t[ROLE_KEY[undefined]]` used to produce.
const roleLabel = (type: HostType | undefined, t: Messages): string => (type ? t[ROLE_KEY[type]] || type : '');

// Every view takes the same option: whether a browser is going to answer the live questions. Without a
// browser, "unknown" is a state and can be said; a spinner would be a promise nobody keeps - and a star
// button that cannot be pressed is worse than no star. So the option is not decoration, it is the
// difference between a file and a page.
interface RenderOptions {
  /** `false` renders the file: no control that needs a script, no question left to the browser. */
  readonly interactive?: boolean;
}

function statusBadge(s: Service, ctx: AppState, interactive: boolean) {
  const { state } = serviceState(s, ctx.status);
  if (state === 'unmonitored') return `<span class="badge badge-ghost badge-sm">${esc(ctx.t.unmonitored)}</span>`;
  // Before the first live read there is no state to show. A spinner is honest while the browser is about to
  // answer; where nothing is going to answer, "unknown" is the truth.
  if (!ctx.status && interactive) return `<span class="loading loading-spinner loading-xs" role="status" aria-label="${esc(ctx.t.catalogLoading)}"></span>`;
  if (!ctx.status) return `${stateDot('unknown', ctx.t)}<span class="text-xs opacity-60">${esc(ctx.t.unknown)}</span>`;
  return `${stateDot(state, ctx.t)}<span class="text-xs opacity-60">${esc(stateLabel(state, ctx.t))}</span>`;
}

const favoriteButton = (s: Service, ctx: AppState): string => {
  const t = ctx.t;
  const fav = ctx.favorites.includes(s.id);
  const label = fav ? t.removeFavorite : t.addFavorite;
  return `<button class="btn btn-square btn-ghost btn-xs tooltip tooltip-bottom" data-tip="${esc(label)}"
        type="button" data-action="favorite" data-id="${esc(s.id)}" aria-pressed="${fav}" aria-label="${esc(label)}">${icon('star', { filled: fav, size: 'size-4' })}</button>`;
};

function tile(s: Service, ctx: AppState, interactive: boolean) {
  const t = ctx.t;
  return `<article class="card border border-base-300 bg-base-200" data-tile="${esc(s.id)}">
  <div class="card-body gap-3 p-4">
    <div class="flex items-start gap-2">
      <h3 class="card-title mr-auto text-base leading-tight">
        <a class="link link-hover" href="${pathFor(ctx.locale, 'detail', s.id)}">${esc(s.name)}</a>
      </h3>
      ${interactive ? favoriteButton(s, ctx) : ''}
    </div>
    ${localized(s.description, ctx.locale) ? `<p class="text-sm opacity-70">${esc(localized(s.description, ctx.locale))}</p>` : ''}
    <div class="card-actions mt-auto flex-wrap items-center gap-2">
      ${scopeBadge(s, t)}
      ${s.admin?.length ? `<span class="badge badge-sm">${esc(t.navAdmin)}</span>` : ''}
      ${statusBadge(s, ctx, interactive)}
      <a class="btn btn-primary btn-sm ml-auto" href="${esc(s.url)}" target="_blank" rel="noreferrer"
        data-action="open" data-id="${esc(s.id)}">${esc(t.open)}</a>
    </div>
  </div>
</article>`;
}

const grid = (list: readonly Service[], ctx: AppState, interactive: boolean) =>
  `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${list.map((s) => tile(s, ctx, interactive)).join('')}</div>`;
// The loading state, declared once: the shell shows it before the catalogue arrives, the views show it
// before the first live read. It used to exist twice - here (dead, never called) and as a string literal in
// `app.ts` - which is the kind of duplicate that drifts the day one of them gets a different height.
export const skeletonGrid = (count = 6): string =>
  `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${Array.from({ length: count }, () => '<div class="skeleton h-36"></div>').join('')}</div>`;

const section = (title: string, count: number, body: string) =>
  `<section class="section mb-8"><div class="mb-3 flex items-baseline gap-3">
    <h2 class="text-lg font-semibold">${esc(title)}</h2>${count ? `<span class="text-sm opacity-50">${count}</span>` : ''}
  </div>${body}</section>`;

const head = (title: string, desc: string, actions = '') =>
  `<div class="mb-6 flex flex-wrap items-start gap-4"><div class="mr-auto">
    <h1 class="text-2xl font-semibold">${esc(title)}</h1>${desc ? `<p class="opacity-60">${esc(desc)}</p>` : ''}
  </div>${actions}</div>`;

const empty = (title: string, hint = '') =>
  `<div class="alert alert-soft"><div><h3 class="font-semibold">${esc(title)}</h3>${hint ? `<p class="text-sm opacity-70">${esc(hint)}</p>` : ''}</div></div>`;

const stat = (value: number | string, label: string) =>
  `<div class="stat place-items-center"><div class="stat-value text-2xl">${esc(String(value))}</div><div class="stat-title">${esc(label)}</div></div>`;

export function overview(ctx: AppState, { interactive = true }: RenderOptions = {}): string {
  const t = ctx.t;
  const name = ctx.identity.name || ctx.identity.username;
  const favs = ctx.services.filter((s) => ctx.favorites.includes(s.id));
  const recent = ctx.recents
    .map((id) => ctx.services.find((service) => service.id === id))
    .filter((service): service is Service => service !== undefined);
  const up = ctx.status ? ctx.services.filter((s) => serviceState(s, ctx.status).state === 'up').length : '–';
  return (
    head(`${t.userGreeting}, ${name}`, `${ctx.services.length} ${t.navServices}`) +
    `<div class="stats stats-vertical mb-8 border border-base-300 bg-base-200 sm:stats-horizontal">
      ${stat(ctx.services.length, t.navServices)}${stat(up, t.online)}${stat(favs.length, t.favorites)}${stat(ctx.hosts.length, t.statusNodes)}
    </div>` +
    (favs.length ? section(t.favorites, favs.length, grid(favs, ctx, interactive)) : section(t.favorites, 0, empty(t.noFavorites))) +
    (recent.length ? section(t.recent, recent.length, grid(recent, ctx, interactive)) : '') +
    categories(ctx.services).slice(0, 3).map(([cat, list]) => section(cat, list.length, grid(list, ctx, interactive))).join('')
  );
}

export function services(ctx: AppState, { interactive = true }: RenderOptions = {}): string {
  const t = ctx.t;
  if (!ctx.services.length) return head(t.navServices, t.allServices) + empty(t.noServices, t.noServicesHint);
  // A search box that filters nothing is a lie about the file, so the file renders it disabled - and the
  // browser, which is the thing that can wire it, removes the attribute when it renders its own view.
  const search = `<input class="input w-64" id="service-filter" type="search" autocomplete="off"${interactive ? '' : ' disabled'}
    placeholder="${esc(t.searchPlaceholder)}" aria-label="${esc(t.searchPlaceholder)}">`;
  // daisyUI `filter`: a radio group, which is what a single-choice filter actually is.
  const chips = `<div class="filter mb-4" role="radiogroup" aria-label="${esc(t.navCategories)}">
    <input class="btn btn-xs filter-reset" type="radio" name="category" value="" aria-label="${esc(t.allCategories)}" checked="">
    ${categories(ctx.services)
      .map(([cat, list]) => `<input class="btn btn-xs" type="radio" name="category" value="${esc(cat)}" aria-label="${esc(cat)} · ${list.length}">`)
      .join('')}
  </div>`;
  const body = categories(ctx.services)
    .map(([cat, list]) => section(cat, list.length, grid(list, ctx, interactive)))
    .join('');
  return (
    head(t.navServices, t.allServices, search) +
    chips +
    `<div id="services-body">${body}<div id="services-empty" hidden>${empty(t.noResults)}</div></div>`
  );
}

// Infrastructure only: the launcher, with scope and audience, is the Dienste view. Hosts come from the
// registry and their state from the live read.
export function status(ctx: AppState): string {
  const t = ctx.t;
  const hosts = ctx.hosts || [];
  if (!hosts.length) return head(t.statusTitle, t.statusDesc) + empty(t.meshChecking);
  const monitored = hosts.filter((h) => h.monitored !== false).length;
  // The middle figure was the count of *monitored* hosts under the label "online", so a host that was down
  // counted as online. The three figures are three different things now: nodes, up, not monitored.
  const up = ctx.status ? hosts.filter((h) => hostState(h, ctx.status).state === 'up').length : '–';
  const meta = ctx.status ? ` · ${t.statusAsOf} ${new Date(ctx.status.asOf).toLocaleTimeString(ctx.locale)}` : '';
  return (
    head(t.statusTitle, `${t.statusDesc}${meta}`) +
    `<div class="stats stats-vertical mb-8 border border-base-300 bg-base-200 sm:stats-horizontal">
      ${stat(hosts.length, t.statusNodes)}${stat(up, t.online)}${stat(hosts.length - monitored, t.unmonitored)}
    </div>` +
    section(t.statusNodes, hosts.length, `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">${hosts.map((host) => hostCard(host, ctx)).join('')}</div>`)
  );
}

export function hostCard(host: Host, ctx: HostView): string {
  const t = ctx.t;
  const { state } = hostState(host, ctx.status);
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

export function account(ctx: AppState): string {
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

export function admin(ctx: AppState, { interactive = true }: RenderOptions = {}): string {
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
    (adminServices.length ? section(t.adminSecurity, adminServices.length, grid(adminServices, ctx, interactive)) : '')
  );
}

export function forbidden(ctx: AppState): string {
  return head(ctx.t.forbidden, '') + empty(ctx.t.adminOnly);
}

/**
 * What stands in a view when the build had no catalogue: the honest state, not an empty one.
 *
 * A build without the catalogue is a build that cannot say what the portal offers - and an empty grid would
 * look like a portal that offers nothing. The browser never uses this: it fetches the catalogue itself and
 * replaces the whole view as soon as it has it.
 */
export function catalogueAbsent(t: Messages): string {
  return head(t.catalogueAbsentTitle, '') + empty(t.catalogueAbsentHint);
}

/**
 * The two views that are *about* the reader (Konto, Verwaltung) cannot be rendered by a file: they need an
 * identity, and a prerendered page has none. An empty area would be a state nobody designed, and "not
 * signed in" would be a claim the file cannot make - so it says what is true of the file: this view is
 * built in the browser, and without scripts what remains is what belongs to everyone.
 */
export function needsBrowser(t: Messages): string {
  return head(t.needsBrowserTitle, '') + empty(t.noscriptHint);
}

export function detail(ctx: AppState, id: string, { interactive = true }: RenderOptions = {}): string {
  const t = ctx.t;
  // A service the viewer cannot see stays "not found": the portal does not confirm what it does not show.
  const s = ctx.services.find((x) => x.id === id);
  if (!s) return head(t.notFound, '') + empty(t.notFound);
  const fav = ctx.favorites.includes(s.id);
  const label = fav ? t.removeFavorite : t.addFavorite;
  return `<nav class="breadcrumbs mb-4 text-sm"><ul><li><a href="${pathFor(ctx.locale, 'services')}">${esc(t.navServices)}</a></li><li>${esc(s.name)}</li></ul></nav>
  <div class="mb-6 flex flex-wrap items-start gap-4"><div class="mr-auto">
    <h1 class="text-2xl font-semibold">${esc(s.name)}</h1>
    ${localized(s.description, ctx.locale) ? `<p class="opacity-70">${esc(localized(s.description, ctx.locale))}</p>` : ''}
  </div>
  <div class="flex items-center gap-2">
    ${interactive ? `<button class="btn btn-square btn-ghost btn-sm tooltip tooltip-bottom" data-tip="${esc(label)}" type="button" data-action="favorite" data-id="${esc(s.id)}" aria-pressed="${fav}" aria-label="${esc(label)}">${icon('star', { filled: fav })}</button>` : ''}
    <a class="btn btn-primary btn-sm" href="${esc(s.url)}" target="_blank" rel="noreferrer" data-action="open" data-id="${esc(s.id)}">${esc(t.open)}</a>
  </div></div>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <div class="card border border-base-300 bg-base-200"><div class="card-body gap-2 p-4">
      <h2 class="text-sm uppercase tracking-wider opacity-50">${esc(t.serviceAudience)}</h2>
      <div class="flex flex-wrap gap-1">${(s.groups || []).map((g) => `<span class="badge badge-sm">${esc(g)}</span>`).join(' ') || `<span class="badge badge-ghost badge-sm">–</span>`}</div>
    </div></div>
    <div class="card border border-base-300 bg-base-200"><div class="card-body gap-2 p-4">
      <h2 class="text-sm uppercase tracking-wider opacity-50">${esc(t.serviceScope)}</h2>
      <div class="flex flex-wrap items-center gap-2">${scopeBadge(s, t)}${statusBadge(s, ctx, interactive)}</div>
    </div></div>
    <div class="card border border-base-300 bg-base-200"><div class="card-body gap-2 p-4">
      <h2 class="text-sm uppercase tracking-wider opacity-50">${esc(t.category)}</h2>
      <div><span class="badge badge-sm">${esc(s.category)}</span></div>
    </div></div>
  </div>`;
}
