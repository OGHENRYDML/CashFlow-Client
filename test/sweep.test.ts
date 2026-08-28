import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sweep } from '../src/sweep.js';

const OWNER = '0xOwner00000000000000000000000000000000000000';
const ETH = 10n ** 18n;

function mockDeps(balanceWei: bigint) {
  const sent: { to: string; value: bigint }[] = [];
  const account = { address: '0xAgent000000000000000000000000000000000001' };
  const publicClient = { getBalance: async () => balanceWei };
  const walletClient = {
    sendTransaction: async (tx: { to: string; value: bigint }) => {
      sent.push(tx);
      return ('0x' + 'ab'.repeat(32)) as `0x${string}`;
    }
  };
  return {
    deps: { account, publicClient, walletClient } as never,
    sent
  };
}

test('sweep is a no-op below the USD threshold', async () => {
  const { deps, sent } = mockDeps(ETH); // 1 ETH
  const result = await sweep(deps, {
    ownerAddress: OWNER as `0x${string}`,
    onThresholdUsd: 200,
    ethUsdPrice: async () => 100 // 1 ETH = $100, so $100 < $200
  });
  assert.equal(result.swept, false);
  assert.equal(sent.length, 0);
});

test('sweep sends balance minus a gas buffer above threshold', async () => {
  const { deps, sent } = mockDeps(ETH); // 1 ETH = $100 at $100/ETH
  const result = await sweep(deps, {
    ownerAddress: OWNER as `0x${string}`,
    onThresholdUsd: 50,
    ethUsdPrice: async () => 100
  });
  assert.equal(result.swept, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, OWNER);
  // buffer = 0.005 * 1 ETH = 5e15; sent = 1e18 - 5e15 = 9.95e17
  assert.equal(sent[0].value, 995000000000000000n);
});

test('sweep without threshold sends immediately', async () => {
  const { deps, sent } = mockDeps(ETH);
  const result = await sweep(deps, { ownerAddress: OWNER as `0x${string}` });
  assert.equal(result.swept, true);
  assert.equal(sent.length, 1);
});

test('sweep with zero balance is a no-op', async () => {
  const { deps, sent } = mockDeps(0n);
  const result = await sweep(deps, { ownerAddress: OWNER as `0x${string}` });
  assert.equal(result.swept, false);
  assert.equal(sent.length, 0);
});
