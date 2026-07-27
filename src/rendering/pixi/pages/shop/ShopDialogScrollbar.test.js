// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import {
  SHOP_DIALOG_IDS,
  ShopDialogPixi,
} from './ShopDialogPixi.js';

globalThis.CanvasRenderingContext2D.prototype.createLinearGradient =
  () => ({
    addColorStop() {},
  });
globalThis.CanvasRenderingContext2D.prototype.fillRect = () => {};

describe('ShopDialogPixi stall scrollbar', () => {
  let dialog = null;

  afterEach(() => {
    dialog?.destroy();
    dialog = null;
  });

  it('shows the overflow scrollbar in the paper gutter beside the rows', () => {
    dialog = new ShopDialogPixi({
      dialogId: SHOP_DIALOG_IDS.STALL,
      assetManager: createPixiAssetManagerFake(Texture),
    });
    dialog.bind({
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `seed-${index}`,
        label: `seed ${index}`,
        detail: `${index} available`,
        itemKind: 'seed',
        itemKey: 'sageSeed',
      })),
    });

    const [row] = dialog.list.rows.getWidgets();
    const trackBounds =
      dialog.list.scroll.scrollbarTrack.getLocalBounds();
    const rowRight =
      dialog.list.root.x +
      row.root.x +
      row.background.x +
      row.background.frameWidth;
    const paperRight =
      dialog.itemSection.x + dialog.itemSection.frameWidth;

    expect(dialog.list.scroll.scrollbarTrack.visible).toBe(true);
    expect(dialog.list.scroll.scrollbarThumb.visible).toBe(true);
    expect(trackBounds.x).toBeGreaterThan(rowRight);
    expect(trackBounds.x + trackBounds.width).toBeLessThanOrEqual(
      paperRight,
    );
  });

  it('hides the scrollbar when the stall rows do not overflow', () => {
    dialog = new ShopDialogPixi({
      dialogId: SHOP_DIALOG_IDS.STALL,
      assetManager: createPixiAssetManagerFake(Texture),
    });
    dialog.bind({
      items: [
        {
          id: 'sage-seed',
          label: 'sage seed',
          detail: '4 available',
          itemKind: 'seed',
          itemKey: 'sageSeed',
        },
      ],
    });

    expect(dialog.list.scroll.scrollbarTrack.visible).toBe(false);
    expect(dialog.list.scroll.scrollbarThumb.visible).toBe(false);
  });
});
