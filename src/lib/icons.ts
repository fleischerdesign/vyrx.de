/*
 * Alle Symbole an einer Stelle. Ein Symbol ist Inhalt eines 24×24-Rasters und
 * erbt Farbe und Strichstärke von seinem Elternteil - so gibt es keinen
 * zweiten Symbolsatz, der auseinanderlaufen könnte.
 */

export const ICONS = {
  arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  external: '<path d="M13 5h6v6M19 5l-9 9M19 13v6H5V5h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
  activity: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3-6 8-6s8 2 8 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  book: '<path d="M12 6c-2.5-2-5.5-2-9-1v14c3.5-1 6.5-1 9 1 2.5-2 5.5-2 9-1V5c-3.5-1-6.5-1-9 1ZM12 6v14"/>',
  files: '<path d="M4 7h6l2 2h8v11H4zM4 7V4h6"/>',
  play: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/>',
  chat: '<path d="M4 4h16v13H9l-5 4z"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5zM9 12l2 2 4-4"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 13 4 4L19 7"/>',
  alert: '<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L12.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  print: '<path d="M7 8V3h10v5M7 18H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/>',
  document: '<path d="M6 3h8l4 4v14H6zM14 3v4h4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  printer: '<path d="M7 8V3h10v5M7 18H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/>',
  star: '<path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9Z"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9ZM10 18.5a2 2 0 0 0 4 0"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2H9v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L3.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2V9h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L3.2 6 6 3.2l.1.1A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-1.6V2h5v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 6l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v5h-.2a1.7 1.7 0 0 0-1.6 1Z"/>',
  command: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3Z"/>',
  sparkles: '<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** Ob ein Name aus der Projektion ein Symbol ist, das diese App kennt. */
export function isIconName(value: string | undefined): value is IconName {
  return value !== undefined && Object.prototype.hasOwnProperty.call(ICONS, value);
}

/** Das Symbol eines Dienstes, mit einem neutralen Rückfall. */
export function serviceIcon(value: string | undefined): IconName {
  return isIconName(value) ? value : 'grid';
}
