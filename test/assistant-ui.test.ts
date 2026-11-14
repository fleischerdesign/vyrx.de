import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AssistantData } from '../src/lib/assistant-context.ts';
import { validateUiNodes } from '../src/lib/assistant-ui.ts';
import { executeTool } from '../src/lib/assistant-tools.ts';
import type { Session } from '../src/lib/session.ts';

const data: AssistantData = {
  page: { route: 'overview' },
  groups: ['family'],
  history: [],
  announcements: [],
  maintenance: [],
  services: [
    {
      id: 'media-requests',
      name: { de: 'Medienwünsche', en: 'Media requests' },
      summary: { de: 'Filme anfragen.', en: 'Request films.' },
      scope: 'public',
      state: 'down',
      asOf: 1_790_000_000_000,
      monitored: true,
      accessGroups: ['family'],
      favorite: true,
      dependsOn: [],
    },
  ],
  articles: [
    {
      slug: 'filmwunsch',
      title: 'Einen Filmwunsch äußern',
      summary: 'So beantragst du einen Film.',
      kind: 'guide',
      body: 'Öffne Medienwünsche.',
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

test('the model can compose a generic layout tree', () => {
  const result = validateUiNodes(
    [
      {
        type: 'stack',
        gap: 'md',
        children: [
          { type: 'heading', value: 'Status', level: 2 },
          {
            type: 'card',
            tone: 'subtle',
            children: [{ type: 'text', value: 'Zwei Dienste geprüft.', variant: 'muted' }],
          },
          { type: 'list', items: ['Eins', 'Zwei'], ordered: false },
          { type: 'divider' },
        ],
      },
    ],
    data,
    session,
    'de',
  );
  assert.equal(result.error, undefined);
  assert.equal(result.nodes[0]?.type, 'stack');
});

test('domain components are rebuilt from session data, not model text', () => {
  const result = validateUiNodes(
    [
      { type: 'status', serviceId: 'media-requests', name: 'Falscher Name' },
      { type: 'service', serviceId: 'media-requests' },
      { type: 'article', slug: 'filmwunsch' },
    ],
    data,
    session,
    'de',
  );
  assert.equal(result.error, undefined);
  assert.equal(result.nodes[0]?.type, 'status');
  assert.equal(result.nodes[0]?.type === 'status' ? result.nodes[0].name : '', 'Medienwünsche');
  assert.equal(result.nodes[0]?.type === 'status' ? result.nodes[0].stateText : '', 'nicht erreichbar');
  assert.equal(result.nodes[1]?.type === 'service' ? result.nodes[1].name : '', 'Medienwünsche');
  assert.equal(result.nodes[2]?.type === 'article' ? result.nodes[2].title : '', 'Einen Filmwunsch äußern');
});

test('unknown components and server-only facts are rejected', () => {
  const unknown = validateUiNodes([{ type: 'iframe', src: 'https://example.com' }], data, session, 'de');
  assert.equal(unknown.error, 'unknown_component');
  const summary = validateUiNodes([{ type: 'summary', title: 'Fake' }], data, session, 'de');
  assert.equal(summary.error, 'server_only_component');
  const step = validateUiNodes([{ type: 'step', question: 'Fake?', options: [] }], data, session, 'de');
  assert.equal(step.error, 'server_only_component');
});

test('hidden services and external links are rejected', () => {
  const service = validateUiNodes([{ type: 'status', serviceId: 'secret' }], data, session, 'de');
  assert.equal(service.error, 'service_not_released');
  const external = validateUiNodes([{ type: 'link', label: 'Falsch', href: 'https://example.com' }], data, session, 'de');
  assert.equal(external.error, 'invalid_link');
  const admin = validateUiNodes([{ type: 'link', label: 'Verwaltung', href: '/admin/' }], data, session, 'de');
  assert.equal(admin.error, 'invalid_link');
});

test('a local link to a visible page is kept', () => {
  const result = validateUiNodes(
    [{ type: 'link', label: 'Medienwünsche', href: '/services/media-requests/' }],
    data,
    session,
    'de',
  );
  assert.equal(result.error, undefined);
  assert.equal(result.nodes[0]?.type === 'link' ? result.nodes[0].href : '', '/services/media-requests/');
});

test('tables are bounded and only declared columns survive', () => {
  const result = validateUiNodes(
    [
      {
        type: 'table',
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'state', label: 'Zustand' },
        ],
        rows: [{ name: 'Medienwünsche', state: 'down', secret: 'drop me' }],
      },
    ],
    data,
    session,
    'de',
  );
  assert.equal(result.error, undefined);
  const table = result.nodes[0];
  assert.equal(table?.type, 'table');
  if (table?.type === 'table') {
    assert.deepEqual(table.rows[0], { name: 'Medienwünsche', state: 'down' });
  }
});

test('the depth limit is enforced', () => {
  let node: unknown = { type: 'text', value: 'tief' };
  for (let i = 0; i < 8; i += 1) node = { type: 'stack', children: [node] };
  const result = validateUiNodes([node], data, session, 'de');
  assert.equal(result.error, 'too_deep');
});

test('render_ui returns the validated tree as native blocks', async () => {
  const outcome = await executeTool(
    'render_ui',
    JSON.stringify({
      nodes: [
        {
          type: 'card',
          title: 'Kurz',
          children: [{ type: 'text', value: 'Ein Satz.' }],
        },
      ],
    }),
    data,
    session,
    'de',
  );
  assert.equal((outcome.content as { ok?: boolean }).ok, true);
  assert.equal(outcome.blocks?.[0]?.type, 'card');
});
