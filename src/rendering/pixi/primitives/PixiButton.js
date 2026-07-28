import {
  Container,
  Graphics,
  Rectangle,
  Texture,
} from 'pixi.js';

import { PixiNotificationBadge } from '../global/transient/PixiNotificationBadges.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiFrame } from './PixiFrame.js';
import { PixiNineSliceFrame } from './PixiNineSliceFrame.js';
import { PixiTextLabel } from './PixiTextLabel.js';

const ROOT_RUN_VARIANTS = new Set([
  'yellow',
  'green',
  'red',
  'gray',
  'brown-dark',
  'brown-light',
  'account-tab-active',
  'account-tab-inactive',
  'account-save',
]);
const RELEASE_DURATION_MS = 180;

/**
 * Unified retained button used by global chrome, pages, and dialogs.
 *
 * The view owns visual/press state only. Callers retain authority over the
 * action and enabled rule.
 */
export class PixiButton extends Container {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    semanticId = null,
    tutorialId = null,
    text = '',
    width = PIXI_UI_GEOMETRY.buttonWidth + 24,
    height = 30,
    action = null,
    fallbackHitTest = false,
    haptic = 'light',
    variant = 'regular',
    label = 'button',
  } = {}) {
    super({ label });
    this.assetManager = assetManager;
    this.buttonWidth = width;
    this.buttonHeight = height;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.enabled = true;
    this.pressed = false;
    this.selected = false;
    this.notification = false;
    this.notificationTone = 'red';
    this.action = action;
    this.haptic = haptic;
    this.variant = variant;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.releaseFrame = 0;
    this.releaseStartedAt = 0;

    this.visual = new Container({ label: `${label}:visual` });
    this.frame = new PixiFrame({
      assetManager,
      variant: 'control',
      width,
      height,
      label: `${label}:frame`,
    });
    this.rootRunFrame = new PixiNineSliceFrame({
      texture: Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
      width,
      height,
      label: `${label}:rootRunFrame`,
    });
    this.rootRunFrame.visible = false;
    this.inlineBacking = new Graphics({ label: `${label}:inlineBacking` });
    this.inlineBacking.visible = false;
    this.textLabel = new PixiTextLabel({
      text,
      anchor: { x: 0.5, y: 0.5 },
      label: `${label}:label`,
    });
    this.notificationBadge = new PixiNotificationBadge({ assetManager });
    this.notificationBadge.root.label = `${label}:notification`;
    this.notificationDot = this.notificationBadge.root;
    this.visual.addChild(
      this.frame,
      this.rootRunFrame,
      this.inlineBacking,
      this.textLabel,
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
    this.setText(data.label ?? data.text ?? '');
    this.setEnabled(data.enabled !== false && data.disabled !== true);
    this.setSelected(Boolean(data.selected));
    this.setNotification(Boolean(data.notification), data.notificationTone);
    if (data.variant) {
      this.setVariant(data.variant);
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
    this.setEnabled(false);
    this.visible = false;
    this.renderable = false;
  }

  setText(text) {
    this.textLabel.setText(text);
    return this;
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
    this.frame.applyTheme(this.theme);
    this.textLabel.applyTheme(this.theme);
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
    if (!this.frame || !this.rootRunFrame) {
      return;
    }

    const rootRunVariant = this.resolveRootRunVariant();
    const inline = this.variant === 'inline';
    const borderLabel = this.variant === 'border-label';
    this.rootRunFrame.visible = Boolean(rootRunVariant);
    this.frame.visible = !rootRunVariant && !inline && !borderLabel;
    this.inlineBacking.visible = borderLabel;
    this.inlineBacking
      .clear()
      .rect(0, 0, this.buttonWidth, this.buttonHeight)
      .fill({ color: this.theme.surface });

    if (rootRunVariant) {
      const visualVariant = this.enabled ? rootRunVariant : 'gray';
      const visualGeometry =
        getRootRunVisualGeometry(visualVariant, this.buttonWidth, this.buttonHeight);
      this.rootRunFrame.setTexture(
        this.assetManager.getTexture(getRootRunTextureId(visualVariant)),
        visualGeometry.sourceInsets,
      );
      this.rootRunFrame.position.set(
        visualGeometry.frame.x,
        visualGeometry.frame.y,
      );
      this.rootRunFrame.setSize(
        visualGeometry.frame.width,
        visualGeometry.frame.height,
        visualGeometry.borderInsets,
      );
      this.rootRunFrame.filters = null;
      this.textLabel.setFontFamily('"Lilita One", "Arial Black", Arial, sans-serif');
      if (Number.isFinite(visualGeometry.fontSize)) {
        this.textLabel.setFontSize(visualGeometry.fontSize);
      }
      this.textLabel.setStroke({
        color: '#0a0a0a',
        width: visualGeometry.textStroke,
      });
      this.textLabel.setColor(visualGeometry.textColor);
    } else {
      this.rootRunFrame.position.set(0, 0);
      this.rootRunFrame.filters = null;
      this.textLabel.setFontFamily(null);
      this.textLabel.setStroke(null);
      this.textLabel.setColor(this.enabled ? 'text' : 'disabled');
      this.frame.setVariant(
        this.selected
          ? 'selected'
          : this.enabled
            ? 'control'
            : 'button-disabled',
      );
    }
    this.syncNotification();
  }

  resolveRootRunVariant() {
    if (ROOT_RUN_VARIANTS.has(this.variant)) {
      return this.variant;
    }
    if (this.variant === 'tab') {
      return this.selected ? 'brown-light' : 'brown-dark';
    }
    if (this.variant === 'account-tab') {
      return this.selected
        ? 'account-tab-active'
        : 'account-tab-inactive';
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
      .setActive(this.notification && this.enabled);
  }

  relayout() {
    this.frame.setSize(this.buttonWidth, this.buttonHeight);
    this.rootRunFrame.setSize(
      this.buttonWidth,
      this.buttonHeight,
      PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
    );
    this.textLabel.position.set(this.buttonWidth / 2, this.buttonHeight / 2);
    this.visual.pivot.set(this.buttonWidth / 2, this.buttonHeight / 2);
    this.visual.position.set(this.buttonWidth / 2, this.buttonHeight / 2);
    this.hitArea = new Rectangle(0, 0, this.buttonWidth, this.buttonHeight);
    this.syncAppearance();
  }

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

function getRootRunTextureId(variant) {
  if (variant === 'account-tab-active') {
    return PIXI_ROOT_RUN_ASSETS.accountTabActive;
  }
  if (variant === 'account-tab-inactive') {
    return PIXI_ROOT_RUN_ASSETS.accountTabInactive;
  }
  if (variant === 'account-save') {
    return PIXI_ROOT_RUN_ASSETS.accountSave;
  }
  if (variant === 'yellow') return PIXI_ROOT_RUN_ASSETS.buttonYellow;
  if (variant === 'green') return PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice;
  if (variant === 'red') return PIXI_ROOT_RUN_ASSETS.buttonRedNineSlice;
  if (variant === 'gray') return PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice;
  if (variant === 'brown-light') return PIXI_ROOT_RUN_ASSETS.buttonBrownLight;
  return PIXI_ROOT_RUN_ASSETS.buttonBrownDark;
}

function getRootRunVisualGeometry(variant, width, height) {
  const account = PIXI_ROOT_RUN_GEOMETRY.account;
  if (variant === 'account-tab-active') {
    return {
      ...account.tab.active,
      fontSize: account.tab.fontSize,
      textStroke: account.tab.textStroke,
      textColor: '#ffffff',
    };
  }
  if (variant === 'account-tab-inactive') {
    return {
      ...account.tab.inactive,
      fontSize: account.tab.fontSize,
      textStroke: account.tab.textStroke,
      textColor: '#d3c6b4',
    };
  }
  if (variant === 'account-save') {
    return {
      ...account.save,
      fontSize: account.save.fontSize,
      textStroke: account.save.textStroke,
      textColor: '#ffffff',
    };
  }
  return {
    sourceInsets: PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets,
    borderInsets: PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
    frame: { x: 0, y: 0, width, height },
    fontSize: null,
    textStroke: 4,
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
