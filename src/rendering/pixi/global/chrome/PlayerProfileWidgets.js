import {
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { ClickableWidget } from '../../primitives/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
} from '../../theme/PixiThemeTokens.js';

export const PLAYER_PROFILE_SIZE = 186;
const PLAYER_PROFILE_INSET = 19;
const PLAYER_AVATAR_SIZE = 148;

/** Owns the tintable frame and inner profile decoration. */
export class PlayerBackgroundWidget extends Container {
  constructor({ assets, label = 'playerBackground' } = {}) {
    super({ label });
    this.frame = new NineSliceSprite({
      texture: assets.getTexture(PIXI_ROOT_RUN_ASSETS.topHudAvatarFrame),
      leftWidth: 54,
      topHeight: 54,
      rightWidth: 55,
      bottomHeight: 55,
      label: `${label}:frame`,
      roundPixels: true,
    });
    this.frame.width = PLAYER_PROFILE_SIZE;
    this.frame.height = PLAYER_PROFILE_SIZE;
    this.decoration = new Sprite({
      texture: assets.getTexture(PIXI_ROOT_RUN_ASSETS.topHudAvatarHead),
      label: `${label}:decoration`,
      roundPixels: true,
    });
    this.decoration.position.set(PLAYER_PROFILE_INSET, PLAYER_PROFILE_INSET);
    this.decoration.width = PLAYER_AVATAR_SIZE;
    this.decoration.height = PLAYER_AVATAR_SIZE + 1;
    this.addChild(this.frame, this.decoration);
  }

  setTint(tint = 0xffffff) {
    const normalizedTint = Number(tint) || 0xffffff;
    this.frame.tint = normalizedTint;
    this.decoration.tint = normalizedTint;
    return this;
  }
}

/** Owns the fully contained player portrait without background or interaction state. */
export class PlayerAvatarWidget extends Container {
  constructor({ texture = Texture.EMPTY, label = 'playerAvatar' } = {}) {
    super({ label });
    this.portrait = new Sprite({
      texture,
      label: `${label}:portrait`,
      roundPixels: true,
    });
    this.addChild(this.portrait);
    this.setTexture(texture);
  }

  setTexture(texture) {
    if (texture) {
      this.portrait.texture = texture;
    }
    const textureWidth = Math.max(1, Number(this.portrait.texture.width) || 1);
    const textureHeight = Math.max(1, Number(this.portrait.texture.height) || 1);
    const scale = Math.min(
      PLAYER_AVATAR_SIZE / textureWidth,
      PLAYER_AVATAR_SIZE / textureHeight,
    );
    const width = textureWidth * scale;
    const height = textureHeight * scale;
    this.portrait.position.set(
      PLAYER_PROFILE_INSET + (PLAYER_AVATAR_SIZE - width) / 2,
      PLAYER_PROFILE_INSET + PLAYER_AVATAR_SIZE - height,
    );
    this.portrait.width = width;
    this.portrait.height = height;
    return this;
  }
}

/** Shared passive player profile visual used by HUD, previews, and player info. */
export class PlayerProfileWidget extends Container {
  constructor({
    assets,
    texture = Texture.EMPTY,
    label = 'playerProfile',
  } = {}) {
    super({ label });
    this.backgroundWidget = new PlayerBackgroundWidget({
      assets,
      label: `${label}:backgroundWidget`,
    });
    this.avatarWidget = new PlayerAvatarWidget({
      texture,
      label: `${label}:avatarWidget`,
    });
    this.addChild(this.backgroundWidget, this.avatarWidget);

    // Named aliases keep callers focused on the profile contract while exposing
    // its production parts to UI Lab and focused geometry tests.
    this.avatarFrame = this.backgroundWidget.frame;
    this.headBackground = this.backgroundWidget.decoration;
    this.portrait = this.avatarWidget.portrait;
  }

  setTexture(texture) {
    this.avatarWidget.setTexture(texture);
    return this;
  }

  setBackgroundTint(tint = 0xffffff) {
    this.backgroundWidget.setTint(tint);
    return this;
  }

