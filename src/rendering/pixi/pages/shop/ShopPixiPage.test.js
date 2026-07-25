// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { SHOP_DIALOG_IDS } from './ShopDialogPixi.js';
import { ShopPixiPage } from './ShopPixiPage.js';

globalThis.CanvasRenderingContext2D.prototype.createLinearGradient =
  () => ({
    addColorStop() {},
  });
globalThis.CanvasRenderingContext2D.prototype.fillRect = () => {};

describe('ShopPixiPage', () => {
  it('retains the three page trees and keyed widgets after warm-up', () => {
    const harness = createHarness();
    const pages = new PageRegistry({
      pages: [['shop', harness.page]],
    });
    pages.bind('shop', createShopViewModel());
    pages.activate('shop');

    const root = harness.page.root;
    const stall = harness.page.stallsSection.stalls.get('stall-1');
    const request =
      harness.page.requestsSection.rows.get('request-1');
    const market =
      harness.page.playerMarketSection.rows.get('listing-1');
    const stallAllocations =
      harness.page.stallsSection.stallPool.getStats().allocated;
    const requestAllocations =
      harness.page.requestsSection.rowPool.getStats().allocated;

    pages.bind(
      'shop',
      createShopViewModel({
        stallPrice: '12 coin',
        requestValue: '3 herb',
      }),
    );

    expect(harness.page.root).toBe(root);
    expect(harness.page.stallsSection.stalls.get('stall-1')).toBe(
      stall,
    );
    expect(
      harness.page.requestsSection.rows.get('request-1'),
    ).toBe(request);
    expect(
      harness.page.playerMarketSection.rows.get('listing-1'),
    ).toBe(market);
    expect(
      harness.page.stallsSection.stallPool.getStats().allocated,
    ).toBe(stallAllocations);
    expect(
      harness.page.requestsSection.rowPool.getStats().allocated,
    ).toBe(requestAllocations);
    expect(stall.price.text).toBe('12 coin');
    expect(stall.progress).toMatchObject({
      tone: 'yellow',
      barHeight: 10,
    });
    expect(request.valueLabel.text).toBe('3 herb');

    pages.deactivate();
    expect(root).toMatchObject({
      eventMode: 'none',
      renderable: false,
      visible: false,
    });
    pages.destroy();
    harness.dispose();
  });

  it('routes semantic actions and constructs each Shop dialog once', () => {
    const harness = createHarness();
    const clearPlayerRequest = vi.fn();
    harness.page.bind(
      createShopViewModel({ clearPlayerRequest }),
    );
    harness.page.activate();

    expect(
      harness.semanticRegistry.activate('shop.stall.1'),
    ).toBe(true);
    expect(
      harness.dialogs.hasInstance(SHOP_DIALOG_IDS.STALL),
    ).toBe(true);
    const retainedDialogs = new Map();
    for (const dialogId of Object.values(SHOP_DIALOG_IDS)) {
      if (!harness.dialogs.isOpen(dialogId)) {
        harness.page.openDialog(dialogId, {
          title: dialogId,
          items: [],
        });
      }
      retainedDialogs.set(dialogId, harness.dialogs.get(dialogId));
      if (dialogId === SHOP_DIALOG_IDS.STALL) {
        expect(harness.dialogs.get(dialogId).panel.outerHeight).toBe(
          364,
        );
      }
      if (dialogId === SHOP_DIALOG_IDS.LEDGER) {
        expect(harness.dialogs.get(dialogId).panel.outerHeight).toBe(
          283,
        );
      }
      harness.dialogs.close(dialogId);
    }
    for (const dialogId of Object.values(SHOP_DIALOG_IDS)) {
      harness.page.openDialog(dialogId, {
        title: dialogId,
        items: [],
      });
      expect(harness.dialogs.get(dialogId)).toBe(
        retainedDialogs.get(dialogId),
      );
      harness.dialogs.close(dialogId);
    }
    expect(harness.dialogs.getStats().constructed).toBe(
      Object.values(SHOP_DIALOG_IDS).length,
    );

    const clearButton =
      harness.page.requestsSection.actions.get('clear');
    expect(clearButton.activate()).toBe(true);
    expect(clearPlayerRequest).toHaveBeenCalledTimes(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the frozen source-space Shop anchors', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());

    expect(
      harness.page.panelScrolls.get('traders').position,
    ).toMatchObject({ x: 16, y: 128 });
    expect(harness.page.tabLayer.position).toMatchObject({
      x: 16,
      y: 527.3333333333334,
    });
    expect(harness.page.tabButtons.get('traders')).toMatchObject({
      buttonHeight: 28,
    });
    expect(
      harness.page.panelScrolls.get('traders').viewportHeight,
    ).toBeCloseTo(393.33333333333337, 10);

    harness.page.destroy();
    harness.dispose();
  });

  it('blocks page input while a retained dialog owns the modal stack', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    harness.page.openDialog(SHOP_DIALOG_IDS.STALL, {
      title: 'load stall',
      items: [],
    });
    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.STALL);
    expect(inputRouter.getTopModal()?.id).toBe(
      SHOP_DIALOG_IDS.STALL,
    );
    expect(inputRouter.handleBack({ source: 'escape' })).toBe(true);
    expect(harness.dialogs.isOpen(SHOP_DIALOG_IDS.STALL)).toBe(false);
    expect(inputRouter.getTopModal()).toBeNull();

    harness.page.openDialog(SHOP_DIALOG_IDS.STALL, {
      title: 'load stall',
      items: [],
    });
    expect(harness.dialogs.get(SHOP_DIALOG_IDS.STALL)).toBe(dialog);
    expect(inputRouter.getTopModal()?.id).toBe(
      SHOP_DIALOG_IDS.STALL,
    );
    harness.dialogs.close(SHOP_DIALOG_IDS.STALL);

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });
});

