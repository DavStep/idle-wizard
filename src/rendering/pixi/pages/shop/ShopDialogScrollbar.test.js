// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import {
  RETAINED_DIALOG_LIST_GEOMETRY,
  RETAINED_SCROLLBAR_GEOMETRY,
} from '../workshop/RetainedPageKit.js';
import {
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
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

    const [row, secondRow] = dialog.list.rows.getWidgets();
    const rowRight =
      dialog.list.root.x +
      row.root.x +
      row.background.x +
      row.background.frameWidth;
    const scrollbarRight =
      dialog.list.root.x +
      dialog.list.scroll.scrollbarTrack.sprite.position.x;
    const scrollbarLeft =
      scrollbarRight - RETAINED_SCROLLBAR_GEOMETRY.width;
    const paperRight =
      dialog.itemSection.x + dialog.itemSection.frameWidth;

    expect(dialog.list.scroll.scrollbarTrack.visible).toBe(true);
    expect(dialog.list.scroll.scrollbarThumb.visible).toBe(true);
    expect(row.background.frameWidth).toBe(
      PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth,
    );
    expect(dialog.list.width).toBe(
      PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth +
        RETAINED_DIALOG_LIST_GEOMETRY.scrollbarViewportOutset,
    );
    expect(secondRow.root.y - row.root.y).toBe(
      PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    );
    expect(scrollbarLeft - rowRight).toBeGreaterThan(2.5);
    expect(paperRight - scrollbarRight).toBeGreaterThan(2.5);
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
