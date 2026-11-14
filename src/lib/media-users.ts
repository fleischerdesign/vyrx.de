/*
 * Portal-Person -> Seerr-Person.
 *
 * Seerr nutzt denselben Authentik-Provider wie das Portal. OIDC-Nutzer tragen
 * dort E-Mail und preferred_username; bestehende Jellyfin-Nutzer können
 * abweichen. Deshalb wird nur ein eindeutiger Treffer gespeichert - nie
 * geraten und nie auf den API-Key-Besitzer zurückgefallen.
 */

import type { Identity } from './identity.ts';
import type { Session } from './session.ts';
import { mediaUserOf, removeMediaUser, saveMediaUser, type MediaUserMapping } from './store.ts';
import { seerrUser, seerrUsers, SeerrError, type SeerrUser } from './seerr.ts';

export type MediaUserFailure =
  | 'not_signed_in'
  | 'not_allowed'
  | 'not_visible'
  | 'not_linked'
  | 'ambiguous'
  | 'seerr_unavailable';

export interface MediaUserSuccess {
  readonly user: SeerrUser;
  readonly mapping: MediaUserMapping;
}

export type MediaUserResult = MediaUserSuccess | { readonly reason: MediaUserFailure };

const lower = (value: string | null | undefined): string => (value ?? '').trim().toLocaleLowerCase('de');

const matchUser = (users: readonly SeerrUser[], identity: Identity): SeerrUser | 'ambiguous' | null => {
  const email = lower(identity.email);
  if (email) {
    const matches = users.filter((user) => lower(user.email) === email);
    if (matches.length === 1) return matches[0] ?? null;
    if (matches.length > 1) return 'ambiguous';
  }

  const username = lower(identity.username);
  if (!username) return null;
  const matches = users.filter(
    (user) => lower(user.username) === username || lower(user.jellyfinUsername) === username,
  );
  if (matches.length === 1) return matches[0] ?? null;
  if (matches.length > 1) return 'ambiguous';
  return null;
};

const remember = (identity: Identity, user: SeerrUser): MediaUserMapping => {
  saveMediaUser({
    owner: identity.username,
    seerrUserId: user.id,
    seerrEmail: user.email,
    seerrUsername: user.username ?? user.jellyfinUsername,
  });
  return {
    seerrUserId: user.id,
    seerrEmail: user.email,
    seerrUsername: user.username ?? user.jellyfinUsername,
    verifiedAt: new Date().toISOString(),
  };
};

/**
 * Löst die aktuelle Portal-Person auf. `media-users` ist Pflicht: die
 * Sichtbarkeit des Portaldienstes über `family` genügt nicht.
 */
export async function resolveMediaUser(session: Session): Promise<MediaUserResult> {
  const identity = session.identity;
  if (!identity) return { reason: 'not_signed_in' };
  if (!identity.groups.includes('media-users')) return { reason: 'not_allowed' };
  if (!session.services.some((service) => service.id === 'media-requests')) return { reason: 'not_visible' };

  const stored = mediaUserOf(identity.username);
  if (stored) {
    try {
      const user = await seerrUser(session, stored.seerrUserId);
      if (user) return { user, mapping: stored };
      removeMediaUser(identity.username);
    } catch (error) {
      if (error instanceof SeerrError && error.code === 'unavailable') return { reason: 'seerr_unavailable' };
      if (error instanceof SeerrError && error.code === 'not_configured') return { reason: 'seerr_unavailable' };
      if (error instanceof SeerrError && error.code !== 'not_found') return { reason: 'not_linked' };
    }
  }

  try {
    const emailQuery = identity.email ? await seerrUsers(session, identity.email) : [];
    let match = matchUser(emailQuery, identity);
    if (match === 'ambiguous') return { reason: 'ambiguous' };

    if (!match) {
      const nameQuery = await seerrUsers(session, identity.username);
      match = matchUser(nameQuery, identity);
      if (match === 'ambiguous') return { reason: 'ambiguous' };
    }

    if (!match) return { reason: 'not_linked' };
    return { user: match, mapping: remember(identity, match) };
  } catch (error) {
    if (error instanceof SeerrError) return { reason: 'seerr_unavailable' };
    return { reason: 'seerr_unavailable' };
  }
}
