import {
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
} from 'pixi.js';

import {
  PixiBaseButton,
  PixiResourceLabel,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { PlayerProfileWidget } from './PlayerProfileWidgets.js';

const HUD_ASSETS = Object.freeze({
  currency: PIXI_ROOT_RUN_ASSETS.topHudCurrency,
  settings: PIXI_ROOT_RUN_ASSETS.topHudSettings,
  settingsGear: PIXI_ROOT_RUN_ASSETS.settingsGear,
  levelPanel: PIXI_ROOT_RUN_ASSETS.topHudLevelPanel,
  levelTrack: PIXI_ROOT_RUN_ASSETS.topHudLevelTrack,
  levelFill: PIXI_ROOT_RUN_ASSETS.topHudLevelFill,
  levelStar: PIXI_ROOT_RUN_ASSETS.topHudLevelStar,
});

const AVATAR_SIZE = 186;
const CURRENCY_WIDTH = 208;
const CURRENCY_MIN_WIDTH = 148;
const CURRENCY_HEIGHT = 66;
const SETTINGS_SIZE = 122;
const LEVEL_WIDTH = 662;
const LEVEL_HEIGHT = 93;
const LEVEL_STAR_SIZE = 96;
const LEVEL_TRACK_X = 20;
const LEVEL_TRACK_Y = 21;
const LEVEL_TRACK_HEIGHT = 51;
const LEVEL_TRACK_INSET = 3;
const LEVEL_FILL_HEIGHT = 51;
const LEVEL_FILL_CAP_WIDTH = 26;
const LEVEL_FILL_TEXTURE_WIDTH = 53;
const HUD_BACKING_TINT = 0x000000;
const HUD_BACKING_ALPHA = 0.4;
const LEVEL_FILL_TINT = 0xffdf41;
const LEVEL_FILL_SLICE = Object.freeze({
  left: 26,
  top: 20,
  right: 26,
  bottom: 21,
});
const LEVEL_PRESS_SCALE = 0.97;
const LEVEL_TEXT_STROKE = Object.freeze({
  color: '#0a0a0a',
  scale: PIXI_UI_GEOMETRY.sourceScale,
});

export class RootRunHudAvatarButton extends PixiBaseButton {
  constructor({ action = null, assets, inputRouter = null, texture } = {}) {
    super({
      action,
      assetManager: assets,
      fallbackHitTest: true,
      inputRouter,
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      variant: 'inline',
      label: 'topPanel:avatarViewport',
    });

    this.profileWidget = new PlayerProfileWidget({
      assets,
      texture,
      label: 'topPanel:profileWidget',
    });
    this.visual.addChild(this.profileWidget);
    this.avatarWidget = this.profileWidget.avatarWidget;
    this.backgroundWidget = this.profileWidget.backgroundWidget;
    this.avatarFrame = this.profileWidget.avatarFrame;
    this.headBackground = this.profileWidget.headBackground;
    this.portraitMask = this.profileWidget.portraitMask;
    this.portrait = this.profileWidget.portrait;
  }

  setTexture(texture) {
    this.profileWidget.setTexture(texture);
    return this;
  }

  setFrameTint(tint = 0xffffff) {
    this.profileWidget.setBackgroundTint(tint);
    return this;
  }
}

export class RootRunHudCurrencyCapsule extends Container {
  constructor({
    assets,
    resource = 'coin',
    amount = '0',
    width = CURRENCY_WIDTH,
    label = 'topPanel:currency',
  } = {}) {
    super({ label });
    this.capsuleWidth = Math.max(CURRENCY_MIN_WIDTH, Number(width) || CURRENCY_WIDTH);
    this.background = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.currency),
      insets: { left: 21, top: 21, right: 21, bottom: 21 },
      width: this.capsuleWidth,
      height: CURRENCY_HEIGHT,
      label: `${label}:background`,
    });
    this.background.tint = HUD_BACKING_TINT;
    this.background.alpha = HUD_BACKING_ALPHA;
    this.resourceLabel = new PixiResourceLabel({
      assetManager: assets,
      resource,
      amount,
      fontSize: 40,
      fontWeight: 'normal',
      includeResourceName: false,
      label,
    });
    this.resourceLabel.amountLabel
      .setColor('#ffffff')
      .setStroke(LEVEL_TEXT_STROKE)
      .setAnchor(1, 0.5);
    this.addChild(this.background, this.resourceLabel);
    this.layoutContent();
  }

  setResource(resource) {
    this.resourceLabel.setResource(resource);
    this.layoutContent();
    return this;
  }

  setAmount(amount) {
    this.resourceLabel.setAmount(amount);
    this.layoutContent();
    return this;
  }

  setWidth(width) {
    this.capsuleWidth = Math.max(CURRENCY_MIN_WIDTH, Number(width) || CURRENCY_WIDTH);
    this.background.setSize(this.capsuleWidth, CURRENCY_HEIGHT);
    this.layoutContent();
    return this;
  }

  applyTheme(theme) {
    this.resourceLabel.applyTheme(theme);
    this.resourceLabel.amountLabel
      .setColor('#ffffff')
      .setStroke(LEVEL_TEXT_STROKE);
    this.layoutContent();
    return this;
  }

  layoutContent() {
    const { icon, amountLabel } = this.resourceLabel;
    icon.anchor.set(0, 0.5);
    icon.width = 50;
    icon.height = 50;
    icon.position.set(13, CURRENCY_HEIGHT / 2);

    amountLabel.setAnchor(1, 0.5);
    amountLabel.position.set(this.capsuleWidth - 15, CURRENCY_HEIGHT / 2);
    amountLabel.textObject.scale.set(1);
    const availableAmountWidth = this.capsuleWidth - 88;
    if (amountLabel.measuredWidth > availableAmountWidth) {
      amountLabel.textObject.scale.set(
        availableAmountWidth / amountLabel.measuredWidth,
      );
    }
    return this;
  }

  get amount() {
    return this.resourceLabel.amount;
  }

  get resource() {
    return this.resourceLabel.resource;
  }
}

