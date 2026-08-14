import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  getHerbIconFrameName,
} from '../../../../assets/items/herbs/herbIcons.js';
import {
  getPotionIconFrameName,
} from '../../../../assets/items/potions/potionIcons.js';
import {
  getSeedPackBaseFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { PixiTabButton } from '../../primitives/PixiTabButton.js';
import { PIXI_DIALOG_PALETTE } from '../../primitives/PixiDialogFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiProgressBar } from '../../primitives/PixiProgressBar.js';
import { PixiResourceLabel } from '../../primitives/PixiResourceLabel.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PixiNotificationBadge } from '../../global/transient/PixiNotificationBadges.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_SQUIRCLE_TINTS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  createPixiPageBackgroundGradient,
  drawPixiPageBackground,
} from '../../theme/PixiPageBackground.js';
import {
  createResearchShine,
  getResearchShineLayout,
  hideResearchShine,
  layoutResearchShine,
  RESEARCH_WIDGET_SHINE_ALPHA,
  RESEARCH_WIDGET_SHINE_CORNER_RADIUS_SCALE,
  RESEARCH_WIDGET_SHINE_DURATION_MS,
  RESEARCH_WIDGET_SHINE_HEIGHT_SCALE,
  RESEARCH_PIXI_GEOMETRY,
  ResearchStationTitlePlaque,
  updateResearchShine,
} from '../research/ResearchPixiPage.js';
import {
  RetainedScrollArea,
  resolveRetainedPageBottomClearance,
} from '../workshop/RetainedPageKit.js';
import { MarketTitleRibbon } from './MarketTitleRibbon.js';
import { SHOP_DIALOG_IDS, ShopDialogPixi } from './ShopDialogPixi.js';

const SHOP_TABS = Object.freeze([
  Object.freeze({ id: 'traders', legacyId: 'npm', label: 'Traders' }),
  Object.freeze({ id: 'players', legacyId: 'player', label: 'Players' }),
  Object.freeze({ id: 'crystals', legacyId: 'crystals', label: 'Crystals' }),
]);

const PAGE_SCROLL_CUT = 6;
const SECTION_GAP = 24;
const TAB_GAP = 3;
const CARD_GAP = 10;
const STALL_CARD_HEIGHT = 84;
const COMPACT_ROW_HEIGHT = 27;
const OFFER_ROW_HEIGHT = PIXI_UI_GEOMETRY.rowMinHeight;
const OFFER_CARD_MIN_HEIGHT = 52;
const OFFER_CARD_PADDING_X = 12;
const OFFER_ACTION_WIDTH = 72;
const OFFER_ACTION_HEIGHT = 28;
const STALL_SELECT_ACTION_WIDTH = 72;
const STALL_SELECT_ACTION_HEIGHT = 42;
const MARKET_OFFER_CARD_HEIGHT = STALL_CARD_HEIGHT;
const MARKET_OFFER_ACTION_WIDTH = STALL_SELECT_ACTION_WIDTH;
const MARKET_OFFER_ACTION_HEIGHT = STALL_SELECT_ACTION_HEIGHT;
const MARKET_OFFER_ICON_SIZE = 38;
const BORDER_ACTION_EDGE_INSET = 12;
const BORDER_ACTION_GAP = 6;
const BORDER_ACTION_PADDING_X = 10;
const BORDER_ACTION_MIN_WIDTH = 58;
const STALL_TEXT_INK = '#634934';
const STALL_MUTED_INK = '#725737';
const STALL_STAR_GAP = 4;
const STALL_CONTENT_RAISE = 5;
const STALL_BATCH_BADGE_WIDTH = 30;
const STALL_BATCH_BADGE_HEIGHT = 27;
const STALL_BATCH_BADGE_RIGHT_INSET = 14;
const STALL_BATCH_BADGE_TOP = 1;
const STALL_BATCH_TEXT_CENTER_Y = 10;
const STALL_ART_WELL_SIZE = 52;
const STALL_ARTWORK_SIZE = 44;
const STALL_PRESS_SCALE = 0.97;
const STALL_RELEASE_PEAK_SCALE = 1.015;
const STALL_RELEASE_DURATION_MS = 180;
const STALL_QUANTITY_COLOR = '#ffffff';
const STALL_QUANTITY_STROKE = Object.freeze({
  color: '#2a160d',
  width: 2,
});
const STALL_ART_SOURCE_INSETS = Object.freeze({
  top: 41,
  right: 41,
  bottom: 41,
  left: 41,
});
const STALL_ART_BORDER_INSETS = Object.freeze({
  top: 49 / 3,
  right: 50 / 3,
  bottom: 50 / 3,
  left: 49 / 3,
});
const STATION_TITLE_HEIGHT = RESEARCH_PIXI_GEOMETRY.categoryTitleHeight;
const STATION_TITLE_ROW_GAP = 5;
const MARKET_TITLE_HEIGHT =
  PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.height;
const MARKET_TITLE_TOP_OVERHANG =
  MARKET_TITLE_HEIGHT - STATION_TITLE_HEIGHT;

/**
 * Renderer-neutral retained Shop page.
 *
 * The page tree and its three market panels are built once. Changing lists
 * reconcile keyed widgets, and dialogs are registered as lazy-once factories.
 */
