import { AppConnectionRetryManager } from './AppConnectionRetryManager.js';
import {
  ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT,
  AppAccountLinkChoiceManager,
} from './AppAccountLinkChoiceManager.js';

export class AppLifecycleManager {
  constructor({
    shellManager,
    viewportFacade,
    renderFacade,
    pagesFacade,
    ecsFacade,
    gameplayFacade,
    backendFacade,
    playerFacade,
    maintenanceFacade,
    onlineGateManager,
    accountLinkChoiceManager = new AppAccountLinkChoiceManager(),
    connectionRetryManager = new AppConnectionRetryManager(),
    deployRefreshManager,
    appThemeManager,
  }) {
    this.shellManager = shellManager;
    this.viewportFacade = viewportFacade;
    this.renderFacade = renderFacade;
    this.pagesFacade = pagesFacade;
    this.ecsFacade = ecsFacade;
    this.gameplayFacade = gameplayFacade;
    this.backendFacade = backendFacade;
    this.playerFacade = playerFacade;
    this.maintenanceFacade = maintenanceFacade;
    this.onlineGateManager = onlineGateManager;
    this.accountLinkChoiceManager = accountLinkChoiceManager;
    this.connectionRetryManager = connectionRetryManager;
    this.deployRefreshManager = deployRefreshManager;
    this.appThemeManager = appThemeManager;
    this.started = false;
    this.frameLoopStarted = false;
    this.stopping = false;
    this.backendConnecting = false;
    this.backendConnectAttempt = 0;
    this.backendOnline = false;
    this.maintenanceUnsubscribe = null;
    this.maintenanceSnapshot = this.normalizeMaintenanceSnapshot(
      maintenanceFacade?.getSnapshot?.(),
    );
    this.maintenanceFlushPromise = null;
    this.maintenanceFlushKey = '';
  }

  start() {
    if (this.started) {
      return;
    }

    const shell = this.shellManager.mount();
    this.appThemeManager?.mount(this.playerFacade);
    const stage = this.viewportFacade.mount(shell);
    this.onlineGateManager.mount(stage);
    this.accountLinkChoiceManager.mount(stage);
    this.deployRefreshManager?.mount(stage);
    this.onlineGateManager.showConnecting();
    this.maintenanceUnsubscribe = this.maintenanceFacade?.subscribe?.((snapshot) => {
      this.handleMaintenanceChange(snapshot);
    }) ?? null;
    this.connectionRetryManager.reset();

    this.ecsFacade.createWorld();
    this.gameplayFacade.initialize(this.ecsFacade);
    this.pagesFacade.mount(stage);
    this.renderFacade.mount(stage);
    this.started = true;
    this.stopping = false;
    void this.connectBackend();
  }

  async connectBackend() {
    if (!this.started || this.stopping || this.backendConnecting) {
      return;
    }

    const attempt = this.backendConnectAttempt + 1;
    this.backendConnectAttempt = attempt;
    this.backendConnecting = true;

    try {
      await this.backendFacade.prepare();
      if (!this.isCurrentBackendAttempt(attempt)) {
        return;
      }

      const result = await this.backendFacade.start({
        gameplayFacade: this.gameplayFacade,
        playerFacade: this.playerFacade,
        onGameplaySaveReady: (snapshot) => {
          if (this.isCurrentBackendAttempt(attempt)) {
            return this.handleGameplaySaveReady(snapshot);
          }

          return undefined;
        },
        onOnline: () => {
          if (this.isCurrentBackendAttempt(attempt)) {
            this.handleOnline();
          }
        },
        onOffline: ({ reason } = {}) => {
          if (this.isCurrentBackendAttempt(attempt)) {
            this.handleOffline(reason);
          }
        },
      });

      if (!this.isCurrentBackendAttempt(attempt)) {
        return;
      }

      if (result?.ok === false) {
        this.handleOffline(result.reason);
      }
    } catch {
      if (this.isCurrentBackendAttempt(attempt)) {
        this.handleOffline('connect_error');
      }
    } finally {
      if (this.isCurrentBackendAttempt(attempt)) {
        this.backendConnecting = false;
      }
    }
  }

  async handleGameplaySaveReady({ save } = {}) {
    const accountLinkSave = this.getPendingAccountLinkSave();

    if (accountLinkSave && this.isAuthenticatedAccount()) {
      this.onlineGateManager.hide();

      if (!save) {
        this.clearPendingAccountLinkSave();
        this.loadGameplaySave(accountLinkSave, { persistLoaded: true });
        return;
      }

      const choice = await this.accountLinkChoiceManager.choose({
        deviceSave: accountLinkSave,
        accountSave: save,
      });
      this.clearPendingAccountLinkSave();

      if (choice === ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT) {
        this.loadGameplaySave(accountLinkSave, { persistLoaded: true });
        return;
      }

      this.loadGameplaySave(save, { persistLoaded: true });
      return;
    }

    this.loadGameplaySave(save);
  }

  loadGameplaySave(save, { persistLoaded = false } = {}) {
    const loaded = this.gameplayFacade.loadPersistenceSave(save, this.ecsFacade);

    if (!loaded || persistLoaded) {
      this.gameplayFacade.savePersistenceSnapshot();
    }
  }

  getPendingAccountLinkSave() {
    return this.backendFacade
      .getAuthFacade?.()
      ?.getPendingAccountLinkSave?.() ?? null;
  }

