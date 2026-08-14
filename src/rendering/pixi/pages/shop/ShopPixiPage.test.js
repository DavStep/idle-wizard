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
import {
  PIXI_DIALOG_PALETTE,
  PixiDialogFrame,
} from '../../primitives/PixiDialogFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import {
  PIXI_PROGRESS_VISUALS,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_TEXT_STROKE_COLOR,
  PIXI_UI_GEOMETRY,
  createPixiThemeSnapshot,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';
import { SHOP_DIALOG_IDS } from './ShopDialogPixi.js';
import { ShopPixiPage } from './ShopPixiPage.js';
import {
  RETAINED_DIALOG_LIST_GEOMETRY,
  RetainedScrollArea,
} from '../workshop/RetainedPageKit.js';

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
      tone: 'root',
      barHeight: 10,
      fillColor: PIXI_PROGRESS_VISUALS.tones.root.fill,
    });
    stall.applyTheme(
      createPixiThemeSnapshot({ progressBar: 'gradient' }),
    );
    expect(stall.progress.gradient).toBeNull();
    expect(stall.progress.fillColor).toBe(
      PIXI_PROGRESS_VISUALS.tones.root.fill,
    );
    expect(request.price.text).toBe('3 Herb');

    pages.deactivate();
    expect(root).toMatchObject({
      eventMode: 'none',
      renderable: false,
      visible: false,
    });
    pages.destroy();
    harness.dispose();
  });

  it('uses the Market ribbon with a centered title-and-stars group', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({
      assetManager: {
        ...createPixiAssetManagerFake(Texture),
        loaded: true,
        getTexture,
      },
    });
    const viewModel = createShopViewModel();
    viewModel.shop.traders.stalls[0].priceResourceKey = 'coin';
    harness.page.bind(viewModel);
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    const ribbon = harness.page.marketTitleRibbon;
    expect(ribbon.title.text).toBe(
      'Small Town Market',
    );
    expect(ribbon.stars.level).toBe(1);
    expect(ribbon.assetId).toBe(
      PIXI_ROOT_RUN_ASSETS.marketTitleRibbon,
    );
    expect(ribbon.jewel).toBeUndefined();
    expect(ribbon.frame.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.sourceInsets,
    );
    expect(ribbon.frame.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.borderInsets,
    );
    expect(ribbon.width).toBeLessThan(
      harness.page.sourceWidth,
    );
    expect(ribbon.root.x).toBe(
      (harness.page.sourceWidth -
        ribbon.width) /
        2,
    );
    expect(ribbon.title.textObject.anchor.x).toBe(0.5);
    expect(ribbon.stars.parent).toBe(ribbon.root);
    expect(ribbon.contentGroupCenterX).toBeCloseTo(
      ribbon.width / 2,
      6,
    );
    expect(
      ribbon.title.x - ribbon.title.measuredWidth / 2,
    ).toBeCloseTo(ribbon.contentGroupLeft, 6);
    expect(
      ribbon.stars.x + ribbon.stars.measuredWidth,
    ).toBeCloseTo(ribbon.contentGroupRight, 6);
    const expectedContentCenterY =
      ribbon.height / 2 -
      6 * (PIXI_UI_GEOMETRY.sourceWidth / 390);
    expect(ribbon.title.y).toBeCloseTo(
      expectedContentCenterY,
      6,
    );
    expect(
      ribbon.stars.y + ribbon.stars.starSize / 2,
    ).toBeCloseTo(
      expectedContentCenterY,
      6,
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
      'source:assets/ui/root-run-research/research-card-1000x304.9.png',
    );
    expect(harness.page.stallsSection.titlePlaque.assetId).toBe(
      'source:assets/ui/banners/banner-red-right.9.png',
    );
    expect(stall.title.text).toBe('Stall 1');
    expect(stall.item.text).toBe('Sage');
    expect(stall.price.text).toBe('10 Coin');
    expect(stall.price.visible).toBe(false);
    expect(stall.priceResource).toMatchObject({
      amount: '10',
      resource: 'coin',
      visible: true,
    });
    expect(stall.priceResource.amountLabel.text).toBe('10');
    expect(stall.priceResource.icon.x).toBeGreaterThan(
      stall.priceResource.amountLabel.x,
    );
    expect(
      stall.priceResource.x + stall.priceResource.measuredWidth,
    ).toBe(stall.width - 10);
    expect(
      harness.semanticRegistry.get('shop.stall.1.price')?.displayObject,
    ).toBe(stall.priceResource);
    expect(harness.page.stallsSection.ledgerButton.text.text).toBe(
      'Market Ledger',
    );
    expect(
      harness.page.stallsSection.ledgerButton.root.x +
        harness.page.stallsSection.ledgerButton.root.hitArea.width,
    ).toBe(harness.page.stallsSection.width - 12);
    expect(
      harness.semanticRegistry.get('shop.ledger.open'),
    ).not.toBeNull();
    expect(harness.page.stallsSection.helpButton).toBeUndefined();
    expect(harness.page.stallsSection.ledgerHelpButton).toBeUndefined();
    expect(
      harness.semanticRegistry.get('shop.stalls.help'),
    ).toBeNull();
    expect(
      harness.semanticRegistry.get('shop.ledger.help'),
    ).toBeNull();
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
    expect(stall.title.y).toBe(5);
    expect(stall.iconFrame.y).toBe(22);
    expect(stall.item.y).toBe(30);
    expect(stall.price.y).toBe(30);
    expect(stall.progress.y).toBe(60);
    expect(stall.timer.textObject.anchor.y).toBe(0.5);
    expect(stall.timer.y).toBe(
      stall.progress.y + stall.progress.barHeight / 2,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('renders an orange notification badge on the empty stall Select action', () => {
    const harness = createHarness();
    const viewModel = createShopViewModel({ stallPrice: 'select' });
    Object.assign(viewModel.shop.traders.stalls[0], {
      priceVariant: 'green',
      notification: true,
      notificationTone: 'orange',
    });

    harness.page.bind(viewModel);
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    expect(stall.notificationBadge.root.visible).toBe(false);
    expect(stall.priceAction.notificationBadge.root.visible).toBe(true);
    expect(stall.priceAction.notificationBadge.tone).toBe('orange');
    expect(stall.priceAction.notificationBadge.sprite.width).toBe(12);
    expect(stall.priceAction.notificationBadge.sprite.height).toBe(12);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders loaded seeds inside the Research row art well', () => {
    const getAtlasTexture = vi.fn(() => Texture.EMPTY);
    const getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({
      assetManager: {
        ...createPixiAssetManagerFake(Texture),
        loaded: true,
        getAtlasTexture,
        getTexture,
      },
    });
    const model = createShopViewModel();
    Object.assign(model.shop.traders.stalls[0], {
      itemKey: 'sageSeed',
      itemKind: 'seed',
    });

    harness.page.bind(model);
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    expect(stall.iconFrame).toBeInstanceOf(PixiNineSliceFrame);
    expect(stall.iconFrame).toMatchObject({
      frameWidth: 52,
      frameHeight: 52,
      sourceInsets: {
        top: 41,
        right: 41,
        bottom: 41,
        left: 41,
      },
      borderInsets: {
        top: 49 / 3,
        right: 50 / 3,
        bottom: 50 / 3,
        left: 49 / 3,
      },
      tint: 0xdbc19f,
    });
    expect(stall.icon.width).toBeCloseTo(44 * (121 / 128), 6);
    expect(stall.icon.height).toBe(44);
    expect(stall.icon.height).toBeLessThan(
      stall.iconFrame.frameHeight,
    );
    expect(stall.iconOverlay.visible).toBe(true);
    expect(stall.quantityFrame).toBeUndefined();
    expect(stall.quantity.textObject.style.fill).toBe('#ffffff');
    expect(stall.quantity.textObject.style.stroke).toMatchObject({
      color: PIXI_TEXT_STROKE_COLOR,
      width: resolvePixiTextStrokeWidth(stall.quantity.fontSize),
      join: 'round',
    });
    expect(getAtlasTexture).toHaveBeenCalledWith('seed:pack');
    expect(getAtlasTexture).toHaveBeenCalledWith('herb:sageHerb');
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.researchArt,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('renders an empty trader stall Select action with the shared green button skin', () => {
    const harness = createHarness();
    const model = createShopViewModel({ stallPrice: 'select' });
    Object.assign(model.shop.traders.stalls[0], {
      itemLabel: 'empty stand',
      priceVariant: 'green',
      progress: null,
      quantityLabel: '',
    });

    harness.page.bind(model);
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    expect(stall.item.text).toBe('Empty Stand');
    expect(stall.price.visible).toBe(false);
    expect(stall.priceAction).toMatchObject({
      variant: 'green',
      visible: true,
      renderable: true,
    });
    expect(stall.priceAction.textLabel.text).toBe('Select');
    expect(stall.priceAction.rootRunFrame.visible).toBe(true);
    expect(stall.priceAction.hitArea).toMatchObject({
      width: 72,
      height: 42,
    });
    expect(stall.priceAction.x + stall.priceAction.hitArea.width).toBe(
      stall.width - 10,
    );
    expect(stall.priceAction.y).toBe(
      (stall.height - stall.priceAction.hitArea.height) / 2,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('renders empty Players slots like Traders without section counters', () => {
    const harness = createHarness();
    const model = createShopViewModel();
    model.shop.selectedTabId = 'players';
    model.shop.players.requests.countLabel = '0/1';
    model.shop.players.requests.canClear = false;
    Object.assign(model.shop.players.requests.slots[0], {
      itemLabel: 'empty request',
      quantityLabel: '',
      value: 'select',
    });
    model.shop.players.market.countLabel = '0/1';
    Object.assign(model.shop.players.market.slots[0], {
      itemLabel: 'empty stand',
      quantityLabel: '',
      value: 'select',
    });

    harness.page.bind(model);
    harness.page.activate();

    const request =
      harness.page.requestsSection.rows.get('request-1');
    const listing =
      harness.page.playerMarketSection.rows.get('listing-1');
    for (const emptySlot of [request, listing]) {
      expect(emptySlot.price.visible).toBe(false);
      expect(emptySlot.priceAction).toMatchObject({
        variant: 'green',
        visible: true,
        renderable: true,
      });
      expect(emptySlot.priceAction.textLabel.text).toBe('Select');
      expect(emptySlot.priceAction.rootRunFrame.visible).toBe(true);
    }
    expect(harness.page.requestsSection.countLabel.visible).toBe(false);
    expect(harness.page.playerMarketSection.countLabel.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('opens the Players slot dialog after its selection action', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    const selectRequestSlot = vi.fn(() => null);
    const model = createShopViewModel();
    model.shop.selectedTabId = 'players';
    model.shop.players.requests.canClear = false;
    Object.assign(model.shop.players.requests.slots[0], {
      itemLabel: 'empty request',
      quantityLabel: '',
      value: 'select',
      action: selectRequestSlot,
    });

    harness.page.bind(model);
    harness.page.activate();

    const request =
      harness.page.requestsSection.rows.get('request-1');
    const point = request.priceAction.getGlobalPosition();
    inputRouter.onPointerDown(
      createPointerEvent(request.priceAction, 'pointerdown', point),
    );
    inputRouter.onPointerUp(
      createPointerEvent(request.priceAction, 'pointerup', point),
    );

    expect(selectRequestSlot).toHaveBeenCalledTimes(1);
    expect(harness.dialogs.isOpen(SHOP_DIALOG_IDS.REQUEST)).toBe(true);

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });

  it('presses only the Select button when the nested stall action is targeted', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    const model = createShopViewModel({ stallPrice: 'select' });
    Object.assign(model.shop.traders.stalls[0], {
      itemLabel: 'empty stand',
      priceVariant: 'green',
      progress: null,
      quantityLabel: '',
    });

    harness.page.bind(model);
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    const selectRegistration = inputRouter.store
      .getRegistrations('press')
      .find((entry) => entry.displayObject === stall.priceAction);

    expect(selectRegistration).toBeDefined();

    const point = stall.priceAction.getGlobalPosition();
    inputRouter.onPointerDown(
      createPointerEvent(stall.priceAction, 'pointerdown', point),
    );

    expect(stall.priceAction.visual.scale.x).toBeLessThan(1);
    expect(stall.priceAction.visual.scale.y).toBe(
      stall.priceAction.visual.scale.x,
    );
    expect(stall.visual.scale.x).toBe(1);
    expect(stall.visual.scale.y).toBe(1);

    inputRouter.onPointerUp(
      createPointerEvent(stall.priceAction, 'pointerup', point),
    );

    expect(harness.dialogs.isOpen(SHOP_DIALOG_IDS.STALL)).toBe(true);

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });

  it('renders the sale batch in a compact red top-right badge', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({
      assetManager: {
        ...createPixiAssetManagerFake(Texture),
        loaded: true,
        getTexture,
      },
    });
    const viewModel = createShopViewModel();
    viewModel.shop.traders.stalls[0].batchLabel = 'x1';

    harness.page.bind(viewModel);
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    expect(stall.batch.text).toBe('x1');
    expect(stall.batch.textObject.style.fill).toBe('#ffffff');
    expect(stall.batch.textObject.style.stroke).toMatchObject({
      color: PIXI_TEXT_STROKE_COLOR,
      width: resolvePixiTextStrokeWidth(stall.batch.fontSize),
      join: 'round',
    });
    expect(stall.batchBadge).toMatchObject({
      visible: true,
      renderable: true,
      width: 30,
      height: 27,
      y: 1,
    });
    expect(stall.batch.x).toBe(stall.batchBadge.x);
    expect(stall.batch.y).toBe(11);
    expect(stall.batchBadge.x + stall.batchBadge.width / 2).toBe(
      stall.width - 14,
    );
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.stallBatchBadge,
    );

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
          382,
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

  it('presses the complete stall row without fading its frame', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    const registration = inputRouter.store
      .getRegistrations('press')
      .find((entry) => entry.displayObject === stall.root);
    const point = stall.root.getGlobalPosition();

    expect(registration).toBeDefined();

    inputRouter.onPointerDown(
      createPointerEvent(stall.root, 'pointerdown', point),
    );

    expect(stall.visual.scale.x).toBeLessThan(1);
    expect(stall.visual.scale.y).toBe(stall.visual.scale.x);
    expect(stall.frame.alpha).toBe(1);

    inputRouter.onPointerCancel(
      createPointerEvent(stall.root, 'pointercancel', point),
    );

    expect(stall.visual.scale.x).toBe(1);
    expect(stall.visual.scale.y).toBe(1);
    expect(stall.frame.alpha).toBe(1);

    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });

  it('sweeps the Research shine across the selling stall only', () => {
    const requestAnimationFrame = vi.fn(() => 41);
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );

    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    const stall = harness.page.stallsSection.stalls.get('stall-1');
    expect(harness.page.playStallSaleEffect(1)).toBe(true);
    expect(stall.saleShine.root).toMatchObject({
      visible: true,
      renderable: true,
    });
    expect(stall.saleShine.sprite.x).toBe(
      stall.saleShine.layout.startX,
    );
    expect(stall.saleShine.layout).toMatchObject({
      width: stall.width,
      height: stall.height,
    });
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(harness.page.playStallSaleEffect(2)).toBe(false);

    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    expect(harness.page.playStallSaleEffect(1)).toBe(false);
    expect(stall.saleShine.root.visible).toBe(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(41);

    harness.page.destroy();
    harness.dispose();
    vi.unstubAllGlobals();
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
        {
          id: 'herb',
          label: 'herbs',
          semanticId: 'shop.stall.1.tab.herb',
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

  it('drags the Market lesson slider when the tutorial overlay owns the event path', () => {
    const inputRouter = new PixiInputRouter({ dragThreshold: 4 });
    const harness = createHarness({ inputRouter });
    const setAllocation = vi.fn(() => true);
    harness.page.bind(createShopViewModel());
    harness.page.activate();
    harness.page.openDialog(SHOP_DIALOG_IDS.STALL, {
      title: 'load stall',
      range: {
        enabled: true,
        min: 0,
        max: 5,
        step: 1,
        value: 0,
        tutorialTargetValue: 1,
        onChange: setAllocation,
      },
      items: [],
      actions: [],
      tabs: [],
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.STALL);
    const slider = dialog.rangeControl;
    const dragRegistration = inputRouter.store
      .getRegistrations('drag')
      .find((entry) => entry.displayObject === slider);
    const tutorialOverlay = new Container({
      label: 'tutorial-overlay-hit',
    });
    const bounds = slider.getBounds();
    const start = {
      x: bounds.x + PIXI_ROOT_RUN_GEOMETRY.settings.knobSize / 2,
      y: bounds.y + bounds.height / 2,
    };
    const end = {
      x: bounds.x + bounds.width * 0.8,
      y: start.y,
    };

    expect(dragRegistration?.fallbackHitTest).toBe(true);
    inputRouter.onPointerDown(
      createPointerEvent(tutorialOverlay, 'pointerdown', start),
    );
    inputRouter.onPointerMove(
      createPointerEvent(tutorialOverlay, 'pointermove', end),
    );
    inputRouter.onPointerUp(
      createPointerEvent(tutorialOverlay, 'pointerup', end),
    );

    expect(setAllocation).toHaveBeenCalled();
    expect(slider.value).toBeGreaterThan(0);

    tutorialOverlay.destroy();
    harness.page.destroy();
    harness.dispose();
    inputRouter.destroy();
  });

  it('lays out player-centered market ledger facts inside reusable rows', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    harness.page.openDialog(SHOP_DIALOG_IDS.LEDGER, {
      title: 'Market Ledger',
      selectedTabId: 'seed',
      tabs: [
        { id: 'seed', label: 'Seeds', selected: true },
        { id: 'herb', label: 'Herbs', selected: false },
        { id: 'potion', label: 'Potions', selected: false },
      ],
      items: [
        {
          id: 'sage',
          label: 'Sage Seed',
          stockLabel: '4',
          buyersLabel: '6',
          buyPriceLabel: '3 coin',
          buyPriceResourceKey: 'coin',
          sellPriceLabel: '2 coin',
          sellPriceResourceKey: 'coin',
          itemKind: 'seed',
          itemKey: 'sageSeed',
        },
        {
          id: 'mint',
          label: 'Mint Seed',
          stockLabel: '2',
          buyersLabel: '5',
          buyPriceLabel: '4 coin',
          buyPriceResourceKey: 'coin',
          sellPriceLabel: '3 coin',
          sellPriceResourceKey: 'coin',
          itemKind: 'seed',
          itemKey: 'mintSeed',
        },
      ],
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.LEDGER);
    const [firstRow, secondRow] = dialog.list.rows.getWidgets();
    const tabs = dialog.tabs.getWidgets();

    expect(dialog.panel.coreWidth).toBe(304);
    expect(dialog.panel.coreHeight).toBe(382);
    expect(dialog.list.width).toBe(
      RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth +
        RETAINED_DIALOG_LIST_GEOMETRY.scrollbarViewportOutset,
    );
    expect(dialog.list.rowWidth).toBe(
      RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth +
        PIXI_ROOT_RUN_GEOMETRY.settings.rowGap,
    );
    expect(dialog.list.root.position.x).toBe(-9);
    expect(dialog.list.root.position.y).toBe(20);
    expect(dialog.list.height).toBe(298);
    expect(dialog.tabLayer.position.x).toBe(9);
    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      expect(tab.control.textLabel.fontSize).toBe(11);
    }
    expect(firstRow.itemIcon.visible).toBe(true);
    expect(firstRow.background.frameWidth).toBe(
      RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
    );
    expect(firstRow.itemIcon.x).toBeLessThan(firstRow.title.x);
    expect(firstRow.stockKey.text).toBe('Stock');
    expect(firstRow.buyKey.text).toBe('Buy');
    expect(firstRow.demandKey.text).toBe('Buyers');
    expect(firstRow.sellKey.text).toBe('Sell');
    expect(firstRow.buyResource.visible).toBe(true);
    expect(firstRow.sellResource.visible).toBe(true);
    expect(secondRow.root.y).toBeGreaterThanOrEqual(58);

    harness.page.destroy();
    harness.dispose();
  });

  it('reapplies the parchment theme to ledger rows recycled while scrolling', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    harness.page.bind(createShopViewModel());
    harness.page.activate();
    harness.page.openDialog(SHOP_DIALOG_IDS.LEDGER, {
      title: 'Market Ledger',
      selectedTabId: 'seed',
      tabs: [
        { id: 'seed', label: 'Seeds', selected: true },
        { id: 'herb', label: 'Herbs', selected: false },
      ],
      items: Array.from({ length: 14 }, (_, index) => ({
        id: `seed-${index}`,
        label: `Seed ${index + 1}`,
        stockLabel: String(index + 1),
        buyersLabel: String(1_000 - index),
        buyPriceLabel: `${index + 2} coin`,
        buyPriceResourceKey: 'coin',
        sellPriceLabel: `${index + 1} coin`,
        sellPriceResourceKey: 'coin',
        itemKind: 'seed',
        itemKey: 'sageSeed',
      })),
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.LEDGER);
    dialog.list.scroll.scrollTo(420);

    expect(dialog.list.rows.getWidgets()).not.toHaveLength(0);
    for (const row of dialog.list.rows.getWidgets()) {
      expect(row.theme.text).toBe(PIXI_DIALOG_PALETTE.ink);
      expect(row.title.textObject.style.fill).toBe(
        PIXI_DIALOG_PALETTE.ink,
      );
      expect(row.buyResource.amountLabel.textObject.style.fill).toBe(
        PIXI_DIALOG_PALETTE.coin,
      );
    }

    harness.page.destroy();
    harness.dispose();
  });

  it('hides a lone Market Ledger tab and gives its footer space to the list', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    harness.page.openDialog(SHOP_DIALOG_IDS.LEDGER, {
      title: 'Market Ledger',
      selectedTabId: 'seed',
      tabs: [
        {
          id: 'seed',
          label: 'Seeds',
          selected: true,
          semanticId: 'shop.ledger.tab.seed',
        },
      ],
      items: [
        {
          id: 'sage',
          label: 'Sage Seed',
          detail: 'stock 4 · buyers 6',
          value: '3 coin',
          itemKind: 'seed',
          itemKey: 'sageSeed',
        },
      ],
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.LEDGER);
    const [seedTab] = dialog.tabs.getWidgets();

    expect(dialog.tabLayer.visible).toBe(false);
    expect(dialog.tabLayer.renderable).toBe(false);
    expect(seedTab.root.visible).toBe(false);
    expect(seedTab.root.renderable).toBe(false);
    expect(dialog.list.height).toBe(312);

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
        tone: 'yellow',
        value: 25,
      },
      items: [
        {
          id: 'sageSeed',
          label: 'sage seed',
          detail: '8 available',
          value: '2 coin',
          valueIconResourceKey: 'coin',
          itemKind: 'seed',
          itemKey: 'sageSeed',
          selected: true,
          notification: true,
        },
      ],
      actions: [
        {
          id: 'mark',
          label: 'mark x2',
          variant: 'green',
          enabled: true,
        },
        {
          id: 'clear',
          label: 'clear',
          variant: 'red',
          enabled: true,
        },
      ],
      tabs: [
        {
          id: 'seed',
          label: 'seeds',
          selected: true,
          notification: true,
        },
        { id: 'herb', label: 'herbs' },
        { id: 'potion', label: 'potions' },
      ],
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.STALL);
    const [row] = dialog.list.rows.getWidgets();
    const [mark, clear] = dialog.actions.getWidgets();
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
    expect(dialog.rangeControl.progress.tone).toBe('yellow');
    expect(dialog.rangeControl.progress.fillColor).toBe('#f5c542');
    expect(mark.control.variant).toBe('green');
    expect(clear.control.variant).toBe('red');
    expect(clear.height).toBe(PIXI_UI_GEOMETRY.roomControlHeight);
    expect(mark.height).toBe(PIXI_UI_GEOMETRY.roomControlHeight);
    expect(mark.height).toBeGreaterThan(
      PIXI_ROOT_RUN_GEOMETRY.button.borderInsets.top +
        PIXI_ROOT_RUN_GEOMETRY.button.borderInsets.bottom,
    );
    expect(mark.root.x).toBeLessThan(clear.root.x);
    expect(dialog.tabLayer.parent).toBe(dialog.panel);
    expect(
      dialog.panel.coreHeight +
        PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset -
        (dialog.tabLayer.y + seedsTab.height),
    ).toBeCloseTo(10);
    expect(
      dialog.tabLayer.y -
        (
          dialog.body.y +
          dialog.itemSection.y +
          dialog.itemSection.frameHeight
        ),
    ).toBeCloseTo(6);
    expect(
      herbsTab.root.x -
        (seedsTab.root.x + seedsTab.width),
    ).toBeCloseTo(8);
    expect(seedsTab.control.variant).toBe('tab');
    expect(seedsTab.control.resolveRootRunVariant()).toBe(
      'brown',
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
    expect(row.selectedIndicator.width).toBeCloseTo(27);
    expect(row.selectedIndicator.height).toBeCloseTo(27);
    expect(
      row.selectedIndicator.x,
    ).toBeCloseTo(
      row.background.x + row.background.frameWidth / 2,
    );
    expect(row.selectedIndicator.y).toBeCloseTo(
      row.summaryHeight / 2,
    );
    expect(row.value.visible).toBe(false);
    expect(row.valueResource.visible).toBe(true);
    expect(row.valueResource.amountLabel.text).toBe('2');
    expect(row.valueResource.icon.x).toBeLessThan(
      row.valueResource.amountLabel.x,
    );
    expect(row.notificationBadge.root.visible).toBe(true);
    expect(row.notificationBadge.tone).toBe('red');
    expect(seedsTab.notificationDot.visible).toBe(true);
    expect(herbsTab.notificationDot.visible).toBe(false);
    expect(row.label.fontWeight).toBe('normal');
    expect(dialog.list.scroll.progressBar).toBeNull();

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps Load Stall prices in one centered right slot under status overlays', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    harness.page.activate();

    harness.page.openDialog(SHOP_DIALOG_IDS.STALL, {
      title: 'load stall',
      items: [
        {
          id: 'selected',
          label: 'sage seed',
          detail: '8 available',
          value: '2 coin',
          valueIconResourceKey: 'coin',
          itemKind: 'seed',
          itemKey: 'sageSeed',
          selected: true,
          notification: true,
        },
        {
          id: 'notified',
          label: 'mint seed',
          detail: '4 available',
          value: '2 coin',
          valueIconResourceKey: 'coin',
          itemKind: 'seed',
          itemKey: 'mintSeed',
          notification: true,
        },
        {
          id: 'plain',
          label: 'nettle seed',
          detail: '0 available',
          value: '2 coin',
          valueIconResourceKey: 'coin',
          itemKind: 'seed',
          itemKey: 'nettleSeed',
        },
      ],
    });

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.STALL);
    const [selected, notified, plain] =
      dialog.list.rows.getWidgets();
    const priceRightEdges = [selected, notified, plain].map(
      (row) =>
        row.valueResource.x + row.valueResource.measuredWidth,
    );

    expect(priceRightEdges[0]).toBeCloseTo(priceRightEdges[1]);
    expect(priceRightEdges[1]).toBeCloseTo(priceRightEdges[2]);
    expect(priceRightEdges[0]).toBeCloseTo(
      selected.background.x +
        selected.background.frameWidth -
        PIXI_ROOT_RUN_GEOMETRY.settings.rowPadding,
    );
    for (const row of [selected, notified, plain]) {
      expect(row.valueResource.y).toBeCloseTo(
        (row.summaryHeight - 16) / 2,
      );
    }
    expect(
      selected.selectedIndicator.x,
    ).toBeCloseTo(
      selected.background.x + selected.background.frameWidth / 2,
    );
    expect(
      selected.visual.getChildIndex(selected.selectedIndicator),
    ).toBeGreaterThan(
      selected.visual.getChildIndex(selected.valueResource),
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the Load Stall split-paper form for Request and Sell', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    harness.page.activate();
    const item = {
      id: 'sageSeed',
      label: 'Sage Seed',
      detail: '12 Available',
      itemKind: 'seed',
      itemKey: 'sageSeed',
      selected: true,
    };
    const tabs = [
      { id: 'seed', label: 'Seeds', selected: true },
      { id: 'herb', label: 'Herbs' },
    ];

    harness.page.openDialog(SHOP_DIALOG_IDS.REQUEST, {
      title: 'Request',
      summaryRows: [
        {
          id: 'current',
          label: 'Current',
          value: 'Sage Seed',
          itemKind: 'seed',
          itemKey: 'sageSeed',
        },
      ],
      fields: [
        {
          id: 'priceCoin',
          label: 'Coins Per Item',
          value: 7,
        },
        {
          id: 'quantity',
          label: 'Max Quantity',
          value: 30,
        },
      ],
      items: [item],
      actions: [
        {
          id: 'place',
          label: 'Place Request',
          variant: 'green',
        },
      ],
      tabs,
    });

    const request = harness.dialogs.get(SHOP_DIALOG_IDS.REQUEST);
    expect(request.panel.paperFrame.visible).toBe(false);
    expect(request.selectionSection.visible).toBe(true);
    expect(request.itemSection.visible).toBe(true);
    expect(request.rangeControl.visible).toBe(false);
    expect(request.fields[0].root.visible).toBe(true);
    expect(request.fields[1].root.visible).toBe(true);
    expect(request.fields[1].root.y).toBeGreaterThan(
      request.fields[0].root.y,
    );
    expect(
      request.fieldLayer.y + request.fields[1].root.y,
    ).toBeLessThan(request.actions.getWidgets()[0].root.y);
    expect(request.actions.getWidgets()[0].control.variant).toBe(
      'green',
    );
    expect(request.list.root.y).toBeGreaterThan(
      request.selectionSectionBounds.height,
    );

    harness.page.openDialog(SHOP_DIALOG_IDS.LISTING, {
      title: 'Sell',
      summaryRows: [
        {
          id: 'current',
          label: 'Current',
          value: 'Sage Seed',
          quantityLabel: 'x5',
          itemKind: 'seed',
          itemKey: 'sageSeed',
        },
      ],
      range: {
        enabled: true,
        tone: 'yellow',
        min: 1,
        max: 12,
        step: 1,
        value: 5,
      },
      fields: [
        {
          id: 'priceCoin',
          label: 'Coins Per Item',
          value: 9,
        },
      ],
      items: [item],
      actions: [
        {
          id: 'clear',
          label: 'Clear',
          variant: 'red',
          layoutWeight: 1,
        },
        {
          id: 'sell',
          label: 'Sell',
          variant: 'green',
          layoutWeight: 2,
        },
      ],
      tabs,
    });

    const listing = harness.dialogs.get(SHOP_DIALOG_IDS.LISTING);
    expect(listing.panel.paperFrame.visible).toBe(false);
    expect(listing.rangeControl.visible).toBe(true);
    expect(listing.rangeControl).toMatchObject({
      min: 1,
      max: 12,
      step: 1,
      value: 5,
    });
    expect(listing.fields[0].root.visible).toBe(true);
    expect(listing.fields[1].root.visible).toBe(false);
    expect(listing.fieldLayer.y).toBeGreaterThan(
      listing.rangeControl.y,
    );
    expect(
      listing.fieldLayer.y + listing.fields[0].root.y,
    ).toBeLessThan(listing.actions.getWidgets()[0].root.y);
    const [clearButton, sellButton] = listing.actions.getWidgets();
    expect(clearButton.text.text).toBe('Clear');
    expect(sellButton.text.text).toBe('Sell');
    expect(sellButton.width).toBeGreaterThan(clearButton.width);
    expect(sellButton.root.x).toBeGreaterThan(clearButton.root.x);
    expect(listing.list.root.y).toBeGreaterThan(
      listing.selectionSectionBounds.height,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the frozen source-space Shop anchors', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    const tradersScroll =
      harness.page.panelScrolls.get('traders');

    expect(tradersScroll.root.x).toBe(0);
    expect(tradersScroll.root.y).toBe(151);
    expect(harness.page.tabLayer.position).toMatchObject({
      x: 16,
      y: 640,
    });
    expect(harness.page.tabButtons.get('traders')).toMatchObject({
      buttonHeight: PIXI_UI_GEOMETRY.roomControlHeight,
    });
    expect(
      tradersScroll.height,
    ).toBeCloseTo(483, 10);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the shared dialog scroll physics for Shop tab content', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    const scroll = harness.page.panelScrolls.get('traders');
    scroll.setContentHeight(scroll.height + 400);

    expect(scroll).toBeInstanceOf(RetainedScrollArea);
    expect(
      scroll.beginDrag({
        event: { timeStamp: 0 },
        point: { x: 20, y: 360 },
      }),
    ).toBe(true);
    scroll.dragTo({
      event: { timeStamp: 40 },
      point: { x: 20, y: 300 },
    });
    const releasedOffset = scroll.offsetY;
    scroll.endDrag();
    scroll.cancelAnimation();
    scroll.update(1 / 60);

    expect(scroll.offsetY).toBeGreaterThan(releasedOffset);
    expect(scroll.physics.velocity).toBeGreaterThan(0);

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
    ).toBe('brown');
    expect(
      harness.page.tabButtons.get('players').resolveRootRunVariant(),
    ).toBe('brown-dark');

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the Crystals tab notification visible while the free coin offer is ready', () => {
    const harness = createHarness();
    const viewModel = createShopViewModel();
    viewModel.shop.selectedTabId = 'crystals';

    harness.page.bind(viewModel);

    const crystalsTab = harness.page.tabButtons.get('crystals');
    expect(crystalsTab.notificationBadge.root.visible).toBe(true);
    expect(crystalsTab.notificationBadge.tone).toBe('red');

    harness.page.destroy();
    harness.dispose();
  });

  it('uses stall-style offer cards with currency art, overlaid amounts, and green actions', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const getAtlasTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({
      assetManager: {
        ...createPixiAssetManagerFake(Texture),
        loaded: true,
        getTexture,
        getAtlasTexture,
      },
    });
    const viewModel = createShopViewModel();
    viewModel.shop.selectedTabId = 'crystals';

    harness.page.bind(viewModel);
    harness.page.activate();

    expect(
      harness.page.panelScrolls.get('crystals').root.position.x,
    ).toBe(0);
    expect(harness.page.coinOfferSection.titlePlaque.title.text).toBe(
      'Coin Offer',
    );
    expect(
      harness.page.crystalOffersSection.titlePlaque.title.text,
    ).toBe('Crystals');
    expect(harness.page.coinOfferSection.titlePlaque.variant).toBe(
      'crystal',
    );
    expect(
      harness.page.crystalOffersSection.titlePlaque.variant,
    ).toBe('crystal');
    expect(harness.page.coinOfferSection.panel).toBeUndefined();
    expect(harness.page.coinOfferSection.card).toBeUndefined();
    expect(harness.page.crystalOffersSection.card).toBeUndefined();

    const coinOffer =
      harness.page.coinOfferSection.rows.get('coinOffer');
    expect(coinOffer.frame).toBeInstanceOf(PixiNineSliceFrame);
    expect(coinOffer.frame.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
    );
    expect(coinOffer.title.text).toBe('Coin Offer');
    expect(coinOffer.iconFrame).toBeInstanceOf(PixiNineSliceFrame);
    expect(coinOffer.icon.visible).toBe(true);
    expect(coinOffer.amountLabel.text).toBe('100');
    expect(coinOffer.amountLabel.position.x).toBe(
      coinOffer.icon.position.x,
    );
    expect(coinOffer.title.position.y).toBeLessThan(
      coinOffer.iconFrame.position.y,
    );
    expect(coinOffer.actionButton.position.x).toBeGreaterThan(
      coinOffer.iconFrame.position.x + coinOffer.iconFrame.width,
    );
    expect(coinOffer.actionButton.visible).toBe(true);
    expect(coinOffer.actionButton.textLabel.text).toBe('Collect');
    expect(coinOffer.actionButton.variant).toBe('green');
    expect(coinOffer.actionButton.resolveRootRunVariant()).toBe(
      'green',
    );
    const stall =
      harness.page.stallsSection.stalls.get('stall-1');
    expect(coinOffer.actionButton.hitArea).toMatchObject({
      width: stall.priceAction.hitArea.width,
      height: stall.priceAction.hitArea.height,
    });
    expect(
      harness.semanticRegistry.require('shop.coinOffer.collect')
        .displayObject,
    ).toBe(coinOffer.actionButton);

    const crystalOffer =
      harness.page.crystalOffersSection.rows.get('crystal-1');
    expect(crystalOffer.frame).toBeInstanceOf(PixiNineSliceFrame);
    expect(crystalOffer.frame.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    expect(crystalOffer.title.text).toBe('Crystal Offer');
    expect(crystalOffer.icon.visible).toBe(true);
    expect(crystalOffer.amountLabel.text).toBe('10');
    expect(crystalOffer.actionButton.textLabel.text).toBe('$0.99');
    expect(crystalOffer.actionButton.variant).toBe('green');
    expect(crystalOffer.actionButton.resolveRootRunVariant()).toBe(
      'green',
    );
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.researchCard,
    );
    expect(getAtlasTexture).toHaveBeenCalledWith('resource:coin');
    expect(getAtlasTexture).toHaveBeenCalledWith(
      'resource:crystal',
    );

    viewModel.shop.crystals.coinOffer = {
      ...viewModel.shop.crystals.coinOffer,
      actionLabel: '1h 57m',
      canCollect: false,
      notification: false,
    };
    harness.page.bind(viewModel);
    const coolingOffer =
      harness.page.coinOfferSection.rows.get('coinOffer');
    expect(coolingOffer.actionButton.textLabel.text).toBe('1h 57m');
    expect(coolingOffer.actionButton.enabled).toBe(false);
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
    );
    expect(
      harness.semanticRegistry.require('shop.coinOffer.collect')
        .state(),
    ).toMatchObject({
      enabled: false,
      interactive: false,
      visible: true,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('reuses Traders stand widgets for Players rows and keeps border actions', () => {
    const harness = createHarness();
    const viewModel = createShopViewModel();
    viewModel.shop.selectedTabId = 'players';
    viewModel.shop.players.requests.canClear = true;
    Object.assign(viewModel.shop.players.requests.slots[0], {
      itemKey: 'sageSeed',
      resourceKey: 'seed',
      quantityLabel: '2',
      value: '5 coin',
      valueResourceKey: 'coin',
    });
    viewModel.shop.players.requests.slots.push({
      id: 'request-2',
      slotNumber: 2,
      itemLabel: 'empty request',
      value: 'select',
    });
    viewModel.shop.players.market.proceedsLabel = 'claim';
    viewModel.shop.players.market.proceedsValueLabel = '25 coin';
    viewModel.shop.players.market.canClaimProceeds = true;
    viewModel.shop.players.market.proceedsNotification = true;

    harness.page.bind(viewModel);
    harness.page.activate();

    expect(
      harness.page.panelScrolls.get('players').root.position.x,
    ).toBe(0);
    expect(harness.page.requestsSection.panel).toBeUndefined();
    expect(harness.page.playerMarketSection.panel).toBeUndefined();
    expect(harness.page.requestsSection.card).toBeUndefined();
    expect(harness.page.playerMarketSection.card).toBeUndefined();
    expect(harness.page.requestsSection.titlePlaque.title.text).toBe(
      'Requests',
    );
    expect(
      harness.page.playerMarketSection.titlePlaque.title.text,
    ).toBe('Player Market');
    expect(harness.page.requestsSection.titlePlaque.variant).toBe(
      'automation',
    );
    expect(
      harness.page.playerMarketSection.titlePlaque.variant,
    ).toBe('automation');

    const request =
      harness.page.requestsSection.rows.get('request-1');
    const nextRequest =
      harness.page.requestsSection.rows.get('request-2');
    const listing =
      harness.page.playerMarketSection.rows.get('listing-1');
    expect(request.root.label).toBe('shop:stall');
    expect(listing.root.label).toBe('shop:stall');
    expect(request.frame).toBeInstanceOf(PixiNineSliceFrame);
    expect(nextRequest.frame).toBeInstanceOf(PixiNineSliceFrame);
    expect(nextRequest.frame).not.toBe(request.frame);
    expect(request.iconFrame).toBeInstanceOf(PixiNineSliceFrame);
    expect(listing.iconFrame).toBeInstanceOf(PixiNineSliceFrame);
    expect(request.title.text).toBe('Request 1');
    expect(nextRequest.title.text).toBe('Request 2');
    expect(listing.title.text).toBe('Stand 1');
    expect(request.item.text).toBe('Sage');
    expect(request.quantity.text).toBe('2');
    expect(request.price.visible).toBe(false);
    expect(request.priceResource).toMatchObject({
      amount: '5',
      resource: 'coin',
      visible: true,
    });
    expect(request.root.hitArea.height).toBe(84);
    expect(listing.root.hitArea.height).toBe(84);
    expect(nextRequest.root.y).toBeGreaterThan(
      request.root.y + request.root.hitArea.height,
    );
    expect(request.item.textObject.style.fill).toBe(
      PIXI_DIALOG_PALETTE.ink,
    );
    expect(
      harness.semanticRegistry.require('shop.requests.1')
        .displayObject,
    ).toBe(request.root);
    expect(
      harness.semanticRegistry.require('shop.playerMarket.1')
        .displayObject,
    ).toBe(listing.root);

    const clear =
      harness.page.requestsSection.actions.get('clear');
    expect(clear.root.label).toBe(
      'shop:requests:footerAction',
    );
    expect(clear.text.text).toBe('Clear');
    expect(clear.root.y).toBeGreaterThan(
      harness.page.requestsSection.rowsLayer.y,
    );

    const browse =
      harness.page.playerMarketSection.actions.get('browse');
    const history =
      harness.page.playerMarketSection.actions.get('history');
    const proceeds =
      harness.page.playerMarketSection.trailingRows.get('proceeds');
    expect(browse.text.text).toBe('Browse Market');
    expect(history.text.text).toBe('Trade History');
    expect(browse.root.parent).toBe(
      harness.page.playerMarketSection.actionsLayer,
    );
    expect(history.root.parent).toBe(
      harness.page.playerMarketSection.actionsLayer,
    );
    expect(browse.root.visible).toBe(true);
    expect(history.root.visible).toBe(true);
    expect(browse.root.x).toBeLessThan(history.root.x);
    expect(
      history.root.x + history.root.hitArea.width,
    ).toBeLessThanOrEqual(
      proceeds.root.hitArea.width,
    );

    expect(proceeds.itemResource).toMatchObject({
      amount: '25',
      resource: 'coin',
      visible: true,
    });
    expect(proceeds.valueButton.textLabel.text).toBe('Claim');
    expect(proceeds.valueButton.variant).toBe('green');
    expect(proceeds.valueButton.sizeTier).toBe(30);
    expect(proceeds.valueButton.rootRunFrame.compatibilityError).toBeNull();
    expect(proceeds.notificationBadge.root.visible).toBe(false);
    expect(
      harness.page.playerMarketSection.trailingRowsLayer.y +
        proceeds.root.y +
        proceeds.valueButton.y +
        proceeds.valueButton.height,
    ).toBeLessThanOrEqual(browse.root.y);

    harness.page.destroy();
    harness.dispose();
  });

  it('omits the clear footer when the selected request slot is empty', () => {
    const harness = createHarness();
    const viewModel = createShopViewModel();
    viewModel.shop.selectedTabId = 'players';
    viewModel.shop.players.requests.canClear = false;
    Object.assign(viewModel.shop.players.requests.slots[0], {
      itemLabel: 'empty request',
      value: 'select',
    });

    harness.page.bind(viewModel);
    harness.page.activate();

    expect(
      harness.page.requestsSection.actions.get('clear'),
    ).toBeNull();

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

  it('centers sentence-case copy in the Support dialog', () => {
    const harness = createHarness();
    harness.page.bind(createShopViewModel());
    harness.page.activate();
    harness.page.openDialog(SHOP_DIALOG_IDS.SUPPORT, {});

    const dialog = harness.dialogs.get(SHOP_DIALOG_IDS.SUPPORT);

    expect(dialog.panel.titleLabel.text).toBe('Support');
    expect(dialog.messageLabel.text).toBe(
      'Thank you for trying to support the project but the transactions are not yet available <3',
    );
    expect(dialog.messageLabel.align).toBe('center');
    expect(dialog.messageLabel.textObject.anchor.x).toBe(0.5);
    expect(dialog.messageLabel.textObject.anchor.y).toBe(0.5);
    expect(dialog.messageLabel.x).toBeCloseTo(
      dialog.panel.contentBoxWidth / 2,
    );
    expect(dialog.messageLabel.y).toBeCloseTo(
      dialog.panel.contentBoxHeight / 2,
    );

    harness.page.destroy();
    harness.dispose();
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
          canClear: true,
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
