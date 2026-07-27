import {
  Container,
  FillGradient,
  Graphics,
  Rectangle,
  Sprite,
} from 'pixi.js';

import {
  BasePixiRetainedView,
  PixiFrame,
  PixiResourceLabel,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
} from '../../theme/PixiThemeTokens.js';

const PANEL_BOUNDS = Object.freeze({
  x: 16,
  y: 9,
  width: 328,
  height: 82,
});
const LEVEL_SIZE = 28;
const TOP_FONT_SIZE = 11;
const QUEST_RAIL_HEIGHT = 14;
const QUEST_RAIL_BORDER = 1;
const QUEST_RAIL_TRACK = '#000000';
const QUEST_RAIL_TRACK_ALPHA = 0.6;
const QUEST_RAIL_INSET = '#090705';
const QUEST_RAIL_INSET_ALPHA = 0.64;
const QUEST_FILL = '#8740df';
const QUEST_FILL_EDGE = '#bd72f3';
const QUEST_DIVIDER_INCOMPLETE = '#ffffff';
const QUEST_DIVIDER_COMPLETE = '#201331';
const QUEST_REMAINING = QUEST_FILL_EDGE;
const QUEST_RECEIVE_MOTION_MS = 140;
const LEVEL_UP_MOTION_MS = 230;
const QUEST_RECEIVE_FRAMES = Object.freeze([
  Object.freeze({ progress: 0, scale: 1, y: 0 }),
  Object.freeze({ progress: 0.52, scale: 1.06, y: -1 }),
  Object.freeze({ progress: 1, scale: 1, y: 0 }),
]);
const LEVEL_UP_FRAMES = Object.freeze([
  Object.freeze({ progress: 0, scale: 1, y: 0 }),
  Object.freeze({ progress: 0.46, scale: 1.035, y: -3 }),
  Object.freeze({ progress: 0.74, scale: 0.994, y: 1 }),
  Object.freeze({ progress: 1, scale: 1, y: 0 }),
]);
const QUEST_RAIL_RECEIVE_FRAMES = Object.freeze([
  Object.freeze({ progress: 0, scale: 1 }),
  Object.freeze({ progress: 0.52, scale: 1.35 }),
  Object.freeze({ progress: 1, scale: 1 }),
]);

/**
 * The retained player-status chrome. Every child is constructed once; frame
 * resource updates mutate text and graphics only.
 */
