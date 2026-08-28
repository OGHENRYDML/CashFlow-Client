import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseEnv, readEnvFile, writeEnvFile } from '../src/lib/env.js';

test('parseEnv handles comments, blanks, and quoted values', () => {
  const env = parseEnv(`# a comment
FOO=bar
EMPTY=
Q="hello world"
S='single'
`);
  assert.equal(env.FOO, 'bar');
  assert.equal(env.EMPTY, '');
  assert.equal(env.Q, 'hello world');
  assert.equal(env.S, 'single');
});

test('writeEnvFile appends by default and preserves existing keys', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cashfl0w-env-'));
  try {
    const p = join(dir, '.env');
    writeEnvFile(p, { A: '1' });
    writeEnvFile(p, { B: '2' });
    const env = readEnvFile(p);
    assert.equal(env.A, '1');
    assert.equal(env.B, '2');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeEnvFile overwrites a provided key', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cashfl0w-env-'));
  try {
    const p = join(dir, '.env');
    writeEnvFile(p, { A: '1' });
    writeEnvFile(p, { A: '2' });
    assert.equal(readEnvFile(p).A, '2');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
