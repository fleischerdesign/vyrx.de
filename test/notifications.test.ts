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
  inQuietHours,
  notificationPreferencesOf,
  notificationsOf,
  pushSubscriptionsOf,
  saveNotificationPreferences,
  recordMediaStatusSeen,
  removePushSubscription,
  savePushSubscription,
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

test('push subscriptions are owner-scoped and removable only by their owner', () => {
  savePushSubscription('alice', { endpoint: 'https://push.example/a', p256dh: 'key-a', auth: 'auth-a' });
  savePushSubscription('bob', { endpoint: 'https://push.example/b', p256dh: 'key-b', auth: 'auth-b' });
  const stored = pushSubscriptionsOf('alice')[0]!;
  assert.equal(pushSubscriptionsOf('alice').length, 1);
  assert.equal(stored.createdAt.length > 0, true);
  assert.equal(stored.userAgent, null);
  assert.equal(pushSubscriptionsOf('bob').length, 1);
  assert.equal(removePushSubscription('bob', 'https://push.example/a'), false);
  assert.equal(removePushSubscription('alice', 'https://push.example/a'), true);
  assert.equal(pushSubscriptionsOf('alice').length, 0);
  assert.equal(pushSubscriptionsOf('bob').length, 1);
});

test('notification preferences default, persist and evaluate quiet hours in Berlin', () => {
  const defaults = notificationPreferencesOf('alice');
  assert.equal(defaults.request, true);
  assert.equal(defaults.quietStart, null);

  saveNotificationPreferences('alice', { quietStart: '22:00', quietEnd: '08:00', request: false });
  const saved = notificationPreferencesOf('alice');
  assert.equal(saved.request, false);
  assert.equal(inQuietHours(saved, new Date('2026-11-15T23:00:00+01:00')), true);
  assert.equal(inQuietHours(saved, new Date('2026-11-16T07:00:00+01:00')), true);
  assert.equal(inQuietHours(saved, new Date('2026-11-16T08:00:00+01:00')), false);
  assert.equal(inQuietHours(saved, new Date('2026-11-16T12:00:00+01:00')), false);
  assert.equal(notificationPreferencesOf('bob').request, true);
});
