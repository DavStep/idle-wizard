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
  getIngredientIconFrameName,
} from '../../../../assets/items/ingredients/ingredientIcons.js';
import {
  getSeedPackBaseFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { getPlayerFrameTint } from '../../../../player/playerFrames.js';
import { PlayerProfileWidget } from '../../global/chrome/PlayerProfileWidgets.js';
import { ClickableWidget } from '../../primitives/ClickableWidget.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import {
  createDialogPaperSection,
  PIXI_DIALOG_FOOTER_TABS_GEOMETRY,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  PixiDialogFrame,
  resolveDialogFooterPaperReduction,
  resolveDialogFooterTabLayout,
  resolveDialogPaperOutsets,
  resolveAdaptiveDialogHeight,
  setDialogPaperAboveFooterTabs,
  setDialogPaperSectionBounds,
} from '../../primitives/PixiDialogFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import {
  ROOT_RUN_SETTINGS_TOGGLE_WIDTH,
  RootRunSettingsSliderPixi,
  RootRunSettingsTogglePixi,
} from '../../primitives/PixiSettingsControls.js';
import { PixiResourceLabel } from '../../primitives/PixiResourceLabel.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PixiNotificationBadge } from '../../global/transient/PixiNotificationBadges.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_PROGRESS_VISUALS,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_DIALOG_LIST_GEOMETRY,
  RetainedButton,
  RetainedScrollArea,
  resolveRetainedDialogListLayout,
} from '../workshop/RetainedPageKit.js';
import { ShopCompactRow } from './ShopPixiPage.js';

export const SHOP_DIALOG_IDS = Object.freeze({
  STALL: 'shop.stall',
  LEDGER: 'shop.ledger',
  REQUEST: 'shop.request',
  LISTING: 'shop.listing',
  MARKET: 'shop.market',
  BUY: 'shop.buy',
  TRADE_HISTORY: 'shop.tradeHistory',
  SUPPORT: 'shop.support',
});

export const WORKSHOP_SUMMON_INFO_DIALOG_ID = 'workshop.summonInfo';
export const WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID =
  'workshop.worldEventDonate';

const AMOUNT_DELTAS = Object.freeze([-100, -10, -1, 1, 10, 100]);
const DEFAULT_DIALOG_WIDTH = 304;
const WIDE_DIALOG_WIDTH = 344;
const LEDGER_DIALOG_WIDTH = DEFAULT_DIALOG_WIDTH;
const TALL_LIST_DIALOG_HEIGHT = 464;
const LEDGER_DIALOG_HEIGHT = 382;
const LEDGER_ROW_HEIGHT = 58;
const LEDGER_SCROLL_VIEWPORT_BOTTOM_INSET = 10;
const CONTENT_GAP = 6;
const LIST_OVERSCAN = 2;
const STALL_RANGE_HORIZONTAL_OUTSET = 8;
const STALL_RANGE_Y = 31;
const STALL_RANGE_ACTION_GAP = 8;
const STALL_ACTION_HEIGHT = PIXI_UI_GEOMETRY.roomControlHeight;
const STALL_ACTIONS_Y =
  STALL_RANGE_Y +
  PIXI_ROOT_RUN_GEOMETRY.settings.knobSize +
  STALL_RANGE_ACTION_GAP;
const STALL_SELECTION_BOTTOM_PADDING = 6;
const STALL_SELECTION_HEIGHT =
  STALL_ACTIONS_Y +
  STALL_ACTION_HEIGHT +
  STALL_SELECTION_BOTTOM_PADDING;
const PLAYER_REQUEST_FIELDS_Y = 28;
const PLAYER_REQUEST_FIELD_PITCH = 43;
const PLAYER_REQUEST_ACTIONS_Y =
  PLAYER_REQUEST_FIELDS_Y + PLAYER_REQUEST_FIELD_PITCH * 2 + 4;
const PLAYER_REQUEST_SELECTION_HEIGHT =
  PLAYER_REQUEST_ACTIONS_Y + STALL_ACTION_HEIGHT + 6;
const PLAYER_LISTING_FIELD_Y = 57;
const PLAYER_LISTING_ACTIONS_Y =
  PLAYER_LISTING_FIELD_Y + 38 + 7;
const PLAYER_LISTING_SELECTION_HEIGHT =
  PLAYER_LISTING_ACTIONS_Y + STALL_ACTION_HEIGHT + 6;
const LEDGER_ITEM_ICON_SIZE = 32;
const LEDGER_POTION_ICON_SIZE = 40;
const INVENTORY_CHOICE_ITEM_ICON_SIZE = 32;
const INVENTORY_CHOICE_POTION_ICON_SIZE = 36;
const STALL_SELECTED_CHECK_SIZE = 27;
const AUTOMATION_COG_TEXTURE_ID = PIXI_ROOT_RUN_ASSETS.settingsGear;
const SETTINGS_ROW_EXPANSION_HEIGHT =
  PIXI_ROOT_RUN_GEOMETRY.settings.knobSize + 8;
const SETTINGS_ROW_EXPANDED_CONTROL_RAISE = 3;
const SETTINGS_ROW_EXPANSION_DURATION_MS = 240;
const SETTINGS_ROW_COLLAPSE_CONTROL_HIDE_MS = 80;
const SETTINGS_ROW_COLLAPSE_CONTROL_HIDE_FRACTION =
  SETTINGS_ROW_COLLAPSE_CONTROL_HIDE_MS /
  SETTINGS_ROW_EXPANSION_DURATION_MS;
const SETTINGS_ROW_PRESS_SCALE = 0.97;
const SETTINGS_ROW_RELEASE_PEAK_SCALE = 1.035;
const SETTINGS_ROW_RELEASE_DURATION_MS = 180;
const SETTINGS_ROW_DISCLOSURE_START_SCALE = 0.985;
const SETTINGS_ROW_DISCLOSURE_PRESS_SLOP =
  SETTINGS_ROW_EXPANSION_HEIGHT + 4;
const SUMMON_SEED_PREFERENCE_BUTTON_WIDTH = 70;
const SUMMON_SEED_PREFERENCE_BUTTON_HEIGHT = 28;
const AUTO_SUMMON_REVEAL_DURATION_MS = 240;
const AUTO_SUMMON_REVEAL_START_SCALE = 0.8;
const AUTO_SUMMON_REVEAL_OVERSHOOT_SCALE = 1.02;
const AUTO_SUMMON_REVEAL_OVERSHOOT_PROGRESS = 0.72;
const PLAYER_MARKET_OFFER_ROW_HEIGHT =
  PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch;
const PLAYER_MARKET_AVATAR_SIZE = 37;
const PLAYER_MARKET_ITEM_ICON_SIZE = 17;
const PLAYER_MARKET_PRICE_OPTICAL_Y = 1;
const PLAYER_MARKET_LIST_FRAME_WIDTH =
  RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth +
  (WIDE_DIALOG_WIDTH - DEFAULT_DIALOG_WIDTH) +
  4;
const PLAYER_MARKET_BUY_SELLER_HEIGHT = 76;
const PLAYER_MARKET_BUY_ITEM_HEIGHT = 192;
const PLAYER_MARKET_TAG_COLORS = Object.freeze({
  ink: '#634934',
  red: '#9b3439',
  amber: '#9a6d1f',
  green: '#397a42',
  teal: '#337b78',
  blue: '#3e6392',
  violet: '#74518e',
  magenta: '#934a78',
  brown: '#704b35',
  slate: '#596271',
});

const DIALOG_CONFIG = Object.freeze({
  [SHOP_DIALOG_IDS.STALL]: Object.freeze({
    title: 'Load Stall',
    width: DEFAULT_DIALOG_WIDTH,
    height: TALL_LIST_DIALOG_HEIGHT,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    hasPrimaryVerticalScroll: true,
    splitPaper: Object.freeze({
      selectionHeight: STALL_SELECTION_HEIGHT,
      selectionStatusHeight:
        STALL_SELECTION_HEIGHT + PIXI_UI_GEOMETRY.rowMinHeight,
      summaryY: 5,
      summaryPitch: 22,
      rangeY: STALL_RANGE_Y,
      rangeHorizontalOutset: STALL_RANGE_HORIZONTAL_OUTSET,
      actionsY: STALL_ACTIONS_Y,
      actionHeight: STALL_ACTION_HEIGHT,
      statusY: STALL_ACTIONS_Y + STALL_ACTION_HEIGHT + 3,
    }),
  }),
  [SHOP_DIALOG_IDS.LEDGER]: Object.freeze({
    title: 'Market Ledger',
    width: LEDGER_DIALOG_WIDTH,
    height: LEDGER_DIALOG_HEIGHT,
    rowHeight: LEDGER_ROW_HEIGHT,
    hasPrimaryVerticalScroll: true,
    listFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
    scrollViewportBottomInset:
      LEDGER_SCROLL_VIEWPORT_BOTTOM_INSET,
    tabFontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
  }),
  [SHOP_DIALOG_IDS.REQUEST]: Object.freeze({
    title: 'Request',
    width: DEFAULT_DIALOG_WIDTH,
    height: TALL_LIST_DIALOG_HEIGHT,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    hasPrimaryVerticalScroll: true,
    splitPaper: Object.freeze({
      selectionHeight: PLAYER_REQUEST_SELECTION_HEIGHT,
      selectionStatusHeight:
        PLAYER_REQUEST_SELECTION_HEIGHT + PIXI_UI_GEOMETRY.rowMinHeight,
      summaryY: 5,
      summaryPitch: 22,
      fieldsY: PLAYER_REQUEST_FIELDS_Y,
      fieldPitch: PLAYER_REQUEST_FIELD_PITCH,
      fieldHeight: 38,
      actionsY: PLAYER_REQUEST_ACTIONS_Y,
      actionHeight: STALL_ACTION_HEIGHT,
      statusY: PLAYER_REQUEST_ACTIONS_Y + STALL_ACTION_HEIGHT + 3,
    }),
  }),
  [SHOP_DIALOG_IDS.LISTING]: Object.freeze({
    title: 'Sell',
    width: DEFAULT_DIALOG_WIDTH,
    height: TALL_LIST_DIALOG_HEIGHT,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    hasPrimaryVerticalScroll: true,
    splitPaper: Object.freeze({
      selectionHeight: PLAYER_LISTING_SELECTION_HEIGHT,
      selectionStatusHeight:
        PLAYER_LISTING_SELECTION_HEIGHT + PIXI_UI_GEOMETRY.rowMinHeight,
      summaryY: 5,
      summaryPitch: 22,
      rangeY: STALL_RANGE_Y,
      rangeHorizontalOutset: STALL_RANGE_HORIZONTAL_OUTSET,
      fieldsY: PLAYER_LISTING_FIELD_Y,
      fieldPitch: 43,
      fieldHeight: 38,
      actionsY: PLAYER_LISTING_ACTIONS_Y,
      actionHeight: STALL_ACTION_HEIGHT,
      statusY: PLAYER_LISTING_ACTIONS_Y + STALL_ACTION_HEIGHT + 3,
    }),
  }),
  [SHOP_DIALOG_IDS.MARKET]: Object.freeze({
    title: 'Player Market',
    width: WIDE_DIALOG_WIDTH,
    height: TALL_LIST_DIALOG_HEIGHT,
    rowHeight: PLAYER_MARKET_OFFER_ROW_HEIGHT,
    rowVariant: 'player-market-offer',
    hasPrimaryVerticalScroll: true,
    splitPaper: Object.freeze({
      selectionHeight: 198,
      selectionStatusHeight: 198,
      summaryY: 5,
      summaryPitch: 22,
      fieldsY: 28,
      fieldPitch: 43,
      fieldHeight: 38,
      actionsY: 158,
      actionHeight: STALL_ACTION_HEIGHT,
      statusPlacement: 'item',
      listTitleHeight: 25,
      listFrameWidth: PLAYER_MARKET_LIST_FRAME_WIDTH,
    }),
  }),
  [SHOP_DIALOG_IDS.BUY]: Object.freeze({
    title: 'Buy Offer',
    width: DEFAULT_DIALOG_WIDTH,
    height: 346,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    layoutKind: 'market-buy',
    splitPaper: Object.freeze({
      selectionHeight: PLAYER_MARKET_BUY_SELLER_HEIGHT,
      selectionStatusHeight: PLAYER_MARKET_BUY_SELLER_HEIGHT,
    }),
  }),
  [SHOP_DIALOG_IDS.TRADE_HISTORY]: Object.freeze({
    title: 'Trade History',
    width: WIDE_DIALOG_WIDTH,
    height: TALL_LIST_DIALOG_HEIGHT,
    rowHeight: 36,
    hasPrimaryVerticalScroll: true,
  }),
  [SHOP_DIALOG_IDS.SUPPORT]: Object.freeze({
    title: 'Support',
    width: DEFAULT_DIALOG_WIDTH,
    height: 126,
    rowHeight: 34,
    centerMessage: true,
  }),
  [WORKSHOP_SUMMON_INFO_DIALOG_ID]: Object.freeze({
    title: 'Summoning Seeds',
    width: DEFAULT_DIALOG_WIDTH,
    height: 382,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    hasPrimaryVerticalScroll: true,
    actionVariant: 'brown-dark',
    selectedActionVariant: 'brown-light',
    splitPaper: Object.freeze({
      selectionHeight: 96,
      selectionStatusHeight: 112,
      summaryFontSize: 15,
      leadingIconSize: 26,
      summaryY: 8,
      summaryPitch: 24,
      summaryXs: Object.freeze([0, 0]),
      summaryYs: Object.freeze([8, 43]),
      toggleY: 8,
      manaSliderY: 64,
      manaSliderRightOutset:
        PIXI_ROOT_RUN_GEOMETRY.settings.knobSize / 2,
      actionsY: 0,
      actionHeight: 26,
      statusY: 89,
    }),
  }),
  [WORKSHOP_WORLD_EVENT_DONATE_DIALOG_ID]: Object.freeze({
    title: 'Donate',
    width: DEFAULT_DIALOG_WIDTH,
    height: 218,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    featuredItemRowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    rangeAfterSummaryRowId: 'amount',
    rangeTopGap: 2,
    rangeBottomGap: 8,
    rangeHorizontalOutset: 12,
    actionVariant: 'green',
    actionLabelOpticalOffsetY: 1,
  }),
});

/**
 * General retained Shop dialog shell.
 *
 * Each registered dialog owns one instance of this class. The shell is broad
 * enough for every current Shop dialog, while all changing rows and footer
 * controls are reconciled through bounded pools.
 */