export class RootRunHudBagCapsule extends PixiBaseButton {
  constructor({
    action = null,
    assets,
    inputRouter = null,
    width = CURRENCY_WIDTH,
  } = {}) {
    const capsuleWidth = Math.max(
      CURRENCY_MIN_WIDTH,
      Number(width) || CURRENCY_WIDTH,
    );
    super({
      action,
      assetManager: assets,
      fallbackHitTest: true,
      height: CURRENCY_HEIGHT,
      inputRouter,
      label: 'topPanel:bag',
      variant: 'inline',
      width: capsuleWidth,
    });
    this.background = createHudBacking({
      assets,
      height: CURRENCY_HEIGHT,
      label: 'topPanel:bag:background',
      width: capsuleWidth,
    });
    this.icon = new Sprite({
      texture: assets.getTexture(PIXI_ROOT_RUN_ASSETS.workshopBag),
      label: 'topPanel:bag:icon',
      roundPixels: true,
    });
    this.icon.anchor.set(0, 0.5);
    this.icon.position.set(13, CURRENCY_HEIGHT / 2);
    this.icon.width = 50;
    this.icon.height = 50;
    this.text = new PixiTextLabel({
      text: 'Bag',
      fontSize: 40,
      fontWeight: 'normal',
      anchor: { x: 1, y: 0.5 },
      color: '#ffffff',
      stroke: LEVEL_TEXT_STROKE,
      label: 'topPanel:bag:text',
    });
    this.text.position.set(capsuleWidth - 15, CURRENCY_HEIGHT / 2);
    this.visual.addChild(this.background, this.icon, this.text);
  }

  applyTheme(theme) {
    this.text.applyTheme(theme);
    this.text.setColor('#ffffff').setStroke(LEVEL_TEXT_STROKE);
    return this;
  }
}

export class RootRunHudSquareIconButton extends PixiBaseButton {
  constructor({
    action = null,
    assets,
    inputRouter = null,
    label = 'topPanel:settingsControl',
  } = {}) {
    super({
      action,
      assetManager: assets,
      fallbackHitTest: true,
      height: SETTINGS_SIZE,
      inputRouter,
      label,
      variant: 'inline',
      width: SETTINGS_SIZE,
    });
    this.background = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.settings),
      insets: { left: 41, top: 41, right: 41, bottom: 41 },
      width: SETTINGS_SIZE,
      height: SETTINGS_SIZE,
      label: 'topPanel:settingsBackground',
    });
    this.background.tint = HUD_BACKING_TINT;
    this.background.alpha = HUD_BACKING_ALPHA;
    this.icon = new Sprite({
      texture: assets.getTexture(HUD_ASSETS.settingsGear),
      label: 'topPanel:settingsIcon',
      roundPixels: true,
    });
    this.icon.position.set(21, 19);
    this.icon.width = 80;
    this.icon.height = 84;
    this.visual.addChild(this.background, this.icon);
  }
}

