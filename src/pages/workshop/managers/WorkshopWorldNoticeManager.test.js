// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it, vi } from 'vitest';

import { WorkshopWorldNoticeManager } from './WorkshopWorldNoticeManager.js';

function createWorldNoticeSnapshot() {
  return {
    playerLevel: {
      currentLevel: 4,
    },
    worldNotice: {
      unlocked: true,
      unlockLevel: 4,
      current: {
        periodKey: 'weekly-1',
        eventId: 'fever-lower-quarter',
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
          rows: [
            {
              rank: 1,
              name: 'Daily Ada',
              allianceTag: 'DAY',
              character: 'rowan',
              playerLevel: 3,
              points: 225,
            },
            {
              rank: 2,
              name: 'Merlin',
              character: 'mira',
              playerLevel: 4,
              points: 125,
              current: true,
            },
          ],
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
            actionType: 'donate_resources',
            label: 'cool the fever',
            title: 'cool the fever',
            situation: 'families are sleeping beside buckets.',
            description: 'donate tonics that steady breath and bring fever down.',
            requiredQuantity: 600,
            progressQuantity: 125,
            progress: 1,
            completed: true,
            contributionPoints: 125,
            collectedPointText: '125 points',
            manual: true,
            actionText: 'donate',
            donationOptions: [
              {
                optionKey: 'manaTonic',
                resourceType: 'item',
                itemKey: 'manaTonic',
                label: 'mana tonic',
                pointsPerUnit: 80,
                availableQuantity: 2,
                maxDonateQuantity: 2,
                contributedQuantity: 1,
                contributionPoints: 80,
                collectedPointText: '80 points',
                canDonate: true,
              },
              {
                optionKey: 'minorHealingPotion',
                resourceType: 'item',
                itemKey: 'minorHealingPotion',
                label: 'minor healing potion',
                pointsPerUnit: 150,
                availableQuantity: 0,
                maxDonateQuantity: 0,
                contributedQuantity: 0,
                contributionPoints: 0,
                collectedPointText: '0 points',
                canDonate: false,
              },
            ],
            reward: {
              coin: 15,
              text: '+15 coin',
            },
            rewardClaimed: true,
          },
          {
            requestId: 'weekly-1:fever:tonics',
            requestKey: 'tonics',
            actionType: 'donate_resources',
            label: 'clean hands, clean cups',
            title: 'clean hands, clean cups',
            situation: 'the first helpers are running out of safe washes.',
            description: 'donate cleansing brews so healers stop carrying fever bed to bed.',
            requiredQuantity: 600,
            progressQuantity: 50,
            progress: 0.4,
            completed: false,
            contributionPoints: 50,
            collectedPointText: '50 points',
            manual: true,
            actionText: 'donate',
            donationOptions: [
              {
                optionKey: 'simpleAntidote',
                resourceType: 'item',
                itemKey: 'simpleAntidote',
                label: 'simple antidote',
                pointsPerUnit: 160,
                availableQuantity: 0,
                maxDonateQuantity: 0,
                contributedQuantity: 0,
                contributionPoints: 50,
                collectedPointText: '50 points',
                canDonate: false,
              },
            ],
          },
          {
            requestId: 'weekly-1:fever:water',
            requestKey: 'water',
            actionType: 'donate_resources',
            label: 'quiet rooms for the sick',
            title: 'quiet rooms for the sick',
            situation: 'crowded houses keep the fever moving after sunset.',
            description: 'donate coin so families can rent spare rooms.',
            requiredQuantity: 900,
            progressQuantity: 0,
            progress: 0,
            completed: false,
            contributionPoints: 0,
            collectedPointText: '0 points',
            manual: true,
            canDonate: true,
            actionText: 'donate',
            donationOptions: [
              {
                optionKey: 'coin',
                resourceType: 'coin',
                label: 'coin',
                pointsPerUnit: 1,
                availableQuantity: 30,
                maxDonateQuantity: 30,
                contributedQuantity: 0,
                contributionPoints: 0,
                collectedPointText: '0 points',
                canDonate: true,
              },
            ],
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
    donateWorldNoticeCoin: vi.fn(() => ({ ok: true, changed: true })),
    donateWorldNoticeResource: vi.fn(() => ({ ok: true, changed: true })),
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

function createPlayerFacadeFake(snapshot = { username: 'Merlin', character: 'mira' }) {
  return {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn(() => vi.fn()),
  };
}

function createWorldEventLeaderboardFacadeFake(snapshot = {}) {
  return {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn((callback) => {
      callback(snapshot);
      return vi.fn();
    }),
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

  it('keeps the event header fixed with a larger dialog portrait', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const contentRule = baseCss.match(
      /\.workshop-page__world-notice-content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const portraitRule = baseCss.match(
      /\.workshop-page__world-notice-dialog-character\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const titleRule = baseCss.match(
      /\.workshop-page__world-notice-request-title\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const instructionRule = baseCss.match(
      /\.workshop-page__world-notice-request-instruction\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const headerRule = baseCss.match(
      /\.workshop-page__world-notice-header\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const frameRule = baseCss.match(
      /\.workshop-page__world-notice-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(contentRule).toMatch(/\bdisplay:\s*flex;/);
    expect(contentRule).toMatch(/\bflex-direction:\s*column;/);
    expect(contentRule).toMatch(/\bheight:\s*100%;/);
    expect(contentRule).toMatch(/\boverflow:\s*hidden;/);
    expect(headerRule).toMatch(/\bflex:\s*0 0 90px;/);
    expect(headerRule).toMatch(/\bmargin-bottom:\s*6px;/);
    expect(frameRule).toMatch(/\bflex:\s*1 1 auto;/);
    expect(frameRule).toMatch(/\bmin-height:\s*0;/);
    expect(portraitRule).toMatch(/\bwidth:\s*64px;/);
    expect(portraitRule).toMatch(/\bheight:\s*80px;/);
    expect(titleRule).toMatch(/\bfont-weight:\s*700;/);
    expect(titleRule).toMatch(/\bwhite-space:\s*normal;/);
    expect(instructionRule).toMatch(/\bwhite-space:\s*normal;/);
  });

  it('lets world event use the shared scroll progress flow', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const progressRule = baseCss.match(
      /\.workshop-page__world-notice-frame\s*\+\s*\.style-scroll-cue-progress\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).not.toMatch(/\.workshop-page__world-notice-content:has/);
    expect(progressRule).toBeUndefined();
  });

  it('keeps leaderboard and reward tabs from drawing a second header separator', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const tabButtonRule = baseCss.match(
      /\.style-button\.workshop-page__leaderboard-tab-button,[\s\S]*?\.style-button\.workshop-page__world-chat-tab-button\s*\{(?<body>[^}]*)\}/,
    )?.[0];
    const leaderboardRules = [
      ...baseCss.matchAll(
        /\.workshop-page__world-notice-leaderboard\s*\{(?<body>[^}]*)\}/g,
      ),
    ].map((match) => match.groups?.body ?? '');
    const leaderboardRowsRule = baseCss.match(
      /\.workshop-page__world-notice-leaderboard-rows\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rewardsRules = [
      ...baseCss.matchAll(
        /\.workshop-page__world-notice-rewards\s*\{(?<body>[^}]*)\}/g,
      ),
    ].map((match) => match.groups?.body ?? '');
    const requestsRules = [
      ...baseCss.matchAll(
        /\.workshop-page__world-notice-requests\s*\{(?<body>[^}]*)\}/g,
      ),
    ].map((match) => match.groups?.body ?? '');

    expect(leaderboardRules.some((rule) => /\bborder-top:\s*0;/.test(rule))).toBe(
      true,
    );
    expect(leaderboardRowsRule).toMatch(/\bjustify-self:\s*center;/);
    expect(leaderboardRowsRule).toMatch(/\bwidth:\s*260px;/);
    expect(rewardsRules.some((rule) => /\bborder-top:\s*0;/.test(rule))).toBe(true);
    expect(
      requestsRules.some((rule) =>
        /\bborder-top:\s*1px solid var\(--style-disabled\);/.test(rule),
      ),
    ).toBe(true);
    expect(tabButtonRule).toContain(
      '.style-button.workshop-page__world-notice-tab-button',
    );
  });

  it('shows world event reward resource icons without resource words', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const iconRule = baseCss.match(
      /\.workshop-page__world-notice-reward-icon\s+\.style-resource-label__icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const textRule = baseCss.match(
      /\.workshop-page__world-notice-reward-icon\s+\.style-resource-label__text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(iconRule).toMatch(/\bdisplay:\s*inline-block;/);
    expect(textRule).toMatch(/\bdisplay:\s*none;/);
  });

  it('keeps the donate dialog close label and confirm button in shared popup style', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const closeRule = baseCss.match(
      /\.style-button\.brewing-page__recipes-close,[\s\S]*?\.style-button\.room-bottom-panel__lock-close\s*\{(?<body>[^}]*)\}/,
    )?.[0];
    const confirmRule = baseCss.match(
      /\.style-button\.workshop-page__world-notice-donate-confirm\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(closeRule).toContain(
      '.style-button.workshop-page__world-notice-donate-close',
    );
    expect(closeRule).toMatch(/\bright:\s*var\(--style-box-title-left\);/);
    expect(confirmRule).toMatch(/\bdisplay:\s*inline-grid;/);
    expect(confirmRule).toMatch(/\bwhite-space:\s*normal;/);
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
    expect(parent.querySelector('.workshop-page__world-notice')?.getAttribute('aria-label')).toBe(
      'world event',
    );
    expect(openButton?.classList.contains('workshop-page__panel-button-open')).toBe(
      true,
    );
    expect(
      openButton?.querySelector('.workshop-page__panel-button-label')?.textContent,
    ).toBe('event');
    expect(
      openButton?.querySelector('.workshop-page__panel-button-timer')?.textContent,
    ).toBe('3d');
    expect(openButton?.getAttribute('aria-label')).toContain(
      'fever in the lower quarter. 125 points',
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
      popup.querySelector('.workshop-page__world-notice-panel')?.getAttribute('aria-label'),
    ).toBe('world event');
    expect(popup.querySelector('.style-box__title')?.textContent).toBe('world event');
    expect(
      [...popup.querySelectorAll('.workshop-page__world-notice-tab-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['quests', 'leaderboard', 'rewards']);
    expect(
      popup
        .querySelector('.workshop-page__world-notice-dialog-character')
        ?.getAttribute('src'),
    ).toContain('guild-secretary.webp');
    expect(
      [...popup.querySelectorAll('.workshop-page__world-notice-meta-row')].map(
        (row) =>
          [
            row.querySelector('.workshop-page__world-notice-meta-key')?.textContent,
            row.querySelector('.workshop-page__world-notice-meta-value')?.textContent,
          ].join(':'),
      ),
    ).toEqual(['points:125 points', 'resolves:3d']);
    expect(popup.textContent).toContain('lanterns stay lit past midnight');
    expect(popup.textContent).toContain('quests');
    expect(popup.textContent).toContain('clean hands, clean cups');
    expect(popup.textContent).toContain('the first helpers are running out of safe washes.');
    expect(popup.textContent).toContain(
      'donate cleansing brews so healers stop carrying fever bed to bed.',
    );
    expect(popup.textContent).toContain('simple antidote');
    expect(popup.textContent).toContain('160 points each');
    expect(popup.textContent).toContain('total 50 points');
    const firstDonationLabel = popup.querySelector(
      '.workshop-page__world-notice-donation-label',
    );
    expect(firstDonationLabel?.dataset.resourceColor).toBe('potion');
    expect(
      firstDonationLabel?.querySelector('.style-potion-label__icon')?.dataset
        .assetAtlasFrame,
    ).toBe('potion:manaTonic');
    expect(
      popup.querySelector('.workshop-page__world-notice-request-title')?.textContent,
    ).toBe('cool the fever');
    expect(
      popup.querySelector('.workshop-page__world-notice-donation-option')?.children
        .length,
    ).toBe(4);
    const optionLabels = [
      ...popup.querySelectorAll('.workshop-page__world-notice-donation-label'),
    ];
    expect(optionLabels[0]?.textContent).toBe('mana tonic');
    expect(optionLabels[0]?.dataset.resourceColor).toBe('potion');
    expect(
      optionLabels[0]?.querySelector('.style-potion-label__icon')?.dataset
        .assetAtlasFrame,
    ).toBe('potion:manaTonic');
    expect(optionLabels[1]?.classList.contains('is-unavailable')).toBe(true);
    expect(optionLabels[1]?.dataset.resourceColor).toBe('potion');
    expect(
      optionLabels[1]?.querySelector('.style-potion-label__icon')?.dataset
        .assetAtlasFrame,
    ).toBe('potion:minorHealingPotion');
    const coinLabel = optionLabels.find((label) => label.textContent === 'coin');
    expect(coinLabel?.dataset.resourceColor).toBe('coin');
    expect(
      coinLabel?.querySelector('.style-resource-label--coin .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:coin');
    expect(popup.textContent).toContain('125 points earned');
    expect(popup.querySelector('.workshop-page__world-notice-request-fill')).toBeNull();
    expect(popup.textContent).not.toContain('1/3 quests');
    expect(popup.textContent).not.toContain('125 points, 3d');
    expect(popup.textContent).not.toContain('resolves 3d');

    popup
      .querySelector('.workshop-page__world-notice-tab-button:nth-child(2)')
      .click();
    expect(
      [
        ...popup.querySelectorAll(
          '.workshop-page__world-notice-leaderboard .row_key',
        ),
      ].map((cell) => cell.textContent),
    ).toEqual(['user', '1. [DAY] Daily Ada (3)', '2. Merlin (4)']);
    expect(
      [
        ...popup.querySelectorAll(
          '.workshop-page__world-notice-leaderboard .row_val',
        ),
      ].map((cell) => cell.textContent),
    ).toEqual(['points', '225', '125']);
    expect(
      popup.querySelectorAll(
        '.workshop-page__world-notice-leaderboard .workshop-page__leaderboard-character-icon',
      ),
    ).toHaveLength(2);
    expect(
      popup
        .querySelector(
          '.workshop-page__world-notice-leaderboard .workshop-page__leaderboard-character-icon',
        )
        ?.getAttribute('src'),
    ).toContain('rowan.png');
    expect(
      popup
        .querySelector('.workshop-page__world-notice-leaderboard .workshop-page__leaderboard-current')
        ?.textContent,
    ).toContain('125');
    expect(popup.textContent).not.toContain('1875 points to qualify');
    expect(popup.textContent).not.toContain('past events');

    popup
      .querySelector('.workshop-page__world-notice-tab-button:nth-child(3)')
      .click();
    const firstRewardValue = popup.querySelector(
      '.workshop-page__world-notice-reward-row .workshop-page__world-notice-reward-value',
    );
    expect(firstRewardValue?.textContent).not.toContain('emerald');
    expect(firstRewardValue?.textContent).not.toContain('crystal');
    expect(
      [...firstRewardValue.querySelectorAll('.workshop-page__world-notice-reward-resource')].map(
        (node) => node.getAttribute('aria-label'),
      ),
    ).toEqual(['5 emerald', '10 crystal']);
    expect(
      [
        ...firstRewardValue.querySelectorAll(
          '.workshop-page__world-notice-reward-icon .style-resource-label__icon',
        ),
      ].map((icon) => icon.dataset.assetAtlasFrame),
    ).toEqual(['resource:emerald', 'resource:crystal']);
    expect(popup.textContent).not.toContain('5 emerald, 10 crystal');
    expect(popup.textContent).toContain('101+ qualified');
    expect(popup.textContent).toContain('1875 points to qualify');
    expect(
      popup
        .querySelector(
          '.workshop-page__world-notice-reward-amount[data-resource-color="emerald"]',
        )
        ?.dataset.resourceColor,
    ).toBe('emerald');
    expect(
      popup
        .querySelector(
          '.workshop-page__world-notice-reward-amount[data-resource-color="crystal"]',
        )
        ?.dataset.resourceColor,
    ).toBe('crystal');
  });

  it('preserves event scroll position across same-tab snapshot refreshes', () => {
    const snapshot = createWorldNoticeSnapshot();
    const gameplayFacade = createGameplayFacadeFake(snapshot);
    const manager = new WorkshopWorldNoticeManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);
    parent.querySelector('.workshop-page__world-notice-open').click();

    const frame = popupParent.querySelector('.workshop-page__world-notice-frame');
    expect(frame.classList.contains('style-dialog-scroll')).toBe(true);
    frame.scrollTop = 96;

    const nextSnapshot = JSON.parse(JSON.stringify(snapshot));
    nextSnapshot.worldNotice.current.leaderboard.currentPoints = 140;
    gameplayFacade.emit(nextSnapshot);

    const refreshedFrame = popupParent.querySelector(
      '.workshop-page__world-notice-frame',
    );
    expect(refreshedFrame).toBe(frame);
    expect(refreshedFrame.scrollTop).toBe(96);

    refreshedFrame.scrollTop = 72;
    popupParent
      .querySelector('.workshop-page__world-notice-tab-button:nth-child(2)')
      .click();

    expect(
      popupParent.querySelector('.workshop-page__world-notice-frame')?.scrollTop,
    ).toBe(0);
  });

  it('renders event task rows with title, instruction, point columns, and separators', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const separatorRule = baseCss.match(
      /\.workshop-page__world-notice-request\s*\+\s*\.workshop-page__world-notice-request\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const pointRowRule = baseCss.match(
      /\.workshop-page__world-notice-request-points-row\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const manager = new WorkshopWorldNoticeManager();

    const row = manager.createTaskRow({
      actionType: 'earn_coin',
      label: 'earn coin: sales and claims',
      requiredQuantity: 50,
      progressQuantity: 25,
      contributionPoints: 1,
      collectedPointText: '1 point',
      completed: false,
      manual: false,
      pointText: '25 coin = 1 point',
    });

    expect(separatorRule).toMatch(/\bborder-top:\s*1px solid var\(--style-disabled\);/);
    expect(pointRowRule).toMatch(
      /\bgrid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\);/,
    );
    expect(baseCss).toMatch(
      /\.workshop-page__world-notice-request-collected\s*\{\s*text-align:\s*right;\s*\}/,
    );
    expect(row.querySelector('.workshop-page__world-notice-request-marker')).toBeNull();
    expect(row.querySelector('.workshop-page__world-notice-request-title')?.textContent).toBe(
      'earn coin: sales and claims',
    );
    expect(
      row.querySelector('.workshop-page__world-notice-request-title')?.dataset.resourceColor,
    ).toBeUndefined();
    expect(
      row.querySelector('.workshop-page__world-notice-request-instruction')?.textContent,
    ).toBe('earn coin by selling items or claiming coin. 25 coin earned gives 1 point.');
    expect(
      [
        ...row.querySelectorAll(
          '.workshop-page__world-notice-request-instruction .style-resource-label--coin',
        ),
      ].map((node) => node.textContent),
    ).toEqual(['coin', 'coin', 'coin']);
    expect(
      [
        ...(row.querySelector('.workshop-page__world-notice-request-points-row')?.children ??
          []),
      ].map((node) => node.textContent),
    ).toEqual(['earned 25 coin', 'earned 1 point']);
    expect(
      row.querySelector(
        '.workshop-page__world-notice-request-points .style-resource-label--coin .style-resource-label__icon',
      )?.dataset.assetAtlasFrame,
    ).toBe('resource:coin');

    const staleRow = manager.createTaskRow({
      actionType: 'legacy_progress',
      label: 'legacy progress',
      requiredQuantity: 1125,
      progressQuantity: 1125,
      contributionPoints: 1125,
      collectedPointText: '1125 points',
      completed: true,
      manual: false,
      pointText: '1 point',
    });

    expect(staleRow.textContent).not.toContain('make 1125 progress');
    expect(
      staleRow.querySelector('.workshop-page__world-notice-request-instruction')
        ?.textContent,
    ).toBe('complete this quest. each counted action gives 1 point.');
    expect(
      staleRow.querySelector('.workshop-page__world-notice-request-points')
        ?.textContent,
    ).toBe('counted 1125 actions');
  });

  it('falls back to own event points when no event leaderboard rows are supplied', () => {
    const snapshot = createWorldNoticeSnapshot();
    delete snapshot.worldNotice.current.leaderboard.rows;
    const gameplayFacade = createGameplayFacadeFake(snapshot);
    const playerFacade = createPlayerFacadeFake();
    const manager = new WorkshopWorldNoticeManager({ gameplayFacade, playerFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);
    parent.querySelector('.workshop-page__world-notice-open').click();
    popupParent
      .querySelector('.workshop-page__world-notice-tab-button:nth-child(2)')
      .click();

    expect(
      [
        ...popupParent.querySelectorAll(
          '.workshop-page__world-notice-leaderboard .row_key',
        ),
      ].map((cell) => cell.textContent),
    ).toEqual(['user', '- Merlin (4)']);
    expect(
      popupParent.querySelector(
        '.workshop-page__world-notice-leaderboard .workshop-page__leaderboard-current',
      )?.textContent,
    ).toContain('125');
  });

  it('uses shared event leaderboard rows when backend rows are supplied', () => {
    const snapshot = createWorldNoticeSnapshot();
    delete snapshot.worldNotice.current.leaderboard.rows;
    const gameplayFacade = createGameplayFacadeFake(snapshot);
    const playerFacade = createPlayerFacadeFake();
    const worldEventLeaderboardFacade = createWorldEventLeaderboardFacadeFake({
      connected: true,
      periodKey: 'weekly-1',
      eventId: 'fever-lower-quarter',
      topWorldEventUsers: [
        {
          identity: 'ada',
          rank: 1,
          name: 'Ada',
          allianceTag: 'DAY',
          character: 'rowan',
          playerLevel: 5,
          points: 450,
        },
        {
          identity: 'mine',
          rank: 2,
          name: 'Merlin',
          character: 'mira',
          playerLevel: 4,
          points: 125,
        },
      ],
      currentWorldEventUser: {
        identity: 'mine',
        rank: 2,
        name: 'Merlin',
        character: 'mira',
        playerLevel: 4,
        points: 125,
      },
    });
    const manager = new WorkshopWorldNoticeManager({
      gameplayFacade,
      playerFacade,
      worldEventLeaderboardFacade,
    });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);
    parent.querySelector('.workshop-page__world-notice-open').click();
    popupParent
      .querySelector('.workshop-page__world-notice-tab-button:nth-child(2)')
      .click();

    expect(
      [
        ...popupParent.querySelectorAll(
          '.workshop-page__world-notice-leaderboard .row_key',
        ),
      ].map((cell) => cell.textContent),
    ).toEqual(['user', '1. [DAY] Ada (5)', '2. Merlin (4)']);
    expect(
      [
        ...popupParent.querySelectorAll(
          '.workshop-page__world-notice-leaderboard .row_val',
        ),
      ].map((cell) => cell.textContent),
    ).toEqual(['points', '450', '125']);
  });

  it('shows the event button notification while the current event has open requests', () => {
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

  it('sends coin only for explicit manual event rows', () => {
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
              contributionPoints: 0,
              collectedPointText: '0 points',
              manual: true,
              canDonate: true,
              actionText: 'donate',
              title: 'send bridge coin',
              situation: 'the bridge watch keeps a sealed coin box.',
              description: 'donate coin for the bridge watch.',
              donationOptions: [
                {
                  optionKey: 'coin',
                  resourceType: 'coin',
                  label: 'coin',
                  pointsPerUnit: 1,
                  availableQuantity: 30,
                  maxDonateQuantity: 30,
                  contributedQuantity: 0,
                  contributionPoints: 0,
                  collectedPointText: '0 points',
                  canDonate: true,
                },
              ],
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
      coin: {
        current: 30,
      },
    });
    const manager = new WorkshopWorldNoticeManager({ gameplayFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    manager.mount(parent, popupParent);
    parent.querySelector('.workshop-page__world-notice-open').click();

    popupParent.querySelector('.workshop-page__world-notice-request-action').click();

    const donatePanel = popupParent.querySelector(
      '.workshop-page__world-notice-donate-panel',
    );
    expect(donatePanel.hidden).toBe(false);
    expect(
      donatePanel.querySelector('.style-box__title')?.textContent,
    ).toBe('donate');
    expect(
      donatePanel.querySelector('.workshop-page__world-notice-donate-close'),
    ).not.toBeNull();
    expect(donatePanel.textContent).toContain('send bridge coin');
    const donateRows = new Map(
      [...donatePanel.querySelectorAll('.workshop-page__world-notice-donate-row')]
        .map((row) => [
          row.querySelector('.row_key')?.textContent,
          row.querySelector('.row_val'),
        ]),
    );
    expect(donateRows.get('giving')?.dataset.resourceColor).toBe('coin');
    expect(
      donateRows
        .get('owned')
        ?.querySelector('.style-resource-label--coin .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:coin');
    const donateConfirm = donatePanel.querySelector(
      '.workshop-page__world-notice-donate-confirm',
    );
    expect(
      donateConfirm?.querySelector(
        '.workshop-page__world-notice-donate-confirm-label',
      )?.textContent,
    ).toBe('donate x1');
    expect(
      donateConfirm?.querySelector(
        '.workshop-page__world-notice-donate-confirm-points',
      )?.textContent,
    ).toBe('1 point');

    [...donatePanel.querySelectorAll('.amount-selection-row__step')]
      .find((button) => button.textContent === '+10')
      .click();
    expect(
      donateConfirm?.querySelector(
        '.workshop-page__world-notice-donate-confirm-label',
      )?.textContent,
    ).toBe('donate x11');
    expect(
      donateConfirm?.querySelector(
        '.workshop-page__world-notice-donate-confirm-points',
      )?.textContent,
    ).toBe('11 points');
    donatePanel
      .querySelector('.workshop-page__world-notice-donate-confirm')
      .click();

    expect(gameplayFacade.donateWorldNoticeResource).toHaveBeenCalledWith(
      'weekly-1:siege:coin',
      'coin',
      11,
    );
    expect(donatePanel.hidden).toBe(true);
  });

  it('hides and closes when world events are locked', () => {
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
