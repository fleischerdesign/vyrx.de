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
  | 'overview'
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
  /**
   * Ob die Adresse **ohne Anmeldung** erreichbar ist.
   *
   * Das ist keine Geschmacksfrage, sondern die Grenze zwischen App und Ingress:
   * ein öffentlicher Pfad läuft dort an der Anmeldung vorbei und trägt deshalb
   * **keine** Identitätskopfzeilen. Also darf eine öffentliche Seite keine
   * Identität lesen - und eine Seite, die Identität liest, darf nicht öffentlich
   * sein. `scripts/verify-access.mjs` prüft beides und leitet daraus die Liste
   * ab, die der Ingress ausnehmen muss.
   */
  readonly public: boolean;
}
const ROUTES: Readonly<Record<Exclude<RouteName, 'notFound'>, RouteDefinition>> = {
  // Die öffentliche Landing - redaktionell, ohne Identität, als Datei gebaut.
  start: { segment: '', public: true },
  project: { segment: 'project', public: true },
  help: { segment: 'help', public: true },
  // Der Einstieg in den Workspace: eine eigene, geschützte Adresse. Früher lag
  // er auf `/`, das gleichzeitig öffentlich war - deshalb kam dort nie eine
  // Identität an und die Übersicht war unerreichbar.
  overview: { segment: 'overview', public: false },
  services: { segment: 'services', public: false },
  service: { segment: 'services', param: 'id', public: false },
  // Wissen ist heute intern: kein Artikel trägt `visibility: public`. Wird einer
  // öffentlich, muss diese Zeile mit (der Ingress folgt ihr, geprüft im Bau).
  knowledge: { segment: 'knowledge', public: false },
  article: { segment: 'knowledge', param: 'slug', public: false },
  status: { segment: 'status', public: false },
  account: { segment: 'account', public: false },
  admin: { segment: 'admin', public: false },
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

/** Die Segmente der öffentlichen Routen (ohne Startseite und ohne Detailrouten). */
export const PUBLIC_ROUTE_SEGMENTS: readonly string[] = (
  Object.entries(ROUTES) as [RouteName, RouteDefinition][]
)
  .filter(([, definition]) => definition.public && !definition.param && definition.segment !== '')
  .map(([, definition]) => definition.segment);

/**
 * Die öffentlichen Adressen, als Muster für den Ingress.
 *
 * Sie entstehen aus der Routentabelle und dem, was in `public/` liegt - nicht
 * aus einer zweiten Liste. Was hier steht, muss der Ingress ausnehmen; was der
 * Ingress ausnimmt, muss hier stehen. Die Prüfung dazu liegt in der Flotte
 * (`checks/vyrx-portal.nix`), weil sie beides sieht.
 */
export function publicPathPatterns(staticFiles: readonly string[] = []): readonly string[] {
  const patterns = new Set<string>(['/']);

  for (const locale of LOCALES) {
    const prefix = locale === 'en' ? '/en' : '';
    // Die Sprachwurzel selbst: `/en`, `/en/` - aber ausdrücklich nicht `/en/*`.
    if (prefix) {
      patterns.add(prefix);
      patterns.add(`${prefix}/`);
    }
    for (const [, definition] of Object.entries(ROUTES) as [RouteName, RouteDefinition][]) {
      if (!definition.public || definition.param || definition.segment === '') continue;
      patterns.add(`${prefix}/${definition.segment}`);
      patterns.add(`${prefix}/${definition.segment}/`);
      patterns.add(`${prefix}/${definition.segment}/*`);
    }
  }

  // Gebaute Dateien und alles, was aus `public/` mitkommt - Dateien sind öffentlich.
  patterns.add('/_astro/*');
  for (const file of staticFiles) patterns.add(`/${file}`);

  return [...patterns].sort();
}
