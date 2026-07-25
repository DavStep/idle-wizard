// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  PIXI_EXPERIENCE_SURFACE_IDS,
  PIXI_TUTORIAL_REVEAL_TOKENS,
  PixiExperienceFacade,
} from './PixiExperienceFacade.js';

describe('PixiExperienceFacade', () => {
  it('registers retained surfaces before initialization and persists intro completion', () => {
    const harness = createHarness();
    const complete = vi.fn();
    const facade = harness.createFacade({
      onFirstRunIntroComplete: complete,
    });

    expect([...harness.surfaceFactories.keys()]).toEqual(
      Object.values(PIXI_EXPERIENCE_SURFACE_IDS),
    );
    harness.materializeSurfaces();
    expect(harness.views.intro.preferredLayer).toBe(
      'interactionLocks',
    );
    expect(harness.views.tutorial.preferredLayer).toBe('tutorial');
    expect(harness.views.transient.preferredLayer).toBe('transient');

    facade.resetFirstRunIntroProgress();
    expect(facade.mount()).toBe(true);
    expect(harness.introPresenter.show).toHaveBeenCalledTimes(1);
    expect(harness.inputRouter.pushModal).toHaveBeenCalledWith(
      expect.objectContaining({
        id: PIXI_EXPERIENCE_SURFACE_IDS.intro,
        root: harness.views.intro.root,
      }),
    );

    harness.introCompletion();
    expect(complete).toHaveBeenCalledWith({ shown: true });
    expect(facade.firstRunProgressManager.isPending()).toBe(false);
    expect(harness.introModal.unregister).toHaveBeenCalledTimes(1);
  });

  it('routes semantic tutorial actions, stage APIs, reveal groups, and notification policy', () => {
    const logic = createTutorialLogic();
    const showPage = vi.fn();
    const policyListener = vi.fn();
    const harness = createHarness({
      workshopTasks: {
        canToggle: true,
        showToggle: true,
        expanded: false,
      },
    });
    const facade = harness.createFacade({
      tutorialLogicManager: logic,
      onShowPage: showPage,
    });
    facade.firstRunProgressManager.markComplete();
    harness.materializeSurfaces();
    facade.subscribeNotificationPolicy(policyListener);
    facade.mount();

    expect(
      harness.revealController.register.mock.calls.map(
        ([token]) => token,
      ),
    ).toEqual(PIXI_TUTORIAL_REVEAL_TOKENS);
    expect(policyListener).toHaveBeenLastCalledWith({
      active: true,
      allowedTutorialIds: ['task:demo'],
    });

    const firstModel =
      harness.views.tutorial.bind.mock.calls.at(-1)[0];
    expect(
      firstModel.actions.objectivePress({ source: 'show-me' }),
    ).toBe(true);
    expect(harness.activations).toContain('task.demo');

    expect(firstModel.actions.advance()).toBe(true);
    expect(logic.advanceActiveStep).toHaveBeenCalledTimes(1);
    expect(harness.activations).toContain('workshop.tasks');
    expect(showPage).toHaveBeenCalledWith('garden');

    expect(facade.listTutorialStages().ok).toBe(true);
    expect(facade.setTutorialStage('t02')).toMatchObject({
      ok: true,
      stage: 'intro-welcome',
    });
    expect(facade.resetTutorialProgress()).toBe(true);
  });

  it('owns one reward subscription and releases all active lifecycle work', () => {
    const harness = createHarness();
    const facade = harness.createFacade();
    facade.firstRunProgressManager.markComplete();
    harness.materializeSurfaces();

    expect(facade.mount()).toBe(true);
    expect(facade.mount()).toBe(false);
    expect(
      harness.gameplayFacade.subscribeRewardEvents,
    ).toHaveBeenCalledTimes(1);

    harness.rewardListener({
      id: 7,
      type: 'coin_collected',
      coin: 20,
    });
    expect(harness.views.transient.emitReward).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        message: 'collected 20 coin',
      }),
    );

    expect(facade.unmount()).toBe(true);
    expect(harness.rewardUnsubscribe).toHaveBeenCalledTimes(1);
    expect(harness.gameplayUnsubscribe).toHaveBeenCalledTimes(1);
    expect(harness.frameUnsubscribe).toHaveBeenCalledTimes(1);
    expect(harness.clearTimeoutFn).toHaveBeenCalled();
    expect(harness.revealUnregisters).toHaveLength(5);
    for (const unregister of harness.revealUnregisters) {
      expect(unregister).toHaveBeenCalledTimes(1);
    }
    expect(harness.views.tutorial.bind).toHaveBeenLastCalledWith({
      kind: 'hidden',
    });
  });
});

