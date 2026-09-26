import type { APIRoute } from 'astro';
import { isSameOrigin, localPath, text } from '../../lib/http.ts';
import { readSession } from '../../lib/session.ts';
import { addMaintenance, removeMaintenance } from '../../lib/store.ts';

// Ein Wartungsfenster ist Betriebswissen: nur Berechtigte setzen es, alle lesen
// es. Es braucht keinen Neubau und keine Auslieferung - es läuft von selbst ab.
export const prerender = false;

const MAX_NOTE = 200;

const back = (next: string, flag: string): Response =>
  new Response(null, { status: 303, headers: { location: `${next}${next.includes('?') ? '&' : '?'}window=${flag}` } });

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const session = readSession(request);
  if (!session.identity) return new Response(null, { status: 401 });
  // Lesen und Verwalten sind zwei Rechte: ein Fenster setzt nur, wer verwalten darf.
  if (!session.isAdmin) return new Response(null, { status: 403 });

  const form = await request.formData();
  const next = localPath(form.get('next'), '/');

  if (String(form.get('action') ?? 'add') === 'remove') {
    const id = Number(form.get('id'));
    if (Number.isInteger(id)) removeMaintenance(id);
    return back(next, 'removed');
  }

  const startsAt = Date.parse(String(form.get('from') ?? ''));
  const endsAt = Date.parse(String(form.get('to') ?? ''));
  const wanted = String(form.get('service') ?? '');
  const serviceId = session.services.some((service) => service.id === wanted) ? wanted : null;

  // Ein Fenster, das endet, bevor es beginnt, ist keine Ankündigung.
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
    return back(next, 'invalid');
  }

  addMaintenance({
    serviceId,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    note: text(form.get('note'), MAX_NOTE) || null,
    createdBy: session.identity.username,
  });

  return back(next, 'set');
};
