// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { Container, Point, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import {
  GARDEN_PIXI_GEOMETRY,
  GardenPixiPage,
} from './GardenPixiPage.js';

describe('GardenPixiPage', () => {
  it('builds once and keeps keyed plot and inventory widgets across binds', () => {
    const harness = createHarness();
    const pages = new PageRegistry({
      pages: [['garden', harness.page]],
    });
    pages.bind('garden', createGardenViewModel());
    pages.activate('garden');
    const root = harness.page.getDisplayObject();
    const plot = harness.page.plots.get('plot-1');
    const seed = harness.page.seedInventory.rows.get('sage-seed');

    pages.bind(
      'garden',
      createGardenViewModel({
        actionText: 'harvest',
        seedQuantity: 8,
      }),
    );

    expect(harness.page.getDisplayObject()).toBe(root);
    expect(harness.page.plots.get('plot-1')).toBe(plot);
    expect(harness.page.seedInventory.rows.get('sage-seed')).toBe(seed);
    expect(harness.page.plotPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
    });
    expect(harness.page.seedInventory.rowPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
    });
    expect(plot.action.text).toContain('harvest');
    expect(seed.quantity.text).toBe('8');

    pages.destroy();
    harness.dispose();
  });

  it('windows collapsed inventory rows and reuses the expanded high-water pool', () => {
    const harness = createHarness();
    const createModel = (expanded) => {
      const model = createGardenViewModel();
      model.garden.inventory.seeds = {
        expanded,
        canToggle: true,
        countText: expanded ? '8/8' : '6/8',
        rows: Array.from({ length: 8 }, (_, index) => ({
          id: `seed-${index + 1}`,
          itemTypeId: index + 1,
          key: `seed-${index + 1}`,
          label: `seed ${index + 1}`,
          quantity: index + 1,
        })),
      };
      return model;
    };

    harness.page.bind(createModel(false));
    const collapsedHeight = harness.page.seedInventory.height;
    expect(harness.page.seedInventory.rows.getWidgets()).toHaveLength(6);
    expect(harness.page.seedInventory.count.text).toBe('6/8');
    expect(harness.page.seedInventory.toggle.text).toBe('expand');

    harness.page.bind(createModel(true));
    const expandedHeight = harness.page.seedInventory.height;
    expect(harness.page.seedInventory.rows.getWidgets()).toHaveLength(8);
    expect(harness.page.seedInventory.count.text).toBe('8/8');
    expect(harness.page.seedInventory.toggle.text).toBe('collapse');
    expect(expandedHeight).toBeGreaterThan(collapsedHeight);
    expect(harness.page.seedInventory.rowPool.getStats()).toMatchObject({
      allocated: 8,
      active: 8,
      highWaterMark: 8,
    });

    harness.page.bind(createModel(false));
    expect(harness.page.seedInventory.rows.getWidgets()).toHaveLength(6);
    expect(harness.page.seedInventory.height).toBe(collapsedHeight);
    expect(harness.page.seedInventory.rowPool.getStats()).toMatchObject({
      allocated: 8,
      active: 6,
      available: 2,
      highWaterMark: 8,
    });

    harness.page.bind(createModel(true));
    expect(harness.page.seedInventory.rows.getWidgets()).toHaveLength(8);
    expect(harness.page.seedInventory.rowPool.getStats()).toMatchObject({
      allocated: 8,
      active: 8,
      highWaterMark: 8,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('routes plot, seed drag/drop, modal, and tutorial targets without Pixi listeners', () => {
    const activatePlot = vi.fn(() => true);
    const dropSeed = vi.fn(() => true);
    const selectSeed = vi.fn(() => true);
    const harness = createHarness();
    harness.page.bind(
      createGardenViewModel({
        activatePlot,
        dropSeed,
      }),
    );
    harness.page.activate();

    expect(harness.semanticTargets.activate('garden.plot.1')).toBe(true);
    expect(activatePlot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plot-1' }),
    );
    expect(
      harness.semanticTargets.getTutorialTarget('garden:plot:1')
        ?.semanticId,
    ).toBe('garden.plot.1');
    expect(
      harness.inputRouter.store.getRegistrations('drag'),
    ).toHaveLength(1);
    expect(
      harness.inputRouter.store.getRegistrations('drop'),
    ).toHaveLength(1);
    expect(
      harness.page.plots.get('plot-1').root.listenerCount('pointertap'),
    ).toBe(0);

    const drop = harness.inputRouter.store.getRegistrations('drop')[0];
    expect(
      drop.onDrop({
        data: {
          kind: 'seed',
          item: { id: 'sage-seed' },
        },
      }),
    ).toBe(true);
    expect(dropSeed).toHaveBeenCalledTimes(1);

    expect(harness.dialogs.hasInstance('garden.seed')).toBe(false);
    harness.page.openDialog('seed', {
      rows: [
        {
          id: 'sage',
          key: 'sageSeed',
          label: 'sage seed',
          quantity: 2,
          itemKind: 'seed',
          semanticId: 'garden.seed.sage',
          onSelect: selectSeed,
        },
      ],
    });
    const dialog = harness.dialogs.get('garden.seed');
    expect(dialog).not.toBeNull();
    expect(dialog.modal).toBeInstanceOf(PixiOwnedDialogSurface);
    expect(dialog.modal.panel).toBeInstanceOf(PixiDialogFrame);
    expect(dialog.modal.openMotion).toBe('center');
    expect(harness.inputRouter.getTopModal()?.id).toBe(
      'garden.seed',
    );
    expect(harness.semanticTargets.activate('garden.seed.sage')).toBe(
      true,
    );
    expect(selectSeed).toHaveBeenCalledTimes(1);
    const seedRow = dialog.rows.get('sage');
    expect(seedRow.seedPack.visible).toBe(true);
    expect(seedRow.seedItem.visible).toBe(true);
    expect(harness.assetManager.getAtlasTexture).toHaveBeenCalledWith(
      'seed:pack',
    );
    expect(harness.assetManager.getAtlasTexture).toHaveBeenCalledWith(
      'herb:sageHerb',
    );

    harness.dialogs.close('garden.seed');
    harness.page.openDialog('seed', { rows: [] });
    expect(harness.dialogs.get('garden.seed')).toBe(dialog);
    expect(harness.dialogs.getStats().constructed).toBe(1);

    harness.page.destroy();
    harness.dispose();
    expect(
      harness.inputRouter.store.getRegistrations(),
    ).toHaveLength(0);
  });

  it('keeps untargeted plots actionable when the tutorial overlay owns the wait-state event path', () => {
    const activatePlot = vi.fn(() => true);
    const harness = createHarness();
    const model = createGardenViewModel({ activatePlot });
    model.garden.plots.push({
      id: 'plot-2',
      tileNumber: 2,
      soilLevel: 1,
      phase: 'empty',
      label: 'sage',
      actionText: 'plant',
      selectedSeedItemTypeId: 1,
    });
    harness.page.bind(model);
    harness.page.activate();

    const plot = harness.page.plots.get('plot-2');
    const registration = harness.inputRouter.store
      .getRegistrations('press')
      .find((entry) => entry.displayObject === plot.root);
    const tutorialOverlay = new Container({
      label: 'tutorial-overlay-wait-state-hit',
    });
    const bounds = plot.root.getBounds();
    const point = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };

    expect(registration?.fallbackHitTest).toBe(true);
    harness.inputRouter.onPointerDown(
      createPointerEvent(tutorialOverlay, 'pointerdown', point),
    );
    harness.inputRouter.onPointerUp(
      createPointerEvent(tutorialOverlay, 'pointerup', point),
    );

    expect(activatePlot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plot-2' }),
    );

    tutorialOverlay.destroy();
    harness.page.destroy();
    harness.dispose();
  });

  it('keeps frozen Garden geometry and timer/ticker lifecycle in source space', () => {
    const ticker = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    const harness = createHarness({ ticker });
    harness.page.bind(createGardenViewModel());
    const plot = harness.page.plots.get('plot-1');

    expect(harness.page.worldViewport.position).toMatchObject({
      x: 0,
      y: GARDEN_PIXI_GEOMETRY.worldTop,
    });
    expect(harness.page.worldViewportHeight).toBeCloseTo(
      2170 / 3 -
        GARDEN_PIXI_GEOMETRY.worldTop -
        GARDEN_PIXI_GEOMETRY.worldBottom,
    );
    expect(plot.root.position).toMatchObject({ x: 32, y: 24 });
    expect(harness.page.herbsButton.root.position).toMatchObject({
      x: 16,
      y: 2170 / 3 - 162 - 80.25,
    });
    expect(harness.page.seedsButton.root.position).toMatchObject({
      x: 298.5,
      y: 2170 / 3 - 162 - 80.25,
    });
    expect(plot.progress.progress).toBeCloseTo(0.5);
    expect(plot.progress).toMatchObject({
      tone: 'green',
      height: 10,
    });

    harness.page.activate();
    expect(ticker.add).toHaveBeenCalledWith(
      harness.page.tickHandler,
    );
    harness.page.deactivate();
    expect(ticker.remove).toHaveBeenCalledWith(
      harness.page.tickHandler,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('replaces buy-slot copy with the shared yellow cost button', () => {
    const harness = createHarness();
    const model = createGardenViewModel();
    model.garden.plots.push({
      id: 'plot-2',
      tileNumber: 2,
      phase: 'empty',
      buySlot: true,
      costCoin: 25,
      affordable: false,
      actionText: 'buy 25 coin',
    });

    harness.page.bind(model);
    const plot = harness.page.plots.get('plot-2');

    expect(plot.buyCostButton).toBeInstanceOf(PixiCostButton);
    expect(plot.buyCostButton).toMatchObject({
      tone: 'yellow',
      visible: true,
      renderable: true,
      costState: 'unaffordable',
      resource: 'coin',
      buttonWidth: GARDEN_PIXI_GEOMETRY.buyButtonWidth,
      buttonHeight: GARDEN_PIXI_GEOMETRY.buyButtonHeight,
    });
    expect(plot.buyCostButton.amountLabel.text).toBe('25');
    expect(plot.buyCostButton.amountLabel.colorToken).toBe('#c1121f');
    expect(plot.buyCostButton.position).toMatchObject({
      x:
        (GARDEN_PIXI_GEOMETRY.plotWidth -
          GARDEN_PIXI_GEOMETRY.buyButtonWidth) /
        2,
      y:
        (GARDEN_PIXI_GEOMETRY.plotHeight -
          GARDEN_PIXI_GEOMETRY.buyButtonHeight) /
        2,
    });
    expect(plot.action.visible).toBe(false);

    model.garden.plots[1].affordable = true;
    harness.page.bind(model);

    expect(plot.buyCostButton.costState).toBe('available');
    expect(plot.buyCostButton.enabled).toBe(true);
    expect(plot.buyCostButton.amountLabel.colorToken).toBe('#ffffff');
    expect(plot.action.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders plot upgrades with the shared three-slot star tiers', () => {
    const harness = createHarness();
    const base = createGardenViewModel();
    base.garden.plots[0].level = 1;
    harness.page.bind(base);
    const plot = harness.page.plots.get('plot-1');

    expect(plot.level).toMatchObject({
      level: 0,
      tone: 'empty',
      starCount: 0,
    });
    expect(plot.level.slots).toHaveLength(3);
    expect(plot.level.slots.map((slot) => slot.fill.visible)).toEqual([
      false,
      false,
      false,
    ]);

    const yellow = createGardenViewModel();
    yellow.garden.plots[0].level = 3;
    harness.page.bind(yellow);

    expect(plot.level).toMatchObject({
      level: 2,
      tone: 'yellow',
      starCount: 2,
    });
    expect(plot.level.slots.map((slot) => slot.fill.visible)).toEqual([
      true,
      true,
      false,
    ]);

    const orange = createGardenViewModel();
    orange.garden.plots[0].level = 5;
    harness.page.bind(orange);

    expect(plot.level).toMatchObject({
      level: 4,
      tone: 'orange',
      starCount: 1,
    });
    expect(plot.level.slots.map((slot) => slot.fill.visible)).toEqual([
      true,
      false,
      false,
    ]);

    harness.page.destroy();
    harness.dispose();
  });

  it('advances plot progress between gameplay snapshots', () => {
    let now = 1_000;
    const harness = createHarness({
      timeSource: () => now,
    });
    const viewModel = createGardenViewModel();
    viewModel.garden.now = now;
    viewModel.garden.plots[0].process = {
      totalMs: 10_000,
      remainingMs: 6_000,
      progress: 0.4,
    };

    harness.page.bind(viewModel);
    const plot = harness.page.plots.get('plot-1');
    expect(plot.progress.progress).toBeCloseTo(0.4);
    expect(plot.plantMotion.scale.x).toBeCloseTo(0.42 + 0.4 * 0.58);

    now = 1_500;
    harness.page.tick(now);

    expect(plot.progress.progress).toBeCloseTo(0.45);
    expect(plot.plantMotion.scale.x).toBeCloseTo(0.42 + 0.45 * 0.58);

    harness.page.destroy();
    harness.dispose();
  });

  it('does not move plot progress backward when the same timer snapshot is rebound', () => {
    let now = 1_000;
    const harness = createHarness({
      timeSource: () => now,
    });
    const viewModel = createGardenViewModel();
    viewModel.garden.now = now;
    viewModel.garden.plots[0].process = {
      totalMs: 10_000,
      remainingMs: 6_000,
      progress: 0.4,
    };

    harness.page.bind(viewModel);
    const plot = harness.page.plots.get('plot-1');

    now = 1_500;
    harness.page.tick(now);
    expect(plot.progress.progress).toBeCloseTo(0.45);

    viewModel.garden.now = now;
    harness.page.bind(viewModel);

    expect(plot.progress.progress).toBeCloseTo(0.45);

    harness.page.destroy();
    harness.dispose();
  });

  it('resets plot progress when the authoritative timer restarts', () => {
    let now = 1_000;
    const harness = createHarness({
      timeSource: () => now,
    });
    const growing = createGardenViewModel();
    growing.garden.now = now;
    growing.garden.plots[0].process = {
      totalMs: 10_000,
      remainingMs: 6_000,
      progress: 0.4,
    };

    harness.page.bind(growing);
    now = 1_500;
    harness.page.tick(now);

    const restarted = createGardenViewModel();
    restarted.garden.now = now;
    restarted.garden.plots[0].process = {
      totalMs: 10_000,
      remainingMs: 10_000,
      progress: 0,
    };
    harness.page.bind(restarted);

    expect(harness.page.plots.get('plot-1').progress.progress).toBe(0);

    harness.page.destroy();
    harness.dispose();
  });

  it('matches the retained growing, ready-lift, and harvesting motion cycles', () => {
    let now = 0;
    const harness = createHarness({
      timeSource: () => now,
    });
    harness.page.bind(createGardenViewModel());
    const plot = harness.page.plots.get('plot-1');

    harness.page.tick(now);
    expect(plot.plantMotion.rotation).toBeCloseTo(
      (-1.8 * Math.PI) / 180,
    );

    now = 1_200;
    harness.page.tick(now);
    expect(plot.plantMotion.rotation).toBeCloseTo(
      (2.1 * Math.PI) / 180,
    );

    const ready = createGardenViewModel();
    ready.garden.plots[0] = {
      ...ready.garden.plots[0],
      phase: 'ready',
      process: null,
      progress: 1,
    };
    now = 0;
    harness.page.bind(ready);
    now = 1_080 * 0.26;
    harness.page.tick(now);
    expect(plot.plantMotion.y).toBeCloseTo(
      GARDEN_PIXI_GEOMETRY.plotHeight - 28,
    );

    const harvesting = createGardenViewModel();
    harvesting.garden.plots[0] = {
      ...harvesting.garden.plots[0],
      phase: 'harvesting',
      process: null,
    };
    now = 0;
    harness.page.bind(harvesting);
    expect(plot.scissors.alpha).toBe(1);
    expect(plot.scissorsOpen.alpha).toBe(0);
    now = 220;
    harness.page.tick(now);
    expect(plot.scissors.alpha).toBe(0);
    expect(plot.scissorsOpen.alpha).toBe(1);
    expect(plot.scissorsMotion.rotation).toBeCloseTo(
      (-7 * Math.PI) / 180,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('reuses retained motion objects for seed pick-return and plot receive feedback', () => {
    let now = 0;
    const harness = createHarness({
      timeSource: () => now,
    });
    harness.page.bind(createGardenViewModel());
    const plot = harness.page.plots.get('plot-1');
    const row = harness.page.seedInventory.rows.get('sage-seed');
    const drag = harness.inputRouter.store.getRegistrations('drag')[0];
    const drop = harness.inputRouter.store.getRegistrations('drop')[0];
    const plotChildren = plot.frame.children.length;
    const rowChildren = row.root.children.length;
    const dragChildren = harness.page.dragLayer.children.length;

    drag.onDragStart({
      point: new Point(300, 500),
      movement: { stepGlobal: { x: 0, y: 0 } },
    });
    expect(row.pickStartedAt).toBe(0);
    expect(harness.page.seedDragGhost.root.visible).toBe(true);

    now = 70;
    harness.page.tick(now);
    expect(row.motionRoot.x).toBeCloseTo(1);
    drag.onDragMove({
      point: new Point(304, 498),
      movement: { stepGlobal: { x: 4, y: -2 } },
    });
    expect(harness.page.seedDragGhost.item.rotation).toBeGreaterThan(
      (6 * Math.PI) / 180,
    );

    drag.onDragCancel({
      point: new Point(304, 498),
      accepted: false,
    });
    expect(row.returnStartedAt).toBe(70);
    expect(harness.page.seedDragGhost.motionType).toBe('return');
    now = 70 + 190 * 0.58;
    harness.page.tick(now);
    expect(row.motionRoot.x).toBeCloseTo(-1);
    now = 260;
    harness.page.tick(now);
    expect(row.motionRoot.x).toBe(0);
    expect(harness.page.seedDragGhost.root.visible).toBe(false);

    now = 300;
    drag.onDragStart({
      point: new Point(300, 500),
      movement: { stepGlobal: { x: 0, y: 0 } },
    });
    expect(
      drop.onDrop({
        data: {
          kind: 'seed',
          item: { id: 'sage-seed' },
        },
      }),
    ).toBe(true);
    drag.onDragEnd({
      accepted: true,
      dropTargetId: drop.id,
      point: new Point(320, 520),
    });
    expect(plot.receiveStartedAt).toBe(300);
    expect(harness.page.seedDragGhost.motionType).toBe('plot');

    now = 300 + 240 * 0.52;
    harness.page.tick(now);
    expect(plot.receiveOffsetY).toBeCloseTo(2);
    expect(plot.receiveScaleX).toBeCloseTo(1.02);
    expect(plot.receiveScaleY).toBeCloseTo(0.98);
    now = 540;
    harness.page.tick(now);
    expect(plot.receiveStartedAt).toBeNull();
    expect(plot.frame.scale).toMatchObject({ x: 1, y: 1 });
    expect(harness.page.seedDragGhost.root.visible).toBe(false);

    expect(plot.frame.children).toHaveLength(plotChildren);
    expect(row.root.children).toHaveLength(rowChildren);
    expect(harness.page.dragLayer.children).toHaveLength(dragChildren);
    expect(harness.page.plotPool.getStats()).toMatchObject({
      allocated: 1,
      highWaterMark: 1,
    });
    expect(harness.page.seedInventory.rowPool.getStats()).toMatchObject({
      allocated: 1,
      highWaterMark: 1,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('settles transient Garden motion when the retained page deactivates', () => {
    let now = 0;
    const ticker = {
      add: vi.fn(),
      remove: vi.fn(),
    };
    const harness = createHarness({
      ticker,
      timeSource: () => now,
    });
    harness.page.bind(createGardenViewModel());
    harness.page.activate();
    const plot = harness.page.plots.get('plot-1');
    const row = harness.page.seedInventory.rows.get('sage-seed');
    const drag = harness.inputRouter.store.getRegistrations('drag')[0];
    const drop = harness.inputRouter.store.getRegistrations('drop')[0];

    drag.onDragStart({ point: new Point(300, 500) });
    drop.onDrop({
      data: {
        kind: 'seed',
        item: { id: 'sage-seed' },
      },
    });
    now = 60;
    harness.page.tick(now);
    harness.page.deactivate();

    expect(ticker.remove).toHaveBeenCalledWith(harness.page.tickHandler);
    expect(plot.receiveStartedAt).toBeNull();
    expect(row.pickStartedAt).toBeNull();
    expect(row.returnStartedAt).toBeNull();
    expect(row.motionRoot.position).toMatchObject({ x: 0, y: 0 });
    expect(harness.page.seedDragGhost.root.visible).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('restores plot layout transforms after press feedback and pool reuse', () => {
    const harness = createHarness();
    harness.page.bind(createGardenViewModel());
    const plot = harness.page.plots.get('plot-1');

    plot.setPressed(true);
    plot.setPressed(false);
    plot.startSeedReceive(0);
    plot.updateSeedReceive(120);
    harness.page.bind(createGardenViewModel({ actionText: 'ready' }));

    expectPlotFrameAligned(plot);

    const empty = createGardenViewModel();
    empty.garden.plots = [];
    harness.page.bind(empty);

    expect(plot.pressed).toBe(false);
    expect(plot.root.position).toMatchObject({ x: 0, y: 0 });
    expect(plot.root.hitArea).toBeNull();
    expect(plot.frame.position).toMatchObject({ x: 0, y: 0 });
    expect(plot.frame.pivot).toMatchObject({ x: 0, y: 0 });
    expect(plot.frame.scale).toMatchObject({ x: 1, y: 1 });
    expect(plot.receiveStartedAt).toBeNull();
    expect(plot.plantMotion.position).toMatchObject({ x: 0, y: 0 });
    expect(plot.plantMotion.scale).toMatchObject({ x: 1, y: 1 });
    expect(plot.plantMotion.rotation).toBe(0);
    expect(plot.scissorsMotion.visible).toBe(false);

    const replacement = createGardenViewModel();
    replacement.garden.plots = [
      {
        ...replacement.garden.plots[0],
        id: 'plot-2',
        tileNumber: 2,
      },
    ];
    harness.page.bind(replacement);
    const reused = harness.page.plots.get('plot-2');

    expect(reused).toBe(plot);
    expect(reused.root.position).toMatchObject({ x: 32, y: 24 });
    expectPlotFrameAligned(reused);
    expect(harness.page.plotPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      available: 0,
    });

    harness.page.destroy();
    harness.dispose();
  });

  it('constructs each confirmation dialog once and preserves exact confirmation copy', () => {
    const confirmCancel = vi.fn(() => true);
    const harness = createHarness();
    harness.page.bind(createGardenViewModel());

    harness.page.openDialog('cancel', {
      message: 'empty this growing plot?',
      confirmLabel: 'empty',
      payload: { tileNumber: 1 },
      onConfirm: confirmCancel,
    });
    const cancel = harness.dialogs.get('garden.cancel');
    expect(cancel.modal).toBeInstanceOf(PixiOwnedDialogSurface);
    expect(cancel.modal.panel).toBeInstanceOf(PixiDialogFrame);
    expect(cancel.modal.openMotion).toBe('center');
    expect(cancel.modal.panel.titleVariant).toBe('danger');
    expect(cancel.modal.panel.titleLabel.textObject.text).toBe(
      'Cancel Progress?',
    );
    expect(cancel.message.text).toBe('Empty This Growing Plot?');
    expect(cancel.message.anchor).toMatchObject({ x: 0.5, y: 0.5 });
    expect(cancel.keep.variant).toBe('yellow');
    expect(cancel.keep.text.text).toBe('Keep');
    expect(cancel.confirm.variant).toBe('red');
    expect(cancel.confirm.text.text).toBe('Empty');
    expect(cancel.modal.panel.outerHeight).toBe(126);
    expect(cancel.confirmAction()).toBe(true);
    expect(confirmCancel).toHaveBeenCalledWith({ tileNumber: 1 });

    harness.page.openDialog('cancel', {
      message: 'empty another plot?',
    });
    expect(cancel.message.text).toBe('Empty Another Plot?');
    expect(harness.dialogs.get('garden.cancel')).toBe(cancel);
    harness.dialogs.close('garden.cancel');

    harness.page.openDialog('swap', {
      message: 'swap sage seed for thyme seed?',
      confirmLabel: 'swap',
    });
    const swap = harness.dialogs.get('garden.swap');
    expect(swap.message.text).toBe(
      'swap sage seed for thyme seed?',
    );
    expect(swap.confirm.text.text).toBe('swap');
    harness.dialogs.close('garden.swap');
    harness.page.openDialog('swap', { message: 'swap again?' });
    expect(harness.dialogs.get('garden.swap')).toBe(swap);

    harness.page.destroy();
    harness.dispose();
  });
});

function createHarness({
  ticker = null,
  timeSource = () => 0,
} = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const inputRouter = new PixiInputRouter();
  const semanticTargets = new SemanticTargetRegistry();
  const assetManager = createPixiAssetManagerFake(Texture);
  assetManager.getAtlasTexture = vi.fn(assetManager.getAtlasTexture);
  const page = new GardenPixiPage({
    assetManager,
    dialogLayer,
    dialogRegistry: dialogs,
    inputRouter,
    semanticTargets,
    ticker,
    timeSource,
  });

  return {
    assetManager,
    dialogLayer,
    dialogs,
    inputRouter,
    page,
    semanticTargets,
    dispose() {
      dialogs.destroy();
      dialogLayer.destroy({ children: true });
    },
  };
}

function expectPlotFrameAligned(plot) {
  expect(
    plot.frame.position.x - plot.frame.pivot.x * plot.frame.scale.x,
  ).toBeCloseTo(
    (plot.width - GARDEN_PIXI_GEOMETRY.plotWidth) / 2,
  );
  expect(
    plot.frame.position.y - plot.frame.pivot.y * plot.frame.scale.y,
  ).toBeCloseTo(0);
  expect(plot.frame.scale).toMatchObject({ x: 1, y: 1 });
}

function createPointerEvent(target, type, point = { x: 0, y: 0 }) {
  return {
    type,
    target,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    global: point,
    clientX: point.x,
    clientY: point.y,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  };
}

function createGardenViewModel({
  actionText = 'growing',
  seedQuantity = 3,
  activatePlot = vi.fn(() => true),
  dropSeed = vi.fn(() => true),
} = {}) {
  return {
    garden: {
      now: 0,
      maxPlots: 9,
      plots: [
        {
          id: 'plot-1',
          tileNumber: 1,
          soilLevel: 1,
          phase: 'growing',
          label: 'sage',
          herbKey: 'sage',
          actionText,
          process: {
            durationMs: 10_000,
            endTimeMs: 5_000,
          },
          acceptsSeedDrop: true,
        },
      ],
      inventory: {
        activeTab: 'seeds',
        herbs: {
          rows: [
            {
              id: 'sage-herb',
              key: 'sage',
              label: 'sage',
              quantity: 1,
            },
          ],
        },
        seeds: {
          rows: [
            {
              id: 'sage-seed',
              key: 'sage',
              label: 'sage',
              quantity: seedQuantity,
            },
          ],
        },
      },
    },
    actions: {
      activatePlot,
      dropSeed,
    },
  };
}
