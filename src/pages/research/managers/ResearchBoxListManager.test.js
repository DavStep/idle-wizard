// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import pngjs from 'pngjs';
import { describe, expect, it, vi } from 'vitest';

import { ResearchBoxListManager } from './ResearchBoxListManager.js';

const { PNG } = pngjs;

function getOpaqueAverageLuminance(image) {
  let luminance = 0;
  let pixels = 0;

  for (let index = 0; index < image.data.length; index += 4) {
    if (image.data[index + 3] === 0) {
      continue;
    }

    luminance +=
      image.data[index] * 0.2126 +
      image.data[index + 1] * 0.7152 +
      image.data[index + 2] * 0.0722;
    pixels += 1;
  }

  return pixels > 0 ? luminance / pixels : 0;
}

function createTouchEvent(type, target, { clientX = 120, clientY = 180 } = {}) {
  const touch = {
    identifier: 1,
    clientX,
    clientY,
    target,
  };
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [touch],
  });
  Object.defineProperty(event, 'targetTouches', {
    value: type === 'touchend' ? [] : [touch],
  });
  Object.defineProperty(event, 'changedTouches', {
    value: [touch],
  });
  return event;
}

function createGameplayFacade(snapshot, overrides = {}) {
  return {
    subscribe(callback) {
      callback(snapshot);
      return () => {};
    },
    getSnapshot() {
      return snapshot;
    },
    setPrestigeRunFocus: () => ({ ok: true }),
    ...overrides,
  };
}

