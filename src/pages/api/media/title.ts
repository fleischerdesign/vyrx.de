import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/http.ts';
import { mediaBlock } from '../../../lib/media-blocks.ts';
import { resolveMediaUser, type MediaUserFailure } from '../../../lib/media-users.ts';
import { mediaTitle, SeerrError } from '../../../lib/seerr.ts';
import { readSession } from '../../../lib/session.ts';

/*
 * Details für den Medien-Dialog. Die Suche liefert nur die Kartenfelder;
 * Laufzeit, Genres, Regie und Cast kommen aus dem Detailendpunkt. Lesen only.
 */

export const prerender = false;

const failureText = (reason: MediaUserFailure, locale: 'de' | 'en'): string => {
  switch (reason) {
    case 'not_signed_in':
      return locale === 'de' ? 'Bitte melde dich erneut an.' : 'Please sign in again.';
    case 'not_allowed':
      return locale === 'de' ? 'Dein Konto ist nicht in media-users.' : 'Your account is not in media-users.';
    case 'not_visible':
      return locale === 'de' ? 'Der Mediendienst ist für dich nicht sichtbar.' : 'The media service is not visible.';
    case 'not_linked':
      return locale === 'de' ? 'Dein Seerr-Konto ist nicht verknüpft.' : 'Your Seerr account is not linked.';
    case 'ambiguous':
      return locale === 'de' ? 'Dein Seerr-Konto ist nicht eindeutig.' : 'Your Seerr account is ambiguous.';
    case 'seerr_unavailable':
      return locale === 'de' ? 'Seerr ist gerade nicht erreichbar.' : 'Seerr is currently unavailable.';
  }
};

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, max-age=60',
    },
  });

export const GET: APIRoute = async ({ request, url }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden', message: 'Forbidden' });

  const session = readSession(request);
  const locale: 'de' | 'en' = url.searchParams.get('locale') === 'en' ? 'en' : 'de';
  if (!session.identity) return reply(401, { error: 'not_signed_in', message: failureText('not_signed_in', locale) });

  const mediaType = url.searchParams.get('mediaType');
  const tmdbId = Number(url.searchParams.get('tmdbId'));
  if ((mediaType !== 'movie' && mediaType !== 'tv') || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return reply(400, { error: 'invalid_title', message: 'Invalid title' });
  }

  const mediaUser = await resolveMediaUser(session);
  if ('reason' in mediaUser) {
    return reply(mediaUser.reason === 'not_signed_in' ? 401 : 403, {
      error: mediaUser.reason,
      message: failureText(mediaUser.reason, locale),
    });
  }

  try {
    const item = await mediaTitle(session, mediaUser.user.id, mediaType, tmdbId, locale);
    if (!item) return reply(404, { error: 'not_found', message: 'Title not found' });
    return reply(200, { item: mediaBlock(item) });
  } catch (error) {
    if (error instanceof SeerrError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'forbidden' ? 403 : error.code === 'rate' ? 429 : 502;
      return reply(status, { error: error.code, message: failureText('seerr_unavailable', locale) });
    }
    return reply(502, { error: 'seerr_unavailable', message: failureText('seerr_unavailable', locale) });
  }
};
