import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
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

export const PRESTIGE_INFO_DIALOG_ID = 'prestige.info';

const PRESTIGE_INFO_DIALOG_WIDTH = 304;
const PRESTIGE_INFO_COPY_WIDTH =
  PRESTIGE_INFO_DIALOG_WIDTH - PIXI_UI_GEOMETRY.dialogPadding * 2 - 4;
const PRESTIGE_INFO_DIALOG_MIN_HEIGHT = 112;
const PRESTIGE_INFO_DIALOG_COPY_PADDING_Y = 26;

/**
 * Page-owned Prestige information dialog. Presenter copy is wrapped and then
 * centered in both axes inside the shared player-dialog shell.
 */
export class PrestigeInfoDialogPixi {
  constructor({
    parent,
    inputRouter = null,
    semanticRegistry = null,
    assetManager = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.modal = new PixiOwnedDialogSurface({
      id: PRESTIGE_INFO_DIALOG_ID,
      parent,
      inputRouter,
      semanticRegistry,
      assetManager,
      title: 'Info',
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.copy = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      align: 'center',
      wordWrapWidth: PRESTIGE_INFO_COPY_WIDTH,
    });
    this.copy.anchor.set(0.5);
    this.modal.panel.content.addChild(this.copy);
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(viewModel) {
    this.model = viewModel ?? {};
    const isText = typeof this.model === 'string';
    this.modal.setTitle(isText ? 'Info' : this.model.title ?? 'Info');
    setText(
      this.copy,
      isText ? this.model : this.model.copy ?? this.model.text ?? '',
    );
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    applyTextTheme(this.copy, this.modal.getContentTheme(), {
      ...RETAINED_TEXT_STYLES.body,
      align: 'center',
      wordWrapWidth: PRESTIGE_INFO_COPY_WIDTH,
    });
  }

  layout(viewportProjection) {
    this.sourceWidth =
      Number(viewportProjection?.sourceWidth) || PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || RETAINED_PAGE_GEOMETRY.height;
    const dialogHeight = Math.max(
      PRESTIGE_INFO_DIALOG_MIN_HEIGHT,
      Math.ceil(this.copy.height) + PRESTIGE_INFO_DIALOG_COPY_PADDING_Y * 2,
    );
    this.modal.setBounds(
      (this.sourceWidth - PRESTIGE_INFO_DIALOG_WIDTH) / 2,
      (this.sourceHeight - dialogHeight) / 2,
      PRESTIGE_INFO_DIALOG_WIDTH,
      dialogHeight,
    );
    this.copy.position.set(
      PRESTIGE_INFO_DIALOG_WIDTH / 2,
      dialogHeight / 2,
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
    this.modal.destroy();
  }

  getDisplayObject() {
    return this.root;
  }
}
