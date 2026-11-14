/*
 * Seerr als Medienquelle.
 *
 * Der API-Key ist ein Instanzschlüssel und bleibt serverseitig. Jeder Aufruf
 * für eine Person trägt zusätzlich `X-Api-User`; damit gelten deren Sprache,
 * Freigaben, Quota und Requests. Es gibt keinen stillen Fallback auf den
 * Key-Besitzer.
 *
 * Diese Datei liest. Schreibende Aufrufe kommen erst mit der Proposal-Stufe
 * und niemals direkt aus einem Modell-Tool.
 */

import { readFileSync } from 'node:fs';
import type { Locale } from './locale.ts';
import type { Session } from './session.ts';

export type SeerrErrorCode =
  | 'not_configured'
  | 'not_found'
  | 'forbidden'
  | 'duplicate'
  | 'rate'
  | 'unavailable';

export class SeerrError extends Error {
  readonly code: SeerrErrorCode;
  readonly status: number | null;

  constructor(code: SeerrErrorCode, status: number | null = null) {
    super(code);
    this.name = 'SeerrError';
    this.code = code;
    this.status = status;
  }
}

export interface SeerrUser {
  readonly id: number;
  readonly email: string | null;
  readonly username: string | null;
  readonly jellyfinUsername: string | null;
  readonly displayName: string;
  readonly permissions: number;
}

export type MediaStatusKey = 'available' | 'requested' | 'processing' | 'partial' | 'unknown' | 'blocklisted';

export interface MediaItem {
  readonly tmdbId: number;
  readonly mediaType: 'movie' | 'tv';
  readonly title: string;
  readonly year: string | null;
  readonly overview: string;
  readonly posterPath: string | null;
  readonly backdropPath: string | null;
  readonly rating: number | null;
  readonly releaseDate: string | null;
  readonly runtime: number | null;
  readonly tagline: string | null;
  readonly genres: readonly string[];
  readonly director: string | null;
  readonly cast: readonly { readonly name: string; readonly character: string | null }[];
  readonly voteCount: number | null;
  readonly numberOfSeasons: number | null;
  readonly numberOfEpisodes: number | null;
  readonly trailerKey: string | null;
  readonly status: MediaStatusKey;
  readonly statusText: string;
  readonly requestable: boolean;
}

interface RawMedia {
  id?: unknown;
  mediaType?: unknown;
  title?: unknown;
  name?: unknown;
  releaseDate?: unknown;
  firstAirDate?: unknown;
  overview?: unknown;
  posterPath?: unknown;
  backdropPath?: unknown;
  voteAverage?: unknown;
  voteCount?: unknown;
  runtime?: unknown;
  episodeRunTime?: unknown;
  tagline?: unknown;
  genres?: unknown;
  credits?: unknown;
  createdBy?: unknown;
  numberOfSeasons?: unknown;
  numberOfEpisodes?: unknown;
  relatedVideos?: unknown;
  mediaInfo?: { status?: unknown; status4k?: unknown; requests?: unknown } | null;
}

const apiKey = (): string => {
  const file = process.env.PORTAL_SEERR_API_KEY_FILE?.trim();
  if (file) {
    try {
      return readFileSync(file, 'utf8').trim();
    } catch {
      throw new SeerrError('not_configured');
    }
  }
  const value = process.env.PORTAL_SEERR_API_KEY?.trim();
  if (!value) throw new SeerrError('not_configured');
  return value;
};

const mediaServiceIds = (): readonly string[] => {
  const configured = process.env.PORTAL_MEDIA_SERVICE_ID?.trim();
  return configured ? [configured] : ['jellyseerr', 'media-requests'];
};

/** Der vertraglich sichtbare Mediendienst; Produktion heißt `jellyseerr`, die Fixture `media-requests`. */
export const mediaService = (session: Session): Session['services'][number] | null => {
  const ids = mediaServiceIds();
  return session.services.find((entry) => ids.includes(entry.id)) ?? null;
};

const base = (session: Session): string => {
  const override = process.env.PORTAL_SEERR_URL?.trim();
  if (override) return override.endsWith('/') ? override : `${override}/`;
  const service = mediaService(session);
  if (!service) throw new SeerrError('not_configured');
  return service.url.endsWith('/') ? service.url : `${service.url}/`;
};

