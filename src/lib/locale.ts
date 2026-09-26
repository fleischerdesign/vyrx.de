/*
 * Eine Sprache, ein Bezeichner, eine Adresse.
 *
 * Pfade sind englische Bezeichner und wechseln nie mit der Sprache; nur die
 * Beschriftung übersetzt sich. Deutsch steht präfixlos, Englisch unter `/en/`.
 * Diese Datei ist die einzige Stelle, die eine Adresse zusammensetzt - die
 * Navigation, der Kopf und der Sprachwechsel lesen hier.
 */

export type Locale = 'de' | 'en';

export const LOCALES: readonly Locale[] = ['de', 'en'];
export const DEFAULT_LOCALE: Locale = 'de';

/** Jede Ansicht mit eigener Adresse. `params` füllt die dynamischen Fälle. */
export type RouteName =
  | 'start'
  | 'project'
  | 'help'
  | 'services'
  | 'service'
  | 'knowledge'
  | 'article'
  | 'status'
  | 'account'
  | 'admin'
  | 'notFound';

interface RouteDefinition {
  readonly segment: string;
  /** Ein Segment, das der Adresse angehängt wird (`:id`, `:slug`). */
  readonly param?: string;
}

const ROUTES: Readonly<Record<Exclude<RouteName, 'notFound'>, RouteDefinition>> = {
  start: { segment: '' },
  project: { segment: 'project' },
  help: { segment: 'help' },
  services: { segment: 'services' },
  service: { segment: 'services', param: 'id' },
  knowledge: { segment: 'knowledge' },
  article: { segment: 'knowledge', param: 'slug' },
  status: { segment: 'status' },
  account: { segment: 'account' },
  admin: { segment: 'admin' },
};

const prefix = (locale: Locale): string => (locale === 'en' ? '/en' : '');

/*
 * Manche Segmente tragen zwei Ansichten: die Liste und ein Detail darunter
 * (`/services/` und `/services/<id>/`). Diese Übersetzung entsteht aus der
 * Tabelle, damit Adresse und Ansicht nicht an zwei Stellen entschieden werden.
 */
type StaticRouteName = Exclude<RouteName, 'notFound'>;
const SEGMENT_INDEX = new Map<string, { list: StaticRouteName; detail?: StaticRouteName }>();
for (const [name, definition] of Object.entries(ROUTES) as [StaticRouteName, RouteDefinition][]) {
  const entry = SEGMENT_INDEX.get(definition.segment) ?? { list: name };
  if (definition.param) entry.detail = name;
  else entry.list = name;
  SEGMENT_INDEX.set(definition.segment, entry);
}

/** Die Adresse einer Ansicht in einer Sprache, mit abschließendem Schrägstrich. */
export function pathFor(locale: Locale, name: RouteName, param?: string): string {
  if (name === 'notFound') return `${prefix(locale)}/404/`;
  const definition = ROUTES[name];
  if (definition.segment === '') return `${prefix(locale)}/`;
  const tail = definition.param && param ? `/${encodeURIComponent(param)}` : '';
  return `${prefix(locale)}/${definition.segment}${tail}/`;
}

/** Die Adresse derselben Ansicht in der anderen Sprache. */
export function switchLocale(locale: Locale, pathname: string): string {
  const target: Locale = locale === 'de' ? 'en' : 'de';
  const { name, param } = routeFrom(pathname);
  return pathFor(target, name, param ?? undefined);
}

/** Welche Ansicht eine Adresse meint. Der Browser liest dieselbe Tabelle. */
export function routeFrom(pathname: string): { locale: Locale; name: RouteName; param: string | null } {
  const english = pathname === '/en' || pathname.startsWith('/en/');
  const locale: Locale = english ? 'en' : 'de';
  const rest = (english ? pathname.slice(3) : pathname).replace(/^\/+|\/+$/g, '');
  if (rest === '') return { locale, name: 'start', param: null };

  const [segment = '', tail = null] = rest.split('/');
  const entry = SEGMENT_INDEX.get(segment);
  if (!entry) return { locale, name: 'notFound', param: null };
  if (tail && entry.detail) return { locale, name: entry.detail, param: decodeURIComponent(tail) };
  return { locale, name: entry.list, param: null };
}

/** Wo die Anmeldung beginnt; sie kehrt zur angefragten Adresse zurück. */
export const LOGIN_PATH = '/outpost.goauthentik.io/start';

export function loginPathFor(pathname: string): string {
  return `${LOGIN_PATH}?rd=${encodeURIComponent(pathname)}`;
}

/** Der Katalog der authentisierten Identität, außerhalb dieser App verwaltet. */
export const ACCOUNT_URL = 'https://auth.vyrx.de/if/user/';
