import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import {
  closeStore,
  favoritesOf,
  markOnboarding,
  onboardingStateOf,
  resetOnboarding,
  setFavorites,
} from '../src/lib/store.ts';

let directory = '';
const previous = { ...process.env };

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'vyrx-onboarding-'));
  process.env.PORTAL_STORE = join(directory, 'portal.sqlite');
  closeStore();
});

afterEach(() => {
  closeStore();
  process.env = { ...previous };
  rmSync(directory, { recursive: true, force: true });
});

test('onboarding state is per owner and survives a reload', () => {
  assert.equal(onboardingStateOf('alice'), null);
  markOnboarding('alice', 'welcomeSeenAt');
  markOnboarding('alice', 'favoritesDoneAt');
  markOnboarding('alice', 'notificationsDoneAt');
  const state = onboardingStateOf('alice');
  assert.ok(state?.welcomeSeenAt);
  assert.ok(state?.favoritesDoneAt);
  assert.ok(state?.notificationsDoneAt);
  assert.equal(state?.assistantDoneAt, null);
  assert.equal(onboardingStateOf('bob'), null);
  resetOnboarding('alice');
  assert.equal(onboardingStateOf('alice'), null);
});

test('favorite selection replaces the previous set atomically', () => {
  setFavorites('alice', ['home-automation', 'media-requests']);
  assert.deepEqual(favoritesOf('alice'), ['home-automation', 'media-requests']);
  setFavorites('alice', ['recipes']);
  assert.deepEqual(favoritesOf('alice'), ['recipes']);
});
