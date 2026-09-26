// Die eine Prüfung, die die *gebaute* Gestaltung liest statt die Quellen.
//
// Warum getrennt von `npm run test`: welche Farbe ein Zustandspunkt wirklich
// hat, entscheidet die Kaskade im ausgelieferten Stylesheet - nicht die
// Absicht in `tokens.css`. Diese Prüfung liest deshalb die gebaute CSS-Datei
// und vergleicht die Zustandsfarben mit der Fläche, auf der sie liegen.
//
// Geprüft wird 3:1, nicht 4.5:1: die Punktfarbe steht nie allein, ihr Label
// trägt die Bedeutung. Aber ein Punkt, den niemand sieht, ist kein Punkt.
//
// Usage: node scripts/verify-contrast.mjs [cssDir]

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dir = join(root, process.argv[2] ?? 'dist/client/_astro');
const MIN = 3;

const css = readdirSync(dir)
  .filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(join(dir, file), 'utf8'))
  .join('\n');

function blockFrom(openIndex) {
  if (openIndex < 0) return '';
  const close = css.indexOf('}', openIndex);
  return close < 0 ? '' : css.slice(openIndex + 1, close);
}

const light = blockFrom(css.indexOf('{', css.indexOf(':root')));
// Der Minifier darf die Anführungszeichen weglassen: `data-theme=dark`.
const darkStart = css.search(/data-theme=["']?dark/);
const dark = darkStart < 0 ? '' : blockFrom(css.indexOf('{', darkStart));

function declaration(block, name) {
  const match = block.match(new RegExp(`${name.replace(/[-]/g, '\\-')}\\s*:\\s*([^;]+)`));
  return match?.[1]?.trim() ?? null;
}

function color(value) {
  if (!value) return null;
  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3) digits = [...digits].map((d) => d + d).join('');
    if (digits.length === 4) digits = [...digits].map((d) => d + d).join('');
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) return parts;
  }
  return null;
}

const luminance = ([r, g, b]) => {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const states = ['--ok', '--bad', '--warn', '--unknown'];
const surfaces = [declaration(light, '--surface'), declaration(dark, '--surface')].filter(Boolean);

if (surfaces.length === 0) {
  console.error('verify-contrast: no --surface found in the built stylesheet');
  process.exit(1);
}

let failures = 0;
for (const surfaceValue of surfaces) {
  const surface = color(surfaceValue);
  if (!surface) continue;
  for (const state of states) {
    const stateValue = declaration(light, state) ?? declaration(dark, state);
    const tone = color(stateValue ?? '');
    if (!tone) {
      console.error(`verify-contrast: ${state} is not a colour (${stateValue})`);
      failures += 1;
      continue;
    }
    const value = ratio(tone, surface);
    if (value < MIN) {
      console.error(`verify-contrast: ${state} ${stateValue} on ${surfaceValue} is ${value.toFixed(2)}:1`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`verify-contrast: ${failures} tone(s) below ${MIN}:1`);
  process.exit(1);
}

console.log(`ok: ${states.length} state colours reach ${MIN}:1 on ${surfaces.length} surface(s)`);