export class PixiTopPanelView extends BasePixiRetainedView {
  constructor({
    assets,
    inputRouter,
    semanticRegistry,
    reducedMotion = prefersReducedMotion,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
  } = {}) {
    super({ label: 'topPanel' });
    this.assets = assets;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.reducedMotion =
      typeof reducedMotion === 'function'
        ? reducedMotion
        : () => Boolean(reducedMotion);
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.actions = {};
    this.model = {};
    this.motionSnapshot = null;
    this.levelMotion = null;
    this.questRailMotion = null;
    this.levelMotionState = { scale: 1, y: 0 };
    this.questRailMotionState = { scale: 1, y: 0 };
    this.motionFrame = null;
    this.handleMotionFrame = (timestamp) => {
      this.motionFrame = null;
      this.updateMotion(
        Number.isFinite(timestamp) ? timestamp : this.timeSource(),
      );
    };

    this.frame = new PixiFrame({
      assetManager: assets,
      variant: 'panel',
      width: PANEL_BOUNDS.width,
      height: PANEL_BOUNDS.height,
      label: 'topPanel:frame',
    });
    this.frame.position.set(PANEL_BOUNDS.x, PANEL_BOUNDS.y);

    this.avatarViewport = new Container();
    this.avatarViewport.label = 'topPanel:avatarViewport';
    this.avatarViewport.position.set(21, 16);
    this.avatarViewport.eventMode = 'static';
    this.avatarMask = new Graphics()
      .rect(0, 0, 64, 64)
      .fill('#ffffff');
    this.avatar = new Sprite({
      texture: this.getCharacterTexture('elara'),
      label: 'topPanel:avatar',
      roundPixels: true,
    });
    this.avatar.width = 64;
    this.avatar.height = 86;
    this.avatar.position.set(0, -6);
    this.avatar.mask = this.avatarMask;
    this.avatarViewport.addChild(this.avatar, this.avatarMask);
    this.avatarViewport.hitArea = new Rectangle(0, 0, 64, 64);

    this.usernameControl = new Container();
    this.usernameControl.label = 'topPanel:usernameControl';
    this.usernameControl.eventMode = 'static';
    this.usernameControl.hitArea = new Rectangle(0, 0, 142, 20);
    this.username = new PixiTextLabel({
      text: 'Wizard',
      fontSize: TOP_FONT_SIZE,
      fontWeight: 'bold',
      color: '#ffffff',
      stroke: { color: '#0a0a0a', width: 2 },
      label: 'topPanel:username',
    });
    this.usernameControl.addChild(this.username);
    this.usernameControl.position.set(78, 16);

    this.coin = new PixiResourceLabel({
      assetManager: assets,
      resource: 'coin',
      amount: '0',
      fontSize: TOP_FONT_SIZE,
      fontWeight: 'bold',
      label: 'topPanel:coin',
    });
    this.contextCurrency = new PixiResourceLabel({
      assetManager: assets,
      resource: 'crystal',
      amount: '0',
      fontSize: TOP_FONT_SIZE,
      fontWeight: 'bold',
      label: 'topPanel:contextCurrency',
    });
    this.mana = new PixiResourceLabel({
      assetManager: assets,
      resource: 'mana',
      amount: '0/0',
      fontSize: TOP_FONT_SIZE,
      fontWeight: 'bold',
      label: 'topPanel:mana',
    });
    this.manaRate = new PixiTextLabel({
      text: '+0/s',
      fontSize: 9,
      color: 'muted',
      label: 'topPanel:manaRate',
    });

    this.levelControl = new Container();
    this.levelControl.label = 'topPanel:levelControl';
    this.levelControl.eventMode = 'static';
    this.levelControl.hitArea = new Rectangle(0, 0, LEVEL_SIZE, LEVEL_SIZE);
    this.levelStar = new Sprite({
      texture: assets.getTexture('public:ui/level-star.webp'),
      label: 'topPanel:levelStar',
      roundPixels: true,
    });
    this.levelStar.position.set(-2, -2);
    this.levelStar.width = LEVEL_SIZE + 4;
    this.levelStar.height = LEVEL_SIZE + 4;
    this.levelValue = new PixiTextLabel({
      text: '',
      fontSize: TOP_FONT_SIZE,
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: '#302044',
      label: 'topPanel:levelValue',
    });
    this.levelValue.position.set(LEVEL_SIZE / 2, LEVEL_SIZE / 2 - 1);
    this.levelMotionRoot = new Container();
    this.levelMotionRoot.label = 'topPanel:levelMotion';
    this.levelMotionRoot.pivot.set(LEVEL_SIZE / 2, LEVEL_SIZE / 2);
    this.levelMotionRoot.position.set(LEVEL_SIZE / 2, LEVEL_SIZE / 2);
    this.levelMotionRoot.addChild(this.levelStar, this.levelValue);
    this.levelControl.addChild(this.levelMotionRoot);

    this.questRail = new Graphics();
    this.questRail.label = 'topPanel:questRail';
    this.questGradient = null;
    this.questCaption = new PixiTextLabel({
      text: '',
      fontSize: 7,
      lineHeight: 9,
      color: 'muted',
      label: 'topPanel:questCaption',
    });
    this.questRemaining = new PixiTextLabel({
      text: '',
      fontSize: 7,
      lineHeight: 9,
      fontWeight: 'bold',
      color: QUEST_REMAINING,
      label: 'topPanel:questRemaining',
    });
    this.questTail = new PixiTextLabel({
      text: '',
      fontSize: 7,
      lineHeight: 9,
      color: 'muted',
      label: 'topPanel:questTail',
    });

    this.root.addChild(
      this.frame,
      this.avatarViewport,
      this.usernameControl,
      this.coin,
      this.contextCurrency,
      this.mana,
      this.manaRate,
      this.levelControl,
      this.questRail,
      this.questCaption,
      this.questRemaining,
      this.questTail,
    );

    this.registrations = [
      inputRouter?.registerPressTarget?.({
        id: 'top.avatar',
        displayObject: this.avatarViewport,
        enabled: () => this.isControlAvailable(this.avatarViewport),
        onActivate: () => this.actions.openAvatar?.(),
        haptic: 'light',
      }),
      inputRouter?.registerPressTarget?.({
        id: 'top.username',
        displayObject: this.usernameControl,
        enabled: () => this.isControlAvailable(this.usernameControl),
        onActivate: () => this.actions.openSettings?.(),
        haptic: 'light',
      }),
      inputRouter?.registerPressTarget?.({
        id: 'top.level',
        displayObject: this.levelControl,
        enabled: () => this.isControlAvailable(this.levelControl),
        onActivate: () => this.actions.openLevel?.(),
        haptic: 'light',
      }),
    ].filter(Boolean);

    this.semanticIds = [];
    this.registerSemanticTarget({
      semanticId: 'top.avatar',
      displayObject: this.avatarViewport,
      activate: () => this.actions.openAvatar?.(),
    });
    this.registerSemanticTarget({
      semanticId: 'top.username',
      tutorialId: 'top:username',
      displayObject: this.usernameControl,
      activate: () => this.actions.openSettings?.(),
    });
    this.registerSemanticTarget({
      semanticId: 'top.mana',
      tutorialId: 'top:mana',
      displayObject: this.mana,
    });
    this.registerSemanticTarget({
      semanticId: 'top.mana.value',
      tutorialId: 'top:mana:value',
      displayObject: this.mana,
    });
    this.registerSemanticTarget({
      semanticId: 'top.mana.regen',
      tutorialId: 'top:mana:regen',
      displayObject: this.manaRate,
    });
    this.registerSemanticTarget({
      semanticId: 'top.coin',
      displayObject: this.coin,
    });
    this.registerSemanticTarget({
      semanticId: 'top.level',
      displayObject: this.levelControl,
      activate: () => this.actions.openLevel?.(),
    });
    this.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
    this.renderModel({ reveal: { top: false } });
  }

