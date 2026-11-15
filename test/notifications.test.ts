import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import {
  closeStore,
  createNotification,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsOf,
  recordMediaStatusSeen,
  unreadNotificationCount,
} from '../src/lib/store.ts';

let directory = '';
let previous: string | undefined;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'vyrx-notifications-'));
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

test('notifications are owner-scoped and read state is counted', () => {
  const id = createNotification('alice', 'request', 'Anfrage übergeben', 'Dune');
  createNotification('alice', 'request', 'Jetzt verfügbar', 'Dune');
  createNotification('bob', 'request', 'Fremd', null);

  assert.equal(unreadNotificationCount('alice'), 2);
  assert.equal(unreadNotificationCount('bob'), 1);
  assert.equal(notificationsOf('alice').length, 2);
  assert.equal(notificationsOf('bob').length, 1);

  assert.equal(markNotificationRead(id, 'bob'), false);
  assert.equal(markNotificationRead(id, 'alice'), true);
  assert.equal(unreadNotificationCount('alice'), 1);
  assert.equal(markAllNotificationsRead('alice'), 1);
  assert.equal(unreadNotificationCount('alice'), 0);
});

test('media status transitions are recorded once per owner and title', () => {
  assert.equal(recordMediaStatusSeen('alice', 'movie', 438631, 'requested'), null);
  assert.equal(recordMediaStatusSeen('alice', 'movie', 438631, 'processing'), 'requested');
  assert.equal(recordMediaStatusSeen('alice', 'movie', 438631, 'processing'), 'processing');
  assert.equal(recordMediaStatusSeen('bob', 'movie', 438631, 'requested'), null);
});
