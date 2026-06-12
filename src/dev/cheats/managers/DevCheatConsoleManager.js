export class DevCheatConsoleManager {
  constructor({
    commandManager,
    target = globalThis,
    logger = globalThis.console,
    apiName = 'cheats',
    runnerName = 'cheat',
  } = {}) {
    this.commandManager = commandManager;
    this.target = target;
    this.logger = logger;
    this.apiName = apiName;
    this.runnerName = runnerName;
    this.previousApi = undefined;
    this.previousRunner = undefined;
    this.hadPreviousApi = false;
    this.hadPreviousRunner = false;
    this.mounted = false;
  }

  mount() {
    if (this.mounted || !this.target) {
      return;
    }

    this.hadPreviousApi = Object.prototype.hasOwnProperty.call(this.target, this.apiName);
    this.hadPreviousRunner = Object.prototype.hasOwnProperty.call(this.target, this.runnerName);
    this.previousApi = this.target[this.apiName];
    this.previousRunner = this.target[this.runnerName];
    this.target[this.apiName] = this.createApi();
    this.target[this.runnerName] = (command, ...args) =>
      this.commandManager.run(command, ...args);
    this.mounted = true;
    this.logger?.info?.('Dev cheats enabled. Run cheats.help().');
  }

  unmount() {
    if (!this.mounted || !this.target) {
      return;
    }

    if (this.hadPreviousApi) {
      this.target[this.apiName] = this.previousApi;
    } else {
      delete this.target[this.apiName];
    }

    if (this.hadPreviousRunner) {
      this.target[this.runnerName] = this.previousRunner;
    } else {
      delete this.target[this.runnerName];
    }

    this.mounted = false;
  }

  createApi() {
    const run = (command, ...args) => this.commandManager.run(command, ...args);

    return Object.freeze({
      run,
      help: () => run('help'),
      snapshot: () => run('snapshot'),
      fillMana: () => run('fillMana'),
      addMana: (amount) => run('addMana', amount),
      setMana: (amount) => run('setMana', amount),
      addGold: (amount) => run('addGold', amount),
      addCrystal: (amount) => run('addCrystal', amount),
      addItem: (itemKeyOrId, quantity = 1) => run('addItem', itemKeyOrId, quantity),
      completeResearch: (researchId) => run('completeResearch', researchId),
      unlockSeed: (seedKey) => run('unlockSeed', seedKey),
      unlockRecipe: (potionKey) => run('unlockRecipe', potionKey),
      resetData: (confirmation) => run('resetData', confirmation),
      listItems: () => run('listItems'),
      listResearch: () => run('listResearch'),
    });
  }
}
