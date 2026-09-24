// The one check that reads the *built* stylesheet instead of the sources.
//
// Why it is separate from `npm run test`: what decides the colour of a state dot is not the theme file but
// the cascade - daisyUI writes its theme, `daisy.css` overrides three values, and the later declaration
// wins. Only the artifact knows which value won, so this runs after `astro build` and answers for the file
// that ships.
//
// What it asserts: the three tones the portal actually renders (`statusBadge`, `hostCard`) reach 3:1
// against the surface they sit on (base-100 and base-200), in every theme. The label next to the dot
// already carries the meaning - that is why the bar is 3:1 and not the 4.5:1 of text - but a dot nobody
// can see is a dot that should not be there. daisyUI's defaults fail this in both themes (light success
// 1.96, light error 2.87, dark neutral 1.26), which is why `daisy.css` carries the values it carries.
//
// Usage: node scripts/verify-theme-contrast.mjs [distDir]

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const cssDir = join(ROOT, process.argv[2] ?? 'dist/client/_astro');
const SURFACES = ['base-100', 'base-200'];
const TONES = ['success', 'error', 'neutral'];
const MIN_RATIO = 3;

// ------------------------------------------------------------------------------------------------
// A very small CSS reader: enough to follow the cascade over `--color-*` in `:root` and `[data-theme]`
// blocks, inside and outside `@media (prefers-color-scheme: dark)`. Nothing else in a stylesheet is read.
// ------------------------------------------------------------------------------------------------
function declarationsIn(css) {
  /** @type {{ selector: string, dark: boolean, body: string }[]} */
  const blocks = [];
  let i = 0;
  let dark = false;
  const stack = [];

  while (i < css.length) {
    const brace = css.indexOf('{', i);
    if (brace === -1) break;
    const prelude = css.slice(i, brace).trim();
    if (prelude.startsWith('@media')) {
      stack.push(dark);
      dark = dark || /prefers-color-scheme:\s*dark/.test(prelude);
      i = brace + 1;
      continue;
    }
    // A declaration block: read to its matching brace (values may contain no nested braces here).
    const end = css.indexOf('}', brace);
    if (end === -1) break;
    blocks.push({ selector: prelude.split(',').map((s) => s.trim()), dark, body: css.slice(brace + 1, end) });
    i = end + 1;
    // Leave a media query when its closing brace is reached.
    const closer = css.indexOf('}', i);
    const next = css.indexOf('{', i);
    if (closer !== -1 && (next === -1 || closer < next) && stack.length) {
      dark = stack.pop();
      i = closer + 1;
    }
  }
  return blocks.flatMap(({ selector, dark: inDark, body }) =>
    selector.map((one) => ({ selector: one, dark: inDark, body })),
  );
}

/** The value in force for a colour, following the order the stylesheet declares them. */
function effective(blocks, theme, colour) {
  let value = null;
  for (const block of blocks) {
    const belongs = theme === 'dark'
      ? block.selector === '[data-theme=dark]' || (block.dark && block.selector === ':root')
      : block.selector === ':root' && !block.dark || block.selector === '[data-theme=light]';
    if (!belongs) continue;
    const found = new RegExp(`--color-${colour}\\s*:\\s*([^;]+)`).exec(block.body);
    if (found) value = found[1].trim();
  }
  return value;
}

// ------------------------------------------------------------------------------------------------
// oklch -> sRGB -> relative luminance, then the WCAG contrast ratio.
// ------------------------------------------------------------------------------------------------
function luminance(value, context) {
  const found = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(value ?? '');
  if (!found) throw new Error(`${context}: expected an oklch() colour, got "${value}"`);
  const L = Number(found[1]) / (found[2] === '%' ? 100 : 1);
  const C = Number(found[3]);
  const h = (Number(found[4]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

const ratio = (foreground, background, context) => {
  const a = luminance(foreground, context);
  const b = luminance(background, context);
  const [low, high] = a < b ? [a, b] : [b, a];
  return (high + 0.05) / (low + 0.05);
};

// ------------------------------------------------------------------------------------------------
const files = readdirSync(cssDir).filter((name) => name.endsWith('.css'));
if (!files.length) {
  console.error(`verify-theme-contrast: no stylesheet in ${cssDir} - build first.`);
  process.exit(1);
}

const blocks = files.flatMap((name) => declarationsIn(readFileSync(join(cssDir, name), 'utf8')));
const themes = ['light', 'dark'];
const failures = [];

console.log('Kontrast der Zustandspunkte gegen die Fläche, auf der sie liegen (mindestens 3:1)\n');
for (const theme of themes) {
  for (const tone of TONES) {
    const colour = effective(blocks, theme, tone);
    for (const surface of SURFACES) {
      const background = effective(blocks, theme, surface);
      if (!colour || !background) {
        failures.push(`${theme}/${tone}/${surface}: value missing from the built stylesheet`);
        continue;
      }
      const value = ratio(colour, background, `${theme}/${tone}`);
      const verdict = value >= MIN_RATIO ? 'ok  ' : 'FAIL';
      console.log(`  ${verdict} ${theme.padEnd(5)} status-${tone.padEnd(8)} auf ${surface.padEnd(8)} ${value.toFixed(2)}:1`);
      if (value < MIN_RATIO) {
        failures.push(`${theme}: status-${tone} on ${surface} is ${value.toFixed(2)}:1 (wants ${MIN_RATIO}:1)`);
      }
    }
  }
}

if (failures.length) {
  console.error('\nverify-theme-contrast: the state dots are not visible enough.');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nFix the values in src/styles/daisy.css (bare "status-*" colours are never used for text).');
  process.exit(1);
}
console.log('\nverify-theme-contrast: all state dots pass.');