  onBind(viewModel = {}) {
    const previousMotionSnapshot = this.motionSnapshot;
    this.model = viewModel;
    this.actions = viewModel.actions ?? {};
    this.renderModel(viewModel);
    this.motionSnapshot = createMotionSnapshot(viewModel);
    this.applyStateFeedback(
      previousMotionSnapshot,
      this.motionSnapshot,
    );
  }

  renderModel(model) {
    const mana = model.mana ?? {};
    const quest = model.quest ?? {};
    const reveal = model.reveal ?? {};
    const context = normalizeContextCurrency(model.contextCurrency);
    const level = normalizeVisibleLevel(model.level);
    const avatarVisible =
      model.showAvatar !== false && reveal.avatar !== false;
    const topVisible = reveal.top !== false;

    this.frame.visible = topVisible;
    this.frame.renderable = topVisible;
    this.avatarViewport.visible = topVisible && avatarVisible;
    this.avatarViewport.renderable = this.avatarViewport.visible;
    this.usernameControl.visible = topVisible && reveal.username !== false;
    this.usernameControl.renderable = this.usernameControl.visible;
    this.mana.visible = topVisible && reveal.mana !== false;
    this.mana.renderable = this.mana.visible;
    this.manaRate.visible = this.mana.visible && reveal.manaRegen !== false;
    this.manaRate.renderable = this.manaRate.visible;

    this.username.setText(model.username ?? 'Wizard');
    this.setCharacter(model.character ?? model.characterKey ?? 'elara');
    this.mana.setAmount(
      `${Math.floor(Number(mana.current) || 0)}/${Math.floor(Number(mana.cap) || 0)}`,
    );
    this.manaRate.setText(formatManaRate(mana.perSecond));
    this.coin.setAmount(formatCompactNumber(model.coin ?? 0));
    this.contextCurrency
      .setResource(context.resource)
      .setAmount(formatCompactNumber(context.amount));
    this.contextCurrency.visible =
      topVisible && context.visible && reveal.resources !== false;
    this.contextCurrency.renderable = this.contextCurrency.visible;
    this.coin.visible = topVisible && reveal.resources !== false;
    this.coin.renderable = this.coin.visible;

    this.levelControl.visible = topVisible && level !== null;
    this.levelControl.renderable = this.levelControl.visible;
    this.levelValue.setText(level === null ? '' : String(level));

    const questVisible =
      topVisible &&
      level !== null &&
      quest.visible !== false &&
      reveal.quest !== false;
    this.questRail.visible = questVisible;
    this.questRail.renderable = questVisible;
    this.questCaption.visible = questVisible;
    this.questCaption.renderable = questVisible;
    this.questRemaining.visible = questVisible;
    this.questRemaining.renderable = questVisible;
    this.questTail.visible = questVisible;
    this.questTail.renderable = questVisible;

    this.layoutResources();
    this.renderQuest(quest, { visible: questVisible });
  }

