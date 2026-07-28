import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  PixiButton,
  PixiModalSurface,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  PooledCollection,
  WidgetPool,
} from '../../retained/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

const DIALOG_SCREEN_SIDE_INSET_RATIO = 0.05;
const MAX_DIALOG_SHELL_WIDTH =
  PIXI_UI_GEOMETRY.sourceWidth *
  (1 - DIALOG_SCREEN_SIDE_INSET_RATIO * 2);
const MAX_DIALOG_CORE_WIDTH =
  MAX_DIALOG_SHELL_WIDTH -
  PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset * 2;
const MAX_DIALOG_CONTENT_WIDTH =
  MAX_DIALOG_CORE_WIDTH -
  PIXI_UI_GEOMETRY.dialogPadding * 2;

export const GLOBAL_DIALOG_GEOMETRY = Object.freeze({
  sourceWidth: PIXI_UI_GEOMETRY.sourceWidth,
  sourceHeight: PIXI_UI_GEOMETRY.sourceHeight,
  screenSideInsetRatio: DIALOG_SCREEN_SIDE_INSET_RATIO,
  maxShellWidth: MAX_DIALOG_SHELL_WIDTH,
  maxCoreWidth: MAX_DIALOG_CORE_WIDTH,
  maxContentWidth: MAX_DIALOG_CONTENT_WIDTH,
  top: 72,
  dialogPadding: PIXI_UI_GEOMETRY.dialogPadding,
  border: PIXI_UI_GEOMETRY.strongBorderWidth,
  tabGap: PIXI_UI_GEOMETRY.dialogTabGap,
  tabHeight: PIXI_UI_GEOMETRY.tabHeight,
  rowHeight: PIXI_UI_GEOMETRY.rowMinHeight,
  rowGap: 4,
  sectionGap: 12,
});

const DEFAULT_PROJECTION = Object.freeze({
  sourceWidth: GLOBAL_DIALOG_GEOMETRY.sourceWidth,
  sourceHeight: GLOBAL_DIALOG_GEOMETRY.sourceHeight,
  sourceScale: 1,
  sourceOffsetX: 0,
  stageLogicalWidth: GLOBAL_DIALOG_GEOMETRY.sourceWidth,
  dialogShift: 0,
});

/**
 * Shared retained dialog lifecycle. Concrete dialogs build children once and
 * only mutate those children from renderer-neutral view models.
 */
export class RetainedGlobalDialog extends PixiModalSurface {
  constructor({
    context = {},
    dialogId,
    title,
    contentWidth,
    contentHeight,
    placement = 'center',
    top = GLOBAL_DIALOG_GEOMETRY.top,
    includeClose = true,
    backdropAlpha = 0.68,
    opaqueBackdrop = false,
    label = dialogId,
  }) {
    const normalizedContext = normalizeRuntimeContext(context);
    const safeContentWidth = clampDialogContentWidth(contentWidth);
    super({
      assetManager: normalizedContext.assets,
      title,
      contentWidth: safeContentWidth,
      contentHeight,
      backdropAlpha,
      opaqueBackdrop,
      inputRouter: normalizedContext.inputRouter,
      semanticRegistry: normalizedContext.semanticRegistry,
      modalId: dialogId,
      openMotion: placement === 'top' ? 'top' : 'center',
      label,
    });
    this.context = normalizedContext;
    this.dialogId = dialogId;
    this.defaultTitle = title;
    this.contentWidth = safeContentWidth;
    this.contentHeight = contentHeight;
    this.placement = placement;
    this.top = top;
    this.model = {};
    this.actions = {};
    this.closeControl = includeClose
      ? new PlayerDialogCloseAdapter({
          panel: this.panel,
          action: () => this.requestClose('close'),
        })
      : null;
    this.dismissOnOutside = () => this.requestClose('outside');
    this.modalBackHandler = () => this.requestClose('back');
    this.modalEscapeHandler = () => this.requestClose('escape');
    this.setPanelContentSize(safeContentWidth, contentHeight);
    // Do not dispatch subclass lifecycle hooks while concrete display trees
    // are still under construction. Concrete dialogs finish with their own
    // applyTheme/bind/layout pass after creating every retained child.
    this.theme = normalizedContext.theme;
    this.viewportProjection = normalizedContext.projection;
    super.onApplyTheme(this.theme);
    this.closeControl?.applyTheme(this.theme);
    super.onLayout(this.viewportProjection);
    this.positionPanel();
    this.layoutCloseControl();
  }

