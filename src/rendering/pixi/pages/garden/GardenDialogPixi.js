import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  getSeedPackBaseFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  applyTextTheme,
  createText,
  normalizeRows,
  setText,
} from '../workshop/RetainedPageKit.js';

const DIALOG_PADDING = 20;
const GARDEN_DIALOG_CONTENT_WIDTH = 220;
const GARDEN_DIALOG_OUTER_WIDTH = GARDEN_DIALOG_CONTENT_WIDTH + DIALOG_PADDING * 2 + 4;
const SEED_ROW_HEIGHT = 20;
const SEED_ROWS_MAX_HEIGHT = 360;

/**
 * Retained, lazy-once seed chooser. The dialog owns no garden rules: rows are
 * already filtered/formatted by the presenter and invoke the supplied action.
 */
export class GardenSeedDialogPixi {
  constructor({
    parent,
    inputRouter = null,
    semanticTargets = null,
    assetManager = null,
    counters = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.modal = new PixiOwnedDialogSurface({
      id: 'garden.seed',
      parent,
      inputRouter,
      semanticRegistry: semanticTargets,
      assetManager,
      title: 'choose seed',
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.onClose = onClose;
    this.actions = {};
    this.instanceSequence = 0;
    this.rowsLayer = new Container({ label: 'garden-seed-dialog-rows' });
    this.rowsMask = new Graphics({ label: 'garden-seed-dialog-mask' });
    this.rowsViewport = new Container({ label: 'garden-seed-dialog-viewport' });
    this.rowsViewport.addChild(this.rowsLayer, this.rowsMask);
    this.rowsLayer.mask = this.rowsMask;
    this.modal.panel.content.addChild(this.rowsViewport);
    this.rowPool = new WidgetPool({
      name: 'garden seed dialog row pool',
      counters,
      create: () =>
        new GardenSeedChoiceRow({
          instanceId: ++this.instanceSequence,
          assetManager,
          inputRouter: this.inputRouter,
          semanticTargets: this.semanticTargets,
          modalId: this.modal.id,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 32,
    });
    this.rows = new PooledCollection({
      name: 'garden seed dialog rows',
      pool: this.rowPool,
      counters,
      keyOf: (seed, index) =>
        seed.id ?? seed.itemTypeId ?? seed.key ?? `seed-${index}`,
      bind: (row, seed) => row.bind(seed, this.actions),
      afterReconcile: (rows) => this.orderRows(rows),
    });
    this.scrollOffset = 0;
    this.scrollRegistration = this.inputRouter?.registerScrollRegion?.({
      id: 'garden.seed.rows',
      displayObject: this.rowsViewport,
      modalId: this.modal.id,
      enabled: () => this.modal.active && this.maxScrollOffset > 0,
      getOffset: () => this.scrollOffset,
      getMaxOffset: () => this.maxScrollOffset,
      onScroll: (offset) => this.setScrollOffset(offset),
    }) ?? null;
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(viewModel) {
    const model = viewModel ?? {};
    this.actions = model.actions ?? {};
    this.modal.setTitle(model.title ?? 'choose seed');
    this.rows.reconcile(normalizeRows(model.rows ?? model.seeds));
    const contentTheme = this.modal.getContentTheme();
    for (const row of this.rows.getWidgets()) {
      row.applyTheme(contentTheme);
    }
    this.setScrollOffset(this.scrollOffset);
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  orderRows(rows) {
    this.rowsLayer.removeChildren();
    for (const row of rows) {
      this.rowsLayer.addChild(row.root);
    }
  }

  setScrollOffset(offset) {
    this.scrollOffset = Math.max(
      0,
      Math.min(this.maxScrollOffset ?? 0, Number(offset) || 0),
    );
    this.rowsLayer.y = -this.scrollOffset;
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    const contentTheme = this.modal.getContentTheme();
    for (const row of this.rows?.getWidgets?.() ?? []) {
      row.applyTheme(contentTheme);
    }
  }

  layout(viewportProjection) {
    this.sourceWidth = Number(viewportProjection?.sourceWidth) || 360;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || RETAINED_PAGE_GEOMETRY.height;
    const rowCount = this.rows?.getWidgets?.().length ?? 0;
    this.contentHeight = Math.min(
      SEED_ROWS_MAX_HEIGHT,
      Math.max(SEED_ROW_HEIGHT, rowCount * SEED_ROW_HEIGHT),
    );
    const outerHeight = this.contentHeight + DIALOG_PADDING * 2 + 4;
    this.modal.setBounds(
      (this.sourceWidth - GARDEN_DIALOG_OUTER_WIDTH) / 2,
      (this.sourceHeight - outerHeight) / 2,
      GARDEN_DIALOG_OUTER_WIDTH,
      outerHeight,
    );
    this.rowsViewport.position.set(DIALOG_PADDING + 2, DIALOG_PADDING + 2);
    this.rowsViewport.hitArea = new Rectangle(
      0,
      0,
      GARDEN_DIALOG_CONTENT_WIDTH,
      this.contentHeight,
    );
    this.rowsMask
      .clear()
      .rect(0, 0, GARDEN_DIALOG_CONTENT_WIDTH, this.contentHeight)
      .fill({ color: 0xffffff });
    const rows = this.rows?.getWidgets?.() ?? [];
    rows.forEach((row, index) =>
      row.setBounds(0, index * SEED_ROW_HEIGHT, GARDEN_DIALOG_CONTENT_WIDTH),
    );
    this.maxScrollOffset = Math.max(
      0,
      rows.length * SEED_ROW_HEIGHT - this.contentHeight,
    );
    this.setScrollOffset(this.scrollOffset);
    this.modal.layout(viewportProjection);
  }

  activate() {
    this.modal.activate();
  }

  deactivate() {
    this.modal.deactivate();
  }

  destroy() {
    releaseRegistration(this.scrollRegistration);
    this.rows.destroy();
    this.rowPool.destroy();
    this.modal.destroy();
  }

  getDisplayObject() {
    return this.root;
  }
}

/**
 * Retained confirmation dialog used by both "empty" and "swap" garden flows.
 */
export class GardenConfirmDialogPixi {
  constructor({
    id,
    parent,
    inputRouter = null,
    assetManager = null,
    title,
    confirmLabel,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.id = id;
    this.onClose = onClose;
    this.modal = new PixiOwnedDialogSurface({
      id,
      parent,
      inputRouter,
      assetManager,
      title,
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.message = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: GARDEN_DIALOG_CONTENT_WIDTH,
    });
    this.keep = new GardenModalButton({
      id: `${id}.keep`,
      inputRouter,
      modalId: id,
      label: 'keep',
      action: () => this.close(),
    });
    this.confirm = new GardenModalButton({
      id: `${id}.confirm`,
      inputRouter,
      modalId: id,
      label: confirmLabel,
      action: () => this.confirmAction(),
    });
    this.modal.panel.content.addChild(
      this.message,
      this.keep.root,
      this.confirm.root,
    );
    this.confirmLabel = confirmLabel;
    this.action = null;
    this.payload = null;
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(viewModel) {
    const model = viewModel ?? {};
    this.payload = model.payload ?? model;
    this.action =
      model.onConfirm ??
      model.actions?.confirm ??
      null;
    this.modal.setTitle(model.title ?? this.modal.title);
    this.confirm.setLabel(model.confirmLabel ?? this.confirmLabel);
    setText(this.message, model.message ?? '');
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  close() {
    this.onClose?.();
    return true;
  }

  confirmAction() {
    const result = this.action?.(this.payload);
    if (result !== false) {
      this.onClose?.();
    }
    return result ?? true;
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    const contentTheme = this.modal.getContentTheme();
    applyTextTheme(this.message, contentTheme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: GARDEN_DIALOG_CONTENT_WIDTH,
    });
    this.keep.applyTheme(contentTheme);
    this.confirm.applyTheme(contentTheme);
  }

  layout(viewportProjection) {
    this.sourceWidth = Number(viewportProjection?.sourceWidth) || 360;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || RETAINED_PAGE_GEOMETRY.height;
    const messageHeight = Math.max(20, Math.ceil(this.message.height));
    const contentHeight = messageHeight + 12 + 30;
    const outerHeight = contentHeight + DIALOG_PADDING * 2 + 4;
    this.modal.setBounds(
      (this.sourceWidth - GARDEN_DIALOG_OUTER_WIDTH) / 2,
      (this.sourceHeight - outerHeight) / 2,
      GARDEN_DIALOG_OUTER_WIDTH,
      outerHeight,
    );
    this.message.position.set(DIALOG_PADDING + 2, DIALOG_PADDING + 2);
    const buttonY = DIALOG_PADDING + 2 + messageHeight + 12;
    const buttonWidth = (GARDEN_DIALOG_CONTENT_WIDTH - 8) / 2;
    this.keep.setBounds(DIALOG_PADDING + 2, buttonY, buttonWidth, 30);
    this.confirm.setBounds(
      DIALOG_PADDING + 2 + buttonWidth + 8,
      buttonY,
      buttonWidth,
      30,
    );
    this.modal.layout(viewportProjection);
  }

  activate() {
    this.modal.activate();
  }

  deactivate() {
    this.modal.deactivate();
  }

  destroy() {
    this.keep.destroy();
    this.confirm.destroy();
    this.modal.destroy();
  }

  getDisplayObject() {
    return this.root;
  }
}

class GardenModalButton {
  constructor({
    id,
    inputRouter,
    modalId,
    label,
    action,
  }) {
    this.id = id;
    this.action = action;
    this.enabled = true;
    this.pressed = false;
    this.width = 0;
    this.height = 0;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root = new Container({ label: id });
    this.frame = new Graphics({ label: `${id}-frame` });
    this.text = createText(label, {
      ...RETAINED_TEXT_STYLES.body,
      align: 'center',
    });
    this.text.anchor.set(0.5);
    this.root.addChild(this.frame, this.text);
    this.registration = inputRouter?.registerPressTarget?.({
      id,
      displayObject: this.root,
      modalId,
      focusable: true,
      enabled: () => this.enabled,
      onPressChange: (pressed) => this.setPressed(pressed),
      onActivate: () => this.action?.() ?? true,
    }) ?? null;
  }

  setLabel(label) {
    setText(this.text, label);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.text.position.set(width / 2, height / 2);
    this.redraw();
  }

  setPressed(pressed) {
    this.pressed = Boolean(pressed);
    this.root.scale.set(this.pressed ? 0.97 : 1);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.text, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      align: 'center',
    });
    this.redraw();
  }

  redraw() {
    this.frame
      .clear()
      .rect(0, 0, this.width, this.height)
      .fill({ color: this.theme.surface })
      .stroke({ color: this.theme.stroke, width: 2 });
  }

  destroy() {
    releaseRegistration(this.registration);
    this.root.destroy({ children: true });
  }
}

class GardenSeedChoiceRow {
  constructor({
    instanceId,
    assetManager,
    inputRouter,
    semanticTargets,
    modalId,
  }) {
    this.instanceId = instanceId;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.actions = {};
    this.semanticId = null;
    this.modalId = modalId;
    this.enabled = false;
    this.pressed = false;
    this.root = new Container({ label: `garden-seed-row-${instanceId}` });
    this.press = new Graphics({ label: `garden-seed-row-${instanceId}-press` });
    this.label = createText('', RETAINED_TEXT_STYLES.body);
    this.quantity = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      align: 'right',
    });
    this.quantity.anchor.set(1, 0);
    this.seedPack = new Sprite(Texture.EMPTY);
    this.seedPack.label = `garden-seed-row-${instanceId}-pack`;
    this.seedPack.anchor.set(0.5);
    this.seedPack.visible = false;
    this.seedItem = new Sprite(Texture.EMPTY);
    this.seedItem.label = `garden-seed-row-${instanceId}-item`;
    this.seedItem.anchor.set(0.5);
    this.seedItem.visible = false;
    this.root.addChild(
      this.press,
      this.label,
      this.quantity,
      this.seedPack,
      this.seedItem,
    );
    this.registration = this.inputRouter?.registerPressTarget?.({
      id: `garden.seed.row.instance.${instanceId}`,
      displayObject: this.root,
      modalId: this.modalId,
      focusable: true,
      enabled: () => this.enabled,
      onPressChange: (pressed) => {
        this.pressed = pressed;
        this.redraw();
      },
      onActivate: () =>
        this.model.onSelect?.(this.model) ??
        this.actions.selectSeed?.(this.model) ??
        true,
    }) ?? null;
  }

  bind(model, actions) {
    this.unregisterSemantic();
    this.model = model ?? {};
    this.actions = actions ?? {};
    this.enabled = this.model.enabled !== false && this.model.disabled !== true;
    setText(this.label, this.model.label ?? 'empty');
    setText(
      this.quantity,
      this.model.quantityText ??
        (this.model.quantity === null || this.model.quantity === undefined
          ? ''
          : String(this.model.quantity)),
    );
    const showsSeedIcon =
      this.model.emptyOption !== true &&
      (this.model.itemKind === 'seed' || this.model.icon?.kind === 'seed');
    const seedPackFrame = showsSeedIcon
      ? getSeedPackBaseFrameName(this.model)
      : null;
    const seedItemFrame = showsSeedIcon
      ? getSeedPackItemFrameName(this.model)
      : null;
    this.seedPack.texture = seedPackFrame
      ? this.assetManager?.getAtlasTexture?.(seedPackFrame) ?? Texture.EMPTY
      : Texture.EMPTY;
    this.seedItem.texture = seedItemFrame
      ? this.assetManager?.getAtlasTexture?.(seedItemFrame) ?? Texture.EMPTY
      : Texture.EMPTY;
    this.seedPack.visible = Boolean(seedPackFrame);
    this.seedItem.visible = Boolean(seedItemFrame);
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = this.enabled ? 'static' : 'none';
    this.semanticId =
      this.model.semanticId ??
      `garden.seed.${this.model.key ?? this.model.itemTypeId ?? this.model.id ?? 'empty'}`;
    this.semanticTargets?.register?.({
      semanticId: this.semanticId,
      tutorialId:
        this.model.tutorialId ??
        (this.model.key ? `garden:seed:${this.model.key}` : null),
      displayObject: this.root,
      state: () => ({
        visible: this.root.visible && this.root.renderable,
        interactive: this.root.eventMode !== 'none',
        enabled: this.enabled,
        active: !this.root.destroyed,
      }),
      activate: () =>
        this.model.onSelect?.(this.model) ??
        this.actions.selectSeed?.(this.model) ??
        true,
    });
    this.applyTheme(this.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.width = width;
    this.root.hitArea = new Rectangle(0, 0, width, SEED_ROW_HEIGHT);
    this.label.position.set(0, 2);
    const iconVisible = this.seedPack.visible;
    const iconCenterX = width - 7;
    this.quantity.position.set(iconVisible ? width - 17 : width, 2);
    this.seedPack.position.set(iconCenterX, SEED_ROW_HEIGHT / 2);
    this.seedPack.width = 14;
    this.seedPack.height = 14;
    this.seedItem.position.copyFrom(this.seedPack.position);
    this.seedItem.width = 14;
    this.seedItem.height = 14;
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    const color = this.enabled && this.model.empty !== true
      ? this.theme.resourceColors.seed
      : this.theme.disabled;
    applyTextTheme(this.label, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
    });
    applyTextTheme(this.quantity, this.theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: color,
      align: 'right',
    });
    this.redraw();
  }

  redraw() {
    this.press.clear();
    if (this.pressed || this.model.selected === true) {
      this.press
        .rect(0, 0, this.width ?? 0, SEED_ROW_HEIGHT)
        .fill({ color: this.theme.text, alpha: 0.1 });
    }
  }

  reset() {
    this.unregisterSemantic();
    this.model = {};
    this.actions = {};
    this.enabled = false;
    this.pressed = false;
    this.root.eventMode = 'none';
    this.root.renderable = false;
    this.root.visible = false;
    setText(this.label, '');
    setText(this.quantity, '');
    this.seedPack.texture = Texture.EMPTY;
    this.seedPack.visible = false;
    this.seedItem.texture = Texture.EMPTY;
    this.seedItem.visible = false;
    this.redraw();
  }

  unregisterSemantic() {
    if (this.semanticId) {
      this.semanticTargets?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
      this.semanticId = null;
    }
  }

  destroy() {
    this.unregisterSemantic();
    releaseRegistration(this.registration);
    this.root.destroy({ children: true });
  }
}

function releaseRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
    return;
  }
  registration?.unregister?.();
}
