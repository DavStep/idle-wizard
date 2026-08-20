import { describe, expect, it, vi } from 'vitest';

import { GLOBAL_DIALOG_IDS } from '../global/dialogs/index.js';
import { PixiGlobalDialogPresenter } from './PixiGlobalDialogPresenter.js';

describe('PixiGlobalDialogPresenter', () => {
  it('registers every global dialog before requiring an initialized runtime', () => {
    const harness = createHarness({ runtimeInitialized: false });

    expect(harness.renderFacade.getUiRuntime).not.toHaveBeenCalled();
    expect(harness.factories.size).toBe(9);
    expect([...harness.factories.keys()]).toEqual([
      GLOBAL_DIALOG_IDS.SETTINGS,
      GLOBAL_DIALOG_IDS.FEEDBACK,
      GLOBAL_DIALOG_IDS.CHAT_REPORT,
      GLOBAL_DIALOG_IDS.LEVEL,
      GLOBAL_DIALOG_IDS.INBOX,
      GLOBAL_DIALOG_IDS.PLAYER,
      GLOBAL_DIALOG_IDS.ALLIANCE,
      GLOBAL_DIALOG_IDS.ANNOUNCEMENT,
      GLOBAL_DIALOG_IDS.CONFIRMATION,
    ]);
    expect(
      [...harness.factories.values()].every(
        (factory) => typeof factory === 'function',
      ),
    ).toBe(true);

    harness.presenter.mount();
    expect(() => harness.presenter.open('settings')).toThrow(
      'RenderFacade.initialize()',
    );
  });

  it('routes aliases to canonical retained ids and preserves feedback kind', () => {
    const harness = createHarness();
    harness.presenter.mount();

    harness.presenter.open('bug');
    expect(harness.runtime.openDialog).toHaveBeenLastCalledWith(
      GLOBAL_DIALOG_IDS.FEEDBACK,
      expect.objectContaining({
        tabId: 'report',
        feedback: expect.objectContaining({ kind: 'bug' }),
      }),
    );

    harness.presenter.open('feature');
    expect(harness.runtime.openDialog).toHaveBeenLastCalledWith(
      GLOBAL_DIALOG_IDS.FEEDBACK,
      expect.objectContaining({
        feedback: expect.objectContaining({ kind: 'feature' }),
      }),
    );

    harness.presenter.open('mail');
    expect(harness.runtime.openDialog).toHaveBeenLastCalledWith(
      GLOBAL_DIALOG_IDS.INBOX,
      expect.any(Object),
    );

    expect(harness.presenter.close('bug')).toBe(true);
    expect(harness.runtime.closeDialog).toHaveBeenLastCalledWith(
      GLOBAL_DIALOG_IDS.FEEDBACK,
    );
    expect(harness.presenter.open('unknown')).toBe(false);
  });

  it('replaces a submitted chat report with the requested reminder dialog', () => {
    const harness = createHarness();
    harness.presenter.mount();
    const message = { id: 'message-one', username: 'Mira' };

    expect(harness.presenter.open('chatReport', { message })).toEqual({
      dialogId: GLOBAL_DIALOG_IDS.CHAT_REPORT,
    });
    const report = harness.getOpenModel(GLOBAL_DIALOG_IDS.CHAT_REPORT);
    expect(report.message).toBe(message);
    expect(report.actions.submit({ body: 'Repeated insults', message })).toEqual({
      ok: true,
    });

    expect(harness.runtime.closeDialog).toHaveBeenCalledWith(
      GLOBAL_DIALOG_IDS.CHAT_REPORT,
    );
    expect(harness.getOpenModel(GLOBAL_DIALOG_IDS.ANNOUNCEMENT)).toMatchObject({
      title: 'Report',
      copy:
        'No need to report anyone you snitch! We all are a big family, learn to coexist together!',
      contentHeight: 104,
      framed: true,
      dismissible: true,
    });
  });

  it('does not open before mount and delegates lazy open/close to the runtime', () => {
    const harness = createHarness();

    expect(harness.presenter.open('settings')).toBe(false);
    expect(harness.runtime.openDialog).not.toHaveBeenCalled();
    expect(harness.factories.size).toBe(9);

    harness.presenter.mount();
    const first = harness.presenter.open('settings', {
      tab: 'account',
    });
    const second = harness.presenter.open('settings', {
      focusInput: true,
    });

    expect(first).toEqual({
      dialogId: GLOBAL_DIALOG_IDS.SETTINGS,
    });
    expect(second).toEqual(first);
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(2);
    expect(harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS)).toMatchObject({
      tabId: 'account',
      focusInput: true,
    });
    expect(harness.presenter.close('settings')).toBe(true);
    expect(harness.runtime.getOpenDialogIds()).toEqual([]);
    expect(
      [...harness.factories.values()].every(
        (factory) => factory.mock.calls.length === 0,
      ),
    ).toBe(true);
  });

  it('opens device settings after the Wizard surface was opened previously', () => {
    const harness = createHarness();
    harness.presenter.mount();

    harness.presenter.open('settings', { tab: 'account' });
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS).tabId,
    ).toBe('account');
    harness.presenter.close('settings');

    harness.presenter.open('settings');
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS),
    ).toMatchObject({
      title: 'Settings',
      tabId: 'configurations',
    });
  });

  it('notifies when the installed game is up to date', async () => {
    const checkForUpdates = vi.fn(() =>
      Promise.resolve({ status: 'up_to_date', version: '0.4.0' }),
    );
    const harness = createHarness({ checkForUpdates });
    harness.presenter.mount();
    harness.presenter.open('settings');

    const settings = harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS);
    await expect(settings.actions.checkForUpdates()).resolves.toEqual({
      status: 'up_to_date',
      version: '0.4.0',
    });

    expect(checkForUpdates).toHaveBeenCalledOnce();
    expect(harness.getOpenModel(GLOBAL_DIALOG_IDS.ANNOUNCEMENT)).toMatchObject({
      title: 'Updates',
      copy: 'Idle Wizard is up to date.',
      dismissible: true,
      framed: true,
    });
  });

  it('asks before installing an available update', async () => {
    const checkForUpdates = vi.fn(() =>
      Promise.resolve({ status: 'available', version: '0.4.1' }),
    );
    const installUpdate = vi.fn(() => Promise.resolve(true));
    const harness = createHarness({ checkForUpdates, installUpdate });
    harness.presenter.mount();
    harness.presenter.open('settings');

    await harness
      .getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS)
      .actions.checkForUpdates();
    const confirmation = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.CONFIRMATION,
    );
    expect(confirmation).toMatchObject({
      title: 'Update Available',
      message: 'Version 0.4.1 is available. Update now?',
      cancelLabel: 'Later',
      confirmLabel: 'Update',
    });

    expect(confirmation.actions.confirm()).toBe(true);
    expect(installUpdate).toHaveBeenCalledOnce();
  });

  it('gates an explicitly unnamed player surface and resumes its request once after save', () => {
    const harness = createHarness({
      playerSnapshot: { hasExplicitUsername: false },
    });
    harness.presenter.mount();

    expect(
      harness.presenter.open('global.player', {
        player: {
          identity: 'rowan-id',
          username: 'rowan',
        },
      }),
    ).toEqual({ dialogId: GLOBAL_DIALOG_IDS.SETTINGS });
    expect(harness.runtime.getOpenDialogIds()).toEqual([
      GLOBAL_DIALOG_IDS.SETTINGS,
    ]);

    const prompt = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );
    expect(prompt).toMatchObject({
      title: 'Wizard',
      tabId: 'account',
      focusInput: true,
      account: {
        usernameRequired: true,
      },
    });
    expect(
      harness.playerInfoFacade.retainPublicData,
    ).not.toHaveBeenCalled();

    expect(prompt.actions.saveUsername('juniper')).toEqual({
      ok: true,
    });
    expect(harness.runtime.getOpenDialogIds()).toEqual([
      GLOBAL_DIALOG_IDS.PLAYER,
    ]);
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.PLAYER).player,
    ).toMatchObject({
      identity: 'rowan-id',
      username: 'rowan',
    });

    prompt.actions.saveUsername('juniper again');
    expect(
      harness.runtime.openDialog.mock.calls.filter(
        ([dialogId]) => dialogId === GLOBAL_DIALOG_IDS.PLAYER,
      ),
    ).toHaveLength(1);
  });

  it('opens an explicitly unnamed current player directly by identity', () => {
    const harness = createHarness({
      playerSnapshot: { hasExplicitUsername: false },
    });
    harness.presenter.mount();

    expect(
      harness.presenter.open('global.player', {
        player: {
          identity: 'identity-mira',
          username: 'Wizard',
        },
      }),
    ).toEqual({ dialogId: GLOBAL_DIALOG_IDS.PLAYER });
    expect(harness.runtime.getOpenDialogIds()).toEqual([
      GLOBAL_DIALOG_IDS.PLAYER,
    ]);
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.PLAYER).player,
    ).toMatchObject({
      identity: 'identity-mira',
      username: 'Wizard',
    });
  });

  it('normalizes alliance member identities for Player Info', () => {
    const harness = createHarness();

    const model = harness.presenter.createPlayerModel({
      memberIdentity: 'alliance-member-id',
      username: 'Alliance Mira',
      character: 'mira',
      frame: 'violet',
    });

    expect(model.player).toMatchObject({
      identity: 'alliance-member-id',
      username: 'Alliance Mira',
      character: 'mira',
      frame: 'violet',
    });
  });

  it('keeps an explicitly unnamed alliance request pending after a failed save', () => {
    const harness = createHarness({
      playerSnapshot: { hasExplicitUsername: false },
    });
    harness.playerFacade.setUsername
      .mockReturnValueOnce({
        ok: false,
        reason: 'invalid_username',
      })
      .mockReturnValue({ ok: true });
    harness.presenter.mount();
    harness.presenter.open('global.alliance', {
      alliance: {
        allianceId: 'alliance-two',
        tag: 'FERN',
      },
    });
    const prompt = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );

    expect(prompt.actions.saveUsername('')).toEqual({
      ok: false,
      reason: 'invalid_username',
    });
    expect(harness.runtime.closeDialog).not.toHaveBeenCalled();
    expect(
      harness.runtime.openDialog.mock.calls.some(
        ([dialogId]) => dialogId === GLOBAL_DIALOG_IDS.ALLIANCE,
      ),
    ).toBe(false);

    expect(prompt.actions.saveUsername('fern mage')).toEqual({
      ok: true,
    });
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.ALLIANCE).alliance,
    ).toMatchObject({
      allianceId: 'alliance-two',
      tag: 'FERN',
    });
  });

  it('discards a pending player surface when the username prompt is closed', () => {
    const harness = createHarness({
      playerSnapshot: { hasExplicitUsername: false },
    });
    harness.presenter.mount();
    harness.presenter.open('settings', {
      tab: 'configurations',
    });
    harness.presenter.close('settings');

    harness.presenter.open('player', {
      player: { username: 'mira' },
    });
    const prompt = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );
    expect(prompt.tabId).toBe('account');
    expect(prompt.actions.close()).toBe(true);
    expect(
      harness.runtime.closeDialog(GLOBAL_DIALOG_IDS.SETTINGS),
    ).toBe(true);

    prompt.actions.saveUsername('juniper');
    expect(
      harness.runtime.openDialog.mock.calls.some(
        ([dialogId]) => dialogId === GLOBAL_DIALOG_IDS.PLAYER,
      ),
    ).toBe(false);

    harness.presenter.open('settings', { focusInput: false });
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS),
    ).toMatchObject({
      tabId: 'configurations',
      account: { usernameRequired: false },
    });
  });

  it.each([
    ['omits hasExplicitUsername', {}],
    ['reports an explicit username', { hasExplicitUsername: true }],
  ])('does not gate player surfaces when the snapshot %s', (_name, playerSnapshot) => {
    const harness = createHarness({ playerSnapshot });
    harness.presenter.mount();

    harness.presenter.open('global.player', {
      player: { username: 'mira' },
    });
    harness.presenter.open('global.alliance', {
      alliance: { tag: 'MOSS' },
    });

    expect(harness.runtime.getOpenDialogIds()).toEqual([
      GLOBAL_DIALOG_IDS.PLAYER,
      GLOBAL_DIALOG_IDS.ALLIANCE,
    ]);
    expect(
      harness.runtime.openDialog.mock.calls.some(
        ([dialogId]) => dialogId === GLOBAL_DIALOG_IDS.SETTINGS,
      ),
    ).toBe(false);
  });

  it('hands subscriptions from the username prompt to the resumed retained surface', () => {
    const harness = createHarness({
      playerSnapshot: { hasExplicitUsername: false },
      simulateDialogLifecycle: true,
    });
    harness.presenter.mount();
    harness.presenter.open('player', {
      player: { username: 'mira' },
    });
    const prompt = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );

    for (const source of [
      harness.playerFacade,
      harness.gameplayFacade,
      harness.authFacade,
      harness.hapticsFacade,
      harness.soundSettingsFacade,
    ]) {
      expect(source.activeSubscriptions()).toBe(1);
    }

    prompt.actions.saveUsername('juniper');

    for (const source of [
      harness.playerFacade,
      harness.gameplayFacade,
      harness.authFacade,
      harness.hapticsFacade,
      harness.soundSettingsFacade,
    ]) {
      expect(source.activeSubscriptions()).toBe(0);
    }
    expect(
      harness.playerInfoFacade.retainPublicData,
    ).toHaveBeenCalledTimes(1);
    expect(
      harness.playerInfoFacade.activeSubscriptions(),
    ).toBe(1);

    expect(harness.presenter.close('player')).toBe(true);
    expect(
      harness.playerInfoFacade.releasePublicData,
    ).toHaveBeenCalledTimes(1);
    expect(
      harness.playerInfoFacade.activeSubscriptions(),
    ).toBe(0);
  });

  it('projects all settings categories and routes settings actions', async () => {
    const harness = createHarness();
    harness.presenter.mount();
    harness.presenter.open('settings', {
      tab: 'theme',
    });
    const model = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );

    expect(model.tabId).toBe('configurations');
    expect(model.categories.map(({ key }) => key)).toEqual([
      'theme',
      'font',
      'color',
      'icons',
      'character',
      'frame',
      'progressBar',
    ]);
    expect(model.selections).toMatchObject({
      theme: 'night',
      font: 'lexend',
      color: 'resources',
      icons: 'icons',
      character: 'mira',
      frame: 'classic',
      progressBar: 'gradient',
    });

    expect(model.actions.togglePreference('haptics', false)).toBe(true);
    expect(model.actions.togglePreference('music', 35)).toBe(true);
    expect(model.actions.togglePreference('sfx', 68)).toBe(true);
    expect(model.actions.togglePreference('theme', true)).toBe(true);
    expect(harness.hapticsFacade.setEnabled).toHaveBeenCalledWith(false);
    expect(
      harness.soundSettingsFacade.setMusicVolume,
    ).toHaveBeenCalledWith(0.35);
    expect(
      harness.soundSettingsFacade.setSfxVolume,
    ).toHaveBeenCalledWith(0.68);
    expect(harness.playerFacade.setTheme).toHaveBeenCalledWith('day');
    expect(model.account.userId).toBe('identity-mira');
    expect(await model.actions.copyUserId(model.account.userId)).toBe(
      true,
    );
    expect(harness.copyText).toHaveBeenCalledWith(
      'identity-mira',
    );

    model.actions.selectVisualOption('theme', 'day');
    model.actions.selectVisualOption('font', 'comic-sans-mono');
    model.actions.selectVisualOption('color', 'single');
    model.actions.selectVisualOption('icons', 'text');
    model.actions.selectVisualOption('character', 'rowan');
    model.actions.selectVisualOption('frame', 'emerald');
    model.actions.selectVisualOption('progressBar', 'notched');
    expect(harness.playerFacade.setTheme).toHaveBeenCalledWith(
      'day',
    );
    expect(harness.playerFacade.setFont).toHaveBeenCalledWith(
      'comic-sans-mono',
    );
    expect(harness.playerFacade.setColorMode).toHaveBeenCalledWith(
      'single',
    );
    expect(harness.playerFacade.setIconMode).toHaveBeenCalledWith(
      'text',
    );
    expect(harness.playerFacade.setCharacter).toHaveBeenCalledWith(
      'rowan',
    );
    expect(harness.playerFacade.setFrame).toHaveBeenCalledWith(
      'emerald',
    );
    expect(
      harness.playerFacade.setProgressBar,
    ).toHaveBeenCalledWith('notched');

    model.actions.researchVisualOption('theme', 'day');
    expect(
      harness.gameplayFacade.buyVisualSettingOption,
    ).toHaveBeenCalledWith('theme', 'day');

    await model.actions.sendFeedback({
      kind: 'bug',
      body: 'button is stuck',
    });
    expect(
      harness.feedbackFacade.submitFeedback,
    ).toHaveBeenCalledWith('bug report:\nbutton is stuck');

    expect(model.actions.saveUsername('juniper')).toEqual({
      ok: true,
    });
    expect(harness.playerFacade.setUsername).toHaveBeenCalledWith(
      'juniper',
    );
    expect(harness.runtime.closeDialog).toHaveBeenCalledWith(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );
  });

  it('routes only the current player from Player Info to Wizard cosmetics', () => {
    const harness = createHarness();
    harness.presenter.mount();

    harness.presenter.open(GLOBAL_DIALOG_IDS.PLAYER, {
      player: {
        identity: 'identity-mira',
        username: 'mira',
      },
    });
    const ownPlayer = harness.getOpenModel(GLOBAL_DIALOG_IDS.PLAYER);

    expect(ownPlayer.ownPlayer).toBe(true);
    expect(ownPlayer.actions.openCosmetics()).toEqual({
      dialogId: GLOBAL_DIALOG_IDS.SETTINGS,
    });
    expect(harness.runtime.getOpenDialogIds()).toEqual([
      GLOBAL_DIALOG_IDS.SETTINGS,
    ]);
    expect(harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS)).toMatchObject({
      title: 'Wizard',
      tabId: 'account',
    });

    harness.presenter.close(GLOBAL_DIALOG_IDS.SETTINGS);
    harness.presenter.open(GLOBAL_DIALOG_IDS.PLAYER, {
      player: {
        identity: 'identity-rowan',
        username: 'rowan',
      },
    });
    const otherPlayer = harness.getOpenModel(GLOBAL_DIALOG_IDS.PLAYER);
    expect(otherPlayer.ownPlayer).toBe(false);
    expect(otherPlayer.actions.openCosmetics).toBeUndefined();
  });

  it('connects Google from settings with the current gameplay save', async () => {
    const harness = createHarness();
    harness.authFacade.signInWithGoogle = vi.fn(() =>
      Promise.resolve({
        ok: false,
        reason: 'popup_cancelled',
      }),
    );
    harness.presenter.mount();
    harness.presenter.open('settings');
    const model = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );

    expect(model.account).toMatchObject({
      accountStatus: 'Not Connected',
      connectLabel: 'Connect Account',
      connectEnabled: true,
    });
    expect(await model.actions.connectAccount()).toEqual({
      ok: false,
      reason: 'popup_cancelled',
    });
    expect(
      harness.gameplayFacade.createPersistenceSave,
    ).toHaveBeenCalledTimes(1);
    expect(
      harness.authFacade.signInWithGoogle,
    ).toHaveBeenCalledWith({
      pendingGameplaySave: { version: 1 },
    });
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS).account,
    ).toMatchObject({
      accountStatus: 'Login Cancelled',
      connectLabel: 'Connect Account',
      connectEnabled: true,
    });
  });

  it('shows an unavailable Google login as a disabled Title Case action', () => {
    const harness = createHarness();
    harness.authFacade.getSnapshot.mockReturnValue({
      hasToken: false,
      identity: 'identity-mira',
      oidc: { enabled: false },
    });
    harness.presenter.mount();
    harness.presenter.open('settings');

    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS).account,
    ).toMatchObject({
      accountStatus: 'Login Unavailable',
      connectLabel: 'Connect Account',
      connectEnabled: false,
    });
  });

  it('keeps selected settings tab and feedback kind through subscription refreshes', () => {
    const harness = createHarness();
    harness.presenter.mount();
    harness.presenter.open('settings', { tab: 'account' });
    const settings = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );
    settings.actions.selectTab('configurations');
    settings.actions.activate();

    harness.playerFacade.emit();
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.SETTINGS).tabId,
    ).toBe('configurations');
    harness.presenter.close('settings');

    harness.presenter.open('bug');
    const feedback = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.FEEDBACK,
    );
    feedback.actions.selectFeedbackKind('feature');
    feedback.actions.activate();
    harness.playerFacade.emit();
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.FEEDBACK).feedback.kind,
    ).toBe('feature');
  });

  it('subscribes settings sources once and releases them on deactivation', () => {
    const harness = createHarness();
    harness.presenter.mount();
    harness.presenter.open('settings');
    const model = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.SETTINGS,
    );

    expect(model.actions.activate()).toBe(true);
    expect(model.actions.activate()).toBe(false);
    for (const source of [
      harness.playerFacade,
      harness.gameplayFacade,
      harness.authFacade,
      harness.hapticsFacade,
      harness.soundSettingsFacade,
    ]) {
      expect(source.subscribe).toHaveBeenCalledTimes(1);
      expect(source.activeSubscriptions()).toBe(1);
    }

    harness.playerFacade.emit();
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(1);
    expect(harness.runtime.refreshDialog).toHaveBeenCalledTimes(1);

    expect(model.actions.deactivate()).toBe(true);
    expect(model.actions.deactivate()).toBe(false);
    for (const source of [
      harness.playerFacade,
      harness.gameplayFacade,
      harness.authFacade,
      harness.hapticsFacade,
      harness.soundSettingsFacade,
    ]) {
      expect(source.activeSubscriptions()).toBe(0);
      expect(source.unsubscribe).toHaveBeenCalledTimes(1);
    }
  });

  it('retains player and alliance public data once and always releases it', () => {
    const harness = createHarness();
    harness.presenter.mount();

    harness.presenter.open('player', {
      player: { identity: 'mira-id', username: 'mira' },
    });
    const player = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.PLAYER,
    );
    expect(player.actions.activate()).toBe(true);
    expect(player.actions.activate()).toBe(false);
    expect(
      harness.playerInfoFacade.retainPublicData,
    ).toHaveBeenCalledTimes(1);
    expect(player.actions.deactivate()).toBe(true);
    expect(
      harness.playerInfoFacade.releasePublicData,
    ).toHaveBeenCalledTimes(1);
    expect(harness.playerInfoFacade.activeSubscriptions()).toBe(0);

    harness.presenter.open('alliance', {
      alliance: {
        allianceId: 'alliance-one',
        tag: 'MOSS',
      },
    });
    const alliance = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.ALLIANCE,
    );
    expect(alliance.actions.activate()).toBe(true);
    expect(alliance.actions.activate()).toBe(false);
    expect(
      harness.tradeAllianceFacade.retainPublicData,
    ).toHaveBeenCalledTimes(1);

    expect(harness.presenter.unmount()).toBe(true);
    expect(
      harness.tradeAllianceFacade.releasePublicData,
    ).toHaveBeenCalledTimes(1);
    expect(
      harness.tradeAllianceFacade.activeSubscriptions(),
    ).toBe(0);
  });

  it('projects the viewer pending alliance applications into Alliance Info', () => {
    const harness = createHarness();
    harness.tradeAllianceFacade.getSnapshot.mockReturnValue({
      connected: true,
      alliances: [
        {
          allianceId: 'alliance-one',
          name: 'Moss Hall',
          tag: 'MOSS',
          joinMode: 'apply',
        },
      ],
      members: [],
      ownAlliance: null,
      ownApplications: [
        {
          applicationKey: 'application-one',
          allianceId: 'alliance-one',
        },
      ],
    });

    const model = harness.presenter.createAllianceModel({
      allianceId: 'alliance-one',
    });

    expect(model.ownApplications).toEqual([
      expect.objectContaining({ allianceId: 'alliance-one' }),
    ]);
  });

  it('keeps a newly opened alliance above player-info refreshes', () => {
    const harness = createHarness();
    harness.presenter.mount();
    harness.presenter.open('player', {
      player: { identity: 'mira-id', username: 'mira' },
    });
    const player = harness.getOpenModel(GLOBAL_DIALOG_IDS.PLAYER);
    player.actions.activate();
    player.actions.openAlliance({
      allianceId: 'alliance-one',
      tag: 'MOSS',
    });
    harness.runtime.refreshDialog.mockClear();

    harness.playerInfoFacade.emit();

    expect(harness.runtime.refreshDialog).toHaveBeenCalledWith(
      GLOBAL_DIALOG_IDS.PLAYER,
      expect.objectContaining({
        player: expect.objectContaining({ username: 'mira' }),
      }),
    );
    expect(harness.runtime.getOpenDialogIds()).toEqual([
      GLOBAL_DIALOG_IDS.PLAYER,
      GLOBAL_DIALOG_IDS.ALLIANCE,
    ]);
    expect(harness.runtime.closeDialog(GLOBAL_DIALOG_IDS.ALLIANCE)).toBe(true);
    expect(harness.runtime.getOpenDialogIds()).toEqual([
      GLOBAL_DIALOG_IDS.PLAYER,
    ]);
  });

  it('selects, clamps, and refreshes level rows without owning progression rules', () => {
    const harness = createHarness();
    harness.presenter.mount();
    harness.presenter.open('level', { level: 2 });
    const model = harness.getOpenModel(GLOBAL_DIALOG_IDS.LEVEL);

    expect(model).toMatchObject({
      currentLevel: 2,
      maxLevel: 3,
      selectedLevel: 2,
    });
    expect(model.levels[1]).toMatchObject({
      level: 2,
      addedRows: [
        {
          label: 'Mana Capacity',
          value: '+10',
          resource: 'mana',
          icon: { frameName: 'resource:mana' },
          iconPosition: 'after',
        },
        { label: 'Unlocks', value: 'Garden' },
      ],
      totalRows: expect.arrayContaining([
        {
          label: 'Mana Capacity',
          value: '30',
          resource: 'mana',
          icon: { frameName: 'resource:mana' },
          iconPosition: 'after',
        },
      ]),
    });

    expect(model.actions.selectLevel(3)).toBe(true);
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.LEVEL).selectedLevel,
    ).toBe(3);
    const refreshed = harness.getOpenModel(
      GLOBAL_DIALOG_IDS.LEVEL,
    );
    expect(refreshed.actions.selectLevel(99)).toBe(true);
    expect(
      harness.getOpenModel(GLOBAL_DIALOG_IDS.LEVEL).selectedLevel,
    ).toBe(3);
  });
});