async function request<T>(
  session: Session,
  path: string,
  options: {
    userId?: number;
    query?: Record<string, string | number | undefined>;
    method?: 'GET' | 'POST' | 'DELETE';
    body?: unknown;
  } = {},
): Promise<T> {
  const url = new URL(`api/v1/${path.replace(/^\//, '')}`, base(session));
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const headers = new Headers({ 'X-Api-Key': apiKey(), accept: 'application/json' });
  if (options.userId !== undefined) headers.set('X-Api-User', String(options.userId));
  if (options.body !== undefined) headers.set('content-type', 'application/json');

  const method = options.method ?? 'GET';
  const send = (): Promise<Response> =>
    fetch(url, {
      method,
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(8000),
    });

  const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 150));
  let response: Response;
  try {
    response = await send();
  } catch {
    if (method !== 'GET') throw new SeerrError('unavailable');
    try {
      await pause();
      response = await send();
    } catch {
      throw new SeerrError('unavailable');
    }
  }
  if (method === 'GET' && response.status >= 500) {
    try {
      await pause();
      response = await send();
    } catch {
      throw new SeerrError('unavailable');
    }
  }

  if (response.status === 401 || response.status === 403) throw new SeerrError('forbidden', response.status);
  if (response.status === 404) throw new SeerrError('not_found', response.status);
  if (response.status === 409) throw new SeerrError('duplicate', response.status);
  if (response.status === 429) throw new SeerrError('rate', response.status);
  if (!response.ok) throw new SeerrError('unavailable', response.status);

  try {
    return (await response.json()) as T;
  } catch {
    throw new SeerrError('unavailable', response.status);
  }
}

const stringOrNull = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

const userFromRaw = (value: unknown): SeerrUser | null => {
  if (value === null || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'number') return null;
  const username = stringOrNull(row.username);
  const email = stringOrNull(row.email);
  const jellyfinUsername = stringOrNull(row.jellyfinUsername);
  const displayName = stringOrNull(row.displayName) ?? username ?? email ?? `Seerr ${row.id}`;
  return {
    id: row.id,
    email,
    username,
    jellyfinUsername,
    displayName,
    permissions: typeof row.permissions === 'number' ? row.permissions : 0,
  };
};

export async function seerrUsers(session: Session, query?: string): Promise<readonly SeerrUser[]> {
  const body = await request<{ results?: unknown[] }>(session, 'user', {
    query: { take: 50, ...(query ? { q: query } : {}) },
  });
  return (body.results ?? []).flatMap((entry) => {
    const user = userFromRaw(entry);
    return user ? [user] : [];
  });
}

export async function seerrUser(session: Session, userId: number): Promise<SeerrUser | null> {
  try {
    return userFromRaw(await request<unknown>(session, `user/${userId}`));
  } catch (error) {
    if (error instanceof SeerrError && error.code === 'not_found') return null;
    throw error;
  }
}

const mediaStatusText = (status: MediaStatusKey, locale: Locale): string => {
  const text: Record<MediaStatusKey, { de: string; en: string }> = {
    available: { de: 'verfügbar', en: 'available' },
    requested: { de: 'angefragt', en: 'requested' },
    processing: { de: 'wird bearbeitet', en: 'processing' },
    partial: { de: 'teilweise verfügbar', en: 'partially available' },
    unknown: { de: 'nicht angefragt', en: 'not requested' },
    blocklisted: { de: 'gesperrt', en: 'blocklisted' },
  };
  return text[status][locale];
};

const statusOf = (mediaInfo: RawMedia['mediaInfo']): MediaStatusKey => {
  const status = mediaInfo?.status;
  if (status === 5) return 'available';
  if (status === 2) return 'requested';
  if (status === 3) return 'processing';
  if (status === 4) return 'partial';
  if (status === 6) return 'blocklisted';
  return 'unknown';
};

