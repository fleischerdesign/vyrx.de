/*
 * Zwei kleine Regeln für schreibende Anfragen.
 *
 * Ein Formular, das etwas ändert, kommt von unserer eigenen Seite. Diese Datei
 * prüft das - und sie prüft, dass ein Rücksprungziel ein Pfad in dieser App
 * ist, kein fremdes Ziel. Beides gehört zusammen: ein Formular ohne Herkunft
 * ist so verdächtig wie eine offene Weiterleitung.
 */

/** Ob die Anfrage von derselben Herkunft kommt. */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** Ein Pfad in dieser App, sonst der Rückfall. Keine fremden Ziele, kein `//host`. */
export function localPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('\\') || value.includes('\n')) return fallback;
  return value;
}

/** Ein Textfeld, begrenzt und ohne Steuerzeichen am Rand. */
export function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}