export class ShopDialogPixi extends BasePixiRetainedView {
  constructor({
    dialogId,
    parent = null,
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    textEntryService = null,
    counters = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
  } = {}) {
    const config = DIALOG_CONFIG[dialogId];
    if (!config) {
      throw new Error(`Unknown retained Shop dialog: ${dialogId}`);
    }

    super({ label: `${dialogId}:dialog` });
    this.dialogId = dialogId;
    this.config = config;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.textEntryService = textEntryService;
    this.onClose = onClose;
    this.theme = theme;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion =
      typeof reducedMotion === 'function'
        ? reducedMotion
        : () => Boolean(reducedMotion);
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.model = normalizeDialogModel(dialogId, {});
    this.modalHandle = null;
    this.buttonSemanticTargets = new Map();
    this.pendingAutoSummonReveal = false;
    this.autoSummonRevealProgress = null;
    this.autoSummonRevealFrame = null;
    this.autoSummonRevealStartedAt = null;

    this.backdrop = new Graphics();
    this.backdrop.label = `${dialogId}:backdrop`;
    this.backdrop.eventMode = 'static';
    this.backdrop.hitArea = new Rectangle(
      0,
      0,
      this.sourceWidth,
      this.sourceHeight,
    );
    this.backdropRegistration =
      inputRouter?.registerPressTarget?.(this.backdrop, {
        enabled: () => this.active,
        onActivate: (payload) => this.activateBackdrop(payload),
        haptic: false,
        sound: false,
      }) ?? null;

    this.panel = new PixiDialogFrame({
      assetManager,
      inputRouter,
      semanticRegistry,
      closeSemanticId: `${dialogId}.close`,
      title: config.title,
      coreWidth: config.width,
      coreHeight: config.height,
      closeAction: () => this.onClose?.(),
      label: `${dialogId}:panel`,
    });
    this.panel.setContentBoxSize(
      config.width - PIXI_UI_GEOMETRY.dialogPadding * 2,
      config.height - PIXI_UI_GEOMETRY.dialogPadding * 2,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    const usesSplitPaperSections = Boolean(config.splitPaper);
    this.panel.paperFrame.visible = !usesSplitPaperSections;
    this.panel.paperFrame.renderable = !usesSplitPaperSections;
    this.body = this.panel.content;
    this.selectionSection = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${dialogId}:selectionSection`,
    );
    this.itemSection = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${dialogId}:itemSection`,
    );
    this.selectionSectionBounds = createBounds();
    this.itemSectionBounds = createBounds();
    this.summaryLayer = new Container();
    this.summaryLayer.label = `${dialogId}:summary`;
    this.fieldLayer = new Container();
    this.fieldLayer.label = `${dialogId}:fields`;
    this.actionLayer = new Container();
    this.actionLayer.label = `${dialogId}:actions`;
    this.tabLayer = new Container();
    this.tabLayer.label = `${dialogId}:tabs`;
    this.messageLabel = new PixiTextLabel({
      wordWrap: true,
      align: config.centerMessage ? 'center' : 'left',
      anchor: config.centerMessage
        ? { x: 0.5, y: 0.5 }
        : { x: 0, y: 0 },
      label: `${dialogId}:message`,
    });
    this.statusLabel = new PixiTextLabel({
      color: 'muted',
      align: 'center',
      label: `${dialogId}:status`,
    });
    this.sectionTitleLabel = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${dialogId}:sectionTitle`,
    });
    this.listTitleLabel = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${dialogId}:listTitle`,
    });
    this.sellerSummary = new PlayerMarketSellerSummary({
      assetManager,
      label: `${dialogId}:sellerSummary`,
    });
    this.purchaseTotal = new PixiResourceLabel({
      assetManager,
      resource: 'coin',
      includeResourceName: true,
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'bold',
      label: `${dialogId}:purchaseTotal`,
    });
    this.purchaseTotal.visible = false;
    this.purchaseTotal.renderable = false;
    this.amountSelector = new AmountSelectorPixi({
      assetManager,
      inputRouter,
      textEntryService,
      label: `${dialogId}:amount`,
    });
    this.rangeControl = new RootRunSettingsSliderPixi({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: `${dialogId}.allocation`,
      tutorialId:
        dialogId === SHOP_DIALOG_IDS.STALL
          ? 'shop:sell:percentage'
          : null,
      label: `${dialogId}:range`,
    });
    this.settingsToggle = new RootRunSettingsTogglePixi({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: `${dialogId}.autoToggle`,
      label: `${dialogId}:autoToggle`,
    });
    this.manaSettingsSlider = new RootRunSettingsSliderPixi({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: `${dialogId}.manaReserve`,
      label: `${dialogId}:manaReserve`,
    });
    this.dropSettingsSlider = new RootRunSettingsSliderPixi({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: `${dialogId}.dropRate`,
      label: `${dialogId}:dropRate`,
    });
    this.fields = Array.from(
      { length: 3 },
      (_, index) =>
        new DialogField({
          assetManager,
          inputRouter,
          textEntryService,
          label: `${dialogId}:field:${index}`,
        }),
    );
    for (const field of this.fields) {
      this.fieldLayer.addChild(field.root);
    }

    this.list = new VirtualShopDialogList({
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: config.rowHeight,
      rowVariant:
        config.rowVariant ??
        (dialogId === SHOP_DIALOG_IDS.LEDGER
          ? 'market-ledger'
          : dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID
            ? 'summon-seed-preference'
            : 'inventory-choice'),
      useSettingsRows: usesSplitPaperSections,
      expandedControl:
        dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID
          ? this.dropSettingsSlider
          : null,
      requestFrame: this.requestFrame,
      cancelFrame: this.cancelFrame,
      timeSource: this.timeSource,
      reducedMotion: this.reducedMotion,
      label: `${dialogId}:list`,
    });

    this.featuredItemRow = new RootRunInventoryChoiceRowPixi({
      assetManager,
      inputRouter,
      semanticRegistry,
      useSettingsStyle: true,
      requestFrame: this.requestFrame,
      cancelFrame: this.cancelFrame,
      timeSource: this.timeSource,
      reducedMotion: this.reducedMotion,
      label: `${dialogId}:featuredItem`,
    });
    this.featuredItemRow.reset();

    this.summaryPool = new WidgetPool({
      name: `${dialogId} summary row pool`,
      counters,
      create: () =>
        new DialogSummaryRow({
          assetManager,
          inputRouter,
          semanticRegistry,
          fontSize:
            config.splitPaper?.summaryFontSize ??
            PIXI_UI_GEOMETRY.bodyFontSize,
          leadingIconSize:
            config.summaryLeadingIconSize ??
            config.splitPaper?.leadingIconSize ??
            22,
          label: `${dialogId}:summaryRow`,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 8,
    });
    this.summaryRows = new PooledCollection({
      name: `${dialogId} summary rows`,
      pool: this.summaryPool,
      counters,
      keyOf: (row, index) => row.id ?? row.key ?? index,
      bind: (widget, row, key) => widget.bind(key, row),
      afterReconcile: (widgets) => orderChildren(this.summaryLayer, widgets),
    });

    this.actionPool = new WidgetPool({
      name: `${dialogId} action button pool`,
      counters,
      create: () =>
        new RetainedButton({
          assetManager,
          inputRouter,
          buttonLabel: `${dialogId}:action`,
          sizeTier: 30,
          variant: config.actionVariant ?? 'yellow',
        }),
      reset: (button) => {
        button.layoutWeight = 1;
        button.setModel({ label: '', enabled: false });
      },
      dispose: (button) => button.destroy(),
      maxSize: 4,
    });
    this.actions = new PooledCollection({
      name: `${dialogId} actions`,
      pool: this.actionPool,
      counters,
      keyOf: (action, index) => action.id ?? index,
      bind: (button, action) => {
        button.layoutWeight = Math.max(
          0,
          finiteOr(action.layoutWeight, 1),
        );
        button.applyTheme(this.contentTheme ?? this.theme);
        button.variant =
          action.variant ??
          (action.selected === true && this.config.selectedActionVariant
            ? this.config.selectedActionVariant
            : this.config.actionVariant ?? 'yellow');
        button.setModel({
          label: action.label ?? action.text ?? '',
          selected: action.selected === true,
          enabled:
            action.enabled !== false && action.disabled !== true,
          notification: action.notification === true,
          action: action.action ?? action.onActivate,
        });
        button.redraw();
        this.registerButtonSemanticTarget(button, action);
      },
      afterReconcile: (buttons) => orderChildren(this.actionLayer, buttons),
    });

    this.tabPool = new WidgetPool({
      name: `${dialogId} tab pool`,
      counters,
      create: () =>
        new RetainedButton({
          assetManager,
          inputRouter,
          buttonLabel: `${dialogId}:tab`,
          variant: 'tab',
        }),
      reset: (button) =>
        button.setModel({ label: '', enabled: false }),
      dispose: (button) => button.destroy(),
      maxSize: 4,
    });
    this.tabs = new PooledCollection({
      name: `${dialogId} tabs`,
      pool: this.tabPool,
      counters,
      keyOf: (tab, index) => tab.id ?? index,
      bind: (button, tab) => {
        button.applyTheme(this.contentTheme ?? this.theme);
        button.setModel({
          label: tab.label ?? tab.id ?? '',
          selected:
            tab.selected === true ||
            tab.id === this.model.selectedTabId,
          notification: tab.notification === true,
          enabled: tab.enabled !== false && tab.disabled !== true,
          action: tab.action ?? tab.onSelect,
        });
        button.control.textLabel.setFontSize(
          this.config.tabFontSize ??
            PIXI_UI_GEOMETRY.borderLabelFontSize,
        );
        this.registerButtonSemanticTarget(button, tab);
      },
      afterReconcile: (buttons) => orderChildren(this.tabLayer, buttons),
    });

    const bodyChildren = [
      this.selectionSection,
      this.itemSection,
      this.featuredItemRow.root,
      this.summaryLayer,
      this.sectionTitleLabel,
      this.listTitleLabel,
      this.sellerSummary.root,
      this.messageLabel,
      this.rangeControl,
      this.settingsToggle,
      this.manaSettingsSlider,
      this.amountSelector.root,
      this.fieldLayer,
      this.list.root,
      this.actionLayer,
      this.purchaseTotal,
      this.statusLabel,
    ];
    if (dialogId !== WORKSHOP_SUMMON_INFO_DIALOG_ID) {
      bodyChildren.splice(7, 0, this.dropSettingsSlider);
    }
    this.body.addChild(...bodyChildren);
    if (dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID) {
      this.body.addChild(
        this.selectionSection,
        this.summaryLayer,
        this.settingsToggle,
        this.manaSettingsSlider,
      );
    }
    this.panel.addChild(this.tabLayer);
    this.root.addChild(
      this.backdrop,
      this.panel,
    );
    parent?.addChild?.(this.root);
    this.onApplyTheme(theme);
    this.relayout();
  }

  onBind(viewModel) {
    this.model = normalizeDialogModel(this.dialogId, viewModel);
    const shouldRevealAutoSummon =
      this.dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID &&
      this.model.autoSummonUnlocked === true &&
      this.model.revealAutoSummonUnlock === true;
    if (shouldRevealAutoSummon) {
      this.pendingAutoSummonReveal = true;
    } else if (
      this.dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID &&
      this.model.autoSummonUnlocked !== true
    ) {
      this.pendingAutoSummonReveal = false;
      this.stopAutoSummonReveal();
    }
    this.panel.setTitle(this.model.title ?? this.config.title);
    this.messageLabel.setText(this.model.message ?? '');
    this.messageLabel.visible = Boolean(this.model.message);
    this.statusLabel.setText(this.model.status ?? '');
    this.statusLabel.visible = Boolean(this.model.status);
    this.statusLabel.renderable = this.statusLabel.visible;
    this.sectionTitleLabel.setText(this.model.sectionTitle ?? '');
    this.sectionTitleLabel.visible = Boolean(this.model.sectionTitle);
    this.sectionTitleLabel.renderable = this.sectionTitleLabel.visible;
    this.listTitleLabel.setText(this.model.listTitle ?? '');
    this.listTitleLabel.visible = Boolean(this.model.listTitle);
    this.listTitleLabel.renderable = this.listTitleLabel.visible;
    this.sellerSummary.bind(this.model.seller ?? null);
    const totalLabel = String(this.model.totalLabel ?? '');
    this.purchaseTotal.visible = Boolean(totalLabel);
    this.purchaseTotal.renderable = this.purchaseTotal.visible;
    if (totalLabel) {
      this.purchaseTotal.bind('total', {
        resource: 'coin',
        amount: totalLabel.replace(/\s*coin$/i, ''),
        includeResourceName: true,
      });
    }
    this.summaryRows.reconcile(this.model.summaryRows);
    if (this.model.featuredItem) {
      this.featuredItemRow.bind(
        this.model.featuredItem.id ?? 'featured-item',
        this.model.featuredItem,
      );
    } else {
      this.featuredItemRow.reset();
    }
    this.clearButtonSemanticTargets();
    this.actions.reconcile(this.model.actions);
    this.tabs.reconcile(this.model.tabs);
    this.list.setItems(this.model.items);
    this.rangeControl.bind(this.model.range);
    this.settingsToggle.bind(this.model.settingsToggle);
    this.manaSettingsSlider.bind(this.model.manaSlider);
    if (this.dialogId !== WORKSHOP_SUMMON_INFO_DIALOG_ID) {
      this.dropSettingsSlider.bind(this.model.dropSlider);
    }
    this.amountSelector.bind(this.model.amount);

    this.fields.forEach((field, index) => {
      field.bind(this.model.fields[index] ?? null);
      field.applyTheme(this.contentTheme ?? this.theme);
    });

    for (const row of this.summaryRows.getWidgets()) {
      row.applyTheme(this.contentTheme ?? this.theme);
    }
    for (const button of this.actions.getWidgets()) {
      button.applyTheme(this.contentTheme ?? this.theme);
    }
    this.list.applyTheme(this.contentTheme ?? this.theme);
    this.featuredItemRow.applyTheme(this.contentTheme ?? this.theme);

    this.relayout();
    if (shouldRevealAutoSummon && this.active) {
      this.startAutoSummonReveal();
    }
  }

  navigateToTarget({ targetId, indication = 'boink' } = {}) {
    return this.list.navigateToTarget(targetId, { indication });
  }

  onApplyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redrawBackdrop();
    this.panel?.applyTheme(this.theme);
    const contentTheme =
      this.panel?.getContentTheme?.() ?? this.theme;
    this.contentTheme = contentTheme;
    this.messageLabel?.applyTheme(contentTheme);
    this.statusLabel?.applyTheme(contentTheme);
    this.sectionTitleLabel?.applyTheme(contentTheme);
    this.listTitleLabel?.applyTheme(contentTheme);
    this.sellerSummary?.applyTheme(contentTheme);
    this.purchaseTotal?.applyTheme(contentTheme);
    this.amountSelector?.applyTheme(contentTheme);
    this.rangeControl?.applyTheme(contentTheme);
    this.settingsToggle?.applyTheme(contentTheme);
    this.manaSettingsSlider?.applyTheme(contentTheme);
    this.dropSettingsSlider?.applyTheme(contentTheme);
    this.list?.applyTheme(contentTheme);
    this.featuredItemRow?.applyTheme(contentTheme);

    for (const field of this.fields ?? []) {
      field.applyTheme(contentTheme);
    }
    for (const row of this.summaryRows?.getWidgets?.() ?? []) {
      row.applyTheme(contentTheme);
    }
    for (const button of this.actions?.getWidgets?.() ?? []) {
      button.applyTheme(contentTheme);
    }
    this.applyActionLabelOpticalOffset();
    for (const button of this.tabs?.getWidgets?.() ?? []) {
      button.applyTheme(this.theme);
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
    this.backdrop.hitArea = new Rectangle(
      0,
      0,
      this.sourceWidth,
      this.sourceHeight,
    );
    this.relayout();
  }

  onActivate() {
    this.modalHandle =
      this.inputRouter?.pushModal?.({
        id: this.dialogId,
        root: this.root,
        onBack: () => this.onClose?.() ?? true,
        onEscape: () => this.onClose?.() ?? true,
      }) ?? null;
    const subscribe = this.model.subscribe;
    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((nextModel) => this.bind(nextModel));
      if (typeof unsubscribe === 'function') {
        this.addActiveCleanup(unsubscribe);
      }
    }
    if (this.pendingAutoSummonReveal) {
      this.startAutoSummonReveal();
    }
  }

  onDeactivate() {
    this.stopAutoSummonReveal();
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    for (const field of this.fields) {
      field.blur();
    }
    this.amountSelector.blur();
    this.list.collapseExpanded({ immediate: true });
  }

  startAutoSummonReveal() {
    if (
      this.dialogId !== WORKSHOP_SUMMON_INFO_DIALOG_ID ||
      this.model.autoSummonUnlocked !== true
    ) {
      return false;
    }

    this.stopAutoSummonReveal();
    this.pendingAutoSummonReveal = false;
    if (this.reducedMotion()) {
      this.relayout();
      return false;
    }

    this.autoSummonRevealProgress = 0;
    this.autoSummonRevealStartedAt = null;
    this.relayout();
    this.autoSummonRevealFrame = this.requestFrame((timestamp) =>
      this.tickAutoSummonReveal(timestamp),
    );
    return true;
  }

  tickAutoSummonReveal(timestamp) {
    this.autoSummonRevealFrame = null;
    const now = Number.isFinite(timestamp)
      ? timestamp
      : this.timeSource();
    if (this.autoSummonRevealStartedAt === null) {
      this.autoSummonRevealStartedAt = now;
    }
    const progress = Math.min(
      1,
      Math.max(
        0,
        (now - this.autoSummonRevealStartedAt) /
          AUTO_SUMMON_REVEAL_DURATION_MS,
      ),
    );
    this.autoSummonRevealProgress = progress;
    this.relayout();

    if (progress >= 1) {
      this.stopAutoSummonReveal();
      return;
    }

    this.autoSummonRevealFrame = this.requestFrame((nextTimestamp) =>
      this.tickAutoSummonReveal(nextTimestamp),
    );
  }

  stopAutoSummonReveal() {
    if (this.autoSummonRevealFrame !== null) {
      this.cancelFrame(this.autoSummonRevealFrame);
    }
    const wasAnimating = this.autoSummonRevealProgress !== null;
    this.autoSummonRevealFrame = null;
    this.autoSummonRevealStartedAt = null;
    this.autoSummonRevealProgress = null;
    if (wasAnimating) {
      this.relayout();
    }
  }

  relayout() {
    if (!this.panel) {
      return;
    }

    const panelWidth = this.config.width;
    const panelHeight = resolveAdaptiveDialogHeight({
      viewportHeight: this.sourceHeight,
      baseHeight: this.config.height,
      minimumHeight: Math.min(
        this.config.height,
        this.config.splitPaper ? 320 : 240,
      ),
      maximumHeight: this.sourceHeight - 118,
      hasPrimaryVerticalScroll:
        this.config.hasPrimaryVerticalScroll === true,
    });
    this.panel.setContentBoxSize(
      panelWidth - PIXI_UI_GEOMETRY.dialogPadding * 2,
      panelHeight - PIXI_UI_GEOMETRY.dialogPadding * 2,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    const centerY = this.sourceHeight / 2;
    const tabCount = this.tabs?.getWidgets?.().length ?? 0;
    const shift = finiteOr(
      this.viewportProjection?.dialogShift,
      0,
    );
    const panelX = Math.round((this.sourceWidth - panelWidth) / 2);
    const panelY = Math.round(
      centerY - panelHeight / 2 + shift,
    );
    this.panel.position.set(panelX, panelY);
    this.panel.relayout();
    const footerTabLayout =
      tabCount > 1
        ? resolveDialogFooterTabLayout({
            coreWidth: this.panel.coreWidth,
            coreHeight: this.panel.coreHeight,
            tabCount,
          })
        : null;

    const bodyWidth = this.panel.contentBoxWidth;
    const bodyHeight = this.panel.contentBoxHeight;
    if (this.config.layoutKind === 'market-buy') {
      this.relayoutMarketBuy(bodyWidth, bodyHeight);
      this.relayoutTabs(null);
      this.redrawBackdrop();
      return;
    }
    if (this.config.splitPaper) {
      this.relayoutSplitSettings(
        bodyWidth,
        bodyHeight,
        footerTabLayout,
      );
      this.relayoutTabs(footerTabLayout);
      this.redrawBackdrop();
      return;
    }
    const footerPaperReduction = footerTabLayout
      ? resolveDialogFooterPaperReduction({
          panel: this.panel,
          bodyBottom: this.body.y + bodyHeight,
          footerLayout: footerTabLayout,
        })
      : 0;
    if (footerTabLayout) {
      setDialogPaperAboveFooterTabs(this.panel, footerTabLayout);
    }
    const usableBodyHeight = Math.max(
      0,
      bodyHeight - footerPaperReduction,
    );

    this.selectionSection.visible = false;
    this.selectionSection.renderable = false;
    this.itemSection.visible = false;
    this.itemSection.renderable = false;
    let y = 0;

    if (this.featuredItemRow.root.visible) {
      const featuredItemRowHeight = Math.max(
        PIXI_UI_GEOMETRY.rowMinHeight,
        finiteOr(
          this.config.featuredItemRowHeight,
          PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
        ),
      );
      this.featuredItemRow.setBounds(
        0,
        y,
        bodyWidth,
        featuredItemRowHeight,
      );
      y += featuredItemRowHeight;
    }

    let rangeLaidOut = false;
    const layoutRange = () => {
      if (!this.rangeControl.visible || rangeLaidOut) {
        return;
      }
      const horizontalOutset = Math.max(
        0,
        finiteOr(this.config.rangeHorizontalOutset, 0),
      );
      y += finiteOr(this.config.rangeTopGap, 0);
      this.rangeControl.setBounds(
        -horizontalOutset,
        y,
        bodyWidth + horizontalOutset * 2,
        16,
      );
      y += 16 + finiteOr(this.config.rangeBottomGap, CONTENT_GAP);
      rangeLaidOut = true;
    };

    for (const row of this.summaryRows?.getWidgets?.() ?? []) {
      const rowInset = Math.max(0, finiteOr(row.layoutInset, 0));
      const rowHeight = Math.max(
        PIXI_UI_GEOMETRY.rowMinHeight,
        finiteOr(row.layoutHeight, PIXI_UI_GEOMETRY.rowMinHeight),
      );
      row.setBounds(rowInset, y, bodyWidth - rowInset, rowHeight);
      y += rowHeight;
      if (row.key === this.config.rangeAfterSummaryRowId) {
        layoutRange();
      }
    }

    if (this.messageLabel.visible) {
      this.messageLabel.setWrapWidth(bodyWidth);
      if (this.config.centerMessage) {
        this.messageLabel.position.set(
          bodyWidth / 2,
          usableBodyHeight / 2,
        );
      } else {
        this.messageLabel.position.set(0, y);
        y += Math.max(
          PIXI_UI_GEOMETRY.rowMinHeight,
          this.messageLabel.measuredHeight,
        );
        y += CONTENT_GAP;
      }
    }

    layoutRange();

    if (this.amountSelector.root.visible) {
      this.amountSelector.setBounds(0, y, bodyWidth, 22);
      y += 22 + CONTENT_GAP;
    }

    let visibleFieldCount = 0;
    for (const field of this.fields) {
      if (!field.root.visible) {
        continue;
      }
      field.setBounds(0, visibleFieldCount * 43, bodyWidth, 38);
      visibleFieldCount += 1;
    }
    this.fieldLayer.position.set(0, y);
    if (visibleFieldCount > 0) {
      y += visibleFieldCount * 43;
    }
    y += finiteOr(this.config.scrollViewportTopInset, 0);

    const actionButtons = this.actions?.getWidgets?.() ?? [];
    const actionHeight = actionButtons.length > 0 ? 28 : 0;
    const actionsBeforeList =
      this.config.actionsPlacement === 'before-list';
    if (actionsBeforeList && actionHeight > 0) {
      layoutButtons(actionButtons, 0, y, bodyWidth, actionHeight, 6);
      this.applyActionLabelOpticalOffset();
      y += actionHeight + CONTENT_GAP;
    }
    const statusHeight = this.statusLabel.visible
      ? PIXI_UI_GEOMETRY.rowMinHeight
      : 0;
    const listHeight = Math.max(
      0,
      usableBodyHeight -
        y -
        (!actionsBeforeList && actionHeight > 0
          ? actionHeight + CONTENT_GAP
          : 0) -
        statusHeight -
        finiteOr(this.config.scrollViewportBottomInset, 0),
    );
    const listFrameWidth = Number(this.config.listFrameWidth);
    const listLayout = Number.isFinite(listFrameWidth)
      ? resolveRetainedDialogListLayout({
          bodyWidth,
          paperRight:
            bodyWidth +
            resolveDialogPaperOutsets(this.panel.contentInsets).right,
          rowFrameWidth: listFrameWidth,
        })
      : {
          x: 0,
          viewportWidth:
            bodyWidth +
            finiteOr(this.config.scrollViewportWidthOutset, 0),
          rowWidth: bodyWidth,
        };
    this.list.setBounds(
      listLayout.x,
      y,
      listLayout.viewportWidth,
      listHeight,
      listLayout.rowWidth,
    );
    this.list.root.visible = this.model.items.length > 0;
    this.list.root.renderable = this.list.root.visible;

    let bottomY = usableBodyHeight;
    if (statusHeight > 0) {
      bottomY -= statusHeight;
      this.statusLabel.position.set(
        Math.max(0, (bodyWidth - this.statusLabel.measuredWidth) / 2),
        bottomY + 2,
      );
    }
    if (!actionsBeforeList && actionHeight > 0) {
      bottomY -= actionHeight;
      layoutButtons(actionButtons, 0, bottomY, bodyWidth, actionHeight, 6);
      this.applyActionLabelOpticalOffset();
    }

    this.relayoutTabs(footerTabLayout);
    this.redrawBackdrop();
  }

  relayoutSplitSettings(bodyWidth, bodyHeight, footerTabLayout) {
    const splitPaper = this.config.splitPaper;
    this.resetAutoSummonRevealTransform();
    const showsSelectionSection =
      this.dialogId !== WORKSHOP_SUMMON_INFO_DIALOG_ID ||
      this.model.autoSummonUnlocked === true;
    const statusInItem = splitPaper.statusPlacement === 'item';
    const statusHeight = this.statusLabel.visible && !statusInItem
      ? PIXI_UI_GEOMETRY.rowMinHeight
      : 0;
    const selectionHeight = statusHeight > 0
      ? splitPaper.selectionStatusHeight
      : splitPaper.selectionHeight;
    const paperOutsets = resolveDialogPaperOutsets(
      this.panel.contentInsets,
    );
    const settledItemY =
      selectionHeight +
      paperOutsets.bottom +
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap +
      paperOutsets.top;
    const layoutProgress =
      this.autoSummonRevealProgress === null
        ? 1
        : easeOutQuart(this.autoSummonRevealProgress);
    const itemY = showsSelectionSection
      ? settledItemY * layoutProgress
      : 0;
    const itemHeight = Math.max(
      0,
      bodyHeight -
        itemY -
        (footerTabLayout
          ? paperOutsets.bottom +
            resolveDialogFooterPaperReduction({
              panel: this.panel,
              bodyBottom: this.body.y + bodyHeight,
              footerLayout: footerTabLayout,
            })
          : 0),
    );
    const contentX = 0;
    const contentWidth = bodyWidth;
    const listTitleHeight = this.listTitleLabel.visible
      ? Math.max(0, finiteOr(splitPaper.listTitleHeight, 0))
      : 0;

    this.selectionSectionBounds = {
      x: 0,
      y: 0,
      width: bodyWidth,
      height: showsSelectionSection ? selectionHeight : 0,
    };
    this.itemSectionBounds = {
      x: 0,
      y: itemY,
      width: bodyWidth,
      height: itemHeight,
    };
    this.selectionSection.visible = showsSelectionSection;
    this.selectionSection.renderable = showsSelectionSection;
    this.summaryLayer.visible = showsSelectionSection;
    this.summaryLayer.renderable = showsSelectionSection;
    this.sectionTitleLabel.visible =
      showsSelectionSection && Boolean(this.model.sectionTitle);
    this.sectionTitleLabel.renderable = this.sectionTitleLabel.visible;
    if (this.sectionTitleLabel.visible) {
      this.sectionTitleLabel.position.set(contentX, 5);
    }
    this.listTitleLabel.visible = Boolean(this.model.listTitle);
    this.listTitleLabel.renderable = this.listTitleLabel.visible;
    if (this.listTitleLabel.visible) {
      this.listTitleLabel.position.set(contentX, itemY + 6);
    }
    this.itemSection.visible = true;
    this.itemSection.renderable = true;
    if (showsSelectionSection) {
      setDialogPaperSectionBounds(
        this.selectionSection,
        this.selectionSectionBounds,
        paperOutsets,
      );
    }
    setDialogPaperSectionBounds(
      this.itemSection,
      this.itemSectionBounds,
      paperOutsets,
    );

    const summaryRows = this.summaryRows?.getWidgets?.() ?? [];
    summaryRows.forEach((row, index) => {
      const requestedRowX = splitPaper.summaryXs?.[index];
      const rowX = Number.isFinite(requestedRowX)
        ? Math.max(0, requestedRowX)
        : 0;
      const rowY = splitPaper.summaryYs?.[index];
      row.setBounds(
        contentX + rowX,
        Number.isFinite(rowY)
          ? rowY
          : splitPaper.summaryY + index * splitPaper.summaryPitch,
        Math.max(0, contentWidth - rowX),
        splitPaper.summaryPitch,
      );
    });

    if (
      this.rangeControl.visible &&
      Number.isFinite(splitPaper.rangeY)
    ) {
      const horizontalOutset = Math.max(
        0,
        finiteOr(splitPaper.rangeHorizontalOutset, 0),
      );
      this.rangeControl.setBounds(
        contentX - horizontalOutset,
        splitPaper.rangeY,
        contentWidth + horizontalOutset * 2,
        16,
      );
    }

    const visibleFields = this.fields.filter(
      (field) => field.root.visible,
    );
    this.fieldLayer.position.set(
      contentX,
      finiteOr(splitPaper.fieldsY, 0),
    );
    visibleFields.forEach((field, index) => {
      field.setBounds(
        0,
        index * finiteOr(splitPaper.fieldPitch, 43),
        contentWidth,
        finiteOr(splitPaper.fieldHeight, 38),
      );
    });

    if (
      this.settingsToggle.visible &&
      Number.isFinite(splitPaper.toggleY)
    ) {
      const toggleWidth = ROOT_RUN_SETTINGS_TOGGLE_WIDTH;
      this.settingsToggle.setBounds(
        contentX + contentWidth - toggleWidth,
        splitPaper.toggleY,
        toggleWidth,
        24,
      );
    }
    if (
      this.manaSettingsSlider.visible &&
      Number.isFinite(splitPaper.manaSliderY)
    ) {
      const rightOutset = Math.max(
        0,
        finiteOr(splitPaper.manaSliderRightOutset, 0),
      );
      this.manaSettingsSlider.setBounds(
        contentX,
        splitPaper.manaSliderY,
        contentWidth + rightOutset,
        PIXI_ROOT_RUN_GEOMETRY.settings.knobSize,
      );
    }
    if (
      this.dropSettingsSlider.visible &&
      Number.isFinite(splitPaper.dropSliderY)
    ) {
      this.dropSettingsSlider.setBounds(
        contentX,
        splitPaper.dropSliderY,
        contentWidth,
        PIXI_ROOT_RUN_GEOMETRY.settings.knobSize,
      );
    }

    const actionButtons = this.actions?.getWidgets?.() ?? [];
    layoutButtons(
      actionButtons,
      contentX,
      splitPaper.actionsY,
      contentWidth,
      splitPaper.actionHeight,
      5,
    );
    this.applyActionLabelOpticalOffset();

    if (statusHeight > 0) {
      this.statusLabel.position.set(
        Math.max(
          contentX,
          (bodyWidth - this.statusLabel.measuredWidth) / 2,
        ),
        splitPaper.statusY,
      );
    }
    if (statusInItem && this.statusLabel.visible) {
      this.statusLabel.position.set(
        Math.max(
          contentX,
          (bodyWidth - this.statusLabel.measuredWidth) / 2,
        ),
        itemY + listTitleHeight + 8,
      );
    }

    const listFrameWidth = finiteOr(
      splitPaper.listFrameWidth,
      RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
    );
    const listLayout = resolveRetainedDialogListLayout({
      bodyWidth,
      paperRight: bodyWidth + paperOutsets.right,
      rowFrameWidth: listFrameWidth,
    });
    this.list.setBounds(
      listLayout.x,
      itemY + listTitleHeight,
      listLayout.viewportWidth,
      Math.max(0, itemHeight - listTitleHeight),
      listLayout.rowWidth,
    );
    this.list.root.visible = this.model.items.length > 0;
    this.list.root.renderable = this.list.root.visible;
    if (showsSelectionSection) {
      this.applyAutoSummonRevealTransform(
        bodyWidth,
        selectionHeight,
      );
    }
  }

  relayoutMarketBuy(bodyWidth, bodyHeight) {
    const paperOutsets = resolveDialogPaperOutsets(
      this.panel.contentInsets,
    );
    const sellerHeight = PLAYER_MARKET_BUY_SELLER_HEIGHT;
    const itemY =
      sellerHeight +
      paperOutsets.bottom +
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap +
      paperOutsets.top;
    const itemHeight = Math.max(
      PLAYER_MARKET_BUY_ITEM_HEIGHT,
      bodyHeight - itemY,
    );

    this.selectionSection.visible = true;
    this.selectionSection.renderable = true;
    this.itemSection.visible = true;
    this.itemSection.renderable = true;
    setDialogPaperSectionBounds(
      this.selectionSection,
      { x: 0, y: 0, width: bodyWidth, height: sellerHeight },
      paperOutsets,
    );
    setDialogPaperSectionBounds(
      this.itemSection,
      { x: 0, y: itemY, width: bodyWidth, height: itemHeight },
      paperOutsets,
    );

    this.sectionTitleLabel.setText('Seller');
    this.sectionTitleLabel.visible = true;
    this.sectionTitleLabel.renderable = true;
    this.sectionTitleLabel.position.set(0, 5);
    this.listTitleLabel.setText('Item');
    this.listTitleLabel.visible = true;
    this.listTitleLabel.renderable = true;
    this.listTitleLabel.position.set(0, itemY + 5);
    this.sellerSummary.setBounds(0, 22, bodyWidth, sellerHeight - 22);

    this.featuredItemRow.root.visible = Boolean(this.model.featuredItem);
    this.featuredItemRow.root.renderable = this.featuredItemRow.root.visible;
    if (this.featuredItemRow.root.visible) {
      this.featuredItemRow.setBounds(
        0,
        itemY + 23,
        bodyWidth,
        PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
      );
    }
    if (this.rangeControl.visible) {
      this.rangeControl.setBounds(
        -STALL_RANGE_HORIZONTAL_OUTSET,
        itemY + 82,
        bodyWidth + STALL_RANGE_HORIZONTAL_OUTSET * 2,
        16,
      );
    }
    if (this.purchaseTotal.visible) {
      this.purchaseTotal.position.set(
        bodyWidth - this.purchaseTotal.measuredWidth,
        itemY + 112,
      );
    }
    layoutButtons(
      this.actions?.getWidgets?.() ?? [],
      0,
      itemY + 137,
      bodyWidth,
      STALL_ACTION_HEIGHT,
      5,
    );
    if (this.statusLabel.visible) {
      this.statusLabel.position.set(
        Math.max(0, (bodyWidth - this.statusLabel.measuredWidth) / 2),
        itemY + 176,
      );
    }

    this.summaryLayer.visible = false;
    this.summaryLayer.renderable = false;
    this.fieldLayer.visible = false;
    this.fieldLayer.renderable = false;
    this.list.root.visible = false;
    this.list.root.renderable = false;
    this.messageLabel.visible = false;
    this.messageLabel.renderable = false;
  }

  applyActionLabelOpticalOffset() {
    const offsetY = finiteOr(this.config.actionLabelOpticalOffsetY, 0);
    for (const button of this.actions?.getWidgets?.() ?? []) {
      const control = button.control;
      if (!control?.textLabel) {
        continue;
      }
      control.textLabel.y =
        control.buttonHeight / 2 +
        finiteOr(control.activeSkin?.contentOffsetY, 0) +
        offsetY;
    }
  }

  resetAutoSummonRevealTransform() {
    if (this.dialogId !== WORKSHOP_SUMMON_INFO_DIALOG_ID) {
      return;
    }
    this.summaryLayer.position.set(0, 0);
    for (const target of [
      this.selectionSection,
      this.summaryLayer,
      this.settingsToggle,
      this.manaSettingsSlider,
    ]) {
      target.scale.set(1);
      target.alpha = 1;
    }
  }

  applyAutoSummonRevealTransform(bodyWidth, selectionHeight) {
    if (
      this.dialogId !== WORKSHOP_SUMMON_INFO_DIALOG_ID ||
      this.autoSummonRevealProgress === null
    ) {
      return;
    }
    const scale = sampleAutoSummonRevealScale(
      this.autoSummonRevealProgress,
    );
    const centerX = bodyWidth / 2;
    const centerY = selectionHeight / 2;

    for (const target of [
      this.selectionSection,
      this.summaryLayer,
      this.settingsToggle,
      this.manaSettingsSlider,
    ]) {
      const baseX = target.position.x;
      const baseY = target.position.y;
      target.scale.set(scale);
      target.position.set(
        centerX + (baseX - centerX) * scale,
        centerY + (baseY - centerY) * scale,
      );
      target.alpha = 1;
    }
  }

  relayoutTabs(footerTabLayout) {
    const tabButtons = this.tabs?.getWidgets?.() ?? [];
    const tabsVisible = Boolean(footerTabLayout) && tabButtons.length > 1;
    this.tabLayer.visible = tabsVisible;
    this.tabLayer.renderable = this.tabLayer.visible;
    for (const button of tabButtons) {
      button.root.visible = tabsVisible;
      button.root.renderable = tabsVisible;
    }
    if (!tabsVisible) {
      return;
    }
    this.tabLayer.position.set(
      footerTabLayout.rowX,
      footerTabLayout.rowY,
    );
    layoutButtons(
      tabButtons,
      0,
      0,
      footerTabLayout.rowWidth,
      PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      footerTabLayout.gap,
    );
  }

  redrawBackdrop() {
    if (!this.backdrop || !this.theme) {
      return;
    }
    this.backdrop
      .clear()
      .rect(0, 0, this.sourceWidth, this.sourceHeight)
      .fill({ color: this.theme.backdrop, alpha: 0.78 });
  }

  activateBackdrop(payload = {}) {
    if (this.isPointInsidePanel(payload.point)) {
      return false;
    }
    return this.onClose?.() ?? true;
  }

  isPointInsidePanel(point) {
    if (
      !this.panel?.toLocal ||
      !Number.isFinite(point?.x) ||
      !Number.isFinite(point?.y)
    ) {
      return false;
    }

    const localPoint = this.panel.toLocal(point);
    const geometry = PIXI_ROOT_RUN_GEOMETRY.dialog;
    const shellLeft = -geometry.frameOutset;
    const shellTop =
      -geometry.frameOutset - geometry.titleOverhang;
    const shellRight = this.panel.coreWidth + geometry.frameOutset;
    const shellBottom =
      this.panel.coreHeight + geometry.frameOutset;

    return (
      localPoint.x >= shellLeft &&
      localPoint.x <= shellRight &&
      localPoint.y >= shellTop &&
      localPoint.y <= shellBottom
    );
  }

  registerButtonSemanticTarget(button, model) {
    button.control?.registration?.update?.({
      fallbackHitTest: Boolean(model.tutorialId),
    });

    const semanticId = model.semanticId ?? null;
    if (!semanticId || !this.semanticRegistry) {
      return;
    }

    const displayObject = button.root;
    const definition = this.semanticRegistry.register({
      semanticId,
      tutorialId: model.tutorialId ?? null,
      displayObject,
      state: () => ({
        enabled: button.enabled,
        interactive: Boolean(button.activation),
        selected: button.selected,
        visible:
          this.active &&
          displayObject.visible &&
          displayObject.renderable,
      }),
      activate: (payload) => button.handleTap(payload),
    });
    this.buttonSemanticTargets.set(semanticId, {
      definition,
      displayObject,
    });
  }

  clearButtonSemanticTargets() {
    for (const [semanticId, target] of this.buttonSemanticTargets) {
      this.semanticRegistry?.unregister?.(semanticId, {
        displayObject: target.displayObject,
      });
    }
    this.buttonSemanticTargets.clear();

    for (const button of [
      ...(this.actions?.getWidgets?.() ?? []),
      ...(this.tabs?.getWidgets?.() ?? []),
    ]) {
      button.control?.registration?.update?.({
        fallbackHitTest: false,
      });
    }
  }

  onDestroy() {
    this.stopAutoSummonReveal();
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.backdropRegistration?.();
    this.backdropRegistration = null;
    this.clearButtonSemanticTargets();
    this.summaryRows.destroy();
    this.summaryPool.destroy();
    this.actions.destroy();
    this.actionPool.destroy();
    this.tabs.destroy();
    this.tabPool.destroy();
    this.list.destroy();
    this.featuredItemRow.destroy();
    this.sellerSummary.destroy();
    this.purchaseTotal.destroy({ children: true });
    this.amountSelector.destroy();
    this.rangeControl.destroy();
    this.settingsToggle.destroy();
    this.manaSettingsSlider.destroy();
    this.dropSettingsSlider.destroy();
    for (const field of this.fields) {
      field.destroy();
    }
  }
}

