import {
  Container,
  FillGradient,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
} from 'pixi.js';

import {
  PixiResourceLabel,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  PIXI_ROOT_RUN_ASSETS,
} from '../../theme/PixiThemeTokens.js';

const HUD_ASSETS = Object.freeze({
  avatarFrame: PIXI_ROOT_RUN_ASSETS.topHudAvatarFrame,
  avatarHead: PIXI_ROOT_RUN_ASSETS.topHudAvatarHead,
  currency: PIXI_ROOT_RUN_ASSETS.topHudCurrency,
  settings: PIXI_ROOT_RUN_ASSETS.topHudSettings,
  settingsGear: PIXI_ROOT_RUN_ASSETS.settingsGear,
  levelPanel: PIXI_ROOT_RUN_ASSETS.topHudLevelPanel,
  levelTrack: PIXI_ROOT_RUN_ASSETS.topHudLevelTrack,
  levelStar: 'public:ui/root-run-level-star.png',
});

const AVATAR_SIZE = 186;
const AVATAR_INSET = 19;
const AVATAR_PORTRAIT_SIZE = 148;
const CURRENCY_WIDTH = 208;
const CURRENCY_HEIGHT = 66;
const SETTINGS_SIZE = 122;
const LEVEL_WIDTH = 662;
const LEVEL_HEIGHT = 93;
const LEVEL_STAR_SIZE = 93;
const LEVEL_TRACK_X = 20;
const LEVEL_TRACK_Y = 21;
const LEVEL_TRACK_WIDTH = 631;
const LEVEL_TRACK_HEIGHT = 51;
const LEVEL_TRACK_INSET = 3;
const LEVEL_TEXT_STROKE = Object.freeze({
  color: '#0a0a0a',
  width: 6,
});
const HUD_GRADIENT_STOPS = Object.freeze([
  Object.freeze({ color: '#7f3cff', offset: 0 }),
  Object.freeze({ color: '#d868ff', offset: 0.48 }),
  Object.freeze({ color: '#64caff', offset: 0.74 }),
  Object.freeze({ color: '#ffd76a', offset: 1 }),
]);

export class RootRunHudAvatarButton extends Container {
  constructor({ assets, texture } = {}) {
    super({
      label: 'topPanel:avatarViewport',
      eventMode: 'static',
    });
    this.hitArea = new Rectangle(0, 0, AVATAR_SIZE, AVATAR_SIZE);

    this.frame = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.avatarFrame),
      insets: { left: 54, top: 54, right: 55, bottom: 55 },
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      label: 'topPanel:avatarFrame',
    });
    this.headBackground = new Sprite({
      texture: assets.getTexture(HUD_ASSETS.avatarHead),
      label: 'topPanel:avatarBackground',
      roundPixels: true,
    });
    this.headBackground.position.set(AVATAR_INSET, AVATAR_INSET);
    this.headBackground.width = AVATAR_PORTRAIT_SIZE;
    this.headBackground.height = AVATAR_PORTRAIT_SIZE + 1;

    this.portraitMask = new Graphics()
      .rect(
        AVATAR_INSET,
        AVATAR_INSET,
        AVATAR_PORTRAIT_SIZE,
        AVATAR_PORTRAIT_SIZE,
      )
      .fill('#ffffff');
    this.portraitMask.label = 'topPanel:avatarMask';
    this.portrait = new Sprite({
      texture,
      label: 'topPanel:avatar',
      roundPixels: true,
    });
    this.portrait.mask = this.portraitMask;
    this.addChild(
      this.frame,
      this.headBackground,
      this.portrait,
      this.portraitMask,
    );
    this.setTexture(texture);
  }

  setTexture(texture) {
    if (texture) {
      this.portrait.texture = texture;
    }
    this.portrait.width = AVATAR_PORTRAIT_SIZE;
    this.portrait.height = AVATAR_PORTRAIT_SIZE * (108 / 87);
    this.portrait.position.set(
      AVATAR_INSET,
      AVATAR_INSET - 14,
    );
    return this;
  }
}

export class RootRunHudCurrencyCapsule extends Container {
  constructor({
    assets,
    resource = 'coin',
    amount = '0',
    label = 'topPanel:currency',
  } = {}) {
    super({ label });
    this.background = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.currency),
      insets: { left: 25, top: 24, right: 25, bottom: 25 },
      width: CURRENCY_WIDTH,
      height: CURRENCY_HEIGHT,
      label: `${label}:background`,
    });
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
    amountLabel.position.set(193, CURRENCY_HEIGHT / 2);
    amountLabel.textObject.scale.set(1);
    if (amountLabel.measuredWidth > 120) {
      amountLabel.textObject.scale.set(120 / amountLabel.measuredWidth);
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

export class RootRunHudSquareIconButton extends Container {
  constructor({ assets } = {}) {
    super({
      label: 'topPanel:settingsControl',
      eventMode: 'static',
    });
    this.hitArea = new Rectangle(0, 0, SETTINGS_SIZE, SETTINGS_SIZE);
    this.background = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.settings),
      insets: { left: 46, top: 46, right: 46, bottom: 46 },
      width: SETTINGS_SIZE,
      height: SETTINGS_SIZE,
      label: 'topPanel:settingsBackground',
    });
    this.icon = new Sprite({
      texture: assets.getTexture(HUD_ASSETS.settingsGear),
      label: 'topPanel:settingsIcon',
      roundPixels: true,
    });
    this.icon.position.set(21, 19);
    this.icon.width = 80;
    this.icon.height = 84;
    this.addChild(this.background, this.icon);
  }
}