export class ShopPixiPage extends BasePixiRetainedView {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    dialogRegistry = null,
    dialogLayer = null,
    textEntryService = null,
    counters = null,
    actions = {},
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ label: 'shop:page' });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.dialogRegistry = dialogRegistry;
    this.dialogLayer = dialogLayer;
    this.textEntryService = textEntryService;
    this.actions = actions;
    this.currentActions = actions;
    this.theme = theme;
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.selectedTabId = 'traders';
    this.model = normalizeShopViewModel({});
    this.backgroundGradient = null;

    this.background = new Graphics();
    this.background.label = 'shop:background';
    this.uiLayer = new Container();
    this.uiLayer.label = 'shop:ui';
    this.identityLayer = new Container();
    this.identityLayer.label = 'shop:marketIdentity';
    this.marketTitleRibbon = new MarketTitleRibbon({
      assetManager,
    });
    this.identityLayer.addChild(this.marketTitleRibbon.root);

    this.tabLayer = new Container();
    this.tabLayer.label = 'shop:tabs';
    this.tabButtons = new Map();
    for (const tab of SHOP_TABS) {
      const button = new PixiTabButton({
        assetManager,
        inputRouter,
        semanticRegistry,
        semanticId: `shop.tab.${tab.id}`,
        text: tab.label,
        label: `shop:tab:${tab.id}`,
        action: () => this.selectTab(tab.id),
      });
      this.tabButtons.set(tab.id, button);
      this.tabLayer.addChild(button);
    }

    this.panelScrolls = new Map();
    for (const tab of SHOP_TABS) {
      const scroll = new RetainedScrollArea({
        assetManager,
        inputRouter,
        label: `shop:${tab.id}:scroll`,
      });
      this.panelScrolls.set(tab.id, scroll);
      this.uiLayer.addChild(scroll.root);
    }

    this.stallsSection = new ShopStallsSection({
      page: this,
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
    });
    this.requestsSection = new ShopRowsSection({
      page: this,
      title: 'Requests',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: COMPACT_ROW_HEIGHT,
      label: 'shop:requests',
      titleVariant: 'automation',
      rowPresentation: 'stall',
      rowTitlePrefix: 'Request',
      rowSemanticPrefix: 'shop.requests',
      rowTutorialPrefix: 'shop:request',
    });
    this.playerMarketSection = new ShopRowsSection({
      page: this,
      title: 'Player Market',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: COMPACT_ROW_HEIGHT,
      label: 'shop:playerMarket',
      titleVariant: 'automation',
      rowPresentation: 'stall',
      rowTitlePrefix: 'Stand',
      rowSemanticPrefix: 'shop.playerMarket',
      rowTutorialPrefix: 'shop:player-stand',
    });
    this.coinOfferSection = new ShopRowsSection({
      page: this,
      title: 'Coin Offer',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: OFFER_ROW_HEIGHT,
      label: 'shop:coinOffer',
      titleVariant: 'crystal',
      rowPresentation: 'offer',
    });
    this.crystalOffersSection = new ShopRowsSection({
      page: this,
      title: 'Crystals',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: OFFER_ROW_HEIGHT,
      label: 'shop:crystalOffers',
      titleVariant: 'crystal',
      rowPresentation: 'offer',
    });

    this.panelScrolls
      .get('traders')
      .content.addChild(this.stallsSection.root);
    this.panelScrolls
      .get('players')
      .content.addChild(
        this.requestsSection.root,
        this.playerMarketSection.root,
      );
    this.panelScrolls
      .get('crystals')
      .content.addChild(
        this.coinOfferSection.root,
        this.crystalOffersSection.root,
      );

    this.uiLayer.addChild(this.identityLayer, this.tabLayer);
    this.root.addChild(this.background, this.uiLayer);
    this.registerDialogs({ counters });
    this.onApplyTheme(theme);
    this.relayout();
  }

  registerDialogs({ counters }) {
    if (!this.dialogRegistry) {
      return;
    }
    for (const dialogId of Object.values(SHOP_DIALOG_IDS)) {
      if (this.dialogRegistry.has(dialogId)) {
        continue;
      }
      this.dialogRegistry.register(
        dialogId,
        () =>
          new ShopDialogPixi({
            dialogId,
            parent: this.dialogLayer,
            assetManager: this.assetManager,
            inputRouter: this.inputRouter,
            semanticRegistry: this.semanticRegistry,
            textEntryService: this.textEntryService,
            counters,
            onClose: () => this.dialogRegistry.close(dialogId),
            theme: this.theme,
          }),
      );
    }
  }

  onBind(viewModel) {
    this.model = normalizeShopViewModel(viewModel);
    this.currentActions = this.model.actions ?? this.actions;
    this.selectedTabId = normalizeTabId(
      this.model.selectedTabId ?? this.selectedTabId,
    );
    const rank = clampInteger(this.model.market.rank, 1, 5);
    this.marketTitleRibbon.bind(
      formatTitleCase(
        this.model.market.name ?? 'Small Town Market',
      ),
      rank,
    );
    this.layoutMarketIdentity();
    this.updateTabNotifications();

    this.stallsSection.bind(this.model.traders, {
      openStall: (stall) =>
        this.openDialog(
          SHOP_DIALOG_IDS.STALL,
          stall.dialog ?? this.model.dialogs.stall ?? stall,
        ),
      openLedger: () =>
        this.openDialog(
          SHOP_DIALOG_IDS.LEDGER,
          this.model.dialogs.ledger ?? this.model.traders.ledger ?? {},
        ),
    });
    this.requestsSection.bind(
      this.model.players.requests.slots,
      this.createRequestSectionOptions(),
    );
    this.playerMarketSection.bind(
      this.createPlayerMarketRows(),
      this.createPlayerMarketSectionOptions(),
    );
    this.coinOfferSection.bind(
      this.model.crystals.coinOffer
        ? [
            {
              id: 'coinOffer',
              title:
                this.model.crystals.coinOffer.title ??
                'Coin Offer',
              resourceKey: 'coin',
              amountLabel: stripResourceName(
                this.model.crystals.coinOffer.rewardLabel ?? '',
                'coin',
              ),
              value:
                this.model.crystals.coinOffer.actionLabel ??
                (this.model.crystals.coinOffer.canCollect
                  ? 'collect'
                  : this.model.crystals.coinOffer.timerLabel ?? ''),
              valueResourceKey: null,
              valueVariant: 'green',
              valueMuted:
                this.model.crystals.coinOffer.canCollect !== true,
              enabled: this.model.crystals.coinOffer.canCollect === true,
              notification:
                this.model.crystals.coinOffer.notification ??
                this.model.crystals.coinOffer.canCollect === true,
              semanticId: 'shop.coinOffer.collect',
              action:
                this.model.crystals.coinOffer.action ??
                this.currentActions.collectCoinOffer,
            },
          ]
        : [],
    );
    this.crystalOffersSection.bind(
      this.model.crystals.offers.map((offer, index) => ({
        ...offer,
        id: offer.id ?? offer.crystalCount ?? index,
        title: offer.title ?? 'Crystal Offer',
        resourceKey: 'crystal',
        amountLabel:
          offer.amountLabel ??
          offer.crystalCount ??
          stripResourceName(
            offer.bundleLabel ?? offer.label ?? '',
            'crystal',
          ),
        value: offer.priceLabel ?? offer.value ?? '',
        valueVariant: 'green',
        semanticId:
          offer.semanticId ??
          `shop.crystalOffer.${offer.crystalCount ?? index}`,
        action: () =>
          offer.action?.(offer) ??
          this.openDialog(
            SHOP_DIALOG_IDS.SUPPORT,
            offer.dialog ?? this.model.dialogs.support ?? {},
          ),
      })),
    );

    this.applySelectedTab();
    this.relayoutSections();
  }

  playStallSaleEffect(slotNumber) {
    const normalizedSlotNumber = Math.floor(Number(slotNumber));
    if (!Number.isInteger(normalizedSlotNumber) || normalizedSlotNumber < 1) {
      return false;
    }
    const stall = this.stallsSection.stalls
      .getWidgets()
      .find(
        (candidate) =>
          Number(candidate.model?.slotNumber) === normalizedSlotNumber,
      );
    return stall?.startSaleShine() ?? false;
  }

  createRequestSectionOptions() {
    const requests = this.model.players.requests;
    return {
      actions:
        requests.canClear === true
          ? [
              {
                id: 'clear',
                label: 'clear',
                semanticId: 'shop.requests.clear',
                enabled: true,
                action:
                  requests.clearAction ??
                  this.currentActions.clearPlayerRequest,
              },
            ]
          : [],
      onRow: (slot) =>
        slot.action?.(slot) ??
        this.openDialog(
          SHOP_DIALOG_IDS.REQUEST,
          slot.dialog ?? this.model.dialogs.request ?? slot,
        ),
    };
  }

  createPlayerMarketRows() {
    return safeArray(this.model.players.market.slots);
  }

  createPlayerMarketSectionOptions() {
    const market = this.model.players.market;
    const footerActions = [
      {
        id: 'browse',
        label: 'browse market',
        semanticId: 'shop.playerMarket.browse',
        notification: market.browseNotification === true,
        notificationTone: 'orange',
        action:
          market.browseAction ??
          (() =>
            this.openDialog(
              SHOP_DIALOG_IDS.MARKET,
              this.model.dialogs.market ?? market.marketDialog ?? {},
            )),
      },
      {
        id: 'history',
        label: 'trade history',
        semanticId: 'shop.playerMarket.history',
        action:
          market.historyAction ??
          (() =>
            this.openDialog(
              SHOP_DIALOG_IDS.TRADE_HISTORY,
              this.model.dialogs.tradeHistory ?? market.historyDialog ?? {},
            )),
      },
    ];
    return {
      actions: footerActions,
      trailingRows: market.proceedsLabel
        ? [
            {
              id: 'proceeds',
              itemLabel:
                market.proceedsValueLabel ??
                extractClaimValue(market.proceedsLabel),
              resourceKey: 'coin',
              value: 'claim',
              valueVariant: 'green',
              enabled: market.canClaimProceeds !== false,
              notification:
                market.proceedsNotification === true,
              notificationTone: 'orange',
              semanticId: 'shop.playerMarket.claim',
              action:
                market.claimAction ??
                this.currentActions.claimPlayerMarketProceeds,
            },
          ]
        : [],
      onRow: (slot) =>
        slot.action?.(slot) ??
        this.openDialog(
          SHOP_DIALOG_IDS.LISTING,
          slot.dialog ?? this.model.dialogs.listing ?? slot,
        ),
    };
  }

  selectTab(tabId) {
    const normalized = normalizeTabId(tabId);
    if (normalized === this.selectedTabId) {
      return true;
    }
    const tab = SHOP_TABS.find((candidate) => candidate.id === normalized);
    const result =
      this.currentActions.selectTab?.(tab?.legacyId ?? normalized, normalized) ??
      true;
    if (result === false || result?.ok === false) {
      return false;
    }
    this.selectedTabId = normalized;
    this.applySelectedTab();
    return true;
  }

  applySelectedTab() {
    for (const tab of SHOP_TABS) {
      const selected = tab.id === this.selectedTabId;
      const scroll = this.panelScrolls.get(tab.id);
      scroll.root.visible = selected;
      scroll.root.renderable = selected;
      scroll.root.eventMode = selected ? 'static' : 'none';
      this.tabButtons.get(tab.id).setSelected(selected);
    }
  }

  openDialog(dialogId, payload = {}) {
    if (!this.dialogRegistry?.has(dialogId)) {
      return false;
    }
    const decoratedPayload = {
      ...payload,
      actions: payload.actions ?? this.currentActions,
    };
    this.dialogRegistry.open(dialogId, decoratedPayload);
    return true;
  }

  onApplyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.rebuildBackgroundGradient();
    this.redrawBackground();
    for (const button of this.tabButtons?.values?.() ?? []) {
      button.applyTheme(this.theme);
    }
    this.updateTabNotifications();
    for (const section of this.getSections()) {
      section.applyTheme(this.theme);
    }
  }

  onLayout(viewportProjection) {
    this.sourceWidth = finiteOr(
      viewportProjection?.sourceWidth,
      PIXI_UI_GEOMETRY.sourceWidth,
    );
    this.sourceHeight = finiteOr(
      viewportProjection?.sourceHeight,
      PIXI_UI_GEOMETRY.sourceHeight,
    );
    this.relayout();
  }

  onActivate() {
    const subscribe = this.model.subscribe;
    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((nextModel) => this.bind(nextModel));
      if (typeof unsubscribe === 'function') {
        this.addActiveCleanup(unsubscribe);
      }
    }
    this.currentActions.onActivate?.();
  }

  onDeactivate() {
    this.currentActions.onDeactivate?.();
  }

  relayout() {
    if (!this.background) {
      return;
    }
    const edge = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = this.sourceWidth - edge * 2;
    const identityY =
      PIXI_UI_GEOMETRY.roomContentTop -
      MARKET_TITLE_TOP_OVERHANG;
    const panelTop =
      PIXI_UI_GEOMETRY.roomContentTop +
      STATION_TITLE_HEIGHT +
      STATION_TITLE_ROW_GAP;
    const tabY =
      this.sourceHeight -
      resolveRetainedPageBottomClearance(this.model) -
      6 -
      PIXI_UI_GEOMETRY.roomControlHeight;
    const panelBottom = tabY - PAGE_SCROLL_CUT;
    const panelHeight = Math.max(0, panelBottom - panelTop);

    this.identityLayer.position.set(0, identityY);
    this.layoutMarketIdentity();
    for (const scroll of this.panelScrolls.values()) {
      scroll.setBounds(
        0,
        panelTop,
        this.sourceWidth - edge,
        panelHeight,
      );
    }
    this.tabLayer.position.set(edge, tabY);
    const tabWidth =
      (contentWidth - TAB_GAP * (SHOP_TABS.length - 1)) /
      SHOP_TABS.length;
    let x = 0;
    for (const tab of SHOP_TABS) {
      const button = this.tabButtons.get(tab.id);
      button.position.set(x, 0);
      button.setSize(tabWidth, PIXI_UI_GEOMETRY.roomControlHeight);
      x += tabWidth + TAB_GAP;
    }
    this.relayoutSections();
    this.redrawBackground();
  }

  layoutMarketIdentity() {
    this.marketTitleRibbon.setMaxWidth(this.sourceWidth);
    this.marketTitleRibbon.root.position.set(
      (this.sourceWidth - this.marketTitleRibbon.width) / 2,
      0,
    );
  }

  relayoutSections() {
    if (!this.stallsSection) {
      return;
    }
    const stallsWidth =
      this.sourceWidth - PIXI_UI_GEOMETRY.roomContentEdge;
    this.stallsSection.setBounds(
      0,
      PAGE_SCROLL_CUT,
      stallsWidth,
      this.stallsSection.getPreferredHeight(stallsWidth),
    );
    this.panelScrolls
      .get('traders')
      .setContentHeight(
        PAGE_SCROLL_CUT * 2 +
          this.stallsSection.getPreferredHeight(stallsWidth),
      );

    let playerY = PAGE_SCROLL_CUT;
    const requestHeight =
      this.requestsSection.getPreferredHeight(stallsWidth);
    this.requestsSection.setBounds(
      0,
      playerY,
      stallsWidth,
      requestHeight,
    );
    playerY += requestHeight + SECTION_GAP;
    const marketHeight =
      this.playerMarketSection.getPreferredHeight(stallsWidth);
    this.playerMarketSection.setBounds(
      0,
      playerY,
      stallsWidth,
      marketHeight,
    );
    playerY +=
      marketHeight +
      PAGE_SCROLL_CUT +
      PIXI_UI_GEOMETRY.borderLabelLineHeight;
    this.panelScrolls.get('players').setContentHeight(playerY);

    let crystalY = PAGE_SCROLL_CUT;
    const coinHeight =
      this.coinOfferSection.getPreferredHeight(stallsWidth);
    this.coinOfferSection.setBounds(
      0,
      crystalY,
      stallsWidth,
      coinHeight,
    );
    crystalY += coinHeight + SECTION_GAP;
    const offersHeight =
      this.crystalOffersSection.getPreferredHeight(stallsWidth);
    this.crystalOffersSection.setBounds(
      0,
      crystalY,
      stallsWidth,
      offersHeight,
    );
    crystalY += offersHeight + PAGE_SCROLL_CUT;
    this.panelScrolls.get('crystals').setContentHeight(crystalY);
  }

  rebuildBackgroundGradient() {
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = createPixiPageBackgroundGradient(
      'shop',
      this.theme,
    );
  }

  redrawBackground() {
    if (!this.background) {
      return;
    }
    drawPixiPageBackground(this.background, {
      pageId: 'shop',
      theme: this.theme,
      width: this.sourceWidth,
      height: this.sourceHeight,
      background: this.backgroundGradient ?? this.theme.surface,
    });
  }

  updateTabNotifications() {
    if (!this.tabButtons) {
      return;
    }
    for (const tab of SHOP_TABS) {
      const state = getShopTabNotification(this.model, tab.id);
      this.tabButtons
        .get(tab.id)
        ?.setNotification(state.active, state.tone);
    }
  }

  getSections() {
    return [
      this.stallsSection,
      this.requestsSection,
      this.playerMarketSection,
      this.coinOfferSection,
      this.crystalOffersSection,
    ].filter(Boolean);
  }

  onDestroy() {
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = null;
    for (const section of this.getSections()) {
      section.root.parent?.removeChild?.(section.root);
      section.destroy();
    }
    for (const button of this.tabButtons.values()) {
      button.parent?.removeChild?.(button);
      button.destroy({ children: true });
    }
    for (const scroll of this.panelScrolls.values()) {
      scroll.root.parent?.removeChild?.(scroll.root);
      scroll.destroy();
    }
  }
}

