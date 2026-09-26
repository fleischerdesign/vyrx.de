/*
 * Die Navigation, einmal deklariert. Adressen und Beschriftungen kommen aus
 * der Routentabelle und den Texten - ein Eintrag nennt nie selbst eine Adresse.
 */

import type { IconName } from './icons.ts';
import type { MessageKey } from '../i18n/index.ts';
import type { RouteName } from './locale.ts';

export interface NavItem {
  readonly name: RouteName;
  readonly key: MessageKey;
  readonly icon: IconName;
  /** Nur für Berechtigte sichtbar. */
  readonly admin?: boolean;
}

/** Die Hauptnavigation des Workspace, in Leserichtung. */
export const WORKSPACE_NAV: readonly NavItem[] = [
  { name: 'start', key: 'navOverview', icon: 'home' },
  { name: 'services', key: 'navServices', icon: 'grid' },
  { name: 'knowledge', key: 'navKnowledge', icon: 'book' },
  { name: 'status', key: 'navStatus', icon: 'activity' },
  { name: 'account', key: 'navAccount', icon: 'user' },
  { name: 'admin', key: 'navAdmin', icon: 'shield', admin: true },
];

/** Die Navigation für Besucher: schmal, ohne Betriebsdaten. */
export const PUBLIC_NAV: readonly NavItem[] = [
  { name: 'project', key: 'navProject', icon: 'document' },
  { name: 'help', key: 'navHelp', icon: 'chat' },
];

/** Der Eintrag, der auf dieser Adresse aktiv ist. */
export function isCurrent(item: NavItem, current: RouteName): boolean {
  if (item.name === 'start') return current === 'start';
  if (item.name === 'services') return current === 'services' || current === 'service';
  if (item.name === 'knowledge') return current === 'knowledge' || current === 'article';
  return item.name === current;
}