  setFrameTint(tint = 0xffffff) {
    return this.setBackgroundTint(tint);
  }
}

/** Selection-only wrapper around the shared passive player profile. */
export class PlayerSelectableProfileWidget extends ClickableWidget {
  constructor({ assetManager, inputRouter, label = 'selectableProfile' } = {}) {
    super({ enabled: false, inputRouter, label });
    this.assetManager = assetManager;
    this.visual = new Container({ label: `${label}:visual` });
    this.setClickableVisual(this.visual);
    this.profileWidget = new PlayerProfileWidget({
      assets: assetManager,
      label: `${label}:profileWidget`,
    });
    this.lockOverlay = new Graphics({ label: `${label}:lockOverlay` });
    this.selectionFrame = new Sprite({
      texture: assetManager.getTexture(PIXI_ROOT_RUN_ASSETS.accountSelected),
      roundPixels: true,
      label: `${label}:selectedFrame`,
    });
    this.status = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
      label: `${label}:status`,
    });
    this.visual.addChild(
      this.profileWidget,
      this.lockOverlay,
      this.selectionFrame,
      this.status,
    );
    this.root.addChild(this.visual);
    this.data = {};
    this.actions = {};
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root.visible = false;
  }

  bind(_key, data, actions) {
    this.data = data;
    this.actions = actions ?? {};
    this.root.visible = true;
    this.root.renderable = true;
    this.setClickableState({
      action: () => this.actions.select?.(this.data),
      enabled:
        data.enabled !== false &&
        (data.researched !== false || data.previewable === true) &&
        data.selected !== true,
    });
    this.profileWidget
      .setTexture(
        getCharacterTexture(this.assetManager, data.portraitKey ?? data.key),
      )
      .setBackgroundTint(data.frameTint ?? 0xffffff);
    this.status.texture = getStatusTexture(
      this.assetManager,
      data.equipped ? 'check' : 'lock',
    );
    this.status.visible = data.equipped || data.researched === false;
    this.status.renderable = this.status.visible;
    this.selectionFrame.visible = data.selected === true;
    this.selectionFrame.renderable = this.selectionFrame.visible;
    this.lockOverlay.visible = data.researched === false;
    this.lockOverlay.renderable = this.lockOverlay.visible;
    this.redraw();
  }

  reset() {
    this.data = {};
    this.actions = {};
    this.resetClickableState();
    this.root.visible = false;
    this.root.renderable = false;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.visual.pivot.set(width / 2, height / 2);
    this.visual.position.set(width / 2, height / 2);
    this.profileWidget.position.set(0, 0);
    this.profileWidget.scale.set(
      width / PLAYER_PROFILE_SIZE,
      height / PLAYER_PROFILE_SIZE,
    );
    this.lockOverlay
      .clear()
      .roundRect(1, 1, width - 2, height - 2, 7)
      .fill({ color: '#090b12', alpha: 0.62 });
    this.selectionFrame.position.set(-4, -4);
    this.selectionFrame.width = width + 8;
    this.selectionFrame.height = height + 8;
    this.status.position.set(width - 17, this.data.equipped ? height - 17 : 1);
    this.status.width = 16;
    this.status.height = 16;
    return this;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    return this;
  }

  redraw() {}

  destroy() {
    super.destroy({ children: true });
  }
}

function getCharacterTexture(assetManager, key) {
  try {
    return (
      assetManager?.getTexture?.(`source:assets/avatars/${key}.png`) ??
      Texture.EMPTY
    );
  } catch {
    try {
      return (
        assetManager?.getTexture?.('source:assets/avatars/elara.png') ??
        Texture.EMPTY
      );
    } catch {
      return Texture.EMPTY;
    }
  }
}

function getStatusTexture(assetManager, status) {
  try {
    return (
      assetManager?.getAtlasTexture?.(
        status === 'check' ? 'status:checkDefault' : 'status:lockDefault',
      ) ?? Texture.EMPTY
    );
  } catch {
    return Texture.EMPTY;
  }
}
