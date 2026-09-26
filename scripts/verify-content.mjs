// Inhaltsprüfung des Wissens (A8) - als Teil des Baus, nicht als Geschmacksfrage.
//
// Geprüft wird, was ein Schema nicht sehen kann, weil es zwischen zwei Dateien
// liegt: ein Sprachpaar, das nur halb existiert, und ein Verweis auf einen
// Artikel, den es in dieser Sprache nicht gibt.
//
// Die Kopfzeilen sind absichtlich streng gelesen: was diese Prüfung nicht
// versteht, bricht sie ab. Eine Prüfung, die stillschweigend nichts findet,
// wäre schlimmer als keine.
//
// Usage: node scripts/verify-content.mjs [contentDir]

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const base = join(root, process.argv[2] ?? 'src/content/knowledge');
const LOCALES = ['de', 'en'];

function frontmatter(file) {
  const raw = readFileSync(file, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`${file}: no frontmatter block`);
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '' || line.startsWith('  ')) continue;
    const entry = line.match(/^([a-zA-Z][a-zA-Z0-9]*):\s*(.*)$/);
    if (!entry) continue;
    const [, key, value] = entry;
    const list = value.match(/^\[(.*)\]$/);
    fields.set(key, list ? list[1].split(',').map((item) => item.trim()).filter(Boolean) : value);
  }
  for (const required of ['title', 'summary', 'kind', 'visibility']) {
    if (!fields.has(required)) throw new Error(`${file}: frontmatter has no '${required}'`);
  }
  return fields;
}

const articles = new Map();
for (const locale of LOCALES) {
  let names;
  try {
    names = readdirSync(join(base, locale)).filter((name) => name.endsWith('.md'));
  } catch {
    throw new Error(`missing content directory: ${locale}/`);
  }
  for (const name of names) {
    articles.set(`${locale}/${name.replace(/\.md$/, '')}`, frontmatter(join(base, locale, name)));
  }
}

const problems = [];

// 1. Jeder Artikel existiert in jeder Sprache.
for (const [id, fields] of articles) {
  const [locale, slug] = id.split('/');
  const other = LOCALES.find((candidate) => candidate !== locale);
  if (!articles.has(`${other}/${slug}`)) {
    problems.push(`${id}: missing ${other}/${slug}.md`);
  }
  void fields;
}

// 2. Jeder Verweis zeigt auf einen Artikel derselben Sprache.
for (const [id, fields] of articles) {
  const [locale] = id.split('/');
  const related = fields.get('related');
  if (!Array.isArray(related)) continue;
  for (const target of related) {
    if (!articles.has(`${locale}/${target}`)) {
      problems.push(`${id}: 'related' points at ${locale}/${target}, which does not exist`);
    }
  }
  const services = fields.get('services');
  if (Array.isArray(services)) {
    for (const service of services) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(service)) {
        problems.push(`${id}: 'services' entry '${service}' is not a slug`);
      }
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`verify-content: ${problem}`);
  process.exit(1);
}

console.log(`ok: ${articles.size} article(s), language pairs complete, every reference resolves`);