export class ShopStallsSection {
  constructor({
    page,
    assetManager,
    inputRouter,
    semanticRegistry,
    counters,
  }) {
    this.page = page;
    this.assetManager = assetManager;
    this.theme = page.theme;
    this.root = new Container({
      label: 'shop:stalls:section',
    });
    this.titlePlaque = new ResearchStationTitlePlaque({
      assetManager,
    });
    this.titlePlaque.root.label = 'shop:stalls:titlePlaque';
    this.titlePlaque.bind('Your Stalls', 'automation');
    this.rowsLayer = new Container();
    this.rowsLayer.label = 'shop:stalls:rows';
    this.root.addChild(this.titlePlaque.root, this.rowsLayer);
    this.ledgerButton = new ShopInlineButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'shop.ledger.open',
      text: 'Market Ledger',
      label: 'shop:ledger:open',
      action: () => this.openLedger?.(),
    });
    this.timerLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: 'shop:stalls:timer',
    });
    this.root.addChild(
      this.ledgerButton.root,
      this.timerLabel,
    );
    this.stallPool = new WidgetPool({
      name: 'shop stall widget pool',
      counters,
      create: () =>
        new ShopStallWidget({
          page,
          assetManager,
          inputRouter,
          semanticRegistry,
        }),
      reset: (stall) => stall.reset(),
      dispose: (stall) => stall.destroy(),
      maxSize: 8,
    });
    this.stalls = new PooledCollection({
      name: 'shop stall widgets',
      pool: this.stallPool,
      counters,
      keyOf: (stall, index) =>
        stall.id ?? stall.slotNumber ?? index,
      bind: (widget, stall, key) =>
        widget.bind(key, stall, () => this.openStall?.(stall)),
      afterReconcile: (widgets) => orderChildren(this.rowsLayer, widgets),
    });
    this.width = 0;
  }

  bind(model = {}, { openStall, openLedger } = {}) {
    this.model = model;
    this.openStall = openStall;
    this.openLedger = openLedger;
    this.stalls.reconcile(safeArray(model.stalls));
    this.timerLabel.setText(model.timerLabel ?? '');
    this.timerLabel.visible = Boolean(model.timerLabel);
    for (const stall of this.stalls.getWidgets()) {
      stall.applyTheme(this.theme);
    }
  }

  getPreferredHeight() {
    const count = this.stalls.getWidgets().length;
    const rowsHeight =
      count > 0
        ? count * STALL_CARD_HEIGHT + (count - 1) * CARD_GAP
        : PIXI_UI_GEOMETRY.rowMinHeight;
    return (
      STATION_TITLE_HEIGHT +
      STATION_TITLE_ROW_GAP +
      rowsHeight +
      24
    );
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    const edge = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = width - edge;
    this.titlePlaque.setMaxWidth(width);
    this.rowsLayer.position.set(
      edge,
      STATION_TITLE_HEIGHT + STATION_TITLE_ROW_GAP,
    );
    let rowY = 0;
    for (const stall of this.stalls.getWidgets()) {
      stall.setBounds(0, rowY, contentWidth, STALL_CARD_HEIGHT);
      rowY += STALL_CARD_HEIGHT + CARD_GAP;
    }
    const ledgerWidth = 86;
    this.ledgerButton.setBounds(
      width - ledgerWidth - 12,
      height - 7,
      ledgerWidth,
      PIXI_UI_GEOMETRY.borderLabelLineHeight,
    );
    this.timerLabel.position.set(
      Math.max(8, (width - this.timerLabel.measuredWidth) / 2),
      height - 7,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.ledgerButton.applyTheme(this.theme);
    this.timerLabel.applyTheme(this.theme);
    for (const stall of this.stalls.getWidgets()) {
      stall.applyTheme(this.theme);
    }
  }

  destroy() {
    this.stalls.destroy();
    this.stallPool.destroy();
    this.ledgerButton.destroy();
    this.root.destroy({ children: true });
  }
}

