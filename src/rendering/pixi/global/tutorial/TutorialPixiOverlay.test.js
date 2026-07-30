// @vitest-environment jsdom

import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import {
  createTutorialPixiViewModel,
  TutorialPixiOverlay,
} from './TutorialPixiOverlay.js';
import {
  projectSemanticBoundsToSource,
  resolveTutorialPointerPlacement,
  TUTORIAL_PIXI_GEOMETRY,
} from './TutorialPixiGeometry.js';
import {
  TUTORIAL_POINTER_DRAG_TIMING,
  TutorialPointerSpine,
} from './TutorialPointerSpine.js';

installPixiPageTestCanvas();

describe('TutorialPixiOverlay', () => {
  it('proxies pointer-guided taps to the current semantic target', () => {
    const registry = new SemanticTargetRegistry();
    const target = new Container();
    target.visible = true;
    target.renderable = true;
    target.eventMode = 'static';
    target.getBounds = () => ({
      x: 60,
      y: 300,
      width: 90,
      height: 60,
    });
    const activate = vi.fn(() => true);
    registry.register({
      semanticId: 'shop.stall.1',
      tutorialId: 'shop:stand:1',
      displayObject: target,
      state: () => ({
        enabled: true,
        interactive: true,
        visible: true,
        tutorialPointerGesture: {
          kind: 'horizontal-drag',
          travelX: 30,
        },
      }),
      activate,
    });
    const pressRegistrations = [];
    const inputRouter = {
      registerPressTarget: vi.fn((displayObjectOrDescriptor, descriptor) => {
        const registration =
          descriptor ??
          displayObjectOrDescriptor;
        const release = vi.fn();
        release.unregister = release;
        release.update = vi.fn();
        pressRegistrations.push({ registration, release });
        return release;
      }),
      registerDragSource: vi.fn(() => {
        const release = vi.fn();
        release.unregister = release;
        return release;
      }),
    };
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      inputRouter,
      semanticRegistry: registry,
      reducedMotion: true,
    });

    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      step: {
        id: 'select-market-stand',
        targetId: 'shop:stand:1',
      },
      lesson: {
        id: 'select-market-stand',
        text: 'open the first stall',
      },
      cue: {
        kind: 'target-cue',
        targetId: 'shop:stand:1',
        showPointer: true,
      },
    });

    const proxy = pressRegistrations.find(
      ({ registration }) =>
        registration.id === 'tutorial.target.proxy',
    );
    expect(proxy?.registration).toMatchObject({
      displayObject: target,
      fallbackHitTest: true,
      priority: 1000,
    });
    expect(proxy?.registration.enabled()).toBe(true);
    expect(proxy?.registration.onActivate({ source: 'pointer' })).toBe(true);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(overlay.pointer.gesture).toEqual({
      kind: 'horizontal-drag',
      travelX: 30,
    });

    overlay.bind({
      kind: 'quest',
      step: null,
      lesson: null,
      cue: { kind: 'none' },
    });
    expect(proxy?.release).toHaveBeenCalledTimes(1);

    overlay.destroy();
  });

  it('adapts facade state to semantic targets and retained guide visuals', () => {
    const registry = createRegistry();
    const assets = createAssets();
    const actions = {
      advance: vi.fn(),
      objectivePress: vi.fn(),
      lessonPanelClose: vi.fn(),
    };
    const overlay = new TutorialPixiOverlay({
      assets,
      semanticRegistry: registry,
      reducedMotion: true,
    });
    const children = [...overlay.root.children];

    overlay.activate();
    overlay.bind(
      createTutorialPixiViewModel(
        {
          kind: 'lesson',
          step: {
            id: 'mana-intro',
            targetId: 'top:mana',
            highlightTargetIds: ['top:mana'],
          },
          lesson: {
            id: 'mana-intro',
            title: 'lesson',
            text: 'mana refills over time.',
            autoOpen: true,
            advanceOnClick: true,
            canShowTarget: true,
            progress: 0.5,
            progressLabel: '1/2',
          },
          cue: {
            kind: 'target-cue',
            showPointer: true,
            emphasizeTarget: false,
          },
        },
        { actions },
      ),
    );

    expect(overlay.root.visible).toBe(true);
    expect(overlay.surface.copy.text).toBe(
      'mana refills over time.',
    );
    expect(overlay.surface.visualTheme).toMatchObject({
      surface: '#ffe7c8',
      activeSurface: '#f3d4ad',
      text: '#634934',
      muted: '#725737',
    });
    expect(overlay.surface.copy.textObject.style.fill).toBe(
      '#634934',
    );
    expect(
      overlay.surface.advanceControl.variant,
    ).toBe('yellow');
    expect(
      overlay.surface.advanceControl.textLabel.textObject.style.fill,
    ).toBe('#ffffff');
    expect(overlay.surface.advanceControl.textLabel.text).toBe('Next');
    expect(overlay.surface.advanceControl.x).toBeGreaterThanOrEqual(0);
    expect(overlay.surface.advanceControl.y).toBeGreaterThanOrEqual(0);
    expect(
      overlay.surface.advanceControl.x +
        overlay.surface.advanceControl.buttonWidth,
    ).toBeLessThanOrEqual(overlay.surface.outerWidth);
    expect(
      overlay.surface.advanceControl.y +
        overlay.surface.advanceControl.buttonHeight,
    ).toBeLessThanOrEqual(overlay.surface.outerHeight);
    expect(
      overlay.surface.progress.width,
    ).toBeLessThan(overlay.surface.contentWidth);
    expect(
      overlay.surface.advanceControl.x -
        (overlay.surface.progress.x +
          overlay.surface.progress.barWidth),
    ).toBe(6);
    expect(
      overlay.surface.advanceControl.y +
        overlay.surface.advanceControl.buttonHeight / 2,
    ).toBe(
      overlay.surface.progress.y +
        overlay.surface.progress.barHeight / 2,
    );
    expect(overlay.guideLabelButton.variant).toBe('brown-light');
    expect(overlay.guideLabel.text).toBe('Hide');
    expect(overlay.guideLabel.textObject.style.fill).toBe('#ffffff');
    expect(overlay.guideLabel.textObject.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(
        overlay.guideLabel.fontSize,
      ),
    });
    expect(assets.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.researchCard,
    );
    expect(overlay.surface.frame.visible).toBe(true);
    expect(overlay.surface.title.position).toMatchObject({
      x: 12,
      y: 9,
    });
    expect(overlay.surface.stepLabel.visible).toBe(false);
    expect(overlay.backdrop.visible).toBe(true);
    expect(overlay.pointer.root.visible).toBe(true);
    expect(overlay.root.children).toEqual(children);
    expect(overlay.model.lesson.dimBackdrop).toBe(true);
    expect(overlay.isLessonPanelOpen()).toBe(true);
    expect(overlay.surface.progress).toMatchObject({
      tone: 'root',
      barHeight: 10,
      end: 0.5,
    });
    overlay.surface.advanceControl.activate();
    expect(actions.advance).toHaveBeenCalledTimes(1);

    overlay.setGuidePlacement({ buttonLeft: 52, buttonTop: 204 });
    expect(overlay.manualPlacement).toEqual({
      buttonLeft: 52,
      buttonTop: 204,
    });

    overlay.togglePanel();
    expect(overlay.surface.root.visible).toBe(false);
    expect(overlay.isLessonPanelOpen()).toBe(false);
    expect(actions.lessonPanelClose).toHaveBeenCalledTimes(1);
  });

  it('starts every tutorial advance label with a capital letter', () => {
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      reducedMotion: true,
    });
    overlay.activate();

    for (const [advanceLabel, expected] of [
      ['next', 'Next'],
      ['continue', 'Continue'],
      ['show', 'Show'],
      ['enter workshop', 'Enter workshop'],
    ]) {
      overlay.bind({
        kind: 'lesson',
        step: { id: advanceLabel, highlightTargetIds: [] },
        lesson: {
          id: advanceLabel,
          text: 'Advance label check.',
          autoOpen: true,
          advanceOnClick: true,
          advanceLabel,
          progress: 0.5,
        },
        cue: { kind: 'none' },
      });

      expect(overlay.surface.advanceControl.textLabel.text).toBe(
        expected,
      );
    }
  });

  it('keeps collapsed drag yells close to Elara with outlined white text', () => {
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      reducedMotion: true,
    });
    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      step: { id: 'drag-yell', highlightTargetIds: [] },
      lesson: {
        id: 'drag-yell',
        text: 'Drag Elara.',
        autoOpen: false,
      },
      cue: { kind: 'none' },
    });

    expect(overlay.panelOpen).toBe(false);
    expect(overlay.guideLabel.text).toBe('Help');
    expect(overlay.dragYell.position).toMatchObject({
      x: TUTORIAL_PIXI_GEOMETRY.guideWidth / 2,
      y: 34,
    });
    expect(overlay.dragYell.textObject.style.fill).toBe('#ffffff');
    expect(overlay.dragYell.textObject.style.stroke).toMatchObject({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(overlay.dragYell.fontSize),
    });

    overlay.startGuideDrag();
    expect(overlay.dragYell.alpha).toBe(1);
    expect(overlay.dragYell.text).toBe('AAAAAA!!!');

    overlay.finishGuideDrag();
    overlay.destroy();
  });

  it('anchors Elara attention to the visible Help button', () => {
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      reducedMotion: true,
    });
    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      step: { id: 'attention', highlightTargetIds: [] },
      lesson: {
        id: 'attention',
        text: 'Ask Elara for help.',
        attention: true,
        autoOpen: false,
      },
      cue: { kind: 'none' },
    });

    const badgeRadius = overlay.attentionBadge.sprite.width / 2;
    expect(overlay.attentionDot.visible).toBe(true);
    expect(overlay.attentionDot.position).toMatchObject({
      x:
        overlay.guideLabelButton.x +
        overlay.guideLabelButton.buttonWidth -
        badgeRadius,
      y: overlay.guideLabelButton.y + badgeRadius,
    });

    overlay.destroy();
  });

  it('renders the intro with the shared blocking dialog shell', () => {
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      reducedMotion: true,
    });
    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      step: { id: 'intro', highlightTargetIds: [] },
      lesson: {
        id: 'intro',
        text: 'Welcome to the workshop.',
        variant: 'intro-dialog',
        autoOpen: true,
      },
      cue: { kind: 'none' },
    });

    expect(overlay.surface.visualTheme.surface).toBe(
      '#ffe7c8',
    );
    expect(overlay.surface.copy.textObject.style.fill).toBe(
      '#634934',
    );
    expect(overlay.surface.introDialog).toBeInstanceOf(
      PixiDialogFrame,
    );
    expect(overlay.surface.introDialog.titleLabel.text).toBe(
      'lesson',
    );
    expect(
      overlay.surface.introDialog.closeControl.visible,
    ).toBe(false);
    expect(overlay.surface.frame.visible).toBe(false);
    expect(overlay.surface.introDialog.visible).toBe(true);
    expect(overlay.surface.title.visible).toBe(false);
    expect(
      overlay.surface.outerHeight -
        (overlay.surface.advanceControl.y +
          overlay.surface.advanceControl.buttonHeight),
    ).toBe(20);
  });

  it('sizes intro dialogs from visible content and omits null progress', () => {
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      reducedMotion: true,
    });
    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      step: { id: 'intro-market', highlightTargetIds: [] },
      lesson: {
        id: 'intro-market',
        title: 'Market Opened',
        text:
          'The front room is cleared out.\n\nFirst, summon sage seeds again. Then sell one in market.',
        progress: null,
        variant: 'intro-dialog',
        autoOpen: true,
        advanceOnClick: true,
        advanceLabel: 'continue',
      },
      cue: { kind: 'none' },
    });

    expect(overlay.surface.progress.visible).toBe(false);
    expect(overlay.surface.progressLabel.visible).toBe(false);
    expect(overlay.surface.outerHeight).toBeLessThan(136);
    expect(
      overlay.surface.outerHeight -
        (overlay.surface.advanceControl.y +
          overlay.surface.advanceControl.buttonHeight),
    ).toBe(20);
  });

  it('sizes ordinary lesson panels from their visible content', () => {
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      reducedMotion: true,
    });
    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      step: { id: 'short-objective', highlightTargetIds: [] },
      lesson: {
        id: 'short-objective',
        title: 'Lesson 5: Brewing',
        text: 'Open Recipes',
        autoOpen: true,
      },
      cue: { kind: 'none' },
    });

    const shortHeight = overlay.surface.outerHeight;
    expect(shortHeight).toBe(
      TUTORIAL_PIXI_GEOMETRY.panelMinContentHeight + 21,
    );

    overlay.bind({
      kind: 'lesson',
      step: { id: 'progress-objective', highlightTargetIds: [] },
      lesson: {
        id: 'progress-objective',
        title: 'Lesson 5: Brewing',
        text: 'Fill The Cauldron Again',
        progress: 1,
        progressLabel: '3/3 Sage',
        autoOpen: true,
      },
      cue: { kind: 'none' },
    });

    expect(overlay.surface.outerHeight).toBeGreaterThan(shortHeight);
    expect(overlay.surface.outerHeight).toBeLessThan(
      TUTORIAL_PIXI_GEOMETRY.panelDefaultOuterHeight,
    );
  });

  it('animates lesson height changes in both directions and snaps for reduced motion', () => {
    const ticker = createTicker();
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      application: { ticker },
    });
    overlay.activate();
    overlay.bind(createIntroLesson('short', 'A short lesson.'));
    const shortHeight = overlay.surface.outerHeight;

    overlay.bind(
      createIntroLesson(
        'long',
        'A much longer lesson that wraps across several lines so the shared dialog needs more room before the player can continue.',
      ),
    );
    const growingStartHeight = overlay.surface.outerHeight;
    expect(growingStartHeight).toBe(shortHeight);
    expect(overlay.surface.hasActiveResize()).toBe(true);

    ticker.tick(TUTORIAL_PIXI_GEOMETRY.panelResizeMs / 2);
    const growingMidHeight = overlay.surface.outerHeight;
    expect(growingMidHeight).toBeGreaterThan(growingStartHeight);

    ticker.tick(TUTORIAL_PIXI_GEOMETRY.panelResizeMs);
    const longHeight = overlay.surface.outerHeight;
    expect(longHeight).toBeGreaterThan(growingMidHeight);
    expect(overlay.surface.hasActiveResize()).toBe(false);

    overlay.bind(createIntroLesson('short-again', 'Short again.'));
    expect(overlay.surface.outerHeight).toBe(longHeight);
    ticker.tick(TUTORIAL_PIXI_GEOMETRY.panelResizeMs / 2);
    expect(overlay.surface.outerHeight).toBeLessThan(longHeight);
    ticker.tick(TUTORIAL_PIXI_GEOMETRY.panelResizeMs);
    expect(overlay.surface.outerHeight).toBeLessThan(longHeight);

    const reduced = new TutorialPixiOverlay({
      assets: createAssets(),
      application: { ticker: createTicker() },
      reducedMotion: true,
    });
    reduced.activate();
    reduced.bind(createIntroLesson('reduced-short', 'Short.'));
    const reducedShortHeight = reduced.surface.outerHeight;
    reduced.bind(
      createIntroLesson(
        'reduced-long',
        'A longer reduced-motion lesson that needs another wrapped line.',
      ),
    );
    expect(reduced.surface.outerHeight).toBeGreaterThan(
      reducedShortHeight,
    );
    expect(reduced.surface.hasActiveResize()).toBe(false);
  });

  it('typewrites each exact step/copy pair once and stops idle ticker work', () => {
    const ticker = createTicker();
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      application: { ticker },
    });
    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      step: { id: 'copy', highlightTargetIds: [] },
      lesson: {
        id: 'copy',
        text: 'abcd',
        autoOpen: true,
      },
      cue: { kind: 'none' },
    });

    expect(overlay.surface.copy.text).toBe('');
    ticker.tick(12);
    expect(overlay.surface.copy.text).toBe('ab');
    ticker.tick(12);
    expect(overlay.surface.copy.text).toBe('abcd');
    expect(ticker.handlers.size).toBe(0);

    overlay.bind({
      kind: 'lesson',
      step: { id: 'copy', highlightTargetIds: [] },
      lesson: {
        id: 'copy',
        text: 'abcd',
        autoOpen: true,
        forceOpen: true,
      },
      cue: { kind: 'none' },
    });
    expect(overlay.surface.copy.text).toBe('abcd');
    expect(ticker.handlers.size).toBe(0);
  });

  it('sizes from final copy so typewriting widens without changing height', () => {
    const ticker = createTicker();
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      application: { ticker },
    });
    const copy =
      'Summon seeds and sell one for the market task';

    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      step: { id: 'wide-copy', highlightTargetIds: [] },
      lesson: {
        id: 'wide-copy',
        text: copy,
        autoOpen: true,
      },
      cue: { kind: 'none' },
    });

    const initialSize = {
      width: overlay.surface.outerWidth,
      height: overlay.surface.outerHeight,
    };

    expect(overlay.surface.copy.text).toBe('');
    expect(initialSize.width).toBeGreaterThan(
      TUTORIAL_PIXI_GEOMETRY.panelOuterWidth,
    );
    expect(initialSize.width).toBeLessThanOrEqual(278);

    ticker.tick(12);
    expect(overlay.surface.copy.text).toBe('Su');
    expect(overlay.surface.outerWidth).toBe(initialSize.width);
    expect(overlay.surface.outerHeight).toBe(initialSize.height);

    ticker.tick(copy.length * 12);
    expect(overlay.surface.copy.text).toBe(copy);
    expect(overlay.surface.outerWidth).toBe(initialSize.width);
    expect(overlay.surface.outerHeight).toBe(initialSize.height);
  });

  it('keeps guidance hidden while a real blocker owns the screen', () => {
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      reducedMotion: true,
    });
    overlay.activate();
    overlay.bind({
      kind: 'blocked',
      step: { id: 'intro', highlightTargetIds: [] },
      lesson: null,
      cue: { kind: 'none' },
    });

    expect(overlay.root.visible).toBe(false);
    expect(overlay.root.eventMode).toBe('none');
  });
});

