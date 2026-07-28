import {
  ColorMatrixFilter,
  Container,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiNineSliceFrame } from './PixiNineSliceFrame.js';
import { PixiTextLabel } from './PixiTextLabel.js';

export const PIXI_DIALOG_PALETTE = Object.freeze({
  frame: '#634934',
  paper: '#ffe7c8',
  ink: '#634934',
  muted: '#76563f',
  disabled: '#80654e',
  coin: '#875800',
  crystal: '#7b3fc4',
  mana: '#25658a',
  herb: '#4a7146',
  title: '#9d25db',
  titleDanger: '#db1e2a',
  titleText: '#ffffff',
  titleStroke: '#0a0a0a',
  shadow: '#000000',
});

export const PIXI_DIALOG_BASE_GEOMETRY = Object.freeze({
  contentWidth: 304,
  minContentHeight: 53,
  coreWidth: 344,
  minCoreHeight: 93,
});

export const PIXI_DIALOG_SPLIT_PAPER_GEOMETRY = Object.freeze({
  sectionGap: 8,
  contentInsetTop: 5,
  contentInsetBottom: 5,
});

const TITLE_TEXT_PADDING_X = 89 / 3;
const TITLE_MAX_INSET_X = 8;
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = 4;
const SHADOW_ALPHA = 0.42;
const CLOSE_PRESS_SCALE = 0.94;

/**
 * Retained player-facing dialog chrome.
 *
 * The core rectangle matches the authored dialog box. Root Run's brown shell,
 * paper and title art extend around that core exactly as their CSS
 * border-image composition did. Consumers add their display tree to
 * `content`; blocker gates use the same shell with dismissal disabled when
 * the flow must keep control.
 */
