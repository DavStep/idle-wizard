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
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import {
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
  RetainedButton,
  RetainedScrollArea,
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
const LEDGER_DIALOG_WIDTH = 360;
const DEFAULT_DIALOG_HEIGHT = 364;
const LEDGER_DIALOG_HEIGHT = 283;
const TAB_HEIGHT = 28;
const TAB_GAP = 3;
const CONTENT_GAP = 6;
const LIST_OVERSCAN = 2;
const SETTINGS_SECTION_GAP = 8;
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

const DIALOG_CONFIG = Object.freeze({
  [SHOP_DIALOG_IDS.STALL]: Object.freeze({
    title: 'Load Stall',
    width: DEFAULT_DIALOG_WIDTH,
    height: DEFAULT_DIALOG_HEIGHT,
    rowHeight: PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch,
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
    title: 'market ledger',
    width: LEDGER_DIALOG_WIDTH,
    height: LEDGER_DIALOG_HEIGHT,
    rowHeight: 34,
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
      selectionHeight: 126,
      selectionStatusHeight: 142,
      summaryY: 4,
      summaryPitch: 20,
      summaryYs: Object.freeze([4, 31, 70]),
      toggleY: 2,
      manaSliderY: 48,
      dropSliderY: 91,
      actionsY: 0,
      actionHeight: 26,
      statusY: 119,
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
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.model = normalizeDialogModel(dialogId, {});
    this.modalHandle = null;
    this.buttonSemanticTargets = new Map();

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
          action.selected === true && this.config.selectedActionVariant
            ? this.config.selectedActionVariant
            : this.config.actionVariant ?? 'yellow';
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
        this.registerButtonSemanticTarget(button, tab);
      },
      afterReconcile: (buttons) => orderChildren(this.tabLayer, buttons),
    });

    this.body.addChild(
      this.selectionSection,
      this.itemSection,
      this.summaryLayer,
      this.messageLabel,
      this.rangeControl,
      this.settingsToggle,
      this.manaSettingsSlider,
      this.dropSettingsSlider,
      this.amountSelector.root,
      this.fieldLayer,
      this.list.root,
      this.actionLayer,
      this.statusLabel,
    );
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
    this.dropSettingsSlider.bind(this.model.dropSlider);
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
  }

  onDeactivate() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    for (const field of this.fields) {
      field.blur();
    }
    this.amountSelector.blur();
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
    const shift = finiteOr(
      this.viewportProjection?.dialogShift,
      0,
    );
    const panelX = Math.round((this.sourceWidth - panelWidth) / 2);
    const panelY = Math.round(
      centerY - (panelHeight + tabsHeight) / 2 + shift,
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
        statusHeight,
    );
    this.list.setBounds(0, y, bodyWidth, listHeight);
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
    const statusHeight = this.statusLabel.visible
      ? PIXI_UI_GEOMETRY.rowMinHeight
      : 0;
    const selectionHeight = statusHeight > 0
      ? splitPaper.selectionStatusHeight
      : splitPaper.selectionHeight;
    const paperOutsets = resolveDialogPaperOutsets(
      this.panel.contentInsets,
    );
    const itemY =
      selectionHeight +
      paperOutsets.bottom +
      SETTINGS_SECTION_GAP +
      paperOutsets.top;
    const itemHeight = Math.max(0, bodyHeight - itemY);
    const contentX = 0;
    const contentWidth = bodyWidth;

    this.selectionSectionBounds = {
      x: 0,
      y: 0,
      width: bodyWidth,
      height: selectionHeight,
    };
    this.itemSectionBounds = {
      x: 0,
      y: itemY,
      width: bodyWidth,
      height: itemHeight,
    };
    this.selectionSection.visible = true;
    this.selectionSection.renderable = true;
    this.itemSection.visible = true;
    this.itemSection.renderable = true;
    setDialogPaperSectionBounds(
      this.selectionSection,
      this.selectionSectionBounds,
      paperOutsets,
    );
    setDialogPaperSectionBounds(
      this.itemSection,
      this.itemSectionBounds,
      paperOutsets,
    );

    const summaryRows = this.summaryRows?.getWidgets?.() ?? [];
    summaryRows.forEach((row, index) => {
      const rowY = splitPaper.summaryYs?.[index];
      row.setBounds(
        contentX,
        Number.isFinite(rowY)
          ? rowY
          : splitPaper.summaryY + index * splitPaper.summaryPitch,
        contentWidth,
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
      const toggleWidth = 79;
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
      this.manaSettingsSlider.setBounds(
        contentX,
        splitPaper.manaSliderY,
        contentWidth,
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

    this.list.setBounds(
      0,
      itemY,
      bodyWidth,
      itemHeight,
    );
    this.list.root.visible = this.model.items.length > 0;
    this.list.root.renderable = this.list.root.visible;
  }

  relayoutTabs(panelHeight) {
    const tabButtons = this.tabs?.getWidgets?.() ?? [];
    this.tabLayer.visible = tabButtons.length > 0;
    this.tabLayer.renderable = this.tabLayer.visible;
    this.tabLayer.position.set(
      this.panel.contentInsets.left,
      panelHeight - 2,
    );
    layoutButtons(
      tabButtons,
      0,
      0,
      this.panel.contentBoxWidth,
      TAB_HEIGHT,
      TAB_GAP,
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

class DialogSummaryRow {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.assetManager = assetManager;
    this.keyLabel = new PixiTextLabel({ label: `${label}:key` });
    this.valueLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.valueResource = new PixiResourceLabel({
      assetManager,
      resource: 'mana',
      includeResourceName: false,
      label: `${label}:valueResource`,
    });
    this.valueResource.visible = false;
    this.valueResource.renderable = false;
    this.quantityLabel = new PixiTextLabel({
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
    const textY = Math.max(0, (height - PIXI_UI_GEOMETRY.bodyFontSize) / 2 - 1);
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
      const iconSize = 18;
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
    label,
  }) {
    this.rowHeight = rowHeight;
    this.useSettingsRows = useSettingsRows;
    this.width = 0;
    this.height = 0;
    this.items = [];
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.contentPaddingTop = PIXI_UI_GEOMETRY.dialogScrollPaddingTop;
    this.scroll = new RetainedScrollArea({
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
          this.contentPaddingTop + entry.index * this.rowHeight,
          this.width,
          this.rowHeight,
        );
      },
      afterReconcile: (widgets) => orderChildren(this.scroll.content, widgets),
    });
  }

  setItems(items) {
    this.items = safeArray(items).map((item, index) => ({
      ...item,
      __virtualKey: item.id ?? item.key ?? item.semanticId ?? index,
    }));
    this.scroll.setContentHeight(
      this.contentPaddingTop + this.items.length * this.rowHeight,
    );
    this.renderWindow(true);
  }

  setBounds(x, y, width, height) {
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    this.scroll.setBounds(x, y, this.width, this.height);
    this.renderWindow(true);
  }

  renderWindow(force = false) {
    const start = Math.max(
      0,
      Math.floor(
        Math.max(0, this.scroll.offsetY - this.contentPaddingTop) /
          this.rowHeight,
      ) - LIST_OVERSCAN,
    );
    const visibleCount =
      Math.ceil(this.height / Math.max(1, this.rowHeight)) + LIST_OVERSCAN * 2;
    const end = Math.min(this.items.length, start + visibleCount);
    if (!force && start === this.visibleStart && end === this.visibleEnd) {
      return;
    }
    this.visibleStart = start;
    this.visibleEnd = end;
    const window = this.items.slice(start, end).map((item, offset) => ({
      item,
      index: start + offset,
    }));
    this.rows.reconcile(window);
  }

  applyTheme(theme) {
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(theme);
    }
  }

  destroy() {
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
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
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
    this.root.addChild(
      this.background,
      this.itemIcon,
      this.itemIconOverlay,
      this.label,
      this.detail,
      this.value,
      this.selectedIndicator,
    );
    this.semanticRegistry = semanticRegistry;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.action = null;
    this.enabled = false;
    this.selected = false;
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
    this.redraw();
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    const hasDetail = this.detail.visible;
    if (!this.useSettingsStyle) {
      this.label.position.set(
        0,
        hasDetail ? 2 : Math.max(1, (height - 16) / 2),
      );
      this.label.setWrapWidth(
        Math.max(0, width - this.value.measuredWidth - 8),
      );
      this.detail.position.set(0, 20);
      this.detail.setWrapWidth(width);
      this.value.position.set(
        width,
        hasDetail ? 2 : Math.max(1, (height - 16) / 2),
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
        height / 2,
        STALL_ITEM_ICON_SIZE,
        0,
      );
    }
    if (this.selectedIndicator.visible) {
      setItemSpriteBounds(
        this.selectedIndicator,
        contentRight - STALL_SELECTED_CHECK_SIZE / 2,
        height / 2,
        STALL_SELECTED_CHECK_SIZE,
      );
    }
    this.label.position.set(
      contentLeft,
      hasDetail ? 7 : Math.max(1, (height - 16) / 2),
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
      hasDetail ? 4 : Math.max(1, (height - 16) / 2),
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
    this.background.alpha = this.pressed ? 0.82 : 1;
  }

  reset() {
    this.unregisterSemantic();
    this.registration?.update?.({ fallbackHitTest: false });
    this.item = null;
    this.key = null;
    this.action = null;
    this.enabled = false;
    this.selected = false;
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

function createDialogPaperSection(texture, label) {
  const frame = new PixiNineSliceFrame({
    texture,
    sourceInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.paperSourceInsets,
    borderInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
    label,
  });
  frame.eventMode = 'none';
  return frame;
}

function resolveDialogPaperOutsets(contentInsets) {
  const geometry = PIXI_ROOT_RUN_GEOMETRY.dialog;
  const paperX = geometry.paperInsetX - geometry.frameOutset;
  const paperY = geometry.paperInsetTop - geometry.frameOutset;
  const paperRight = geometry.paperInsetX - geometry.frameOutset;
  const paperBottom =
    geometry.paperInsetBottom - geometry.frameOutset;
  return {
    top: Math.max(0, contentInsets.top - paperY),
    right: Math.max(0, contentInsets.right - paperRight),
    bottom: Math.max(0, contentInsets.bottom - paperBottom),
    left: Math.max(0, contentInsets.left - paperX),
  };
}

function setDialogPaperSectionBounds(frame, bounds, outsets) {
  frame.position.set(
    bounds.x - outsets.left,
    bounds.y - outsets.top,
  );
  frame.setSize(
    bounds.width + outsets.left + outsets.right,
    bounds.height + outsets.top + outsets.bottom,
    PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
  );
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

function bindItemSprite(sprite, assetManager, frameName) {
  sprite.texture = frameName
    ? assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY
    : Texture.EMPTY;
  sprite.visible = Boolean(frameName);
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
  return { base: null, overlay: null };
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
