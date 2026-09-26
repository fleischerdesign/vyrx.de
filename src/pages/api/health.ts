import type { APIRoute } from 'astro';
import { loadFleet } from '../../lib/fleet.ts';
import { readSession } from '../../lib/session.ts';
import { storeHealth } from '../../lib/store.ts';

/*
 * Gesundheit: "Prozess lebt" ist nicht "Datenquelle erreichbar".
 *
 * Der Endpunkt nennt je Abhängigkeit einen eigenen Zustand. Er verrät keine
 * Namen und keine Zahlen - nur, ob etwas antwortet. Wer nicht angemeldet ist,
 * bekommt dieselbe Antwort: sie enthält nichts, was jemandem gehört.
 */
export const prerender = false;

type State = 'ok' | 'degraded' | 'down' | 'unknown';

async function collectorState(): Promise<State> {
  const base = process.env.PORTAL_PROMETHEUS_URL?.trim();
  if (!base) return 'unknown';
  try {
    const url = new URL('/api/v1/query', base);
    url.searchParams.set('query', 'up');
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok ? 'ok' : 'degraded';
  } catch {
    return 'down';
  }
}

export const GET: APIRoute = async ({ request }) => {
  // Die Sitzung wird gelesen, damit die Antwort bei Bedarf nicht mehr kann als jetzt.
  void readSession(request);

  const [collector] = await Promise.all([collectorState()]);
  const dependencies = {
    process: 'ok' as State,
    store: storeHealth() as State,
    fleet: (loadFleet() ? 'ok' : 'down') as State,
    collector,
  };

  const healthy = dependencies.store === 'ok' && dependencies.fleet === 'ok';
  return new Response(JSON.stringify({ status: healthy ? 'ok' : 'degraded', dependencies }), {
    status: healthy ? 200 : 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
