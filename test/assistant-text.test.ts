import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeAssistantText } from '../src/lib/assistant-text.ts';

test('raw tool markup is stripped from assistant text', () => {
  const raw = 'Ich schaue nach.\n<render_ui>{"nodes":[]}</render_ui>\n<tool_call>{"name":"media_search"}</tool_call>';
  const result = sanitizeAssistantText(raw, 'de');
  assert.equal(result.stripped, true);
  assert.equal(result.text, 'Ich schaue nach.');
  assert.doesNotMatch(result.text, /render_ui|tool_call/);
});

test('normal prose and ordinary code fences survive', () => {
  const text = 'Das ist normaler Text.\n\n```ts\nconst answer = 42;\n```';
  const result = sanitizeAssistantText(text, 'de');
  assert.equal(result.stripped, false);
  assert.match(result.text, /normaler Text/);
  assert.match(result.text, /const answer = 42/);
});

test('a response containing only raw markup gets a localized fallback', () => {
  const result = sanitizeAssistantText('<function_call>{"name":"open_page"}</function_call>', 'en');
  assert.equal(result.stripped, true);
  assert.match(result.text, /could not be rendered/i);
});
