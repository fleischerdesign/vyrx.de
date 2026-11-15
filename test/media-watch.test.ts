import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { notificationForWatch, observeWatch } from '../src/lib/media-watch.ts';
import { runMediaWatchScan } from '../src/lib/media-watch-worker.ts';
import type { OwnMediaRequest } from '../src/lib/seerr.ts';
import {
  activeMediaWatches,
  closeStore,
  mediaWatchOf,
  notificationsOf,
  recordMediaWatchEvent,
  saveMediaUser,
  updateMediaWatchObservation,
  upsertMediaWatch,
} from '../src/lib/store.ts';

const watch = (overrides: Partial<Parameters<typeof upsertMediaWatch>[0]> = {}) => ({
  owner: 'alice',
  mediaType: 'movie' as const,
  tmdbId: 438631,
  is4k: false,
  title: 'Dune',
  locale: 'de' as const,
  seasons: null,
  requestId: 263,
  ...overrides,
});

const request = (overrides: Partial<OwnMediaRequest> = {}): OwnMediaRequest => ({
  id: 263,
  status: 2,
  mediaType: 'movie',
  tmdbId: 438631,
  is4k: false,
  mediaStatus: 2,
  mediaStatus4k: 1,
  seasons: [],
  ...overrides,
});

let directory = '';
let previous: string | undefined;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'vyrx-watch-'));
  previous = process.env.PORTAL_STORE;
  process.env.PORTAL_STORE = join(directory, 'portal.sqlite');
  closeStore();
});

afterEach(() => {
  closeStore();
  if (previous === undefined) delete process.env.PORTAL_STORE;
  else process.env.PORTAL_STORE = previous;
  rmSync(directory, { recursive: true, force: true });
});

test('movie status transitions emit exactly the meaningful events', () => {
  const initial = upsertMediaWatch(watch());
  assert.equal(initial.lastStatus, 'unknown');

  const requested = observeWatch(initial, [request()]);
  assert.equal(requested.status, 'requested');
  assert.equal(requested.event, null);

  const processing = observeWatch({ ...initial, lastStatus: 'requested' }, [request({ mediaStatus: 3 })]);
  assert.equal(processing.event, 'approved');

  const available = observeWatch({ ...initial, lastStatus: 'processing' }, [request({ mediaStatus: 5 })]);
  assert.equal(available.event, 'available');
  assert.equal(available.active, false);
});

test('TV seasons aggregate requested seasons, not the whole show', () => {
  const tvWatch = upsertMediaWatch(watch({ mediaType: 'tv', tmdbId: 90228, seasons: [1, 2] }));
  const season = (seasonNumber: number, status: number) => ({ seasonNumber, status, status4k: 1 });
  const partial = observeWatch(tvWatch, [
    request({ mediaType: 'tv', tmdbId: 90228, mediaStatus: 4, seasons: [season(1, 5), season(2, 3)] }),
  ]);
  assert.equal(partial.status, 'partial');
  assert.equal(partial.event, 'partial');

  const available = observeWatch({ ...tvWatch, lastStatus: 'partial' }, [
    request({ mediaType: 'tv', tmdbId: 90228, mediaStatus: 5, seasons: [season(1, 5), season(2, 5)] }),
  ]);
  assert.equal(available.status, 'available');
  assert.equal(available.event, 'available');
});

test('4K is a separate watch and uses the 4K media status', () => {
  const hd = upsertMediaWatch(watch());
  const uhd = upsertMediaWatch(watch({ is4k: true, requestId: 264 }));
  assert.equal(activeMediaWatches().length, 2);
  const uhdObservation = observeWatch(uhd, [
    request({ is4k: true, mediaStatus: 5, mediaStatus4k: 3 }),
  ]);
  assert.equal(uhdObservation.status, 'processing');
  assert.equal(observeWatch(hd, [request({ mediaStatus: 5 })]).status, 'available');
});

test('declined requests terminate and are not interpreted as availability', () => {
  const initial = upsertMediaWatch(watch());
  const declined = observeWatch(initial, [request({ status: 3, mediaStatus: 2 })]);
  assert.equal(declined.status, 'declined');
  assert.equal(declined.event, 'declined');
  assert.equal(declined.active, false);
});

test('watch events are idempotent per owner/key/event and owner-scoped', () => {
  const alice = upsertMediaWatch(watch());
  assert.equal(recordMediaWatchEvent(alice, 'available'), true);
  assert.equal(recordMediaWatchEvent(alice, 'available'), false);
  const bob = upsertMediaWatch(watch({ owner: 'bob' }));
  assert.equal(recordMediaWatchEvent(bob, 'available'), true);
  updateMediaWatchObservation(alice, {
    status: 'available',
    requestStatus: 'approved',
    active: false,
    misses: 0,
  });
  assert.equal(mediaWatchOf('alice', 'movie', 438631, false)?.active, false);
});

test('notification copy is localized and points to the workspace overview', () => {
  assert.equal(notificationForWatch('available', 'de', 'Dune').title, 'Jetzt verfügbar');
  assert.equal(notificationForWatch('available', 'en', 'Dune').title, 'Now available');
  assert.equal(notificationForWatch('available', 'de', 'Dune').href, '/overview/');
});

test('a scan emits one notification per transition and deactivates when available', async () => {
  saveMediaUser({ owner: 'alice', seerrUserId: 2, seerrEmail: null, seerrUsername: 'philipp' });
  upsertMediaWatch(watch());

  const processing = await runMediaWatchScan({
    requests: async () => [request({ mediaStatus: 3 })],
  });
  assert.equal(processing.events, 1);
  assert.equal(notificationsOf('alice')[0]?.title, 'Anfrage freigegeben');
  assert.equal(mediaWatchOf('alice', 'movie', 438631, false)?.lastStatus, 'processing');

  const available = await runMediaWatchScan({
    requests: async () => [request({ mediaStatus: 5 })],
  });
  assert.equal(available.events, 1);
  assert.equal(notificationsOf('alice')[0]?.title, 'Jetzt verfügbar');
  assert.equal(mediaWatchOf('alice', 'movie', 438631, false)?.active, false);

  const again = await runMediaWatchScan({
    requests: async () => [request({ mediaStatus: 5 })],
  });
  assert.equal(again.events, 0);
  assert.equal(notificationsOf('alice').length, 2);
});

test('a first scan backfills active legacy requests without notifying', async () => {
  saveMediaUser({ owner: 'alice', seerrUserId: 2, seerrEmail: null, seerrUsername: 'philipp' });
  const result = await runMediaWatchScan({
    requests: async () => [request({ mediaStatus: 3 })],
    title: async () => ({ title: 'Dune' }) as never,
  });
  assert.equal(result.backfilled, 1);
  assert.equal(notificationsOf('alice').length, 0);
  assert.equal(mediaWatchOf('alice', 'movie', 438631, false)?.lastStatus, 'processing');

  const second = await runMediaWatchScan({
    requests: async () => [request({ mediaStatus: 3 })],
    title: async () => ({ title: 'Dune' }) as never,
  });
  assert.equal(second.backfilled, 0);
  assert.equal(notificationsOf('alice').length, 0);
});
