// Prüft die Grenze zwischen App und Ingress.
//
// Zwei Behauptungen, beide laut:
//
//   1. **Eine öffentliche Seite liest keine Identität.** Der Ingress lässt genau
//      diese Pfade an der Anmeldung vorbei; dort kommen nie Kopfzeilen an. Eine
//      Seite, die sie trotzdem liest, zeigt still das Falsche - so blieb die
//      Übersicht unerreichbar, weil sie auf der öffentlichen Startseite lag.
//   2. **Die öffentlichen Adressen werden als Datei mitgeliefert**, damit die
//      Flotte messen kann, dass ihr Ingress genau sie ausnimmt - und nicht mehr.
//
// Usage: node scripts/verify-access.mjs

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES, PUBLIC_ROUTE_SEGMENTS, publicPathPatterns } from '../src/lib/locale.ts';

const problems = [];

// 1. Die Seiten der öffentlichen Routen dürfen die Identität nicht anfassen.
const pageFiles = [];
for (const locale of LOCALES) {
  const directory = locale === 'en' ? 'en/' : '';
  for (const segment of ['', ...PUBLIC_ROUTE_SEGMENTS]) {
    pageFiles.push(`src/pages/${directory}${segment === '' ? 'index' : segment}.astro`);
  }
}

const IDENTITY = /readSession|readIdentity|lib\/session|lib\/identity/;
for (const file of pageFiles) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    problems.push(`${file}: a public route has no page file`);
    continue;
  }
  if (IDENTITY.test(source)) {
    problems.push(`${file}: a public page reads identity, which it can never receive`);
  }
}

// 2. Was in `public/` liegt, ist eine Datei und damit öffentlich; die Muster
//    entstehen daraus und aus der Routentabelle, nicht aus einer zweiten Liste.
const staticFiles = readdirSync('public', { recursive: true })
  .map(String)
  .filter((entry) => statSync(join('public', entry)).isFile())
  .sort();

const patterns = publicPathPatterns(staticFiles);
if (patterns.includes('/*')) {
  problems.push('the public list must not make every path public');
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`verify-access: ${problem}`);
  process.exit(1);
}

mkdirSync('dist', { recursive: true });
writeFileSync('dist/public-paths.json', `${JSON.stringify(patterns, null, 2)}\n`);

console.log(
  `ok: ${pageFiles.length} public page(s) read no identity; ${patterns.length} public path pattern(s) written to dist/public-paths.json`,
);
