import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveMediaUser } from '../src/lib/media-users.ts';
import { cancelRequest, mediaService, mediaStatusByTitle, mediaTitle, requestMedia, searchMedia } from '../src/lib/seerr.ts';
import { canRequest4k } from '../src/lib/media-permissions.ts';
import type { Session } from '../src/lib/session.ts';
import {
  closeStore,
  consumeMediaProposal,
  createMediaProposal,
  finishMediaProposal,
  mediaProposalOf,
  mediaUserOf,
  saveMediaUser,
} from '../src/lib/store.ts';

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

test('requestMedia writes with X-Api-User and a movie-only body', async () => {
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const captured = { url: '', method: '', headers: new Headers(), body: '' };
  const original = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    captured.url = String(input);
    captured.method = init?.method ?? 'GET';
    captured.headers = new Headers(init?.headers);
    captured.body = typeof init?.body === 'string' ? init.body : '';
    return new Response(JSON.stringify({ id: 263, status: 1 }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await requestMedia(baseSession(), 2, { mediaType: 'movie', tmdbId: 438631 });
    assert.equal(captured.url, 'https://seerr.test/api/v1/request');
    assert.equal(captured.method, 'POST');
    assert.equal(captured.headers.get('x-api-user'), '2');
    assert.deepEqual(JSON.parse(captured.body), { mediaType: 'movie', mediaId: 438631, is4k: false });
    assert.equal(result.requestId, 263);
    assert.equal(result.status, 1);
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_SEERR_API_KEY;
  }
});

test('a proposal is actor-scoped and can be claimed once', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vyrx-proposal-'));
  const previous = process.env.PORTAL_STORE;
  process.env.PORTAL_STORE = join(dir, 'portal.sqlite');
  closeStore();

  try {
    const id = createMediaProposal({
      actor: 'philipp',
      serviceId: 'media-requests',
      actionId: 'seerr.request',
      payload: { mediaType: 'movie', tmdbId: 438631, title: 'Dune', year: '2021', seerrUserId: 2, seasons: null, is4k: false },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    assert.equal(mediaProposalOf(id, 'someone-else'), null);
    assert.equal(mediaProposalOf(id, 'philipp')?.payload.seerrUserId, 2);
    assert.equal(consumeMediaProposal(id, 'philipp', 'pending', null), true);
    assert.equal(consumeMediaProposal(id, 'philipp', 'pending', null), false);
    assert.equal(finishMediaProposal(id, 'accepted', { requestId: 263 }), true);
    assert.equal(mediaProposalOf(id, 'philipp')?.outcome, 'accepted');
  } finally {
    closeStore();
    if (previous === undefined) delete process.env.PORTAL_STORE;
    else process.env.PORTAL_STORE = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the media service supports the production jellyseerr id and the fixture id', () => {
  const production = { services: [{ id: 'jellyseerr', url: 'https://seerr.example' }] } as unknown as Session;
  const fixture = { services: [{ id: 'media-requests', url: 'https://seerr.example' }] } as unknown as Session;
  assert.equal(mediaService(production)?.id, 'jellyseerr');
  assert.equal(mediaService(fixture)?.id, 'media-requests');
});

test('searchMedia percent-encodes spaces for Seerr', async () => {
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const captured = { url: '' };
  const original = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    captured.url = String(input);
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    await searchMedia(baseSession(), 2, 'Model Citizen', 'de');
    assert.match(captured.url, /query=Model%20Citizen/);
    assert.doesNotMatch(captured.url, /query=Model\+Citizen/);
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_SEERR_API_KEY;
  }
});

test('requestMedia sends the selected TV seasons', async () => {
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const captured = { body: '' };
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    captured.body = typeof init?.body === 'string' ? init.body : '';
    return new Response(JSON.stringify({ id: 264, status: 1 }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    await requestMedia(baseSession(), 2, { mediaType: 'tv', tmdbId: 90228, seasons: [1, 2] });
    assert.deepEqual(JSON.parse(captured.body), {
      mediaType: 'tv',
      mediaId: 90228,
      seasons: [1, 2],
      is4k: false,
    });
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_SEERR_API_KEY;
  }
});

test('cancelRequest sends a DELETE for the own request id', async () => {
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const captured = { url: '', method: '' };
  const original = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    captured.url = String(input);
    captured.method = init?.method ?? 'GET';
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    await cancelRequest(baseSession(), 2, 263);
    assert.equal(captured.url, 'https://seerr.test/api/v1/request/263');
    assert.equal(captured.method, 'DELETE');
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_SEERR_API_KEY;
  }
});

test('4K permission bits and request body', async () => {
  assert.equal(canRequest4k(2, 'movie'), true);
  assert.equal(canRequest4k(1024, 'tv'), true);
  assert.equal(canRequest4k(2048, 'movie'), true);
  assert.equal(canRequest4k(2048, 'tv'), false);
  assert.equal(canRequest4k(32, 'movie'), false);

  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const captured = { body: '' };
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    captured.body = typeof init?.body === 'string' ? init.body : '';
    return new Response(JSON.stringify({ id: 265, status: 1 }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    await requestMedia(baseSession(), 2, { mediaType: 'movie', tmdbId: 438631, is4k: true });
    assert.deepEqual(JSON.parse(captured.body), { mediaType: 'movie', mediaId: 438631, is4k: true });
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_SEERR_API_KEY;
  }
});

test('mediaStatusByTitle matches the exact id and media type', async () => {
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        results: [
          { id: 1, mediaType: 'movie', title: 'Other', mediaInfo: { status: 5 } },
          { id: 438631, mediaType: 'movie', title: 'Dune', mediaInfo: { status: 3 } },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

  try {
    const item = await mediaStatusByTitle(baseSession(), 2, 'movie', 438631, 'Dune', 'de');
    assert.equal(item?.status, 'processing');
  } finally {
    globalThis.fetch = original;
    delete process.env.PORTAL_SEERR_API_KEY;
  }
});
