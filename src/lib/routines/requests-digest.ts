import { mediaWatchesOf } from '../store.ts';
import type { RoutineDefinition } from './types.ts';

const RECENT_AVAILABLE_MS = 21 * 86_400_000;

export const requestsDigest: RoutineDefinition = {
  id: 'requests-digest',
  title: 'Medien-Digest',
  description: 'Wöchentliche Zusammenfassung der eigenen Medienanfragen.',
  audience: 'media-users',
  schedule: { kind: 'weekly', weekday: 7, hour: 18, minute: 0 },
  async run({ owner, locale, now }) {
    const watches = mediaWatchesOf(owner);
    const recentAvailable = watches.filter((watch) => {
      const changed = Date.parse(watch.updatedAt);
      return watch.lastStatus === 'available' && Number.isFinite(changed) && now.getTime() - changed <= RECENT_AVAILABLE_MS;
    });
    const open = watches.filter(
      (watch) =>
        watch.active &&
        watch.lastStatus !== 'available' &&
        watch.lastStatus !== 'declined' &&
        watch.lastStatus !== 'failed' &&
        watch.lastStatus !== 'blocklisted',
    );
    if (recentAvailable.length === 0 && open.length === 0) return null;

    const de = locale === 'de';
    const availableTitles = recentAvailable.slice(0, 5).map((watch) => watch.title);
    const openTitles = open.slice(0, 5).map((watch) => watch.title);
    const parts = [
      de
        ? `${recentAvailable.length} verfügbar, ${open.length} offen.`
        : `${recentAvailable.length} available, ${open.length} open.`,
    ];
    if (availableTitles.length > 0) {
      parts.push(`${de ? 'Verfügbar' : 'Available'}: ${availableTitles.join(', ')}${recentAvailable.length > 5 ? ' …' : ''}.`);
    }
    if (openTitles.length > 0) {
      parts.push(`${de ? 'In Arbeit' : 'In progress'}: ${openTitles.join(', ')}${open.length > 5 ? ' …' : ''}.`);
    }

    return {
      title: de ? 'Dein Medien-Digest' : 'Your media digest',
      body: parts.join(' '),
      href: de ? '/overview/' : '/en/overview/',
    };
  },
};