export class DialogSummaryRow {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    fontSize = PIXI_UI_GEOMETRY.bodyFontSize,
    leadingIconSize = 22,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.assetManager = assetManager;
    this.defaultFontSize = fontSize;
    this.fontSize = fontSize;
    this.leadingIconSize = leadingIconSize;
    this.keyLabel = new PixiTextLabel({
      fontSize,
      lineHeight: fontSize,
      label: `${label}:key`,
    });
    this.valueLabel = new PixiTextLabel({
      fontSize,
      lineHeight: fontSize,
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.valueResource = new PixiResourceLabel({
      assetManager,
      resource: 'mana',
      fontSize,
      includeResourceName: false,
      label: `${label}:valueResource`,
    });
    this.valueResource.visible = false;
    this.valueResource.renderable = false;
    this.leadingResource = new PixiResourceLabel({
      assetManager,
      resource: 'coin',
      fontSize: leadingIconSize,
      includeResourceName: false,
      label: `${label}:leadingResource`,
    });
    this.leadingResource.visible = false;
    this.leadingResource.renderable = false;
    this.quantityLabel = new PixiTextLabel({
      fontSize,
      lineHeight: fontSize,
      anchor: { x: 1, y: 0 },
      label: `${label}:quantity`,
    });
    this.itemIcon = createItemSprite(`${label}:icon`);
    this.itemIconOverlay = createItemSprite(
      `${label}:iconOverlay`,
    );
    this.root.addChild(
      this.keyLabel,
      this.valueLabel,
      this.valueResource,
      this.leadingResource,
      this.quantityLabel,
      this.itemIcon,
      this.itemIconOverlay,
    );
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          Boolean(this.action) &&
          this.enabled &&
          this.root.visible &&
          this.root.renderable,
        onActivate: (payload) => this.action?.(payload),
        haptic: 'light',
      }) ?? null;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.action = null;
    this.enabled = false;
  }

  bind(key, row = {}) {
    this.unregisterSemantic();
    this.root.visible = true;
    this.root.renderable = true;
    this.fontSize = Math.max(
      1,
      finiteOr(row.fontSize, this.defaultFontSize),
    );
    for (const label of [
      this.keyLabel,
      this.valueLabel,
      this.quantityLabel,
    ]) {
      label.setFontSize(this.fontSize);
      label.setLineHeight(this.fontSize);
    }
    this.keyLabel.setFontWeight(row.fontWeight ?? 'normal');
    this.keyLabel.setText(row.label ?? row.keyText ?? '');
    this.valueLabel.setText(row.value ?? row.valueText ?? '');
    const valueIconResourceKey = row.valueIconResourceKey ?? null;
    const hasValueResource = Boolean(valueIconResourceKey);
    this.valueLabel.visible = !hasValueResource;
    this.valueLabel.renderable = !hasValueResource;
    this.valueResource.visible = hasValueResource;
    this.valueResource.renderable = hasValueResource;
    if (hasValueResource) {
      this.valueResource.bind(key, {
        resource: valueIconResourceKey,
        amount: row.value ?? row.valueText ?? '',
        includeResourceName: false,
      });
    }
    const leadingResourceKey = row.leadingResourceKey ?? null;
    this.leadingResource.visible = Boolean(leadingResourceKey);
    this.leadingResource.renderable = this.leadingResource.visible;
    if (leadingResourceKey) {
      this.leadingResource.bind(key, {
        resource: leadingResourceKey,
        amount: '',
        includeResourceName: false,
      });
    }
    this.quantityLabel.setText(row.quantityLabel ?? '');
    const iconFrames = resolveItemIconFrames(row);
    this.itemIconAspectRatio = iconFrames.aspectRatio ?? 1;
    bindItemSprite(
      this.itemIcon,
      this.assetManager,
      iconFrames.base,
      iconFrames.texture,
    );
    bindItemSprite(
      this.itemIconOverlay,
      this.assetManager,
      iconFrames.overlay,
    );
    this.keyLabel.setColor(
      resolveThemeColor(
        row.disabled ? 'disabled' : row.resourceKey ?? 'text',
      ),
    );
    this.valueLabel.setColor(
      resolveThemeColor(
        row.disabled
          ? 'disabled'
          : row.valueTone
            ? resolveProgressToneText(row.valueTone)
          : row.itemKind
            ? 'text'
            : row.valueResourceKey ?? 'text',
      ),
    );
    this.valueLabel.setStroke(
      row.disabled ? null : resolveProgressToneTextStroke(row.valueTone),
    );
    this.quantityLabel.setColor(
      resolveThemeColor(row.disabled ? 'disabled' : 'text'),
    );
    this.action = row.action ?? row.onActivate ?? null;
    this.enabled = row.enabled !== false && row.disabled !== true;
    this.iconLeading = row.iconLeading === true;
    this.layoutHeight = finiteOr(row.layoutHeight, null);
    this.layoutInset = finiteOr(row.layoutInset, 0);
    this.root.eventMode = this.action && this.enabled ? 'static' : 'none';
    this.semanticId = row.semanticId ?? null;
    if (this.semanticId && this.semanticRegistry) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId: row.tutorialId ?? null,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) => this.action?.(payload),
      });
    }
    this.key = key;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    const textY = Math.max(0, (height - this.fontSize) / 2 - 1);
    this.keyLabel.position.set(0, textY);
    this.quantityLabel.position.set(width, textY);
    const quantityWidth = this.quantityLabel.measuredWidth;
    const valueWidth = this.valueResource.visible
      ? this.valueResource.measuredWidth
      : this.valueLabel.measuredWidth;
    if (this.valueResource.visible) {
      this.valueResource.position.set(width - valueWidth, textY);
    }
    const hasLeadingVisual =
      this.iconLeading &&
      (this.itemIcon.visible || this.leadingResource.visible);
    if (hasLeadingVisual) {
      const iconSize = this.leadingIconSize;
      if (this.itemIcon.visible) {
        setSeedPackCompositeBounds(
          this.itemIcon,
          this.itemIconOverlay,
          iconSize / 2,
          height / 2,
          iconSize,
          0,
        );
        this.itemIcon.width *= this.itemIconAspectRatio;
      }
      if (this.leadingResource.visible) {
        this.leadingResource.position.set(
          0,
          Math.max(0, (height - iconSize) / 2),
        );
      }
      const labelX = iconSize + PIXI_UI_GEOMETRY.rowColumnGap;
      this.keyLabel.position.set(labelX, textY);
      this.keyLabel.setWrapWidth(
        Math.max(
          0,
          width -
            labelX -
            valueWidth -
            PIXI_UI_GEOMETRY.rowColumnGap,
        ),
      );
      this.valueLabel.setAnchor(1, 0);
      this.valueLabel.position.set(width, textY);
    } else if (this.itemIcon.visible) {
      setSeedPackCompositeBounds(
        this.itemIcon,
        this.itemIconOverlay,
        55,
        height / 2,
        18,
        0.5,
      );
      this.itemIcon.width *= this.itemIconAspectRatio;
      this.valueLabel.setAnchor(0, 0);
      this.valueLabel.position.set(67, textY);
      this.valueLabel.setWrapWidth(
        Math.max(
          0,
          width -
            67 -
            quantityWidth -
            PIXI_UI_GEOMETRY.rowColumnGap,
        ),
      );
      this.keyLabel.setWrapWidth(46);
    } else {
      this.valueLabel.setAnchor(1, 0);
      this.valueLabel.position.set(
        width -
          (quantityWidth > 0
            ? quantityWidth + PIXI_UI_GEOMETRY.rowColumnGap
            : 0),
        textY,
      );
      this.keyLabel.setWrapWidth(
        Math.max(
          0,
          width -
            valueWidth -
            quantityWidth -
            PIXI_UI_GEOMETRY.rowColumnGap,
        ),
      );
    }
  }

  applyTheme(theme) {
    this.keyLabel.applyTheme(theme);
    this.valueLabel.applyTheme(theme);
    this.valueResource.applyTheme(theme);
    this.leadingResource.applyTheme(theme);
    this.quantityLabel.applyTheme(theme);
  }

  reset() {
    this.unregisterSemantic();
    this.action = null;
    this.enabled = false;
    this.iconLeading = false;
    this.layoutHeight = null;
    this.layoutInset = 0;
    this.fontSize = this.defaultFontSize;
    this.keyLabel.setFontSize(this.defaultFontSize);
    this.keyLabel.setLineHeight(this.defaultFontSize);
    this.keyLabel.setFontWeight('normal');
    this.valueLabel.setFontSize(this.defaultFontSize);
    this.valueLabel.setLineHeight(this.defaultFontSize);
    this.quantityLabel.setFontSize(this.defaultFontSize);
    this.quantityLabel.setLineHeight(this.defaultFontSize);
    this.itemIconAspectRatio = 1;
    this.key = null;
    this.valueResource.visible = false;
    this.valueResource.renderable = false;
    this.leadingResource.visible = false;
    this.leadingResource.renderable = false;
    this.itemIcon.texture = Texture.EMPTY;
    this.itemIcon.visible = false;
    this.itemIconOverlay.texture = Texture.EMPTY;
    this.itemIconOverlay.visible = false;
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

export class DialogField {
  constructor({
    assetManager,
    inputRouter,
    textEntryService,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.label = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:label`,
    });
    this.field = new PixiTextField({
      assetManager,
      inputRouter,
      textEntryService,
      inputKind: 'integer',
      label: `${label}:control`,
      onChange: (value) => this.model?.onChange?.(value, this.model.id),
      onSubmit: (value) => this.model?.onSubmit?.(value, this.model.id),
      onCancel: () => this.model?.onCancel?.(this.model.id),
    });
    this.root.addChild(this.label, this.field);
    this.model = null;
  }

  bind(model) {
    this.model = model;
    this.root.visible = Boolean(model);
    this.root.renderable = this.root.visible;
    if (!model) {
      this.field.blur();
      return;
    }
    this.label.setText(model.label ?? '');
    this.field.inputKind = model.inputKind ?? 'integer';
    this.field.multiline = model.multiline === true;
    this.field.maxLength = model.maxLength ?? null;
    this.field.placeholder = model.placeholder ?? '';
    this.field.setValue(model.value ?? '');
    this.field.setSize(this.field.fieldWidth, model.height ?? 24);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.label.position.set(0, 0);
    this.field.position.set(0, 14);
    this.field.setSize(width, Math.max(24, height - 14));
  }

  applyTheme(theme) {
    this.label.applyTheme(theme);
    this.field.applyTheme(theme);
  }

  blur() {
    this.field.blur();
  }

  destroy() {
    this.field.destroy({ children: true });
    this.root.destroy({ children: true });
  }
}

export class AmountSelectorPixi {
  constructor({
    assetManager,
    inputRouter,
    textEntryService,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.model = null;
    this.valueButton = new PixiTextButton({
      assetManager,
      inputRouter,
      text: '1',
      sizeTier: 30,
      label: `${label}:value`,
      action: () => this.showEditor(),
    });
    this.valueField = new PixiTextField({
      assetManager,
      inputRouter,
      textEntryService,
      inputKind: 'integer',
      label: `${label}:field`,
      onChange: (value) => this.model?.onChange?.(value),
      onSubmit: (value) => {
        this.model?.onSubmit?.(value);
        this.hideEditor();
      },
      onCancel: () => this.hideEditor(),
    });
    this.stepButtons = AMOUNT_DELTAS.map(
      (delta) =>
        new PixiTextButton({
          assetManager,
          inputRouter,
          text: delta > 0 ? `+${delta}` : String(delta),
          sizeTier: 30,
          label: `${label}:step:${delta}`,
          action: () => this.model?.onStep?.(delta),
        }),
    );
    this.root.addChild(
      ...this.stepButtons.slice(0, 3),
      this.valueButton,
      this.valueField,
      ...this.stepButtons.slice(3),
    );
    this.valueField.visible = false;
    this.valueField.renderable = false;
  }

  bind(model) {
    this.model = model;
    this.root.visible = Boolean(model);
    this.root.renderable = this.root.visible;
    if (!model) {
      this.hideEditor();
      return;
    }
    const value = String(model.value ?? 1);
    this.valueButton
      .setText(value)
      .setEnabled(model.enabled !== false);
    this.valueField.setValue(value);
    this.stepButtons.forEach((button, index) => {
      const delta = AMOUNT_DELTAS[index];
      const disabledDeltas = new Set(model.disabledDeltas ?? []);
      button.setEnabled(
        model.enabled !== false && !disabledDeltas.has(delta),
      );
    });
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    const valueWidth = 42;
    const stepWidth = Math.max(20, (width - valueWidth - 6 * 3) / 6);
    let cursorX = 0;
    this.stepButtons.slice(0, 3).forEach((button) => {
      button.position.set(cursorX, 0);
      button.setSize(stepWidth, height);
      cursorX += stepWidth + 3;
    });
    this.valueButton.position.set(cursorX, 0);
    this.valueButton.setSize(valueWidth, height);
    this.valueField.position.set(cursorX, 0);
    this.valueField.setSize(valueWidth, height);
    cursorX += valueWidth + 3;
    this.stepButtons.slice(3).forEach((button) => {
      button.position.set(cursorX, 0);
      button.setSize(stepWidth, height);
      cursorX += stepWidth + 3;
    });
  }

  async showEditor() {
    if (!this.model || this.model.enabled === false) {
      return;
    }
    this.valueButton.visible = false;
    this.valueButton.renderable = false;
    this.valueField.visible = true;
    this.valueField.renderable = true;
    await this.valueField.focus();
  }

  hideEditor() {
    this.valueField.blur();
    this.valueField.visible = false;
    this.valueField.renderable = false;
    this.valueButton.visible = true;
    this.valueButton.renderable = true;
  }

  blur() {
    this.hideEditor();
  }

  applyTheme(theme) {
    this.valueButton.applyTheme(theme);
    this.valueField.applyTheme(theme);
    for (const button of this.stepButtons) {
      button.applyTheme(theme);
    }
  }

  destroy() {
    this.valueButton.destroy({ children: true });
    this.valueField.destroy({ children: true });
    for (const button of this.stepButtons) {
      button.destroy({ children: true });
    }
    this.root.destroy({ children: true });
  }
}

export class PlayerMarketSellerSummary {
  constructor({ assetManager, label }) {
    this.assetManager = assetManager;
    this.root = new Container({ label });
    this.avatar = new PlayerProfileWidget({
      assets: assetManager,
      label: `${label}:avatar`,
    });
    this.tag = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      fontWeight: 'bold',
      label: `${label}:tag`,
    });
    this.username = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${label}:username`,
    });
    this.detail = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:detail`,
    });
    this.root.addChild(this.avatar, this.tag, this.username, this.detail);
    this.model = null;
    this.root.visible = false;
    this.root.renderable = false;
  }

  bind(model) {
    this.model = model;
    this.root.visible = Boolean(model);
    this.root.renderable = this.root.visible;
    if (!model) {
      return;
    }
    this.avatar
      .setTexture(resolvePlayerCharacterTexture(this.assetManager, model.character))
      .setBackgroundTint(getPlayerFrameTint(model.frame));
    const tag = normalizeAllianceTag(model.allianceTag);
    this.tag.setText(tag ? `[${tag}]` : '');
    this.tag.visible = Boolean(tag);
    this.tag.renderable = this.tag.visible;
    this.username.setText(String(model.username ?? 'Wizard'));
    this.detail.setText(String(model.detail ?? ''));
    this.detail.visible = Boolean(this.detail.text);
    this.detail.renderable = this.detail.visible;
    this.applyTheme(this.theme);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    const avatarSize = Math.min(48, Math.max(36, height - 2));
    this.avatar.scale.set(avatarSize / 186);
    this.avatar.position.set(0, Math.max(0, (height - avatarSize) / 2));
    const textX = avatarSize + 7;
    const identityY = this.detail.visible
      ? 5
      : Math.max(4, Math.round((height - 16) / 2));
    this.tag.position.set(textX, identityY);
    this.username.position.set(
      textX + (this.tag.visible ? this.tag.measuredWidth + 3 : 0),
      identityY - 1,
    );
    this.username.setWrapWidth(Math.max(0, width - this.username.x));
    this.detail.position.set(textX, 27);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.tag.applyTheme(this.theme);
    this.tag.setColor(resolveAllianceTagColor(this.model?.allianceTagColor));
    this.username.applyTheme(this.theme);
    this.detail.applyTheme(this.theme);
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/**
 * Player-market listing row derived from the shared leaderboard identity row.
 * The row body stays passive; only the fixed Buy action is interactive.
 */
export class PlayerMarketOfferRow {
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
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${label}:frame`,
    });
    this.avatar = new PlayerProfileWidget({
      assets: assetManager,
      label: `${label}:avatar`,
    });
    this.tag = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      fontWeight: 'bold',
      label: `${label}:tag`,
    });
    this.username = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${label}:username`,
    });
    this.itemIcon = createItemSprite(`${label}:itemIcon`);
    this.itemIconOverlay = createItemSprite(`${label}:itemIconOverlay`);
    this.itemLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${label}:item`,
    });
    this.price = new PixiResourceLabel({
      assetManager,
      resource: 'coin',
      includeResourceName: false,
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      fontWeight: 'bold',
      label: `${label}:price`,
    });
    this.eachLabel = new PixiTextLabel({
      text: 'each',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${label}:each`,
    });
    this.buyButton = new PixiTextButton({
      assetManager,
      inputRouter,
      width: 62,
      height: 28,
      sizeTier: 30,
      variant: 'green',
      label: `${label}:buy`,
    });
    this.root.addChild(
      this.frame,
      this.avatar,
      this.tag,
      this.username,
      this.itemIcon,
      this.itemIconOverlay,
      this.itemLabel,
      this.price,
      this.eachLabel,
      this.buyButton,
    );
    this.root.eventMode = 'passive';
    this.model = null;
    this.semanticId = null;
    this.semanticDefinition = null;
  }

  bind(key, model = {}) {
    this.unregisterSemantic();
    this.key = key;
    this.model = model;
    this.root.visible = model.hidden !== true;
    this.root.renderable = this.root.visible;
    this.avatar
      .setTexture(resolvePlayerCharacterTexture(this.assetManager, model.character))
      .setBackgroundTint(getPlayerFrameTint(model.frame));
    const tag = normalizeAllianceTag(model.allianceTag);
    this.tag.setText(tag ? `[${tag}]` : '');
    this.tag.visible = Boolean(tag);
    this.tag.renderable = this.tag.visible;
    this.username.setText(String(model.username ?? 'Wizard'));
    this.itemLabel.setText(
      `${model.itemLabel ?? 'Item'} ${model.quantityLabel ?? ''}`.trim(),
    );
    const iconFrames = resolveItemIconFrames(model);
    bindItemSprite(
      this.itemIcon,
      this.assetManager,
      iconFrames.base,
      iconFrames.texture,
    );
    bindItemSprite(
      this.itemIconOverlay,
      this.assetManager,
      iconFrames.overlay,
    );
    this.price.bind(key, {
      resource: 'coin',
      amount: String(model.priceLabel ?? '').replace(/\s*coin$/i, ''),
      includeResourceName: true,
    });
    const hasAction = Boolean(model.actionLabel && model.action);
    this.buyButton.bind(
      key,
      {
        label: model.actionLabel ?? '',
        enabled: model.enabled !== false && hasAction,
        variant: model.actionVariant ?? 'green',
        hidden: !hasAction,
      },
      model.action,
    );
    this.buyButton.visible = hasAction;
    this.buyButton.renderable = hasAction;
    this.semanticId = hasAction ? model.semanticId ?? null : null;
    if (this.semanticRegistry && this.semanticId) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        displayObject: this.buyButton,
        state: () => ({
          enabled: this.buyButton.enabled,
          interactive: true,
          visible: this.root.visible && this.buyButton.visible,
        }),
        activate: (payload) => model.action?.(payload),
      });
    }
    this.applyTheme(this.theme);
  }

  setBounds(x, y, width, height = PLAYER_MARKET_OFFER_ROW_HEIGHT) {
    this.root.position.set(x, y);
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const frameWidth = Math.max(0, width - rowGap);
    const frameHeight = Math.max(0, height - rowGap);
    this.frame.position.set(0, rowGap / 2);
    this.frame.setSize(
      frameWidth,
      frameHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    this.avatar.scale.set(PLAYER_MARKET_AVATAR_SIZE / 186);
    this.avatar.position.set(7, (height - PLAYER_MARKET_AVATAR_SIZE) / 2);
    const textX = 7 + PLAYER_MARKET_AVATAR_SIZE + 5;
    const actionWidth = this.buyButton.visible ? 62 : 0;
    const actionX = frameWidth - 7 - actionWidth;
    this.tag.position.set(textX, 10);
    this.username.position.set(
      textX + (this.tag.visible ? this.tag.measuredWidth + 3 : 0),
      9,
    );
    this.username.setWrapWidth(0);
    fitPlayerMarketLabel(
      this.username,
      Math.max(0, actionX - 6 - this.username.x),
    );
    const iconSize = PLAYER_MARKET_ITEM_ICON_SIZE;
    const contentY = 27;
    setSeedPackCompositeBounds(
      this.itemIcon,
      this.itemIconOverlay,
      textX + iconSize / 2,
      34,
      iconSize,
      0,
    );
    this.itemLabel.position.set(textX + iconSize + 4, contentY);
    this.itemLabel.setWrapWidth(0);
    this.itemLabel.scale.set(1);
    this.layoutPriceContent();
    const contentRight = actionWidth > 0 ? actionX - 5 : frameWidth - 8;
    const itemLabelWidth = Math.max(
      0,
      contentRight -
        this.itemLabel.x -
        6 -
        this.price.measuredWidth -
        3 -
        this.eachLabel.measuredWidth,
    );
    fitPlayerMarketLabel(this.itemLabel, itemLabelWidth);
    this.price.position.set(
      this.itemLabel.x +
        this.itemLabel.measuredWidth * this.itemLabel.scale.x +
        6,
      contentY + PLAYER_MARKET_PRICE_OPTICAL_Y,
    );
    this.eachLabel.position.set(
      this.price.x + this.price.measuredWidth + 3,
      contentY,
    );
    if (this.buyButton.visible) {
      this.buyButton.position.set(actionX, (height - 28) / 2);
      this.buyButton.setSize(actionWidth, 28);
    }
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.frame.setTexture(
      this.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
    );
    this.tag.applyTheme(this.theme);
    this.tag.setColor(resolveAllianceTagColor(this.model?.allianceTagColor));
    this.username.applyTheme(this.theme);
    this.itemLabel.applyTheme(this.theme);
    this.price.applyTheme(this.theme);
    this.layoutPriceContent();
    this.eachLabel.applyTheme(this.theme);
    this.buyButton.applyTheme(this.theme);
  }

  layoutPriceContent() {
    if (!this.price.icon.visible) {
      return;
    }
    const centerY = this.price.fontSize * 0.5;
    this.price.amountLabel.position.set(0, centerY);
    this.price.icon.position.set(
      this.price.amountLabel.measuredWidth + this.price.fontSize * 0.14,
      centerY,
    );
  }

  reset() {
    this.unregisterSemantic();
    this.model = null;
    this.key = null;
    this.root.visible = false;
    this.root.renderable = false;
    this.itemIcon.texture = Texture.EMPTY;
    this.itemIcon.visible = false;
    this.itemIconOverlay.texture = Texture.EMPTY;
    this.itemIconOverlay.visible = false;
    this.buyButton.reset();
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.buyButton,
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

class VirtualShopDialogList {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    counters,
    rowHeight,
    rowVariant = 'inventory-choice',
    useSettingsRows = false,
    expandedControl = null,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
    label,
  }) {
    this.rowHeight = rowHeight;
    this.rowVariant = rowVariant;
    this.useSettingsRows = useSettingsRows;
    this.expandedControl = expandedControl;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion = reducedMotion;
    this.width = 0;
    this.rowWidth = 0;
    this.height = 0;
    this.items = [];
    this.itemsRevision = 0;
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.expandedKey = null;
    this.outgoingKey = null;
    this.incomingStartFraction = 0;
    this.outgoingStartFraction = 0;
    this.expansionProgress = 1;
    this.collapseControlProgress = 0;
    this.expansionFrame = null;
    this.expansionStartedAt = null;
    this.contentPaddingTop = PIXI_UI_GEOMETRY.dialogScrollPaddingTop;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.scroll = new RetainedScrollArea({
      assetManager,
      inputRouter,
      label,
      onScroll: () => this.renderWindow(),
    });
    this.root = this.scroll.root;
    this.rowPool = new WidgetPool({
      name: `${label} viewport row pool`,
      counters,
      create: () =>
        this.rowVariant === 'market-ledger'
          ? new MarketLedgerRowPixi({
              assetManager,
              inputRouter,
              semanticRegistry,
              requestFrame: this.requestFrame,
              cancelFrame: this.cancelFrame,
              timeSource: this.timeSource,
              reducedMotion: this.reducedMotion,
              label: `${label}:row`,
            })
          : this.rowVariant === 'market-compact'
            ? new ShopCompactRow({
                assetManager,
                inputRouter,
                semanticRegistry,
                paperPresentation: true,
                label: `${label}:row`,
              })
            : this.rowVariant === 'player-market-offer'
              ? new PlayerMarketOfferRow({
                  assetManager,
                  inputRouter,
                  semanticRegistry,
                  label: `${label}:row`,
                })
            : this.rowVariant === 'summon-seed-preference'
            ? new SummonSeedPreferenceRowPixi({
                assetManager,
                inputRouter,
                semanticRegistry,
                useSettingsStyle: this.useSettingsRows,
                requestFrame: this.requestFrame,
                cancelFrame: this.cancelFrame,
                timeSource: this.timeSource,
                reducedMotion: this.reducedMotion,
                pressSlop: SETTINGS_ROW_DISCLOSURE_PRESS_SLOP,
                label: `${label}:row`,
              })
          : new RootRunInventoryChoiceRowPixi({
              assetManager,
              inputRouter,
              semanticRegistry,
              useSettingsStyle: this.useSettingsRows,
              requestFrame: this.requestFrame,
              cancelFrame: this.cancelFrame,
              timeSource: this.timeSource,
              reducedMotion: this.reducedMotion,
              pressSlop: this.expandedControl
                ? SETTINGS_ROW_DISCLOSURE_PRESS_SLOP
                : null,
              label: `${label}:row`,
            }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 24,
    });
    this.rows = new PooledCollection({
      name: `${label} viewport rows`,
      pool: this.rowPool,
      counters,
      keyOf: (entry) => entry.item.__virtualKey,
      revisionOf: (entry) =>
        `${entry.item.__virtualRevision}:${entry.item.expanded === true}`,
      bind: (widget, entry) => {
        widget.applyTheme(this.theme);
        widget.bind(entry.item.__virtualKey, entry.item);
      },
      afterReconcile: (widgets) =>
        orderChildren(
          this.scroll.content,
          this.expandedControl
            ? [...widgets, this.expandedControl]
            : widgets,
        ),
    });
    this.expandedControl?.bind(null);
  }

  setItems(items) {
    this.itemsRevision += 1;
    this.items = safeArray(items).map((item, index) => ({
      ...item,
      __virtualKey: item.id ?? item.key ?? item.semanticId ?? index,
      __virtualRevision: this.itemsRevision,
    }));
    if (
      this.expandedKey !== null &&
      !this.items.some((item) => item.__virtualKey === this.expandedKey)
    ) {
      this.collapseExpanded({ immediate: true });
    }
    if (
      this.outgoingKey !== null &&
      !this.items.some((item) => item.__virtualKey === this.outgoingKey)
    ) {
      this.outgoingKey = null;
    }
    this.syncExpandedControl();
    this.refreshContentHeight();
    this.renderWindow(true);
  }

  setBounds(x, y, width, height, rowWidth = width) {
    this.width = Math.max(0, width);
    this.rowWidth = Math.max(0, rowWidth);
    this.height = Math.max(0, height);
    this.scroll.setBounds(x, y, this.width, this.height);
    this.renderWindow(true);
  }

  renderWindow(force = false) {
    const layout = this.createLayout();
    const viewportTop = Math.max(0, this.scroll.offsetY);
    const viewportBottom = viewportTop + this.height;
    let firstVisible = layout.findIndex(
      (entry) => entry.top + entry.height >= viewportTop,
    );
    if (firstVisible < 0) {
      firstVisible = Math.max(0, layout.length - 1);
    }
    let lastVisible = firstVisible;
    while (
      lastVisible < layout.length &&
      layout[lastVisible].top <= viewportBottom
    ) {
      lastVisible += 1;
    }
    const start = Math.max(0, firstVisible - LIST_OVERSCAN);
    const end = Math.min(layout.length, lastVisible + LIST_OVERSCAN);
    if (!force && start === this.visibleStart && end === this.visibleEnd) {
      return;
    }
    this.visibleStart = start;
    this.visibleEnd = end;
    const visibleEntries = layout.slice(start, end);
    const visibleRows = this.rows.reconcile(visibleEntries);
    visibleRows.forEach((row, index) => {
      const entry = visibleEntries[index];
      row.setBounds(
        0,
        entry.top,
        this.rowWidth,
        entry.height,
        this.rowHeight,
      );
    });
    this.layoutExpandedControl(layout);
  }

  toggleExpanded(key) {
    const nextKey = this.expandedKey === key ? null : key;
    this.startExpansion(nextKey);
    return true;
  }

  collapseExpanded({ immediate = false } = {}) {
    if (this.expandedKey === null && this.outgoingKey === null) {
      return false;
    }
    if (immediate) {
      this.cancelExpansion();
      this.expandedKey = null;
      this.outgoingKey = null;
      this.incomingStartFraction = 0;
      this.outgoingStartFraction = 0;
      this.expansionProgress = 1;
      this.collapseControlProgress = 0;
      this.expandedControl?.bind(null);
      this.refreshContentHeight();
      this.renderWindow(true);
      return true;
    }
    this.startExpansion(null);
    return true;
  }

  startExpansion(nextKey) {
    const previousKey = this.expandedKey;
    if (previousKey === nextKey && this.outgoingKey === null) {
      return;
    }
    const previousFraction =
      previousKey === null
        ? 0
        : this.expansionFractionFor(previousKey);
    const nextFraction =
      nextKey === null ? 0 : this.expansionFractionFor(nextKey);
    this.cancelExpansion();
    this.outgoingKey =
      previousKey !== nextKey ? previousKey : null;
    this.outgoingStartFraction = previousFraction;
    this.expandedKey = nextKey;
    this.incomingStartFraction = nextFraction;
    this.expansionProgress = 0;
    this.collapseControlProgress = 0;
    this.expansionStartedAt = null;
    this.syncExpandedControl();

    if (this.reducedMotion?.()) {
      this.finishExpansion();
      return;
    }

    this.refreshContentHeight();
    this.renderWindow(true);
    this.scrollExpandedRowIntoView();
    this.expansionFrame = this.requestFrame((timestamp) =>
      this.tickExpansion(timestamp),
    );
  }

  tickExpansion(timestamp) {
    this.expansionFrame = null;
    const now = Number.isFinite(timestamp)
      ? timestamp
      : this.timeSource();
    if (this.expansionStartedAt === null) {
      this.expansionStartedAt = now;
    }
    const linearProgress = Math.min(
      1,
      Math.max(
        0,
        (now - this.expansionStartedAt) /
          SETTINGS_ROW_EXPANSION_DURATION_MS,
      ),
    );
    const sequencedCollapse = this.isSequencedCollapse();
    const rowProgress = sequencedCollapse
      ? clamp01(
          (linearProgress - SETTINGS_ROW_COLLAPSE_CONTROL_HIDE_FRACTION) /
            (1 - SETTINGS_ROW_COLLAPSE_CONTROL_HIDE_FRACTION),
        )
      : linearProgress;
    this.expansionProgress = easeOutQuart(rowProgress);
    this.collapseControlProgress = sequencedCollapse
      ? easeOutQuart(
          clamp01(
            linearProgress /
              SETTINGS_ROW_COLLAPSE_CONTROL_HIDE_FRACTION,
          ),
        )
      : 0;
    this.refreshContentHeight();
    this.renderWindow(true);
    this.scrollExpandedRowIntoView();

    if (linearProgress >= 1) {
      this.finishExpansion();
      return;
    }
    this.expansionFrame = this.requestFrame((nextTimestamp) =>
      this.tickExpansion(nextTimestamp),
    );
  }

  finishExpansion() {
    this.cancelExpansion();
    this.outgoingKey = null;
    this.outgoingStartFraction = 0;
    this.incomingStartFraction =
      this.expandedKey === null ? 0 : 1;
    this.expansionProgress = 1;
    this.collapseControlProgress = 0;
    this.syncExpandedControl();
    this.refreshContentHeight();
    this.renderWindow(true);
    this.scrollExpandedRowIntoView();
  }

  cancelExpansion() {
    if (this.expansionFrame !== null) {
      this.cancelFrame(this.expansionFrame);
    }
    this.expansionFrame = null;
    this.expansionStartedAt = null;
  }

  isSequencedCollapse() {
    return this.expandedKey === null && this.outgoingKey !== null;
  }

  createLayout() {
    let top = this.contentPaddingTop;
    return this.items.map((item, index) => {
      const height = this.rowHeight + this.expansionHeightFor(
        item.__virtualKey,
      );
      const entry = {
        item: {
          ...item,
          action: item.dropSlider
            ? () => this.toggleExpanded(item.__virtualKey)
            : item.action,
          expanded: item.__virtualKey === this.expandedKey,
        },
        index,
        top,
        height,
      };
      top += height;
      return entry;
    });
  }

  scrollExpandedRowIntoView() {
    if (this.expandedKey === null) {
      return false;
    }

    const entry = this.createLayout().find(
      (candidate) => candidate.item.__virtualKey === this.expandedKey,
    );
    if (!entry) {
      return false;
    }

    return this.scroll.scrollRectIntoView({
      y: entry.top,
      height: entry.height,
    });
  }

  navigateToTarget(targetId, { indication = 'boink' } = {}) {
    const target = String(targetId ?? '').trim();
    const entry = this.createLayout().find(
      (candidate) => candidate.item.semanticId === target,
    );
    if (!entry) {
      return false;
    }

    this.scroll.scrollTo(
      entry.top - Math.max(0, (this.height - entry.height) / 2),
    );
    this.renderWindow(true);
    const row = this.rows
      .getWidgets()
      .find((candidate) => candidate.semanticId === target);
    if (!row) {
      return false;
    }
    if (indication === 'boink') {
      row.startAttentionEffect?.();
    }
    return true;
  }

  expansionHeightFor(key) {
    return (
      SETTINGS_ROW_EXPANSION_HEIGHT *
      this.expansionFractionFor(key)
    );
  }

  expansionFractionFor(key) {
    let fraction = 0;
    if (key === this.expandedKey) {
      fraction +=
        this.incomingStartFraction +
        (1 - this.incomingStartFraction) *
          this.expansionProgress;
    }
    if (key === this.outgoingKey) {
      fraction +=
        this.outgoingStartFraction *
        (1 - this.expansionProgress);
    }
    return fraction;
  }

  refreshContentHeight() {
    const contentHeight = this.items.reduce(
      (height, item) =>
        height +
        this.rowHeight +
        this.expansionHeightFor(item.__virtualKey),
      this.contentPaddingTop,
    );
    this.scroll.setContentHeight(contentHeight);
  }

  syncExpandedControl() {
    if (!this.expandedControl) {
      return;
    }
    const controlKey = this.expandedKey ?? this.outgoingKey;
    const item = this.items.find(
      (candidate) => candidate.__virtualKey === controlKey,
    );
    this.expandedControl.bind(item?.dropSlider ?? null);
  }

  layoutExpandedControl(layout) {
    if (!this.expandedControl) {
      return;
    }
    const controlKey = this.expandedKey ?? this.outgoingKey;
    const entry = layout.find(
      (candidate) => candidate.item.__virtualKey === controlKey,
    );
    if (!entry) {
      this.expandedControl.bind(null);
      return;
    }
    const visibility = this.expansionFractionFor(controlKey);
    const controlHeight = PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
    this.expandedControl.setBounds(
      8,
      entry.top +
        this.rowHeight +
        Math.max(
          0,
          (SETTINGS_ROW_EXPANSION_HEIGHT - controlHeight) / 2 -
            SETTINGS_ROW_EXPANDED_CONTROL_RAISE,
        ),
      Math.max(0, this.width - 22),
      controlHeight,
    );
    const controlWidth = Math.max(0, this.width - 22);
    const controlX = this.expandedControl.position.x;
    const controlY = this.expandedControl.position.y;
    const disclosureScale =
      controlKey === this.expandedKey
        ? sampleSettingsRowDisclosureScale(
            this.incomingStartFraction +
              (1 - this.incomingStartFraction) *
                this.expansionProgress,
          )
        : 1 -
          (1 - SETTINGS_ROW_DISCLOSURE_START_SCALE) *
            (this.isSequencedCollapse()
              ? this.collapseControlProgress
              : easeOutQuart(this.expansionProgress));
    const disclosureAlpha = this.isSequencedCollapse()
      ? 1 - this.collapseControlProgress
      : 1;
    this.expandedControl.pivot.set(
      controlWidth / 2,
      controlHeight / 2,
    );
    this.expandedControl.position.set(
      controlX + controlWidth / 2,
      controlY + controlHeight / 2,
    );
    this.expandedControl.scale.set(disclosureScale);
    this.expandedControl.alpha = disclosureAlpha;
    this.expandedControl.visible =
      visibility > 0 && disclosureAlpha > 0;
    this.expandedControl.renderable = this.expandedControl.visible;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  destroy() {
    this.cancelExpansion();
    this.expandedControl?.removeFromParent?.();
    this.expandedControl?.bind(null);
    this.rows.destroy();
    this.rowPool.destroy();
    this.scroll.destroy();
  }
}

export { VirtualShopDialogList as RootRunInventoryChoiceList };

/**
 * Player-centered Market Ledger catalogue row.
 *
 * Trader stock is paired with the player's buy price, while buyer demand is
 * paired with the player's sell payout. The whole row keeps the existing
 * release-confirmed purchase action when a unit is actually buyable.
 */
export class MarketLedgerRowPixi extends ClickableWidget {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
    label = 'marketLedgerRow',
  } = {}) {
    super({
      enabled: false,
      inputRouter,
      label,
      motionRuntime: {
        cancelFrame,
        now: timeSource,
        prefersReducedMotion: reducedMotion,
        requestFrame,
      },
      pressScale: SETTINGS_ROW_PRESS_SCALE,
      releaseDurationMs: SETTINGS_ROW_RELEASE_DURATION_MS,
      releasePeakScale: SETTINGS_ROW_RELEASE_PEAK_SCALE,
    });
    this.visual = new Container({ label: `${label}:visual` });
    this.setClickableVisual(this.visual);
    this.assetManager = assetManager;
    this.background = new PixiNineSliceFrame({
      texture:
        assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${label}:background`,
    });
    this.background.eventMode = 'none';
    this.itemIcon = createItemSprite(`${label}:itemIcon`);
    this.itemIconOverlay = createItemSprite(`${label}:itemIconOverlay`);
    this.title = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.dialogTitleFontSize,
      fontWeight: 'bold',
      label: `${label}:title`,
    });
    this.stockKey = createLedgerFactKey(`${label}:stockKey`, 'Stock');
    this.stockValue = createLedgerFactValue(`${label}:stockValue`);
    this.buyKey = createLedgerFactKey(`${label}:buyKey`, 'Buy');
    this.buyValue = createLedgerFactValue(`${label}:buyValue`);
    this.buyResource = createLedgerPriceResource(
      assetManager,
      `${label}:buyResource`,
    );
    this.demandKey = createLedgerFactKey(
      `${label}:demandKey`,
      'Buyers',
    );
    this.demandValue = createLedgerFactValue(`${label}:demandValue`);
    this.sellKey = createLedgerFactKey(`${label}:sellKey`, 'Sell');
    this.sellValue = createLedgerFactValue(`${label}:sellValue`);
    this.sellResource = createLedgerPriceResource(
      assetManager,
      `${label}:sellResource`,
    );
    this.availability = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'disabled',
      label: `${label}:availability`,
    });
    this.availabilityStars = new PixiStarLevelLabel({
      assetManager,
      size: 8,
      gap: 0,
      label: `${label}:availabilityStars`,
    });
    this.visual.addChild(
      this.background,
      this.itemIcon,
      this.itemIconOverlay,
      this.title,
      this.stockKey,
      this.stockValue,
      this.buyKey,
      this.buyValue,
      this.buyResource,
      this.demandKey,
      this.demandValue,
      this.sellKey,
      this.sellValue,
      this.sellResource,
      this.availability,
      this.availabilityStars,
    );
    this.root.addChild(this.visual);
    this.semanticRegistry = semanticRegistry;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.disabled = false;
    this.width = 0;
    this.height = 0;
  }

  bind(key, item = {}) {
    this.unregisterSemantic();
    this.key = key;
    this.item = item;
    this.root.visible = true;
    this.root.renderable = true;
    this.title.setText(item.label ?? item.text ?? '');
    this.stockValue.setText(item.stockLabel ?? '—');
    this.demandValue.setText(item.buyersLabel ?? item.demandLabel ?? '—');
    this.disabled = item.disabled === true;
    this.action = item.action ?? item.onActivate ?? null;
    this.enabled = item.enabled !== false && !this.disabled;
    this.availability
      .setText(item.availabilityLabel ?? 'Not traded in this market');
    this.availability.visible = this.disabled;
    this.availability.renderable = this.disabled;
    this.availabilityStars.setLevel(item.requiredMarketRank ?? 0);
    this.availabilityStars.visible =
      this.disabled && this.availabilityStars.level > 0;
    this.availabilityStars.renderable = this.availabilityStars.visible;
    this.availabilityStars.alpha = 0.68;
    this.setFactsVisible(!this.disabled);
    bindLedgerPrice({
      disabled: this.disabled,
      resource: this.buyResource,
      resourceKey: item.buyPriceResourceKey,
      text: this.buyValue,
      value: item.buyPriceLabel ?? item.value ?? 'Unavailable',
    });
    bindLedgerPrice({
      disabled: this.disabled,
      resource: this.sellResource,
      resourceKey: item.sellPriceResourceKey,
      text: this.sellValue,
      value: item.sellPriceLabel ?? 'Unavailable',
    });
    const iconFrames = resolveItemIconFrames(item);
    bindItemSprite(
      this.itemIcon,
      this.assetManager,
      iconFrames.base,
      iconFrames.texture,
    );
    bindItemSprite(
      this.itemIconOverlay,
      this.assetManager,
      iconFrames.overlay,
    );
    const itemAlpha = this.disabled ? 0.42 : 1;
    this.itemIcon.alpha = itemAlpha;
    this.itemIconOverlay.alpha = itemAlpha;
    this.applyTheme(this.theme);
    this.syncClickableInteraction();
    this.semanticId = item.semanticId ?? null;
    if (this.semanticId && this.semanticRegistry) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId: item.tutorialId ?? null,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) => this.action?.(payload),
      });
    }
    this.relayout();
  }

  setFactsVisible(visible) {
    for (const displayObject of [
      this.stockKey,
      this.stockValue,
      this.buyKey,
      this.buyValue,
      this.buyResource,
      this.demandKey,
      this.demandValue,
      this.sellKey,
      this.sellValue,
      this.sellResource,
    ]) {
      displayObject.visible = visible;
      displayObject.renderable = visible;
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    this.root.hitArea = new Rectangle(0, 0, this.width, this.height);
    this.visual.pivot.set(this.width / 2, this.height / 2);
    this.visual.position.set(this.width / 2, this.height / 2);
    this.relayout();
  }

  relayout() {
    if (!this.width || !this.height) {
      return;
    }
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const backgroundWidth = Math.max(0, this.width - rowGap);
    const backgroundHeight = Math.max(0, this.height - rowGap);
    const backgroundY = rowGap / 2;
    const padding = 7;
    const iconSize = resolveItemIconSize(
      this.item,
      LEDGER_ITEM_ICON_SIZE,
      LEDGER_POTION_ICON_SIZE,
    );
    const contentLeft = padding + iconSize + 7;
    const contentRight = Math.max(contentLeft, backgroundWidth - padding);
    const columnGap = 8;
    const columnWidth = Math.max(
      0,
      (contentRight - contentLeft - columnGap) / 2,
    );
    const secondColumnX = contentLeft + columnWidth + columnGap;
    const titleY = 4;
    const firstFactY = 23;
    const secondFactY = 39;

    this.background.position.set(0, backgroundY);
    this.background.setSize(
      backgroundWidth,
      backgroundHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    setSeedPackCompositeBounds(
      this.itemIcon,
      this.itemIconOverlay,
      padding + iconSize / 2,
      backgroundY + backgroundHeight / 2,
      iconSize,
      0,
    );
    this.title.position.set(contentLeft, titleY);
    this.title.setWrapWidth(Math.max(0, contentRight - contentLeft));
    this.availability.position.set(contentLeft, 28);
    const availabilityStarGap = this.availabilityStars.visible ? 4 : 0;
    const availabilityStarsWidth = this.availabilityStars.visible
      ? this.availabilityStars.measuredWidth
      : 0;
    const availabilityTextWidth = Math.max(
      0,
      contentRight -
        contentLeft -
        availabilityStarGap -
        availabilityStarsWidth,
    );
    this.availability.setWrapWidth(availabilityTextWidth);
    this.availabilityStars.position.set(
      contentLeft +
        Math.min(this.availability.measuredWidth, availabilityTextWidth) +
        availabilityStarGap,
      30,
    );
    layoutLedgerFact(
      this.stockKey,
      this.stockValue,
      contentLeft,
      firstFactY,
      columnWidth,
    );
    layoutLedgerFact(
      this.demandKey,
      this.demandValue,
      contentLeft,
      secondFactY,
      columnWidth,
    );
    layoutLedgerPrice(
      this.buyKey,
      this.buyValue,
      this.buyResource,
      secondColumnX,
      firstFactY,
      columnWidth,
    );
    layoutLedgerPrice(
      this.sellKey,
      this.sellValue,
      this.sellResource,
      secondColumnX,
      secondFactY,
      columnWidth,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    for (const label of [
      this.title,
      this.stockKey,
      this.stockValue,
      this.buyKey,
      this.buyValue,
      this.demandKey,
      this.demandValue,
      this.sellKey,
      this.sellValue,
      this.availability,
    ]) {
      label.applyTheme(this.theme);
    }
    this.buyResource.applyTheme(this.theme);
    this.sellResource.applyTheme(this.theme);
    const primaryColor = resolveThemeColor(
      this.disabled ? 'disabled' : 'text',
    );
    const secondaryColor = resolveThemeColor(
      this.disabled ? 'disabled' : 'muted',
    );
    this.title.setColor(primaryColor);
    this.stockValue.setColor(primaryColor);
    this.demandValue.setColor(primaryColor);
    this.stockKey.setColor(secondaryColor);
    this.buyKey.setColor(secondaryColor);
    this.demandKey.setColor(secondaryColor);
    this.sellKey.setColor(secondaryColor);
    this.availability.setColor(secondaryColor);
    this.background.alpha = this.disabled ? 0.58 : 1;
  }

  reset() {
    this.unregisterSemantic();
    this.resetClickableState();
    this.item = null;
    this.key = null;
    this.disabled = false;
    this.itemIcon.texture = Texture.EMPTY;
    this.itemIcon.visible = false;
    this.itemIconOverlay.texture = Texture.EMPTY;
    this.itemIconOverlay.visible = false;
    this.buyResource.visible = false;
    this.buyResource.renderable = false;
    this.sellResource.visible = false;
    this.sellResource.renderable = false;
    this.availabilityStars.setLevel(0);
    this.availabilityStars.visible = false;
    this.availabilityStars.renderable = false;
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
    super.destroy({ children: true });
  }
}

export class RootRunInventoryChoiceRowPixi extends ClickableWidget {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    useSettingsStyle = false,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
    pressSlop = null,
    label,
  }) {
    super({
      enabled: false,
      inputRouter,
      label,
      motionRuntime: {
        cancelFrame,
        now: timeSource,
        prefersReducedMotion: reducedMotion,
        requestFrame,
      },
      pressSlop,
      pressScale: SETTINGS_ROW_PRESS_SCALE,
      releaseDurationMs: SETTINGS_ROW_RELEASE_DURATION_MS,
      releasePeakScale: SETTINGS_ROW_RELEASE_PEAK_SCALE,
    });
    this.visual = new Container({
      label: `${label}:visual`,
    });
    this.setClickableVisual(this.visual);
    this.assetManager = assetManager;
    this.useSettingsStyle = useSettingsStyle;
    this.background = useSettingsStyle
      ? new PixiNineSliceFrame({
          texture:
            assetManager?.getTexture?.(
              PIXI_ROOT_RUN_ASSETS.settingsRow,
            ) ?? Texture.EMPTY,
          sourceInsets:
            PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
          borderInsets:
            PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
          label: `${label}:background`,
        })
      : new Graphics({
          label: `${label}:background`,
        });
    this.background.eventMode = 'none';
    this.itemIcon = createItemSprite(`${label}:itemIcon`);
    this.itemIconOverlay = createItemSprite(
      `${label}:itemIconOverlay`,
    );
    this.selectedIndicator = createItemSprite(
      `${label}:selectedIndicator`,
    );
    this.selectedIndicator.texture =
      assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.checkmark) ??
      Texture.EMPTY;
    this.label = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.dialogTitleFontSize,
      label: `${label}:label`,
    });
    this.detail = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      color: 'muted',
      label: `${label}:detail`,
    });
    this.value = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.valueResource = new PixiResourceLabel({
      assetManager,
      resource: 'coin',
      includeResourceName: false,
      label: `${label}:valueResource`,
    });
    this.valueResource.visible = false;
    this.valueResource.renderable = false;
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label = `${label}:notification`;
    this.visual.addChild(
      this.background,
      this.itemIcon,
      this.itemIconOverlay,
      this.label,
      this.detail,
      this.value,
      this.valueResource,
      this.selectedIndicator,
      this.notificationBadge.root,
    );
    this.root.addChild(this.visual);
    this.semanticRegistry = semanticRegistry;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.action = null;
    this.enabled = false;
    this.selected = false;
    this.expanded = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
  }

  bind(key, item) {
    this.unregisterSemantic();
    this.registration?.update?.({
      fallbackHitTest: Boolean(item.tutorialId),
    });
    this.key = key;
    this.item = item;
    this.root.visible = true;
    this.root.renderable = true;
    this.label
      .setText(item.label ?? item.text ?? '')
      .setFontWeight(
        item.heading || (!this.useSettingsStyle && item.selected)
          ? 'bold'
          : 'normal',
      );
    this.detail.setText(item.detail ?? item.secondary ?? '');
    this.detail.visible = Boolean(item.detail ?? item.secondary);
    this.value.setText(item.value ?? item.actionLabel ?? '');
    const valueIconResourceKey = item.valueIconResourceKey ?? null;
    this.value.visible = !valueIconResourceKey;
    this.value.renderable = this.value.visible;
    this.valueResource.visible = Boolean(valueIconResourceKey);
    this.valueResource.renderable = this.valueResource.visible;
    if (valueIconResourceKey) {
      this.valueResource.bind(key, {
        resource: valueIconResourceKey,
        amount: stripDialogResourceName(
          item.value ?? item.actionLabel ?? '',
          valueIconResourceKey,
        ),
        includeResourceName: false,
      });
    }
    this.notificationBadge.bind(key, {
      active: item.notification === true,
      tone: item.notificationTone ?? 'red',
      parent: this.visual,
      bounds: createBounds(),
    });
    this.enabled = item.enabled !== false && item.disabled !== true;
    this.selected = item.selected === true;
    this.expanded = item.expanded === true;
    this.action = item.action ?? item.onActivate ?? null;
    const iconFrames = resolveItemIconFrames(item);
    bindItemSprite(
      this.itemIcon,
      this.assetManager,
      iconFrames.base,
    );
    bindItemSprite(
      this.itemIconOverlay,
      this.assetManager,
      iconFrames.overlay,
    );
    const visuallyLocked = item.locked === true;
    this.itemIcon.alpha = this.enabled && !visuallyLocked ? 1 : 0.45;
    this.itemIconOverlay.alpha = this.enabled && !visuallyLocked ? 1 : 0.45;
    this.selectedIndicator.visible = this.selected;
    this.selectedIndicator.renderable = this.selected;
    this.selectedIndicator.alpha = this.enabled ? 1 : 0.45;
    this.syncClickableInteraction();
    this.label.setColor(
      resolveThemeColor(
        item.disabled || visuallyLocked
          ? 'disabled'
          : item.itemKind
            ? 'text'
            : item.resourceKey ?? 'text',
      ),
    );
    this.value.setColor(
      resolveThemeColor(
        item.disabled || visuallyLocked
          ? 'disabled'
          : item.valueTone
            ? resolveProgressToneText(item.valueTone)
          : item.valueResourceKey ?? 'text',
      ),
    );
    this.value.setStroke(
      item.disabled ? null : resolveProgressToneTextStroke(item.valueTone),
    );
    this.valueResource.applyTheme(this.theme);
    this.semanticId = item.semanticId ?? null;
    if (this.semanticId && this.semanticRegistry) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        tutorialId: item.tutorialId ?? null,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          expanded: this.expanded,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) => this.action?.(payload),
      });
    }
    this.redraw();
  }

  setBounds(x, y, width, height, summaryHeight = height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.summaryHeight = summaryHeight;
    this.visual.pivot.set(width / 2, summaryHeight / 2);
    this.visual.position.set(width / 2, summaryHeight / 2);
    this.root.hitArea = new Rectangle(0, 0, width, summaryHeight);
    const hasDetail = this.detail.visible;
    const valueWidth = this.getValueLayoutWidth();
    if (!this.useSettingsStyle) {
      const hasItemIcon = this.itemIcon.visible;
      const itemIconSize = resolveItemIconSize(
        this.item,
        INVENTORY_CHOICE_ITEM_ICON_SIZE,
        INVENTORY_CHOICE_POTION_ICON_SIZE,
      );
      const contentLeft = hasItemIcon ? itemIconSize + 6 : 0;
      if (hasItemIcon) {
        setSeedPackCompositeBounds(
          this.itemIcon,
          this.itemIconOverlay,
          itemIconSize / 2,
          summaryHeight / 2,
          itemIconSize,
          0,
        );
      }
      this.label.position.set(
        contentLeft,
        hasDetail ? 2 : Math.max(1, (summaryHeight - 16) / 2),
      );
      this.label.setWrapWidth(
        Math.max(
          0,
          width - contentLeft - valueWidth - 8,
        ),
      );
      this.detail.position.set(contentLeft, 20);
      this.detail.setWrapWidth(Math.max(0, width - contentLeft));
      this.value.position.set(
        width - 2,
        hasDetail ? 2 : Math.max(1, (summaryHeight - 16) / 2),
      );
      this.valueResource.position.set(
        width - 2 - this.valueResource.measuredWidth,
        hasDetail ? 2 : Math.max(1, (summaryHeight - 16) / 2),
      );
      this.notificationBadge.placeInsideTopRight(
        { x: 0, y: 0, width, height: summaryHeight },
        0,
      );
      this.redraw();
      return;
    }

    const hasItemIcon = this.itemIcon.visible;
    const itemIconSize = resolveItemIconSize(
      this.item,
      INVENTORY_CHOICE_ITEM_ICON_SIZE,
      INVENTORY_CHOICE_POTION_ICON_SIZE,
    );
    const rowPadding = PIXI_ROOT_RUN_GEOMETRY.settings.rowPadding;
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const backgroundWidth = Math.max(0, width - rowGap);
    const backgroundHeight = Math.max(0, height - rowGap);
    const backgroundY = rowGap / 2;
    this.background.position.set(0, backgroundY);
    this.background.setSize(
      backgroundWidth,
      backgroundHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    const iconCenterX =
      rowPadding + itemIconSize / 2;
    const contentLeft = hasItemIcon
      ? rowPadding + itemIconSize + rowPadding
      : rowPadding;
    const contentRight = Math.max(
      contentLeft,
      backgroundWidth - rowPadding,
    );
    const valueRight = contentRight;
    const valueY = Math.max(1, (summaryHeight - 16) / 2);
    if (hasItemIcon) {
      setSeedPackCompositeBounds(
        this.itemIcon,
        this.itemIconOverlay,
        iconCenterX,
        summaryHeight / 2,
        itemIconSize,
        0,
      );
    }
    if (this.selectedIndicator.visible) {
      setItemSpriteBounds(
        this.selectedIndicator,
        this.background.x + this.background.frameWidth / 2,
        summaryHeight / 2,
        STALL_SELECTED_CHECK_SIZE,
      );
    }
    this.label.position.set(
      contentLeft,
      hasDetail ? 7 : Math.max(1, (summaryHeight - 16) / 2),
    );
    this.label.setWrapWidth(
      Math.max(
        0,
        valueRight -
          contentLeft -
          valueWidth -
          8,
      ),
    );
    this.detail.position.set(contentLeft, 26);
    this.detail.setWrapWidth(
      Math.max(0, valueRight - contentLeft),
    );
    this.value.position.set(
      valueRight,
      valueY,
    );
    this.valueResource.position.set(
      valueRight - this.valueResource.measuredWidth,
      valueY,
    );
    this.notificationBadge.placeInsideTopRight(
      {
        x: this.background.x,
        y: this.background.y,
        width: backgroundWidth,
        height: backgroundHeight,
      },
      0,
    );
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.label.applyTheme(this.theme);
    this.detail.applyTheme(this.theme);
    this.value.applyTheme(this.theme);
    this.valueResource.applyTheme(this.theme);
    this.notificationBadge.applyTheme(this.theme);
    this.redraw();
  }

  getValueLayoutWidth() {
    return this.valueResource.visible
      ? this.valueResource.measuredWidth
      : this.value.measuredWidth;
  }

  redraw() {
    if (!this.useSettingsStyle) {
      this.background.clear();
      if (!this.selected && !this.pressed) {
        return;
      }
      this.background
        .rect(0, 0, this.width ?? 0, this.height ?? 0)
        .fill({
          color: this.theme.stroke,
          alpha: this.selected ? 0.34 : 0.18,
        });
      return;
    }
    this.background.alpha = 1;
  }

  reset() {
    this.unregisterSemantic();
    this.registration?.update?.({ fallbackHitTest: false });
    this.item = null;
    this.key = null;
    this.resetClickableState();
    this.selected = false;
    this.expanded = false;
    this.itemIcon.texture = Texture.EMPTY;
    this.itemIcon.visible = false;
    this.itemIconOverlay.texture = Texture.EMPTY;
    this.itemIconOverlay.visible = false;
    this.selectedIndicator.visible = false;
    this.selectedIndicator.renderable = false;
    this.valueResource.visible = false;
    this.valueResource.renderable = false;
    this.notificationBadge.reset();
    this.root.visible = false;
    this.root.renderable = false;
    if (this.useSettingsStyle) {
      this.background.alpha = 1;
    } else {
      this.background.clear();
    }
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
    super.destroy({ children: true });
  }
}

