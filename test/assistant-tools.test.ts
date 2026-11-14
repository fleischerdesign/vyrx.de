import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AssistantData } from '../src/lib/assistant-context.ts';
import { executeTool, intentBlocks, navigationFor } from '../src/lib/assistant-tools.ts';
import type { Session } from '../src/lib/session.ts';

const data: AssistantData = {
  page: { route: 'overview' },
  groups: ['family'],
  history: [],
  announcements: [],
  maintenance: [
    {
      serviceId: 'media-requests',
      startsAt: '2026-11-15T10:00:00.000Z',
      endsAt: '2026-11-15T11:00:00.000Z',
      note: 'Kurze Wartung',
    },
  ],
  services: [
    {
      id: 'media-requests',
      name: { de: 'Medienwünsche', en: 'Media requests' },
      summary: { de: 'Filme anfragen.', en: 'Request films.' },
      scope: 'public',
      state: 'up',
      asOf: 1_790_000_000_000,
      monitored: true,
      accessGroups: ['family', 'media-users'],
      favorite: true,
      dependsOn: [],
    },
    {
      id: 'files',
      name: { de: 'Dateien', en: 'Files' },
      summary: { de: 'Dateien ablegen.', en: 'Store files.' },
      scope: 'internal',
      state: 'unknown',
      asOf: null,
      monitored: true,
      accessGroups: ['family'],
      favorite: false,
      dependsOn: [],
    },
  ],
  articles: [
    {
      slug: 'filmwunsch',
      title: 'Einen Filmwunsch äußern',
      summary: 'So beantragst du einen Film.',
      kind: 'guide',
      body: 'Öffne Medienwünsche und stelle eine Anfrage.',
      services: ['media-requests'],
      visibility: 'internal',
      order: 10,
    },
  ],
};

const session: Session = {
  identity: { username: 'anna', name: 'Anna', groups: ['family'] },
  fleet: null,
  isAdmin: false,
  services: [],
};

test('search returns a readable article and a local card', async () => {
  const outcome = await executeTool('search_knowledge', JSON.stringify({ query: 'Filmwunsch' }), data, session, 'de');
  const content = outcome.content as { results?: { ref: string; title: string }[] };
  assert.equal(content.results?.[0]?.ref, 'A1');
  assert.equal(content.results?.[0]?.title, 'Einen Filmwunsch äußern');
  assert.equal(outcome.blocks?.[0]?.type, 'article');
  assert.equal(outcome.blocks?.[0]?.href, '/knowledge/filmwunsch/');
});

test('a service outside the context is never confirmed', async () => {
  const outcome = await executeTool('get_service', JSON.stringify({ id: 'secret' }), data, session, 'de');
  assert.deepEqual(outcome.content, { error: 'not_released' });
  assert.equal(outcome.blocks, undefined);
});

test('a visible service comes with access and state', async () => {
  const outcome = await executeTool('get_service', JSON.stringify({ id: 'media-requests' }), data, session, 'de');
  const content = outcome.content as { name: string; ref: string; accessGroups: string[]; stateText: string };
  assert.equal(content.name, 'Medienwünsche');
  assert.equal(content.ref, 'S1');
  assert.deepEqual(content.accessGroups, ['family', 'media-users']);
  assert.equal(content.stateText, 'erreichbar');
  assert.equal(outcome.blocks?.[0]?.type, 'service');
});

test('open_page refuses hidden services and API paths', async () => {
  const hidden = await executeTool('open_page', JSON.stringify({ path: '/services/secret/' }), data, session, 'de');
  assert.deepEqual(hidden.content, { error: 'not_released' });
  const api = await executeTool('open_page', JSON.stringify({ path: '/api/assistant' }), data, session, 'de');
  assert.deepEqual(api.content, { error: 'not_found' });
});

test('open_page returns a validated navigation for a visible page', async () => {
  const outcome = await executeTool('open_page', JSON.stringify({ path: '/services/media-requests/' }), data, session, 'de');
  assert.deepEqual(outcome.navigate, { href: '/services/media-requests/', label: 'Medienwünsche' });
});

test('open_page keeps the admin area behind the admin check', async () => {
  const denied = await executeTool('open_page', JSON.stringify({ path: '/admin/' }), data, session, 'de');
  assert.deepEqual(denied.content, { error: 'not_released' });
  const allowed = await executeTool(
    'open_page',
    JSON.stringify({ path: '/admin/' }),
    data,
    { ...session, isAdmin: true },
    'de',
  );
  assert.equal(allowed.navigate?.href, '/admin/');
});

test('ask_step produces one native step with options', async () => {
  const outcome = await executeTool(
    'ask_step',
    JSON.stringify({
      question: 'Lädt eine andere Seite?',
      options: [
        { label: 'Ja', value: 'Ja, andere Seiten laden.' },
        { label: 'Nein', value: 'Nein, nichts lädt.' },
      ],
      step: 1,
      total: 3,
    }),
    data,
    session,
    'de',
  );
  assert.equal(outcome.blocks?.[0]?.type, 'step');
  const block = outcome.blocks?.[0];
  assert.equal(block?.type === 'step' ? block.options.length : 0, 2);
  assert.equal(block?.type === 'step' ? block.step : undefined, 1);
});

test('ask_step refuses a single option', async () => {
  const outcome = await executeTool(
    'ask_step',
    JSON.stringify({ question: 'Weiter?', options: [{ label: 'Ja', value: 'ja' }] }),
    data,
    session,
    'de',
  );
  assert.deepEqual(outcome.content, { error: 'invalid_step' });
});

test('get_status returns measured states and native status blocks', async () => {
  const outcome = await executeTool('get_status', JSON.stringify({}), data, session, 'de');
  const content = outcome.content as { services: { ref: string; stateText: string }[] };
  assert.equal(content.services[0]?.ref, 'S1');
  assert.equal(content.services[1]?.stateText, 'unbekannt');
  assert.equal(outcome.blocks?.length, 2);
  assert.equal(outcome.blocks?.[0]?.type, 'status');
});

test('an explicit open request resolves to a validated page', () => {
  assert.equal(navigationFor('Öffne Medienwünsche.', data, session, 'de')?.href, '/services/media-requests/');
  assert.equal(navigationFor('Öffne den Status.', data, session, 'de')?.href, '/status/');
  assert.equal(navigationFor('Wie ist der Status?', data, session, 'de'), null);
  assert.equal(navigationFor('Öffne die Verwaltung.', data, session, 'de'), null);
  assert.equal(navigationFor('Öffne die Verwaltung.', data, { ...session, isAdmin: true }, 'de')?.href, '/admin/');
});

test('a status question yields a summary block even without a tool call', () => {
  const blocks = intentBlocks('Was ist gerade gestört?', data, 'de');
  assert.equal(blocks[0]?.type, 'summary');
  if (blocks[0]?.type === 'summary') {
    assert.equal(blocks[0].tone, 'unknown');
    assert.match(blocks[0].title, /ohne aktuelle Messung/);
  }
  assert.equal(blocks[1]?.type, 'status');
});

test('an explicit all-services status question includes cards', () => {
  const blocks = intentBlocks('Zeig mir den Status aller Dienste.', data, 'de');
  assert.equal(blocks[0]?.type, 'summary');
  assert.equal(blocks.filter((block) => block.type === 'status').length, 2);
});

test('a service status question narrows to that service', () => {
  const blocks = intentBlocks('Wie ist der Status von Dateien?', data, 'de');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.type, 'status');
  assert.equal(blocks[0]?.type === 'status' ? blocks[0].serviceId : '', 'files');
});
