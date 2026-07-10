import { DevCheatCommandManager } from './managers/DevCheatCommandManager.js';
import { DevCheatConsoleManager } from './managers/DevCheatConsoleManager.js';
import { QaDataFacade } from '../qaData/QaDataFacade.js';

const DEV_UI_QUERY_KEYS = ['devUi', 'uiSurface'];
const DEV_UI_RETRY_MS = 250;
const DEV_UI_MAX_ATTEMPTS = 80;
const DEV_UI_BLOCKING_SELECTOR = [
  '.app-fresh-start-choice:not([hidden])',
  '.first-run-intro:not([hidden])',
  '.app-online-gate:not([hidden])',
].join(',');

export class DevCheatsFacade {
  static explain =
    'Dev cheats let testers change local game state quickly in development builds only.';

  constructor({ app, target = globalThis, logger = globalThis.console } = {}) {
    this.target = target;
    this.logger = logger;
    this.qaDataFacade = new QaDataFacade({
      gameplayFacade: app?.gameplayFacade,
    });
    this.commandManager = new DevCheatCommandManager({
      backendFacade: app?.backendFacade,
      gameplayFacade: app?.gameplayFacade,
      onlineGateManager: app?.onlineGateManager,
      pagesFacade: app?.pagesFacade,
      playerFacade: app?.playerFacade,
      qaDataFacade: this.qaDataFacade,
    });
    this.consoleManager = new DevCheatConsoleManager({
      commandManager: this.commandManager,
      target,
      logger,
    });
    this.devUiRequest = null;
    this.devUiTimer = null;
  }

  mount() {
    this.consoleManager.mount();
    this.mountRequestedUiSurface();
  }

  unmount() {
    this.clearDevUiTimer();
    this.consoleManager.unmount();
  }

  mountRequestedUiSurface() {
    const request = this.readRequestedUiSurface();

    if (!request) {
      return;
    }

    this.devUiRequest = {
      ...request,
      attempts: 0,
    };
    this.scheduleRequestedUiSurfaceOpen(0);
  }

  readRequestedUiSurface() {
    const location = this.target?.location ?? globalThis.location;

    if (!location) {
      return null;
    }

    const params = new URLSearchParams(location.search ?? '');
    const hashParams = new URLSearchParams(
      String(location.hash ?? '').replace(/^#/, ''),
    );

    for (const key of DEV_UI_QUERY_KEYS) {
      const surfaceId = params.get(key) ?? hashParams.get(key);

      if (surfaceId) {
        return { surfaceId };
      }
    }

    return null;
  }

  scheduleRequestedUiSurfaceOpen(delayMs = DEV_UI_RETRY_MS) {
    this.clearDevUiTimer();
    const setTimer = this.target?.setTimeout ?? globalThis.setTimeout;

    if (typeof setTimer !== 'function') {
      return;
    }

    this.devUiTimer = setTimer(() => this.tryOpenRequestedUiSurface(), delayMs);
  }

  tryOpenRequestedUiSurface() {
    this.devUiTimer = null;

    if (!this.devUiRequest) {
      return;
    }

    this.devUiRequest.attempts += 1;

    if (this.hasBlockingUiGate()) {
      this.retryRequestedUiSurfaceOpen();
      return;
    }

    let result;

    try {
      result = this.commandManager.openUi(this.devUiRequest.surfaceId);
    } catch (error) {
      result = {
        ok: false,
        reason: 'exception',
        message: String(error?.message ?? error),
      };
    }

    if (result.ok === false && this.shouldRetryUiSurfaceOpen(result)) {
      this.retryRequestedUiSurfaceOpen();
      return;
    }

    this.logger?.info?.('Dev UI surface request complete.', result);
    this.devUiRequest = null;
  }

  retryRequestedUiSurfaceOpen() {
    if (!this.devUiRequest || this.devUiRequest.attempts >= DEV_UI_MAX_ATTEMPTS) {
      this.logger?.warn?.('Dev UI surface request timed out.', this.devUiRequest);
      this.devUiRequest = null;
      return;
    }

    this.scheduleRequestedUiSurfaceOpen();
  }

  shouldRetryUiSurfaceOpen(result = {}) {
    return (
      result.reason === 'pages_missing' ||
      result.reason === 'pages_not_mounted' ||
      (result.reason === 'exception' &&
        /mounted stage|pages_not_mounted/i.test(result.message ?? ''))
    );
  }

  hasBlockingUiGate() {
    const document = this.target?.document ?? globalThis.document;

    return Boolean(document?.querySelector?.(DEV_UI_BLOCKING_SELECTOR));
  }

  clearDevUiTimer() {
    if (this.devUiTimer === null) {
      return;
    }

    const clearTimer = this.target?.clearTimeout ?? globalThis.clearTimeout;
    clearTimer?.(this.devUiTimer);
    this.devUiTimer = null;
  }
}