function createHarness({
  snapshot = createSnapshot(),
  workshopTasks = {
    canToggle: false,
    showToggle: false,
    expanded: false,
  },
} = {}) {
  const storage = createStorage();
  const surfaceFactories = new Map();
  const viewsById = new Map();
  const activations = [];
  const layers = createLayers();
  const registry = createRegistry({ layers, activations });
  const introModal = { unregister: vi.fn() };
  const inputRouter = {
    pushModal: vi.fn(() => introModal),
  };
  const introPresenter = {
    show: vi.fn(({ onComplete }) => {
      harness.introCompletion = onComplete;
      return true;
    }),
    hide: vi.fn(),
  };
  const revealUnregisters = [];
  const revealController = {
    register: vi.fn(() => {
      const unregister = vi.fn();
      revealUnregisters.push(unregister);
      return unregister;
    }),
  };
  const views = {
    intro: {
      root: createNode('firstRunIntro'),
      bind: vi.fn(),
    },
    tutorial: {
      root: createNode('tutorialOverlay'),
      bind: vi.fn(),
      setGuidePlacement: vi.fn(),
      isLessonPanelOpen: vi.fn(() => true),
      togglePanel: vi.fn(),
    },
    transient: {
      root: createNode('transientEffects'),
      emitReward: vi.fn(),
    },
  };
  const runtime = {
    initialized: true,
    semanticRegistry: registry,
    getGlobalSurface: vi.fn((id) => viewsById.get(id)),
    getOpenDialogIds: vi.fn(() => []),
    getPage: vi.fn((pageId) =>
      pageId === 'workshop'
        ? { tasks: { model: workshopTasks } }
        : null,
    ),
  };
  const renderFacade = {
    registerGlobalSurface: vi.fn(function register(id, factory) {
      surfaceFactories.set(id, factory);
      return this;
    }),
    getUiRuntime: vi.fn(() => runtime),
    getPixiLayers: vi.fn(() => layers),
    getInputRouter: vi.fn(() => inputRouter),
    getSpineRuntime: vi.fn(() => ({ id: 'shared-spine' })),
  };
  const gameplayUnsubscribe = vi.fn();
  const frameUnsubscribe = vi.fn();
  const rewardUnsubscribe = vi.fn();
  const gameplayFacade = {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn(() => gameplayUnsubscribe),
    subscribeFrameResources: vi.fn(() => frameUnsubscribe),
    subscribeRewardEvents: vi.fn((listener) => {
      harness.rewardListener = listener;
      return rewardUnsubscribe;
    }),
  };
  const timeoutHandle = { unref: vi.fn() };
  const setTimeoutFn = vi.fn(() => timeoutHandle);
  const clearTimeoutFn = vi.fn();
  const factories = {
    createIntroView: vi.fn(() => views.intro),
    createIntroPresenter: vi.fn(() => introPresenter),
    createRevealController: vi.fn(() => revealController),
    createTutorialOverlay: vi.fn(() => views.tutorial),
    createTransientEffects: vi.fn(() => views.transient),
  };
  const context = {
    application: { ticker: {} },
    assets: {},
    inputRouter,
    semanticRegistry: registry,
    counters: {},
    layers,
    theme: () => ({}),
  };
  const harness = {
    activations,
    clearTimeoutFn,
    createFacade: (options = {}) =>
      new PixiExperienceFacade({
        renderFacade,
        gameplayFacade,
        storage,
        factories,
        setTimeoutFn,
        clearTimeoutFn,
        ...options,
      }),
    frameUnsubscribe,
    gameplayFacade,
    gameplayUnsubscribe,
    inputRouter,
    introCompletion: () => {},
    introModal,
    introPresenter,
    materializeSurfaces() {
      for (const [id, factory] of surfaceFactories) {
        viewsById.set(id, factory(context));
      }
    },
    revealController,
    revealUnregisters,
    rewardListener: () => {},
    rewardUnsubscribe,
    surfaceFactories,
    views,
  };
  return harness;
}

