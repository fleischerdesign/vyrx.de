import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveMediaUser } from '../src/lib/media-users.ts';
import { mediaTitle, searchMedia } from '../src/lib/seerr.ts';
import type { Session } from '../src/lib/session.ts';
import { closeStore, mediaUserOf, saveMediaUser } from '../src/lib/store.ts';

const baseSession = (groups: readonly string[] = ['media-users']): Session =>
  ({
    identity: {
      username: 'philipp',
      name: 'Philipp',
      email: 'philipp@example.test',
      uid: 'philipp-uid',
      groups,
    },
    fleet: null,
    isAdmin: false,
    services: [{ id: 'media-requests', url: 'https://seerr.test/' }],
  }) as unknown as Session;

test('searchMedia sets X-Api-Key and X-Api-User and maps availability', async () => {
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const captured = { url: '', headers: new Headers() };
  const original = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    captured.url = String(input);
    captured.headers = new Headers(init?.headers);
    return new Response(
      JSON.stringify({
        results: [
          {
            id: 438631,
            mediaType: 'movie',
            title: 'Dune',
            releaseDate: '2021-09-15',
            overview: 'Der Wüstenplanet.',
            posterPath: '/dune.jpg',
            voteAverage: 8.1,
            mediaInfo: { status: 5 },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const items = await searchMedia(baseSession(), 2, 'Dune', 'de');
    assert.equal(captured.url, 'https://seerr.test/api/v1/search?query=Dune&language=de');
    assert.equal(captured.headers.get('x-api-key'), 'test-key');
    assert.equal(captured.headers.get('x-api-user'), '2');
    assert.equal(items[0]?.title, 'Dune');
    assert.equal(items[0]?.year, '2021');
    assert.equal(items[0]?.status, 'available');
    assert.equal(items[0]?.statusText, 'verfügbar');
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_SEERR_API_KEY;
  }
});

test('a media-users identity is mapped by email and persisted', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vyrx-media-'));
  const previous = process.env.PORTAL_STORE;
  const previousKey = process.env.PORTAL_SEERR_API_KEY;
  process.env.PORTAL_STORE = join(dir, 'portal.sqlite');
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  closeStore();

  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        results: [
          {
            id: 2,
            username: 'philipp',
            email: 'philipp@example.test',
            jellyfinUsername: null,
            displayName: 'philipp',
            permissions: 34,
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

  try {
    const resolved = await resolveMediaUser(baseSession());
    assert.ok('user' in resolved);
    assert.equal(resolved.user.id, 2);
    assert.equal(mediaUserOf('philipp')?.seerrUserId, 2);
  } finally {
    globalThis.fetch = original;
    closeStore();
    if (previous === undefined) delete process.env.PORTAL_STORE;
    else process.env.PORTAL_STORE = previous;
    if (previousKey === undefined) delete process.env.PORTAL_SEERR_API_KEY;
    else process.env.PORTAL_SEERR_API_KEY = previousKey;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a family-only identity never reaches Seerr', async () => {
  let called = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    called = true;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  try {
    const resolved = await resolveMediaUser(baseSession(['family']));
    assert.deepEqual(resolved, { reason: 'not_allowed' });
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
  }
});

test('the mapping table is owner-scoped and upserts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vyrx-media-store-'));
  const previous = process.env.PORTAL_STORE;
  process.env.PORTAL_STORE = join(dir, 'portal.sqlite');
  closeStore();

  try {
    saveMediaUser({ owner: 'philipp', seerrUserId: 2, seerrEmail: 'a@example.test', seerrUsername: 'philipp' });
    saveMediaUser({ owner: 'philipp', seerrUserId: 3, seerrEmail: 'b@example.test', seerrUsername: 'philipp' });
    assert.equal(mediaUserOf('philipp')?.seerrUserId, 3);
    assert.equal(mediaUserOf('someone-else'), null);
  } finally {
    closeStore();
    if (previous === undefined) delete process.env.PORTAL_STORE;
    else process.env.PORTAL_STORE = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a detail response inherits the requested media type', async () => {
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        id: 438631,
        title: 'Dune',
        releaseDate: '2021-09-15',
        overview: 'Der Wüstenplanet.',
        posterPath: '/dune.jpg',
        voteAverage: 7.8,
        mediaInfo: { status: 1 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

  try {
    const item = await mediaTitle(baseSession(), 2, 'movie', 438631, 'de');
    assert.equal(item?.mediaType, 'movie');
    assert.equal(item?.title, 'Dune');
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_SEERR_API_KEY;
  }
});