  onApplyTheme(theme) {
    this.frame.applyTheme(theme);
    this.username.applyTheme(theme);
    this.coin.applyTheme(theme);
    this.contextCurrency.applyTheme(theme);
    this.mana.applyTheme(theme);
    this.manaRate.applyTheme(theme);
    this.levelValue.applyTheme(theme);
    this.questCaption.applyTheme(theme);
    this.questRemaining.applyTheme(theme);
    this.questTail.applyTheme(theme);
    this.rebuildQuestGradient();
    this.renderQuest(this.model.quest ?? {}, {
      visible: this.questRail.visible,
    });
  }

  onActivate() {
    this.settleMotion();
  }

  onDeactivate() {
    this.settleMotion();
  }

  onDestroy() {
    this.settleMotion();
    for (const registration of this.registrations) {
      registration.unregister?.();
    }
    for (const semanticId of this.semanticIds) {
      this.semanticRegistry?.unregister?.(semanticId);
    }
    this.registrations.length = 0;
    this.semanticIds.length = 0;
    this.questGradient?.destroy();
    this.questGradient = null;
  }

  applyStateFeedback(previous, next) {
    if (!previous) {
      return false;
    }
    if (
      previous.loadRevision !== next.loadRevision ||
      !this.active ||
      this.reducedMotion()
    ) {
      this.settleMotion();
      return false;
    }

    if (
      previous.level !== null &&
      next.level !== null &&
      next.level > previous.level
    ) {
      this.startLevelUpMotion();
      return true;
    }

    if (
      previous.questVisible &&
      next.questVisible &&
      previous.level === next.level &&
      next.completed > previous.completed
    ) {
      this.startQuestReceiveMotion();
      return true;
    }

    return false;
  }

  startQuestReceiveMotion() {
    this.stopMotionFrame();
    const startMs = this.timeSource();
    this.levelMotion = {
      kind: 'questReceive',
      startMs,
    };
    this.questRailMotion = { startMs };
    this.updateMotion(startMs);
  }

  startLevelUpMotion() {
    this.stopMotionFrame();
    const startMs = this.timeSource();
    this.levelMotion = {
      kind: 'levelUp',
      startMs,
    };
    this.questRailMotion = null;
    this.applyQuestRailMotion(1);
    this.updateMotion(startMs);
  }

  updateMotion(now = this.timeSource()) {
    if (!this.active || this.reducedMotion()) {
      this.settleMotion();
      return false;
    }

    let hasMotion = false;
    if (this.levelMotion) {
      const duration =
        this.levelMotion.kind === 'levelUp'
          ? LEVEL_UP_MOTION_MS
          : QUEST_RECEIVE_MOTION_MS;
      const progress = clampProgress(
        (now - this.levelMotion.startMs) / duration,
      );
      const frame = interpolateMotionFrames(
        progress,
        this.levelMotion.kind === 'levelUp'
          ? LEVEL_UP_FRAMES
          : QUEST_RECEIVE_FRAMES,
        this.levelMotionState,
      );
      this.applyLevelMotion(frame.scale, frame.y);
      if (progress >= 1) {
        this.levelMotion = null;
        this.applyLevelMotion(1, 0);
      } else {
        hasMotion = true;
      }
    } else {
      this.applyLevelMotion(1, 0);
    }

    if (this.questRailMotion) {
      const progress = clampProgress(
        (now - this.questRailMotion.startMs) /
          QUEST_RECEIVE_MOTION_MS,
      );
      const frame = interpolateMotionFrames(
        progress,
        QUEST_RAIL_RECEIVE_FRAMES,
        this.questRailMotionState,
      );
      this.applyQuestRailMotion(frame.scale);
      if (progress >= 1) {
        this.questRailMotion = null;
        this.applyQuestRailMotion(1);
      } else {
        hasMotion = true;
      }
    } else {
      this.applyQuestRailMotion(1);
    }

    if (hasMotion) {
      this.scheduleMotionFrame();
    }
    return hasMotion;
  }

