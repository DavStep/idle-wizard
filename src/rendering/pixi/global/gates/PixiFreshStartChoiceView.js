import { Sprite } from 'pixi.js';

import {
  PixiButton,
  PixiModalSurface,
  PixiTextLabel,
} from '../../primitives/index.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';

const GUIDE_NAME = 'Elara Starbrew';
const WELCOME_HEADING = 'Welcome to Idle Wizard';
const FRESH_START_CONTENT_WIDTH = 240;
const FRESH_START_CONTENT_HEIGHT = 192;
const FRESH_START_COPY_X = 88;
const FRESH_START_COPY_WIDTH =
  FRESH_START_CONTENT_WIDTH - FRESH_START_COPY_X;

export const PIXI_ACCOUNT_DIALOG_OPEN_MOTION = Object.freeze({
  durationMs: 190,
  overshootProgress: 0.42,
  startScale: 0.94,
  overshootScale: 1.045,
  settledScale: 1,
  backOvershoot: 1.36,
});

export const PIXI_ACCOUNT_DIALOG_BACKDROP = Object.freeze({
  color: '#17100c',
  alpha: 0.8,
});

export class PixiFreshStartChoiceView extends PixiModalSurface {
  constructor({
    assets,
    inputRouter,
    motionRuntime = null,
    playOpenSound = null,
  } = {}) {
    super({
      assetManager: assets,
      title: GUIDE_NAME,
      contentWidth: FRESH_START_CONTENT_WIDTH,
      contentHeight: FRESH_START_CONTENT_HEIGHT,
      backdropAlpha: PIXI_ACCOUNT_DIALOG_BACKDROP.alpha,
      inputRouter,
      modalId: 'gate.freshStartChoice',
      openMotion: 'center',
      motionRuntime,
      label: 'freshStartChoice',
    });
    this.playOpenSound =
      typeof playOpenSound === 'function' ? playOpenSound : null;
    this.preferredLayer = 'interactionLocks';
    this.portrait = new Sprite({
      texture: assets.getTexture('source:assets/characters/elara.png'),
      roundPixels: true,
    });
    this.portrait.label = 'freshStartChoice:portrait';
    fitSprite(this.portrait, 84, 120);
    this.heading = new PixiTextLabel({
      text: WELCOME_HEADING,
      fontWeight: 'bold',
      wordWrap: true,
      wrapWidth: FRESH_START_COPY_WIDTH,
      label: 'freshStartChoice:heading',
    });
    this.message = new PixiTextLabel({
      text: 'Do You Already Have an Account?',
      wordWrap: true,
      wrapWidth: FRESH_START_COPY_WIDTH,
      label: 'freshStartChoice:message',
    });
    this.status = new PixiTextLabel({
      color: 'disabled',
      wordWrap: true,
      wrapWidth: FRESH_START_COPY_WIDTH,
      label: 'freshStartChoice:status',
    });
    this.connectButton = new PixiButton({
      assetManager: assets,
      inputRouter,
      text: 'Connect Account',
      width: FRESH_START_CONTENT_WIDTH,
      variant: 'yellow',
      label: 'freshStartChoice:connect',
    });
    this.freshButton = new PixiButton({
      assetManager: assets,
      inputRouter,
      text: 'Start New',
      width: FRESH_START_CONTENT_WIDTH,
      variant: 'green',
      label: 'freshStartChoice:fresh',
    });
    this.panel.content.addChild(
      this.portrait,
      this.heading,
      this.message,
      this.status,
      this.connectButton,
      this.freshButton,
    );
    this.relayoutContent();
  }

  onBind(model = {}) {
    this.status.setText(model.statusText ?? 'Not Connected');
    this.connectButton
      .setText(model.busy ? 'Connecting...' : 'Connect Account')
      .setEnabled(model.connectEnabled === true && model.busy !== true)
      .setAction(model.onConnect ?? null);
    this.freshButton
      .setEnabled(model.busy !== true)
      .setAction(model.onStartFresh ?? null);
    this.show();
  }

