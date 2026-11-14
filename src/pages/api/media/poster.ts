import type { APIRoute } from 'astro';

/*
 * Posters kommen von TMDB, aber nie direkt aus dem Browser. Der Proxy kennt
 * nur den Pfad, keinen Host und keine Größe außerhalb der erlaubten Stufen.
 * Das hält die CSP eng und verhindert einen offenen Bild-Proxy.
 */

export const prerender = false;

const SIZES = new Set(['w300', 'w780']);
const PATH = /^\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;

export const GET: APIRoute = async ({ url }) => {
  const path = url.searchParams.get('path') ?? '';
  const size = url.searchParams.get('size') ?? 'w300';
  if (!PATH.test(path) || !SIZES.has(size)) return new Response(null, { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(`https://image.tmdb.org/t/p/${size}${path}`, {
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return new Response(null, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) return new Response(null, { status: 404 });
  const type = upstream.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) return new Response(null, { status: 404 });

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=86400, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
};
