import {
  Container,
  Graphics,
  Rectangle,
  Texture,
} from 'pixi.js';

import { PixiNotificationBadge } from '../global/transient/PixiNotificationBadges.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_TEXT_STROKE_WIDTH,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiNineSliceFrame } from './PixiNineSliceFrame.js';
import {
  getPixiButtonSkin,
  isPixiButtonColor,
  normalizePixiButtonColor,
  normalizePixiButtonSizeTier,
} from './PixiButtonStyle.js';

const RELEASE_DURATION_MS = 180;

/**
 * Shared stateful button foundation.
 *
 * This widget owns the fitted background skin, dimensions, input, press
 * feedback, common states, semantics, haptics, and notification placement.
 * It intentionally owns no label or feature content. Text, tab, cost, and
 * icon buttons extend this class with their own content contracts.
 */
export class PixiBaseButton extends Container {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    semanticId = null,
    tutorialId = null,
    width = PIXI_UI_GEOMETRY.buttonWidth + 24,
    height = 30,
    action = null,
    fallbackHitTest = false,
    preserveFocus = false,
    haptic = 'light',
    color = null,
    sizeTier = 50,
    variant = 'regular',
    label = 'base-button',
  } = {}) {
    super({ label });
    this.assetManager = assetManager;
    this.buttonWidth = width;
    this.buttonHeight = height;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.enabled = true;
    this.locked = false;
    this.pressed = false;
    this.selected = false;
    this.notification = false;
    this.notificationTone = 'red';
    this.action = action;
    this.haptic = haptic;
    this.variant = variant;
    this.color = normalizePixiButtonColor(
      color ?? (isPixiButtonColor(variant) ? variant : 'brown'),
    );
    this.sizeTier = normalizePixiButtonSizeTier(sizeTier);
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.releaseFrame = 0;
    this.releaseStartedAt = 0;
    this.activeSkin = null;

    this.visual = new Container({ label: `${label}:visual` });
    this.rootRunFrame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: getPixiButtonSkin({
        color: this.color,
        sizeTier: this.sizeTier,
      }).sourceInsets,
      borderInsets: ZERO_INSETS,
      width,
      height,
      label: `${label}:base`,
    });
    this.rootRunFrame.visible = false;
    this.inlineBacking = new Graphics({ label: `${label}:inlineBacking` });
    this.inlineBacking.visible = false;
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label = `${label}:notification`;
    this.notificationDot = this.notificationBadge.root;
    this.visual.addChild(
      this.rootRunFrame,
      this.inlineBacking,
      this.notificationBadge.root,
    );
    this.addChild(this.visual);

    this.registration =
      this.inputRouter?.registerPressTarget?.(this, {
        enabled: () => this.enabled && this.visible && this.renderable,
        selected: () => this.selected,
        onPressChange: (pressed, context) => this.setPressed(pressed, context),
        onActivate: (event) => this.activate(event),
        haptic: () => this.haptic,
        fallbackHitTest: fallbackHitTest === true,
        preserveFocus: preserveFocus === true,
        excludePageSwipe: true,
      }) ?? null;
    this.semanticDefinition =
      semanticId && semanticRegistry
        ? semanticRegistry.register({
            semanticId,
            tutorialId,
            displayObject: this,
            state: () => ({
              enabled: this.enabled,
              interactive: this.eventMode !== 'none',
              locked: this.locked,
              visible: this.visible && this.renderable,
              active: !this.destroyed,
              selected: this.selected,
            }),
            activate: (payload) => this.activate(payload),
          })
        : null;
    this.relayout();
    this.syncInteraction();
  }

  bind(_key, data = {}, actions = null) {
    this.setEnabled(data.enabled !== false && data.disabled !== true);
    this.setLocked(data.locked === true);
    this.setSelected(Boolean(data.selected));
    this.setNotification(Boolean(data.notification), data.notificationTone);
    if (data.variant) {
      this.setVariant(data.variant);
    }
    if (data.color) {
      this.setColor(data.color);
    }
    if (data.sizeTier) {
      this.setSizeTier(data.sizeTier);
    }
    this.visible = data.hidden !== true;
    this.renderable = this.visible;
    if (typeof actions === 'function') {
      this.action = actions;
    } else if (typeof actions?.activate === 'function') {
      this.action = actions.activate;
    }
    this.syncInteraction();
  }

  reset() {
    this.action = null;
    this.cancelReleaseAnimation();
    this.setPressed(false);
    this.setSelected(false);
    this.setNotification(false);
    this.setLocked(false);
    this.setEnabled(false);
    this.visible = false;
    this.renderable = false;
  }

  setAction(action) {
    this.action = typeof action === 'function' ? action : null;
    return this;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.syncInteraction();
    return this;
  }

  setLocked(locked) {
    this.locked = Boolean(locked);
    this.syncAppearance();
    return this;
  }

  setSelected(selected) {
    this.selected = Boolean(selected);
    this.syncAppearance();
    return this;
  }

  setNotification(notification, tone = 'red') {
    this.notification = Boolean(notification);
    this.notificationTone = tone === 'orange' ? 'orange' : 'red';
    this.syncNotification();
    return this;
  }

  setVariant(variant) {
    this.variant = String(variant || 'regular');
    if (isPixiButtonColor(this.variant)) {
      this.color = normalizePixiButtonColor(this.variant);
    }
    this.syncAppearance();
    return this;
  }

  setColor(color) {
    this.color = normalizePixiButtonColor(color, this.color);
    if (isPixiButtonColor(this.variant)) {
      this.variant = this.color;
    }
    this.syncAppearance();
    return this;
  }

  setSizeTier(sizeTier) {
    this.sizeTier = normalizePixiButtonSizeTier(sizeTier, this.sizeTier);
    this.syncAppearance();
    return this;
  }

  setPressed(pressed, context = null) {
    const nextPressed = Boolean(pressed) && this.enabled && !this.selected;
    if (nextPressed) {
      this.cancelReleaseAnimation();
      this.pressed = true;
      this.visual.scale.set(0.94);
      this.syncAppearance();
      return this;
    }

    const wasPressed = this.pressed;
    this.pressed = false;
    this.syncAppearance();
    if (wasPressed && context?.confirmed === true && !prefersReducedMotion()) {
      this.startReleaseAnimation();
    } else {
      this.cancelReleaseAnimation();
      this.visual.scale.set(1);
    }
    return this;
  }

  setSize(width, height = this.buttonHeight) {
    this.buttonWidth = Math.max(0, Number(width) || 0);
    this.buttonHeight = Math.max(0, Number(height) || 0);
    this.relayout();
    return this;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.syncAppearance();
  }

  activate(payload) {
    if (!this.enabled || this.selected || !this.visible || !this.renderable) {
      return false;
    }
    return this.action?.(payload) ?? true;
  }

  syncInteraction() {
    this.eventMode = this.enabled && this.visible ? 'static' : 'none';
    this.cursor = this.enabled && !this.selected ? 'pointer' : 'default';
    this.syncAppearance();
  }

  syncAppearance() {
    if (!this.rootRunFrame) {
      return;
    }

    const rootRunVariant = this.resolveRootRunVariant();
    const borderLabel = this.variant === 'border-label';
    this.rootRunFrame.visible = Boolean(rootRunVariant);
    this.inlineBacking.visible = borderLabel;
    this.inlineBacking
      .clear()
      .rect(0, 0, this.buttonWidth, this.buttonHeight)
      .fill({ color: this.theme.surface });

    let visualGeometry = null;
    if (rootRunVariant) {
      const visualVariant = this.enabled && !this.locked
        ? rootRunVariant
        : 'gray';
      visualGeometry = getRootRunVisualGeometry(
        visualVariant,
        this.buttonWidth,
        this.buttonHeight,
        this.sizeTier,
      );
      this.activeSkin = visualGeometry;
      const textureId = visualGeometry.assetId;
      this.rootRunFrame.position.set(
        visualGeometry.frame.x,
        visualGeometry.frame.y,
      );
      this.rootRunFrame.setSkin({
        assetId: textureId,
        borderInsets: visualGeometry.borderInsets,
        height: visualGeometry.frame.height,
        minimumCenter: visualGeometry.minimumCenter,
        sourceInsets: visualGeometry.sourceInsets,
        texture: this.assetManager?.getTexture?.(textureId) ?? Texture.EMPTY,
        width: visualGeometry.frame.width,
      });
      this.rootRunFrame.filters = null;
    } else {
      this.activeSkin = null;
      this.rootRunFrame.position.set(0, 0);
      this.rootRunFrame.filters = null;
    }
    this.syncContentAppearance(visualGeometry);
    this.syncNotification();
  }

  syncContentAppearance() {}

  resolveRootRunVariant() {
    if (isPixiButtonColor(this.variant)) {
      return this.color;
    }
    if (this.variant === 'regular') {
      return this.color;
    }
    return null;
  }

  syncNotification() {
    if (!this.notificationBadge) {
      return;
    }
    const bounds = {
      x: 0,
      y: 0,
      width: this.buttonWidth,
      height: this.buttonHeight,
    };
    this.notificationBadge
      .placeAtTopRight(bounds)
      .setTone(this.notificationTone)
      .setActive(this.notification && this.enabled && !this.locked);
  }

  relayout() {
    this.rootRunFrame.setSize(
      this.buttonWidth,
      this.buttonHeight,
      ZERO_INSETS,
    );
    this.layoutContent();
    this.visual.pivot.set(this.buttonWidth / 2, this.buttonHeight / 2);
    this.visual.position.set(this.buttonWidth / 2, this.buttonHeight / 2);
    this.hitArea = new Rectangle(0, 0, this.buttonWidth, this.buttonHeight);
    this.syncAppearance();
  }

  layoutContent() {}

  startReleaseAnimation() {
    this.cancelReleaseAnimation();
    this.releaseStartedAt = now();
    const tick = () => {
      const elapsed = now() - this.releaseStartedAt;
      const progress = Math.min(1, Math.max(0, elapsed / RELEASE_DURATION_MS));
      this.visual.scale.set(releaseScale(progress));
      if (progress >= 1) {
        this.releaseFrame = 0;
        this.visual.scale.set(1);
        return;
      }
      this.releaseFrame = requestFrame(tick);
    };
    this.releaseFrame = requestFrame(tick);
  }

  startAttentionEffect() {
    this.cancelReleaseAnimation();
    this.pressed = false;
    this.syncAppearance();
    if (prefersReducedMotion()) {
      this.visual.scale.set(1);
      return false;
    }
    this.visual.scale.set(0.94);
    this.startReleaseAnimation();
    return true;
  }

  cancelReleaseAnimation() {
    if (this.releaseFrame) {
      cancelFrame(this.releaseFrame);
      this.releaseFrame = 0;
    }
  }

  destroy(options) {
    this.cancelReleaseAnimation();
    if (typeof this.registration === 'function') {
      this.registration();
    } else {
      this.registration?.unregister?.();
    }
    this.registration = null;
    if (this.semanticDefinition) {
      this.semanticRegistry.unregister(this.semanticId, { displayObject: this });
      this.semanticDefinition = null;
    }
    super.destroy(options);
  }
}

const ZERO_INSETS = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

function getRootRunVisualGeometry(
  variant,
  width,
  height,
  sizeTier = 50,
) {
  const skin = getPixiButtonSkin({
    color: variant,
    height,
    sizeTier,
    width,
  });
  return {
    ...skin,
    frame: { x: 0, y: 0, width, height },
    fontSize: null,
    textStroke: PIXI_TEXT_STROKE_WIDTH,
    textColor: '#ffffff',
  };
}

function releaseScale(progress) {
  if (progress <= 0.36) {
    return 0.94 + (1.055 - 0.94) * easeOutCubic(progress / 0.36);
  }
  return 1.055 + (1 - 1.055) * easeOutCubic((progress - 0.36) / 0.64);
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function requestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout?.(callback, 16) ?? 0;
}

function cancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
  } else {
    globalThis.clearTimeout?.(frameId);
  }
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}
