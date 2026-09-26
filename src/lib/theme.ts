/*
 * Die Darstellungswahl: eine Tatsache, ein Schlüssel, zwei Orte die ihn lesen
 * (das Startskript im Kopf und der Umschalter).
 */

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_KEY = 'vyrx.theme';
