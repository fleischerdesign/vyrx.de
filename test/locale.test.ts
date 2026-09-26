import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCALES, pathFor, routeFrom, switchLocale } from '../src/lib/locale.ts';

test('the start page is flat in both languages', () => {
  assert.equal(pathFor('de', 'start'), '/');
  assert.equal(pathFor('en', 'start'), '/en/');
});

test('english lives under a prefix, german does not', () => {
  assert.equal(pathFor('de', 'services'), '/services/');
  assert.equal(pathFor('en', 'services'), '/en/services/');
});

test('a detail address carries its identifier', () => {
  const path = pathFor('de', 'service', 'home automation');
  assert.equal(path, '/services/home%20automation/');
  const parsed = routeFrom(path);
  assert.equal(parsed.locale, 'de');
  assert.equal(parsed.name, 'service');
  assert.equal(parsed.param, 'home automation');
});

test('an article is not mistaken for the index', () => {
  assert.equal(routeFrom('/knowledge/').name, 'knowledge');
  assert.equal(routeFrom('/en/knowledge/drucker/').name, 'article');
});

test('an unknown address is a miss, not the overview', () => {
  assert.equal(routeFrom('/gibt-es-nicht/').name, 'notFound');
  assert.equal(routeFrom('/').name, 'start');
});

test('the language switch keeps the view', () => {
  assert.equal(switchLocale('de', '/services/'), '/en/services/');
  assert.equal(switchLocale('en', '/en/knowledge/drucker/'), '/knowledge/drucker/');
});

test('every locale has a start address', () => {
  for (const locale of LOCALES) {
    assert.equal(routeFrom(pathFor(locale, 'start')).name, 'start');
  }
});
