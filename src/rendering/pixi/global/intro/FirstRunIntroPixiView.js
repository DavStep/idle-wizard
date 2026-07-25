import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
} from 'pixi.js';

import {
  BasePixiRetainedView,
  PixiButton,
  PixiFrame,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

export const FIRST_RUN_INTRO_PIXI_ASSETS = Object.freeze({
  castle: 'source:assets/rooms/intro/castle-ruins.webp',
  defeated: 'source:assets/rooms/intro/demon-defeated.webp',
  peace: 'source:assets/rooms/intro/peaceful-world.webp',
  workshop: 'source:assets/rooms/intro/workshop-for-sale.webp',
});

export const FIRST_RUN_INTRO_PIXI_STEPS = Object.freeze([
  Object.freeze({
    id: 'castle',
    scene: 'castle',
    text: "one last battle at the demon lord's keep.",
    actionLabel: 'next',
  }),
  Object.freeze({
    id: 'defeated',
    scene: 'defeated',
    text: 'the demon lord has been defeated.',
    actionLabel: 'next',
  }),
  Object.freeze({
    id: 'disbanded',
    scene: 'peace',
    text: 'peace returned. the wizard army disbanded.',
    actionLabel: 'next',
  }),
  Object.freeze({
    id: 'workshop',
    scene: 'workshop',
    text:
      'not every legend ends on a battlefield. some begin with an old workshop.',
    actionLabel: 'enter workshop',
  }),
]);

export const FIRST_RUN_INTRO_PIXI_GEOMETRY = Object.freeze({
  sourceWidth: 360,
  sourceHeight: 2170 / 3,
  panelLeft: 20,
  panelRight: 20,
  panelBottom: 26,
  panelHeight: 125,
  panelPaddingX: 20,
  panelPaddingTop: 27,
  panelPaddingBottom: 20,
  rainbow: Object.freeze({ x: 58, y: 124, width: 248, height: 154 }),
  defeated: Object.freeze({ x: 68, y: 370, width: 225 }),
  sale: Object.freeze({ x: 248, y: 323, width: 86, height: 54 }),
});

const INTRO_ENTER_DURATIONS = Object.freeze({
  castle: 2400,
  defeated: 2400,
  peace: 1800,
  workshop: 1700,
});
const INTRO_EXIT_MS = 180;

/**
 * @typedef {object} FirstRunIntroPixiViewModel
 * @property {boolean} [visible]
 * @property {string} id
 * @property {'castle'|'defeated'|'peace'|'workshop'} scene
 * @property {string} text
 * @property {string} actionLabel
 * @property {boolean} [actionEnabled]
 * @property {boolean} [reducedMotion]
 * @property {{advance?: Function}} [actions]
 */

/**
 * Retained first-run cutscene. The scene, panel, and input registration are
 * constructed once. A presentation controller advances the story; this view
 * owns only the visual enter/exit timelines.
 */
export class FirstRunIntroPixiView extends BasePixiRetainedView {
  constructor({
    assets,
    inputRouter = null,
    application = null,
    parent = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    reducedMotion = false,
  } = {}) {
    if (!assets?.getTexture) {
      throw new Error('FirstRunIntroPixiView requires preloaded Pixi assets.');
    }

    super({ label: 'firstRunIntro' });
    this.assets = assets;
    this.inputRouter = inputRouter;
    this.application = application;
    this.reducedMotion = Boolean(reducedMotion);
    this.actions = {};
    this.model = null;
    this.previousStepId = null;
    this.motion = null;
    this.exitCompletion = null;
    this.handleTick = (ticker) => this.tick(ticker?.deltaMS ?? ticker);

    this.wideBackground = new Graphics();
    this.wideBackground.label = 'firstRunIntro:wideBackground';

    this.scene = new Container();
    this.scene.label = 'firstRunIntro:scene';
    this.sceneMask = new Graphics();
    this.sceneMask.label = 'firstRunIntro:sceneMask';
    this.scene.mask = this.sceneMask;

    this.backdropLayer = new Container();
    this.backdropLayer.label = 'firstRunIntro:backdropLayer';
    this.backdrops = Object.freeze({
      castle: this.createBackdrop('castle'),
      peace: this.createBackdrop('peace'),
      workshop: this.createBackdrop('workshop'),
    });
    this.backdropLayer.addChild(...Object.values(this.backdrops));

    this.rainbow = createRainbow();
    this.rainbow.label = 'firstRunIntro:rainbow';
    this.rainbow.position.set(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.rainbow.x,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.rainbow.y,
    );

    this.defeated = new Sprite({
      texture: assets.getTexture(FIRST_RUN_INTRO_PIXI_ASSETS.defeated),
      roundPixels: true,
    });
    this.defeated.label = 'firstRunIntro:defeated';
    fitSpriteWidth(
      this.defeated,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.defeated.width,
    );
    this.defeated.position.set(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.defeated.x,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.defeated.y,
    );

    this.sale = createWorkshopSale();
    this.sale.label = 'firstRunIntro:workshopSale';
    this.sale.position.set(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sale.x,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sale.y,
    );

    this.transitionShade = new Graphics();
    this.transitionShade.label = 'firstRunIntro:transitionShade';
    this.transitionShade
      .rect(
        0,
        0,
        FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceWidth,
        FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceHeight,
      )
      .fill('#111111');
    this.transitionShade.alpha = 0;

    this.scene.addChild(
      this.backdropLayer,
      this.rainbow,
      this.defeated,
      this.sale,
      this.transitionShade,
    );

    const panelWidth =
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceWidth -
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelLeft -
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelRight;
    this.panel = new PixiFrame({
      assetManager: assets,
      variant: 'panel',
      width: panelWidth,
      height: FIRST_RUN_INTRO_PIXI_GEOMETRY.panelHeight,
      label: 'firstRunIntro:panel',
    });
    this.title = new PixiTextLabel({
      text: 'after the war',
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'bold',
      stroke: {
        color: DEFAULT_PIXI_THEME_SNAPSHOT.surface,
        width: 2,
      },
      label: 'firstRunIntro:title',
    });
    this.copy = new PixiTextLabel({
      text: '',
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      lineHeight: 16,
      wordWrap: true,
      wrapWidth:
        panelWidth - FIRST_RUN_INTRO_PIXI_GEOMETRY.panelPaddingX * 2,
      label: 'firstRunIntro:copy',
    });
    this.advanceButton = new PixiButton({
      assetManager: assets,
      inputRouter,
      semanticId: null,
      text: 'next',
      width: panelWidth - FIRST_RUN_INTRO_PIXI_GEOMETRY.panelPaddingX * 2,
      height: 26,
      variant: 'yellow',
      action: () => this.actions.advance?.(),
      label: 'firstRunIntro:advance',
    });
    this.panel.addChild(
      this.title,
      this.copy,
      this.advanceButton,
    );

    this.root.addChild(
      this.wideBackground,
      this.scene,
      this.sceneMask,
      this.panel,
    );
    this.root.eventMode = 'none';
    parent?.addChild?.(this.root);
    this.applyTheme(theme);
    this.layout({
      sourceWidth: FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceWidth,
      sourceHeight: FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceHeight,
      sourceOffsetX: 0,
      stageLogicalWidth: PIXI_UI_GEOMETRY.authoredWidth,
      sourceScale: PIXI_UI_GEOMETRY.sourceScale,
    });
    this.renderModel(null);
  }

  createBackdrop(scene) {
    const assetId =
      scene === 'peace'
        ? FIRST_RUN_INTRO_PIXI_ASSETS.peace
        : scene === 'workshop'
          ? FIRST_RUN_INTRO_PIXI_ASSETS.workshop
          : FIRST_RUN_INTRO_PIXI_ASSETS.castle;
    const sprite = new Sprite({
      texture: this.assets.getTexture(assetId),
      roundPixels: true,
    });
    sprite.label = `firstRunIntro:backdrop:${scene}`;
    sprite.anchor.set(0.5);
    coverSprite(
      sprite,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceWidth,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceHeight,
      scene === 'workshop' ? 0.62 : scene === 'peace' ? 0.5 : 0.5,
    );
    return sprite;
  }

  onBind(viewModel) {
    const model = normalizeIntroModel(viewModel);
    this.model = model;
    this.actions = model?.actions ?? {};
    this.reducedMotion = Boolean(
      model?.reducedMotion ?? this.reducedMotion,
    );
    const changed = model?.id && model.id !== this.previousStepId;
    this.previousStepId = model?.id ?? null;
    this.renderModel(model);
    if (changed && model.visible !== false) {
      this.playEnter(model.scene);
    }
  }

  onApplyTheme(theme) {
    const nextTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.panel.applyTheme(nextTheme);
    this.title.applyTheme(nextTheme);
    this.title.setStroke({ color: nextTheme.surface, width: 2 });
    this.copy.applyTheme(nextTheme);
    this.advanceButton.applyTheme(nextTheme);
    applySaleTheme(this.sale, nextTheme);
  }

  onLayout(projection = {}) {
    const sourceWidth =
      Number(projection.sourceWidth) ||
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceWidth;
    const sourceHeight =
      Number(projection.sourceHeight) ||
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceHeight;
    const sourceOffsetX = Math.max(
      0,
      Number(projection.sourceOffsetX) || 0,
    );
    const stageSourceWidth =
      Number(projection.stageLogicalWidth) /
        Math.max(1, Number(projection.sourceScale) || 3) ||
      sourceWidth + sourceOffsetX * 2;

    this.wideBackground
      .clear()
      .rect(-sourceOffsetX, 0, stageSourceWidth, sourceHeight)
      .fill('#111111');
    this.sceneMask
      .clear()
      .rect(0, 0, sourceWidth, sourceHeight)
      .fill('#ffffff');
    this.root.hitArea = new Rectangle(
      -sourceOffsetX,
      0,
      stageSourceWidth,
      sourceHeight,
    );

    const panelWidth =
      FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceWidth -
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelLeft -
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelRight;
    const panelY =
      sourceHeight -
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelBottom -
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelHeight;
    this.panel.position.set(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelLeft,
      panelY,
    );
    this.panel.__layoutY = panelY;
    this.panel.setSize(
      panelWidth,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelHeight,
    );
    this.title.position.set(8, -12);
    this.copy.position.set(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelPaddingX,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelPaddingTop,
    );
    this.advanceButton.position.set(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelPaddingX,
      FIRST_RUN_INTRO_PIXI_GEOMETRY.panelHeight -
        FIRST_RUN_INTRO_PIXI_GEOMETRY.panelPaddingBottom -
        26,
    );
  }

  onActivate() {
    this.syncTicker();
    this.syncVisibility();
  }

  onDeactivate() {
    this.stopTicker();
    this.cancelMotion();
  }

  onDestroy() {
    this.stopTicker();
    this.cancelMotion();
  }

  renderModel(model) {
    const visible = Boolean(model && model.visible !== false);
    this.root.visible = this.active && visible;
    this.root.renderable = this.root.visible;
    this.root.eventMode = this.root.visible ? 'static' : 'none';
    this.advanceButton
      .setText(model?.actionLabel ?? '')
      .setAction(() => this.actions.advance?.())
      .setEnabled(visible && model?.actionEnabled !== false);
    this.copy.setText(model?.text ?? '');

    for (const [scene, backdrop] of Object.entries(this.backdrops)) {
      backdrop.visible =
        visible &&
        (model?.scene === scene ||
          (model?.scene === 'defeated' && scene === 'castle'));
      backdrop.renderable = backdrop.visible;
    }
    this.rainbow.visible = visible && model?.scene === 'peace';
    this.rainbow.renderable = this.rainbow.visible;
    this.defeated.visible = visible && model?.scene === 'defeated';
    this.defeated.renderable = this.defeated.visible;
    this.sale.visible = visible && model?.id === 'workshop';
    this.sale.renderable = this.sale.visible;

    if (!visible) {
      this.stopTicker();
      this.cancelMotion();
    }
  }

  syncVisibility() {
    this.renderModel(this.model);
  }

  playEnter(scene) {
    this.cancelMotion();
    this.resetSceneVisuals();
    if (this.reducedMotion) {
      this.applyEnterProgress(scene, 1);
      return;
    }
    this.motion = {
      kind: 'enter',
      scene,
      elapsedMs: 0,
      durationMs: INTRO_ENTER_DURATIONS[scene] ?? 720,
    };
    this.applyEnterProgress(scene, 0);
    this.syncTicker();
  }

  playExit(onComplete, { backdropChanging = true } = {}) {
    this.cancelMotion();
    this.exitCompletion =
      typeof onComplete === 'function' ? onComplete : null;
    this.advanceButton.setEnabled(false);
    if (this.reducedMotion) {
      this.applyExitProgress(1, backdropChanging);
      this.finishExit();
      return;
    }
    this.motion = {
      kind: 'exit',
      scene: this.model?.scene ?? 'castle',
      elapsedMs: 0,
      durationMs: INTRO_EXIT_MS,
      backdropChanging: Boolean(backdropChanging),
    };
    this.applyExitProgress(0, backdropChanging);
    this.syncTicker();
  }

  tick(deltaMs) {
    if (!this.motion || !this.active) {
      this.stopTicker();
      return;
    }
    this.motion.elapsedMs += Math.max(0, Number(deltaMs) || 0);
    const progress = clamp01(
      this.motion.elapsedMs / Math.max(1, this.motion.durationMs),
    );
    if (this.motion.kind === 'enter') {
      this.applyEnterProgress(this.motion.scene, progress);
    } else {
      this.applyExitProgress(progress, this.motion.backdropChanging);
    }
    if (progress < 1) {
      return;
    }
    if (this.motion.kind === 'exit') {
      this.finishExit();
    } else {
      this.motion = null;
      this.stopTicker();
    }
  }

  finishExit() {
    const completion = this.exitCompletion;
    this.motion = null;
    this.exitCompletion = null;
    this.stopTicker();
    completion?.();
    if (this.model?.visible !== false) {
      this.advanceButton.setEnabled(this.model?.actionEnabled !== false);
    }
  }

  applyEnterProgress(scene, progress) {
    const eased = easeOutCubic(progress);
    this.panel.alpha = progress < 0.72 ? progress / 0.72 : 1;
    const panelScale =
      progress < 0.72
        ? lerp(0.982, 1.006, progress / 0.72)
        : lerp(1.006, 1, (progress - 0.72) / 0.28);
    this.panel.scale.set(panelScale);
    this.panel.__motionY = lerp(8, 0, eased);
    this.panel.position.y =
      (this.panel.__layoutY ?? this.panel.position.y) +
      this.panel.__motionY;

    this.copy.alpha = clamp01((progress - 0.04) / 0.12);
    this.advanceButton.alpha = clamp01((progress - 0.05) / 0.1);
    this.transitionShade.alpha =
      progress <= 0.12 ? lerp(0.92, 0, progress / 0.12) : 0;

    const backdrop = this.getVisibleBackdrop();
    if (backdrop) {
      applyBackdropEnter(backdrop, scene, progress);
    }
    if (scene === 'defeated') {
      applyDefeatedEnter(this.defeated, progress);
    }
    if (scene === 'peace') {
      const rainbowProgress = clamp01(
        (progress * (INTRO_ENTER_DURATIONS.peace ?? 1800) - 360) / 900,
      );
      this.rainbow.alpha = lerp(0, 0.62, easeOutCubic(rainbowProgress));
      this.rainbow.scale.set(lerp(0.985, 1, rainbowProgress));
      this.rainbow.position.y =
        FIRST_RUN_INTRO_PIXI_GEOMETRY.rainbow.y +
        lerp(6, 0, rainbowProgress);
    }
    if (scene === 'workshop') {
      const saleProgress = clamp01(progress * 1700 / 520);
      this.sale.alpha =
        saleProgress < 0.7 ? saleProgress / 0.7 : 1;
      this.sale.position.y =
        FIRST_RUN_INTRO_PIXI_GEOMETRY.sale.y +
        (saleProgress < 0.7
          ? lerp(8, -1, saleProgress / 0.7)
          : lerp(-1, 0, (saleProgress - 0.7) / 0.3));
    }
  }

  applyExitProgress(progress, backdropChanging) {
    const eased = easeOutCubic(progress);
    this.panel.alpha = 1 - progress;
    this.panel.scale.set(lerp(1, 0.992, eased));
    this.panel.__motionY = lerp(0, 4, eased);
    this.panel.position.y =
      (this.panel.__layoutY ?? this.panel.position.y) +
      this.panel.__motionY;
    this.transitionShade.alpha = backdropChanging
      ? lerp(0, 0.92, eased)
      : 0;
    this.backdropLayer.alpha = backdropChanging
      ? lerp(1, 0.78, eased)
      : 1;
    this.rainbow.alpha = lerp(0.62, 0, eased);
    this.sale.alpha = lerp(1, 0, eased);
  }

  resetSceneVisuals() {
    this.backdropLayer.alpha = 1;
    this.transitionShade.alpha = 0;
    this.panel.alpha = 1;
    this.panel.scale.set(1);
    this.panel.__motionY = 0;
    this.panel.position.y =
      this.panel.__layoutY ?? this.panel.position.y;
    this.copy.alpha = 1;
    this.advanceButton.alpha = 1;
    this.rainbow.alpha = this.model?.scene === 'peace' ? 0.62 : 0;
    this.rainbow.scale.set(1);
    this.rainbow.position.y = FIRST_RUN_INTRO_PIXI_GEOMETRY.rainbow.y;
    this.sale.alpha = 1;
    this.sale.position.y = FIRST_RUN_INTRO_PIXI_GEOMETRY.sale.y;
    this.defeated.alpha = 1;
    this.defeated.scale.set(
      FIRST_RUN_INTRO_PIXI_GEOMETRY.defeated.width /
        Math.max(1, this.defeated.texture.width),
    );
    for (const backdrop of Object.values(this.backdrops)) {
      backdrop.alpha = 1;
      backdrop.scale.set(backdrop.__coverScale ?? 1);
      backdrop.position.set(
        backdrop.__coverX ??
          FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceWidth / 2,
        backdrop.__coverY ??
          FIRST_RUN_INTRO_PIXI_GEOMETRY.sourceHeight / 2,
      );
    }
  }

  getVisibleBackdrop() {
    return Object.values(this.backdrops).find(
      (backdrop) => backdrop.visible,
    );
  }

  syncTicker() {
    this.stopTicker();
    if (this.active && this.motion) {
      this.application?.ticker?.add?.(this.handleTick);
    }
  }

  stopTicker() {
    this.application?.ticker?.remove?.(this.handleTick);
  }

  cancelMotion() {
    this.motion = null;
    this.exitCompletion = null;
    this.stopTicker();
  }

}

/**
 * Presentation-only story sequencer. Save eligibility/progress remains owned by
 * FirstRunIntroFacade; this controller only binds frozen copy and visual steps.
 */
export class FirstRunIntroPixiPresenter {
  constructor({
    view,
    steps = FIRST_RUN_INTRO_PIXI_STEPS,
  } = {}) {
    if (!view?.bind || !view?.playExit) {
      throw new Error(
        'FirstRunIntroPixiPresenter requires a FirstRunIntroPixiView.',
      );
    }
    this.view = view;
    this.steps = steps;
    this.index = 0;
    this.visible = false;
    this.onComplete = null;
    this.reducedMotion = false;
    this.transitioning = false;
  }

  show({ onComplete = null, reducedMotion = false } = {}) {
    this.index = 0;
    this.visible = true;
    this.transitioning = false;
    this.reducedMotion = Boolean(reducedMotion);
    this.onComplete =
      typeof onComplete === 'function' ? onComplete : null;
    this.publish();
    return true;
  }

  hide() {
    this.visible = false;
    this.transitioning = false;
    this.view.bind({ visible: false });
  }

  advance() {
    if (!this.visible || this.transitioning) {
      return false;
    }
    this.transitioning = true;
    const nextIndex = this.index + 1;
    const completing = nextIndex >= this.steps.length;
    const current = this.steps[this.index];
    const next = this.steps[nextIndex];
    const backdropChanging =
      completing ||
      getBackdropAssetForScene(current?.scene) !==
        getBackdropAssetForScene(next?.scene);
    this.view.playExit(
      () => {
        this.transitioning = false;
        if (completing) {
          const onComplete = this.onComplete;
          this.hide();
          this.onComplete = null;
          onComplete?.();
          return;
        }
        this.index = nextIndex;
        this.publish();
      },
      { backdropChanging },
    );
    return true;
  }

  publish() {
    const step = this.steps[this.index];
    if (!step) {
      this.hide();
      return;
    }
    this.view.bind({
      ...step,
      visible: this.visible,
      reducedMotion: this.reducedMotion,
      actions: {
        advance: () => this.advance(),
      },
    });
  }
}

export function createFirstRunIntroPixiView(options = {}) {
  return new FirstRunIntroPixiView(options);
}

export function createFirstRunIntroPixiPresenter(options = {}) {
  return new FirstRunIntroPixiPresenter(options);
}

function normalizeIntroModel(model) {
  if (!model || model.visible === false) {
    return { visible: false, actions: model?.actions ?? {} };
  }
  return {
    visible: true,
    id: String(model.id ?? model.stepId ?? ''),
    scene: normalizeScene(model.scene),
    text: String(model.text ?? ''),
    actionLabel: String(model.actionLabel ?? model.action ?? 'next'),
    actionEnabled: model.actionEnabled !== false,
    reducedMotion: model.reducedMotion,
    actions: model.actions ?? {},
  };
}

function normalizeScene(scene) {
  return ['castle', 'defeated', 'peace', 'workshop'].includes(scene)
    ? scene
    : 'castle';
}

function getBackdropAssetForScene(scene) {
  if (scene === 'peace') {
    return FIRST_RUN_INTRO_PIXI_ASSETS.peace;
  }
  if (scene === 'workshop') {
    return FIRST_RUN_INTRO_PIXI_ASSETS.workshop;
  }
  return FIRST_RUN_INTRO_PIXI_ASSETS.castle;
}

function coverSprite(sprite, width, height, objectPositionX = 0.5) {
  const textureWidth = Math.max(1, sprite.texture.width);
  const textureHeight = Math.max(1, sprite.texture.height);
  const scale = Math.max(width / textureWidth, height / textureHeight);
  const renderedWidth = textureWidth * scale;
  const renderedHeight = textureHeight * scale;
  const overflowX = Math.max(0, renderedWidth - width);
  sprite.scale.set(scale);
  sprite.position.set(
    width / 2 + overflowX * (0.5 - objectPositionX),
    height / 2 + Math.max(0, renderedHeight - height) * 0,
  );
  sprite.__coverScale = scale;
  sprite.__coverX = sprite.x;
  sprite.__coverY = sprite.y;
}

function fitSpriteWidth(sprite, width) {
  sprite.scale.set(width / Math.max(1, sprite.texture.width));
}

function createRainbow() {
  const container = new Container();
  const mask = new Graphics()
    .rect(0, 0, 248, 154)
    .fill('#ffffff');
  const bands = new Graphics();
  const colors = [
    ['#9a524c', 0.28],
    ['#bc824a', 0.27],
    ['#c3a854', 0.25],
    ['#77945b', 0.24],
    ['#528199', 0.23],
    ['#776192', 0.21],
  ];
  colors.forEach(([color, alpha], index) => {
    bands
      .ellipse(124, 142, 116 - index * 10, 104 - index * 9)
      .stroke({ color, alpha, width: 8 });
  });
  bands.mask = mask;
  container.addChild(bands, mask);
  return container;
}

function createWorkshopSale() {
  const container = new Container();
  const label = new PixiTextLabel({
    text: 'vacant',
    fontSize: 11,
    fontWeight: 'bold',
    anchor: { x: 0.5, y: 0.5 },
    color: '#1c1712',
    label: 'firstRunIntro:saleLabel',
  });
  const price = new PixiTextLabel({
    text: 'free',
    fontSize: 13,
    fontWeight: 'bold',
    anchor: { x: 0.5, y: 0.5 },
    color: '#1c1712',
    label: 'firstRunIntro:salePrice',
  });
  label.position.set(43, 13);
  price.position.set(43, 35);
  container.addChild(label, price);
  container.__saleLabels = [label, price];
  return container;
}

function applySaleTheme(sale, theme) {
  for (const label of sale.__saleLabels ?? []) {
    label.applyTheme(theme);
    label.setColor('#1c1712');
  }
}

function applyBackdropEnter(backdrop, scene, progress) {
  const baseScale = backdrop.__coverScale ?? 1;
  let opacityStart = 0.42;
  let fromScale = 1.045;
  let toScale = 1.015;
  let fromX = scene === 'workshop' ? 6 : scene === 'peace' ? 0 : 0;
  let fromY = scene === 'peace' ? 4 : 0;
  let toY = 0;
  if (scene === 'castle' || scene === 'defeated') {
    opacityStart = 0;
    fromScale = 1.02;
    toScale = 1.07;
    toY = -8;
  }
  backdrop.alpha =
    progress < 0.2
      ? lerp(opacityStart, 1, progress / 0.2)
      : 1;
  backdrop.scale.set(baseScale * lerp(fromScale, toScale, progress));
  backdrop.position.set(
    (backdrop.__coverX ?? 180) + lerp(fromX, 0, progress),
    (backdrop.__coverY ?? 2170 / 6) + lerp(fromY, toY, progress),
  );
}

function applyDefeatedEnter(sprite, progress) {
  const baseScale =
    FIRST_RUN_INTRO_PIXI_GEOMETRY.defeated.width /
    Math.max(1, sprite.texture.width);
  sprite.alpha = clamp01(progress / 0.16);
  if (progress <= 0.54) {
    const local = progress / 0.54;
    sprite.position.y =
      FIRST_RUN_INTRO_PIXI_GEOMETRY.defeated.y +
      lerp(-350, 0, easeOutCubic(local));
    sprite.scale.set(
      baseScale * lerp(0.86 / 0.9, 0.925 / 0.9, local),
      baseScale * lerp(0.96 / 0.9, 0.875 / 0.9, local),
    );
  } else if (progress <= 0.72) {
    const local = (progress - 0.54) / 0.18;
    sprite.position.y =
      FIRST_RUN_INTRO_PIXI_GEOMETRY.defeated.y + lerp(0, -6, local);
    sprite.scale.set(
      baseScale * lerp(0.925 / 0.9, 0.887 / 0.9, local),
      baseScale * lerp(0.875 / 0.9, 0.914 / 0.9, local),
    );
  } else {
    sprite.position.y =
      FIRST_RUN_INTRO_PIXI_GEOMETRY.defeated.y +
      lerp(-6, 0, (progress - 0.72) / 0.28);
    sprite.scale.set(baseScale);
  }
}

function lerp(from, to, progress) {
  return from + (to - from) * clamp01(progress);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp01(value), 3);
}
