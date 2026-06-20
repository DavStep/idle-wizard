// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { WorkshopWorldNoticeManager } from './WorkshopWorldNoticeManager.js';

function createWorldNoticeSnapshot() {
  return {
    worldNotice: {
      unlocked: true,
      unlockLevel: 4,
      current: {
        periodKey: 'weekly-1',
        resetLabel: 'resolves 3d',
        headline: 'fever in the lower quarter',
        body: [
          'lanterns stay lit past midnight.',
          'elara says the lower quarter has begun boiling water in every pot it owns.',
        ],
        completedRequests: 1,
        totalRequests: 3,
        responseLabel: 'steady response',
        requests: [
          {
            requestId: 'weekly-1:fever:herbs',
            requestKey: 'herbs',
            actionType: 'harvest_herbs',
            label: 'send clean herbs',
            requiredQuantity: 25,
            progressQuantity: 25,
            progress: 1,
            completed: true,
            manual: false,
            actionText: 'done',
            reward: {
              gold: 15,
              text: '+15 gold',
            },
            rewardClaimed: true,
          },
          {
            requestId: 'weekly-1:fever:tonics',
            requestKey: 'tonics',
            actionType: 'brew_potions',
            label: 'brew fever tonics',
            requiredQuantity: 5,
            progressQuantity: 2,
            progress: 0.4,
            completed: false,
            manual: false,
            actionText: '+15 gold',
            reward: {
              gold: 15,
              text: '+15 gold',
            },
            rewardClaimed: false,
          },
          {
            requestId: 'weekly-1:fever:water',
            requestKey: 'water',
            actionType: 'donate_gold',
            label: 'fund clean water carts',
            requiredQuantity: 40,
            progressQuantity: 10,
            progress: 0.25,
            completed: false,
            manual: true,
            canDonate: true,
            actionText: 'donate',
            reward: {
              gold: 15,
              text: '+15 gold',
            },
            rewardClaimed: false,
          },
        ],
      },
      archive: [
        {
          periodKey: 'weekly-0',
          headline: 'siege at stonebridge',
          responseLabel: 'small response',
        },
      ],
    },
  };
}

function createGameplayFacadeFake(snapshot = createWorldNoticeSnapshot()) {
  let currentSnapshot = snapshot;
  let listener = null;

  return {
    donateWorldNoticeGold: vi.fn(),
    getSnapshot: vi.fn(() => currentSnapshot),
    subscribe: vi.fn((callback) => {
      listener = callback;
      return vi.fn();
    }),
    emit(nextSnapshot) {
      currentSnapshot = nextSnapshot;
      listener?.(currentSnapshot);
    },
  };
}

describe('WorkshopWorldNoticeManager', () => {
  it('renders the unlocked summary and popup requests', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopWorldNoticeManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);

    expect(parent.querySelector('.workshop-page__world-notice').hidden).toBe(false);
    expect(parent.textContent).toContain('fever in the lower quarter');
    expect(parent.textContent).toContain('1/3');

    parent.querySelector('.workshop-page__world-notice-open').click();

    const popup = popupParent.querySelector('.workshop-page__world-notice-popup');
    expect(popup.hidden).toBe(false);
    expect(popup.textContent).toContain('lanterns stay lit past midnight');
    expect(popup.textContent).toContain('brew fever tonics');
    expect(popup.textContent).toContain('past notices');
    expect(popup.textContent).toContain('siege at stonebridge');
    expect(
      popup.querySelector('.workshop-page__world-notice-request-fill')?.style.width,
    ).toBe('100%');

    popup.querySelector('.workshop-page__world-notice-request-action').click();

    expect(gameplayFacade.donateWorldNoticeGold).toHaveBeenCalledWith(
      'weekly-1:fever:water',
    );
  });

  it('hides and closes when world notices are locked', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopWorldNoticeManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);
    parent.querySelector('.workshop-page__world-notice-open').click();

    gameplayFacade.emit({
      worldNotice: {
        unlocked: false,
        unlockLevel: 4,
        current: null,
        archive: [],
      },
    });

    expect(parent.querySelector('.workshop-page__world-notice').hidden).toBe(true);
    expect(popupParent.querySelector('.workshop-page__world-notice-popup').hidden).toBe(
      true,
    );
  });
});
