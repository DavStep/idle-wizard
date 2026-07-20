import { GAMEPLAY_SAVE_VERSION } from '../../../gameplay/persistence/managers/GameplayMigrationManager.js';
import {
  capacityResearchIds,
  cauldronCapacityEndCauldronNumber,
  cauldronCapacityStartCauldronNumber,
  plotCapacityEndPlotNumber,
  plotCapacityStartPlotNumber,
} from '../../../gameplay/research/capacityResearchIds.js';
import { PAGE_UNLOCK_REQUIREMENTS } from '../../../pages/managers/PageUnlockManager.js';
import {
  TUTORIAL_STEP_IDS,
  getTutorialStepGraph,
  resolveTutorialStepId,
} from '../../../pages/tutorial/managers/TutorialStepManager.js';
import { marketLicences } from '../../../shared/marketLicence.js';

const RESET_CONFIRMATION = 'RESET';
const ALL_FEATURES_LEVEL = 100;
const DEFAULT_DUMMY_LEADERBOARD_COUNT = 12;
const SAGE_SEED_KEY = 'sageSeed';
const SAGE_HERB_KEY = 'sageHerb';
const MINT_SEED_KEY = 'mintSeed';
const MINT_HERB_KEY = 'mintHerb';
const MANA_TONIC_KEY = 'manaTonic';
const MINT_SEED_RESEARCH_ID = 'unlockSeed:mintSeed';
const MANA_TONIC_RESEARCH_ID = 'unlockRecipe:manaTonic';
const LEVEL_ONE_SUMMON_SAGE_SEED_TASK_ID = 'level1-summon-sage-seed';
const LEVEL_ONE_SAGE_SEED_TASK_ID = 'level1-turn-in-sage-seed';
const LEVEL_TWO_SUMMON_SAGE_SEED_TASK_ID = 'level2-summon-sage-seed';
const LEVEL_TWO_SELL_SAGE_SEED_TASK_ID = 'level2-sell-sage-seed';
const LEVEL_TWO_TURN_IN_SAGE_SEED_TASK_ID = 'level2-turn-in-sage-seed';
const LEVEL_THREE_RESEARCH_MINT_SEED_TASK_ID = 'level3-research-mint-seed';
const LEVEL_THREE_SUMMON_MINT_SEED_TASK_ID = 'level3-summon-mint-seed';
const LEVEL_THREE_TURN_IN_MINT_SEED_TASK_ID = 'level3-turn-in-mint-seed';
const LEVEL_THREE_TURN_IN_SAGE_SEED_TASK_ID = 'level3-turn-in-sage-seed';
const LEVEL_FOUR_GROW_SAGE_HERB_TASK_ID = 'level4-grow-sage-herb';
const LEVEL_FOUR_GROW_MINT_HERB_TASK_ID = 'level4-grow-mint-herb';
const LEVEL_FOUR_TURN_IN_SAGE_HERB_TASK_ID = 'level4-turn-in-sage-herb';
const LEVEL_FOUR_TURN_IN_MINT_HERB_TASK_ID = 'level4-turn-in-mint-herb';
const LEVEL_FIVE_RESEARCH_MANA_TONIC_TASK_ID = 'level5-research-mana-tonic';
const LEVEL_FIVE_BREW_MANA_TONIC_TASK_ID = 'level5-brew-mana-tonic';
const NON_PERSISTENT_DEV_DIALOGS = new Set([
  'featureunlockannouncement',
  'featureunlocks',
]);

const FEATURE_LEVELS = Object.freeze({
  workshop: 1,
  market: 1,
  shop: 1,
  garden: PAGE_UNLOCK_REQUIREMENTS.garden.requiredLevel,
  research: PAGE_UNLOCK_REQUIREMENTS.research.requiredLevel,
  leaderboard: 3,
  leaderboards: 3,
  logs: 3,
  worldchat: 3,
  chat: 3,
  brewing: PAGE_UNLOCK_REQUIREMENTS.brewing.requiredLevel,
  alliance: 4,
  alliances: 4,
  discoveries: 4,
  worldevent: 4,
  worldevents: 4,
  events: 4,
  personaltasks: 4,
  tasks: 4,
  prestige: PAGE_UNLOCK_REQUIREMENTS.prestige.requiredLevel,
  guild: PAGE_UNLOCK_REQUIREMENTS.guild.requiredLevel,
});

const CHEAT_HELP = Object.freeze([
  'cheats.fillMana()',
  'cheats.addMana(amount)',
  'cheats.setMana(amount)',
  'cheats.addCoin(amount)',
  'cheats.addCrystal(amount)',
  'cheats.addEmerald(amount)',
  'cheats.addItem("sageSeed", quantity)',
  'cheats.setProfile({ username: "Long UI Name", character: "wizard" })',
  'cheats.setInventoryPreset("full")',
  'cheats.setNotifications({ garden: true, market: true })',
  'cheats.clearNotifications()',
  'cheats.setLevel(level)',
  'await cheats.setPrestigeStars(stars)',
  'cheats.getMarketLicence()',
  'cheats.showPage("garden")',
  'cheats.unlockFeature("garden")',
  'cheats.unlockAllFeatures()',
  'cheats.completeResearch("unlockSeed:sageSeed")',
  'cheats.unlockAllResearch()',
  'cheats.unlockSeed("sage")',
  'cheats.unlockRecipe("manaTonic")',
  'cheats.unlockPlots(8)',
  'cheats.setPlot(1, { seed: "sage", phase: "growing", progress: 0.5 })',
  'cheats.setPlots([{ plot: 1, seed: "sage", phase: "ready" }])',
  'cheats.unlockCauldrons(3)',
  'cheats.setCauldron(1, { potion: "manaTonic", phase: "brewed" })',
  'cheats.unlockTraderStands(3)',
  'cheats.unlockPlayerStands(3)',
  'cheats.unlockMarketStands(3)',
  'cheats.setMarketState("full")',
  'cheats.setWorldEventState("complete")',
  'cheats.setGuildState("full")',
  'cheats.setBackendState("offline")',
  'cheats.openDialog("worldEvent", { tab: "leaderboard" })',
  'cheats.listUiSurfaces()',
  'cheats.openUi("guildQuestPosting")',
  'cheats.setTimers("allReady")',
  'cheats.setStressText()',
  'cheats.setDummyLeaderboard()',
  'cheats.clearDummyLeaderboard()',
  'cheats.listTutorialStages()',
  'cheats.getTutorialGraph()',
  'cheats.loadTutorialStep("t27")',
  'cheats.setTutorialStage("intro-garden")',
  'cheats.resetData("RESET")',
  'cheats.listDataTemplates()',
  'cheats.loadDataTemplate("ftwizard")',
  'cheats.listItems()',
  'cheats.listResearch()',
  'cheats.snapshot()',
]);

const UI_SURFACE_DEFINITIONS = Object.freeze([
  { id: 'devConsole', kind: 'tool' },
  { id: 'workshop', kind: 'page', pageId: 'workshop' },
  { id: 'brewing', kind: 'page', pageId: 'brewing' },
  { id: 'garden', kind: 'page', pageId: 'garden' },
  { id: 'research', kind: 'page', pageId: 'research' },
  { id: 'marketPage', kind: 'page', pageId: 'shop', aliases: ['shop'] },
  { id: 'guild', kind: 'page', pageId: 'guild' },
  { id: 'bag', kind: 'dialog', dialogId: 'bag', aliases: ['inventory'] },
  { id: 'seeds', kind: 'dialog', dialogId: 'seeds' },
  { id: 'herbs', kind: 'dialog', dialogId: 'herbs' },
  { id: 'potions', kind: 'dialog', dialogId: 'potions' },
  { id: 'summonInfo', kind: 'dialog', dialogId: 'summonInfo', aliases: ['summon'] },
  { id: 'leaderboard', kind: 'dialog', dialogId: 'leaderboard', aliases: ['leaderboards'] },
  { id: 'alliance', kind: 'dialog', dialogId: 'alliance', aliases: ['alliances'] },
  { id: 'discoveries', kind: 'dialog', dialogId: 'discoveries', aliases: ['discovery'] },
  { id: 'personalTasks', kind: 'dialog', dialogId: 'personalTasks', aliases: ['tasks'] },
  {
    id: 'worldEvent',
    kind: 'dialog',
    dialogId: 'worldEvent',
    aliases: ['event', 'worldNotice'],
  },
  { id: 'worldChat', kind: 'dialog', dialogId: 'worldChat', aliases: ['chat'] },
  { id: 'market', kind: 'dialog', dialogId: 'market', aliases: ['shopDialog'] },
  { id: 'guildCharter', kind: 'dialog', dialogId: 'guildCharter' },
  { id: 'guildSettings', kind: 'dialog', dialogId: 'guildSettings' },
  { id: 'guildRequest', kind: 'dialog', dialogId: 'guildRequest' },
  {
    id: 'guildQuestPosting',
    kind: 'dialog',
    dialogId: 'guildRequestStack',
    setup: 'guildFull',
    aliases: ['guildRequestStack', 'guildQuests', 'incomingGuildQuests'],
  },
  { id: 'guildAdventurer', kind: 'dialog', dialogId: 'guildAdventurer' },
  { id: 'settings', kind: 'dialog', dialogId: 'settings', aliases: ['configurations'] },
  { id: 'feedback', kind: 'dialog', dialogId: 'feedback' },
  { id: 'bug', kind: 'dialog', dialogId: 'bug' },
  { id: 'feature', kind: 'dialog', dialogId: 'feature' },
  { id: 'level', kind: 'dialog', dialogId: 'level', aliases: ['levels'] },
  {
    id: 'featureUnlockAnnouncement',
    kind: 'dialog',
    dialogId: 'featureUnlockAnnouncement',
    aliases: ['featureUnlocks'],
  },
  { id: 'inbox', kind: 'dialog', dialogId: 'inbox', aliases: ['mail'] },
]);

const UI_SURFACE_LOOKUP = new Map(
  UI_SURFACE_DEFINITIONS.flatMap((surface) => [
    [normalizeSurfaceId(surface.id), surface],
    ...(surface.aliases ?? []).map((alias) => [normalizeSurfaceId(alias), surface]),
  ]),
);

export class DevCheatCommandManager {
  constructor({
    backendFacade,
    gameplayFacade,
    onlineGateManager,
    pagesFacade,
    playerFacade,
    qaDataFacade,
  } = {}) {
    this.backendFacade = backendFacade;
    this.gameplayFacade = gameplayFacade;
    this.onlineGateManager = onlineGateManager;
    this.pagesFacade = pagesFacade;
    this.playerFacade = playerFacade;
    this.qaDataFacade = qaDataFacade;
    this.devConsoleFacade = null;
  }

  setDevConsoleFacade(devConsoleFacade) {
    this.devConsoleFacade = devConsoleFacade;
  }

  run(command, ...args) {
    if (!this.gameplayFacade) {
      return { ok: false, reason: 'gameplay_missing' };
    }

    const [commandName, commandArgs] = this.parseCommand(command, args);

    switch (this.normalizeCommandName(commandName)) {
      case 'help':
        return { ok: true, commands: [...CHEAT_HELP] };
      case 'snapshot':
        return { ok: true, snapshot: this.gameplayFacade.getSnapshot() };
      case 'fillmana':
        return this.fillMana();
      case 'addmana':
        return this.addMana(commandArgs[0]);
      case 'setmana':
        return this.setMana(commandArgs[0]);
      case 'addcoin':
        return this.addCoin(commandArgs[0]);
      case 'addcrystal':
        return this.addCrystal(commandArgs[0]);
      case 'addemerald':
        return this.addEmerald(commandArgs[0]);
      case 'additem':
        return this.addItem(commandArgs[0], commandArgs[1] ?? 1);
      case 'setprofile':
        return this.setProfile(commandArgs[0]);
      case 'setinventorypreset':
      case 'inventorypreset':
      case 'setinventory':
        return this.setInventoryPreset(commandArgs[0], commandArgs[1]);
      case 'setnotifications':
      case 'notifications':
        return this.setNotifications(commandArgs[0]);
      case 'clearnotifications':
        return this.clearNotifications();
      case 'setlevel':
      case 'level':
        return this.setLevel(commandArgs[0]);
      case 'setprestigestars':
      case 'setprestige':
      case 'prestigestars':
        return this.setPrestigeStars(commandArgs[0]);
      case 'getmarketlicence':
      case 'getmarketlicense':
      case 'marketlicence':
      case 'marketlicense':
        return this.getMarketLicence();
      case 'showpage':
      case 'setpage':
      case 'view':
        return this.showPage(commandArgs[0], commandArgs[1]);
      case 'unlockfeature':
        return this.unlockFeature(commandArgs[0]);
      case 'unlockallfeatures':
      case 'unlockall':
        return this.unlockAllFeatures();
      case 'completeresearch':
        return this.completeResearch(commandArgs[0]);
      case 'unlockallresearch':
        return this.unlockAllResearch();
      case 'unlockseed':
        return this.completeResearch(`unlockSeed:${this.toSeedKey(commandArgs[0])}`);
      case 'unlockrecipe':
        return this.completeResearch(`unlockRecipe:${commandArgs[0]}`);
      case 'unlockplots':
      case 'unlockplot':
      case 'unlockslots':
      case 'unlockgardenslots':
        return this.unlockPlots(commandArgs[0]);
      case 'setplot':
      case 'setgardenplot':
        return this.setPlot(commandArgs[0], commandArgs[1], commandArgs[2]);
      case 'setplots':
      case 'setgardenplots':
        return this.setPlots(commandArgs[0]);
      case 'unlockcauldrons':
      case 'unlockcauldron':
        return this.unlockCauldrons(commandArgs[0]);
      case 'setcauldron':
        return this.setCauldron(commandArgs[0], commandArgs[1], commandArgs[2]);
      case 'unlocktraderstands':
      case 'unlockshopslots':
      case 'unlocknpcshelves':
        return this.unlockTraderStands(commandArgs[0]);
      case 'unlockplayerstands':
      case 'unlockplayershopslots':
        return this.unlockPlayerStands(commandArgs[0]);
      case 'unlockmarketstands':
        return this.unlockMarketStands(commandArgs[0]);
      case 'setmarketstate':
      case 'marketstate':
        return this.setMarketState(commandArgs[0], commandArgs[1]);
      case 'setworldeventstate':
      case 'worldeventstate':
      case 'seteventstate':
        return this.setWorldEventState(commandArgs[0], commandArgs[1]);
      case 'setguildstate':
      case 'guildstate':
        return this.setGuildState(commandArgs[0], commandArgs[1]);
      case 'setbackendstate':
      case 'backendstate':
        return this.setBackendState(commandArgs[0], commandArgs[1]);
      case 'opendialog':
      case 'showdialog':
        return this.openDialog(commandArgs[0], commandArgs[1]);
      case 'listuisurfaces':
      case 'listsurfaces':
      case 'ui':
        return this.listUiSurfaces();
      case 'openui':
      case 'showui':
      case 'opensurface':
      case 'showsurface':
        return this.openUi(commandArgs[0], commandArgs[1]);
      case 'settimers':
      case 'timers':
        return this.setTimers(commandArgs[0], commandArgs[1]);
      case 'setstresstext':
      case 'stresstext':
      case 'stressui':
        return this.setStressText(commandArgs[0]);
      case 'setdummyleaderboard':
      case 'dummyleaderboard':
      case 'setleaderboarddummy':
        return this.setDummyLeaderboard(commandArgs[0]);
      case 'cleardummyleaderboard':
      case 'cleardummyleaderboards':
      case 'clearleaderboarddummy':
        return this.clearDummyLeaderboard();
      case 'listtutorialstages':
      case 'listtutorialsteps':
        return this.listTutorialStages();
      case 'gettutorialgraph':
      case 'tutorialgraph':
      case 'showtutorialgraph':
        return this.getTutorialGraph();
      case 'loadtutorialstep':
      case 'loadtutorialstage':
      case 'loadtutorial':
        return this.loadTutorialStep(commandArgs[0], commandArgs[1]);
      case 'settutorialstage':
      case 'settutorialstep':
        return this.setTutorialStage(commandArgs[0], commandArgs[1]);
      case 'resetdata':
        return this.resetData(commandArgs[0]);
      case 'listdatatemplates':
      case 'listqatemplates':
        return this.listDataTemplates();
      case 'loaddatatemplate':
      case 'loadqatemplate':
        return this.loadDataTemplate(commandArgs[0], commandArgs[1]);
      case 'listitems':
        return this.listItems();
      case 'listresearch':
        return this.listResearch();
      default:
        return {
          ok: false,
          reason: 'unknown_command',
          command: commandName,
          help: [...CHEAT_HELP],
        };
    }
  }

