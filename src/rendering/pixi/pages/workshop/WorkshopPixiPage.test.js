// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from './PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import { PIXI_ROOT_RUN_ASSETS } from '../../theme/PixiThemeTokens.js';
import { WorkshopPixiPage } from './WorkshopPixiPage.js';

describe('WorkshopPixiPage', () => {
  it('retains its page tree and keyed repeated widgets across snapshot updates', () => {
    const harness = createHarness();
    const registry = new PageRegistry({
      pages: [['workshop', harness.page]],
    });
    const first = createWorkshopViewModel({
      taskLabel: 'gather 2 sage',
      flyoutText: '+1 seed',
    });

    registry.bind('workshop', first);
    registry.activate('workshop');
    const root = harness.page.getDisplayObject();
    const task = harness.page.tasks.rows.get('request-1');
    const feature = harness.page.features.get('alliance');
    const flyout = harness.page.flyouts.get('reward-1');
    const bagAction = harness.page.bagButton;
    const inboxAction = harness.page.inboxButton;

    registry.bind(
      'workshop',
      createWorkshopViewModel({
        taskLabel: 'gather 1 sage',
        flyoutText: '+2 seeds',
      }),
    );

    expect(harness.page.getDisplayObject()).toBe(root);
    expect(harness.page.tasks.rows.get('request-1')).toBe(task);
    expect(harness.page.features.get('alliance')).toBe(feature);
    expect(harness.page.flyouts.get('reward-1')).toBe(flyout);
    expect(harness.page.bagButton).toBe(bagAction);
    expect(harness.page.inboxButton).toBe(inboxAction);
    expect(harness.page.tasks.rowPool.getStats()).toMatchObject({
      allocated: 1,
      active: 1,
      highWaterMark: 1,
    });
    expect(task.label.text).toBe('gather 1 sage');
    expect(flyout.text.text).toBe('+2 seeds');

    registry.deactivate();
    expect(root).toMatchObject({
      eventMode: 'none',
      renderable: false,
      visible: false,
    });
    registry.destroy();
    harness.dispose();
  });

  it('routes semantic actions and retains lazy-once Workshop dialogs', () => {
    const summonSeed = vi.fn();
    const harness = createHarness();
    harness.page.bind(
      createWorkshopViewModel({
        summonSeed,
      }),
    );
    harness.page.activate();

    expect(harness.semanticTargets.activate('workshop.summon')).toBe(true);
    expect(summonSeed).toHaveBeenCalledTimes(1);
    expect(harness.dialogs.hasInstance('workshop.bag')).toBe(false);

    expect(harness.page.openDialog('bag')).toBe(true);
    const dialog = harness.dialogs.get('workshop.bag');
    expect(dialog).not.toBeNull();
    expect(dialog.modal).toBeInstanceOf(PixiOwnedDialogSurface);
    expect(dialog.panel).toBeInstanceOf(PixiDialogFrame);
    expect(dialog.modal.openMotion).toBe('center');
    expect(harness.dialogs.hasInstance('workshop.bag')).toBe(true);
    expect(harness.dialogs.getOpenDialogIds()).toEqual(['workshop.bag']);

    harness.dialogs.close('workshop.bag');
    harness.page.openDialog('bag', {
      title: 'bag',
      rows: [{ id: 'sage', label: 'sage seed', value: '2' }],
    });

    expect(harness.dialogs.get('workshop.bag')).toBe(dialog);
    expect(dialog.rows.get('sage').label.text).toBe('sage seed');
    expect(harness.dialogs.getStats().constructed).toBe(1);
    harness.page.destroy();
    harness.dispose();
  });

  it('rebinds open tabbed dialogs without reconstructing their retained instances', () => {
    const harness = createHarness();
    let selectedTabId = 'currencies';
    const createModel = () => {
      const model = createWorkshopViewModel();
      model.workshop.dialogs.bag = {
        title: 'bag',
        selectedTabId,
        onSelectTab: (nextTabId) => {
          selectedTabId = nextTabId;
          harness.page.bind(createModel());
          return true;
        },
        tabs: [
          {
            id: 'currencies',
            label: 'currencies',
            selected: selectedTabId === 'currencies',
          },
          {
            id: 'seeds',
            label: 'seeds',
            selected: selectedTabId === 'seeds',
          },
        ],
        rows: [
          {
            id: selectedTabId,
            label: `${selectedTabId} row`,
            value: '1',
          },
        ],
      };
      return model;
    };

    harness.page.bind(createModel());
    harness.page.openDialog('bag');
    const dialog = harness.dialogs.get('workshop.bag');
    const retainedRoot = dialog.root;

    expect(dialog.tabs.get('currencies').selected).toBe(true);
    expect(dialog.tabs.get('seeds').handleTap()).toBe(true);

    expect(harness.dialogs.get('workshop.bag')).toBe(dialog);
    expect(dialog.root).toBe(retainedRoot);
    expect(harness.dialogs.getStats().constructed).toBe(1);
    expect(dialog.viewModel.selectedTabId).toBe('seeds');
    expect(dialog.tabs.get('seeds').selected).toBe(true);
    expect(dialog.rows.get('seeds').label.text).toBe('seeds row');

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps failed chat drafts and clears them only after confirmed success', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: 'global_rate_limited' })
      .mockResolvedValueOnce({ ok: true, body: 'hello' });
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.worldChat = {
      title: 'world chat',
      composer: {
        placeholder: 'message',
        maxLength: 160,
        enabled: true,
      },
      rows: [],
      onSubmit: send,
    };
    harness.page.bind(model);
    harness.page.openDialog('worldChat');
    const dialog = harness.dialogs.get('workshop.worldChat');

    dialog.composerField.setValue('hello', { notify: true });
    await expect(dialog.submitComposer()).resolves.toBe(false);
    expect(dialog.composerField.value).toBe('hello');
    expect(dialog.status.text).toBe('chat busy');

    await expect(dialog.submitComposer()).resolves.toBe(true);
    expect(dialog.composerField.value).toBe('');
    expect(dialog.status.text).toBe('sent');
    expect(send).toHaveBeenCalledTimes(2);

    harness.dialogs.close('workshop.worldChat');
    expect(dialog.composerField.focused).toBe(false);
    expect(dialog.status.text).toBe('');

    harness.page.destroy();
    harness.dispose();
  });

  it('shows and clears the retained inbox notification from its view model', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.inbox = {
      notification: true,
    };
    harness.page.bind(model);

    const retainedBadge = harness.page.inboxButton.notification.root;
    expect(retainedBadge.visible).toBe(true);
    expect(retainedBadge.renderable).toBe(true);

    model.workshop.inbox.notification = false;
    harness.page.bind(model);
    expect(harness.page.inboxButton.notification.root).toBe(retainedBadge);
    expect(retainedBadge.visible).toBe(false);
    expect(retainedBadge.renderable).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the frozen source-space visual anchors for Workshop controls', () => {
    const harness = createHarness();
    harness.page.bind(createWorkshopViewModel());

    expect(harness.page.summon.root.position).toMatchObject({
      x: 180,
      y: (2170 / 3) * 0.595,
    });
    expect(harness.page.bagButton.root.position).toMatchObject({
      x: 16,
      y: 346.75,
    });
    expect(harness.page.statsButton.root.position).toMatchObject({
      x: 244,
      y: 165,
    });
    const alliance = harness.page.features.get('alliance');
    const inbox = harness.page.inboxButton;
    expect(alliance.root.position).toMatchObject({ x: 16, y: 190 });
    expect(inbox.root.position).toMatchObject({ x: 298.5, y: 190 });
    expect(alliance.panel).toBeUndefined();
    expect(alliance.root.hitArea).toMatchObject({
      x: 0,
      y: 12,
      width: 45.5,
      height: 68.25,
    });
    expect(alliance.iconFrame.position).toMatchObject({
      x: 12.75,
      y: 68.137,
    });
    expect(harness.page.features.has('inbox')).toBe(false);
    expect(harness.page.bagButton.button).toBeUndefined();
    expect(harness.page.inboxButton.button).toBeUndefined();
    expect(harness.page.bagButton.root.hitArea).toMatchObject({
      x: 0,
      y: 12,
      width: 45.5,
      height: 68.25,
    });
    expect(harness.page.summon.info.icon.label).toBe(
      'workshop-summon-info:icon',
    );
    expect(harness.page.summon.info.textLabel).toBeUndefined();

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the main HUD art, event timer, and pooled feature notifications', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getTexture = vi.fn(() => Texture.EMPTY);
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.features = [
      {
        id: 'alliance',
        notification: true,
      },
      {
        id: 'worldEvent',
        timer: '2d 4h',
        notification: true,
      },
    ];

    harness.page.bind(model);

    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.workshopAlliance,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.workshopAllianceCloth,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.workshopLeaderboard,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.workshopDiscoveries,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.workshopPersonalTasks,
    );
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.workshopWorldEvent,
    );
    const alliance = harness.page.features.get('alliance');
    expect(alliance.iconFrame.getChildIndex(alliance.icon)).toBeLessThan(
      alliance.iconFrame.getChildIndex(alliance.cloth),
    );
    const event = harness.page.features.get('worldEvent');
    expect(event.timer.text).toBe('2d 4h');
    expect(event.notification.root.visible).toBe(true);
    expect(event.presentation.mirrorOnRight).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps task item identity and resolves its retained atlas icon', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.tasks.rows[0].itemKind = 'potion';
    model.workshop.tasks.rows[0].itemKey = 'briarWard';

    harness.page.bind(model);

    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith(
      'potion:briarWard',
    );
    const row = harness.page.tasks.rows.get('request-1');
    expect(row.icon.visible).toBe(true);
    expect(row.label.x).toBe(19);

    model.workshop.tasks.rows[0].itemKind = 'seed';
    model.workshop.tasks.rows[0].itemKey = 'sageSeed';
    harness.page.bind(model);
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('seed:pack');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith(
      'herb:sageHerb',
    );
    expect(row.iconOverlay.visible).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('plays and settles the exact 520ms summon-circle success glow', () => {
    let frameCallback = null;
    let now = 0;
    const requestFrame = vi.fn((callback) => {
      frameCallback = callback;
      return 1;
    });
    const harness = createHarness({
      requestFrame,
      cancelFrame: vi.fn(),
      timeSource: () => now,
      reducedMotion: false,
    });
    const model = createWorkshopViewModel({
      summonSeed: vi.fn(() => ({ ok: true })),
    });
    harness.page.bind(model);
    harness.page.activate();

    expect(harness.semanticTargets.activate('workshop.summon')).toBe(true);
    expect(harness.page.summon.circle.alpha).toBeCloseTo(0.84, 5);

    now = 520 * 0.32;
    frameCallback(now);
    expect(harness.page.summon.circle.alpha).toBeCloseTo(1, 5);
    expect(harness.page.summon.circle.width).toBeCloseTo(196 * 1.045, 5);

    now = 520;
    frameCallback(now);
    expect(harness.page.summon.circle.alpha).toBe(1);
    expect(harness.page.summon.circle.width).toBeCloseTo(196, 5);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders projected summon notifications on the retained text plate', () => {
    const harness = createHarness();
    const activeModel = createWorkshopViewModel();
    activeModel.workshop.summon.notification = 'orange';
    harness.page.bind(activeModel);

    const badge = harness.page.summon.notification;
    const retainedRoot = badge.root;
    expect(badge.root.parent).toBe(harness.page.summon.plate.root);
    expect(badge.root.position).toMatchObject({ x: 96, y: 0 });
    expect(badge.root.visible).toBe(true);
    expect(badge.root.renderable).toBe(true);
    expect(badge.model.tone).toBe('orange');
    expect(badge.dot.context.instructions.length).toBeGreaterThan(0);

    const suppressedModel = createWorkshopViewModel();
    suppressedModel.workshop.summon.notification = false;
    harness.page.bind(suppressedModel);

    expect(harness.page.summon.notification.root).toBe(retainedRoot);
    expect(badge.root.visible).toBe(false);
    expect(badge.root.renderable).toBe(false);

    harness.page.destroy();
    harness.dispose();
  });

  it('registers controls and modal blocking through the single input router', () => {
    const inputRouter = new PixiInputRouter();
    const harness = createHarness({ inputRouter });
    harness.page.bind(createWorkshopViewModel());

    expect(inputRouter.store.getRegistrations('press').length).toBeGreaterThan(8);
    expect(inputRouter.store.getRegistrations('scroll')).toHaveLength(0);
    expect(harness.page.summon.root.listenerCount('pointertap')).toBe(0);

    harness.page.openDialog('bag');
    expect(inputRouter.getTopModal()?.id).toBe('dialog:workshop.bag');
    expect(inputRouter.store.getRegistrations('scroll')).toHaveLength(1);
    const pressRegistrationsAfterFirstOpen =
      inputRouter.store.getRegistrations('press').length;
    harness.dialogs.close('workshop.bag');
    expect(inputRouter.getTopModal()).toBeNull();
    expect(inputRouter.store.getRegistrations('press')).toHaveLength(
      pressRegistrationsAfterFirstOpen,
    );

    harness.page.openDialog('bag');
    expect(inputRouter.getTopModal()?.id).toBe('dialog:workshop.bag');
    expect(inputRouter.store.getRegistrations('press')).toHaveLength(
      pressRegistrationsAfterFirstOpen,
    );

    harness.page.destroy();
    harness.dispose();
    expect(inputRouter.store.getRegistrations()).toHaveLength(0);
  });
});

function createHarness({
  inputRouter = null,
  assetManager = createPixiAssetManagerFake(Texture),
  ...pageOptions
} = {}) {
  const dialogLayer = new Container();
  const dialogs = new DialogRegistry();
  const semanticTargets = new SemanticTargetRegistry();
  const page = new WorkshopPixiPage({
    assetManager,
    dialogLayer,
    dialogRegistry: dialogs,
    inputRouter,
    semanticTargets,
    ...pageOptions,
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

function createWorkshopViewModel({
  taskLabel = 'gather 2 sage',
  flyoutText = '+1 seed',
  summonSeed = vi.fn(),
} = {}) {
  return {
    workshop: {
      tasks: {
        rows: [
          {
            id: 'request-1',
            label: taskLabel,
            current: 1,
            required: 2,
          },
        ],
      },
      summon: {
        cost: 10,
      },
      flyouts: [
        {
          id: 'reward-1',
          text: flyoutText,
        },
      ],
      dialogs: {
        bag: {
          title: 'bag',
          rows: [],
        },
      },
    },
    actions: {
      summonSeed,
    },
  };
}
