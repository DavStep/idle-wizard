// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { TutorialCaptureFacade } from './TutorialCaptureFacade.js';

describe('TutorialCaptureFacade', () => {
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
