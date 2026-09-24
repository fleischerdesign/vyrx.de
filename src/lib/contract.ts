// The shapes, written down.
//
// Until now they existed only as code and comment (`01-ist-analyse.md` §3.5): every reader reconstructed
// the catalogue from the places that used it, and a field meant whatever the first reader assumed. This
// file is that reconstruction, once.
//
// It sits on the portal's side of the layering in `04-integrationen.md` §11.3. It declares *shape* and
// never a value: no service name, no address, no port. The contract itself lives in `nixfiles`, the
// catalogue is a projection of it and arrives as `/portal.json`, the collector answers Prometheus.
//
// Two rules keep it honest:
//
//   * A field is declared when the portal reads it. The catalogue carries more than that - `icon` is one -
//     and a declared field without a reader is a finding for I-3, not a reason to list it here.
//   * Nothing here decides. `scope` is rendered, never computed; `monitored: false` is a decision taken
//     elsewhere and repeated, not made.

import type { Locale } from '../i18n/index.ts';

// ---------------------------------------------------------------------------------------------------
// What arrives from outside
// ---------------------------------------------------------------------------------------------------

/** Copy that ships in both languages, or a single string when it reads the same everywhere. */
export type Copy = string | Partial<Record<Locale, string>> | undefined;

/** Visibility as the contract declares it. The portal shows it; it never picks it. */
export type Scope = 'public' | 'internal' | 'mesh' | 'isolated';

/** The role an inventory entry carries, as the inventory names it. The portal renders a label per role. */
export type HostType = 'server' | 'workstation' | 'client' | 'embedded';

/**
 * A service, as far as the portal is concerned. `groups` empty or absent means everybody may use it;
 * `admin` names the groups that may act on it; `monitored: false` is a decision that nothing measures it.
 */
export interface Service {
  readonly id: string;
  readonly name: string;
  readonly description?: Copy;
  /** Absent means the category "Services" - the catalogue decides, the view only renders. */
  readonly category?: string;
  readonly scope: Scope;
  readonly url: string;
  readonly groups?: readonly string[];
  readonly admin?: readonly string[];
  readonly monitored?: boolean;
}

/**
 * A host. `zone` stays a string: the contract declares the zones, and the portal only treats `mesh`
 * differently, so anything else renders as itself instead of being guessed into a known set.
 */
export interface Host {
  readonly name: string;
  readonly type?: HostType;
  readonly zone?: string;
  readonly cidr?: string;
  readonly ipv4?: string;
  readonly wireguardIpv4?: string;
  readonly relay?: boolean;
  readonly ingress?: boolean;
  readonly services?: readonly string[];
  readonly monitored?: boolean;
}

/** The catalogue: what `nixfiles` derives from the contracts and the portal reads. */
export interface Catalog {
  readonly adminGroups: readonly string[];
  readonly locales: readonly string[];
  readonly hosts: readonly Host[];
  readonly services: readonly Service[];
}

/** The identity the reverse proxy forwards. The browser never holds a token, only these three values. */
export interface Identity {
  readonly username: string;
  readonly name: string;
  readonly groups: readonly string[];
}

/** Four states, and "no answer" is one of them instead of a fifth guess. */
export type ServiceState = 'up' | 'down' | 'unknown' | 'unmonitored';

/** A state and, when there is one, the moment it was measured. `unmonitored` and `unknown` come without
 * a time on purpose: nothing measured them, and a timestamp would claim otherwise. */
export interface Live {
  readonly state: ServiceState;
  readonly asOf?: number;
}

/** What the views draw from: the same shape for a service and for a host, so a dot renders twice, not twice as code. */
export interface StatusSnapshot {
  readonly asOf: number;
  readonly services: ReadonlyMap<string, Live>;
  readonly hosts: ReadonlyMap<string, Live>;
}

/** One series as Prometheus answers it. The value travels as a string pair `[seconds, "1"]`. */
export interface PrometheusSeries {
  readonly metric: Readonly<Record<string, string>>;
  readonly value?: readonly [number | string, string];
}

/** The collector's answer, unprojected - `/api/status` and `/api/hosts` both return this. */
export interface PrometheusVector {
  readonly status: string;
  readonly data?: {
    readonly resultType: string;
    readonly result: readonly PrometheusSeries[];
  };
}

// ---------------------------------------------------------------------------------------------------
// What the portal holds, and the seam between shell and views
// ---------------------------------------------------------------------------------------------------

/** The translation table after `useTranslations`: every key answers, a missing one with its own name. */
export type Messages = Readonly<Record<string, string>>;

/** The routes, named once: the navigation, the parser and the views all speak these words. */
export type RouteName = 'overview' | 'services' | 'status' | 'account' | 'admin' | 'detail';

/** A route is either a view or a service page. The union is what makes `route.id` unreadable elsewhere. */
export type Route = { readonly name: Exclude<RouteName, 'detail'> } | { readonly name: 'detail'; readonly id: string };

/**
 * What a view is handed. A view knows the catalogue shape, the viewer and the live read - never a
 * service name and never an address. The mutable fields are the ones the shell updates in place
 * (favourites, the catalogue, the live read); the rest is read-only for the view.
 */
export interface AppState {
  readonly t: Messages;
  readonly locale: Locale;
  readonly loginUrl: string;
  readonly accountUrl: string;
  readonly identity: Identity;
  services: readonly Service[];
  allServices: readonly Service[];
  hosts: readonly Host[];
  adminGroups: readonly string[];
  favorites: readonly string[];
  recents: readonly string[];
  isAdmin: boolean;
  offline: boolean;
  /** The languages the catalogue announces. Carried from the contract, read by nothing yet (I-3). */
  locales?: readonly string[];
  status?: StatusSnapshot;
  catalogError?: boolean;
}

/** The subset a host card needs: the landing draws hosts before there is an identity to speak of. */
export interface HostView {
  readonly t: Messages;
  readonly locale: Locale;
  readonly status?: StatusSnapshot | null;
}
