import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import { getIngredientIconFrameName } from '../../../../assets/items/ingredients/ingredientIcons.js';
import { getPotionIconFrameName } from '../../../../assets/items/potions/potionIcons.js';
import {
  getSeedIconFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedScrollArea,
  applyTextTheme,
  createText,
  normalizeRows,
  setText,
} from './RetainedPageKit.js';

const WORKSHOP_DIALOG_CONTENT_WIDTH = 264;
const BAG_DIALOG_TAB_ROW_WIDTH = 286;
const BAG_DIALOG_TAB_FONT_SIZE = PIXI_UI_GEOMETRY.borderLabelFontSize;
const DIALOG_SCROLL_VIEWPORT_TOP = 18;
const DIALOG_SCROLL_VIEWPORT_BOTTOM_INSET = 30;
const DIALOG_PAPER_TOP =
  PIXI_ROOT_RUN_GEOMETRY.dialog.paperInsetTop -
  PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
const DIALOG_PAPER_BOTTOM_INSET =
  PIXI_ROOT_RUN_GEOMETRY.dialog.paperInsetBottom -
  PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
const BAG_SCROLL_VIEWPORT_TOP_INSET =
  DIALOG_SCROLL_VIEWPORT_BOTTOM_INSET -
  DIALOG_PAPER_BOTTOM_INSET -
  (DIALOG_SCROLL_VIEWPORT_TOP - DIALOG_PAPER_TOP);
const BAG_SCROLLBAR_SHIFT_RIGHT = 4;
const BAG_ROW_VALUE_INSET_RIGHT = 2;
const STATS_SCROLL_VIEWPORT_TOP_INSET = 6;
const STATS_SCROLLBAR_SHIFT_RIGHT = 4;
const RESOURCE_ICON_FRAMES = Object.freeze({
  coin: 'resource:coin',
  crystal: 'resource:crystal',
  emerald: 'resource:emerald',
  mana: 'resource:mana',
  ruby: 'resource:ruby',
});

/**
 * Shared retained shell for Workshop-owned list/dialog surfaces.
 *
 * Feature presenters provide already-formatted tabs, rows, copy, and actions;
 * this view does not reproduce bag, alliance, event, or leaderboard rules.
 */
