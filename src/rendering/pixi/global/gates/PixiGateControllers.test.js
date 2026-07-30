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
  PixiOnlineGateView,
  PixiOnlineGateController,
  sampleAccountDialogOpenScale,
  sampleSplashProgress,
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
      title: 'maintenance',
      message: 'back soon',
      progress: false,
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

  it('shows the copied full-height splash until the backend connects', () => {
    const onSplashViewportChange = vi.fn();
    const view = new PixiOnlineGateView({
      assets: createAssets(),
      onSplashViewportChange,
    });
    const sourceHeight = 2170 / 3;

    view.applyTheme(createPixiThemeSnapshot({ theme: 'midnight' }));
    view.layout({
      viewportPx: { width: 390, height: 844 },
      sourceHeight,
      sourceOffsetX: 0,
      sourceScale: 3,
      stageLogicalWidth: 1080,
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
    expect(view.splash.art.height).toBe(sourceHeight);
    expect(view.splash.art.width).toBeCloseTo(
      844 * (818 / 1923) * (360 / 390),
      5,
    );
    expect(view.splash.art.x).toBe(PIXI_UI_GEOMETRY.sourceWidth / 2);
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

  it('shows the deploy lock only after a confirmed newer version and saves first', async () => {
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

    await controller.checkNow();
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
  };
}
