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
import { PixiButton } from '../../primitives/PixiButton.js';
import {
  createDialogPaperSection,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  PixiDialogFrame,
  resolveDialogPaperOutsets,
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
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
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
  RETAINED_DIALOG_SCROLL_GEOMETRY,
  RetainedButton,
  RetainedScrollArea,
  resolveRetainedDialogListLayout,
} from '../workshop/RetainedPageKit.js';

export const SHOP_DIALOG_IDS = Object.freeze({
  STALL: 'shop.stall',
  LEDGER: 'shop.ledger',
  REQUEST: 'shop.request',
  LISTING: 'shop.listing',
  MARKET: 'shop.market',
  TRADE_HISTORY: 'shop.tradeHistory',
  SUPPORT: 'shop.support',
});

export const WORKSHOP_SUMMON_INFO_DIALOG_ID = 'workshop.summonInfo';

const AMOUNT_DELTAS = Object.freeze([-100, -10, -1, 1, 10, 100]);
const DEFAULT_DIALOG_WIDTH = 304;
const WIDE_DIALOG_WIDTH = 344;
const LEDGER_DIALOG_WIDTH = DEFAULT_DIALOG_WIDTH;
const DEFAULT_DIALOG_HEIGHT = 364;
const LEDGER_DIALOG_HEIGHT = 382;
const LEDGER_SCROLL_VIEWPORT_TOP = 20;
const LEDGER_SCROLL_VIEWPORT_BOTTOM_INSET = 10;
const LEDGER_TAB_ROW_WIDTH = 286;
const TAB_HEIGHT = 28;
const TAB_GAP = 3;
const SHELL_FOOTER_PAPER_GAP = 4;
const SHELL_FOOTER_BOTTOM_INSET = 6;
const SHELL_FOOTER_TAB_MIN_GAP = 4;
const SHELL_FOOTER_TAB_MAX_GAP = 10;
const SHELL_FOOTER_TAB_GAP_STEP = 2;
const SHELL_FOOTER_TAB_REFERENCE_COUNT = 5;
const CONTENT_GAP = 6;
const LIST_OVERSCAN = 2;
const STALL_RANGE_HORIZONTAL_OUTSET = 8;
const STALL_RANGE_Y = 31;
const STALL_RANGE_ACTION_GAP = 8;
const STALL_ACTION_HEIGHT = 26;
const STALL_ACTIONS_Y =
  STALL_RANGE_Y +
  PIXI_ROOT_RUN_GEOMETRY.settings.knobSize +
  STALL_RANGE_ACTION_GAP;
const STALL_SELECTION_BOTTOM_PADDING = 6;
const STALL_SELECTION_HEIGHT =
  STALL_ACTIONS_Y +
  STALL_ACTION_HEIGHT +
  STALL_SELECTION_BOTTOM_PADDING;
const STALL_ITEM_ICON_SIZE = 28;
const STALL_SELECTED_CHECK_SIZE = 18;
const AUTOMATION_COG_TEXTURE_ID = PIXI_ROOT_RUN_ASSETS.settingsGear;
const SETTINGS_ROW_EXPANSION_HEIGHT =
  PIXI_ROOT_RUN_GEOMETRY.settings.knobSize + 8;
const SETTINGS_ROW_EXPANDED_CONTROL_RAISE = 3;
const SETTINGS_ROW_EXPANSION_DURATION_MS = 240;
const SETTINGS_ROW_PRESS_SCALE = 0.97;
const SETTINGS_ROW_RELEASE_PEAK_SCALE = 1.035;
const SETTINGS_ROW_RELEASE_DURATION_MS = 180;
const SETTINGS_ROW_DISCLOSURE_START_SCALE = 0.92;
const SETTINGS_ROW_DISCLOSURE_PEAK_SCALE = 1.035;
const SETTINGS_ROW_DISCLOSURE_PEAK_PROGRESS = 0.62;
const AUTO_SUMMON_REVEAL_DURATION_MS = 240;
const AUTO_SUMMON_REVEAL_START_SCALE = 0.8;
const AUTO_SUMMON_REVEAL_OVERSHOOT_SCALE = 1.02;
const AUTO_SUMMON_REVEAL_OVERSHOOT_PROGRESS = 0.72;

