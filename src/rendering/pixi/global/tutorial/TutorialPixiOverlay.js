import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
} from 'pixi.js';

import {
  BasePixiRetainedView,
  PixiButton,
  PixiDialogFrame,
  PixiNineSliceFrame,
  PixiProgressBar,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { PixiNotificationBadge } from '../transient/PixiNotificationBadges.js';
import {
  normalizeSourceRect,
  padSourceRect,
  projectSemanticBoundsToSource,
  resolveSemanticTutorialTarget,
  resolveTutorialObjectivePlacement,
  resolveTutorialPointerPlacement,
  TUTORIAL_PIXI_GEOMETRY,
} from './TutorialPixiGeometry.js';
import { TutorialPointerSpine } from './TutorialPointerSpine.js';

const GUIDE_ASSET_ID = 'source:assets/characters/elara.png';
const TUTORIAL_RESEARCH_CARD_PALETTE = Object.freeze({
  surface: '#ffe7c8',
  activeSurface: '#f3d4ad',
  text: '#634934',
  muted: '#725737',
});
const TUTORIAL_ADVANCE_BUTTON = Object.freeze({
  minWidth: 58,
  maxWidth: 116,
  height: 26,
  labelPadding: 24,
  rightInset: 10,
  bottomInset: 6,
  contentGap: 6,
});
const DRAG_YELLS = Object.freeze([
  'AAAAAA!!!',
  'Put me down!',
  'Let me go!',
  'Hey, careful!',
]);

/**
 * Renderer-facing tutorial contract. `targetId`, `highlightTargetIds`, and
 * `protectedTargetIds` may be semantic IDs or registered tutorial IDs.
 *
 * @typedef {object} TutorialPixiViewModel
 * @property {'hidden'|'blocked'|'quest'|'lesson'} kind
 * @property {{id?: string, targetId?: string, highlightTargetIds?: string[]}} step
 * @property {object|null} lesson
 * @property {object|null} cue
 * @property {object} actions
 */

/**
 * One retained tutorial layer: spotlight, guide/objective surface, reveal
 * projection, semantic target cue, and shared-app Spine pointer.
 */
export class TutorialPixiOverlay extends BasePixiRetainedView {
  constructor({
    assets,
    inputRouter = null,
    semanticRegistry = null,
    spineRuntime = null,
    application = null,
    parent = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    reducedMotion = false,
  } = {}) {
    if (!assets?.getTexture) {
      throw new Error('TutorialPixiOverlay requires preloaded Pixi assets.');
    }
    super({ label: 'tutorialOverlay' });
    this.assets = assets;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.application = application;
    this.reducedMotion = Boolean(reducedMotion);
    this.model = createHiddenTutorialModel();
    this.actions = {};
    this.panelOpen = false;
    this.stepId = null;
    this.manualPlacement = null;
    this.dragState = null;
    this.targetPressRegistration = null;
    this.targetPressSemanticId = null;
    this.dragYellIndex = 0;
    this.typewriter = null;
    this.seenCopyKeys = new Set();
    this.emphasis = null;
    this.tickerAttached = false;
    this.sourceBounds = {
      x: 0,
      y: 0,
      width: TUTORIAL_PIXI_GEOMETRY.sourceWidth,
      height: TUTORIAL_PIXI_GEOMETRY.sourceHeight,
    };
    this.handleTick = (ticker) => this.tick(ticker?.deltaMS ?? ticker);

    this.backdrop = new Graphics();
    this.backdrop.label = 'tutorial:spotlight';
    this.backdrop.eventMode = 'none';

    this.pointer = new TutorialPointerSpine({ spineRuntime });

    this.guideButton = new Container();
    this.guideButton.label = 'tutorial:guideButton';
    this.guideButton.eventMode = 'static';
    this.guideButton.hitArea = new Rectangle(
      0,
      0,
      TUTORIAL_PIXI_GEOMETRY.guideWidth,
      TUTORIAL_PIXI_GEOMETRY.guideHeight,
    );
    this.guideImage = new Sprite({
      texture: assets.getTexture(GUIDE_ASSET_ID),
      roundPixels: true,
    });
    this.guideImage.label = 'tutorial:guideImage';
    this.guideImage.anchor.set(0.5, 1);
    this.guideLabelButton = new PixiButton({
      assetManager: assets,
      text: 'Help',
      width: 36,
      height: 24,
      variant: 'brown-light',
      sizeTier: 30,
      label: 'tutorial:guideLabelButton',
    });
    this.guideLabelButton.eventMode = 'none';
    this.guideLabelButton.cursor = 'default';
    this.guideLabel = this.guideLabelButton.textLabel;
    this.guideLabelFrame = this.guideLabelButton.rootRunFrame;
    this.dragYell = new PixiTextLabel({
      text: DRAG_YELLS[0],
      fontSize: 10,
      lineHeight: 13,
      anchor: { x: 0.5, y: 0.5 },
      color: '#ffffff',
      stroke: { color: '#0a0a0a', width: 2 },
      label: 'tutorial:dragYell',
    });
    this.dragYell.alpha = 0;
    this.attentionBadge = new PixiNotificationBadge({
      assetManager: assets,
    });
    this.attentionBadge.root.label = 'tutorial:attentionDot';
    this.attentionDot = this.attentionBadge.root;
    this.guideButton.addChild(
      this.guideImage,
      this.guideLabelButton,
      this.dragYell,
      this.attentionDot,
    );

    this.surface = new TutorialLessonSurface({
      assets,
      inputRouter,
      onSurfacePress: () =>
        this.actions.objectivePress?.({ source: 'lesson-panel' }),
      onShowTarget: () =>
        this.actions.objectivePress?.({
          source: 'show-me',
          targetId: this.model.step?.targetId ?? null,
        }),
      onAdvance: () => this.actions.advance?.(),
    });

    this.root.addChild(
      this.backdrop,
      this.pointer.root,
      this.guideButton,
      this.surface.root,
    );
    parent?.addChild?.(this.root);

    this.registrations = [
      inputRouter?.registerPressTarget?.({
        id: 'tutorial.guide.toggle',
        displayObject: this.guideButton,
        enabled: () => this.isGuideInteractive(),
        onPressChange: (pressed) => this.setGuidePressed(pressed),
        onActivate: () => this.togglePanel(),
        haptic: 'light',
      }),
      inputRouter?.registerDragSource?.({
        id: 'tutorial.guide.drag',
        displayObject: this.guideButton,
        threshold: 8,
        enabled: () => this.isGuideInteractive(),
        onDragStart: () => this.startGuideDrag(),
        onDragMove: (context) => this.moveGuideDrag(context),
        onDragEnd: () => this.finishGuideDrag(),
        onDragCancel: () => this.finishGuideDrag(),
      }),
    ].filter(Boolean);

    this.applyTheme(theme);
    this.layout({
      sourceWidth: TUTORIAL_PIXI_GEOMETRY.sourceWidth,
      sourceHeight: TUTORIAL_PIXI_GEOMETRY.sourceHeight,
      sourceScale: PIXI_UI_GEOMETRY.sourceScale,
      authoredOffsetX: 0,
      sourceOffsetX: 0,
      stageLogicalWidth: PIXI_UI_GEOMETRY.authoredWidth,
    });
    this.render();
  }

  onBind(viewModel) {
    const next = normalizeTutorialPixiViewModel(viewModel);
    const previousStepId = this.stepId;
    this.model = next;
    this.actions = next.actions;
    this.reducedMotion = Boolean(
      next.reducedMotion ?? this.reducedMotion,
    );
    this.stepId = next.lesson?.id ?? next.step?.id ?? null;

    this.actions.applyNotificationPolicy?.(
      next.notificationPolicy ?? null,
    );

    if (next.kind === 'lesson') {
      if (this.stepId !== previousStepId) {
        this.panelOpen =
          next.lesson?.variant === 'intro-dialog' ||
          Boolean(next.lesson?.autoOpen);
        this.cancelTypewriter();
      }
      if (next.lesson?.forceOpen) {
        this.panelOpen = true;
      }
    } else {
      this.panelOpen = false;
      this.cancelTypewriter();
      this.restoreTargetEmphasis();
    }

    this.render();
    if (next.kind === 'lesson' && this.panelOpen) {
      this.startTypewriterIfNeeded();
    }
    if (
      next.kind === 'lesson' &&
      next.cue?.emphasizeTarget &&
      next.cue?.targetId
    ) {
      this.startTargetEmphasis(next.cue.targetId);
    } else {
      this.restoreTargetEmphasis();
    }
    this.syncTicker();
  }

  onApplyTheme(theme) {
    const nextTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.guideLabelButton.applyTheme(nextTheme);
    this.dragYell.applyTheme(nextTheme);
    this.surface.applyTheme(nextTheme);
    this.redrawGuideLabel();
    this.redrawAttention();
    this.redrawSpotlight();
  }

  onLayout(projection = {}) {
    const width =
      Number(projection.sourceWidth) ||
      TUTORIAL_PIXI_GEOMETRY.sourceWidth;
    const height =
      Number(projection.sourceHeight) ||
      TUTORIAL_PIXI_GEOMETRY.sourceHeight;
    this.sourceBounds = { x: 0, y: 0, width, height };
    this.projection = {
      ...projection,
      sourceScale: Number(projection.sourceScale) || 3,
      authoredOffsetX: Number(projection.authoredOffsetX) || 0,
    };
    const sourceOffsetX = Math.max(
      0,
      Number(projection.sourceOffsetX) || 0,
    );
    const stageSourceWidth =
      Number(projection.stageLogicalWidth) /
        Math.max(1, this.projection.sourceScale) ||
      width + sourceOffsetX * 2;
    this.backdropBounds = {
      x: -sourceOffsetX,
      y: 0,
      width: stageSourceWidth,
      height,
    };
    this.root.hitArea = new Rectangle(
      -sourceOffsetX,
      0,
      stageSourceWidth,
      height,
    );
    this.renderPositions();
    this.redrawSpotlight();
  }

  onActivate() {
    this.render();
    this.syncTicker();
  }

  onDeactivate() {
    this.stopTicker();
    this.clearTargetPressProxy();
    this.pointer.setVisible(false);
    this.cancelTypewriter();
    this.restoreTargetEmphasis();
  }

  onDestroy() {
    this.stopTicker();
    this.clearTargetPressProxy();
    for (const registration of this.registrations) {
      releaseRegistration(registration);
    }
    this.registrations.length = 0;
    this.surface.destroy();
    this.pointer.destroy();
  }

  render() {
    const isLesson = this.model.kind === 'lesson';
    const cueVisible =
      isLesson &&
      this.model.cue?.kind === 'target-cue' &&
      Boolean(this.model.cue?.showPointer);
    const guideVisible =
      isLesson && this.model.lesson?.variant !== 'intro-dialog';
    const surfaceVisible = isLesson && this.panelOpen;
    const overlayVisible =
      this.active &&
      this.model.kind !== 'hidden' &&
      this.model.kind !== 'blocked' &&
      (guideVisible || surfaceVisible || cueVisible);

    this.root.visible = overlayVisible;
    this.root.renderable = overlayVisible;
    this.root.eventMode = overlayVisible ? 'passive' : 'none';
    this.guideButton.visible = guideVisible;
    this.guideButton.renderable = guideVisible;
    this.guideButton.eventMode = guideVisible ? 'static' : 'none';
    this.surface.setVisible(surfaceVisible);

    this.guideLabel.setText(this.panelOpen ? 'Hide' : 'Help');
    this.fitGuideImage(this.panelOpen);
    this.dragYell.position.set(
      TUTORIAL_PIXI_GEOMETRY.guideWidth / 2,
      this.panelOpen ? 15 : 34,
    );
    this.surface.bind({
      ...this.model.lesson,
      text: this.typewriter?.visibleText ?? this.model.lesson?.text ?? '',
      layoutText: this.model.lesson?.text ?? '',
      variant: this.model.lesson?.variant,
      reducedMotion: this.reducedMotion,
    });
    this.redrawGuideLabel();
    this.redrawAttention();
    this.renderPositions();
    this.renderTargetCue();
    this.redrawSpotlight();
  }

  renderPositions() {
    if (this.model.kind !== 'lesson') {
      return;
    }
    const targetRect = this.resolveTargetRect(
      this.model.step?.targetId,
    );
    const avoidRects = [
      targetRect,
      ...(this.model.protectedTargetIds ?? []).map((targetId) =>
        this.resolveTargetRect(targetId),
      ),
    ].filter(Boolean);
    const placement = resolveTutorialObjectivePlacement({
      bounds: this.sourceBounds,
      outerWidth: this.surface.outerWidth,
      outerHeight: this.surface.outerHeight,
      panelOpen: this.panelOpen,
      manualPlacement: this.manualPlacement,
      avoidRects,
      variant: this.model.lesson?.variant,
    });
    this.currentPlacement = placement;
    this.surface.root.position.set(
      placement.objectiveLeft,
      placement.objectiveTop,
    );
    this.guideButton.position.set(
      placement.buttonLeft,
      placement.buttonTop,
    );
  }

  renderTargetCue() {
    const cue = this.model.cue;
    if (
      this.model.kind !== 'lesson' ||
      cue?.kind !== 'target-cue' ||
      !cue.showPointer
    ) {
      this.clearTargetPressProxy();
      this.pointer.setVisible(false);
      return;
    }
    const targetId = cue.targetId ?? this.model.step?.targetId;
    this.syncTargetPressProxy(targetId);
    const targetSnapshot = resolveSemanticTutorialTarget(
      this.semanticRegistry,
      targetId,
    );
    const targetRect = this.resolveTargetRect(
      targetId,
      targetSnapshot,
    );
    if (!targetRect) {
      this.clearTargetPressProxy();
      this.pointer.setGesture(null);
      this.pointer.setVisible(false);
      return;
    }
    const protectedRects = [
      this.surface.root.visible
        ? {
            x: this.surface.root.x,
            y: this.surface.root.y,
            width: this.surface.outerWidth,
            height: this.surface.outerHeight,
          }
        : null,
      this.guideButton.visible
        ? {
            x: this.guideButton.x,
            y: this.guideButton.y,
            width: TUTORIAL_PIXI_GEOMETRY.guideWidth,
            height: TUTORIAL_PIXI_GEOMETRY.guideHeight,
          }
        : null,
    ].filter(Boolean);
    const placement = resolveTutorialPointerPlacement({
      targetRect,
      bounds: this.sourceBounds,
      protectedRects,
    });
    this.pointer.setGesture(
      targetSnapshot?.state?.tutorialPointerGesture ?? null,
    );
    this.pointer.setPlacement(placement);
    this.pointer.setMotionEnabled(!this.reducedMotion);
    this.pointer.setVisible(Boolean(placement));
  }

  syncTargetPressProxy(targetId) {
    const snapshot = resolveSemanticTutorialTarget(
      this.semanticRegistry,
      targetId,
    );
    if (
      !snapshot?.semanticId ||
      !snapshot.displayObject ||
      typeof snapshot.activate !== 'function'
    ) {
      this.clearTargetPressProxy();
      return;
    }
    if (
      this.targetPressSemanticId === snapshot.semanticId &&
      this.targetPressRegistration
    ) {
      return;
    }

    this.clearTargetPressProxy();
    const semanticId = snapshot.semanticId;
    this.targetPressSemanticId = semanticId;
    this.targetPressRegistration =
      this.inputRouter?.registerPressTarget?.({
        id: 'tutorial.target.proxy',
        displayObject: snapshot.displayObject,
        fallbackHitTest: true,
        priority: 1000,
        enabled: () => {
          const current = resolveSemanticTutorialTarget(
            this.semanticRegistry,
            targetId,
          );
          return Boolean(
            this.active &&
              this.pointer.root.visible &&
              current?.semanticId === semanticId &&
              current.state?.enabled !== false &&
              current.state?.interactive !== false &&
              current.state?.visible !== false,
          );
        },
        onActivate: (payload) =>
          this.semanticRegistry?.activate?.(semanticId, payload),
        haptic: 'light',
      }) ?? null;
  }

  clearTargetPressProxy() {
    releaseRegistration(this.targetPressRegistration);
    this.targetPressRegistration = null;
    this.targetPressSemanticId = null;
  }

  redrawSpotlight() {
    this.backdrop.clear();
    const lesson = this.model.lesson;
    if (
      this.model.kind !== 'lesson' ||
      !this.panelOpen ||
      (!lesson?.dimBackdrop &&
        !(this.model.step?.highlightTargetIds?.length > 0))
    ) {
      this.backdrop.visible = false;
      this.backdrop.renderable = false;
      return;
    }
    const bounds = this.backdropBounds ?? {
      x: 0,
      y: 0,
      width: this.sourceBounds.width,
      height: this.sourceBounds.height,
    };
    this.backdrop
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .fill({
        color: '#000000',
        alpha: TUTORIAL_PIXI_GEOMETRY.backdropOpacity,
      });
    const localBounds = {
      left: 0,
      top: 0,
      right: this.sourceBounds.width,
      bottom: this.sourceBounds.height,
    };
    for (const targetId of this.model.step?.highlightTargetIds ?? []) {
      const rect = padSourceRect(
        this.resolveTargetRect(targetId),
        this.resolveHighlightPadding(targetId),
        localBounds,
      );
      if (rect?.width > 0 && rect?.height > 0) {
        this.backdrop
          .rect(rect.x, rect.y, rect.width, rect.height)
          .cut();
      }
    }
    this.backdrop.visible = true;
    this.backdrop.renderable = true;
  }

  resolveHighlightPadding(targetId) {
    const explicit = this.model.highlightPaddingById?.[targetId];
    return Number.isFinite(explicit)
      ? Math.max(
          0,
          Math.min(
            TUTORIAL_PIXI_GEOMETRY.highlightPadding,
            explicit,
          ),
        )
      : TUTORIAL_PIXI_GEOMETRY.highlightPadding;
  }

  whenPointerReady() {
    return this.pointer.whenReady();
  }

  isLessonPanelOpen() {
    return (
      this.active &&
      this.model.kind === 'lesson' &&
      this.panelOpen
    );
  }

  setGuidePlacement(placement = null) {
    const buttonLeft = Number(placement?.buttonLeft);
    const buttonTop = Number(placement?.buttonTop);
    this.manualPlacement =
      Number.isFinite(buttonLeft) && Number.isFinite(buttonTop)
        ? { buttonLeft, buttonTop }
        : null;
    this.renderPositions();
  }

  resolveTargetRect(targetId, resolvedSnapshot = null) {
    if (!targetId) {
      return null;
    }
    const explicit = this.model.targetBounds?.[targetId];
    if (explicit) {
      return normalizeSourceRect(explicit);
    }
    const snapshot =
      resolvedSnapshot ??
      resolveSemanticTutorialTarget(
        this.semanticRegistry,
        targetId,
      );
    if (
      !snapshot ||
      snapshot.state?.visible === false ||
      snapshot.state?.active === false
    ) {
      return null;
    }
    return projectSemanticBoundsToSource(
      snapshot.bounds,
      this.projection,
    );
  }

  togglePanel() {
    if (!this.isGuideInteractive()) {
      return false;
    }
    this.panelOpen = !this.panelOpen;
    if (!this.panelOpen) {
      this.cancelTypewriter();
      this.actions.lessonPanelClose?.();
    } else {
      this.startTypewriterIfNeeded();
    }
    this.render();
    this.syncTicker();
    return true;
  }

  setGuidePressed(pressed) {
    if (this.dragState) {
      return;
    }
    this.guideImage.scale.set(
      this.guideImage.__baseScale *
        (pressed ? 0.965 : 1),
    );
    this.guideImage.position.y =
      TUTORIAL_PIXI_GEOMETRY.guideHeight + (pressed ? 1 : 0);
    this.guideLabelButton.setPressed(pressed);
  }

  startGuideDrag() {
    this.dragState = {
      start: this.currentPlacement
        ? {
            buttonLeft: this.currentPlacement.buttonLeft,
            buttonTop: this.currentPlacement.buttonTop,
          }
        : {
            buttonLeft: this.guideButton.x,
            buttonTop: this.guideButton.y,
          },
    };
    this.dragYell.setText(
      DRAG_YELLS[this.dragYellIndex % DRAG_YELLS.length],
    );
    this.dragYellIndex += 1;
    this.dragYell.alpha = 1;
    return { kind: 'tutorial-guide' };
  }

  moveGuideDrag(context) {
    if (!this.dragState) {
      return;
    }
    const scale = Math.max(
      0.0001,
      Number(this.projection?.sourceScale) || 3,
    );
    const delta = context.movement?.global ?? { x: 0, y: 0 };
    const buttonLeft = this.panelOpen
      ? TUTORIAL_PIXI_GEOMETRY.guideLeft
      : this.dragState.start.buttonLeft + delta.x / scale;
    const buttonTop =
      this.dragState.start.buttonTop + delta.y / scale;
    this.manualPlacement = { buttonLeft, buttonTop };
    this.guideImage.rotation =
      Math.sin((Number(delta.x) + Number(delta.y)) * 0.05) * 0.04;
    this.renderPositions();
  }

  finishGuideDrag() {
    if (!this.dragState) {
      return;
    }
    this.dragState = null;
    this.dragYell.alpha = 0;
    this.guideImage.rotation = 0;
    if (this.currentPlacement) {
      this.manualPlacement = {
        buttonLeft: this.currentPlacement.buttonLeft,
        buttonTop: this.currentPlacement.buttonTop,
      };
    }
    this.actions.guideMoved?.(this.manualPlacement);
    this.renderPositions();
  }

  isGuideInteractive() {
    return (
      this.active &&
      this.model.kind === 'lesson' &&
      this.model.lesson?.variant !== 'intro-dialog'
    );
  }

  startTypewriterIfNeeded() {
    const text = String(this.model.lesson?.text ?? '');
    const key = `${this.stepId ?? ''}:${text}`;
    if (!text || this.reducedMotion || this.seenCopyKeys.has(key)) {
      this.cancelTypewriter();
      this.surface.setCopy(text);
      return;
    }
    this.seenCopyKeys.add(key);
    this.typewriter = {
      key,
      text,
      visibleText: '',
      index: 0,
      elapsedMs: 0,
    };
    this.surface.setCopy('');
    this.syncTicker();
  }

  cancelTypewriter() {
    this.typewriter = null;
  }

  updateTypewriter(deltaMs) {
    if (!this.typewriter || !this.panelOpen) {
      return;
    }
    this.typewriter.elapsedMs += deltaMs;
    while (
      this.typewriter.elapsedMs >=
        TUTORIAL_PIXI_GEOMETRY.typewriterIntervalMs &&
      this.typewriter.index < this.typewriter.text.length
    ) {
      this.typewriter.elapsedMs -=
        TUTORIAL_PIXI_GEOMETRY.typewriterIntervalMs;
      this.typewriter.index +=
        TUTORIAL_PIXI_GEOMETRY.typewriterCharsPerTick;
    }
    this.typewriter.visibleText = this.typewriter.text.slice(
      0,
      this.typewriter.index,
    );
    this.surface.setCopy(this.typewriter.visibleText);
    if (this.typewriter.index >= this.typewriter.text.length) {
      this.typewriter = null;
    }
  }

  startTargetEmphasis(targetId) {
    const snapshot = resolveSemanticTutorialTarget(
      this.semanticRegistry,
      targetId,
    );
    const displayObject = snapshot?.displayObject;
    if (!displayObject?.scale?.set || this.emphasis?.target === displayObject) {
      return;
    }
    this.restoreTargetEmphasis();
    this.emphasis = {
      target: displayObject,
      elapsedMs: 0,
      scaleX: displayObject.scale.x,
      scaleY: displayObject.scale.y,
      y: displayObject.position?.y ?? displayObject.y ?? 0,
    };
    this.syncTicker();
  }

  updateTargetEmphasis(deltaMs) {
    const state = this.emphasis;
    if (!state) {
      return;
    }
    state.elapsedMs += deltaMs;
    const progress = Math.min(
      1,
      state.elapsedMs /
        TUTORIAL_PIXI_GEOMETRY.targetEmphasisMs,
    );
    let scale;
    let y;
    if (progress <= 0.24) {
      scale = lerp(1, 1.035, progress / 0.24);
      y = lerp(0, -1, progress / 0.24);
    } else if (progress <= 0.58) {
      scale = lerp(1.035, 0.99, (progress - 0.24) / 0.34);
      y = -1;
    } else {
      scale = lerp(0.99, 1, (progress - 0.58) / 0.42);
      y = lerp(-1, 0, (progress - 0.58) / 0.42);
    }
    state.target.scale.set(
      state.scaleX * scale,
      state.scaleY * scale,
    );
    setDisplayY(state.target, state.y + y);
    if (progress >= 1) {
      this.restoreTargetEmphasis();
    }
  }

  restoreTargetEmphasis() {
    if (!this.emphasis) {
      return;
    }
    this.emphasis.target.scale?.set?.(
      this.emphasis.scaleX,
      this.emphasis.scaleY,
    );
    setDisplayY(this.emphasis.target, this.emphasis.y);
    this.emphasis = null;
  }

  tick(deltaMs) {
    if (!this.active || this.model.kind !== 'lesson') {
      this.stopTicker();
      return;
    }
    const delta = Math.max(0, Number(deltaMs) || 0);
    this.updateTypewriter(delta);
    this.updateTargetEmphasis(delta);
    this.surface.updateResize(delta);
    this.pointer.update(delta);
    this.updateGuideMotion(delta);
    this.renderPositions();
    this.renderTargetCue();
    this.redrawSpotlight();
    this.syncTicker();
  }

  updateGuideMotion(deltaMs) {
    const speaking = Boolean(this.typewriter);
    const attention =
      Boolean(this.model.lesson?.attention) && !this.panelOpen;
    this.guideMotionMs = (this.guideMotionMs ?? 0) + deltaMs;
    if (this.dragState || this.reducedMotion) {
      return;
    }
    if (speaking) {
      const phase = (this.guideMotionMs % 560) / 560;
      this.guideImage.rotation =
        Math.sin(phase * Math.PI * 2) * 0.018;
      this.guideImage.position.y =
        TUTORIAL_PIXI_GEOMETRY.guideHeight -
        Math.max(0, Math.sin(phase * Math.PI * 2)) * 1.5;
    } else if (attention) {
      const phase = (this.guideMotionMs % 2600) / 2600;
      this.guideImage.rotation =
        phase < 0.2
          ? Math.sin(phase * Math.PI * 20) * 0.025
          : 0;
    } else {
      this.guideImage.rotation = 0;
      this.guideImage.position.y =
        TUTORIAL_PIXI_GEOMETRY.guideHeight;
    }
  }

  syncTicker() {
    const cueNeedsFollow =
      this.model.kind === 'lesson' &&
      this.model.cue?.kind === 'target-cue' &&
      Boolean(this.model.cue?.showPointer);
    const spotlightNeedsFollow =
      this.model.kind === 'lesson' &&
      this.panelOpen &&
      (this.model.lesson?.dimBackdrop ||
        this.model.step?.highlightTargetIds?.length > 0);
    const guideMotion =
      this.model.kind === 'lesson' &&
      !this.reducedMotion &&
      (Boolean(this.typewriter) ||
        (Boolean(this.model.lesson?.attention) && !this.panelOpen));
    const shouldAttach =
      this.active &&
      (this.typewriter ||
        this.emphasis ||
        this.surface.hasActiveResize() ||
        cueNeedsFollow ||
        spotlightNeedsFollow ||
        guideMotion);
    if (shouldAttach && !this.tickerAttached) {
      this.application?.ticker?.add?.(this.handleTick);
      this.tickerAttached = Boolean(this.application?.ticker?.add);
    } else if (!shouldAttach) {
      this.stopTicker();
    }
  }

  stopTicker() {
    if (!this.tickerAttached) {
      return;
    }
    this.application?.ticker?.remove?.(this.handleTick);
    this.tickerAttached = false;
  }

  fitGuideImage(expanded) {
    const width = expanded ? 70 : 46;
    const height = expanded ? 91 : 60;
    const textureWidth = Math.max(1, this.guideImage.texture.width);
    const textureHeight = Math.max(1, this.guideImage.texture.height);
    const scale = Math.min(
      width / textureWidth,
      height / textureHeight,
    );
    this.guideImage.__baseScale = scale;
    this.guideImage.scale.set(scale);
    this.guideImage.position.set(
      expanded
        ? TUTORIAL_PIXI_GEOMETRY.guideWidth / 2
        : TUTORIAL_PIXI_GEOMETRY.guideWidth - 7 - width / 2,
      TUTORIAL_PIXI_GEOMETRY.guideHeight,
    );
  }

  redrawGuideLabel() {
    const width = Math.max(
      36,
      Math.ceil(this.guideLabel.measuredWidth) + 14,
    );
    const height = 24;
    const x =
      TUTORIAL_PIXI_GEOMETRY.guideWidth - 4 - width;
    const y =
      TUTORIAL_PIXI_GEOMETRY.guideHeight - 4 - height;
    this.guideLabelButton.setSize(width, height);
    this.guideLabelButton.position.set(x, y);
  }

  redrawAttention() {
    const active =
      Boolean(this.model.lesson?.attention) && !this.panelOpen;
    this.attentionBadge
      .placeAtTopRight({
        x: this.guideLabelButton.x,
        y: this.guideLabelButton.y,
        width: this.guideLabelButton.buttonWidth,
        height: this.guideLabelButton.buttonHeight,
      })
      .setTone('red')
      .setActive(active);
  }
}

export function createTutorialPixiOverlay(options = {}) {
  return new TutorialPixiOverlay(options);
}

/**
 * Adapts the current renderer-neutral TutorialFacade state shape to the Pixi
 * presenter contract without carrying DOM target nodes across the boundary.
 */
export function createTutorialPixiViewModel(
  viewState,
  { actions = {}, targetBounds = null } = {},
) {
  const state = viewState ?? {};
  const step = state.step ?? null;
  const cue = state.cue ?? { kind: 'none' };
  const targetId =
    cue.targetId ??
    step?.targetId ??
    null;
  return normalizeTutorialPixiViewModel({
    kind: state.kind,
    step: step
      ? {
          ...step,
          targetId: step.targetId ?? targetId,
          highlightTargetIds: step.highlightTargetIds ?? [],
        }
      : null,
    lesson: state.lesson
      ? {
          ...state.lesson,
          dimBackdrop:
            state.lesson.dimBackdrop ??
            (state.lesson.advanceOnClick === true),
        }
      : null,
    cue:
      cue.kind === 'target-cue'
        ? {
            kind: 'target-cue',
            targetId,
            showPointer: cue.showPointer !== false,
            emphasizeTarget: cue.emphasizeTarget === true,
          }
        : {
            kind: 'none',
            lessonAttention: cue.lessonAttention,
          },
    notificationPolicy: state.notificationPolicy ?? null,
    targetBounds,
    actions,
  });
}

class TutorialLessonSurface {
  constructor({
    assets,
    inputRouter,
    onSurfacePress,
    onShowTarget,
    onAdvance,
  }) {
    this.assets = assets;
    this.root = new Container();
    this.root.label = 'tutorial:lesson';
    this.root.eventMode = 'static';
    this.introDialog = new PixiDialogFrame({
      assetManager: assets,
      inputRouter,
      title: '',
      label: 'tutorial:introDialog',
    });
    this.frame = new PixiNineSliceFrame({
      texture: this.assets.getTexture(
        PIXI_ROOT_RUN_ASSETS.researchCard,
      ),
      sourceInsets:
        PIXI_ROOT_RUN_GEOMETRY.researchCard.sourceInsets,
      borderInsets:
        PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
      width: TUTORIAL_PIXI_GEOMETRY.panelOuterWidth,
      height: TUTORIAL_PIXI_GEOMETRY.panelDefaultOuterHeight,
      label: 'tutorial:lessonFrame',
    });
    this.frame.label = 'tutorial:lessonFrame';
    this.title = new PixiTextLabel({
      text: 'lesson',
      fontSize: PIXI_UI_GEOMETRY.dialogTitleFontSize,
      fontWeight: 'bold',
      label: 'tutorial:lessonTitle',
    });
    this.stepLabel = new PixiTextLabel({
      text: '',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      lineHeight: PIXI_UI_GEOMETRY.borderLabelLineHeight,
      anchor: { x: 1, y: 0 },
      color: 'muted',
      label: 'tutorial:stepLabel',
    });
    this.copy = new PixiTextLabel({
      text: '',
      fontSize: 12,
      lineHeight: 16,
      wordWrap: true,
      wrapWidth: TUTORIAL_PIXI_GEOMETRY.panelContentWidth,
      label: 'tutorial:lessonCopy',
    });
    this.progress = new PixiProgressBar({
      assetManager: this.assets,
      width: TUTORIAL_PIXI_GEOMETRY.panelContentWidth,
      tone: 'root',
      label: 'tutorial:lessonProgress',
    });
    this.progressLabel = new PixiTextLabel({
      text: '',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      lineHeight: PIXI_UI_GEOMETRY.borderLabelLineHeight,
      anchor: { x: 1, y: 0 },
      color: 'muted',
      label: 'tutorial:lessonProgressLabel',
    });
    this.showControl = new TutorialTextControl({
      id: 'tutorial.lesson.showTarget',
      inputRouter,
      text: 'show me',
      action: onShowTarget,
    });
    this.advanceControl = new PixiButton({
      assetManager: assets,
      inputRouter,
      text: 'next',
      width: TUTORIAL_ADVANCE_BUTTON.minWidth,
      height: TUTORIAL_ADVANCE_BUTTON.height,
      variant: 'yellow',
      sizeTier: 30,
      action: onAdvance,
      label: 'tutorial.lesson.advance',
    });
    this.root.addChild(
      this.introDialog,
      this.frame,
      this.title,
      this.stepLabel,
      this.copy,
      this.progress,
      this.progressLabel,
      this.showControl.root,
      this.advanceControl,
    );
    this.surfaceRegistration =
      inputRouter?.registerPressTarget?.({
        id: 'tutorial.lesson.surface',
        displayObject: this.root,
        enabled: () =>
          this.root.visible && this.root.eventMode !== 'none',
        onActivate: onSurfacePress,
        haptic: 'light',
      }) ?? null;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.model = {};
    this.contentWidth = TUTORIAL_PIXI_GEOMETRY.panelContentWidth;
    this.contentHeight =
      TUTORIAL_PIXI_GEOMETRY.panelDefaultContentHeight;
    this.outerWidth = TUTORIAL_PIXI_GEOMETRY.panelOuterWidth;
    this.outerHeight =
      TUTORIAL_PIXI_GEOMETRY.panelDefaultOuterHeight;
    this.targetContentHeight = this.contentHeight;
    this.targetOuterHeight = this.outerHeight;
    this.layoutCopyHeight = 20;
    this.resizeAnimation = null;
  }

  bind(model = {}) {
    const previousId = this.model.id;
    const previousOuterHeight = this.outerHeight;
    const previousResize = this.resizeAnimation;
    this.model = model;
    const intro = model.variant === 'intro-dialog';
    const layoutModel = {
      ...model,
      text: model.layoutText ?? model.text,
    };
    this.applyResolvedTheme();
    this.contentWidth = intro
      ? TUTORIAL_PIXI_GEOMETRY.introContentWidth
      : estimateLessonContentWidth(layoutModel);
    this.title.setText(model.title ?? 'lesson');
    this.stepLabel.setText('');
    this.stepLabel.visible = false;
    this.stepLabel.renderable = false;
    this.copy
      .setFontSize(
        intro ? PIXI_UI_GEOMETRY.bodyFontSize : 12,
      )
      .setWrapWidth(this.contentWidth)
      .setText(layoutModel.text ?? '');
    this.layoutCopyHeight = Math.max(
      20,
      Math.ceil(this.copy.measuredHeight),
    );
    const progress = normalizeProgress(model.progress);
    const progressVisible = progress !== null;
    this.progress.visible = progressVisible;
    this.progress.renderable = progressVisible;
    this.progress.setProgress(progress ?? 0);
    this.progressLabel.visible =
      progressVisible || Boolean(model.progressLabel);
    this.progressLabel.setText(model.progressLabel ?? '');
    this.showControl
      .setText('show me')
      .setVisible(
        !intro &&
          !model.advanceOnClick &&
          Boolean(model.canShowTarget),
      );
    this.advanceControl
      .setText(normalizeActionLabel(model.advanceLabel))
      .setEnabled(true);
    this.advanceControl.visible = Boolean(model.advanceOnClick);
    this.advanceControl.renderable = this.advanceControl.visible;
    this.advanceControl.syncInteraction();
    this.targetContentHeight = estimateLessonContentHeight(
      layoutModel,
      intro,
      this.contentWidth,
      {
        measuredCopyHeight: this.layoutCopyHeight,
        advanceVisible: this.advanceControl.visible,
        progressVisible,
        progressLabelVisible: this.progressLabel.visible,
      },
    );
    this.targetOuterHeight =
      this.targetContentHeight + (intro ? 40 : 21);
    this.outerWidth = intro
      ? this.contentWidth + 40
      : this.contentWidth + 24;
    this.introDialog.setTitle(
      intro ? model.title ?? 'lesson' : '',
    );

    const hasPreviousLesson = Boolean(previousId);
    const hasNextLesson = Boolean(model.id);
    const shouldKeepResize =
      previousResize &&
      Math.abs(previousResize.to - this.targetOuterHeight) < 0.01 &&
      model.reducedMotion !== true;
    const shouldAnimateResize =
      !shouldKeepResize &&
      hasPreviousLesson &&
      hasNextLesson &&
      model.reducedMotion !== true &&
      Math.abs(previousOuterHeight - this.targetOuterHeight) >= 1;
    if (shouldKeepResize) {
      this.resizeAnimation = previousResize;
      this.applyOuterHeight(previousOuterHeight);
    } else if (shouldAnimateResize) {
      this.resizeAnimation = {
        from: previousOuterHeight,
        to: this.targetOuterHeight,
        elapsedMs: 0,
      };
      this.applyOuterHeight(previousOuterHeight);
    } else {
      this.resizeAnimation = null;
      this.applyOuterHeight(this.targetOuterHeight);
    }

    this.setCopy(model.text ?? '');
    this.layout();
    this.redraw();
  }

  setCopy(text) {
    this.copy.setText(text);
  }

  setVisible(visible) {
    this.root.visible = Boolean(visible);
    this.root.renderable = Boolean(visible);
    this.root.eventMode = visible ? 'static' : 'none';
  }

  hasActiveResize() {
    return Boolean(this.resizeAnimation);
  }

  updateResize(deltaMs) {
    const animation = this.resizeAnimation;
    if (!animation) {
      return false;
    }
    animation.elapsedMs += Math.max(0, Number(deltaMs) || 0);
    const progress = Math.min(
      1,
      animation.elapsedMs /
        TUTORIAL_PIXI_GEOMETRY.panelResizeMs,
    );
    this.applyOuterHeight(
      lerp(animation.from, animation.to, easeOutQuint(progress)),
    );
    if (progress >= 1) {
      this.resizeAnimation = null;
      this.applyOuterHeight(this.targetOuterHeight);
    }
    return true;
  }

  applyOuterHeight(outerHeight) {
    const intro = this.model.variant === 'intro-dialog';
    this.outerHeight = Math.max(0, Number(outerHeight) || 0);
    this.contentHeight = Math.max(
      0,
      this.outerHeight - (intro ? 40 : 21),
    );
    if (intro) {
      this.introDialog.setContentBoxSize(
        this.contentWidth,
        this.contentHeight,
        PIXI_UI_GEOMETRY.dialogPadding,
      );
      this.outerWidth = this.introDialog.outerWidth;
      this.outerHeight = this.introDialog.outerHeight;
      this.contentHeight =
        this.outerHeight - PIXI_UI_GEOMETRY.dialogPadding * 2;
    }
    this.layout();
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.applyResolvedTheme();
    this.redraw();
  }

  applyResolvedTheme() {
    const intro = this.model.variant === 'intro-dialog';
    this.introDialog.applyTheme(this.theme);
    this.visualTheme = intro
      ? this.introDialog.getContentTheme()
      : {
          ...this.theme,
          ...TUTORIAL_RESEARCH_CARD_PALETTE,
        };
    for (const label of [
      this.title,
      this.stepLabel,
      this.copy,
      this.progressLabel,
    ]) {
      label.applyTheme(this.visualTheme);
    }
    this.showControl.applyTheme(this.visualTheme);
    this.advanceControl.applyTheme(this.visualTheme);
    this.progress.applyTheme(this.visualTheme);
  }

  layout() {
    const intro = this.model.variant === 'intro-dialog';
    const paddingX = intro ? 20 : 12;
    const paddingTop = intro ? 20 : 31;
    const advanceWidth = Math.max(
      TUTORIAL_ADVANCE_BUTTON.minWidth,
      Math.min(
        TUTORIAL_ADVANCE_BUTTON.maxWidth,
        Math.ceil(this.advanceControl.textLabel.measuredWidth) +
          TUTORIAL_ADVANCE_BUTTON.labelPadding,
      ),
    );
    const advanceRightInset = intro
      ? paddingX
      : TUTORIAL_ADVANCE_BUTTON.rightInset;
    const advanceBottomInset = intro
      ? paddingX
      : TUTORIAL_ADVANCE_BUTTON.bottomInset;
    this.advanceControl.setSize(
      advanceWidth,
      TUTORIAL_ADVANCE_BUTTON.height,
    );
    this.advanceControl.position.set(
      this.outerWidth - advanceRightInset - advanceWidth,
      this.outerHeight -
        advanceBottomInset -
        TUTORIAL_ADVANCE_BUTTON.height,
    );
    this.title.position.set(intro ? 8 : 12, intro ? -12 : 9);
    this.copy.position.set(paddingX, paddingTop);
    let y = paddingTop + this.layoutCopyHeight;
    if (
      intro ||
      (!intro &&
        (this.progress.visible || this.advanceControl.visible))
    ) {
      const rowHeight = Math.max(
        this.progress.visible
          ? PIXI_UI_GEOMETRY.progressTotalHeight
          : 0,
        this.advanceControl.visible
          ? TUTORIAL_ADVANCE_BUTTON.height
          : 0,
      );
      if (rowHeight > 0) {
        y += 5;
        if (this.advanceControl.visible) {
          this.advanceControl.y =
            y +
            (rowHeight - TUTORIAL_ADVANCE_BUTTON.height) / 2;
        }
        if (this.progress.visible) {
          this.progress.position.set(
            paddingX,
            y +
              (rowHeight -
                PIXI_UI_GEOMETRY.progressTotalHeight) /
                2,
          );
        }
        y += rowHeight;
      }
    }
    if (this.progress.visible) {
      const progressWidth = this.advanceControl.visible
        ? Math.max(
            0,
            this.advanceControl.x -
              TUTORIAL_ADVANCE_BUTTON.contentGap -
              paddingX,
          )
        : this.contentWidth;
      this.progress.setSize(
        progressWidth,
        PIXI_UI_GEOMETRY.progressTotalHeight,
      );
    }
    if (this.progressLabel.visible && intro) {
      this.progressLabel.position.set(
        this.progress.x + this.progress.barWidth,
        y + 2,
      );
    }
    if (this.progressLabel.visible && !intro) {
      this.progressLabel.position.set(
        this.progress.x + this.progress.barWidth,
        y + 2,
      );
    }
    this.showControl.root.position.set(
      this.outerWidth / 2,
      this.outerHeight - 7,
    );
    this.root.hitArea = new Rectangle(
      0,
      0,
      this.outerWidth,
      this.outerHeight,
    );
  }

  redraw() {
    const intro = this.model.variant === 'intro-dialog';
    this.introDialog.visible = intro;
    this.introDialog.renderable = intro;
    this.introDialog.eventMode = 'none';
    this.frame.visible = !intro;
    this.frame.renderable = !intro;
    this.title.visible = !intro;
    this.title.renderable = !intro;
    if (!intro) {
      this.frame.setSize(
        this.outerWidth,
        this.outerHeight,
        PIXI_ROOT_RUN_GEOMETRY.researchCard.borderInsets,
      );
    }
  }

  destroy() {
    releaseRegistration(this.surfaceRegistration);
    this.introDialog.destroy({ children: true });
    this.frame.destroy();
    this.progress.destroy({ children: true });
    this.showControl.destroy();
    this.advanceControl.destroy({ children: true });
  }
}

class TutorialTextControl {
  constructor({ id, inputRouter, text, action }) {
    this.root = new Container();
    this.root.label = id;
    this.root.eventMode = 'static';
    this.backing = new Graphics();
    this.label = new PixiTextLabel({
      text,
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      lineHeight: PIXI_UI_GEOMETRY.borderLabelLineHeight,
      anchor: { x: 1, y: 0.5 },
      label: `${id}:label`,
    });
    this.root.addChild(this.backing, this.label);
    this.action = action;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.registration =
      inputRouter?.registerPressTarget?.({
        id,
        displayObject: this.root,
        enabled: () =>
          this.root.visible && this.root.eventMode !== 'none',
        onPressChange: (pressed) => {
          this.root.position.y += pressed
            ? this.root.__pressed
              ? 0
              : 1
            : this.root.__pressed
              ? -1
              : 0;
          this.root.__pressed = pressed;
        },
        onActivate: () => this.action?.(),
        haptic: 'light',
      }) ?? null;
    this.redraw();
  }

  setText(text) {
    this.label.setText(text);
    this.redraw();
    return this;
  }

  setVisible(visible) {
    this.root.visible = Boolean(visible);
    this.root.renderable = Boolean(visible);
    this.root.eventMode = visible ? 'static' : 'none';
    return this;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.label.applyTheme(this.theme);
    this.redraw();
  }

  redraw() {
    const width = Math.ceil(this.label.measuredWidth) + 6;
    const height = PIXI_UI_GEOMETRY.borderLabelLineHeight;
    this.backing
      .clear()
      .rect(-width, -height / 2, width, height)
      .fill(this.theme.surface);
    this.label.position.set(-2, 0);
    this.root.hitArea = new Rectangle(
      -width,
      -height / 2,
      width,
      height,
    );
  }

  destroy() {
    releaseRegistration(this.registration);
  }
}

export function normalizeTutorialPixiViewModel(model) {
  const kind = ['hidden', 'blocked', 'quest', 'lesson'].includes(
    model?.kind,
  )
    ? model.kind
    : 'hidden';
  const step = model?.step
    ? {
        ...model.step,
        id: String(model.step.id ?? ''),
        targetId: normalizeOptionalId(model.step.targetId),
        highlightTargetIds: normalizeIds(
          model.step.highlightTargetIds,
        ),
      }
    : null;
  const lesson =
    kind === 'lesson'
      ? {
          id: String(model?.lesson?.id ?? step?.id ?? ''),
          title: String(model?.lesson?.title ?? 'lesson'),
          text: String(model?.lesson?.text ?? ''),
          stepLabel: String(model?.lesson?.stepLabel ?? ''),
          progress: model?.lesson?.progress,
          progressLabel: String(
            model?.lesson?.progressLabel ?? '',
          ),
          attention: model?.lesson?.attention !== false,
          autoOpen: model?.lesson?.autoOpen !== false,
          forceOpen: model?.lesson?.forceOpen === true,
          advanceOnClick:
            model?.lesson?.advanceOnClick === true,
          advanceLabel: normalizeActionLabel(
            model?.lesson?.advanceLabel,
          ),
          canShowTarget:
            model?.lesson?.canShowTarget === true,
          dimBackdrop:
            model?.lesson?.dimBackdrop === true ||
            model?.lesson?.advanceOnClick === true,
          variant:
            model?.lesson?.variant === 'intro-dialog'
              ? 'intro-dialog'
              : null,
        }
      : null;
  const cue =
    model?.cue?.kind === 'target-cue'
      ? {
          kind: 'target-cue',
          targetId:
            normalizeOptionalId(model.cue.targetId) ??
            step?.targetId ??
            null,
          showPointer: model.cue.showPointer !== false,
          emphasizeTarget:
            model.cue.emphasizeTarget === true,
        }
      : {
          kind: 'none',
          lessonAttention: model?.cue?.lessonAttention,
        };
  if (
    lesson &&
    cue.kind === 'none' &&
    cue.lessonAttention !== undefined
  ) {
    lesson.attention = Boolean(cue.lessonAttention);
  }
  return {
    kind,
    step,
    lesson,
    cue,
    protectedTargetIds: normalizeIds(
      model?.protectedTargetIds,
    ),
    targetBounds:
      model?.targetBounds && typeof model.targetBounds === 'object'
        ? model.targetBounds
        : null,
    highlightPaddingById:
      model?.highlightPaddingById &&
      typeof model.highlightPaddingById === 'object'
        ? model.highlightPaddingById
        : null,
    notificationPolicy: model?.notificationPolicy ?? null,
    reducedMotion: model?.reducedMotion,
    actions: model?.actions ?? {},
  };
}

function createHiddenTutorialModel() {
  return normalizeTutorialPixiViewModel({ kind: 'hidden' });
}

function estimateLessonContentWidth(model) {
  const longestLine = [
    model.title,
    model.text,
    model.progressLabel,
  ]
    .flatMap((value) => String(value ?? '').split('\n'))
    .reduce(
      (longest, line) =>
        Math.max(longest, line.length * 6.4),
      0,
    );

  return Math.ceil(
    Math.max(
      TUTORIAL_PIXI_GEOMETRY.panelContentWidth,
      Math.min(
        TUTORIAL_PIXI_GEOMETRY.panelMaxContentWidth,
        longestLine,
      ),
    ),
  );
}

function estimateLessonContentHeight(
  model,
  intro,
  contentWidth,
  {
    measuredCopyHeight = null,
    advanceVisible = false,
    progressVisible = false,
    progressLabelVisible = false,
  } = {},
) {
  if (intro) {
    let height = Math.max(
      20,
      Number(measuredCopyHeight) || 0,
    );
    const rowHeight = Math.max(
      progressVisible ? PIXI_UI_GEOMETRY.progressTotalHeight : 0,
      advanceVisible ? TUTORIAL_ADVANCE_BUTTON.height : 0,
    );
    if (rowHeight > 0) {
      height += 5 + rowHeight;
    }
    if (progressLabelVisible) {
      height += 2 + PIXI_UI_GEOMETRY.borderLabelLineHeight;
    }
    return Math.ceil(
      Math.max(
        TUTORIAL_PIXI_GEOMETRY.introMinContentHeight,
        Math.min(
          TUTORIAL_PIXI_GEOMETRY.introMaxContentHeight,
          height,
        ),
      ),
    );
  }
  const width = intro
    ? TUTORIAL_PIXI_GEOMETRY.introContentWidth
    : contentWidth;
  const charsPerLine = Math.max(1, Math.floor(width / 6.4));
  const lines = String(model.text ?? '')
    .split('\n')
    .reduce(
      (total, line) =>
        total + Math.max(1, Math.ceil(line.length / charsPerLine)),
      0,
    );
  let height = Math.max(
    TUTORIAL_PIXI_GEOMETRY.panelMinContentHeight,
    (Number(measuredCopyHeight) || 0) + 14,
    lines * 16 + 14,
    model.text ? 34 : 0,
  );
  if (progressVisible || advanceVisible) {
    height +=
      5 +
      Math.max(
        progressVisible
          ? PIXI_UI_GEOMETRY.progressTotalHeight
          : 0,
        advanceVisible ? TUTORIAL_ADVANCE_BUTTON.height : 0,
      );
  }
  if (progressLabelVisible) {
    height += 16;
  }
  return Math.ceil(
    Math.max(
      TUTORIAL_PIXI_GEOMETRY.panelMinContentHeight,
      Math.min(
        TUTORIAL_PIXI_GEOMETRY.panelMaxContentHeight,
        height,
      ),
    ),
  );
}

function normalizeProgress(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(1, number))
    : null;
}

function normalizeActionLabel(value) {
  const text = String(value ?? 'next').trim();
  const normalized = text || 'next';
  return normalized[0].toUpperCase() + normalized.slice(1);
}

function normalizeIds(values) {
  return Array.isArray(values)
    ? values
        .map(normalizeOptionalId)
        .filter(Boolean)
    : [];
}

function normalizeOptionalId(value) {
  const id = String(value ?? '').trim();
  return id || null;
}

function setDisplayY(displayObject, y) {
  if (displayObject.position?.set) {
    displayObject.position.set(displayObject.position.x, y);
  } else {
    displayObject.y = y;
  }
}

function releaseRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
  } else {
    registration?.unregister?.();
  }
}

function lerp(from, to, progress) {
  return from + (to - from) * Math.max(0, Math.min(1, progress));
}

function easeOutQuint(progress) {
  const value = Math.max(0, Math.min(1, Number(progress) || 0));
  return 1 - (1 - value) ** 5;
}