export class PixiDialogFrame extends Container {
  constructor({
    assetManager,
    inputRouter = null,
    semanticRegistry = null,
    closeSemanticId = null,
    closeTutorialId = null,
    title = '',
    titleVariant = 'default',
    coreWidth = PIXI_DIALOG_BASE_GEOMETRY.coreWidth,
    coreHeight = PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
    closeAction = null,
    label = 'dialogFrame',
  } = {}) {
    super({ label });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.closeSemanticId = closeSemanticId;
    this.closeAction = typeof closeAction === 'function' ? closeAction : null;
    this.coreWidth = Math.max(0, Number(coreWidth) || 0);
    this.coreHeight = Math.max(
      PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
      Number(coreHeight) || 0,
    );
    this.contentBoxWidth = this.coreWidth;
    this.contentBoxHeight = this.coreHeight;
    this.contentInsets = createContentInsets();
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.contentTheme = createContentTheme(this.theme);
    this.paperVisible = true;

    const frameTexture = this.resolveTexture(PIXI_ROOT_RUN_ASSETS.dialogBack);
    this.shadow = new PixiNineSliceFrame({
      texture: frameTexture,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.frameSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.frameBorderInsets,
      label: `${label}:shadow`,
    });
    this.shadow.tint = PIXI_DIALOG_PALETTE.shadow;
    this.shadow.alpha = SHADOW_ALPHA;
    this.shadow.eventMode = 'none';

    this.outerFrame = new PixiNineSliceFrame({
      texture: frameTexture,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.frameSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.frameBorderInsets,
      label: `${label}:outerFrame`,
    });
    this.outerFrame.eventMode = 'none';
    // Compatibility names used by retained dialog consumers.
    this.frame = this.outerFrame;
    this.paddingX = 0;
    this.paddingY = 0;
    this.borderWidth = 0;

    this.paperFrame = new PixiNineSliceFrame({
      texture: this.resolveTexture(PIXI_ROOT_RUN_ASSETS.dialogPaper),
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.paperSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
      label: `${label}:paperFrame`,
    });
    this.paperFrame.eventMode = 'none';

    this.content = new Container({ label: `${label}:content` });

    this.titleFrame = new PixiNineSliceFrame({
      texture: this.resolveTexture(PIXI_ROOT_RUN_ASSETS.dialogTitle),
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.titleSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.titleBorderInsets,
      label: `${label}:titleFrame`,
    });
    this.titleFrame.eventMode = 'none';
    this.titleLabel = new PixiTextLabel({
      text: title,
      fontSize: PIXI_ROOT_RUN_GEOMETRY.dialog.titleTextSize,
      fontWeight: 'normal',
      lineHeight: 73 / 3,
      color: PIXI_DIALOG_PALETTE.titleText,
      stroke: {
        color: PIXI_DIALOG_PALETTE.titleStroke,
        width: PIXI_ROOT_RUN_GEOMETRY.dialog.titleTextStroke,
      },
      anchor: { x: 0.5, y: 0.5 },
      label: `${label}:title`,
    });

    this.closeControl = new Container({ label: `${label}:closeControl` });
    this.closeControl.hitArea = new Rectangle(
      -PIXI_ROOT_RUN_GEOMETRY.dialog.closeSize / 2,
      -PIXI_ROOT_RUN_GEOMETRY.dialog.closeSize / 2,
      PIXI_ROOT_RUN_GEOMETRY.dialog.closeSize,
      PIXI_ROOT_RUN_GEOMETRY.dialog.closeSize,
    );
    this.closeSprite = new Sprite({
      texture: this.resolveTexture(PIXI_ROOT_RUN_ASSETS.dialogClose),
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:closeSprite`,
    });
    this.closeSprite.width = PIXI_ROOT_RUN_GEOMETRY.dialog.closeSize;
    this.closeSprite.height = PIXI_ROOT_RUN_GEOMETRY.dialog.closeSize;
    this.closeControl.addChild(this.closeSprite);

    this.addChild(
      this.shadow,
      this.outerFrame,
      this.paperFrame,
      this.content,
      this.titleFrame,
      this.titleLabel,
      this.closeControl,
    );

    this.titleVariant = 'default';
    this.dangerTitleFilter = null;
    this.modalContentRoots = Object.freeze([this]);
    this.closeRegistration =
      this.inputRouter?.registerPressTarget?.(this.closeControl, {
        enabled: () => this.isCloseEnabled(),
        onPressChange: (pressed) => this.setClosePressed(pressed),
        onActivate: (payload) => this.activateClose(payload),
        haptic: 'light',
        excludePageSwipe: true,
      }) ?? null;
    this.closeSemanticDefinition =
      closeSemanticId && semanticRegistry
        ? semanticRegistry.register({
            semanticId: closeSemanticId,
            tutorialId: closeTutorialId,
            displayObject: this.closeControl,
            state: () => ({
              enabled: this.isCloseEnabled(),
              interactive: this.closeControl.eventMode !== 'none',
              visible:
                this.closeControl.visible && this.closeControl.renderable,
              active: !this.destroyed,
              selected: false,
            }),
            activate: (payload) => this.activateClose(payload),
          })
        : null;

    this.setTitle(title);
    this.setTitleVariant(titleVariant);
    this.relayout();
    this.syncCloseState();
  }

  setCoreSize(width, height) {
    this.contentBoxWidth = Math.max(0, Number(width) || 0);
    this.contentBoxHeight = Math.max(
      PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
      Number(height) || 0,
    );
    this.contentInsets = createContentInsets();
    this.coreWidth = this.contentBoxWidth;
    this.coreHeight = this.contentBoxHeight;
    this.paddingX = 0;
    this.paddingY = 0;
    this.content.position.set(0, 0);
    this.relayout();
    return this;
  }

  /**
   * Applies CSS content-box sizing to the retained frame. The legacy DOM
   * player dialogs inherit content-box sizing, so their authored width and
   * height exclude the still-active dialog padding even though the Root Run
   * skin removes the base 2px border.
   */
  setContentBoxSize(width, height, insets = 0) {
    this.contentBoxWidth = Math.max(0, Number(width) || 0);
    this.contentBoxHeight = Math.max(
      PIXI_DIALOG_BASE_GEOMETRY.minContentHeight,
      Number(height) || 0,
    );
    this.contentInsets = createContentInsets(insets);
    this.coreWidth =
      this.contentBoxWidth +
      this.contentInsets.left +
      this.contentInsets.right;
    this.coreHeight =
      this.contentBoxHeight +
      this.contentInsets.top +
      this.contentInsets.bottom;
    this.paddingX = this.contentInsets.left;
    this.paddingY = this.contentInsets.top;
    this.content.position.set(
      this.contentInsets.left,
      this.contentInsets.top,
    );
    this.relayout();
    return this;
  }

  setContentSize(width, height) {
    return this.setCoreSize(width, height);
  }

  setOuterSize(width, height) {
    return this.setCoreSize(width, height);
  }

  setTitle(title) {
    const text = String(title ?? '');
    this.titleLabel.setText(text);
    const visible = text.length > 0;
    this.titleFrame.visible = visible;
    this.titleFrame.renderable = visible;
    this.titleLabel.visible = visible;
    this.titleLabel.renderable = visible;
    this.layoutTitle();
    return this;
  }

  setTitleVariant(variant = 'default') {
    this.titleVariant = variant === 'danger' ? 'danger' : 'default';
    if (this.titleVariant === 'danger') {
      if (!this.dangerTitleFilter) {
        this.dangerTitleFilter = new ColorMatrixFilter();
        this.dangerTitleFilter.hue(78, false);
        this.dangerTitleFilter.saturate(0.18, true);
        this.dangerTitleFilter.brightness(0.96, true);
      }
      this.titleFrame.filters = [this.dangerTitleFilter];
    } else {
      this.titleFrame.filters = null;
    }
    return this;
  }

  setCloseAction(action) {
    this.closeAction = typeof action === 'function' ? action : null;
    this.syncCloseState();
    return this;
  }

  setPaperVisible(visible) {
    this.paperVisible = Boolean(visible);
    this.paperFrame.visible = this.paperVisible;
    this.paperFrame.renderable = this.paperVisible;
    return this;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.contentTheme = createContentTheme(this.theme);
    this.titleLabel.applyTheme(this.theme);
    this.titleLabel
      .setColor(PIXI_DIALOG_PALETTE.titleText)
      .setStroke({
        color: PIXI_DIALOG_PALETTE.titleStroke,
        width: PIXI_ROOT_RUN_GEOMETRY.dialog.titleTextStroke,
      });
    this.layoutTitle();
    return this;
  }

  getContentTheme() {
    return this.contentTheme;
  }

  getModalContentRoots() {
    return this.modalContentRoots;
  }

  get outerWidth() {
    return this.coreWidth;
  }

  get outerHeight() {
    return this.coreHeight;
  }

  containsModalPoint(point) {
    if (!point || typeof this.toLocal !== 'function') {
      return false;
    }
    const localPoint = this.toLocal(point);
    const frameOutset = PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
    const dialogTop =
      this.titleFrame?.visible && this.titleFrame.renderable
        ? Math.min(-frameOutset, this.titleFrame.y)
        : -frameOutset;
    const insideShell =
      localPoint.x >= -frameOutset &&
      localPoint.x <= this.coreWidth + frameOutset &&
      localPoint.y >= dialogTop &&
      localPoint.y <= this.coreHeight + frameOutset;
    if (insideShell) {
      return true;
    }
    return Boolean(
      this.titleFrame?.visible &&
        this.titleFrame.renderable &&
        localPoint.x >= this.titleFrame.x &&
        localPoint.x <= this.titleFrame.x + this.titleFrame.frameWidth &&
        localPoint.y >= this.titleFrame.y &&
        localPoint.y <= this.titleFrame.y + this.titleFrame.frameHeight,
    );
  }

  activateClose(payload) {
    if (!this.isCloseEnabled()) {
      return false;
    }
    return this.closeAction(payload) ?? true;
  }

  isCloseEnabled() {
    return Boolean(
      this.closeAction &&
        this.visible &&
        this.renderable &&
        !this.destroyed,
    );
  }

  setClosePressed(pressed) {
    this.closeControl.scale.set(
      pressed && this.isCloseEnabled() ? CLOSE_PRESS_SCALE : 1,
    );
  }

  syncCloseState() {
    if (!this.closeControl) {
      return;
    }
    const visible = typeof this.closeAction === 'function';
    this.closeControl.visible = visible;
    this.closeControl.renderable = visible;
    this.closeControl.eventMode = visible ? 'static' : 'none';
    this.closeControl.cursor = visible ? 'pointer' : 'default';
    if (!visible) {
      this.setClosePressed(false);
    }
  }

  relayout() {
    const geometry = PIXI_ROOT_RUN_GEOMETRY.dialog;
    const shellWidth = this.coreWidth + geometry.frameOutset * 2;
    const shellHeight = this.coreHeight + geometry.frameOutset * 2;
    const shellX = -geometry.frameOutset;
    const shellY = -geometry.frameOutset;

    this.shadow.position.set(
      shellX + SHADOW_OFFSET_X,
      shellY + SHADOW_OFFSET_Y,
    );
    this.shadow.setSize(
      shellWidth,
      shellHeight,
      geometry.frameBorderInsets,
    );
    this.outerFrame.position.set(shellX, shellY);
    this.outerFrame.setSize(
      shellWidth,
      shellHeight,
      geometry.frameBorderInsets,
    );

    const paperX = geometry.paperInsetX - geometry.frameOutset;
    const paperY = geometry.paperInsetTop - geometry.frameOutset;
    const paperRight = geometry.paperInsetX - geometry.frameOutset;
    const paperBottom = geometry.paperInsetBottom - geometry.frameOutset;
    this.paperFrame.position.set(paperX, paperY);
    this.paperFrame.setSize(
      Math.max(0, this.coreWidth - paperX - paperRight),
      Math.max(0, this.coreHeight - paperY - paperBottom),
      geometry.paperBorderInsets,
    );

    this.content.position.set(
      this.contentInsets.left,
      this.contentInsets.top,
    );
    this.layoutTitle();

    this.closeControl.position.set(
      this.coreWidth / 2,
      this.coreHeight +
        geometry.frameOutset +
        geometry.closeGap +
        geometry.closeSize / 2,
    );
  }

  layoutTitle() {
    if (!this.titleFrame) {
      return;
    }
    const geometry = PIXI_ROOT_RUN_GEOMETRY.dialog;
    const maxWidth = Math.max(0, this.coreWidth - TITLE_MAX_INSET_X * 2);
    const desiredWidth = Math.max(
      geometry.titleMinWidth,
      this.titleLabel.measuredWidth + TITLE_TEXT_PADDING_X * 2,
    );
    const titleWidth =
      maxWidth > 0 ? Math.min(desiredWidth, maxWidth) : desiredWidth;
    const titleX = (this.coreWidth - titleWidth) / 2;
    const titleY = -geometry.frameOutset - geometry.titleOverhang;

    this.titleFrame.position.set(titleX, titleY);
    this.titleFrame.setSize(
      titleWidth,
      geometry.titleHeight,
      geometry.titleBorderInsets,
    );
    this.titleLabel.position.set(
      this.coreWidth / 2,
      titleY + geometry.titleHeight / 2,
    );
  }

  resolveTexture(assetId) {
    if (!this.assetManager?.getTexture) {
      return Texture.EMPTY;
    }
    return this.assetManager.getTexture(assetId);
  }

  destroy(options) {
    if (typeof this.closeRegistration === 'function') {
      this.closeRegistration();
    } else {
      this.closeRegistration?.unregister?.();
    }
    this.closeRegistration = null;
    if (this.closeSemanticDefinition) {
      this.semanticRegistry.unregister(this.closeSemanticId, {
        displayObject: this.closeControl,
      });
      this.closeSemanticDefinition = null;
    }
    this.titleFrame.filters = null;
    this.dangerTitleFilter?.destroy();
    this.dangerTitleFilter = null;
    super.destroy(options);
  }
}

export function createDialogPaperSection(texture, label) {
  const frame = new PixiNineSliceFrame({
    texture,
    sourceInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.paperSourceInsets,
    borderInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
    label,
  });
  frame.eventMode = 'none';
  return frame;
}

export function resolveDialogPaperOutsets(contentInsets) {
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

export function setDialogPaperSectionBounds(frame, bounds, outsets) {
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

function createContentTheme(theme) {
  return Object.freeze({
    ...theme,
    surface: PIXI_DIALOG_PALETTE.paper,
    activeSurface: PIXI_DIALOG_PALETTE.paper,
    text: PIXI_DIALOG_PALETTE.ink,
    stroke: PIXI_DIALOG_PALETTE.ink,
    muted: PIXI_DIALOG_PALETTE.muted,
    disabled: PIXI_DIALOG_PALETTE.disabled,
    resourceColors: Object.freeze({
      ...theme.resourceColors,
      coin: PIXI_DIALOG_PALETTE.coin,
      crystal: PIXI_DIALOG_PALETTE.crystal,
      mana: PIXI_DIALOG_PALETTE.mana,
      herb: PIXI_DIALOG_PALETTE.herb,
    }),
  });
}

function createContentInsets(insets = 0) {
  if (Number.isFinite(Number(insets))) {
    const value = Math.max(0, Number(insets) || 0);
    return Object.freeze({
      top: value,
      right: value,
      bottom: value,
      left: value,
    });
  }
  return Object.freeze({
    top: Math.max(0, Number(insets?.top) || 0),
    right: Math.max(0, Number(insets?.right) || 0),
    bottom: Math.max(0, Number(insets?.bottom) || 0),
    left: Math.max(0, Number(insets?.left) || 0),
  });
}
