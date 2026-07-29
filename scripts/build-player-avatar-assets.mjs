import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';

import { getPlayerCharacterOptions } from '../src/player/playerCharacters.js';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const CHARACTER_DIR = path.join(
  ROOT,
  'assets/game/source/characters',
);
const AVATAR_DIR = path.join(
  ROOT,
  'assets/game/source/avatars',
);

export const PLAYER_AVATAR_SIZE = 87;
export const PLAYER_AVATAR_FACE_X = 48;
export const PLAYER_AVATAR_EYE_Y = 61;

/**
 * Elara is the composition reference. faceX and eyeY locate anatomy rather
 * than hats, hair, weapons, shields, or other decoration. Scale corrects the
 * apparent head/hand size before every cut is aligned to Elara's eye line.
 */
export const PLAYER_AVATAR_CUTS = Object.freeze({
  elara: Object.freeze({ faceX: 48, eyeY: 69, scale: 1 }),
  mira: Object.freeze({ faceX: 48, eyeY: 69, scale: 0.9 }),
  bramble: Object.freeze({ faceX: 48, eyeY: 69, scale: 1 }),
  corvin: Object.freeze({ faceX: 48, eyeY: 69, scale: 1 }),
  juniper: Object.freeze({ faceX: 48, eyeY: 69, scale: 1 }),
  rowan: Object.freeze({ faceX: 49, eyeY: 69, scale: 1 }),
  adventurer_cleric: Object.freeze({ faceX: 44, eyeY: 67, scale: 0.9 }),
  adventurer_treasurehunter: Object.freeze({
    faceX: 45,
    eyeY: 66,
    scale: 0.95,
  }),
  adventurer_olivehood_archer: Object.freeze({
    faceX: 47,
    eyeY: 66,
    scale: 0.95,
  }),
  adventurer_brownhood_archer: Object.freeze({
    faceX: 47,
    eyeY: 66,
    scale: 0.95,
  }),
  adventurer_redbow_archer: Object.freeze({
    faceX: 45,
    eyeY: 66,
    scale: 1.05,
  }),
  adventurer_greenbow_archer: Object.freeze({
    faceX: 44,
    eyeY: 67,
    scale: 1.05,
  }),
  adventurer_bluequiver_archer: Object.freeze({
    faceX: 45,
    eyeY: 62,
    scale: 0.95,
  }),
  adventurer_grayquiver_archer: Object.freeze({
    faceX: 45,
    eyeY: 61,
    scale: 0.9,
  }),
  adventurer_redscarf_sword: Object.freeze({
    faceX: 47,
    eyeY: 67,
    scale: 0.95,
  }),
  adventurer_bluescarf_spear: Object.freeze({
    faceX: 44,
    eyeY: 66,
    scale: 1,
  }),
  adventurer_greenscarf_shield: Object.freeze({
    faceX: 44,
    eyeY: 62,
    scale: 0.95,
  }),
  adventurer_redaxe_guard: Object.freeze({
    faceX: 45,
    eyeY: 68,
    scale: 1,
  }),
  adventurer_plumehelm_sword: Object.freeze({
    faceX: 43,
    eyeY: 70,
    scale: 0.9,
  }),
  adventurer_goldshield_guard: Object.freeze({
    faceX: 45,
    eyeY: 70,
    scale: 0.95,
  }),
  adventurer_blackarmor_sword: Object.freeze({
    faceX: 47,
    eyeY: 62,
    scale: 0.9,
  }),
  adventurer_greencloak_spear: Object.freeze({
    faceX: 45,
    eyeY: 67,
    scale: 1,
  }),
  adventurer_redspearman: Object.freeze({
    faceX: 43,
    eyeY: 62,
    scale: 0.95,
  }),
  adventurer_blondsword: Object.freeze({
    faceX: 43,
    eyeY: 63,
    scale: 0.9,
  }),
  adventurer_furguard: Object.freeze({
    faceX: 43,
    eyeY: 65,
    scale: 0.95,
  }),
  adventurer_packscout: Object.freeze({
    faceX: 43,
    eyeY: 64,
    scale: 0.9,
  }),
  adventurer_helmhammer: Object.freeze({
    faceX: 43,
    eyeY: 65,
    scale: 0.95,
  }),
  adventurer_bluebandana: Object.freeze({
    faceX: 43,
    eyeY: 64,
    scale: 0.9,
  }),
  adventurer_purpleaxe: Object.freeze({
    faceX: 43,
    eyeY: 65,
    scale: 0.95,
  }),
  adventurer_redplume_sword: Object.freeze({
    faceX: 45,
    eyeY: 69,
    scale: 1,
  }),
  adventurer_blondshield_guard: Object.freeze({
    faceX: 43,
    eyeY: 63,
    scale: 0.9,
  }),
  adventurer_greenscarf_dagger: Object.freeze({
    faceX: 44,
    eyeY: 63,
    scale: 0.9,
  }),
  adventurer_headband_furguard: Object.freeze({
    faceX: 46,
    eyeY: 66,
    scale: 0.95,
  }),
  adventurer_silverhair_spear: Object.freeze({
    faceX: 47,
    eyeY: 65,
    scale: 0.95,
  }),
  adventurer_greenhood_archer: Object.freeze({
    faceX: 47,
    eyeY: 65,
    scale: 0.95,
  }),
  adventurer_hornhelm_axe: Object.freeze({
    faceX: 44,
    eyeY: 68,
    scale: 0.95,
  }),
});

