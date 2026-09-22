// The navigation, declared once.
//
// It used to exist twice: as a table in the shell (for the drawer and the dock) and as a second table in
// `app.js` (for the command palette), with the same five entries, the same order and the same glyphs
// kept in step by hand. The icons in the second copy were never even rendered - the shell renders them.
//
// `name` is the route name `parseHash()` answers with, `key` the translation key, `icon` a name from
// `lib/icons.js`.

export const NAV = [
  { hash: '#/', name: 'overview', key: 'navOverview', icon: 'home' },
  { hash: '#/dienste', name: 'services', key: 'navServices', icon: 'layout-list' },
  { hash: '#/status', name: 'status', key: 'navStatus', icon: 'activity' },
  { hash: '#/konto', name: 'account', key: 'navAccount', icon: 'settings' },
  { hash: '#/admin', name: 'admin', key: 'navAdmin', icon: 'shield', admin: true },
];

// What the bottom dock carries: the same entries without the one that is only reachable as an
// administrator.
export const PRIMARY_NAV = NAV.filter((item) => !item.admin);