const mediaFromRaw = (
  value: unknown,
  locale: Locale,
  fallbackType?: 'movie' | 'tv',
): MediaItem | null => {
  if (value === null || typeof value !== 'object') return null;
  const row = value as RawMedia;
  if (typeof row.id !== 'number') return null;
  const mediaType = row.mediaType === 'movie' || row.mediaType === 'tv' ? row.mediaType : fallbackType;
  if (!mediaType) return null;
  const title = stringOrNull(row.title) ?? stringOrNull(row.name);
  if (!title) return null;
  const date = stringOrNull(row.releaseDate) ?? stringOrNull(row.firstAirDate);
  const status = statusOf(row.mediaInfo);
  const genres = Array.isArray(row.genres)
    ? row.genres.flatMap((entry) => {
        if (entry === null || typeof entry !== 'object') return [];
        const name = stringOrNull((entry as Record<string, unknown>).name);
        return name ? [name] : [];
      })
    : [];
  const credits = row.credits && typeof row.credits === 'object' ? (row.credits as Record<string, unknown>) : null;
  const cast = Array.isArray(credits?.cast)
    ? credits.cast
        .flatMap((entry) => {
          if (entry === null || typeof entry !== 'object') return [];
          const person = entry as Record<string, unknown>;
          const name = stringOrNull(person.name);
          return name ? [{ name, character: stringOrNull(person.character) }] : [];
        })
        .slice(0, 5)
    : [];
  const crew = Array.isArray(credits?.crew)
    ? credits.crew.flatMap((entry) => {
        if (entry === null || typeof entry !== 'object') return [];
        const person = entry as Record<string, unknown>;
        return typeof person.name === 'string' && typeof person.job === 'string'
          ? [{ name: person.name, job: person.job }]
          : [];
      })
    : [];
  const createdBy = Array.isArray(row.createdBy)
    ? row.createdBy.flatMap((entry) => {
        if (entry === null || typeof entry !== 'object') return [];
        const name = stringOrNull((entry as Record<string, unknown>).name);
        return name ? [name] : [];
      })
    : [];
  const runtime =
    typeof row.runtime === 'number' && Number.isFinite(row.runtime) && row.runtime > 0
      ? row.runtime
      : Array.isArray(row.episodeRunTime)
        ? (row.episodeRunTime.find((value) => typeof value === 'number' && value > 0) as number | undefined) ?? null
        : null;
  const relatedVideos = Array.isArray(row.relatedVideos)
    ? row.relatedVideos.flatMap((entry) => {
        if (entry === null || typeof entry !== 'object') return [];
        const video = entry as Record<string, unknown>;
        const key = stringOrNull(video.key);
        return video.site === 'YouTube' && video.type === 'Trailer' && key && /^[A-Za-z0-9_-]{6,20}$/.test(key)
          ? [key]
          : [];
      })
    : [];
  return {
    tmdbId: row.id,
    mediaType,
    title,
    year: date?.slice(0, 4) ?? null,
    overview: stringOrNull(row.overview) ?? '',
    posterPath: stringOrNull(row.posterPath),
    backdropPath: stringOrNull(row.backdropPath),
    rating:
      typeof row.voteAverage === 'number' && Number.isFinite(row.voteAverage) && row.voteAverage > 0
        ? row.voteAverage
        : null,
    releaseDate: date,
    runtime,
    tagline: stringOrNull(row.tagline),
    genres,
    director: crew.find((entry) => entry.job === 'Director')?.name ?? createdBy[0] ?? null,
    cast,
    voteCount: typeof row.voteCount === 'number' && Number.isFinite(row.voteCount) ? row.voteCount : null,
    numberOfSeasons:
      typeof row.numberOfSeasons === 'number' && Number.isFinite(row.numberOfSeasons) ? row.numberOfSeasons : null,
    numberOfEpisodes:
      typeof row.numberOfEpisodes === 'number' && Number.isFinite(row.numberOfEpisodes) ? row.numberOfEpisodes : null,
    trailerKey: relatedVideos[0] ?? null,
    status,
    statusText: mediaStatusText(status, locale),
    requestable: status === 'unknown',
  };
};

const mediaList = (value: unknown, locale: Locale): readonly MediaItem[] => {
  if (value === null || typeof value !== 'object') return [];
  const results = (value as { results?: unknown[] }).results;
  if (!Array.isArray(results)) return [];
  return results.flatMap((entry) => {
    const media = mediaFromRaw(entry, locale);
    return media ? [media] : [];
  });
};

export async function searchMedia(session: Session, userId: number, query: string, locale: Locale): Promise<readonly MediaItem[]> {
  const body = await request<unknown>(session, 'search', { userId, query: { query, language: locale } });
  return mediaList(body, locale);
}

export type DiscoverKind = 'trending' | 'upcoming' | 'similar' | 'recommendations' | 'popular';

