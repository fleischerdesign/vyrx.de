// Prüft die Adapter-Deklaration gegen die Projektion (B1, B3).
//
// Eine Deklaration, die einen Dienst erfindet, den es nicht gibt, ist tote
// Daten. Eine Deklaration, die ein Feld ohne Typ oder einen Zeiger ohne Anfang
// nennt, ist eine Lüge. Beides bricht den Bau - wie bei den Inhalten und den
// Farben.
//
// Usage: node scripts/verify-adapters.mjs

import { readFileSync } from 'node:fs';

const TYPES = ['text', 'number', 'duration', 'status', 'bytes', 'date'];
const AUTH = ['none', 'bearer', 'header', 'basic'];
const METHODS = ['POST', 'PUT', 'DELETE'];
const MAX_LIST = 10;

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

const fleet = read('fixtures/fleet.example.json');
const adapters = read('fixtures/adapters.example.json');

const problems = [];
const serviceIds = new Set(fleet.services.map((service) => service.id));

function checkField(problems, where, field) {
  if (!TYPES.includes(field.type)) problems.push(`${where}: unknown type '${field.type}'`);
  if (!String(field.pointer).startsWith('/')) problems.push(`${where}: pointer must start with '/'`);
  if (!field.label?.de) problems.push(`${where}: no German label`);
}

for (const [id, capability] of Object.entries(adapters.services ?? {})) {
  if (!serviceIds.has(id)) problems.push(`services.${id}: no such service in the projection`);

  if (!AUTH.includes(capability.auth)) problems.push(`services.${id}: unknown auth '${capability.auth}'`);
  if (capability.read && !String(capability.read.path).startsWith('/'))
    problems.push(`services.${id}: read path must start with '/'`);

  for (const field of capability.fields ?? []) {
    checkField(problems, `${id}.${field.id}`, field);
  }

  for (const list of capability.lists ?? []) {
    if (!String(list.pointer).startsWith('/')) problems.push(`services.${id}.${list.id}: pointer must start with '/'`);
    if (!Number.isInteger(list.max) || list.max < 1 || list.max > MAX_LIST)
      problems.push(`services.${id}.${list.id}: max must be between 1 and ${MAX_LIST}`);
    if (!Array.isArray(list.items) || list.items.length === 0)
      problems.push(`services.${id}.${list.id}: a list needs at least one item field`);
    for (const item of list.items ?? []) checkField(problems, `${id}.${list.id}.${item.id}`, item);
  }

  for (const action of capability.actions ?? []) {
    if (action.permission !== 'admin') problems.push(`services.${id}.${action.id}: permission must be 'admin'`);
    if (!action.confirm?.de) problems.push(`services.${id}.${action.id}: an action without a confirmation sentence`);
    if (!METHODS.includes(action.method)) problems.push(`services.${id}.${action.id}: unknown method '${action.method}'`);
    if (!String(action.path).startsWith('/')) problems.push(`services.${id}.${action.id}: path must start with '/'`);
  }
}

for (const id of Object.keys(adapters.examples ?? {})) {
  if (!adapters.services?.[id]) problems.push(`examples.${id}: an example without a declaration`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`verify-adapters: ${problem}`);
  process.exit(1);
}

const declared = Object.keys(adapters.services ?? {}).length;
const withLists = Object.values(adapters.services ?? {}).filter((entry) => (entry.lists ?? []).length > 0).length;
console.log(`ok: ${declared} adapter declaration(s), ${withLists} with a list, every one names a real service and a known shape`);
