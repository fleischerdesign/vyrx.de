import type { APIRoute } from 'astro';
import { mayManage } from '../../lib/authz.ts';
import { performAction, type ActionOutcome } from '../../lib/adapters.ts';
import { isSameOrigin, localPath } from '../../lib/http.ts';
import { readSession } from '../../lib/session.ts';
import { loadAdapters } from '../../lib/adapters.ts';
import { recordAction } from '../../lib/store.ts';

/*
 * Eine Aktion ist ein Eingriff. Deshalb gilt hier alles zusammen:
 * gleiche Herkunft, angemeldet, **verwalten** dürfen (nicht nur sehen), die
 * Aktion muss deklariert und angebunden sein - und am Ende steht eine Zeile im
 * Protokoll, auch wenn sie abgelehnt wurde.
 */
export const prerender = false;

const back = (next: string, action: string, result: ActionOutcome): Response =>
  new Response(null, {
    status: 303,
    headers: { location: `${next}${next.includes('?') ? '&' : '?'}action=${encodeURIComponent(action)}&result=${result}` },
  });

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const session = readSession(request);
  const form = await request.formData();
  const next = localPath(form.get('next'), '/');
  const actionId = String(form.get('action') ?? '');
  const serviceId = String(form.get('service') ?? '');
  const service = session.services.find((entry) => entry.id === serviceId);

  if (!session.identity) return new Response(null, { status: 401 });
  if (!service) return new Response(null, { status: 404 });

  const actor = session.identity.username;

  if (!mayManage(service, session.identity)) {
    recordAction({ actor, serviceId, actionId, outcome: 'refused' });
    return back(next, actionId, 'refused');
  }

  const outcome = await performAction(serviceId, service.url, loadAdapters(), actionId);
  if (outcome !== 'unsupported') {
    recordAction({ actor, serviceId, actionId, outcome: outcome === 'accepted' ? 'accepted' : outcome });
  }

  return back(next, actionId, outcome);
};
