// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
  installPixiPageTestCanvas,
} from '../../pages/workshop/PixiPageTestHarness.js';
import { Texture, TextureSource } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import {
  DeviceIdentityFooter,
  PixiDialogFrame,
  RootRunSettingsTogglePixi,
  RootRunDevicePreferenceRow,
  RootRunDevicePreferencesPanel,
} from '../../primitives/index.js';
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

  it('keeps the settings panel inside the modal input boundary', () => {
    const harness = createHarness();
    const settings = harness.registry.open(
      GLOBAL_DIALOG_IDS.SETTINGS,
      {
        preferences: {
          haptics: true,
          music: true,
          sfx: true,
        },
      },
    );
    const modal = harness.inputRouter.getTopModal();

    expect(
      harness.inputRouter.isDisplayObjectInsideModal(
        settings.devicePanel,
        modal,
      ),
    ).toBe(true);
    expect(settings.tabsLayer).toBeUndefined();

    harness.dispose();
  });

  it('opens settings with one board, three device rows, and the identity footer', async () => {
    const harness = createHarness();
    const togglePreference = vi.fn(() => true);
    const copyUserId = vi.fn(() => Promise.resolve(true));
    const userId = '1234567890abcdef1234567890abcdef';
    const settings = harness.registry.open(
      GLOBAL_DIALOG_IDS.SETTINGS,
      {
        account: {
          version: '1.2.3',
          userId,
        },
        preferences: {
          haptics: true,
          music: true,
          sfx: true,
        },
        actions: { togglePreference, copyUserId },
      },
    );

    expect(settings.selectedTab).toBe('configurations');
    expect(
      settings.preferenceRows.map(({ key }) => key),
    ).toEqual(['sfx', 'music', 'haptics']);
    expect(
      settings.preferenceRows.every(
        ({ toggle }) =>
          toggle instanceof RootRunSettingsTogglePixi,
      ),
    ).toBe(true);
    expect(settings.devicePanel).toBeInstanceOf(
      RootRunDevicePreferencesPanel,
    );
    expect(
      settings.preferenceRows.every(
        ({ widget }) =>
          widget instanceof RootRunDevicePreferenceRow,
      ),
    ).toBe(true);
    expect(
      settings.preferenceRows.map(({ label }) => label.text),
    ).toEqual(['SOUND', 'MUSIC', 'VIBRATION']);
    expect(settings.preferenceRows[0].label.colorToken).toBe(
      '#735036',
    );
    expect(settings.configurationsLayer.children).toEqual([
      settings.devicePanel,
      settings.identityFooter,
    ]);
    expect(settings.identityFooter).toBeInstanceOf(
      DeviceIdentityFooter,
    );
    expect(settings.identityFooter.versionLabel.text).toBe(
      'v 1.2.3',
    );
    expect(settings.identityFooter.userIdLabel.text).toBe(
      '12345678…90abcdef',
    );
    expect(settings.identityFooter.copyButton.variant).toBe(
      'yellow',
    );
    expect(settings.scroll.maxScrollY).toBe(0);

    expect(settings.preferenceRows[0].toggle.activate()).toBe(
      true,
    );
    expect(togglePreference).toHaveBeenCalledWith('sfx', false);
    await settings.identityFooter.copyButton.activate();
    expect(copyUserId).toHaveBeenCalledWith(userId);
    expect(settings.identityFooter.copyButton.textLabel.text).toBe(
      'copied',
    );
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
    expect(settings.scroll.content.y).toBe(12);
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

  it('preserves authored content boxes and padding', () => {
    const harness = createHarness();
    const settings = harness.registry.open(
      GLOBAL_DIALOG_IDS.SETTINGS,
      {
        account: { username: 'mira' },
      },
    );
    expect(settings.panel).toMatchObject({
      contentBoxWidth: 264,
      contentBoxHeight: 264,
      outerWidth: 304,
      outerHeight: 304,
    });
    expect(settings.panel.outerFrame.frameWidth).toBe(
      GLOBAL_DIALOG_GEOMETRY.maxShellWidth,
    );
    harness.registry.close(GLOBAL_DIALOG_IDS.SETTINGS);

    const level = harness.registry.open(
      GLOBAL_DIALOG_IDS.LEVEL,
      {
        currentLevel: 2,
        maxLevel: 3,
        levels: [
          {
            level: 1,
            current: false,
            unlocked: true,
            addedRows: [
              { id: 'mana', label: 'Mana Capacity', value: '+50' },
            ],
            totalRows: [
              { id: 'total', label: 'Mana Capacity', value: '150' },
            ],
          },
        ],
      },
    );

    expect(level.panel).toMatchObject({
      contentBoxWidth: 264,
      contentBoxHeight: 320,
      outerWidth: 304,
      outerHeight: 360,
      paperFrame: {
        visible: false,
        renderable: false,
      },
    });
    expect(level.pager.parent).toBe(level.panel.content);
    expect(level.pager.x).toBe(0);
    expect(level.previousButton.variant).toBe('yellow');
    expect(level.nextButton.variant).toBe('yellow');
    expect(level.nextButton.eventMode).toBe('static');
    expect(level.addedSection.texture).toBe(
      level.panel.paperFrame.texture,
    );
    expect(level.totalSection.texture).toBe(
      level.panel.paperFrame.texture,
    );
    expect(level.addedSection.x).toBeLessThan(0);
    expect(
      level.totalSection.y -
        (level.addedSection.y + level.addedSection.frameHeight),
    ).toBeCloseTo(8);
    expect(level.addedSectionTitle.x).toBe(0);
    expect(level.totalSectionTitle.x).toBe(0);
    expect(level.selectLevel(2)).toBe(true);
    expect(level.previousButton.eventMode).toBe('static');
    expect(level.nextButton.eventMode).toBe('static');
    expect(level.previousButton.buttonWidth).toBe(96);
    expect(
      level.nextButton.x + level.nextButton.buttonWidth,
    ).toBe(
      level.panel.contentBoxWidth,
    );
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
    expect(inbox.panel.titleLabel.text).toBe('Inbox');
    expect(inbox.emptyLabel.text).toBe('No Mail');
    expect(inbox.emptyLabel.fontSize).toBe(18);
    expect(inbox.emptyLabel.x).toBe(
      inbox.panel.contentBoxWidth / 2,
    );
    expect(
      inbox.emptyLabel.y + inbox.scroll.content.y,
    ).toBe(inbox.panel.contentBoxHeight / 2);
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

  it('uses the shared green Claim button for inbox rewards', () => {
    const harness = createHarness();
    const inbox = harness.registry.open(
      GLOBAL_DIALOG_IDS.INBOX,
      {
        mail: [createMail('claimable')],
      },
    );
    const mail = inbox.mailRows.getWidgets()[0];

    expect(mail.claimButton.variant).toBe('green');
    expect(mail.claimButton.textLabel.text).toBe('Claim');

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

  it('uses a darker backdrop only for level reward announcements', () => {
    const harness = createHarness();
    const announcement = harness.registry.open(
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      {
        kind: 'level',
        title: 'rewards',
        animation: { kind: 'level-rewards' },
        rows: [{ id: 'coin', label: 'coin', value: '+10' }],
      },
    );

    expect(announcement.backdropAlpha).toBe(0.82);

    announcement.bind({
      kind: 'unlock',
      title: 'garden unlocked',
      items: [],
    });
    expect(announcement.backdropAlpha).toBe(0.68);

    harness.dispose();
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

  it('keeps while-away values inside the paper with regular ink and right-side icons', () => {
    const harness = createHarness();
    const announcement = harness.registry.open(
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      {
        kind: 'whileAway',
        title: 'While Away',
        framed: true,
        dismissible: true,
        showClose: true,
        rows: [
          {
            id: 'whileAway:auto_seed_summoned:0',
            kind: 'row',
            label: 'Seeds Summoned',
            value: '8',
            valueColor: 'text',
            mutedLabel: false,
            icon: {
              frameName: 'seed:pack',
              kind: 'seed',
            },
          },
          {
            id: 'whileAway:garden_harvested:0',
            kind: 'row',
            label: 'Herbs Harvested',
            value: '12',
            valueColor: 'text',
            mutedLabel: false,
            icon: {
              frameName: 'herb:bloodroseHerb',
              kind: 'herb',
            },
          },
          {
            id: 'whileAway:brewing_complete:0',
            kind: 'row',
            label: 'Potions Brewed',
            value: '2',
            valueColor: 'text',
            mutedLabel: false,
            icon: {
              frameName: 'potion:manaTonic',
              kind: 'potion',
            },
          },
          {
            id: 'whileAway:npc_market_sold:0',
            kind: 'row',
            label: 'Traders Bought',
            value: '40',
            valueColor: 'text',
            mutedLabel: false,
            icon: {
              frameName: 'resource:coin',
              kind: 'resource',
            },
          },
        ],
      },
    );
    const rows = announcement.rows.collection.getWidgets();
    const lastRow = rows.at(-1);
    const rowsBottom =
      announcement.rowsLayer.y + lastRow.root.y + lastRow.rowHeight;

    expect(announcement.rowsLayer.parent).toBe(
      announcement.reportScroll.content,
    );
    expect(announcement.reportScroll.width).toBe(264);
    expect(announcement.rowsLayer.y).toBe(12);
    expect(rows.every((row) => row.rowWidth === 260)).toBe(true);
    expect(rowsBottom).toBeLessThanOrEqual(
      announcement.reportScroll.contentHeight,
    );
    expect(announcement.reportScroll.scrollbarTrack.visible).toBe(false);
    expect(rows.map((row) => row.valueIconFrameName)).toEqual([
      'seed:pack',
      'herb:bloodroseHerb',
      'potion:manaTonic',
      'resource:coin',
    ]);
    rows.forEach((row) => {
      expect(row.valueIcon.visible).toBe(true);
      expect(row.keyLabel.textObject.style.fill).toBe(
        announcement.panel.getContentTheme().text,
      );
      expect(row.valueLabel.textObject.style.fill).toBe(
        announcement.panel.getContentTheme().text,
      );
    });
    harness.dispose();
  });

  it('caps an overflowing while-away report and shows the shared scrollbar', () => {
    const harness = createHarness();
    const rows = Array.from({ length: 8 }, (_, index) => ({
      id: `whileAway:garden_harvested:${index}`,
      kind: 'row',
      label: 'Herbs Harvested',
      value: `${index + 1}`,
      valueColor: 'text',
      mutedLabel: false,
      icon: {
        frameName: 'herb:bloodroseHerb',
        kind: 'herb',
      },
    }));
    const announcement = harness.registry.open(
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      {
        kind: 'whileAway',
        title: 'While Away',
        framed: true,
        dismissible: true,
        showClose: true,
        rows,
      },
    );

    expect(announcement.panel.contentBoxHeight).toBe(128);
    expect(announcement.reportScroll.width).toBe(264);
    expect(announcement.reportScroll.height).toBe(128);
    expect(announcement.reportScroll.contentHeight).toBeGreaterThan(128);
    expect(announcement.reportScroll.scrollbarTrack.visible).toBe(true);
    expect(announcement.reportScroll.scrollbarThumb.visible).toBe(true);
    expect(
      announcement.reportScroll.scrollbarTrack.getLocalBounds().x,
    ).toBeGreaterThan(264);
    expect(
      announcement.rows.collection
        .getWidgets()
        .every((row) => row.rowWidth === 260),
    ).toBe(true);

    announcement.reportScroll.scrollTo(
      announcement.reportScroll.contentHeight,
    );
    expect(announcement.reportScroll.offsetY).toBeGreaterThan(0);
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
