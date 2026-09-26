import type { APIRoute } from 'astro';
import { isSameOrigin, localPath } from '../../lib/http.ts';
import { readSession } from '../../lib/session.ts';
import { toggleFavorite } from '../../lib/store.ts';

// Merken ist ein Zustandswechsel der eigenen Person: angemeldet, aus derselben
// Herkunft, und nur für ein Angebot, das diese Person auch sehen darf.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const session = readSession(request);
  if (!session.identity) return new Response(null, { status: 401 });

  const form = await request.formData();
  const next = localPath(form.get('next'), '/');
  const id = String(form.get('id') ?? '');

  const service = session.services.find((entry) => entry.id === id);
  if (!service) return new Response(null, { status: 404 });

  toggleFavorite(session.identity.username, service.id);

  // Zurück dorthin, wo der Stern gedrückt wurde - mit einem Seitenwechsel, damit
  // ein erneutes Laden nicht denselben Wechsel noch einmal auslöst (POST/Redirect/GET).
  return new Response(null, { status: 303, headers: { location: next } });
};
