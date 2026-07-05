#!/usr/bin/env node
/* global console, process */

import { BalanceLabFacade } from '../src/dev/balanceLab/BalanceLabFacade.js';

const facade = new BalanceLabFacade();
const options = parseArgs(process.argv.slice(2));
const result = await facade.run(options);

console.log(result.markdown);

if (result.outputDir) {
  console.log('');
  console.log(`reports: ${result.outputDir}`);
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--days' && next) {
      options.days = readPositiveNumber(next);
      index += 1;
      continue;
    }

    if (arg === '--hours' && next) {
      options.days = readPositiveNumber(next) / 24;
      index += 1;
      continue;
    }

    if (arg === '--step' && next) {
      options.stepSeconds = readPositiveNumber(next);
      index += 1;
      continue;
    }

    if (arg === '--policy' && next) {
      options.policy = next;
      index += 1;
      continue;
    }

    if (arg === '--seed' && next) {
      options.seed = readPositiveInteger(next);
      index += 1;
      continue;
    }

    if (arg === '--sample-every' && next) {
      options.sampleEverySeconds = readPositiveNumber(next);
      index += 1;
      continue;
    }

    if (arg === '--output' && next) {
      options.outputDir = next;
      index += 1;
      continue;
    }

    if (arg === '--no-write') {
      options.writeReports = false;
      continue;
    }

    if (arg === '--prestige') {
      options.allowPrestige = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function readPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function readPositiveInteger(value) {
  const number = Math.floor(Number(value));
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function printHelp() {
  console.log(`Usage: npm run balance:lab -- [options]

Options:
  --policy active|normal|idle   Player behavior model. Default: normal
  --days N                     Simulated days. Default: 3
  --hours N                    Simulated hours instead of days
  --step N                     Tick size in seconds. Default: 5
  --sample-every N             Report sample cadence in seconds. Default: 600
  --seed N                     Deterministic seed-roll seed. Default: 305419896
  --prestige                   Allow automatic prestige when milestones are ready
  --output DIR                 Report directory. Default: tmp/balance-lab/<run-id>
  --no-write                   Print only, do not write report files
`);
}
