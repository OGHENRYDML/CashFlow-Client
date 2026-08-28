export const ETH_WEI = 10n ** 18n;
export const GWEI_WEI = 10n ** 9n;

export type Amount = {
  /** Native symbol for the amount (currently always ETH on the active chain). */
  symbol: 'ETH';
  /** Value in wei (10^-18 units). */
  valueWei: bigint;
  /** Human-readable echo of what was requested. */
  display: string;
};

/** A function that returns the price of 1 native token (ETH) in USD. */
export type EthUsdPriceFn = () => Promise<number>;

/** Convert a decimal string (e.g. "0.01") into wei given a unit (ETH_WEI or GWEI_WEI). */
export function decimalToWei(amount: string, unit: bigint): bigint {
  if (!/^\d*\.?\d+$/.test(amount)) {
    throw new Error(`Invalid number: "${amount}"`);
  }
  const [int = '0', frac = ''] = amount.split('.');
  const decimals = unit.toString().length - 1; // 10^n -> n decimals
  const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals);
  const whole = BigInt(int || '0') * unit;
  const part = fracPadded ? BigInt(fracPadded) : 0n;
  return whole + part;
}

/**
 * Parse a human amount string into wei.
 *
 * Supported forms:
 *   - `'0.01 ETH'` / `'0.01 eth'` / `'0.01 ether'`
 *   - `'1 gwei'`
 *   - `'10000000000000000'` (bare integer => wei)
 *   - `'$0.01'` (USD — requires an `ethUsdPrice` oracle)
 */
export async function parseAmount(
  input: string,
  ethUsdPrice?: EthUsdPriceFn
): Promise<Amount> {
  const s = input.trim();
  if (!s) throw new Error('Empty amount');

  if (s.startsWith('$')) {
    const usd = Number(s.slice(1));
    if (!Number.isFinite(usd) || usd <= 0) {
      throw new Error(`Invalid USD amount: "${input}"`);
    }
    if (!ethUsdPrice) {
      throw new Error(
        'USD amounts need an ETH/USD price source. Pass an oracle or set one in config.'
      );
    }
    const price = await ethUsdPrice();
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid ETH/USD price: ${price}`);
    }
    const valueWei = BigInt(Math.round((usd / price) * Number(ETH_WEI)));
    return { symbol: 'ETH', valueWei, display: `$${usd}` };
  }

  const m = s.match(/^([0-9]*\.?[0-9]+)\s*([a-zA-Z]*)$/);
  if (!m) throw new Error(`Cannot parse amount: "${input}"`);

  const num = m[1];
  const unit = (m[2] || 'wei').toLowerCase();
  let valueWei: bigint;
  switch (unit) {
    case 'wei':
      valueWei = BigInt(num);
      break;
    case 'gwei':
    case 'gigawei':
      valueWei = decimalToWei(num, GWEI_WEI);
      break;
    case 'eth':
    case 'ether':
      valueWei = decimalToWei(num, ETH_WEI);
      break;
    default:
      throw new Error(
        `Unknown unit "${unit}" in "${input}". Use wei, gwei, or eth.`
      );
  }
  return { symbol: 'ETH', valueWei, display: `${num} ${unit.toUpperCase()}` };
}

/** Default ETH/USD price via CoinGecko (public, no key required). */
export async function getEthUsdPrice(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
  );
  if (!res.ok) throw new Error(`Price feed failed: HTTP ${res.status}`);
  const json = (await res.json()) as { ethereum?: { usd?: number } };
  const usd = json.ethereum?.usd;
  if (!Number.isFinite(usd) || (usd as number) <= 0) {
    throw new Error('Price feed returned no usable ETH/USD price');
  }
  return usd as number;
}