export class ShopRowsSection {
  constructor({
    page,
    title,
    assetManager,
    inputRouter,
    semanticRegistry,
    counters,
    rowHeight,
    label,
    titleVariant = 'regular',
    rowPresentation = 'compact',
    rowTitlePrefix = '',
    rowSemanticPrefix = '',
    rowTutorialPrefix = '',
  }) {
    this.page = page;
    this.title = title;
    this.rowHeight = rowHeight;
    this.theme = page.theme;
    this.assetManager = assetManager;
    this.titleVariant = titleVariant;
    this.rowPresentation = rowPresentation;
    this.rowTitlePrefix = rowTitlePrefix;
    this.rowSemanticPrefix = rowSemanticPrefix;
    this.rowTutorialPrefix = rowTutorialPrefix;
    this.root = new Container({
      label: `${label}:section`,
    });
    this.titlePlaque = new ResearchStationTitlePlaque({
      assetManager,
    });
    this.titlePlaque.root.label = `${label}:titlePlaque`;
    this.titlePlaque.bind(title, titleVariant);
    this.contentLayer = new Container({
      label: `${label}:content`,
    });
    this.root.addChild(this.titlePlaque.root, this.contentLayer);
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${label}:rows`;
    this.trailingRowsLayer = new Container();
    this.trailingRowsLayer.label = `${label}:trailingRows`;
    this.actionsLayer = new Container();
    this.actionsLayer.label = `${label}:actions`;
    this.countLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:count`,
    });
    this.contentLayer.addChild(
      this.rowsLayer,
      this.trailingRowsLayer,
      this.actionsLayer,
    );
    this.root.addChild(this.countLabel);
    this.rowPool = new WidgetPool({
      name: `${label} row pool`,
      counters,
      create: () =>
        this.rowPresentation === 'stall'
          ? new ShopStallWidget({
              assetManager,
              inputRouter,
              semanticRegistry,
            })
          : this.rowPresentation === 'offer'
            ? new MarketOfferRow({
                assetManager,
                inputRouter,
                semanticRegistry,
                label: `${label}:row`,
              })
          : new ShopCompactRow({
              assetManager,
              inputRouter,
              semanticRegistry,
              label: `${label}:row`,
              paperPresentation: true,
            }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 16,
    });
    this.rows = new PooledCollection({
      name: `${label} rows`,
      pool: this.rowPool,
      counters,
      keyOf: (row, index) =>
        row.id ?? row.slotNumber ?? row.crystalCount ?? index,
      bind: (widget, row, key) => {
        const model =
          this.rowPresentation === 'stall'
            ? normalizeSectionStallRow(row, key, {
                titlePrefix: this.rowTitlePrefix,
                semanticPrefix: this.rowSemanticPrefix,
                tutorialPrefix: this.rowTutorialPrefix,
              })
            : row;
        widget.bind(key, model, () => this.onRow?.(row));
      },
      afterReconcile: (widgets) => orderChildren(this.rowsLayer, widgets),
    });
    this.trailingRowPool = new WidgetPool({
      name: `${label} trailing row pool`,
      counters,
      create: () =>
        new ShopCompactRow({
          assetManager,
          inputRouter,
          semanticRegistry,
          label: `${label}:trailingRow`,
          paperPresentation: true,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 4,
    });
    this.trailingRows = new PooledCollection({
      name: `${label} trailing rows`,
      pool: this.trailingRowPool,
      counters,
      keyOf: (row, index) => row.id ?? index,
      bind: (widget, row, key) =>
        widget.bind(key, row, () => row.action?.(row)),
      afterReconcile: (widgets) =>
        orderChildren(this.trailingRowsLayer, widgets),
    });
    this.actionPool = new WidgetPool({
      name: `${label} footer action pool`,
      counters,
      create: () =>
        new ShopInlineButton({
          assetManager,
          inputRouter,
          semanticRegistry,
          label: `${label}:footerAction`,
          paperPresentation: true,
        }),
      reset: (button) => button.reset(),
      dispose: (button) => button.destroy(),
      maxSize: 4,
    });
    this.actions = new PooledCollection({
      name: `${label} footer actions`,
      pool: this.actionPool,
      counters,
      keyOf: (action, index) => action.id ?? index,
      bind: (button, action, key) => {
        button.bind(key, action, action.action);
        button.applyTheme(this.theme);
      },
      afterReconcile: (widgets) => orderChildren(this.actionsLayer, widgets),
    });
  }

  bind(rows, options = {}) {
    this.onRow = options.onRow;
    this.countLabel.setText(options.countLabel ?? '');
    this.countLabel.visible = Boolean(options.countLabel);
    this.rows.reconcile(safeArray(rows));
    this.trailingRows.reconcile(safeArray(options.trailingRows));
    this.actions.reconcile(safeArray(options.actions));
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
    for (const row of this.trailingRows.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  getPreferredHeight() {
    const rowCount = this.rows.getWidgets().length;
    const trailingRowCount = this.trailingRows.getWidgets().length;
    const actionCount = this.actions.getWidgets().length;
    const rowHeight =
      this.rowPresentation === 'stall'
        ? STALL_CARD_HEIGHT
        : this.rowPresentation === 'offer'
          ? MARKET_OFFER_CARD_HEIGHT
        : Math.max(OFFER_CARD_MIN_HEIGHT, this.rowHeight);
    const trailingRowHeight = Math.max(
      OFFER_CARD_MIN_HEIGHT,
      this.rowHeight,
    );
    let rowsHeight =
      rowCount > 0
        ? rowCount * rowHeight + (rowCount - 1) * CARD_GAP
        : 0;
    if (trailingRowCount > 0) {
      rowsHeight +=
        (rowsHeight > 0 ? CARD_GAP : 0) +
        trailingRowCount * trailingRowHeight +
        (trailingRowCount - 1) * CARD_GAP;
    }
    if (rowsHeight === 0) {
      rowsHeight = rowHeight;
    }
    const actionOverflow =
      actionCount > 0
        ? PIXI_UI_GEOMETRY.borderLabelLineHeight / 2
        : 0;
    return (
      STATION_TITLE_HEIGHT +
      STATION_TITLE_ROW_GAP +
      rowsHeight +
      actionOverflow
    );
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    const contentInsetX = PIXI_UI_GEOMETRY.roomContentEdge;
    const contentWidth = width - contentInsetX;
    const buttons = this.actions.getWidgets();
    const rowHeight =
      this.rowPresentation === 'stall'
        ? STALL_CARD_HEIGHT
        : this.rowPresentation === 'offer'
          ? MARKET_OFFER_CARD_HEIGHT
        : Math.max(OFFER_CARD_MIN_HEIGHT, this.rowHeight);
    const trailingRowHeight = Math.max(
      OFFER_CARD_MIN_HEIGHT,
      this.rowHeight,
    );
    this.titlePlaque.setMaxWidth(width);
    this.contentLayer.position.set(
      contentInsetX,
      STATION_TITLE_HEIGHT + STATION_TITLE_ROW_GAP,
    );
    let rowY = 0;
    for (const row of this.rows.getWidgets()) {
      row.setBounds(
        0,
        rowY,
        contentWidth,
        rowHeight,
      );
      rowY += rowHeight + CARD_GAP;
    }
    this.trailingRowsLayer.position.set(0, rowY);
    let trailingRowY = 0;
    for (const row of this.trailingRows.getWidgets()) {
      row.setBounds(
        0,
        trailingRowY,
        contentWidth,
        trailingRowHeight,
      );
      trailingRowY += trailingRowHeight + CARD_GAP;
      rowY += trailingRowHeight + CARD_GAP;
    }
    if (buttons.length > 0) {
      this.actionsLayer.position.set(0, 0);
      layoutBorderActions(
        buttons,
        contentWidth,
        Math.max(0, rowY - CARD_GAP) -
          PIXI_UI_GEOMETRY.borderLabelLineHeight / 2,
      );
    }
    this.countLabel.position.set(
      width - this.countLabel.measuredWidth - 10,
      STATION_TITLE_HEIGHT +
        STATION_TITLE_ROW_GAP -
        PIXI_UI_GEOMETRY.borderLabelLineHeight / 2,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.countLabel.applyTheme(this.theme);
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
    for (const row of this.trailingRows.getWidgets()) {
      row.applyTheme(this.theme);
    }
    for (const button of this.actions.getWidgets()) {
      button.applyTheme(this.theme);
    }
  }

  destroy() {
    this.rows.destroy();
    this.rowPool.destroy();
    this.trailingRows.destroy();
    this.trailingRowPool.destroy();
    this.actions.destroy();
    this.actionPool.destroy();
    this.root.destroy({ children: true });
  }
}

export class ShopStallWidget {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
  }) {
    this.assetManager = assetManager;
    this.semanticRegistry = semanticRegistry;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container();
    this.root.label = 'shop:stall';
    this.visual = new Container({
      label: 'shop:stall:visual',
    });
    this.frame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
      label: 'shop:stall:frame',
    });
    this.title = new PixiTextLabel({
      fontWeight: 'bold',
      color: STALL_TEXT_INK,
      label: 'shop:stall:title',
    });
    this.stars = new PixiStarLevelLabel({
      assetManager,
      label: 'shop:stall:stars',
    });
    this.batchBadge = new Sprite(Texture.EMPTY);
    this.batchBadge.label = 'shop:stall:batchBadge';
    this.batchBadge.anchor.set(0.5, 0);
    this.batchBadge.visible = false;
    this.batch = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: STALL_QUANTITY_COLOR,
      stroke: STALL_QUANTITY_STROKE,
      label: 'shop:stall:batch',
    });
    this.iconFrame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: STALL_ART_SOURCE_INSETS,
      borderInsets: STALL_ART_BORDER_INSETS,
      width: STALL_ART_WELL_SIZE,
      height: STALL_ART_WELL_SIZE,
      label: 'shop:stall:iconFrame',
    });
    this.iconFrame.tint = PIXI_SQUIRCLE_TINTS.artWell;
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = 'shop:stall:icon';
    this.icon.anchor.set(0.5);
    this.icon.visible = false;
    this.iconOverlay = new Sprite(Texture.EMPTY);
    this.iconOverlay.label = 'shop:stall:iconOverlay';
    this.iconOverlay.anchor.set(0.5);
    this.iconOverlay.visible = false;
    this.item = new PixiTextLabel({
      color: STALL_TEXT_INK,
      label: 'shop:stall:item',
    });
    this.quantity = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 0.5, y: 1 },
      color: STALL_QUANTITY_COLOR,
      stroke: STALL_QUANTITY_STROKE,
      label: 'shop:stall:quantity',
    });
    this.price = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      color: STALL_TEXT_INK,
      label: 'shop:stall:price',
    });
    this.priceAction = new PixiTextButton({
      assetManager,
      inputRouter,
      width: STALL_SELECT_ACTION_WIDTH,
      height: STALL_SELECT_ACTION_HEIGHT,
      variant: 'green',
      label: 'shop:stall:priceAction',
    });
    this.priceAction.visible = false;
    this.priceAction.renderable = false;
    this.priceResource = new PixiResourceLabel({
      assetManager,
      resource: 'coin',
      amount: '',
      includeResourceName: false,
      label: 'shop:stall:priceResource',
    });
    this.progress = new PixiProgressBar({
      assetManager,
      tone: 'root',
      label: 'shop:stall:progress',
    });
    this.timer = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.tinyFontSize,
      anchor: { x: 1, y: 0.5 },
      color: STALL_TEXT_INK,
      label: 'shop:stall:timer',
    });
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label = 'shop:stall:notification';
    this.notification = this.notificationBadge.root;
    this.saleShine = createResearchShine({
      texture: resolveTexture(assetManager, {
        textureId: PIXI_ROOT_RUN_ASSETS.researchButtonShine,
      }),
      alpha: RESEARCH_WIDGET_SHINE_ALPHA,
      label: 'shop:stall:saleShine',
    });
    this.visual.addChild(
      this.frame,
      this.title,
      this.stars,
      this.batchBadge,
      this.batch,
      this.iconFrame,
      this.icon,
      this.iconOverlay,
      this.item,
      this.quantity,
      this.price,
      this.priceAction,
      this.priceResource,
      this.progress,
      this.timer,
      this.notification,
      this.saleShine.root,
    );
    this.root.addChild(this.visual);
    this.enabled = false;
    this.pressed = false;
    this.action = null;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.priceSemanticId = null;
    this.priceSemanticDefinition = null;
    this.releaseFrame = 0;
    this.releaseStartedAt = 0;
    this.saleShineFrame = 0;
    this.saleShineStartedAt = 0;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        fallbackHitTest: true,
        enabled: () =>
          this.enabled &&
          this.root.visible &&
          this.root.renderable,
        onPressChange: (pressed, context) =>
          this.setPressed(pressed, context),
        onActivate: (payload) => this.action?.(payload),
        haptic: 'light',
      }) ?? null;
  }

  bind(key, stall = {}, action) {
    this.unregisterSemantic();
    this.key = key;
    this.model = stall;
    this.action = action ?? stall.action;
    this.enabled = stall.enabled !== false && stall.locked !== true;
    this.root.visible = stall.hidden !== true;
    this.root.renderable = this.root.visible;
    this.root.eventMode = this.enabled ? 'static' : 'none';
    this.title.setText(formatTitleCase(
      stall.title ?? `stall ${stall.slotNumber ?? key}`,
    ));
    this.stars.setLevel(
      stall.starLevel ??
        countCapacityStars(stall.capacityLabel ?? stall.capacity),
    );
    this.stars.visible = this.stars.level > 0;
    this.stars.renderable = this.stars.visible;
    const batchLabel = stall.batchLabel ?? stall.batch ?? '';
    this.batch.setText(batchLabel);
    this.batch.visible = Boolean(batchLabel);
    this.batch.renderable = this.batch.visible;
    this.batchBadge.visible = this.batch.visible;
    this.batchBadge.renderable = this.batch.visible;
    this.item.setText(formatTitleCase(
      stall.itemLabel ??
        stall.label ??
        (stall.locked ? 'locked' : 'empty'),
    ));
    this.quantity.setText(stall.quantityLabel ?? '');
    this.quantity.visible = Boolean(stall.quantityLabel);
    const priceText = stall.priceLabel ?? stall.price ?? '';
    const priceResourceKey = stall.priceResourceKey ?? null;
    const priceActionVariant = stall.priceVariant ?? null;
    this.price.setText(formatTitleCase(priceText));
    this.price.visible = !priceResourceKey && !priceActionVariant;
    this.price.renderable = this.price.visible;
    this.priceAction.bind(
      key,
      {
        label: formatTitleCase(priceText),
        enabled: this.enabled,
        variant: priceActionVariant ?? 'green',
        hidden: !priceActionVariant,
        notification:
          Boolean(priceActionVariant) &&
          Boolean(stall.notification),
        notificationTone: stall.notificationTone,
      },
      (payload) => this.action?.(payload),
    );
    this.priceResource.visible = Boolean(priceResourceKey);
    this.priceResource.renderable = this.priceResource.visible;
    if (priceResourceKey) {
      this.priceResource.bind(key, {
        resource: priceResourceKey,
        amount: stripResourceName(priceText, priceResourceKey),
        includeResourceName: false,
      });
    }
    this.progress.setProgress(
      normalizeProgress(stall.progress ?? stall.progressPercent),
    );
    this.progress.visible =
      stall.progress !== null &&
      stall.progress !== undefined &&
      stall.paused !== true;
    this.timer.setText(stall.timerLabel ?? stall.pauseLabel ?? '');
    this.timer.setColor(stall.paused ? 'muted' : 'text');
    bindStallItemIcon({
      assetManager: this.assetManager,
      base: this.icon,
      overlay: this.iconOverlay,
      model: stall,
    });
    this.semanticId =
      stall.semanticId ??
      `shop.stall.${stall.slotNumber ?? key}`;
    if (this.semanticRegistry && this.semanticId) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId:
          stall.tutorialId ??
          `shop:stand:${stall.slotNumber ?? key}`,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) => this.action?.(payload),
      });
      this.priceSemanticId = `${this.semanticId}.price`;
      this.priceSemanticDefinition = this.semanticRegistry.register({
        semanticId: this.priceSemanticId,
        displayObject: this.priceResource,
        state: () => ({
          enabled: false,
          interactive: false,
          visible:
            this.root.visible &&
            this.root.renderable &&
            this.priceResource.visible &&
            this.priceResource.renderable,
        }),
      });
    }
    this.redrawState();
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.visual.pivot.set(width / 2, height / 2);
    this.visual.position.set(width / 2, height / 2);
    this.frame.setSize(
      width,
      height,
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    const headerY = 10 - STALL_CONTENT_RAISE;
    const iconY = 27 - STALL_CONTENT_RAISE;
    const detailY = 35 - STALL_CONTENT_RAISE;
    const progressY = 65 - STALL_CONTENT_RAISE;
    this.title.position.set(10, headerY);
    this.stars.position.set(
      this.title.x + this.title.measuredWidth + STALL_STAR_GAP,
      this.title.y + 1,
    );
    const batchCenterX =
      width -
      STALL_BATCH_BADGE_RIGHT_INSET -
      STALL_BATCH_BADGE_WIDTH / 2;
    this.batchBadge.position.set(
      batchCenterX,
      STALL_BATCH_BADGE_TOP,
    );
    this.batchBadge.width = STALL_BATCH_BADGE_WIDTH;
    this.batchBadge.height = STALL_BATCH_BADGE_HEIGHT;
    this.batch.position.set(
      batchCenterX,
      STALL_BATCH_BADGE_TOP + STALL_BATCH_TEXT_CENTER_Y,
    );
    this.iconFrame.position.set(10, iconY);
    this.iconFrame.setSize(
      STALL_ART_WELL_SIZE,
      STALL_ART_WELL_SIZE,
      STALL_ART_BORDER_INSETS,
    );
    const iconCenterX = this.iconFrame.x + STALL_ART_WELL_SIZE / 2;
    const iconCenterY = this.iconFrame.y + STALL_ART_WELL_SIZE / 2;
    if (this.iconOverlay.visible) {
      layoutPixiSeedPackIcon({
        base: this.icon,
        item: this.iconOverlay,
        x: iconCenterX,
        y: iconCenterY,
        width: STALL_ARTWORK_SIZE,
        height: STALL_ARTWORK_SIZE,
      });
    } else {
      this.icon.position.set(iconCenterX, iconCenterY);
      this.icon.width = STALL_ARTWORK_SIZE;
      this.icon.height = STALL_ARTWORK_SIZE;
      this.iconOverlay.rotation = 0;
    }
    this.item.position.set(70, detailY);
    this.item.setWrapWidth(Math.max(0, width - 160));
    this.quantity.position.set(
      iconCenterX,
      this.iconFrame.y + STALL_ART_WELL_SIZE - 2,
    );
    this.price.position.set(width - 10, detailY);
    this.priceAction.position.set(
      width - 10 - STALL_SELECT_ACTION_WIDTH,
      (height - STALL_SELECT_ACTION_HEIGHT) / 2,
    );
    this.priceResource.position.set(
      width - 10 - this.priceResource.measuredWidth,
      detailY,
    );
    this.layoutPriceResource();
    const timerWidth = Math.max(18, this.timer.measuredWidth);
    this.progress.position.set(70, progressY);
    this.progress.setSize(
      Math.max(0, width - 80 - timerWidth - 4),
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
    this.timer.position.set(
      width - 10,
      progressY + PIXI_UI_GEOMETRY.progressTotalHeight / 2,
    );
    this.notificationBadge.placeAtTopRight({
      x: 0,
      y: 0,
      width,
      height,
    });
    layoutResearchShine(
      this.saleShine,
      getResearchShineLayout(
        new Rectangle(0, 0, width, height),
        Math.max(1, Number(this.saleShine.sprite.texture?.width) || 0),
        Math.max(1, Number(this.saleShine.sprite.texture?.height) || 0),
        {
          heightScale: RESEARCH_WIDGET_SHINE_HEIGHT_SCALE,
          cornerRadiusScale:
            RESEARCH_WIDGET_SHINE_CORNER_RADIUS_SCALE,
        },
      ),
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.frame.setTexture(
      resolveTexture(this.assetManager, {
        textureId: PIXI_ROOT_RUN_ASSETS.researchCard,
      }),
      PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
    );
    this.iconFrame.setTexture(
      resolveTexture(this.assetManager, {
        textureId: PIXI_ROOT_RUN_ASSETS.researchArt,
      }),
      STALL_ART_SOURCE_INSETS,
    );
    this.batchBadge.texture =
      resolveTexture(this.assetManager, {
        textureId: PIXI_ROOT_RUN_ASSETS.stallBatchBadge,
      }) ?? Texture.EMPTY;
    this.title.applyTheme(this.theme);
    this.batch.applyTheme(this.theme);
    this.item.applyTheme(this.theme);
    this.quantity.applyTheme(this.theme);
    this.price.applyTheme(this.theme);
    this.priceAction.applyTheme(this.theme);
    this.priceResource.applyTheme(this.theme);
    this.layoutPriceResource();
    this.progress.applyTheme({
      ...this.theme,
      progress: { key: 'classic' },
    });
    this.timer.applyTheme(this.theme);
    this.redrawState();
  }

  setPressed(pressed, context = null) {
    const nextPressed = Boolean(pressed) && this.enabled;
    if (nextPressed) {
      this.cancelReleaseAnimation();
      this.pressed = true;
      this.visual.scale.set(STALL_PRESS_SCALE);
      this.redrawState();
      return;
    }

    const wasPressed = this.pressed;
    this.pressed = false;
    this.redrawState();
    if (
      wasPressed &&
      context?.confirmed === true &&
      !prefersReducedMotion()
    ) {
      this.startReleaseAnimation();
      return;
    }

    this.cancelReleaseAnimation();
    this.visual.scale.set(1);
  }

  startReleaseAnimation() {
    this.cancelReleaseAnimation();
    this.releaseStartedAt = now();
    const tick = () => {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (now() - this.releaseStartedAt) /
            STALL_RELEASE_DURATION_MS,
        ),
      );
      this.visual.scale.set(stallReleaseScale(progress));
      if (progress >= 1) {
        this.releaseFrame = 0;
        this.visual.scale.set(1);
        return;
      }
      this.releaseFrame = requestFrame(tick);
    };
    this.releaseFrame = requestFrame(tick);
  }

  cancelReleaseAnimation() {
    if (this.releaseFrame) {
      cancelFrame(this.releaseFrame);
      this.releaseFrame = 0;
    }
  }

  startSaleShine() {
    this.cancelSaleShine();
    if (prefersReducedMotion() || !this.saleShine.layout) {
      return false;
    }

    this.saleShineStartedAt = now();
    this.saleShine.root.visible = true;
    this.saleShine.root.renderable = true;
    updateResearchShine(this.saleShine, 0);
    const tick = () => {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (now() - this.saleShineStartedAt) /
            RESEARCH_WIDGET_SHINE_DURATION_MS,
        ),
      );
      updateResearchShine(this.saleShine, progress);
      if (progress >= 1) {
        this.saleShineFrame = 0;
        return;
      }
      this.saleShineFrame = requestFrame(tick);
    };
    this.saleShineFrame = requestFrame(tick);
    return true;
  }

  cancelSaleShine() {
    if (this.saleShineFrame) {
      cancelFrame(this.saleShineFrame);
      this.saleShineFrame = 0;
    }
    hideResearchShine(this.saleShine);
  }

  redrawState() {
    this.frame.alpha = this.model?.selected ? 0.86 : 1;
    this.title.setColor(STALL_TEXT_INK);
    this.batch.setColor(STALL_QUANTITY_COLOR);
    this.item.setColor(STALL_TEXT_INK);
    this.quantity.setColor(STALL_QUANTITY_COLOR);
    this.price.setColor(STALL_TEXT_INK);
    this.priceResource.amountLabel.setColor(STALL_TEXT_INK);
    this.timer.setColor(STALL_TEXT_INK);
    this.notificationBadge
      .setTone(this.model?.notificationTone)
      .setActive(
        Boolean(this.model?.notification) &&
        !this.model?.priceVariant,
      );
  }

  layoutPriceResource() {
    const amountWidth = this.priceResource.amountLabel.measuredWidth;
    const iconGap =
      amountWidth > 0 ? this.priceResource.fontSize * 0.14 : 0;
    const contentCenterY = this.priceResource.fontSize * 0.5;
    this.priceResource.amountLabel.position.set(0, contentCenterY);
    this.priceResource.icon.position.set(
      amountWidth + iconGap,
      contentCenterY,
    );
    if (Number.isFinite(this.width)) {
      this.priceResource.position.x =
        this.width - 10 - this.priceResource.measuredWidth;
    }
  }

  reset() {
    this.unregisterSemantic();
    this.model = null;
    this.key = null;
    this.action = null;
    this.enabled = false;
    this.setPressed(false);
    this.cancelSaleShine();
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
    this.icon.texture = Texture.EMPTY;
    this.icon.visible = false;
    this.icon.renderable = false;
    this.iconOverlay.texture = Texture.EMPTY;
    this.iconOverlay.visible = false;
    this.iconOverlay.renderable = false;
    this.iconOverlay.rotation = 0;
    this.priceAction.reset();
  }

  unregisterSemantic() {
    if (this.priceSemanticDefinition && this.priceSemanticId) {
      this.semanticRegistry?.unregister?.(this.priceSemanticId, {
        displayObject: this.priceResource,
      });
    }
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
    }
    this.priceSemanticDefinition = null;
    this.priceSemanticId = null;
    this.semanticDefinition = null;
    this.semanticId = null;
  }

  destroy() {
    this.unregisterSemantic();
    this.cancelReleaseAnimation();
    this.cancelSaleShine();
    this.registration?.();
    this.registration = null;
    this.root.destroy({ children: true });
  }
}

