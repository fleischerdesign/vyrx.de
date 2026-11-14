/*
 * Seerr-Permissions, nur die Bits, die die Oberfläche braucht.
 * ADMIN schließt alles ein; sonst gilt das allgemeine 4K-Recht oder das
 * typspezifische Movie-/TV-Recht.
 */

const ADMIN = 2;
const REQUEST_4K = 1024;
const REQUEST_4K_MOVIE = 2048;
const REQUEST_4K_TV = 4096;

export type MediaKind = 'movie' | 'tv';

export function canRequest4k(permissions: number, mediaType: MediaKind): boolean {
  if (!Number.isFinite(permissions)) return false;
  if ((permissions & ADMIN) !== 0) return true;
  if ((permissions & REQUEST_4K) !== 0) return true;
  return (permissions & (mediaType === 'movie' ? REQUEST_4K_MOVIE : REQUEST_4K_TV)) !== 0;
}
