import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';
import pngjs from 'pngjs';

import {
  gameAtlasBackedSourceAssets,
  gameStandaloneSourceAssets,
} from '../src/assets/generated/game-asset-atlas.generated.js';

const { PNG } = pngjs;

const ROOT = process.cwd();
const RUNTIME_ASSET_EXTENSION =
  /\.(?:atlas|gif|jpe?g|mp3|ogg|otf|png|skel|svg|ttf|wav|woff2?)$/i;
const TEXT_SOURCE_EXTENSION = /\.(?:css|html|js|json|md|mjs|ts)$/i;

describe('asset structure', () => {
  it('uses PNG as the only runtime raster asset format', () => {
    const webpAssets = [
      'android/app/src/main/res',
      'art-source',
      'assets',
      'output',
      'public',
    ]
      .flatMap((directory) => collectFiles(path.join(ROOT, directory)))
      .filter((filePath) => /\.webp$/i.test(filePath))
      .map((filePath) => path.relative(ROOT, filePath));
    const webpReferences = ['src', 'scripts'].flatMap((directory) =>
      collectFiles(path.join(ROOT, directory))
        .filter(
          (filePath) =>
            TEXT_SOURCE_EXTENSION.test(filePath) &&
            path.basename(filePath) !== 'asset-structure.test.js' &&
            fs.readFileSync(filePath, 'utf8').includes('.webp'),
        )
        .map((filePath) => path.relative(ROOT, filePath)),
    );
    const packageInfo = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
    );

    expect(webpAssets).toEqual([]);
    expect(webpReferences).toEqual([]);
    expect(packageInfo.scripts['mobile:sync:prod']).not.toContain(
      'optimize-android-web-assets',
    );
  });

  it('keeps runtime binary assets out of source and legacy public folders', () => {
    const scatteredAssets = ['src', 'public'].flatMap((directory) =>
      collectFiles(path.join(ROOT, directory))
        .filter((filePath) => RUNTIME_ASSET_EXTENSION.test(filePath))
        .map((filePath) => path.relative(ROOT, filePath)),
    );

    expect(scatteredAssets).toEqual([]);
  });

  it('keeps generated atlas pages beside their metadata', () => {
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

    const sharedAtlasJsonPaths = fs.readdirSync(gameAtlasDir)
      .filter((fileName) => /^game-shared-atlas-\d+\.json$/.test(fileName))
      .map((fileName) => path.join(gameAtlasDir, fileName));
    expect(sharedAtlasJsonPaths.length).toBeGreaterThan(0);
    for (const jsonPath of sharedAtlasJsonPaths) {
      const atlas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      expect(Object.keys(atlas.frames).length).toBeGreaterThan(0);
      expect(atlas.meta.atlasId).toMatch(/^atlas:shared-\d+$/);
      expect(fs.existsSync(path.join(gameAtlasDir, atlas.meta.image))).toBe(
        true,
      );
    }

    expect(fs.existsSync(path.join(quickUiAtlasDir, 'atlas.png'))).toBe(true);
    expect(fs.existsSync(path.join(quickUiAtlasDir, 'manifest.json'))).toBe(
      true,
    );
    expect(quickUiAtlas.meta.image).toBe('atlas.png');
  });

  it('does not import atlas-backed source PNGs as standalone production assets', () => {
    const gameAtlasDir = path.join(ROOT, 'assets/game/atlas');
    const atlasJsonPaths = fs.readdirSync(gameAtlasDir)
      .filter((fileName) =>
        /^(?:game-asset-atlas|game-shared-atlas-\d+)\.json$/.test(fileName),
      )
      .map((fileName) => path.join(gameAtlasDir, fileName));
    const atlasSourcePaths = new Set(
      atlasJsonPaths.flatMap((jsonPath) => {
        const atlas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        return Object.values(atlas.frames).map(({ source }) => source);
      }),
    );
    const atlasBackedIds = new Set(
      gameAtlasBackedSourceAssets.map(({ id }) => id),
    );
    const standaloneIds = new Set(
      gameStandaloneSourceAssets.map(({ id }) => id),
    );
    const sourcePngPaths = collectFiles(path.join(ROOT, 'assets/game/source'))
      .filter((filePath) => filePath.endsWith('.png'))
      .map((filePath) => path.relative(ROOT, filePath).replaceAll(path.sep, '/'));

    expect(
      [...atlasBackedIds].filter((sourceId) => standaloneIds.has(sourceId)),
    ).toEqual([]);
    expect(
      [...atlasBackedIds].every((sourceId) =>
        atlasSourcePaths.has(
          sourceId.replace(/^source:assets\//, 'assets/game/source/'),
        ),
      ),
    ).toBe(true);
    expect(atlasBackedIds.size + standaloneIds.size).toBe(
      sourcePngPaths.length,
    );
  });

  it('preserves every shared-atlas source pixel and source-sized frame', () => {
    const gameAtlasDir = path.join(ROOT, 'assets/game/atlas');
    const sharedAtlasJsonPaths = fs.readdirSync(gameAtlasDir)
      .filter((fileName) => /^game-shared-atlas-\d+\.json$/.test(fileName))
      .map((fileName) => path.join(gameAtlasDir, fileName));

    for (const jsonPath of sharedAtlasJsonPaths) {
      const atlas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const atlasImage = PNG.sync.read(
        fs.readFileSync(path.join(gameAtlasDir, atlas.meta.image)),
      );

      for (const frame of Object.values(atlas.frames)) {
        const sourceImage = PNG.sync.read(
          fs.readFileSync(path.join(ROOT, frame.source)),
        );
        expect(frame.source).not.toMatch(/\.9\.png$/);
        expect(frame.frame.w).toBe(sourceImage.width);
        expect(frame.frame.h).toBe(sourceImage.height);
        expect(frame.originalSourceSize).toEqual({
          h: sourceImage.height,
          w: sourceImage.width,
        });

        let pixelsMatch = true;
        pixelRows: for (let y = 0; y < sourceImage.height; y += 1) {
          for (let x = 0; x < sourceImage.width; x += 1) {
            const sourceOffset = (y * sourceImage.width + x) * 4;
            const atlasOffset =
              ((frame.frame.y + y) * atlasImage.width + frame.frame.x + x) * 4;
            if (
              atlasImage.data[atlasOffset + 3]
                !== sourceImage.data[sourceOffset + 3] ||
              (sourceImage.data[sourceOffset + 3] > 0 &&
                (
                  atlasImage.data[atlasOffset]
                    !== sourceImage.data[sourceOffset] ||
                  atlasImage.data[atlasOffset + 1]
                    !== sourceImage.data[sourceOffset + 1] ||
                  atlasImage.data[atlasOffset + 2]
                    !== sourceImage.data[sourceOffset + 2]
                ))
            ) {
              pixelsMatch = false;
              break pixelRows;
            }
          }
        }
        expect(pixelsMatch, frame.source).toBe(true);
      }
    }
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
      'assets/game/source/icons/icon-research.png',
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

    const timeIcon = PNG.sync.read(
      fs.readFileSync(
        path.join(
          ROOT,
          'assets/game/source/icons/research/icon-research-time.png',
        ),
      ),
    );
    let orangeYellowSandPixels = 0;
    let darkFramePixels = 0;
    let purpleSandPixels = 0;
    for (let offset = 0; offset < timeIcon.data.length; offset += 4) {
      const red = timeIcon.data[offset];
      const green = timeIcon.data[offset + 1];
      const blue = timeIcon.data[offset + 2];
      const alpha = timeIcon.data[offset + 3];
      orangeYellowSandPixels += Number(
        alpha > 0 && red > 230 && green > 100 && blue < 80 && red > green,
      );
      darkFramePixels += Number(
        alpha >= 64 && red < 105 && green < 75 && blue < 110,
      );
      purpleSandPixels += Number(
        alpha > 0 && blue - red > 18 && red - green > 18,
      );
    }
    expect(orangeYellowSandPixels).toBeGreaterThan(100);
    expect(darkFramePixels).toBeGreaterThan(500);
    expect(purpleSandPixels).toBe(0);
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