  layout(viewportProjection) {
    return super.layout(normalizeProjection(viewportProjection));
  }

  setPanelContentSize(width, height) {
    this.contentWidth = clampDialogContentWidth(width);
    this.contentHeight = Math.max(0, Number(height) || 0);
    this.panel.setContentBoxSize(
      this.contentWidth,
      this.contentHeight,
      GLOBAL_DIALOG_GEOMETRY.dialogPadding,
    );
    this.positionPanel();
    this.layoutCloseControl();
    return this;
  }

  onBind(viewModel = {}) {
    this.model = viewModel ?? {};
    this.actions = this.model.actions ?? {};
    this.panel.setTitle(this.model.title ?? this.defaultTitle);
    if (this.closeControl) {
      const showClose = this.model.showClose !== false;
      this.closeControl.root.visible = showClose;
      this.closeControl.root.renderable = showClose;
      this.closeControl.setEnabled(showClose);
    }
    this.bindDialog(this.model);
    this.positionPanel();
    this.layoutCloseControl();
  }

  onApplyTheme(themeSnapshot = DEFAULT_PIXI_THEME_SNAPSHOT) {
    super.onApplyTheme(themeSnapshot);
    this.closeControl?.applyTheme(themeSnapshot);
    this.applyDialogTheme(
      this.panel.getContentTheme?.() ?? themeSnapshot,
    );
  }

  onLayout(projection) {
    super.onLayout(projection);
    this.positionPanel();
    this.layoutCloseControl();
    this.layoutDialog(projection);
  }

  onActivate() {
    this.shown = true;
    super.onActivate();
    this.activateDialog();
  }

  onDeactivate() {
    this.deactivateDialog();
    super.onDeactivate();
    this.shown = false;
  }

  onDestroy() {
    this.closeControl?.destroy();
    this.closeControl = null;
    this.destroyDialog();
    super.onDestroy();
  }

  positionPanel() {
    if (!this.panel) {
      return;
    }
    const projection = this.viewportProjection ?? DEFAULT_PROJECTION;
    const outerWidth = this.panel.outerWidth;
    const outerHeight = this.panel.outerHeight;
    if (this.placement === 'top') {
      this.panel.pivot.set(outerWidth / 2, 0);
      this.panel.position.set(
        GLOBAL_DIALOG_GEOMETRY.sourceWidth / 2,
        this.top + (projection.dialogShift ?? 0),
      );
      this.captureOpenMotionBasePosition();
      return;
    }
    this.panel.pivot.set(outerWidth / 2, outerHeight / 2);
    this.panel.position.set(
      GLOBAL_DIALOG_GEOMETRY.sourceWidth / 2,
      projection.sourceHeight / 2 + (projection.dialogShift ?? 0),
    );
    this.captureOpenMotionBasePosition();
  }

  layoutCloseControl() {
    if (!this.closeControl || this.closeControl.detached) {
      return;
    }
    const width = Math.max(
      32,
      Math.ceil(this.closeControl.textWidth + 8),
    );
    this.closeControl.setBounds(
      this.panel.outerWidth -
        GLOBAL_DIALOG_GEOMETRY.dialogPadding -
        width,
      -PIXI_UI_GEOMETRY.borderLabelLineHeight / 2,
      width,
      PIXI_UI_GEOMETRY.borderLabelLineHeight,
    );
  }

  requestClose(source = 'close') {
    const action =
      this.model.onClose ??
      this.actions.close ??
      this.actions.cancel ??
      null;
    const result = action?.({ source, dialogId: this.dialogId });
    if (result === false) {
      return false;
    }
    this.closeThroughRegistry();
    return result ?? true;
  }

  closeThroughRegistry() {
    const registry = resolveDialogRegistry(this.context.dialogRegistry);
    if (registry?.isOpen?.(this.dialogId)) {
      registry.close(this.dialogId);
      return true;
    }
    return false;
  }

  bindDialog() {}

  applyDialogTheme() {}

