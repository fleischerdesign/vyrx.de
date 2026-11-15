import { loadFleet } from './fleet.ts';
import { notificationForWatch, observeWatch } from './media-watch.ts';
import { mediaTitle, ownRequests, type OwnMediaRequest } from './seerr.ts';
import {
  activeMediaWatches,
  markMediaScanComplete,
  mediaScanBackfilled,
  mediaUserMappings,
  mediaUserOf,
  recordMediaWatchEvent,
  updateMediaWatchObservation,
  upsertMediaWatch,
  type MediaWatch,
} from './store.ts';
import type { Session } from './session.ts';
import { flushPushDigest, notifyOwner, type PushPayload } from './web-push.ts';

export interface MediaWatchScanStats {
  readonly owners: number;
  readonly watches: number;
  readonly requests: number;
  readonly backfilled: number;
  readonly events: number;
  readonly errors: number;
  readonly skipped: boolean;
}

const backgroundSession = (): Session => {
  const fleet = loadFleet();
  return {
    identity: null,
    fleet,
    isAdmin: false,
    services: fleet?.services ?? [],
  };
};

const keyOf = (mediaType: string, tmdbId: number, is4k: boolean): string =>
  `${mediaType}:${tmdbId}:${is4k ? 1 : 0}`;

const requestKey = (request: OwnMediaRequest): string | null =>
  request.mediaType && request.tmdbId ? keyOf(request.mediaType, request.tmdbId, request.is4k) : null;

const seasonsOf = (requests: readonly OwnMediaRequest[]): readonly number[] | null => {
  const numbers = [...new Set(requests.flatMap((request) => request.seasons.map((season) => season.seasonNumber)))].sort(
    (a, b) => a - b,
  );
  return numbers.length > 0 ? numbers : null;
};

let running = false;

export interface MediaWatchScanDependencies {
  readonly requests?: typeof ownRequests;
  readonly title?: typeof mediaTitle;
}

/**
 * Ein Scan ist absichtlich klein: ein Seerr-Aufruf pro Owner, danach nur
 * Zustandsvergleich. Keine Titel-Suche, keine Detailabfrage pro Watch.
 * Die einmalige Backfill-Runde holt für alte Requests nur den Titel nach.
 */
export async function runMediaWatchScan(
  dependencies: MediaWatchScanDependencies = {},
): Promise<MediaWatchScanStats> {
  if (running) {
    return { owners: 0, watches: 0, requests: 0, backfilled: 0, events: 0, errors: 0, skipped: true };
  }
  running = true;
  const stats = { owners: 0, watches: 0, requests: 0, backfilled: 0, events: 0, errors: 0, skipped: false };
  try {
    const watches = activeMediaWatches();
    const groups = new Map<string, MediaWatch[]>();
    for (const watch of watches) {
      const group = groups.get(watch.owner);
      if (group) group.push(watch);
      else groups.set(watch.owner, [watch]);
    }
    for (const mapping of mediaUserMappings()) {
      if (!mediaScanBackfilled(mapping.owner) && !groups.has(mapping.owner)) groups.set(mapping.owner, []);
    }

    const session = backgroundSession();
    const readRequests = dependencies.requests ?? ownRequests;
    const readTitle = dependencies.title ?? mediaTitle;

    for (const [owner, ownerWatches] of groups) {
      stats.owners += 1;
      stats.watches += ownerWatches.length;
      const mapping = mediaUserOf(owner);
      if (!mapping) continue;
      let requests: readonly OwnMediaRequest[];
      try {
        requests = await readRequests(session, mapping.seerrUserId, 100);
      } catch {
        stats.errors += 1;
        continue;
      }
      stats.requests += requests.length;

      const byKey = new Map<string, OwnMediaRequest[]>();
      for (const request of requests) {
        const key = requestKey(request);
        if (!key) continue;
        const group = byKey.get(key);
        if (group) group.push(request);
        else byKey.set(key, [request]);
      }

      const digest: PushPayload[] = [];
      for (const watch of ownerWatches) {
        const matching = byKey.get(keyOf(watch.mediaType, watch.tmdbId, watch.is4k)) ?? [];
        if (matching.length === 0) {
          const misses = watch.misses + 1;
          updateMediaWatchObservation(watch, {
            status: watch.lastStatus,
            requestStatus: watch.lastRequestStatus,
            active: misses < 2,
            misses,
            failures: watch.failures,
          });
          continue;
        }

        const observation = observeWatch(watch, matching);
        if (observation.event && recordMediaWatchEvent(watch, observation.event)) {
          const notification = notificationForWatch(observation.event, watch.locale, watch.title);
          try {
            notifyOwner(watch.owner, 'request', notification.title, notification.body, notification.href, {
              deferPush: true,
            });
            digest.push({ ...notification, locale: watch.locale });
            stats.events += 1;
          } catch {
            stats.errors += 1;
          }
        }

        updateMediaWatchObservation(watch, {
          status: observation.status,
          requestStatus: observation.requestStatus,
          active: observation.active,
          misses: 0,
          failures: 0,
        });
      }

      try {
        await flushPushDigest(owner, 'request', digest);
      } catch {
        stats.errors += 1;
      }

      if (!mediaScanBackfilled(owner)) {
        const watchedKeys = new Set(ownerWatches.map((watch) => keyOf(watch.mediaType, watch.tmdbId, watch.is4k)));
        for (const [key, matching] of byKey) {
          if (watchedKeys.has(key)) continue;
          const first = matching[0];
          if (!first?.mediaType || !first.tmdbId) continue;
          const seasons = first.mediaType === 'tv' ? seasonsOf(matching) : null;
          const synthetic: MediaWatch = {
            owner,
            mediaType: first.mediaType,
            tmdbId: first.tmdbId,
            is4k: first.is4k,
            title: '',
            locale: ownerWatches[0]?.locale ?? 'de',
            seasons,
            requestIds: matching.map((request) => request.id),
            lastStatus: 'unknown',
            lastRequestStatus: null,
            active: true,
            misses: 0,
            failures: 0,
            lastCheckedAt: null,
            nextCheckAt: null,
            createdAt: '',
            updatedAt: '',
          };
          const observation = observeWatch(synthetic, matching);
          if (!observation.active) continue;
          let title = '';
          try {
            title = (await readTitle(session, mapping.seerrUserId, first.mediaType, first.tmdbId, synthetic.locale))?.title ?? '';
          } catch {
            stats.errors += 1;
          }
          if (!title) title = `Medienanfrage #${first.tmdbId}`;
          upsertMediaWatch({
            owner,
            mediaType: first.mediaType,
            tmdbId: first.tmdbId,
            is4k: first.is4k,
            title,
            locale: synthetic.locale,
            seasons,
            requestId: first.id,
            lastStatus: observation.status,
            lastRequestStatus: observation.requestStatus,
          });
          stats.backfilled += 1;
        }
        markMediaScanComplete(owner);
      }
    }
  } finally {
    running = false;
  }
  return stats;
}