export class WorkshopDialogPixi {
  constructor({
    dialogId,
    parent,
    assetManager = null,
    inputRouter = null,
    textEntryService = null,
    semanticTargets = null,
    counters = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    if (!dialogId || !parent?.addChild) {
      throw new Error('WorkshopDialogPixi requires a dialog id and Pixi parent layer.');
    }

    this.dialogId = dialogId;
    this.parent = parent;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.textEntryService = textEntryService;
    this.semanticTargets = semanticTargets;
    this.onClose = onClose;
    this.theme = theme;
    this.registeredTargetIds = new Set();
    this.viewModel = {};
    this.sourceWidth = RETAINED_PAGE_GEOMETRY.width;
    this.sourceHeight = RETAINED_PAGE_GEOMETRY.height;
    this.isBagDialog = this.dialogId === 'workshop.bag';
    const isStatsDialog = this.dialogId === 'workshop.stats';
    this.scrollContentPaddingTop = PIXI_UI_GEOMETRY.dialogScrollPaddingTop;
    this.scrollViewportTopInset = this.isBagDialog
      ? BAG_SCROLL_VIEWPORT_TOP_INSET
      : isStatsDialog
        ? STATS_SCROLL_VIEWPORT_TOP_INSET
        : 0;
    this.scrollViewportWidth =
      WORKSHOP_DIALOG_CONTENT_WIDTH +
      (this.isBagDialog
        ? BAG_SCROLLBAR_SHIFT_RIGHT
        : isStatsDialog
          ? STATS_SCROLLBAR_SHIFT_RIGHT
          : 0);

    this.modalId = `dialog:${this.dialogId}`;
    this.modal = new PixiOwnedDialogSurface({
      id: this.modalId,
      parent: this.parent,
      assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticTargets,
      title: dialogId.split('.').at(-1),
      onClose: () => this.onClose?.(),
      theme,
      label: `${dialogId}-dialog`,
    });
    this.root = this.modal.root;
    this.backdrop = this.modal.backdrop;
    this.panel = this.modal.panel;
    this.copy = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 264,
    });
    this.status = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth: 264,
    });
    this.scroll = new RetainedScrollArea({
      label: `${dialogId}-scroll`,
      inputRouter: this.inputRouter,
    });
    this.tabsLayer = new Container({ label: `${dialogId}-tabs` });
    this.panel.content.addChild(
      this.copy,
      this.scroll.root,
      this.status,
    );
    this.panel.addChild(this.tabsLayer);
    this.composerField = null;
    this.composerSubmit = null;
    this.composerSubmitting = false;
    this.composerSubmissionToken = 0;
    this.composerStatus = '';
    this.boundStatus = '';

    if (this.dialogId === 'workshop.worldChat') {
      this.composerField = new PixiTextField({
        assetManager: this.assetManager,
        inputRouter: this.inputRouter,
        textEntryService: this.textEntryService,
        placeholder: 'message',
        inputKind: 'text',
        maxLength: 160,
        label: `${dialogId}-composer`,
        onChange: () => this.updateComposerControl(),
        onSubmit: () => void this.submitComposer(),
      });
      this.composerSubmit = new RetainedButton({
        assetManager: this.assetManager,
        buttonLabel: `${dialogId}-submit`,
        inputRouter: this.inputRouter,
        variant: 'button',
      });
      this.panel.content.addChild(
        this.composerField,
        this.composerSubmit.root,
      );
      this.composerField.visible = false;
      this.composerField.renderable = false;
      this.composerSubmit.root.visible = false;
      this.composerSubmit.root.renderable = false;
    }

    this.rowPool = new WidgetPool({
      name: `${dialogId} row pool`,
      counters,
      create: () =>
        new WorkshopDialogRow({
          dialog: this,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 30,
    });
    this.rows = new PooledCollection({
      name: `${dialogId} rows`,
      pool: this.rowPool,
      counters,
      keyOf: (row, index) => row.id ?? row.key ?? index,
      bind: (widget, row) => widget.bind(row),
      afterReconcile: (widgets) => this.orderRows(widgets),
    });
    this.tabPool = new WidgetPool({
      name: `${dialogId} tab pool`,
      counters,
      create: () =>
        new RetainedButton({
          assetManager: this.assetManager,
          buttonLabel: `${dialogId}-tab`,
          inputRouter: this.inputRouter,
          variant: 'tab',
        }),
      reset: (button) => button.setModel({ label: '', enabled: false }),
      dispose: (button) => button.destroy(),
      maxSize: 8,
    });
    this.tabs = new PooledCollection({
      name: `${dialogId} tabs`,
      pool: this.tabPool,
      counters,
      keyOf: (tab) => tab.id,
      bind: (button, tab) => this.bindTab(button, tab),
      afterReconcile: (buttons) => this.orderTabs(buttons),
    });
    this.applyTheme(theme);
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  bind(viewModel) {
    this.viewModel = viewModel ?? {};
    this.modal.setTitle(
      this.viewModel.title ?? this.dialogId.split('.').at(-1),
    );
    setText(this.copy, this.viewModel.copy ?? this.viewModel.description ?? '');
    this.boundStatus = this.viewModel.status ?? '';
    this.bindComposer(this.viewModel.composer);
    this.updateStatus();
    this.tabs.reconcile(normalizeRows(this.viewModel.tabs));
    this.rows.reconcile(normalizeRows(this.viewModel.rows));
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  bindTab(button, tab) {
    button.applyTheme(this.contentTheme ?? this.theme);
    button.setModel({
      label: tab.label ?? tab.id,
      selected: tab.selected === true || tab.id === this.viewModel.selectedTabId,
      notification: tab.notification === true,
      enabled: tab.enabled !== false,
      action: () => tab.onSelect?.(tab.id) ?? this.viewModel.onSelectTab?.(tab.id),
    });
    button.control.textLabel.setFontSize(
      this.isBagDialog
        ? BAG_DIALOG_TAB_FONT_SIZE
        : PIXI_UI_GEOMETRY.bodyFontSize,
    );
  }

  orderRows(widgets) {
    this.scroll.content.removeChildren();
    let y = this.scrollContentPaddingTop;

    for (const widget of widgets) {
      this.scroll.content.addChild(widget.root);
      widget.setBounds(
        0,
        y,
        WORKSHOP_DIALOG_CONTENT_WIDTH,
        widget.getPreferredHeight(),
      );
      y += widget.getPreferredHeight() + 4;
    }

    this.scroll.setContentHeight(
      Math.max(
        this.scrollContentPaddingTop,
        y - (widgets.length > 0 ? 4 : 0),
      ),
    );
  }

  orderTabs(buttons) {
    this.tabsLayer.removeChildren();

    for (const button of buttons) {
      this.tabsLayer.addChild(button.root);
    }
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    const contentTheme = this.modal.getContentTheme();
    this.contentTheme = contentTheme;
    applyTextTheme(this.copy, contentTheme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 264,
    });
    applyTextTheme(this.status, contentTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: contentTheme.muted,
      wordWrapWidth: 264,
    });

    for (const row of this.rows?.getWidgets?.() ?? []) {
      row.applyTheme(contentTheme);
    }

    for (const button of this.tabs?.getWidgets?.() ?? []) {
      button.applyTheme(contentTheme);
    }

    this.composerField?.applyTheme(contentTheme);
    this.composerSubmit?.applyTheme(contentTheme);
  }

  layout(viewportProjection) {
    this.sourceWidth = Number(viewportProjection?.sourceWidth) || 360;
    this.sourceHeight = Number(viewportProjection?.sourceHeight) || 2170 / 3;
    const width = 304;
    const tabs = this.tabs.getWidgets();
    const tabsHeight = tabs.length > 0 ? 28 : 0;
    const composerHeight =
      this.composerField?.visible === true ? 32 : 0;
    const height = Math.min(382, this.sourceHeight - 80 - tabsHeight);
    const panelX = (this.sourceWidth - width) / 2;
    const panelY = (this.sourceHeight - height - tabsHeight) / 2;
    this.modal.layout(viewportProjection);
    this.modal.setBounds(
      panelX,
      panelY,
      width,
      height,
    );
    this.copy.position.set(20, 18);
    const copyHeight = this.copy.text ? Math.ceil(this.copy.height) + 8 : 0;
    const statusHeight = this.status.text ? 18 : 0;
    this.scroll.setBounds(
      20,
      DIALOG_SCROLL_VIEWPORT_TOP +
        copyHeight +
        this.scrollViewportTopInset,
      this.scrollViewportWidth,
      height -
        DIALOG_SCROLL_VIEWPORT_TOP -
        DIALOG_SCROLL_VIEWPORT_BOTTOM_INSET -
        copyHeight -
        statusHeight -
        composerHeight -
        this.scrollViewportTopInset,
    );
    const tabRowWidth = this.isBagDialog
      ? BAG_DIALOG_TAB_ROW_WIDTH
      : WORKSHOP_DIALOG_CONTENT_WIDTH;
    this.tabsLayer.position.set((width - tabRowWidth) / 2, height - 2);
    this.tabsLayer.visible = tabs.length > 0;
    const gap = 3;
    const tabWidth =
      tabs.length > 0
        ? (tabRowWidth - gap * (tabs.length - 1)) / tabs.length
        : 0;
    let tabX = 0;

    for (const button of tabs) {
      button.setBounds(tabX, 0, tabWidth, 28);
      tabX += tabWidth + gap;
    }

    this.status.position.set(
      20,
      height - 24 - statusHeight - composerHeight,
    );

    if (this.composerField) {
      this.composerField.position.set(20, height - 46);
      this.composerField.setSize(202, 24);
      this.composerSubmit.setBounds(226, height - 46, 58, 24);
    }
  }

  activate() {
    this.modal.activate();
  }

  deactivate() {
    this.composerSubmissionToken += 1;
    this.composerSubmitting = false;
    this.composerStatus = '';
    this.composerField?.blur();
    this.updateStatus();
    this.updateComposerControl();
    this.modal.deactivate();
  }

  destroy() {
    this.clearTargets();
    this.composerSubmissionToken += 1;
    this.composerField?.destroy({ children: true });
    this.composerField = null;
    this.composerSubmit?.destroy();
    this.composerSubmit = null;

    this.rows.destroy();
    this.rowPool.destroy();
    this.tabs.destroy();
    this.tabPool.destroy();
    this.scroll.destroy();
    this.modal.destroy();
  }

  bindComposer(model) {
    if (!this.composerField || !this.composerSubmit) {
      return;
    }

    this.composerModel =
      model && this.viewModel.onSubmit
        ? model
        : null;
    const visible = Boolean(this.composerModel);
    this.composerField.visible = visible;
    this.composerField.renderable = visible;
    this.composerSubmit.root.visible = visible;
    this.composerSubmit.root.renderable = visible;

    if (!visible) {
      this.composerField.blur();
      return;
    }

    this.composerField.placeholder =
      this.composerModel.placeholder ?? 'message';
    this.composerField.maxLength =
      this.composerModel.maxLength ?? 160;
    this.composerField.inputKind = 'text';
    this.composerField.multiline = false;
    this.updateComposerControl();
  }

  updateComposerControl() {
    if (!this.composerSubmit) {
      return;
    }

    const enabled =
      Boolean(this.composerModel) &&
      this.composerModel.enabled !== false &&
      !this.composerSubmitting &&
      Boolean(this.composerField?.value.trim());
    this.composerSubmit.setModel({
      label: this.composerSubmitting ? 'sending' : 'send',
      enabled,
      action: () => this.submitComposer(),
    });
  }

  async submitComposer() {
    const body = String(this.composerField?.value ?? '');
    if (
      this.composerSubmitting ||
      this.composerModel?.enabled === false ||
      !body.trim() ||
      typeof this.viewModel.onSubmit !== 'function'
    ) {
      this.updateComposerControl();
      return false;
    }

    const token = ++this.composerSubmissionToken;
    this.composerSubmitting = true;
    this.composerStatus = 'sending';
    this.updateStatus();
    this.updateComposerControl();

    let result;
    try {
      result = await this.viewModel.onSubmit(body);
    } catch {
      result = { ok: false, reason: 'send_failed' };
    }

    if (token !== this.composerSubmissionToken) {
      return false;
    }

    this.composerSubmitting = false;
    if (result?.ok === true) {
      this.composerField.setValue('');
      this.composerStatus = 'sent';
    } else {
      this.composerStatus = formatComposerFailure(result?.reason);
    }
    this.updateStatus();
    this.updateComposerControl();
    return result?.ok === true;
  }

  updateStatus() {
    setText(this.status, this.composerStatus || this.boundStatus || '');
  }

  registerTarget(descriptor) {
    if (!this.semanticTargets || !descriptor.semanticId) {
      return;
    }

    this.unregisterTarget(descriptor.semanticId);
    this.semanticTargets.register(descriptor);
    this.registeredTargetIds.add(descriptor.semanticId);
  }

  unregisterTarget(semanticId) {
    if (!this.registeredTargetIds.delete(semanticId)) {
      return false;
    }

    return this.semanticTargets?.unregister(semanticId) ?? false;
  }

  clearTargets() {
    for (const semanticId of this.registeredTargetIds) {
      this.semanticTargets?.unregister(semanticId);
    }

    this.registeredTargetIds.clear();
  }

}

class WorkshopDialogRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.root = new Container({ label: `${dialog.dialogId}-row` });
    this.label = createText('', RETAINED_TEXT_STYLES.body);
    this.value = createText('', RETAINED_TEXT_STYLES.body);
    this.value.anchor.set(1, 0);
    this.valueIcon = new Sprite(Texture.EMPTY);
    this.valueIcon.label = `${dialog.dialogId}-row:value-icon`;
    this.valueIcon.anchor.set(0.5);
    this.valueIcon.visible = false;
    this.valueIconOverlay = new Sprite(Texture.EMPTY);
    this.valueIconOverlay.label = `${dialog.dialogId}-row:value-icon-overlay`;
    this.valueIconOverlay.anchor.set(0.5);
    this.valueIconOverlay.visible = false;
    this.action = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-row-action`,
      inputRouter: dialog.inputRouter,
    });
    this.root.addChild(
      this.label,
      this.valueIcon,
      this.valueIconOverlay,
      this.value,
      this.action.root,
    );
  }

  bind(model) {
    this.model = model;
    this.root.visible = true;
    setText(this.label, model.label ?? model.text ?? '');
    setText(this.value, model.value ?? '');
    const iconFrames = resolveValueIconFrames(model);
    this.valueIcon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      iconFrames.base,
    );
    this.valueIconOverlay.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      iconFrames.overlay,
    );
    this.valueIcon.visible = this.valueIcon.texture !== Texture.EMPTY;
    this.valueIconOverlay.visible =
      this.valueIcon.visible && this.valueIconOverlay.texture !== Texture.EMPTY;
    const hasAction = Boolean(model.actionLabel || model.onActivate);
    this.action.root.visible = hasAction;
    this.action.setModel({
      label: model.actionLabel ?? 'open',
      enabled: model.enabled !== false,
      notification: model.notification === true,
      action: () => model.onActivate?.(model),
    });
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
    this.targetId = model.semanticId ?? null;

    if (this.targetId) {
      this.dialog.registerTarget({
        semanticId: this.targetId,
        tutorialId: model.tutorialId ?? null,
        displayObject: hasAction ? this.action.root : this.root,
        state: () => ({
          enabled: model.enabled !== false,
          interactive: hasAction,
        }),
        activate: () => model.onActivate?.(model) ?? false,
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.label.position.set(0, 2);
    const actionWidth = this.action.root.visible ? 74 : 0;
    this.action.setBounds(width - actionWidth, 0, actionWidth, 20);
    this.value.position.set(
      width -
        (this.action.root.visible ? actionWidth + 6 : 0) -
        (this.dialog.isBagDialog ? BAG_ROW_VALUE_INSET_RIGHT : 0),
      2,
    );
    const iconSize = 16;
    const iconCenterX = this.value.x - this.value.width - 3 - iconSize / 2;
    if (this.valueIconOverlay.visible) {
      layoutPixiSeedPackIcon({
        base: this.valueIcon,
        item: this.valueIconOverlay,
        x: iconCenterX,
        y: 9,
        width: iconSize,
        height: iconSize,
        fitPositionX: 1,
      });
    } else {
      this.valueIcon.position.set(iconCenterX, 9);
      this.valueIcon.width = iconSize;
      this.valueIcon.height = iconSize;
      this.valueIconOverlay.rotation = 0;
    }
    this.root.hitArea = new Rectangle(0, 0, width, height);
  }

  getPreferredHeight() {
    return Math.max(
      20,
      this.label.height,
      this.value.height,
      Number(this.model?.height) || 0,
    );
  }

  applyTheme(theme) {
    applyTextTheme(this.label, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: this.model?.muted ? theme.muted : theme.text,
      wordWrapWidth: 164,
    });
    applyTextTheme(this.value, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fill: this.dialog.isBagDialog
        ? theme.text
        : this.model?.resourceKey
        ? theme.resourceColors?.[this.model.resourceKey] ?? theme.text
        : this.model?.muted
          ? theme.muted
          : theme.text,
    });
    this.action.applyTheme(theme);
  }

  reset() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }

    this.targetId = null;
    this.model = null;
    this.valueIcon.texture = Texture.EMPTY;
    this.valueIcon.visible = false;
    this.valueIconOverlay.texture = Texture.EMPTY;
    this.valueIconOverlay.visible = false;
    this.valueIconOverlay.rotation = 0;
    this.root.visible = false;
  }

  destroy() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }

    this.action.destroy();
    this.root.destroy({ children: true });
  }
}

function resolveValueIconFrames(model = {}) {
  const kind = String(model.itemKind ?? '').trim().toLowerCase();
  const key = model.itemKey ?? null;

  if (kind === 'resource') {
    return { base: RESOURCE_ICON_FRAMES[key] ?? null, overlay: null };
  }

  if (kind === 'seed') {
    return {
      base: getSeedIconFrameName(key),
      overlay: getSeedPackItemFrameName({
        key,
        label: model.label,
      }),
    };
  }

  if (kind === 'herb') {
    return { base: getHerbIconFrameName(key), overlay: null };
  }

  if (kind === 'potion') {
    return { base: getPotionIconFrameName(key), overlay: null };
  }

  if (kind === 'ingredient') {
    return { base: getIngredientIconFrameName(key), overlay: null };
  }

  return { base: null, overlay: null };
}

function resolveAtlasTexture(assetManager, frameName) {
  if (!frameName || !assetManager?.getAtlasTexture) {
    return Texture.EMPTY;
  }

  return assetManager.getAtlasTexture(frameName) ?? Texture.EMPTY;
}

function formatComposerFailure(reason) {
  switch (reason) {
    case 'empty_message':
      return 'write a message';
    case 'rate_limited':
      return 'wait before sending';
    case 'global_rate_limited':
      return 'chat busy';
    case 'chat_locked':
      return 'level syncing';
    case 'no_alliance':
      return 'join alliance first';
    case 'account_in_use':
      return 'open elsewhere';
    case 'maintenance':
      return 'maintenance';
    case 'offline':
      return 'offline';
    default:
      return 'send failed';
  }
}
