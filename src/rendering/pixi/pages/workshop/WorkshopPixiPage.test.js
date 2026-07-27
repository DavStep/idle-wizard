// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
} from './PixiPageTestHarness.js';
import { Container, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DialogRegistry } from '../../retained/DialogRegistry.js';
import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { TutorialRevealController } from '../../global/tutorial/TutorialRevealController.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PageRegistry } from '../../retained/PageRegistry.js';
import { SemanticTargetRegistry } from '../../retained/SemanticTargetRegistry.js';
import { PIXI_ROOT_RUN_ASSETS } from '../../theme/PixiThemeTokens.js';
import { ShopDialogPixi } from '../shop/ShopDialogPixi.js';
import { WorkshopPixiPage } from './WorkshopPixiPage.js';

describe('WorkshopPixiPage', () => {
  it('renders the request panel copy in white with the shared dark stroke', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.tasks.nextText = 'next request';
    model.workshop.tasks.rewards = ['1 crystal'];

    harness.page.bind(model);

    const row = harness.page.tasks.rows.get('request-1');
    for (const text of [
      harness.page.tasks.panel.title,
      harness.page.tasks.next,
      harness.page.tasks.rewardsTitle,
      harness.page.tasks.rewards,
      row.label,
      row.value,
    ]) {
      expect(text.style.fill).toBe('#ffffff');
      expect(text.style.stroke).toMatchObject({
        color: '#17191f',
        width: 2,
        join: 'round',
      });
    }

    harness.page.destroy();
    harness.dispose();
  });

  it('renders Workshop side controls with capitalized white stroked labels and enlarged art', () => {
    const harness = createHarness();
    harness.page.bind(createWorkshopViewModel());

    const sideControls = [
      harness.page.bagButton,
      harness.page.inboxButton,
      harness.page.features.get('alliance'),
      harness.page.features.get('leaderboard'),
      harness.page.features.get('discoveries'),
      harness.page.features.get('personalTasks'),
      harness.page.features.get('worldEvent'),
    ];

    expect(sideControls.map((control) => control.label.text)).toEqual([
      'Bag',
      'Inbox',
      'Alliance',
      'Leaderboard',
      'Discoveries',
      'Tasks',
      'Event',
    ]);
    for (const control of sideControls) {
      expect(control.label.style.fill).toBe('#ffffff');
      expect(control.label.style.stroke).toMatchObject({
        color: '#0a0a0a',
        width: 2,
        join: 'round',
      });
    }
    expect(harness.page.statsButton.text.text).toBe('Stats');
    expect(harness.page.inboxButton.iconScale).toBe(1.3);
    expect(
      harness.page.features.get('leaderboard').presentation.scale,
    ).toBe(1.2);

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the compact shared yellow button for request actions', () => {
    const harness = createHarness();
    const turnIn = vi.fn(() => ({ ok: true }));
    const model = createWorkshopViewModel();
    model.workshop.tasks.rows[0].actionLabel = 'turn in';
    model.workshop.tasks.rows[0].enabled = true;
    model.workshop.tasks.rows[0].onActivate = turnIn;

    harness.page.bind(model);

    const action = harness.page.tasks.rows.get('request-1').action;
    expect(action.variant).toBe('yellow');
    expect(action.control.variant).toBe('yellow');
    expect(action.nineSlice.visible).toBe(true);
    expect(action.root.visible).toBe(true);
    expect(action).toMatchObject({
      width: 58,
      height: 20,
    });
    expect(action.handleTap()).toEqual({ ok: true });
    expect(turnIn).toHaveBeenCalledWith(model.workshop.tasks.rows[0]);

    harness.page.destroy();
    harness.dispose();
  });

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

  it('uses compact text and a wider frame-attached strip for Bag tabs', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.bag = {
      title: 'Bag',
      selectedTabId: 'currencies',
      tabs: [
        { id: 'currencies', label: 'Currencies', selected: true },
        { id: 'seeds', label: 'Seeds', selected: false },
        { id: 'herbs', label: 'Herbs', selected: false },
        { id: 'potions', label: 'Potions', selected: false },
        { id: 'ingredients', label: 'Ingredients', selected: false },
      ],
      rows: [],
    };

    harness.page.bind(model);
    harness.page.openDialog('bag');

    const dialog = harness.dialogs.get('workshop.bag');
    const tabs = dialog.tabs.getWidgets();
    const expectedTabWidth = (286 - 3 * (tabs.length - 1)) / tabs.length;

    expect(dialog.panel.titleLabel.textObject.text).toBe('Bag');
    expect(dialog.tabsLayer.position.x).toBe(9);
    expect(tabs).toHaveLength(5);
    for (const tab of tabs) {
      expect(tab.control.textLabel.fontSize).toBe(11);
      expect(tab.width).toBeCloseTo(expectedTabWidth);
    }

    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the Bag scroll viewport equally inset from the paper top and bottom', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.bag = {
      title: 'Bag',
      selectedTabId: 'seeds',
      tabs: [
        { id: 'currencies', label: 'Currencies', selected: false },
        { id: 'seeds', label: 'Seeds', selected: true },
        { id: 'herbs', label: 'Herbs', selected: false },
      ],
      rows: Array.from({ length: 20 }, (_, index) => ({
        id: `seed-${index}`,
        label: `Seed ${index + 1}`,
        value: '0',
      })),
    };

    harness.page.bind(model);
    harness.page.openDialog('bag');

    const dialog = harness.dialogs.get('workshop.bag');
    const paperTop = dialog.panel.paperFrame.position.y;
    const paperBottom =
      paperTop + dialog.panel.paperFrame.frameHeight;
    const viewportTop = dialog.scroll.root.position.y;
    const viewportBottom = viewportTop + dialog.scroll.height;

    expect(viewportTop - paperTop).toBeGreaterThan(0);
    expect(viewportTop - paperTop).toBeCloseTo(
      paperBottom - viewportBottom,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('uses the shared split-settings composition for summoning seeds', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.summonInfo = {
      title: 'Summoning Seeds',
      summaryRows: [
        { id: 'auto', label: 'Auto Summon', value: 'Locked' },
        {
          id: 'reserve',
          label: 'Keep Mana Above',
          value: '0',
          valueIconResourceKey: 'mana',
        },
        {
          id: 'selected',
          label: 'Sage Seed',
          value: 'Medium · 100%',
          valueTone: 'yellow',
          itemKind: 'seed',
          itemKey: 'sageSeed',
          iconLeading: true,
        },
      ],
      settingsToggle: null,
      manaSlider: {
        mode: 'range',
        min: 0,
        max: 5_000,
        step: 1,
        value: 0,
        tone: 'blue',
        enabled: false,
      },
      dropSlider: {
        mode: 'milestones',
        value: 'medium',
        options: [
          { value: 'none', tone: 'root' },
          { value: 'low', tone: 'red' },
          { value: 'medium', tone: 'yellow' },
          { value: 'high', tone: 'green' },
        ],
      },
      actions: [],
      items: [
        {
          id: 'sageSeed',
          label: 'Sage Seed',
          detail: '100% Chance',
          value: 'Medium',
          valueTone: 'yellow',
          itemKind: 'seed',
          itemKey: 'sageSeed',
          selected: true,
          action: vi.fn(),
        },
        {
          id: 'mintSeed',
          label: 'Mint Seed',
          detail: '0% Chance',
          value: 'None',
          valueTone: 'text',
          itemKind: 'seed',
          itemKey: 'mintSeed',
          selected: false,
          action: vi.fn(),
        },
        {
          id: 'briarSeed',
          label: 'Briar Seed',
          detail: '0% Chance',
          value: 'Low',
          valueTone: 'red',
          itemKind: 'seed',
          itemKey: 'briarSeed',
          selected: false,
          action: vi.fn(),
        },
        {
          id: 'lavenderSeed',
          label: 'Lavender Seed',
          detail: '0% Chance',
          value: 'High',
          valueTone: 'green',
          itemKind: 'seed',
          itemKey: 'lavenderSeed',
          selected: false,
          action: vi.fn(),
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('summonInfo');

    const dialog = harness.dialogs.get('workshop.summonInfo');
    expect(dialog).toBeInstanceOf(ShopDialogPixi);
    expect(dialog.selectionSection.visible).toBe(true);
    expect(dialog.itemSection.visible).toBe(true);
    expect(dialog.panel.paperFrame.visible).toBe(false);
    expect(dialog.settingsToggle.visible).toBe(false);
    expect(dialog.manaSettingsSlider).toMatchObject({
      visible: true,
      enabled: false,
      value: 0,
    });
    expect(dialog.dropSettingsSlider).toMatchObject({
      visible: true,
      enabled: true,
      value: 'medium',
      tone: 'yellow',
    });
    const reserveRow = dialog.summaryRows
      .getWidgets()
      .find((row) => row.key === 'reserve');
    const selectedRow = dialog.summaryRows
      .getWidgets()
      .find((row) => row.key === 'selected');
    const seedRows = dialog.list.rows.getWidgets();
    expect(reserveRow.valueLabel.visible).toBe(false);
    expect(reserveRow.valueResource).toMatchObject({
      visible: true,
      resource: 'mana',
      amount: '0',
    });
    expect(reserveRow.valueResource.icon.visible).toBe(true);
    expect(
      reserveRow.valueResource.x + reserveRow.valueResource.measuredWidth,
    ).toBe(dialog.panel.contentBoxWidth);
    expect(reserveRow.valueResource.amountLabel.x).toBeGreaterThan(
      reserveRow.valueResource.icon.x,
    );
    expect(selectedRow.valueLabel.textObject.style.fill).toBe('#795909');
    expect(
      seedRows.map((row) => row.value.textObject.style.fill),
    ).toEqual([
      '#795909',
      dialog.contentTheme.text,
      '#912f2b',
      '#256b25',
    ]);
    expect(dialog.actions.getWidgets()).toHaveLength(0);
    expect(dialog.list.items[0]).toMatchObject({
      id: 'sageSeed',
      selected: true,
    });
    expect(dialog.itemSectionBounds.y).toBeGreaterThan(
      dialog.selectionSectionBounds.height,
    );

    harness.page.destroy();
    harness.dispose();
  });

  it('renders each stats item icon immediately before its retained count', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.stats = {
      title: 'stats',
      rows: [
        {
          id: 'briarSeed',
          label: 'briar seed',
          value: '12',
          itemKind: 'seed',
          itemKey: 'briarSeed',
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('stats');

    const row = harness.dialogs.get('workshop.stats').rows.get('briarSeed');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('seed:pack');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('herb:briarHerb');
    expect(row.valueIcon.visible).toBe(true);
    expect(row.valueIconOverlay.visible).toBe(true);
    expect(row.valueIcon.x).toBeLessThan(row.value.x);
    expect(row.valueIcon.x + row.valueIcon.width / 2 + 3).toBe(
      row.value.x - row.value.width,
    );
    expect(row.valueIcon.y).toBe(9);

    harness.page.destroy();
    harness.dispose();
  });

  it('renders icons and one normal amount color across every Bag row kind', () => {
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.getAtlasTexture = vi.fn(() => new Texture());
    const harness = createHarness({ assetManager });
    const model = createWorkshopViewModel();
    model.workshop.dialogs.bag = {
      title: 'Bag',
      selectedTabId: 'currencies',
      tabs: [{ id: 'currencies', label: 'Currencies', selected: true }],
      rows: [
        {
          id: 'mana',
          label: 'Mana',
          value: '4/10',
          resourceKey: 'mana',
          itemKind: 'resource',
          itemKey: 'mana',
        },
        {
          id: 'sageSeed',
          label: 'Sage',
          value: '2',
          resourceKey: 'seed',
          itemKind: 'seed',
          itemKey: 'sageSeed',
        },
        {
          id: 'sageHerb',
          label: 'Sage',
          value: '1',
          resourceKey: 'herb',
          itemKind: 'herb',
          itemKey: 'sageHerb',
        },
        {
          id: 'manaTonic',
          label: 'Mana Tonic',
          value: '5',
          resourceKey: 'potion',
          itemKind: 'potion',
          itemKey: 'manaTonic',
        },
        {
          id: 'cyclopsEye',
          label: 'Cyclops Eye',
          value: '6',
          resourceKey: 'ingredient',
          itemKind: 'ingredient',
          itemKey: 'cyclopsEye',
        },
      ],
    };

    harness.page.bind(model);
    harness.page.openDialog('bag');

    const dialog = harness.dialogs.get('workshop.bag');
    const rows = dialog.rows.getWidgets();
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('resource:mana');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('seed:pack');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('herb:sageHerb');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('potion:manaTonic');
    expect(assetManager.getAtlasTexture).toHaveBeenCalledWith('ingredient:cyclopsEye');
    expect(rows.every((row) => row.valueIcon.visible)).toBe(true);
    expect(rows.every((row) => row.value.style.fill === dialog.contentTheme.text)).toBe(true);

    harness.page.destroy();
    harness.dispose();
  });

  it('insets the stats scroll crop and moves its scrollbar toward the paper edge', () => {
    const harness = createHarness();
    const model = createWorkshopViewModel();
    model.workshop.dialogs.stats = {
      title: 'stats',
      rows: Array.from({ length: 20 }, (_, index) => ({
        id: `row-${index}`,
        label: `row ${index}`,
        value: String(index),
      })),
    };

    harness.page.bind(model);
    harness.page.openDialog('stats');

    const dialog = harness.dialogs.get('workshop.stats');
    const firstRow = dialog.rows.get('row-0');
    const secondRow = dialog.rows.get('row-1');
    expect(dialog.scroll.root.y).toBe(24);
    expect(firstRow.root.y).toBe(12);
    expect(secondRow.root.y).toBe(
      12 + firstRow.getPreferredHeight() + 4,
    );
    expect(dialog.scroll.width).toBe(268);
    expect(dialog.scroll.scrollbarTrack.visible).toBe(true);
    expect(dialog.scroll.scrollbarTrack.getLocalBounds().x).toBeGreaterThan(
      268,
    );

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

  it('renders projected summon notifications on the retained cost button', () => {
    const harness = createHarness();
    const activeModel = createWorkshopViewModel();
    activeModel.workshop.summon.notification = 'orange';
    harness.page.bind(activeModel);

    const badge = harness.page.summon.notification;
    const retainedRoot = badge.root;
    expect(badge.root.parent).toBe(harness.page.summon.button);
    expect(badge.root.position).toMatchObject({ x: 92, y: 0 });
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

  it('uses the stacked info-blue cost button and mana icon for summon', () => {
    const summonTexture = new Texture();
    const disabledTexture = new Texture();
    const manaTexture = new Texture();
    const assetManager = createPixiAssetManagerFake(Texture);
    assetManager.has = vi.fn(
      (assetId) =>
        assetId === PIXI_ROOT_RUN_ASSETS.buttonBlueShort ||
        assetId === PIXI_ROOT_RUN_ASSETS.buttonGrayStacked,
    );
    assetManager.getTexture = vi.fn(
      (assetId) =>
        assetId === PIXI_ROOT_RUN_ASSETS.buttonBlueShort
          ? summonTexture
          : assetId === PIXI_ROOT_RUN_ASSETS.buttonGrayStacked
            ? disabledTexture
            : Texture.EMPTY,
    );
    assetManager.getAtlasTexture = vi.fn(
      (frameName) =>
        frameName === 'resource:mana' ? manaTexture : Texture.EMPTY,
    );
    const harness = createHarness({ assetManager });
    const activeModel = createWorkshopViewModel();
    harness.page.bind(activeModel);

    expect(harness.page.summon.button).toMatchObject({
      stacked: true,
      tone: 'blue',
      buttonWidth: 92,
      buttonHeight: 52,
    });
    expect(harness.page.summon.button.background.texture).toBe(summonTexture);
    expect(harness.page.summon.button.actionTextLabel.text).toBe('Summon Seed');
    expect(harness.page.summon.button.actionTextLabel.fontSize).toBe(11);
    expect(harness.page.summon.button.amountLabel.fontSize).toBe(13);
    expect(harness.page.summon.button.actionTextLabel.stroke.width).toBe(4);
    expect(harness.page.summon.button.amountLabel.stroke.width).toBe(4);
    expect(harness.page.summon.button.resource).toBe('mana');
    expect(harness.page.summon.button.amountLabel.text).toBe('10');
    expect(harness.page.summon.button.resourceIcon.texture).toBe(manaTexture);
    expect(harness.page.summon.button.resourceIcon.visible).toBe(true);

    const disabledModel = createWorkshopViewModel();
    disabledModel.workshop.summon.enabled = false;
    harness.page.bind(disabledModel);

    expect(harness.page.summon.button.background.texture).toBe(
      disabledTexture,
    );
    expect(harness.page.summon.button.enabled).toBe(false);

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

  it('routes a tutorial-revealed summon press through the stable button target', () => {
    const inputRouter = new PixiInputRouter();
    const summonSeed = vi.fn(() => ({ ok: true }));
    const harness = createHarness({ inputRouter });
    harness.page.bind(createWorkshopViewModel({ summonSeed }));
    harness.page.activate();

    const summonRegistration = inputRouter.store
      .getRegistrations('press')
      .find((registration) =>
        registration.id.startsWith('retained:workshop-summon:'),
      );
    const tutorialTarget =
      harness.semanticTargets.getTutorialTarget('workshop:summonSeed');

    expect(summonRegistration?.displayObject).toBe(harness.page.summon.button);
    expect(summonRegistration?.fallbackHitTest).toBe(true);
    expect(tutorialTarget?.displayObject).toBe(harness.page.summon.button);
    expect(harness.page.summon.root.eventMode).toBe('passive');
    expect(harness.page.summon.root.hitArea).toBeUndefined();
    expect(harness.page.summon.button).toMatchObject({
      eventMode: 'static',
      hitArea: {
        x: 0,
        y: 0,
        width: 92,
        height: 52,
      },
    });

    const revealController = new TutorialRevealController();
    revealController.register('summon', {
      objects: [tutorialTarget.displayObject],
      interactiveObjects: [tutorialTarget.displayObject],
    });
    revealController.apply([], { reducedMotion: true });
    expect(inputRouter.isRegistrationAllowed(summonRegistration)).toBe(false);
    revealController.apply(['summon'], { reducedMotion: true });
    expect(inputRouter.isRegistrationAllowed(summonRegistration)).toBe(true);

    const overlayTarget = new Container({ label: 'tutorial-overlay-hit' });
    const summonBounds = harness.page.summon.root.getBounds();
    const summonPoint = {
      x: summonBounds.x + summonBounds.width / 2,
      y: summonBounds.y + summonBounds.height / 2,
    };
    inputRouter.onPointerDown(
      createPointerEvent(overlayTarget, 'pointerdown', summonPoint),
    );
    expect(harness.page.summon.button.pressed).toBe(true);
    inputRouter.onPointerUp(
      createPointerEvent(overlayTarget, 'pointerup', summonPoint),
    );
    expect(harness.page.summon.button.pressed).toBe(false);
    expect(summonSeed).toHaveBeenCalledTimes(1);

    overlayTarget.destroy();
    revealController.destroy();
    harness.page.destroy();
    harness.dispose();
  });

  it('keeps the adjacent summon info icon outside the summon press target', () => {
    const inputRouter = new PixiInputRouter();
    const summonSeed = vi.fn(() => ({ ok: true }));
    const harness = createHarness({ inputRouter });
    const model = createWorkshopViewModel({ summonSeed });
    model.workshop.dialogs.summonInfo = {
      title: 'Summoning Seeds',
      summaryRows: [],
      actions: [],
      items: [],
    };
    harness.page.bind(model);
    harness.page.activate();

    const summonRegistration = inputRouter.store
      .getRegistrations('press')
      .find((registration) =>
        registration.id.startsWith('retained:workshop-summon:'),
      );

    expect(summonRegistration?.displayObject).toBe(harness.page.summon.button);
    expect(harness.page.summon.root.hitArea).toBeUndefined();
    expect(harness.page.summon.button.hitArea).toMatchObject({
      x: 0,
      y: 0,
      width: 92,
      height: 52,
    });

    const infoBounds = harness.page.summon.info.getBounds();
    const infoPoint = {
      x: infoBounds.x + infoBounds.width / 2,
      y: infoBounds.y + infoBounds.height / 2,
    };
    inputRouter.onPointerDown(
      createPointerEvent(harness.page.summon.info, 'pointerdown', infoPoint),
    );
    inputRouter.onPointerUp(
      createPointerEvent(harness.page.summon.info, 'pointerup', infoPoint),
    );

    expect(harness.dialogs.isOpen('workshop.summonInfo')).toBe(true);
    expect(summonSeed).not.toHaveBeenCalled();

    harness.page.destroy();
    harness.dispose();
  });
});

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
