// @vitest-environment jsdom

import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  createTutorialPixiViewModel,
  TutorialPixiOverlay,
} from './TutorialPixiOverlay.js';
import {
  projectSemanticBoundsToSource,
  resolveTutorialPointerPlacement,
} from './TutorialPixiGeometry.js';
import { TutorialRevealController } from './TutorialRevealController.js';
import { TutorialPointerSpine } from './TutorialPointerSpine.js';

installPixiPageTestCanvas();

describe('TutorialPixiOverlay', () => {
  it('adapts facade state to semantic targets and retained guide visuals', () => {
    const registry = createRegistry();
    const actions = {
      advance: vi.fn(),
      objectivePress: vi.fn(),
      lessonPanelClose: vi.fn(),
    };
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      semanticRegistry: registry,
      reducedMotion: true,
    });
    const children = [...overlay.root.children];

    overlay.activate();
    overlay.bind(
      createTutorialPixiViewModel(
        {
          kind: 'lesson',
          revealTokens: ['top', 'mana'],
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

  it('restores room reveal groups when a blocker hides the tutorial surface', () => {
    const revealController = {
      apply: vi.fn(),
      restore: vi.fn(),
    };
    const overlay = new TutorialPixiOverlay({
      assets: createAssets(),
      revealController,
      reducedMotion: true,
    });
    overlay.activate();
    overlay.bind({
      kind: 'lesson',
      revealTokens: [],
      step: { id: 'intro', highlightTargetIds: [] },
      lesson: {
        id: 'intro',
        text: 'Let’s get the workshop running.',
        autoOpen: true,
      },
      cue: { kind: 'none' },
    });

    expect(revealController.apply).toHaveBeenCalledWith([], {
      reducedMotion: true,
    });

    overlay.bind({
      kind: 'blocked',
      revealTokens: [],
      step: { id: 'intro', highlightTargetIds: [] },
      lesson: null,
      cue: { kind: 'none' },
    });

    expect(overlay.root.visible).toBe(false);
    expect(revealController.restore).toHaveBeenCalledTimes(1);
  });
});

describe('TutorialRevealController', () => {
  it('reveals explicit Pixi groups and restores captured state', () => {
    const ticker = createTicker();
    const root = new Container();
    root.eventMode = 'static';
    root.position.set(0, 12);
    const reveal = new TutorialRevealController({ ticker });
    reveal.register('mana', { objects: [root] });

    expect(root.visible).toBe(true);
    reveal.activate();
    reveal.apply(['mana']);
    expect(root.visible).toBe(true);
    expect(root.alpha).toBe(0);
    ticker.tick(220);
    expect(root.alpha).toBe(1);
    expect(root.y).toBe(12);

    reveal.restore();
    expect(root.visible).toBe(true);
    expect(root.eventMode).toBe('static');
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
    getTexture: () => Texture.EMPTY,
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
