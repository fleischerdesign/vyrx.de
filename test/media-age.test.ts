import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterMediaByAge } from '../src/lib/media-age.ts';
import type { MediaItem } from '../src/lib/seerr.ts';
import type { Session } from '../src/lib/session.ts';

const item = (tmdbId: number, title: string): MediaItem => ({
  tmdbId,
  mediaType: 'movie',
  title,
  year: '2024',
  overview: '',
  posterPath: null,
  backdropPath: null,
  rating: null,
  releaseDate: null,
  runtime: null,
  tagline: null,
  genres: [],
  director: null,
  cast: [],
  voteCount: null,
  numberOfSeasons: null,
  numberOfEpisodes: null,
  seasons: [],
  trailerKey: null,
  status: 'unknown',
  statusText: 'Anfragen',
  requestable: true,
});

const session = { identity: null, fleet: null, isAdmin: false, services: [] } satisfies Session;

test('the German FSK filter excludes unrated and higher-rated candidates', async () => {
  const previous = { ...process.env };
  process.env.PORTAL_SEERR_URL = 'https://seerr.example/';
  process.env.PORTAL_SEERR_API_KEY = 'test-key';
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    const id = url.includes('/movie/1') ? 1 : 2;
    const certification = id === 1 ? '12' : '18';
    return new Response(
      JSON.stringify({
        id,
        mediaType: 'movie',
        title: id === 1 ? 'Family Film' : 'Adult Film',
        releaseDate: '2024-01-01',
        releases: { results: [{ iso_3166_1: 'DE', release_dates: [{ certification }] }] },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  try {
    const result = await filterMediaByAge(session, 2, [item(1, 'Family Film'), item(2, 'Adult Film'), item(3, 'Unrated')], 12);
    assert.deepEqual(result.map((entry) => entry.title), ['Family Film']);
  } finally {
    globalThis.fetch = original;
    process.env = previous;
  }
});
