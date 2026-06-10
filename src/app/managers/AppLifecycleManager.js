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
    onlineGateManager,
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
    this.onlineGateManager = onlineGateManager;
    this.appThemeManager = appThemeManager;
    this.started = false;
    this.frameLoopStarted = false;
    this.stopping = false;
  }

  start() {
    if (this.started) {
      return;
    }

    const shell = this.shellManager.mount();
    this.appThemeManager?.mount(this.playerFacade);
    const stage = this.viewportFacade.mount(shell);
    this.onlineGateManager.mount(stage);
    this.onlineGateManager.showConnecting();

    this.ecsFacade.createWorld();
    this.gameplayFacade.initialize(this.ecsFacade);
    this.pagesFacade.mount(stage);
    this.renderFacade.mount(stage);
    this.started = true;
    this.stopping = false;
    void this.connectBackend();
  }

  async connectBackend() {
    try {
      await this.backendFacade.prepare();
      const result = await this.backendFacade.start({
        gameplayFacade: this.gameplayFacade,
        playerFacade: this.playerFacade,
        onOnline: () => this.handleOnline(),
        onOffline: ({ reason } = {}) => this.handleOffline(reason),
      });

      if (result?.ok === false) {
        this.handleOffline(result.reason);
      }
    } catch {
      this.handleOffline('connect_error');
    }
  }

  handleOnline() {
    if (!this.started || this.stopping) {
      return;
    }

    this.onlineGateManager.hide();
    this.startFrameLoop();
  }

  handleOffline(reason) {
    if (!this.started || this.stopping) {
      return;
    }

    this.stopFrameLoop();
    this.onlineGateManager.showOffline(reason);
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
    this.stopFrameLoop();
    this.backendFacade.stop();
    this.onlineGateManager.unmount();
    this.appThemeManager?.unmount();
    this.renderFacade.unmount();
    this.pagesFacade.unmount();
    this.gameplayFacade.shutdown();
    this.viewportFacade.unmount();
    this.ecsFacade.destroyWorld();
    this.shellManager.unmount();
    this.started = false;
    this.stopping = false;
  }
}