  applyLevelMotion(scale, y) {
    this.levelMotionRoot.position.set(
      LEVEL_SIZE / 2,
      LEVEL_SIZE / 2 + y,
    );
    this.levelMotionRoot.scale.set(scale);
  }

  applyQuestRailMotion(scaleY) {
    this.questRail.scale.set(1, scaleY);
  }

  scheduleMotionFrame() {
    if (this.motionFrame !== null || !this.active) {
      return;
    }
    this.motionFrame =
      this.requestFrame?.(this.handleMotionFrame) ?? null;
  }

  stopMotionFrame() {
    if (this.motionFrame === null) {
      return;
    }
    this.cancelFrame?.(this.motionFrame);
    this.motionFrame = null;
  }

  settleMotion() {
    this.stopMotionFrame();
    this.levelMotion = null;
    this.questRailMotion = null;
    this.applyLevelMotion(1, 0);
    this.applyQuestRailMotion(1);
  }

  layoutResources() {
    const contentLeft = this.avatarViewport.visible ? 78 : 21;
    const contentRight = 319;
    const rightGap = 10;
    this.usernameControl.position.x = contentLeft;
    this.usernameControl.hitArea.width = Math.max(
      40,
      contentRight - contentLeft -
        this.coin.measuredWidth -
        (this.contextCurrency.visible
          ? this.contextCurrency.measuredWidth + rightGap
          : 0) -
        rightGap,
    );

    this.contextCurrency.position.set(
      contentRight - this.contextCurrency.measuredWidth,
      20,
    );
    this.coin.position.set(
      contentRight -
        this.coin.measuredWidth -
        (this.contextCurrency.visible
          ? this.contextCurrency.measuredWidth + rightGap
          : 0),
      20,
    );
    this.mana.position.set(contentLeft, 41);
    this.manaRate.position.set(
      contentLeft + this.mana.measuredWidth + 10,
      41,
    );
  }

  renderQuest(quest, { visible = true } = {}) {
    this.questRail.clear();
    if (!visible) {
      return;
    }
    const levelX = this.avatarViewport.visible ? 78 : 21;
    const railX = levelX + LEVEL_SIZE + 5;
    const railY = 58;
    const railWidth = 319 - railX;
    const railHeight = QUEST_RAIL_HEIGHT;
    const total = Math.max(1, Math.floor(Number(quest.total) || 1));
    const completed = Math.max(
      0,
      Math.min(total, Math.floor(Number(quest.completed) || 0)),
    );
    const activeFraction = Math.max(
      0,
      Math.min(1, Number(quest.activeFraction) || 0),
    );
    const ratio = Math.min(1, (completed + activeFraction) / total);

    this.levelControl.position.set(levelX, 51);
    this.questRail.pivot.set(railWidth / 2, railHeight / 2);
    this.questRail.position.set(
      railX + railWidth / 2,
      railY + railHeight / 2,
    );
    this.questRail
      .roundRect(0, 0, railWidth, railHeight, railHeight / 2)
      .fill({
        color: QUEST_RAIL_TRACK,
        alpha: QUEST_RAIL_TRACK_ALPHA,
      })
      .stroke({
        color: QUEST_RAIL_TRACK,
        width: QUEST_RAIL_BORDER,
        alignment: 1,
      });
    this.questRail
      .roundRect(
        QUEST_RAIL_BORDER,
        QUEST_RAIL_BORDER,
        railWidth - QUEST_RAIL_BORDER * 2,
        railHeight - QUEST_RAIL_BORDER * 2,
        railHeight / 2 - QUEST_RAIL_BORDER,
      )
      .stroke({
        color: QUEST_RAIL_INSET,
        alpha: QUEST_RAIL_INSET_ALPHA,
        width: 1,
        alignment: 1,
      });

    const fillRight = Math.max(
      QUEST_RAIL_BORDER,
      railWidth * (1 - ratio),
    );
    const fillWidth = Math.max(
      0,
      railWidth - QUEST_RAIL_BORDER - fillRight,
    );
    if (fillWidth > 0) {
      const fillHeight = railHeight - QUEST_RAIL_BORDER * 2;
      const fillRadius = fillHeight / 2;
      const fillPaint = this.getQuestFillPaint();
      this.questRail
        .roundRect(
          QUEST_RAIL_BORDER,
          QUEST_RAIL_BORDER,
          fillWidth,
          fillHeight,
          fillRadius,
        )
        .fill(fillPaint);
      this.drawQuestFillInset({
        x: QUEST_RAIL_BORDER,
        y: QUEST_RAIL_BORDER,
        width: fillWidth,
        height: fillHeight,
        radius: fillRadius,
      });
    }

    const segmentInset = 2;
    const segmentWidth = railWidth - segmentInset * 2;
    for (let index = 1; index < total; index += 1) {
      const x = segmentInset + (segmentWidth * index) / total - 1;
      this.drawQuestDivider({
        x,
        y: segmentInset + 1,
        height: railHeight - segmentInset * 2 - 2,
        completed: index <= completed,
      });
    }

    const remaining = Math.max(
      0,
      Math.floor(Number(quest.remaining) || total - completed),
    );
    const lead = quest.lead ?? 'Complete ';
    const tail = quest.tail ?? ' more quests to level up';
    this.questCaption.setText(lead);
    this.questRemaining.setText(String(remaining));
    this.questTail.setText(tail);
    const captionY = railY + railHeight + 6;
    this.questCaption.position.set(railX, captionY);
    this.questRemaining.position.set(
      railX + this.questCaption.measuredWidth,
      captionY,
    );
    this.questTail.position.set(
      this.questRemaining.x + this.questRemaining.measuredWidth,
      captionY,
    );
  }

