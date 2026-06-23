import { DevCheatCommandManager } from './managers/DevCheatCommandManager.js';
import { DevCheatConsoleManager } from './managers/DevCheatConsoleManager.js';
import { QaDataFacade } from '../qaData/QaDataFacade.js';

export class DevCheatsFacade {
  static explain =
    'Dev cheats let testers change local game state quickly in development builds only.';

  constructor({ app, target = globalThis, logger = globalThis.console } = {}) {
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
  }

  mount() {
    this.consoleManager.mount();
  }

  unmount() {
    this.consoleManager.unmount();
  }
}
