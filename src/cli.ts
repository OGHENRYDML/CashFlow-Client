import { existsSync, readFileSync } from 'node:fs';
import { Command } from 'commander';
import { formatEther } from 'viem';
import { createAgent } from './agent.js';
import { parseEnv, writeEnvFile } from './lib/env.js';
import { newWallet } from './wallet.js';

const VERSION = '0.1.0';

/** Load a `.env` file into process.env without overwriting existing vars. */
function loadDotenv(path = '.env'): void {
  if (!existsSync(path)) return;
  const env = parseEnv(readFileSync(path, 'utf8'));
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function makeProgram(): Command {
  const program = new Command();

  program
    .name('cashfl0w')
    .description('Non-custodial wallet + x402 payments for your terminal and your agents.')
    .version(VERSION);

  program
    .command('init')
    .description('Create a new non-custodial wallet and write the key to a .env file')
    .option('--env <path>', 'path to the .env file', '.env')
    .option('--print-key', 'print the private key to stdout (DANGER: only for backups)')
    .action((opts: { env: string; printKey?: boolean }) => {
      const { privateKey, address } = newWallet();
      writeEnvFile(opts.env, { CASHFL0W_PRIVATE_KEY: privateKey });
      console.log(`✔ Wallet created: ${address}`);
      console.log(`  key written to ${opts.env} (kept out of git by .gitignore)`);
      if (opts.printKey) console.log(`  private key: ${privateKey}`);
      console.log('\nNext: fund this address, then try `cashfl0w balance`.');
    });

  program
    .command('address')
    .description('Print the agent wallet address')
    .option('--env <path>', 'path to the .env file', '.env')
    .action((opts: { env: string }) => {
      loadDotenv(opts.env);
      const agent = createAgent();
      console.log(agent.address);
    });

  program
    .command('balance')
    .description('Show the agent wallet address and native balance')
    .option('--env <path>', 'path to the .env file', '.env')
    .action(async (opts: { env: string }) => {
      loadDotenv(opts.env);
      const agent = createAgent();
      const [address, balance] = await Promise.all([agent.address, agent.balanceEth()]);
      console.log(`address : ${address}`);
      console.log(`balance : ${balance} ETH`);
    });

  program
    .command('sweep')
    .description('Send the agent wallet balance to an owner address')
    .option('--env <path>', 'path to the .env file', '.env')
    .option('--to <address>', 'owner address (defaults to CASHFL0W_OWNER_ADDRESS)')
    .option('--threshold <usd>', 'only sweep when USD balance reaches this value')
    .action(async (opts: { env: string; to?: string; threshold?: string }) => {
      loadDotenv(opts.env);
      const agent = createAgent();
      const owner = (opts.to ?? process.env.CASHFL0W_OWNER_ADDRESS) as `0x${string}` | undefined;
      if (!owner) {
        console.error('No owner address: pass --to <address> or set CASHFL0W_OWNER_ADDRESS');
        process.exitCode = 1;
        return;
      }
      const result = await agent.sweep(owner, {
        onThresholdUsd: opts.threshold ? Number(opts.threshold) : undefined
      });
      if (!result.swept) {
        console.log(`Skipped: ${result.reason} (balance ${result.balanceEth} ETH)`);
        return;
      }
      console.log(`✔ Swept ${result.sentEth} ETH -> ${owner}`);
      console.log(`  tx: ${result.txHash}`);
    });

  program
    .command('pay')
    .description('Pay for an x402-protected resource and print the response')
    .argument('<url>', 'resource URL')
    .option('--env <path>', 'path to the .env file', '.env')
    .action(async (url: string, opts: { env: string }) => {
      loadDotenv(opts.env);
      const agent = createAgent();
      const res = await agent.pay(url);
      const body = await res.text().catch(() => '');
      console.log(`status: ${res.status}`);
      if (body) console.log(body);
    });

  return program;
}

export function main(): void {
  makeProgram().parseAsync(process.argv).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`error: ${msg}`);
    process.exit(1);
  });
}
