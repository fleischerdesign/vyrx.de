import { loadFleet } from '../fleet.ts';
import type { Identity } from '../identity.ts';
import { mediaUserOf } from '../store.ts';
import { discoverMedia, type MediaItem } from '../seerr.ts';
import type { Session } from '../session.ts';
import type { RoutineDefinition } from './types.ts';

const mediaSession = (owner: string): { session: Session; userId: number } | null => {
  const mapping = mediaUserOf(owner);
  const fleet = loadFleet();
  if (!mapping || !fleet) return null;
  const identity: Identity = {
    username: owner,
    name: mapping.seerrUsername ?? owner,
    email: mapping.seerrEmail,
    uid: null,
    // Die Routine läuft nur für Owner mit gespeicherter Seerr-Zuordnung; sie
    // liest ausschließlich den Medienkatalog und schreibt nichts.
    groups: ['media-users'],
  };
  return {
    session: { identity, fleet, isAdmin: false, services: fleet.services },
    userId: mapping.seerrUserId,
  };
};

const eligible = (item: MediaItem): boolean =>
  item.mediaType === 'movie' && item.status === 'unknown' && item.requestable;

/**
 * Freitagabend-Ideen. Nur lesend: Discover liefert Kandidaten, die Person
 * entscheidet im Portal, ob sie einen davon anfragt.
 */
export const filmPicks: RoutineDefinition = {
  id: 'film-picks',
  title: 'Filmabend-Ideen',
  description: 'Freitags drei Filmvorschläge aus dem Medienkatalog.',
  audience: 'media-users',
  schedule: { kind: 'weekly', weekday: 5, hour: 18, minute: 0 },
  async run({ owner, locale }) {
    const access = mediaSession(owner);
    if (!access) return null;
    let items: readonly MediaItem[] = [];
    try {
      items = await discoverMedia(access.session, access.userId, 'trending', 'movie', locale);
    } catch {
      return null;
    }
    const picks = items.filter(eligible).slice(0, 3);
    if (picks.length === 0) return null;
    const de = locale === 'de';
    return {
      title: de ? 'Deine Filmabend-Ideen' : 'Your movie-night picks',
      body: picks.map((item) => `${item.title}${item.year ? ` (${item.year})` : ''}`).join(', '),
      href: de ? '/overview/' : '/en/overview/',
    };
  },
};
