// The catalogue as a *build input*, and the view of it that belongs to everyone.
//
// Until now the portal read the catalogue only in the browser (from `/portal.json`), which is why a
// prerendered view could not show anything: at build time there was nothing to show, so every view was an
// empty area that a script had to fill. This module is the other half - the file is read once, while the
// site is built.
//
// It is also what S5 needs: one page per service means knowing the services at build time.
//
// Where it comes from: `PORTAL_CATALOGUE` (a path) or `./portal.json` in the working directory - the file
// the deployment already generates. Absent means absent: the build then renders the honest "no catalogue"
// state rather than an empty catalogue that would look like a real one with nothing in it.
//
// This module imports `node:fs`, so it belongs to the server side. The browser never reads the catalogue
// through it - the browser fetches `/portal.json`, which is the same file, served.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { visibleServices } from './api.ts';
import type { AppState, Catalog, Messages } from './contract.ts';
import type { Locale } from '../i18n/index.ts';

const source = (): string => process.env.PORTAL_CATALOGUE ?? resolve(process.cwd(), 'portal.json');

/** The catalogue of this build, or `null` when the build was not given one. */
export function readCatalogue(): Catalog | null {
  try {
    const data = JSON.parse(readFileSync(source(), 'utf8')) as Partial<Catalog>;
    return {
      adminGroups: data.adminGroups ?? [],
      locales: data.locales ?? [],
      hosts: data.hosts ?? [],
      services: data.services ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * The catalogue as seen by a reader we know nothing about: no identity, no favourites, no live read.
 *
 * `visibleServices(services, [])` is the same function the browser uses, asked with no groups - so the two
 * sides cannot disagree about what "everyone" means: a service with a group requirement is not in here,
 * and the browser adds it for the viewers whose groups include it.
 */
export function viewForEveryone(input: {
  readonly t: Messages;
  readonly locale: Locale;
  readonly accountUrl: string;
  readonly catalogue: Catalog;
}): AppState {
  const { t, locale, accountUrl, catalogue } = input;
  return {
    t,
    locale,
    accountUrl,
    identity: { username: '', name: '', groups: [] },
    services: visibleServices(catalogue.services, []),
    allServices: catalogue.services,
    hosts: catalogue.hosts,
    adminGroups: catalogue.adminGroups,
    favorites: [],
    recents: [],
    isAdmin: false,
    offline: false,
  };
}