function createHarness({ inputRouter = null } = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const semanticRegistry = new SemanticTargetRegistry();
  const page = new ShopPixiPage({
    assetManager: createPixiAssetManagerFake(Texture),
    dialogLayer,
    dialogRegistry: dialogs,
    semanticRegistry,
    inputRouter,
  });
  return {
    dialogLayer,
    dialogs,
    page,
    semanticRegistry,
    dispose() {
      dialogs.destroy();
      dialogLayer.destroy({ children: true });
    },
  };
}

function createShopViewModel({
  clearPlayerRequest = vi.fn(),
  requestValue = '2 herb',
  stallPrice = '10 coin',
  tabNotifications = null,
} = {}) {
  return {
    shop: {
      selectedTabId: 'traders',
      market: {
        name: 'Small Town Market',
        rank: 1,
      },
      traders: {
        timerLabel: 'refresh 2m',
        stalls: [
          {
            id: 'stall-1',
            slotNumber: 1,
            itemLabel: 'sage',
            quantityLabel: '2',
            priceLabel: stallPrice,
            progress: 0.5,
            dialog: {
              title: 'load stall',
              items: [],
            },
          },
        ],
      },
      players: {
        requests: {
          countLabel: '1/3',
          slots: [
            {
              id: 'request-1',
              slotNumber: 1,
              itemLabel: 'sage',
              value: requestValue,
              dialog: {
                title: 'request',
                items: [],
              },
            },
          ],
        },
        market: {
          countLabel: '1/3',
          slots: [
            {
              id: 'listing-1',
              slotNumber: 1,
              itemLabel: 'sage',
              value: '12 coin',
              dialog: {
                title: 'list item',
                items: [],
              },
            },
          ],
        },
      },
      crystals: {
        coinOffer: {
          rewardLabel: '100 coin',
          actionLabel: 'collect',
          canCollect: true,
        },
        offers: [
          {
            id: 'crystal-1',
            crystalCount: 10,
            bundleLabel: '10 crystals',
            priceLabel: '$0.99',
          },
        ],
      },
      tabNotifications,
    },
    actions: {
      clearPlayerRequest,
    },
  };
}
