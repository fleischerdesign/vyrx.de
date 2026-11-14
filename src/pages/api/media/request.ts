import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/http.ts';
import { resolveMediaUser, type MediaUserFailure } from '../../../lib/media-users.ts';
import { ownRequests, requestMedia, SeerrError } from '../../../lib/seerr.ts';
import { readSession } from '../../../lib/session.ts';
import {
  consumeMediaProposal,
  countRecentMediaProposals,
  finishMediaProposal,
  mediaProposalOf,
  recordAction,
} from '../../../lib/store.ts';

/*
 * Die eine schreibende Medienroute.
 *
 * Der Client schickt nur eine Proposal-ID. Der Server liest den Payload aus
 * SQLite, prüft Actor, Ablauf und Einmaligkeit und setzt X-Api-User aus dem
 * gespeicherten Mapping. Ein zweiter Klick kann nicht doppelt schreiben; nach
 * einem unklaren Timeout wird geprüft, nicht blind wiederholt.
 */

export const prerender = false;

type Locale = 'de' | 'en';
type Outcome = 'accepted' | 'already' | 'refused' | 'quota' | 'rate' | 'unknown' | 'failed';

const text = (locale: Locale, outcome: Outcome | 'disabled' | 'used' | 'expired' | 'mapping_changed' | 'not_linked'): string => {
  const messages: Record<string, { de: string; en: string }> = {
    accepted: {
      de: 'Die Anfrage wurde an Seerr übergeben.',
      en: 'The request was submitted to Seerr.',
    },
    already: {
      de: 'Für diesen Film gibt es bereits eine Anfrage, oder er ist schon verfügbar.',
      en: 'This film is already requested or available.',
    },
    refused: {
      de: 'Seerr hat die Anfrage abgelehnt. Prüfe Freigabe oder Limit.',
      en: 'Seerr refused the request. Check permission or quota.',
    },
    quota: {
      de: 'Dein Seerr-Limit ist erreicht.',
      en: 'Your Seerr quota is exhausted.',
    },
    rate: {
      de: 'Zu viele Anfragen in kurzer Zeit. Bitte später erneut versuchen.',
      en: 'Too many requests in a short time. Please try again later.',
    },
    unknown: {
      de: 'Der Ausgang ist unklar. Ich habe nicht erneut geschrieben; prüfe die Anfrage bitte in Seerr.',
      en: 'The outcome is unknown. I did not retry; please check the request in Seerr.',
    },
    failed: {
      de: 'Die Anfrage ist fehlgeschlagen.',
      en: 'The request failed.',
    },
    disabled: {
      de: 'Anfragen sind in dieser Ausbaustufe noch nicht freigeschaltet.',
      en: 'Requests are not enabled in this phase.',
    },
    used: {
      de: 'Diese Bestätigung wurde bereits verwendet.',
      en: 'This confirmation was already used.',
    },
    expired: {
      de: 'Diese Bestätigung ist abgelaufen. Bitte erneut vorbereiten.',
      en: 'This confirmation has expired. Please prepare it again.',
    },
    mapping_changed: {
      de: 'Die Seerr-Zuordnung hat sich geändert. Bitte erneut vorbereiten.',
      en: 'The Seerr mapping changed. Please prepare it again.',
    },
    not_linked: {
      de: 'Dein Seerr-Konto ist nicht verknüpft.',
      en: 'Your Seerr account is not linked.',
    },
  };
  return messages[outcome]?.[locale] ?? outcome;
};

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const failureText = (reason: MediaUserFailure, locale: Locale): string => {
  switch (reason) {
    case 'not_signed_in':
      return locale === 'de' ? 'Bitte melde dich erneut an.' : 'Please sign in again.';
    case 'not_allowed':
      return locale === 'de' ? 'Dein Konto gehört nicht zur Gruppe media-users.' : 'Your account is not in media-users.';
    case 'not_visible':
      return locale === 'de' ? 'Die Medienwünsche sind für dich nicht sichtbar.' : 'Media requests are not visible to you.';
    case 'ambiguous':
      return locale === 'de' ? 'Dein Seerr-Konto ist nicht eindeutig zugeordnet.' : 'Your Seerr account is ambiguous.';
    case 'seerr_unavailable':
      return locale === 'de' ? 'Seerr ist gerade nicht erreichbar.' : 'Seerr is currently unavailable.';
    case 'not_linked':
      return text(locale, 'not_linked');
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return reply(403, { outcome: 'refused', message: 'Forbidden' });

  const session = readSession(request);
  if (!session.identity) return reply(401, { outcome: 'refused', message: 'Unauthorized' });

  let body: { proposalId?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as { proposalId?: unknown; locale?: unknown };
  } catch {
    return reply(400, { outcome: 'failed', message: 'Invalid body' });
  }
  const locale: Locale = body.locale === 'en' ? 'en' : 'de';
  const proposalId = typeof body.proposalId === 'string' ? body.proposalId.trim() : '';

  if (!session.identity.groups.includes('media-users')) {
    return reply(403, { outcome: 'refused', message: failureText('not_allowed', locale) });
  }
  if (process.env.PORTAL_MEDIA_REQUESTS !== 'on') {
    return reply(503, { outcome: 'disabled', message: text(locale, 'disabled') });
  }
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(proposalId)) {
    return reply(400, { outcome: 'failed', message: 'Invalid proposal' });
  }

  const proposal = mediaProposalOf(proposalId, session.identity.username);
  if (!proposal) return reply(404, { outcome: 'used', message: text(locale, 'used') });
  if (proposal.consumedAt) return reply(409, { outcome: 'used', message: text(locale, 'used') });
  if (Date.parse(proposal.expiresAt) <= Date.now()) {
    consumeMediaProposal(proposal.id, proposal.actor, 'expired', null);
    return reply(410, { outcome: 'expired', message: text(locale, 'expired') });
  }

  const mediaUser = await resolveMediaUser(session);
  if ('reason' in mediaUser) {
    return reply(409, { outcome: 'refused', message: failureText(mediaUser.reason, locale) });
  }
  if (mediaUser.user.id !== proposal.payload.seerrUserId) {
    return reply(409, { outcome: 'mapping_changed', message: text(locale, 'mapping_changed') });
  }

  if (countRecentMediaProposals(session.identity.username, new Date(Date.now() - 60_000).toISOString()) >= 3) {
    return reply(429, { outcome: 'rate', message: text(locale, 'rate') });
  }
  if (countRecentMediaProposals(session.identity.username, new Date(Date.now() - 86_400_000).toISOString()) >= 20) {
    return reply(429, { outcome: 'rate', message: text(locale, 'rate') });
  }

  // Claim before the external write: a second click or a retry can never
  // produce a second request.
  if (!consumeMediaProposal(proposal.id, proposal.actor, 'pending', null)) {
    return reply(409, { outcome: 'used', message: text(locale, 'used') });
  }

  let outcome: Outcome = 'failed';
  let requestId: number | null = null;
  try {
    const result = await requestMedia(session, mediaUser.user.id, {
      mediaType: 'movie',
      tmdbId: proposal.payload.tmdbId,
    });
    outcome = 'accepted';
    requestId = result.requestId;
  } catch (error) {
    if (error instanceof SeerrError) {
      switch (error.code) {
        case 'duplicate':
          outcome = 'already';
          break;
        case 'forbidden':
          outcome = 'refused';
          break;
        case 'rate':
          outcome = 'rate';
          break;
        case 'unavailable': {
          // The write may have happened. Check the user's requests; never retry.
          try {
            const requests = await ownRequests(session, mediaUser.user.id, 20);
            const existing = requests.find(
              (entry) => entry.tmdbId === proposal.payload.tmdbId && (entry.mediaType === 'movie' || entry.mediaType === null),
            );
            if (existing) {
              outcome = 'accepted';
              requestId = existing.id;
            } else {
              outcome = 'unknown';
            }
          } catch {
            outcome = 'unknown';
          }
          break;
        }
        default:
          outcome = 'failed';
      }
    } else {
      outcome = 'failed';
    }
  }

  finishMediaProposal(proposal.id, outcome, { requestId });
  recordAction({
    actor: session.identity.username,
    serviceId: proposal.serviceId,
    actionId: proposal.actionId,
    outcome: outcome === 'accepted' ? 'accepted' : outcome === 'failed' || outcome === 'unknown' ? 'failed' : 'refused',
  });

  return reply(200, {
    outcome,
    requestId,
    message: text(locale, outcome),
  });
};
