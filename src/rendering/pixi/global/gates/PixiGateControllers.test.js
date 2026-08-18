// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import {
  createPixiThemeSnapshot,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT,
  FRESH_START_CHOICE_CONNECT_ACCOUNT,
  FRESH_START_CHOICE_START_FRESH,
  PIXI_ACCOUNT_DIALOG_BACKDROP,
  PIXI_ACCOUNT_DIALOG_OPEN_MOTION,
  PixiAccountLinkChoiceView,
  PixiAccountLinkChoiceController,
  PixiDeployRefreshView,
  PixiDeployRefreshController,
  PixiFreshStartChoiceView,
  PixiFreshStartChoiceController,
  PixiLoadingSplash,
  PixiLiveUpdateController,
  PixiOnlineGateView,
  PixiOnlineGateController,
  sampleAccountDialogOpenScale,
  sampleSplashProgress,
  formatMegabytes,
} from './index.js';

installPixiPageTestCanvas();

describe('retained Pixi gate controllers', () => {
  it('uses the shared player-dialog shell for every gate', () => {
    const assets = createAssets();
    const views = [
      new PixiOnlineGateView({ assets }),
      new PixiDeployRefreshView({ assets }),
      new PixiFreshStartChoiceView({ assets }),
      new PixiAccountLinkChoiceView({ assets }),
    ];

    for (const view of views) {
      expect(view.panel).toBeInstanceOf(PixiDialogFrame);
      view.destroy();
    }
  });

  it('keeps fresh-start actions inside a compact paper area with role colors', () => {
    const view = new PixiFreshStartChoiceView({
      assets: createAssets(),
    });

    expect(view.panel.contentBoxWidth).toBe(240);
    expect(view.panel.contentInsets).toEqual({
      top: PIXI_UI_GEOMETRY.dialogPadding,
      right: PIXI_UI_GEOMETRY.dialogPadding,
      bottom: PIXI_UI_GEOMETRY.dialogPadding,
      left: PIXI_UI_GEOMETRY.dialogPadding,
    });
    expect(view.panel.coreWidth).toBe(
      240 + PIXI_UI_GEOMETRY.dialogPadding * 2,
    );
    expect(view.connectButton.variant).toBe('yellow');
    expect(view.freshButton.variant).toBe('green');
    expect(view.message.text).toBe('Do You Already Have an Account?');
    expect(view.connectButton.textLabel.text).toBe('Connect Account');
    expect(view.freshButton.textLabel.text).toBe('Start New');
    view.bind({ connectEnabled: true });
    expect(view.status.text).toBe('Not Connected');
    expect(view.connectButton.buttonWidth).toBe(240);
    expect(view.freshButton.buttonWidth).toBe(240);
    expect(view.connectButton.x).toBeGreaterThanOrEqual(0);
    expect(view.connectButton.x + view.connectButton.buttonWidth).toBeLessThanOrEqual(
      view.panel.contentBoxWidth,
    );
    expect(view.freshButton.x).toBeGreaterThanOrEqual(0);
    expect(view.freshButton.x + view.freshButton.buttonWidth).toBeLessThanOrEqual(
      view.panel.contentBoxWidth,
    );
    expect(view.freshButton.y + view.freshButton.buttonHeight).toBeLessThanOrEqual(
      view.panel.contentBoxHeight,
    );

    view.destroy();
  });

  it('composes account-link choices as two identity boards with currency icons and yellow actions', () => {
    const view = new PixiAccountLinkChoiceView({
      assets: createAssets(),
    });
    const theme = createPixiThemeSnapshot({ theme: 'midnight' });
    view.applyTheme(theme);

    view.bind({
      device: {
        level: 1,
        coin: 0,
        crystal: 1,
        emerald: 2,
        ruby: 3,
      },
      account: {
        username: 'StepWizzard',
        character: 'elara',
        frame: 'violet',
        level: 5,
        coin: 53,
        crystal: 3,
        emerald: 2,
        ruby: 1,
      },
      onSelectDevice: vi.fn(),
      onSelectAccount: vi.fn(),
    });

    expect(view.panel.titleLabel.text).toBe('Account Data');
    expect(view.panel.paperVisible).toBe(false);
    expect(view.deviceRow.label.text).toBe('This Device');
    expect(view.accountRow.label.text).toBe('StepWizzard');
    expect(view.accountRow.username.text).toBe('StepWizzard');
    expect(view.deviceRow.level.text).toBe('Level 1');
    expect(view.accountRow.level.text).toBe('Level 5');
    expect(view.deviceRow.coin.resource).toBe('coin');
    expect(view.deviceRow.coin.amount).toBe('0');
    expect(view.deviceRow.crystal.resource).toBe('crystal');
    expect(view.deviceRow.crystal.amount).toBe('1');
    expect(view.deviceRow.emerald.resource).toBe('emerald');
    expect(view.deviceRow.emerald.amount).toBe('2');
    expect(view.deviceRow.ruby.resource).toBe('ruby');
    expect(view.deviceRow.ruby.amount).toBe('3');
    expect(view.accountRow.coin.amount).toBe('53');
    expect(view.accountRow.crystal.amount).toBe('3');
    expect(view.accountRow.emerald.amount).toBe('2');
    expect(view.accountRow.ruby.amount).toBe('1');
    expect(view.deviceRow.button.variant).toBe('yellow');
    expect(view.accountRow.button.variant).toBe('yellow');
    expect(view.deviceRow.button.textLabel.text).toBe('Select');
    expect(view.accountRow.button.textLabel.text).toBe('Select');
    expect(view.deviceSection.frameHeight).toBe(
      view.accountSection.frameHeight,
    );
    expect(view.deviceRow.button.buttonWidth).toBe(72);
    expect(view.deviceRow.button.buttonHeight).toBe(42);
    expect(view.accountRow.button.buttonWidth).toBe(72);
    expect(view.accountRow.button.buttonHeight).toBe(42);
    expect(view.deviceRow.button.x).toBe(view.accountRow.button.x);
    expect(view.deviceRow.button.y).toBe(view.accountRow.button.y);
    expect(
      view.deviceRow.button.x + view.deviceRow.button.buttonWidth,
    ).toBe(view.panel.contentBoxWidth - 8);
    expect(
      view.deviceRow.button.y + view.deviceRow.button.buttonHeight / 2,
    ).toBe(40);
    expect(view.deviceRow.label.x).toBe(view.deviceRow.level.x);
    expect(view.deviceRow.coin.x).toBe(
      view.deviceRow.level.x,
    );
    expect(view.deviceRow.crystal.x).toBeGreaterThan(
      view.deviceRow.coin.x + view.deviceRow.coin.measuredWidth,
    );
    expect(view.deviceRow.emerald.x).toBeGreaterThan(
      view.deviceRow.crystal.x + view.deviceRow.crystal.measuredWidth,
    );
    expect(view.deviceRow.ruby.x).toBeGreaterThan(
      view.deviceRow.emerald.x + view.deviceRow.emerald.measuredWidth,
    );
    expect(
      view.deviceRow.ruby.x + view.deviceRow.ruby.measuredWidth,
    ).toBeCloseTo(view.deviceRow.button.x - 8);
    expect(
      view.deviceRow.crystal.x -
        view.deviceRow.coin.x -
        view.deviceRow.coin.measuredWidth,
    ).toBeCloseTo(
      view.deviceRow.emerald.x -
        view.deviceRow.crystal.x -
        view.deviceRow.crystal.measuredWidth,
    );
    expect(
      view.deviceRow.emerald.x -
        view.deviceRow.crystal.x -
        view.deviceRow.crystal.measuredWidth,
    ).toBeCloseTo(
      view.deviceRow.ruby.x -
        view.deviceRow.emerald.x -
        view.deviceRow.emerald.measuredWidth,
    );
    expect(view.accountRow.label.x).toBe(
      view.accountRow.level.x,
    );
    expect(view.accountRow.level.x).toBe(
      view.accountRow.username.x,
    );
    expect(
      view.accountRow.avatar.y +
        view.accountRow.avatar.buttonHeight *
          view.accountRow.avatar.scale.y /
          2,
    ).toBeCloseTo(
      view.accountRow.button.y +
        view.accountRow.button.buttonHeight / 2,
    );
    expect(view.accountRow.crystal.x).toBeGreaterThan(
      view.accountRow.coin.x + view.accountRow.coin.measuredWidth,
    );
    expect(view.accountRow.emerald.x).toBeGreaterThan(
      view.accountRow.crystal.x + view.accountRow.crystal.measuredWidth,
    );
    expect(view.accountRow.ruby.x).toBeGreaterThan(
      view.accountRow.emerald.x + view.accountRow.emerald.measuredWidth,
    );
    expect(
      view.accountRow.ruby.x + view.accountRow.ruby.measuredWidth,
    ).toBeCloseTo(view.accountRow.button.x - 8);
    const contentTheme = view.panel.getContentTheme();
    for (const resource of [
      view.deviceRow.coin,
      view.deviceRow.crystal,
      view.deviceRow.emerald,
      view.deviceRow.ruby,
      view.accountRow.coin,
      view.accountRow.crystal,
      view.accountRow.emerald,
      view.accountRow.ruby,
    ]) {
      expect(resource.amountLabel.textObject.style.fill).toBe(
        contentTheme.text,
      );
    }
    expect(view.deviceRow.coin.amountLabel.textObject.style.fill).not.toBe(
      contentTheme.resourceColors.coin,
    );
    expect(view.warning.text).toBe(
      'The Progress You Do Not Select Will Be Lost',
    );
    expect(view.accountAvatar.visible).toBe(true);
    expect(view.accountAvatar.avatarFrame.tint).not.toBe(0xffffff);
    expect(view.accountSection.y).toBeGreaterThan(
      view.deviceSection.y + view.deviceSection.frameHeight,
    );
    expect(view.warning.y).toBeGreaterThan(
      view.accountSection.y + view.accountSection.frameHeight,
    );

    view.destroy();
  });

  it('uses the default character and frame when the account has no selection', () => {
    const assets = createAssets();
    assets.getTexture = vi.fn(() => Texture.EMPTY);
    const view = new PixiAccountLinkChoiceView({ assets });
    const textureCallCount = assets.getTexture.mock.calls.length;

    view.bind({
      account: {
        username: 'Wizard',
        character: '',
        frame: '',
      },
    });

    expect(
      assets.getTexture.mock.calls.slice(textureCallCount),
    ).toContainEqual(['source:assets/avatars/elara.png']);
    expect(view.accountAvatar.avatarFrame.tint).toBe(0xffffff);

    view.destroy();
  });

  it('preserves currency gaps when four larger balances fill the account lane', () => {
    const view = new PixiAccountLinkChoiceView({
      assets: createAssets(),
    });
    view.applyTheme(createPixiThemeSnapshot({ theme: 'midnight' }));

    view.bind({
      account: {
        coin: 999,
        crystal: 999,
        emerald: 999,
        ruby: 999,
      },
    });

    const currencies = [
      view.accountRow.coin,
      view.accountRow.crystal,
      view.accountRow.emerald,
      view.accountRow.ruby,
    ];
    expect(currencies[0].scale.x).toBeLessThan(1);
    for (let index = 1; index < currencies.length; index += 1) {
      const previous = currencies[index - 1];
      expect(
        currencies[index].x -
          previous.x -
          previous.measuredWidth * previous.scale.x,
      ).toBeGreaterThanOrEqual(4);
    }
    expect(
      view.accountRow.ruby.x +
        view.accountRow.ruby.measuredWidth *
          view.accountRow.ruby.scale.x,
    ).toBeCloseTo(view.accountRow.button.x - 8);

    view.destroy();
  });

  it('opens the full account panel with the exact rigid scale motion', () => {
    const motionRuntime = createMotionRuntime();
    const playOpenSound = vi.fn();
    const view = new PixiFreshStartChoiceView({
      assets: createAssets(),
      motionRuntime,
      playOpenSound,
    });
    view.applyTheme(createPixiThemeSnapshot({ theme: 'midnight' }));
    view.layout({
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
      sourceScale: 3,
      sourceOffsetX: 0,
      stageLogicalWidth: 1080,
      dialogShift: 0,
    });
    const basePosition = {
      x: view.panel.position.x,
      y: view.panel.position.y,
    };

    view.activate();
    view.bind({
      connectEnabled: true,
      onConnect: vi.fn(),
      onStartFresh: vi.fn(),
    });

    expect(view.backdropAlpha).toBe(
      PIXI_ACCOUNT_DIALOG_BACKDROP.alpha,
    );
    expect(view.backdrop.alpha).toBe(1);
    expect(view.panel.alpha).toBe(1);
    expect(view.panel.pivot.x).toBe(view.panel.outerWidth / 2);
    expect(view.panel.pivot.y).toBe(view.panel.outerHeight / 2);
    expect(view.panel.scale.x).toBe(
      PIXI_ACCOUNT_DIALOG_OPEN_MOTION.startScale,
    );
    expect(view.panel.position).toMatchObject(basePosition);
    expect(playOpenSound).toHaveBeenCalledOnce();

    motionRuntime.advance(
      PIXI_ACCOUNT_DIALOG_OPEN_MOTION.durationMs *
        PIXI_ACCOUNT_DIALOG_OPEN_MOTION.overshootProgress,
    );

    expect(view.backdrop.alpha).toBe(1);
    expect(view.panel.alpha).toBe(1);
    expect(view.panel.scale.x).toBeCloseTo(
      PIXI_ACCOUNT_DIALOG_OPEN_MOTION.overshootScale,
      8,
    );
    expect(view.panel.position).toMatchObject(basePosition);

    motionRuntime.advance(
      PIXI_ACCOUNT_DIALOG_OPEN_MOTION.durationMs *
        (1 - PIXI_ACCOUNT_DIALOG_OPEN_MOTION.overshootProgress),
    );

    expect(view.panel.scale.x).toBe(1);
    expect(view.panel.scale.y).toBe(1);
    expect(view.panel.position).toMatchObject(basePosition);

    view.destroy();
  });

  it('samples the requested cubic and back easing formulas exactly', () => {
    const firstSegmentMidpoint =
      PIXI_ACCOUNT_DIALOG_OPEN_MOTION.overshootProgress / 2;
    const secondSegmentMidpoint =
      PIXI_ACCOUNT_DIALOG_OPEN_MOTION.overshootProgress +
      (1 - PIXI_ACCOUNT_DIALOG_OPEN_MOTION.overshootProgress) / 2;
    const easeOutCubicAtHalf = 1 - (1 - 0.5) ** 3;
    const shiftedHalf = 0.5 - 1;
    const easeOutBackAtHalf =
      1 +
      2.36 * shiftedHalf ** 3 +
      1.36 * shiftedHalf ** 2;

    expect(
      sampleAccountDialogOpenScale(firstSegmentMidpoint),
    ).toBeCloseTo(
      0.94 + (1.045 - 0.94) * easeOutCubicAtHalf,
      12,
    );
    expect(
      sampleAccountDialogOpenScale(secondSegmentMidpoint),
    ).toBeCloseTo(
      1.045 + (1 - 1.045) * easeOutBackAtHalf,
      12,
    );
  });

  it('restarts an active account open motion from 0.94 without animating close', () => {
    const motionRuntime = createMotionRuntime();
    const playOpenSound = vi.fn();
    const view = new PixiFreshStartChoiceView({
      assets: createAssets(),
      motionRuntime,
      playOpenSound,
    });
    view.applyTheme(createPixiThemeSnapshot({ theme: 'midnight' }));
    view.layout({
      sourceWidth: 360,
      sourceHeight: 2170 / 3,
      sourceScale: 3,
      sourceOffsetX: 0,
      stageLogicalWidth: 1080,
      dialogShift: 0,
    });
    view.activate();
    view.bind({ connectEnabled: true });
    motionRuntime.advance(36);

    view.hide();

    expect(view.panel.scale.x).toBe(1);
    expect(view.root.visible).toBe(false);

    view.show();

    expect(view.panel.scale.x).toBe(
      PIXI_ACCOUNT_DIALOG_OPEN_MOTION.startScale,
    );
    expect(view.panel.alpha).toBe(1);
    expect(view.backdrop.alpha).toBe(1);
    expect(playOpenSound).toHaveBeenCalledTimes(2);

    view.destroy();
  });

  it('settles the account dialog immediately under reduced motion', () => {
    const motionRuntime = createMotionRuntime({
      reducedMotion: true,
    });
    const playOpenSound = vi.fn();
    const view = new PixiFreshStartChoiceView({
      assets: createAssets(),
      motionRuntime,
      playOpenSound,
    });

    view.activate();
    view.bind({ connectEnabled: true });

    expect(motionRuntime.requestFrame).not.toHaveBeenCalled();
    expect(playOpenSound).not.toHaveBeenCalled();
    expect(view.backdrop.alpha).toBe(1);
    expect(view.panel.alpha).toBe(1);
    expect(view.panel.scale.x).toBe(1);
    expect(view.panel.scale.y).toBe(1);

    view.destroy();
  });

  it('projects online states into one retained gate view', () => {
    const view = createView();
    const controller = new PixiOnlineGateController();
    controller.attach(view);

    controller.showConnecting();
    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'splash',
      message: 'Loading game',
      progress: true,
    });

    controller.showMaintenance({ mode: 'locked', message: 'back soon' });
    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'dialog',
      title: 'Maintenance',
      message: 'Back soon',
      progress: false,
    });

    controller.showMaintenance({
      mode: 'drain',
      message: 'brief account maintenance',
    });
    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'dialog',
      title: 'Maintenance',
      message: 'Brief account maintenance. Progress is saved.',
      progress: false,
    });

    controller.showMaintenance({
      mode: 'drain',
      message: 'account migration in progress',
      saving: true,
    });
    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'dialog',
      title: 'Maintenance',
      message: 'Account migration in progress. Saving progress...',
      progress: true,
    });

    controller.showOffline('bindings_missing');
    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'splash',
      message: 'Loading game',
      progress: true,
    });

    controller.showOffline('account_in_use');
    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'dialog',
      title: 'Account in Use',
      message: 'Account opened on another device. Close this one to continue there.',
      progress: false,
      actionLabel: 'Play Here',
      onAction: expect.any(Function),
    });
  });

  it('can preserve completed startup progress while backend loading continues', () => {
    const application = {
      ticker: { add: vi.fn(), remove: vi.fn() },
    };
    const view = new PixiOnlineGateView({
      application,
      assets: createAssets(),
    });
    const controller = new PixiOnlineGateController();
    controller.attach(view);
    view.activate();
    application.ticker.add.mockClear();

    controller.showConnecting({ progressValue: 1 });

    expect(view.splashProgressValue).toBe(1);
    expect(view.splash.progressValue).toBe(1);
    expect(application.ticker.add).not.toHaveBeenCalled();
    view.destroy();
  });

  it('fits the splash to the authored game width and clips vertical overflow', () => {
    const onSplashViewportChange = vi.fn();
    const view = new PixiOnlineGateView({
      assets: createAssets(),
      onSplashViewportChange,
    });
    const sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;

    view.applyTheme(createPixiThemeSnapshot({ theme: 'midnight' }));
    view.layout({
      viewportPx: { width: 390, height: 844 },
      sourceHeight,
      sourceOffsetX: 0,
      sourceScale: 3,
      stageLogicalWidth: PIXI_UI_GEOMETRY.authoredWidth,
      dialogShift: 0,
    });
    view.bind({
      presentation: 'splash',
      message: 'Loading game',
      progress: true,
    });

    expect(onSplashViewportChange).toHaveBeenLastCalledWith(true);
    expect(view.panel.visible).toBe(false);
    expect(view.splash).toBeInstanceOf(PixiLoadingSplash);
    expect(view.splash.visible).toBe(true);
    expect(view.splash.art.width).toBe(PIXI_UI_GEOMETRY.sourceWidth);
    expect(view.splash.art.height).toBeCloseTo(
      PIXI_UI_GEOMETRY.sourceWidth / (818 / 1923),
      5,
    );
    expect(view.splash.art.height).toBeGreaterThan(sourceHeight);
    expect(view.splash.art.x).toBe(PIXI_UI_GEOMETRY.sourceWidth / 2);
    expect(view.splash.art.y).toBe(0);
    expect(view.splash.loadingLabel.text).toBe('Loading game');
    expect(view.splash.loadingLabel.x).toBe(
      PIXI_UI_GEOMETRY.sourceWidth / 2,
    );

    view.tick(1620);
    expect(view.splashProgressValue).toBeCloseTo(0.72, 5);
    view.tick(1380);
    expect(view.splashProgressValue).toBe(1);

    view.hide();
    expect(onSplashViewportChange).toHaveBeenLastCalledWith(false);
    view.destroy();
  });

  it('uses the source splash progress keyframes', () => {
    expect(sampleSplashProgress(0)).toBe(0);
    expect(sampleSplashProgress(0.54)).toBe(0.72);
    expect(sampleSplashProgress(0.82)).toBe(0.92);
    expect(sampleSplashProgress(1)).toBe(1);
  });

  it('uses exact native progress for a live-update splash', () => {
    const application = {
      ticker: { add: vi.fn(), remove: vi.fn() },
    };
    const view = new PixiOnlineGateView({
      application,
      assets: createAssets(),
      modalId: 'gate.liveUpdate',
      label: 'liveUpdate',
    });

    view.activate();
    application.ticker.add.mockClear();
    view.bind({
      presentation: 'splash',
      message: 'Updating 6.0 MB / 24.0 MB',
      progressValue: 0.25,
    });

    expect(view.splashProgressValue).toBe(0.25);
    expect(view.splash.loadingLabel.text).toBe('Updating 6.0 MB / 24.0 MB');
    expect(application.ticker.add).not.toHaveBeenCalled();
    view.destroy();
  });

  it('projects mandatory update states through the shared gate view', () => {
    const view = createView();
    const controller = new PixiLiveUpdateController();
    const onUpdate = vi.fn();
    controller.attach(view);

    controller.showAvailable({
      size: 24 * 1024 * 1024,
      version: '0.4.0',
      onUpdate,
    });
    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'dialog',
      title: 'Update Ready',
      message: 'Version 0.4.0 is ready. Download size: 24.0 MB.',
      progress: false,
      actionLabel: 'Update Game',
      actionVariant: 'green',
      onAction: onUpdate,
    });

    controller.showDownloading({
      downloadedBytes: 6 * 1024 * 1024,
      totalBytes: 24 * 1024 * 1024,
      progress: 0.25,
    });
    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'splash',
      message: 'Updating 6.0 MB / 24.0 MB',
      progress: true,
      progressValue: 0.25,
    });
    expect(formatMegabytes(10.5 * 1024 * 1024)).toBe('10.5 MB');
  });

  it('keeps the deploy-refresh gate at a fixed height with centered copy', () => {
    const view = new PixiDeployRefreshView({
      assets: createAssets(),
    });

    view.bind({});

    expect(view.panel.titleLabel.text).toBe('New Version');
    expect(view.message.text).toBe('Refreshing...');
    expect(view.panel.contentBoxHeight).toBe(80);
    expect(view.message.align).toBe('center');
    expect(view.message.textObject.anchor.x).toBe(0.5);
    expect(view.message.textObject.anchor.y).toBe(0.5);
    expect(view.message.x).toBe(view.panel.contentBoxWidth / 2);
    expect(view.message.y).toBe(view.panel.contentBoxHeight / 2);

    view.destroy();
  });

  it('keeps gradient fills on splash and dialog loading rails', () => {
    const view = new PixiOnlineGateView({
      assets: createAssets(),
    });

    view.applyTheme(
      createPixiThemeSnapshot({
        theme: 'midnight',
        progressBar: 'gradient',
      }),
    );

    expect(view.progress.theme.progress.key).toBe('gradient');
    expect(view.progress.gradient).not.toBeNull();
    expect(view.splash.progressGradient).not.toBeNull();

    view.destroy();
  });

  it('holds the connecting state for deterministic visual previews', () => {
    const view = createView();
    const controller = new PixiOnlineGateController();
    controller.attach(view);

    controller.showConnecting({ preview: true });
    controller.showOffline('server_paused');
    controller.hide();

    expect(view.bind).toHaveBeenLastCalledWith({
      presentation: 'splash',
      message: 'Loading game',
      progress: true,
    });
    expect(view.hide).not.toHaveBeenCalled();

    controller.unmount();
    expect(view.hide).toHaveBeenCalledTimes(1);
  });

  it('keeps account-in-use copy and the current action skin inside the padded dialog', () => {
    const onAction = vi.fn();
    const view = new PixiOnlineGateView({
      assets: createAssets(),
    });

    view.bind({
      presentation: 'dialog',
      title: 'Account in Use',
      message: 'Account opened on another device. Close this one to continue there.',
      actionLabel: 'Play Here',
      onAction,
    });

    expect(view.message.wordWrap).toBe(true);
    expect(view.message.wrapWidth).toBe(260);
    expect(view.message.align).toBe('center');
    expect(view.message.textObject.anchor.x).toBe(0.5);
    expect(view.message.x).toBe(view.panel.contentBoxWidth / 2);
    expect(view.message.y).toBeGreaterThan(4);
    expect(
      view.message.y + view.message.measuredHeight / 2,
    ).toBeCloseTo(view.action.y / 2, 5);
    expect(view.message.measuredWidth).toBeLessThanOrEqual(260);
    expect(view.action.variant).toBe('yellow');
    expect(view.action.buttonWidth).toBe(260);
    expect(view.panel.contentBoxWidth).toBe(260);
    expect(view.panel.contentBoxHeight).toBe(96);
    expect(view.panel.contentInsets).toEqual({
      top: PIXI_UI_GEOMETRY.dialogPadding,
      right: PIXI_UI_GEOMETRY.dialogPadding,
      bottom: PIXI_UI_GEOMETRY.dialogPadding,
      left: PIXI_UI_GEOMETRY.dialogPadding,
    });
    expect(view.panel.coreWidth).toBe(
      260 + PIXI_UI_GEOMETRY.dialogPadding * 2,
    );
    expect(view.panel.content.x).toBe(PIXI_UI_GEOMETRY.dialogPadding);
    expect(view.panel.content.y).toBe(PIXI_UI_GEOMETRY.dialogPadding);
    expect(view.action.y).toBeGreaterThanOrEqual(
      view.message.y + view.message.measuredHeight + 12,
    );
    expect(view.action.y + view.action.buttonHeight).toBe(
      view.panel.contentBoxHeight,
    );

    view.action.activate();
    expect(onAction).toHaveBeenCalledOnce();

    view.destroy();
  });

  it('resolves account and fresh-start choices through retained callbacks', async () => {
    const accountView = createView();
    const account = new PixiAccountLinkChoiceController();
    account.attach(accountView);
    const accountChoice = account.choose({
      deviceSave: {
        tasks: { currentLevel: 3 },
        coin: { current: 4 },
        crystal: { current: 5 },
      },
      accountSave: null,
      accountUsername: 'Mira',
    });
    accountView.bind.mock.calls.at(-1)[0].onSelectDevice();
    await expect(accountChoice).resolves.toBe(
      ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT,
    );

    const freshView = createView();
    const fresh = new PixiFreshStartChoiceController();
    fresh.attach(freshView);
    const freshChoice = fresh.choose({
      authSnapshot: { oidc: { enabled: true } },
    });
    freshView.bind.mock.calls.at(-1)[0].onConnect();
    await expect(freshChoice).resolves.toBe(
      FRESH_START_CHOICE_CONNECT_ACCOUNT,
    );
  });

  it('holds the dev account preview through startup hides until it is selected', async () => {
    const view = createView();
    const controller = new PixiFreshStartChoiceController();
    controller.attach(view);
    const choice = controller.choose({
      authSnapshot: { oidc: { enabled: true } },
      preview: true,
    });

    expect(controller.hide()).toBe(false);
    expect(view.hide).not.toHaveBeenCalled();

    view.bind.mock.calls.at(-1)[0].onStartFresh();

    await expect(choice).resolves.toBe(
      FRESH_START_CHOICE_START_FRESH,
    );
    expect(view.hide).toHaveBeenCalledOnce();
  });

  it('projects structured save and account identity data into the choice view', () => {
    const view = createView();
    const controller = new PixiAccountLinkChoiceController();
    controller.attach(view);

    void controller.choose({
      deviceSave: {
        tasks: { currentLevel: 3 },
        coin: { current: 4 },
        crystal: { current: 5 },
        emerald: { current: 6 },
        ruby: { current: 7 },
      },
      accountSave: {
        tasks: { currentLevel: 6 },
        coin: { current: 7 },
        crystal: { current: 8 },
        emerald: { current: 9 },
        ruby: { current: 10 },
      },
      accountProfile: {
        username: 'Mira',
        character: 'elara',
        frame: 'violet',
      },
    });

    expect(view.bind).toHaveBeenLastCalledWith({
      deviceSummary:
        'Level 3, 4 Coin, 5 Crystal, 6 Emerald, 7 Ruby',
      accountSummary:
        'Mira, Level 6, 7 Coin, 8 Crystal, 9 Emerald, 10 Ruby',
      device: {
        level: 3,
        coin: 4,
        crystal: 5,
        emerald: 6,
        ruby: 7,
      },
      account: {
        username: 'Mira',
        character: 'elara',
        frame: 'violet',
        level: 6,
        coin: 7,
        crystal: 8,
        emerald: 9,
        ruby: 10,
      },
      onSelectDevice: expect.any(Function),
      onSelectAccount: expect.any(Function),
    });
  });

  it('projects default account visuals when character options are empty', () => {
    const view = createView();
    const controller = new PixiAccountLinkChoiceController();
    controller.attach(view);

    void controller.choose({
      accountProfile: {
        username: 'Mira',
        character: '',
        frame: '',
      },
    });

    expect(view.bind.mock.calls.at(-1)[0].account).toMatchObject({
      username: 'Mira',
      character: 'elara',
      frame: 'classic',
    });
  });

  it('shows the deploy lock at a safe refresh point and saves first', async () => {
    const events = [];
    const view = createView();
    const windowRef = createWindowRef();
    const controller = new PixiDeployRefreshController({
      enabled: true,
      currentVersion: 'old',
      fetchVersion: vi.fn().mockResolvedValue({ version: 'new' }),
      beforeReload: vi.fn(async () => events.push('save')),
      reload: () => events.push('reload'),
      reloadDelayMs: 0,
      windowRef,
      documentRef: createDocumentRef(),
    });
    controller.attach(view);

    await controller.checkNow({ allowReload: true });
    await flushAsyncWork();

    expect(view.bind).toHaveBeenCalledWith({
      title: 'New Version',
      message: 'Refreshing...',
    });
    expect(events).toEqual(['save', 'reload']);
  });

  it('keeps a newer deploy pending after a brief tab switch', async () => {
    let nowMs = 1_000;
    const events = [];
    const view = createView();
    const documentRef = createDocumentRef();
    const controller = new PixiDeployRefreshController({
      enabled: true,
      currentVersion: 'old',
      fetchVersion: vi.fn().mockResolvedValue({ version: 'new' }),
      beforeReload: vi.fn(async () => events.push('save')),
      reload: () => events.push('reload'),
      reloadDelayMs: 0,
      now: () => nowMs,
      windowRef: createWindowRef(),
      documentRef,
    });
    controller.attach(view);

    documentRef.visibilityState = 'hidden';
    controller.handleVisibilityChange();
    nowMs += 1_000;
    documentRef.visibilityState = 'visible';
    controller.handleVisibilityChange();
    await flushAsyncWork();

    expect(controller.pendingVersion).toBe('new');
    expect(view.bind).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('refreshes a pending deploy after five minutes in the background', async () => {
    let nowMs = 1_000;
    const events = [];
    const view = createView();
    const documentRef = createDocumentRef();
    const controller = new PixiDeployRefreshController({
      enabled: true,
      currentVersion: 'old',
      fetchVersion: vi.fn().mockResolvedValue({ version: 'new' }),
      beforeReload: vi.fn(async () => events.push('save')),
      reload: () => events.push('reload'),
      reloadDelayMs: 0,
      now: () => nowMs,
      windowRef: createWindowRef(),
      documentRef,
    });
    controller.attach(view);

    await controller.checkNow();
    expect(controller.pendingVersion).toBe('new');
    expect(events).toEqual([]);

    documentRef.visibilityState = 'hidden';
    controller.handleVisibilityChange();
    nowMs += 300_000;
    documentRef.visibilityState = 'visible';
    controller.handleVisibilityChange();
    await flushAsyncWork();

    expect(view.bind).toHaveBeenCalledWith({
      title: 'New Version',
      message: 'Refreshing...',
    });
    expect(events).toEqual(['save', 'reload']);
  });

  it('retains a deploy-refresh preview requested before the view attaches', () => {
    const controller = new PixiDeployRefreshController();
    const view = createView();

    expect(controller.showPreview()).toEqual({ ok: true });
    controller.attach(view);

    expect(view.bind).toHaveBeenCalledWith({
      title: 'New Version',
      message: 'Refreshing...',
    });
  });
});

