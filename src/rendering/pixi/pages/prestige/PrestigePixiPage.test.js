// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import { PixiInfoButton } from '../../primitives/PixiInfoButton.js';
import {
  PRESTIGE_DESCRIPTION_LINES,
  PrestigePixiPage,
} from './PrestigePixiPage.js';
import {
  RESEARCH_PAPER_INK,
} from '../research/ResearchPixiPage.js';
import { RETAINED_PAGE_GEOMETRY } from '../workshop/RetainedPageKit.js';

describe('PrestigePixiPage', () => {
  it('retains keyed milestone rows and moves reset details behind the info control', () => {
    const semanticTargets = new SemanticTargetRegistry();
    const page = createPage({ semanticTargets });
    const pages = new PageRegistry({
      pages: [['prestige', page]],
    });
    pages.bind('prestige', createPrestigeViewModel({ reward: '+10 crystal' }));
    pages.activate('prestige');
    const root = page.getDisplayObject();
    const row = page.rows.get('level-10');

    pages.bind('prestige', createPrestigeViewModel({ reward: '+12 crystal' }));

    expect(page.getDisplayObject()).toBe(root);
    expect(page.rows.get('level-10')).toBe(row);
    expect(page.rowPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
    });
    expect(page.description.detailsModel.text).toBe(
      PRESTIGE_DESCRIPTION_LINES.map((line) => `• ${line}`).join('\n'),
    );
    expect(page.description.details).toBeInstanceOf(PixiInfoButton);
    expect(page.description.flow.text).toBe('Reach Level 10');
    expect(page.description.summary.text).toBe('New run starts at Level 1');
    expect(row.reward.text).toBe('+12 crystal');
    expect(page.titleRibbon.title.text).toBe('Prestige');
    expect(page.titleRibbon.stars.level).toBe(0);
    expect(page.descriptionTitle.title.text).toBe('Next Prestige');
    expect(page.progressionTitle.title.text).toBe('Milestones');
    expect(page.tabs.get('main').control.textLabel.text).toBe('Main');
    expect(page.tabs.get('points').control.textLabel.text).toBe('Points');
    expect(row.title.position).toMatchObject({
      x: 48,
      y: 17,
    });
    expect(row.getPreferredHeight()).toBe(48);
    expect(row.artWell).toBeUndefined();
    expect(row.rewardLead).toBeUndefined();

    pages.destroy();
  });

  it('routes milestone confirmation without deriving gameplay eligibility', () => {
    const requestPrestige = vi.fn();
    const completePrestige = vi.fn();
    const semanticTargets = new SemanticTargetRegistry();
    const page = createPage({ semanticTargets });
    const viewModel = createPrestigeViewModel({
      completePrestige,
      requestPrestige,
    });
    viewModel.prestige.milestones.unshift(
      {
        id: 'level-1',
        level: 1,
        title: 'level 1',
        reward: '+1 crystal',
      },
      {
        id: 'level-5',
        level: 5,
        title: 'level 5',
        reward: '+5 crystal',
      },
    );
    page.bind(viewModel);
    page.activate();

    expect(semanticTargets.activate('prestige.milestone.10')).toBe(true);
    expect(requestPrestige).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'level-10', level: 10 }),
    );
    expect(page.confirm.visible).toBe(true);
    expect(page.pendingConfirm).toMatchObject({
      milestoneId: 'level-10',
      level: 10,
    });
    const row = page.rows.get('level-10');
    expect(row.action).toBeInstanceOf(PixiCostButton);
    expect(row.action.research).toBe(false);
    expect(row.action.amount).toBe('Prestige');
    expect(row.help).toBeInstanceOf(PixiInfoButton);
    expect(row.help.textLabel).toBeUndefined();
    expect(page.confirm.cancel.control.variant).toBe('regular');
    expect(page.confirm.proceed.control.variant).toBe('regular');
    expect(page.scroll.offsetY).toBeGreaterThanOrEqual(0);
    expect(
      page.confirm.root.y +
        page.confirm.height -
        page.scroll.offsetY,
    ).toBeLessThanOrEqual(
      page.scroll.height + RETAINED_PAGE_GEOMETRY.scrollCut,
    );

    page.confirm.proceed.handleTap();
    expect(completePrestige).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ milestoneId: 'level-10' }),
    );

    page.bind({
      prestige: {
        ...createPrestigeViewModel().prestige,
        confirm: null,
      },
    });
    expect(page.confirm.visible).toBe(false);
    page.destroy();
  });

  it('keeps the fixed scroll and tab anchors at source resolution', () => {
    const page = createPage();
    page.bind(createPrestigeViewModel());

    expect(page.identityLayer.x).toBe(0);
    expect(page.identityLayer.y).toBe(
      RETAINED_PAGE_GEOMETRY.contentTop,
    );
    expect(page.scroll.root.position).toMatchObject({ x: 0, y: 164 });
    expect(page.scroll).toMatchObject({
      width: 374,
      height: 479,
    });
    expect(page.tabsLayer.position).toMatchObject({
      x: 16,
      y: 649,
    });
    page.destroy();
  });

  it('keeps Prestige currency amounts in the surrounding paper ink', () => {
    const page = createPage();
    const viewModel = createPrestigeViewModel();
    viewModel.prestige.summary = {
      flow: 'Level 8 → Level 10',
      resourceLead: 'Next Prestige',
      resources: [
        { amount: 5, resource: 'crystal' },
        { amount: 1, resource: 'ruby' },
        { amount: 2, resource: 'emerald' },
      ],
    };
    viewModel.prestige.milestones[0].rewardResources = [
      { amount: 5, resource: 'crystal' },
      { amount: 1, resource: 'ruby' },
    ];

    page.bind(viewModel);

    expect(
      page.description.resources.map(
        (resource) => resource.amountLabel.textObject.style.fill,
      ),
    ).toEqual([
      RESEARCH_PAPER_INK,
      RESEARCH_PAPER_INK,
      RESEARCH_PAPER_INK,
    ]);
    expect(
      page.rows.get('level-10').rewardResources
        .filter((resource) => resource.visible)
        .map((resource) => resource.amountLabel.textObject.style.fill),
    ).toEqual([RESEARCH_PAPER_INK, RESEARCH_PAPER_INK]);

    page.destroy();
  });

  it('keeps point thresholds and licence rewards on one compact line', () => {
    const page = createPage();
    page.bind({
      prestige: {
        selectedTabId: 'points',
        summary: {
          headline: '2 Prestige Points',
          nextRunLabel: 'Next reward at 3 Points',
        },
        pointRewards: [
          {
            id: 'point-3',
            kind: 'point',
            count: 3,
            title: '3 Points',
            rewardText: 'Village Market',
            locked: true,
            tooltip: { text: 'Permanent market licence reward.' },
          },
        ],
      },
    });

    const row = page.rows.get('point-3');
    expect(row.getPreferredHeight()).toBe(48);
    expect(row.title.position).toMatchObject({ x: 48, y: 17 });
    expect(row.reward.position.y).toBe(18);
    expect(row.reward.position.x).toBeGreaterThan(
      row.title.position.x + row.title.width,
    );
    expect(row.help.position.x).toBeGreaterThan(row.reward.position.x);
    expect(row.lockedOverlay.visible).toBe(true);

    page.destroy();
  });
});

function createPage({ semanticTargets = null } = {}) {
  return new PrestigePixiPage({
    assetManager: createPixiAssetManagerFake(Texture),
    semanticTargets,
  });
}

function createPrestigeViewModel({
  completePrestige = vi.fn(),
  requestPrestige = vi.fn(),
  reward = '+10 crystal',
} = {}) {
  return {
    prestige: {
      selectedTabId: 'main',
      summary: {
        headline: 'Reach Level 10',
        nextRunLabel: 'New run starts at Level 1',
      },
      milestones: [
        {
          id: 'level-10',
          level: 10,
          title: 'level 10',
          reward,
          tooltip: 'prestige at this milestone',
          canComplete: true,
          confirm: {
            milestoneId: 'level-10',
            level: 10,
            lines: ['reset this run?', 'receive 10 crystal'],
          },
        },
      ],
    },
    actions: {
      completePrestige,
      requestPrestige,
    },
  };
}
