// The live parts of a view are marked, and nothing else is.
//
// Why this is a test: a tick used to re-render the whole view, so a reader who was typing a search term lost
// the text and the focus every twenty seconds - the view was rebuilt under their hands. The fix was to let
// the views say which nodes are live (`data-live`) and have the tick write only into those. That promise is
// exactly what this file pins down: if somebody marks the search field or a category chip as live, the
// reader loses them again, and the test says so before a person notices.
//
// It is agnostic about the views: it renders them and reads the markup, so a new view is covered by adding
// a case, not by rewriting the rules.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as views from '../src/lib/views.ts';
import type { AppState, Host, Service } from '../src/lib/contract.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const messages = JSON.parse(readFileSync(join(ROOT, 'src/i18n/de.json'), 'utf8')) as Record<string, string>;

const service: Service = {
  id: 'jellyfin',
  name: 'Jellyfin',
  description: { de: 'Filme und Serien.', en: 'Films and shows.' },
  category: 'Media',
  scope: 'public',
  url: 'https://jellyfin.invalid/',
  monitored: true,
};

const host: Host = { name: 'cld-edge-01', type: 'server', zone: 'mesh', monitored: true };

const state: AppState = {
  t: messages,
  locale: 'de',
  accountUrl: 'https://auth.invalid/if/user/',
  identity: { username: 'philipp', name: 'Philipp', groups: ['media-users'] },
  services: [service],
  allServices: [service],
  hosts: [host],
  adminGroups: [],
  favorites: [],
  recents: [],
  isAdmin: false,
  offline: false,
};

/** Every `data-live` value in a piece of markup, in order. */
const liveMarks = (markup: string): string[] => [...markup.matchAll(/data-live="([^"]*)"/g)].map(([, value]) => value ?? '');

test('the catalogue marks its live parts and its reader-owned parts differently', () => {
  const markup = views.services(state);
  // One marker per tile: the catalogue view has no figures of its own, and the search field belongs to the
  // reader, not to the tick.
  assert.deepEqual(liveMarks(markup), [`service:${service.id}`]);
  // The two controls a reader works with: neither may be a live node, or a tick would replace them while
  // they are in use.
  assert.match(markup, /id="service-filter"/);
  assert.doesNotMatch(markup, /id="service-filter"[^>]*data-live/);
  assert.doesNotMatch(markup, /name="category"[^>]*data-live/);
});

test('the overview marks its figures and its tiles', () => {
  const markup = views.overview(state);
  assert.ok(liveMarks(markup).includes('stats:overview'), 'the figures are live');
  assert.ok(liveMarks(markup).includes(`service:${service.id}`), 'the tiles are live');
});

test('a host card marks its state and nothing else', () => {
  const markup = views.hostCard(host, { t: messages, locale: 'de' });
  assert.deepEqual(liveMarks(markup), [`host:${host.name}`]);
});

test('the status view marks its figures and its time', () => {
  const markup = views.status(state);
  const marks = liveMarks(markup);
  assert.ok(marks.includes('stats:status'), 'the figures are live');
  assert.ok(marks.includes('asof:status'), 'the time of the read is live');
  marks.forEach((mark) => assert.match(mark, /^[a-z]+:/, `unexpected live marker "${mark}"`));
});