  rebuildQuestGradient() {
    this.questGradient?.destroy();
    this.questGradient = null;

    if (this.theme?.progress?.key !== 'gradient') {
      return;
    }

    this.questGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      textureSpace: 'local',
      colorStops: this.theme.progress.colors.map((color, index) => ({
        color,
        offset: this.theme.progress.stops[index],
      })),
    });
  }

  getQuestFillPaint() {
    if (this.theme?.progress?.key === 'gradient') {
      return this.questGradient ?? QUEST_FILL;
    }
    if (this.theme?.progress?.key === 'notched') {
      return this.theme.progress.colors?.[0] ?? '#b79a6b';
    }
    return QUEST_FILL;
  }

  drawQuestFillInset({ x, y, width, height, radius }) {
    if (this.theme?.progress?.key === 'notched') {
      this.questRail
        .moveTo(x + radius, y)
        .lineTo(x + width - radius, y)
        .stroke({
          color: this.theme.progress.insetTop,
          width: 1,
          alignment: 1,
        });
      this.questRail
        .moveTo(x + radius, y + height)
        .lineTo(x + width - radius, y + height)
        .stroke({
          color: this.theme.progress.insetBottom,
          width: 1,
          alignment: 1,
        });
      return;
    }

    this.questRail
      .roundRect(x, y, width, height, radius)
      .stroke({
        color: QUEST_FILL_EDGE,
        width: 1,
        alignment: 1,
      });
  }

  drawQuestDivider({ x, y, height, completed }) {
    const leftShadow = completed
      ? { color: '#ffffff', alpha: 0.12 }
      : { color: '#000000', alpha: 0.44 };
    const rightShadow = completed
      ? { color: '#000000', alpha: 0.42 }
      : { color: '#ffffff', alpha: 0.08 };
    const divider = completed
      ? { color: QUEST_DIVIDER_COMPLETE, alpha: 0.82 }
      : { color: QUEST_DIVIDER_INCOMPLETE, alpha: 0.68 };

    this.drawQuestDividerPixel(x - 1, y, height, leftShadow);
    this.drawQuestDividerPixel(x + 1, y, height, rightShadow);
    this.drawQuestDividerPixel(x, y, height, divider);
  }

  drawQuestDividerPixel(x, y, height, style) {
    this.questRail
      .roundRect(x, y, 1, height, 1)
      .fill(style);
  }

  setCharacter(character) {
    const key = String(character || 'elara');
    const texture = this.getCharacterTexture(key);
    if (this.avatar.texture !== texture) {
      this.avatar.texture = texture;
      this.avatar.width = 64;
      this.avatar.height = 86;
    }
  }

  getCharacterTexture(character) {
    const assetId = `source:assets/characters/${character}.png`;
    try {
      return this.assets.getTexture(assetId);
    } catch {
      return this.assets.getTexture('source:assets/characters/elara.png');
    }
  }

  registerSemanticTarget(definition) {
    if (!this.semanticRegistry || this.semanticRegistry.has(definition.semanticId)) {
      return;
    }
    this.semanticRegistry.register({
      ...definition,
      state: () => ({
        active: this.active,
        visible:
          definition.displayObject.visible &&
          definition.displayObject.renderable,
        interactive: definition.displayObject.eventMode !== 'none',
        enabled: true,
      }),
    });
    this.semanticIds.push(definition.semanticId);
  }

  isControlAvailable(control) {
    return (
      this.active &&
      control.visible &&
      control.renderable &&
      this.root.eventMode !== 'none'
    );
  }
}

