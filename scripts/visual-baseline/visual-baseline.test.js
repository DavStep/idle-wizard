import fs from 'node:fs';

import pngjs from 'pngjs';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MANIFEST_PATH,
  buildCaptureJobs,
  discoverSourceInventory,
  readVisualBaselineManifest,
  validateVisualBaselineManifest,
} from './manifest.mjs';
import { compareAnchorMetadata, comparePngs } from './diff.mjs';

const { PNG } = pngjs;

describe('visual baseline manifest', () => {
  it('matches current pages, dev recipes, global owners, dialogs, tutorial, and settings', () => {
    const { manifest } = readVisualBaselineManifest();
    const result = validateVisualBaselineManifest(manifest);

    expect(result.errors).toEqual([]);
    expect(result.inventory.pages).toEqual([
      'brewing',
      'garden',
      'guild',
      'prestige',
      'research',
      'shop',
      'workshop',
    ]);
    expect(result.inventory.devUi).toContain('guildQuestPosting');
    expect(result.inventory.domSelectors).toContain('.shop-page__ledger-buy-dialog');
    expect(result.inventory.tutorialSteps).toContain('refill-mana-tonic-cauldron');
    expect(result.inventory.uncapturedCount).toBe(result.inventory.stateCount);
  });

  it('keeps the checked-in JSON schema parseable', () => {
    expect(() =>
      JSON.parse(
        fs.readFileSync(
          DEFAULT_MANIFEST_PATH.replace('manifest.json', 'manifest.schema.json'),
          'utf8',
        ),
      ),
    ).not.toThrow();
  });

  it('reports deterministic recipe gaps under the strict readiness gate', () => {
    const { manifest } = readVisualBaselineManifest();
    const result = validateVisualBaselineManifest(manifest, {
      strictCaptureReady: true,
    });

    expect(result.errors.some((error) => error.includes('deterministic recipe'))).toBe(true);
  });

  it('expands only requested viewport and settings variants', () => {
    const { manifest } = readVisualBaselineManifest();
    const defaultJobs = buildCaptureJobs(manifest, {
      surfaceId: 'page.workshop',
      stateId: 'default',
      viewportId: 'authored-1080x2170',
    });
    const matrixJobs = buildCaptureJobs(manifest, {
      surfaceId: 'page.workshop',
      stateId: 'default',
      viewportId: 'authored-1080x2170',
      includeAllVariants: true,
    });

    expect(defaultJobs).toHaveLength(1);
    expect(matrixJobs).toHaveLength(18);
    expect(matrixJobs.every(({ automated }) => automated)).toBe(true);
  });

  it('discovers source truth without importing DOM runtime surfaces', () => {
    const inventory = discoverSourceInventory();

    expect(inventory.globalOwners).toEqual(
      expect.arrayContaining([
        'onlineGateManager',
        'bottomPanelFacade',
        'topPanelFacade',
      ]),
    );
    expect(inventory.settingOptions.theme).toEqual([
      'black',
      'midnight',
      'witchcraft',
    ]);
  });
});

describe('visual baseline PNG comparison', () => {
  it('tolerates only masked anti-aliased edge differences', () => {
    const reference = solidPng(3, 3, [255, 255, 255, 255]);
    const actual = solidPng(3, 3, [255, 255, 255, 255]);
    setPixel(reference, 1, 1, [0, 0, 0, 255]);
    setPixel(actual, 1, 1, [20, 20, 20, 255]);

    const tolerated = comparePngs(reference, actual, {
      maskRects: [
        {
          id: 'glyph',
          rect: { x: 1, y: 1, width: 1, height: 1 },
          maxChannelDelta: 40,
        },
      ],
    });
    const unmasked = comparePngs(reference, actual);

    expect(tolerated.summary.toleratedGlyphEdgePixels).toBe(1);
    expect(tolerated.summary.differentPixels).toBe(0);
    expect(unmasked.summary.differentPixels).toBe(1);
  });

  it('reports semantic anchor drift beyond one pixel', () => {
    const definition = {
      id: 'dialog',
      selector: '.dialog',
      tolerancePx: 1,
    };
    const reference = metadataWithAnchor('dialog', {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
    const close = metadataWithAnchor('dialog', {
      x: 11,
      y: 20,
      width: 100,
      height: 50,
    });
    const drifted = metadataWithAnchor('dialog', {
      x: 12,
      y: 20,
      width: 100,
      height: 50,
    });

    expect(
      compareAnchorMetadata({
        definitions: [definition],
        referenceMetadata: reference,
        actualMetadata: close,
      }).mismatches,
    ).toEqual([]);
    expect(
      compareAnchorMetadata({
        definitions: [definition],
        referenceMetadata: reference,
        actualMetadata: drifted,
      }).mismatches,
    ).toHaveLength(1);
  });
});

function solidPng(width, height, rgba) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(png, x, y, rgba);
    }
  }
  return png;
}

function setPixel(png, x, y, rgba) {
  const index = (y * png.width + x) * 4;
  rgba.forEach((value, offset) => {
    png.data[index + offset] = value;
  });
}

function metadataWithAnchor(id, rect) {
  return {
    anchors: [
      {
        id,
        found: true,
        rect,
        text: 'same',
        typography: {
          fontFamily: 'Lexend',
          fontSize: '13px',
          fontWeight: '400',
          lineHeight: 'normal',
          letterSpacing: 'normal',
        },
      },
    ],
  };
}