function createHarness({
  runtimeInitialized = true,
  playerSnapshot = {},
  simulateDialogLifecycle = false,
  checkForUpdates = null,
  installUpdate = null,
} = {}) {
  const factories = new Map();
  const openModels = new Map();
  const openIds = [];
  const runtime = {
    initialized: runtimeInitialized,
    openDialog: vi.fn((dialogId, model) => {
      const alreadyOpen = openIds.includes(dialogId);
      openModels.set(dialogId, model);
      if (!alreadyOpen) {
        openIds.push(dialogId);
      }
      if (simulateDialogLifecycle && !alreadyOpen) {
        model.actions?.activate?.();
      }
      return { dialogId };
    }),
    refreshDialog: vi.fn((dialogId, model) => {
      if (!openIds.includes(dialogId)) {
        return false;
      }
      openModels.set(dialogId, model);
      return { dialogId };
    }),
    closeDialog: vi.fn((dialogId) => {
      const index = openIds.indexOf(dialogId);
      if (index < 0) {
        return false;
      }
      if (simulateDialogLifecycle) {
        openModels.get(dialogId)?.actions?.deactivate?.();
      }
      openIds.splice(index, 1);
      return true;
    }),
    getOpenDialogIds: vi.fn(() => [...openIds]),
  };
  const renderFacade = {
    registerDialog: vi.fn(function registerDialog(dialogId, factory) {
      factories.set(dialogId, vi.fn(factory));
      return this;
    }),
    getUiRuntime: vi.fn(() => runtime),
  };
  const gameplayFacade = createSnapshotFacade(
    createGameplaySnapshot(),
    {
      buyVisualSettingOption: vi.fn(() => ({ ok: true })),
      createPersistenceSave: vi.fn(() => ({ version: 1 })),
    },
  );
  const playerFacade = createSnapshotFacade(
    {
      username: 'mira',
      theme: 'night',
      font: 'lexend',
      colorMode: 'resources',
      iconMode: 'icons',
      character: 'mira',
      frame: 'classic',
      progressBar: 'gradient',
      ...playerSnapshot,
    },
    {
      setUsername: vi.fn(() => ({ ok: true })),
      setTheme: vi.fn(() => true),
      setFont: vi.fn(() => true),
      setColorMode: vi.fn(() => true),
      setIconMode: vi.fn(() => true),
      setCharacter: vi.fn(() => true),
      setFrame: vi.fn(() => true),
      setProgressBar: vi.fn(() => true),
    },
  );
  const authFacade = createSnapshotFacade({
    hasToken: false,
    identity: 'identity-mira',
    oidc: { enabled: true },
  });
  const copyText = vi.fn(() => Promise.resolve(true));
  const feedbackFacade = {
    submitFeedback: vi.fn(() => Promise.resolve({ ok: true })),
  };
  const playerInboxFacade = createSnapshotFacade({
    connected: true,
    mail: [],
  }, {
    markVisibleRead: vi.fn(),
    claimReward: vi.fn(() => Promise.resolve({ ok: true })),
  });
  const playerInfoFacade = createPublicSnapshotFacade({
    connected: true,
    players: [
      {
        identity: 'mira-id',
        username: 'mira',
        playerLevel: 4,
      },
    ],
  });
  const tradeAllianceFacade = createPublicSnapshotFacade(
    {
      connected: true,
      alliances: [
        {
          allianceId: 'alliance-one',
          name: 'Moss Hall',
          tag: 'MOSS',
          joinMode: 'closed',
        },
      ],
      members: [
        {
          allianceId: 'alliance-one',
          memberIdentity: 'mira-id',
          username: 'mira',
        },
      ],
      ownAlliance: null,
    },
    {
      joinAlliance: vi.fn(() => Promise.resolve({ ok: true })),
      applyAlliance: vi.fn(() => Promise.resolve({ ok: true })),
    },
  );
  const hapticsFacade = createSnapshotFacade(
    { enabled: true },
    { setEnabled: vi.fn(() => true) },
  );
  const soundSettingsFacade = createSnapshotFacade(
    {
      musicVolume: 0.74,
      sfxVolume: 0.58,
      musicEnabled: true,
      sfxEnabled: true,
    },
    {
      setMusicVolume: vi.fn(() => true),
      setSfxVolume: vi.fn(() => true),
      setMusicEnabled: vi.fn(() => true),
      setSfxEnabled: vi.fn(() => true),
    },
  );
  const presenter = new PixiGlobalDialogPresenter({
    renderFacade,
    gameplayFacade,
    playerFacade,
    authFacade,
    feedbackFacade,
    playerInboxFacade,
    playerInfoFacade,
    tradeAllianceFacade,
    hapticsFacade,
    soundSettingsFacade,
    checkForUpdates,
    installUpdate,
    reload: vi.fn(),
    copyText,
  });
  return {
    presenter,
    factories,
    runtime,
    renderFacade,
    gameplayFacade,
    playerFacade,
    authFacade,
    feedbackFacade,
    playerInboxFacade,
    playerInfoFacade,
    tradeAllianceFacade,
    hapticsFacade,
    soundSettingsFacade,
    copyText,
    getOpenModel: (dialogId) => openModels.get(dialogId),
  };
}

