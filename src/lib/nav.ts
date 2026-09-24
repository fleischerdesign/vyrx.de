// The navigation, declared once.
//
// It used to exist twice: as a table in the shell (for the drawer and the dock) and as a second table in
// `app.ts` (for the command palette), with the same five entries, the same order and the same glyphs kept
// in step by hand. The icons in the second copy were never even rendered - the shell renders them.
//
// Order is the only thing this file decides beyond the route table: what the drawer carries, and what the
// bottom dock carries. Addresses and labels come from `routes.ts`; a nav entry that named its own address
// would be the beginning of the second table again.

import { ROUTES } from './routes.ts';
import type { Route } from './routes.ts';

/** What the drawer carries: every view the viewer may open, in reading order, start page first. */
export const NAV: readonly Route[] = ROUTES;

// What the bottom dock carries: at most five entries, and never a view that is only reachable as an
// administrator. A visitor who is not one should not see the entry and be refused by it.
export const PRIMARY_NAV: readonly Route[] = ROUTES.filter((route) => !route.admin);