  listDataTemplates() {
    if (!this.qaDataFacade) {
      return Promise.resolve({ ok: false, reason: 'qa_data_missing' });
    }

    return this.qaDataFacade.listTemplates();
  }

  loadDataTemplate(templateIdOrAlias, options) {
    if (!this.qaDataFacade) {
      return Promise.resolve({ ok: false, reason: 'qa_data_missing' });
    }

    return this.qaDataFacade.loadTemplate(templateIdOrAlias, options);
  }

  fillMana() {
    this.gameplayFacade.manaFacade.fill();
    this.publishAndSave();
    return {
      ok: true,
      mana: this.gameplayFacade.getSnapshot().mana,
    };
  }

  addMana(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.manaFacade.add(safeAmount.value);
    this.publishAndSave();
    return {
      ok: true,
      mana: this.gameplayFacade.getSnapshot().mana,
    };
  }

  setMana(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.manaFacade.setCurrent(safeAmount.value);
    this.publishAndSave();
    return {
      ok: true,
      mana: this.gameplayFacade.getSnapshot().mana,
    };
  }

  addCoin(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.coinFacade.add(safeAmount.value);
    this.publishAndSave();
    return {
      ok: true,
      coin: this.gameplayFacade.getSnapshot().coin,
    };
  }

  addCrystal(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.crystalFacade.add(safeAmount.value);
    this.publishAndSave();
    return {
      ok: true,
      crystal: this.gameplayFacade.getSnapshot().crystal,
    };
  }

  addEmerald(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.emeraldFacade.add(safeAmount.value);
    this.publishAndSave();
    return {
      ok: true,
      emerald: this.gameplayFacade.getSnapshot().emerald,
    };
  }

  addItem(itemKeyOrId, quantity = 1) {
    const definition = this.getItemDefinition(itemKeyOrId);

    if (!definition.ok) {
      return definition;
    }

    const safeQuantity = this.readPositiveInteger(quantity, 'quantity');

    if (!safeQuantity.ok) {
      return safeQuantity;
    }

    this.gameplayFacade.itemsFacade.addItem(definition.item.itemTypeId, safeQuantity.value);
    this.publishAndSave();

    return {
      ok: true,
      item: {
        ...definition.item,
        quantity: this.gameplayFacade.itemsFacade.getItemQuantity(definition.item.itemTypeId),
      },
      addedQuantity: safeQuantity.value,
    };
  }

  setProfile(options = {}) {
    const profile =
      typeof options === 'string'
        ? { username: options }
        : options && typeof options === 'object'
          ? options
          : {};

    if (!this.playerFacade && !profile.allianceTag && !profile.guildTag) {
      return { ok: false, reason: 'player_missing' };
    }

    const applied = {};
    const setters = [
      ['username', 'setUsername'],
      ['theme', 'setTheme'],
      ['font', 'setFont'],
      ['colorMode', 'setColorMode'],
      ['iconMode', 'setIconMode'],
      ['progressBar', 'setProgressBar'],
    ];

    for (const [key, method] of setters) {
      if (typeof profile[key] === 'undefined') {
        continue;
      }

      if (typeof this.playerFacade?.[method] === 'function') {
        this.playerFacade[method](profile[key]);
        applied[key] = profile[key];
      }
    }

    const tag = profile.allianceTag ?? profile.guildTag;
    const guild = tag
      ? this.setGuildState({
          preset: 'joined',
          name: profile.guildName ?? profile.allianceName ?? `${tag} guild`,
          tag,
          color: profile.allianceTagColor ?? profile.guildColor,
        })
      : null;

    return {
      ok: true,
      applied,
      profile: this.playerFacade?.getSnapshot?.() ?? null,
      guild,
    };
  }

  setInventoryPreset(presetOrItems = 'basic', optionsArg = {}) {
    const options = this.toPresetOptions(presetOrItems, optionsArg, 'basic');
    const preset = this.normalizeId(options.preset);
    const allDefinitions = this.getAllItemDefinitions();
    let items;

    if (Array.isArray(options.items) || this.isPlainObject(options.items)) {
      items = this.normalizeInventoryItems(options.items);
    } else if (
      Array.isArray(presetOrItems) ||
      (
        this.isPlainObject(presetOrItems) &&
        !Object.hasOwn(presetOrItems, 'preset') &&
        !Object.hasOwn(presetOrItems, 'state')
      )
    ) {
      items = this.normalizeInventoryItems(presetOrItems);
    } else if (preset === 'empty' || preset === 'none' || preset === 'clear') {
      items = [];
    } else if (preset === 'overflow') {
      items = allDefinitions.map((item) => ({
        itemKey: item.key,
        quantity: Math.floor(Number(options.quantity) || 99_999),
      }));
    } else if (preset === 'full' || preset === 'all') {
      items = allDefinitions.map((item) => ({
        itemKey: item.key,
        quantity: Math.floor(Number(options.quantity) || 25),
      }));
    } else {
      const quantity = Math.floor(Number(options.quantity) || 10);
      items = [
        ...this.gameplayFacade.itemsFacade.getSeedDefinitions().slice(0, 3),
        ...this.gameplayFacade.itemsFacade.getHerbDefinitions().slice(0, 3),
        ...this.gameplayFacade.itemsFacade.getPotionDefinitions().slice(0, 2),
      ].map((item) => ({
        itemKey: item.key,
        quantity,
      }));
    }

    const applied = this.applyInventoryItems(items, { mode: 'replace' });

    if (applied.ok === false) {
      return applied;
    }

    this.publishAndSave();

    return {
      ok: true,
      preset,
      inventory: this.gameplayFacade.getSnapshot().inventory,
    };
  }

  setNotifications(config = 'all') {
    if (!this.pagesFacade || typeof this.pagesFacade.setDevNotifications !== 'function') {
      return { ok: false, reason: 'pages_missing' };
    }

    const snapshot = this.createDevNotificationSnapshot(config);
    return this.pagesFacade.setDevNotifications(snapshot);
  }

  clearNotifications() {
    if (!this.pagesFacade || typeof this.pagesFacade.clearDevNotifications !== 'function') {
      return { ok: false, reason: 'pages_missing' };
    }

    return this.pagesFacade.clearDevNotifications();
  }

  setLevel(level) {
    const safeLevel = this.readPositiveInteger(level, 'level');

    if (!safeLevel.ok) {
      return safeLevel;
    }

    const maxLevel =
      this.gameplayFacade.tasksFacade?.taskBalanceManager?.getMaxLevel?.() ?? safeLevel.value;
    const currentLevel = this.getCurrentLevel();
    const nextLevel = Math.min(safeLevel.value, maxLevel);
    this.applyLevel(nextLevel);
    this.publishAndSave();

    return {
      ok: true,
      level: nextLevel,
      requestedLevel: safeLevel.value,
      levelBefore: currentLevel,
      capped: nextLevel !== safeLevel.value,
      playerLevel: this.gameplayFacade.getSnapshot().playerLevel,
    };
  }

  async setPrestigeStars(stars) {
    const safeStars = this.readNonNegativeInteger(stars, 'stars');

    if (!safeStars.ok) {
      return safeStars;
    }

    const maxMarketStars = Math.max(
      ...marketLicences.map((licence) => licence.requiredStars),
    );

    if (safeStars.value > maxMarketStars) {
      return {
        ok: false,
        reason: 'market_star_limit_exceeded',
        field: 'stars',
        value: safeStars.value,
        maxStars: maxMarketStars,
      };
    }

    const prestigeFacade = this.gameplayFacade.prestigeFacade;

    if (typeof prestigeFacade?.applyPersistenceSnapshot !== 'function') {
      return { ok: false, reason: 'prestige_missing' };
    }

    const completedLevels = Array.from(
      { length: safeStars.value },
      (_, index) => (index + 1) * 10,
    );
    const levelBefore = prestigeFacade.getCompletedCount?.() ?? 0;
    const previousPrestige = prestigeFacade.getPersistenceSnapshot?.() ?? {};

    prestigeFacade.applyPersistenceSnapshot({
      ...previousPrestige,
      completedLevels,
    });
    this.gameplayFacade.syncRubyFromPrestige?.();
    this.publishAndSave();

    const saved = await Promise.resolve(
      this.gameplayFacade.savePersistenceSnapshotAndFlush?.(),
    );
    const market = this.getMarketLicence().market;

    return {
      ok: saved !== false,
      ...(saved === false ? { reason: 'save_failed' } : {}),
      stars: safeStars.value,
      starsBefore: levelBefore,
      completedLevels,
      market,
    };
  }

  getMarketLicence() {
    const market = this.gameplayFacade.marketLicenceFacade?.getSnapshot?.();

    if (!market) {
      return { ok: false, reason: 'market_licence_missing' };
    }

    return { ok: true, market };
  }

  showPage(pageId, options = {}) {
    const safePageId = this.normalizeId(pageId);

    if (!safePageId) {
      return { ok: false, reason: 'invalid_page_id', pageId };
    }

    if (!this.pagesFacade || typeof this.pagesFacade.show !== 'function') {
      return { ok: false, reason: 'pages_missing' };
    }

    const shouldUnlock = options?.unlock !== false;
    const unlock = shouldUnlock ? this.unlockFeature(safePageId) : { ok: true };

    if (unlock.ok === false) {
      return unlock;
    }

    this.pagesFacade.show(safePageId);

    return {
      ok: true,
      pageId: safePageId,
      currentPageId: this.pagesFacade.getCurrentPageId?.() ?? safePageId,
      unlocked: shouldUnlock,
    };
  }

  unlockFeature(featureId) {
    const rawFeatureId = String(featureId ?? '').trim();

    if (this.hasConfiguredResearch(rawFeatureId)) {
      return this.completeResearch(rawFeatureId);
    }

    const rawUnlockSeed = rawFeatureId.match(/^unlockSeed:(.+)$/i);
    if (rawUnlockSeed) {
      return this.completeResearch(`unlockSeed:${this.toSeedKey(rawUnlockSeed[1])}`);
    }

    const rawUnlockRecipe = rawFeatureId.match(/^unlockRecipe:(.+)$/i);
    if (rawUnlockRecipe) {
      return this.completeResearch(`unlockRecipe:${rawUnlockRecipe[1]}`);
    }

    const rawSeed = rawFeatureId.match(/^seed:(.+)$/i);
    if (rawSeed) {
      return this.completeResearch(`unlockSeed:${this.toSeedKey(rawSeed[1])}`);
    }

    const rawRecipe = rawFeatureId.match(/^recipe:(.+)$/i);
    if (rawRecipe) {
      return this.completeResearch(`unlockRecipe:${rawRecipe[1]}`);
    }

    const key = this.normalizeFeatureId(rawFeatureId);

    if (!key) {
      return { ok: false, reason: 'invalid_feature_id', featureId };
    }

    const level = FEATURE_LEVELS[key] ?? PAGE_UNLOCK_REQUIREMENTS[key]?.requiredLevel ?? null;

    if (!Number.isInteger(level)) {
      return {
        ok: false,
        reason: 'unknown_feature',
        featureId,
        knownFeatures: Object.keys(FEATURE_LEVELS),
      };
    }

    this.ensureLevelAtLeast(level);
    this.publishAndSave();
    return {
      ok: true,
      feature: key,
      requiredLevel: level,
      currentLevel: this.getCurrentLevel(),
    };
  }

