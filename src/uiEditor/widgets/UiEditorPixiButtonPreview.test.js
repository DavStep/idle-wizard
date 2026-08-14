// @vitest-environment jsdom

import { beforeAll, describe, expect, it } from 'vitest';
import { createUiEditorThumbnailRenderQueue } from './UiEditorThumbnailRenderQueue.js';

let createUiEditorPixiButtonPreview;
let createAssetOptions;
let createButtonInspectorFields;
let resolveButtonBackgroundAtomAsset;
let PIXI_ROOT_RUN_ASSETS;
let getPixiTabButtonSkin;

describe('UiEditorPixiButtonPreview', () => {
  beforeAll(async () => {
    globalThis.HTMLCanvasElement.prototype.getContext = () => null;
    const [previewModule, themeModule, popupTabModule] = await Promise.all([
      import('./UiEditorPixiButtonPreview.js'),
      import('../../rendering/pixi/theme/PixiThemeTokens.js'),
      import('../../rendering/pixi/primitives/PixiTabButton.js'),
    ]);
    ({
      createAssetOptions,
      createButtonInspectorFields,
      createUiEditorPixiButtonPreview,
      resolveButtonBackgroundAtomAsset,
    } = previewModule);
    ({ PIXI_ROOT_RUN_ASSETS } = themeModule);
    ({ getPixiTabButtonSkin } = popupTabModule);
  }, 15_000);

  it('serializes thumbnail renders so expanding the library cannot fan out GPU contexts', async () => {
    const queue = createUiEditorThumbnailRenderQueue();
    let activeRenders = 0;
    let maximumActiveRenders = 0;

    const renders = Array.from({ length: 21 }, (_, index) =>
      queue.run(async () => {
        activeRenders += 1;
        maximumActiveRenders = Math.max(
          maximumActiveRenders,
          activeRenders,
        );
        await Promise.resolve(index);
        activeRenders -= 1;
      }),
    );

    await Promise.all(renders);

    expect(maximumActiveRenders).toBe(1);
  });

  it('adopts another button definition without replacing its live canvas', () => {
    const firstPreview = createUiEditorPixiButtonPreview({
      id: 'first-button',
      label: 'First Button',
      preview: {},
    });
    const liveCanvas = firstPreview.querySelector('canvas');
    const nextPreview = createUiEditorPixiButtonPreview({
      id: 'next-button',
      label: 'Next Button',
      preview: { type: 'tab' },
    });

    expect(firstPreview.uiEditorAdoptPreview(nextPreview)).toBe(true);
    expect(firstPreview.dataset.editorButtonWidget).toBe('next-button');
    expect(firstPreview.getAttribute('aria-label')).toBe(
      'Next Button preview',
    );
    expect(firstPreview.querySelector('canvas')).toBe(liveCanvas);
    expect(liveCanvas.getAttribute('aria-label')).toBe('Next Button');
    expect(
      firstPreview.querySelector('.ui-editor-game-screen-preview__viewport')
        .getAttribute('aria-label'),
    ).toBe(
      'TabButton authored screen. Drag or use arrow keys to move.',
    );
  });

  it('reuses the authored-screen zoom controls while keeping panning opt-in', () => {
    const preview = createUiEditorPixiButtonPreview({
      id: 'base-button',
      label: 'Base Button',
      preview: { type: 'base' },
    });
    const pan = preview.querySelector(
      '.ui-editor-game-screen-preview__pan',
    );

    expect(preview.dataset.previewViewport).toBe('game-screen');
    expect(
      preview.querySelector('[aria-label="Widget preview zoom in"]'),
    ).not.toBeNull();
    expect(
      preview.querySelector('[aria-label="Widget preview zoom out"]'),
    ).not.toBeNull();
    expect(
      preview.querySelector('[aria-label="Center widget preview"]'),
    ).not.toBeNull();
    expect(pan.getAttribute('aria-pressed')).toBe('false');
    expect(pan.getAttribute('aria-label')).toBe(
      'Toggle widget preview panning',
    );
  });

  it('bridges hierarchy selection into the live Pixi preview', () => {
    const preview = createUiEditorPixiButtonPreview({
      id: 'text-button',
      label: 'Text Button',
      preview: {
        text: 'Continue',
        type: 'text',
      },
    });

    expect(typeof preview.uiEditorSelectAtomicComponent).toBe('function');
  });

  it('scopes button controls to the selected hierarchy component', () => {
    const preview = createUiEditorPixiButtonPreview({
      id: 'text-button',
      label: 'Text Button',
      preview: {
        color: 'yellow',
        sizeTier: 50,
        text: 'Continue',
        type: 'text',
        variant: 'regular',
      },
    });
    const state = preview.uiEditorGetButtonEditorState();
    expect(preview.uiEditorCreateInspector).toBeUndefined();
    expect(
      createButtonInspectorFields(preview.uiEditorButtonPreviewDefinition.preview, state, 'base')
        .map(({ id }) => id),
    ).toEqual(['color', 'sizeTier', 'enabled']);
    expect(
      createButtonInspectorFields(preview.uiEditorButtonPreviewDefinition.preview, state, 'widget')
        .map(({ id }) => id),
    ).toEqual([]);
  });

  it('keeps cost layout and state on the widget rather than its visual atoms', () => {
    const preview = createUiEditorPixiButtonPreview({
      id: 'cost-button',
      label: 'Cost Button',
      preview: {
        actionLabel: 'Unlock',
        amountLabel: '25 Coin',
        color: 'green',
        showLabel: false,
        type: 'cost',
      },
    });
    const state = preview.uiEditorGetButtonEditorState();
    expect(
      createButtonInspectorFields(preview.uiEditorButtonPreviewDefinition.preview, state, 'widget')
        .map(({ id }) => id),
    ).toEqual(['layout', 'label', 'status']);
  });

  it('disables nine-slice skins that exceed the widget minimum size', () => {
    const tabSkin = getPixiTabButtonSkin({
      height: 28,
      selected: false,
      sizeTier: 50,
      width: 92,
    });
    const options = createAssetOptions(
      PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
      {
        asset: {
          borderInsets: tabSkin.borderInsets,
          id: PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
          minimumCenter: { width: 1, height: 1 },
          nineSlice: true,
          sourceInsets: tabSkin.sourceInsets,
        },
        targetLabel: 'Tab Button',
        targetSize: {
          width: 92,
          height: 28,
        },
      },
    );
    const regularButton = options.find(
      ({ value }) => value === PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice,
    );
    const sharedTab = options.find(
      ({ value }) => value === PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
    );

    expect(regularButton).toMatchObject({
      disabled: true,
      reason:
        'Requires at least 28×30; Tab Button minimum is 92×28.',
    });
    expect(sharedTab.disabled).toBe(false);
  });

  it('inspects the tab active skin instead of its resting catalogue asset', () => {
    const tabSkin = getPixiTabButtonSkin({
      height: 28,
      selected: true,
      sizeTier: 50,
      width: 92,
    });
    const activeAsset = resolveButtonBackgroundAtomAsset(
      [{
        id: PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
        role: 'Background',
      }],
      {
        activeSkin: {
          assetId: PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
          borderInsets: tabSkin.borderInsets,
          minimumCenter: { width: 1, height: 1 },
          sourceInsets: tabSkin.sourceInsets,
        },
        buttonHeight: 28,
        buttonWidth: 92,
      },
    );

    expect(activeAsset).toMatchObject({
      id: PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
      role: 'Background',
    });
  });
});
