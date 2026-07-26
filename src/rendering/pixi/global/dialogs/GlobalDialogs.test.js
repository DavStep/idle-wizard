// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
  installPixiPageTestCanvas,
} from '../../pages/workshop/PixiPageTestHarness.js';
import { Texture, TextureSource } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import { PixiDialogFrame } from '../../primitives/index.js';
import {
  DialogRegistry,
  SemanticTargetRegistry,
} from '../../retained/index.js';
import { createPixiThemeSnapshot } from '../../theme/PixiThemeTokens.js';
import {
  GLOBAL_DIALOG_IDS,
  createGlobalDialogFactories,
  registerGlobalDialogFactories,
} from './index.js';
import { GLOBAL_DIALOG_GEOMETRY } from './GlobalDialogKit.js';

installPixiPageTestCanvas();

describe('retained global Pixi dialogs', () => {
  it('exports canonical aliases and registers eight lazy runtime factories', () => {
    const registerDialog = vi.fn();
    const registrar = { registerDialog };
    const factories = createGlobalDialogFactories();

    expect(GLOBAL_DIALOG_IDS.BUG).toBe(
      GLOBAL_DIALOG_IDS.FEEDBACK,
    );
    expect(GLOBAL_DIALOG_IDS.FEATURE).toBe(
      GLOBAL_DIALOG_IDS.FEEDBACK,
    );
    expect(GLOBAL_DIALOG_IDS.MAIL).toBe(
      GLOBAL_DIALOG_IDS.INBOX,
    );
    expect(new Set(factories.map(([id]) => id)).size).toBe(8);
    expect(Object.isFrozen(factories)).toBe(true);

    expect(registerGlobalDialogFactories(registrar)).toBe(
      registrar,
    );
    expect(registerDialog).toHaveBeenCalledTimes(8);
    expect(registerDialog.mock.calls.map(([id]) => id)).toEqual(
      factories.map(([id]) => id),
    );
  });

  it('constructs every dialog lazily once and retains its display tree', () => {
    const harness = createHarness();
    const payloads = createPayloads();

    for (const [dialogId] of createGlobalDialogFactories()) {
      expect(harness.registry.hasInstance(dialogId)).toBe(false);
    }

    for (const [dialogId] of createGlobalDialogFactories()) {
      const first = harness.registry.open(
        dialogId,
        payloads[dialogId],
      );
      const root = first.root;
      harness.registry.close(dialogId);

      expect(root).toMatchObject({
        eventMode: 'none',
        renderable: false,
        visible: false,
      });

      const second = harness.registry.open(
        dialogId,
        payloads[dialogId],
      );
      expect(second).toBe(first);
      expect(second.root).toBe(root);
      harness.registry.close(dialogId);
    }

    expect(harness.registry.getStats()).toMatchObject({
      registered: 8,
      constructed: 8,
      open: 0,
    });
    harness.dispose();
  });

  it('routes settings, feedback, player, alliance and confirmation actions', async () => {
    const harness = createHarness();
    const saveUsername = vi.fn(() => ({ ok: true }));
    const sendFeedback = vi.fn(() =>
      Promise.resolve({ ok: true }),
    );
    const openAlliance = vi.fn(() => true);
    const openPlayer = vi.fn(() => true);
    const confirm = vi.fn(() =>
      Promise.resolve({ ok: true }),
    );

    const settings = harness.registry.open(
      GLOBAL_DIALOG_IDS.SETTINGS,
      {
        account: { username: 'old' },
        actions: { saveUsername },
      },
    );
    settings.usernameField.setValue('mira', { notify: true });
    expect(settings.usernameSave.activate()).toEqual({
      ok: true,
    });
    expect(saveUsername).toHaveBeenCalledWith('mira');
    harness.registry.close(GLOBAL_DIALOG_IDS.SETTINGS);

    const feedback = harness.registry.open(
      GLOBAL_DIALOG_IDS.FEEDBACK,
      {
        kind: 'bug',
        actions: { sendFeedback },
      },
    );
    feedback.feedbackField.setValue('button is stuck', {
      notify: true,
    });
    await feedback.feedbackSend.activate();
    expect(sendFeedback).toHaveBeenCalledWith({
      kind: 'bug',
      body: 'button is stuck',
    });
    expect(feedback.feedbackStatus.text).toBe('sent');
    harness.registry.close(GLOBAL_DIALOG_IDS.FEEDBACK);

    const player = harness.registry.open(
      GLOBAL_DIALOG_IDS.PLAYER,
      {
        player: createPlayer(),
        actions: { openAlliance },
      },
    );
    expect(player.allianceButton.activate()).toBe(true);
    expect(openAlliance).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'MOSS' }),
    );
    harness.registry.close(GLOBAL_DIALOG_IDS.PLAYER);

    const alliance = harness.registry.open(
      GLOBAL_DIALOG_IDS.ALLIANCE,
      {
        alliance: createAlliance(),
        members: [createMember()],
        actions: { openPlayer },
      },
    );
    const memberWidget =
      alliance.rows.collection.get('member:mira-id');
    expect(memberWidget.activate()).toBe(true);
    expect(openPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'mira' }),
    );
    harness.registry.close(GLOBAL_DIALOG_IDS.ALLIANCE);

    const confirmation = harness.registry.open(
      GLOBAL_DIALOG_IDS.CONFIRMATION,
      {
        message: 'continue?',
        value: { id: 'one' },
        actions: { confirm },
      },
    );
    await confirmation.confirmButton.activate();
    expect(confirm).toHaveBeenCalledWith({ id: 'one' });
    expect(
      harness.registry.isOpen(
        GLOBAL_DIALOG_IDS.CONFIRMATION,
      ),
    ).toBe(false);
    harness.dispose();
  });

  it('keeps settings tabs inside the modal input boundary', () => {
    const harness = createHarness();
    const settings = harness.registry.open(
      GLOBAL_DIALOG_IDS.SETTINGS,
      {
        account: { username: 'mira' },
      },
    );
    const reportTab = settings.tabButtons.find(
      ({ key }) => key === 'report',
    ).button;
    const modal = harness.inputRouter.getTopModal();

    expect(
      harness.inputRouter.getEligibleCandidates(reportTab, 'press'),
    ).toHaveLength(1);
    expect(
      harness.inputRouter.isDisplayObjectInsideModal(
        reportTab,
        modal,
      ),
    ).toBe(true);

    harness.dispose();
  });

  it('uses the Root Run shell for dialogs and keeps announcement screens unframed', () => {
    const harness = createHarness();
    const settings = harness.registry.open(
      GLOBAL_DIALOG_IDS.SETTINGS,
      {
        account: { username: 'mira' },
      },
    );

    expect(settings.panel).toBeInstanceOf(PixiDialogFrame);
    expect(settings.panel.outerWidth).toBe(
      GLOBAL_DIALOG_GEOMETRY.maxCoreWidth,
    );
    expect(settings.panel.content.position).toMatchObject({
      x: 20,
      y: 20,
    });
    expect(settings.panel.getContentTheme()).toMatchObject({
      surface: '#ffe7c8',
      text: '#634934',
    });
    expect(settings.scroll.maxScrollY).toBe(0);
    expect(settings.scroll.progressBar.visible).toBe(false);
    expect(settings.panel.closeSprite.width).toBe(38);
    expect(settings.backdropAlpha).toBe(0.68);
    expect(
      harness.semanticRegistry.has(
        `${GLOBAL_DIALOG_IDS.SETTINGS}.close`,
      ),
    ).toBe(true);
    harness.registry.close(GLOBAL_DIALOG_IDS.SETTINGS);

    const announcement = harness.registry.open(
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      {
        kind: 'unlock',
        title: 'rewards',
        dismissible: true,
        showClose: false,
      },
    );
    expect(announcement.panel).toBeInstanceOf(PixiDialogFrame);
    expect(announcement.heading.text).toBe('rewards');
    expect(announcement.panel).toMatchObject({
      shadow: { visible: false, renderable: false },
      outerFrame: { visible: false, renderable: false },
      paperFrame: { visible: false, renderable: false },
      titleFrame: { visible: false, renderable: false },
      closeControl: { visible: false, renderable: false },
    });
    expect(announcement.heading.theme).toMatchObject({
      surface: '#202020',
      text: '#e8e8e8',
    });

    announcement.bind({
      kind: 'whileAway',
      title: 'while away',
      rows: [],
      dismissible: true,
      showClose: true,
    });
    expect(announcement.heading.text).toBe('');
    expect(announcement.panel).toMatchObject({
      shadow: { visible: true, renderable: true },
      outerFrame: { visible: true, renderable: true },
      paperFrame: { visible: true, renderable: true },
      titleFrame: { visible: true, renderable: true },
      closeControl: { visible: true, renderable: true },
    });
    expect(announcement.rows.theme).toMatchObject({
      surface: '#ffe7c8',
      text: '#634934',
    });

    harness.dispose();
  });

  it('preserves authored content boxes, padding, and external control spans', () => {
    const harness = createHarness();
    const settings = harness.registry.open(
      GLOBAL_DIALOG_IDS.SETTINGS,
      {
        account: { username: 'mira' },
      },
    );
    const settingsTabWidth =
      settings.tabButtons[0].button.buttonWidth;

    expect(settings.panel).toMatchObject({
      contentBoxWidth: 264,
      contentBoxHeight: 410,
      outerWidth: 304,
      outerHeight: 450,
    });
    expect(settings.panel.outerFrame.frameWidth).toBe(
      GLOBAL_DIALOG_GEOMETRY.maxShellWidth,
    );
    expect(settings.tabsLayer.x).toBe(18);
    expect(
      settingsTabWidth * settings.tabButtons.length +
        3 * (settings.tabButtons.length - 1),
    ).toBeCloseTo(GLOBAL_DIALOG_GEOMETRY.maxShellWidth);
    expect(
      settings.tabButtons.map(({ button }) => button.variant),
    ).toEqual(['tab', 'tab', 'tab']);
    harness.registry.close(GLOBAL_DIALOG_IDS.SETTINGS);

    const level = harness.registry.open(
      GLOBAL_DIALOG_IDS.LEVEL,
      {
        currentLevel: 2,
        maxLevel: 3,
      },
    );

    expect(level.panel).toMatchObject({
      contentBoxWidth: 264,
      contentBoxHeight: 360,
      outerWidth: 304,
      outerHeight: 400,
    });
    expect(level.pager.x).toBe(18);
    expect(
      level.previousButton.width +
        level.nextButton.width +
        3,
    ).toBeCloseTo(GLOBAL_DIALOG_GEOMETRY.maxShellWidth);
    harness.registry.close(GLOBAL_DIALOG_IDS.LEVEL);

    const inbox = harness.registry.open(
      GLOBAL_DIALOG_IDS.INBOX,
      { mail: [] },
    );

    expect(inbox.panel).toMatchObject({
      contentBoxWidth: 264,
      contentBoxHeight: 360,
      outerWidth: 304,
      outerHeight: 400,
    });
    const inboxWrapperLeft =
      (360 - GLOBAL_DIALOG_GEOMETRY.maxShellWidth) / 2;
    const inboxCoreLeft =
      inbox.panel.x - inbox.panel.pivot.x;
    expect(inboxCoreLeft - inboxWrapperLeft).toBe(10);
    expect(
      360 -
        inboxWrapperLeft -
        (inboxCoreLeft + inbox.panel.outerWidth),
    ).toBe(10);
    harness.dispose();
  });

  it('keeps every retained global dialog inside the shared five-percent side insets', () => {
    const harness = createHarness();
    const payloads = createPayloads();

    for (const [dialogId] of createGlobalDialogFactories()) {
      const dialog = harness.registry.open(dialogId, payloads[dialogId]);
      expect(dialog.panel.outerFrame.frameWidth).toBeLessThanOrEqual(
        GLOBAL_DIALOG_GEOMETRY.maxShellWidth,
      );
      harness.registry.close(dialogId);
    }

    harness.dispose();
  });

  it('contain-fits avatar art without changing the texture aspect ratio', () => {
    const characterTexture = new Texture({
      source: new TextureSource({
        resource: { width: 87, height: 108 },
        width: 87,
        height: 108,
      }),
    });
    const harness = createHarness({ characterTexture });
    const settings = harness.registry.open(
      GLOBAL_DIALOG_IDS.SETTINGS,
      {
        tabId: 'avatar',
        selections: { character: 'elara' },
        categories: [
          {
            key: 'character',
            options: [{ key: 'elara', label: 'elara' }],
          },
        ],
      },
    );
    const avatar = settings.avatars.getWidgets()[0];

    expect(avatar.sprite.height).toBe(72);
    expect(avatar.sprite.width).toBeCloseTo(58);
    expect(avatar.sprite.width / avatar.sprite.height).toBeCloseTo(
      87 / 108,
    );
    expect(avatar.sprite.x).toBeCloseTo(
      (avatar.root.hitArea.width - avatar.sprite.width) / 2,
    );

    harness.dispose();
    characterTexture.destroy();
  });

  it('reuses warmed mail and member widgets without new allocations', () => {
    const harness = createHarness();
    const inbox = harness.registry.open(
      GLOBAL_DIALOG_IDS.INBOX,
      {
        mail: [
          createMail('one'),
          createMail('two'),
          createMail('three'),
        ],
      },
    );
    const mailHighWater = inbox.getPoolStats().pool.allocated;
    inbox.bind({ mail: [createMail('one')] });
    inbox.bind({
      mail: [
        createMail('one'),
        createMail('next-two'),
        createMail('next-three'),
      ],
    });
    expect(inbox.getPoolStats().pool.allocated).toBe(
      mailHighWater,
    );
    harness.registry.close(GLOBAL_DIALOG_IDS.INBOX);

    const alliance = harness.registry.open(
      GLOBAL_DIALOG_IDS.ALLIANCE,
      {
        alliance: createAlliance(),
        members: [
          createMember('one'),
          createMember('two'),
          createMember('three'),
        ],
      },
    );
    const memberHighWater =
      alliance.getPoolStats().pool.allocated;
    alliance.bind({
      alliance: createAlliance(),
      members: [createMember('one')],
    });
    alliance.bind({
      alliance: createAlliance(),
      members: [
        createMember('one'),
        createMember('next-two'),
        createMember('next-three'),
      ],
    });
    expect(alliance.getPoolStats().pool.allocated).toBe(
      memberHighWater,
    );
    harness.dispose();
  });

  it('retains pooled feature-unlock items across single and compact layouts', () => {
    const harness = createHarness();
    const gardenUnlock = {
      id: 'unlock:garden',
      feature: 'garden',
      pageId: 'garden',
      label: 'garden',
      value: 'new room available',
      icon: {
        assetId: 'source:assets/icons/icon-garden-plot-tab.webp',
      },
    };
    const researchUnlock = {
      id: 'unlock:research',
      feature: 'research',
      pageId: 'research',
      label: 'research',
      value: 'new room available',
      icon: {
        assetId: 'source:assets/icons/icon-research-tab.webp',
      },
    };
    const announcement = harness.registry.open(
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      {
        kind: 'unlock',
        title: 'garden unlocked',
        dismissible: true,
        items: [gardenUnlock],
      },
    );
    const firstWidget =
      announcement.unlockItems.collection.getWidgets()[0];

    expect(announcement.rowsLayer).toMatchObject({
      visible: false,
      renderable: false,
    });
    expect(announcement.unlockItemsLayer).toMatchObject({
      visible: true,
      renderable: true,
    });
    expect(firstWidget.iconStage.getLocalBounds()).toMatchObject({
      width: 86,
      height: 92,
    });
    expect(announcement.unlockItems.pool.getStats()).toMatchObject({
      allocated: 1,
      highWaterMark: 1,
    });

    announcement.bind({
      kind: 'unlock',
      title: 'rooms unlocked',
      dismissible: true,
      items: [gardenUnlock, researchUnlock],
    });
    const compactWidgets =
      announcement.unlockItems.collection.getWidgets();

    expect(compactWidgets[0]).toBe(firstWidget);
    for (const widget of compactWidgets) {
      expect(widget.iconStage.getLocalBounds()).toMatchObject({
        width: 62,
        height: 64,
      });
    }
    const warmedAllocation =
      announcement.unlockItems.pool.getStats().allocated;
    expect(warmedAllocation).toBe(2);

    announcement.bind({
      kind: 'unlock',
      title: 'garden unlocked',
      dismissible: true,
      items: [gardenUnlock],
    });
    announcement.bind({
      kind: 'unlock',
      title: 'rooms unlocked',
      dismissible: true,
      items: [gardenUnlock, researchUnlock],
    });

    expect(announcement.unlockItems.pool.getStats()).toMatchObject({
      allocated: warmedAllocation,
      highWaterMark: 2,
      active: 2,
    });
    expect(
      announcement.unlockItems.collection.getWidgets()[0],
    ).toBe(firstWidget);
    harness.dispose();
  });

  it('cancels announcement motion on close and settles immediately for reduced motion', () => {
    const requestFrame = vi.fn(() => 41);
    const cancelFrame = vi.fn();
    const harness = createHarness({
      announcementMotionRuntime: {
        requestFrame,
        cancelFrame,
        now: () => 0,
        prefersReducedMotion: () => false,
      },
    });
    const announcement = harness.registry.open(
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      {
        kind: 'unlock',
        title: 'garden unlocked',
        items: [
          {
            id: 'unlock:garden',
            feature: 'garden',
            pageId: 'garden',
            label: 'garden',
            icon: {
              assetId:
                'source:assets/icons/icon-garden-plot-tab.webp',
            },
          },
        ],
      },
    );

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(announcement.announcementMotionFrame).toBe(41);
    harness.registry.close(GLOBAL_DIALOG_IDS.ANNOUNCEMENT);
    expect(cancelFrame).toHaveBeenCalledWith(41);
    expect(announcement.announcementMotionFrame).toBeNull();
    expect(announcement.panel).toMatchObject({
      alpha: 1,
      x: announcement.announcementPanelBaseX,
      y: announcement.announcementPanelBaseY,
    });
    harness.dispose();

    const reducedRequestFrame = vi.fn(() => 42);
    const reducedHarness = createHarness({
      announcementMotionRuntime: {
        requestFrame: reducedRequestFrame,
        cancelFrame: vi.fn(),
        now: () => 0,
        prefersReducedMotion: () => true,
      },
    });
    const reducedAnnouncement = reducedHarness.registry.open(
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      {
        kind: 'level',
        title: 'level 20',
        rows: [{ id: 'coin', label: 'coin', value: '+10' }],
      },
    );

    expect(reducedRequestFrame).not.toHaveBeenCalled();
    expect(reducedAnnouncement.announcementMotionFrame).toBeNull();
    expect(reducedAnnouncement.backdrop.alpha).toBe(1);
    expect(reducedAnnouncement.panel.alpha).toBe(1);
    reducedHarness.dispose();
  });

  it('wraps long level reward values inside the main two-column row contract', () => {
    const harness = createHarness();
    const announcement = harness.registry.open(
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      {
        kind: 'level',
        title: 'rewards',
        rows: [
          {
            id: 'level:20:unlocks',
            label: 'unlocked',
            value:
              'brewing / guild / prestige / leaderboard / discoveries / alliance / inbox',
            valueLines: [
              'brewing',
              'guild',
              'prestige',
              'leaderboard',
              'discoveries',
              'alliance',
              'inbox',
            ],
            mutedLabel: true,
            boldValue: true,
          },
        ],
      },
    );
    const row = announcement.rows.collection.getWidgets()[0];

    expect(row.keyLabel.wrapWidth).toBeCloseTo(101.6);
    expect(row.valueLabel.wrapWidth).toBeCloseTo(152.4);
    expect(row.valueLabel.align).toBe('right');
    expect(row.rowHeight).toBeGreaterThan(
      GLOBAL_DIALOG_GEOMETRY.rowHeight,
    );
    expect(row.valueLabel.measuredWidth).toBeLessThanOrEqual(
      row.valueLabel.wrapWidth,
    );
    harness.dispose();
  });

  it('returns modal registrations and text-entry work to baseline after close', () => {
    const harness = createHarness();
    harness.registry.open(GLOBAL_DIALOG_IDS.LEVEL, {
      currentLevel: 2,
      maxLevel: 3,
      levels: [
        {
          level: 2,
          current: true,
          addedRows: [{ label: 'mana capacity', value: '+10 mana' }],
          totalRows: [{ label: 'mana capacity', value: '30 mana' }],
        },
      ],
    });

    expect(harness.inputRouter.getTopModal()?.id).toBe(
      GLOBAL_DIALOG_IDS.LEVEL,
    );
    expect(harness.inputRouter.handleBack({ source: 'native' })).toBe(
      true,
    );
    expect(
      harness.registry.isOpen(GLOBAL_DIALOG_IDS.LEVEL),
    ).toBe(false);
    expect(harness.inputRouter.getTopModal()).toBeNull();
    harness.dispose();
  });
});

