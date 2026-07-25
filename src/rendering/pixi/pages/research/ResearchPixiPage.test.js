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

  it('routes cost-only buys and retained info actions for locked rows', () => {
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

    harness.page.bind(
      createResearchViewModel({
        canResearch: false,
        locked: true,
        showLockedReason,
      }),
    );
    expect(harness.semanticTargets.activate('research.mint')).toBe(true);
    expect(showLockedReason).not.toHaveBeenCalled();
    expect(harness.dialogs.get('research.info')).toBe(infoDialog);

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
      frameHeight: 90,
    });
    expect(row.artWell.position).toMatchObject({ x: 10, y: 16 });
    expect(row.artWell).toMatchObject({ frameWidth: 58, frameHeight: 58 });
    expect(row.description.position.x).toBe(252 / 3);
    expect(row.progress.root.position.x).toBe(252 / 3);
    expect(row.progress.width).toBe(422 / 3);
    expect(row.progress).toMatchObject({
      tone: 'yellow',
      height: 10,
    });
    expect(row.costButton).toMatchObject({
      buttonWidth: 80,
      buttonHeight: 48,
    });
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
