import { DevCheatCommandManager } from './managers/DevCheatCommandManager.js';
import { DevCheatConsoleManager } from './managers/DevCheatConsoleManager.js';

export class DevCheatsFacade {
  static explain =
    'Dev cheats let testers change local game state quickly in development builds only.';

  constructor({ app, target = globalThis, logger = globalThis.console } = {}) {
    this.commandManager = new DevCheatCommandManager({
      backendFacade: app?.backendFacade,
      gameplayFacade: app?.gameplayFacade,
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
