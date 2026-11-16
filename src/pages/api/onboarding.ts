import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../lib/http.ts';
import { readSession } from '../../lib/session.ts';
import { markOnboarding, onboardingStateOf, setFavorites, type OnboardingState } from '../../lib/store.ts';

export const prerender = false;

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const publicState = (state: OnboardingState | null): Record<string, unknown> => ({
  welcomeSeen: Boolean(state?.welcomeSeenAt),
  favoritesDone: Boolean(state?.favoritesDoneAt),
  assistantDone: Boolean(state?.assistantDoneAt),
  dismissed: Boolean(state?.dismissedAt),
  completed: Boolean(state?.completedAt),
});

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return reply(403, { error: 'forbidden' });
  const session = readSession(request);
  const owner = session.identity?.username;
  if (!owner) return reply(401, { error: 'not_signed_in' });

  let body: { action?: unknown; favorites?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return reply(400, { error: 'invalid_json' });
  }

  const action = typeof body.action === 'string' ? body.action : '';
  if (action === 'favorites') {
    if (!Array.isArray(body.favorites) || body.favorites.length > 3) {
      return reply(400, { error: 'invalid_favorites' });
    }
    const visible = new Set(session.services.map((service) => service.id));
    const ids = [...new Set(body.favorites.filter((id): id is string => typeof id === 'string'))];
    if (ids.some((id) => !visible.has(id))) return reply(400, { error: 'invalid_favorites' });
    setFavorites(owner, ids);
    markOnboarding(owner, 'favoritesDoneAt');
    return reply(200, { state: publicState(onboardingStateOf(owner)), favorites: ids });
  }

  const fields = {
    welcome: 'welcomeSeenAt',
    assistant: 'assistantDoneAt',
    dismiss: 'dismissedAt',
    complete: 'completedAt',
  } as const;
  const field = fields[action as keyof typeof fields];
  if (!field) return reply(400, { error: 'invalid_action' });

  const state = markOnboarding(owner, field);
  return reply(200, { state: publicState(state) });
};
