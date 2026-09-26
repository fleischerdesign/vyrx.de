import assert from 'node:assert/strict';
import { test } from 'node:test';
import { de } from '../src/i18n/de.ts';
import { useTranslations, type MessageKey } from '../src/i18n/index.ts';
import { LOCALES } from '../src/lib/locale.ts';

const keys = Object.keys(de) as MessageKey[];

test('every key resolves in every language', () => {
  for (const locale of LOCALES) {
    const t = useTranslations(locale);
    for (const key of keys) {
      const value = t(key);
      assert.ok(value.length > 0, `${locale}:${key} is empty`);
      assert.ok(!value.startsWith('\u27e8'), `${locale}:${key} is missing`);
    }
  }
});

test('a missing key is visible, not silent', () => {
  const t = useTranslations('de');
  assert.equal(t('doesNotExist' as MessageKey), '\u27e8doesNotExist\u27e9');
});

test('values are interpolated', () => {
  assert.equal(useTranslations('de')('overviewGreeting', { name: 'Phil' }), 'Willkommen zurück, Phil.');
  assert.equal(useTranslations('en')('statusAsOf', { time: '12:14' }), 'As of 12:14');
});

test('an unknown placeholder stays visible', () => {
  assert.equal(useTranslations('de')('overviewGreeting', {}), 'Willkommen zurück, {name}.');
});
