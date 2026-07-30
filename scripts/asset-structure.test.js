import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const RUNTIME_ASSET_EXTENSION =
  /\.(?:atlas|gif|jpe?g|mp3|ogg|otf|png|skel|svg|ttf|wav|webp|woff2?)$/i;

describe('asset structure', () => {
  it('keeps runtime binary assets out of source and legacy public folders', () => {
    const scatteredAssets = ['src', 'public'].flatMap((directory) =>
      collectFiles(path.join(ROOT, directory))
        .filter((filePath) => RUNTIME_ASSET_EXTENSION.test(filePath))
        .map((filePath) => path.relative(ROOT, filePath)),
    );

    expect(scatteredAssets).toEqual([]);
  });

  it('keeps both generated atlases beside their metadata', () => {
    const gameAtlasDir = path.join(ROOT, 'assets/game/atlas');
    const quickUiAtlasDir = path.join(ROOT, 'assets/quick-ui/atlas');
    const gameAtlas = JSON.parse(
      fs.readFileSync(path.join(gameAtlasDir, 'game-asset-atlas.json'), 'utf8'),
    );
    const quickUiAtlas = JSON.parse(
      fs.readFileSync(path.join(quickUiAtlasDir, 'atlas.json'), 'utf8'),
    );

    expect(fs.existsSync(path.join(gameAtlasDir, 'game-asset-atlas.png'))).toBe(
      true,
    );
    expect(Object.keys(gameAtlas.frames).length).toBeGreaterThan(0);
    expect(gameAtlas.meta.image).toBe('game-asset-atlas.png');

    expect(fs.existsSync(path.join(quickUiAtlasDir, 'atlas.png'))).toBe(true);
    expect(fs.existsSync(path.join(quickUiAtlasDir, 'manifest.json'))).toBe(
      true,
    );
    expect(quickUiAtlas.meta.image).toBe('atlas.png');
  });

  it('keeps retired fallback and split-automation icons out of runtime assets', () => {
    const gameAtlas = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, 'assets/game/atlas/game-asset-atlas.json'),
        'utf8',
      ),
    );
    const retiredFrames = [
      'potion:generic',
      'research:autoBottle',
      'research:autoHarvest',
    ];
    const retiredSourcePaths = [
      'assets/game/source/items/potions/potion-generic.png',
      'assets/game/source/icons/research/icon-research-auto-bottle.png',
      'assets/game/source/icons/research/icon-research-auto-harvest.png',
    ];

    expect(
      retiredFrames.filter((frameName) => gameAtlas.frames[frameName]),
    ).toEqual([]);
    expect(
      retiredSourcePaths.filter((relativePath) =>
        fs.existsSync(path.join(ROOT, relativePath)),
      ),
    ).toEqual([]);
  });

  it('builds research icons from shared currency-free object masters', () => {
    const generatorSource = fs.readFileSync(
      path.join(ROOT, 'scripts/generate-research-icons.js'),
      'utf8',
    );
    const primitiveDir = path.join(ROOT, 'art-source/research-icons/primitives');
    const primitiveNames = [
      'cauldron.png',
      'hourglass.png',
      'market-stall.png',
      'plot.png',
      'potion-bottle.png',
      'research-lens.png',
      'seed-pack.png',
      'upgrade-arrow.png',
    ];

    expect(
      primitiveNames.every((fileName) =>
        fs.existsSync(path.join(primitiveDir, fileName)),
      ),
    ).toBe(true);
    expect(generatorSource).toContain("capacityLayers('plot')");
    expect(generatorSource).toContain("capacityLayers('cauldron')");
    expect(generatorSource).toContain("layer('hourglass'");
    expect(generatorSource).toContain("layer('pack'");
    expect(generatorSource).not.toMatch(
      /icon-(?:coin|crystal|emerald|ruby|mana-drop)/,
    );
  });
});

function collectFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files = [];
  const pending = [rootDir];

  while (pending.length > 0) {
    const directory = pending.pop();

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        pending.push(filePath);
      } else if (entry.isFile()) {
        files.push(filePath);
      }
    }
  }

  return files;
}
