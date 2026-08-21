// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { createHash } from 'node:crypto';

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
  it('uses the mana icon with distinct capacity and generation modifiers', () => {
    const manager = new ResearchBoxListManager();

    expect(
      manager.getResearchArtworkUrl('manaSphere', 'manaSphereCap:1'),
    ).toContain('icon-mana-drop.png');
    expect(
      manager.getResearchArtworkUrl('manaSphere', 'manaProductionRate:1'),
    ).toContain('icon-mana-drop.png');

    const capacityExtra = manager.createResearchArtworkExtra({
      id: 'manaSphereCap:1',
    });
    const generationExtra = manager.createResearchArtworkExtra({
      id: 'manaProductionRate:1',
    });

    expect(capacityExtra[0]?.src).toContain(
      'icon-research-mana-capacity-up.png',
    );
    expect(generationExtra[0]?.src).toContain(
      'icon-research-mana-generation-plus.png',
    );
  });

  it('preserves utility-specific artwork inside the combined section', () => {
    const manager = new ResearchBoxListManager();

    expect(
      manager.getResearchArtworkUrl('utilityUnlocks', 'summonSeedsX2'),
    ).toContain('icon-research-summon-multiplier.png');
    expect(
      manager.getResearchArtworkUrl('utilityUnlocks', 'garden:plantAll'),
    ).toContain('icon-research-auto-plant.png');
    expect(
      manager.getResearchArtworkUrl('utilityUnlocks', 'manaSphereCap:1'),
    ).toContain('icon-mana-drop.png');
  });

  it('renders research tab button labels in Title Case', () => {
    const snapshot = {
      research: {
        tabs: [
          { id: 'regular', label: 'regular research', boxes: [] },
          { id: 'automation', label: 'automation', boxes: [] },
          { id: 'advanced', label: 'advanced research', boxes: [] },
          { id: 'crystal', label: 'amber research', boxes: [] },
        ],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    expect(
      [...stage.querySelectorAll('.research-page__tab-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual([
      'Regular Research',
      'Automation',
      'Advanced Research',
      'Amber Research',
    ]);
  });

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

    const toggle = stage.querySelector('.research-page__completed-toggle');
    const visibilityIcon = toggle?.querySelector(
      '.research-page__completed-toggle-icon',
    );
    expect(visibilityIcon?.tagName).toBe('svg');
    expect(visibilityIcon?.querySelectorAll('path')).toHaveLength(1);
    expect(visibilityIcon?.querySelectorAll('circle')).toHaveLength(1);
    expect(toggle?.querySelector('img')).toBeNull();
    expect(readFileSync(`${cwd()}/src/styles/base.css`, 'utf8')).toMatch(
      /\.research-page__completed-toggle\s*\{[^}]*margin:\s*0 8px 0 0;/,
    );
    expect(toggle?.getAttribute('aria-pressed')).toBe('false');
    toggle?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const rows = [...stage.querySelectorAll('.research-page__row')];
    const researchedNames = rows
      .filter((row) =>
        row.querySelector('.research-page__research-status--completed'),
      )
      .map((row) => row.querySelector('.research-page__research-name'));
    const lockedRow = rows.find((row) => row.textContent?.includes('nettle seed'));

    expect(researchedNames).toHaveLength(2);
    expect(researchedNames.map((name) => name?.dataset.resourceColor)).toEqual([
      undefined,
      undefined,
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
                value: 'Free',
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
    let rows = [...stage.querySelectorAll('.research-page__row')];

    expect(content).not.toBeNull();
    expect(list?.classList.contains('style-page-scroll')).toBe(true);
    expect(stage.querySelector('.research-page__world-view')).toBeNull();
    expect(stage.querySelector('.research-page__world-shell')).toBeNull();
    expect(stage.querySelector('.research-page__zoom-controls')).toBeNull();
    expect(stage.querySelector('.research-page__tree-connectors')).toBeNull();
    expect(box?.getAttribute('aria-label')).toBe('seed unlock researches');
    expect(box?.classList.contains('style-box')).toBe(false);
    expect(box?.querySelector('.research-page__box-title')?.textContent).toBe(
      'Seed Unlock Researches',
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.className)).toEqual([
      'research-page__row is-available',
      'research-page__row is-unavailable is-locked',
    ]);
    const toggle = stage.querySelector('.research-page__completed-toggle');
    expect(toggle?.getAttribute('aria-pressed')).toBe('false');
    expect(toggle?.getAttribute('aria-label')).toBe(
      'Show researched Seed Unlock Researches',
    );
    toggle?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    rows = [...stage.querySelectorAll('.research-page__row')];
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.className)).toEqual([
      'research-page__row is-available',
      'research-page__row is-unavailable is-locked',
      'research-page__row is-completed',
    ]);
    const researchedStatus = rows[2]?.querySelector(
      '.research-page__research-status--completed',
    );
    expect(researchedStatus?.getAttribute('role')).toBe('img');
    expect(researchedStatus?.getAttribute('aria-label')).toBe(
      'sage seed is researched',
    );
    expect(
      researchedStatus?.querySelector('.research-page__research-status-icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('status:checkDefault');
    expect(rows[2]?.querySelector('.style-cost-button')).toBeNull();
    expect(
      rows[0]?.querySelector('.research-page__research-description')?.textContent,
    ).toBe('Allows mint seed to drop from summon seed.');
    const mintArtwork = rows[0]?.querySelector(
      '.research-page__research-art-image',
    );
    expect(mintArtwork?.dataset.assetAtlasFrame).toBe('seed:pack');
    expect(mintArtwork?.dataset.seedPackItemFrame).toBe('herb:mintHerb');
    expect(stage.querySelector('.research-page__research-rank')).toBeNull();
    expect(
      rows[0]?.querySelector('.style-cost-button__plain-label')?.textContent,
    ).toBe('Free');
    expect(stage.querySelector('.research-page__research-summary')).toBeNull();
  });

  it('omits the completed-research toggle when a section has nothing to hide', () => {
    const snapshot = {
      research: {
        boxes: [
          {
            id: 'seedUnlocks',
            label: 'seed unlock researches',
            researches: [
              {
                id: 'unlockSeed:mintSeed',
                label: 'mint seed',
                value: 'Free',
                completed: false,
                canResearch: true,
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

    expect(stage.querySelector('.research-page__completed-toggle')).toBeNull();
  });

  it('hides unrevealed rows and sections until their progression gate is reached', () => {
    const snapshot = {
      playerLevel: { currentLevel: 5 },
      prestige: { completedLevels: [] },
      research: {
        boxes: [
          {
            id: 'utilityUnlocks',
            label: 'utility unlocks',
            researches: [
              {
                id: 'summonSeedsX2',
                label: 'summon seed lvl 1',
                requiredPlayerLevel: 6,
                value: 'locked',
                locked: true,
                canResearch: false,
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

    expect(stage.querySelector('.research-page__box')).toBeNull();

    snapshot.playerLevel.currentLevel = 6;
    snapshot.research.boxes[0].researches[0] = {
      ...snapshot.research.boxes[0].researches[0],
      value: '1k coin',
      locked: false,
      canResearch: true,
    };
    manager.render(snapshot);

    expect(stage.querySelector('.research-page__box')?.textContent).toContain(
      'summon seed lvl 1',
    );
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
            label: 'amber research',
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
                    starMaxLevel: 2,
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
                    starMaxLevel: 2,
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
    stage
      .querySelector('.research-page__completed-toggle')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const completedRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('auto plant tile 1'),
    );
    const availableRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('auto plant tile 2'),
    );

    expect(
      completedRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBeUndefined();
    expect(
      completedRow
        ?.querySelector('.research-page__research-status-icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('status:checkDefault');
    expect(
      completedRow
        ?.querySelector('.research-page__research-status--completed')
        ?.getAttribute('aria-label'),
    ).toBe('auto plant tile 1 is researched');
    expect(
      availableRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBeUndefined();
    expect(
      availableRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('emerald');
    expect(
      stage
        .querySelector('.research-page__box-title')
        ?.classList.contains('research-page__box-title--advanced'),
    ).toBe(true);

    manager.onSelectTab('emerald');
    stage
      .querySelector('.research-page__completed-toggle')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

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
    expect(
      completedEmeraldName?.querySelector('.style-star-level')?.dataset.starSlots,
    ).toBe('2');
    expect(completedEmeraldName?.dataset.resourceColor).toBeUndefined();
    expect(completedEmeraldValue?.textContent).toBe('★');
    expect(
      completedEmeraldValue?.querySelector('.style-star-level')?.dataset.starCount,
    ).toBe('1');
    expect(completedEmeraldValue?.dataset.resourceColor).toBe('crystal');
    expect(availableEmeraldName?.textContent).toBe('cauldron 1 ★★');
    expect(
      availableEmeraldName?.querySelectorAll('.style-star-level__slot'),
    ).toHaveLength(2);
    expect(stage.textContent).not.toContain('cauldron 1 lvl');
    expect(
      availableEmeraldRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('crystal');
    expect(
      availableEmeraldRow
        ?.querySelector('.research-page__research-button')
        ?.getAttribute('aria-label'),
    ).toBe('level up cauldron 1 ★★ x3 potions for 2 crystal');
    expect(
      stage
        .querySelector('.research-page__box-title')
        ?.classList.contains('research-page__box-title--crystal'),
    ).toBe(true);
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

  it('uses the approved Root Run station title plaque with dynamic width and spacing', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const expectedAssets = {
      yellow: '2946564020e76e29e311bb7b1ca02652ba519068c8c9dd7195cf69f35baff688',
      red: 'beb8b3085544c1548b45039840ab8dd7f631b1fe200720155b78e6de9ef42821',
      green: 'ce91d604fa828bf351f619278a569783af95173a152fd55732501186de1e06b1',
      purple: 'd7fbe4cff8854460c7defb9eda82b3508ff45f1ecc766e434ac65e0d693d9b7d',
    };
    const titleRule = css.match(
      /\.research-page__box-title\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const titleSkinRule = css.match(
      /\.research-page__box-title::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    for (const [color, expectedHash] of Object.entries(expectedAssets)) {
      const asset = readFileSync(
        `${cwd()}/assets/game/source/ui/banners/banner-${color}-right.9.png`,
      );
      expect(PNG.sync.read(asset)).toMatchObject({ width: 171, height: 121 });
      expect(createHash('sha256').update(asset).digest('hex')).toBe(
        expectedHash,
      );
    }
    expect(titleRule).toContain('width: max-content;');
    expect(titleRule).toContain('height: 31.5px;');
    expect(titleRule).toContain('padding: 0 36px 0 9px;');
    expect(titleRule).toContain('font-size: 13.5px;');
    expect(titleRule).toContain('white-space: nowrap;');
    expect(css).toMatch(
      /\.research-page__content\s*\{[^}]*left:\s*0;/,
    );
    expect(css).toMatch(
      /\.research-page__tabs\s*\{[^}]*left:\s*var\(--style-room-content-edge\);/,
    );
    expect(css).toMatch(
      /\.research-page__row\s*\{[^}]*margin-left:\s*calc\(var\(--style-room-content-edge\) - 2px\);/,
    );
    expect(css).toMatch(
      /\.research-page__research-status-icon\s*\{[^}]*width:\s*30px;[^}]*height:\s*28px;/,
    );
    expect(titleSkinRule).toContain('height: 117px;');
    expect(titleSkinRule).toContain('border-width: 0 165px 0 5px;');
    expect(titleSkinRule).toContain(
      'border-image: var(--research-station-title-image)',
    );
    expect(css).toMatch(
      /\.research-page__box-title--regular\s*\{[^}]*banner-yellow-right\.9\.png/,
    );
    expect(css).toMatch(
      /\.research-page__box-title--automation\s*\{[^}]*banner-red-right\.9\.png/,
    );
    expect(css).toMatch(
      /\.research-page__box-title--advanced\s*\{[^}]*banner-green-right\.9\.png/,
    );
    expect(css).toMatch(
      /\.research-page__box-title--crystal\s*\{[^}]*banner-purple-right\.9\.png/,
    );
    expect(css).toMatch(
      /\.research-page__box-list\s*\{[^}]*gap:\s*18px;/,
    );
    expect(css).toMatch(
      /\.research-page__box\s*\{[^}]*gap:\s*5px;/,
    );
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
    expect(costSkinRule).toMatch(
      /border-image-source:\s*var\(--style-green-button-frame\);/,
    );
    expect(costContentRule).toContain('display: inline-flex;');
    expect(costContentRule).toContain('align-items: center;');
    expect(costContentRule).toContain('justify-content: center;');
    expect(costContentRule).toContain('gap: var(--style-icon-label-gap);');
    expect(researchCostButtonRule).toContain('width: 72px;');
    expect(researchCostButtonRule).toContain('height: 42px;');
    expect(researchCostButtonRule).toMatch(
      /top:\s*calc\(\s*var\(--style-research-card-action-top\)\s*\+\s*var\(--style-research-card-content-offset-y\)\s*\+\s*\(64px\s*-\s*42px\)\s*\/\s*2\s*\);/,
    );
    expect(researchCostButtonRule).toMatch(
      /right:\s*calc\(\s*var\(--style-research-card-action-right\)\s*\+\s*\(var\(--style-research-value-width\)\s*-\s*72px\)\s*\/\s*2\s*\);/,
    );
    const researchedStatusRule = css.match(
      /\.research-page__research-status--completed\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    expect(researchedStatusRule).toContain(
      'width: var(--style-research-value-width);',
    );
    expect(researchedStatusRule).toContain('height: 64px;');
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
    expect(button?.dataset.notification).toBe('true');

    button?.click();

    expect(buyResearch).toHaveBeenCalledWith('unlockSeed:mintSeed');
  });

  it('keeps unaffordable research normal and dims locked research with an overlay', () => {
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
                requiredPlayerLevel: 5,
                requiredResearchIds: ['unlockSeed:mintSeed'],
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
    ).toBe('Requires Mint Seed research');
    expect(lockedButton?.querySelector('.style-resource-label')).toBeNull();
    expect(lockedButton?.title).toBe('requires Mint Seed research.');
    expect(lockedButton?.getAttribute('aria-label')).toContain(
      'is locked, Requires Mint Seed research',
    );

    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const disabledSkinRule = css.match(
      /\.style-button\.style-cost-button\.style-cost-button:is\(\s*\[aria-disabled="true"\],[\s\S]*?\)::after\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const disabledResearchSkinRule = css.match(
      /\.style-button\.style-cost-button\.research-page__research-button:is\(\s*\[aria-disabled="true"\],[\s\S]*?\)::after\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    expect(disabledSkinRule).toContain(
      'border-image-source: var(--style-green-button-disabled-frame);',
    );
    expect(disabledSkinRule).not.toContain('filter:');
    expect(disabledResearchSkinRule).toBeUndefined();
    const regularButtonAssetDir =
      `${cwd()}/assets/game/source/ui/regular-button`;
    const regularGreen = PNG.sync.read(
      readFileSync(`${regularButtonAssetDir}/green-button-50.9.png`),
    );
    const regularGray = PNG.sync.read(
      readFileSync(`${regularButtonAssetDir}/gray-button-50.9.png`),
    );
    expect([regularGray.width, regularGray.height]).toEqual([
      regularGreen.width,
      regularGreen.height,
    ]);
    for (let index = 0; index < regularGray.data.length; index += 4) {
      expect(regularGray.data[index + 3]).toBe(
        regularGreen.data[index + 3],
      );
      expect(regularGray.data[index]).toBe(
        regularGray.data[index + 1],
      );
      expect(regularGray.data[index + 1]).toBe(
        regularGray.data[index + 2],
      );
    }
    expect(css).toMatch(
      /\.research-page__row\.is-locked\s*\{[^}]*background-image:\s*url\("\.\.\/\.\.\/assets\/game\/source\/ui\/root-run-research\/research-card-1000x304\.9\.png"\);/,
    );
    expect(css).toMatch(
      /\.research-page__row\.is-locked\s*\{[^}]*color:\s*#634934;/,
    );
    expect(css).toMatch(
      /\.research-page__row\.is-locked::after\s*\{[^}]*background:\s*transparent\s+url\("\.\.\/\.\.\/assets\/game\/source\/ui\/root-run-research\/research-card-1000x304\.9\.png"\)\s+center\s*\/\s*100%\s+100%\s+no-repeat;[^}]*filter:\s*brightness\(0\);[^}]*opacity:\s*0\.3;/,
    );
    expect(css).toMatch(
      /\.research-page__row\.is-locked\s+\.research-page__research-art\s*\{[^}]*background-color:\s*#dbc19f;/,
    );
    expect(css).toMatch(
      /\.research-page__row\.is-locked\s+\.research-page__research-art-image\s*\{[^}]*filter:\s*none;[^}]*opacity:\s*1;/,
    );
    expect(css).toMatch(
      /\.style-button\.style-cost-button\.research-page__research-button\.is-unaffordable:not\(\s*\.research-page__research-button--in-progress\s*\)::after\s*\{[^}]*border-image-source:\s*var\(--style-green-button-frame\);/,
    );
    expect(css).toMatch(
      /\.style-button\.style-cost-button\.research-page__research-button\.is-unaffordable\s+\.style-resource-label__amount\s*\{[^}]*color:\s*var\(--style-insufficient\);/,
    );
    expect(css).toMatch(/--style-insufficient:\s*#ff5965;/);
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
    expect(contentRule).toContain('left: 0;');
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

  it('keeps exact Root Run geometry and a tinted white-squircle fallback', () => {
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
    const seedArtImageRule = css.match(
      /\.research-page__research-art-image\.style-seed-pack-composite\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const boxRule = css.match(
      /\.research-page__box\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const costButtonRule = css.match(
      /\.style-button\.style-cost-button\.research-page__research-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toMatch(
      /--style-research-card-width:\s*calc\(\s*390px\s*-\s*2\s*\*\s*var\(--style-room-content-edge\)\s*\);/,
    );
    expect(rootRule).toContain('--style-research-row-height: 80px;');
    expect(rootRule).toContain(
      '--style-research-value-width: calc(281px * 390 / 1080);',
    );
    expect(rootRule).toContain('--style-research-card-art-width: 52px;');
    expect(rootRule).toContain('--style-research-card-art-height: 52px;');
    expect(rootRule).toContain('--style-research-card-art-top: 14px;');
    expect(rootRule).toContain('--style-research-card-action-top: 8px;');
    expect(rootRule).toContain(
      '--style-research-card-content-offset-y: 3px;',
    );
    expect(artRule).toContain(
      'var(--style-research-card-content-offset-y)',
    );
    expect(costButtonRule).toContain(
      'var(--style-research-card-content-offset-y)',
    );
    expect(boxRule).toContain('gap: 5px;');
    expect(rowRule).toContain('height: var(--style-research-row-height);');
    expect(rowRule).toContain('width: var(--style-research-card-width);');
    expect(rowRule).toContain(
      'margin-left: calc(var(--style-room-content-edge) - 2px);',
    );
    expect(rowRule).toMatch(
      /background:\s*transparent\s+url\("\.\.\/\.\.\/assets\/game\/source\/ui\/root-run-research\/research-card-1000x304\.9\.png"\)\s+center\s*\/\s*100%\s+100%\s+no-repeat;/,
    );
    expect(rowRule).toContain('border-image: none;');
    expect(artRule).toContain('width: var(--style-research-card-art-width);');
    expect(artRule).toContain('height: var(--style-research-card-art-height);');
    expect(artRule).toContain('background: #dbc19f;');
    expect(artRule).toMatch(
      /mask:\s*url\("\.\.\/\.\.\/assets\/game\/source\/ui\/white-squircle\/white-squircle-40\.9\.png"\)\s+center\s*\/\s*100%\s+100%\s+no-repeat;/,
    );
    expect(artRule).toContain('border-image: none;');
    expect(artImageRule).toContain('width: 57px;');
    expect(artImageRule).toContain('height: 57px;');
    expect(seedArtImageRule).toContain('width: 46px;');
    expect(seedArtImageRule).toContain('height: 46px;');
    expect(costButtonRule).toContain('width: 72px;');
    expect(costButtonRule).toContain('height: 42px;');
    expect(css).not.toContain('.research-page__research-rank');
    expect(
      [
        rowRule,
        artRule,
      ].join('\n'),
    ).not.toContain('border-image-source');
    expect(
      [
        'research-card-1000x304.9.png',
        'research-card-locked-1000x304.9.png',
      ].map((fileName) => {
        const image = PNG.sync.read(readFileSync(`${assetDir}/${fileName}`));
        return [image.width, image.height];
      }),
    ).toEqual([
      [1000, 304],
      [1000, 304],
    ]);
    const normalCard = PNG.sync.read(
      readFileSync(`${assetDir}/research-card-1000x304.9.png`),
    );
    const lockedCard = PNG.sync.read(
      readFileSync(`${assetDir}/research-card-locked-1000x304.9.png`),
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
    const whiteSquircle = PNG.sync.read(
      readFileSync(
        `${cwd()}/assets/game/source/ui/white-squircle/white-squircle-40.9.png`,
      ),
    );
    expect([whiteSquircle.width, whiteSquircle.height]).toEqual([83, 83]);
    for (let index = 0; index < whiteSquircle.data.length; index += 4) {
      if (whiteSquircle.data[index + 3] === 0) {
        continue;
      }
      expect(Array.from(whiteSquircle.data.slice(index, index + 3))).toEqual([
        255,
        255,
        255,
      ]);
    }
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
    const label = stage.querySelector('.research-page__research-value-label');
    const timer = stage.querySelector('.research-page__research-value-timer');
    const progressTimer = stage.querySelector(
      '.research-page__research-progress-text',
    );
    const fill = stage.querySelector('.research-page__research-progress-fill');

    expect(
      value?.classList.contains('research-page__research-button--in-progress'),
    ).toBe(true);
    expect(value?.classList.contains('style-cost-button--blue')).toBe(true);
    expect(value?.disabled).toBe(true);
    expect(label).toBeNull();
    expect(timer).toBeNull();
    expect(
      value?.querySelector('.research-page__research-status-action')?.textContent,
    ).toBe('Skip');
    expect(
      value?.querySelector('.style-resource-label__amount')?.textContent,
    ).toBe('1');
    expect(
      value?.querySelector('.style-resource-label__icon'),
    ).not.toBeNull();
    expect(progressTimer?.textContent).toBe('1m 15s');
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    expect(css).toMatch(
      /style-cost-button--blue\.research-page__research-button--in-progress::after\s*\{[^}]*border-image-source:\s*var\(--style-blue-button-frame\);/,
    );
    const timerRule = css.match(
      /\.research-page__research-progress\s+\.research-page__research-progress-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    expect(timerRule).toContain('color: #ffffff;');
    expect(timerRule).toContain('align-items: center;');
    expect(timerRule).toContain('justify-content: center;');
    expect(timerRule).toContain('text-align: center;');
    const progressRule = css.match(
      /\.research-page__research-progress\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    expect(progressRule).toContain('bottom: 10px;');
    expect(progressRule).toContain(
      '--style-progress-fill-background: var(--style-progress-blue-fill);',
    );
    expect(progressRule).toContain(
      '--style-progress-fill-edge: var(--style-progress-blue-edge);',
    );
    expect(fill?.style.width).toBe('37.5%');

    for (const callback of frameCallbacks) {
      callback();
    }

    expect(fill?.classList.contains('is-progress-running')).toBe(true);
    expect(fill?.style.transition).toBe('width 75000ms linear');
    expect(fill?.style.width).toBe('100%');
  });

  it('keeps locked research rows passive in the DOM fallback', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 6,
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
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    const row = [...stage.querySelectorAll('.research-page__row')].find((candidate) =>
      candidate.textContent?.includes('minor healing potion'),
    );

    expect(row?.classList.contains('is-locked')).toBe(true);
    expect(
      row?.querySelector('.research-page__research-art-image')?.dataset
        .assetAtlasFrame,
    ).toBe('potion:minorHealingPotion');
    expect(row?.querySelector('.research-page__research-label')?.tagName).toBe(
      'SPAN',
    );
    expect(row?.querySelector('[aria-haspopup="dialog"]')).toBeNull();

    row?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(row?.isConnected).toBe(true);

    manager.unmount();
    stage.remove();
  });

  it('adds the shared timer companion to item timer artwork in the DOM fallback', () => {
    const snapshot = {
      research: {
        boxes: [
          {
            id: 'seedUnlocks',
            label: 'seed research',
            researches: [
              {
                id: 'timer:herbGrowth:sageHerb:1',
                label: 'sage growing lvl 1',
                displayName: 'sage growing',
                value: '25 coin',
                itemKind: 'herb',
                itemKey: 'sageHerb',
                artExtraKey: 'timerReduction',
                canResearch: true,
              },
            ],
          },
        ],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    const art = stage.querySelector('.research-page__research-art');
    expect(
      art?.querySelector('.research-page__research-art-image')?.dataset
        .assetAtlasFrame,
    ).toBe('herb:sageHerb');
    expect(
      art?.querySelector('.research-page__research-art-extra')?.getAttribute('src'),
    ).toContain('icon-research-time.png');
    expect(
      art?.querySelector('.research-page__research-art-extra')?.classList,
    ).toContain('is-timer-reduction');

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

  it('removes the legacy run-focus controls and keeps standard box order', () => {
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
    expect(stage.querySelector('.research-page__run-focus')).toBeNull();
    expect(boxes).toHaveLength(0);
    expect(setPrestigeRunFocus).not.toHaveBeenCalled();

    manager.unmount();
    stage.remove();
  });
});
