// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
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

function getWorkshopCharacterRuleBody(baseCss) {
  return baseCss.match(
    /\.workshop-page__ui-layer > \.workshop-page__personal-tasks,\s*\.workshop-page__ui-layer > \.workshop-page__world-notice\s*\{(?<body>[^}]*)\}/,
  )?.groups?.body;
}

function getRootPixelValue(baseCss, propertyName) {
  return Number(
    baseCss.match(new RegExp(`${propertyName}:\\s*([\\d.]+)px;`))?.at(1),
  );
}

function getRuleBody(baseCss, selector) {
  return baseCss.match(new RegExp(`${selector}\\s*\\{(?<body>[^}]*)\\}`))
    ?.groups?.body;
}

function getRuleBodyContaining(baseCss, selector, text) {
  return [...baseCss.matchAll(new RegExp(`${selector}\\s*\\{(?<body>[^}]*)\\}`, 'g'))]
    .find((match) => match.groups?.body?.includes(text))
    ?.groups?.body;
}

function getRulePixelValue(baseCss, selector, propertyName) {
  return Number(
    getRuleBody(baseCss, selector)
      ?.match(new RegExp(`\\b${propertyName}:\\s*([\\d.]+)px(?:[\\s;]|$)`))
      ?.at(1),
  );
}

describe('WorkshopPageFacade requirement feedback', () => {
  it('keeps world chat close to the bottom room tabs', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const chatBottom = getRootPixelValue(baseCss, '--style-room-chat-bottom');
    const borderWidth = getRootPixelValue(baseCss, '--style-border-width');
    const bottomPanelBottom = getRulePixelValue(
      baseCss,
      '\\.style-panel\\.room-bottom-panel',
      'bottom',
    );
    const bottomTabHeight =
      getRootPixelValue(baseCss, '--style-box-border-label-line-height') * 2;
    const bottomTabPaddingY = getRulePixelValue(
      baseCss,
      '\\.room-bottom-panel__tab',
      'padding',
    );
    const bottomTabRowGap = Number(
      getRuleBody(baseCss, '\\.room-bottom-panel__tabs')
        ?.match(/\bgap:\s*([\d.]+)px\s+[\d.]+px;/)
        ?.at(1),
    );

    const bottomTabOuterHeight = bottomTabHeight + bottomTabPaddingY * 2 + borderWidth * 2;
    const bottomTabsTop = bottomPanelBottom + bottomTabOuterHeight * 2 + bottomTabRowGap;
    const gap = chatBottom + borderWidth - bottomTabsTop;
    expect(gap).toBeGreaterThanOrEqual(9);
    expect(gap).toBeLessThanOrEqual(11);
  });

  it('keeps task and notice characters in bottom-aligned side slots', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = getRuleBody(baseCss, ':root');
    const characterRule = getWorkshopCharacterRuleBody(baseCss);
    const personalTasksRule = getRuleBody(
      baseCss,
      '\\.workshop-page__ui-layer > \\.workshop-page__personal-tasks',
    );
    const worldNoticeRule = getRuleBodyContaining(
      baseCss,
      '\\.workshop-page__ui-layer > \\.workshop-page__world-notice',
      'right:',
    );

    expect(rootRule).toMatch(/--workshop-panel-button-row-shift-y:\s*60px;/);
    expect(characterRule).toContain(
      '--workshop-panel-button-row-3-label-y',
    );
    expect(characterRule).toContain(
      'var(--workshop-panel-button-label-offset-y)',
    );
    expect(characterRule).toMatch(
      /\bheight:\s*var\(--workshop-panel-button-height\);/,
    );
    expect(personalTasksRule).toMatch(
      /\bleft:\s*var\(--style-room-chrome-edge\);/,
    );
    expect(worldNoticeRule).toMatch(
      /\bright:\s*var\(--style-room-chrome-edge\);/,
    );
    expect(baseCss).toMatch(
      /\.workshop-page__panel-button\[data-panel-side="right"\]\s+\.workshop-page__feature-character\s*\{[^}]*\btransform:\s*scaleX\(-1\);/s,
    );
  });

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
    facade.prestigeActionGateManager = { isUnlocked: vi.fn(() => true) };

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