/**
 * Summoning Seeds row with a dedicated weight button in the right value slot.
 * The row body is passive. Only the nested weight button owns disclosure,
 * press/release motion, sound, and haptics.
 */
export class SummonSeedPreferenceRowPixi extends RootRunInventoryChoiceRowPixi {
  constructor(options = {}) {
    super(options);
    if (typeof this.registration === 'function') {
      this.registration();
    } else {
      this.registration?.unregister?.();
    }
    this.registration = null;
    this.syncClickableInteraction();
    this.preferenceButton = new PixiTextButton({
      assetManager: options.assetManager,
      inputRouter: options.inputRouter,
      width: SUMMON_SEED_PREFERENCE_BUTTON_WIDTH,
      height: SUMMON_SEED_PREFERENCE_BUTTON_HEIGHT,
      sizeTier: 15,
      variant: 'brown',
      label: `${options.label}:preferenceButton`,
    });
    this.visual.addChild(this.preferenceButton);
  }

  bind(key, item) {
    super.bind(key, item);
    this.value.visible = false;
    this.value.renderable = false;
    this.valueResource.visible = false;
    this.valueResource.renderable = false;
    this.preferenceButton.bind(
      key,
      {
        label: item.value ?? item.actionLabel ?? '',
        enabled: this.enabled,
        variant: resolveSeedPreferenceButtonColor(item),
      },
      this.action,
    );
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
      this.semanticDefinition = this.semanticRegistry?.register?.({
        semanticId: this.semanticId,
        tutorialId: item.tutorialId ?? null,
        displayObject: this.preferenceButton,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
          expanded: this.expanded,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: (payload) => this.action?.(payload),
      }) ?? null;
    }
  }

  setBounds(x, y, width, height, summaryHeight = height) {
    super.setBounds(x, y, width, height, summaryHeight);
    const rowPadding = PIXI_ROOT_RUN_GEOMETRY.settings.rowPadding;
    const backgroundRight =
      this.background.x + this.background.frameWidth - rowPadding;
    this.preferenceButton.position.set(
      backgroundRight - SUMMON_SEED_PREFERENCE_BUTTON_WIDTH,
      Math.max(0, (summaryHeight - SUMMON_SEED_PREFERENCE_BUTTON_HEIGHT) / 2),
    );
  }

  getValueLayoutWidth() {
    return SUMMON_SEED_PREFERENCE_BUTTON_WIDTH;
  }

  syncClickableInteraction() {
    this.root.eventMode = 'passive';
    this.root.cursor = 'default';
    if (this.pressed) {
      this.setPressed(false);
    }
    return this;
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.preferenceButton ?? this.root,
      });
    }
    this.semanticDefinition = null;
    this.semanticId = null;
  }

  setPressed(pressed) {
    this.cancelReleaseAnimation();
    this.pressed = Boolean(pressed) && this.isClickableEnabled();
    this.clickableVisual.scale.set(1);
    return this;
  }

  applyTheme(theme) {
    super.applyTheme(theme);
    this.preferenceButton.applyTheme(this.theme);
  }

  reset() {
    super.reset();
    this.preferenceButton.reset();
  }
}

