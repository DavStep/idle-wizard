// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  RESEARCH_PIXI_GEOMETRY,
  ResearchPixiPage,
} from './ResearchPixiPage.js';
import {
  RETAINED_SCROLLBAR_GEOMETRY,
  RETAINED_SCROLLBAR_VISUALS,
} from '../workshop/RetainedPageKit.js';

describe('ResearchPixiPage', () => {
  it('builds once and keeps keyed boxes and research rows across updates', () => {
    const harness = createHarness();
    const pages = new PageRegistry({
      pages: [['research', harness.page]],
    });
    pages.bind('research', createResearchViewModel({ value: '100 mana' }));
    pages.activate('research');
    const root = harness.page.getDisplayObject();
    const box = harness.page.boxes.get('herbs');
    const row = box.rows.get('mint');

    pages.bind('research', createResearchViewModel({ value: '80 mana' }));

    expect(harness.page.getDisplayObject()).toBe(root);
    expect(harness.page.boxes.get('herbs')).toBe(box);
    expect(harness.page.boxes.get('herbs').rows.get('mint')).toBe(row);
    expect(harness.page.boxPool.getStats().allocated).toBe(1);
    expect(box.rowsPool.getStats().allocated).toBe(1);
    expect(row.valueButton.text.text).toBe('80 mana');

    pages.destroy();
    harness.dispose();
  });

  it('routes locked rows to a requirement tooltip without button copy', () => {
    const buyResearch = vi.fn();
    const showLockedReason = vi.fn();
    const harness = createHarness();
    harness.page.bind(
      createResearchViewModel({
        buyResearch,
        showLockedReason,
      }),
    );
    harness.page.activate();

    expect(harness.semanticTargets.activate('research.mint')).toBe(true);
    expect(buyResearch).toHaveBeenCalledWith('mint');
    expect(harness.dialogs.hasInstance('research.info')).toBe(false);

    const row = harness.page.boxes.get('herbs').rows.get('mint');
    row.labelHit.emit('pointertap', {});

    expect(harness.dialogs.hasInstance('research.info')).toBe(true);
    const infoDialog = harness.dialogs.get('research.info');
    harness.dialogs.close('research.info');
    row.labelHit.emit('pointertap', {});
    expect(harness.dialogs.get('research.info')).toBe(infoDialog);
    expect(harness.dialogs.getStats().constructed).toBe(1);
    harness.dialogs.close('research.info');

    harness.page.bind(
      createResearchViewModel({
        canResearch: false,
        locked: true,
        showLockedReason,
      }),
    );
    const lockedRow = harness.page.boxes.get('herbs').rows.get('mint');

    expect(lockedRow.rank.visible).toBe(false);
    expect(lockedRow.rankLabel.visible).toBe(false);
    expect(lockedRow.costButton.lockReason).toBe('');
    expect(lockedRow.costButton.lockReasonLabel.visible).toBe(false);
    expect(harness.semanticTargets.activate('research.mint')).toBe(true);
    expect(showLockedReason).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mint', locked: true }),
    );
    expect(harness.page.lockTooltip.root.visible).toBe(true);
    expect(harness.page.lockTooltip.copy.text).toBe(
      'Complete prior research',
    );
    expect(harness.dialogs.isOpen('research.info')).toBe(false);
    harness.page.hideLockTooltip();
    lockedRow.labelHit.emit('pointertap', {});
    expect(showLockedReason).toHaveBeenCalledTimes(2);
    expect(harness.page.lockTooltip.root.visible).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses Idle Outpost luminance weights for locked artwork', () => {
    const harness = createHarness();
    harness.page.bind(
      createResearchViewModel({
        canResearch: false,
        locked: true,
      }),
    );

    const row = harness.page.boxes.get('herbs').rows.get('mint');
    row.art.tint = 0xff0000;
    row.applyTheme(harness.page.theme);
    expect(row.art.filters).toEqual([row.lockedArtFilter]);
    expect(row.art.tint).toBe(0xffffff);
    expect(row.lockedArtFilter.matrix).toEqual([
      0.2125, 0.7154, 0.0721, 0, 0,
      0.2125, 0.7154, 0.0721, 0, 0,
      0.2125, 0.7154, 0.0721, 0, 0,
      0, 0, 0, 1, 0,
    ]);

    harness.page.destroy();
    harness.dispose();
  });

  it('lays out the full-page scroll and fixed tabs in frozen source space', () => {
    const harness = createHarness();
    const model = createResearchViewModel();
    model.research.tabs.push(
      {
        id: 'automation',
        label: 'automation',
        boxes: [],
      },
      {
        id: 'advanced',
        label: 'advanced research',
        boxes: [],
      },
      {
        id: 'crystal',
        label: 'crystal research',
        boxes: [],
      },
    );
    harness.page.bind(model);

    expect(harness.page.scroll.root.position).toMatchObject({ x: 16, y: 104 });
    expect(harness.page.scroll).toMatchObject({
      width: 328,
      height: 417.33333333333337,
    });
    expect(harness.page.tabsLayer.position).toMatchObject({
      x: 16,
      y: 527.3333333333334,
    });
    const tabs = harness.page.tabs.getWidgets();
    const expectedWrapWidth =
      (328 - 3 * (tabs.length - 1)) / tabs.length - 6;
    expect(expectedWrapWidth).toBe(73.75);
    for (const tab of tabs) {
      expect(tab.control.textLabel.fontSize).toBe(10);
      expect(tab.control.textLabel.lineHeight).toBe(12);
      expect(tab.control.textLabel.align).toBe('center');
      expect(tab.control.textLabel.wordWrap).toBe(true);
      expect(tab.control.textLabel.wrapWidth).toBeCloseTo(
        expectedWrapWidth,
      );
    }

    harness.page.destroy();
    harness.dispose();
  });

  it('shows the shared right-edge station scrollbar only for overflowing research', () => {
    const harness = createHarness();
    const model = createResearchViewModel();
    const regularTab = model.research.tabs[0];
    regularTab.boxes = Array.from({ length: 5 }, (_, index) => ({
      id: `research-box-${index}`,
      label: `research box ${index + 1}`,
      researches: [
        {
          id: `research-${index}`,
          displayName: `research ${index + 1}`,
          effect: `effect ${index + 1}`,
          displayValue: '100 mana',
          canResearch: true,
          locked: false,
        },
      ],
    }));
    harness.page.bind(model);

    const scroll = harness.page.scroll;
    expect(scroll.contentHeight).toBeGreaterThan(scroll.height);
    expect(scroll.scrollbarTrack.visible).toBe(true);
    expect(scroll.scrollbarThumb.visible).toBe(true);
    expect(scroll.scrollbarTrack.getLocalBounds()).toMatchObject({
      x: scroll.width + RETAINED_SCROLLBAR_GEOMETRY.gap,
      y: RETAINED_SCROLLBAR_GEOMETRY.trackInset,
      width: RETAINED_SCROLLBAR_GEOMETRY.width,
      height:
        scroll.height - RETAINED_SCROLLBAR_GEOMETRY.trackInset * 2,
    });
    expect(RETAINED_SCROLLBAR_VISUALS).toMatchObject({
      trackBackground: 0x17100c,
      trackBorder: 0x000000,
      thumbBackground: 0xf2ae54,
      thumbBorder: 0x5e321b,
    });

    const topThumbY = scroll.scrollbarThumb.getLocalBounds().y;
    expect(scroll.scrollTo(scroll.contentHeight - scroll.height)).toBe(true);
    expect(scroll.scrollbarThumb.getLocalBounds().y).toBeGreaterThan(
      topThumbY,
    );

    harness.page.bind(createResearchViewModel());
    expect(scroll.contentHeight).toBeLessThan(scroll.height);
    expect(scroll.scrollbarTrack.visible).toBe(false);
    expect(scroll.scrollbarThumb.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('can suppress a research notification without disabling its action', () => {
    const buyResearch = vi.fn();
    const harness = createHarness();
    harness.page.bind(
      createResearchViewModel({
        buyResearch,
        notification: false,
      }),
    );
    harness.page.activate();

    const row = harness.page.boxes.get('herbs').rows.get('mint');
    expect(row.valueButton.enabled).toBe(true);
    expect(row.valueButton.notification).toBe(false);
    expect(harness.semanticTargets.activate('research.mint')).toBe(true);
    expect(buyResearch).toHaveBeenCalledWith('mint');

    harness.page.destroy();
    harness.dispose();
  });

  it('uses exact Root Run card geometry and one global high-water row pool', () => {
    const harness = createHarness();
    harness.page.bind(createResearchViewModel());
    const box = harness.page.boxes.get('herbs');
    const row = box.rows.get('mint');

    expect(row.card.position).toMatchObject({ x: -2, y: 0 });
    expect(row.card).toMatchObject({
      frameWidth: 1000 / 3,
      frameHeight: 80,
    });
    expect(row.artWell.position).toMatchObject({ x: 13, y: 14 });
    expect(row.artWell).toMatchObject({ frameWidth: 52, frameHeight: 52 });
    expect(row.art).toMatchObject({ width: 57, height: 57 });
    expect(row.description.position.x).toBe(
      RESEARCH_PIXI_GEOMETRY.descriptionX,
    );
    expect(row.progress.root.position.x).toBe(252 / 3);
    expect(row.progress.width).toBe(422 / 3);
    expect(row.progress).toMatchObject({
      tone: 'yellow',
      height: 10,
    });
    expect(row.costButton).toMatchObject({
      buttonWidth: 72,
      buttonHeight: 42,
    });
    expect(row.costButton.amountLabel.fontSize).toBeCloseTo(17 * 0.88);
    expect(row.costButton.resourceIcon.width).toBeCloseTo(23 * 0.88);
    expect(row.researchedButton.control.textLabel.fontSize).toBe(12);
    expect(box.title.text).toBe('Herbs');
    expect(box.title.style).toMatchObject({
      fontFamily: '"Lilita One", "Arial Black", Arial, sans-serif',
      fontSize: 18,
      fill: '#ffffff',
      lineHeight: 21,
    });
    expect(box.titlePlaque.frame).toMatchObject({
      frameHeight: 42,
      frameWidth: Math.ceil(box.title.width + 60),
    });
    expect(box.titlePlaque).toMatchObject({
      variant: 'regular',
      assetId:
        'source:assets/ui/root-run-research/research-station-title-yellow.png',
    });
    expect(box.title.position).toMatchObject({ x: 12, y: 21 });
    expect(box.titlePlaque.root.position).toMatchObject({ x: 0, y: 0 });
    expect(box.getPreferredHeight()).toBe(
      RESEARCH_PIXI_GEOMETRY.categoryTitleHeight +
        RESEARCH_PIXI_GEOMETRY.rowGap +
        RESEARCH_PIXI_GEOMETRY.rowHeight,
    );
    expect(harness.page.rowPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
      maxSize: 128,
    });

    const moved = createResearchViewModel();
    moved.research.tabs[0].boxes[0].id = 'automation';
    moved.research.tabs[0].boxes[0].label = 'automation';
    harness.page.bind(moved);

    expect(harness.page.rows.get('mint')).toBe(row);
    expect(harness.page.boxes.get('automation').rows.get('mint')).toBe(row);
    expect(harness.page.rowPool.getStats().allocated).toBe(1);

    harness.page.destroy();
    harness.dispose();
  });

  it('colors station title plaques from the selected research tab', () => {
    const harness = createHarness();
    const variants = [
      {
        tabId: 'regular',
        variant: 'regular',
        asset: 'research-station-title-yellow.png',
      },
      {
        tabId: 'automation',
        variant: 'automation',
        asset: 'research-station-title-red.png',
      },
      {
        tabId: 'advanced',
        variant: 'advanced',
        asset: 'research-station-title-green.png',
      },
      {
        tabId: 'emerald',
        variant: 'crystal',
        asset: 'research-station-title-purple.png',
      },
    ];

    for (const { tabId, variant, asset } of variants) {
      const model = createResearchViewModel();
      model.research.selectedTabId = tabId;
      model.research.tabs[0].id = tabId;
      harness.page.bind(model);

      expect(harness.page.boxes.get('herbs').titlePlaque).toMatchObject({
        variant,
        assetId: `source:assets/ui/root-run-research/${asset}`,
      });
    }

    harness.page.destroy();
    harness.dispose();
  });

  it('shows plot upgrade stars in the title and fits long descriptions inside the row', () => {
    const harness = createHarness();
    const model = createResearchViewModel();
    Object.assign(
      model.research.tabs[0].boxes[0].researches[0],
      {
        displayName: 'plot 1',
        starLevel: 1,
        description:
          'levels plot 1 to lvl 2: it uses 2 seeds and harvests 2 herbs in one growth timer.',
      },
    );

    harness.page.bind(model);

    const row = harness.page.rows.get('mint');
    const descriptionBottom =
      row.description.position.y + row.description.height;
    expect(row.name.text).toBe('Plot 1');
    expect(row.nameStars).toMatchObject({
      visible: true,
      level: 1,
      starCount: 1,
    });
    expect(row.description.style.fontSize).toBeLessThan(11);
    expect(row.description.style.fontSize).toBeGreaterThanOrEqual(8);
    expect(row.description.width).toBeLessThanOrEqual(
      RESEARCH_PIXI_GEOMETRY.descriptionWidth + 0.5,
    );
    expect(row.description.position.y).toBeGreaterThanOrEqual(
      RESEARCH_PIXI_GEOMETRY.descriptionY +
        RESEARCH_PIXI_GEOMETRY.descriptionOpticalOffsetY,
    );
    expect(row.description.position.y).toBeLessThan(
      RESEARCH_PIXI_GEOMETRY.descriptionY,
    );
    expect(descriptionBottom).toBeLessThanOrEqual(
      RESEARCH_PIXI_GEOMETRY.rowHeight -
        RESEARCH_PIXI_GEOMETRY.descriptionBottom +
        0.5,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('presents completed research with corrected copy and yellow status chrome', () => {
    const harness = createHarness();
    const model = createResearchViewModel({
      value: 'researched',
      canResearch: false,
    });
    Object.assign(
      model.research.tabs[0].boxes[0].researches[0],
      {
        completed: true,
        displayName: 'sage seed',
        description: 'allows sage seed to drop from summon seed.',
        resourceKey: 'seed',
      },
    );

    harness.page.bind(model);

    const row = harness.page.rows.get('mint');
    expect(row.name.text).toBe('Sage Seed');
    expect(row.description.text).toBe(
      'Allows sage seed to drop from summon seed.',
    );
    expect(row.description.style.fontSize).toBe(11);
    expect(row.name.style.fill).toEqual(row.description.style.fill);
    expect(row.name.position.y).toBe(0);
    expect(row.researchedButton.root.visible).toBe(true);
    expect(row.researchedButton.control.variant).toBe('yellow');
    expect(row.researchedButton.text.text).toBe('Researched');
    expect(row.researchedButton).toMatchObject({
      width: 72,
      height: 42,
    });
    expect(row.readonlyValue.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('shows no more than three locked preview rows in a category', () => {
    const harness = createHarness();
    const model = createResearchViewModel({
      locked: true,
      canResearch: false,
    });
    model.research.tabs[0].boxes[0].researches = Array.from(
      { length: 6 },
      (_, index) => ({
        id: `locked-${index}`,
        displayName: `locked ${index}`,
        displayValue: 'Locked',
        locked: true,
        canResearch: false,
        lockReason: 'requires prior research.',
      }),
    );

    harness.page.bind(model);

    expect(harness.page.boxes.get('herbs').rowWidgets).toHaveLength(3);
    expect(harness.page.rows.getStats().size).toBe(3);
    expect(harness.page.rowPool.getStats().active).toBe(3);

    harness.page.destroy();
    harness.dispose();
  });

  it('starts timer work only while active and closes info on deactivation', () => {
    let now = 1_000;
    const ticker = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    const harness = createHarness({
      ticker,
      timeSource: () => now,
    });
    const model = createResearchViewModel();
    const research =
      model.research.tabs[0].boxes[0].researches[0];
    Object.assign(research, {
      canResearch: false,
      inProgress: true,
      displayValue: 'researching',
      timer: {
        active: true,
        totalMs: 10_000,
        remainingMs: 5_000,
        progress: 0.5,
      },
    });
    harness.page.bind(model);
    harness.page.activate();
    const row = harness.page.rows.get('mint');
    row.labelHit.emit('pointertap', {});

    expect(ticker.add).toHaveBeenCalledWith(harness.page.tickHandler);
    expect(harness.dialogs.isOpen('research.info')).toBe(true);

    now = 3_000;
    harness.page.tick();
    expect(row.readonlyValue.text).toContain('3s');

    harness.page.deactivate();
    expect(ticker.remove).toHaveBeenCalledWith(harness.page.tickHandler);
    expect(harness.dialogs.isOpen('research.info')).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('retains main resource-icon values for completed and timed research', () => {
    const harness = createHarness();
    const completed = createResearchViewModel({
      value: '2 crystals',
      canResearch: false,
    });
    Object.assign(
      completed.research.tabs[0].boxes[0].researches[0],
      { completed: true },
    );
    harness.page.bind(completed);

    const row = harness.page.rows.get('mint');
    const value = row.readonlyValue;
    expect(value.text).toBe('2 crystals');
    expect(value.plain.visible).toBe(false);
    expect(value.resourceLabel.resource).toBe('crystal');
    expect(value.resourceLabel.amountLabel.text).toBe('2');
    expect(value.resourceLabel.icon.visible).toBe(true);
    expect(value.resourceLabel.icon.x).toBeGreaterThan(
      value.resourceLabel.amountLabel.x,
    );

    const timed = createResearchViewModel({
      value: '20 mana',
      canResearch: false,
    });
    Object.assign(timed.research.tabs[0].boxes[0].researches[0], {
      inProgress: true,
      timer: {
        active: true,
        totalMs: 10_000,
        remainingMs: 5_000,
        remainingLabel: '5s',
        progress: 0.5,
      },
    });
    harness.page.bind(timed);

    expect(harness.page.rows.get('mint')).toBe(row);
    expect(value.text).toBe('20 mana 5s');
    expect(value.resourceLabel.resource).toBe('mana');
    expect(value.timerLabel.text).toBe('5s');
    expect(value.timerLabel.visible).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });
});

function createHarness({ ticker = null, timeSource = undefined } = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const semanticTargets = new SemanticTargetRegistry();
  const page = new ResearchPixiPage({
    assetManager: createPixiAssetManagerFake(Texture),
    dialogLayer,
    dialogRegistry: dialogs,
    semanticTargets,
    ticker,
    ...(timeSource ? { timeSource } : {}),
  });

  return {
    dialogLayer,
    dialogs,
    page,
    semanticTargets,
    dispose() {
      dialogs.destroy();
      dialogLayer.destroy({ children: true });
    },
  };
}

function createResearchViewModel({
  value = '100 mana',
  locked = false,
  canResearch = true,
  notification,
  buyResearch = vi.fn(),
  showLockedReason = vi.fn(),
} = {}) {
  return {
    research: {
      selectedTabId: 'regular',
      tabs: [
        {
          id: 'regular',
          label: 'regular research',
          boxes: [
            {
              id: 'herbs',
              label: 'herbs',
              researches: [
                {
                  id: 'mint',
                  displayName: 'mint',
                  effect: '+1 mint',
                  displayValue: value,
                  canResearch,
                  ...(notification === undefined ? {} : { notification }),
                  locked,
                  info: {
                    title: 'mint',
                    copy: 'learn to grow mint.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    actions: {
      buyResearch,
      showLockedReason,
    },
  };
}
