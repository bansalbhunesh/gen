import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requireString,
  optionalString,
  requireEnum,
  MAX_TEXT_LENGTH,
} from '../src/middleware/validate.js';

test('requireString trims and returns valid input', () => {
  assert.equal(requireString('  hi  ', 'field'), 'hi');
});

test('requireString rejects empty, non-string and over-length input', () => {
  assert.throws(() => requireString('', 'f'), /required/);
  assert.throws(() => requireString('   ', 'f'), /required/);
  assert.throws(() => requireString(42, 'f'), /required/);
  assert.throws(() => requireString('x'.repeat(MAX_TEXT_LENGTH + 1), 'f'), /characters or fewer/);
});

test('optionalString allows empty but still validates when present', () => {
  assert.equal(optionalString(undefined, 'f'), undefined);
  assert.equal(optionalString('', 'f'), undefined);
  assert.equal(optionalString(' ok ', 'f'), 'ok');
  assert.throws(() => optionalString('y'.repeat(999), 'f', 10), /characters or fewer/);
});

test('requireEnum enforces the allow-list', () => {
  assert.equal(requireEnum('es', 'lang', ['en', 'es']), 'es');
  assert.throws(() => requireEnum('zz', 'lang', ['en', 'es']), /must be one of/);
});

test('validation errors carry a 400 status', () => {
  try {
    requireString('', 'field');
    assert.fail('should have thrown');
  } catch (err) {
    assert.equal(err.status, 400);
  }
});
