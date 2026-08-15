// @vitest-environment jsdom

import {
  createPixiAssetManagerFake,
  installPixiPageTestCanvas,
} from '../../pages/workshop/PixiPageTestHarness.js';
import { Texture, TextureSource } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { PixiInputRouter } from '../../input/PixiInputRouter.js';
import {
  ClickableWidget,
  DeviceIdentityFooter,
  PixiDialogFrame,
  PixiNineSliceFrame,
  PixiResourceLabel,
  PixiStarLevelLabel,
  resolveDialogPaperOutsets,
  RootRunSettingsTogglePixi,
  RootRunDevicePreferenceRow,
  RootRunDevicePreferencesPanel,
} from '../../primitives/index.js';
import {
  PlayerProfileWidget,
  PlayerSelectableProfileWidget,
} from '../chrome/PlayerProfileWidgets.js';
import {
  DialogRegistry,
  SemanticTargetRegistry,
} from '../../retained/index.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_TEXT_STROKE_COLOR,
  PIXI_UI_GEOMETRY,
  createPixiThemeSnapshot,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';
import {
  GLOBAL_DIALOG_IDS,
  createGlobalDialogFactories,
  registerGlobalDialogFactories,
} from './index.js';
import { GLOBAL_DIALOG_GEOMETRY } from './GlobalDialogKit.js';
import { RetainedScrollArea } from '../../pages/workshop/RetainedPageKit.js';
import { getPixiButtonSkin } from '../../primitives/PixiButtonStyle.js';
import { getPlayerFrameTint } from '../../../../player/playerFrames.js';

installPixiPageTestCanvas();