export class RootRunHudLevelRail extends Container {
  constructor({ assets } = {}) {
    super({ label: 'topPanel:levelRail' });
    this.ratio = 0;
    this.total = 1;
    this.completed = 0;
    this.questVisuals = new Container({
      label: 'topPanel:questVisuals',
      eventMode: 'none',
    });
    this.panel = new Sprite({
      texture: assets.getTexture(HUD_ASSETS.levelPanel),
      label: 'topPanel:levelPanel',
      roundPixels: true,
    });
    this.panel.position.set(6, 8);
    this.panel.width = 656;
    this.panel.height = 76;
    this.track = createNineSlice({
      texture: assets.getTexture(HUD_ASSETS.levelTrack),
      insets: { left: 31, top: 0, right: 31, bottom: 0 },
      width: LEVEL_TRACK_WIDTH,
      height: LEVEL_TRACK_HEIGHT,
      label: 'topPanel:questTrack',
    });
    this.track.position.set(LEVEL_TRACK_X, LEVEL_TRACK_Y);
    this.fill = new Graphics();
    this.fill.label = 'topPanel:questFill';
    this.dividers = new Graphics();
    this.dividers.label = 'topPanel:questDividers';
    this.gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      textureSpace: 'local',
      colorStops: HUD_GRADIENT_STOPS,
    });
    this.questVisuals.addChild(
      this.panel,
      this.track,
      this.fill,
      this.dividers,
    );

    this.levelControl = new Container({
      label: 'topPanel:levelControl',
      eventMode: 'static',
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
    this.levelStar.height = LEVEL_STAR_SIZE + 1;
    this.levelValue = new PixiTextLabel({
      text: '',
      fontSize: 40,
      fontWeight: 'normal',
      anchor: { x: 0.5, y: 0.5 },
      color: '#ffffff',
      stroke: LEVEL_TEXT_STROKE,
      label: 'topPanel:levelValue',
    });
    this.levelValue.position.set(
      LEVEL_STAR_SIZE / 2,
      LEVEL_STAR_SIZE / 2,
    );
    this.levelMotionRoot = new Container({
      label: 'topPanel:levelMotion',
    });
    this.levelMotionRoot.pivot.set(
      LEVEL_STAR_SIZE / 2,
      LEVEL_STAR_SIZE / 2,
    );
    this.levelMotionRoot.position.set(
      LEVEL_STAR_SIZE / 2,
      LEVEL_STAR_SIZE / 2,
    );
    this.levelMotionRoot.addChild(this.levelStar, this.levelValue);
    this.levelControl.addChild(this.levelMotionRoot);
    this.addChild(this.questVisuals, this.levelControl);
  }

  setLevel(level) {
    this.levelValue.setText(level ?? '');
    return this;
  }

  setQuestVisible(visible) {
    this.questVisuals.visible = Boolean(visible);
    this.questVisuals.renderable = this.questVisuals.visible;
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
    const y = LEVEL_TRACK_Y + LEVEL_TRACK_INSET;
    const width = LEVEL_TRACK_WIDTH - LEVEL_TRACK_INSET * 2;
    const height = LEVEL_TRACK_HEIGHT - LEVEL_TRACK_INSET * 2;

    this.fill.clear();
    const fillWidth = width * safeRatio;
    if (fillWidth > 0) {
      this.fill
        .roundRect(
          x,
          y,
          fillWidth,
          height,
          height / 2,
        )
        .fill(this.gradient);
    }

    this.dividers.clear();
    for (let index = 1; index < safeTotal; index += 1) {
      const dividerX = x + (width * index) / safeTotal;
      const dividerY = y + 9;
      const dividerHeight = height - 18;
      const complete = index <= safeCompleted;
      this.dividers
        .roundRect(
          dividerX - 3,
          dividerY,
          3,
          dividerHeight,
          1.5,
        )
        .fill({
          color: complete ? '#ffffff' : '#000000',
          alpha: complete ? 0.12 : 0.44,
        })
        .roundRect(
          dividerX + 3,
          dividerY,
          3,
          dividerHeight,
          1.5,
        )
        .fill({
          color: complete ? '#000000' : '#ffffff',
          alpha: complete ? 0.42 : 0.08,
        })
        .roundRect(
          dividerX,
          dividerY,
          3,
          dividerHeight,
          1.5,
        )
        .fill({
          color: complete ? '#201331' : '#ffffff',
          alpha: complete ? 0.82 : 0.68,
        });
    }
    return this;
  }

  applyTheme(theme) {
    this.levelValue.applyTheme(theme);
    this.levelValue
      .setColor('#ffffff')
      .setStroke(LEVEL_TEXT_STROKE);
    return this;
  }

  destroy(options) {
    this.gradient?.destroy();
    this.gradient = null;
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

function createNineSlice({
  texture,
  insets,
  width,
  height,
  label,
}) {
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
