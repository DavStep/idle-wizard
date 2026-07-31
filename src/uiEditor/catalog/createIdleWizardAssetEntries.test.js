// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

vi.mock('../widgets/UiEditorPixiButtonPreview.js', () => ({
  createUiEditorPixiButtonPreview: (definition) => definition,
  createUiEditorPixiButtonThumbnail: (definition) => definition,
}));

import { createIdleWizardAssetEntries } from './createIdleWizardAssetEntries.js';
import { createIdleWizardButtonEntries } from './createIdleWizardButtonEntries.js';
import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
} from '../../rendering/pixi/assets/PixiProductionAssetManifest.js';

describe('createIdleWizardAssetEntries', () => {
  it('catalogs every production texture and deduplicates widget declarations', () => {
    const widgets = createIdleWizardButtonEntries();
    const assets = createIdleWizardAssetEntries(widgets);
    const productionTextureIds = new Set(
      PIXI_PRODUCTION_ASSET_MANIFEST
        .filter(({ kind }) => kind === 'texture')
        .map(({ id }) => id),
    );

    expect(assets).toHaveLength(productionTextureIds.size);
    expect(new Set(assets.map((asset) => asset.assetId))).toEqual(
      productionTextureIds,
    );
    expect(assets.every((asset) => asset.sectionId === 'assets')).toBe(true);
    expect(assets.every((asset) => asset.kind === 'asset')).toBe(true);
    expect(
      assets.every((asset) => typeof asset.assetUrl === 'string'),
    ).toBe(true);
    expect(
      assets.every(
        (asset) =>
          Array.isArray(asset.folderPath) && asset.folderPath.length > 0,
      ),
    ).toBe(true);
  });

  it('maps source directories to stable nested editor folders', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const elara = assets.find(
      ({ assetId }) => assetId === 'source:assets/avatars/elara.png',
    );
    const settingsGear = assets.find(
      ({ assetId }) =>
        assetId
        === 'source:assets/ui/root-run-settings/settings-icon-gear.png',
    );
    const publicPlayerCard = assets.find(
      ({ assetId }) =>
        assetId
        === 'public:ui/player-card-panel.9.png',
    );

    expect(elara.folderPath).toEqual(['avatars']);
    expect(settingsGear.folderPath).toEqual([
      'ui',
      'root-run-settings',
    ]);
    expect(publicPlayerCard.folderPath).toEqual(['public', 'ui']);
  });

  it('groups the complete regular button color and radius matrix', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const regularButtons = assets.filter(
      ({ folderPath }) =>
        JSON.stringify(folderPath) === JSON.stringify([
          'ui',
          'regular-button',
        ]),
    );
    const colors = [
      'blue',
      'brown',
      'gray',
      'green',
      'purple',
      'red',
      'yellow',
    ];
    const radii = [15, 30, 50];

    expect(regularButtons).toHaveLength(colors.length * radii.length);
    expect(
      regularButtons.map(({ label }) => label).sort(),
    ).toEqual(
      colors
        .flatMap((color) =>
          radii.map((radius) => `${color}-button-${radius}.9.png`),
        )
        .sort(),
    );
    expect(
      regularButtons.every(({ nineSlice }) => nineSlice),
    ).toBe(true);
  });

  it('includes preview-only runtime and generated textures', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const tutorialPointer = assets.find(
      ({ assetId }) =>
        assetId === 'public:spine/tutorial-pointer/pointer.png',
    );
    const gameAtlas = assets.find(
      ({ assetId }) => assetId === 'atlas:game',
    );
    const sourceWebp = assets.find(
      ({ assetId }) => assetId === 'source:assets/ui/xp-stars.webp',
    );

    expect(tutorialPointer.folderPath).toEqual([
      'public',
      'spine',
      'tutorial-pointer',
    ]);
    expect(tutorialPointer.editorEditable).toBe(false);
    expect(tutorialPointer.properties).toContainEqual({
      label: 'Editor access',
      value: 'Preview only',
    });
    expect(gameAtlas.label).toBe('game atlas');
    expect(gameAtlas.folderPath).toEqual(['generated', 'atlases']);
    expect(gameAtlas.editorEditable).toBe(false);
    expect(gameAtlas.properties).toContainEqual({
      label: 'Type',
      value: 'Generated atlas',
    });
    expect(sourceWebp.editorEditable).toBe(false);
    expect(sourceWebp.properties).toContainEqual({
      label: 'Editor access',
      value: 'Preview only',
    });
  });

  it('suggests registered sibling margins for an ordinary source asset', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const stackedGreenButton = assets.find(
      ({ assetId }) =>
        assetId
        === 'source:assets/ui/root-run-cost-button/green-button.png',
    );

    expect(stackedGreenButton.nineSlice).toBe(false);
    expect(stackedGreenButton.editorEditable).toBe(true);
    expect(stackedGreenButton.suggestedSourceInsets).toEqual({
      top: 100,
      right: 71,
      bottom: 68,
      left: 85,
    });
  });

  it('loads editor-authored sidecar metadata as a nine-slice asset', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const shortGreenButton = assets.find(
      ({ assetId }) =>
        assetId
        === 'source:assets/ui/root-run-cost-button/green-button-short.9.png',
    );

    expect(shortGreenButton.nineSlice).toBe(true);
    expect(shortGreenButton.sourceInsets).toEqual({
      top: 100,
      right: 71,
      bottom: 68,
      left: 85,
    });
    expect(shortGreenButton.properties).toContainEqual({
      label: 'Slice margins',
      monospace: true,
      value: 'L 85 · T 100 · R 71 · B 68',
    });
  });

  it('registers widget usage and exact nine-slice geometry', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const greenButton = assets.find(
      ({ assetId }) =>
        assetId
        === 'source:assets/ui/regular-button/green-button-50.9.png',
    );

    expect(greenButton.nineSlice).toBe(true);
    expect(greenButton.sourceInsets).toEqual({
      top: 100,
      right: 52,
      bottom: 68,
      left: 86,
    });
    expect(greenButton.borderInsets).toEqual({
      top: 100,
      right: 52,
      bottom: 68,
      left: 86,
    });
    expect(greenButton.minimumSize).toEqual({
      width: 141,
      height: 171,
    });
    expect(greenButton.properties).toContainEqual({
      label: 'Slice margins',
      monospace: true,
      value: 'L 86 · T 100 · R 52 · B 68',
    });
    expect(greenButton.usages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Green Button',
          source: 'Background',
        }),
        expect.objectContaining({
          label: 'Compact Cost Button',
          source: 'Background',
        }),
      ]),
    );
  });

  it('keeps intrinsic radius-50 geometry for every registered color', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );

    for (const color of ['gray', 'green', 'red', 'yellow']) {
      const button = assets.find(
        ({ assetId }) =>
          assetId
          === `source:assets/ui/regular-button/${color}-button-50.9.png`,
      );

      expect(button.borderInsets, color).toEqual({
        top: 100,
        right: 52,
        bottom: 68,
        left: 86,
      });
      expect(button.minimumSize, color).toEqual({
        width: 141,
        height: 171,
      });
    }
  });

  it('includes supporting icon and portrait assets', () => {
    const assetIds = new Set(
      createIdleWizardAssetEntries(createIdleWizardButtonEntries()).map(
        ({ assetId }) => assetId,
      ),
    );

    expect(assetIds.has('source:assets/ui/root-run-cost-button/coin.png')).toBe(
      true,
    );
    expect(
      assetIds.has(
        'source:assets/ui/root-run-settings/settings-icon-gear.png',
      ),
    ).toBe(true);
    expect(assetIds.has('source:assets/avatars/elara.png')).toBe(true);
  });

  it('carries widget previews and feature locations into asset usages', () => {
    const greenButton = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    ).find(
      ({ assetId }) =>
        assetId
        === 'source:assets/ui/regular-button/green-button-50.9.png',
    );
    const usage = greenButton.usages.find(
      ({ widgetId }) => widgetId === 'green-button',
    );

    expect(usage).toEqual(
      expect.objectContaining({
        createThumbnail: expect.any(Function),
        label: 'Green Button',
        locations: expect.arrayContaining([
          {
            label: 'Garden Harvest All action',
            source: 'src/rendering/pixi/pages/garden/GardenPixiPage.js',
          },
        ]),
        source: 'Background',
      }),
    );
  });
});
