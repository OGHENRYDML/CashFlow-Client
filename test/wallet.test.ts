import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountFromKey, newWallet } from '../src/wallet.js';

test('newWallet generates a valid keypair', () => {
  const w = newWallet();
  assert.match(w.privateKey, /^0x[0-9a-fA-F]{64}$/);
  assert.match(w.address, /^0x[0-9a-fA-F]{40}$/);
});

test('newWallet generates unique wallets', () => {
  const a = newWallet();
  const b = newWallet();
  assert.notEqual(a.privateKey, b.privateKey);
  assert.notEqual(a.address, b.address);
});

test('accountFromKey is deterministic', () => {
  const pk = ('0x' + '11'.repeat(32)) as `0x${string}`;
  assert.equal(accountFromKey(pk).address, accountFromKey(pk).address);
  assert.match(accountFromKey(pk).address, /^0x[0-9a-fA-F]{40}$/);
});