  layoutDialog() {}

  activateDialog() {}

  deactivateDialog() {}

  destroyDialog() {}
}

function clampDialogContentWidth(width) {
  return Math.min(
    GLOBAL_DIALOG_GEOMETRY.maxContentWidth,
    Math.max(0, Number(width) || 0),
  );
}

class PlayerDialogCloseAdapter {
  constructor({ panel, action }) {
    this.panel = panel;
    this.root = panel.closeControl;
    this.action = action;
    this.detached = true;
    this.textWidth = 0;
    this.enabled = true;
    this.panel.setCloseAction(this.action);
  }

  setText() {
    return this;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.panel.setCloseAction(this.enabled ? this.action : null);
    return this;
  }

  setBounds() {
    return this;
  }

  applyTheme() {
    return this;
  }

  destroy() {
    this.panel = null;
    this.root = null;
  }
}

/**
 * Border-label control used by close/current-style actions. It wraps the
 * shared PixiButton so press registration is installed once while its frame is
 * intentionally replaced by the dialog-surface backing.
 */
export class BorderLabelButton {
  constructor({
    assetManager = null,
    inputRouter = null,
    text = '',
    action = null,
    label = 'borderLabelButton',
  } = {}) {
    this.root = new Container();
    this.root.label = label;
    this.backing = new Graphics();
    this.backing.label = `${label}:backing`;
    this.button = new PixiButton({
      assetManager,
      inputRouter,
      text,
      width: 32,
      height: PIXI_UI_GEOMETRY.borderLabelLineHeight,
      action,
      haptic: 'light',
      label: `${label}:button`,
    });
    this.button.frame.visible = false;
    this.button.frame.renderable = false;
    this.button.textLabel
      .setFontSize(PIXI_UI_GEOMETRY.borderLabelFontSize)
      .setFontWeight('normal');
    this.root.addChild(this.backing, this.button);
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.width = 32;
    this.height = PIXI_UI_GEOMETRY.borderLabelLineHeight;
    this.applyTheme(this.theme);
  }

  get textWidth() {
    return this.button.textLabel.measuredWidth;
  }

  setText(text) {
    this.button.setText(text);
    return this;
  }

  setAction(action) {
    this.button.setAction(action);
    return this;
  }

  setEnabled(enabled) {
    this.button.setEnabled(enabled);
    return this;
  }

  setSelected(selected) {
    this.button.setSelected(selected);
    return this;
  }

  setBounds(x, y, width, height = this.height) {
    this.width = Math.max(0, Number(width) || 0);
    this.height = Math.max(0, Number(height) || 0);
    this.root.position.set(x, y);
    this.button.position.set(0, 0);
    this.button.setSize(this.width, this.height);
    this.redrawBacking();
    return this;
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.button.applyTheme(this.theme);
    this.redrawBacking();
  }

  redrawBacking() {
    this.backing
      .clear()
      .rect(0, 0, this.width, this.height)
      .fill(this.theme.surface);
  }

