import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canSeeService, isAdmin, visibleCategories, visibleServices } from '../src/lib/authz.ts';
import type { Identity } from '../src/lib/identity.ts';
import { fleetFixture } from './fleet.test.ts';

const fleet = fleetFixture();

const who = (groups: readonly string[]): Identity => ({ username: 'person', name: 'Person', groups });

test('a guest sees nothing', () => {
  assert.deepEqual(visibleServices(fleet, null), []);
  assert.equal(isAdmin(fleet, null), false);
});

test('a group opens exactly its services', () => {
  const family = visibleServices(fleet, who(['family'])).map((service) => service.id);
  assert.ok(family.includes('home-automation'));
  assert.ok(family.includes('media-requests'));
  assert.ok(!family.includes('fleet-view'), 'the operations view belongs to admins');
});

test('someone in no group sees no grouped service', () => {
  const nobody = visibleServices(fleet, who([])).map((service) => service.id);
  for (const id of nobody) {
    const service = fleet.services.find((entry) => entry.id === id);
    assert.equal(service?.accessGroups.length, 0, `${id} must be open to everyone`);
  }
});

test('two different groups do not see each other by accident', () => {
  const recipes = visibleServices(fleet, who(['recipe-users'])).map((service) => service.id);
  assert.ok(recipes.includes('recipes'));
  assert.ok(!recipes.includes('fleet-view'));
  assert.ok(!recipes.includes('home-automation'));
});

test('reading is not managing', () => {
  const service = fleet.services.find((entry) => entry.id === 'fleet-view');
  assert.ok(service);
  assert.equal(canSeeService(service, who(['family'])), false);
  assert.equal(canSeeService(service, who(['infra-admins'])), true);
  const recipes = fleet.services.find((entry) => entry.id === 'recipes');
  assert.ok(recipes);
  assert.equal(canSeeService(recipes, who(['recipe-users'])), true);
});

test('admin comes from the projection, never from a name', () => {
  assert.equal(isAdmin(fleet, who(['infra-admins'])), true);
  assert.equal(isAdmin(fleet, who(['family'])), false);
});

test('categories contain only what is visible', () => {
  const categories = visibleCategories(fleet, visibleServices(fleet, who(['family'])));
  const ids = categories.flatMap((category) => category.services.map((service) => service.id));
  assert.ok(!ids.includes('fleet-view'));
  assert.ok(ids.length > 0);
});
