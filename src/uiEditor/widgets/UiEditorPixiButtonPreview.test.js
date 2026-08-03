// @vitest-environment jsdom

import { beforeAll, describe, expect, it } from 'vitest';

describe('UiEditorPixiButtonPreview', () => {
  beforeAll(() => {
    globalThis.HTMLCanvasElement.prototype.getContext = () => null;
  });

  it('serializes thumbnail renders so expanding the library cannot fan out GPU contexts', async () => {
    const { createUiEditorThumbnailRenderQueue } = await import(
      './UiEditorPixiButtonPreview.js'
    );
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

  it('adopts another button definition without replacing its live canvas', async () => {
    const { createUiEditorPixiButtonPreview } = await import(
      './UiEditorPixiButtonPreview.js'
    );
    const firstPreview = createUiEditorPixiButtonPreview({
      id: 'first-button',
      label: 'First Button',
      preview: {},
    });
    const liveCanvas = firstPreview.querySelector('canvas');
    const nextPreview = createUiEditorPixiButtonPreview({
      id: 'next-button',
      label: 'Next Button',
      preview: {},
    });

    expect(firstPreview.uiEditorAdoptPreview(nextPreview)).toBe(true);
    expect(firstPreview.dataset.editorButtonWidget).toBe('next-button');
    expect(firstPreview.getAttribute('aria-label')).toBe(
      'Next Button preview',
    );
    expect(firstPreview.querySelector('canvas')).toBe(liveCanvas);
    expect(liveCanvas.getAttribute('aria-label')).toBe('Next Button');
  });

  it('disables nine-slice skins that exceed the widget minimum size', async () => {
    const [{ createAssetOptions }, { PIXI_ROOT_RUN_ASSETS, PIXI_ROOT_RUN_GEOMETRY }] =
      await Promise.all([
        import('./UiEditorPixiButtonPreview.js'),
        import('../../rendering/pixi/theme/PixiThemeTokens.js'),
      ]);
    const options = createAssetOptions(
      PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
      {
        asset: {
          borderInsets: PIXI_ROOT_RUN_GEOMETRY.tabButton.borderInsets,
          id: PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
          minimumCenter: { width: 1, height: 1 },
          nineSlice: true,
          sourceInsets: PIXI_ROOT_RUN_GEOMETRY.tabButton.sourceInsets,
        },
        targetLabel: 'Popup Tab Button',
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
        'Requires at least 28×30; Popup Tab Button minimum is 92×28.',
    });
    expect(sharedTab.disabled).toBe(false);
  });
});