function normalizeContextCurrency(context) {
  if (typeof context === 'string') {
    return { resource: context, amount: 0, visible: true };
  }
  const resource = ['crystal', 'ruby', 'emerald'].includes(context?.resource)
    ? context.resource
    : ['crystal', 'ruby', 'emerald'].includes(context?.currency)
      ? context.currency
      : 'crystal';
  return {
    resource,
    amount: context?.amount ?? context?.value ?? 0,
    visible: context?.visible === true,
  };
}

function normalizeVisibleLevel(level) {
  const value =
    level !== null && typeof level === 'object'
      ? level.current ?? level.value
      : level;
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 1 ? number : null;
}

function createMotionSnapshot(model = {}) {
  const level = normalizeVisibleLevel(model.level);
  const quest = model.quest ?? {};
  const reveal = model.reveal ?? {};
  return {
    level,
    completed: Math.max(
      0,
      Math.floor(Number(quest.completed) || 0),
    ),
    questVisible:
      reveal.top !== false &&
      reveal.quest !== false &&
      quest.visible !== false &&
      level !== null,
    loadRevision: Math.max(
      0,
      Math.floor(Number(model.loadRevision) || 0),
    ),
  };
}

function interpolateMotionFrames(progress, frames, output) {
  const safeProgress = clampProgress(progress);
  for (let index = 1; index < frames.length; index += 1) {
    const next = frames[index];
    if (safeProgress > next.progress) {
      continue;
    }
    const previous = frames[index - 1];
    const segmentProgress =
      (safeProgress - previous.progress) /
      Math.max(0.0001, next.progress - previous.progress);
    const eased = easeSoft(segmentProgress);
    output.scale = interpolate(previous.scale, next.scale, eased);
    output.y = interpolate(previous.y ?? 0, next.y ?? 0, eased);
    return output;
  }

  const last = frames.at(-1);
  output.scale = last.scale;
  output.y = last.y ?? 0;
  return output;
}

function easeSoft(progress) {
  return cubicBezier(progress, 0.39, 0.575, 0.565, 1);
}

function cubicBezier(progress, x1, y1, x2, y2) {
  const target = clampProgress(progress);
  let low = 0;
  let high = 1;
  let time = target;
  for (let index = 0; index < 10; index += 1) {
    const x = cubicPoint(time, x1, x2);
    if (Math.abs(x - target) < 0.00001) {
      break;
    }
    if (x < target) {
      low = time;
    } else {
      high = time;
    }
    time = (low + high) / 2;
  }
  return cubicPoint(time, y1, y2);
}

function cubicPoint(time, first, second) {
  const inverse = 1 - time;
  return (
    3 * inverse * inverse * time * first +
    3 * inverse * time * time * second +
    time * time * time
  );
}

function interpolate(from, to, progress) {
  return from + (to - from) * progress;
}

function clampProgress(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches,
  );
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout?.(
    () => callback(defaultTimeSource()),
    16,
  ) ?? 0;
}

function defaultCancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
  } else {
    globalThis.clearTimeout?.(frameId);
  }
}

function defaultTimeSource() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function formatManaRate(value) {
  const safe = Math.max(0, Number(value) || 0);
  return `+${Number.isInteger(safe) ? safe : Number(safe.toFixed(2))}/s`;
}

function formatCompactNumber(value) {
  const number = Math.floor(Number(value) || 0);
  if (Math.abs(number) < 1_000) {
    return String(number);
  }
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(number).toLowerCase();
}
