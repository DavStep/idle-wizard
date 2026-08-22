// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { TutorialCaptureFacade } from './TutorialCaptureFacade.js';

describe('TutorialCaptureFacade', () => {
  it('keeps pre-game capture state readable before gameplay entities initialize', () => {
    const facade = new TutorialCaptureFacade({
      app: {
        gameplayFacade: {
          getSnapshot: () => {
            throw new Error('Mana entity has not been initialized.');
          },
        },
      },
    });

    expect(facade.getState().snapshot).toEqual({
      level: null,
      page: null,
      mana: null,
      coin: null,
      tasks: null,
      inventory: [],
      seeds: [],
      herbs: [],
      research: [],
    });
  });

  it('detects and starts the fresh-start dialog outside the gameplay stage', () => {
    const stage = document.createElement('section');
    const root = document.createElement('section');
    const freshDialog = document.createElement('section');
    const freshButton = document.createElement('button');
    const resolve = vi.fn();
    const clickHandler = vi.fn();

    freshDialog.className = 'app-fresh-start-choice';
    freshButton.className = 'app-fresh-start-choice__button--fresh';
    freshButton.type = 'button';
    freshButton.textContent = 'start new';
    freshButton.addEventListener('click', clickHandler);
    freshDialog.append(freshButton);
    root.append(stage, freshDialog);
    document.body.append(root);

    const facade = new TutorialCaptureFacade({
      app: {
        viewportFacade: {
          getStageElement: () => stage,
        },
        lifecycleManager: {
          freshStartChoiceManager: {
            root: freshDialog,
            refs: {
              freshButton,
            },
            resolve,
            resolveChoice: true,
          },
        },
      },
    });

    expect(facade.getState().freshStartVisible).toBe(true);
    expect(facade.startFresh()).toMatchObject({ ok: true });
    expect(resolve).toHaveBeenCalledWith('start_fresh');
    expect(facade.clickSelector('.app-fresh-start-choice__button--fresh')).toMatchObject({
      ok: true,
    });
    expect(clickHandler).toHaveBeenCalledTimes(2);

    root.remove();
  });

  it('starts the production Pixi fresh-start choice through its controller', () => {
    let choosing = true;
    const resolve = vi.fn((choice) => {
      choosing = false;
      return choice === 'start_fresh';
    });
    const refresh = vi.fn();
    const facade = new TutorialCaptureFacade({
      app: {
        lifecycleManager: {
          freshStartChoiceManager: {
            isChoosing: () => choosing,
            resolve,
          },
        },
        pagesFacade: {
          tutorialFacade: {
            refresh,
          },
        },
      },
    });

    expect(facade.getState().freshStartVisible).toBe(true);
    expect(facade.startFresh()).toMatchObject({
      ok: true,
      hidden: true,
      hasResolver: true,
    });
    expect(resolve).toHaveBeenCalledWith('start_fresh');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('drives the retained Pixi intro, lesson panel, and semantic targets', () => {
    const introAdvance = vi.fn(() => true);
    const advanceTutorial = vi.fn(() => true);
    const refresh = vi.fn();
    const activate = vi.fn(() => true);
    const overlay = {
      panelOpen: false,
      model: {
        kind: 'lesson',
        lesson: {
          text: 'Use mana to summon seeds.',
          advanceOnClick: false,
        },
        cue: {
          kind: 'target-cue',
          showPointer: true,
        },
      },
      isLessonPanelOpen() {
        return this.panelOpen;
      },
      togglePanel() {
        this.panelOpen = !this.panelOpen;
        return true;
      },
    };
    const semanticTarget = {
      semanticId: 'workshop.summon',
      bounds: { x: 10, y: 20, width: 30, height: 40 },
      state: { visible: true, active: true, enabled: true },
    };
    const experienceFacade = {
      introInProgress: true,
      introPresenter: {
        index: 0,
        steps: [{ id: 'castle' }],
        advance: introAdvance,
      },
      activeTutorialStep: {
        id: 'first-summon-seed',
        kind: 'prompt',
        targetId: 'workshop:summonSeed',
      },
      tutorialOverlay: overlay,
      tutorialProgressManager: {
        completedStepIds: new Set(['intro-welcome']),
      },
      tutorialRuntimeState: {
        getOpenDialogIds: () => [],
        isTasksExpanded: () => true,
      },
      semanticRegistry: {
        targets: new Map([['workshop.summon', semanticTarget]]),
        activate,
      },
      resolveTarget: vi.fn(() => semanticTarget),
      advanceTutorial,
      refresh,
    };
    const facade = new TutorialCaptureFacade({
      app: {
        experienceFacade,
        pagesFacade: {
          getCurrentPageId: () => 'workshop',
        },
      },
    });

    expect(facade.getState()).toMatchObject({
      firstRunIntroVisible: true,
      firstRunIntroStepId: 'castle',
      lessonOpen: false,
      lessonText: 'Use mana to summon seeds.',
      pointerVisible: true,
      completedStepIds: ['intro-welcome'],
      tasksExpanded: true,
    });
    expect(facade.advanceFirstRunIntro()).toMatchObject({ ok: true });
    expect(facade.openLessonPanel()).toMatchObject({ lessonOpen: true });
    expect(facade.closeLessonPanel()).toMatchObject({ lessonOpen: false });
    expect(facade.advanceTutorial()).toMatchObject({ ok: true });
    expect(facade.clickTarget('workshop:summonSeed')).toMatchObject({
      ok: true,
      semanticId: 'workshop.summon',
    });
    expect(facade.getTargetState('workshop:summonSeed')).toMatchObject({
      ok: true,
      measurable: true,
      rect: { left: 10, top: 20, width: 30, height: 40 },
    });
    expect(introAdvance).toHaveBeenCalledTimes(1);
    expect(advanceTutorial).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledWith('workshop.summon', {
      source: 'tutorial-capture',
    });
  });

  it('accepts already completed task completion after fill finishes the task', () => {
    const publishAndSaveSnapshot = vi.fn();
    const refresh = vi.fn();
    const facade = new TutorialCaptureFacade({
      app: {
        gameplayFacade: {
          itemsFacade: {
            getItemDefinitionByKey: () => ({ id: 1, key: 'sageSeed' }),
            addItem: vi.fn(),
          },
          tasksFacade: {
            fillTask: vi.fn(() => ({ ok: true })),
            completeTask: vi.fn(() => ({ ok: false, reason: 'already_completed' })),
          },
          publishAndSaveSnapshot,
        },
        pagesFacade: {
          tutorialFacade: {
            refresh,
          },
        },
      },
    });

    expect(facade.completeTaskWithItems('level2-turn-in-sage-seed', 'sageSeed', 1)).toMatchObject({
      ok: true,
    });
    expect(publishAndSaveSnapshot).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('accepts duplicate task action records when the matching task is already complete', () => {
    const publishAndSaveSnapshot = vi.fn();
    const refresh = vi.fn();
    const facade = new TutorialCaptureFacade({
      app: {
        gameplayFacade: {
          getSnapshot: () => ({
            tasks: {
              level: {
                tasks: [
                  {
                    type: 'research',
                    researchId: 'unlockSeed:mintSeed',
                    completed: true,
                  },
                ],
              },
            },
          }),
          tasksFacade: {
            recordAction: vi.fn(() => ({ ok: false, updates: [] })),
          },
          publishAndSaveSnapshot,
        },
        pagesFacade: {
          tutorialFacade: {
            refresh,
          },
        },
      },
    });

    expect(
      facade.recordTaskAction({ type: 'research', researchId: 'unlockSeed:mintSeed' }),
    ).toMatchObject({
      ok: true,
      reason: 'already_completed',
    });
    expect(publishAndSaveSnapshot).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
