import { Rectangle } from 'pixi.js';

import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_TEXT_STYLES,
  RetainedPanel,
  applyTextTheme,
  createRetainedInputId,
  createText,
  normalizeRows,
  setText,
} from '../../pages/workshop/RetainedPageKit.js';

const WORLD_CHAT_TITLE = 'World Chat';
const WORLD_CHAT_TITLE_STROKE = '#0a0a0a';
const PRESS_SCALE = 0.94;
const RELEASE_PEAK_SCALE = 1.055;
const RELEASE_DURATION_MS = 180;

/**
 * Shared room chrome for the compact world-chat preview.
 *
 * The full dialog remains registered by the Workshop page, while this opener
 * stays mounted above the bottom room tabs regardless of the active page.
 */
export class PixiWorldChatView extends BasePixiRetainedView {
  constructor({
    assets,
    inputRouter,
  } = {}) {
    super({ label: 'worldChat' });
    this.model = { visible: false };
    this.pressed = false;
    this.releaseFrame = 0;
    this.releaseStartedAt = 0;
    this.panel = new RetainedPanel({
      assetManager: assets,
      label: WORLD_CHAT_TITLE,
      panelLabel: 'global-world-chat-preview',
    });
    this.preview = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth:
        PIXI_UI_GEOMETRY.sourceWidth -
        PIXI_UI_GEOMETRY.roomChromeEdge * 2 -
        10,
    });
    this.preview.style.whiteSpace = 'pre-line';
    this.panel.body.addChild(this.preview);
    this.root.addChild(this.panel.root);
    this.panel.root.eventMode = 'static';
    this.panel.root.cursor = 'pointer';
    this.handleTap = () => this.model.onActivate?.() ?? true;
    this.inputRegistration =
      inputRouter?.registerPressTarget?.({
        id: createRetainedInputId('global-world-chat'),
        displayObject: this.panel.root,
        enabled: () =>
          this.active &&
          this.model.visible !== false &&
          this.panel.root.visible,
        excludePageSwipe: true,
        haptic: 'light',
        onPressChange: (pressed, context) =>
          this.setPressed(pressed, context),
        onActivate: this.handleTap,
      }) ?? null;
    this.usesDirectInput = !this.inputRegistration;

    if (this.usesDirectInput) {
      this.panel.root.on('pointertap', this.handleTap);
    }

    this.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
    this.layoutChat();
  }

  onBind(model = {}) {
    this.model = model;
    this.panel.setTitle(
      model.label ?? model.channelLabel ?? WORLD_CHAT_TITLE,
    );
    this.applyTitleStroke();
    setText(
      this.preview,
      model.preview ??
        normalizeRows(model.messages)
          .slice(-2)
          .map((message) => message.text ?? message.body ?? '')
          .join('\n'),
    );
    this.root.visible = model.visible !== false;
    this.root.renderable = model.visible !== false;
    this.root.eventMode = model.visible === false ? 'none' : 'passive';
  }

  onApplyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(resolvedTheme);
    this.applyTitleStroke();
    applyTextTheme(this.preview, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth:
        PIXI_UI_GEOMETRY.sourceWidth -
        PIXI_UI_GEOMETRY.roomChromeEdge * 2 -
        10,
    });
    this.preview.style.whiteSpace = 'pre-line';
  }

  applyTitleStroke() {
    this.panel.title.style.stroke = {
      color: WORLD_CHAT_TITLE_STROKE,
      width: 2,
      join: 'round',
    };
  }

  onLayout() {
    this.layoutChat();
  }

  onActivate() {
    this.onBind(this.model);
  }

  onDestroy() {
    this.cancelReleaseAnimation();
    this.inputRegistration?.unregister?.();
    this.inputRegistration = null;

    if (this.usesDirectInput) {
      this.panel.root.off('pointertap', this.handleTap);
    }

    this.panel.destroy();
  }

  layoutChat() {
    const sourceWidth =
      this.viewportProjection?.sourceWidth ?? PIXI_UI_GEOMETRY.sourceWidth;
    const sourceHeight =
      this.viewportProjection?.sourceHeight ?? PIXI_UI_GEOMETRY.sourceHeight;
    const width = sourceWidth - PIXI_UI_GEOMETRY.roomChromeEdge * 2;
    const height = PIXI_UI_GEOMETRY.roomChatHeight;

    this.panel.setBounds(
      PIXI_UI_GEOMETRY.roomChromeEdge + width / 2,
      sourceHeight -
        PIXI_UI_GEOMETRY.roomChatBottom -
        height +
        height / 2,
      width,
      height,
    );
    this.panel.root.pivot.set(width / 2, height / 2);
    this.applyTitleStroke();
    this.preview.position.set(5, 4);
    this.panel.root.hitArea = new Rectangle(0, 0, width, height);
  }

  setPressed(pressed, context = null) {
    const nextPressed =
      Boolean(pressed) &&
      this.active &&
      this.model.visible !== false &&
      this.panel.root.visible;

    if (nextPressed) {
      this.cancelReleaseAnimation();
      this.pressed = true;
      this.panel.root.scale.set(PRESS_SCALE);
      return;
    }

    const wasPressed = this.pressed;
    this.pressed = false;
    if (
      wasPressed &&
      context?.confirmed === true &&
      !prefersReducedMotion()
    ) {
      this.startReleaseAnimation();
      return;
    }

    this.cancelReleaseAnimation();
    this.panel.root.scale.set(1);
  }

  startReleaseAnimation() {
    this.cancelReleaseAnimation();
    this.releaseStartedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - this.releaseStartedAt;
      const progress = Math.min(
        1,
        Math.max(0, elapsed / RELEASE_DURATION_MS),
      );
      this.panel.root.scale.set(releaseScale(progress));
      if (progress >= 1) {
        this.releaseFrame = 0;
        this.panel.root.scale.set(1);
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
}

function releaseScale(progress) {
  if (progress <= 0.36) {
    return (
      PRESS_SCALE +
      (RELEASE_PEAK_SCALE - PRESS_SCALE) *
        easeOutCubic(progress / 0.36)
    );
  }
  return (
    RELEASE_PEAK_SCALE +
    (1 - RELEASE_PEAK_SCALE) *
      easeOutCubic((progress - 0.36) / 0.64)
  );
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

function cancelFrame(frame) {
  if (!frame) {
    return;
  }
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frame);
    return;
  }
  globalThis.clearTimeout?.(frame);
}
