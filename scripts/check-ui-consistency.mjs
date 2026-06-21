#!/usr/bin/env node
/* global console, process */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const warnings = [];

const sourceExtensions = new Set(['.css', '.js', '.mjs', '.ts']);
const ignoredPathParts = [
  `${path.sep}src${path.sep}assets${path.sep}generated${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}dist${path.sep}`,
];

function projectPath(...parts) {
  return path.join(root, ...parts);
}

function readProjectFile(filePath) {
  return fs.readFileSync(projectPath(filePath), 'utf8');
}

function lineForIndex(source, index) {
  return source.slice(0, Math.max(index, 0)).split('\n').length;
}

function addWarning(rule, filePath, line, message) {
  warnings.push({ rule, filePath, line, message });
}

function walk(dirPath, files = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolute = path.join(dirPath, entry.name);
    if (ignoredPathParts.some((part) => absolute.includes(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(absolute, files);
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
}

function scanBottomPanelTabs() {
  const filePath = 'src/pages/bottomPanel/managers/BottomPanelViewManager.js';
  const source = readProjectFile(filePath);
  const match = source.match(/export const BOTTOM_PANEL_TABS = \[([\s\S]*?)\];/);

  if (!match) {
    addWarning('bottom-nav-tabs-missing', filePath, 1, 'Could not find BOTTOM_PANEL_TABS for default room navigation audit.');
    return;
  }

  const allowedDefaultIds = new Set(['brewing', 'garden', 'workshop', 'research', 'shop']);
  const ids = [...match[1].matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((idMatch) => idMatch[1]);
  const extras = ids.filter((id) => !allowedDefaultIds.has(id));

  if (extras.length > 0) {
    const firstExtra = extras[0];
    const line = lineForIndex(source, match.index + match[0].indexOf(firstExtra));
    addWarning(
      'bottom-nav-default-scope',
      filePath,
      line,
      `Default bottom panel includes non-core tab ids: ${extras.join(', ')}. Gate these behind unlock/design state or remove from default chrome.`,
    );
  }
}

function scanCssRules() {
  const filePath = 'src/styles/base.css';
  const source = readProjectFile(filePath);

  if (source.includes('var(--style-dialog-shadow)') && !/--style-dialog-shadow\s*:/.test(source)) {
    addWarning(
      'dialog-shadow-token-missing',
      filePath,
      lineForIndex(source, source.indexOf('var(--style-dialog-shadow)')),
      '`--style-dialog-shadow` is referenced but not defined. Dialog shadow should use one canonical token.',
    );
  }

  const gradientIndex = source.indexOf(':root[data-style-progress="gradient"]');
  if (gradientIndex !== -1) {
    addWarning(
      'default-gradient-option',
      filePath,
      lineForIndex(source, gradientIndex),
      'Gradient progress styling exists. Keep it out of default UI unless personalization explicitly selects it.',
    );
  }

  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of source.matchAll(blockPattern)) {
    const selector = match[1].trim();
    const body = match[2];

    if (
      selector.includes('.style-box') &&
      body.includes('box-shadow') &&
      !selector.includes('.style-dialog')
    ) {
      addWarning(
        'ordinary-box-shadow',
        filePath,
        lineForIndex(source, match.index),
        `${selector.replace(/\s+/g, ' ')} sets box-shadow on style-box. Ordinary boxes should stay flat unless this is a dialog/tutorial exception.`,
      );
    }
  }

  const lines = source.split('\n');
  lines.forEach((line, index) => {
    if (/\btransition(?:-property)?:[^;]*(width|height|padding|margin)/.test(line)) {
      addWarning(
        'layout-transition',
        filePath,
        index + 1,
        'Layout transition detected. Prefer transform/opacity for motion unless layout animation is explicitly required.',
      );
    }
  });
}

function scanMotionDrift() {
  const files = walk(projectPath('src'));

  for (const absolute of files) {
    if (absolute.endsWith('.test.js')) {
      continue;
    }

    const relative = path.relative(root, absolute);
    const source = fs.readFileSync(absolute, 'utf8');
    const lines = source.split('\n');

    lines.forEach((line, index) => {
      if (line.includes('cubic-bezier') && line.includes('1.12')) {
        addWarning(
          'motion-overshoot',
          relative,
          index + 1,
          'Overshoot easing found. Default motion should be quiet and stateful.',
        );
      }

      if (/(animation|@keyframes|className|classList)/.test(line) && line.includes('bounce')) {
        addWarning(
          'motion-bounce',
          relative,
          index + 1,
          'Bounce motion found. Treat as style drift unless this feedback was explicitly requested.',
        );
      }
    });
  }
}

scanBottomPanelTabs();
scanCssRules();
scanMotionDrift();

if (warnings.length === 0) {
  console.log('UI consistency check passed.');
  process.exit(0);
}

console.log(`UI consistency warnings (${warnings.length})`);
for (const warning of warnings) {
  console.log(`- [${warning.rule}] ${warning.filePath}:${warning.line} ${warning.message}`);
}

if (strict) {
  console.error('Strict mode failed on UI consistency warnings.');
  process.exit(1);
}

console.log('Warning-only mode passed. Use --strict to fail on these warnings.');
