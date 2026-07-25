#!/usr/bin/env node
/* global console, process */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_MANIFEST_PATH,
  readVisualBaselineManifest,
  validateVisualBaselineManifest,
} from './manifest.mjs';

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const manifestPath = path.resolve(options.manifest ?? DEFAULT_MANIFEST_PATH);
const { manifest } = readVisualBaselineManifest(manifestPath);
const result = validateVisualBaselineManifest(manifest, {
  strictCaptureReady: options.strictCaptureReady,
});

for (const warning of result.warnings) {
  console.warn(`warning: ${warning}`);
}

if (result.errors.length > 0) {
  for (const error of result.errors) {
    console.error(`error: ${error}`);
  }
  process.exit(1);
}

console.log(
  `visual baseline manifest ok: ${[
    `${result.inventory.surfaceCount} surfaces`,
    `${result.inventory.stateCount} states`,
    `${result.inventory.pages.length} registered pages`,
    `${result.inventory.devUi.length} dev UI recipes`,
    `${result.inventory.tutorialSteps.length} tutorial steps`,
    `${result.inventory.domSelectors.length} style dialogs`,
    `${result.inventory.uncapturedCount} uncaptured`,
    `${result.inventory.manualRecipeCount} recipe gaps`,
  ].join(', ')}`,
);

function parseArgs(args) {
  const parsed = {
    strictCaptureReady: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    if (token === '--strict-capture-ready') {
      parsed.strictCaptureReady = true;
      continue;
    }
    if (token === '--manifest') {
      parsed.manifest = requireValue(args, ++index, token);
      continue;
    }
    throw new Error(`Unexpected argument: ${token}`);
  }

  return parsed;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage:
  node scripts/visual-baseline/validate.mjs [options]

Options:
  --manifest <path>          Manifest path (default: scripts/visual-baseline/manifest.json)
  --strict-capture-ready     Fail while any state lacks a generic automated recipe
  --help                     Show this help`);
}

export function isDirectRun() {
  return (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}
