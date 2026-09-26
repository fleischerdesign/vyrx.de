// Prüft den gebauten Server darauf, dass er nichts Fremdes erwartet.
//
// Warum es diese Prüfung gibt: das Artefakt wird ohne `node_modules`
// ausgeliefert. Steht im Serverbaum ein `import` auf eine fremde Abhängigkeit,
// startet der Prozess in der Produktion nicht - und zwar erst dort, weil lokal
// die `node_modules` daneben liegen. Genau das ist passiert; ein grüner Bau hat
// es nicht gemeldet.
//
// Erlaubt sind nur: `node:*` (eingebaut), `astro:*` (virtuell), relative und
// absolute Pfade. Alles andere ist ein Fehler und nennt Datei und Paket.
//
// Usage: node scripts/verify-server.mjs [serverDir]

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist/server';
const ALLOWED = /^(node:|astro:|\.{1,2}\/|\/)/;
const FILES = /\.(mjs|js)$/;

function walk(directory, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, found);
    else if (FILES.test(entry.name)) found.push(path);
  }
  return found;
}

const specifiers = [
  /(?:^|[\s;{}()])(?:import|export)[^'"`;]*?from\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];

const problems = [];
let checked = 0;

for (const file of walk(root)) {
  const source = readFileSync(file, 'utf8');
  checked += 1;
  for (const pattern of specifiers) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (ALLOWED.test(specifier)) continue;
      problems.push(`${file}: imports '${specifier}', which the artifact does not ship`);
    }
  }
}

if (problems.length > 0) {
  for (const problem of [...new Set(problems)]) console.error(`verify-server: ${problem}`);
  console.error(`verify-server: ${problems.length} external import(s) remain in ${root}; the artifact would not start`);
  process.exit(1);
}

console.log(`ok: ${checked} server file(s) carry no external import`);