export class MarketOfferRow {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    label,
  }) {
    this.assetManager = assetManager;
    this.semanticRegistry = semanticRegistry;
    this.root = new Container({ label });
    this.frame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
      label: `${label}:frame`,
    });
    this.title = new PixiTextLabel({
      fontWeight: 'bold',
      color: STALL_TEXT_INK,
      label: `${label}:title`,
    });
    this.iconFrame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: STALL_ART_SOURCE_INSETS,
      borderInsets: STALL_ART_BORDER_INSETS,
      width: STALL_ART_WELL_SIZE,
      height: STALL_ART_WELL_SIZE,
      label: `${label}:iconFrame`,
    });
    this.iconFrame.tint = PIXI_SQUIRCLE_TINTS.artWell;
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `${label}:icon`;
    this.icon.anchor.set(0.5);
    this.icon.visible = false;
    this.icon.renderable = false;
    this.amountLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 1 },
      color: STALL_QUANTITY_COLOR,
      stroke: STALL_QUANTITY_STROKE,
      label: `${label}:amount`,
    });
    this.actionButton = new PixiTextButton({
      assetManager,
      inputRouter,
      width: MARKET_OFFER_ACTION_WIDTH,
      height: MARKET_OFFER_ACTION_HEIGHT,
      variant: 'green',
      label: `${label}:action`,
    });
    this.valueButton = this.actionButton;
    this.root.addChild(
      this.frame,
      this.title,
      this.iconFrame,
      this.icon,
      this.amountLabel,
      this.actionButton,
    );
    this.semanticId = null;
    this.semanticDefinition = null;
    this.model = null;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root.eventMode = 'passive';
  }

  bind(key, model = {}, fallbackAction) {
    this.unregisterSemantic();
    this.key = key;
    this.model = model;
    this.root.visible = model.hidden !== true;
    this.root.renderable = this.root.visible;
    this.enabled = model.enabled !== false && model.locked !== true;
    this.action = model.action ?? fallbackAction ?? null;
    this.title.setText(
      formatTitleCase(model.title ?? model.label ?? 'Offer'),
    );
    this.amountLabel.setText(String(model.amountLabel ?? ''));
    this.amountLabel.visible = Boolean(this.amountLabel.text);
    this.amountLabel.renderable = this.amountLabel.visible;
    this.resourceKey = String(model.resourceKey ?? '').toLowerCase();
    this.bindResourceIcon();
    const valueText =
      model.priceLabel ??
      model.actionLabel ??
      model.value ??
      '';
    this.actionButton.bind(
      key,
      {
        label: formatTitleCase(valueText),
        enabled: this.enabled,
        variant: model.valueVariant ?? 'green',
        notification: Boolean(model.notification),
        notificationTone: model.notificationTone,
      },
      this.action,
    );
    this.semanticId = model.semanticId ?? null;
    if (this.semanticRegistry && this.semanticId) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId: model.tutorialId ?? null,
        displayObject: this.actionButton,
        state: () => ({
          enabled: this.enabled,
          interactive: this.enabled && Boolean(this.action),
          visible:
            this.root.visible &&
            this.root.renderable &&
            this.actionButton.visible &&
            this.actionButton.renderable,
        }),
        activate: (payload) =>
          this.enabled ? this.action?.(payload) : false,
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.frame.setSize(
      width,
      height,
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    this.title.position.set(10, 5);
    this.title.setWrapWidth(
      Math.max(
        0,
        width -
          MARKET_OFFER_ACTION_WIDTH -
          OFFER_CARD_PADDING_X * 3,
      ),
    );
    this.iconFrame.position.set(10, 22);
    this.iconFrame.setSize(
      STALL_ART_WELL_SIZE,
      STALL_ART_WELL_SIZE,
      STALL_ART_BORDER_INSETS,
    );
    const iconCenterX =
      this.iconFrame.x + STALL_ART_WELL_SIZE / 2;
    const iconCenterY =
      this.iconFrame.y + STALL_ART_WELL_SIZE / 2;
    this.icon.position.set(iconCenterX, iconCenterY);
    this.icon.width = MARKET_OFFER_ICON_SIZE;
    this.icon.height = MARKET_OFFER_ICON_SIZE;
    this.amountLabel.position.set(
      iconCenterX,
      this.iconFrame.y + STALL_ART_WELL_SIZE - 2,
    );
    this.actionButton.position.set(
      width - OFFER_CARD_PADDING_X - MARKET_OFFER_ACTION_WIDTH,
      (height - MARKET_OFFER_ACTION_HEIGHT) / 2,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.frame.setTexture(
      resolveTexture(this.assetManager, {
        textureId: PIXI_ROOT_RUN_ASSETS.researchCard,
      }),
      PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
    );
    this.iconFrame.setTexture(
      resolveTexture(this.assetManager, {
        textureId: PIXI_ROOT_RUN_ASSETS.researchArt,
      }),
      STALL_ART_SOURCE_INSETS,
    );
    this.title.applyTheme(this.theme);
    this.title.setColor(STALL_TEXT_INK);
    this.amountLabel.applyTheme(this.theme);
    this.amountLabel.setColor(STALL_QUANTITY_COLOR);
    this.actionButton.applyTheme(this.theme);
    this.bindResourceIcon();
  }

  bindResourceIcon() {
    const frameName = this.resourceKey
      ? `resource:${this.resourceKey}`
      : null;
    this.icon.texture =
      frameName
        ? this.assetManager?.getAtlasTexture?.(frameName) ??
          Texture.EMPTY
        : Texture.EMPTY;
    this.icon.visible = Boolean(frameName);
    this.icon.renderable = this.icon.visible;
  }

  reset() {
    this.unregisterSemantic();
    this.key = null;
    this.model = null;
    this.action = null;
    this.enabled = false;
    this.resourceKey = '';
    this.icon.texture = Texture.EMPTY;
    this.icon.visible = false;
    this.icon.renderable = false;
    this.actionButton.reset();
    this.root.visible = false;
    this.root.renderable = false;
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.actionButton,
      });
    }
    this.semanticDefinition = null;
    this.semanticId = null;
  }

  destroy() {
    this.unregisterSemantic();
    this.root.destroy({ children: true });
  }
}

