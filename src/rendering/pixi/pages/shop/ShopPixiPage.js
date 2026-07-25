import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { PixiButton } from '../../primitives/PixiButton.js';
import { PixiFrame } from '../../primitives/PixiFrame.js';
import { PixiPanel } from '../../primitives/PixiPanel.js';
import { PixiProgressBar } from '../../primitives/PixiProgressBar.js';
import { PixiScrollView } from '../../primitives/PixiScrollView.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { createPixiPageBackgroundGradient } from '../../theme/PixiPageBackground.js';
import { SHOP_DIALOG_IDS, ShopDialogPixi } from './ShopDialogPixi.js';

const SHOP_TABS = Object.freeze([
  Object.freeze({ id: 'traders', legacyId: 'npm', label: 'traders' }),
  Object.freeze({ id: 'players', legacyId: 'player', label: 'players' }),
  Object.freeze({ id: 'crystals', legacyId: 'crystals', label: 'crystals' }),
]);

const PAGE_SCROLL_CUT = 6;
const SECTION_GAP = 24;
const TAB_GAP = 3;
const CARD_GAP = 10;
const STALL_CARD_HEIGHT = 84;
const COMPACT_ROW_HEIGHT = 27;

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
    this.marketNameLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      anchor: { x: 0.5, y: 0 },
      label: 'shop:marketName',
    });
    this.marketRankLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 0, y: 0 },
      label: 'shop:marketRank',
    });
    this.identityLayer.addChild(this.marketNameLabel, this.marketRankLabel);

    this.tabLayer = new Container();
    this.tabLayer.label = 'shop:tabs';
    this.tabButtons = new Map();
    this.tabNotifications = new Map();
    for (const tab of SHOP_TABS) {
      const button = new PixiButton({
        assetManager,
        inputRouter,
        semanticRegistry,
        semanticId: `shop.tab.${tab.id}`,
        text: tab.label,
        label: `shop:tab:${tab.id}`,
        action: () => this.selectTab(tab.id),
      });
      const notification = new Graphics();
      notification.label = `shop:tab:${tab.id}:notification`;
      notification.visible = false;
      notification.renderable = false;
      button.addChild(notification);
      this.tabButtons.set(tab.id, button);
      this.tabNotifications.set(tab.id, notification);
      this.tabLayer.addChild(button);
    }

    this.panelScrolls = new Map();
    for (const tab of SHOP_TABS) {
      const scroll = new PixiScrollView({
        assetManager,
        inputRouter,
        width: 1,
        height: 1,
        showProgress: true,
        progressTone: 'yellow',
        label: `shop:${tab.id}:scroll`,
      });
      this.panelScrolls.set(tab.id, scroll);
      this.uiLayer.addChild(scroll);
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
      title: 'requests',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: COMPACT_ROW_HEIGHT,
      label: 'shop:requests',
    });
    this.playerMarketSection = new ShopRowsSection({
      page: this,
      title: 'player market',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: COMPACT_ROW_HEIGHT,
      label: 'shop:playerMarket',
    });
    this.coinOfferSection = new ShopRowsSection({
      page: this,
      title: 'coin offer',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: PIXI_UI_GEOMETRY.rowMinHeight,
      label: 'shop:coinOffer',
    });
    this.crystalOffersSection = new ShopRowsSection({
      page: this,
      title: 'crystals',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: PIXI_UI_GEOMETRY.rowMinHeight,
      label: 'shop:crystalOffers',
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
    this.marketNameLabel.setText(
      `${String(this.model.market.name ?? 'Small Town Market').toLowerCase()} `,
    );
    this.marketRankLabel.setText('★'.repeat(rank));
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
      this.model.players.market.slots,
      this.createPlayerMarketSectionOptions(),
    );
    this.coinOfferSection.bind(
      this.model.crystals.coinOffer
        ? [
            {
              id: 'coinOffer',
              label: this.model.crystals.coinOffer.rewardLabel ?? '',
              value:
                this.model.crystals.coinOffer.actionLabel ??
                (this.model.crystals.coinOffer.canCollect
                  ? 'collect'
                  : this.model.crystals.coinOffer.timerLabel ?? ''),
              valueResourceKey: null,
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
        label: offer.bundleLabel ?? offer.label ?? '',
        value: offer.priceLabel ?? offer.value ?? '',
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

  createRequestSectionOptions() {
    const requests = this.model.players.requests;
    return {
      countLabel: requests.countLabel ?? '',
      actions: [
        {
          id: 'clear',
          label: 'clear',
          enabled: requests.canClear !== false,
          action:
            requests.clearAction ??
            this.currentActions.clearPlayerRequest,
        },
      ],
      onRow: (slot) =>
        slot.action?.(slot) ??
        this.openDialog(
          SHOP_DIALOG_IDS.REQUEST,
          slot.dialog ?? this.model.dialogs.request ?? slot,
        ),
    };
  }

  createPlayerMarketSectionOptions() {
    const market = this.model.players.market;
    const footerActions = [
      {
        id: 'browse',
        label: 'browse market',
        notification: market.browseNotification === true,
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
        action:
          market.historyAction ??
          (() =>
            this.openDialog(
              SHOP_DIALOG_IDS.TRADE_HISTORY,
              this.model.dialogs.tradeHistory ?? market.historyDialog ?? {},
            )),
      },
    ];
    if (market.proceedsLabel) {
      footerActions.splice(1, 0, {
        id: 'claim',
        label: market.proceedsLabel,
        enabled: market.canClaimProceeds !== false,
        notification: market.proceedsNotification === true,
        action:
          market.claimAction ??
          this.currentActions.claimPlayerMarketProceeds,
      });
    }
    return {
      countLabel: market.countLabel ?? '',
      actions: footerActions,
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
      scroll.visible = selected;
      scroll.renderable = selected;
      scroll.eventMode = selected ? 'passive' : 'none';
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
    this.marketNameLabel?.applyTheme(this.theme);
    this.marketRankLabel?.applyTheme(this.theme);
    for (const button of this.tabButtons?.values?.() ?? []) {
      button.applyTheme(this.theme);
    }
    this.updateTabNotifications();
    for (const scroll of this.panelScrolls?.values?.() ?? []) {
      scroll.applyTheme(this.theme);
    }
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
    const identityY = PIXI_UI_GEOMETRY.roomContentTop;
    const panelTop =
      identityY + PIXI_UI_GEOMETRY.rowMinHeight + 4;
    const tabY =
      this.sourceHeight -
      (PIXI_UI_GEOMETRY.roomChatBottom +
        PIXI_UI_GEOMETRY.roomChatHeight +
        PIXI_UI_GEOMETRY.roomChatTitleOverhang +
        PIXI_UI_GEOMETRY.roomChatGap) -
      6 -
      PIXI_UI_GEOMETRY.tabHeight;
    const panelBottom = tabY - PAGE_SCROLL_CUT;
    const panelHeight = Math.max(0, panelBottom - panelTop);

    this.identityLayer.position.set(this.sourceWidth / 2, identityY);
    this.marketNameLabel.position.set(
      -this.marketRankLabel.measuredWidth / 2,
      2,
    );
    this.marketRankLabel.position.set(
      this.marketNameLabel.measuredWidth / 2 -
        this.marketRankLabel.measuredWidth / 2,
      2,
    );
    for (const scroll of this.panelScrolls.values()) {
      scroll.position.set(edge, panelTop);
      scroll.setViewportSize(contentWidth, panelHeight);
    }
    this.tabLayer.position.set(edge, tabY);
    const tabWidth =
      (contentWidth - TAB_GAP * (SHOP_TABS.length - 1)) /
      SHOP_TABS.length;
    let x = 0;
    for (const tab of SHOP_TABS) {
      const button = this.tabButtons.get(tab.id);
      button.position.set(x, 0);
      button.setSize(tabWidth, PIXI_UI_GEOMETRY.tabHeight);
      this.tabNotifications
        .get(tab.id)
        ?.position.set(tabWidth, 0);
      x += tabWidth + TAB_GAP;
    }
    this.relayoutSections();
    this.redrawBackground();
  }

  relayoutSections() {
    if (!this.stallsSection) {
      return;
    }
    const width =
      this.sourceWidth - PIXI_UI_GEOMETRY.roomContentEdge * 2;
    this.stallsSection.setBounds(
      0,
      PAGE_SCROLL_CUT,
      width,
      this.stallsSection.getPreferredHeight(width),
    );
    this.panelScrolls
      .get('traders')
      .setContentHeight(
        PAGE_SCROLL_CUT * 2 + this.stallsSection.getPreferredHeight(width),
      );

    let playerY = PAGE_SCROLL_CUT;
    const requestHeight = this.requestsSection.getPreferredHeight(width);
    this.requestsSection.setBounds(0, playerY, width, requestHeight);
    playerY += requestHeight + SECTION_GAP;
    const marketHeight = this.playerMarketSection.getPreferredHeight(width);
    this.playerMarketSection.setBounds(0, playerY, width, marketHeight);
    playerY += marketHeight + PAGE_SCROLL_CUT;
    this.panelScrolls.get('players').setContentHeight(playerY);

    let crystalY = PAGE_SCROLL_CUT;
    const coinHeight = this.coinOfferSection.getPreferredHeight(width);
    this.coinOfferSection.setBounds(0, crystalY, width, coinHeight);
    crystalY += coinHeight + SECTION_GAP;
    const offersHeight = this.crystalOffersSection.getPreferredHeight(width);
    this.crystalOffersSection.setBounds(0, crystalY, width, offersHeight);
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
    this.background
      .clear()
      .rect(0, 0, this.sourceWidth, this.sourceHeight);
    try {
      this.background.fill(
        this.backgroundGradient ?? this.theme.surface,
      );
    } catch {
      this.background
        .clear()
        .rect(0, 0, this.sourceWidth, this.sourceHeight)
        .fill(this.theme.surface);
    }
  }

  updateTabNotifications() {
    if (!this.tabNotifications) {
      return;
    }
    for (const tab of SHOP_TABS) {
      const notification = this.tabNotifications.get(tab.id);
      const state = getShopTabNotification(this.model, tab.id);
      notification.clear();
      notification.visible = state.active;
      notification.renderable = state.active;
      if (state.active) {
        notification
          .circle(0, 0, PIXI_UI_GEOMETRY.notificationSize / 2)
          .fill(
            state.tone === 'orange'
              ? this.theme.notificationOrange
              : this.theme.notificationRed,
          )
          .stroke({ color: this.theme.surface, width: 1 });
      }
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
      scroll.parent?.removeChild?.(scroll);
      scroll.destroy({ children: true });
    }
  }
}

class ShopStallsSection {
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
    this.panel = new PixiPanel({
      assetManager,
      title: 'your stalls',
      label: 'shop:stalls:panel',
    });
    this.root = this.panel;
    this.rowsLayer = new Container();
    this.rowsLayer.label = 'shop:stalls:rows';
    this.panel.content.addChild(this.rowsLayer);
    this.helpButton = new ShopInlineButton({
      inputRouter,
      semanticRegistry,
      semanticId: 'shop.stalls.help',
      text: '[i]',
      label: 'shop:stalls:help',
      action: () => this.toggleHelp(),
    });
    this.helpTooltip = new ShopTooltip({
      assetManager,
      text:
        'tap a stall to choose an item and mark a share. future marking loads newly produced copies.',
      label: 'shop:stalls:helpTooltip',
    });
    this.ledgerButton = new ShopInlineButton({
      inputRouter,
      semanticRegistry,
      semanticId: 'shop.ledger.open',
      text: 'market ledger',
      label: 'shop:ledger:open',
      action: () => this.openLedger?.(),
    });
    this.ledgerHelpButton = new ShopInlineButton({
      inputRouter,
      semanticRegistry,
      semanticId: 'shop.ledger.help',
      text: '[i]',
      label: 'shop:ledger:help',
      action: () => this.toggleLedgerHelp(),
    });
    this.ledgerTooltip = new ShopTooltip({
      assetManager,
      text: 'compare trader prices, stock, buyers, and recent changes.',
      label: 'shop:ledger:helpTooltip',
    });
    this.timerLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: 'shop:stalls:timer',
    });
    this.root.addChild(
      this.helpButton.root,
      this.helpTooltip.root,
      this.ledgerButton.root,
      this.ledgerHelpButton.root,
      this.ledgerTooltip.root,
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
    this.helpVisible = false;
    this.ledgerHelpVisible = false;
    this.width = 0;
  }

  bind(model = {}, { openStall, openLedger } = {}) {
    this.model = model;
    this.openStall = openStall;
    this.openLedger = openLedger;
    this.stalls.reconcile(safeArray(model.stalls));
    this.timerLabel.setText(model.timerLabel ?? '');
    this.timerLabel.visible = Boolean(model.timerLabel);
    this.helpTooltip.root.visible = this.helpVisible;
    this.helpTooltip.root.renderable = this.helpVisible;
    this.ledgerTooltip.root.visible = this.ledgerHelpVisible;
    this.ledgerTooltip.root.renderable = this.ledgerHelpVisible;
    for (const stall of this.stalls.getWidgets()) {
      stall.applyTheme(this.theme);
    }
  }

  toggleHelp() {
    this.helpVisible = !this.helpVisible;
    this.ledgerHelpVisible = false;
    this.helpTooltip.root.visible = this.helpVisible;
    this.helpTooltip.root.renderable = this.helpVisible;
    this.ledgerTooltip.root.visible = false;
    this.ledgerTooltip.root.renderable = false;
  }

  toggleLedgerHelp() {
    this.ledgerHelpVisible = !this.ledgerHelpVisible;
    this.helpVisible = false;
    this.ledgerTooltip.root.visible = this.ledgerHelpVisible;
    this.ledgerTooltip.root.renderable = this.ledgerHelpVisible;
    this.helpTooltip.root.visible = false;
    this.helpTooltip.root.renderable = false;
  }

  getPreferredHeight() {
    const count = this.stalls.getWidgets().length;
    const rowsHeight =
      count > 0
        ? count * STALL_CARD_HEIGHT + (count - 1) * CARD_GAP
        : PIXI_UI_GEOMETRY.rowMinHeight;
    return 20 + rowsHeight + 24;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.panel.setOuterSize(width, height);
    this.rowsLayer.position.set(0, 20);
    let rowY = 0;
    for (const stall of this.stalls.getWidgets()) {
      stall.setBounds(0, rowY, this.panel.contentWidth, STALL_CARD_HEIGHT);
      rowY += STALL_CARD_HEIGHT + CARD_GAP;
    }
    this.helpButton.setBounds(
      width - 35,
      -7,
      17,
      PIXI_UI_GEOMETRY.borderLabelLineHeight,
    );
    this.helpTooltip.setBounds(
      width - 170,
      10,
      158,
    );
    const ledgerWidth = 86;
    this.ledgerButton.setBounds(
      width - ledgerWidth - 31,
      height - 7,
      ledgerWidth,
      PIXI_UI_GEOMETRY.borderLabelLineHeight,
    );
    this.ledgerHelpButton.setBounds(
      width - 29,
      height - 7,
      17,
      PIXI_UI_GEOMETRY.borderLabelLineHeight,
    );
    this.ledgerTooltip.setBounds(
      width - 170,
      height - 70,
      158,
    );
    this.timerLabel.position.set(
      Math.max(8, (width - this.timerLabel.measuredWidth) / 2),
      height - 7,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    this.helpButton.applyTheme(this.theme);
    this.helpTooltip.applyTheme(this.theme);
    this.ledgerButton.applyTheme(this.theme);
    this.ledgerHelpButton.applyTheme(this.theme);
    this.ledgerTooltip.applyTheme(this.theme);
    this.timerLabel.applyTheme(this.theme);
    for (const stall of this.stalls.getWidgets()) {
      stall.applyTheme(this.theme);
    }
  }

  destroy() {
    this.stalls.destroy();
    this.stallPool.destroy();
    this.helpButton.destroy();
    this.ledgerButton.destroy();
    this.ledgerHelpButton.destroy();
    this.root.destroy({ children: true });
  }
}

class ShopRowsSection {
  constructor({
    page,
    title,
    assetManager,
    inputRouter,
    semanticRegistry,
    counters,
    rowHeight,
    label,
  }) {
    this.page = page;
    this.title = title;
    this.rowHeight = rowHeight;
    this.theme = page.theme;
    this.panel = new PixiPanel({
      assetManager,
      title,
      label: `${label}:panel`,
    });
    this.root = this.panel;
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${label}:rows`;
    this.actionsLayer = new Container();
    this.actionsLayer.label = `${label}:actions`;
    this.countLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:count`,
    });
    this.panel.content.addChild(this.rowsLayer, this.actionsLayer);
    this.root.addChild(this.countLabel);
    this.rowPool = new WidgetPool({
      name: `${label} row pool`,
      counters,
      create: () =>
        new ShopCompactRow({
          inputRouter,
          semanticRegistry,
          label: `${label}:row`,
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
      bind: (widget, row, key) =>
        widget.bind(key, row, () => this.onRow?.(row)),
      afterReconcile: (widgets) => orderChildren(this.rowsLayer, widgets),
    });
    this.actionPool = new WidgetPool({
      name: `${label} footer action pool`,
      counters,
      create: () =>
        new PixiButton({
          assetManager,
          inputRouter,
          label: `${label}:footerAction`,
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
    this.actions.reconcile(safeArray(options.actions));
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  getPreferredHeight() {
    const rowCount = Math.max(1, this.rows.getWidgets().length);
    const actionCount = this.actions.getWidgets().length;
    const rowsHeight = rowCount * this.rowHeight;
    const actionsHeight = actionCount > 0 ? 28 + 7 : 0;
    return rowsHeight + actionsHeight + 14;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.panel.setOuterSize(width, height);
    let rowY = 0;
    for (const row of this.rows.getWidgets()) {
      row.setBounds(0, rowY, this.panel.contentWidth, this.rowHeight);
      rowY += this.rowHeight;
    }
    const buttons = this.actions.getWidgets();
    if (buttons.length > 0) {
      this.actionsLayer.position.set(0, rowY + 7);
      layoutButtons(
        buttons,
        0,
        0,
        this.panel.contentWidth,
        28,
        6,
      );
    }
    this.countLabel.position.set(
      width - this.countLabel.measuredWidth - 10,
      -7,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(this.theme);
    this.countLabel.applyTheme(this.theme);
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
    for (const button of this.actions.getWidgets()) {
      button.applyTheme(this.theme);
    }
  }

  destroy() {
    this.rows.destroy();
    this.rowPool.destroy();
    this.actions.destroy();
    this.actionPool.destroy();
    this.root.destroy({ children: true });
  }
}

class ShopStallWidget {
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
    this.frame = new PixiFrame({
      assetManager,
      label: 'shop:stall:frame',
    });
    this.title = new PixiTextLabel({
      fontWeight: 'bold',
      label: 'shop:stall:title',
    });
    this.capacity = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: 'shop:stall:capacity',
    });
    this.batch = new PixiTextLabel({
      fontWeight: 'bold',
      anchor: { x: 1, y: 0 },
      label: 'shop:stall:batch',
    });
    this.iconFrame = new PixiFrame({
      assetManager,
      width: 50,
      height: 50,
      label: 'shop:stall:iconFrame',
    });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = 'shop:stall:icon';
    this.icon.visible = false;
    this.item = new PixiTextLabel({
      label: 'shop:stall:item',
    });
    this.quantityFrame = new PixiFrame({
      assetManager,
      width: 30,
      height: 14,
      label: 'shop:stall:quantityFrame',
    });
    this.quantity = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 0.5, y: 0 },
      label: 'shop:stall:quantity',
    });
    this.price = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: 'shop:stall:price',
    });
    this.progress = new PixiProgressBar({
      assetManager,
      tone: 'yellow',
      label: 'shop:stall:progress',
    });
    this.timer = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.tinyFontSize,
      anchor: { x: 1, y: 0 },
      label: 'shop:stall:timer',
    });
    this.notification = new Graphics();
    this.notification.label = 'shop:stall:notification';
    this.root.addChild(
      this.frame,
      this.title,
      this.capacity,
      this.batch,
      this.iconFrame,
      this.icon,
      this.item,
      this.quantityFrame,
      this.quantity,
      this.price,
      this.progress,
      this.timer,
      this.notification,
    );
    this.enabled = false;
    this.action = null;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.enabled &&
          this.root.visible &&
          this.root.renderable,
        onPressChange: (pressed) => {
          this.pressed = pressed;
          this.redrawState();
        },
        onActivate: (payload) => this.action?.(payload),
        haptic: 'light',
      }) ?? null;
  }

  bind(key, stall = {}, action) {
    this.unregisterSemantic();
    this.key = key;
    this.model = stall;
    this.action = stall.action ?? action;
    this.enabled = stall.enabled !== false && stall.locked !== true;
    this.root.visible = stall.hidden !== true;
    this.root.renderable = this.root.visible;
    this.root.eventMode = this.enabled ? 'static' : 'none';
    this.title.setText(
      stall.title ?? `stall ${stall.slotNumber ?? key}`,
    );
    this.capacity.setText(stall.capacityLabel ?? stall.capacity ?? '');
    this.batch.setText(stall.batchLabel ?? stall.batch ?? '');
    this.item.setText(
      stall.itemLabel ??
        stall.label ??
        (stall.locked ? 'locked' : 'empty'),
    );
    this.quantity.setText(stall.quantityLabel ?? '');
    this.quantity.visible = Boolean(stall.quantityLabel);
    this.quantityFrame.visible = this.quantity.visible;
    this.price.setText(stall.priceLabel ?? stall.price ?? '');
    this.progress.setProgress(
      normalizeProgress(stall.progress ?? stall.progressPercent),
    );
    this.progress.visible =
      stall.progress !== null &&
      stall.progress !== undefined &&
      stall.paused !== true;
    this.timer.setText(stall.timerLabel ?? stall.pauseLabel ?? '');
    this.timer.setColor(stall.paused ? 'muted' : 'text');
    this.icon.visible = false;
    const texture = resolveTexture(this.assetManager, stall);
    if (texture) {
      this.icon.texture = texture;
      this.icon.visible = true;
    }
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
    }
    this.redrawState();
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.frame.setSize(width, height);
    this.title.position.set(10, 10);
    this.capacity.position.set(78, 12);
    this.batch.position.set(width - 10, 10);
    this.iconFrame.position.set(10, 27);
    this.icon.position.set(15, 32);
    this.icon.width = 40;
    this.icon.height = 40;
    this.item.position.set(70, 35);
    this.item.setWrapWidth(Math.max(0, width - 160));
    this.quantityFrame.position.set(20, 67);
    this.quantity.position.set(35, 68);
    this.price.position.set(width - 10, 35);
    const timerWidth = Math.max(18, this.timer.measuredWidth);
    this.progress.position.set(70, 65);
    this.progress.setSize(
      Math.max(0, width - 80 - timerWidth - 4),
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
    this.timer.position.set(width - 10, 61);
    this.notification.position.set(width - 6, -3);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.frame.applyTheme(this.theme);
    this.iconFrame.applyTheme(this.theme);
    this.quantityFrame.applyTheme(this.theme);
    this.title.applyTheme(this.theme);
    this.capacity.applyTheme(this.theme);
    this.batch.applyTheme(this.theme);
    this.item.applyTheme(this.theme);
    this.quantity.applyTheme(this.theme);
    this.price.applyTheme(this.theme);
    this.progress.applyTheme(this.theme);
    this.timer.applyTheme(this.theme);
    this.redrawState();
  }

  redrawState() {
    this.frame.setVariant(
      this.model?.selected || this.pressed ? 'selected' : 'panel',
    );
    const disabled = !this.enabled;
    this.title.setColor(disabled ? 'disabled' : 'text');
    this.item.setColor(
      resolveThemeColor(
        disabled
          ? 'disabled'
          : this.model?.resourceKey ?? 'text',
      ),
    );
    this.price.setColor(
      resolveThemeColor(
        disabled
          ? 'disabled'
          : this.model?.priceResourceKey ?? 'text',
      ),
    );
    this.notification.clear();
    if (this.model?.notification) {
      this.notification
        .circle(0, 0, PIXI_UI_GEOMETRY.notificationSize / 2)
        .fill(
          this.model.notificationTone === 'orange'
            ? this.theme.notificationOrange
            : this.theme.notificationRed,
        )
        .stroke({ color: this.theme.surface, width: 1 });
    }
  }

  reset() {
    this.unregisterSemantic();
    this.model = null;
    this.key = null;
    this.action = null;
    this.enabled = false;
    this.pressed = false;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
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

class ShopCompactRow {
  constructor({ inputRouter, semanticRegistry, label }) {
    this.root = new Container();
    this.root.label = label;
    this.background = new Graphics();
    this.indexLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:index`,
    });
    this.itemLabel = new PixiTextLabel({
      label: `${label}:item`,
    });
    this.valueLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.notification = new Graphics();
    this.root.addChild(
      this.background,
      this.indexLabel,
      this.itemLabel,
      this.valueLabel,
      this.notification,
    );
    this.semanticRegistry = semanticRegistry;
    this.semanticPrefix = String(label ?? 'shop:row')
      .replaceAll(':', '.');
    this.semanticId = null;
    this.semanticDefinition = null;
    this.action = null;
    this.enabled = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.enabled &&
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
    this.root.eventMode = this.enabled && this.action ? 'static' : 'none';
    this.indexLabel.setText(
      model.indexLabel ??
        (model.slotNumber ? `${model.slotNumber}.` : ''),
    );
    this.itemLabel.setText(
      model.itemLabel ??
        model.bundleLabel ??
        model.label ??
        (model.empty ? 'empty' : ''),
    );
    this.valueLabel.setText(
      model.priceLabel ??
        model.actionLabel ??
        model.value ??
        '',
    );
    const disabled = !this.enabled;
    this.indexLabel.setColor(disabled ? 'disabled' : 'text');
    this.itemLabel.setColor(
      resolveThemeColor(
        disabled ? 'disabled' : model.resourceKey ?? 'text',
      ),
    );
    this.valueLabel.setColor(
      resolveThemeColor(
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
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId: model.tutorialId ?? null,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) => this.action?.(payload),
      });
    }
    this.redraw();
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    const textY = Math.max(1, (height - 16) / 2);
    const indexWidth = this.indexLabel.text ? 20 : 0;
    this.indexLabel.position.set(indexWidth, textY);
    this.itemLabel.position.set(indexWidth + (indexWidth ? 6 : 0), textY);
    this.valueLabel.position.set(width, textY);
    this.itemLabel.setWrapWidth(
      Math.max(
        0,
        width -
          indexWidth -
          this.valueLabel.measuredWidth -
          PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
    this.notification.position.set(width - 2, 2);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.indexLabel.applyTheme(this.theme);
    this.itemLabel.applyTheme(this.theme);
    this.valueLabel.applyTheme(this.theme);
    this.redraw();
  }

  redraw() {
    this.background.clear();
    if (this.model?.selected || this.pressed) {
      this.background
        .rect(0, 0, this.width ?? 0, this.height ?? 0)
        .fill({ color: this.theme.stroke, alpha: 0.22 });
    }
    this.notification.clear();
    if (this.model?.notification) {
      this.notification
        .circle(0, 0, PIXI_UI_GEOMETRY.notificationSize / 2)
        .fill(
          this.model.notificationTone === 'orange'
            ? this.theme.notificationOrange
            : this.theme.notificationRed,
        )
        .stroke({ color: this.theme.surface, width: 1 });
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

class ShopInlineButton {
  constructor({
    inputRouter,
    semanticRegistry,
    semanticId,
    text,
    action,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.backing = new Graphics();
    this.text = new PixiTextLabel({
      text,
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${label}:text`,
    });
    this.root.addChild(this.backing, this.text);
    this.action = action;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.root.visible && this.root.renderable,
        onActivate: (payload) => this.action?.(payload),
        haptic: 'light',
      }) ?? null;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.semanticDefinition =
      semanticRegistry?.register?.({
        semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: true,
          interactive: true,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) => this.action?.(payload),
      }) ?? null;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root.eventMode = 'static';
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.backing
      .clear()
      .rect(0, 0, width, height)
      .fill(this.theme.surface);
    this.text.position.set(Math.max(0, (width - this.text.measuredWidth) / 2), 0);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.text.applyTheme(this.theme);
  }

  destroy() {
    this.registration?.();
    this.registration = null;
    if (this.semanticDefinition) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
      this.semanticDefinition = null;
    }
    this.root.destroy({ children: true });
  }
}

