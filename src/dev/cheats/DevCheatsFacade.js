import { DevCheatCommandManager } from './managers/DevCheatCommandManager.js';
import { DevCheatConsoleManager } from './managers/DevCheatConsoleManager.js';
import { QaDataFacade } from '../qaData/QaDataFacade.js';
import { DevConsoleFacade } from '../console/DevConsoleFacade.js';

const DEV_UI_QUERY_KEYS = ['devUi', 'uiSurface'];
const DEV_LEVEL_QUERY_KEY = 'devLevel';
const DEV_UI_RETRY_MS = 250;
const DEV_UI_MAX_ATTEMPTS = 80;
const DEV_UI_BLOCKING_SELECTOR = [
  '.app-fresh-start-choice:not([hidden])',
  '.first-run-intro:not([hidden])',
  '.app-online-gate:not([hidden])',
].join(',');
const DEV_LEVEL_BLOCKING_SELECTOR = [
  '.app-fresh-start-choice:not([hidden])',
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
    this.devConsoleFacade = new DevConsoleFacade({
      commandManager: this.commandManager,
      target,
      logger,
    });
    this.commandManager.setDevConsoleFacade(this.devConsoleFacade);
    this.consoleManager = new DevCheatConsoleManager({
      commandManager: this.commandManager,
      target,
      logger,
    });
    this.devUiRequest = null;
    this.devUiTimer = null;
    this.devLevelRequest = null;
    this.devLevelTimer = null;
  }

  mount() {
    this.consoleManager.mount();
    this.devConsoleFacade.mount();
    this.mountRequestedLevel();
    this.mountRequestedUiSurface();
  }

  unmount() {
    this.clearDevLevelTimer();
    this.clearDevUiTimer();
    this.devConsoleFacade.unmount();
    this.consoleManager.unmount();
  }

  mountRequestedLevel() {
    const level = this.readRequestedLevel();

    if (level === null) {
      return;
    }

    this.devLevelRequest = {
      level,
      attempts: 0,
    };
    this.scheduleRequestedLevelApply(0);
  }

  readRequestedLevel() {
    const location = this.target?.location ?? globalThis.location;

    if (!location) {
      return null;
    }

    const params = new URLSearchParams(location.search ?? '');
    const hashParams = new URLSearchParams(
      String(location.hash ?? '').replace(/^#/, ''),
    );
    const rawLevel = params.get(DEV_LEVEL_QUERY_KEY)
      ?? hashParams.get(DEV_LEVEL_QUERY_KEY);

    if (rawLevel === null) {
      return null;
    }

    const level = Number(rawLevel);

    if (!Number.isInteger(level) || level < 1) {
      this.logger?.warn?.('Ignored invalid dev level request.', { level: rawLevel });
      return null;
    }

    return level;
  }

  scheduleRequestedLevelApply(delayMs = DEV_UI_RETRY_MS) {
    this.clearDevLevelTimer();
    const setTimer = this.target?.setTimeout ?? globalThis.setTimeout;

    if (typeof setTimer !== 'function') {
      return;
    }

    this.devLevelTimer = setTimer(() => this.tryApplyRequestedLevel(), delayMs);
  }

  tryApplyRequestedLevel() {
    this.devLevelTimer = null;

    if (!this.devLevelRequest) {
      return;
    }

    this.devLevelRequest.attempts += 1;

    if (this.hasBlockingLevelGate()) {
      this.retryRequestedLevelApply();
      return;
    }

    const result = this.commandManager.setLevel(this.devLevelRequest.level);

    this.logger?.info?.('Dev level request complete.', result);
    this.devLevelRequest = null;
  }

  retryRequestedLevelApply() {
    if (
      !this.devLevelRequest
      || this.devLevelRequest.attempts >= DEV_UI_MAX_ATTEMPTS
    ) {
      this.logger?.warn?.('Dev level request timed out.', this.devLevelRequest);
      this.devLevelRequest = null;
      return;
    }

    this.scheduleRequestedLevelApply();
  }

  hasBlockingLevelGate() {
    const document = this.target?.document ?? globalThis.document;

    return Boolean(document?.querySelector?.(DEV_LEVEL_BLOCKING_SELECTOR));
  }

  clearDevLevelTimer() {
    if (this.devLevelTimer === null) {
      return;
    }

    const clearTimer = this.target?.clearTimeout ?? globalThis.clearTimeout;
    clearTimer?.(this.devLevelTimer);
    this.devLevelTimer = null;
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