export class ShopCompactRow {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    label,
    paperPresentation = false,
  }) {
    this.assetManager = assetManager;
    this.paperPresentation = paperPresentation;
    this.root = new Container();
    this.root.label = label;
    this.frame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
      label: `${label}:frame`,
    });
    this.frame.visible = paperPresentation;
    this.frame.renderable = paperPresentation;
    this.background = new Graphics();
    this.indexLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:index`,
    });
    this.itemLabel = new PixiTextLabel({
      label: `${label}:item`,
    });
    this.itemResource = new PixiResourceLabel({
      assetManager,
      resource: 'coin',
      amount: '',
      includeResourceName: true,
      label: `${label}:itemResource`,
    });
    this.itemResource.visible = false;
    this.itemResource.renderable = false;
    this.valueLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.valueResource = new PixiResourceLabel({
      assetManager,
      resource: 'coin',
      amount: '',
      includeResourceName: true,
      label: `${label}:valueResource`,
    });
    this.valueResource.visible = false;
    this.valueResource.renderable = false;
    this.valueButton = new PixiTextButton({
      assetManager,
      inputRouter,
      width: OFFER_ACTION_WIDTH,
      height: OFFER_ACTION_HEIGHT,
      sizeTier: 30,
      variant: 'green',
      label: `${label}:valueButton`,
    });
    this.valueButton.visible = false;
    this.valueButton.renderable = false;
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label = `${label}:notification`;
    this.notification = this.notificationBadge.root;
    this.root.addChild(
      this.frame,
      this.background,
      this.indexLabel,
      this.itemLabel,
      this.itemResource,
      this.valueLabel,
      this.valueResource,
      this.valueButton,
      this.notification,
    );
    this.semanticRegistry = semanticRegistry;
    this.semanticPrefix = String(label ?? 'shop:row')
      .replaceAll(':', '.');
    this.semanticId = null;
    this.semanticDefinition = null;
    this.action = null;
    this.enabled = false;
    this.usesValueButton = false;
    this.semanticDisplayObject = null;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.enabled &&
          !this.usesValueButton &&
          Boolean(this.action) &&
          this.root.visible &&
          this.root.renderable,
        onPressChange: (pressed) => {
          this.pressed = pressed;
          this.redraw();
        },
        onActivate: (payload) => this.action?.(payload),
        haptic: 'light',
      }) ?? null;
  }

  bind(key, model = {}, fallbackAction) {
    this.unregisterSemantic();
    this.key = key;
    this.model = model;
    this.root.visible = model.hidden !== true;
    this.root.renderable = this.root.visible;
    this.enabled = model.enabled !== false && model.locked !== true;
    this.action = model.action ?? fallbackAction ?? null;
    this.usesValueButton = Boolean(model.valueVariant);
    this.root.eventMode = this.usesValueButton
      ? 'passive'
      : this.enabled && this.action
        ? 'static'
        : 'none';
    this.indexLabel.setText(
      model.indexLabel ??
        (model.slotNumber ? `${model.slotNumber}.` : ''),
    );
    const itemText =
      model.itemLabel ??
        model.bundleLabel ??
        model.label ??
        (model.empty ? 'empty' : '');
    const valueText =
      model.priceLabel ??
        model.actionLabel ??
        model.value ??
        '';
    const itemResourceKey = model.resourceKey ?? null;
    const valueResourceKey = model.valueResourceKey ?? null;
    this.itemLabel.setText(
      this.paperPresentation ? formatTitleCase(itemText) : itemText,
    );
    this.itemLabel.visible = !itemResourceKey;
    this.itemLabel.renderable = this.itemLabel.visible;
    this.itemResource.visible = Boolean(itemResourceKey);
    this.itemResource.renderable = this.itemResource.visible;
    if (itemResourceKey) {
      this.itemResource.bind(key, {
        resource: itemResourceKey,
        amount: stripResourceName(itemText, itemResourceKey),
        includeResourceName: true,
      });
    }
    this.valueLabel.setText(
      this.paperPresentation ? formatTitleCase(valueText) : valueText,
    );
    this.valueLabel.visible =
      !valueResourceKey && !this.usesValueButton;
    this.valueLabel.renderable = this.valueLabel.visible;
    this.valueResource.visible =
      Boolean(valueResourceKey) && !this.usesValueButton;
    this.valueResource.renderable = this.valueResource.visible;
    if (valueResourceKey) {
      this.valueResource.bind(key, {
        resource: valueResourceKey,
        amount: stripResourceName(valueText, valueResourceKey),
        includeResourceName: true,
      });
    }
    this.valueButton.bind(
      key,
      {
        label: this.paperPresentation
          ? formatTitleCase(valueText)
          : valueText,
        enabled: this.enabled,
        variant: model.valueVariant ?? 'green',
        hidden: !this.usesValueButton,
        notification: Boolean(model.notification),
        notificationTone: model.notificationTone,
      },
      this.action,
    );
    const disabled = !this.enabled;
    this.indexLabel.setColor(
      this.paperPresentation
        ? disabled
          ? STALL_MUTED_INK
          : STALL_TEXT_INK
        : disabled
          ? 'disabled'
          : 'text',
    );
    this.itemLabel.setColor(
      this.paperPresentation
        ? disabled
          ? STALL_MUTED_INK
          : STALL_TEXT_INK
        : resolveThemeColor(
            disabled ? 'disabled' : model.resourceKey ?? 'text',
          ),
    );
    this.valueLabel.setColor(
      this.paperPresentation
        ? disabled || model.valueMuted
          ? STALL_MUTED_INK
          : STALL_TEXT_INK
        : resolveThemeColor(
            disabled
              ? 'disabled'
              : model.valueResourceKey ?? 'text',
          ),
    );
    this.semanticId =
      model.semanticId ??
      (model.slotNumber
        ? `${this.semanticPrefix}.${model.slotNumber}`
        : null);
    if (this.semanticRegistry && this.semanticId) {
      this.semanticDisplayObject = this.usesValueButton
        ? this.valueButton
        : this.root;
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId: model.tutorialId ?? null,
        displayObject: this.semanticDisplayObject,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) =>
          this.enabled ? this.action?.(payload) : false,
      });
    }
    this.redraw();
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.frame.setSize(
      width,
      height,
      PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
    );
    const textY = Math.max(1, (height - 16) / 2);
    const indexWidth = this.indexLabel.text ? 20 : 0;
    const contentInsetX = this.paperPresentation
      ? OFFER_CARD_PADDING_X
      : 0;
    this.indexLabel.position.set(
      contentInsetX + indexWidth,
      textY,
    );
    const itemX =
      contentInsetX + indexWidth + (indexWidth ? 6 : 0);
    const rightX = width - contentInsetX;
    this.itemLabel.position.set(itemX, textY);
    this.itemResource.position.set(
      itemX,
      Math.max(0, (height - this.itemResource.fontSize) / 2),
    );
    this.valueLabel.position.set(rightX, textY);
    this.valueResource.position.set(
      rightX - this.valueResource.measuredWidth,
      Math.max(0, (height - this.valueResource.fontSize) / 2),
    );
    this.valueButton.position.set(
      rightX - OFFER_ACTION_WIDTH,
      (height - OFFER_ACTION_HEIGHT) / 2,
    );
    const valueWidth = this.valueButton.visible
      ? OFFER_ACTION_WIDTH
      : this.valueResource.visible
        ? this.valueResource.measuredWidth
        : this.valueLabel.measuredWidth;
    this.itemLabel.setWrapWidth(
      Math.max(
        0,
        width -
          contentInsetX * 2 -
          indexWidth -
          valueWidth -
          PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
    this.notificationBadge.placeAtTopRight({
      x: 0,
      y: 0,
      width,
      height,
    });
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.indexLabel.applyTheme(this.theme);
    this.itemLabel.applyTheme(this.theme);
    this.itemResource.applyTheme(this.theme);
    this.valueLabel.applyTheme(this.theme);
    this.valueResource.applyTheme(this.theme);
    this.valueButton.applyTheme(this.theme);
    if (this.paperPresentation) {
      this.frame.setTexture(
        resolveTexture(this.assetManager, {
          textureId: PIXI_ROOT_RUN_ASSETS.researchCard,
        }) ?? Texture.EMPTY,
        PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
      );
      const disabled = !this.enabled;
      this.indexLabel.setColor(
        disabled ? STALL_MUTED_INK : STALL_TEXT_INK,
      );
      this.itemLabel.setColor(
        disabled ? STALL_MUTED_INK : STALL_TEXT_INK,
      );
      this.valueLabel.setColor(
        disabled || this.model?.valueMuted
          ? STALL_MUTED_INK
          : STALL_TEXT_INK,
      );
      this.itemResource.amountLabel.setColor(
        disabled
          ? STALL_MUTED_INK
          : resolvePaperResourceColor(this.itemResource.resource),
      );
      this.valueResource.amountLabel.setColor(
        disabled
          ? STALL_MUTED_INK
          : resolvePaperResourceColor(this.valueResource.resource),
      );
    }
    this.redraw();
  }

  redraw() {
    this.background.clear();
    if (this.model?.selected || this.pressed) {
      this.background
        .rect(0, 0, this.width ?? 0, this.height ?? 0)
        .fill({ color: this.theme.stroke, alpha: 0.22 });
    }
    this.notificationBadge
      .setTone(this.model?.notificationTone)
      .setActive(
        !this.usesValueButton &&
          Boolean(this.model?.notification),
      );
  }

  reset() {
    this.unregisterSemantic();
    this.model = null;
    this.action = null;
    this.enabled = false;
    this.usesValueButton = false;
    this.valueButton.reset();
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.semanticDisplayObject ?? this.root,
      });
    }
    this.semanticDefinition = null;
    this.semanticId = null;
    this.semanticDisplayObject = null;
  }

  destroy() {
    this.unregisterSemantic();
    this.registration?.();
    this.registration = null;
    this.root.destroy({ children: true });
  }
}

class ShopInlineButton {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    semanticId = null,
    text = '',
    action = null,
    label,
    paperPresentation = false,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.paperPresentation = paperPresentation;
    this.backing = new Graphics();
    this.text = new PixiTextLabel({
      text,
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${label}:text`,
    });
    this.notificationBadge = new PixiNotificationBadge({
      assetManager,
    });
    this.notificationBadge.root.label = `${label}:notification`;
    this.root.addChild(
      this.backing,
      this.text,
      this.notificationBadge.root,
    );
    this.action = null;
    this.enabled = false;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.model = null;
    this.width = 0;
    this.height = 0;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.enabled &&
          Boolean(this.action) &&
          this.root.visible &&
          this.root.renderable,
        onActivate: (payload) => this.activate(payload),
        haptic: 'light',
      }) ?? null;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root.eventMode = 'none';
    if (semanticId || text || action) {
      this.bind(
        semanticId ?? label,
        {
          semanticId,
          label: text,
          enabled: true,
        },
        action,
      );
    }
  }

  bind(key, model = {}, fallbackAction = null) {
    this.unregisterSemantic();
    this.model = model;
    this.action = model.action ?? fallbackAction;
    this.enabled =
      model.enabled !== false && model.disabled !== true;
    this.root.visible = model.hidden !== true;
    this.root.renderable = this.root.visible;
    this.root.eventMode =
      this.enabled && this.action ? 'static' : 'none';
    this.text.setText(formatTitleCase(model.label ?? model.text ?? ''));
    this.semanticId = model.semanticId ?? null;
    if (this.semanticRegistry && this.semanticId) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) => this.activate(payload),
      });
    }
    this.notificationBadge
      .setTone(model.notificationTone)
      .setActive(Boolean(model.notification));
    this.applyTheme(this.theme);
    if (this.width > 0 && this.height > 0) {
      this.setBounds(
        this.root.x,
        this.root.y,
        this.width,
        this.height,
      );
    }
  }

  activate(payload) {
    if (!this.enabled || !this.action) {
      return false;
    }
    return this.action(payload) ?? true;
  }

  getPreferredWidth() {
    return Math.max(
      BORDER_ACTION_MIN_WIDTH,
      Math.ceil(
        this.text.measuredWidth + BORDER_ACTION_PADDING_X * 2,
      ),
    );
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.backing
      .clear()
      .rect(0, 0, width, height)
      .fill(
        this.paperPresentation
          ? PIXI_DIALOG_PALETTE.paper
          : this.theme.surface,
      );
    this.text.position.set(
      Math.max(0, (width - this.text.measuredWidth) / 2),
      0,
    );
    this.notificationBadge.placeAtTopRight({
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.text.applyTheme(this.theme);
    this.text.setColor(
      this.paperPresentation
        ? this.enabled
          ? PIXI_DIALOG_PALETTE.ink
          : PIXI_DIALOG_PALETTE.disabled
        : this.enabled
          ? 'text'
          : 'disabled',
    );
    if (this.width > 0 && this.height > 0) {
      this.setBounds(
        this.root.x,
        this.root.y,
        this.width,
        this.height,
      );
    }
  }

  reset() {
    this.unregisterSemantic();
    this.model = null;
    this.action = null;
    this.enabled = false;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
    this.notificationBadge.setActive(false);
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
    }
    this.semanticDefinition = null;
    this.semanticId = null;
  }

  destroy() {
    this.unregisterSemantic();
    this.registration?.();
    this.registration = null;
    this.root.destroy({ children: true });
  }
}