function normalizeDialogModel(dialogId, viewModel = {}) {
  const model = viewModel ?? {};
  const items = safeArray(model.items ?? model.rows ?? model.list);
  const fields = safeArray(model.fields);
  const summaryRows = safeArray(model.summaryRows ?? model.summary);
  const actions = safeArray(model.actions);
  const tabs = safeArray(model.tabs);

  if (dialogId === SHOP_DIALOG_IDS.SUPPORT) {
    return {
      ...model,
      message:
        model.message ??
        'Thank you for trying to support the project but the transactions are not yet available <3',
      items: [],
      fields: [],
      summaryRows: [],
      actions: [],
      tabs: [],
    };
  }

  return {
    ...model,
    items,
    fields,
    summaryRows,
    actions,
    tabs,
    range: model.range ?? model.allocation ?? null,
    amount: model.amount ?? model.quantityControl ?? null,
  };
}

function createLedgerFactKey(label, text) {
  return new PixiTextLabel({
    text,
    fontSize: PIXI_UI_GEOMETRY.tinyFontSize,
    lineHeight: PIXI_UI_GEOMETRY.tinyLineHeight,
    color: 'muted',
    label,
  });
}

function createLedgerFactValue(label) {
  return new PixiTextLabel({
    fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
    lineHeight: PIXI_UI_GEOMETRY.borderLabelLineHeight,
    anchor: { x: 1, y: 0 },
    label,
  });
}

