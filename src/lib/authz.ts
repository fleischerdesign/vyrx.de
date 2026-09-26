/*
 * Eine Regel für die Sichtbarkeit - für jede Auslieferung dieselbe.
 *
 * Ob Liste, Direktadresse, Suche oder API: „darf diese Person diesen Dienst
 * sehen?" wird hier entschieden und nirgends sonst. Damit kann die Oberfläche
 * nicht anders urteilen als der Endpunkt.
 */

import type { Fleet, FleetCategory, FleetService } from './fleet.ts';
import type { Identity } from './identity.ts';

export function isServiceVisible(service: FleetService, groups: readonly string[]): boolean {
  return opensFor(service.accessGroups, groups);
}

/**
 * Die eine Sichtbarkeitsregel: leere Freigabe heißt alle, sonst genügt eine
 * passende Gruppe. Dienste und Ankündigungen teilen sie, damit zwei Dinge
 * nicht zwei Bedeutungen von "freigegeben" bekommen.
 */
export function opensFor(accessGroups: readonly string[], groups: readonly string[]): boolean {
  return accessGroups.length === 0 || accessGroups.some((group) => groups.includes(group));
}

export function canSeeService(service: FleetService, identity: Identity | null): boolean {
  return identity !== null && isServiceVisible(service, identity.groups);
}

export function visibleServices(fleet: Fleet, identity: Identity | null): readonly FleetService[] {
  if (!identity) return [];
  return fleet.services.filter((service) => isServiceVisible(service, identity.groups));
}

export function isAdmin(fleet: Fleet | null, identity: Identity | null): boolean {
  return fleet !== null && identity !== null && fleet.adminGroups.some((group) => identity.groups.includes(group));
}

/**
 * Ob diese Identität diesen Dienst verwalten darf.
 *
 * Sehen und Verwalten sind zwei Rechte: wer einen Dienst sieht, darf ihn noch
 * lange nicht neu starten. Die Gruppen stehen beim Dienst, nicht im Code.
 */
export function mayManage(service: FleetService, identity: Identity | null): boolean {
  return identity !== null && service.adminGroups.some((group) => identity.groups.includes(group));
}

/** Die Kategorien, in denen wirklich sichtbare Dienste liegen - in Reihenfolge. */
export function visibleCategories(
  fleet: Fleet,
  services: readonly FleetService[],
): readonly (FleetCategory & { services: readonly FleetService[] })[] {
  const present = new Set(services.map((service) => service.categoryId));
  return [...fleet.categories]
    .filter((category) => present.has(category.id))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((category) => ({
      ...category,
      services: services.filter((service) => service.categoryId === category.id),
    }));
}