  onApplyTheme(theme) {
    super.onApplyTheme(theme);
    const contentTheme =
      this.panel.getContentTheme?.() ?? theme;
    for (const item of [
      this.heading,
      this.message,
      this.status,
      this.connectButton,
      this.freshButton,
    ]) {
      item.applyTheme(contentTheme);
    }
  }

  relayoutContent() {
    this.portrait.position.set(42, 120);
    this.heading.position.set(FRESH_START_COPY_X, 20);
    this.message.position.set(FRESH_START_COPY_X, 47);
    this.status.position.set(FRESH_START_COPY_X, 78);
    this.connectButton.position.set(0, 128);
    this.freshButton.position.set(0, 162);
    this.panel.setContentBoxSize(
      FRESH_START_CONTENT_WIDTH,
      FRESH_START_CONTENT_HEIGHT,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    this.panel.pivot.set(this.panel.outerWidth / 2, this.panel.outerHeight / 2);
  }

  onLayout(projection) {
    super.onLayout(projection);
    this.redrawBackdrop();
  }

  redrawBackdrop() {
    const projection = this.viewportProjection;
    if (!projection) {
      return;
    }
    const sourceStageWidth =
      projection.stageLogicalWidth / projection.sourceScale;
    this.backdrop
      .clear()
      .rect(
        -projection.sourceOffsetX,
        0,
        sourceStageWidth,
        projection.sourceHeight,
      )
      .fill({
        color: PIXI_ACCOUNT_DIALOG_BACKDROP.color,
        alpha: PIXI_ACCOUNT_DIALOG_BACKDROP.alpha,
      });
  }

  startOpenMotion() {
    super.startOpenMotion();
    if (this.openMotionFrame) {
      this.playOpenSound?.();
    }
  }

  tickOpenMotion() {
    this.openMotionFrame = 0;
    if (!this.active || !this.shown || !this.presented) {
      this.restoreOpenMotion();
      return;
    }
    const elapsed = Math.max(
      0,
      this.motionNow() - this.openMotionStartedAt,
    );
    const progress = Math.min(
      1,
      elapsed / PIXI_ACCOUNT_DIALOG_OPEN_MOTION.durationMs,
    );
    this.openMotionProgress = progress;
    this.applyOpenMotion(progress);
    if (progress >= 1) {
      this.restoreOpenMotion();
      return;
    }
    this.openMotionFrame = this.requestMotionFrame(
      this.handleOpenMotionFrame,
    );
  }

  applyOpenMotion(progress) {
    const scale = sampleAccountDialogOpenScale(progress);
    this.backdrop.alpha = 1;
    this.panel.alpha = 1;
    this.panel.scale.set(scale);
    this.panel.position.set(
      this.openMotionBaseX,
      this.openMotionBaseY,
    );
  }
}

function fitSprite(sprite, width, height) {
  const textureWidth = Math.max(1, sprite.texture.width);
  const textureHeight = Math.max(1, sprite.texture.height);
  const scale = Math.min(width / textureWidth, height / textureHeight);
  sprite.scale.set(scale);
  sprite.anchor.set(0.5, 1);
}

export function sampleAccountDialogOpenScale(progress) {
  const normalized = Math.min(
    1,
    Math.max(0, Number(progress) || 0),
  );
  const {
    overshootProgress,
    startScale,
    overshootScale,
    settledScale,
    backOvershoot,
  } = PIXI_ACCOUNT_DIALOG_OPEN_MOTION;

  if (normalized <= overshootProgress) {
    const local = normalized / overshootProgress;
    return lerp(
      startScale,
      overshootScale,
      easeOutCubic(local),
    );
  }

  const local =
    (normalized - overshootProgress) /
    (1 - overshootProgress);
  return lerp(
    overshootScale,
    settledScale,
    easeOutBack(local, backOvershoot),
  );
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function easeOutBack(value, overshoot) {
  const shifted = value - 1;
  return (
    1 +
    (overshoot + 1) * shifted ** 3 +
    overshoot * shifted ** 2
  );
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}