function createLedgerPriceResource(assetManager, label) {
  const resource = new PixiResourceLabel({
    assetManager,
    resource: 'coin',
    fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
    includeResourceName: false,
    label,
  });
  resource.visible = false;
  resource.renderable = false;
  return resource;
}

function bindLedgerPrice({
  disabled,
  resource,
  resourceKey,
  text,
  value,
}) {
  if (disabled) {
    text.visible = false;
    text.renderable = false;
    resource.visible = false;
    resource.renderable = false;
    return;
  }
  const hasResource = Boolean(resourceKey);
  text.setText(value);
  text.setColor(hasResource ? 'text' : 'disabled');
  text.visible = !hasResource;
  text.renderable = !hasResource;
  resource.visible = hasResource;
  resource.renderable = hasResource;
  if (hasResource) {
    resource.bind(resource.label, {
      resource: resourceKey,
      amount: stripDialogResourceName(value, resourceKey),
      includeResourceName: false,
    });
  }
}

function layoutLedgerFact(key, value, x, y, width) {
  key.position.set(x, y);
  value.position.set(x + width, y - 1);
}

function layoutLedgerPrice(key, text, resource, x, y, width) {
  key.position.set(x, y);
  text.position.set(x + width, y - 1);
  resource.position.set(x + width - resource.measuredWidth, y - 1);
}

