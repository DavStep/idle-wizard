import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
} from 'pixi.js';

import {
  BasePixiRetainedView,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
} from '../../theme/PixiThemeTokens.js';
import {
  RootRunHudAvatarButton,
  RootRunHudCurrencyCapsule,
  RootRunHudLevelRail,
  RootRunHudSquareIconButton,
} from './RootRunTopHudWidgets.js';

const ROOT_RUN_UI_SCALE = 3;
const TOP_HUD_X = 32 / ROOT_RUN_UI_SCALE;
const TOP_HUD_Y = 140 / ROOT_RUN_UI_SCALE;
const LEVEL_SIZE = 93;
const QUEST_FLIGHT_TEXTURE_WIDTH = 93 / ROOT_RUN_UI_SCALE;
const QUEST_FLIGHT_TEXTURE_HEIGHT = 94 / ROOT_RUN_UI_SCALE;
const QUEST_FLIGHT_ICON_SIZE = 68 / ROOT_RUN_UI_SCALE;
const QUEST_FLIGHT_SPEED = 900 / ROOT_RUN_UI_SCALE;
const QUEST_FLIGHT_ARC_HEIGHT = 96 / ROOT_RUN_UI_SCALE;
const QUEST_FLIGHT_MIN_MS = 420;
const QUEST_FLIGHT_MAX_MS = 760;
const QUEST_FLIGHT_ENTER_RATIO = 0.14;
const QUEST_FLIGHT_ARRIVAL_MS = 320;
const QUEST_FLIGHT_SPARK_COUNT = 8;
const QUEST_LEVEL_IMPACT_MS = 400;
const QUEST_ROLLOVER_FILL_MS = 205;
const LEVEL_UP_MOTION_MS = 230;
const LEVEL_UP_FRAMES = Object.freeze([
  Object.freeze({ progress: 0, scale: 1, y: 0 }),
  Object.freeze({ progress: 0.46, scale: 1.035, y: -9 }),
  Object.freeze({ progress: 0.74, scale: 0.994, y: 3 }),
  Object.freeze({ progress: 1, scale: 1, y: 0 }),
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
    random = Math.random,
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
    this.random = random;
    this.actions = {};
    this.model = {};
    this.motionSnapshot = null;
    this.levelMotion = null;
    this.questCompletionMotion = null;
    this.questArrivalMotion = null;
    this.questImpactMotion = null;
    this.questRolloverMotion = null;
    this.levelMotionState = { scale: 1, y: 0 };
    this.motionFrame = null;
    this.handleMotionFrame = (timestamp) => {
      this.motionFrame = null;
      this.updateMotion(
        Number.isFinite(timestamp) ? timestamp : this.timeSource(),
      );
    };

    this.topHudRoot = new Container({
      label: 'topPanel:rootRunHud',
    });
    this.topHudRoot.position.set(TOP_HUD_X, TOP_HUD_Y);
    this.topHudRoot.scale.set(1 / ROOT_RUN_UI_SCALE);

    this.avatarViewport = new RootRunHudAvatarButton({
      assets,
      texture: this.getCharacterTexture('elara'),
    });
    this.avatar = this.avatarViewport.portrait;

    this.usernameControl = new Container({
      label: 'topPanel:usernameControl',
      eventMode: 'static',
    });
    this.usernameControl.hitArea = new Rectangle(0, 0, 218, 40);
    this.username = new PixiTextLabel({
      text: 'Wizard',
      fontSize: 33,
      fontWeight: 'normal',
      anchor: { x: 0.5, y: 0 },
      color: '#fff4dc',
      stroke: { color: '#17100c', width: 4 },
      label: 'topPanel:username',
    });
    this.username.position.set(109, 0);
    this.usernameControl.addChild(this.username);
    this.usernameControl.position.set(-16, 190);

    this.coin = new RootRunHudCurrencyCapsule({
      assets,
      resource: 'coin',
      amount: '0',
      label: 'topPanel:coin',
    });
    this.contextCurrency = new RootRunHudCurrencyCapsule({
      assets,
      resource: 'crystal',
      amount: '0',
      label: 'topPanel:contextCurrency',
    });
    this.mana = new RootRunHudCurrencyCapsule({
      assets,
      resource: 'mana',
      amount: '0/0',
      label: 'topPanel:mana',
    });
    this.manaRate = new PixiTextLabel({
      text: '+0/s',
      fontSize: 27,
      anchor: { x: 0.5, y: 0 },
      color: '#72c8ff',
      stroke: { color: '#0a0a0a', width: 3 },
      label: 'topPanel:manaRate',
    });

    this.settingsControl = new RootRunHudSquareIconButton({
      assets,
    });
    this.levelRail = new RootRunHudLevelRail({ assets });
    this.levelControl = this.levelRail.levelControl;
    this.levelStar = this.levelRail.levelStar;
    this.levelValue = this.levelRail.levelValue;
    this.levelMotionRoot = this.levelRail.levelMotionRoot;
    this.questRail = this.levelRail.questVisuals;

    this.levelRail.position.set(203, 4);
    this.coin.position.set(209, 108);
    this.contextCurrency.position.set(433, 108);
    this.mana.position.set(657, 108);
    this.manaRate.position.set(761, 174);
    this.settingsControl.position.set(886, 32);
    this.topHudRoot.addChild(
      this.levelRail,
      this.coin,
      this.contextCurrency,
      this.mana,
      this.manaRate,
      this.avatarViewport,
      this.usernameControl,
      this.settingsControl,
    );

    this.questFlightRoot = new Container();
    this.questFlightRoot.label = 'topPanel:questFlight';
    this.questFlightRoot.eventMode = 'none';
    this.questFlightGlow = new Graphics()
      .circle(0, 0, QUEST_FLIGHT_ICON_SIZE * 0.44)
      .fill({ color: '#ffd447', alpha: 1 });
    this.questFlightGlow.label = 'topPanel:questFlightGlow';
    this.questFlightStar = new Sprite({
      texture: assets.getTexture('public:ui/root-run-level-star.png'),
      label: 'topPanel:questFlightStar',
      roundPixels: true,
    });
    this.questFlightStar.anchor.set(0.5);
    this.questFlightStar.width = QUEST_FLIGHT_TEXTURE_WIDTH;
    this.questFlightStar.height = QUEST_FLIGHT_TEXTURE_HEIGHT;
    this.questFlightRoot.addChild(
      this.questFlightGlow,
      this.questFlightStar,
    );
    this.questFlightRoot.visible = false;
    this.questFlightRoot.renderable = false;

    this.questArrivalRoot = new Container();
    this.questArrivalRoot.label = 'topPanel:questArrival';
    this.questArrivalRoot.eventMode = 'none';
    this.questArrivalRing = new Graphics()
      .circle(0, 0, 13 / ROOT_RUN_UI_SCALE)
      .stroke({
        color: '#ffd447',
        alpha: 1,
        width: 2 / ROOT_RUN_UI_SCALE,
      });
    this.questArrivalSparks = Array.from(
      { length: QUEST_FLIGHT_SPARK_COUNT },
      (_, index) => {
        const spark = new Graphics()
          .circle(0, 0, 1)
          .fill({
            color: index % 2 === 0 ? '#ffd447' : '#fff0a3',
            alpha: 1,
          });
        spark.label = `topPanel:questArrivalSpark:${index}`;
        return spark;
      },
    );
    this.questArrivalRoot.addChild(
      this.questArrivalRing,
      ...this.questArrivalSparks,
    );
    this.questArrivalRoot.visible = false;
    this.questArrivalRoot.renderable = false;

    this.root.addChild(
      this.topHudRoot,
      this.questFlightRoot,
      this.questArrivalRoot,
    );

    this.registrations = [
      inputRouter?.registerPressTarget?.({
        id: 'top.avatar',
        displayObject: this.avatarViewport,
        enabled: () => this.isControlAvailable(this.avatarViewport),
        excludePageSwipe: true,
        onPressChange: (pressed, context) =>
          this.avatarViewport.setPressed(pressed, context),
        onActivate: () => this.actions.openAvatar?.(),
        haptic: 'light',
      }),
      inputRouter?.registerPressTarget?.({
        id: 'top.username',
        displayObject: this.usernameControl,
        enabled: () => this.isControlAvailable(this.usernameControl),
        onActivate: () =>
          (this.actions.openAccount ?? this.actions.openSettings)?.(),
        haptic: 'light',
      }),
      inputRouter?.registerPressTarget?.({
        id: 'top.settings',
        displayObject: this.settingsControl,
        enabled: () => this.isControlAvailable(this.settingsControl),
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
      activate: () =>
        (this.actions.openAccount ?? this.actions.openSettings)?.(),
    });
    this.registerSemanticTarget({
      semanticId: 'top.settings',
      displayObject: this.settingsControl,
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
    const nextMotionSnapshot = createMotionSnapshot(viewModel);
    this.model = viewModel;
    this.actions = viewModel.actions ?? {};

    if (
      this.questCompletionMotion &&
      hasSameCompletionSnapshot(
        this.questCompletionMotion.nextSnapshot,
        nextMotionSnapshot,
      )
    ) {
      this.questCompletionMotion.pendingModel = viewModel;
      this.renderModel(
        createHeldCompletionModel(
          viewModel,
          this.questCompletionMotion.previousModel,
        ),
      );
      return;
    }

    if (
      this.shouldStartQuestCompletion(
        previousMotionSnapshot,
        nextMotionSnapshot,
      ) &&
      this.startQuestCompletionMotion({
        previousModel: this.renderedModel ?? viewModel,
        pendingModel: viewModel,
        previousSnapshot: previousMotionSnapshot,
        nextSnapshot: nextMotionSnapshot,
      })
    ) {
      this.motionSnapshot = nextMotionSnapshot;
      return;
    }

    this.renderModel(viewModel);
    this.renderedModel = viewModel;
    this.motionSnapshot = nextMotionSnapshot;
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

    this.topHudRoot.visible = topVisible;
    this.topHudRoot.renderable = topVisible;
    this.avatarViewport.visible = topVisible && avatarVisible;
    this.avatarViewport.renderable = this.avatarViewport.visible;
    this.usernameControl.visible = topVisible && reveal.username !== false;
    this.usernameControl.renderable = this.usernameControl.visible;
    this.settingsControl.visible = topVisible;
    this.settingsControl.renderable = topVisible;
    this.mana.visible = topVisible && reveal.mana !== false;
    this.mana.renderable = this.mana.visible;
    this.manaRate.visible = this.mana.visible && reveal.manaRegen !== false;
    this.manaRate.renderable = this.manaRate.visible;

    this.username.setText(model.username ?? 'Wizard');
    this.setCharacter(model.character ?? model.characterKey ?? 'elara');
    this.avatarViewport.setFrameTint?.(model.frameTint);
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
    this.levelRail.setLevel(level === null ? '' : String(level));

    const questVisible =
      topVisible &&
      level !== null &&
      quest.visible !== false &&
      reveal.quest !== false;
    this.levelRail.setQuestVisible(questVisible);

    this.renderQuest(quest, { visible: questVisible });
  }

  onApplyTheme(theme) {
    this.username.applyTheme(theme);
    this.coin.applyTheme(theme);
    this.contextCurrency.applyTheme(theme);
    this.mana.applyTheme(theme);
    this.manaRate.applyTheme(theme);
    this.levelRail.applyTheme(theme);
    this.username
      .setColor('#fff4dc')
      .setStroke({ color: '#17100c', width: 4 });
    this.manaRate
      .setColor('#72c8ff')
      .setStroke({ color: '#0a0a0a', width: 3 });
    this.renderQuest(this.model.quest ?? {}, {
      visible: this.levelRail.questVisuals.visible,
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
  }

  shouldStartQuestCompletion(previous, next) {
    return Boolean(
      previous &&
      previous.loadRevision === next.loadRevision &&
      previous.questVisible &&
      next.questVisible &&
      getQuestCompletionDelta(previous, next) > 0 &&
      this.active &&
      !this.reducedMotion(),
    );
  }

  startQuestCompletionMotion({
    previousModel,
    pendingModel,
    previousSnapshot,
    nextSnapshot,
  }) {
    const source = this.resolveQuestFlightPoint('workshop.tasks');
    const destination = this.resolveLevelFlightPoint();
    if (!source || !destination) {
      return false;
    }

    this.stopMotionFrame();
    this.levelMotion = null;
    this.applyLevelMotion(1, 0);
    const distance = Math.max(
      1,
      Math.hypot(
        destination.x - source.x,
        destination.y - source.y,
      ),
    );
    const durationMs = Math.min(
      QUEST_FLIGHT_MAX_MS,
      Math.max(
        QUEST_FLIGHT_MIN_MS,
        (distance / QUEST_FLIGHT_SPEED) * 1_000,
      ),
    );
    const startMs = this.timeSource();
    const verticalJitter =
      randomBetween(
        -QUEST_FLIGHT_ICON_SIZE * 0.08,
        QUEST_FLIGHT_ICON_SIZE * 0.08,
        this.random,
      );
    const start = {
      x: source.x,
      y: source.y + verticalJitter,
    };
    this.questCompletionMotion = {
      startMs,
      durationMs,
      start,
      destination,
      spin: randomBetween(-1.1, 1.1, this.random),
      previousModel,
      pendingModel,
      previousSnapshot,
      nextSnapshot,
    };
    this.questArrivalMotion = null;
    this.questImpactMotion = null;
    this.questRolloverMotion = null;
    const heldModel = createHeldCompletionModel(
      pendingModel,
      previousModel,
    );
    this.renderModel(heldModel);
    this.renderedModel = heldModel;
    this.questFlightRoot.position.set(start.x, start.y);
    this.questFlightRoot.rotation = 0;
    this.questFlightRoot.scale.set(0.58);
    this.questFlightRoot.alpha = 0;
    this.questFlightRoot.visible = true;
    this.questFlightRoot.renderable = true;
    this.questFlightGlow.alpha = 0.26;
    this.questArrivalRoot.visible = false;
    this.questArrivalRoot.renderable = false;
    this.updateMotion(startMs);
    return true;
  }

  resolveQuestFlightPoint(semanticId) {
    try {
      const snapshot = this.semanticRegistry?.resolve?.(semanticId);
      const bounds = snapshot?.bounds;
      if (
        !bounds ||
        snapshot?.state?.visible === false ||
        bounds.width <= 0 ||
        bounds.height <= 0
      ) {
        return null;
      }
      return this.root.toLocal({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      });
    } catch {
      return null;
    }
  }

  resolveLevelFlightPoint() {
    try {
      const bounds = this.levelStar.getBounds();
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return null;
      }
      return this.root.toLocal({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      });
    } catch {
      return null;
    }
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
      this.settleMotion({ completePending: false });
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
      return false;
    }

    return false;
  }

  startLevelUpMotion() {
    this.stopMotionFrame();
    const startMs = this.timeSource();
    this.levelMotion = {
      kind: 'levelUp',
      startMs,
    };
    this.updateMotion(startMs);
  }

  updateMotion(now = this.timeSource()) {
    if (!this.active || this.reducedMotion()) {
      this.settleMotion();
      return false;
    }

    let hasMotion = false;
    if (this.questCompletionMotion) {
      hasMotion =
        this.updateQuestCompletionMotion(now) ||
        hasMotion;
    }
    if (this.questArrivalMotion) {
      hasMotion =
        this.updateQuestArrivalMotion(now) ||
        hasMotion;
    }
    if (this.questImpactMotion) {
      hasMotion =
        this.updateQuestImpactMotion(now) ||
        hasMotion;
    }
    if (this.questRolloverMotion) {
      hasMotion =
        this.updateQuestRolloverMotion(now) ||
        hasMotion;
    }
    if (this.levelMotion) {
      const duration = LEVEL_UP_MOTION_MS;
      const progress = clampProgress(
        (now - this.levelMotion.startMs) / duration,
      );
      const frame = interpolateMotionFrames(
        progress,
        LEVEL_UP_FRAMES,
        this.levelMotionState,
      );
      this.applyLevelMotion(frame.scale, frame.y);
      if (progress >= 1) {
        this.levelMotion = null;
        this.applyLevelMotion(1, 0);
      } else {
        hasMotion = true;
      }
    } else if (!this.questImpactMotion) {
      this.applyLevelMotion(1, 0);
    }

    if (hasMotion) {
      this.scheduleMotionFrame();
    }
    return hasMotion;
  }

  updateQuestCompletionMotion(now) {
    const motion = this.questCompletionMotion;
    if (!motion) {
      return false;
    }
    const elapsedMs = Math.max(0, now - motion.startMs);
    const progress = clampProgress(
      elapsedMs / motion.durationMs,
    );
    const easedProgress = easeInOutCubic(progress);
    const enterProgress = Math.min(
      1,
      progress / QUEST_FLIGHT_ENTER_RATIO,
    );
    const x = interpolate(
      motion.start.x,
      motion.destination.x,
      easedProgress,
    );
    const y =
      interpolate(
        motion.start.y,
        motion.destination.y,
        easedProgress,
      ) -
      Math.sin(easedProgress * Math.PI) *
        QUEST_FLIGHT_ARC_HEIGHT;
    const startScale =
      (QUEST_FLIGHT_ICON_SIZE * 1.12) /
      QUEST_FLIGHT_TEXTURE_WIDTH;
    const endScale =
      (QUEST_FLIGHT_ICON_SIZE * 0.54) /
      QUEST_FLIGHT_TEXTURE_WIDTH;
    const scale =
      interpolate(startScale, endScale, easedProgress) *
      (0.58 + enterProgress * 0.42) *
      (1 + Math.sin(progress * Math.PI) * 0.12);

    this.questFlightRoot.position.set(x, y);
    this.questFlightRoot.scale.set(scale);
    this.questFlightRoot.rotation =
      motion.spin * (elapsedMs / 1_000);
    this.questFlightRoot.alpha =
      enterProgress * (1 - progress * 0.08);
    this.questFlightGlow.alpha =
      0.26 + Math.sin(progress * Math.PI) * 0.24;

    if (progress < 1) {
      return true;
    }

    this.questFlightRoot.visible = false;
    this.questFlightRoot.renderable = false;
    this.questCompletionMotion = null;
    this.startQuestArrivalMotion(motion, now);
    this.applyQuestCompletionArrival(motion, now);
    return true;
  }

  startQuestArrivalMotion(motion, now) {
    const sparks = this.questArrivalSparks.map(
      (_spark, index) => ({
        angle:
          (Math.PI * 2 * index) /
            QUEST_FLIGHT_SPARK_COUNT +
          randomBetween(-0.18, 0.18, this.random),
        distance:
          randomBetween(16, 31, this.random) /
          ROOT_RUN_UI_SCALE,
        diameter:
          randomBetween(4.2, 7.4, this.random) /
          ROOT_RUN_UI_SCALE,
      }),
    );
    this.questArrivalMotion = {
      startMs: now,
      destination: motion.destination,
      sparks,
    };
    this.questArrivalRoot.position.set(
      motion.destination.x,
      motion.destination.y,
    );
    this.questArrivalRoot.visible = true;
    this.questArrivalRoot.renderable = true;
    this.questArrivalRoot.alpha = 1;
    this.questArrivalRing.scale.set(1);
    this.questArrivalRing.alpha = 1;
    for (const [index, spark] of this.questArrivalSparks.entries()) {
      const diameter = sparks[index].diameter;
      spark.scale.set(diameter / 2);
      spark.position.set(0, 0);
      spark.alpha = 1;
    }
  }

  applyQuestCompletionArrival(motion, now) {
    const levelChanged =
      motion.nextSnapshot.level !==
      motion.previousSnapshot.level;
    if (levelChanged) {
      const completedModel = createCompletedRolloverModel(
        motion.pendingModel,
        motion.previousModel,
      );
      this.renderModel(completedModel);
      this.renderedModel = completedModel;
      this.questRolloverMotion = {
        startMs: now,
        pendingModel: motion.pendingModel,
      };
    } else {
      this.renderModel(motion.pendingModel);
      this.renderedModel = motion.pendingModel;
    }
    this.questImpactMotion = { startMs: now };
  }

  updateQuestArrivalMotion(now) {
    const motion = this.questArrivalMotion;
    if (!motion) {
      return false;
    }
    const progress = clampProgress(
      (now - motion.startMs) /
        QUEST_FLIGHT_ARRIVAL_MS,
    );
    const eased = easeOutCubic(progress);
    this.questArrivalRing.scale.set(
      interpolate(1, 2.15, eased),
    );
    this.questArrivalRing.alpha = 1 - progress;
    for (const [index, spark] of this.questArrivalSparks.entries()) {
      const model = motion.sparks[index];
      const distance = model.distance * eased;
      spark.position.set(
        Math.cos(model.angle) * distance,
        Math.sin(model.angle) * distance,
      );
      spark.alpha = 1 - progress;
    }
    if (progress < 1) {
      return true;
    }
    this.questArrivalMotion = null;
    this.questArrivalRoot.visible = false;
    this.questArrivalRoot.renderable = false;
    return false;
  }

  updateQuestImpactMotion(now) {
    const motion = this.questImpactMotion;
    if (!motion) {
      return false;
    }
    const progress = clampProgress(
      (now - motion.startMs) /
        QUEST_LEVEL_IMPACT_MS,
    );
    this.applyLevelMotion(
      1 + Math.sin(progress * Math.PI) * 0.1,
      0,
    );
    if (progress < 1) {
      return true;
    }
    this.questImpactMotion = null;
    this.applyLevelMotion(1, 0);
    return false;
  }

  updateQuestRolloverMotion(now) {
    const motion = this.questRolloverMotion;
    if (!motion) {
      return false;
    }
    if (now - motion.startMs < QUEST_ROLLOVER_FILL_MS) {
      return true;
    }
    this.questRolloverMotion = null;
    this.renderModel(motion.pendingModel);
    this.renderedModel = motion.pendingModel;
    this.startLevelUpMotion();
    return true;
  }

  applyLevelMotion(scale, y) {
    this.levelMotionRoot.position.set(
      LEVEL_SIZE / 2,
      LEVEL_SIZE / 2 + y,
    );
    this.levelMotionRoot.scale.set(scale);
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

  settleMotion({ completePending = true } = {}) {
    this.stopMotionFrame();
    const pendingModel = completePending
      ? this.questCompletionMotion?.pendingModel ??
        this.questRolloverMotion?.pendingModel ??
        null
      : null;
    this.levelMotion = null;
    this.questCompletionMotion = null;
    this.questArrivalMotion = null;
    this.questImpactMotion = null;
    this.questRolloverMotion = null;
    this.questFlightRoot.visible = false;
    this.questFlightRoot.renderable = false;
    this.questArrivalRoot.visible = false;
    this.questArrivalRoot.renderable = false;
    this.applyLevelMotion(1, 0);
    this.questRail.scale.set(1);
    if (pendingModel) {
      this.renderModel(pendingModel);
      this.renderedModel = pendingModel;
    }
  }

  renderQuest(quest, { visible = true } = {}) {
    if (!visible) {
      this.levelRail.setQuestVisible(false);
      return;
    }
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

    this.levelRail
      .setQuestVisible(true)
      .renderProgress({ ratio, total, completed });
  }

  setCharacter(character) {
    const key = String(character || 'elara');
    const texture = this.getCharacterTexture(key);
    if (this.avatar.texture !== texture) {
      this.avatarViewport.setTexture(texture);
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
    visible: context?.visible !== false,
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
    total: Math.max(
      0,
      Math.floor(Number(quest.total) || 0),
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

function createHeldCompletionModel(pendingModel, previousModel) {
  return {
    ...pendingModel,
    level: previousModel?.level ?? pendingModel?.level,
    quest: previousModel?.quest ?? pendingModel?.quest,
  };
}

function createCompletedRolloverModel(
  pendingModel,
  previousModel,
) {
  const quest = previousModel?.quest ?? pendingModel?.quest ?? {};
  const total = Math.max(
    0,
    Math.floor(Number(quest.total) || 0),
  );
  return {
    ...pendingModel,
    level: previousModel?.level ?? pendingModel?.level,
    quest: {
      ...quest,
      completed: total,
      activeFraction: 0,
      remaining: 0,
    },
  };
}

function hasSameCompletionSnapshot(left, right) {
  return Boolean(
    left &&
    right &&
    left.level === right.level &&
    left.completed === right.completed &&
    left.total === right.total &&
    left.loadRevision === right.loadRevision,
  );
}

function getQuestCompletionDelta(previous, next) {
  if (!previous || !next) {
    return 0;
  }
  if (next.level === previous.level) {
    return Math.max(0, next.completed - previous.completed);
  }
  if (next.level > previous.level) {
    return Math.max(
      0,
      previous.total -
        previous.completed +
        next.completed,
    );
  }
  return 0;
}

function easeInOutCubic(progress) {
  const value = clampProgress(progress);
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - clampProgress(progress), 3);
}

function randomBetween(min, max, random = Math.random) {
  return min + (max - min) * random();
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