  unlockAllFeatures() {
    const level = this.ensureLevelAtLeast(ALL_FEATURES_LEVEL).level;
    const research = this.unlockAllResearch({ save: false });
    const garden = this.unlockPlots(this.getGardenMaxTiles(), { save: false });
    const cauldrons = this.unlockCauldrons(this.getBrewingMaxCauldrons(), { save: false });
    const market = this.unlockMarketStands(this.getShopMaxSlots(), { save: false });

    this.publishAndSave();

    return {
      ok: true,
      level,
      research,
      garden,
      cauldrons,
      market,
      snapshot: this.gameplayFacade.getSnapshot(),
    };
  }

  completeResearch(researchId) {
    if (typeof researchId !== 'string' || researchId.trim().length <= 0) {
      return { ok: false, reason: 'invalid_research_id' };
    }

    const trimmedResearchId = researchId.trim();
    const snapshot = this.gameplayFacade.researchFacade.getPersistenceSnapshot();
    const completedIds = new Set(snapshot.completedIds);
    const beforeCount = completedIds.size;
    completedIds.add(trimmedResearchId);
    this.gameplayFacade.researchFacade.applyPersistenceSnapshot({
      completedIds: [...completedIds],
    });

    const nextCompletedIds =
      this.gameplayFacade.researchFacade.getPersistenceSnapshot().completedIds;

    if (!nextCompletedIds.includes(trimmedResearchId)) {
      return {
        ok: false,
        reason: 'unknown_research',
        researchId: trimmedResearchId,
      };
    }

    this.publishAndSave();
    return {
      ok: true,
      researchId: trimmedResearchId,
      alreadyCompleted: beforeCount === completedIds.size,
      completedResearchIds: nextCompletedIds,
    };
  }

  completeGardenCapacityResearchThrough(tileCount) {
    const maxTileNumber = Math.min(plotCapacityEndPlotNumber, Math.floor(Number(tileCount) || 0));
    const researchIds = [];

    for (
      let tileNumber = plotCapacityStartPlotNumber;
      tileNumber <= maxTileNumber;
      tileNumber += 1
    ) {
      researchIds.push(capacityResearchIds.plot(tileNumber));
    }

    this.completeCapacityResearchIds(researchIds);
  }

  completeCauldronCapacityResearchThrough(cauldronCount) {
    const maxCauldronNumber = Math.min(
      cauldronCapacityEndCauldronNumber,
      Math.floor(Number(cauldronCount) || 0),
    );
    const researchIds = [];

    for (
      let cauldronNumber = cauldronCapacityStartCauldronNumber;
      cauldronNumber <= maxCauldronNumber;
      cauldronNumber += 1
    ) {
      researchIds.push(capacityResearchIds.cauldron(cauldronNumber));
    }

    this.completeCapacityResearchIds(researchIds);
  }

  completeCapacityResearchIds(researchIds = []) {
    if (researchIds.length <= 0) {
      return;
    }

    const snapshot = this.gameplayFacade.researchFacade.getPersistenceSnapshot();
    const completedIds = [...new Set([...snapshot.completedIds, ...researchIds])];

    this.gameplayFacade.researchFacade.applyPersistenceSnapshot({
      ...snapshot,
      completedIds,
    });
  }

  unlockAllResearch({ save = true } = {}) {
    const researchIds = this.getAllConfiguredResearchIds();
    const existingIds = this.gameplayFacade.researchFacade.getPersistenceSnapshot().completedIds;
    const completedIds = [...new Set([...existingIds, ...researchIds])];

    this.gameplayFacade.researchFacade.applyPersistenceSnapshot({
      completedIds,
      inProgress: [],
    });
    this.gameplayFacade.syncPlayerLevelManaEffects?.();
    this.gameplayFacade.syncRubyFromPrestige?.();

    const nextCompletedIds =
      this.gameplayFacade.researchFacade.getPersistenceSnapshot().completedIds;

    if (save) {
      this.publishAndSave();
    }

    return {
      ok: true,
      completedCount: nextCompletedIds.length,
      completedResearchIds: nextCompletedIds,
    };
  }

  unlockPlots(count, { save = true } = {}) {
    const safeCount = this.readPositiveInteger(count, 'count');

    if (!safeCount.ok) {
      return safeCount;
    }

    const maxTiles = this.getGardenMaxTiles();
    const unlockedTiles = Math.min(safeCount.value, maxTiles);
    this.ensureLevelForGardenTile(Math.min(unlockedTiles, plotCapacityStartPlotNumber - 1));
    this.completeGardenCapacityResearchThrough(unlockedTiles);
    const snapshot = this.gameplayFacade.gardenFacade.getPersistenceSnapshot();

    this.gameplayFacade.gardenFacade.applyPersistenceSnapshot({
      ...snapshot,
      unlockedTiles,
    });

    if (save) {
      this.publishAndSave();
    }

    return {
      ok: true,
      unlockedTiles: this.gameplayFacade.gardenFacade.getPersistenceSnapshot().unlockedTiles,
      requestedTiles: safeCount.value,
      maxTiles,
      currentLevel: this.getCurrentLevel(),
    };
  }

  setPlot(plotNumber, seedOrOptions, phaseArg) {
    const safePlotNumber = this.readPositiveInteger(plotNumber, 'plotNumber');

    if (!safePlotNumber.ok) {
      return safePlotNumber;
    }

    const options = this.toPlotOptions(seedOrOptions, phaseArg);
    const maxTiles = this.getGardenMaxTiles();

    if (safePlotNumber.value > maxTiles) {
      return {
        ok: false,
        reason: 'plot_out_of_range',
        plotNumber: safePlotNumber.value,
        maxTiles,
      };
    }

    this.ensureLevelForGardenTile(
      Math.min(safePlotNumber.value, plotCapacityStartPlotNumber - 1),
    );
    this.completeGardenCapacityResearchThrough(safePlotNumber.value);
    const snapshot = this.gameplayFacade.gardenFacade.getPersistenceSnapshot();
    const unlockedTiles = Math.max(snapshot.unlockedTiles, safePlotNumber.value);
    const existingTile = snapshot.tiles.find(
      (tile) => tile.tileNumber === safePlotNumber.value,
    );
    const seedKey = this.resolvePlotSeedKey(options, existingTile);
    const phase = this.normalizeGardenPhase(options.phase ?? options.stage ?? 'growing');
    const tile = this.createGardenTileSnapshot({
      tileNumber: safePlotNumber.value,
      seedKey,
      phase,
      options,
      existingTile,
    });

    if (tile.ok === false) {
      return tile;
    }

    const tiles = snapshot.tiles.filter((candidate) => candidate.tileNumber !== tile.tileNumber);
    tiles.push(tile);
    tiles.sort((left, right) => left.tileNumber - right.tileNumber);

    this.gameplayFacade.gardenFacade.applyPersistenceSnapshot({
      ...snapshot,
      unlockedTiles,
      tiles,
    });
    this.publishAndSave();

    return {
      ok: true,
      plotNumber: safePlotNumber.value,
      unlockedTiles: this.gameplayFacade.gardenFacade.getPersistenceSnapshot().unlockedTiles,
      tile: this.gameplayFacade
        .getSnapshot()
        .garden.plot.tiles.find((candidate) => candidate.tileNumber === safePlotNumber.value),
    };
  }

  setPlots(plots) {
    if (!Array.isArray(plots) || plots.length === 0) {
      return { ok: false, reason: 'invalid_plots' };
    }

    const results = [];

    for (const plot of plots) {
      const plotNumber = plot?.plot ?? plot?.plotNumber ?? plot?.tile ?? plot?.tileNumber;
      const result = this.setPlot(plotNumber, plot);
      results.push(result);

      if (result.ok === false) {
        return {
          ok: false,
          reason: 'plot_failed',
          failed: result,
          results,
        };
      }
    }

    return {
      ok: true,
      results,
      garden: this.gameplayFacade.getSnapshot().garden,
    };
  }

  unlockCauldrons(count, { save = true } = {}) {
    const safeCount = this.readPositiveInteger(count, 'count');

    if (!safeCount.ok) {
      return safeCount;
    }

    const maxCauldrons = this.getBrewingMaxCauldrons();
    const unlockedCauldrons = Math.min(safeCount.value, maxCauldrons);
    this.ensureLevelForCauldron(
      Math.min(unlockedCauldrons, cauldronCapacityStartCauldronNumber - 1),
    );
    this.completeCauldronCapacityResearchThrough(unlockedCauldrons);
    const snapshot = this.gameplayFacade.brewingFacade.getPersistenceSnapshot();

    this.gameplayFacade.brewingFacade.applyPersistenceSnapshot(
      {
        ...snapshot,
        unlockedCauldrons,
      },
      this.gameplayFacade.itemsFacade,
    );

    if (save) {
      this.publishAndSave();
    }

    return {
      ok: true,
      unlockedCauldrons:
        this.gameplayFacade.brewingFacade.getPersistenceSnapshot().unlockedCauldrons,
      requestedCauldrons: safeCount.value,
      maxCauldrons,
      currentLevel: this.getCurrentLevel(),
    };
  }

  setCauldron(cauldronNumber, potionOrOptions, phaseArg) {
    const safeCauldronNumber = this.readPositiveInteger(cauldronNumber, 'cauldronNumber');

    if (!safeCauldronNumber.ok) {
      return safeCauldronNumber;
    }

    const options = this.toCauldronOptions(potionOrOptions, phaseArg);
    const phase = this.normalizeBrewPhase(options.phase ?? options.stage ?? 'brewed');
    const maxCauldrons = this.getBrewingMaxCauldrons();

    if (safeCauldronNumber.value > maxCauldrons) {
      return {
        ok: false,
        reason: 'cauldron_out_of_range',
        cauldronNumber: safeCauldronNumber.value,
        maxCauldrons,
      };
    }

    this.unlockCauldrons(safeCauldronNumber.value, { save: false });
    const cauldronIndex = safeCauldronNumber.value - 1;
    const cauldronManager = this.gameplayFacade.brewingFacade.brewingCauldronEntityManager;
    const processManager = this.gameplayFacade.brewingFacade.brewingProcessEntityManager;
    cauldronManager.clearIngredients(cauldronIndex);
    processManager.clearActiveBrew(cauldronIndex);

    if (phase !== 'empty') {
      const potion = this.getRawItemDefinition(options.potion ?? options.potionKey ?? 'manaTonic');

      if (!potion || potion.kind !== 'potion') {
        return {
          ok: false,
          reason: 'unknown_potion',
          potion: options.potion ?? options.potionKey,
        };
      }

      const ingredientKeys = this.resolveCauldronIngredientKeys(potion.key, options);

      for (const ingredientKey of ingredientKeys) {
        const ingredient = this.getRawItemDefinition(ingredientKey);

        if (ingredient?.kind === 'herb') {
          cauldronManager.addIngredient(ingredient.id, cauldronIndex);
        }
      }

      if (phase !== 'staged') {
        const totalMs = this.resolveBrewTotalMs(potion.key, options);
        const bottlingTotalMs = this.resolveBottlingTotalMs(options);
        const activePhase = phase === 'complete' ? 'ready' : phase;
        const remainingMs = this.resolveRemainingMs({
          totalMs: activePhase === 'bottling' ? bottlingTotalMs : totalMs,
          options,
          defaultProgress: activePhase === 'brewing' || activePhase === 'bottling' ? 0 : 1,
        });

        processManager.restoreActiveBrew({
          cauldronIndex,
          resultItemTypeId: potion.id,
          resultQuantity: options.quantity,
          phase: activePhase,
          totalSeconds: (activePhase === 'bottling' ? bottlingTotalMs : totalMs) / 1_000,
          remainingSeconds: remainingMs / 1_000,
          bottlingTotalSeconds: bottlingTotalMs / 1_000,
        });
      }
    }

    this.publishAndSave();

    return {
      ok: true,
      cauldronNumber: safeCauldronNumber.value,
      cauldron: this.gameplayFacade
        .getSnapshot()
        .brewing.cauldrons.find(
          (candidate) => candidate.cauldronNumber === safeCauldronNumber.value,
        ),
    };
  }

  unlockTraderStands(count, { save = true } = {}) {
    const safeCount = this.readPositiveInteger(count, 'count');

    if (!safeCount.ok) {
      return safeCount;
    }

    const maxSlots = this.getShopMaxSlots();
    const unlockedSlots = Math.min(safeCount.value, maxSlots);
    this.ensureMarketStallCount(unlockedSlots);
    this.ensureLevelForNpcMarketStand(unlockedSlots);
    const snapshot = this.gameplayFacade.shopFacade.getPersistenceSnapshot();

    this.gameplayFacade.shopFacade.applyPersistenceSnapshot({
      ...snapshot,
      shelf: {
        ...snapshot.shelf,
        unlockedSlots,
      },
    });

    if (save) {
      this.publishAndSave();
    }

    return {
      ok: true,
      unlockedSlots: this.gameplayFacade.shopFacade.getSnapshot().shelf.unlockedSlots,
      requestedSlots: safeCount.value,
      maxSlots,
      currentLevel: this.getCurrentLevel(),
    };
  }

  unlockPlayerStands(count, { save = true } = {}) {
    const safeCount = this.readPositiveInteger(count, 'count');

    if (!safeCount.ok) {
      return safeCount;
    }

    const maxSlots = this.getShopMaxSlots();
    const unlockedSlots = Math.min(safeCount.value, maxSlots);
    this.ensureMarketStallCount(unlockedSlots);
    this.ensureLevelForPlayerMarketStand(unlockedSlots);
    const snapshot = this.gameplayFacade.shopFacade.getPersistenceSnapshot();

    this.gameplayFacade.shopFacade.applyPersistenceSnapshot({
      ...snapshot,
      playerShelf: {
        ...snapshot.playerShelf,
        unlockedSlots,
      },
    });

    if (save) {
      this.publishAndSave();
    }

    return {
      ok: true,
      unlockedSlots: this.gameplayFacade.shopFacade.getSnapshot().playerShelf.unlockedSlots,
      requestedSlots: safeCount.value,
      maxSlots,
      currentLevel: this.getCurrentLevel(),
    };
  }

