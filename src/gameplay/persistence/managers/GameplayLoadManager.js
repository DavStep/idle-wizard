import {
  capacityResearchIds,
  cauldronCapacityEndCauldronNumber,
  cauldronCapacityStartCauldronNumber,
  plotCapacityEndPlotNumber,
  plotCapacityStartPlotNumber,
} from '../../research/capacityResearchIds.js';

const LEGACY_PLAYER_LEVEL_CAPS = [
  { level: 1, maxGardenTiles: 2, maxCauldrons: 1 },
  { level: 2, maxGardenTiles: 3, maxCauldrons: 1 },
  { level: 3, maxGardenTiles: 3, maxCauldrons: 1 },
  { level: 4, maxGardenTiles: 3, maxCauldrons: 1 },
  { level: 5, maxGardenTiles: 5, maxCauldrons: 3 },
  { level: 8, maxGardenTiles: 7, maxCauldrons: 3 },
  { level: 10, maxGardenTiles: 8, maxCauldrons: 3 },
  { level: 13, maxGardenTiles: 9, maxCauldrons: 3 },
  { level: 17, maxGardenTiles: 10, maxCauldrons: 3 },
  { level: 21, maxGardenTiles: 10, maxCauldrons: 4 },
  { level: 25, maxGardenTiles: 10, maxCauldrons: 5 },
];

export class GameplayLoadManager {
  constructor({
    manaFacade,
    coinFacade,
    crystalFacade,
    emeraldFacade,
    rubyFacade,
    inboxRewardsFacade,
    statsFacade,
    gameplayLogFacade,
    itemsFacade,
    researchFacade,
    automationFacade,
    seedSummoningFacade,
    prestigeFacade,
    visualSettingsFacade,
    shopFacade,
    brewingFacade,
    gardenFacade,
    tasksFacade,
    personalTasksFacade,
    worldNoticeFacade,
    guildFacade,
  }) {
    this.manaFacade = manaFacade;
    this.coinFacade = coinFacade;
    this.crystalFacade = crystalFacade;
    this.emeraldFacade = emeraldFacade;
    this.rubyFacade = rubyFacade;
    this.inboxRewardsFacade = inboxRewardsFacade ?? {
      applyPersistenceSnapshot: () => {},
    };
    this.statsFacade = statsFacade ?? {
      applyPersistenceSnapshot: () => {},
    };
    this.gameplayLogFacade = gameplayLogFacade;
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
    this.automationFacade = automationFacade;
    this.seedSummoningFacade = seedSummoningFacade;
    this.prestigeFacade = prestigeFacade;
    this.visualSettingsFacade = visualSettingsFacade;
    this.shopFacade = shopFacade;
    this.brewingFacade = brewingFacade;
    this.gardenFacade = gardenFacade;
    this.tasksFacade = tasksFacade;
    this.personalTasksFacade = personalTasksFacade;
    this.worldNoticeFacade = worldNoticeFacade;
    this.guildFacade = guildFacade;
  }

  applySave(save) {
    if (!save || typeof save !== 'object') {
      return false;
    }

    this.manaFacade.applyPersistenceSnapshot(save.mana);
    this.coinFacade.applyPersistenceSnapshot(save.coin ?? save.gold);
    this.crystalFacade.applyPersistenceSnapshot(save.crystal);
    this.emeraldFacade.applyPersistenceSnapshot(save.emerald);
    this.rubyFacade.applyPersistenceSnapshot(save.ruby);
    this.inboxRewardsFacade.applyPersistenceSnapshot(save.inboxRewards);
    this.statsFacade.applyPersistenceSnapshot(save.stats);
    this.gameplayLogFacade.applyPersistenceSnapshot(save.logs);
    this.itemsFacade.applyPersistenceSnapshot(save.inventory);
    this.researchFacade.applyPersistenceSnapshot(
      addInferredCapacityResearch(save.research, save),
    );
    this.automationFacade.applyPersistenceSnapshot(save.automation);
    this.seedSummoningFacade.applyPersistenceSnapshot(save.seedSummoning);
    this.prestigeFacade.applyPersistenceSnapshot(save.prestige);
    this.visualSettingsFacade.applyPersistenceSnapshot(save.visualSettings);
    this.tasksFacade.applyPersistenceSnapshot(save.tasks);
    this.shopFacade.applyPersistenceSnapshot(save.shop);
    this.brewingFacade.applyPersistenceSnapshot(save.brewing, this.itemsFacade);
    this.gardenFacade.applyPersistenceSnapshot(save.garden);
    this.personalTasksFacade.applyPersistenceSnapshot(save.personalTasks);
    this.worldNoticeFacade.applyPersistenceSnapshot(save.worldNotice);
    this.guildFacade.applyPersistenceSnapshot(save.guild);
    return true;
  }
}

