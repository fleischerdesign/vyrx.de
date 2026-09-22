// The icon set, declared once.
//
// Lucide is the source of the geometry: the sprite is generated from `ICONS` at build time
// (`components/IconSprite.astro`), and both renderers reference the same `<symbol>` by id - the Astro
// shell for the dock and the drawer, the client views for the tiles. One geometry per icon in one
// document, no runtime script, no per-icon request.
//
// `ICONS` is the only place that names an icon, so a name that is not declared here is a defect rather
// than an empty square: `icon()` throws while the shell is being rendered (the build fails) and renders
// a red marker in the browser, for the same reason the translations do.

export const ICONS = [
  'home',
  'layout-list',
  'activity',
  'settings',
  'shield',
  'menu',
  'search',
  'star',
];

const MARKER = (name) =>
  `<span class="badge badge-error badge-xs" role="img" aria-label="undeclared icon ${name}">${name}</span>`;

// The wrapper carries the presentation - size, colour (`currentColor`), stroke - so every icon is
// consistent and the symbol itself stays pure geometry. A decorative icon is `aria-hidden`; a
// meaningful one gets a label, because a glyph alone is not a name.
export function icon(name, { size = 'size-5', filled = false, label = null } = {}) {
  if (!ICONS.includes(name)) {
    if (typeof document === 'undefined') {
      throw new Error(`icon "${name}" is not declared in src/lib/icons.js`);
    }
    return MARKER(name);
  }
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  const fill = filled ? ' fill="currentColor"' : '';
  return (
    `<svg class="${size} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" ${a11y}${fill}><use href="#i-${name}"></use></svg>`
  );
}
