import {
  Container,
  Graphics,
  Rectangle,
} from 'pixi.js';

import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { PixiButton } from '../../primitives/PixiButton.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiProgressBar } from '../../primitives/PixiProgressBar.js';
import { PixiScrollView } from '../../primitives/PixiScrollView.js';
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_PROGRESS_VISUALS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

export const SHOP_DIALOG_IDS = Object.freeze({
  STALL: 'shop.stall',
  LEDGER: 'shop.ledger',
  REQUEST: 'shop.request',
  LISTING: 'shop.listing',
  MARKET: 'shop.market',
  TRADE_HISTORY: 'shop.tradeHistory',
  SUPPORT: 'shop.support',
});

const AMOUNT_DELTAS = Object.freeze([-100, -10, -1, 1, 10, 100]);
const DEFAULT_DIALOG_WIDTH = 304;
const WIDE_DIALOG_WIDTH = 344;
const LEDGER_DIALOG_WIDTH = 360;
const DEFAULT_DIALOG_HEIGHT = 364;
const LEDGER_DIALOG_HEIGHT = 283;
const TAB_HEIGHT = 40;
const TAB_GAP = 8;
const CONTENT_GAP = 6;
const LIST_OVERSCAN = 2;

const DIALOG_CONFIG = Object.freeze({
  [SHOP_DIALOG_IDS.STALL]: Object.freeze({
    title: 'load stall',
    width: DEFAULT_DIALOG_WIDTH,
    height: DEFAULT_DIALOG_HEIGHT,
    rowHeight: 40,
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
        onActivate: () => this.onClose?.(),
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
    this.body = this.panel.content;
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
    this.rangeControl = new ShopRangeControl({
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
      label: `${dialogId}:list`,
    });

    this.summaryPool = new WidgetPool({
      name: `${dialogId} summary row pool`,
      counters,
      create: () =>
        new DialogSummaryRow({
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
        new PixiButton({
          assetManager,
          inputRouter,
          label: `${dialogId}:action`,
        }),
      reset: (button) => button.reset(),
      dispose: (button) => button.destroy(),
      maxSize: 4,
    });
    this.actions = new PooledCollection({
      name: `${dialogId} actions`,
      pool: this.actionPool,
      counters,
      keyOf: (action, index) => action.id ?? index,
      bind: (button, action, key) => {
        button.bind(key, action, action.action ?? action.onActivate);
        button.applyTheme(this.contentTheme ?? this.theme);
      },
      afterReconcile: (buttons) => orderChildren(this.actionLayer, buttons),
    });

    this.tabPool = new WidgetPool({
      name: `${dialogId} tab pool`,
      counters,
      create: () =>
        new PixiButton({
          assetManager,
          inputRouter,
          label: `${dialogId}:tab`,
        }),
      reset: (button) => button.reset(),
      dispose: (button) => button.destroy(),
      maxSize: 4,
    });
    this.tabs = new PooledCollection({
      name: `${dialogId} tabs`,
      pool: this.tabPool,
      counters,
      keyOf: (tab, index) => tab.id ?? index,
      bind: (button, tab, key) => {
        button.bind(key, tab, tab.action ?? tab.onSelect);
        button.applyTheme(this.theme);
      },
      afterReconcile: (buttons) => orderChildren(this.tabLayer, buttons),
    });

    this.body.addChild(
      this.summaryLayer,
      this.messageLabel,
      this.rangeControl,
      this.amountSelector.root,
      this.fieldLayer,
      this.list.root,
      this.actionLayer,
      this.statusLabel,
    );
    this.root.addChild(
      this.backdrop,
      this.panel,
      this.tabLayer,
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
    this.actions.reconcile(this.model.actions);
    this.tabs.reconcile(this.model.tabs);
    this.list.setItems(this.model.items);
    this.rangeControl.bind(this.model.range);
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
    const shift = finiteOr(
      this.viewportProjection?.dialogShift,
      0,
    );
    const panelX = Math.round((this.sourceWidth - panelWidth) / 2);
    const panelY = Math.round(centerY - panelHeight / 2 + shift);
    this.panel.position.set(panelX, panelY);

    const bodyWidth = this.panel.contentBoxWidth;
    const bodyHeight = this.panel.contentBoxHeight;
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

    const tabButtons = this.tabs?.getWidgets?.() ?? [];
    this.tabLayer.visible = tabButtons.length > 0;
    this.tabLayer.renderable = this.tabLayer.visible;
    this.tabLayer.position.set(panelX, panelY + panelHeight + TAB_GAP);
    layoutButtons(tabButtons, 0, 0, panelWidth, TAB_HEIGHT, 3);
    this.redrawBackdrop();
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

  onDestroy() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.backdropRegistration?.();
    this.backdropRegistration = null;
    this.summaryRows.destroy();
    this.summaryPool.destroy();
    this.actions.destroy();
    this.actionPool.destroy();
    this.tabs.destroy();
    this.tabPool.destroy();
    this.list.destroy();
    this.amountSelector.destroy();
    this.rangeControl.destroy();
    for (const field of this.fields) {
      field.destroy();
    }
  }
}

class DialogSummaryRow {
  constructor({ inputRouter, semanticRegistry, label }) {
    this.root = new Container();
    this.root.label = label;
    this.keyLabel = new PixiTextLabel({ label: `${label}:key` });
    this.valueLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.root.addChild(this.keyLabel, this.valueLabel);
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
    this.keyLabel.setColor(
      resolveThemeColor(
        row.disabled ? 'disabled' : row.resourceKey ?? 'text',
      ),
    );
    this.valueLabel.setColor(
      resolveThemeColor(
        row.disabled
          ? 'disabled'
          : row.valueResourceKey ?? 'text',
      ),
    );
    this.action = row.action ?? row.onActivate ?? null;
    this.enabled = row.enabled !== false && row.disabled !== true;
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
    this.valueLabel.position.set(width, textY);
    this.keyLabel.setWrapWidth(
      Math.max(
        0,
        width - this.valueLabel.measuredWidth - PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
  }

  applyTheme(theme) {
    this.keyLabel.applyTheme(theme);
    this.valueLabel.applyTheme(theme);
  }

  reset() {
    this.unregisterSemantic();
    this.action = null;
    this.enabled = false;
    this.key = null;
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

class ShopRangeControl extends Container {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    semanticId,
    tutorialId,
    label,
  }) {
    super();
    this.label = label;
    this.controlWidth = 0;
    this.controlHeight = 16;
    this.value = 1;
    this.enabled = true;
    this.action = null;
    this.progress = new PixiProgressBar({
      assetManager,
      tone: 'yellow',
      label: `${label}:progress`,
    });
    this.knob = new Graphics();
    this.knob.label = `${label}:knob`;
    this.addChild(this.progress, this.knob);
    this.inputRouter = inputRouter;
    this.pressRegistration =
      inputRouter?.registerPressTarget?.(this, {
        enabled: () =>
          this.enabled && this.visible && this.renderable,
        onActivate: (payload) => this.setFromPayload(payload),
        haptic: 'selection',
      }) ?? null;
    this.dragRegistration =
      inputRouter?.registerGestureSurface?.(this, {
        kind: 'drag',
        axis: 'x',
        enabled: () =>
          this.enabled && this.visible && this.renderable,
        onStart: (payload) => this.setFromPayload(payload),
        onMove: (payload) => this.setFromPayload(payload),
      }) ?? null;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.semanticDefinition =
      semanticRegistry?.register?.({
        semanticId,
        tutorialId,
        displayObject: this,
        state: () => ({
          enabled: this.enabled,
          interactive: true,
          visible: this.visible && this.renderable,
        }),
        activate: (payload) => this.setFromPayload(payload),
      }) ?? null;
    this.bind(null);
  }

  bind(model) {
    this.model = model;
    this.visible = Boolean(model);
    this.renderable = this.visible;
    if (!model) {
      this.enabled = false;
      this.eventMode = 'none';
      this.action = null;
      return;
    }
    this.enabled = model.enabled !== false;
    this.eventMode = this.enabled ? 'static' : 'none';
    this.action = model.onChange ?? model.action ?? null;
    const rawValue = Number(model.value ?? model.percent ?? 100);
    this.value = clamp01(rawValue > 1 ? rawValue / 100 : rawValue);
    this.redraw();
  }

  setBounds(x, y, width, height = 16) {
    this.position.set(x, y);
    this.controlWidth = width;
    this.controlHeight = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    this.eventMode = this.enabled ? 'static' : 'none';
    const knobSize = PIXI_UI_GEOMETRY.progressKnobSize;
    const railWidth = Math.max(0, width - knobSize);
    this.progress.position.set(
      knobSize / 2,
      Math.round(
        (height - PIXI_UI_GEOMETRY.progressTotalHeight) / 2,
      ),
    );
    this.progress.setSize(
      railWidth,
      PIXI_UI_GEOMETRY.progressTotalHeight,
    );
    this.redraw();
  }

  setFromPayload(payload = {}) {
    if (!this.enabled) {
      return false;
    }
    let localX = finiteOr(payload.localX, Number.NaN);
    if (!Number.isFinite(localX) && payload.global && this.toLocal) {
      localX = this.toLocal(payload.global).x;
    }
    if (!Number.isFinite(localX)) {
      localX = this.value * this.controlWidth;
    }
    const knobRadius = PIXI_UI_GEOMETRY.progressKnobSize / 2;
    const next = clamp01(
      (localX - knobRadius) /
        Math.max(1, this.controlWidth - knobRadius * 2),
    );
    this.value = Math.round(next * 20) / 20;
    this.redraw();
    return this.action?.(Math.round(this.value * 100)) ?? true;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.progress.applyTheme(this.theme);
    this.redraw();
  }

  redraw() {
    this.progress.setProgress(this.value);
    const knobRadius = PIXI_UI_GEOMETRY.progressKnobSize / 2;
    const centerX =
      knobRadius +
      Math.max(0, this.controlWidth - knobRadius * 2) * this.value;
    const centerY = this.controlHeight / 2;
    this.knob
      .clear()
      .circle(centerX, centerY, knobRadius + 1)
      .fill(PIXI_PROGRESS_VISUALS.knobRing)
      .circle(centerX, centerY, knobRadius)
      .fill(PIXI_PROGRESS_VISUALS.knobBorder)
      .circle(centerX, centerY, knobRadius - 1)
      .fill(PIXI_PROGRESS_VISUALS.knobFill);
    this.knob.alpha = this.enabled ? 1 : 0.45;
  }

  destroy(options) {
    this.pressRegistration?.();
    this.dragRegistration?.();
    this.pressRegistration = null;
    this.dragRegistration = null;
    if (this.semanticDefinition) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this,
      });
      this.semanticDefinition = null;
    }
    super.destroy(options);
  }
}

class VirtualShopDialogList {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    counters,
    rowHeight,
    label,
  }) {
    this.rowHeight = rowHeight;
    this.width = 0;
    this.height = 0;
    this.items = [];
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.scroll = new PixiScrollView({
      assetManager,
      inputRouter,
      showProgress: true,
      progressTone: 'yellow',
      width: 1,
      height: 1,
      label,
      virtualize: () => this.renderWindow(),
    });
    this.root = this.scroll;
    this.rowPool = new WidgetPool({
      name: `${label} viewport row pool`,
      counters,
      create: () =>
        new VirtualShopDialogRow({
          inputRouter,
          semanticRegistry,
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
          entry.index * this.rowHeight,
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
    this.scroll.setContentHeight(this.items.length * this.rowHeight);
    this.renderWindow(true);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    this.scroll.setViewportSize(this.width, this.height);
    this.renderWindow(true);
  }

  renderWindow(force = false) {
    const start = Math.max(
      0,
      Math.floor(this.scroll.scrollY / this.rowHeight) - LIST_OVERSCAN,
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
    this.scroll.applyTheme(theme);
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(theme);
    }
  }

  destroy() {
    this.rows.destroy();
    this.rowPool.destroy();
    this.scroll.destroy({ children: true });
  }
}

class VirtualShopDialogRow {
  constructor({ inputRouter, semanticRegistry, label }) {
    this.root = new Container();
    this.root.label = label;
    this.background = new Graphics();
    this.background.label = `${label}:background`;
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
    this.root.addChild(this.background, this.label, this.detail, this.value);
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
    this.key = key;
    this.item = item;
    this.root.visible = true;
    this.root.renderable = true;
    this.label
      .setText(item.label ?? item.text ?? '')
      .setFontWeight(item.heading || item.selected ? 'bold' : 'normal');
    this.detail.setText(item.detail ?? item.secondary ?? '');
    this.detail.visible = Boolean(item.detail ?? item.secondary);
    this.value.setText(item.value ?? item.actionLabel ?? '');
    this.enabled = item.enabled !== false && item.disabled !== true;
    this.selected = item.selected === true;
    this.action = item.action ?? item.onActivate ?? null;
    this.root.eventMode = this.action && this.enabled ? 'static' : 'none';
    this.label.setColor(
      resolveThemeColor(
        item.disabled
          ? 'disabled'
          : item.resourceKey ?? 'text',
      ),
    );
    this.value.setColor(
      resolveThemeColor(
        item.disabled
          ? 'disabled'
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
    this.label.position.set(0, hasDetail ? 2 : Math.max(1, (height - 16) / 2));
    this.label.setWrapWidth(
      Math.max(0, width - this.value.measuredWidth - 8),
    );
    this.detail.position.set(0, 20);
    this.detail.setWrapWidth(width);
    this.value.position.set(width, hasDetail ? 2 : Math.max(1, (height - 16) / 2));
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
  }

  reset() {
    this.unregisterSemantic();
    this.item = null;
    this.key = null;
    this.action = null;
    this.enabled = false;
    this.selected = false;
    this.pressed = false;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
    this.background.clear();
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

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