function addInferredCapacityResearch(research = {}, save = {}) {
  const researchBranch = research && typeof research === 'object' ? research : {};
  const completedIds = new Set(
    Array.isArray(researchBranch?.completedIds) ? researchBranch.completedIds : [],
  );

  for (const researchId of getInferredCapacityResearchIds(save)) {
    completedIds.add(researchId);
  }

  return {
    ...researchBranch,
    completedIds: [...completedIds],
  };
}

function getInferredCapacityResearchIds(save = {}) {
  return [
    ...getInferredPlotCapacityResearchIds(save),
    ...getInferredCauldronCapacityResearchIds(save),
  ];
}

function getInferredPlotCapacityResearchIds(save = {}) {
  const legacyCaps = getLegacyPlayerLevelCaps(save);
  const unlockedTiles = Math.min(
    getInferredUnlockedTileCount(save?.garden),
    legacyCaps.maxGardenTiles,
  );
  const maxPlotNumber = Math.min(plotCapacityEndPlotNumber, unlockedTiles);
  const researchIds = [];

  for (
    let plotNumber = plotCapacityStartPlotNumber;
    plotNumber <= maxPlotNumber;
    plotNumber += 1
  ) {
    researchIds.push(capacityResearchIds.plot(plotNumber));
  }

  return researchIds;
}

function getInferredCauldronCapacityResearchIds(save = {}) {
  const legacyCaps = getLegacyPlayerLevelCaps(save);
  const unlockedCauldrons = Math.min(
    getInferredUnlockedCauldronCount(save?.brewing),
    legacyCaps.maxCauldrons,
  );
  const maxCauldronNumber = Math.min(cauldronCapacityEndCauldronNumber, unlockedCauldrons);
  const researchIds = [];

  for (
    let cauldronNumber = cauldronCapacityStartCauldronNumber;
    cauldronNumber <= maxCauldronNumber;
    cauldronNumber += 1
  ) {
    researchIds.push(capacityResearchIds.cauldron(cauldronNumber));
  }

  return researchIds;
}

function getLegacyPlayerLevelCaps(save = {}) {
  const currentLevel = Math.max(1, Math.floor(Number(save?.tasks?.currentLevel) || 1));
  let caps = LEGACY_PLAYER_LEVEL_CAPS[0];

  for (const candidate of LEGACY_PLAYER_LEVEL_CAPS) {
    if (candidate.level > currentLevel) {
      break;
    }

    caps = candidate;
  }

  return caps;
}

function getInferredUnlockedTileCount(garden = {}) {
  const directCount = Math.floor(Number(garden?.unlockedTiles));
  const tileCount = Array.isArray(garden?.tiles)
    ? Math.max(
        0,
        ...garden.tiles
          .map((tile) => Math.floor(Number(tile?.tileNumber)))
          .filter((tileNumber) => Number.isInteger(tileNumber) && tileNumber > 0),
      )
    : 0;

  return Math.max(Number.isInteger(directCount) ? directCount : 0, tileCount);
}

function getInferredUnlockedCauldronCount(brewing = {}) {
  const directCount = Math.floor(Number(brewing?.unlockedCauldrons));

  if (Number.isInteger(directCount) && directCount > 0) {
    return directCount;
  }

  if (!Array.isArray(brewing?.cauldrons)) {
    return 0;
  }

  return Math.max(
    0,
    ...brewing.cauldrons
      .filter((cauldron) => hasPersistedCauldronWork(cauldron))
      .map((cauldron) => Math.floor(Number(cauldron?.cauldronNumber)))
      .filter((cauldronNumber) => Number.isInteger(cauldronNumber) && cauldronNumber > 0),
  );
}

function hasPersistedCauldronWork(cauldron = {}) {
  return (
    (Array.isArray(cauldron?.cauldronItemKeys) && cauldron.cauldronItemKeys.length > 0) ||
    Boolean(cauldron?.activeBrew) ||
    cauldron?.autoBrewEnabled === true ||
    typeof cauldron?.autoBrewRecipeKey === 'string'
  );
}