function stripDialogResourceName(value, resource) {
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

function createBounds() {
  return { x: 0, y: 0, width: 0, height: 0 };
}

function createItemSprite(label) {
  const sprite = new Sprite({
    texture: Texture.EMPTY,
    label,
    roundPixels: true,
  });
  sprite.anchor.set(0.5);
  sprite.visible = false;
  return sprite;
}

function bindItemSprite(
  sprite,
  assetManager,
  frameName,
  textureId = null,
) {
  sprite.texture = textureId
    ? assetManager?.getTexture?.(textureId) ?? Texture.EMPTY
    : frameName
      ? assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY
      : Texture.EMPTY;
  sprite.visible = Boolean(textureId || frameName);
  sprite.renderable = sprite.visible;
}

function setItemSpriteBounds(sprite, x, y, size) {
  sprite.position.set(x, y);
  sprite.width = size;
  sprite.height = size;
}

function setSeedPackCompositeBounds(
  base,
  overlay,
  x,
  y,
  size,
  fitPositionX = 0.5,
) {
  if (!overlay.visible) {
    setItemSpriteBounds(base, x, y, size);
    overlay.rotation = 0;
    return;
  }
  layoutPixiSeedPackIcon({
    base,
    item: overlay,
    x,
    y,
    width: size,
    height: size,
    fitPositionX,
  });
}

function resolveItemIconFrames(model = {}) {
  const itemKind = String(
    model.itemKind ?? model.icon?.kind ?? '',
  ).toLowerCase();
  const itemKey = model.itemKey ?? model.key ?? model.icon?.key;
  if (itemKind === 'seed') {
    return {
      base: getSeedPackBaseFrameName(model),
      overlay: getSeedPackItemFrameName({
        key: itemKey,
        label: model.label ?? model.value,
      }),
    };
  }
  if (itemKind === 'herb') {
    return {
      base: getHerbIconFrameName(itemKey),
      overlay: null,
    };
  }
  if (itemKind === 'potion') {
    return {
      base: getPotionIconFrameName(itemKey),
      overlay: null,
    };
  }
  if (itemKind === 'ingredient') {
    return {
      base: getIngredientIconFrameName(itemKey),
      overlay: null,
    };
  }
  if (itemKind === 'resource' || model.resourceKey) {
    const resourceKey = model.resourceKey ?? itemKey;
    return {
      base: resourceKey ? `resource:${resourceKey}` : null,
      overlay: null,
    };
  }
  if (itemKind === 'automation') {
    return {
      base: null,
      overlay: null,
      texture: AUTOMATION_COG_TEXTURE_ID,
      aspectRatio:
        PIXI_ROOT_RUN_GEOMETRY.settings.gearAspectRatio,
    };
  }
  return { base: null, overlay: null, texture: null };
}

function resolvePlayerCharacterTexture(assetManager, character) {
  const key = String(character ?? 'elara')
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]/g, '');
  try {
    return (
      assetManager?.getTexture?.(
        `source:assets/avatars/${key || 'elara'}.png`,
      ) ??
      assetManager?.getTexture?.('source:assets/avatars/elara.png') ??
      Texture.EMPTY
    );
  } catch {
    return Texture.EMPTY;
  }
}