function createTutorialLogic() {
  return {
    activeStep: null,
    reminderManager: {
      discardActivePrompt: vi.fn(),
    },
    getViewState: vi.fn(() => ({
      kind: 'lesson',
      revealTokens: ['top', 'rooms', 'mana', 'summon', 'tasks'],
      step: {
        id: 'semantic-demo',
        targetId: 'task:demo',
        highlightTargetIds: [],
        advanceOnClick: true,
        advanceAction: 'expand-workshop-tasks',
        advancePageId: 'garden',
        cueMode: 'active',
      },
      lesson: {
        id: 'semantic-demo',
        title: 'lesson',
        text: 'finish the request.',
        autoOpen: true,
        advanceOnClick: true,
      },
      cue: { kind: 'none' },
      nextRefreshAt: null,
    })),
    advanceActiveStep: vi.fn(() => true),
    clearAutoAdvanceTimer: vi.fn(),
    resetProgress: vi.fn(),
  };
}

function createRegistry({ layers, activations }) {
  const definitions = new Map();
  const tutorialDefinitions = new Map();
  const topRoot = createNode('topPanel', layers.globalChrome);
  const bottomRoot = createNode('bottomPanel', layers.globalChrome);
  const mana = createNode('topPanel:mana', topRoot);
  const room = createNode('bottomPanel:workshop', bottomRoot);
  const summon = createNode('workshop:summon');
  const tasks = createNode('workshop:tasks');
  const task = createNode('workshop:task:demo');

  register('top.mana', 'top:mana', mana);
  register('page.workshop', 'page:workshop', room);
  register(
    'workshop.summon',
    'workshop:summonSeed',
    summon,
  );
  register('workshop.tasks', 'workshop:tasks', tasks);
  register('task.demo', 'task:demo', task);

  function register(semanticId, tutorialId, displayObject) {
    const definition = {
      semanticId,
      tutorialId,
      displayObject,
      state: {
        active: true,
        enabled: true,
        interactive: true,
        visible: true,
      },
      activate: () => {
        activations.push(semanticId);
        return true;
      },
    };
    definitions.set(semanticId, definition);
    tutorialDefinitions.set(tutorialId, definition);
  }

  return {
    get: (id) => definitions.get(id) ?? null,
    getTutorialTarget: (id) =>
      tutorialDefinitions.get(id) ?? null,
    resolve: (id) => ({ ...definitions.get(id) }),
    activate: (id, payload) => {
      const definition = definitions.get(id);
      return definition?.activate?.(payload) ?? false;
    },
  };
}

function createLayers() {
  return {
    globalChrome: createNode('globalChrome'),
  };
}

function createNode(label, parent = null) {
  const node = {
    label,
    parent,
    children: [],
    visible: true,
    renderable: true,
    eventMode: 'static',
  };
  parent?.children.push(node);
  return node;
}

function createSnapshot() {
  return {
    tasks: {
      currentLevel: 0,
      level: {
        tasks: [],
      },
    },
  };
}

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}
