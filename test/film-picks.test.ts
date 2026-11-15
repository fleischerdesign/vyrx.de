import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { filmPicks } from '../src/lib/routines/film-picks.ts';
import { closeStore, saveMediaUser } from '../src/lib/store.ts';

let directory = '';
const previous = { ...process.env };

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'vyrx-film-picks-'));
  process.env.PORTAL_STORE = join(directory, 'portal.sqlite');
  process.env.PORTAL_FLEET = 'fixtures/fleet.example.json';
  process.env.PORTAL_SEERR_URL = 'https://seerr.example/';
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  closeStore();
  saveMediaUser({ owner: 'alice', seerrUserId: 7, seerrEmail: 'alice@example.test', seerrUsername: 'alice' });
});

afterEach(() => {
  closeStore();
  process.env = { ...previous };
  rmSync(directory, { recursive: true, force: true });
});

test('film picks returns three requestable movies as a notification body', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        results: [
          { id: 1, mediaType: 'movie', title: 'Dune', releaseDate: '2021-09-15' },
          { id: 2, mediaType: 'movie', title: 'Arrival', releaseDate: '2016-11-10' },
          { id: 3, mediaType: 'movie', title: 'Heat', releaseDate: '1995-12-15' },
          { id: 4, mediaType: 'tv', name: 'A Series', firstAirDate: '2020-01-01' },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;
  try {
    const result = await filmPicks.run({ owner: 'alice', locale: 'de', now: new Date('2026-11-16T00:00:00Z') });
    assert.match(result?.body ?? '', /Dune/);
    assert.match(result?.body ?? '', /Arrival/);
    assert.match(result?.body ?? '', /Heat/);
    assert.doesNotMatch(result?.body ?? '', /A Series/);
    assert.equal(result?.title, 'Deine Filmabend-Ideen');
  } finally {
    globalThis.fetch = original;
  }
});