export async function discoverMedia(
  session: Session,
  userId: number,
  kind: DiscoverKind,
  mediaType: 'movie' | 'tv',
  locale: Locale,
  tmdbId?: number,
): Promise<readonly MediaItem[]> {
  let path: string;
  switch (kind) {
    case 'trending':
      path = `discover/trending?mediaType=${mediaType}&timeWindow=week&language=${encodeURIComponent(locale)}`;
      break;
    case 'upcoming':
      path = `discover/${mediaType === 'movie' ? 'movies' : 'tv'}/upcoming?language=${encodeURIComponent(locale)}`;
      break;
    case 'similar':
      if (!tmdbId) throw new SeerrError('not_found');
      path = `${mediaType}/${tmdbId}/similar?language=${encodeURIComponent(locale)}`;
      break;
    case 'recommendations':
      if (!tmdbId) throw new SeerrError('not_found');
      path = `${mediaType}/${tmdbId}/recommendations?language=${encodeURIComponent(locale)}`;
      break;
    case 'popular':
      path = `discover/${mediaType === 'movie' ? 'movies' : 'tv'}?sortBy=popularity.desc&language=${encodeURIComponent(locale)}`;
      break;
  }
  const body = await request<unknown>(session, path, { userId });
  return mediaList(body, locale);
}

export interface SeerrRequestResult {
  readonly requestId: number | null;
  readonly status: number | null;
}

/** Die einzige schreibende Seerr-Operation. Wird nie direkt vom Modell gerufen. */
export async function requestMedia(
  session: Session,
  userId: number,
  input: { mediaType: 'movie'; tmdbId: number },
): Promise<SeerrRequestResult> {
  const body = await request<{ id?: unknown; status?: unknown }>(session, 'request', {
    userId,
    method: 'POST',
    body: { mediaType: input.mediaType, mediaId: input.tmdbId, is4k: false },
  });
  return {
    requestId: typeof body.id === 'number' ? body.id : null,
    status: typeof body.status === 'number' ? body.status : null,
  };
}

export interface SeerrQuota {
  readonly movie: { readonly limit: number; readonly used: number; readonly restricted: boolean };
  readonly tv: { readonly limit: number; readonly used: number; readonly restricted: boolean };
}

export async function seerrQuota(session: Session, userId: number): Promise<SeerrQuota> {
  const body = await request<{
    movie?: { limit?: unknown; used?: unknown; restricted?: unknown };
    tv?: { limit?: unknown; used?: unknown; restricted?: unknown };
  }>(session, `user/${userId}/quota`);
  const part = (value: { limit?: unknown; used?: unknown; restricted?: unknown } | undefined) => ({
    limit: typeof value?.limit === 'number' ? value.limit : 0,
    used: typeof value?.used === 'number' ? value.used : 0,
    restricted: value?.restricted === true,
  });
  return { movie: part(body.movie), tv: part(body.tv) };
}

export interface OwnMediaRequest {
  readonly id: number;
  readonly status: number;
  readonly mediaType: 'movie' | 'tv' | null;
  readonly tmdbId: number | null;
}

/** Eigene Requests; requestedBy ist auch für Admins Pflicht, sonst sieht ein Admin alle. */
export async function ownRequests(session: Session, userId: number, take = 20): Promise<readonly OwnMediaRequest[]> {
  const body = await request<{ results?: unknown[] }>(session, 'request', {
    userId,
    query: { take, requestedBy: userId },
  });
  return (body.results ?? []).flatMap((entry) => {
    if (entry === null || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const media = row.media && typeof row.media === 'object' ? (row.media as Record<string, unknown>) : null;
    if (typeof row.id !== 'number') return [];
    const mediaType = media?.mediaType === 'movie' || media?.mediaType === 'tv' ? media.mediaType : null;
    return [
      {
        id: row.id,
        status: typeof row.status === 'number' ? row.status : 0,
        mediaType,
        tmdbId: typeof media?.tmdbId === 'number' ? media.tmdbId : null,
      },
    ];
  });
}

export async function mediaTitle(
  session: Session,
  userId: number,
  mediaType: 'movie' | 'tv',
  tmdbId: number,
  locale: Locale,
): Promise<MediaItem | null> {
  try {
    return mediaFromRaw(
      await request<unknown>(session, `${mediaType}/${tmdbId}`, { userId, query: { language: locale } }),
      locale,
      mediaType,
    );
  } catch (error) {
    if (error instanceof SeerrError && error.code === 'not_found') return null;
    throw error;
  }
}
