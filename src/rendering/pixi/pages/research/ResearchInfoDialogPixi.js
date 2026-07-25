import { Container, Graphics, Rectangle } from 'pixi.js';

import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  applyTextTheme,
  createText,
  setText,
} from '../workshop/RetainedPageKit.js';

const CONTENT_WIDTH = 304;
const MIN_CONTENT_HEIGHT = 53;
const CONTENT_INSETS = Object.freeze({
  top: 25,
  right: 20,
  bottom: 15,
  left: 20,
});
const BACKDROP_ALPHA = 0.68;

export class ResearchInfoDialogPixi {
  constructor({
    parent,
    assetManager = null,
    inputRouter = null,
    semanticTargets = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    if (!parent?.addChild) {
      throw new Error('ResearchInfoDialogPixi requires a Pixi dialog layer.');
    }

    this.parent = parent;
    this.inputRouter = inputRouter;
    this.semanticTargets = semanticTargets;
    this.onClose = onClose;
    this.theme = theme;
    this.viewModel = {};
    this.modalId = 'dialog:research.info';
    this.root = new Container({ label: 'research-info-dialog' });
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.backdrop = new Graphics({ label: 'research-info-backdrop' });
    this.backdrop.eventMode = 'static';
    this.backdrop.cursor = 'default';
    this.frame = new PixiDialogFrame({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      closeSemanticId: 'research.info.close',
      title: 'research',
      coreWidth:
        CONTENT_WIDTH + CONTENT_INSETS.left + CONTENT_INSETS.right,
      coreHeight:
        MIN_CONTENT_HEIGHT +
        CONTENT_INSETS.top +
        CONTENT_INSETS.bottom,
      closeAction: () => {
        this.onClose?.();
        return true;
      },
      label: 'research-info-frame',
    });
    this.panel = this.frame;
    this.copy = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: CONTENT_WIDTH,
    });
    this.titleStars = new PixiStarLevelLabel({
      assetManager,
      label: 'research-info-title-stars',
    });
    this.frame.content.addChild(this.copy);
    this.frame.addChild(this.titleStars);
    this.root.addChild(this.backdrop, this.frame);
    this.parent.addChild(this.root);
    this.handleBackdropTap = (event) => {
      if (event.target === this.backdrop) {
        this.onClose?.();
      }
    };
    this.modalRegistration = null;
    this.usesDirectBackdropInput = !this.inputRouter;
    if (this.usesDirectBackdropInput) {
      this.backdrop.on('pointertap', this.handleBackdropTap);
    }
    this.frame.visible = false;
    this.frame.renderable = false;
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(viewModel) {
    this.viewModel = viewModel ?? {};
    const title =
      this.viewModel.label ??
      this.viewModel.displayName ??
      this.viewModel.title ??
      'research';
    const starLevel = Math.max(
      0,
      Math.floor(
        Number(
          this.viewModel.star?.level ?? this.viewModel.starLevel,
        ) || 0,
      ),
    );
    this.frame.setTitle(title);
    this.titleStars.setLevel(starLevel);
    this.titleStars.visible = starLevel > 0;
    this.titleStars.renderable = this.titleStars.visible;
    setText(
      this.copy,
      this.viewModel.copy ??
        [this.viewModel.description, this.viewModel.lockReason]
          .filter(Boolean)
          .join(' '),
    );
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.frame.applyTheme(this.theme);
    applyTextTheme(this.copy, this.frame.getContentTheme(), {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: CONTENT_WIDTH,
    });
    this.redrawBackdrop();
  }

  layout(viewportProjection) {
    this.sourceWidth =
      Number(viewportProjection?.sourceWidth) ||
      RETAINED_PAGE_GEOMETRY.width;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) ||
      RETAINED_PAGE_GEOMETRY.height;
    const contentHeight = Math.max(
      MIN_CONTENT_HEIGHT,
      Math.ceil(this.copy.height),
    );
    this.frame.setContentBoxSize(
      CONTENT_WIDTH,
      contentHeight,
      CONTENT_INSETS,
    );
    this.frame.position.set(
      (this.sourceWidth - this.frame.outerWidth) / 2,
      (this.sourceHeight - this.frame.outerHeight) / 2,
    );
    this.copy.position.set(
      0,
      Math.max(0, (contentHeight - this.copy.height) / 2),
    );
    this.layoutTitleStars();
    this.redrawBackdrop();
    this.backdrop.hitArea = new Rectangle(
      0,
      0,
      this.sourceWidth,
      this.sourceHeight,
    );
  }

  layoutTitleStars() {
    if (!this.titleStars.visible) {
      return;
    }
    const title = this.frame.titleLabel;
    const gap = 4;
    const accessoryWidth = gap + this.titleStars.measuredWidth;
    title.position.x = this.frame.coreWidth / 2 - accessoryWidth / 2;
    this.titleStars.position.set(
      title.position.x + title.measuredWidth / 2 + gap,
      title.position.y - 6,
    );
  }

  redrawBackdrop() {
    this.backdrop
      .clear()
      .rect(
        0,
        0,
        this.sourceWidth ?? RETAINED_PAGE_GEOMETRY.width,
        this.sourceHeight ?? RETAINED_PAGE_GEOMETRY.height,
      )
      .fill({
        color: this.theme.backdrop,
        alpha: BACKDROP_ALPHA,
      });
  }

  activate() {
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = 'auto';
    this.frame.visible = true;
    this.frame.renderable = true;
    this.modalRegistration =
      this.inputRouter?.pushModal?.({
        id: this.modalId,
        root: this.frame,
        onBack: () => {
          this.onClose?.();
          return true;
        },
        onEscape: () => {
          this.onClose?.();
          return true;
        },
        onOutsidePress: () => {
          this.onClose?.();
          return true;
        },
      }) ?? null;
  }

  deactivate() {
    this.modalRegistration?.unregister?.();
    this.modalRegistration = null;
    this.frame.visible = false;
    this.frame.renderable = false;
    this.root.eventMode = 'none';
    this.root.renderable = false;
    this.root.visible = false;
  }

  destroy() {
    this.modalRegistration?.unregister?.();
    this.modalRegistration = null;
    if (this.usesDirectBackdropInput) {
      this.backdrop.off('pointertap', this.handleBackdropTap);
    }
    this.root.destroy({ children: true });
  }

  getDisplayObject() {
    return this.root;
  }

  getModalContentRoots() {
    return this.frame.getModalContentRoots();
  }
}
