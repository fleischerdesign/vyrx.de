import type { APIRoute } from 'astro';
import { readSession } from '../../lib/session.ts';
import { loadStatus, stateOf } from '../../lib/status.ts';

// Der gemessene Zustand, aber nur für die Angebote, die dieser Aufrufer sehen darf.
//
// Wer nicht angemeldet ist, bekommt eine leere Liste - nicht einen Fehler und
// erst recht keine Namen. Dieselbe Regel gilt für die Statusseite: die
// Berechtigung entscheidet, was überhaupt in die Antwort kommt.
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = readSession(request);
  const services = session.services;
  const snapshot = services.length > 0 ? await loadStatus(services.map((service) => service.id)) : null;

  const payload = {
    authenticated: session.identity !== null,
    asOf: snapshot?.asOf ?? null,
    services: Object.fromEntries(
      services.map((service) => {
        const live = stateOf(service, snapshot);
        return [service.id, { state: live.state, asOf: live.asOf }];
      }),
    ),
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