export class RootRunHudLevelRail extends Container {
  constructor({ assets, width = LEVEL_WIDTH } = {}) {
    super({
      label: 'topPanel:levelRail',
      eventMode: 'static',
    });
    this.cursor = 'pointer';
    this.levelWidth = Math.max(LEVEL_WIDTH, Number(width) || 0);
    this.trackWidth = this.levelWidth - 31;
    this.hitArea = new Rectangle(0, 0, this.levelWidth, LEVEL_HEIGHT);
    this.ratio = 0;
    this.total = 1;
    this.completed = 0;
    this.pressed = false;
    this.pressVisual = new Container({
      label: 'topPanel:levelPressVisual',
      eventMode: 'none',
    });
    this.pressVisual.pivot.set(this.levelWidth / 2, LEVEL_HEIGHT / 2);
    this.pressVisual.position.set(this.levelWidth / 2, LEVEL_HEIGHT / 2);
    this.questVisuals = new Container({
      label: 'topPanel:questVisuals',
      eventMode: 'none',
    });
    this.panel = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.levelPanel),
      insets: { left: 31, top: 31, right: 31, bottom: 31 },
      width: this.levelWidth - 6,
      height: 76,
      label: 'topPanel:levelPanel',
    });
    this.panel.position.set(6, 8);
    this.panel.tint = HUD_BACKING_TINT;
    this.panel.alpha = HUD_BACKING_ALPHA;
    this.track = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.levelTrack),
      insets: { left: 31, top: 0, right: 31, bottom: 0 },
      width: this.trackWidth,
      height: LEVEL_TRACK_HEIGHT,
      label: 'topPanel:questTrack',
    });
    this.track.tint = HUD_BACKING_TINT;
    this.track.position.set(LEVEL_TRACK_X, LEVEL_TRACK_Y);
    this.fill = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.levelFill),
      insets: LEVEL_FILL_SLICE,
      width: LEVEL_FILL_TEXTURE_WIDTH,
      height: LEVEL_FILL_HEIGHT,
      label: 'topPanel:questFill',
    });
    this.fill.tint = LEVEL_FILL_TINT;
    this.dividers = new Graphics();
    this.dividers.label = 'topPanel:questDividers';
    this.questVisuals.addChild(
      this.panel,
      this.track,
      this.fill,
      this.dividers,
    );

    this.levelControl = new Container({
      label: 'topPanel:levelControl',
      eventMode: 'none',
    });
    this.levelControl.hitArea = new Rectangle(
      0,
      0,
      LEVEL_STAR_SIZE,
      LEVEL_STAR_SIZE,
    );
    this.levelStar = new Sprite({
      texture: assets.getTexture(HUD_ASSETS.levelStar),
      label: 'topPanel:levelStar',
      roundPixels: true,
    });
    this.levelStar.width = LEVEL_STAR_SIZE;
    this.levelStar.height = LEVEL_STAR_SIZE;
    this.levelValue = new PixiTextLabel({
      text: '',
      fontSize: 40,
      fontWeight: 'normal',
      anchor: { x: 0.5, y: 0.5 },
      color: '#ffffff',
      stroke: LEVEL_TEXT_STROKE,
      label: 'topPanel:levelValue',
    });
    this.levelValue.position.set(LEVEL_STAR_SIZE / 2, LEVEL_STAR_SIZE / 2);
    this.levelMotionRoot = new Container({
      label: 'topPanel:levelMotion',
    });
    this.levelMotionRoot.pivot.set(LEVEL_STAR_SIZE / 2, LEVEL_STAR_SIZE / 2);
    this.levelMotionRoot.position.set(LEVEL_STAR_SIZE / 2, LEVEL_STAR_SIZE / 2);
    this.levelMotionRoot.addChild(this.levelStar, this.levelValue);
    this.levelControl.addChild(this.levelMotionRoot);
    this.pressVisual.addChild(this.questVisuals, this.levelControl);
    this.addChild(this.pressVisual);
  }

  setLevel(level) {
    this.levelValue.setText(level ?? '');
    return this;
  }

  setQuestVisible(visible) {
    this.questVisuals.visible = Boolean(visible);
    this.questVisuals.renderable = this.questVisuals.visible;
    const interactionWidth = this.questVisuals.visible
      ? this.levelWidth
      : LEVEL_STAR_SIZE;
    this.hitArea.width = interactionWidth;
    this.pressVisual.pivot.x = interactionWidth / 2;
    this.pressVisual.position.x = interactionWidth / 2;
    return this;
  }

  setWidth(width) {
    this.levelWidth = Math.max(LEVEL_WIDTH, Number(width) || 0);
    this.trackWidth = this.levelWidth - 31;
    this.panel.setSize(this.levelWidth - 6, 76);
    this.track.setSize(this.trackWidth, LEVEL_TRACK_HEIGHT);
    this.setQuestVisible(this.questVisuals.visible);
    this.renderProgress({
      ratio: this.ratio,
      total: this.total,
      completed: this.completed,
    });
    return this;
  }

  setPressed(pressed) {
    this.pressed = Boolean(pressed);
    this.pressVisual.scale.set(this.pressed ? LEVEL_PRESS_SCALE : 1);
    return this;
  }

  renderProgress({ ratio = 0, total = 1, completed = 0 } = {}) {
    const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
    const safeTotal = Math.max(1, Math.floor(Number(total) || 1));
    const safeCompleted = Math.max(
      0,
      Math.min(safeTotal, Math.floor(Number(completed) || 0)),
    );
    this.ratio = safeRatio;
    this.total = safeTotal;
    this.completed = safeCompleted;
    const x = LEVEL_TRACK_X + LEVEL_TRACK_INSET;
    const y = LEVEL_TRACK_Y + (LEVEL_TRACK_HEIGHT - LEVEL_FILL_HEIGHT) / 2;
    const width = this.trackWidth - LEVEL_TRACK_INSET * 2;
    const height = LEVEL_FILL_HEIGHT;

    const fillWidth = width * safeRatio;
    if (fillWidth > 0) {
      this.fill.visible = true;
      this.fill.position.set(x, y);
      this.fill.setSize(fillWidth, height);
    } else {
      this.fill.visible = false;
    }

    this.dividers.clear();
    const fillEndX = x + fillWidth;
    for (let index = 1; index < safeTotal; index += 1) {
      const dividerX = x + (width * index) / safeTotal;
      if (
        fillWidth > 0 &&
        Math.abs(dividerX - fillEndX) <= LEVEL_FILL_CAP_WIDTH
      ) {
        continue;
      }
      const dividerY = y + 9;
      const dividerHeight = height - 18;
      const complete = index <= safeCompleted;
      this.dividers
        .roundRect(dividerX - 3, dividerY, 3, dividerHeight, 1.5)
        .fill({
          color: complete ? '#ffffff' : '#000000',
          alpha: complete ? 0.12 : 0.44,
        })
        .roundRect(dividerX + 3, dividerY, 3, dividerHeight, 1.5)
        .fill({
          color: complete ? '#000000' : '#ffffff',
          alpha: complete ? 0.42 : 0.08,
        })
        .roundRect(dividerX, dividerY, 3, dividerHeight, 1.5)
        .fill({
          color: complete ? '#201331' : '#ffffff',
          alpha: complete ? 0.82 : 0.68,
        });
    }
    return this;
  }

  applyTheme(theme) {
    this.levelValue.applyTheme(theme);
    this.levelValue.setColor('#ffffff').setStroke(LEVEL_TEXT_STROKE);
    return this;
  }

  destroy(options) {
    super.destroy(options);
  }
}

export const ROOT_RUN_TOP_HUD_GEOMETRY = Object.freeze({
  width: 1008,
  height: 186,
  avatarSize: AVATAR_SIZE,
  currencyWidth: CURRENCY_WIDTH,
  currencyHeight: CURRENCY_HEIGHT,
  settingsSize: SETTINGS_SIZE,
  levelWidth: LEVEL_WIDTH,
  levelHeight: LEVEL_HEIGHT,
});

function createHudBacking({ assets, height, label, width }) {
  const backing = createNineSlice({
    texture: assets.getTexture(HUD_ASSETS.currency),
    insets: { left: 21, top: 21, right: 21, bottom: 21 },
    width,
    height,
    label,
  });
  backing.tint = HUD_BACKING_TINT;
  backing.alpha = HUD_BACKING_ALPHA;
  return backing;
}

function createNineSlice({ texture, insets, width, height, label }) {
  const sprite = new NineSliceSprite({
    texture,
    leftWidth: insets.left,
    topHeight: insets.top,
    rightWidth: insets.right,
    bottomHeight: insets.bottom,
    roundPixels: true,
  });
  sprite.label = label;
  sprite.setSize(width, height);
  return sprite;
}
