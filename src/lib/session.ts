/*
 * Eine Sitzung: die Projektion, die Identität und die abgeleitete Frage, ob
 * diese Person verwalten darf. Jede Seite liest hier - damit gibt es nicht je
 * Ansicht eine eigene Meinung darüber, wer wer ist.
 */

import { isAdmin as isAdminOf, visibleServices } from './authz.ts';
import { loadFleet, type Fleet, type FleetService } from './fleet.ts';
import { readIdentity, type Identity } from './identity.ts';

export interface Session {
  readonly identity: Identity | null;
  readonly fleet: Fleet | null;
  readonly isAdmin: boolean;
  /** Die Dienste, die diese Identität sehen darf - leer ohne Identität. */
  readonly services: readonly FleetService[];
}

export function readSession(request: Request): Session {
  const fleet = loadFleet();
  const identity = readIdentity(request);
  return {
    identity,
    fleet,
    isAdmin: isAdminOf(fleet, identity),
    services: fleet ? visibleServices(fleet, identity) : [],
  };
}
