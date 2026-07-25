import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
} from 'pixi.js';

import {
  BasePixiRetainedView,
  PixiProgressBar,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
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
 * @property {string[]} revealTokens
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
    revealController = null,
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
    this.revealController = revealController;
    this.application = application;
    this.reducedMotion = Boolean(reducedMotion);
    this.model = createHiddenTutorialModel();
    this.actions = {};
    this.panelOpen = false;
    this.stepId = null;
    this.manualPlacement = null;
    this.dragState = null;
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
    this.guideLabelFrame = new Graphics();
    this.guideLabelFrame.label = 'tutorial:guideLabelFrame';
    this.guideLabel = new PixiTextLabel({
      text: 'help',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      lineHeight: PIXI_UI_GEOMETRY.borderLabelLineHeight,
      anchor: { x: 0.5, y: 0.5 },
      label: 'tutorial:guideLabel',
    });
    this.dragYell = new PixiTextLabel({
      text: DRAG_YELLS[0],
      fontSize: 10,
      lineHeight: 13,
      anchor: { x: 0.5, y: 0.5 },
      label: 'tutorial:dragYell',
    });
    this.dragYell.alpha = 0;
    this.attentionDot = new Graphics();
    this.attentionDot.label = 'tutorial:attentionDot';
    this.guideButton.addChild(
      this.guideImage,
      this.guideLabelFrame,
      this.guideLabel,
      this.dragYell,
      this.attentionDot,
    );

    this.surface = new TutorialLessonSurface({
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

    if (next.kind === 'hidden') {
      this.revealController?.restore?.();
    } else if (next.kind !== 'blocked') {
      this.revealController?.apply?.(next.revealTokens, {
        reducedMotion: this.reducedMotion,
      });
    }
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
    this.guideLabel.applyTheme(nextTheme);
    this.dragYell.applyTheme(nextTheme);
    this.surface.applyTheme(nextTheme);
    this.redrawGuideLabel(nextTheme);
    this.redrawAttention(nextTheme);
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
    this.revealController?.activate?.();
    this.render();
    this.syncTicker();
  }

  onDeactivate() {
    this.stopTicker();
    this.revealController?.deactivate?.();
    this.pointer.setVisible(false);
    this.cancelTypewriter();
    this.restoreTargetEmphasis();
  }

  onDestroy() {
    this.stopTicker();
    for (const registration of this.registrations) {
      releaseRegistration(registration);
    }
    this.registrations.length = 0;
    this.surface.destroy();
    this.pointer.destroy();
    this.revealController?.destroy?.();
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

    this.guideLabel.setText(this.panelOpen ? 'hide' : 'help');
    this.fitGuideImage(this.panelOpen);
    this.dragYell.position.set(
      TUTORIAL_PIXI_GEOMETRY.guideWidth / 2,
      this.panelOpen ? 15 : 28,
    );
    this.surface.bind({
      ...this.model.lesson,
      text: this.typewriter?.visibleText ?? this.model.lesson?.text ?? '',
      variant: this.model.lesson?.variant,
    });
    this.redrawGuideLabel(this.theme ?? DEFAULT_PIXI_THEME_SNAPSHOT);
    this.redrawAttention(this.theme ?? DEFAULT_PIXI_THEME_SNAPSHOT);
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
      this.pointer.setVisible(false);
      return;
    }
    const targetRect = this.resolveTargetRect(
      cue.targetId ?? this.model.step?.targetId,
    );
    if (!targetRect) {
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
    this.pointer.setPlacement(placement);
    this.pointer.setMotionEnabled(!this.reducedMotion);
    this.pointer.setVisible(Boolean(placement));
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

  resolveTargetRect(targetId) {
    if (!targetId) {
      return null;
    }
    const explicit = this.model.targetBounds?.[targetId];
    if (explicit) {
      return normalizeSourceRect(explicit);
    }
    const snapshot = resolveSemanticTutorialTarget(
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
    this.guideLabel.position.y =
      this.guideLabel.__layoutY + (pressed ? 1 : 0);
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

  redrawGuideLabel(theme) {
    const width = Math.ceil(this.guideLabel.measuredWidth) + 6;
    const height = PIXI_UI_GEOMETRY.borderLabelLineHeight + 2;
    const x =
      TUTORIAL_PIXI_GEOMETRY.guideWidth - 4 - width;
    const y =
      TUTORIAL_PIXI_GEOMETRY.guideHeight - 6 - height;
    this.guideLabelFrame
      .clear()
      .rect(x, y, width, height)
      .fill(theme.surface)
      .stroke({
        color: theme.stroke,
        width: 1,
        alignment: 1,
      });
    this.guideLabel.position.set(
      x + width / 2,
      y + height / 2,
    );
    this.guideLabel.__layoutY = this.guideLabel.y;
  }

  redrawAttention(theme) {
    this.attentionDot.clear();
    const active =
      Boolean(this.model.lesson?.attention) && !this.panelOpen;
    if (!active) {
      this.attentionDot.visible = false;
      return;
    }
    const size = PIXI_UI_GEOMETRY.notificationSize;
    this.attentionDot
      .circle(
        TUTORIAL_PIXI_GEOMETRY.guideWidth - 2,
        this.panelOpen ? 15 : 64,
        size / 2,
      )
      .fill(theme.notificationRed)
      .stroke({
        color: theme.surface,
        width: 1,
        alignment: 0,
      });
    this.attentionDot.visible = true;
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
    revealTokens: state.revealTokens,
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
    inputRouter,
    onSurfacePress,
    onShowTarget,
    onAdvance,
  }) {
    this.root = new Container();
    this.root.label = 'tutorial:lesson';
    this.root.eventMode = 'static';
    this.shadow = new Graphics();
    this.shadow.label = 'tutorial:lessonShadow';
    this.frame = new Graphics();
    this.frame.label = 'tutorial:lessonFrame';
    this.titleBacking = new Graphics();
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
    this.advanceControl = new TutorialTextControl({
      id: 'tutorial.lesson.advance',
      inputRouter,
      text: 'next',
      action: onAdvance,
    });
    this.root.addChild(
      this.shadow,
      this.frame,
      this.titleBacking,
      this.title,
      this.stepLabel,
      this.copy,
      this.progress,
      this.progressLabel,
      this.showControl.root,
      this.advanceControl.root,
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
  }

  bind(model = {}) {
    this.model = model;
    const intro = model.variant === 'intro-dialog';
    this.contentWidth = intro
      ? TUTORIAL_PIXI_GEOMETRY.introContentWidth
      : TUTORIAL_PIXI_GEOMETRY.panelContentWidth;
    this.contentHeight = estimateLessonContentHeight(model, intro);
    const chrome = intro ? 44 : 21;
    this.outerWidth =
      this.contentWidth + (intro ? 44 : 24);
    this.outerHeight = this.contentHeight + chrome;
    this.title.setText(model.title ?? 'lesson');
    this.stepLabel.setText(model.stepLabel ?? '');
    this.copy
      .setFontSize(
        intro ? PIXI_UI_GEOMETRY.bodyFontSize : 12,
      )
      .setWrapWidth(this.contentWidth);
    this.setCopy(model.text ?? '');
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
      .setVisible(Boolean(model.advanceOnClick));
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

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    for (const label of [
      this.title,
      this.stepLabel,
      this.copy,
      this.progressLabel,
    ]) {
      label.applyTheme(this.theme);
    }
    this.showControl.applyTheme(this.theme);
    this.advanceControl.applyTheme(this.theme);
    this.progress.applyTheme(this.theme);
    this.redraw();
  }

  layout() {
    const intro = this.model.variant === 'intro-dialog';
    const paddingX = intro ? 20 : 12;
    const paddingTop = intro ? 20 : 9;
    this.title.position.set(8, -12);
    this.stepLabel.position.set(this.outerWidth - 8, -7);
    this.copy.position.set(paddingX, paddingTop);
    let y =
      paddingTop +
      Math.max(20, Math.min(this.copy.measuredHeight, this.contentHeight));
    if (this.progress.visible) {
      y += 5;
      this.progress.position.set(paddingX, y);
      this.progress.setSize(
        this.contentWidth,
        PIXI_UI_GEOMETRY.progressTotalHeight,
      );
      y += PIXI_UI_GEOMETRY.progressTotalHeight;
    }
    if (this.progressLabel.visible) {
      this.progressLabel.position.set(
        this.outerWidth - paddingX,
        y + 2,
      );
    }
    this.showControl.root.position.set(
      this.outerWidth / 2,
      this.outerHeight - 7,
    );
    this.advanceControl.root.position.set(
      this.outerWidth - (intro ? 20 : 8),
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
    this.shadow.clear();
    this.shadow.visible = intro;
    if (intro) {
      this.shadow
        .rect(
          PIXI_UI_GEOMETRY.dialogShadowX,
          PIXI_UI_GEOMETRY.dialogShadowY,
          this.outerWidth,
          this.outerHeight,
        )
        .fill({
          color: this.theme.dialogShadow,
          alpha: 0.72,
        });
    }
    this.frame
      .clear()
      .rect(0, 0, this.outerWidth, this.outerHeight)
      .fill(this.theme.surface)
      .stroke({
        color: this.theme.stroke,
        width: PIXI_UI_GEOMETRY.strongBorderWidth,
        alignment: 1,
      });
    this.titleBacking
      .clear()
      .rect(6, -11, this.title.measuredWidth + 5, 15)
      .fill(this.theme.surface);
  }

  destroy() {
    releaseRegistration(this.surfaceRegistration);
    this.progress.destroy({ children: true });
    this.showControl.destroy();
    this.advanceControl.destroy();
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
    revealTokens: normalizeIds(model?.revealTokens),
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

function estimateLessonContentHeight(model, intro) {
  const width = intro
    ? TUTORIAL_PIXI_GEOMETRY.introContentWidth
    : TUTORIAL_PIXI_GEOMETRY.panelContentWidth;
  const charsPerLine = Math.max(1, Math.floor(width / 6.4));
  const lines = String(model.text ?? '')
    .split('\n')
    .reduce(
      (total, line) =>
        total + Math.max(1, Math.ceil(line.length / charsPerLine)),
      0,
    );
  let height = Math.max(34, lines * 16, model.text ? 20 : 0);
  if (normalizeProgress(model.progress) !== null) {
    height += 5 + PIXI_UI_GEOMETRY.progressTotalHeight;
  }
  if (
    normalizeProgress(model.progress) !== null ||
    model.progressLabel
  ) {
    height += 16;
  }
  if (intro) {
    height += 18;
  }
  return Math.ceil(
    Math.max(
      intro
        ? TUTORIAL_PIXI_GEOMETRY.introMinContentHeight
        : TUTORIAL_PIXI_GEOMETRY.panelMinContentHeight,
      Math.min(
        intro
          ? TUTORIAL_PIXI_GEOMETRY.introMaxContentHeight
          : TUTORIAL_PIXI_GEOMETRY.panelMaxContentHeight,
        height,
      ),
    ),
  );
}

function normalizeProgress(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(1, number))
    : null;
}

function normalizeActionLabel(value) {
  const text = String(value ?? 'next').trim();
  return text || 'next';
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
