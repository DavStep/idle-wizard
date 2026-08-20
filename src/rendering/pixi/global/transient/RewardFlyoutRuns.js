import {
  getHerbIconFrameName,
  getHerbIconLabelEntries,
} from '../../../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
  getPotionIconLabelEntries,
} from '../../../../assets/items/potions/potionIcons.js';
import {
  getSeedPackBaseFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';

const RESOURCE_MATCH =
  /\b(?:ambers?|amethysts?|crystals?|emeralds?|coin|herbs?|mana|rubies|ruby|seeds?)\b/gi;
const RESOURCE_AMOUNT_PREFIX =
  /([+-]?(?:(?:\d[\d,]*(?:\.\d+)?(?:[a-z])?(?:\s*-\s*\d[\d,]*(?:\.\d+)?(?:[a-z])?)?)|(?:\d[\d,]*(?:\/\d[\d,]*)+)|\?)(?:\s*\/\s*(?:(?:\d[\d,]*(?:\.\d+)?(?:[a-z])?)|\?))?\s+)$/i;
const GENERIC_SEED_LABELS = new Set([
  'choose seed',
  'summon seed',
]);
const RESOURCE_FRAMES = Object.freeze({
  crystal: 'resource:crystal',
  amethyst: 'resource:amethyst',
  emerald: 'resource:emerald',
  coin: 'resource:coin',
  herb: getHerbIconFrameName('sageHerb'),
  mana: 'resource:mana',
  ruby: 'resource:ruby',
});

/**
 * DOM-free equivalent of appendTextWithItemIcons(). The output is stable input
 * for the retained reward-flyout slots.
 */
export function createRewardFlyoutRuns(text) {
  const value = String(text ?? '');
  const matches = getMatches(value);
  if (matches.length === 0) {
    return value ? [{ kind: 'text', text: value }] : [];
  }
  const runs = [];
  let lastIndex = 0;
  for (const match of matches) {
    const before = value.slice(lastIndex, match.index);
    if (match.kind === 'resource') {
      const amountPrefix = getAmountPrefix(before);
      appendTextRun(
        runs,
        amountPrefix
          ? before.slice(0, before.length - amountPrefix.length)
          : before,
      );
      appendTextRun(runs, amountPrefix, match.resource);
      appendResourceIconRun(runs, match.resource);
      appendTextRun(runs, match.text, match.resource);
    } else {
      appendTextRun(runs, before);
      if (match.kind === 'seed') {
        runs.push({
          kind: 'icon',
          baseFrameName: getSeedPackBaseFrameName(),
          itemFrameName: match.frameName,
          size: 14,
          gap: 2,
          label: match.text,
        });
        appendTextRun(runs, match.text, 'seed');
      } else {
        runs.push({
          kind: 'icon',
          frameName: match.frameName,
          size: 14,
          gap: 2,
          label: match.text,
        });
        appendTextRun(
          runs,
          match.text,
          match.kind === 'herb' ? 'herb' : null,
        );
      }
    }
    lastIndex = match.index + match.text.length;
  }
  appendTextRun(runs, value.slice(lastIndex));
  return runs.slice(0, 16);
}

function getMatches(value) {
  const matches = [];
  for (const { label, key } of getHerbIconLabelEntries()) {
    const seedName = `${label} seed`;
    const pattern = new RegExp(`\\b${escapeRegExp(seedName)}\\b`, 'g');
    for (const match of value.matchAll(pattern)) {
      if (!GENERIC_SEED_LABELS.has(match[0])) {
        matches.push({
          index: match.index ?? 0,
          kind: 'seed',
          text: match[0],
          frameName: getHerbIconFrameName(key),
        });
      }
    }
  }
  for (const { label, key } of getPotionIconLabelEntries()) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, 'g');
    for (const match of value.matchAll(pattern)) {
      matches.push({
        index: match.index ?? 0,
        kind: 'potion',
        text: match[0],
        frameName: getPotionIconFrameName(key),
      });
    }
  }
  for (const { label, key } of getHerbIconLabelEntries()) {
    const pattern = new RegExp(`\\b${escapeRegExp(label)}\\b`, 'g');
    for (const match of value.matchAll(pattern)) {
      matches.push({
        index: match.index ?? 0,
        kind: 'herb',
        text: match[0],
        frameName: getHerbIconFrameName(key),
      });
    }
  }
  for (const match of value.matchAll(RESOURCE_MATCH)) {
    const resource = normalizeResource(match[0]);
    if (
      resource === 'mana' &&
      /^\s+sphere\b/i.test(
        value.slice((match.index ?? 0) + match[0].length),
      )
    ) {
      continue;
    }
    matches.push({
      index: match.index ?? 0,
      kind: 'resource',
      resource,
      text: match[0],
    });
  }
  const sorted = matches.sort(
    (left, right) =>
      left.index - right.index ||
      right.text.length - left.text.length,
  );
  const result = [];
  let lastEnd = 0;
  for (const match of sorted) {
    if (match.index < lastEnd) {
      continue;
    }
    result.push(match);
    lastEnd = match.index + match.text.length;
  }
  return result;
}

function appendResourceIconRun(runs, resource) {
  if (resource === 'seed') {
    runs.push({
      kind: 'icon',
      baseFrameName: getSeedPackBaseFrameName(),
      itemFrameName: getHerbIconFrameName('sageHerb'),
      size: 14,
      gap: 2,
      label: resource,
    });
    return;
  }
  const frameName = RESOURCE_FRAMES[resource];
  if (frameName) {
    runs.push({
      kind: 'icon',
      frameName,
      size: 14,
      gap: 2,
      label: resource,
    });
  }
}

function appendTextRun(runs, text, colorResource = null) {
  if (!text) {
    return;
  }
  const previous = runs.at(-1);
  if (
    previous?.kind === 'text' &&
    previous.colorResource === colorResource
  ) {
    previous.text += text;
    return;
  }
  runs.push({
    kind: 'text',
    text,
    ...(colorResource ? { colorResource } : {}),
  });
}

function getAmountPrefix(value) {
  const match = String(value ?? '').match(RESOURCE_AMOUNT_PREFIX);
  if (!match) {
    return '';
  }
  const prefix = match[1] ?? '';
  const start = value.length - prefix.length;
  return /\w/.test(value[start - 1] ?? '') ? '' : prefix;
}

function normalizeResource(label) {
  const resource = String(label).toLowerCase();
  if (resource === 'amber' || resource === 'ambers') {
    return 'crystal';
  }
  if (resource === 'amethysts') {
    return 'amethyst';
  }
  if (resource === 'crystals') {
    return 'crystal';
  }
  if (resource === 'rubies') {
    return 'ruby';
  }
  if (resource === 'emeralds') {
    return 'emerald';
  }
  if (resource === 'seeds') {
    return 'seed';
  }
  if (resource === 'herbs') {
    return 'herb';
  }
  return resource;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