  activate(payload) {
    return this.button.activate(payload);
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/**
 * Poolable compact key/value row shared by level, profile, alliance, inbox
 * summaries, confirmations, and announcements.
 */
export class PooledDialogRow {
  constructor({
    assetManager = null,
    inputRouter = null,
    label = 'dialogRow',
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.assetManager = assetManager;
    this.root = new Container();
    this.root.label = label;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.divider = new Graphics();
    this.divider.label = `${label}:divider`;
    this.keyLabel = new PixiTextLabel({
      label: `${label}:key`,
    });
    this.valueLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      align: 'right',
      label: `${label}:value`,
    });
    this.valueIcon = new Sprite({
      texture: Texture.EMPTY,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:valueIcon`,
    });
    this.valueIcon.visible = false;
    this.valueIcon.renderable = false;
    this.valueIcon.eventMode = 'none';
    this.valueIconFrameName = null;
    this.root.addChild(
      this.divider,
      this.keyLabel,
      this.valueIcon,
      this.valueLabel,
    );
    this.action = null;
    this.data = {};
    this.rowWidth = 0;
    this.rowHeight = GLOBAL_DIALOG_GEOMETRY.rowHeight;
    this.theme = theme;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          Boolean(this.action) &&
          this.root.visible &&
          this.root.renderable,
        onActivate: (event) => this.activate(event),
        haptic: 'light',
      }) ?? null;
    this.applyTheme(theme);
  }

  bind(_key, data = {}, actions = null) {
    this.data = data ?? {};
    this.action =
      this.data.action ??
      this.data.onActivate ??
      (typeof actions === 'function'
        ? actions
        : actions?.activate ?? null);
    this.root.visible = this.data.hidden !== true;
    this.root.renderable = this.root.visible;
    this.root.eventMode = this.action ? 'static' : 'none';
    this.keyLabel.setText(
      this.data.label ??
        this.data.keyText ??
        this.data.text ??
        '',
    );
    this.valueLabel.setText(
      this.data.value ??
        this.data.valueText ??
        '',
    );
    this.setValueIcon(this.data.icon);
    this.keyLabel
      .setFontWeight(this.data.boldLabel ? 'bold' : 'normal')
      .setColor(this.data.mutedLabel ? 'muted' : this.resolveBaseColor());
    this.valueLabel
      .setFontWeight(this.data.boldValue ? 'bold' : 'normal')
      .setColor(this.resolveValueColor());
    this.layoutCurrent();
  }

  reset() {
    this.data = {};
    this.action = null;
    this.keyLabel.setText('');
    this.valueLabel.setText('');
    this.setValueIcon(null);
    this.divider.clear();
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.keyLabel.applyTheme(this.theme);
    this.valueLabel.applyTheme(this.theme);
    this.keyLabel.setColor(
      this.data.mutedLabel ? 'muted' : this.resolveBaseColor(),
    );
    this.valueLabel.setColor(this.resolveValueColor());
    this.layoutCurrent();
  }

  setBounds(x, y, width, height = this.getPreferredHeight(width)) {
    this.rowWidth = Math.max(0, Number(width) || 0);
    this.rowHeight = Math.max(
      GLOBAL_DIALOG_GEOMETRY.rowHeight,
      Number(height) || GLOBAL_DIALOG_GEOMETRY.rowHeight,
    );
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(
      0,
      0,
      this.rowWidth,
      this.rowHeight,
    );
    this.layoutCurrent();
    return this;
  }

  getPreferredHeight(width = this.rowWidth) {
    if (Number.isFinite(this.data.height)) {
      return Math.max(
        GLOBAL_DIALOG_GEOMETRY.rowHeight,
        Number(this.data.height),
      );
    }
    if (this.data.kind === 'divider') {
      return 7;
    }
    if (
      this.data.kind === 'paragraph' ||
      this.data.kind === 'message'
    ) {
      this.keyLabel.setWrapWidth(Math.max(0, Number(width) || 0));
      return Math.max(
        GLOBAL_DIALOG_GEOMETRY.rowHeight,
        Math.ceil(this.keyLabel.measuredHeight) + 2,
      );
    }
    this.applyRowColumnWidths(width);
    return Math.max(
      GLOBAL_DIALOG_GEOMETRY.rowHeight,
      Math.ceil(this.keyLabel.measuredHeight),
      this.valueLabel.visible
        ? Math.ceil(this.valueLabel.measuredHeight)
        : 0,
    );
  }

  layoutCurrent() {
    const kind = this.data.kind ?? 'row';
    const disabled =
      this.data.disabled === true ||
      this.data.locked === true ||
      this.data.pending === true;
    this.divider.clear();
    this.keyLabel.visible = kind !== 'divider';
    this.keyLabel.renderable = this.keyLabel.visible;
    this.valueLabel.visible =
      kind === 'row' && String(this.valueLabel.text).length > 0;
    this.valueLabel.renderable = this.valueLabel.visible;
    if (kind === 'divider') {
      this.divider
        .moveTo(0, 3)
        .lineTo(this.rowWidth, 3)
        .stroke({ color: this.theme.stroke, width: 1 });
      return;
    }

    if (kind === 'paragraph' || kind === 'message') {
      this.keyLabel.setWrapWidth(this.rowWidth);
    } else {
      this.applyRowColumnWidths(this.rowWidth);
    }
    const alignToTop =
      Array.isArray(this.data.valueLines) &&
      this.data.valueLines.length > 1;
    const keyY =
      kind === 'paragraph' || kind === 'message' || alignToTop
        ? 0
        : Math.max(
            0,
            (this.rowHeight - this.keyLabel.measuredHeight) / 2,
          );
    const valueY = alignToTop
      ? 0
      : Math.max(
          0,
          (this.rowHeight - this.valueLabel.measuredHeight) / 2,
        );
    this.keyLabel.position.set(0, keyY);
    const iconAfterValue =
      this.valueIcon.visible &&
      this.data.iconPosition === 'after';
    this.valueLabel.position.set(
      iconAfterValue
        ? this.rowWidth -
            this.valueIcon.width -
            PIXI_UI_GEOMETRY.rowColumnGap / 2
        : this.rowWidth,
      valueY,
    );
    if (this.valueIcon.visible) {
      this.valueIcon.position.set(
        iconAfterValue
          ? this.rowWidth - this.valueIcon.width / 2
          : this.rowWidth -
              this.valueLabel.measuredWidth -
              PIXI_UI_GEOMETRY.rowColumnGap / 2 -
              this.valueIcon.width / 2,
        this.rowHeight / 2,
      );
    }
    const baseColor = disabled
      ? 'disabled'
      : this.data.mutedLabel
        ? 'muted'
        : this.resolveBaseColor();
    this.keyLabel.setColor(baseColor);
    this.valueLabel.setColor(
      disabled ? 'disabled' : this.resolveValueColor(),
    );
  }

  applyRowColumnWidths(width) {
    const rowWidth = Math.max(0, Number(width) || 0);
    if (!this.valueLabel.visible) {
      this.keyLabel.setWrapWidth(rowWidth);
      this.valueLabel.setWrapWidth(0);
      return;
    }
    const availableWidth = Math.max(
      0,
      rowWidth - PIXI_UI_GEOMETRY.rowColumnGap,
    );
    const requestedKeyWidth = Number(this.data.keyWidth);
    const requestedKeyWidthRatio = Number(
      this.data.keyWidthRatio,
    );
    const keyWidth = Math.min(
      availableWidth,
      Number.isFinite(requestedKeyWidth)
        ? Math.max(0, requestedKeyWidth)
        : Math.max(
            72,
            availableWidth *
              (Number.isFinite(requestedKeyWidthRatio)
                ? Math.max(
                    0,
                    Math.min(1, requestedKeyWidthRatio),
                  )
                : 0.4),
          ),
    );
    this.keyLabel.setWrapWidth(keyWidth);
    this.valueLabel.setWrapWidth(
      Math.max(
        0,
        availableWidth -
          keyWidth -
          (this.valueIcon.visible
            ? this.valueIcon.width +
              PIXI_UI_GEOMETRY.rowColumnGap / 2
            : 0),
      ),
    );
  }

  setValueIcon(icon = null) {
    const frameName = String(icon?.frameName ?? '').trim();
    this.valueIconFrameName = frameName || null;
    this.valueIcon.texture = frameName
      ? this.assetManager?.getAtlasTexture?.(frameName) ??
        Texture.EMPTY
      : Texture.EMPTY;
    this.valueIcon.visible = Boolean(frameName);
    this.valueIcon.renderable = this.valueIcon.visible;
    if (!this.valueIcon.visible) {
      this.valueIcon.width = 0;
      this.valueIcon.height = 0;
      return;
    }

    const iconHeight = PIXI_UI_GEOMETRY.bodyFontSize * 1.032;
    const source =
      this.valueIcon.texture?.orig ??
      this.valueIcon.texture?.frame;
    const aspect =
      source?.width > 0 && source?.height > 0
        ? source.width / source.height
        : 1;
    this.valueIcon.width = iconHeight * aspect;
    this.valueIcon.height = iconHeight;
  }

  resolveBaseColor() {
    return this.data.color ?? 'text';
  }

  resolveValueColor() {
    const resource = String(this.data.resource ?? '').toLowerCase();
    return resource && this.theme.resourceColors?.[resource]
      ? this.theme.resourceColors[resource]
      : this.data.valueColor ??
          (this.data.mutedValue ? 'muted' : 'text');
  }

  activate(payload) {
    if (!this.action || !this.root.visible || !this.root.renderable) {
      return false;
    }
    return this.action(this.data.payload ?? this.data, payload) ?? true;
  }

  destroy() {
    releaseRegistration(this.registration);
    this.registration = null;
    this.root.destroy({ children: true });
  }
}

export class PooledDialogRows {
  constructor({
    assetManager = null,
    parent,
    inputRouter = null,
    counters = null,
    name,
    maxSize = 64,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  }) {
    this.parent = parent;
    this.theme = theme;
    this.pool = new WidgetPool({
      name: `${name} pool`,
      counters,
      maxSize,
      create: () => {
        const row = new PooledDialogRow({
          assetManager,
          inputRouter,
          label: `${name}:row`,
          theme: this.theme,
        });
        row.applyTheme(this.theme);
        return row;
      },
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
    });
    this.collection = new PooledCollection({
      name,
      pool: this.pool,
      counters,
      keyOf: (row, index) =>
        row.id ??
        row.key ??
        `${row.kind ?? 'row'}:${row.label ?? row.text ?? index}:${index}`,
      bind: (widget, row, key) => widget.bind(key, row),
      afterReconcile: (widgets) => this.order(widgets),
    });
  }

  reconcile(rows) {
    return this.collection.reconcile(normalizeRows(rows));
  }

  order(widgets) {
    this.parent.removeChildren();
    for (const widget of widgets) {
      this.parent.addChild(widget.root);
    }
  }

  layout(width, { gap = GLOBAL_DIALOG_GEOMETRY.rowGap } = {}) {
    let y = 0;
    for (const row of this.collection.getWidgets()) {
      const height = row.getPreferredHeight(width);
      row.setBounds(0, y, width, height);
      y += height + gap;
    }
    return Math.max(0, y - gap);
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    for (const row of this.collection.getWidgets()) {
      row.applyTheme(this.theme);
    }
  }

  clear() {
    return this.collection.clear();
  }

  getStats() {
    return Object.freeze({
      collection: this.collection.getStats(),
      pool: this.pool.getStats(),
    });
  }

  destroy() {
    this.collection.destroy();
    this.pool.destroy();
  }
}

export function normalizeRuntimeContext(context = {}) {
  return Object.freeze({
    assets: context.assets ?? context.assetManager ?? null,
    inputRouter: context.inputRouter ?? null,
    textEntryService: context.textEntryService ?? null,
    semanticRegistry:
      context.semanticRegistry ?? context.semanticTargets ?? null,
    counters: context.counters ?? null,
    dialogRegistry: context.dialogRegistry ?? null,
    theme: resolveContextValue(
      context.theme,
      DEFAULT_PIXI_THEME_SNAPSHOT,
    ),
    projection: normalizeProjection(
      resolveContextValue(context.projection, DEFAULT_PROJECTION),
    ),
  });
}

export function normalizeProjection(projection = {}) {
  const sourceWidth =
    positiveNumber(projection?.sourceWidth) ??
    GLOBAL_DIALOG_GEOMETRY.sourceWidth;
  const sourceHeight =
    positiveNumber(projection?.sourceHeight) ??
    GLOBAL_DIALOG_GEOMETRY.sourceHeight;
  const sourceScale =
    positiveNumber(projection?.sourceScale) ?? 1;
  return {
    ...projection,
    sourceWidth,
    sourceHeight,
    sourceScale,
    sourceOffsetX: Number(projection?.sourceOffsetX) || 0,
    stageLogicalWidth:
      positiveNumber(projection?.stageLogicalWidth) ??
      sourceWidth * sourceScale,
    dialogShift: Number(projection?.dialogShift) || 0,
  };
}

export function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

export function orderDisplayObjects(parent, widgets) {
  parent.removeChildren();
  for (const widget of widgets) {
    parent.addChild(widget.root ?? widget);
  }
}

export function releaseRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
    return;
  }
  registration?.unregister?.();
}

function resolveDialogRegistry(accessor) {
  return typeof accessor === 'function' ? accessor() : accessor;
}

function resolveContextValue(value, fallback) {
  if (typeof value !== 'function') {
    return value ?? fallback;
  }
  try {
    return value() ?? fallback;
  } catch {
    return fallback;
  }
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