function normalizeShopViewModel(viewModel = {}) {
  const source = viewModel.shop ?? viewModel;
  const rawShelf = source.shelf ?? {};
  const rawPlayerShelf = source.playerShelf ?? {};
  const traders = source.traders ?? source.npc ?? {};
  const players = source.players ?? {};
  const crystals = source.crystals ?? {};
  const rawCoinOffer = source.coinOffer;
  return {
    ...source,
    selectedTabId:
      source.selectedTabId ??
      source.activeTabId ??
      'traders',
    market: source.market ?? {
      name: 'Small Town Market',
      rank: 1,
    },
    actions: viewModel.actions ?? source.actions ?? {},
    dialogs: viewModel.dialogs ?? source.dialogs ?? {},
    notifications:
      viewModel.notifications ??
      source.notifications ??
      viewModel.notificationSnapshot ??
      source.notificationSnapshot ??
      null,
    tabNotifications:
      viewModel.tabNotifications ??
      source.tabNotifications ??
      null,
    subscribe: viewModel.subscribe ?? source.subscribe,
    traders: {
      ...traders,
      stalls: safeArray(
        traders.stalls ??
          rawShelf.stalls ??
          rawShelf.slots,
      ).map(normalizeStall),
      ledger: traders.ledger ?? source.ledger ?? {},
      timerLabel: traders.timerLabel ?? rawShelf.timerLabel ?? '',
    },
    players: {
      ...players,
      requests: {
        ...(players.requests ?? source.playerRequests ?? {}),
        slots: safeArray(
          players.requests?.slots ??
            source.playerRequests?.slots ??
            source.requests?.slots,
        ).map(normalizeCompactSlot),
      },
      market: {
        ...(players.market ?? rawPlayerShelf),
        slots: safeArray(
          players.market?.slots ??
            rawPlayerShelf.slots,
        ).map(normalizeCompactSlot),
      },
    },
    crystals: {
      ...crystals,
      coinOffer:
        crystals.coinOffer ??
        (rawCoinOffer
          ? {
              ...rawCoinOffer,
              rewardLabel:
                rawCoinOffer.rewardLabel ??
                `${rawCoinOffer.rewardCoin ?? 0} coin`,
              actionLabel: rawCoinOffer.canCollect
                ? 'collect'
                : rawCoinOffer.timerLabel ?? '',
            }
          : null),
      offers: safeArray(crystals.offers ?? source.crystalOffers),
    },
  };
}

function normalizeStall(stall = {}, index) {
  return {
    ...stall,
    id: stall.id ?? stall.slotNumber ?? index,
    slotNumber: stall.slotNumber ?? index + 1,
    itemLabel:
      stall.itemLabel ??
      stall.display?.label ??
      stall.label ??
      (stall.itemTypeId ? 'item' : 'empty'),
    itemKey:
      stall.itemKey ??
      stall.sellKey ??
      stall.futureItemKey ??
      null,
    itemKind:
      stall.itemKind ??
      stall.sellKind ??
      stall.futureItemKind ??
      stall.resourceKey ??
      null,
    quantityLabel:
      stall.quantityLabel ??
      (stall.quantity != null ? ` ${stall.quantity}` : ''),
    batchLabel:
      stall.batchLabel ??
      (stall.batchSize ? `x${stall.batchSize}` : ''),
    priceLabel:
      stall.priceLabel ??
      stall.priceText ??
      '',
  };
}

