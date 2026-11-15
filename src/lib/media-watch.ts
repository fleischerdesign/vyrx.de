import type { MediaWatch } from './store.ts';
import type { OwnMediaRequest } from './seerr.ts';

export type WatchStatus =
  | 'unknown'
  | 'requested'
  | 'processing'
  | 'partial'
  | 'available'
  | 'blocklisted'
  | 'declined'
  | 'failed';

export type WatchEvent = 'approved' | 'partial' | 'available' | 'declined' | 'failed';

export interface WatchObservation {
  readonly status: WatchStatus;
  readonly requestStatus: string | null;
  readonly active: boolean;
  readonly event: WatchEvent | null;
}

const mediaStatusKey = (value: number | null): WatchStatus => {
  switch (value) {
    case 5:
      return 'available';
    case 4:
      return 'partial';
    case 3:
      return 'processing';
    case 2:
      return 'requested';
    case 6:
    case 7:
      return 'blocklisted';
    default:
      return 'unknown';
  }
};

const requestStatusKey = (value: number): string => {
  switch (value) {
    case 1:
      return 'pending';
    case 2:
      return 'approved';
    case 3:
      return 'declined';
    case 4:
      return 'failed';
    case 5:
      return 'completed';
    default:
      return 'unknown';
  }
};

const worstSeasonStatus = (statuses: readonly WatchStatus[]): WatchStatus => {
  if (statuses.length === 0) return 'unknown';
  if (statuses.every((status) => status === 'available')) return 'available';
  if (statuses.some((status) => status === 'partial' || status === 'available')) return 'partial';
  if (statuses.some((status) => status === 'processing')) return 'processing';
  if (statuses.some((status) => status === 'requested')) return 'requested';
  if (statuses.every((status) => status === 'blocklisted')) return 'blocklisted';
  return 'unknown';
};

const aggregate = (statuses: readonly WatchStatus[]): WatchStatus => {
  if (statuses.length === 0) return 'unknown';
  if (statuses.some((status) => status === 'available')) return 'available';
  if (statuses.some((status) => status === 'partial')) return 'partial';
  if (statuses.some((status) => status === 'processing')) return 'processing';
  if (statuses.some((status) => status === 'requested')) return 'requested';
  if (statuses.every((status) => status === 'blocklisted')) return 'blocklisted';
  return statuses.includes('unknown') ? 'unknown' : 'blocklisted';
};

const effectiveRequestStatus = (requests: readonly OwnMediaRequest[]): string | null => {
  if (requests.length === 0) return null;
  const statuses = requests.map((request) => request.status);
  if (statuses.every((status) => status === 3)) return 'declined';
  if (statuses.every((status) => status === 4)) return 'failed';
  if (statuses.every((status) => status === 3 || status === 4)) return 'declined';
  if (statuses.some((status) => status === 1)) return 'pending';
  if (statuses.some((status) => status === 2)) return 'approved';
  if (statuses.some((status) => status === 5)) return 'completed';
  return 'unknown';
};

export function observeWatch(watch: MediaWatch, requests: readonly OwnMediaRequest[]): WatchObservation {
  const requestStatus = effectiveRequestStatus(requests);
  const requestPictures = requests.map((request) =>
    mediaStatusKey(watch.is4k ? request.mediaStatus4k : request.mediaStatus),
  );
  let status: WatchStatus;

  if (requestStatus === 'declined') {
    status = 'declined';
  } else if (requestStatus === 'failed') {
    status = 'failed';
  } else if (watch.mediaType === 'tv' && watch.seasons && watch.seasons.length > 0) {
    const bySeason = new Map<number, WatchStatus[]>();
    for (const number of watch.seasons) bySeason.set(number, []);
    for (const request of requests) {
      for (const season of request.seasons) {
        if (!bySeason.has(season.seasonNumber)) continue;
        bySeason
          .get(season.seasonNumber)
          ?.push(mediaStatusKey(watch.is4k ? season.status4k : season.status));
      }
    }
    const perSeason = [...bySeason.values()].map((statuses) => worstSeasonStatus(statuses));
    status = perSeason.every((value) => value === 'unknown')
      ? aggregate(requestPictures)
      : worstSeasonStatus(perSeason);
  } else {
    status = aggregate(requestPictures);
  }

  if (status === 'unknown' && requestStatus === 'pending') status = 'requested';
  if (watch.lastStatus === 'available' && status !== 'available' && status !== 'declined' && status !== 'failed') {
    status = 'available';
  }

  let event: WatchEvent | null = null;
  if (status === 'available' && watch.lastStatus !== 'available') event = 'available';
  else if (status === 'partial' && watch.lastStatus !== 'partial' && watch.lastStatus !== 'available') event = 'partial';
  else if (status === 'processing' && (watch.lastStatus === 'unknown' || watch.lastStatus === 'requested')) event = 'approved';
  else if (status === 'declined' && watch.lastStatus !== 'declined') event = 'declined';
  else if (status === 'failed' && watch.lastStatus !== 'failed') event = 'failed';

  const terminal = status === 'available' || status === 'declined' || status === 'failed' || status === 'blocklisted';
  return { status, requestStatus, active: !terminal, event };
}

export interface WatchNotification {
  readonly title: string;
  readonly body: string;
  readonly href: string;
}

export function notificationForWatch(
  event: WatchEvent,
  locale: 'de' | 'en',
  mediaTitle: string,
  mediaType: 'movie' | 'tv',
  tmdbId: number,
): WatchNotification {
  const de = locale === 'de';
  const title =
    event === 'approved'
      ? de
        ? 'Anfrage freigegeben'
        : 'Request approved'
      : event === 'partial'
        ? de
          ? 'Teilweise verfügbar'
          : 'Partially available'
        : event === 'available'
          ? de
            ? 'Jetzt verfügbar'
            : 'Now available'
          : event === 'declined'
            ? de
              ? 'Anfrage abgelehnt'
              : 'Request declined'
            : de
              ? 'Anfrage fehlgeschlagen'
              : 'Request failed';
  return {
    title,
    body: mediaTitle,
    href: `${de ? '/overview/' : '/en/overview/'}?media=${mediaType}:${tmdbId}`,
  };
}

export const requestStatusLabel = requestStatusKey;
