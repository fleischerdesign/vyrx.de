import type { APIRoute } from 'astro';
import { isSameOrigin, localPath, text } from '../../lib/http.ts';
import { readSession } from '../../lib/session.ts';
import { createReport } from '../../lib/store.ts';

// Eine Meldung wird ein Anliegen der meldenden Person. Sie liegt beim
// Eigentümer, trägt höchstens eine Dienstkennung und niemals Zugangsdaten.
export const prerender = false;

const MIN = 5;
const MAX = 2000;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const session = readSession(request);
  if (!session.identity) return new Response(null, { status: 401 });

  const form = await request.formData();
  const next = localPath(form.get('next'), '/');
  const body = text(form.get('body'), MAX);
  const wanted = String(form.get('service') ?? '');
  // Nur ein Angebot, das diese Person sehen darf - sonst keine Kennung.
  const serviceId = session.services.some((entry) => entry.id === wanted) ? wanted : null;

  if (body.length < MIN) {
    return new Response(null, { status: 303, headers: { location: `${next}${next.includes('?') ? '&' : '?'}report=missing` } });
  }

  createReport({ owner: session.identity.username, body, serviceId });

  return new Response(null, { status: 303, headers: { location: `${next}${next.includes('?') ? '&' : '?'}report=sent` } });
};
