/*
 * Sichtbarkeit als reine Regel - ohne Astro, ohne Datenbank, ohne Ansicht.
 *
 * Sie steht allein, weil sie an mehreren Stellen gilt (Liste, Direktadresse,
 * Suche) und weil eine Regel, die man prüfen kann, weniger wert ist als eine,
 * die man geprüft hat.
 */

export type Visibility = 'public' | 'internal';

/** Öffentliche Inhalte sind für alle da, interne nur für angemeldete Personen. */
export function canRead(visibility: Visibility, authenticated: boolean): boolean {
  return visibility === 'public' || authenticated;
}

export const isPublic = (visibility: Visibility): boolean => visibility === 'public';
