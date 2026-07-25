import { describe, expect, it, vi } from 'vitest';

import {
  ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT,
  FRESH_START_CHOICE_CONNECT_ACCOUNT,
  PixiAccountLinkChoiceController,
  PixiDeployRefreshController,
  PixiFreshStartChoiceController,
  PixiOnlineGateController,
} from './index.js';

describe('retained Pixi gate controllers', () => {
  it('projects online states into one retained gate view', () => {
    const view = createView();
    const controller = new PixiOnlineGateController();
    controller.attach(view);

    controller.showConnecting();
    expect(view.bind).toHaveBeenLastCalledWith({
      title: 'server required',
      message: 'connecting to server...',
      progress: true,
    });

    controller.showMaintenance({ mode: 'locked', message: 'back soon' });
    expect(view.bind).toHaveBeenLastCalledWith({
      title: 'maintenance',
      message: 'back soon',
      progress: false,
    });
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
