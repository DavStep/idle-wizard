// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Sprite, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
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
    expect(stall.price.text).toBe('12 Coin');
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

  it('reuses the research row skin, paper ink, title case, and stars', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({
      assetManager: {
        ...createPixiAssetManagerFake(Texture),
        loaded: true,
        getTexture,
      },
    });
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    expect(harness.page.marketTitlePlaque.title.text).toBe(
      'Small Town Market',
    );
    expect(harness.page.marketRankStars.level).toBe(1);
    expect(harness.page.marketTitlePlaque.assetId).toBe(
      PIXI_ROOT_RUN_ASSETS.dialogTitle,
    );
    expect(harness.page.marketTitlePlaque.frame.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.dialog.titleSourceInsets,
    );
    expect(harness.page.marketTitlePlaque.frame.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.dialog.titleBorderInsets,
    );
    expect(
      harness.page.marketTitlePlaque.frame.borderInsets.left,
    ).toBeGreaterThan(0);
    expect(
      harness.page.marketTitlePlaque.frame.borderInsets.right,
    ).toBeGreaterThan(0);
    expect(harness.page.marketTitlePlaque.width).toBeLessThan(
      harness.page.sourceWidth,
    );
    expect(harness.page.marketTitlePlaque.root.x).toBe(
      (harness.page.sourceWidth -
        harness.page.marketTitlePlaque.width) /
        2,
    );
    expect(
      harness.page.marketTitlePlaque.title.textObject.anchor.x,
    ).toBe(0.5);
    expect(harness.page.marketTitlePlaque.title.x).toBe(
      harness.page.marketTitlePlaque.width / 2 - 8,
    );
    expect(harness.page.marketRankStars.parent).toBe(
      harness.page.marketTitlePlaque.root,
    );
    expect(harness.page.marketRankStars.x).toBeGreaterThan(
      harness.page.marketTitlePlaque.width / 2,
    );
    expect(
      harness.page.marketRankStars.x +
        harness.page.marketRankStars.measuredWidth,
    ).toBeLessThanOrEqual(
      harness.page.marketTitlePlaque.width -
        harness.page.marketTitlePlaque.frame.borderInsets.right,
    );
    expect(harness.page.stallsSection.titlePlaque.variant).toBe(
      'automation',
    );
    expect(harness.page.stallsSection.titlePlaque.title.text).toBe(
      'Your Stalls',
    );
    expect(harness.page.stallsSection.panel).toBeUndefined();
    expect(stall.frame).toBeInstanceOf(PixiNineSliceFrame);
    expect(stall.frame.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
    );
    expect(stall.frame.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    expect(getTexture).toHaveBeenCalledWith(
      'source:assets/ui/root-run-research/research-card-1000x304.png',
    );
    expect(harness.page.stallsSection.titlePlaque.assetId).toBe(
      'source:assets/ui/root-run-research/research-station-title-red.png',
    );
    expect(stall.title.text).toBe('Stall 1');
    expect(stall.item.text).toBe('Sage');
    expect(stall.price.text).toBe('10 Coin');
    expect(harness.page.stallsSection.ledgerButton.text.text).toBe(
      'Market Ledger',
    );
    expect(stall.title.textObject.style.fill).toBe('#634934');
    expect(stall.item.textObject.style.fill).toBe('#634934');
    expect(stall.price.textObject.style.fill).toBe('#634934');
    expect(stall.title.textObject.style.stroke).toBeNull();
    expect(stall.item.textObject.style.stroke).toBeNull();
    expect(stall.stars.level).toBe(1);
    expect(stall.stars.position.x).toBe(
      stall.title.x + stall.title.measuredWidth + 4,
    );
    expect(stall.stars.position.y).toBe(stall.title.y + 1);

    harness.page.destroy();
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
      expect(harness.dialogs.get(dialogId).panel).toBeInstanceOf(
        PixiDialogFrame,
      );
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

  it('opens the tutorial-targeted stall when the tutorial overlay owns the event path', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    const registration = inputRouter.store
      .getRegistrations('press')
      .find((entry) => entry.displayObject === stall.root);
    const tutorialOverlay = new Container({
      label: 'tutorial-overlay-hit',
    });
    const bounds = stall.root.getBounds();
    const point = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };

    expect(registration?.fallbackHitTest).toBe(true);
    inputRouter.onPointerDown(
      createPointerEvent(tutorialOverlay, 'pointerdown', point),
    );
    inputRouter.onPointerUp(
      createPointerEvent(tutorialOverlay, 'pointerup', point),
    );

    expect(harness.dialogs.isOpen(SHOP_DIALOG_IDS.STALL)).toBe(true);

    tutorialOverlay.destroy();
    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });

  it('registers every Market lesson target inside the stall dialog', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    const chooseSeed = vi.fn(() => true);
    const setPercentage = vi.fn(() => true);
    const markSeed = vi.fn(() => true);
    const selectSeedTab = vi.fn(() => true);
    harness.page.bind(createShopViewModel());
    harness.page.activate();
    harness.page.openDialog(SHOP_DIALOG_IDS.STALL, {
      title: 'load stall',
      range: {
        enabled: true,
        value: 0,
        onChange: setPercentage,
      },
      items: [
        {
          id: 'sageSeed',
          label: 'sage seed',
          enabled: true,
          semanticId: 'shop.stall.1.item.sageSeed',
          tutorialId: 'shop:sell:sageSeed',
          action: chooseSeed,
        },
      ],
      actions: [
        {
          id: 'mark',
          label: 'mark x1',
          enabled: true,
          semanticId: 'shop.stall.1.mark',
          tutorialId: 'shop:sell:mark',
          action: markSeed,
        },
      ],
      tabs: [
        {
          id: 'seed',
          label: 'seeds',
          semanticId: 'shop.stall.1.tab.seed',
          tutorialId: 'shop:sell:tab:seed',
          action: selectSeedTab,
        },
      ],
    });

    for (const tutorialId of [
      'shop:sell:sageSeed',
      'shop:sell:percentage',
      'shop:sell:mark',
      'shop:sell:tab:seed',
    ]) {
      expect(
        harness.semanticRegistry.getTutorialTarget(tutorialId),
      ).not.toBeNull();
    }

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.STALL);
    const row = dialog.list.rows.getWidgets()[0];
    const mark = dialog.actions.getWidgets()[0];
    const seedTab = dialog.tabs.getWidgets()[0];
    const fallbackObjects = inputRouter.store
      .getRegistrations('press')
      .filter((entry) => entry.fallbackHitTest === true)
      .map((entry) => entry.displayObject);
    expect(fallbackObjects).toEqual(
      expect.arrayContaining([
        row.root,
        dialog.rangeControl,
        mark.root,
        seedTab.root,
      ]),
    );

    harness.semanticRegistry.activate('shop.stall.1.item.sageSeed');
    harness.semanticRegistry.activate('shop.stall.allocation', {
      localX: dialog.rangeControl.controlWidth * 0.25,
    });
    harness.semanticRegistry.activate('shop.stall.1.mark');
    harness.semanticRegistry.activate('shop.stall.1.tab.seed');

    expect(chooseSeed).toHaveBeenCalledTimes(1);
    expect(setPercentage).toHaveBeenCalledTimes(1);
    expect(markSeed).toHaveBeenCalledTimes(1);
    expect(selectSeedTab).toHaveBeenCalledTimes(1);

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });

  it('keeps market ledger detail lines inside their retained rows', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    harness.page.openDialog(SHOP_DIALOG_IDS.LEDGER, {
      title: 'market ledger',
      items: [
        {
          id: 'sage',
          label: 'sage',
          detail: 'stock 4 · buyers 6',
          value: '3 coin',
        },
        {
          id: 'mint',
          label: 'mint',
          detail: 'stock 2 · buyers 5',
          value: '4 coin',
        },
      ],
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.LEDGER);
    const [firstRow, secondRow] = dialog.list.rows.getWidgets();
    const firstDetailBottom =
      firstRow.detail.y + Math.ceil(firstRow.detail.measuredHeight);

    expect(firstRow.detail.visible).toBe(true);
    expect(secondRow.root.y).toBeGreaterThanOrEqual(firstDetailBottom);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps stall controls in a separate white section above icon-backed item rows', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    harness.page.openDialog(SHOP_DIALOG_IDS.STALL, {
      title: 'load stall',
      summaryRows: [
        {
          id: 'current',
          label: 'current',
          value: 'sage seed',
          quantityLabel: 'x2',
          itemKind: 'seed',
          itemKey: 'sageSeed',
        },
      ],
      range: {
        enabled: true,
        value: 25,
      },
      items: [
        {
          id: 'sageSeed',
          label: 'sage seed',
          detail: '8 available',
          itemKind: 'seed',
          itemKey: 'sageSeed',
          selected: true,
        },
      ],
      actions: [
        { id: 'mark', label: 'mark x2', enabled: true },
        { id: 'clear', label: 'clear', enabled: true },
        { id: 'future', label: 'mark future', enabled: true },
      ],
      tabs: [
        { id: 'seed', label: 'seeds', selected: true },
        { id: 'herb', label: 'herbs' },
        { id: 'potion', label: 'potions' },
      ],
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.STALL);
    const [row] = dialog.list.rows.getWidgets();
    const [mark] = dialog.actions.getWidgets();
    const [seedsTab, herbsTab] = dialog.tabs.getWidgets();

    expect(dialog.selectionSection.visible).toBe(true);
    expect(dialog.itemSection.visible).toBe(true);
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(dialog.selectionSection.texture).toBe(
      dialog.panel.paperFrame.texture,
    );
    expect(dialog.itemSection.texture).toBe(
      dialog.panel.paperFrame.texture,
    );
    expect(dialog.selectionSection.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperSourceInsets,
    );
    expect(dialog.rangeControl.knob).toBeInstanceOf(Sprite);
    expect(dialog.rangeControl.knob.width).toBeCloseTo(23);
    expect(dialog.rangeControl.x).toBe(-8);
    expect(dialog.rangeControl.controlWidth).toBe(
      dialog.panel.contentBoxWidth + 16,
    );
    expect(mark.root.y - (
      dialog.rangeControl.y + dialog.rangeControl.controlHeight
    )).toBe(8);
    expect(dialog.selectionSectionBounds.height).toBeGreaterThan(0);
    expect(dialog.itemSectionBounds.y).toBeGreaterThan(
      dialog.selectionSectionBounds.y +
        dialog.selectionSectionBounds.height,
    );
    expect(dialog.selectionSection.x).toBeLessThan(
      dialog.selectionSectionBounds.x,
    );
    expect(
      dialog.selectionSection.x +
        dialog.selectionSection.frameWidth,
    ).toBeGreaterThan(
      dialog.selectionSectionBounds.x +
        dialog.selectionSectionBounds.width,
    );
    expect(
      dialog.itemSection.y -
        (dialog.selectionSection.y +
          dialog.selectionSection.frameHeight),
    ).toBeCloseTo(8);
    expect(mark.root.y).toBeLessThan(dialog.list.root.y);
    expect(mark.control.variant).toBe('yellow');
    expect(dialog.tabLayer.parent).toBe(dialog.panel);
    expect(dialog.tabLayer.y).toBe(dialog.config.height - 2);
    expect(seedsTab.control.variant).toBe('tab');
    expect(seedsTab.control.resolveRootRunVariant()).toBe(
      'brown-light',
    );
    expect(herbsTab.control.resolveRootRunVariant()).toBe(
      'brown-dark',
    );
    expect(row.itemIcon.visible).toBe(true);
    expect(row.itemIconOverlay.visible).toBe(true);
    expect(
      row.itemIconOverlay.width / row.itemIcon.width,
    ).toBeCloseTo(0.44);
    expect(row.itemIconOverlay.y).toBeGreaterThan(row.itemIcon.y);
    expect(row.itemIconOverlay.rotation).toBeCloseTo(
      (6 * Math.PI) / 180,
    );
    expect(row.background).toBeInstanceOf(PixiNineSliceFrame);
    expect(row.background.sourceInsets).toEqual({
      top: 17,
      right: 25,
      bottom: 19,
      left: 13,
    });
    expect(row.height).toBe(50);
    expect(
      row.itemIcon.x -
        row.itemIcon.width / 2 -
        row.background.x,
    ).toBeCloseTo(8);
    expect(row.selectedIndicator.visible).toBe(true);
    expect(row.selectedIndicator.x).toBeGreaterThan(row.label.x);
    expect(
      row.background.x +
        row.background.frameWidth -
        (row.selectedIndicator.x +
          row.selectedIndicator.width / 2),
    ).toBeCloseTo(8);
    expect(row.label.fontWeight).toBe('normal');
    expect(dialog.list.scroll.progressBar).toBeNull();

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the frozen source-space Shop anchors', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());

    expect(
      harness.page.panelScrolls.get('traders').position,
    ).toMatchObject({ x: 0, y: 151 });
    expect(harness.page.tabLayer.position).toMatchObject({
      x: 16,
      y: 527.3333333333334,
    });
    expect(harness.page.tabButtons.get('traders')).toMatchObject({
      buttonHeight: 28,
    });
    expect(
      harness.page.panelScrolls.get('traders').viewportHeight,
    ).toBeCloseTo(370.33333333333337, 10);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the shared brown tab skins for Market navigation', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());

    expect(
      [...harness.page.tabButtons.values()].map(
        (button) => button.textLabel.text,
      ),
    ).toEqual(['Traders', 'Players', 'Crystals']);
    expect(
      [...harness.page.tabButtons.values()].map((button) => button.variant),
    ).toEqual(['tab', 'tab', 'tab']);
    expect(
      harness.page.tabButtons.get('traders').resolveRootRunVariant(),
    ).toBe('brown-light');
    expect(
      harness.page.tabButtons.get('players').resolveRootRunVariant(),
    ).toBe('brown-dark');

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

  it('keeps the stall dialog open when the backdrop receives a tap inside the panel', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    harness.page.bind(createShopViewModel());
    harness.page.activate();
    harness.page.openDialog(SHOP_DIALOG_IDS.STALL, {
      title: 'load stall',
      items: [],
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.STALL);
    const insidePoint = {
      x: dialog.panel.x + dialog.panel.coreWidth / 2,
      y: dialog.panel.y + dialog.panel.coreHeight / 2,
    };
    inputRouter.onPointerDown(
      createPointerEvent(dialog.backdrop, 'pointerdown', insidePoint),
    );
    inputRouter.onPointerUp(
      createPointerEvent(dialog.backdrop, 'pointerup', insidePoint),
    );

    expect(harness.dialogs.isOpen(SHOP_DIALOG_IDS.STALL)).toBe(true);

    const outsidePoint = { x: 2, y: 2 };
    inputRouter.onPointerDown(
      createPointerEvent(dialog.backdrop, 'pointerdown', outsidePoint),
    );
    inputRouter.onPointerUp(
      createPointerEvent(dialog.backdrop, 'pointerup', outsidePoint),
    );

    expect(harness.dialogs.isOpen(SHOP_DIALOG_IDS.STALL)).toBe(false);

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });
});

function createHarness({
  assetManager = createPixiAssetManagerFake(Texture),
  inputRouter = null,
} = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const semanticRegistry = new SemanticTargetRegistry();
  const page = new ShopPixiPage({
    assetManager,
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

function createPointerEvent(target, type, point = { x: 0, y: 0 }) {
  return {
    type,
    target,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    global: point,
    clientX: point.x,
    clientY: point.y,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
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
            capacityLabel: '★',
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
