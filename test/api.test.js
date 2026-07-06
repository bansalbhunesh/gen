import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let base;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => server?.close());

async function call(path, options) {
  const res = await fetch(base + path, options);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

test('GET /api/health reports offline AI mode in tests', async () => {
  const { status, body } = await call('/api/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.aiMode, 'offline');
});

test('GET /api/venues lists all host venues', async () => {
  const { status, body } = await call('/api/venues');
  assert.equal(status, 200);
  assert.equal(body.count, 16);
});

test('GET /api/venues/:id returns 404 for unknown venue', async () => {
  const { status } = await call('/api/venues/nope');
  assert.equal(status, 404);
});

test('POST /api/concierge answers a question', async () => {
  const { status, body } = await call('/api/concierge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: 'How do I recycle?', language: 'en' }),
  });
  assert.equal(status, 200);
  assert.match(body.answer.toLowerCase(), /recycl|compost|refill/);
});

test('POST /api/concierge validates missing question with 400', async () => {
  const { status, body } = await call('/api/concierge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(status, 400);
  assert.match(body.error, /question/);
});

test('POST /api/navigate returns directions', async () => {
  const { status, body } = await call('/api/navigate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ venueId: 'usa-metlife', from: 'gate-a', to: 'sec-115' }),
  });
  assert.equal(status, 200);
  assert.ok(body.steps.length > 0);
});

test('GET /api/crowd/:venueId returns a snapshot', async () => {
  const { status, body } = await call('/api/crowd/usa-metlife');
  assert.equal(status, 200);
  assert.equal(body.zones.length, 6);
});

test('POST /api/translate rejects unsupported language via enum guard', async () => {
  const { status, body } = await call('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Hello', target: 'zz' }),
  });
  assert.equal(status, 400);
  assert.match(body.error, /target/);
});

test('unknown routes return a JSON 404', async () => {
  const { status, body } = await call('/api/not-a-route');
  assert.equal(status, 404);
  assert.equal(body.error, 'Not found');
});

test('security headers are applied by helmet', async () => {
  const res = await fetch(base + '/api/health');
  assert.ok(res.headers.get('content-security-policy'));
  assert.equal(res.headers.get('x-powered-by'), null);
});