describe('retained global Pixi dialogs', () => {
  it('exports canonical aliases and registers eight lazy runtime factories', () => {
    const registerDialog = vi.fn();
    const registrar = { registerDialog };
    const factories = createGlobalDialogFactories();

    expect(GLOBAL_DIALOG_IDS.BUG).toBe(GLOBAL_DIALOG_IDS.FEEDBACK);
    expect(GLOBAL_DIALOG_IDS.FEATURE).toBe(GLOBAL_DIALOG_IDS.FEEDBACK);
    expect(GLOBAL_DIALOG_IDS.MAIL).toBe(GLOBAL_DIALOG_IDS.INBOX);
    expect(new Set(factories.map(([id]) => id)).size).toBe(8);
    expect(Object.isFrozen(factories)).toBe(true);

    expect(registerGlobalDialogFactories(registrar)).toBe(registrar);
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
      const first = harness.registry.open(dialogId, payloads[dialogId]);
      const root = first.root;
      harness.registry.close(dialogId);

      expect(root).toMatchObject({
        eventMode: 'none',
        renderable: false,
        visible: false,
      });

      const second = harness.registry.open(dialogId, payloads[dialogId]);
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
    const sendFeedback = vi.fn(() => Promise.resolve({ ok: true }));
    const openAlliance = vi.fn(() => true);
    const openPlayer = vi.fn(() => true);
    const confirm = vi.fn(() => Promise.resolve({ ok: true }));

    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      account: { username: 'old' },
      actions: { saveUsername },
    });
    expect(settings.usernameField.inputKind).toBe('username');
    settings.usernameField.setValue('mira', { notify: true });
    expect(settings.usernameSave.activate()).toEqual({
      ok: true,
    });
    expect(saveUsername).toHaveBeenCalledWith('mira');
    harness.registry.close(GLOBAL_DIALOG_IDS.SETTINGS);

    const feedback = harness.registry.open(GLOBAL_DIALOG_IDS.FEEDBACK, {
      kind: 'bug',
      actions: { sendFeedback },
    });
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

    const player = harness.registry.open(GLOBAL_DIALOG_IDS.PLAYER, {
      player: createPlayer(),
      actions: { openAlliance },
    });
    expect(player.allianceButton.activate()).toBe(true);
    expect(openAlliance).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'MOSS' }),
    );
    harness.registry.close(GLOBAL_DIALOG_IDS.PLAYER);

    const alliance = harness.registry.open(GLOBAL_DIALOG_IDS.ALLIANCE, {
      alliance: createAlliance(),
      members: [createMember()],
      actions: { openPlayer },
    });
    const memberWidget = alliance.rows.collection.get('member:mira-id');
    expect(memberWidget.activate()).toBe(true);
    expect(openPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'mira' }),
    );
    harness.registry.close(GLOBAL_DIALOG_IDS.ALLIANCE);

    const confirmation = harness.registry.open(GLOBAL_DIALOG_IDS.CONFIRMATION, {
      message: 'continue?',
      value: { id: 'one' },
      actions: { confirm },
    });
    await confirmation.confirmButton.activate();
    expect(confirm).toHaveBeenCalledWith({ id: 'one' });
    expect(harness.registry.isOpen(GLOBAL_DIALOG_IDS.CONFIRMATION)).toBe(false);
    harness.dispose();
  });

  it('centers confirmation copy in a taller paper above yellow actions', () => {
    const harness = createHarness();
    const confirmation = harness.registry.open(
      GLOBAL_DIALOG_IDS.CONFIRMATION,
      {
        title: 'Empty Cauldron?',
        message: 'Are you sure you want to empty the cauldron contents?',
        cancelLabel: 'Cancel',
        cancelColor: 'yellow',
        confirmLabel: 'Empty',
        confirmColor: 'yellow',
      },
    );

    expect(confirmation.contentHeight).toBe(124);
    expect(confirmation.message.align).toBe('center');
    expect(confirmation.message.textObject.anchor).toMatchObject({
      x: 0.5,
      y: 0.5,
    });
    expect(confirmation.message.x).toBe(130);
    expect(confirmation.message.y * 2).toBeCloseTo(
      confirmation.cancelButton.y - 10,
    );
    expect(confirmation.cancelButton.color).toBe('yellow');
    expect(confirmation.confirmButton.color).toBe('yellow');
    expect(confirmation.cancelButton.y).toBe(94);
    expect(confirmation.confirmButton.y).toBe(94);

    harness.dispose();
  });

  it('composes Player Info from the framed avatar and aligned lifetime stats', () => {
    const harness = createHarness();
    const player = harness.registry.open(GLOBAL_DIALOG_IDS.PLAYER, {
      player: createPlayer(),
    });

    expect(player.panel.titleLabel.text).toBe('Player Info');
    expect(player.profileWidget).toBeInstanceOf(PlayerProfileWidget);
    expect(player.profileWidget.parent).toBe(player.panel.content);
    expect(player.panel.paperFrame.visible).toBe(false);
    expect(player.summaryFrame).toBeInstanceOf(PixiNineSliceFrame);
    expect(player.summaryFrame.parent).toBe(player.panel.content);
    expect(player.statsFrame).toBeInstanceOf(PixiNineSliceFrame);
    expect(player.statsFrame.parent).toBe(player.panel.content);
    expect(
      player.statsFrame.y -
        (player.summaryFrame.y + player.summaryFrame.frameHeight),
    ).toBeCloseTo(8);
    expect(
      player.profileWidget.y - player.summaryFrame.y,
    ).toBeGreaterThanOrEqual(8);
    expect(player.profileWidget.backgroundWidget.frame.tint).toBe(
      getPlayerFrameTint('gnome'),
    );
    expect(player.profileWidget.backgroundWidget.decoration.tint).toBe(
      getPlayerFrameTint('gnome'),
    );
    expect(player.levelLabel.y - player.name.y).toBeLessThanOrEqual(18);
    expect(player.prestigeLabel.y - player.levelLabel.y).toBeLessThanOrEqual(
      18,
    );
    expect(player.allianceButton.textLabel.textObject.style.fill).toBe(
      '#397a42',
    );
    expect(player.prestigeStars).toBeInstanceOf(PixiStarLevelLabel);
    expect(player.prestigeStars.starCount).toBe(2);
    expect(player.totalCoinValue).toBeInstanceOf(PixiResourceLabel);
    expect(player.totalCoinValue.amount).toBe('1200');
    expect(player.totalCoinValue.icon.visible).toBe(true);
    expect(player.totalPotionsValue.text).toBe('86');
    expect(player.totalHerbsValue.text).toBe('240');
    expect(player.totalCoinLabel.text).toBe('Total Produced Coin');
    expect(player.totalPotionsLabel.text).toBe('Total Brewed Potions');
    expect(player.totalHerbsLabel.text).toBe('Total Harvested Herbs');
    expect(
      player.totalCoinValue.x + player.totalCoinValue.measuredWidth,
    ).toBeCloseTo(250);
    expect(player.totalPotionsValue.x).toBe(250);
    expect(player.totalHerbsValue.x).toBe(250);

    harness.dispose();
  });

  it('keeps the settings panel inside the modal input boundary', () => {
    const harness = createHarness();
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      preferences: {
        haptics: true,
        music: true,
        sfx: true,
        theme: false,
      },
    });
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

  it('uses fitted base-button geometry for the feedback kind selectors', () => {
    const harness = createHarness();
    const feedback = harness.registry.open(GLOBAL_DIALOG_IDS.FEEDBACK, {
      kind: 'feedback',
    });
    for (const { button } of feedback.feedbackKindButtons) {
      const baseSkin = getPixiButtonSkin({
        color: 'brown-dark',
        height: button.buttonHeight,
        sizeTier: 50,
        width: button.buttonWidth,
      });
      expect(button.variant).toBe('tab');
      expect(button.activeSkin.borderInsets).toEqual(baseSkin.borderInsets);
    }

    harness.dispose();
  });

  it('does not dismiss settings when the backdrop receives a release inside the visible shell', () => {
    const harness = createHarness();
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      tabId: 'account',
      account: { username: 'mira' },
    });
    const modal = harness.inputRouter.getTopModal();
    const shellLocalPoint = {
      x:
        settings.panel.coreWidth +
        PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset / 2,
      y:
        settings.panel.titleFrame.y + settings.panel.titleFrame.frameHeight / 2,
    };
    const shellPoint = settings.panel.toGlobal(shellLocalPoint);

    expect(settings.panel.eventMode).toBe('static');
    expect(
      settings.panel.hitArea.contains(shellLocalPoint.x, shellLocalPoint.y),
    ).toBe(true);
    expect(modal?.onOutsidePress?.({ point: shellPoint })).toBe(false);
    expect(harness.registry.isOpen(GLOBAL_DIALOG_IDS.SETTINGS)).toBe(true);

    const backdropPoint = settings.panel.toGlobal({ x: -40, y: -40 });
    expect(modal?.onOutsidePress?.({ point: backdropPoint })).toBe(true);
    expect(harness.registry.isOpen(GLOBAL_DIALOG_IDS.SETTINGS)).toBe(false);

    harness.dispose();
  });

  it('opens settings with device preferences, Google account connection, and identity details', async () => {
    const harness = createHarness();
    const togglePreference = vi.fn(() => true);
    const connectAccount = vi.fn(() => Promise.resolve({ ok: true }));
    const copyUserId = vi.fn(() => Promise.resolve(true));
    const userId = '1234567890abcdef1234567890abcdef';
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      account: {
        accountStatus: 'not connected',
        connectLabel: 'connect account',
        connectEnabled: true,
        version: '1.2.3',
        userId,
      },
      preferences: {
        haptics: true,
        music: true,
        sfx: true,
      },
      actions: {
        togglePreference,
        connectAccount,
        copyUserId,
      },
    });

    expect(settings.selectedTab).toBe('configurations');
    expect(settings.panel.titleLabel.text).toBe('Settings');
    expect(settings.preferenceRows.map(({ key }) => key)).toEqual([
      'sfx',
      'music',
      'haptics',
      'theme',
    ]);
    expect(
      settings.preferenceRows.every(
        ({ toggle }) => toggle instanceof RootRunSettingsTogglePixi,
      ),
    ).toBe(true);
    expect(settings.devicePanel).toBeInstanceOf(RootRunDevicePreferencesPanel);
    expect(settings.themePanel).toBeInstanceOf(RootRunDevicePreferencesPanel);
    expect(settings.devicePanel.rows).toEqual(
      settings.preferenceRows.slice(0, 3).map(({ widget }) => widget),
    );
    expect(settings.themePanel.rows).toEqual([
      settings.preferenceRows[3].widget,
    ]);
    expect(
      settings.preferenceRows.every(
        ({ widget }) => widget instanceof RootRunDevicePreferenceRow,
      ),
    ).toBe(true);
    expect(settings.preferenceRows.map(({ label }) => label.text)).toEqual([
      'SOUND',
      'MUSIC',
      'VIBRATION',
      'THEME',
    ]);
    expect(settings.preferenceRows[0].label.colorToken).toBe('#735036');
    expect(settings.configurationsLayer.children).toEqual([
      settings.devicePanel,
      settings.themePanel,
      settings.accountConnectionPanel,
      settings.accountConnectionLabel,
      settings.accountStatus,
      settings.accountConnectButton,
      settings.identityFooter,
    ]);
    expect(settings.accountConnectionPanel).toBeInstanceOf(PixiNineSliceFrame);
    expect(settings.accountConnectionPanel).toMatchObject({
      frameWidth: 264,
      frameHeight: 92,
    });
    expect(settings.accountConnectionLabel.text).toBe('GOOGLE ACCOUNT');
    expect(settings.accountStatus.text).toBe('not connected');
    expect(settings.accountConnectButton.variant).toBe('yellow');
    expect(settings.accountConnectButton.textLabel.text).toBe(
      'connect account',
    );
    expect(settings.accountConnectButton.enabled).toBe(true);
    expect(settings.identityFooter).toBeInstanceOf(DeviceIdentityFooter);
    expect(settings.identityFooter.versionLabel.text).toBe('v 1.2.3');
    expect(settings.identityFooter.userIdLabel.text).toBe('12345678…90abcdef');
    expect(settings.identityFooter.copyButton.variant).toBe('yellow');
    expect(settings.scroll.maxScrollY).toBe(0);
    expect(
      settings.themePanel.y -
        (settings.devicePanel.y + settings.devicePanel.panelHeight),
    ).toBe(8);
    expect(
      settings.accountConnectionPanel.y -
        (settings.themePanel.y + settings.themePanel.panelHeight),
    ).toBe(8);

    expect(settings.preferenceRows[0].toggle.activate()).toBe(true);
    expect(togglePreference).toHaveBeenCalledWith('sfx', false);
    expect(settings.preferenceRows[3].toggle.activate()).toBe(true);
    expect(togglePreference).toHaveBeenCalledWith('theme', true);
    await settings.accountConnectButton.activate();
    expect(connectAccount).toHaveBeenCalledTimes(1);
    await settings.identityFooter.copyButton.activate();
    expect(copyUserId).toHaveBeenCalledWith(userId);
    expect(settings.identityFooter.copyButton.textLabel.text).toBe('copied');
    harness.dispose();
  });

  it('uses the Root Run shell for dialogs and keeps announcement screens unframed', () => {
    const harness = createHarness();
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      account: { username: 'mira' },
    });

    expect(settings.panel).toBeInstanceOf(PixiDialogFrame);
    expect(settings.panel.outerWidth).toBe(GLOBAL_DIALOG_GEOMETRY.maxCoreWidth);
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
      harness.semanticRegistry.has(`${GLOBAL_DIALOG_IDS.SETTINGS}.close`),
    ).toBe(true);
    harness.registry.close(GLOBAL_DIALOG_IDS.SETTINGS);

    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
      kind: 'unlock',
      title: 'rewards',
      dismissible: true,
      showClose: false,
    });
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
      surface: '#17191f',
      text: '#d4d4d4',
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
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      account: { username: 'mira' },
    });
    expect(settings.panel).toMatchObject({
      contentBoxWidth: 264,
      contentBoxHeight: 442,
      outerWidth: 304,
      outerHeight: 482,
    });
    expect(settings.panel.outerFrame.frameWidth).toBe(
      GLOBAL_DIALOG_GEOMETRY.maxShellWidth,
    );
    harness.registry.close(GLOBAL_DIALOG_IDS.SETTINGS);

    const level = harness.registry.open(GLOBAL_DIALOG_IDS.LEVEL, {
      currentLevel: 2,
      maxLevel: 3,
      levels: [
        {
          level: 1,
          current: false,
          unlocked: true,
          addedRows: [{ id: 'mana', label: 'Mana Capacity', value: '+50' }],
          totalRows: [{ id: 'total', label: 'Mana Capacity', value: '150' }],
        },
      ],
    });

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
    expect(level.addedSection.texture).toBe(level.panel.paperFrame.texture);
    expect(level.totalSection.texture).toBe(level.panel.paperFrame.texture);
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
    expect(level.previousButton.textLabel.text).toBe('Level 1');
    expect(level.nextButton.textLabel.text).toBe('Level 3');
    expect(level.previousIcon).toMatchObject({
      label: 'global.level:previousIcon',
      width: 22,
      height: 22,
    });
    expect(level.nextIcon).toMatchObject({
      label: 'global.level:nextIcon',
      width: 22,
      height: 22,
    });
    expect(level.previousButton.buttonWidth).toBe(96);
    expect(level.nextButton.x + level.nextButton.buttonWidth).toBe(
      level.panel.contentBoxWidth,
    );
    level.bind({
      currentLevel: 20,
      maxLevel: 21,
      selectedLevel: 20,
      levels: [
        {
          level: 20,
          current: true,
          unlocked: true,
          addedRows: [{ id: 'mana', label: 'Mana Capacity', value: '+50' }],
          totalRows: [{ id: 'total', label: 'Mana Capacity', value: '1000' }],
        },
      ],
    });
    expect(level.previousButton.textLabel.text).toBe('Level 19');
    expect(level.nextButton.textLabel.text).toBe('Level 21');
    expect(
      level.previousButton.textLabel.x +
        level.previousButton.textLabel.measuredWidth / 2,
    ).toBeLessThanOrEqual(level.previousButton.buttonWidth);
    expect(level.nextIcon.x + level.nextIcon.width / 2).toBeLessThanOrEqual(
      level.nextButton.buttonWidth,
    );
    harness.registry.close(GLOBAL_DIALOG_IDS.LEVEL);

    const inbox = harness.registry.open(GLOBAL_DIALOG_IDS.INBOX, { mail: [] });

    expect(inbox.panel).toMatchObject({
      contentBoxWidth: 264,
      contentBoxHeight: 360,
      outerWidth: 304,
      outerHeight: 400,
    });
    const inboxWrapperLeft =
      (GLOBAL_DIALOG_GEOMETRY.sourceWidth -
        GLOBAL_DIALOG_GEOMETRY.maxShellWidth) /
      2;
    const inboxCoreLeft = inbox.panel.x - inbox.panel.pivot.x;
    expect(inboxCoreLeft - inboxWrapperLeft).toBe(10);
    expect(
      GLOBAL_DIALOG_GEOMETRY.sourceWidth -
        inboxWrapperLeft -
        (inboxCoreLeft + inbox.panel.outerWidth),
    ).toBe(10);
    expect(inbox.panel.titleLabel.text).toBe('Inbox');
    expect(inbox.emptyLabel.text).toBe('No Mail');
    expect(inbox.emptyLabel.fontSize).toBe(20);
    expect(inbox.emptyLabel.x).toBe(inbox.panel.contentBoxWidth / 2);
    expect(inbox.emptyLabel.y + inbox.scroll.content.y).toBe(
      inbox.panel.contentBoxHeight / 2,
    );
    harness.dispose();
  });

  it('pins the Current badge to the top-right of the first level paper board', () => {
    const harness = createHarness();
    const level = harness.registry.open(GLOBAL_DIALOG_IDS.LEVEL, {
      currentLevel: 2,
      maxLevel: 3,
      selectedLevel: 2,
      levels: [
        {
          level: 2,
          current: true,
          unlocked: true,
          addedRows: [{ id: 'mana', label: 'Mana Capacity', value: '+50' }],
          totalRows: [{ id: 'total', label: 'Mana Capacity', value: '150' }],
        },
      ],
    });

    expect(level.currentBacking.parent).toBe(level.panel.content);
    expect(level.currentBacking).toMatchObject({
      visible: true,
      renderable: true,
    });
    expect(level.currentLabel.text).toBe('Current');
    expect(level.currentLabel.textObject.style.fill).toBe('#ffffff');
    expect(level.currentLabel.textObject.style.stroke).toMatchObject({
      color: PIXI_TEXT_STROKE_COLOR,
      width: resolvePixiTextStrokeWidth(level.currentLabel.fontSize),
      join: 'round',
    });
    expect(level.currentLabelBacking).toMatchObject({
      height: 27,
      y: 0,
    });
    expect(level.currentBacking.y).toBe(level.addedSection.y + 1);
    expect(level.currentBacking.x + level.currentLabelBacking.width / 2).toBe(
      level.addedSection.x + level.addedSection.frameWidth - 14,
    );
    expect(level.currentBacking.x).toBeGreaterThan(
      level.addedSectionTitle.x + level.addedSectionTitle.measuredWidth,
    );

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
    const inbox = harness.registry.open(GLOBAL_DIALOG_IDS.INBOX, {
      mail: [createMail('claimable')],
    });
    const mail = inbox.mailRows.getWidgets()[0];

    expect(mail.claimButton.variant).toBe('green');
    expect(mail.claimButton.sizeTier).toBe(50);
    expect(mail.claimButton.textLabel.text).toBe('Claim');
    expect(mail.frame.assetId).toBe(
      'source:assets/ui/inner-section-panel-white.9.png',
    );

    harness.dispose();
  });

  it('shows claimed state immediately after a successful inbox claim', async () => {
    const harness = createHarness();
    const claimReward = vi.fn(() => Promise.resolve({ ok: true }));
    const inbox = harness.registry.open(GLOBAL_DIALOG_IDS.INBOX, {
      actions: { claimReward },
      mail: [createMail('claimable')],
    });
    const mail = inbox.mailRows.getWidgets()[0];

    await mail.claimButton.activate();

    expect(claimReward).toHaveBeenCalledWith(
      'claimable',
      expect.objectContaining({ mailKey: 'claimable' }),
    );
    expect(mail.claimButton.visible).toBe(false);
    expect(mail.claimedLabel.text).toBe('Claimed');
    expect(mail.claimedLabel.visible).toBe(true);

    harness.dispose();
  });

  it('uses the normalized square avatar cut without distortion', () => {
    const characterTexture = new Texture({
      source: new TextureSource({
        resource: { width: 87, height: 108 },
        width: 87,
        height: 108,
      }),
    });
    const harness = createHarness({ characterTexture });
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      tabId: 'avatar',
      selections: { character: 'elara' },
      categories: [
        {
          key: 'character',
          options: [{ key: 'elara', label: 'elara' }],
        },
      ],
    });
    const avatar = settings.avatars.getWidgets()[0];

    const portrait = avatar.profileWidget.avatarWidget.portrait;
    expect(portrait.width / portrait.height).toBe(1);
    expect(portrait.x).toBeCloseTo((186 - portrait.width) / 2);

    harness.dispose();
    characterTexture.destroy();
  });

  it('reuses warmed mail and member widgets without new allocations', () => {
    const harness = createHarness();
    const inbox = harness.registry.open(GLOBAL_DIALOG_IDS.INBOX, {
      mail: [createMail('one'), createMail('two'), createMail('three')],
    });
    const mailHighWater = inbox.getPoolStats().pool.allocated;
    inbox.bind({ mail: [createMail('one')] });
    inbox.bind({
      mail: [
        createMail('one'),
        createMail('next-two'),
        createMail('next-three'),
      ],
    });
    expect(inbox.getPoolStats().pool.allocated).toBe(mailHighWater);
    harness.registry.close(GLOBAL_DIALOG_IDS.INBOX);

    const alliance = harness.registry.open(GLOBAL_DIALOG_IDS.ALLIANCE, {
      alliance: createAlliance(),
      members: [
        createMember('one'),
        createMember('two'),
        createMember('three'),
      ],
    });
    const memberHighWater = alliance.getPoolStats().pool.allocated;
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
    expect(alliance.getPoolStats().pool.allocated).toBe(memberHighWater);
    harness.dispose();
  });

  it('keeps the equipped checkmark fixed while the account draft selection moves', () => {
    const saveAccount = vi.fn(() => ({ ok: true }));
    const harness = createHarness();
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      tabId: 'account',
      account: { username: 'wizard' },
      selections: { character: 'elara', frame: 'classic' },
      researched: {
        character: { elara: true, mira: true, bramble: false },
        frame: { classic: true, emerald: true },
      },
      categories: [
        {
          key: 'character',
          options: [
            { key: 'elara', label: 'elara' },
            { key: 'mira', label: 'mira' },
            { key: 'bramble', label: 'bramble' },
          ],
        },
        {
          key: 'frame',
          options: [
            { key: 'classic', label: 'classic', tint: 0xffffff },
            { key: 'emerald', label: 'emerald', tint: 0x2ed46f },
          ],
        },
      ],
      actions: { saveAccount },
    });

    settings.selectAccountOption(settings.settingsModel.avatars[1]);
    const [equipped, draft, locked] = settings.avatars.getWidgets();

    expect(equipped.selectionFrame.visible).toBe(false);
    expect(equipped.status.visible).toBe(true);
    expect(equipped.status.y).toBe(equipped.root.hitArea.height - 17);
    expect(draft.selectionFrame.visible).toBe(true);
    expect(draft.status.visible).toBe(false);
    expect(locked.lockOverlay.visible).toBe(true);
    expect(locked.status.visible).toBe(true);
    expect(locked.status.y).toBe(1);
    expect(
      settings.selectAccountOption(settings.settingsModel.avatars[2]),
    ).toBe(false);
    expect(settings.accountDraft.character).toBe('mira');

    settings.accountSave.activate();
    expect(saveAccount).toHaveBeenCalledWith({
      username: 'wizard',
      character: 'mira',
      frame: 'classic',
    });

    harness.dispose();
  });

  it('uses the shared profile hierarchy for the account preview and selectable choices', () => {
    const harness = createHarness();
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      tabId: 'account',
      account: { username: 'wizard' },
      selections: { character: 'elara', frame: 'classic' },
      researched: {
        character: { elara: true, mira: true },
        frame: { classic: true, emerald: true },
      },
      categories: [
        {
          key: 'character',
          options: [
            { key: 'elara', label: 'elara' },
            { key: 'mira', label: 'mira' },
          ],
        },
        {
          key: 'frame',
          options: [
            { key: 'classic', label: 'classic', tint: 0xffffff },
            { key: 'emerald', label: 'emerald', tint: 0x2ed46f },
          ],
        },
      ],
    });

    expect(settings.accountPreviewProfile).toBeInstanceOf(PlayerProfileWidget);
    expect(settings.avatars.getWidgets()[0]).toBeInstanceOf(
      PlayerSelectableProfileWidget,
    );
    expect(settings.avatars.getWidgets()[0].profileWidget).toBeInstanceOf(
      PlayerProfileWidget,
    );

    settings.selectAccountOption(settings.settingsModel.frames[1]);
    const emeraldTint = getPlayerFrameTint('emerald');

    expect(settings.accountPreviewProfile.backgroundWidget.frame.tint).toBe(
      emeraldTint,
    );
    expect(
      settings.accountPreviewProfile.backgroundWidget.decoration.tint,
    ).toBe(emeraldTint);
    for (const choice of settings.avatars.getWidgets()) {
      expect(choice.profileWidget.backgroundWidget.frame.tint).toBe(
        emeraldTint,
      );
      expect(choice.profileWidget.backgroundWidget.decoration.tint).toBe(
        emeraldTint,
      );
    }

    harness.dispose();
  });

  it('gives enabled avatar choices shared press feedback while selected and locked choices stay silent', () => {
    const harness = createHarness();
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      tabId: 'account',
      account: { username: 'wizard' },
      selections: { character: 'elara', frame: 'classic' },
      researched: {
        character: { elara: true, mira: true, bramble: false },
        frame: { classic: true, emerald: true },
      },
      categories: [
        {
          key: 'character',
          options: [
            { key: 'elara', label: 'elara' },
            { key: 'mira', label: 'mira' },
            { key: 'bramble', label: 'bramble' },
          ],
        },
        {
          key: 'frame',
          options: [
            { key: 'classic', label: 'classic', tint: 0xffffff },
            { key: 'emerald', label: 'emerald', tint: 0x2ed46f },
          ],
        },
      ],
    });
    const [selected, available, locked] = settings.avatars.getWidgets();

    expect(available).toBeInstanceOf(ClickableWidget);
    const selectedPress = harness.inputRouter.store.get(
      selected.registration.id,
    );
    const availablePress = harness.inputRouter.store.get(
      available.registration.id,
    );
    const lockedPress = harness.inputRouter.store.get(locked.registration.id);

    expect(selectedPress.enabled()).toBe(false);
    expect(lockedPress.enabled()).toBe(false);
    expect(availablePress.enabled()).toBe(true);
    expect(availablePress.haptic).toBe('light');

    availablePress.onPressChange(true, { confirmed: false });
    expect(available.visual.scale.x).toBe(0.97);
    expect(available.visual.scale.y).toBe(0.97);
    availablePress.onPressChange(false, { confirmed: false });
    expect(available.visual.scale.x).toBe(1);
    expect(available.visual.scale.y).toBe(1);
    expect(availablePress.onActivate()).toBe(true);
    expect(settings.accountDraft.character).toBe('mira');

    settings.selectAccountChoiceTab('frame');
    const [selectedFrame, availableFrame] = settings.frames.getWidgets();
    const selectedFramePress = harness.inputRouter.store.get(
      selectedFrame.registration.id,
    );
    const availableFramePress = harness.inputRouter.store.get(
      availableFrame.registration.id,
    );

    expect(selectedFramePress.enabled()).toBe(false);
    expect(availableFramePress.enabled()).toBe(true);
    expect(availableFramePress.haptic).toBe('light');
    availableFramePress.onPressChange(true, { confirmed: false });
    expect(availableFrame.visual.scale.x).toBe(0.97);
    availableFramePress.onPressChange(false, { confirmed: false });
    expect(availableFramePress.onActivate()).toBe(true);
    expect(settings.accountDraft.frame).toBe('emerald');

    harness.dispose();
  });

  it('places fixed tabs on the paper below the choice board and keeps a wide save control close to the dialog bottom', () => {
    const harness = createHarness();
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      tabId: 'account',
      account: { username: 'wizard' },
      selections: { character: 'elara', frame: 'classic' },
      researched: {
        character: { elara: true },
        frame: { classic: true },
      },
      categories: [
        {
          key: 'character',
          options: [{ key: 'elara', label: 'elara' }],
        },
        {
          key: 'frame',
          options: [{ key: 'classic', label: 'classic', tint: 0xffffff }],
        },
      ],
    });

    expect(settings.panel.titleLabel.text).toBe('Wizard');
    expect(settings.usernameBacking.texture).toBe(
      harness.assets.getTexture(PIXI_ROOT_RUN_ASSETS.accountUsername),
    );
    expect(PIXI_ROOT_RUN_ASSETS.accountUsername).toBe(
      'source:assets/ui/white-squircle/white-squircle-40.9.png',
    );
    expect(settings.usernameBacking.tint).toBe(0x000000);
    expect(settings.usernameBacking.alpha).toBe(0.4);
    expect(
      settings.usernameBacking.frameWidth /
        settings.usernameBacking.frameHeight,
    ).toBeCloseTo((650 * (298 / 925)) / (88 / 3));
    expect(settings.usernameField.textLabel.colorToken).toBe('#ffffff');
    expect(settings.usernameField.textLabel.fontSize).toBeCloseTo(64 / 3);
    expect(settings.usernameField.textLabel.stroke).toEqual({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(
        settings.usernameField.textLabel.fontSize,
      ),
      join: 'round',
    });
    const usernameMaskBounds = settings.usernameField.textMask.getLocalBounds();
    const usernameRenderedHeight =
      settings.usernameField.textLabel.fontSize +
      settings.usernameField.textLabel.stroke.width * 2;
    expect(
      usernameMaskBounds.y + usernameMaskBounds.height,
    ).toBeGreaterThanOrEqual(
      settings.usernameField.textLabel.y + usernameRenderedHeight,
    );
    expect(settings.usernameEdit.width).toBeCloseTo(64 / 3);
    expect(settings.usernameEdit.height).toBeCloseTo(64 / 3);
    expect(
      settings.usernameEdit.y + settings.usernameEdit.height / 2,
    ).toBeCloseTo(
      settings.usernameBacking.y + settings.usernameBacking.frameHeight / 2,
    );

    expect(settings.accountHeader.frameWidth).toBeCloseTo(298);
    expect(settings.panel.paperFrame.visible).toBe(false);
    expect(settings.accountHeaderSection.visible).toBe(true);
    expect(settings.accountChoiceSection.visible).toBe(true);
    expect(settings.accountHeaderSection.texture).toBe(
      settings.panel.paperFrame.texture,
    );
    expect(settings.accountChoiceSection.texture).toBe(
      settings.panel.paperFrame.texture,
    );
    expect(
      settings.accountChoiceSection.y -
        (settings.accountHeaderSection.y +
          settings.accountHeaderSection.frameHeight),
    ).toBeCloseTo(8);

    expect(settings.avatarTabButton.buttonWidth).toBeCloseTo(141.5);
    expect(settings.avatarTabButton.buttonHeight).toBe(28);
    expect(settings.avatarTabButton.textLabel.fontSize).toBe(13);
    expect(settings.avatarTabButton.variant).toBe('tab');
    expect(settings.avatarTabButton.resolveRootRunVariant()).toBe('brown');
    expect(settings.frameTabButton.resolveRootRunVariant()).toBe('brown-dark');

    expect(settings.accountSave.buttonWidth).toBeCloseTo(456 * (298 / 925));
    expect(settings.accountSave.buttonHeight).toBe(52);
    expect(settings.accountSave.textLabel.fontSize).toBe(16);
    expect(settings.accountSave.textLabel.stroke).toEqual({
      color: '#0a0a0a',
      width: resolvePixiTextStrokeWidth(16),
      join: 'round',
    });
    expect(settings.accountSave.textLabel.y).toBe(
      settings.accountSave.buttonHeight / 2
        + settings.accountSave.activeSkin.contentOffsetY,
    );
    expect(settings.accountSave.variant).toBe('green');
    expect(settings.accountSave.resolveRootRunVariant()).toBe('green');

    const choiceBoardBottom =
      settings.accountChoiceBoard.y + settings.accountChoiceBoard.frameHeight;
    const choiceViewportBottom =
      settings.accountChoiceScroll.root.y + settings.accountChoiceScroll.height;
    const tabsTop = settings.avatarTab.root.y;
    const tabsBottom = settings.avatarTab.root.y + settings.avatarTab.height;
    const choiceSectionBottom =
      settings.accountChoiceSection.y +
      settings.accountChoiceSection.frameHeight;
    const paperOutsets = resolveDialogPaperOutsets(
      settings.panel.contentInsets,
    );
    const choiceContentBottom = choiceSectionBottom - paperOutsets.bottom;
    const saveBottom =
      settings.accountSave.y + settings.accountSave.buttonHeight;

    expect(tabsTop).toBeGreaterThan(choiceViewportBottom);
    expect(tabsTop - choiceBoardBottom).toBeCloseTo(
      choiceContentBottom - tabsBottom,
    );
    expect(tabsBottom).toBeLessThan(choiceSectionBottom);
    expect(settings.accountSave.y - choiceSectionBottom).toBe(8);
    expect(settings.contentHeight - saveBottom).toBe(8);

    harness.dispose();
  });

  it('uses the shared right-edge vertical scrollbar without covering account choices', () => {
    const harness = createHarness();
    const avatarOptions = Array.from({ length: 16 }, (_, index) => ({
      key: `avatar-${index}`,
      label: `avatar ${index}`,
    }));
    const frameOptions = Array.from({ length: 16 }, (_, index) => ({
      key: `frame-${index}`,
      label: `frame ${index}`,
      tint: 0xffffff,
    }));
    const settings = harness.registry.open(GLOBAL_DIALOG_IDS.SETTINGS, {
      tabId: 'account',
      account: { username: 'wizard' },
      selections: {
        character: avatarOptions[0].key,
        frame: frameOptions[0].key,
      },
      researched: {
        character: Object.fromEntries(
          avatarOptions.map(({ key }) => [key, true]),
        ),
        frame: Object.fromEntries(frameOptions.map(({ key }) => [key, true])),
      },
      categories: [
        {
          key: 'character',
          options: avatarOptions,
        },
        {
          key: 'frame',
          options: frameOptions,
        },
      ],
    });

    const avatarWidgets = settings.avatars.getWidgets();
    const firstTile = avatarWidgets[0];
    const lastColumnTile = avatarWidgets[3];
    const lastTile = avatarWidgets.at(-1);
    const selectionLeft = firstTile.root.x + firstTile.selectionFrame.x;
    const selectionTop = firstTile.root.y + firstTile.selectionFrame.y;
    const selectionRight =
      settings.accountChoiceScroll.root.x +
      lastColumnTile.root.x +
      lastColumnTile.selectionFrame.x +
      lastColumnTile.selectionFrame.width;
    const selectionBottom =
      lastTile.root.y +
      lastTile.selectionFrame.y +
      lastTile.selectionFrame.height;
    const scrollbarLeft =
      settings.accountChoiceScroll.root.x +
      settings.accountChoiceScroll.scrollbarTrack.getLocalBounds().x;
    const scrollbarRight =
      scrollbarLeft +
      settings.accountChoiceScroll.scrollbarTrack.getLocalBounds().width;

    expect(settings.accountChoiceScroll).toBeInstanceOf(RetainedScrollArea);
    expect(settings.accountLayer.parent).toBe(settings.panel.content);
    expect(settings.scroll.visible).toBe(false);
    expect(settings.scroll.renderable).toBe(false);
    expect(settings.scroll.eventMode).toBe('none');
    expect(settings.scroll.progressBar.visible).toBe(false);
    expect(settings.accountChoiceScroll.scrollbarTrack.visible).toBe(true);
    expect(selectionLeft).toBeCloseTo(0);
    expect(selectionTop).toBeCloseTo(0);
    expect(selectionRight - settings.accountChoiceScroll.root.x).toBeCloseTo(
      settings.accountChoiceScroll.width,
    );
    expect(selectionBottom).toBeCloseTo(
      settings.accountChoiceScroll.contentHeight,
    );
    expect(
      selectionBottom -
        (settings.accountChoiceScroll.contentHeight -
          settings.accountChoiceScroll.height),
    ).toBeCloseTo(settings.accountChoiceScroll.height);
    expect(scrollbarLeft).toBeGreaterThan(selectionRight);
    expect(scrollbarRight).toBeLessThanOrEqual(
      settings.accountChoiceBoard.frameWidth,
    );
    expect(settings.accountChoiceScroll).not.toHaveProperty('fadeGraphic');
    expect(settings.accountChoiceScroll).not.toHaveProperty('progressBar');
    const fourthRowTop = avatarWidgets[12].root.y;
    expect(
      (settings.accountChoiceScroll.height - fourthRowTop) /
        firstTile.root.hitArea.height,
    ).toBeCloseTo(0.3);

    const avatarBounds = avatarWidgets.map((widget) => ({
      x: widget.root.x,
      y: widget.root.y,
      width: widget.root.hitArea.width,
      height: widget.root.hitArea.height,
    }));
    settings.frameTab.control.activate();
    expect(settings.accountChoiceTab).toBe('frame');
    expect(settings.accountChoiceScroll.scrollbarTrack.visible).toBe(true);
    expect(
      settings.frames.getWidgets().map((widget) => ({
        x: widget.root.x,
        y: widget.root.y,
        width: widget.root.hitArea.width,
        height: widget.root.hitArea.height,
      })),
    ).toEqual(avatarBounds);

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
        assetId: 'source:assets/icons/icon-garden-plot-tab.png',
      },
    };
    const researchUnlock = {
      id: 'unlock:research',
      feature: 'research',
      pageId: 'research',
      label: 'research',
      value: 'new room available',
      icon: {
        assetId: 'source:assets/icons/icon-research-tab.png',
      },
    };
    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
      kind: 'unlock',
      title: 'garden unlocked',
      dismissible: true,
      items: [gardenUnlock],
    });
    const firstWidget = announcement.unlockItems.collection.getWidgets()[0];

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
    const compactWidgets = announcement.unlockItems.collection.getWidgets();

    expect(compactWidgets[0]).toBe(firstWidget);
    for (const widget of compactWidgets) {
      expect(widget.iconStage.getLocalBounds()).toMatchObject({
        width: 62,
        height: 64,
      });
    }
    const warmedAllocation = announcement.unlockItems.pool.getStats().allocated;
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
    expect(announcement.unlockItems.collection.getWidgets()[0]).toBe(
      firstWidget,
    );
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
    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
      kind: 'unlock',
      title: 'garden unlocked',
      items: [
        {
          id: 'unlock:garden',
          feature: 'garden',
          pageId: 'garden',
          label: 'garden',
          icon: {
            assetId: 'source:assets/icons/icon-garden-plot-tab.png',
          },
        },
      ],
    });

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
        title: 'Level Up!',
        dismissible: true,
        continueLabel: 'Tap to continue',
        animation: { kind: 'level-rewards' },
        rows: [
          {
            id: 'coin',
            label: 'coin',
            value: '+10',
            countUp: { from: 10, to: 20 },
          },
        ],
      },
    );

    expect(reducedRequestFrame).not.toHaveBeenCalled();
    expect(reducedAnnouncement.announcementMotionFrame).toBeNull();
    expect(reducedAnnouncement.backdrop.alpha).toBe(1);
    expect(reducedAnnouncement.panel.alpha).toBe(1);
    expect(reducedAnnouncement.continuePrompt.alpha).toBe(1);
    expect(
      reducedAnnouncement.rows.collection.getWidgets()[0].valueLabel.text,
    ).toBe('20');
    expect(reducedAnnouncement.levelAdvanceReady).toBe(true);
    reducedHarness.dispose();
  });

  it('captures fresh level-up motion origins when the retained announcement is rebound', () => {
    const harness = createHarness({
      announcementMotionRuntime: {
        requestFrame: vi.fn(() => 41),
        cancelFrame: vi.fn(),
        now: () => 0,
        prefersReducedMotion: () => false,
      },
    });
    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
      kind: 'unlock',
      title: 'garden unlocked',
      items: [],
    });

    announcement.bind({
      kind: 'level',
      title: 'Level Up!',
      dismissible: true,
      continueLabel: 'Tap to continue',
      animation: { kind: 'level-rewards' },
      rows: [
        {
          id: 'mana',
          label: 'Mana Capacity',
          value: '+10',
        },
      ],
    });

    expect(announcement.continuePrompt.position.x).toBeCloseTo(
      announcement.announcementModel.width / 2,
    );
    expect(announcement.continuePrompt.position.y).toBeGreaterThan(
      announcement.rowsLayer.position.y,
    );
    expect(announcement.levelBannerLayer.position.x).toBeCloseTo(
      announcement.announcementModel.width / 2,
    );

    harness.dispose();
  });

  it('reuses the level-up banner and backed rows for celebration announcements', () => {
    const announcementTexture = new Texture({
      source: new TextureSource({
        resource: { width: 96, height: 96 },
        width: 96,
        height: 96,
      }),
    });
    const harness = createHarness({ announcementTexture });
    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
      kind: 'level',
      title: 'Level Up!',
      dismissible: true,
      continueLabel: 'Tap to continue',
      animation: { kind: 'level-rewards' },
      rows: [
        {
          id: 'mana',
          label: 'Mana Capacity',
          value: '+10',
          countUp: { from: 90, to: 100, gain: 10 },
          icon: { frameName: 'resource:mana' },
          color: '#ffffff',
          mutedLabel: false,
        },
      ],
    });

    expect(announcement.backdropAlpha).toBe(0.88);
    expect(announcement.backdrop.tint).toBe(0x000000);
    expect(announcement.levelBannerLayer.visible).toBe(true);
    expect(announcement.levelBannerFrame.texture).toBe(
      harness.assets.getTexture(PIXI_ROOT_RUN_ASSETS.marketTitleRibbon),
    );
    expect(announcement.levelBannerTitle).toMatchObject({
      text: 'Level Up!',
      fontSize: PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.titleFontSize,
      fontWeight: 'normal',
      lineHeight: PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.titleLineHeight,
      colorToken: '#ffffff',
      stroke: {
        color: PIXI_TEXT_STROKE_COLOR,
        width: resolvePixiTextStrokeWidth(
          announcement.levelBannerTitle.fontSize,
        ),
      },
    });
    expect(announcement.levelBannerTitle.textObject.anchor).toMatchObject({
      x: 0.5,
      y: 0.5,
    });
    expect(announcement.levelBannerTitle.position.x).toBeCloseTo(
      announcement.levelBannerFrame.frameWidth / 2,
    );
    expect(announcement.continuePrompt.text).toBe('Tap to continue');
    expect(announcement.continuePrompt.colorToken).toBe('muted');
    expect(announcement.continuePrompt.position.x).toBeCloseTo(
      announcement.announcementModel.width / 2,
    );
    expect(announcement.continuePrompt.position.y).toBeGreaterThan(
      announcement.rowsLayer.position.y,
    );
    expect(announcement.levelRewardRowBackings).toHaveLength(1);
    expect(
      announcement.rows.collection.getWidgets()[0].keyLabel.stroke,
    ).toEqual({
      color: PIXI_TEXT_STROKE_COLOR,
      width: resolvePixiTextStrokeWidth(
        announcement.rows.collection.getWidgets()[0].keyLabel.fontSize,
      ),
      join: 'round',
    });
    const rewardRow = announcement.rows.collection.getWidgets()[0];
    expect(rewardRow.valueLabel.text).toBe('+10');
    announcement.applyLevelAnnouncementMotion(
      1800,
      announcement.announcementModel.animation,
    );
    expect(Number.parseFloat(rewardRow.valueLabel.text)).toBeGreaterThan(90);
    expect(Number.parseFloat(rewardRow.valueLabel.text)).toBeLessThan(100);
    expect(rewardRow.valueLabel.text).toMatch(/ \+10$/);
    announcement.applyLevelAnnouncementMotion(
      2200,
      announcement.announcementModel.animation,
    );
    expect(Number.parseFloat(rewardRow.valueLabel.text)).toBeLessThan(100);
    expect(announcement.requestClose('outside')).toBe(false);

    announcement.settleAnnouncementMotion();
    expect(rewardRow.valueLabel.text).toBe('100 +10');
    expect(announcement.levelBannerTitle.position.y).toBeCloseTo(
      announcement.levelBannerFrame.frameHeight / 2 +
        PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.contentOffsetY,
    );
    expect(announcement.requestClose('outside')).toBe(true);

    announcement.bind({
      kind: 'research',
      variant: 'banner-rows',
      title: 'Research Complete!',
      dismissible: false,
      animation: {
        kind: 'research-complete',
        titleDelayMs: 40,
        iconDelayMs: 180,
        rowDelayMs: 540,
      },
      icon: {
        frameName: 'research:fastSell',
        silhouetteFrameName: 'research:fastSell',
      },
      rows: [
        {
          id: 'research:name',
          label: 'Research',
          value: 'Staff Stall 1',
          height: 34,
          keyWidth: 72,
          mutedLabel: false,
          boldLabel: true,
          boldValue: true,
          color: '#ffffff',
          valueColor: '#ffffff',
        },
      ],
    });
    expect(announcement.backdropAlpha).toBe(0.88);
    expect(announcement.backdrop.tint).toBe(0x000000);
    expect(announcement.levelBannerLayer.visible).toBe(true);
    expect(announcement.levelBannerTitle.text).toBe('Research Complete!');
    expect(announcement.rowsLayer.visible).toBe(true);
    expect(announcement.researchItemLayer.visible).toBe(true);
    expect(announcement.researchItem.icon.visible).toBe(true);
    expect(announcement.researchItem.icon.width).toBeGreaterThanOrEqual(70);
    expect(announcement.researchItem.label.text).toBe('');
    expect(announcement.researchItemLayer.position.x).toBeLessThan(
      announcement.rowsLayer.position.x,
    );
    expect(announcement.rowsLayer.position.y).toBeGreaterThan(
      announcement.researchItemLayer.position.y +
        announcement.researchItem.preferredHeight,
    );
    expect(announcement.continuePrompt.visible).toBe(false);
    expect(announcement.levelRewardRowBackings).toHaveLength(1);
    expect(
      announcement.rows.collection.getWidgets()[0].keyLabel.stroke,
    ).toEqual({
      color: PIXI_TEXT_STROKE_COLOR,
      width: resolvePixiTextStrokeWidth(
        announcement.rows.collection.getWidgets()[0].keyLabel.fontSize,
      ),
      join: 'round',
    });
    announcement.applyLevelAnnouncementMotion(
      0,
      announcement.announcementModel.animation,
    );
    expect(announcement.researchItem.icon.alpha).toBe(0);
    announcement.settleAnnouncementMotion();
    expect(announcement.researchItem.icon.alpha).toBe(1);
    expect(announcement.researchItem.silhouette.alpha).toBe(0);

    announcement.bind({
      kind: 'unlock',
      title: 'garden unlocked',
      items: [],
    });
    expect(announcement.backdropAlpha).toBe(0.68);
    expect(announcement.backdrop.tint).toBe(0xffffff);
    expect(
      announcement.rows.collection.getWidgets()[0]?.keyLabel.stroke ?? null,
    ).toBeNull();

    harness.dispose();
  });

  it('dismisses a settled level-up announcement when the continue prompt is tapped', () => {
    const advance = vi.fn(() => true);
    const harness = createHarness({
      announcementMotionRuntime: {
        requestFrame: vi.fn(),
        cancelFrame: vi.fn(),
        now: () => 0,
        prefersReducedMotion: () => true,
      },
    });
    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
      kind: 'level',
      title: 'Level Up!',
      dismissible: true,
      continueLabel: 'Tap to continue',
      animation: { kind: 'level-rewards' },
      actions: { advance },
      rows: [
        {
          id: 'mana',
          label: 'Mana Capacity',
          value: '+10',
        },
      ],
    });
    const modal = harness.inputRouter.getTopModal();
    const promptPoint = announcement.continuePrompt.toGlobal({
      x: 0,
      y: 0,
    });

    expect(announcement.levelAdvanceReady).toBe(true);
    expect(announcement.panel.containsModalPoint(promptPoint)).toBe(true);
    expect(modal?.onOutsidePress?.({ point: promptPoint })).toBe(true);
    expect(advance).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'outside' }),
    );
    expect(harness.registry.isOpen(GLOBAL_DIALOG_IDS.ANNOUNCEMENT)).toBe(false);

    harness.dispose();
  });

  it('wraps long level reward values inside the main two-column row contract', () => {
    const harness = createHarness();
    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
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
    });
    const row = announcement.rows.collection.getWidgets()[0];

    expect(row.keyLabel.wrapWidth).toBeCloseTo(101.6);
    expect(row.valueLabel.wrapWidth).toBeCloseTo(152.4);
    expect(row.valueLabel.align).toBe('right');
    expect(row.rowHeight).toBeGreaterThan(GLOBAL_DIALOG_GEOMETRY.rowHeight);
    expect(row.valueLabel.measuredWidth).toBeLessThanOrEqual(
      row.valueLabel.wrapWidth,
    );
    harness.dispose();
  });

  it('keeps while-away values inside the paper with regular ink and right-side icons', () => {
    const harness = createHarness();
    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
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
    });
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
    const announcement = harness.registry.open(GLOBAL_DIALOG_IDS.ANNOUNCEMENT, {
      kind: 'whileAway',
      title: 'While Away',
      framed: true,
      dismissible: true,
      showClose: true,
      rows,
    });

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

    announcement.reportScroll.scrollTo(announcement.reportScroll.contentHeight);
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

    expect(harness.inputRouter.getTopModal()?.id).toBe(GLOBAL_DIALOG_IDS.LEVEL);
    expect(harness.inputRouter.handleBack({ source: 'native' })).toBe(true);
    expect(harness.registry.isOpen(GLOBAL_DIALOG_IDS.LEVEL)).toBe(false);
    expect(harness.inputRouter.getTopModal()).toBeNull();
    harness.dispose();
  });
});