function createSnapshotFacade(snapshot, methods = {}) {
  const subscribers = new Set();
  const unsubscribe = vi.fn();
  return {
    ...methods,
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn((subscriber) => {
      subscribers.add(subscriber);
      const release = vi.fn(() => {
        subscribers.delete(subscriber);
        unsubscribe();
      });
      return release;
    }),
    unsubscribe,
    emit() {
      for (const subscriber of [...subscribers]) {
        subscriber(snapshot);
      }
    },
    activeSubscriptions: () => subscribers.size,
  };
}

function createPublicSnapshotFacade(snapshot, methods = {}) {
  const facade = createSnapshotFacade(snapshot, methods);
  facade.releasePublicData = vi.fn();
  facade.retainPublicData = vi.fn(() => facade.releasePublicData);
  return facade;
}

function createGameplaySnapshot() {
  return {
    tasks: { currentLevel: 2 },
    visualSettings: {
      costsCrystal: { theme: { day: 0, night: 0 } },
      researched: { theme: { day: true, night: true } },
    },
    playerLevel: {
      currentLevel: 2,
      maxLevel: 3,
      levels: [
        {
          level: 1,
          unlocked: true,
          effects: [],
          totals: {
            maxManaCap: 20,
            manaPerSecond: 1,
          },
        },
        {
          level: 2,
          current: true,
          unlocked: true,
          effects: [
            'max mana cap 30',
            'unlocks garden',
          ],
          totals: {
            maxManaCap: 30,
            manaPerSecond: 1,
          },
        },
        {
          level: 3,
          unlocked: false,
          effects: ['crystal reward 2'],
          totals: {
            maxManaCap: 30,
            manaPerSecond: 1,
          },
        },
      ],
    },
  };
}
