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
      addCoin: (amount) => run('addCoin', amount),
      addCrystal: (amount) => run('addCrystal', amount),
      addEmerald: (amount) => run('addEmerald', amount),
      addItem: (itemKeyOrId, quantity = 1) => run('addItem', itemKeyOrId, quantity),
      setProfile: (options) => run('setProfile', options),
      setInventoryPreset: (preset, options) => run('setInventoryPreset', preset, options),
      setNotifications: (notifications) => run('setNotifications', notifications),
      clearNotifications: () => run('clearNotifications'),
      setLevel: (level) => run('setLevel', level),
      setPrestigeStars: (stars) => run('setPrestigeStars', stars),
      getMarketLicence: () => run('getMarketLicence'),
      showPage: (pageId, options) => run('showPage', pageId, options),
      unlockFeature: (featureId) => run('unlockFeature', featureId),
      unlockAllFeatures: () => run('unlockAllFeatures'),
      completeResearch: (researchId) => run('completeResearch', researchId),
      unlockAllResearch: () => run('unlockAllResearch'),
      unlockSeed: (seedKey) => run('unlockSeed', seedKey),
      unlockRecipe: (potionKey) => run('unlockRecipe', potionKey),
      unlockPlots: (count) => run('unlockPlots', count),
      setPlot: (plotNumber, seedOrOptions, phase) =>
        run('setPlot', plotNumber, seedOrOptions, phase),
      setPlots: (plots) => run('setPlots', plots),
      unlockCauldrons: (count) => run('unlockCauldrons', count),
      setCauldron: (cauldronNumber, potionOrOptions, phase) =>
        run('setCauldron', cauldronNumber, potionOrOptions, phase),
      unlockTraderStands: (count) => run('unlockTraderStands', count),
      unlockPlayerStands: (count) => run('unlockPlayerStands', count),
      unlockMarketStands: (count) => run('unlockMarketStands', count),
      setMarketState: (preset, options) => run('setMarketState', preset, options),
      setWorldEventState: (preset, options) => run('setWorldEventState', preset, options),
      setGuildState: (preset, options) => run('setGuildState', preset, options),
      setBackendState: (state, options) => run('setBackendState', state, options),
      openDialog: (dialogId, options) => run('openDialog', dialogId, options),
      listUiSurfaces: () => run('listUiSurfaces'),
      openUi: (surfaceId, options) => run('openUi', surfaceId, options),
      setTimers: (preset, options) => run('setTimers', preset, options),
      setStressText: (options) => run('setStressText', options),
      setDummyLeaderboard: (options) => run('setDummyLeaderboard', options),
      clearDummyLeaderboard: () => run('clearDummyLeaderboard'),
      listTutorialStages: () => run('listTutorialStages'),
      listTutorialSteps: () => run('listTutorialSteps'),
      getTutorialGraph: () => run('getTutorialGraph'),
      loadTutorialStep: (stepId, options) => run('loadTutorialStep', stepId, options),
      setTutorialStage: (stageId, options) => run('setTutorialStage', stageId, options),
      resetData: (confirmation) => run('resetData', confirmation),
      listDataTemplates: () => run('listDataTemplates'),
      loadDataTemplate: (templateIdOrAlias, options) =>
        run('loadDataTemplate', templateIdOrAlias, options),
      listItems: () => run('listItems'),
      listResearch: () => run('listResearch'),
    });
  }
}