function createHarness({
  announcementMotionRuntime = null,
  announcementTexture = null,
  characterTexture = null,
} = {}) {
  const registry = new DialogRegistry();
  const inputRouter = new PixiInputRouter();
  const semanticRegistry = new SemanticTargetRegistry();
  const assets = createPixiAssetManagerFake(Texture);
  if (announcementTexture) {
    assets.getAtlasTexture = vi.fn(() => announcementTexture);
  }
  if (characterTexture) {
    assets.getTexture = vi.fn((assetId) =>
      String(assetId).includes('/avatars/') ? characterTexture : Texture.EMPTY,
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
      sourceWidth: PIXI_UI_GEOMETRY.sourceWidth,
      sourceHeight: PIXI_UI_GEOMETRY.sourceHeight,
      sourceScale: PIXI_UI_GEOMETRY.sourceScale,
      sourceOffsetX: 0,
      stageLogicalWidth: PIXI_UI_GEOMETRY.authoredWidth,
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
    assets,
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
    frame: 'gnome',
    playerLevel: 4,
    prestigeCount: 2,
    totalProducedCoin: 1200,
    totalBrewedPotions: 86,
    totalHarvestedHerbs: 240,
    allianceId: 'alliance-one',
    allianceName: 'Moss Hall',
    allianceTag: 'MOSS',
    allianceTagColor: 'green',
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
