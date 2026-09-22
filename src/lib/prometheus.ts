// The one place that talks to the collector.
//
// The expressions live in the routes, never in the request: the browser must not be able to ask
// Prometheus an arbitrary question, and the series the portal reads are the ones the alerting reads, so
// the two agree by construction rather than by convention.
//
// Where the collector is comes from the environment, because the fleet decides that (it is the same
// address the reverse proxy used to hard-code) - and a collector that is unreachable answers with an
// error instead of an empty result, which the page would otherwise read as "nothing is wrong".

const COLLECTOR = () => process.env.PORTAL_PROMETHEUS_URL ?? 'http://127.0.0.1:9090';

export async function prometheusQuery(expression: string): Promise<Response> {
  const url = new URL('/api/v1/query', COLLECTOR());
  url.searchParams.set('query', expression);
  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        'content-type': 'application/json',
        // Ten seconds, as the proxy had it: long enough to absorb a page's worth of requests, short
        // enough that "live" stays true.
        'cache-control': 'public, max-age=10',
      },
    });
  } catch {
    return new Response(JSON.stringify({ status: 'error', error: 'collector unreachable' }), {
      status: 502,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
}
