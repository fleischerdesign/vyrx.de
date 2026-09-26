import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fleetSchema, type Fleet } from '../src/lib/fleet.ts';

const fixture = (): unknown => JSON.parse(readFileSync('fixtures/fleet.example.json', 'utf8'));

export const fleetFixture = (): Fleet => fleetSchema.parse(fixture());

test('the fixture is a valid projection', () => {
  assert.equal(fleetSchema.safeParse(fixture()).success, true);
});

test('an unknown shape is rejected instead of guessed', () => {
  assert.equal(fleetSchema.safeParse({ schema: 1 }).success, false);
  assert.equal(fleetSchema.safeParse({ ...(fixture() as object), schema: 2 }).success, false);
});

test('identifiers are slugs, not prose', () => {
  const broken = { ...(fixture() as Record<string, unknown>), services: [{ id: 'Not A Slug' }] };
  assert.equal(fleetSchema.safeParse(broken).success, false);
});

test('every service names a category that exists', () => {
  const fleet = fleetFixture();
  const known = new Set(fleet.categories.map((category) => category.id));
  for (const service of fleet.services) {
    assert.ok(known.has(service.categoryId), `${service.id} names '${service.categoryId}'`);
  }
});
