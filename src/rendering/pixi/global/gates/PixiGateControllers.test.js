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
  PixiAccountLinkChoiceView,
  PixiAccountLinkChoiceController,
  PixiDeployRefreshView,
  PixiDeployRefreshController,
  PixiFreshStartChoiceView,
  PixiFreshStartChoiceController,
  PixiOnlineGateView,
  PixiOnlineGateController,
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

  it('projects online states into one retained gate view', () => {
    const view = createView();
    const controller = new PixiOnlineGateController();
    controller.attach(view);

    controller.showConnecting();
    expect(view.bind).toHaveBeenLastCalledWith({
      title: 'Server Required',
      message: 'Connecting to server...',
      progress: true,
    });

    controller.showMaintenance({ mode: 'locked', message: 'back soon' });
    expect(view.bind).toHaveBeenLastCalledWith({
      title: 'maintenance',
      message: 'back soon',
      progress: false,
    });
  });

  it('centers the connecting message inside a taller online gate', () => {
    const view = new PixiOnlineGateView({
      assets: createAssets(),
    });

    view.bind({
      title: 'Server Required',
      message: 'Connecting to server...',
      progress: true,
    });

    expect(view.panel.contentBoxHeight).toBe(80);
    expect(
      view.message.y + view.message.measuredHeight / 2,
    ).toBe(view.panel.contentBoxHeight / 2);
    expect(view.progress.y + view.progress.barHeight).toBe(
      view.panel.contentBoxHeight,
    );

    view.destroy();
  });

  it('keeps the selected gradient on the connection and loading rail', () => {
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
      title: 'Server Required',
      message: 'Connecting to server...',
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
      title: 'Server Required',
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
      title: 'new version',
      message: 'refreshing...',
    });
    expect(events).toEqual(['save', 'reload']);
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
