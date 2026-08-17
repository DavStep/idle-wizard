import { Graphics, Rectangle } from 'pixi.js';

import {
  BasePixiRetainedView,
  PixiTextButton,
} from '../../primitives/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { PixiSemanticHighlightLayer } from './PixiSemanticHighlightLayer.js';
import {
  projectSemanticBoundsToSource,
  resolveSemanticTutorialTarget,
  TUTORIAL_PIXI_GEOMETRY,
} from './TutorialPixiGeometry.js';

export const PIXI_ACTION_HIGHLIGHT_GEOMETRY = Object.freeze({
  actionGap: 4,
  actionHeight: 29,
  actionWidth: 74,
  edgeInset: 8,
});

/**
 * Full-stage modal action scene that promotes one live semantic target through
 * the shared highlight layer and places one standard action directly below it.
 */
export class PixiActionHighlightScene extends BasePixiRetainedView {
  constructor({
    assets,
    inputRouter = null,
    semanticRegistry = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    if (!assets?.getTexture) {
      throw new Error('PixiActionHighlightScene requires preloaded Pixi assets.');
    }
    super({ label: 'actionHighlightScene' });
    this.semanticRegistry = semanticRegistry;
    this.model = normalizeActionHighlightModel();
    this.sourceBounds = {
      x: 0,
      y: 0,
      width: TUTORIAL_PIXI_GEOMETRY.sourceWidth,
      height: TUTORIAL_PIXI_GEOMETRY.sourceHeight,
    };

    this.backdrop = new Graphics({ label: 'actionHighlightScene:backdrop' });
    this.backdrop.eventMode = 'none';
    this.semanticHighlight = new PixiSemanticHighlightLayer({
      semanticRegistry,
      label: 'actionHighlightScene:highlightLayer',
    });
    this.highlightLayer = this.semanticHighlight.layer;
    this.actionButton = new PixiTextButton({
      assetManager: assets,
      inputRouter,
      text: 'Report',
      color: 'red',
      sizeTier: 30,
      width: PIXI_ACTION_HIGHLIGHT_GEOMETRY.actionWidth,
      height: PIXI_ACTION_HIGHLIGHT_GEOMETRY.actionHeight,
      action: () => this.activateAction(),
      label: 'actionHighlightScene:action',
    });
    this.root.addChild(
      this.backdrop,
      this.highlightLayer,
      this.actionButton,
    );
    this.dismissRegistration =
      inputRouter?.registerPressTarget?.({
        id: 'action-highlight-scene.dismiss',
        displayObject: this.root,
        enabled: () => this.isVisible(),
        onActivate: () => this.dismiss(),
        haptic: 'light',
      }) ?? null;

    this.applyTheme(theme);
    this.layout({
      sourceWidth: TUTORIAL_PIXI_GEOMETRY.sourceWidth,
      sourceHeight: TUTORIAL_PIXI_GEOMETRY.sourceHeight,
      sourceScale: PIXI_UI_GEOMETRY.sourceScale,
      authoredOffsetX: 0,
      sourceOffsetX: 0,
      stageLogicalWidth: PIXI_UI_GEOMETRY.authoredWidth,
    });
    this.render();
  }

  onBind(viewModel) {
    this.model = normalizeActionHighlightModel(viewModel);
    this.actionButton.setText(this.model.actionLabel);
    this.actionButton.setVariant(this.model.actionVariant);
    this.actionButton.setEnabled(
      this.model.visible && typeof this.model.onAction === 'function',
    );
    this.render();
  }

  onApplyTheme(theme) {
    this.actionButton.applyTheme(theme ?? DEFAULT_PIXI_THEME_SNAPSHOT);
  }

  onLayout(projection = {}) {
    const width =
      Number(projection.sourceWidth) || TUTORIAL_PIXI_GEOMETRY.sourceWidth;
    const height =
      Number(projection.sourceHeight) || TUTORIAL_PIXI_GEOMETRY.sourceHeight;
    const sourceOffsetX = Math.max(0, Number(projection.sourceOffsetX) || 0);
    const sourceScale = Math.max(
      1,
      Number(projection.sourceScale) || PIXI_UI_GEOMETRY.sourceScale,
    );
    const stageSourceWidth =
      Number(projection.stageLogicalWidth) / sourceScale ||
      width + sourceOffsetX * 2;
    this.projection = {
      ...projection,
      sourceScale,
      authoredOffsetX: Number(projection.authoredOffsetX) || 0,
    };
    this.sourceBounds = { x: 0, y: 0, width, height };
    this.backdropBounds = {
      x: -sourceOffsetX,
      y: 0,
      width: stageSourceWidth,
      height,
    };
    this.root.hitArea = new Rectangle(
      this.backdropBounds.x,
      0,
      this.backdropBounds.width,
      height,
    );
    this.render();
  }

  onActivate() {
    this.render();
  }

  onDeactivate() {
    this.semanticHighlight.clear();
  }

  onDestroy() {
    releaseRegistration(this.dismissRegistration);
    this.dismissRegistration = null;
    this.semanticHighlight.clear();
  }

  render() {
    const target = this.resolveTarget();
    const visible = Boolean(this.active && this.model.visible && target);
    this.root.visible = visible;
    this.root.renderable = visible;
    this.root.eventMode = visible ? 'static' : 'none';
    this.actionButton.visible = visible;
    this.actionButton.renderable = visible;
    this.actionButton.setEnabled(
      visible && typeof this.model.onAction === 'function',
    );

    this.backdrop.clear();
    if (!visible) {
      this.backdrop.visible = false;
      this.backdrop.renderable = false;
      this.semanticHighlight.clear();
      return;
    }

    this.backdrop
      .rect(
        this.backdropBounds.x,
        this.backdropBounds.y,
        this.backdropBounds.width,
        this.backdropBounds.height,
      )
      .fill({
        color: '#000000',
        alpha: TUTORIAL_PIXI_GEOMETRY.backdropOpacity,
      });
    this.backdrop.visible = true;
    this.backdrop.renderable = true;
    this.semanticHighlight.sync([this.model.targetId]);
    this.layoutAction(target);
  }

  resolveTarget() {
    if (!this.model.visible || !this.model.targetId) {
      return null;
    }
    const snapshot = resolveSemanticTutorialTarget(
      this.semanticRegistry,
      this.model.targetId,
    );
    if (
      !snapshot ||
      snapshot.state?.active === false ||
      snapshot.state?.visible === false
    ) {
      return null;
    }
    const bounds = projectSemanticBoundsToSource(
      snapshot.bounds,
      this.projection,
    );
    return bounds ? { bounds, snapshot } : null;
  }

  layoutAction(target) {
    const geometry = PIXI_ACTION_HIGHLIGHT_GEOMETRY;
    const bounds = target.bounds;
    const minX = this.sourceBounds.x + geometry.edgeInset;
    const maxX =
      this.sourceBounds.x +
      this.sourceBounds.width -
      geometry.edgeInset -
      geometry.actionWidth;
    const x = clamp(
      bounds.right - geometry.actionWidth,
      minX,
      Math.max(minX, maxX),
    );
    const maxY =
      this.sourceBounds.y +
      this.sourceBounds.height -
      geometry.edgeInset -
      geometry.actionHeight;
    const y = Math.min(
      bounds.bottom + geometry.actionGap,
      Math.max(this.sourceBounds.y + geometry.edgeInset, maxY),
    );
    this.actionButton.position.set(x, y);
    this.actionButton.setSize(geometry.actionWidth, geometry.actionHeight);
  }

  activateAction() {
    if (!this.isVisible() || typeof this.model.onAction !== 'function') {
      return false;
    }
    return this.model.onAction() ?? true;
  }

  dismiss() {
    if (!this.isVisible() || typeof this.model.onDismiss !== 'function') {
      return false;
    }
    return this.model.onDismiss() ?? true;
  }

  isVisible() {
    return Boolean(this.active && this.model.visible && this.root.visible);
  }
}

export function normalizeActionHighlightModel(model = {}) {
  return Object.freeze({
    visible: model?.visible === true,
    targetId: String(model?.targetId ?? '').trim(),
    actionLabel: String(model?.actionLabel ?? 'Report'),
    actionVariant: String(model?.actionVariant ?? 'red'),
    onAction: typeof model?.onAction === 'function' ? model.onAction : null,
    onDismiss: typeof model?.onDismiss === 'function' ? model.onDismiss : null,
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function releaseRegistration(registration) {
  registration?.unregister?.();
  if (typeof registration === 'function') {
    registration();
  }
}