function stripResourceName(value, resource) {
  const text = String(value ?? '').trim();
  const resourceName = String(resource ?? '').trim().toLowerCase();
  const suffixes = [
    ` ${resourceName}`,
    ` ${resourceName === 'ruby' ? 'rubies' : `${resourceName}s`}`,
  ];
  const normalizedText = text.toLowerCase();
  const suffix = suffixes.find((candidate) =>
    normalizedText.endsWith(candidate),
  );
  return suffix ? text.slice(0, -suffix.length).trim() : text;
}

function extractClaimValue(value) {
  const text = String(value ?? '').trim();
  const parenthesized = text.match(/\(([^)]+)\)/);
  if (parenthesized?.[1]) {
    return parenthesized[1].trim();
  }
  return text.replace(/^claim\s*/i, '').trim();
}

function normalizeCompactSlot(slot = {}, index) {
  return {
    ...slot,
    id: slot.id ?? slot.slotNumber ?? index,
    slotNumber: slot.slotNumber ?? index + 1,
    itemLabel:
      slot.itemLabel ??
      slot.label ??
      (slot.locked ? 'empty stand' : 'empty'),
    value:
      slot.value ??
      slot.priceLabel ??
      slot.actionLabel ??
      (slot.locked ? 'locked' : 'select'),
  };
}

function normalizeSectionStallRow(
  row = {},
  key,
  {
    titlePrefix = 'Stall',
    semanticPrefix = 'shop.stall',
    tutorialPrefix = 'shop:stand',
  } = {},
) {
  const slotNumber = row.slotNumber ?? key;
  const quantityLabel =
    row.quantityLabel ??
    (row.quantity != null ? String(row.quantity) : '');
  const quantitySuffix = quantityLabel
    ? ` (${quantityLabel})`
    : '';
  const rawItemLabel =
    row.itemLabel ??
    row.label ??
    (row.locked ? 'locked' : 'empty');
  const itemLabel =
    quantitySuffix && rawItemLabel.endsWith(quantitySuffix)
      ? rawItemLabel.slice(0, -quantitySuffix.length)
      : rawItemLabel;
  const priceLabel =
    row.priceLabel ??
    row.value ??
    row.actionLabel ??
    '';
  const priceResourceKey =
    row.priceResourceKey ??
    row.valueResourceKey ??
    null;
  const isAvailableSelectAction =
    !priceResourceKey &&
    row.enabled !== false &&
    row.locked !== true &&
    String(priceLabel).trim().toLowerCase() === 'select';
  return {
    ...row,
    title: row.title ?? `${titlePrefix} ${slotNumber}`,
    itemLabel,
    quantityLabel,
    priceLabel,
    priceResourceKey,
    priceVariant:
      row.priceVariant ??
      (isAvailableSelectAction ? 'green' : null),
    semanticId:
      row.semanticId ??
      `${semanticPrefix}.${slotNumber}`,
    tutorialId:
      row.tutorialId ??
      `${tutorialPrefix}:${slotNumber}`,
  };
}

function normalizeTabId(tabId) {
  const value = String(tabId ?? '');
  if (value === 'npm' || value === 'trader') {
    return 'traders';
  }
  if (value === 'player') {
    return 'players';
  }
  return SHOP_TABS.some((tab) => tab.id === value)
    ? value
    : 'traders';
}

function getShopTabNotification(model, tabId) {
  const explicit =
    model.tabNotifications?.[tabId] ??
    model.tabNotifications?.[
      SHOP_TABS.find((tab) => tab.id === tabId)?.legacyId
    ];
  if (explicit !== undefined) {
    return normalizeNotificationState(explicit);
  }

  const snapshot = model.notifications;
  const shopPage =
    snapshot?.pages?.shop ??
    snapshot?.shop ??
    snapshot;
  const tabValue =
    shopPage?.tabs?.[tabId] ??
    shopPage?.[tabId];
  if (tabValue !== undefined) {
    return normalizeNotificationState(tabValue);
  }

  const children = shopPage?.children ?? {};
  if (tabId === 'traders') {
    return aggregateNotificationStates([
      children.npcStand,
      children.npcListing,
    ]);
  }
  if (tabId === 'players') {
    return aggregateNotificationStates([
      children.playerStand,
      children.playerListing,
      children.playerProceeds,
      children.playerMarket,
    ]);
  }
  return aggregateNotificationStates([
    children.crystals,
    model.crystals?.coinOffer?.notification,
    model.crystals?.coinOffer?.canCollect,
  ]);
}

function aggregateNotificationStates(values) {
  const states = values.map(normalizeNotificationState);
  const activeStates = states.filter((state) => state.active);
  return {
    active: activeStates.length > 0,
    tone: activeStates.some((state) => state.tone === 'red')
      ? 'red'
      : 'orange',
  };
}

function normalizeNotificationState(notification) {
  const active =
    notification === true ||
    notification === 'red' ||
    notification === 'orange' ||
    notification?.active === true;
  return {
    active,
    tone:
      notification === 'orange' ||
      notification?.tone === 'orange'
        ? 'orange'
        : 'red',
  };
}

function resolveTexture(assetManager, model = {}) {
  if (!assetManager?.loaded) {
    return null;
  }
  if (model.iconFrame) {
    return assetManager.getAtlasTexture(model.iconFrame);
  }
  if (model.textureId) {
    return assetManager.getTexture(model.textureId);
  }
  return null;
}

function bindStallItemIcon({
  assetManager,
  base,
  overlay,
  model = {},
}) {
  base.texture = Texture.EMPTY;
  base.visible = false;
  base.renderable = false;
  overlay.texture = Texture.EMPTY;
  overlay.visible = false;
  overlay.renderable = false;
  overlay.rotation = 0;

  const itemKind = String(
    model.itemKind ?? model.resourceKey ?? '',
  ).toLowerCase();
  const itemKey =
    model.itemKey ??
    model.sellKey ??
    model.futureItemKey ??
    null;

  if (itemKind === 'seed' && itemKey) {
    const baseFrameName = getSeedPackBaseFrameName(model);
    const itemFrameName = getSeedPackItemFrameName({
      key: itemKey,
      label: model.itemLabel ?? model.label,
    });
    base.texture =
      assetManager?.getAtlasTexture?.(baseFrameName) ??
      Texture.EMPTY;
    overlay.texture =
      assetManager?.getAtlasTexture?.(itemFrameName) ??
      Texture.EMPTY;
    base.visible = Boolean(baseFrameName);
    base.renderable = base.visible;
    overlay.visible = base.visible && Boolean(itemFrameName);
    overlay.renderable = overlay.visible;
    return;
  }

  const frameName =
    itemKind === 'herb'
      ? getHerbIconFrameName(itemKey)
      : itemKind === 'potion'
        ? getPotionIconFrameName(itemKey)
        : null;
  const fallbackTexture = resolveTexture(assetManager, model);
  if (frameName) {
    base.texture =
      assetManager?.getAtlasTexture?.(frameName) ??
      Texture.EMPTY;
    base.visible = true;
    base.renderable = true;
    return;
  }
  if (fallbackTexture) {
    base.texture = fallbackTexture;
    base.visible = true;
    base.renderable = true;
  }
}

function orderChildren(container, widgets) {
  container.removeChildren();
  for (const widget of widgets) {
    container.addChild(widget.root ?? widget);
  }
}

function layoutBorderActions(buttons, width, y) {
  if (buttons.length === 0) {
    return;
  }
  const height = PIXI_UI_GEOMETRY.borderLabelLineHeight;
  if (buttons.length === 1) {
    const button = buttons[0];
    const buttonWidth = Math.min(
      width - BORDER_ACTION_EDGE_INSET * 2,
      button.getPreferredWidth(),
    );
    button.setBounds(
      (width - buttonWidth) / 2,
      y,
      buttonWidth,
      height,
    );
    return;
  }
  if (buttons.length === 2) {
    const leftWidth = Math.min(
      (width - BORDER_ACTION_EDGE_INSET * 2 - BORDER_ACTION_GAP) /
        2,
      buttons[0].getPreferredWidth(),
    );
    const rightWidth = Math.min(
      (width - BORDER_ACTION_EDGE_INSET * 2 - BORDER_ACTION_GAP) /
        2,
      buttons[1].getPreferredWidth(),
    );
    buttons[0].setBounds(
      BORDER_ACTION_EDGE_INSET,
      y,
      leftWidth,
      height,
    );
    buttons[1].setBounds(
      width - BORDER_ACTION_EDGE_INSET - rightWidth,
      y,
      rightWidth,
      height,
    );
    return;
  }
  const availableWidth =
    width -
    BORDER_ACTION_EDGE_INSET * 2 -
    BORDER_ACTION_GAP * (buttons.length - 1);
  const buttonWidth = Math.max(0, availableWidth / buttons.length);
  let cursorX = BORDER_ACTION_EDGE_INSET;
  for (const button of buttons) {
    button.setBounds(cursorX, y, buttonWidth, height);
    cursorX += buttonWidth + BORDER_ACTION_GAP;
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function resolveThemeColor(token) {
  return (theme) =>
    theme?.[token] ??
    theme?.resourceColors?.[token] ??
    token ??
    theme?.text;
}

function resolvePaperResourceColor(resource) {
  return PIXI_DIALOG_PALETTE[resource] ?? PIXI_DIALOG_PALETTE.ink;
}

function countCapacityStars(value) {
  const match = String(value ?? '').match(/★/g);
  if (match) {
    return match.length;
  }
  return Math.max(0, Math.floor(Number(value) || 0));
}

function stallReleaseScale(progress) {
  if (progress <= 0.36) {
    return (
      STALL_PRESS_SCALE +
      (STALL_RELEASE_PEAK_SCALE - STALL_PRESS_SCALE) *
        easeOutCubic(progress / 0.36)
    );
  }
  return (
    STALL_RELEASE_PEAK_SCALE +
    (1 - STALL_RELEASE_PEAK_SCALE) *
      easeOutCubic((progress - 0.36) / 0.64)
  );
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches,
  );
}

function requestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout?.(callback, 16) ?? 0;
}

function cancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
  } else {
    globalThis.clearTimeout?.(frameId);
  }
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function formatTitleCase(value) {
  return String(value ?? '').replace(
    /\b([a-z])/g,
    (character) => character.toUpperCase(),
  );
}

function normalizeProgress(value) {
  const numeric = Number(value) || 0;
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

function clampInteger(value, min, max) {
  const numeric = Math.floor(Number(value) || min);
  return Math.max(min, Math.min(max, numeric));
}
