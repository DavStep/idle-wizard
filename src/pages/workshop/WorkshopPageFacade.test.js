// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { WorkshopPageFacade } from './WorkshopPageFacade.js';

function createGameplayFacadeFake() {
  const snapshot = {
    personalTasks: {
      unlocked: true,
      daily: {
        resetLabel: 'resets 12h',
        completedTasks: 0,
        totalTasks: 1,
        tasks: [],
      },
      weekly: {
        resetLabel: 'resets 3d',
        completedTasks: 0,
        totalTasks: 1,
        tasks: [],
      },
    },
    worldNotice: {
      unlocked: true,
      current: {
        headline: 'quiet market request',
        completedRequests: 0,
        totalRequests: 1,
        responseLabel: 'no response',
        resetLabel: 'resolves 3d',
        body: [],
        requests: [],
      },
      archive: [],
    },
  };

  return {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn((callback) => {
      callback(snapshot);
      return vi.fn();
    }),
    subscribeRewardEvents: vi.fn(() => vi.fn()),
  };
}

function createStubManager(overrides = {}) {
  return {
    mount: vi.fn(),
    unmount: vi.fn(),
    hide: vi.fn(),
    root: document.createElement('div'),
    refs: {},
    ...overrides,
  };
}

describe('WorkshopPageFacade requirement feedback', () => {
  it('mounts task and notice characters only inside the Workshop UI layer', () => {
    const facade = new WorkshopPageFacade({
      gameplayFacade: createGameplayFacadeFake(),
    });
    const stage = document.createElement('div');
    facade.requirementConnectionManager = createStubManager();
    facade.taskManager = createStubManager({
      getCurrentRequirementRowForItemTypeIds: vi.fn(() => null),
    });
    facade.actionBarManager = createStubManager();
    facade.flyoutManager = createStubManager({ show: vi.fn(), showReward: vi.fn() });
    facade.leaderboardManager = createStubManager();
    facade.tradeAllianceManager = createStubManager();
    facade.logDialogManager = createStubManager();
    facade.discoveriesManager = createStubManager();
    facade.bagManager = createStubManager();
    facade.prestigeManager = createStubManager();
    facade.summonInfoManager = createStubManager();
    facade.secondaryActionGateManager = { apply: vi.fn(() => true) };
    facade.discoveryAllianceActionGateManager = { apply: vi.fn(() => true) };
    facade.prestigeActionGateManager = { apply: vi.fn(() => true) };

    facade.mount(stage);

    const uiLayer = stage.querySelector('.workshop-page__ui-layer');
    const personalTasks = stage.querySelector('.workshop-page__personal-tasks');
    const worldNotice = stage.querySelector('.workshop-page__world-notice');
    expect(personalTasks?.parentElement).toBe(uiLayer);
    expect(worldNotice?.parentElement).toBe(uiLayer);
    expect(stage.firstElementChild?.classList.contains('workshop-page__personal-tasks')).toBe(
      false,
    );

    facade.unmount();

    expect(stage.querySelector('.workshop-page__personal-tasks')).toBeNull();
    expect(stage.querySelector('.workshop-page__world-notice')).toBeNull();
  });

  it('pulses a matching summoned item requirement row', () => {
    const facade = new WorkshopPageFacade();
    const target = document.createElement('div');
    const getCurrentRequirementRowForItemTypeIds = vi.fn(() => target);
    const show = vi.fn();

    facade.taskManager = { getCurrentRequirementRowForItemTypeIds };
    facade.requirementConnectionManager = { show };

    facade.showRequirementConnection({
      type: 'seed_summoned',
      seedCounts: [{ seed: { id: 1, label: 'sage seed' }, quantity: 1 }],
      seed: { id: 2, label: 'mint seed' },
    });

    const [itemTypeIds] = getCurrentRequirementRowForItemTypeIds.mock.calls[0];
    expect([...itemTypeIds]).toEqual([1, 2]);
    expect(show).toHaveBeenCalledWith({ target });
  });

  it('does not play when the created item is not the current requirement', () => {
    const facade = new WorkshopPageFacade();
    const getCurrentRequirementRowForItemTypeIds = vi.fn(() => null);
    const show = vi.fn();

    facade.taskManager = { getCurrentRequirementRowForItemTypeIds };
    facade.requirementConnectionManager = { show };
    facade.actionBarManager = { refs: {} };

    facade.showRequirementConnection({
      type: 'herb_harvested',
      herb: { itemTypeId: 1001, label: 'sage' },
    });

    expect(getCurrentRequirementRowForItemTypeIds.mock.calls[0][0].has(1001)).toBe(true);
    expect(show).not.toHaveBeenCalled();
  });
});
