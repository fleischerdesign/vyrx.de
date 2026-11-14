import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SseParser, type SseEvent } from '../src/lib/sse.ts';

const collect = (chunks: readonly string[]): readonly SseEvent[] => {
  const events: SseEvent[] = [];
  const parser = new SseParser((event) => events.push(event));
  for (const chunk of chunks) parser.push(chunk);
  parser.end();
  return events;
};

test('a block split across chunks is delivered once', () => {
  assert.deepEqual(collect(['event: delta\ndata: {"text":"Hal', 'lo"}\n\n']), [
    { event: 'delta', data: '{"text":"Hallo"}' },
  ]);
});

test('CRLF and comments are understood', () => {
  assert.deepEqual(collect([': keep-alive\r\n\r\nevent: sources\r\ndata: {"sources":[]}\r\n\r\n']), [
    { event: 'sources', data: '{"sources":[]}' },
  ]);
});

test('several data lines belong to one event', () => {
  assert.deepEqual(collect(['data: one\ndata: two\n\n']), [{ event: 'message', data: 'one\ntwo' }]);
});

test('an unterminated final block is delivered at the end', () => {
  assert.deepEqual(collect(['event: done\ndata: {}']), [{ event: 'done', data: '{}' }]);
});

test('a block without data is only a comment', () => {
  assert.deepEqual(collect(['event: ping\n\n: still here\n\n']), []);
});

test('an empty data field is an event, not a comment', () => {
  assert.deepEqual(collect(['data:\n\n']), [{ event: 'message', data: '' }]);
});