  unlockMarketStands(count, { save = true } = {}) {
    const trader = this.unlockTraderStands(count, { save: false });
    const player = this.unlockPlayerStands(count, { save: false });

    if (save) {
      this.publishAndSave();
    }

    return {
      ok: trader.ok !== false && player.ok !== false,
      trader,
      player,
    };
  }

  ensureMarketStallCount(count) {
    const licenceIndex = Math.max(0, Math.min(marketLicences.length, count) - 1);
    const licence = marketLicences[licenceIndex];
    const prestigeFacade = this.gameplayFacade.prestigeFacade;

    if (!licence || typeof prestigeFacade?.applyPersistenceSnapshot !== 'function') {
      return;
    }

    const currentStars = prestigeFacade.getCompletedCount?.() ?? 0;
    const requiredStars = Math.max(currentStars, licence.requiredStars);
    const snapshot = prestigeFacade.getPersistenceSnapshot?.() ?? {};

    prestigeFacade.applyPersistenceSnapshot({
      ...snapshot,
      completedLevels: Array.from(
        { length: requiredStars },
        (_unused, index) => (index + 1) * 10,
      ),
    });
    this.gameplayFacade.syncRubyFromPrestige?.();
  }

  setMarketState(presetOrOptions = 'full', optionsArg = {}) {
    const options = this.toPresetOptions(presetOrOptions, optionsArg, 'full');
    const preset = this.normalizeId(options.preset);
    const maxSlots = this.getShopMaxSlots();
    const requestedSlots = Math.max(1, Math.floor(Number(options.slots) || 3));
    const unlockedSlots = Math.min(requestedSlots, maxSlots);
    const readyProgressSeconds = 0;
    const halfProgressSeconds = 45;
    const longProgressSeconds = 120;
    const sellProgressSeconds =
      preset === 'ready' || preset === 'allready'
        ? readyProgressSeconds
        : preset === 'half'
          ? halfProgressSeconds
          : preset === 'longrunning'
            ? longProgressSeconds
            : Math.floor(Number(options.sellProgressSeconds) || readyProgressSeconds);

    this.ensureLevelAtLeast(FEATURE_LEVELS.market);
    this.unlockMarketStands(unlockedSlots, { save: false });

    const itemKeys = this.getDevMarketItemKeys();
    const inventoryQuantity = Math.floor(Number(options.quantity) || 50);

    if (preset !== 'empty' && preset !== 'none' && preset !== 'clear') {
      this.unlockAllResearch({ save: false });
      this.addInventoryQuantities(
        itemKeys.map((itemKey) => ({ itemKey, quantity: inventoryQuantity })),
      );
    }

    const shelfSlots =
      preset === 'empty' || preset === 'none' || preset === 'clear'
        ? []
        : Array.from({ length: unlockedSlots }, (_unused, index) => ({
            slotNumber: index + 1,
            sellItemKey: itemKeys[index % itemKeys.length],
            sellLimitMode: index % 2 === 0 ? 'all' : 'amount',
            sellQuantityLimit: index % 2 === 0 ? null : 10 + index,
            sellProgressSeconds,
          }));
    const playerSlots =
      preset === 'empty' || preset === 'none' || preset === 'clear'
        ? []
        : Array.from({ length: unlockedSlots }, (_unused, index) => ({
            slotNumber: index + 1,
            itemKey: itemKeys[index % itemKeys.length],
            quantity: 5 + index,
            priceCoin: 15 + index * 5,
          }));
    const requestSlots =
      preset === 'empty' || preset === 'none' || preset === 'clear'
        ? []
        : Array.from({ length: unlockedSlots }, (_unused, index) => ({
            slotNumber: index + 1,
            itemKey: itemKeys[(index + 1) % itemKeys.length],
            quantity: 3 + index,
            priceCoin: 12 + index * 4,
          }));
    const snapshot = this.gameplayFacade.shopFacade.getPersistenceSnapshot();

    this.gameplayFacade.shopFacade.applyPersistenceSnapshot({
      ...snapshot,
      shelf: {
        ...snapshot.shelf,
        unlockedSlots,
        selectedSlotNumber: Math.min(
          Math.max(1, Math.floor(Number(options.selectedSlotNumber) || 1)),
          unlockedSlots,
        ),
        sellProgressSeconds,
        slots: shelfSlots,
      },
      playerShelf: {
        ...snapshot.playerShelf,
        unlockedSlots,
        selectedSlotNumber: 1,
        slots: playerSlots,
      },
      playerRequests: {
        slots: requestSlots,
      },
    });

    const playerShop = this.applyPlayerShopSnapshot(
      this.createPlayerShopDevSnapshot({
        connected: preset !== 'offline',
        listings: playerSlots,
        requests: requestSlots,
        proceedsCoin: preset === 'full' || preset === 'claimable' ? 340 : 0,
      }),
    );

    this.publishAndSave();

    return {
      ok: true,
      preset,
      unlockedSlots,
      shop: this.gameplayFacade.getSnapshot().shop,
      playerShop,
    };
  }

  setWorldEventState(presetOrOptions = 'active', optionsArg = {}) {
    const options = this.toPresetOptions(presetOrOptions, optionsArg, 'active');
    const preset = this.normalizeId(options.preset);
    const worldNoticeFacade = this.gameplayFacade.worldNoticeFacade;

    if (!worldNoticeFacade) {
      return { ok: false, reason: 'world_event_missing' };
    }

    if (preset === 'locked' || preset === 'none' || preset === 'clear') {
      this.applyLevel(Math.max(1, FEATURE_LEVELS.worldevent - 1));
      worldNoticeFacade.applyPersistenceSnapshot({ current: null, archive: [] });
      this.publishAndSave();
      return {
        ok: true,
        preset,
        worldNotice: this.gameplayFacade.getSnapshot().worldNotice,
      };
    }

    this.ensureLevelAtLeast(FEATURE_LEVELS.worldevent);
    worldNoticeFacade.ensureCurrentNotice();
    const snapshot = worldNoticeFacade.getPersistenceSnapshot();
    const current = snapshot.current;

    if (!current) {
      return { ok: false, reason: 'world_event_unavailable' };
    }

    const ratio =
      preset === 'complete' || preset === 'completed'
        ? 1
        : preset === 'almostdone'
          ? 0.95
          : preset === 'half' || preset === 'partial'
            ? 0.5
            : 0;
    const points =
      Number.isFinite(Number(options.points))
        ? Math.max(0, Math.floor(Number(options.points)))
        : preset === 'qualify' || preset === 'qualified'
          ? 2_000
          : preset === 'complete' || preset === 'completed'
            ? 2_750
            : preset === 'half' || preset === 'partial'
              ? 900
              : 0;

    current.contributionPoints = points;
    const requestCount = Math.max(1, (current.requests ?? []).length);
    current.requests = (current.requests ?? []).map((request) => {
      const requiredQuantity = Math.max(1, Math.floor(Number(request.requiredQuantity) || 1));
      const progressQuantity = Math.max(
        0,
        Math.min(requiredQuantity, Math.floor(requiredQuantity * ratio)),
      );

      return {
        ...request,
        progressQuantity,
        pointProgressQuantity: progressQuantity,
        contributionPoints: Math.floor(points / requestCount),
        completed: progressQuantity >= requiredQuantity,
      };
    });

    const archive =
      preset === 'ended' || preset === 'archive'
        ? [
            {
              periodKey: current.periodKey,
              eventId: current.eventId,
              headline: current.headline,
              responseTier: points >= 2_000 ? 'strong' : points > 0 ? 'steady' : 'small',
              contributionPoints: points,
              outcome: current.outcomes?.strong ?? '',
              archive: current.archive ?? '',
            },
            ...(snapshot.archive ?? []),
          ]
        : snapshot.archive;

    worldNoticeFacade.applyPersistenceSnapshot({
      ...snapshot,
      current,
      archive,
    });
    const leaderboard = this.setDummyLeaderboard({
      count: Math.floor(Number(options.leaderboardCount) || DEFAULT_DUMMY_LEADERBOARD_COUNT),
    });
    this.publishAndSave();

    return {
      ok: true,
      preset,
      leaderboard,
      worldNotice: this.gameplayFacade.getSnapshot().worldNotice,
    };
  }

  setGuildState(presetOrOptions = 'full', optionsArg = {}) {
    const options = this.toPresetOptions(presetOrOptions, optionsArg, 'full');
    const preset = this.normalizeId(options.preset);
    const guildFacade = this.gameplayFacade.guildFacade;

    if (!guildFacade) {
      return { ok: false, reason: 'guild_missing' };
    }

    if (preset === 'locked' || preset === 'none' || preset === 'clear') {
      this.applyLevel(Math.max(1, FEATURE_LEVELS.guild - 1));
      guildFacade.applyPersistenceSnapshot({});
      this.publishAndSave();
      return {
        ok: true,
        preset,
        guild: this.gameplayFacade.getSnapshot().guild,
      };
    }

    this.ensureLevelAtLeast(FEATURE_LEVELS.guild);

    if (preset === 'charter' || preset === 'uncreated') {
      guildFacade.applyPersistenceSnapshot({});
      this.addCoinSilently(Math.floor(Number(options.coin) || 5_000));
      this.publishAndSave();
      return {
        ok: true,
        preset,
        guild: this.gameplayFacade.getSnapshot().guild,
      };
    }

    const now = this.getNow();
    const profile = {
      name: String(options.name ?? 'QA Order').slice(0, 24),
      tag: String(options.tag ?? options.allianceTag ?? 'QA').slice(0, 5),
      color: options.color ?? 'black',
      createdAtMs: now,
    };

    const defaultSecretaryLevel =
      preset === 'full' || preset === 'claimable' || preset === 'urgent' ? 3 : 1;
    const secretaryLevel = Math.min(
      5,
      Math.max(1, Math.floor(Number(options.secretaryLevel) || defaultSecretaryLevel)),
    );

    guildFacade.applyPersistenceSnapshot({
      profile,
      secretaryLevel,
      lastSimAtMs: now,
      applicants: [],
      adventurers: [],
      board: [],
      availableRequests: [],
      logs: [
        {
          id: 1,
          text: `guild charter signed for ${profile.name}.`,
          tone: 'orange',
          atMs: now,
        },
      ],
      nextLogId: 2,
    });
    guildFacade.ensureGeneratedState?.();

    const state = guildFacade.getPersistenceSnapshot();
    const hireCount =
      preset === 'applicants' || preset === 'joined'
        ? 0
        : Math.max(1, Math.floor(Number(options.adventurers) || 2));
    const hired = state.applicants.slice(0, hireCount).map((applicant, index) => ({
      ...applicant,
      id: `adventurer:dev-${index + 1}`,
      status: preset === 'urgent' && index === 0 ? 'hospital' : 'idle',
      hiredAtMs: now,
      hospitalUntilMs: preset === 'urgent' && index === 0 ? now + 60 * 60 * 1000 : null,
      history: [
        {
          text:
            preset === 'claimable' && index === 0
              ? `${applicant.name} completes a QA request.`
              : `${applicant.name} joins the guild.`,
          atMs: now,
        },
      ],
    }));
    const requestedBoardCount = Number(options.board);
    const boardCount = Math.max(
      0,
      Math.floor(Number.isFinite(requestedBoardCount) ? requestedBoardCount : 2),
    );
    const board = state.availableRequests.slice(0, boardCount);

    guildFacade.applyPersistenceSnapshot({
      ...state,
      applicants: state.applicants.slice(hireCount),
      adventurers: hired,
      board,
      availableRequests: state.availableRequests.slice(board.length),
    });
    this.publishAndSave();

    return {
      ok: true,
      preset,
      guild: this.gameplayFacade.getSnapshot().guild,
    };
  }

  setBackendState(state = 'connected', options = {}) {
    const normalizedState = this.normalizeId(state);
    const connected = normalizedState === 'connected' || normalizedState === 'online';
    const reason =
      normalizedState === 'accountinuse'
        ? 'account_in_use'
        : normalizedState === 'savefailed' || normalizedState === 'savefail'
          ? 'gameplay_save_timeout'
          : normalizedState === 'reconnecting'
            ? 'disconnect'
            : options.reason ?? 'disconnect';

    if (connected) {
      this.onlineGateManager?.hide?.();
    } else if (normalizedState === 'reconnecting') {
      this.onlineGateManager?.showConnecting?.();
    } else {
      this.onlineGateManager?.showOffline?.(reason);
    }

    const playerShop = this.applyPlayerShopSnapshot(
      this.createPlayerShopDevSnapshot({
        connected,
      }),
    );

    return {
      ok: true,
      state: normalizedState,
      reason: connected ? null : reason,
      playerShop,
    };
  }

  openDialog(dialogId, options = {}) {
    const normalizedDialogId = this.normalizeId(dialogId);

    if (!normalizedDialogId) {
      return { ok: false, reason: 'invalid_dialog_id', dialogId };
    }

    if (NON_PERSISTENT_DEV_DIALOGS.has(normalizedDialogId)) {
      if (!this.pagesFacade || typeof this.pagesFacade.openDialog !== 'function') {
        return { ok: false, reason: 'pages_missing' };
      }

      return this.pagesFacade.openDialog(dialogId, options);
    }

    this.ensureFeatureForDialog(normalizedDialogId);
    this.publishAndSave();

    if (!this.pagesFacade || typeof this.pagesFacade.openDialog !== 'function') {
      return { ok: false, reason: 'pages_missing' };
    }

    return this.pagesFacade.openDialog(dialogId, options);
  }

  listUiSurfaces() {
    return {
      ok: true,
      surfaces: UI_SURFACE_DEFINITIONS.map((surface) => ({
        id: surface.id,
        kind: surface.kind,
        pageId: surface.pageId ?? null,
        dialogId: surface.dialogId ?? null,
        aliases: [...(surface.aliases ?? [])],
        command: `cheats.openUi("${surface.id}")`,
      })),
    };
  }

