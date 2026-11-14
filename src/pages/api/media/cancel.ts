import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/http.ts';
import { resolveMediaUser } from '../../../lib/media-users.ts';
import { cancelRequest, ownRequests, SeerrError } from '../../../lib/seerr.ts';
import { readSession } from '../../../lib/session.ts';
import { recordAction } from '../../../lib/store.ts';

/*
 * Eigene offene Anfrage zurückziehen.
 *
 * Seerr erlaubt Nicht-Admins nur das Löschen einer PENDING-Anfrage. Deshalb
 * wird zuerst die eigene offene Anfrage gesucht und nur deren ID gelöscht.
 */

export const prerender = false;

type Locale = 'de' | 'en';

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return reply(403, { outcome: 'refused', message: 'Forbidden' });
  const session = readSession(request);
  if (!session.identity) return reply(401, { outcome: 'refused', message: 'Unauthorized' });

  let body: { mediaType?: unknown; tmdbId?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { outcome: 'failed', message: 'Invalid body' });
  }
  const locale: Locale = body.locale === 'en' ? 'en' : 'de';
  const mediaType = body.mediaType === 'movie' || body.mediaType === 'tv' ? body.mediaType : null;
  const tmdbId = typeof body.tmdbId === 'number' && Number.isInteger(body.tmdbId) && body.tmdbId > 0 ? body.tmdbId : null;
  if (!mediaType || !tmdbId) return reply(400, { outcome: 'failed', message: 'Invalid title' });

  if (!session.identity.groups.includes('media-users')) {
    return reply(403, { outcome: 'refused', message: locale === 'de' ? 'Keine Medienfreigabe.' : 'No media permission.' });
  }
  if (process.env.PORTAL_MEDIA_REQUESTS !== 'on') {
    return reply(503, { outcome: 'disabled', message: locale === 'de' ? 'Anfragen sind nicht freigeschaltet.' : 'Requests are not enabled.' });
  }

  const mediaUser = await resolveMediaUser(session);
  if ('reason' in mediaUser) {
    return reply(403, { outcome: 'refused', message: locale === 'de' ? 'Seerr-Konto nicht verfügbar.' : 'Seerr account unavailable.' });
  }

  try {
    const requests = await ownRequests(session, mediaUser.user.id, 50);
    const pending = requests.find(
      (entry) => entry.tmdbId === tmdbId && entry.mediaType === mediaType && entry.status === 1,
    );
    if (!pending) {
      return reply(404, {
        outcome: 'not_found',
        message: locale === 'de' ? 'Keine offene eigene Anfrage für diesen Titel.' : 'No pending request of yours for this title.',
      });
    }
    await cancelRequest(session, mediaUser.user.id, pending.id);
    recordAction({
      actor: session.identity.username,
      serviceId: mediaUser.serviceId,
      actionId: 'seerr.cancel',
      outcome: 'accepted',
    });
    return reply(200, {
      outcome: 'cancelled',
      requestId: pending.id,
      message: locale === 'de' ? 'Die offene Anfrage wurde zurückgezogen.' : 'The pending request was cancelled.',
    });
  } catch (error) {
    recordAction({
      actor: session.identity.username,
      serviceId: mediaUser.serviceId,
      actionId: 'seerr.cancel',
      outcome: 'failed',
    });
    if (error instanceof SeerrError) {
      return reply(error.code === 'forbidden' ? 403 : 502, {
        outcome: 'failed',
        message:
          error.code === 'forbidden'
            ? locale === 'de'
              ? 'Seerr erlaubt das Stornieren dieser Anfrage nicht.'
              : 'Seerr does not allow cancelling this request.'
            : locale === 'de'
              ? 'Seerr ist gerade nicht erreichbar.'
              : 'Seerr is currently unavailable.',
      });
    }
    return reply(502, { outcome: 'failed', message: locale === 'de' ? 'Stornieren fehlgeschlagen.' : 'Cancellation failed.' });
  }
};