const DIALOG_CONFIG = Object.freeze({
  [SHOP_DIALOG_IDS.STALL]: Object.freeze({
    title: 'Load Stall',
    width: DEFAULT_DIALOG_WIDTH,
    height: DEFAULT_DIALOG_HEIGHT,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
    tabsInShellFooter: true,
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
    rowHeight: 34,
    scrollViewportBottomInset:
      LEDGER_SCROLL_VIEWPORT_BOTTOM_INSET,
    scrollViewportTopInset: LEDGER_SCROLL_VIEWPORT_TOP,
    scrollViewportWidthOutset:
      RETAINED_DIALOG_SCROLL_GEOMETRY.scrollbarShiftRight,
    tabFontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
    tabRowWidth: LEDGER_TAB_ROW_WIDTH,
  }),
  [SHOP_DIALOG_IDS.REQUEST]: Object.freeze({
    title: 'request',
    width: DEFAULT_DIALOG_WIDTH,
    height: DEFAULT_DIALOG_HEIGHT,
    rowHeight: 34,
  }),
  [SHOP_DIALOG_IDS.LISTING]: Object.freeze({
    title: 'list item',
    width: DEFAULT_DIALOG_WIDTH,
    height: DEFAULT_DIALOG_HEIGHT,
    rowHeight: 34,
  }),
  [SHOP_DIALOG_IDS.MARKET]: Object.freeze({
    title: 'player market',
    width: WIDE_DIALOG_WIDTH,
    height: DEFAULT_DIALOG_HEIGHT,
    rowHeight: 48,
  }),
  [SHOP_DIALOG_IDS.TRADE_HISTORY]: Object.freeze({
    title: 'trade history',
    width: WIDE_DIALOG_WIDTH,
    height: DEFAULT_DIALOG_HEIGHT,
    rowHeight: 36,
  }),
  [SHOP_DIALOG_IDS.SUPPORT]: Object.freeze({
    title: 'support',
    width: DEFAULT_DIALOG_WIDTH,
    height: 126,
    rowHeight: 34,
  }),
  [WORKSHOP_SUMMON_INFO_DIALOG_ID]: Object.freeze({
    title: 'Summoning Seeds',
    width: DEFAULT_DIALOG_WIDTH,
    height: 382,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
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
      label: `${dialogId}:message`,
    });
    this.statusLabel = new PixiTextLabel({
      color: 'muted',
      align: 'center',
      label: `${dialogId}:status`,
    });
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
    this.fields = [
      new DialogField({
        assetManager,
        inputRouter,
        textEntryService,
        label: `${dialogId}:field:0`,
      }),
      new DialogField({
        assetManager,
        inputRouter,
        textEntryService,
        label: `${dialogId}:field:1`,
      }),
    ];
    for (const field of this.fields) {
      this.fieldLayer.addChild(field.root);
    }

    this.list = new VirtualShopDialogList({
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      rowHeight: config.rowHeight,
      useSettingsRows: usesSplitPaperSections,
      rubberPress:
        dialogId === WORKSHOP_SUMMON_INFO_DIALOG_ID,
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
            config.splitPaper?.leadingIconSize ?? 22,
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
          variant: config.actionVariant ?? 'yellow',
        }),
      reset: (button) =>
        button.setModel({ label: '', enabled: false }),
      dispose: (button) => button.destroy(),
      maxSize: 4,
    });
    this.actions = new PooledCollection({
      name: `${dialogId} actions`,
      pool: this.actionPool,
      counters,
      keyOf: (action, index) => action.id ?? index,
      bind: (button, action) => {
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
          this.config.tabFontSize ?? PIXI_UI_GEOMETRY.bodyFontSize,
        );
        this.registerButtonSemanticTarget(button, tab);
      },
      afterReconcile: (buttons) => orderChildren(this.tabLayer, buttons),
    });

    const bodyChildren = [
      this.selectionSection,
      this.itemSection,
      this.summaryLayer,
      this.messageLabel,
      this.rangeControl,
      this.settingsToggle,
      this.manaSettingsSlider,
      this.amountSelector.root,
      this.fieldLayer,
      this.list.root,
      this.actionLayer,
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
    this.summaryRows.reconcile(this.model.summaryRows);
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

    this.relayout();
    if (shouldRevealAutoSummon && this.active) {
      this.startAutoSummonReveal();
    }
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
    this.amountSelector?.applyTheme(contentTheme);
    this.rangeControl?.applyTheme(contentTheme);
    this.settingsToggle?.applyTheme(contentTheme);
    this.manaSettingsSlider?.applyTheme(contentTheme);
    this.dropSettingsSlider?.applyTheme(contentTheme);
    this.list?.applyTheme(contentTheme);

    for (const field of this.fields ?? []) {
      field.applyTheme(contentTheme);
    }
    for (const row of this.summaryRows?.getWidgets?.() ?? []) {
      row.applyTheme(contentTheme);
    }
    for (const button of this.actions?.getWidgets?.() ?? []) {
      button.applyTheme(contentTheme);
    }
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
    const panelHeight = this.config.height;
    const centerY = this.sourceHeight / 2;
    const tabsHeight =
      this.tabs?.getWidgets?.().length > 0 ? TAB_HEIGHT : 0;
    const tabsInShellFooter =
      tabsHeight > 0 && this.config.tabsInShellFooter === true;
    const shift = finiteOr(
      this.viewportProjection?.dialogShift,
      0,
    );
    const panelX = Math.round((this.sourceWidth - panelWidth) / 2);
    const panelY = Math.round(
      centerY -
        (panelHeight + (tabsInShellFooter ? 0 : tabsHeight)) / 2 +
        shift,
    );
    this.panel.position.set(panelX, panelY);

    const bodyWidth = this.panel.contentBoxWidth;
    const bodyHeight = this.panel.contentBoxHeight;
    if (this.config.splitPaper) {
      this.relayoutSplitSettings(bodyWidth, bodyHeight);
      this.relayoutTabs(panelHeight);
      this.redrawBackdrop();
      return;
    }

    this.selectionSection.visible = false;
    this.selectionSection.renderable = false;
    this.itemSection.visible = false;
    this.itemSection.renderable = false;
    let y = 0;

    for (const row of this.summaryRows?.getWidgets?.() ?? []) {
      row.setBounds(0, y, bodyWidth, PIXI_UI_GEOMETRY.rowMinHeight);
      y += PIXI_UI_GEOMETRY.rowMinHeight;
    }

    if (this.messageLabel.visible) {
      this.messageLabel.position.set(0, y);
      this.messageLabel.setWrapWidth(bodyWidth);
      y += Math.max(
        PIXI_UI_GEOMETRY.rowMinHeight,
        this.messageLabel.measuredHeight,
      );
      y += CONTENT_GAP;
    }

    if (this.rangeControl.visible) {
      this.rangeControl.setBounds(0, y, bodyWidth, 16);
      y += 16 + CONTENT_GAP;
    }

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
    const statusHeight = this.statusLabel.visible
      ? PIXI_UI_GEOMETRY.rowMinHeight
      : 0;
    const listHeight = Math.max(
      0,
      bodyHeight -
        y -
        (actionHeight > 0 ? actionHeight + CONTENT_GAP : 0) -
        statusHeight -
        finiteOr(this.config.scrollViewportBottomInset, 0),
    );
    this.list.setBounds(
      0,
      y,
      bodyWidth + finiteOr(this.config.scrollViewportWidthOutset, 0),
      listHeight,
      bodyWidth,
    );
    this.list.root.visible = this.model.items.length > 0;
    this.list.root.renderable = this.list.root.visible;

    let bottomY = bodyHeight;
    if (statusHeight > 0) {
      bottomY -= statusHeight;
      this.statusLabel.position.set(
        Math.max(0, (bodyWidth - this.statusLabel.measuredWidth) / 2),
        bottomY + 2,
      );
    }
    if (actionHeight > 0) {
      bottomY -= actionHeight;
      layoutButtons(actionButtons, 0, bottomY, bodyWidth, actionHeight, 6);
    }

    this.relayoutTabs(panelHeight);
    this.redrawBackdrop();
  }

  relayoutSplitSettings(bodyWidth, bodyHeight) {
    const splitPaper = this.config.splitPaper;
    this.resetAutoSummonRevealTransform();
    const showsSelectionSection =
      this.dialogId !== WORKSHOP_SUMMON_INFO_DIALOG_ID ||
      this.model.autoSummonUnlocked === true;
    const statusHeight = this.statusLabel.visible
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
        (this.config.tabsInShellFooter === true
          ? paperOutsets.bottom +
            resolveShellFooterPaperReduction({
              bodyBottom: this.body.y + bodyHeight,
              panel: this.panel,
            })
          : 0),
    );
    const contentX = 0;
    const contentWidth = bodyWidth;

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

    if (statusHeight > 0) {
      this.statusLabel.position.set(
        Math.max(
          contentX,
          (bodyWidth - this.statusLabel.measuredWidth) / 2,
        ),
        splitPaper.statusY,
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
      itemY,
      listLayout.viewportWidth,
      itemHeight,
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

  relayoutTabs(panelHeight) {
    const tabButtons = this.tabs?.getWidgets?.() ?? [];
    const tabRowWidth = finiteOr(
      this.config.tabRowWidth,
      this.panel.contentBoxWidth,
    );
    this.tabLayer.visible = tabButtons.length > 0;
    this.tabLayer.renderable = this.tabLayer.visible;
    const tabY =
      this.config.tabsInShellFooter === true
        ? this.panel.coreHeight +
          PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset -
          SHELL_FOOTER_BOTTOM_INSET -
          TAB_HEIGHT
        : panelHeight - 2;
    this.tabLayer.position.set(
      (this.config.width - tabRowWidth) / 2,
      tabY,
    );
    layoutButtons(
      tabButtons,
      0,
      0,
      tabRowWidth,
      TAB_HEIGHT,
      this.config.tabsInShellFooter === true
        ? resolveShellFooterTabGap(tabButtons.length)
        : TAB_GAP,
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

function resolveShellFooterPaperReduction({ bodyBottom, panel }) {
  const tabY =
    panel.coreHeight +
    PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset -
    SHELL_FOOTER_BOTTOM_INSET -
    TAB_HEIGHT;
  const paperBottom = tabY - SHELL_FOOTER_PAPER_GAP;

  return Math.max(0, bodyBottom - paperBottom);
}

function resolveShellFooterTabGap(tabCount) {
  if (tabCount <= 1) {
    return 0;
  }

  return Math.min(
    SHELL_FOOTER_TAB_MAX_GAP,
    SHELL_FOOTER_TAB_MIN_GAP +
      Math.max(0, SHELL_FOOTER_TAB_REFERENCE_COUNT - tabCount) *
        SHELL_FOOTER_TAB_GAP_STEP,
  );
}

class DialogSummaryRow {
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
    if (this.itemIcon.visible) {
      const iconSize = this.iconLeading ? this.leadingIconSize : 18;
      const iconCenterX = this.iconLeading ? iconSize / 2 : 55;
      const iconCenterY = height / 2;
      setSeedPackCompositeBounds(
        this.itemIcon,
        this.itemIconOverlay,
        iconCenterX,
        iconCenterY,
        iconSize,
        this.iconLeading ? 0 : 0.5,
      );
      this.itemIcon.width *= this.itemIconAspectRatio;
      if (this.iconLeading) {
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
      } else {
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
      }
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
    this.quantityLabel.applyTheme(theme);
  }

  reset() {
    this.unregisterSemantic();
    this.action = null;
    this.enabled = false;
    this.iconLeading = false;
    this.itemIconAspectRatio = 1;
    this.key = null;
    this.valueResource.visible = false;
    this.valueResource.renderable = false;
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

class DialogField {
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

class AmountSelectorPixi {
  constructor({
    assetManager,
    inputRouter,
    textEntryService,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.model = null;
    this.valueButton = new PixiButton({
      assetManager,
      inputRouter,
      text: '1',
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
        new PixiButton({
          assetManager,
          inputRouter,
          text: delta > 0 ? `+${delta}` : String(delta),
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

class VirtualShopDialogList {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    counters,
    rowHeight,
    useSettingsRows = false,
    rubberPress = false,
    expandedControl = null,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
    label,
  }) {
    this.rowHeight = rowHeight;
    this.useSettingsRows = useSettingsRows;
    this.rubberPress = rubberPress;
    this.expandedControl = expandedControl;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion = reducedMotion;
    this.width = 0;
    this.rowWidth = 0;
    this.height = 0;
    this.items = [];
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.expandedKey = null;
    this.outgoingKey = null;
    this.incomingStartFraction = 0;
    this.outgoingStartFraction = 0;
    this.expansionProgress = 1;
    this.expansionFrame = null;
    this.expansionStartedAt = null;
    this.contentPaddingTop = PIXI_UI_GEOMETRY.dialogScrollPaddingTop;
    this.scroll = new RetainedScrollArea({
      assetManager,
      inputRouter,
      label,
      onScroll: () => this.renderWindow(),
    });
    this.scroll.progressBar = null;
    this.root = this.scroll.root;
    this.rowPool = new WidgetPool({
      name: `${label} viewport row pool`,
      counters,
      create: () =>
        new VirtualShopDialogRow({
          assetManager,
          inputRouter,
          semanticRegistry,
          useSettingsStyle: this.useSettingsRows,
          rubberPress: this.rubberPress,
          requestFrame: this.requestFrame,
          cancelFrame: this.cancelFrame,
          timeSource: this.timeSource,
          reducedMotion: this.reducedMotion,
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
      bind: (widget, entry) => {
        widget.bind(entry.item.__virtualKey, entry.item);
        widget.setBounds(
          0,
          entry.top,
          this.rowWidth,
          entry.height,
          this.rowHeight,
        );
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
    this.items = safeArray(items).map((item, index) => ({
      ...item,
      __virtualKey: item.id ?? item.key ?? item.semanticId ?? index,
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
    this.rows.reconcile(layout.slice(start, end));
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
    this.expansionStartedAt = null;
    this.syncExpandedControl();

    if (this.reducedMotion?.()) {
      this.finishExpansion();
      return;
    }

    this.refreshContentHeight();
    this.renderWindow(true);
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
    this.expansionProgress = easeOutQuart(linearProgress);
    this.refreshContentHeight();
    this.renderWindow(true);

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
    this.syncExpandedControl();
    this.refreshContentHeight();
    this.renderWindow(true);
  }

  cancelExpansion() {
    if (this.expansionFrame !== null) {
      this.cancelFrame(this.expansionFrame);
    }
    this.expansionFrame = null;
    this.expansionStartedAt = null;
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
            easeOutQuart(this.expansionProgress);
    this.expandedControl.pivot.set(
      controlWidth / 2,
      controlHeight / 2,
    );
    this.expandedControl.position.set(
      controlX + controlWidth / 2,
      controlY + controlHeight / 2,
    );
    this.expandedControl.scale.set(disclosureScale);
    this.expandedControl.alpha = 1;
    this.expandedControl.visible = visibility > 0;
    this.expandedControl.renderable = this.expandedControl.visible;
  }

  applyTheme(theme) {
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(theme);
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

class VirtualShopDialogRow {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    useSettingsStyle = false,
    rubberPress = false,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.visual = new Container({
      label: `${label}:visual`,
    });
    this.assetManager = assetManager;
    this.useSettingsStyle = useSettingsStyle;
    this.rubberPress = rubberPress;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion = reducedMotion;
    this.releaseFrame = null;
    this.releaseStartedAt = null;
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
    this.label = new PixiTextLabel({ label: `${label}:label` });
    this.detail = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:detail`,
    });
    this.value = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.visual.addChild(
      this.background,
      this.itemIcon,
      this.itemIconOverlay,
      this.label,
      this.detail,
      this.value,
      this.selectedIndicator,
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
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.enabled &&
          Boolean(this.action) &&
          this.root.visible &&
          this.root.renderable,
        onPressChange: (pressed, context) =>
          this.setPressed(pressed, context),
        onActivate: (payload) => this.action?.(payload),
        haptic: 'light',
      }) ?? null;
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
    this.itemIcon.alpha = this.enabled ? 1 : 0.45;
    this.itemIconOverlay.alpha = this.enabled ? 1 : 0.45;
    this.selectedIndicator.visible = this.selected;
    this.selectedIndicator.renderable = this.selected;
    this.selectedIndicator.alpha = this.enabled ? 1 : 0.45;
    this.root.eventMode = this.action && this.enabled ? 'static' : 'none';
    this.label.setColor(
      resolveThemeColor(
        item.disabled
          ? 'disabled'
          : item.itemKind
            ? 'text'
            : item.resourceKey ?? 'text',
      ),
    );
    this.value.setColor(
      resolveThemeColor(
        item.disabled
          ? 'disabled'
          : item.valueTone
            ? resolveProgressToneText(item.valueTone)
          : item.valueResourceKey ?? 'text',
      ),
    );
    this.value.setStroke(
      item.disabled ? null : resolveProgressToneTextStroke(item.valueTone),
    );
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
    if (!this.useSettingsStyle) {
      const hasItemIcon = this.itemIcon.visible;
      const itemIconSize = 28;
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
          width - contentLeft - this.value.measuredWidth - 8,
        ),
      );
      this.detail.position.set(contentLeft, 20);
      this.detail.setWrapWidth(Math.max(0, width - contentLeft));
      this.value.position.set(
        width - 2,
        hasDetail ? 2 : Math.max(1, (summaryHeight - 16) / 2),
      );
      this.redraw();
      return;
    }

    const hasItemIcon = this.itemIcon.visible;
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
      rowPadding + STALL_ITEM_ICON_SIZE / 2;
    const contentLeft = hasItemIcon
      ? rowPadding + STALL_ITEM_ICON_SIZE + rowPadding
      : rowPadding;
    const contentRight = Math.max(
      contentLeft,
      backgroundWidth - rowPadding,
    );
    const rightInset = this.selected
      ? STALL_SELECTED_CHECK_SIZE + rowPadding * 2
      : 0;
    const valueRight = Math.max(
      contentLeft,
      contentRight - rightInset,
    );
    if (hasItemIcon) {
      setSeedPackCompositeBounds(
        this.itemIcon,
        this.itemIconOverlay,
        iconCenterX,
        summaryHeight / 2,
        STALL_ITEM_ICON_SIZE,
        0,
      );
    }
    if (this.selectedIndicator.visible) {
      setItemSpriteBounds(
        this.selectedIndicator,
        contentRight - STALL_SELECTED_CHECK_SIZE / 2,
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
          this.value.measuredWidth -
          8,
      ),
    );
    this.detail.position.set(contentLeft, 26);
    this.detail.setWrapWidth(
      Math.max(0, valueRight - contentLeft),
    );
    this.value.position.set(
      valueRight,
      hasDetail ? 4 : Math.max(1, (summaryHeight - 16) / 2),
    );
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.label.applyTheme(this.theme);
    this.detail.applyTheme(this.theme);
    this.value.applyTheme(this.theme);
    this.redraw();
  }

  setPressed(pressed, context = null) {
    const nextPressed = Boolean(pressed) && this.enabled;
    if (!this.rubberPress) {
      this.pressed = nextPressed;
      this.redraw();
      return;
    }

    if (nextPressed) {
      this.cancelReleaseAnimation();
      this.pressed = true;
      this.visual.scale.set(SETTINGS_ROW_PRESS_SCALE);
      this.redraw();
      return;
    }

    const wasPressed = this.pressed;
    this.pressed = false;
    this.redraw();
    if (
      wasPressed &&
      context?.confirmed === true &&
      !this.reducedMotion?.()
    ) {
      this.startReleaseAnimation();
    } else {
      this.cancelReleaseAnimation();
      this.visual.scale.set(1);
    }
  }

  startReleaseAnimation() {
    this.cancelReleaseAnimation();
    this.releaseStartedAt = this.timeSource();
    const tick = () => {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (this.timeSource() - this.releaseStartedAt) /
            SETTINGS_ROW_RELEASE_DURATION_MS,
        ),
      );
      this.visual.scale.set(sampleSettingsRowReleaseScale(progress));
      if (progress >= 1) {
        this.releaseFrame = null;
        this.releaseStartedAt = null;
        this.visual.scale.set(1);
        return;
      }
      this.releaseFrame = this.requestFrame(tick);
    };
    this.releaseFrame = this.requestFrame(tick);
  }

  cancelReleaseAnimation() {
    if (this.releaseFrame !== null) {
      this.cancelFrame(this.releaseFrame);
    }
    this.releaseFrame = null;
    this.releaseStartedAt = null;
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
    this.background.alpha =
      this.rubberPress || !this.pressed ? 1 : 0.82;
  }

  reset() {
    this.cancelReleaseAnimation();
    this.unregisterSemantic();
    this.registration?.update?.({ fallbackHitTest: false });
    this.item = null;
    this.key = null;
    this.action = null;
    this.enabled = false;
    this.selected = false;
    this.expanded = false;
    this.pressed = false;
    this.itemIcon.texture = Texture.EMPTY;
    this.itemIcon.visible = false;
    this.itemIconOverlay.texture = Texture.EMPTY;
    this.itemIconOverlay.visible = false;
    this.selectedIndicator.visible = false;
    this.selectedIndicator.renderable = false;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
    this.visual.scale.set(1);
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
    this.cancelReleaseAnimation();
    this.unregisterSemantic();
    this.registration?.();
    this.registration = null;
    this.root.destroy({ children: true });
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
        'thank you for trying to support the project but the transactions are not yet available <3',
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

function orderChildren(container, widgets) {
  container.removeChildren();
  for (const widget of widgets) {
    container.addChild(widget.root ?? widget);
  }
}

function easeOutQuart(progress) {
  return 1 - (1 - progress) ** 4;
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

function sampleSettingsRowReleaseScale(progress) {
  const safeProgress = Math.min(1, Math.max(0, progress));
  if (safeProgress <= 0.36) {
    return (
      SETTINGS_ROW_PRESS_SCALE +
      (SETTINGS_ROW_RELEASE_PEAK_SCALE - SETTINGS_ROW_PRESS_SCALE) *
        easeOutCubic(safeProgress / 0.36)
    );
  }
  return (
    SETTINGS_ROW_RELEASE_PEAK_SCALE +
    (1 - SETTINGS_ROW_RELEASE_PEAK_SCALE) *
      easeOutCubic((safeProgress - 0.36) / 0.64)
  );
}

function sampleSettingsRowDisclosureScale(progress) {
  const safeProgress = Math.min(1, Math.max(0, progress));
  if (safeProgress <= SETTINGS_ROW_DISCLOSURE_PEAK_PROGRESS) {
    return (
      SETTINGS_ROW_DISCLOSURE_START_SCALE +
      (SETTINGS_ROW_DISCLOSURE_PEAK_SCALE -
        SETTINGS_ROW_DISCLOSURE_START_SCALE) *
        easeOutCubic(
          safeProgress / SETTINGS_ROW_DISCLOSURE_PEAK_PROGRESS,
        )
    );
  }
  return (
    SETTINGS_ROW_DISCLOSURE_PEAK_SCALE +
    (1 - SETTINGS_ROW_DISCLOSURE_PEAK_SCALE) *
      easeOutCubic(
        (safeProgress - SETTINGS_ROW_DISCLOSURE_PEAK_PROGRESS) /
          (1 - SETTINGS_ROW_DISCLOSURE_PEAK_PROGRESS),
      )
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
  const buttonWidth = Math.max(
    0,
    (width - gap * (buttons.length - 1)) / buttons.length,
  );
  let cursorX = x;
  for (const button of buttons) {
    if (button.root && typeof button.setBounds === 'function') {
      button.setBounds(cursorX, y, buttonWidth, height);
    } else {
      button.position.set(cursorX, y);
      button.setSize(buttonWidth, height);
    }
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
