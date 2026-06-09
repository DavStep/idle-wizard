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
  }) {
    this.shellManager = shellManager;
    this.viewportFacade = viewportFacade;
    this.renderFacade = renderFacade;
    this.pagesFacade = pagesFacade;
    this.ecsFacade = ecsFacade;
    this.gameplayFacade = gameplayFacade;
    this.backendFacade = backendFacade;
    this.playerFacade = playerFacade;
    this.started = false;
  }

  start() {
    if (this.started) {
      return;
    }

    const shell = this.shellManager.mount();
    const stage = this.viewportFacade.mount(shell);

    this.ecsFacade.createWorld();
    this.gameplayFacade.initialize(this.ecsFacade);
    this.pagesFacade.mount(stage);
    this.renderFacade.mount(stage);
    this.backendFacade.prepare();
    void this.backendFacade.start({
      gameplayFacade: this.gameplayFacade,
      playerFacade: this.playerFacade,
    });

    this.renderFacade.startFrameLoop((frame) => {
      this.ecsFacade.update(frame);
      this.gameplayFacade.afterUpdate(frame);
    });

    this.started = true;
  }

  stop() {
    if (!this.started) {
      return;
    }

    this.renderFacade.stopFrameLoop();
    this.backendFacade.stop();
    this.renderFacade.unmount();
    this.pagesFacade.unmount();
    this.gameplayFacade.shutdown();
    this.viewportFacade.unmount();
    this.ecsFacade.destroyWorld();
    this.shellManager.unmount();
    this.started = false;
  }
}
