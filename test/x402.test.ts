import assert from 'node:assert/strict';
import { test } from 'node:test';
import { x402Middleware } from '../src/x402/server.js';
import {
  X402_VERSION,
  decodePaymentHeaders,
  encodePaymentHeaders
} from '../src/x402/types.js';

const ADDR = '0xRecipient0000000000000000000000000000000000';

function makeRes() {
  const res: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    setHeader: (k: string, v: string) => void;
    end: (b?: string) => void;
  } = { statusCode: 0, headers: {}, body: '', setHeader() {}, end() {} };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
  };
  res.end = (b) => {
    if (b !== undefined) res.body = b;
  };
  return res;
}

test('encode/decode payment headers round-trip', () => {
  const req = {
    version: X402_VERSION,
    network: '8453',
    address: ADDR as `0x${string}`,
    amount: 123456789n,
    scheme: 'basic'
  };
  const decoded = decodePaymentHeaders(encodePaymentHeaders(req));
  assert.equal(decoded.version, X402_VERSION);
  assert.equal(decoded.network, '8453');
  assert.equal(decoded.address, ADDR);
  assert.equal(decoded.amount, 123456789n);
  assert.equal(decoded.scheme, 'basic');
});

test('middleware returns 402 with payment headers when unpaid', async () => {
  const mw = x402Middleware({
    price: '0.01 ETH',
    address: ADDR as `0x${string}`,
    network: 8453,
    verify: async () => false
  });
  const res = makeRes();
  await mw({ headers: {} }, res as never);
  assert.equal(res.statusCode, 402);
  assert.equal(res.headers['x-402-address'], ADDR);
  assert.equal(res.headers['x-402-price'], (10n ** 16n).toString());
  assert.equal(res.headers['x-402-network'], '8453');
});

test('middleware allows a valid payment', async () => {
  let nextCalled = false;
  const mw = x402Middleware({
    price: 10n ** 16n,
    address: ADDR as `0x${string}`,
    network: 8453,
    verify: async () => true
  });
  const res = makeRes();
  await mw(
    { headers: { 'x-402-payment': '0xabc' } },
    res as never,
    () => {
      nextCalled = true;
    }
  );
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 0);
});

test('middleware rejects an invalid payment', async () => {
  const mw = x402Middleware({
    price: 10n ** 16n,
    address: ADDR as `0x${string}`,
    network: 8453,
    verify: async () => false
  });
  const res = makeRes();
  await mw({ headers: { 'x-402-payment': '0xabc' } }, res as never);
  assert.equal(res.statusCode, 402);
  assert.match(res.body, /invalid/);
});