function normalizeAllianceTag(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 5);
}

function resolveAllianceTagColor(value) {
  const key = String(value ?? 'ink').trim().toLowerCase();
  return PLAYER_MARKET_TAG_COLORS[key] ?? PLAYER_MARKET_TAG_COLORS.ink;
}

function fitPlayerMarketLabel(label, maxWidth) {
  label.scale.set(1);
  const width = Math.max(0, Number(maxWidth) || 0);
  if (width > 0 && label.measuredWidth > width) {
    label.scale.set(Math.max(0.78, width / label.measuredWidth));
  }
}

function resolveItemIconSize(model = {}, defaultSize, potionSize) {
  const itemKind = String(
    model.itemKind ?? model.icon?.kind ?? '',
  ).toLowerCase();
  return Math.max(
    1,
    finiteOr(
      model.iconSize,
      itemKind === 'potion' ? potionSize : defaultSize,
    ),
  );
}

function orderChildren(container, widgets) {
  const children = widgets.map((widget) => widget.root ?? widget);
  const retained = new Set(children);
  for (const child of [...container.children]) {
    if (!retained.has(child)) {
      container.removeChild(child);
    }
  }
  children.forEach((child, index) => {
    if (child.parent !== container) {
      container.addChildAt(child, index);
    } else if (container.getChildIndex(child) !== index) {
      container.setChildIndex(child, index);
    }
  });
}

function easeOutQuart(progress) {
  return 1 - (1 - progress) ** 4;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function sampleAutoSummonRevealScale(progress) {
  const safeProgress = Math.min(1, Math.max(0, progress));
  if (safeProgress <= AUTO_SUMMON_REVEAL_OVERSHOOT_PROGRESS) {
    const localProgress = easeOutCubic(
      safeProgress / AUTO_SUMMON_REVEAL_OVERSHOOT_PROGRESS,
    );
    return (
      AUTO_SUMMON_REVEAL_START_SCALE +
      (AUTO_SUMMON_REVEAL_OVERSHOOT_SCALE -
        AUTO_SUMMON_REVEAL_START_SCALE) *
        localProgress
    );
  }

  const localProgress = easeOutCubic(
    (safeProgress - AUTO_SUMMON_REVEAL_OVERSHOOT_PROGRESS) /
      (1 - AUTO_SUMMON_REVEAL_OVERSHOOT_PROGRESS),
  );
  return (
    AUTO_SUMMON_REVEAL_OVERSHOOT_SCALE +
    (1 - AUTO_SUMMON_REVEAL_OVERSHOOT_SCALE) *
      localProgress
  );
}

function sampleSettingsRowDisclosureScale(progress) {
  const safeProgress = Math.min(1, Math.max(0, progress));
  return (
    SETTINGS_ROW_DISCLOSURE_START_SCALE +
    (1 - SETTINGS_ROW_DISCLOSURE_START_SCALE) * safeProgress
  );
}

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(
    () => callback(defaultTimeSource()),
    16,
  );
}

function defaultCancelFrame(frame) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frame);
    return;
  }
  globalThis.clearTimeout(frame);
}

function defaultTimeSource() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function layoutButtons(buttons, x, y, width, height, gap) {
  if (buttons.length === 0) {
    return;
  }
  const availableWidth = Math.max(
    0,
    width - gap * (buttons.length - 1),
  );
  const weights = buttons.map((button) =>
    Math.max(0, finiteOr(button.layoutWeight, 1)),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursorX = x;
  buttons.forEach((button, index) => {
    const buttonWidth = availableWidth * (weights[index] / totalWeight);
    if (button.root && typeof button.setBounds === 'function') {
      button.setBounds(cursorX, y, buttonWidth, height);
    } else {
      button.position.set(cursorX, y);
      button.setSize(buttonWidth, height);
    }
    cursorX += buttonWidth + gap;
  });
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

function resolveProgressToneText(tone) {
  return (
    PIXI_PROGRESS_VISUALS.tones[tone]?.text ??
    PIXI_PROGRESS_VISUALS.tones[tone]?.fill ??
    tone
  );
}

function resolveProgressToneTextStroke(tone) {
  const color = PIXI_PROGRESS_VISUALS.tones[tone]?.textStroke;
  return color ? { color, width: 2 } : null;
}

function resolveSeedPreferenceButtonColor(item) {
  const preference = String(item?.dropSlider?.value ?? '').toLowerCase();
  if (preference === 'high') {
    return 'green';
  }
  if (preference === 'medium' || preference === 'normal') {
    return 'yellow';
  }
  if (preference === 'low') {
    return 'red';
  }
  return 'brown';
}
