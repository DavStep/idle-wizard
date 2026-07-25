import {
  getHerbIconFrameName,
  getHerbIconKeyByLabel,
} from '../herbs/herbIcons.js';

const SEED_PACK_FRAME_NAME = 'seed:pack';

/**
 * Renderer-neutral seed icon metadata. Canvas renderers import this module
 * without pulling the legacy SVG element factories into production.
 */
export function getSeedIconFrameName() {
  return SEED_PACK_FRAME_NAME;
}

export function getSeedPackBaseFrameName() {
  return SEED_PACK_FRAME_NAME;
}

export function getHerbKeyForSeed(seed = null) {
  const key = String(seed?.key ?? seed?.itemKey ?? '').trim();

  if (key.endsWith('Seed')) {
    return `${key.slice(0, -'Seed'.length)}Herb`;
  }

  const label = String(seed?.label ?? seed?.itemLabel ?? '')
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+x[\d,]+\s*$/i, '')
    .replace(/\s+seed$/i, '');
  return getHerbIconKeyByLabel(label);
}

export function getSeedPackItemFrameName(seed = null) {
  return getHerbIconFrameName(getHerbKeyForSeed(seed));
}
