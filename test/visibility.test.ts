import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canRead, isPublic } from '../src/lib/visibility.ts';

test('a public article is readable without signing in', () => {
  assert.equal(canRead('public', false), true);
  assert.equal(isPublic('public'), true);
});

test('an internal article needs an identity, whatever the name', () => {
  assert.equal(canRead('internal', false), false);
  assert.equal(canRead('internal', true), true);
  assert.equal(isPublic('internal'), false);
});