describe('ResearchBoxListManager', () => {
  it('marks completed seed unlock research names with seed metadata', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 5,
      },
      research: {
        boxes: [
          {
            id: 'seedUnlocks',
            label: 'seed unlock researches',
            researches: [
              {
                id: 'unlockSeed:sageSeed',
                label: 'sage seed',
                value: 'researched',
                completed: true,
              },
              {
                id: 'unlockSeed:mintSeed',
                label: 'mint seed',
                value: 'researched',
                completed: true,
              },
              {
                id: 'unlockSeed:nettleSeed',
                label: 'nettle seed',
                value: 'locked',
                completed: false,
                canResearch: false,
                locked: true,
              },
            ],
          },
        ],
        completedResearchIds: ['unlockSeed:sageSeed', 'unlockSeed:mintSeed'],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const rows = [...stage.querySelectorAll('.research-page__row')];
    const researchedNames = rows
      .filter((row) => row.textContent?.includes('Researched'))
      .map((row) => row.querySelector('.research-page__research-name'));
    const lockedRow = rows.find((row) => row.textContent?.includes('nettle seed'));

    expect(researchedNames).toHaveLength(2);
    expect(researchedNames.map((name) => name?.dataset.resourceColor)).toEqual([
      'seed',
      'seed',
    ]);
    expect(lockedRow?.classList.contains('is-unavailable')).toBe(true);
  });

  it('renders research boxes in the standard scroll list', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 5,
      },
      research: {
        boxes: [
          {
            id: 'seedUnlocks',
            label: 'seed unlock researches',
            researches: [
              {
                id: 'unlockSeed:sageSeed',
                label: 'sage seed',
                value: 'researched',
                completed: true,
              },
              {
                id: 'unlockSeed:mintSeed',
                label: 'mint seed',
                value: 'free',
                completed: false,
                canResearch: true,
                description: 'Allows mint seed to drop from summon seed.',
                requiredResearchIds: ['unlockSeed:sageSeed'],
              },
              {
                id: 'unlockSeed:nettleSeed',
                label: 'nettle seed',
                value: 'locked',
                completed: false,
                canResearch: false,
                locked: true,
                requiredResearchIds: ['unlockSeed:mintSeed'],
              },
            ],
          },
        ],
        completedResearchIds: ['unlockSeed:sageSeed'],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const content = stage.querySelector('.research-page__content');
    const list = stage.querySelector('.research-page__box-list');
    const box = stage.querySelector('.research-page__box');
    const rows = [...stage.querySelectorAll('.research-page__row')];

    expect(content).not.toBeNull();
    expect(list?.classList.contains('style-page-scroll')).toBe(true);
    expect(stage.querySelector('.research-page__world-view')).toBeNull();
    expect(stage.querySelector('.research-page__world-shell')).toBeNull();
    expect(stage.querySelector('.research-page__zoom-controls')).toBeNull();
    expect(stage.querySelector('.research-page__tree-connectors')).toBeNull();
    expect(box?.getAttribute('aria-label')).toBe('seed unlock researches');
    expect(box?.classList.contains('style-box')).toBe(false);
    expect(box?.querySelector('.research-page__box-title')?.textContent).toBe(
      'seed unlock researches',
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.className)).toEqual([
      'research-page__row is-completed',
      'research-page__row is-available',
      'research-page__row is-unavailable is-locked',
    ]);
    const researchedButton = rows[0]?.querySelector(
      '.research-page__research-button--completed',
    );
    expect(researchedButton?.textContent).toBe('Researched');
    expect(researchedButton?.disabled).toBe(true);
    expect(researchedButton?.classList.contains('style-button--yellow')).toBe(true);
    expect(
      rows[1]?.querySelector('.research-page__research-description')?.textContent,
    ).toBe('Allows mint seed to drop from summon seed.');
    expect(rows[1]?.querySelector('.research-page__research-art-image')?.src).toContain(
      'icon-research-auto-seed-spawn.png',
    );
    expect(rows[0]?.querySelector('.research-page__research-rank')?.textContent).toBe(
      'Lv. 01/01',
    );
    expect(rows[1]?.querySelector('.research-page__research-rank')?.textContent).toBe(
      'Lv. 00/01',
    );
    expect(stage.querySelector('.research-page__research-summary')).toBeNull();
  });

  it('notifies the Pixi skin owner after replacing research rows', () => {
    const snapshot = {
      playerLevel: { currentLevel: 1 },
      research: {
        boxes: [
          {
            id: 'researchCost',
            label: 'research cost',
            researches: [
              {
                id: 'researchCost:1',
                label: 'research cost',
                value: 'free',
                completed: false,
                canResearch: true,
              },
            ],
          },
        ],
      },
    };
    const onRowsChanged = vi.fn();
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
      onRowsChanged,
    });

    manager.mount(document.createElement('section'));

    expect(onRowsChanged).toHaveBeenCalledTimes(1);
    manager.render(snapshot);
    expect(onRowsChanged).toHaveBeenCalledTimes(1);

    manager.render({
      ...snapshot,
      research: {
        boxes: [
          {
            ...snapshot.research.boxes[0],
            researches: [
              {
                ...snapshot.research.boxes[0].researches[0],
                value: '25 coin',
              },
            ],
          },
        ],
      },
    });
    expect(onRowsChanged).toHaveBeenCalledTimes(2);
  });

  it('reuses pooled box and row widgets when research content changes', () => {
    const firstSnapshot = {
      playerLevel: { currentLevel: 1 },
      research: {
        boxes: [
          {
            id: 'researchCost',
            label: 'research cost',
            researches: [
              {
                id: 'researchCost:1',
                label: 'research cost',
                value: 'free',
                completed: false,
                canResearch: true,
              },
            ],
          },
        ],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(firstSnapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);
    const firstBox = stage.querySelector('.research-page__box');
    const firstRow = stage.querySelector('.research-page__row');

    manager.render({
      playerLevel: { currentLevel: 2 },
      research: {
        boxes: [
          {
            id: 'researchTime',
            label: 'research time',
            researches: [
              {
                id: 'researchTime:1',
                label: 'research time',
                value: '25 coin',
                completed: false,
                canResearch: true,
              },
            ],
          },
        ],
      },
    });

    expect(stage.querySelector('.research-page__box')).toBe(firstBox);
    expect(stage.querySelector('.research-page__row')).toBe(firstRow);
    expect(firstRow?.textContent).toContain('research time');
    expect(manager.boxPool.getStats()).toMatchObject({ created: 1, reused: 1 });
    expect(manager.rowPool.getStats()).toMatchObject({ created: 1, reused: 1 });
  });

  it('marks completed advanced and crystal multiplier names and values by resource', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 9,
      },
      research: {
        tabs: [
          {
            id: 'advanced',
            label: 'advanced research',
            boxes: [
              {
                id: 'advancedAutomation',
                label: 'advanced research',
                researches: [
                  {
                    id: 'advanced:plotGrowth:1:1',
                    label: 'auto plant tile 1',
                    value: 'researched',
                    costEmerald: 1,
                    costCurrency: 'emerald',
                    completed: true,
                  },
                  {
                    id: 'advanced:plotGrowth:2:1',
                    label: 'auto plant tile 2',
                    value: '1 emerald',
                    costEmerald: 1,
                    costCurrency: 'emerald',
                    completed: false,
                    canResearch: true,
                  },
                ],
              },
            ],
          },
          {
            id: 'emerald',
            label: 'crystal research',
            boxes: [
              {
                id: 'cauldronBrewing',
                label: 'cauldron level up',
                researches: [
                  {
                    id: 'emerald:cauldronBrewing:1:2',
                    label: 'cauldron 1',
                    value: '★',
                    effect: 'x2 potions',
                    showEffect: true,
                    actionType: 'levelUp',
                    level: 2,
                    starLevel: 1,
                    costCrystal: 1,
                    costCurrency: 'crystal',
                    completed: true,
                  },
                  {
                    id: 'emerald:cauldronBrewing:1:3',
                    label: 'cauldron 1',
                    value: '2 crystal',
                    effect: 'x3 potions',
                    showEffect: true,
                    actionType: 'levelUp',
                    level: 3,
                    starLevel: 2,
                    costCrystal: 2,
                    costCurrency: 'crystal',
                    completed: false,
                    canResearch: true,
                  },
                ],
              },
            ],
          },
        ],
        completedResearchIds: [
          'advanced:plotGrowth:1:1',
          'emerald:cauldronBrewing:1:2',
        ],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const completedRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('auto plant tile 1'),
    );
    const availableRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('auto plant tile 2'),
    );

    expect(
      completedRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBe('emerald');
    expect(
      completedRow
        ?.querySelector('.research-page__research-button--completed')
        ?.classList.contains('style-button--yellow'),
    ).toBe(true);
    expect(
      availableRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBeUndefined();
    expect(
      availableRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('emerald');

    manager.onSelectTab('emerald');

    const completedEmeraldRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('x2 potions'),
    );
    const availableEmeraldRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('x3 potions'),
    );
    const completedEmeraldName = completedEmeraldRow?.querySelector(
      '.research-page__research-name',
    );
    const completedEmeraldValue = completedEmeraldRow?.querySelector(
      '.research-page__research-value',
    );
    const availableEmeraldName = availableEmeraldRow?.querySelector(
      '.research-page__research-name',
    );

    expect(completedEmeraldName?.textContent).toBe('cauldron 1 ★');
    expect(
      completedEmeraldName?.querySelector('.style-star-level')?.dataset.starCount,
    ).toBe('1');
    expect(completedEmeraldName?.dataset.resourceColor).toBe('crystal');
    expect(completedEmeraldValue?.textContent).toBe('★');
    expect(
      completedEmeraldValue?.querySelector('.style-star-level')?.dataset.starCount,
    ).toBe('1');
    expect(completedEmeraldValue?.dataset.resourceColor).toBe('crystal');
    expect(availableEmeraldName?.textContent).toBe('cauldron 1 ★★');
    expect(stage.textContent).not.toContain('cauldron 1 lvl');
    expect(
      availableEmeraldRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('crystal');
    expect(
      availableEmeraldRow
        ?.querySelector('.research-page__research-button')
        ?.getAttribute('aria-label'),
    ).toBe('level up cauldron 1 ★★ x3 potions for 2 crystal');
  });

  it('keeps completed research values on the normal text color', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(css).toMatch(
      /\.research-page__row\.is-completed\s+\.research-page__research-value\s*\{[^}]*color:\s*var\(--style-text\);/,
    );
    expect(css).not.toContain('--style-resource-crystal');
    expect(css).not.toContain('--style-resource-ruby');
    expect(css).not.toContain('--style-resource-emerald');
  });

  it('keeps research tab labels in one four-column row', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(css).toContain('line-height: var(--style-tiny-line-height);');
    expect(css).toContain('white-space: normal;');
  });

  it('centers research prices inside their action buttons', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const buttonRule = css.match(
      /\.style-button\.research-page__research-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const costContentRule = css.match(
      /\.style-cost-button\s*>\s*\.style-resource-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const costButtonRule = css.match(
      /\.style-button\.style-cost-button\.style-cost-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const costSkinRule = css.match(
      /\.style-button\.style-cost-button\.style-cost-button::after\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const researchCostButtonRule = css.match(
      /\.style-button\.style-cost-button\.research-page__research-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(buttonRule).toContain('text-align: center;');
    expect(costButtonRule).toContain('width: calc(281px / 3);');
    expect(costButtonRule).toContain('height: calc(169px / 3);');
    expect(costButtonRule).toContain('font-family: "Lilita One", sans-serif;');
    expect(costSkinRule).toContain(
      'background: url("../../assets/game/source/ui/root-run-cost-button/green-button-short.png") center / 100%',
    );
    expect(costContentRule).toContain('display: inline-flex;');
    expect(costContentRule).toContain('align-items: center;');
    expect(costContentRule).toContain('justify-content: center;');
    expect(costContentRule).toContain('gap: calc(21.243px / 3);');
    expect(researchCostButtonRule).toContain('width: 80px;');
    expect(researchCostButtonRule).toContain('height: 48px;');
    expect(researchCostButtonRule).toMatch(
      /top:\s*calc\(\s*var\(--style-research-card-action-top\)\s*\+\s*\(70px\s*-\s*48px\)\s*\/\s*2\s*\);/,
    );
    expect(researchCostButtonRule).toMatch(
      /right:\s*calc\(\s*var\(--style-research-card-action-right\)\s*\+\s*\(var\(--style-research-value-width\)\s*-\s*80px\)\s*\/\s*2\s*\);/,
    );
  });

  it('routes available research purchases through the shared cost button', () => {
    const buyResearch = vi.fn();
    const snapshot = {
      playerLevel: { currentLevel: 5 },
      research: {
        boxes: [
          {
            id: 'seedUnlocks',
            label: 'Seed Unlock Researches',
            researches: [
              {
                id: 'unlockSeed:mintSeed',
                label: 'Mint Seed',
                value: '25 coin',
                completed: false,
                canResearch: true,
                requiredResearchIds: [],
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot, { buyResearch }),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const button = stage.querySelector('.research-page__research-button');
    expect(button?.classList.contains('style-cost-button')).toBe(true);
    expect(button?.querySelector('.style-resource-label__amount')?.textContent).toBe('25');
    expect(button?.querySelector('.style-resource-label__icon')?.tagName).toBe('IMG');
    expect(button?.dataset.notification).toBeUndefined();

    button?.click();

    expect(buyResearch).toHaveBeenCalledWith('unlockSeed:mintSeed');
  });

  it('keeps unaffordable research normal and gives locked research its dark monochrome state', () => {
    const snapshot = {
      playerLevel: { currentLevel: 5 },
      research: {
        boxes: [
          {
            id: 'seedUnlocks',
            label: 'Seed Unlock Researches',
            researches: [
              {
                id: 'unlockSeed:mintSeed',
                label: 'Mint Seed',
                value: '25 coin',
                completed: false,
                canResearch: false,
                requiredResearchIds: [],
              },
              {
                id: 'unlockSeed:nettleSeed',
                label: 'Nettle Seed',
                value: 'locked',
                completed: false,
                canResearch: false,
                locked: true,
                requiredPlayerLevel: 6,
                requiredResearchIds: [],
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const rows = [...stage.querySelectorAll('.research-page__row')];
    const unavailableButton = rows[0]?.querySelector('.research-page__research-button');
    const lockedButton = rows[1]?.querySelector('.research-page__research-button');

    expect(rows[0]?.className).toBe('research-page__row is-unavailable');
    expect(unavailableButton?.classList.contains('style-cost-button')).toBe(true);
    expect(unavailableButton?.classList.contains('is-unaffordable')).toBe(true);
    expect(unavailableButton?.disabled).toBe(true);
    expect(unavailableButton?.textContent).toContain('25');

    expect(rows[1]?.className).toBe('research-page__row is-unavailable is-locked');
    expect(lockedButton?.classList.contains('style-cost-button')).toBe(true);
    expect(lockedButton?.classList.contains('is-locked')).toBe(true);
    expect(lockedButton?.disabled).toBe(true);
    expect(
      lockedButton?.querySelector('.research-page__research-lock-title')?.textContent,
    ).toBe('Locked');
    expect(
      lockedButton?.querySelector('.research-page__research-lock-reason')?.textContent,
    ).toBe('Reach level 6');
    expect(lockedButton?.querySelector('.style-resource-label')).toBeNull();
    expect(lockedButton?.title).toBe('requires level 6.');
    expect(lockedButton?.getAttribute('aria-label')).toContain(
      'is locked, Reach level 6',
    );

    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const disabledSkinRule = css.match(
      /\.style-button\.style-cost-button\.style-cost-button:is\(\s*\[aria-disabled="true"\],[\s\S]*?\)::after\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const disabledResearchSkinRule = css.match(
      /\.style-button\.style-cost-button\.research-page__research-button:is\(\s*\[aria-disabled="true"\],[\s\S]*?\)::after\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    expect(disabledSkinRule).toContain(
      'background-image: url("../../assets/game/source/ui/root-run-cost-button/gray-button-short.png");',
    );
    expect(disabledSkinRule).not.toContain('filter:');
    expect(disabledResearchSkinRule).toBeUndefined();
    const costButtonAssetDir = `${cwd()}/assets/game/source/ui/root-run-cost-button`;
    for (const [greenName, grayName] of [
      ['green-button.png', 'gray-button.png'],
      ['green-button-short.png', 'gray-button-short.png'],
      ['green-button-9slice.png', 'gray-button-9slice.png'],
    ]) {
      const greenSkin = PNG.sync.read(
        readFileSync(`${costButtonAssetDir}/${greenName}`),
      );
      const graySkin = PNG.sync.read(
        readFileSync(`${costButtonAssetDir}/${grayName}`),
      );
      expect([graySkin.width, graySkin.height]).toEqual([
        greenSkin.width,
        greenSkin.height,
      ]);
      let alphaMatches = true;
      let grayChannelsMatch = true;
      for (let index = 0; index < graySkin.data.length; index += 4) {
        alphaMatches &&= graySkin.data[index + 3] === greenSkin.data[index + 3];
        grayChannelsMatch &&=
          graySkin.data[index] === graySkin.data[index + 1] &&
          graySkin.data[index + 1] === graySkin.data[index + 2];
      }
      expect(alphaMatches).toBe(true);
      expect(grayChannelsMatch).toBe(true);
    }
    expect(css).toMatch(
      /\.research-page__row\.is-locked\s*\{[^}]*background-image:\s*url\("\.\.\/\.\.\/assets\/game\/source\/ui\/root-run-research\/research-card-locked-1000x304\.png"\);/,
    );
    expect(css).toMatch(
      /\.research-page__row\.is-locked\s*\{[^}]*color:\s*#fff;/,
    );
    expect(css).toMatch(
      /\.research-page__row\.is-locked\s+\.research-page__research-art\s*\{[^}]*background-image:\s*url\("\.\.\/\.\.\/assets\/game\/source\/ui\/root-run-research\/research-art-well-locked-204x194\.png"\);/,
    );
    expect(css).toMatch(
      /\.research-page__row\.is-locked\s+\.research-page__research-art-image\s*\{[^}]*filter:\s*grayscale\(1\) brightness\(1\.4\);[^}]*opacity:\s*1;/,
    );
    expect(css).toMatch(
      /\.style-button\.style-cost-button\.research-page__research-button\.is-unaffordable::after\s*\{[^}]*background-image:\s*url\("\.\.\/\.\.\/assets\/game\/source\/ui\/root-run-cost-button\/green-button-short\.png"\);/,
    );
    expect(css).toMatch(
      /\.style-button\.style-cost-button\.research-page__research-button\.is-unaffordable\s+\.style-resource-label__amount\s*\{[^}]*color:\s*#c1121f;/,
    );
  });

  it('uses the standard full-page scroll list structure', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const contentRule = css.match(
      /\.research-page__content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const listRule = css.match(
      /\.research-page__box-list\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(contentRule).toContain('top: var(--style-room-content-top);');
    expect(contentRule).toContain('right: 16px;');
    expect(contentRule).toContain('bottom: var(--style-room-chat-clearance);');
    expect(contentRule).toContain('left: 16px;');
    expect(listRule).toContain('bottom: var(--style-page-tab-scroll-clearance);');
    expect(listRule).toContain('display: flex;');
    expect(listRule).toContain('flex-direction: column;');
    expect(listRule).toContain('gap: 18px;');
    expect(listRule).toContain('padding-top: var(--style-page-scroll-padding-top);');
    expect(listRule).toContain(
      'padding-bottom: var(--style-page-scroll-padding-bottom);',
    );
    expect(listRule).toContain('overflow: hidden auto;');
    expect(css).not.toContain('.research-page__world-view');
    expect(css).not.toContain('.research-page__world-shell');
    expect(css).not.toContain('.research-page__tree-connectors');
    expect(css).not.toContain('.research-page__tree-node');
    expect(css).not.toContain('.research-page__zoom-controls');
  });

  it('keeps exact Root Run geometry and whole-image fallbacks for Pixi startup', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const assetDir = `${cwd()}/assets/game/source/ui/root-run-research`;
    const rootRule = css.match(/:root\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body;
    const rowRule = css.match(
      /\.research-page__row\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const artRule = css.match(
      /\.research-page__research-art\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const artImageRule = css.match(
      /\.research-page__research-art-image\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const boxRule = css.match(
      /\.research-page__box\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const costButtonRule = css.match(
      /\.style-button\.style-cost-button\.research-page__research-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rankRule = css.match(
      /\.research-page__research-rank\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rankSkinRule = css.match(
      /\.research-page__research-rank::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toContain(
      '--style-research-card-width: calc(1000px * 390 / 1080);',
    );
    expect(rootRule).toContain('--style-research-row-height: 90px;');
    expect(rootRule).toContain(
      '--style-research-value-width: calc(281px * 390 / 1080);',
    );
    expect(rootRule).toContain('--style-research-card-art-width: 58px;');
    expect(rootRule).toContain('--style-research-card-art-height: 58px;');
    expect(rootRule).toContain('--style-research-card-art-top: 16px;');
    expect(rootRule).toContain('--style-research-card-action-top: 10px;');
    expect(boxRule).toContain('gap: 5px;');
    expect(rowRule).toContain('height: var(--style-research-row-height);');
    expect(rowRule).toContain('width: var(--style-research-card-width);');
    expect(rowRule).toContain('margin-left: -2px;');
    expect(rowRule).toContain(
      'background: transparent url("../../assets/game/source/ui/root-run-research/research-card-1000x304.png") center / 100% 100% no-repeat;',
    );
    expect(rowRule).toContain('border-image: none;');
    expect(artRule).toContain('width: var(--style-research-card-art-width);');
    expect(artRule).toContain('height: var(--style-research-card-art-height);');
    expect(artRule).toContain(
      'background: transparent url("../../assets/game/source/ui/root-run-research/research-art-well-204x194.png") center / 100% 100% no-repeat;',
    );
    expect(artRule).toContain('border-image: none;');
    expect(artImageRule).toContain('width: 64px;');
    expect(artImageRule).toContain('height: 64px;');
    expect(costButtonRule).toContain('width: 80px;');
    expect(costButtonRule).toContain('height: 48px;');
    expect(rankRule).toContain('width: 217px;');
    expect(rankRule).toContain('height: 62px;');
    expect(rankRule).toContain('padding: 8px 25px;');
    expect(rankRule).toContain('font-size: 40px;');
    expect(rankRule).toContain('line-height: 46px;');
    expect(rankRule).toContain('transform: scale(0.3);');
    expect(rankRule).toContain('transform-origin: top right;');
    expect(rankRule).toContain('-webkit-text-stroke: 4px #0a0a0a;');
    expect(rankRule).not.toContain('border-image');
    expect(rankSkinRule).toContain(
      'background: transparent url("../../assets/game/source/ui/root-run-research/research-rank-badge-217x62.png") center / 100% 100% no-repeat;',
    );
    expect(rankSkinRule).toContain('border-image: none;');
    expect(
      [
        rowRule,
        artRule,
        rankSkinRule,
      ].join('\n'),
    ).not.toContain('border-image-source');
    expect(
      [
        'research-card-1000x304.png',
        'research-card-locked-1000x304.png',
        'research-art-well-204x194.png',
        'research-art-well-locked-204x194.png',
        'research-rank-badge-217x62.png',
      ].map((fileName) => {
        const image = PNG.sync.read(readFileSync(`${assetDir}/${fileName}`));
        return [image.width, image.height];
      }),
    ).toEqual([
      [1000, 304],
      [1000, 304],
      [204, 194],
      [204, 194],
      [217, 62],
    ]);
    const normalCard = PNG.sync.read(
      readFileSync(`${assetDir}/research-card-1000x304.png`),
    );
    const lockedCard = PNG.sync.read(
      readFileSync(`${assetDir}/research-card-locked-1000x304.png`),
    );
    let lockedAlphaMatches = true;
    let lockedChannelsAreGray = true;
    for (let index = 0; index < lockedCard.data.length; index += 4) {
      lockedAlphaMatches &&=
        lockedCard.data[index + 3] === normalCard.data[index + 3];
      lockedChannelsAreGray &&=
        lockedCard.data[index] === lockedCard.data[index + 1] &&
        lockedCard.data[index + 1] === lockedCard.data[index + 2];
    }
    expect(lockedAlphaMatches).toBe(true);
    expect(lockedChannelsAreGray).toBe(true);
    expect(getOpaqueAverageLuminance(lockedCard)).toBeLessThan(
      getOpaqueAverageLuminance(normalCard) * 0.45,
    );
    const normalArt = PNG.sync.read(
      readFileSync(`${assetDir}/research-art-well-204x194.png`),
    );
    const lockedArt = PNG.sync.read(
      readFileSync(`${assetDir}/research-art-well-locked-204x194.png`),
    );
    let lockedArtAlphaMatches = true;
    let lockedArtChannelsAreGray = true;
    for (let index = 0; index < lockedArt.data.length; index += 4) {
      lockedArtAlphaMatches &&=
        lockedArt.data[index + 3] === normalArt.data[index + 3];
      lockedArtChannelsAreGray &&=
        lockedArt.data[index] === lockedArt.data[index + 1] &&
        lockedArt.data[index + 1] === lockedArt.data[index + 2];
    }
    expect(lockedArtAlphaMatches).toBe(true);
    expect(lockedArtChannelsAreGray).toBe(true);
    expect(getOpaqueAverageLuminance(lockedArt)).toBeLessThan(
      getOpaqueAverageLuminance(normalArt) * 0.5,
    );
    expect(css).toContain(
      '.research-page__ui-layer[data-research-skin-renderer="pixi"]',
    );
    expect(css).toContain('background-image: none;');
    expect(css).not.toContain('.research-page__research-summary');
  });

  it('renders active research timers and bars with stepped progress', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 4,
      },
      research: {
        boxes: [
          {
            id: 'seedUnlocks',
            label: 'seed unlock researches',
            researches: [
              {
                id: 'unlockSeed:sageSeed',
                label: 'sage seed',
                value: 'researching',
                completed: false,
                inProgress: true,
                canResearch: false,
                totalMs: 120_000,
                remainingMs: 75_000,
                progress: 0.375,
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');
    const frameCallbacks = [];

    document.body.append(stage);
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      }),
    });

    manager.mount(stage);

    const value = stage.querySelector('.research-page__research-value');
    const fill = stage.querySelector('.research-page__research-progress-fill');

    expect(value?.textContent).toBe('researching 1m 15s');
    expect(fill?.style.width).toBe('37.5%');

    for (const callback of frameCallbacks) {
      callback();
    }

    expect(fill?.classList.contains('is-progress-running')).toBe(true);
    expect(fill?.style.transition).toBe('width 75000ms linear');
    expect(fill?.style.width).toBe('100%');
  });

  it('opens locked research info on row tap and explains missing requirements', () => {
    const onShowResearchInfo = vi.fn();
    const snapshot = {
      playerLevel: {
        currentLevel: 4,
      },
      research: {
        boxes: [
          {
            id: 'recipeUnlocks',
            label: 'recipe unlocks research',
            researches: [
              {
                id: 'unlockRecipe:manaTonic',
                label: 'mana tonic',
                value: 'free',
                effect: 'brew',
                description: 'allows valid cauldron ingredients to brew mana tonic.',
                costCoin: 0,
                completed: false,
                canResearch: true,
                requiredPlayerLevel: 5,
              },
              {
                id: 'unlockRecipe:minorHealingPotion',
                label: 'minor healing potion',
                value: 'locked',
                effect: 'brew',
                description:
                  'allows valid cauldron ingredients to brew minor healing potion.',
                costCoin: 60,
                completed: false,
                locked: true,
                canResearch: false,
                requiredResearchIds: ['unlockRecipe:manaTonic'],
                requiredPlayerLevel: 6,
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
      onShowResearchInfo,
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    const row = [...stage.querySelectorAll('.research-page__row')].find((candidate) =>
      candidate.textContent?.includes('minor healing potion'),
    );

    expect(row?.classList.contains('is-locked')).toBe(true);

    row.dispatchEvent(createTouchEvent('touchstart', row));
    row.dispatchEvent(createTouchEvent('touchend', row));
    row.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onShowResearchInfo).toHaveBeenCalledTimes(1);
    expect(onShowResearchInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'unlockRecipe:minorHealingPotion',
        lockReason: 'requires mana tonic research and level 6.',
      }),
    );

    manager.unmount();
    stage.remove();
  });

  it('does not explain locked research when the row touch scrolls', () => {
    const onShowResearchInfo = vi.fn();
    const snapshot = {
      playerLevel: {
        currentLevel: 4,
      },
      research: {
        boxes: [
          {
            id: 'recipeUnlocks',
            label: 'recipe unlock researches',
            researches: [
              {
                id: 'unlockRecipe:minorHealingPotion',
                label: 'minor healing potion',
                value: 'locked',
                effect: 'brew',
                description:
                  'allows valid cauldron ingredients to brew minor healing potion.',
                costCoin: 60,
                completed: false,
                locked: true,
                canResearch: false,
                requiredResearchIds: ['unlockRecipe:manaTonic'],
                requiredPlayerLevel: 6,
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
      onShowResearchInfo,
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    const row = stage.querySelector('.research-page__row');
    row.dispatchEvent(createTouchEvent('touchstart', row, { clientX: 10, clientY: 10 }));
    document.dispatchEvent(createTouchEvent('touchmove', row, { clientX: 10, clientY: 32 }));
    row.dispatchEvent(createTouchEvent('touchend', row, { clientX: 10, clientY: 32 }));

    expect(onShowResearchInfo).not.toHaveBeenCalled();

    manager.unmount();
    stage.remove();
  });

  it('explains prestige-locked research requirements', () => {
    const onShowResearchInfo = vi.fn();
    const snapshot = {
      playerLevel: {
        currentLevel: 17,
      },
      prestige: {
        completedLevels: [],
      },
      research: {
        boxes: [
          {
            id: 'cauldronCapacity',
            label: 'cauldron capacity research',
            researches: [
              {
                id: 'advanced:cauldronCapacity:3',
                label: 'cauldron 3 capacity',
                value: 'locked',
                effect: '+1 cauldron',
                description: 'raises cauldron capacity to 3.',
                costRuby: 1,
                costCurrency: 'ruby',
                completed: false,
                locked: true,
                canResearch: false,
                requiredPrestigeCount: 1,
                requiredResearchIds: [],
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
      onShowResearchInfo,
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    const row = stage.querySelector('.research-page__row');
    row.dispatchEvent(createTouchEvent('touchstart', row));
    row.dispatchEvent(createTouchEvent('touchend', row));

    expect(onShowResearchInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'advanced:cauldronCapacity:3',
        lockReason: 'requires 1 prestige.',
      }),
    );

    manager.unmount();
    stage.remove();
  });

  it('does not render a timed research slot limit', () => {
    const snapshot = {
      playerLevel: { currentLevel: 17 },
      prestige: { completedLevels: [] },
      research: {
        slots: { active: 2, max: 2, full: true },
        boxes: [
          {
            id: 'researchTime',
            label: 'research time research',
            researches: [
              {
                id: 'advanced:researchTime:1',
                label: 'research time lvl 1',
                value: '1 ruby',
                effect: '-10% time',
                completed: false,
                canResearch: true,
                requiredResearchIds: [],
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    expect(stage.querySelector('.research-page__slot-status')).toBeNull();
    expect(stage.querySelector('.research-page__research-button')?.disabled).toBe(false);

    manager.unmount();
    stage.remove();
  });

  it('pins run-focus matching research boxes first', () => {
    const setPrestigeRunFocus = vi.fn(() => ({ ok: true }));
    const snapshot = {
      playerLevel: {
        currentLevel: 17,
      },
      prestige: {
        completedLevels: [10, 20, 30],
        runFocus: {
          unlocked: true,
          selected: 'capacity',
          options: [
            { id: 'none', label: 'none' },
            { id: 'capacity', label: 'capacity' },
            { id: 'automation', label: 'automation' },
          ],
        },
      },
      research: {
        boxes: [
          {
            id: 'researchTime',
            label: 'research time research',
            researches: [],
          },
          {
            id: 'plotCapacity',
            label: 'plot capacity research',
            researches: [],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot, { setPrestigeRunFocus }),
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    const boxes = [...stage.querySelectorAll('.research-page__box')];
    expect(stage.querySelector('.research-page__run-focus')?.textContent).toContain(
      'capacity boxes first',
    );
    expect(boxes[0]?.getAttribute('aria-label')).toBe('plot capacity research');

    stage
      .querySelector('.research-page__run-focus-button[aria-pressed="false"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(setPrestigeRunFocus).toHaveBeenCalledWith('none');

    manager.unmount();
    stage.remove();
  });
});