describe('tutorial Pixi geometry', () => {
  it('projects authored semantic bounds and keeps pointer candidates on-screen', () => {
    expect(
      projectSemanticBoundsToSource(
        { x: 60, y: 300, width: 90, height: 60 },
        { sourceScale: 3, authoredOffsetX: 30 },
      ),
    ).toMatchObject({
      x: 10,
      y: 100,
      width: 30,
      height: 20,
    });
    const placement = resolveTutorialPointerPlacement({
      targetRect: { x: 0, y: 0, width: 20, height: 20 },
      bounds: { x: 0, y: 0, width: 360, height: 723.33 },
    });
    expect(placement.x).toBeGreaterThan(0);
    expect(placement.y).toBeGreaterThan(0);
  });
});

describe('TutorialPointerSpine', () => {
  it('uses the shared tree with manual active-only updates', async () => {
    const skeleton = new Container();
    skeleton.state = {
      timeScale: 1,
      setAnimation: vi.fn(),
    };
    skeleton.update = vi.fn();
    skeleton.getBounds = () => ({
      x: 0,
      y: 0,
      width: 20,
      height: 30,
    });
    const spineRuntime = {
      loadSkeleton: vi.fn(async () => ({})),
      createSkeleton: vi.fn(async () => skeleton),
    };
    const pointer = new TutorialPointerSpine({ spineRuntime });

    await pointer.whenReady();
    expect(spineRuntime.createSkeleton).toHaveBeenCalledWith(
      expect.objectContaining({
        layer: null,
        autoUpdate: false,
      }),
    );
    expect(skeleton.parent).toBe(pointer.root);
    pointer.setVisible(true);
    pointer.update(16);
    expect(skeleton.update).toHaveBeenCalledWith(0.016);

    pointer.setMotionEnabled(false);
    pointer.update(16);
    expect(skeleton.update).toHaveBeenCalledTimes(2);
    expect(skeleton.state.timeScale).toBe(0);
  });

  it('presses, holds, drags right, releases, hides, and repeats after two seconds', async () => {
    const skeleton = new Container();
    skeleton.state = {
      timeScale: 1,
      setAnimation: vi.fn(),
    };
    skeleton.update = vi.fn();
    skeleton.getBounds = () => ({
      x: 0,
      y: 0,
      width: 20,
      height: 30,
    });
    const spineRuntime = {
      loadSkeleton: vi.fn(async () => ({})),
      createSkeleton: vi.fn(async () => skeleton),
    };
    const pointer = new TutorialPointerSpine({ spineRuntime });
    const timing = TUTORIAL_POINTER_DRAG_TIMING;
    const baseX = 94;

    pointer.setPlacement({
      id: 'bottom-right',
      x: 100,
      y: 100,
    });
    pointer.setGesture({
      kind: 'horizontal-drag',
      travelX: 40,
    });
    pointer.setVisible(true);
    await pointer.whenReady();

    pointer.update(timing.appearMs + timing.pressMs);
    expect(pointer.root.visible).toBe(true);
    expect(pointer.root.x).toBe(baseX);

    pointer.update(timing.holdMs + timing.dragMs / 2);
    expect(pointer.root.x).toBeGreaterThan(baseX);
    expect(pointer.root.x).toBeLessThan(baseX + 40);
    expect(skeleton.state.timeScale).toBe(0);

    pointer.update(timing.dragMs / 2);
    expect(pointer.root.x).toBe(baseX + 40);

    pointer.update(timing.releaseMs / 2);
    expect(skeleton.state.timeScale).toBe(1);
    expect(pointer.root.visible).toBe(true);

    pointer.update(timing.releaseMs / 2 + timing.hideMs);
    expect(pointer.root.visible).toBe(false);

    pointer.update(timing.repeatDelayMs - 1);
    expect(pointer.root.visible).toBe(false);

    pointer.update(2);
    expect(pointer.root.visible).toBe(true);
    expect(pointer.root.x).toBe(baseX);
    expect(skeleton.state.setAnimation).toHaveBeenLastCalledWith(
      0,
      'click1',
      false,
    );

    pointer.setGesture(null);
    expect(skeleton.state.setAnimation).toHaveBeenLastCalledWith(
      0,
      'click1',
      true,
    );
  });
});

function createRegistry() {
  const registry = new SemanticTargetRegistry();
  const target = new Container();
  target.visible = true;
  target.renderable = true;
  target.eventMode = 'static';
  target.getBounds = () => ({
    x: 60,
    y: 300,
    width: 90,
    height: 60,
  });
  registry.register({
    semanticId: 'top.mana',
    tutorialId: 'top:mana',
    displayObject: target,
  });
  return registry;
}

function createAssets() {
  return {
    loaded: true,
    getTexture: vi.fn(() => Texture.EMPTY),
  };
}

function createIntroLesson(id, text) {
  return {
    kind: 'lesson',
    step: { id, highlightTargetIds: [] },
    lesson: {
      id,
      title: 'Lesson',
      text,
      progress: null,
      variant: 'intro-dialog',
      autoOpen: true,
      advanceOnClick: true,
      advanceLabel: 'continue',
    },
    cue: { kind: 'none' },
  };
}

function createTicker() {
  const handlers = new Set();
  return {
    handlers,
    add: (handler) => handlers.add(handler),
    remove: (handler) => handlers.delete(handler),
    tick(deltaMS) {
      for (const handler of [...handlers]) {
        handler({ deltaMS });
      }
    },
  };
}