export async function buildPlayerAvatarAssets() {
  const characterKeys = getPlayerCharacterOptions().map(({ key }) => key);
  const configuredKeys = Object.keys(PLAYER_AVATAR_CUTS);
  assertSameKeys(characterKeys, configuredKeys);
  await mkdir(AVATAR_DIR, { recursive: true });

  for (const key of characterKeys) {
    const sourcePath = path.join(CHARACTER_DIR, `${key}.png`);
    const targetPath = path.join(AVATAR_DIR, `${key}.png`);
    const source = PNG.sync.read(await readFile(sourcePath));
    const avatar = renderAvatarCut(source, PLAYER_AVATAR_CUTS[key]);
    await writeFile(targetPath, PNG.sync.write(avatar));
  }

  process.stdout.write(
    `Built ${characterKeys.length} Elara-aligned avatar assets in ${AVATAR_DIR}\n`,
  );
}

function renderAvatarCut(source, { faceX, eyeY, scale }) {
  const target = new PNG({
    width: PLAYER_AVATAR_SIZE,
    height: PLAYER_AVATAR_SIZE,
    colorType: 6,
  });

  for (let targetY = 0; targetY < target.height; targetY += 1) {
    for (let targetX = 0; targetX < target.width; targetX += 1) {
      const sourceX =
        (targetX - PLAYER_AVATAR_FACE_X) / scale + faceX;
      const sourceY =
        (targetY - PLAYER_AVATAR_EYE_Y) / scale + eyeY;
      const rgba = samplePremultipliedBilinear(
        source,
        sourceX,
        sourceY,
      );
      const index = (targetY * target.width + targetX) * 4;
      target.data[index] = rgba[0];
      target.data[index + 1] = rgba[1];
      target.data[index + 2] = rgba[2];
      target.data[index + 3] = rgba[3];
    }
  }

  return target;
}

function samplePremultipliedBilinear(image, x, y) {
  const left = Math.floor(x);
  const top = Math.floor(y);
  const right = left + 1;
  const bottom = top + 1;
  const xRatio = x - left;
  const yRatio = y - top;
  const samples = [
    [left, top, (1 - xRatio) * (1 - yRatio)],
    [right, top, xRatio * (1 - yRatio)],
    [left, bottom, (1 - xRatio) * yRatio],
    [right, bottom, xRatio * yRatio],
  ];
  let alpha = 0;
  let red = 0;
  let green = 0;
  let blue = 0;

  for (const [sampleX, sampleY, weight] of samples) {
    if (
      sampleX < 0 ||
      sampleY < 0 ||
      sampleX >= image.width ||
      sampleY >= image.height
    ) {
      continue;
    }
    const index = (sampleY * image.width + sampleX) * 4;
    const sampleAlpha = image.data[index + 3] / 255;
    const alphaWeight = sampleAlpha * weight;
    alpha += alphaWeight;
    red += image.data[index] * alphaWeight;
    green += image.data[index + 1] * alphaWeight;
    blue += image.data[index + 2] * alphaWeight;
  }

  if (alpha <= 0) {
    return [0, 0, 0, 0];
  }
  return [
    Math.round(red / alpha),
    Math.round(green / alpha),
    Math.round(blue / alpha),
    Math.round(alpha * 255),
  ];
}

function assertSameKeys(expectedKeys, actualKeys) {
  const expected = [...expectedKeys].sort();
  const actual = [...actualKeys].sort();
  if (
    expected.length !== actual.length ||
    expected.some((key, index) => key !== actual[index])
  ) {
    throw new Error(
      'PLAYER_AVATAR_CUTS must define every selectable player character exactly once.',
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await buildPlayerAvatarAssets();
}
