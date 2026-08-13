import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PixiButton } from '../../primitives/PixiButton.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  applyTextTheme,
  createText,
  setText,
} from '../workshop/RetainedPageKit.js';
import { RootRunInventoryChoiceDialogPixi } from '../shared/RootRunInventoryChoiceDialogPixi.js';

const DIALOG_PADDING = PIXI_UI_GEOMETRY.dialogPadding;
const GARDEN_DIALOG_OUTER_WIDTH = 304;
const GARDEN_DIALOG_CONTENT_WIDTH =
  GARDEN_DIALOG_OUTER_WIDTH - DIALOG_PADDING * 2;
const DANGER_MESSAGE_ZONE_HEIGHT = 40;
const SWAP_MESSAGE_ZONE_HEIGHT = 64;

/**
 * Retained, lazy-once seed chooser. The dialog owns no garden rules: rows are
 * already filtered/formatted by the presenter and invoke the supplied action.
 */
export class GardenSeedDialogPixi extends RootRunInventoryChoiceDialogPixi {
  constructor(options = {}) {
    super({
      ...options,
      id: 'garden.seed',
      title: 'choose seed',
      itemKind: 'seed',
      selectActionName: 'selectSeed',
      listLabel: 'garden-seed-dialog-list',
    });
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
    variant = 'default',
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.id = id;
    this.variant = variant === 'danger' ? 'danger' : 'default';
    this.onClose = onClose;
    this.modal = new PixiOwnedDialogSurface({
      id,
      parent,
      inputRouter,
      assetManager,
      title,
      titleVariant: this.variant,
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.message = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      align: this.variant === 'danger' ? 'center' : 'left',
      wordWrapWidth: GARDEN_DIALOG_CONTENT_WIDTH,
    });
    this.message.anchor.set(this.variant === 'danger' ? 0.5 : 0, 0.5);
    this.keep = new GardenModalButton({
      id: `${id}.keep`,
      assetManager,
      inputRouter,
      label: 'Keep',
      variant: 'yellow',
      action: () => this.close(),
    });
    this.confirm = new GardenModalButton({
      id: `${id}.confirm`,
      assetManager,
      inputRouter,
      label: titleCaseText(confirmLabel),
      variant: this.variant === 'danger' ? 'red' : 'yellow',
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
    const title = model.title ?? this.modal.title;
    const confirmLabel = model.confirmLabel ?? this.confirmLabel;
    const message = model.message ?? '';
    this.modal.setTitle(titleCaseText(title));
    this.confirm.setLabel(titleCaseText(confirmLabel));
    setText(
      this.message,
      this.variant === 'danger' ? titleCaseText(message) : message,
    );
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
      align: this.variant === 'danger' ? 'center' : 'left',
      wordWrapWidth: GARDEN_DIALOG_CONTENT_WIDTH,
    });
    this.keep.applyTheme(contentTheme);
    this.confirm.applyTheme(contentTheme);
  }

  layout(viewportProjection) {
    this.sourceWidth =
      Number(viewportProjection?.sourceWidth) || PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || RETAINED_PAGE_GEOMETRY.height;
    const messageHeight =
      this.variant === 'danger'
        ? DANGER_MESSAGE_ZONE_HEIGHT
        : Math.max(SWAP_MESSAGE_ZONE_HEIGHT, Math.ceil(this.message.height));
    const contentHeight = messageHeight + 12 + 30;
    const outerHeight = contentHeight + DIALOG_PADDING * 2 + 4;
    this.modal.setBounds(
      (this.sourceWidth - GARDEN_DIALOG_OUTER_WIDTH) / 2,
      (this.sourceHeight - outerHeight) / 2,
      GARDEN_DIALOG_OUTER_WIDTH,
      outerHeight,
    );
    if (this.variant === 'danger') {
      this.message.position.set(
        DIALOG_PADDING + 2 + GARDEN_DIALOG_CONTENT_WIDTH / 2,
        DIALOG_PADDING + 2 + messageHeight / 2,
      );
    } else {
      this.message.position.set(
        DIALOG_PADDING + 2,
        DIALOG_PADDING + 2 + messageHeight / 2,
      );
    }
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
    assetManager,
    inputRouter,
    label,
    variant = 'yellow',
    action,
  }) {
    this.id = id;
    this.action = action;
    this.variant = variant;
    this.button = new PixiButton({
      assetManager,
      inputRouter,
      text: label,
      width: 0,
      height: 0,
      action,
      variant,
      label: id,
    });
    this.root = this.button;
    this.frame = this.button.rootRunFrame;
    this.text = this.button.textLabel.textObject;
  }

  setLabel(label) {
    this.button.setText(label);
  }

  setBounds(x, y, width, height) {
    this.button.position.set(x, y);
    this.button.setSize(width, height);
  }

  applyTheme(theme) {
    this.button.applyTheme(theme ?? DEFAULT_PIXI_THEME_SNAPSHOT);
  }

  destroy() {
    this.button.destroy({ children: true });
    this.button = null;
  }
}

function titleCaseText(value) {
  return String(value ?? '').replace(
    /(^|[\s-])([a-z])/g,
    (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
  );
}
