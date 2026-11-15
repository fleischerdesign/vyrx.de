import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/http.ts';
import { resolveMediaUser } from '../../../lib/media-users.ts';
import { mediaStatusByTitle, SeerrError } from '../../../lib/seerr.ts';
import { readSession } from '../../../lib/session.ts';
import { notifyOwner } from '../../../lib/web-push.ts';
import { recordMediaStatusSeen } from '../../../lib/store.ts';

/*
 * Kleiner Statusabgleich nach einer Anfrage. Der Seerr-Detailendpunkt trägt
 * keinen mediaInfo-Status; die Titelsuche schon. Deshalb wird exakt der
 * gesuchte tmdbId/Medientyp aus der Suche herausgefiltert.
 */

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request, url }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const session = readSession(request);
  if (!session.identity) return reply(401, { error: 'not_signed_in' });
  if (!session.identity.groups.includes('media-users')) return reply(403, { error: 'not_allowed' });

  const mediaType = url.searchParams.get('mediaType');
  const tmdbId = Number(url.searchParams.get('tmdbId'));
  const title = url.searchParams.get('title')?.trim() ?? '';
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'de';
  if ((mediaType !== 'movie' && mediaType !== 'tv') || !Number.isInteger(tmdbId) || tmdbId <= 0 || !title) {
    return reply(400, { error: 'invalid_title' });
  }

  const mediaUser = await resolveMediaUser(session);
  if ('reason' in mediaUser) return reply(403, { error: mediaUser.reason });

  try {
    const item = await mediaStatusByTitle(session, mediaUser.user.id, mediaType, tmdbId, title, locale);
    if (!item) return reply(404, { error: 'not_found' });
    const owner = session.identity?.username;
    if (owner) {
      const previous = recordMediaStatusSeen(owner, mediaType, tmdbId, item.status);
      if (previous && previous !== item.status) {
        try {
          if (item.status === 'processing') {
            notifyOwner(
              owner,
              'request',
              locale === 'de' ? 'Anfrage freigegeben' : 'Request approved',
              item.title,
              locale === 'de' ? '/overview/' : '/en/overview/',
            );
          } else if (item.status === 'available') {
            notifyOwner(
              owner,
              'request',
              locale === 'de' ? 'Jetzt verfügbar' : 'Now available',
              item.title,
              locale === 'de' ? '/overview/' : '/en/overview/',
            );
          }
        } catch {
          // Status ist wichtiger als die Benachrichtigung.
        }
      }
    }
    return reply(200, { status: item.status, statusText: item.statusText });
  } catch (error) {
    if (error instanceof SeerrError) return reply(502, { error: 'seerr_unavailable' });
    return reply(502, { error: 'seerr_unavailable' });
  }
};
