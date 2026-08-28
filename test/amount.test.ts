import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ETH_WEI, GWEI_WEI, decimalToWei, parseAmount } from '../src/lib/amount.js';

const PRICE_2000 = async () => 2000; // 1 ETH = $2000

test('decimalToWei converts ETH and GWEI', () => {
  assert.equal(decimalToWei('0.01', ETH_WEI), 10n ** 16n);
  assert.equal(decimalToWei('1', ETH_WEI), 10n ** 18n);
  assert.equal(decimalToWei('0.5', ETH_WEI), 5n * 10n ** 17n);
  assert.equal(decimalToWei('1', GWEI_WEI), 10n ** 9n);
  assert.equal(decimalToWei('0', ETH_WEI), 0n);
});

test('parseAmount handles USD via oracle', async () => {
  const a = await parseAmount('$0.01', PRICE_2000);
  assert.equal(a.valueWei, 5n * 10n ** 12n); // 0.01 / 2000 * 1e18
  assert.equal(a.display, '$0.01');
});

test('parseAmount handles ETH / gwei / wei', async () => {
  assert.equal((await parseAmount('0.01 ETH')).valueWei, 10n ** 16n);
  assert.equal((await parseAmount('0.01 eth')).valueWei, 10n ** 16n);
  assert.equal((await parseAmount('1 gwei')).valueWei, 10n ** 9n);
  assert.equal((await parseAmount('1234567890123456789')).valueWei, 1234567890123456789n);
});

test('parseAmount throws on USD without oracle', async () => {
  await assert.rejects(() => parseAmount('$0.01'), /ETH\/USD price/);
});

test('parseAmount throws on unknown unit', async () => {
  await assert.rejects(() => parseAmount('5 banana'), /Unknown unit/);
});

test('parseAmount throws on empty', async () => {
  await assert.rejects(() => parseAmount('   '), /Empty amount/);
});