function createHarness({
  announcementMotionRuntime = null,
  characterTexture = null,
} = {}) {
  const registry = new DialogRegistry();
  const inputRouter = new PixiInputRouter();
  const semanticRegistry = new SemanticTargetRegistry();
  const assets = createPixiAssetManagerFake(Texture);
  if (characterTexture) {
    assets.getTexture = vi.fn((assetId) =>
      String(assetId).includes('/characters/')
        ? characterTexture
        : Texture.EMPTY,
    );
  }
  const context = {
    assets,
    inputRouter,
    semanticRegistry,
    counters: null,
    textEntryService: null,
    announcementMotionRuntime,
    dialogRegistry: () => registry,
    theme: () => createPixiThemeSnapshot({ theme: 'black' }),
    projection: () => ({
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
      sourceScale: 1,
      sourceOffsetX: 0,
      stageLogicalWidth: 360,
      dialogShift: 0,
    }),
  };
  for (const [dialogId, factory] of createGlobalDialogFactories()) {
    registry.register(dialogId, () => factory(context));
  }
  registry.applyTheme(context.theme());
  registry.layout(context.projection());
  return {
    registry,
    inputRouter,
    semanticRegistry,
    dispose() {
      registry.destroy();
      inputRouter.destroy();
      semanticRegistry.clear();
    },
  };
}

