import { Sprite } from 'pixi.js';

import {
  PixiButton,
  PixiModalSurface,
  PixiTextLabel,
} from '../../primitives/index.js';

const GUIDE_NAME = 'Elara Starbrew';
const WELCOME_HEADING = 'Welcome to Idle Wizard';

export class PixiFreshStartChoiceView extends PixiModalSurface {
  constructor({ assets, inputRouter } = {}) {
    super({
      assetManager: assets,
      title: GUIDE_NAME,
      contentWidth: 300,
      contentHeight: 197,
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
    fitSprite(this.portrait, 96, 125);
    this.heading = new PixiTextLabel({
      text: WELCOME_HEADING,
      fontWeight: 'bold',
      wordWrap: true,
      wrapWidth: 194,
      label: 'freshStartChoice:heading',
    });
    this.message = new PixiTextLabel({
      text: 'do you already have an account?',
      wordWrap: true,
      wrapWidth: 194,
      label: 'freshStartChoice:message',
    });
    this.status = new PixiTextLabel({
      color: 'disabled',
      wordWrap: true,
      wrapWidth: 194,
      label: 'freshStartChoice:status',
    });
    this.connectButton = new PixiButton({
      assetManager: assets,
      inputRouter,
      text: 'connect account',
      width: 300,
      label: 'freshStartChoice:connect',
    });
    this.freshButton = new PixiButton({
      assetManager: assets,
      inputRouter,
      text: 'start new',
      width: 300,
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
    this.portrait.position.set(48, 125);
    this.heading.position.set(106, 45);
    this.message.position.set(106, 68);
    this.status.position.set(106, 98);
    this.connectButton.position.set(0, 137);
    this.freshButton.position.set(0, 171);
    this.panel.setContentSize(300, 201);
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
