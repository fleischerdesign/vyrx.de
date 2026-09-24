// The navigation, declared once.
//
// It used to exist twice: as a table in the shell (for the drawer and the dock) and as a second table in
// `app.ts` (for the command palette), with the same five entries, the same order and the same glyphs
// kept in step by hand. The icons in the second copy were never even rendered - the shell renders them.
//
// `name` is the route name `parseHash()` answers with (`RouteName`), `key` the translation key, `icon` a
// name from `lib/icons.ts` - and because `IconName` is derived from the icon declaration, a typo here is
// a compile error rather than an empty square.

import type { RouteName } from './contract.ts';
import type { IconName } from './icons.ts';

export interface NavItem {
  /** The address for the hash router, until S1 makes these paths. */
  readonly hash: string;
  readonly name: RouteName;
  /** The translation key, not a label: the label is the reader's language's business. */
  readonly key: string;
  readonly icon: IconName;
  /** Entries only an administrator sees. */
  readonly admin?: boolean;
}

export const NAV: readonly NavItem[] = [
  { hash: '#/', name: 'overview', key: 'navOverview', icon: 'home' },
  { hash: '#/dienste', name: 'services', key: 'navServices', icon: 'layout-list' },
  { hash: '#/status', name: 'status', key: 'navStatus', icon: 'activity' },
  { hash: '#/konto', name: 'account', key: 'navAccount', icon: 'settings' },
  { hash: '#/admin', name: 'admin', key: 'navAdmin', icon: 'shield', admin: true },
];

// What the bottom dock carries: the same entries without the one that is only reachable as an
// administrator.
export const PRIMARY_NAV: readonly NavItem[] = NAV.filter((item) => !item.admin);