function createPayloads() {
  return {
    [GLOBAL_DIALOG_IDS.SETTINGS]: {
      account: { username: 'mira', version: '1.0.0' },
    },
    [GLOBAL_DIALOG_IDS.FEEDBACK]: {
      kind: 'feature',
    },
    [GLOBAL_DIALOG_IDS.LEVEL]: {
      currentLevel: 2,
      maxLevel: 3,
      levels: [
        {
          level: 2,
          current: true,
          addedRows: [{ label: 'unlocks', value: 'garden' }],
          totalRows: [{ label: 'garden plots', value: '4' }],
        },
      ],
    },
    [GLOBAL_DIALOG_IDS.INBOX]: {
      mail: [createMail('one')],
    },
    [GLOBAL_DIALOG_IDS.PLAYER]: {
      player: createPlayer(),
    },
    [GLOBAL_DIALOG_IDS.ALLIANCE]: {
      alliance: createAlliance(),
      members: [createMember()],
    },
    [GLOBAL_DIALOG_IDS.ANNOUNCEMENT]: {
      title: 'rewards',
      rows: [{ label: 'coin', value: '+10' }],
      dismissible: true,
    },
    [GLOBAL_DIALOG_IDS.CONFIRMATION]: {
      title: 'confirm',
      message: 'continue?',
    },
  };
}

function createMail(id) {
  return {
    mailKey: id,
    title: `message ${id}`,
    senderLabel: 'system',
    body: 'the road is quiet.',
    read: false,
    hasReward: true,
    rewardText: '+10 coin',
    rewardCollected: false,
  };
}

function createPlayer() {
  return {
    identity: 'mira-id',
    username: 'mira',
    character: 'mira',
    playerLevel: 4,
    prestigeCount: 2,
    totalProducedCoin: 1200,
    allianceId: 'alliance-one',
    allianceName: 'Moss Hall',
    allianceTag: 'MOSS',
  };
}

function createAlliance() {
  return {
    allianceId: 'alliance-one',
    name: 'Moss Hall',
    tag: 'MOSS',
    joinMode: 'closed',
    memberCount: 1,
    seasonIncome: 1200,
    description: 'a quiet trading hall.',
  };
}

function createMember(id = 'mira') {
  return {
    memberIdentity: `${id}-id`,
    username: id,
    playerLevel: 4,
    role: 'tradeMaster',
  };
}