class ShopTooltip {
  constructor({ assetManager, text, label }) {
    this.root = new Container();
    this.root.label = label;
    this.frame = new PixiFrame({
      assetManager,
      shadow: true,
      label: `${label}:frame`,
    });
    this.text = new PixiTextLabel({
      text,
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      wordWrap: true,
      label: `${label}:text`,
    });
    this.root.addChild(this.frame, this.text);
    this.root.visible = false;
    this.root.renderable = false;
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.text.setWrapWidth(width - 12);
    const height = Math.max(36, this.text.measuredHeight + 12);
    this.frame.setSize(width, height);
    this.text.position.set(6, 6);
  }

  applyTheme(theme) {
    this.frame.applyTheme(theme);
    this.text.applyTheme(theme);
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

function orderChildren(container, widgets) {
  container.removeChildren();
  for (const widget of widgets) {
    container.addChild(widget.root ?? widget);
  }
}

function layoutButtons(buttons, x, y, width, height, gap) {
  if (buttons.length === 0) {
    return;
  }
  const buttonWidth = Math.max(
    0,
    (width - gap * (buttons.length - 1)) / buttons.length,
  );
  let cursorX = x;
  for (const button of buttons) {
    button.position.set(cursorX, y);
    button.setSize(buttonWidth, height);
    cursorX += buttonWidth + gap;
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

function normalizeProgress(value) {
  const numeric = Number(value) || 0;
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

function clampInteger(value, min, max) {
  const numeric = Math.floor(Number(value) || min);
  return Math.max(min, Math.min(max, numeric));
}
