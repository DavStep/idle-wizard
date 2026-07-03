#!/usr/bin/env node
/* global console, process */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const errors = [];
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

function addError(rule, filePath, line, message) {
  errors.push({ rule, filePath, line, message });
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

function walkExisting(dirPath, filter, files = []) {
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolute = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkExisting(absolute, filter, files);
      continue;
    }

    if (filter(absolute)) {
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

function scanDefaultIconMode() {
  const filePath = 'src/player/playerIconModes.js';
  const source = readProjectFile(filePath);
  const match = source.match(/export const DEFAULT_PLAYER_ICON_MODE = ['"]([^'"]+)['"];/);

  if (!match) {
    addWarning(
      'default-icon-mode-missing',
      filePath,
      1,
      'Could not find DEFAULT_PLAYER_ICON_MODE for default chrome audit.',
    );
    return;
  }

  if (match[1] !== 'icons') {
    addWarning(
      'default-icon-mode',
      filePath,
      lineForIndex(source, match.index),
      'Default icon mode should be `icons`; item/resource icons are the current default configuration.',
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

  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of source.matchAll(blockPattern)) {
    const selector = match[1].trim();
    const body = match[2];
    const allowsDialogShadow =
      selector.includes('.style-dialog') ||
      selector.includes('.is-dialog') ||
      selector.includes('.is-intro-dialog');

    if (
      selector.includes('.style-box') &&
      body.includes('box-shadow') &&
      !allowsDialogShadow
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
      if (isAllowedLayoutTransition(lines, index)) {
        return;
      }

      addWarning(
        'layout-transition',
        filePath,
        index + 1,
        'Layout transition detected. Prefer transform/opacity for motion unless layout animation is explicitly required.',
      );
    }
  });
}

function isAllowedLayoutTransition(lines, index) {
  const selectorContext = lines.slice(Math.max(0, index - 8), index + 1).join('\n');

  return selectorContext.includes('.workshop-page__tasks-expanded-content');
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

function scanQaHarnessThemes() {
  const harnessFiles = walkExisting(projectPath('tmp'), (absolute) => {
    const name = path.basename(absolute);
    return name.endsWith('-harness.html') || name.endsWith('-qa.html');
  });

  for (const absolute of harnessFiles) {
    const relative = path.relative(root, absolute);
    const source = fs.readFileSync(absolute, 'utf8');

    if (!source.includes('/src/styles/base.css')) {
      continue;
    }

    const htmlTagMatch = source.match(/<html\b[^>]*>/i);

    if (!htmlTagMatch) {
      addError(
        'qa-harness-theme-missing-html',
        relative,
        1,
        'QA harness loads base.css but has no html tag for theme setup.',
      );
      continue;
    }

    if (!/\bdata-style-theme=["']midnight["']/.test(htmlTagMatch[0])) {
      addError(
        'qa-harness-theme',
        relative,
        lineForIndex(source, htmlTagMatch.index),
        'QA harnesses that load base.css must set html[data-style-theme="midnight"] so screenshots do not fall back to the removed light theme.',
      );
    }
  }
}

scanBottomPanelTabs();
scanDefaultIconMode();
scanCssRules();
scanMotionDrift();
scanQaHarnessThemes();

if (errors.length === 0 && warnings.length === 0) {
  console.log('UI consistency check passed.');
  process.exit(0);
}

if (errors.length > 0) {
  console.error(`UI consistency errors (${errors.length})`);
  for (const error of errors) {
    console.error(`- [${error.rule}] ${error.filePath}:${error.line} ${error.message}`);
  }
}

if (warnings.length > 0) {
  console.log(`UI consistency warnings (${warnings.length})`);
}
for (const warning of warnings) {
  console.log(`- [${warning.rule}] ${warning.filePath}:${warning.line} ${warning.message}`);
}

if (errors.length > 0) {
  process.exit(1);
}

if (strict) {
  console.error('Strict mode failed on UI consistency warnings.');
  process.exit(1);
}

console.log('Warning-only mode passed. Use --strict to fail on these warnings.');
