import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deviceLabel } from '../src/lib/device-label.ts';

test('device labels name browser and platform without exposing the full user agent', () => {
  assert.equal(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'), 'Safari · iPhone');
  assert.equal(deviceLabel('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'), 'Chrome · Android');
  assert.equal(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'), 'Edge · Windows');
  assert.equal(deviceLabel(null), '');
});
