// The translation tables are the interface between the prose and the code: every label a person reads
// comes from them, and until now nothing held the two of them in step. They agreed by hand - and on
// 2026-09-24 they agreed by luck (84 keys each, measured once). Luck is not a rule.
//
// The rules below are deliberately agnostic. The locales are discovered from `src/i18n/*.json`, so a third
// language is a new file and not a new test. Keys are compared as sets, so this file names no key at all.
// The sources are read as text, so moving or renaming a module does not break the check.
//
//   1. every locale declares the same keys,
//   2. no value is empty - an empty label is indistinguishable from a deliberate blank,
//   3. no value carries the unresolved-key marker `⟨key⟩` that `useTranslations` renders,
//   4. every key the code asks for exists in every locale,
//   5. every declared key is asked for somewhere in `src/` - a key nothing names is dead prose,
//   6. every locale the routing announces has a table (the config and the tree agree).
//
// It needs no dependency: `node --test` is part of the runtime, the same way `node:sqlite` is
// (`06-entscheidungen.md`, E-0010). `npm run check` runs this file and `astro check` together, and
// `npm run build` runs `check` first - so a missing translation fails the build, which is what H1 asks
// for and what it did not have before.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const I18N_DIR = join(ROOT, 'src', 'i18n');
const SOURCE_DIR = join(ROOT, 'src');
const SOURCE_EXTENSIONS = ['.astro', '.ts', '.js', '.mjs'];
/** The marker `useTranslations` answers with for a key it does not have (U+27E8 / U+27E9). */
const MARKER = /[\u27e8\u27e9]/;

type Table = Record<string, string>;
type Locale = { name: string; table: Table };

const locales: Locale[] = readdirSync(I18N_DIR)
  .filter((entry) => entry.endsWith('.json'))
  .sort()
  .map((entry) => ({
    name: entry.replace(/\.json$/, ''),
    table: JSON.parse(readFileSync(join(I18N_DIR, entry), 'utf8')) as Table,
  }));

/** Every source file that ships, except the tables themselves. */
function sourceFiles(dir: string = SOURCE_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path === I18N_DIR ? [] : sourceFiles(path);
    return SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension)) ? [path] : [];
  });
}

const sources = sourceFiles();
const sourceText = sources.map((path) => readFileSync(path, 'utf8')).join('\n');

/** Every `t.<key>` in the sources. Dynamic lookups (`t[item.key]`) are covered by rule 5. */
const asked = new Set([...sourceText.matchAll(/\bt\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(([, key]) => key));
const declared = new Set(locales.flatMap(({ table }) => Object.keys(table)));

const sorted = (values: Iterable<string>) => [...values].sort();
const missing = (from: Iterable<string>, other: Set<string>) => sorted(from).filter((key) => !other.has(key));

test('the tables are found and none of them is empty', () => {
  assert.ok(locales.length >= 2, `expected at least two locales in ${I18N_DIR}, found ${locales.length}`);
  for (const { name, table } of locales) {
    assert.ok(Object.keys(table).length > 0, `${name}.json declares no key at all`);
  }
});

test('every locale declares the same keys', () => {
  const [reference, ...others] = locales;
  assert.ok(reference, 'no locale to compare against');
  const referenceKeys = new Set(Object.keys(reference.table));
  for (const { name, table } of others) {
    const keys = new Set(Object.keys(table));
    assert.deepEqual(
      missing(referenceKeys, keys),
      [],
      `${name}.json is missing keys that ${reference.name}.json has`,
    );
    assert.deepEqual(
      missing(keys, referenceKeys),
      [],
      `${name}.json declares keys that ${reference.name}.json does not have`,
    );
  }
});

test('no value is empty', () => {
  for (const { name, table } of locales) {
    for (const [key, value] of Object.entries(table)) {
      assert.equal(typeof value, 'string', `${name}.json: ${key} is not a string`);
      assert.notEqual(value.trim(), '', `${name}.json: ${key} is empty`);
    }
  }
});

test('no value carries the unresolved-key marker', () => {
  for (const { name, table } of locales) {
    for (const [key, value] of Object.entries(table)) {
      assert.ok(!MARKER.test(value), `${name}.json: ${key} contains the marker for a missing key`);
    }
  }
});

test('every key the code asks for is declared in every locale', () => {
  for (const { name, table } of locales) {
    assert.deepEqual(
      missing(asked, new Set(Object.keys(table))),
      [],
      `src/ asks for keys that ${name}.json does not declare`,
    );
  }
});

test('every declared key is asked for somewhere in src', () => {
  const orphans = sorted(declared).filter((key) => !new RegExp(`\\b${key}\\b`).test(sourceText));
  assert.deepEqual(orphans, [], 'declared in a table, named nowhere in src - dead prose or a typo');
});

test('every locale the routing announces has a table', () => {
  const config = readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8');
  const block = /locales:\s*\[([^\]]*)\]/.exec(config);
  assert.ok(block, 'astro.config.mjs no longer announces its locales in the expected shape');
  const announced = [...(block[1] ?? '').matchAll(/['"]([a-z]{2}(?:-[A-Za-z]{2})?)['"]/g)].map(([, code]) => code);
  assert.deepEqual(
    missing(announced, new Set(locales.map(({ name }) => name))),
    [],
    'the routing announces a locale that has no table',
  );
  assert.deepEqual(
    missing(locales.map(({ name }) => name), new Set(announced)),
    [],
    'a table exists for a locale the routing does not announce',
  );
});
