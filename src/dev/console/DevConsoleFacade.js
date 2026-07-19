import './devConsole.css';

import { DevConsoleCommandManager } from './managers/DevConsoleCommandManager.js';
import { DevConsoleViewManager } from './managers/DevConsoleViewManager.js';

export class DevConsoleFacade {
  static explain =
    'The developer console is a development-only command drawer for running approved game test helpers without becoming part of the game UI.';

  constructor({ commandManager, target = globalThis, logger = globalThis.console } = {}) {
    this.target = target;
    this.logger = logger;
    this.commandManager = new DevConsoleCommandManager({ commandManager });
    this.viewManager = new DevConsoleViewManager({
      commandManager: this.commandManager,
      target,
    });
    this.previousApi = undefined;
    this.hadPreviousApi = false;
    this.mounted = false;
  }

  mount() {
    if (this.mounted || !this.target) {
      return;
    }

    this.hadPreviousApi = Object.prototype.hasOwnProperty.call(
      this.target,
      'devConsole',
    );
    this.previousApi = this.target.devConsole;
    this.target.devConsole = Object.freeze({
      open: () => this.open(),
      close: () => this.close(),
      toggle: () => this.toggle(),
      run: (command) => this.run(command),
    });
    this.viewManager.mount();
    this.mounted = true;
  }

  unmount() {
    if (!this.mounted || !this.target) {
      return;
    }

    this.viewManager.unmount();

    if (this.hadPreviousApi) {
      this.target.devConsole = this.previousApi;
    } else {
      delete this.target.devConsole;
    }

    this.mounted = false;
  }

  open() {
    const opened = this.viewManager.open();
    return { ok: opened, surfaceId: 'devConsole' };
  }

  close() {
    const closed = this.viewManager.close();
    return { ok: closed, surfaceId: 'devConsole' };
  }

  toggle() {
    return this.viewManager.isOpen() ? this.close() : this.open();
  }

  run(command) {
    return this.viewManager.executeCommand(command);
  }
}
