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

export class PixiFreshStartChoiceView extends PixiModalSurface {
  constructor({ assets, inputRouter } = {}) {
    super({
      assetManager: assets,
      title: GUIDE_NAME,
      contentWidth: FRESH_START_CONTENT_WIDTH,
      contentHeight: FRESH_START_CONTENT_HEIGHT,
      opaqueBackdrop: true,
      inputRouter,
      modalId: 'gate.freshStartChoice',
      label: 'freshStartChoice',
    });
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
      text: 'do you already have an account?',
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
      text: 'connect account',
      width: FRESH_START_CONTENT_WIDTH,
      variant: 'yellow',
      label: 'freshStartChoice:connect',
    });
    this.freshButton = new PixiButton({
      assetManager: assets,
      inputRouter,
      text: 'start new',
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
    this.status.setText(model.statusText ?? 'not connected');
    this.connectButton
      .setText(model.busy ? 'connecting...' : 'connect account')
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
}

function fitSprite(sprite, width, height) {
  const textureWidth = Math.max(1, sprite.texture.width);
  const textureHeight = Math.max(1, sprite.texture.height);
  const scale = Math.min(width / textureWidth, height / textureHeight);
  sprite.scale.set(scale);
  sprite.anchor.set(0.5, 1);
}
