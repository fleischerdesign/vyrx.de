// The addresses, declared once.
//
// Until now the portal had no address of its own. A view was a fragment (`#/dienste`), the shell built its
// links from a second table, the head carried one canonical for the whole site, and the client parsed the
// fragment again. All four are the same fact - which views exist, what they are called in each language
// and what they say about themselves - so it lives here, once.
//
// It declares *addresses*, never a service name. The one dynamic case is the catalogue's own selection,
// and it carries an id the catalogue gave us.
//
// Why the selection is a query and not a path: `/services/<id>` becomes a prerendered file with S5, and
// that needs the catalogue as a *build input*, which does not exist yet (`02-feature-backlog.md`, S5).
// Until then, the honest address that exists is the catalogue page with a selection attached - and it is
// the same address in both languages, shareable, and gone the day the file exists. A fragment would not
// be an address (E-0006).

import type { RouteName } from './contract.ts';
import type { IconName } from './icons.ts';
import type { Locale } from '../i18n/index.ts';

/** A view with an address. `segment` is empty for the start page. */
export interface Route {
  readonly name: Exclude<RouteName, 'detail'>;
  /** The address segment, the same in both languages - a path is an identifier, not copy (E-0006). */
  readonly segment: string;
  /** The translation key for the label and the document title. */
  readonly key: string;
  /** The translation key for the document description; absent means the site's own sentence. */
  readonly descKey?: string;
  readonly icon: IconName;
  /** Only an administrator sees this view in the navigation. */
  readonly admin?: boolean;
}

export const ROUTES: readonly Route[] = [
  { name: 'overview', segment: '', key: 'navOverview', icon: 'home' },
  { name: 'services', segment: 'services', key: 'navServices', descKey: 'allServices', icon: 'layout-list' },
  { name: 'status', segment: 'status', key: 'navStatus', descKey: 'statusDesc', icon: 'activity' },
  { name: 'account', segment: 'account', key: 'navAccount', descKey: 'accountDesc', icon: 'settings' },
  { name: 'admin', segment: 'admin', key: 'adminTitle', descKey: 'adminDesc', icon: 'shield', admin: true },
];

/** The languages the routing serves, in the order the head lists them. German is the default (E-0006). */
export const LOCALES: readonly Locale[] = ['de', 'en'];

export const routeFor = (name: RouteName): Route | undefined => ROUTES.find((route) => route.name === name);

/** The language prefix. The default language writes none - `astro.config.mjs`, `prefixDefaultLocale`. */
const prefix = (locale: Locale): string => (locale === 'en' ? '/en' : '');

/**
 * The address of a view in a language. Directory form, with the trailing slash Astro's build writes and the
 * server answers in one step - and the same punctuation the site already publishes for the start page in
 * both languages (`hreflang`, `canonical`). A canonical address that needs a redirect is not canonical.
 */
export function pathFor(locale: Locale, name: RouteName, id?: string): string {
  if (name === 'detail') return selectedPathFor(locale, id ?? '');
  const route = routeFor(name);
  if (!route || route.segment === '') return `${prefix(locale)}/`;
  return `${prefix(locale)}/${route.segment}/`;
}

/** The catalogue page with one service selected. */
export const selectedPathFor = (locale: Locale, id: string): string =>
  `${pathFor(locale, 'services')}?service=${encodeURIComponent(id)}`;

/** The selected service, as the catalogue page reads it out of its own query. */
export const selectedFrom = (search: string): string | null => new URLSearchParams(search).get('service');

/**
 * Which language and which view an address asks for. The client derives it from the address alone - the
 * browser knows nothing else - and it derives it through this table, so the two sides cannot disagree
 * about what an address means. A path no view claims answers with the start page's name; a page that has
 * no view (a miss) never asks.
 */
export function routeFrom(pathname: string, search = ''): { locale: Locale; route: Route['name']; selected: string | null } {
  const english = pathname === '/en' || pathname.startsWith('/en/');
  const rest = (english ? pathname.slice(3) : pathname).replace(/^\/+|\/+$/g, '');
  const match = ROUTES.find((route) => route.segment === rest);
  return { locale: english ? 'en' : 'de', route: match?.name ?? 'overview', selected: selectedFrom(search) };
}
