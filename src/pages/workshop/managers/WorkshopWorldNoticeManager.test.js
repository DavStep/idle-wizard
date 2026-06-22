// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
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
        leaderboard: {
          currentPoints: 125,
          qualificationPoints: 2000,
          qualified: false,
          remainingQualificationPoints: 1875,
          rewardTiers: [
            { rankLabel: '1', emerald: 5, crystal: 10 },
            { rankLabel: '2', emerald: 3, crystal: 7 },
            { rankLabel: '3', emerald: 2, crystal: 5 },
            { rankLabel: '4-10', emerald: 1, crystal: 3 },
            { rankLabel: '11-25', emerald: 0, crystal: 2 },
            { rankLabel: '26-100', emerald: 0, crystal: 1 },
            { rankLabel: '101+ qualified', emerald: 0, crystal: 1 },
          ],
        },
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
              coin: 15,
              text: '+15 coin',
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
            actionText: '25 points',
            pointText: '25 points',
          },
          {
            requestId: 'weekly-1:fever:water',
            requestKey: 'water',
            actionType: 'complete_research',
            label: 'test clean water',
            requiredQuantity: 1,
            progressQuantity: 0,
            progress: 0,
            completed: false,
            manual: false,
            actionText: '100 points',
            pointText: '100 points',
          },
        ],
      },
      archive: [
        {
          periodKey: 'weekly-0',
          headline: 'siege at stonebridge',
          responseLabel: 'small response',
          contributionPoints: 90,
        },
      ],
    },
  };
}

function createGameplayFacadeFake(snapshot = createWorldNoticeSnapshot()) {
  let currentSnapshot = snapshot;
  let listener = null;

  return {
    donateWorldNoticeCoin: vi.fn(),
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
  it('pins character button notification dots to the label box corner', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const outerBadgeRule = baseCss.match(
      /\.workshop-page__personal-tasks-open\[data-notification="true"\]::before,\s*\.workshop-page__world-notice-open\[data-notification="true"\]::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const labelBadgeRule = baseCss.match(
      /\.workshop-page__personal-tasks-open\[data-notification="true"\]\s+\.workshop-page__feature-character-label::after,\s*\.workshop-page__world-notice-open\[data-notification="true"\]\s+\.workshop-page__feature-character-label::after\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(outerBadgeRule).toMatch(/\bdisplay:\s*none;/);
    expect(labelBadgeRule).toMatch(/\bposition:\s*absolute;/);
    expect(labelBadgeRule).toMatch(
      /\btop:\s*calc\(-1 \* var\(--style-notification-offset\)\);/,
    );
    expect(labelBadgeRule).toMatch(
      /\bright:\s*calc\(-1 \* var\(--style-notification-offset\)\);/,
    );
  });

  it('renders the unlocked character button and popup requests', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopWorldNoticeManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);

    expect(parent.querySelector('.workshop-page__world-notice').hidden).toBe(false);
    expect(parent.querySelector('.workshop-page__world-notice.style-box')).toBeNull();
    expect(parent.querySelector('.workshop-page__world-notice')?.dataset.panelSide).toBe(
      'right',
    );
    const openButton = parent.querySelector('.workshop-page__world-notice-open');
    expect(openButton?.classList.contains('workshop-page__panel-button-open')).toBe(
      true,
    );
    expect(
      openButton?.querySelector('.workshop-page__panel-button-label')?.textContent,
    ).toBe('notice');
    expect(
      openButton?.querySelector('.workshop-page__panel-button-timer')?.textContent,
    ).toBe('resolves 3d');
    expect(openButton?.getAttribute('aria-label')).toContain(
      'fever in the lower quarter, 1/3',
    );
    expect(
      openButton?.querySelector('.workshop-page__world-notice-character')?.getAttribute('src'),
    ).toContain('guild-secretary.webp');
    expect(parent.textContent).not.toContain('fever in the lower quarter');
    expect(parent.textContent).not.toContain('1/3');

    openButton.click();

    const popup = popupParent.querySelector('.workshop-page__world-notice-popup');
    expect(popup.hidden).toBe(false);
    expect(
      popup
        .querySelector('.workshop-page__world-notice-dialog-character')
        ?.getAttribute('src'),
    ).toContain('guild-secretary.webp');
    expect(popup.textContent).toContain('lanterns stay lit past midnight');
    expect(popup.textContent).toContain('brew fever tonics');
    expect(popup.textContent).toContain('125/2000 points');
    expect(
      popup.querySelector('.workshop-page__world-notice-request-fill')?.style.width,
    ).toBe('100%');

    expect(popup.textContent).toContain('1/3 answers');

    popup
      .querySelector('.workshop-page__world-notice-tab-button:nth-child(2)')
      .click();
    expect(popup.textContent).toContain('1');
    expect(popup.textContent).toContain('5 emerald, 10 crystal');
    expect(popup.textContent).toContain('101+ qualified');

    popup
      .querySelector('.workshop-page__world-notice-tab-button:nth-child(3)')
      .click();
    expect(popup.textContent).toContain('past notices');
    expect(popup.textContent).toContain('siege at stonebridge');
    expect(popup.textContent).toContain('90 points');
  });

  it('shows the notice button notification while the current notice has open requests', () => {
    const snapshot = createWorldNoticeSnapshot();
    const gameplayFacade = createGameplayFacadeFake(snapshot);
    const manager = new WorkshopWorldNoticeManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);

    const openButton = parent.querySelector('.workshop-page__world-notice-open');
    expect(openButton?.dataset.notification).toBe('true');

    for (const request of snapshot.worldNotice.current.requests) {
      request.completed = true;
    }
    snapshot.worldNotice.current.completedRequests =
      snapshot.worldNotice.current.totalRequests;
    gameplayFacade.emit(snapshot);

    expect(openButton?.dataset.notification).toBeUndefined();

    gameplayFacade.emit({
      worldNotice: {
        unlocked: true,
        unlockLevel: 4,
        current: null,
        archive: [],
      },
    });

    expect(openButton?.dataset.notification).toBeUndefined();
    expect(
      openButton?.querySelector('.workshop-page__panel-button-timer')?.hidden,
    ).toBe(true);
  });

  it('sends coin only for explicit manual notice rows', () => {
    const gameplayFacade = createGameplayFacadeFake({
      worldNotice: {
        unlocked: true,
        unlockLevel: 4,
        current: {
          periodKey: 'weekly-1',
          resetLabel: 'resolves 3d',
          headline: 'siege at stonebridge',
          body: ['the bridge watch keeps a sealed coin box.'],
          completedRequests: 0,
          totalRequests: 1,
          responseLabel: 'small response',
          requests: [
            {
              requestId: 'weekly-1:siege:coin',
              requestKey: 'coin',
              actionType: 'donate_coin',
              label: 'send bridge coin',
              requiredQuantity: 30,
              progressQuantity: 0,
              progress: 0,
              completed: false,
              manual: true,
              canDonate: true,
              actionText: 'send coin',
              reward: {
                coin: 10,
                text: '+10 coin',
              },
              rewardClaimed: false,
            },
          ],
        },
        archive: [],
      },
    });
    const manager = new WorkshopWorldNoticeManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);
    parent.querySelector('.workshop-page__world-notice-open').click();

    popupParent.querySelector('.workshop-page__world-notice-request-action').click();

    expect(gameplayFacade.donateWorldNoticeCoin).toHaveBeenCalledWith(
      'weekly-1:siege:coin',
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
