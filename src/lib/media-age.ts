import { mediaTitle, type MediaItem } from './seerr.ts';
import type { Session } from './session.ts';

/** Deutsche FSK-Stufen; alles andere wird beim Filtern nicht geraten. */
export const AGE_STEPS = [0, 6, 12, 16, 18] as const;
export type AgeLimit = (typeof AGE_STEPS)[number];

const cache = new Map<string, { certification: string | null; expiresAt: number }>();
const CACHE_MS = 60 * 60 * 1000;
const MAX_CANDIDATES = 12;
const CONCURRENCY = 3;

export const isAgeLimit = (value: unknown): value is AgeLimit =>
  typeof value === 'number' && (AGE_STEPS as readonly number[]).includes(value);

export const certificationNumber = (certification: string | null | undefined): number | null => {
  if (!certification) return null;
  const match = certification.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const certificationOf = async (
  session: Session,
  userId: number,
  item: MediaItem,
): Promise<MediaItem> => {
  if (item.certification !== undefined) return item;
  const key = `${item.mediaType}:${item.tmdbId}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { ...item, certification: hit.certification };
  try {
    const detail = await mediaTitle(session, userId, item.mediaType, item.tmdbId, 'de');
    const certification = detail?.certification ?? null;
    cache.set(key, { certification, expiresAt: Date.now() + CACHE_MS });
    return detail ? { ...item, ...detail, certification } : { ...item, certification };
  } catch {
    cache.set(key, { certification: null, expiresAt: Date.now() + CACHE_MS });
    return { ...item, certification: null };
  }
};

/**
 * Filtert Medien nach einer deutschen FSK-Obergrenze. Kandidaten ohne
 * belastbare DE-Freigabe werden ausgeschlossen, nicht als „altersgerecht“
 * angenommen. Die Detailabfragen laufen gedrosselt und werden eine Stunde
 * gecacht.
 */
export async function filterMediaByAge(
  session: Session,
  userId: number,
  items: readonly MediaItem[],
  maxAge: AgeLimit,
): Promise<readonly MediaItem[]> {
  const candidates = items.slice(0, MAX_CANDIDATES);
  const enriched: MediaItem[] = [];
  for (let start = 0; start < candidates.length; start += CONCURRENCY) {
    const chunk = candidates.slice(start, start + CONCURRENCY);
    const results = await Promise.all(chunk.map((item) => certificationOf(session, userId, item)));
    enriched.push(...results);
  }
  return enriched.filter((item) => {
    const age = certificationNumber(item.certification);
    return age !== null && age <= maxAge;
  });
}