  openUi(surfaceId, options = {}) {
    const normalizedSurfaceId = normalizeSurfaceId(surfaceId);

    if (!normalizedSurfaceId) {
      return { ok: false, reason: 'invalid_ui_surface_id', surfaceId };
    }

    if (normalizedSurfaceId.startsWith('page')) {
      const pageId = normalizedSurfaceId.slice('page'.length);
      return this.decorateUiResult(surfaceId, this.showPage(pageId, options));
    }

    if (normalizedSurfaceId.startsWith('dialog')) {
      const dialogId = normalizedSurfaceId.slice('dialog'.length);
      return this.decorateUiResult(surfaceId, this.openDialog(dialogId, options));
    }

    const surface = UI_SURFACE_LOOKUP.get(normalizedSurfaceId);

    if (surface) {
      return this.openKnownUiSurface(surface, options);
    }

    const dialogResult = this.openDialog(surfaceId, options);

    if (dialogResult.ok !== false || dialogResult.reason !== 'unknown_dialog') {
      return this.decorateUiResult(surfaceId, dialogResult);
    }

    const pageResult = this.showPage(surfaceId, options);

    if (pageResult.ok !== false) {
      return this.decorateUiResult(surfaceId, pageResult);
    }

    return {
      ok: false,
      reason: 'unknown_ui_surface',
      surfaceId,
      knownSurfaces: UI_SURFACE_DEFINITIONS.map((surfaceDefinition) => surfaceDefinition.id),
    };
  }

  openKnownUiSurface(surface, options = {}) {
    if (surface.kind === 'tool' && surface.id === 'devConsole') {
      const result = this.devConsoleFacade?.open?.() ?? {
        ok: false,
        reason: 'dev_console_missing',
      };
      return this.decorateUiResult(surface.id, result, surface);
    }

    if (surface.setup === 'guildFull') {
      return this.openGuildQuestPostingSurface(surface, options);
    }

    const result =
      surface.kind === 'page'
        ? this.showPage(surface.pageId, options)
        : this.openDialog(surface.dialogId, options);

    return this.decorateUiResult(surface.id, result, surface);
  }

  openGuildQuestPostingSurface(surface, options = {}) {
    const {
      setup = true,
      guildPreset = 'full',
      guildOptions = {},
      ...dialogOptions
    } = options ?? {};
    const state = setup
      ? this.setGuildState(guildPreset, {
          adventurers: 2,
          secretaryLevel: 5,
          board: 0,
          ...guildOptions,
        })
      : { ok: true, skipped: true };

    if (state.ok === false) {
      return this.decorateUiResult(surface.id, state, surface);
    }

    const dialog = this.openDialog(surface.dialogId, dialogOptions);

    return {
      ...this.decorateUiResult(surface.id, dialog, surface),
      state,
      dialog,
    };
  }

  decorateUiResult(surfaceId, result, surface = null) {
    return {
      ...result,
      surfaceId: surface?.id ?? surfaceId,
      surfaceKind: surface?.kind ?? (result?.pageId ? 'page' : 'dialog'),
    };
  }

  setTimers(presetOrOptions = 'allReady', optionsArg = {}) {
    const options = this.toPresetOptions(presetOrOptions, optionsArg, 'allReady');
    const preset = this.normalizeId(options.preset);
    const progress =
      preset === 'half'
        ? 0.5
        : preset === 'almostdone'
          ? 0.95
          : preset === 'longrunning'
            ? 0.05
            : 1;
    const plotPhase = progress >= 1 ? 'ready' : 'growing';
    const cauldronPhase = progress >= 1 ? 'brewed' : 'brewing';
    const marketPreset =
      progress >= 1 ? 'ready' : progress >= 0.95 ? 'almostDone' : preset;
    const totalMs = preset === 'longrunning' ? 60 * 60 * 1000 : undefined;

    const plot = this.setPlot(1, {
      seed: options.seed ?? 'sage',
      phase: plotPhase,
      progress,
      totalMs,
    });
    const cauldron = this.setCauldron(1, {
      potion: options.potion ?? 'manaTonic',
      phase: cauldronPhase,
      progress,
      totalMs,
    });
    const market = this.setMarketState(marketPreset, {
      slots: 2,
      sellProgressSeconds:
        preset === 'longrunning'
          ? 120
          : preset === 'half'
            ? 45
            : preset === 'almostdone'
              ? 89
              : 0,
    });

    return {
      ok: plot.ok !== false && cauldron.ok !== false && market.ok !== false,
      preset,
      plot,
      cauldron,
      market,
    };
  }

  setStressText(options = {}) {
    const safeOptions = options && typeof options === 'object' ? options : {};
    const results = {
      profile: this.setProfile({
        username:
          safeOptions.username ??
          'Archwizard Whose Very Long Name Must Still Fit',
        guildName: 'The Extremely Wordy QA Fellowship',
        allianceTag: 'LONG',
      }),
      inventory: this.setInventoryPreset('overflow'),
      market: this.setMarketState('full', { slots: 5, quantity: 999 }),
      worldEvent: this.setWorldEventState('complete', { leaderboardCount: 24 }),
      guild: this.setGuildState('claimable', {
        name: 'Very Long QA Guild Name',
        tag: 'LONG',
        adventurers: 3,
        board: 4,
      }),
      notifications: this.setNotifications('all'),
      leaderboard: this.setDummyLeaderboard({ count: 24 }),
    };

    return {
      ok: Object.values(results).every((result) => result?.ok !== false),
      results,
      snapshot: this.gameplayFacade.getSnapshot(),
    };
  }

  setDummyLeaderboard(options = {}) {
    const safeOptions = options && typeof options === 'object' ? options : {};
    const count = Math.max(
      1,
      Math.floor(Number(safeOptions.count) || DEFAULT_DUMMY_LEADERBOARD_COUNT),
    );
    const users = this.createDummyLeaderboardUsers(count);
    const snapshot = this.createDummyLeaderboardSnapshot(users);
    const eventSnapshot = this.createDummyWorldEventLeaderboardSnapshot(users);
    const leaderboardFacade = this.backendFacade?.getLeaderboardFacade?.();
    const eventLeaderboardFacade = this.backendFacade?.getWorldEventLeaderboardFacade?.();
    const leaderboardApplied =
      typeof leaderboardFacade?.setDevSnapshot === 'function'
        ? leaderboardFacade.setDevSnapshot(snapshot)
        : { ok: false, reason: 'leaderboard_missing' };
    const worldEventApplied =
      typeof eventLeaderboardFacade?.setDevSnapshot === 'function'
        ? eventLeaderboardFacade.setDevSnapshot(eventSnapshot)
        : { ok: false, reason: 'world_event_leaderboard_missing' };

    return {
      ok: leaderboardApplied.ok !== false || worldEventApplied.ok !== false,
      leaderboard: leaderboardApplied,
      worldEventLeaderboard: worldEventApplied,
      snapshot,
      eventSnapshot,
    };
  }

  clearDummyLeaderboard() {
    const leaderboardFacade = this.backendFacade?.getLeaderboardFacade?.();
    const eventLeaderboardFacade = this.backendFacade?.getWorldEventLeaderboardFacade?.();
    const leaderboard =
      typeof leaderboardFacade?.clearDevSnapshot === 'function'
        ? leaderboardFacade.clearDevSnapshot()
        : { ok: false, reason: 'leaderboard_missing' };
    const worldEventLeaderboard =
      typeof eventLeaderboardFacade?.clearDevSnapshot === 'function'
        ? eventLeaderboardFacade.clearDevSnapshot()
        : { ok: false, reason: 'world_event_leaderboard_missing' };

    return {
      ok: leaderboard.ok !== false || worldEventLeaderboard.ok !== false,
      leaderboard,
      worldEventLeaderboard,
    };
  }

  listTutorialStages() {
    const result =
      typeof this.pagesFacade?.listTutorialStages === 'function'
        ? this.pagesFacade.listTutorialStages()
        : getTutorialStepGraph();

    return {
      ...result,
      stages: result.stages ?? result.steps?.map((step) => step.id) ?? [...TUTORIAL_STEP_IDS],
    };
  }

  getTutorialGraph() {
    return getTutorialStepGraph();
  }

  setTutorialStage(stageId, options = {}) {
    if (options?.loadState === false) {
      return this.applyTutorialStageProgress(stageId);
    }

    return this.loadTutorialStep(stageId, options);
  }

  loadTutorialStep(stageId, options = {}) {
    const normalizedStageId = String(stageId ?? '').trim();
    const lowerStageId = normalizedStageId.toLowerCase();

    if (!normalizedStageId) {
      return { ok: false, reason: 'invalid_stage_id', stageId };
    }

    if (lowerStageId === 'complete' || lowerStageId === 'done') {
      const progress = this.applyTutorialStageProgress(lowerStageId);
      this.publishAndSave();
      return {
        ok: progress.ok !== false,
        requestedStepId: lowerStageId,
        progress,
        activeStep: this.getTutorialActiveStepSummary(),
      };
    }

    const stepId =
      lowerStageId === 'reset' || lowerStageId === 'start'
        ? TUTORIAL_STEP_IDS[0]
        : resolveTutorialStepId(normalizedStageId);

    if (!stepId) {
      return {
        ok: false,
        reason: 'unknown_stage',
        stageId,
        graph: this.getTutorialGraph(),
      };
    }

    const state = this.applyTutorialStepGameplayState(stepId, options);

    if (state.ok === false) {
      return state;
    }

    const progress = this.applyTutorialStageProgress(stepId);

    if (progress.ok === false) {
      return progress;
    }

    const ui = this.applyTutorialStepUiState(state.preset);
    this.refreshTutorialNow();
    const activeStep = this.getTutorialActiveStepSummary();
    const matched = activeStep ? activeStep.id === stepId : null;

    return {
      ok: matched !== false,
      requestedStepId: stepId,
      code: state.preset.code,
      matched,
      ...(matched === false ? { reason: 'active_step_mismatch' } : {}),
      activeStep,
      progress,
      ui,
      snapshot: this.getTutorialSnapshotSummary(),
    };
  }

  applyTutorialStageProgress(stageId) {
    if (typeof this.pagesFacade?.setTutorialStage !== 'function') {
      return { ok: false, reason: 'tutorial_missing' };
    }

    return this.pagesFacade.setTutorialStage(stageId);
  }

  applyTutorialStepGameplayState(stepId, options = {}) {
    const preset = this.createTutorialStepPreset(stepId, options);

    if (!preset) {
      return { ok: false, reason: 'unknown_stage', stageId: stepId };
    }

    const save = this.createTutorialStepSave(preset);
    const loaded = this.gameplayFacade.loadPersistenceSave(save);

    if (!loaded) {
      return {
        ok: false,
        reason: 'tutorial_load_failed',
        stageId: stepId,
      };
    }

    this.publishAndSave();

    return {
      ok: true,
      preset,
    };
  }

  createTutorialStepPreset(stepId, options = {}) {
    const graph = getTutorialStepGraph();
    const graphStep = graph.steps.find((step) => step.id === stepId);

    if (!graphStep) {
      return null;
    }

    const preset = {
      stepId,
      code: graphStep.code,
      level: this.getTutorialStepLevel(stepId),
      pageId: this.getTutorialStepPageId(stepId),
      mana: Number.isFinite(options.mana) ? options.mana : 40,
      coin: Number.isFinite(options.coin) ? options.coin : 10,
      inventory: {},
      research: [],
      tasks: [],
      garden: {
        unlockedTiles: 1,
        tiles: [],
      },
      brewing: {
        unlockedCauldrons: 1,
        cauldrons: [
          {
            cauldronNumber: 1,
            cauldronItemKeys: [],
            activeBrew: null,
          },
        ],
      },
      shop: {
        shelf: {
          unlockedSlots: 1,
          selectedSlotNumber: 1,
          sellProgressSeconds: 0,
          slots: [],
        },
        playerShelf: {
          unlockedSlots: 1,
          selectedSlotNumber: 1,
          slots: [],
        },
        playerRequests: {
          slots: [],
        },
        coinOffer: {
          cooldownRemainingSeconds: 0,
        },
      },
      ui: {},
    };

    switch (stepId) {
      case 'summon-five-seeds':
        preset.inventory[SAGE_SEED_KEY] = 1;
        preset.tasks = [
          this.createTutorialTaskState(LEVEL_ONE_SUMMON_SAGE_SEED_TASK_ID, 1, false),
        ];
        break;
      case 'intro-level-requirements':
        preset.inventory[SAGE_SEED_KEY] = 5;
        preset.tasks = [
          this.createTutorialTaskState(LEVEL_ONE_SUMMON_SAGE_SEED_TASK_ID, 5, true),
        ];
        break;
      case 'first-fill-seed-task':
        preset.inventory[SAGE_SEED_KEY] = 5;
        preset.tasks = [
          this.createTutorialTaskState(LEVEL_ONE_SUMMON_SAGE_SEED_TASK_ID, 5, true),
        ];
        break;
      case 'finish-seed-task':
        preset.inventory[SAGE_SEED_KEY] = 5;
        preset.tasks = [
          this.createTutorialTaskState(LEVEL_ONE_SUMMON_SAGE_SEED_TASK_ID, 5, true),
        ];
        break;
      case 'first-task-complete':
      case 'level-up-one':
        preset.tasks = [
          this.createTutorialTaskState(LEVEL_ONE_SUMMON_SAGE_SEED_TASK_ID, 5, true),
          this.createTutorialTaskState(LEVEL_ONE_SAGE_SEED_TASK_ID, 5, true),
        ];
        break;
      case 'open-market':
        this.applyLevelTwoReadyToSellPreset(preset);
        preset.pageId = 'workshop';
        break;
      case 'select-market-stand':
      case 'select-sage-seed-sale':
        this.applyLevelTwoReadyToSellPreset(preset);
        preset.pageId = 'shop';
        break;
      case 'show-selected-sale-amount':
      case 'earn-tutorial-coin':
        this.applyLevelTwoReadyToSellPreset(preset);
        preset.pageId = 'shop';
        preset.ui.openDirectSell = true;
        preset.ui.directSellItemKey = SAGE_SEED_KEY;
        break;
      case 'first-sale-complete':
      case 'unselect-sage-seed-sale':
        this.applyLevelTwoSoldPreset(preset);
        break;
      case 'level-up-two':
        this.applyCompletedLevelTwoPreset(preset);
        break;
      case 'first-research-complete':
      case 'fill-mint-seed-task':
        this.applyMintResearchPreset(preset);
        preset.inventory[MINT_SEED_KEY] = 3;
        break;
      case 'fill-sage-seed-task':
        this.applyMintSeedTurnInCompletePreset(preset);
        preset.inventory[SAGE_SEED_KEY] = 6;
        break;
      case 'level-up-three':
        this.applyCompletedLevelThreePreset(preset);
        break;
      case 'intro-garden':
      case 'grow-sage':
        preset.inventory[SAGE_SEED_KEY] = 1;
        preset.research.push(MINT_SEED_RESEARCH_ID);
        break;
      case 'first-harvest-complete':
      case 'fill-sage-herb-task':
        this.applyGardenIntroPreset(preset);
        preset.inventory[SAGE_HERB_KEY] = 4;
        break;
      case 'fill-mint-herb-task':
        this.applySageHerbCompletePreset(preset);
        preset.inventory[MINT_HERB_KEY] = 2;
        break;
      case 'level-up-four':
        this.applyCompletedLevelFourPreset(preset);
        break;
      case 'intro-brewing':
      case 'brew-mana-tonic':
        this.applyManaTonicResearchPreset(preset);
        preset.inventory[SAGE_HERB_KEY] = 3;
        break;
      case 'first-brew-complete':
      case 'refill-mana-tonic-cauldron':
        this.applyManaTonicBrewedPreset(preset);
        break;
      default:
        if (preset.level >= 2) {
          preset.research.push(MINT_SEED_RESEARCH_ID);
        }
        break;
    }

    return preset;
  }