  clearPendingAccountLinkSave() {
    this.backendFacade.getAuthFacade?.()?.clearPendingAccountLinkSave?.();
  }

  isAuthenticatedAccount() {
    return Boolean(this.backendFacade.getAuthFacade?.()?.getSnapshot?.()?.oidc?.authenticated);
  }

  handleOnline() {
    if (!this.started || this.stopping) {
      return;
    }

    this.backendOnline = true;
    this.connectionRetryManager.reset();
    this.applyMaintenanceState();
  }

  handleOffline(reason) {
    if (!this.started || this.stopping) {
      return;
    }

    this.backendOnline = false;
    this.stopFrameLoop();

    if (this.isMaintenanceActive()) {
      this.onlineGateManager.showMaintenance(this.maintenanceSnapshot);

      if (this.isTransientOfflineReason(reason)) {
        this.scheduleBackendReconnect();
      } else {
        this.connectionRetryManager.clear();
      }

      return;
    }

    if (this.isTransientOfflineReason(reason)) {
      this.onlineGateManager.showConnecting();
      this.scheduleBackendReconnect();
      return;
    }

    this.connectionRetryManager.clear();
    this.onlineGateManager.showOffline(reason);
  }

  scheduleBackendReconnect() {
    this.connectionRetryManager.schedule(() => {
      void this.connectBackend();
    });
  }

  isTransientOfflineReason(reason) {
    return (
      reason === 'connect_error' ||
      reason === 'disconnect' ||
      reason === 'gameplay_save_timeout'
    );
  }

  isCurrentBackendAttempt(attempt) {
    return this.started && !this.stopping && this.backendConnectAttempt === attempt;
  }

  handleMaintenanceChange(snapshot) {
    this.maintenanceSnapshot = this.normalizeMaintenanceSnapshot(snapshot);
    this.applyMaintenanceState();
  }

  applyMaintenanceState() {
    if (!this.started || this.stopping) {
      return;
    }

    if (this.isMaintenanceActive()) {
      this.stopFrameLoop();

      if (this.maintenanceSnapshot.mode === 'drain' && this.backendOnline) {
        this.startMaintenanceDrainSave();
        return;
      }

      this.onlineGateManager.showMaintenance(this.maintenanceSnapshot);
      return;
    }

    this.maintenanceFlushPromise = null;
    this.maintenanceFlushKey = '';

    if (this.backendOnline) {
      this.onlineGateManager.hide();
      this.startFrameLoop();
    }
  }

  startMaintenanceDrainSave() {
    const flushKey = [
      this.maintenanceSnapshot.mode,
      this.maintenanceSnapshot.updatedAtMs,
      this.maintenanceSnapshot.message,
    ].join(':');

    if (this.maintenanceFlushPromise || this.maintenanceFlushKey === flushKey) {
      this.onlineGateManager.showMaintenance({
        ...this.maintenanceSnapshot,
        saving: Boolean(this.maintenanceFlushPromise),
      });
      return;
    }

    this.maintenanceFlushKey = flushKey;
    this.onlineGateManager.showMaintenance({
      ...this.maintenanceSnapshot,
      saving: true,
    });

    this.maintenanceFlushPromise = Promise.resolve(
      this.gameplayFacade.savePersistenceSnapshotAndFlush?.(),
    )
      .catch(() => false)
      .then(() => {
        this.maintenanceFlushPromise = null;

        if (!this.isMaintenanceActive() || this.maintenanceSnapshot.mode !== 'drain') {
          this.applyMaintenanceState();
          return;
        }

        this.onlineGateManager.showMaintenance(this.maintenanceSnapshot);
      });
  }

  isMaintenanceActive() {
    return this.maintenanceSnapshot.active;
  }

  normalizeMaintenanceSnapshot(snapshot = {}) {
    const mode = ['drain', 'locked'].includes(snapshot?.mode) ? snapshot.mode : 'off';

    return {
      mode,
      message: String(snapshot?.message || 'maintenance in progress').trim(),
      active: mode !== 'off',
      updatedAtMs: Number.isFinite(snapshot?.updatedAtMs) ? snapshot.updatedAtMs : 0,
    };
  }

  startFrameLoop() {
    if (this.frameLoopStarted) {
      return;
    }

    this.renderFacade.startFrameLoop((frame) => {
      this.ecsFacade.update(frame);
      this.gameplayFacade.afterUpdate(frame);
    });
    this.frameLoopStarted = true;
  }

  stopFrameLoop() {
    if (!this.frameLoopStarted) {
      return;
    }

    this.renderFacade.stopFrameLoop();
    this.frameLoopStarted = false;
  }

  stop() {
    if (!this.started) {
      return;
    }

    this.stopping = true;
    this.backendConnectAttempt += 1;
    this.backendConnecting = false;
    this.backendOnline = false;
    this.maintenanceUnsubscribe?.();
    this.maintenanceUnsubscribe = null;
    this.connectionRetryManager.clear();
    this.stopFrameLoop();
    this.gameplayFacade.shutdown();
    this.backendFacade.stop();
    this.deployRefreshManager?.unmount();
    this.accountLinkChoiceManager.unmount();
    this.onlineGateManager.unmount();
    this.appThemeManager?.unmount();
    this.renderFacade.unmount();
    this.pagesFacade.unmount();
    this.viewportFacade.unmount();
    this.ecsFacade.destroyWorld();
    this.shellManager.unmount();
    this.started = false;
    this.stopping = false;
  }
}