function createView() {
  return {
    root: {},
    bind: vi.fn(),
    hide: vi.fn(),
  };
}

function createWindowRef() {
  return {
    fetch: vi.fn(),
    location: { href: 'https://example.test/game/' },
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
    setTimeout: vi.fn((callback) => {
      callback();
      return 2;
    }),
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createMotionRuntime({ reducedMotion = false } = {}) {
  let currentTime = 0;
  let nextFrameId = 0;
  const callbacks = new Map();
  return {
    requestFrame: vi.fn((callback) => {
      const frameId = ++nextFrameId;
      callbacks.set(frameId, callback);
      return frameId;
    }),
    cancelFrame: vi.fn((frameId) => {
      callbacks.delete(frameId);
    }),
    now: () => currentTime,
    prefersReducedMotion: () => reducedMotion,
    advance(milliseconds) {
      currentTime += milliseconds;
      const scheduled = [...callbacks.values()];
      callbacks.clear();
      for (const callback of scheduled) {
        callback(currentTime);
      }
    },
  };
}

function createDocumentRef() {
  return {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

async function flushAsyncWork() {
  for (let index = 0; index < 4; index += 1) {
    await Promise.resolve();
  }
}

function createAssets() {
  return {
    loaded: true,
    getTexture: () => Texture.EMPTY,
    getAtlasTexture: () => Texture.EMPTY,
  };
}