  applyLevelTwoReadyToSellPreset(preset) {
    preset.inventory[SAGE_SEED_KEY] = 5;
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_TWO_SUMMON_SAGE_SEED_TASK_ID, 5, true),
    ];
  }

  applyLevelTwoSoldPreset(preset) {
    preset.inventory[SAGE_SEED_KEY] = 4;
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_TWO_SUMMON_SAGE_SEED_TASK_ID, 5, true),
      this.createTutorialTaskState(LEVEL_TWO_SELL_SAGE_SEED_TASK_ID, 1, true),
    ];
  }

  applyCompletedLevelTwoPreset(preset) {
    preset.coin = 4;
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_TWO_SUMMON_SAGE_SEED_TASK_ID, 5, true),
      this.createTutorialTaskState(LEVEL_TWO_SELL_SAGE_SEED_TASK_ID, 1, true),
      this.createTutorialTaskState(LEVEL_TWO_TURN_IN_SAGE_SEED_TASK_ID, 4, true),
    ];
  }

  applyMintResearchPreset(preset) {
    preset.research.push(MINT_SEED_RESEARCH_ID);
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_THREE_RESEARCH_MINT_SEED_TASK_ID, 1, true),
      this.createTutorialTaskState(LEVEL_THREE_SUMMON_MINT_SEED_TASK_ID, 3, true),
    ];
  }

  applyMintSeedTurnInCompletePreset(preset) {
    preset.research.push(MINT_SEED_RESEARCH_ID);
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_THREE_RESEARCH_MINT_SEED_TASK_ID, 1, true),
      this.createTutorialTaskState(LEVEL_THREE_SUMMON_MINT_SEED_TASK_ID, 3, true),
      this.createTutorialTaskState(LEVEL_THREE_TURN_IN_MINT_SEED_TASK_ID, 3, true),
      this.createTutorialTaskState(LEVEL_THREE_TURN_IN_SAGE_SEED_TASK_ID, 6, false),
    ];
  }

  applyCompletedLevelThreePreset(preset) {
    preset.coin = 8;
    preset.research.push(MINT_SEED_RESEARCH_ID);
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_THREE_RESEARCH_MINT_SEED_TASK_ID, 1, true),
      this.createTutorialTaskState(LEVEL_THREE_SUMMON_MINT_SEED_TASK_ID, 3, true),
      this.createTutorialTaskState(LEVEL_THREE_TURN_IN_MINT_SEED_TASK_ID, 3, true),
      this.createTutorialTaskState(LEVEL_THREE_TURN_IN_SAGE_SEED_TASK_ID, 6, true),
    ];
  }

  applyGardenIntroPreset(preset) {
    preset.research.push(MINT_SEED_RESEARCH_ID);
    preset.tasks = [this.createTutorialTaskState(LEVEL_FOUR_GROW_SAGE_HERB_TASK_ID, 1, false)];
    preset.garden = {
      unlockedTiles: 1,
      tiles: [
        {
          tileNumber: 1,
          selectedSeedItemKey: SAGE_SEED_KEY,
          seedItemKey: null,
          herbItemKey: null,
          harvestQuantity: 1,
          phase: 'empty',
          totalMs: 0,
          remainingMs: 0,
        },
      ],
    };
  }

  applySageHerbCompletePreset(preset) {
    preset.research.push(MINT_SEED_RESEARCH_ID);
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_FOUR_GROW_SAGE_HERB_TASK_ID, 4, true),
      this.createTutorialTaskState(LEVEL_FOUR_TURN_IN_SAGE_HERB_TASK_ID, 4, true),
      this.createTutorialTaskState(LEVEL_FOUR_GROW_MINT_HERB_TASK_ID, 2, true),
    ];
  }

  applyCompletedLevelFourPreset(preset) {
    preset.coin = 16;
    preset.research.push(MINT_SEED_RESEARCH_ID);
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_FOUR_GROW_SAGE_HERB_TASK_ID, 4, true),
      this.createTutorialTaskState(LEVEL_FOUR_GROW_MINT_HERB_TASK_ID, 2, true),
      this.createTutorialTaskState(LEVEL_FOUR_TURN_IN_SAGE_HERB_TASK_ID, 4, true),
      this.createTutorialTaskState(LEVEL_FOUR_TURN_IN_MINT_HERB_TASK_ID, 2, true),
    ];
  }

  applyManaTonicResearchPreset(preset) {
    preset.research.push(MINT_SEED_RESEARCH_ID, MANA_TONIC_RESEARCH_ID);
    preset.tasks = [
      this.createTutorialTaskState(LEVEL_FIVE_RESEARCH_MANA_TONIC_TASK_ID, 1, true),
    ];
  }

  applyManaTonicBrewedPreset(preset) {
    this.applyManaTonicResearchPreset(preset);
    preset.inventory[MANA_TONIC_KEY] = 1;
    preset.tasks.push(this.createTutorialTaskState(LEVEL_FIVE_BREW_MANA_TONIC_TASK_ID, 1, true));
  }

  createTutorialTaskState(taskId, progressQuantity, completed = false) {
    return {
      taskId,
      progressQuantity,
      completed,
    };
  }

  getTutorialStepLevel(stepId) {
    const index = TUTORIAL_STEP_IDS.indexOf(stepId);

    if (index < 0) {
      return 0;
    }

    if (index < 10) {
      return 0;
    }

    if (index < 20) {
      return 1;
    }

    if (index < 26) {
      return 2;
    }

    if (index < 32) {
      return 3;
    }

    return 4;
  }

  getTutorialStepPageId(stepId) {
    if (
      [
        'open-market',
        'select-market-stand',
        'select-sage-seed-sale',
        'show-selected-sale-amount',
        'earn-tutorial-coin',
      ].includes(stepId)
    ) {
      return 'shop';
    }

    if (['research-mint-seed', 'research-mana-tonic'].includes(stepId)) {
      return 'research';
    }

    if (['grow-sage', 'fill-mint-herb-task'].includes(stepId)) {
      return 'garden';
    }

    if (['brew-mana-tonic', 'refill-mana-tonic-cauldron'].includes(stepId)) {
      return 'brewing';
    }

    return 'workshop';
  }

  createTutorialStepSave(preset) {
    const save = this.createResetSave();
    const completedResearchIds = [...new Set(preset.research)];

    return {
      ...save,
      savedAt: this.getNow(),
      mana: {
        current: preset.mana,
      },
      coin: {
        current: preset.coin,
        totalGenerated: preset.coin,
      },
      inventory: Object.entries(preset.inventory)
        .filter(([, quantity]) => Math.floor(Number(quantity) || 0) > 0)
        .map(([itemKey, quantity]) => ({
          itemKey,
          quantity: Math.floor(Number(quantity) || 0),
        })),
      research: {
        completedIds: completedResearchIds,
        inProgress: [],
      },
      shop: preset.shop,
      brewing: preset.brewing,
      garden: preset.garden,
      tasks: {
        currentLevel: preset.level,
        tasks: preset.tasks,
      },
    };
  }

  applyTutorialStepUiState(preset) {
    const page =
      preset.pageId && this.pagesFacade
        ? this.showPage(preset.pageId, { unlock: true })
        : { ok: false, reason: 'page_missing' };
    let directSell = null;

    if (preset.ui.openDirectSell) {
      directSell = this.openDialog('market', { popup: 'directSell' });
      const selected = this.selectDirectSellItem(preset.ui.directSellItemKey);
      directSell = {
        ...directSell,
        selected,
      };
    }

    return {
      page,
      directSell,
    };
  }

  selectDirectSellItem(itemKey) {
    const item = this.getRawItemDefinition(itemKey);
    const manager = this.pagesFacade?.registryManager?.get?.('shop')?.directSellManager;

    if (!item || !manager) {
      return {
        ok: false,
        reason: item ? 'direct_sell_missing' : 'unknown_item',
        itemKey,
      };
    }

    manager.onSelectTab?.(item.kind);

    if (manager.selectedItemTypeId !== item.id) {
      manager.onSelectItem?.(item.id);
    }

    return {
      ok: true,
      itemKey: item.key,
      itemTypeId: item.id,
    };
  }

  refreshTutorialNow() {
    this.pagesFacade?.tutorialFacade?.cancelRefresh?.();
    this.pagesFacade?.tutorialFacade?.refresh?.();
  }

  getTutorialActiveStepSummary() {
    const step = this.pagesFacade?.tutorialFacade?.activeStep ?? null;

    if (!step) {
      return null;
    }

    return {
      id: step.id,
      kind: step.kind,
      targetId: step.targetId ?? null,
      stepLabel: step.stepLabel ?? '',
      lessonTitle: step.lessonTitle ?? '',
      text: step.text ?? step.objectiveText ?? step.hintText ?? '',
      progressLabel: step.progressLabel ?? '',
    };
  }

  getTutorialSnapshotSummary() {
    const snapshot = this.gameplayFacade.getSnapshot();

    return {
      level: snapshot?.tasks?.currentLevel ?? null,
      currentPageId: this.pagesFacade?.getCurrentPageId?.() ?? null,
      mana: snapshot?.mana ?? null,
      coin: snapshot?.coin ?? null,
      inventory: snapshot?.inventory ?? [],
      tasks: snapshot?.tasks?.level?.tasks ?? [],
      research: snapshot?.research?.completedResearchIds ?? [],
    };
  }

  async resetData(confirmation) {
    if (confirmation !== RESET_CONFIRMATION) {
      return {
        ok: false,
        reason: 'confirmation_required',
        confirmation: RESET_CONFIRMATION,
      };
    }

    if (!this.canSaveReset()) {
      return {
        ok: false,
        reason: 'backend_save_not_ready',
      };
    }

    const loaded = this.gameplayFacade.loadPersistenceSave(this.createResetSave());

    if (!loaded) {
      return {
        ok: false,
        reason: 'reset_failed',
      };
    }

    const saved = await Promise.resolve(
      this.gameplayFacade.savePersistenceSnapshotAndFlush(),
    );
    const playerShop = await this.clearPlayerShopProgress();
    const playerShopRequired = Boolean(this.backendFacade?.getPlayerShopFacade?.());
    const ok = Boolean(saved) && (!playerShopRequired || playerShop.ok !== false);

    return {
      ok,
      ...(ok ? {} : { reason: saved ? playerShop.reason : 'save_failed' }),
      scope: 'gameplay_progress',
      preserved: ['auth', 'profile', 'global_config', 'global_discoveries', 'chat'],
      playerShop,
      snapshot: this.gameplayFacade.getSnapshot(),
    };
  }

  listItems() {
    return {
      ok: true,
      items: [
        ...this.gameplayFacade.itemsFacade.getSeedDefinitions(),
        ...this.gameplayFacade.itemsFacade.getHerbDefinitions(),
        ...this.gameplayFacade.itemsFacade.getPotionDefinitions(),
      ].map((definition) => ({
        itemTypeId: definition.id,
        key: definition.key,
        label: definition.label,
        kind: definition.kind,
      })),
    };
  }

  listResearch() {
    return {
      ok: true,
      research: this.gameplayFacade.researchFacade
        .getSnapshot()
        .tabs.flatMap((tab) =>
          tab.boxes.flatMap((box) =>
            box.researches.map((research) => ({
              id: research.id,
              label: research.label,
              boxId: box.id,
              tabId: tab.id,
              completed: research.completed,
              locked: Boolean(research.locked),
            })),
          ),
        ),
    };
  }

  toPresetOptions(presetOrOptions, optionsArg = {}, defaultPreset = 'basic') {
    if (this.isPlainObject(presetOrOptions)) {
      return {
        ...presetOrOptions,
        preset: presetOrOptions.preset ?? presetOrOptions.state ?? defaultPreset,
      };
    }

    return {
      ...(this.isPlainObject(optionsArg) ? optionsArg : {}),
      preset: presetOrOptions ?? defaultPreset,
    };
  }

  isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  getAllItemDefinitions() {
    return [
      ...this.gameplayFacade.itemsFacade.getSeedDefinitions(),
      ...this.gameplayFacade.itemsFacade.getHerbDefinitions(),
      ...this.gameplayFacade.itemsFacade.getPotionDefinitions(),
    ];
  }

  normalizeInventoryItems(items) {
    if (Array.isArray(items)) {
      return items.map((item) => {
        if (typeof item === 'string') {
          return { itemKey: item, quantity: 1 };
        }

        return {
          itemKey: item?.itemKey ?? item?.key ?? item?.itemTypeId ?? item?.id,
          quantity: item?.quantity ?? item?.count ?? 1,
        };
      });
    }

    if (this.isPlainObject(items)) {
      return Object.entries(items).map(([itemKey, quantity]) => ({
        itemKey,
        quantity,
      }));
    }

    return [];
  }

  applyInventoryItems(items, { mode = 'replace' } = {}) {
    const normalizedItems = this.normalizeInventoryItems(items);
    const quantities = new Map();
    const unknownItems = [];

    if (mode === 'merge') {
      for (const item of this.gameplayFacade.itemsFacade.getPersistenceSnapshot()) {
        quantities.set(item.itemKey, item.quantity);
      }
    }

    for (const item of normalizedItems) {
      const definition = this.getRawItemDefinition(item.itemKey);

      if (!definition) {
        unknownItems.push(item.itemKey);
        continue;
      }

      const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const current = quantities.get(definition.key) ?? 0;
      quantities.set(definition.key, mode === 'merge' ? current + quantity : quantity);
    }

    if (unknownItems.length > 0) {
      return {
        ok: false,
        reason: 'unknown_items',
        itemKeys: unknownItems,
      };
    }

    this.gameplayFacade.itemsFacade.applyPersistenceSnapshot(
      [...quantities.entries()]
        .filter(([, quantity]) => quantity > 0)
        .map(([itemKey, quantity]) => ({ itemKey, quantity })),
    );

    return { ok: true };
  }

  addInventoryQuantities(items) {
    return this.applyInventoryItems(items, { mode: 'merge' });
  }

  createDevNotificationSnapshot(config = 'all') {
    const pages = {
      brewing: this.createDevNotificationPage({}),
      garden: this.createDevNotificationPage({}),
      workshop: this.createDevNotificationPage({}),
      research: this.createDevNotificationPage({}),
      shop: this.createDevNotificationPage({}),
      guild: this.createDevNotificationPage({}),
    };
    const rawConfig =
      typeof config === 'string'
        ? this.createDevNotificationPreset(config)
        : this.isPlainObject(config)
          ? config
          : {};

    for (const [key, value] of Object.entries(rawConfig)) {
      this.applyDevNotificationKey(pages, key, value);
    }

    return {
      pages,
      active: Object.values(pages).some((page) => page.active),
    };
  }

  createDevNotificationPreset(preset) {
    const normalized = this.normalizeId(preset);

    if (normalized === 'none' || normalized === 'clear' || normalized === 'empty') {
      return {};
    }

    if (normalized === 'market') {
      return { market: true };
    }

    if (normalized === 'guild') {
      return { guild: true };
    }

    if (normalized === 'event') {
      return { event: true };
    }

    return {
      brewing: true,
      garden: true,
      market: true,
      guild: true,
      research: true,
      tasks: true,
      event: true,
    };
  }

  applyDevNotificationKey(pages, key, value) {
    const normalized = this.normalizeId(key);
    const badge = this.createDevNotificationBadge(value);

    if (!badge) {
      return;
    }

    if (normalized === 'garden' || normalized === 'plots' || normalized === 'plot') {
      this.setDevNotificationChild(pages.garden, 'plots', badge);
      return;
    }

    if (normalized === 'brewing' || normalized === 'cauldron' || normalized === 'cauldrons') {
      this.setDevNotificationChild(pages.brewing, 'cauldron', badge);
      return;
    }

    if (normalized === 'market' || normalized === 'shop') {
      for (const child of ['npcStand', 'npcListing', 'playerStand', 'playerListing', 'playerMarket']) {
        this.setDevNotificationChild(pages.shop, child, badge);
      }
      return;
    }

    if (normalized === 'guild') {
      this.setDevNotificationChild(pages.guild, 'guild', badge);
      return;
    }

    if (normalized === 'research') {
      this.setDevNotificationChild(pages.research, 'research', badge);
      return;
    }

    if (normalized === 'tasks' || normalized === 'personaltasks') {
      this.setDevNotificationChild(pages.workshop, 'tasks', badge);
      this.setDevNotificationChild(pages.workshop, 'personalTasks', badge);
      return;
    }

    if (normalized === 'event' || normalized === 'worldevent' || normalized === 'worldnotice') {
      this.setDevNotificationChild(pages.workshop, 'worldEvent', badge);
      return;
    }

    this.setDevNotificationChild(pages.workshop, normalized || 'custom', badge);
  }

  createDevNotificationBadge(value) {
    if (value === false || value === null || typeof value === 'undefined') {
      return null;
    }

    if (this.isPlainObject(value)) {
      if (value.active === false) {
        return null;
      }

      return {
        active: true,
        tone: value.tone ?? 'orange',
      };
    }

    return {
      active: true,
      tone: value === 'red' ? 'red' : 'orange',
    };
  }

  createDevNotificationPage(children) {
    const childValues = Object.values(children);
    const active = childValues.some((child) => child?.active);
    const tone = childValues.some((child) => child?.tone === 'red') ? 'red' : 'orange';

    return {
      active,
      tone: active ? tone : null,
      children,
    };
  }

  setDevNotificationChild(page, childKey, badge) {
    page.children[childKey] = badge;
    page.active = true;
    page.tone = page.tone === 'red' || badge.tone === 'red' ? 'red' : 'orange';
  }

  getDevMarketItemKeys() {
    const herbs = this.gameplayFacade.itemsFacade.getHerbDefinitions();
    const seeds = this.gameplayFacade.itemsFacade.getSeedDefinitions();
    const potions = this.gameplayFacade.itemsFacade.getPotionDefinitions();

    return [
      herbs[0]?.key,
      herbs[1]?.key,
      potions[0]?.key,
      seeds[0]?.key,
    ].filter(Boolean);
  }

  createPlayerShopDevSnapshot({
    connected = true,
    listings = [],
    requests = [],
    proceedsCoin = 0,
  } = {}) {
    const now = this.getNow();
    const listingRows = listings
      .filter((slot) => slot?.itemKey)
      .map((slot, index) => this.createPlayerShopRow(slot, index, 'listing', now));
    const requestRows = requests
      .filter((slot) => slot?.itemKey)
      .map((slot, index) => this.createPlayerShopRow(slot, index, 'request', now));
    const tradeHistory = listingRows.slice(0, 2).map((row, index) => ({
      tradeId: `dev-trade-${index + 1}`,
      buyerIdentity: index === 0 ? 'dev-current' : 'dev-buyer',
      buyerUsername: index === 0 ? 'you' : 'Moonward',
      sellerIdentity: row.sellerIdentity,
      sellerUsername: row.username,
      itemKey: row.itemKey,
      itemLabel: row.itemLabel,
      itemKind: row.itemKind,
      quantity: row.quantity,
      priceCoin: row.priceCoin,
      totalPriceCoin: row.totalPriceCoin,
      tradedAtMs: now - index * 60_000,
    }));

    return {
      connected,
      listings: listingRows,
      ownListings: listingRows.slice(0, 2),
      requests: requestRows,
      ownRequests: requestRows.slice(0, 2),
      tradeHistory,
      ownTradeHistory: tradeHistory,
      proceedsCoin: Math.max(0, Math.floor(Number(proceedsCoin) || 0)),
    };
  }

  createPlayerShopRow(slot, index, rowKind, now) {
    const item = this.getRawItemDefinition(slot.itemKey);
    const keyPrefix = rowKind === 'request' ? 'request' : 'listing';
    const priceCoin = Math.max(1, Math.floor(Number(slot.priceCoin) || 1));
    const quantity = Math.max(1, Math.floor(Number(slot.quantity) || 1));

    return {
      [`${keyPrefix}Key`]: `dev-${keyPrefix}-${index + 1}`,
      ...(rowKind === 'request'
        ? {
            requesterIdentity: index === 0 ? 'dev-current' : `dev-requester-${index}`,
          }
        : {
            sellerIdentity: index === 0 ? 'dev-current' : `dev-seller-${index}`,
          }),
      username: index === 0 ? 'you' : ['Elara', 'Mothglass', 'Rootwright'][index % 3],
      slotNumber: slot.slotNumber ?? index + 1,
      itemKey: item?.key ?? slot.itemKey,
      itemLabel: item?.label ?? String(slot.itemKey),
      itemKind: item?.kind ?? 'herb',
      quantity,
      priceCoin,
      totalPriceCoin: quantity * priceCoin,
      updatedAtMs: now - index * 30_000,
    };
  }

  applyPlayerShopSnapshot(snapshot) {
    const playerShopFacade = this.backendFacade?.getPlayerShopFacade?.();

    if (typeof playerShopFacade?.setDevSnapshot !== 'function') {
      return { ok: false, reason: 'player_shop_missing' };
    }

    return playerShopFacade.setDevSnapshot(snapshot);
  }

  ensureFeatureForDialog(dialogId) {
    if (
      ['market', 'shop'].includes(dialogId)
    ) {
      this.ensureLevelAtLeast(FEATURE_LEVELS.market);
      return;
    }

    if (dialogId.startsWith('guild')) {
      this.ensureLevelAtLeast(FEATURE_LEVELS.guild);
      return;
    }

    if (['worldevent', 'event', 'worldnotice'].includes(dialogId)) {
      this.ensureLevelAtLeast(FEATURE_LEVELS.worldevent);
      return;
    }

    if (['leaderboard', 'leaderboards'].includes(dialogId)) {
      this.ensureLevelAtLeast(FEATURE_LEVELS.leaderboard);
      return;
    }

    if (['alliance', 'alliances', 'discoveries', 'discovery'].includes(dialogId)) {
      this.ensureLevelAtLeast(FEATURE_LEVELS.alliance);
      return;
    }

    if (['personaltasks', 'tasks'].includes(dialogId)) {
      this.ensureLevelAtLeast(FEATURE_LEVELS.personaltasks);
    }
  }

  addCoinSilently(amount) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));

    if (safeAmount > 0) {
      this.gameplayFacade.coinFacade.add(safeAmount);
    }
  }

  canSaveReset() {
    if (!this.backendFacade) {
      return true;
    }

    const gameplaySaveSnapshot =
      this.backendFacade.getGameplaySaveFacade?.()?.getSnapshot?.();

    return gameplaySaveSnapshot?.connected === true;
  }

  createResetSave() {
    return {
      version: GAMEPLAY_SAVE_VERSION,
      savedAt: this.getNow(),
      mana: {
        current: 40,
      },
      coin: {
        current: 10,
        totalGenerated: 0,
      },
      crystal: {
        current: 0,
      },
      ruby: {
        current: 0,
      },
      logs: {
        nextId: 1,
        entries: [],
      },
      inventory: [],
      research: {
        completedIds: [],
        inProgress: [],
      },
      prestige: {
        completedLevels: [],
      },
      visualSettings: {},
      shop: {
        shelf: {
          slots: [],
        },
        playerShelf: {
          slots: [],
        },
        coinOffer: {
          cooldownRemainingSeconds: 0,
        },
      },
      brewing: {
        autoBrewEnabled: false,
        autoBrewRecipeKey: null,
        cauldronItemKeys: [],
        activeBrew: null,
      },
      garden: {
        tiles: [],
      },
      tasks: {
        tasks: [],
      },
    };
  }

  getNow() {
    const now = this.gameplayFacade?.persistenceFacade?.now;

    if (typeof now !== 'function') {
      return Date.now();
    }

    return now();
  }

  async clearPlayerShopProgress() {
    const playerShopFacade = this.backendFacade?.getPlayerShopFacade?.();

    if (typeof playerShopFacade?.clearOwnProgress !== 'function') {
      return {
        ok: false,
        reason: 'backend_missing',
      };
    }

    try {
      return await playerShopFacade.clearOwnProgress();
    } catch {
      return {
        ok: false,
        reason: 'clear_failed',
      };
    }
  }

  applyLevel(level) {
    this.gameplayFacade.tasksFacade.applyPersistenceSnapshot({
      currentLevel: level,
      tasks: [],
    });
    this.gameplayFacade.syncPlayerLevelManaEffects?.();
  }

  ensureLevelAtLeast(level) {
    const currentLevel = this.getCurrentLevel();

    if (currentLevel >= level) {
      return { ok: true, level: currentLevel, changed: false };
    }

    this.applyLevel(level);
    return { ok: true, level, levelBefore: currentLevel, changed: true };
  }

  ensureLevelForGardenTile(tileNumber) {
    const requiredLevel =
      this.gameplayFacade.playerLevelFacade?.getRequiredLevelForGardenTile?.(tileNumber);

    if (Number.isInteger(requiredLevel)) {
      this.ensureLevelAtLeast(requiredLevel);
    }
  }

  ensureLevelForCauldron(cauldronNumber) {
    const requiredLevel =
      this.gameplayFacade.playerLevelFacade?.getRequiredLevelForCauldron?.(cauldronNumber);

    if (Number.isInteger(requiredLevel)) {
      this.ensureLevelAtLeast(requiredLevel);
    }
  }

  ensureLevelForNpcMarketStand(standNumber) {
    const requiredLevel =
      this.gameplayFacade.playerLevelFacade?.getRequiredLevelForNpcMarketStand?.(standNumber);

    if (Number.isInteger(requiredLevel)) {
      this.ensureLevelAtLeast(requiredLevel);
    }
  }

  ensureLevelForPlayerMarketStand(standNumber) {
    const requiredLevel =
      this.gameplayFacade.playerLevelFacade?.getRequiredLevelForPlayerMarketStand?.(standNumber);

    if (Number.isInteger(requiredLevel)) {
      this.ensureLevelAtLeast(requiredLevel);
    }
  }

  getCurrentLevel() {
    return this.gameplayFacade.getSnapshot().playerLevel?.currentLevel ?? 0;
  }

  getGardenMaxTiles() {
    const snapshot = this.gameplayFacade.getSnapshot().garden?.plot;

    return (
      snapshot?.configuredMaxTiles ??
      snapshot?.maxTiles ??
      this.gameplayFacade.gardenFacade?.gardenBalanceManager?.getMaxTiles?.() ??
      1
    );
  }

  getBrewingMaxCauldrons() {
    const snapshot = this.gameplayFacade.getSnapshot().brewing;

    return (
      snapshot?.configuredMaxCauldrons ??
      snapshot?.maxCauldrons ??
      this.gameplayFacade.brewingFacade?.brewingBalanceManager?.getMaxCauldrons?.() ??
      1
    );
  }

  getShopMaxSlots() {
    const snapshot = this.gameplayFacade.getSnapshot().shop?.shelf;

    return (
      this.gameplayFacade.shopFacade?.shopBalanceManager?.getMaxShelfSlots?.() ??
      snapshot?.maxSlots ??
      1
    );
  }

  hasConfiguredResearch(researchId) {
    return (
      typeof researchId === 'string' &&
      this.gameplayFacade.researchFacade?.researchDefinitionManager?.hasConfiguredResearch?.(
        researchId,
      ) === true
    );
  }

  getAllConfiguredResearchIds() {
    return (
      this.gameplayFacade.researchFacade?.researchDefinitionManager
        ?.getResearches?.({ includeLevelLockedAutomation: true })
        .map((research) => research.id) ?? []
    );
  }

  createGardenTileSnapshot({ tileNumber, seedKey, phase, options, existingTile }) {
    if (phase === 'empty') {
      return {
        tileNumber,
        selectedSeedItemKey: seedKey,
        seedItemKey: null,
        herbItemKey: null,
        harvestQuantity: 1,
        phase,
        totalMs: 0,
        remainingMs: 0,
      };
    }

    const seed = this.getRawItemDefinition(seedKey);

    if (!seed || seed.kind !== 'seed') {
      return {
        ok: false,
        reason: 'unknown_seed',
        seed: seedKey,
      };
    }

    const herb = this.gameplayFacade.itemsFacade.getItemDefinition(seed.producesHerbTypeId);
    const growthMs = this.getGardenGrowthMs(tileNumber, herb, options);
    const harvestMs = this.getGardenHarvestMs(options);
    const totalMs = phase === 'harvesting' ? harvestMs : growthMs;
    const remainingMs =
      phase === 'ready'
        ? 0
        : this.resolveRemainingMs({
            totalMs,
            options,
            defaultProgress: phase === 'growing' ? 0 : 0.5,
          });

    return {
      tileNumber,
      selectedSeedItemKey: options.selectedSeedKey ?? existingTile?.selectedSeedItemKey ?? seed.key,
      seedItemKey: seed.key,
      herbItemKey: herb.key,
      harvestQuantity: Math.max(1, Math.floor(Number(options.harvestQuantity) || 1)),
      phase,
      totalMs,
      remainingMs,
    };
  }

  resolvePlotSeedKey(options, existingTile) {
    const seed = options.seed ?? options.seedKey ?? options.item ?? existingTile?.seedItemKey;
    const selectedSeed = options.selectedSeed ?? options.selectedSeedKey;

    if (selectedSeed) {
      return this.toSeedKey(selectedSeed);
    }

    if (!seed) {
      return 'sageSeed';
    }

    return this.toSeedKey(seed);
  }

  toPlotOptions(seedOrOptions, phaseArg) {
    if (seedOrOptions && typeof seedOrOptions === 'object') {
      return { ...seedOrOptions };
    }

    return {
      seed: seedOrOptions,
      phase: phaseArg,
    };
  }

  normalizeGardenPhase(phase) {
    const normalized = this.normalizeId(phase);

    switch (normalized) {
      case 'empty':
      case 'clear':
        return 'empty';
      case 'ready':
      case 'done':
      case 'mature':
        return 'ready';
      case 'harvest':
      case 'harvesting':
        return 'harvesting';
      case 'selected':
      case 'selection':
        return 'empty';
      case 'grow':
      case 'growing':
      default:
        return 'growing';
    }
  }

  getGardenGrowthMs(tileNumber, herb, options = {}) {
    const rawMs = Number(options.totalMs ?? options.growthMs);

    if (Number.isFinite(rawMs) && rawMs > 0) {
      return rawMs;
    }

    const defaultMs = Number(herb?.growthDurationMs) || 1_000;

    return (
      this.gameplayFacade.researchFacade?.getReducedPlotGrowthDurationMs?.(
        tileNumber,
        defaultMs,
      ) ?? defaultMs
    );
  }

  getGardenHarvestMs(options = {}) {
    const rawMs = Number(options.totalMs ?? options.harvestMs);

    if (Number.isFinite(rawMs) && rawMs > 0) {
      return rawMs;
    }

    const harvestSeconds =
      this.gameplayFacade.gardenFacade?.gardenBalanceManager?.getHarvestSeconds?.() ?? 3;

    return harvestSeconds * 1_000;
  }

  toCauldronOptions(potionOrOptions, phaseArg) {
    if (potionOrOptions && typeof potionOrOptions === 'object') {
      return { ...potionOrOptions };
    }

    return {
      potion: potionOrOptions,
      phase: phaseArg,
    };
  }

  normalizeBrewPhase(phase) {
    const normalized = this.normalizeId(phase);

    switch (normalized) {
      case 'empty':
      case 'clear':
        return 'empty';
      case 'staged':
      case 'ingredients':
        return 'staged';
      case 'ready':
      case 'done':
      case 'complete':
        return 'ready';
      case 'bottling':
        return 'bottling';
      case 'brewed':
      case 'waiting':
        return 'brewed';
      case 'brewing':
      default:
        return 'brewing';
    }
  }

  resolveCauldronIngredientKeys(potionKey, options = {}) {
    const rawIngredients = options.ingredients ?? options.ingredientKeys;

    if (Array.isArray(rawIngredients)) {
      return rawIngredients.flatMap((item) => {
        if (typeof item === 'string') {
          return [this.toHerbKey(item)];
        }

        const key = item?.key ?? item?.itemKey ?? item?.herb ?? item?.herbKey;
        const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));
        return Array.from({ length: quantity }, () => this.toHerbKey(key));
      });
    }

    const recipe = this.gameplayFacade.itemsFacade.getPotionRecipe?.(potionKey);

    if (!recipe?.ingredients) {
      return [];
    }

    return recipe.ingredients.flatMap((ingredient) =>
      Array.from(
        { length: Math.max(1, Math.floor(Number(ingredient.quantity) || 1)) },
        () => ingredient.itemKey,
      ),
    );
  }

  resolveBrewTotalMs(potionKey, options = {}) {
    const rawMs = Number(options.totalMs ?? options.brewMs);

    if (Number.isFinite(rawMs) && rawMs > 0) {
      return rawMs;
    }

    return this.gameplayFacade.itemsFacade.getPotionRecipe?.(potionKey)?.brewDurationMs ?? 30_000;
  }

  resolveBottlingTotalMs(options = {}) {
    const rawMs = Number(options.bottlingTotalMs ?? options.bottlingMs);

    if (Number.isFinite(rawMs) && rawMs > 0) {
      return rawMs;
    }

    return (
      this.gameplayFacade.brewingFacade?.brewingBalanceManager?.getBottlingDurationMs?.() ??
      2_000
    );
  }

  resolveRemainingMs({ totalMs, options = {}, defaultProgress = 0 }) {
    const directMs = Number(options.remainingMs);

    if (Number.isFinite(directMs) && directMs >= 0) {
      return Math.min(totalMs, directMs);
    }

    const seconds = Number(options.remainingSeconds);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(totalMs, seconds * 1_000);
    }

    const progressValue = options.progress ?? options.percent ?? defaultProgress;
    const progress = Number(progressValue);

    if (Number.isFinite(progress)) {
      const normalizedProgress = progress > 1 ? progress / 100 : progress;
      return Math.max(0, Math.min(totalMs, totalMs * (1 - normalizedProgress)));
    }

    return totalMs;
  }

  createDummyLeaderboardUsers(count) {
    const names = [
      'Ftwizard',
      'Elara',
      'Mothglass',
      'Rootwright',
      'Inkcap',
      'Moonward',
      'Cinder',
      'Briarline',
      'Starfall',
      'Mistveil',
      'Copperbell',
      'Ashrook',
    ];
    const allianceTags = ['SUN', 'MOON', 'ROOT', 'ASH'];

    return Array.from({ length: count }, (_unused, index) => {
      const rank = index + 1;
      const totalIncome = (count - index) * 12_345;
      const name = names[index % names.length];

      return {
        identity: `dev-${rank}`,
        name: rank === 1 ? `${name} (you)` : name,
        playerLevel: Math.max(1, ALL_FEATURES_LEVEL - index * 3),
        income: Math.floor(totalIncome / 10),
        dailyIncome: Math.floor(totalIncome / 6),
        weeklyIncome: Math.floor(totalIncome / 3),
        monthlyIncome: Math.floor(totalIncome / 2),
        totalGeneratedCoin: totalIncome,
        totalIncome,
        points: (count - index) * 137,
        rank,
        character: index % 2 === 0 ? 'wizard' : 'witch',
        allianceTag: allianceTags[index % allianceTags.length],
        allianceTagColor: 'black',
      };
    });
  }

  createDummyLeaderboardSnapshot(users) {
    const rows = users.map((user) => this.createLeaderboardUserSnapshot(user));
    const currentUser = rows[0] ? { ...rows[0], rank: 1 } : null;

    return {
      topUsers: rows,
      topGeneratedCoinUsers: rows,
      topIncomeUsers: rows,
      topDailyUsers: rows,
      topWeeklyUsers: rows,
      topMonthlyUsers: rows,
      topAllTimeUsers: rows,
      currentGeneratedCoinUser: currentUser,
      currentIncomeUser: currentUser,
      currentDailyUser: currentUser,
      currentWeeklyUser: currentUser,
      currentMonthlyUser: currentUser,
      currentAllTimeUser: currentUser,
    };
  }

  createDummyWorldEventLeaderboardSnapshot(users) {
    const currentEvent = this.gameplayFacade.getSnapshot().worldNotice?.current ?? {};
    const rows = users.map((user) => ({
      identity: user.identity,
      name: user.name,
      playerLevel: user.playerLevel,
      allianceTag: user.allianceTag,
      allianceTagColor: user.allianceTagColor,
      character: user.character,
      points: user.points,
      rank: user.rank,
    }));

    return {
      connected: true,
      periodKey: currentEvent.periodKey ?? 'dev-period',
      eventId: currentEvent.eventId ?? 'dev-event',
      topWorldEventUsers: rows,
      topUsers: rows,
      currentWorldEventUser: rows[0] ?? null,
      currentUser: rows[0] ?? null,
    };
  }

  createLeaderboardUserSnapshot(user) {
    return {
      name: user.name,
      playerLevel: user.playerLevel,
      income: user.income,
      dailyIncome: user.dailyIncome,
      weeklyIncome: user.weeklyIncome,
      monthlyIncome: user.monthlyIncome,
      totalGeneratedCoin: user.totalGeneratedCoin,
      totalIncome: user.totalIncome,
      rank: user.rank,
      character: user.character,
      allianceTag: user.allianceTag,
      allianceTagColor: user.allianceTagColor,
    };
  }

  publishAndSave() {
    this.gameplayFacade.publishAndSaveSnapshot();
    this.pagesFacade?.syncPageUnlocks?.(this.gameplayFacade.getSnapshot());
  }

  getRawItemDefinition(itemKeyOrId) {
    try {
      const itemId = Number(itemKeyOrId);
      return Number.isInteger(itemId)
        ? this.gameplayFacade.itemsFacade.getItemDefinition(itemId)
        : this.gameplayFacade.itemsFacade.getItemDefinitionByKey(String(itemKeyOrId));
    } catch {
      return null;
    }
  }

  getItemDefinition(itemKeyOrId) {
    const definition = this.getRawItemDefinition(itemKeyOrId);

    if (!definition) {
      return {
        ok: false,
        reason: 'unknown_item',
        itemKeyOrId,
      };
    }

    return {
      ok: true,
      item: {
        itemTypeId: definition.id,
        key: definition.key,
        label: definition.label,
        kind: definition.kind,
      },
    };
  }

  parseCommand(command, args) {
    if (typeof command !== 'string') {
      return [command, args];
    }

    const parts = command.trim().split(/\s+/).filter(Boolean);

    if (parts.length <= 1 || args.length > 0) {
      return [command, args];
    }

    return [parts[0], parts.slice(1)];
  }

  normalizeCommandName(command) {
    return String(command ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  normalizeFeatureId(featureId) {
    return String(featureId ?? '')
      .trim()
      .replace(/[_\s-]/g, '')
      .toLowerCase();
  }

  normalizeId(value) {
    return String(value ?? '')
      .trim()
      .replace(/[_\s-]/g, '')
      .toLowerCase();
  }

  toSeedKey(seedKey) {
    const trimmedSeedKey = String(seedKey ?? '').trim();

    if (trimmedSeedKey.endsWith('Seed')) {
      return trimmedSeedKey;
    }

    return `${trimmedSeedKey}Seed`;
  }

  toHerbKey(herbKey) {
    const trimmedHerbKey = String(herbKey ?? '').trim();

    if (trimmedHerbKey.endsWith('Herb')) {
      return trimmedHerbKey;
    }

    return `${trimmedHerbKey}Herb`;
  }

  readFiniteNumber(value, label) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return {
        ok: false,
        reason: 'invalid_number',
        field: label,
        value,
      };
    }

    return {
      ok: true,
      value: number,
    };
  }

  readPositiveInteger(value, label) {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
      return {
        ok: false,
        reason: 'invalid_positive_integer',
        field: label,
        value,
      };
    }

    return {
      ok: true,
      value: number,
    };
  }

  readNonNegativeInteger(value, label) {
    const number = Number(value);

    if (!Number.isInteger(number) || number < 0) {
      return {
        ok: false,
        reason: 'invalid_non_negative_integer',
        field: label,
        value,
      };
    }

    return {
      ok: true,
      value: number,
    };
  }
}

function normalizeSurfaceId(surfaceId) {
  return String(surfaceId ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}
