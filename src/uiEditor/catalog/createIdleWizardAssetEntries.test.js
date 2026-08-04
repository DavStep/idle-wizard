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
    const regularButton = assets.find(
      ({ assetId }) =>
        assetId
        === 'source:assets/ui/regular-button/brown-button-50.9.png',
    );

    expect(elara.folderPath).toEqual(['avatars']);
    expect(settingsGear.folderPath).toEqual([
      'ui',
      'root-run-settings',
    ]);
    expect(regularButton.folderPath).toEqual(['ui', 'regular-button']);
  });

  it('does not catalog retired player-card skins', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );

    expect(
      assets.some(({ assetId }) => assetId.includes('/player-card-')),
    ).toBe(false);
  });

  it('does not catalog duplicate baked top-HUD backings', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const assetIds = new Set(assets.map(({ assetId }) => assetId));

    expect(assetIds.has(
      'source:assets/ui/root-run-top-hud/currency-bg.9.png',
    )).toBe(false);
    expect(assetIds.has(
      'source:assets/ui/root-run-top-hud/settings-bg.9.png',
    )).toBe(false);
    expect(assetIds.has(
      'source:assets/ui/root-run-top-hud/level-progress-panel.png',
    )).toBe(false);
    expect(assetIds.has(
      'source:assets/ui/white-squircle/white-squircle-20.9.png',
    )).toBe(true);
    expect(assetIds.has(
      'source:assets/ui/white-squircle/white-squircle-30.9.png',
    )).toBe(true);
    expect(assetIds.has(
      'source:assets/ui/white-squircle/white-squircle-40.9.png',
    )).toBe(true);
  });

  it('catalogs canonical Root Run dialog shell assets', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const dialogBackAssets = assets.filter(
      ({ assetId, folderPath }) =>
        folderPath.join('/') === 'ui/root-run-dialog'
        && assetId.includes('dialog-back'),
    );
    const dialogCloseAssets = assets.filter(
      ({ assetId, folderPath }) =>
        folderPath.join('/') === 'ui/root-run-dialog'
        && assetId.includes('close'),
    );

    expect(dialogBackAssets.map(({ assetId }) => assetId)).toEqual([
      'source:assets/ui/root-run-dialog/expedition-dialog-back.9.png',
    ]);
    expect(dialogCloseAssets.map(({ assetId }) => assetId)).toEqual([
      'source:assets/ui/root-run-dialog/expedition-dialog-close.png',
    ]);
  });

  it('groups reusable title plaques and ribbons as UI banners', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const bannerAssets = assets.filter(
      ({ folderPath }) =>
        JSON.stringify(folderPath) === JSON.stringify(['ui', 'banners']),
    );

    expect(bannerAssets.map(({ label }) => label).sort()).toEqual([
      'banner-blue-right.9.png',
      'banner-blue.9.png',
      'banner-cream.png',
      'banner-green-right.9.png',
      'banner-purple-ribbon.9.png',
      'banner-purple-right.9.png',
      'banner-purple.9.png',
      'banner-red-right.9.png',
      'banner-yellow-right.9.png',
    ]);
  });

  it('groups canonical currency icons as UI currencies', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const currencyAssets = assets.filter(
      ({ folderPath }) =>
        JSON.stringify(folderPath) === JSON.stringify(['ui', 'currencies']),
    );

    expect(currencyAssets.map(({ label }) => label).sort()).toEqual([
      'icon-coin.png',
      'icon-crystal.png',
      'icon-emerald.png',
      'icon-mana-drop.png',
      'icon-ruby.png',
    ]);
  });

  it('groups related nine-slice panel backgrounds without flattening their geometry families', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const backgrounds = assets.filter(
      ({ folderPath }) =>
        JSON.stringify(folderPath)
        === JSON.stringify(['ui', 'backgrounds']),
    );

    expect(backgrounds.map(({ label }) => label).sort()).toEqual([
      'expedition-dialog-front.9.png',
      'inner-section-panel-black.9.png',
      'inner-section-panel-day.9.png',
      'inner-section-panel-midnight.9.png',
      'inner-section-panel-white.9.png',
      'inner-section-panel-witchcraft.9.png',
      'research-card-1000x304.9.png',
      'research-card-dark-1000x304.9.png',
      'research-card-locked-1000x304.9.png',
      'research-upgrade-bg.9.png',
    ]);
    expect(backgrounds.every(({ nineSlice }) => nineSlice)).toBe(true);

    const compactResearchCard = backgrounds.find(
      ({ label }) => label === 'research-upgrade-bg.9.png',
    );
    const dialogPaper = backgrounds.find(
      ({ label }) => label === 'expedition-dialog-front.9.png',
    );

    expect(compactResearchCard.properties).toContainEqual({
      label: 'Background family',
      value: 'Research card',
    });
    expect(compactResearchCard.properties).toContainEqual({
      label: 'Variant',
      value: 'Compact source',
    });
    expect(dialogPaper.properties).toContainEqual({
      label: 'Background family',
      value: 'Dialog paper',
    });
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
      'dark-brown',
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

  it('distinguishes editable source PNGs from preview-only runtime and generated textures', () => {
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
    const sourcePng = assets.find(
      ({ assetId }) => assetId === 'source:assets/ui/xp-stars.png',
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
    expect(gameAtlas.atlasSize).toEqual({ height: 2048, width: 2048 });
    expect(gameAtlas.atlasFrames.length).toBeGreaterThan(100);
    expect(gameAtlas.atlasFrames[0]).toEqual(
      expect.objectContaining({
        height: expect.any(Number),
        name: expect.any(String),
        source: expect.stringContaining('assets/game/source/'),
        width: expect.any(Number),
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    );
    expect(gameAtlas.properties).toContainEqual({
      label: 'Atlas size',
      monospace: true,
      value: '2048 × 2048px',
    });
    expect(gameAtlas.properties).toContainEqual({
      label: 'Frames',
      value: String(gameAtlas.atlasFrames.length),
    });
    expect(sourcePng.editorEditable).toBe(true);
    expect(sourcePng.properties).toContainEqual({
      label: 'Editor access',
      value: 'Preview and 9-slice authoring',
    });
  });

  it('loads canonical regular-button sidecar metadata', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const greenButton = assets.find(
      ({ assetId }) =>
        assetId
        === 'source:assets/ui/regular-button/green-button-50.9.png',
    );

    expect(greenButton.nineSlice).toBe(true);
    expect(greenButton.editorEditable).toBe(true);
    expect(greenButton.sourceInsets).toEqual({
      top: 100,
      right: 52,
      bottom: 68,
      left: 86,
    });
  });

  it('shows canonical regular-button slice metadata in asset properties', () => {
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
    expect(greenButton.properties).toContainEqual({
      label: 'Slice margins',
      monospace: true,
      value: 'L 86 · T 100 · R 52 · B 68',
    });
  });

  it('treats the .9.png suffix as a nine-slice without sidecar metadata', () => {
    const assets = createIdleWizardAssetEntries(
      createIdleWizardButtonEntries(),
    );
    const dialogBack = assets.find(
      ({ assetId }) =>
        assetId
        === 'source:assets/ui/root-run-dialog/expedition-dialog-back.9.png',
    );

    expect(dialogBack.nineSlice).toBe(true);
    expect(dialogBack.sourceInsets).toBeNull();
    expect(dialogBack.properties).toContainEqual({
      label: 'Type',
      value: 'Nine-slice image',
    });
    expect(dialogBack.properties).toContainEqual({
      label: 'Slice margins',
      monospace: true,
      value: 'Auto (quarter image)',
    });

    const preview = dialogBack.createPreview();

    expect(preview.dataset.editorAssetMode).toBe('nine-slice');
    expect(
      preview.querySelector('.ui-editor-nine-slice'),
    ).not.toBeNull();
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

    expect(assetIds.has('source:assets/icons/icon-coin.png')).toBe(
      true,
    );
    expect(
      assetIds.has(
        'source:assets/ui/root-run-settings/settings-icon-gear.png',
      ),
    ).toBe(true);
    expect(assetIds.has('source:assets/avatars/elara.png')).toBe(true);
    expect(
      [...assetIds].some((assetId) => assetId.includes('/popup-tab/')),
    ).toBe(false);
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
