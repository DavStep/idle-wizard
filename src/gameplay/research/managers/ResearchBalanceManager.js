import { advancedResearchIds, advancedResearchMaxLevel } from '../advancedResearchIds.js';
import {
  capacityResearchIds,
  cauldronCapacityEndCauldronNumber,
  cauldronCapacityStartCauldronNumber,
  plotCapacityEndPlotNumber,
  plotCapacityStartPlotNumber,
} from '../capacityResearchIds.js';
import {
  fastSellResearchCostsRuby,
  fastSellResearchIds,
} from '../fastSellResearch.js';

const maxResearchDurationSeconds = 10 * 60;

const DEFAULT_RESEARCH_BALANCE = {
  researchCostsGold: {
    'unlockSeed:sageSeed': 0,
    'unlockSeed:mintSeed': 25,
    'unlockSeed:nettleSeed': 120,
    'unlockSeed:lavenderSeed': 300,
    'unlockSeed:briarSeed': 650,
    'unlockSeed:glowcapSeed': 1200,
    'unlockSeed:mandrakeSeed': 2100,
    'unlockSeed:sunrootSeed': 3400,
    'unlockSeed:moonflowerSeed': 5200,
    'unlockSeed:frostmossSeed': 7600,
    'unlockSeed:dreambellSeed': 11000,
    'unlockSeed:starAniseSeed': 15500,
    'unlockSeed:bloodroseSeed': 22000,
    'unlockSeed:dragonpepperSeed': 32000,
    'summonSeedsX2': 600,
    'summonSeedsX3': 1800,
    'summonSeedsX4': 4500,
    'summonSeedsX5': 10000,
    'unlockRecipe:manaTonic': 0,
    'unlockRecipe:minorHealingPotion': 350,
    'unlockRecipe:nettleVigor': 750,
    'unlockRecipe:calmingDraught': 1300,
    'unlockRecipe:briarWard': 2100,
    'unlockRecipe:lanternTonic': 3200,
    'unlockRecipe:simpleAntidote': 4700,
    'unlockRecipe:venomDraught': 6800,
    'unlockRecipe:healingPotion': 9500,
    'unlockRecipe:sunrootStamina': 13000,
    'unlockRecipe:moonlitFocus': 17500,
    'unlockRecipe:frostmossCleanse': 23500,
    'unlockRecipe:sleepDraught': 31000,
    'unlockRecipe:elixirOfLife': 40000,
    'unlockRecipe:starLuckPhiltre': 52000,
    'unlockRecipe:deepDreamVision': 68000,
    'unlockRecipe:pactWard': 88000,
    'unlockRecipe:dragonCourage': 115000,
    'automation:autoPlantTile:1': 1,
    'automation:autoPlantTile:2': 2,
    'automation:autoPlantTile:3': 3,
    'automation:autoPlantTile:4': 4,
    'automation:autoPlantTile:5': 5,
    'automation:autoPlantTile:6': 6,
    'automation:autoPlantTile:7': 7,
    'automation:autoPlantTile:8': 8,
    'automation:autoPlantTile:9': 9,
    'automation:autoPlantTile:10': 10,
    'automation:autoHarvestPlant:1': 1,
    'automation:autoHarvestPlant:2': 2,
    'automation:autoHarvestPlant:3': 3,
    'automation:autoHarvestPlant:4': 4,
    'automation:autoHarvestPlant:5': 5,
    'automation:autoHarvestPlant:6': 6,
    'automation:autoHarvestPlant:7': 7,
    'automation:autoHarvestPlant:8': 8,
    'automation:autoHarvestPlant:9': 9,
    'automation:autoHarvestPlant:10': 10,
    'automation:autoBrewCauldron:1': 1,
    'automation:autoBrewCauldron:2': 2,
    'automation:autoBrewCauldron:3': 3,
    'automation:autoBrewCauldron:4': 4,
    'automation:autoBrewCauldron:5': 5,
    'automation:autoBottleCauldron:1': 1,
    'automation:autoBottleCauldron:2': 2,
    'automation:autoBottleCauldron:3': 3,
    'automation:autoBottleCauldron:4': 4,
    'automation:autoBottleCauldron:5': 5,
  },
  researchCostsCrystal: {
    'automation:autoSeedSpawn': 10,
    'automation:autoPlantTile:1': 1,
    'automation:autoPlantTile:2': 2,
    'automation:autoPlantTile:3': 3,
    'automation:autoPlantTile:4': 4,
    'automation:autoPlantTile:5': 5,
    'automation:autoPlantTile:6': 6,
    'automation:autoPlantTile:7': 7,
    'automation:autoPlantTile:8': 8,
    'automation:autoPlantTile:9': 9,
    'automation:autoPlantTile:10': 10,
    'automation:autoHarvestPlant:1': 1,
    'automation:autoHarvestPlant:2': 2,
    'automation:autoHarvestPlant:3': 3,
    'automation:autoHarvestPlant:4': 4,
    'automation:autoHarvestPlant:5': 5,
    'automation:autoHarvestPlant:6': 6,
    'automation:autoHarvestPlant:7': 7,
    'automation:autoHarvestPlant:8': 8,
    'automation:autoHarvestPlant:9': 9,
    'automation:autoHarvestPlant:10': 10,
    'automation:autoBrewCauldron:1': 1,
    'automation:autoBrewCauldron:2': 2,
    'automation:autoBrewCauldron:3': 3,
    'automation:autoBrewCauldron:4': 4,
    'automation:autoBrewCauldron:5': 5,
    'automation:autoBottleCauldron:1': 1,
    'automation:autoBottleCauldron:2': 2,
    'automation:autoBottleCauldron:3': 3,
    'automation:autoBottleCauldron:4': 4,
    'automation:autoBottleCauldron:5': 5,
  },
  researchCostsRuby: createDefaultAdvancedRubyCosts(),
};

DEFAULT_RESEARCH_BALANCE.researchDurationsSeconds = createDefaultResearchDurations(
  DEFAULT_RESEARCH_BALANCE.researchCostsGold,
  DEFAULT_RESEARCH_BALANCE.researchCostsCrystal,
  DEFAULT_RESEARCH_BALANCE.researchCostsRuby,
);
DEFAULT_RESEARCH_BALANCE.researchDurationsSeconds['unlockSeed:mintSeed'] = 15;
DEFAULT_RESEARCH_BALANCE.researchDurationsSeconds['unlockRecipe:manaTonic'] = 60;

function createDefaultAdvancedRubyCosts() {
  const costs = {};

  fastSellResearchCostsRuby.forEach((cost, index) => {
    costs[fastSellResearchIds.payout(index + 1)] = cost;
  });

  for (let cauldronNumber = 1; cauldronNumber <= 5; cauldronNumber += 1) {
    for (let level = 1; level <= advancedResearchMaxLevel; level += 1) {
      costs[advancedResearchIds.cauldronBrewing(cauldronNumber, level)] = level;
    }
  }

  for (let plotNumber = 1; plotNumber <= 10; plotNumber += 1) {
    for (let level = 1; level <= advancedResearchMaxLevel; level += 1) {
      costs[advancedResearchIds.plotGrowth(plotNumber, level)] = level;
    }
  }

  for (
    let plotNumber = plotCapacityStartPlotNumber;
    plotNumber <= plotCapacityEndPlotNumber;
    plotNumber += 1
  ) {
    costs[capacityResearchIds.plot(plotNumber)] = 1;
  }

  for (
    let cauldronNumber = cauldronCapacityStartCauldronNumber;
    cauldronNumber <= cauldronCapacityEndCauldronNumber;
    cauldronNumber += 1
  ) {
    costs[capacityResearchIds.cauldron(cauldronNumber)] = 1;
  }

  return costs;
}

function createDefaultResearchDurations(costsGold, costsCrystal = {}, costsRuby = {}) {
  const researchIds = [
    ...Object.keys(costsGold),
    ...Object.keys(costsCrystal).filter((researchId) => costsGold[researchId] === undefined),
    ...Object.keys(costsRuby).filter(
      (researchId) =>
        costsGold[researchId] === undefined && costsCrystal[researchId] === undefined,
    ),
  ];

  return Object.fromEntries(
    researchIds.map((researchId, index) => [researchId, getDefaultResearchDurationSeconds(index)]),
  );
}

function getDefaultResearchDurationSeconds(index) {
  if (index === 0) {
    return 3;
  }

  if (index === 1) {
    return 60;
  }

  return Math.min(maxResearchDurationSeconds, 300 + Math.max(0, index - 2) * 300);
}

export class ResearchBalanceManager {
  constructor({ balance = DEFAULT_RESEARCH_BALANCE } = {}) {
    this.runtimeConfigByResearchId = new Map();
    this.setBalance(balance);
  }

  setRuntimeBalance(balance) {
    this.setBalance(balance);
  }

  setBalance(balance) {
    this.balance = balance;
    this.costGoldByResearchId = this.readCostGoldByResearchId();
    this.costCrystalByResearchId = this.readCostCrystalByResearchId();
    this.costRubyByResearchId = this.readCostRubyByResearchId();
    this.durationSecondsByResearchId = this.readDurationSecondsByResearchId();
  }

  getCost(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    const costCrystal = this.costCrystalByResearchId[normalizedResearchId];

    if (Number.isFinite(costCrystal)) {
      return {
        amount: costCrystal,
        currency: 'crystal',
      };
    }

    const costRuby = this.costRubyByResearchId[normalizedResearchId];

    if (Number.isFinite(costRuby)) {
      return {
        amount: costRuby,
        currency: 'ruby',
      };
    }

    const costGold =
      this.runtimeConfigByResearchId.get(normalizedResearchId)?.costGold ??
      this.costGoldByResearchId[normalizedResearchId];

    if (!Number.isFinite(costGold)) {
      throw new Error(`game_config.research missing cost for ${researchId}.`);
    }

    return {
      amount: costGold,
      currency: 'gold',
    };
  }

  getCostGold(researchId) {
    const cost = this.getCost(researchId);

    return cost.currency === 'gold' ? cost.amount : 0;
  }

  getCostCrystal(researchId) {
    const cost = this.getCost(researchId);

    return cost.currency === 'crystal' ? cost.amount : 0;
  }

  getCostRuby(researchId) {
    const cost = this.getCost(researchId);

    return cost.currency === 'ruby' ? cost.amount : 0;
  }

  getDurationSeconds(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    const durationSeconds =
      this.runtimeConfigByResearchId.get(normalizedResearchId)?.durationSeconds ??
      this.durationSecondsByResearchId[normalizedResearchId] ??
      0;

    return this.normalizeDurationSeconds(durationSeconds);
  }

  getResearchEffect() {
    return null;
  }

  isResearchEnabled(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    return this.runtimeConfigByResearchId.get(normalizedResearchId)?.enabled !== false;
  }

  setRuntimeConfigs(configs = []) {
    this.runtimeConfigByResearchId = new Map();

    if (!Array.isArray(configs)) {
      return;
    }

    for (const config of configs) {
      const researchId = this.normalizeResearchId(config?.researchId);

      if (!researchId) {
        continue;
      }

      this.runtimeConfigByResearchId.set(researchId, {
        costGold: this.normalizeOptionalCostGold(config?.costGold),
        durationSeconds: this.normalizeOptionalDurationSeconds(config?.durationSeconds),
        enabled: config?.enabled !== false,
      });
    }
  }

  normalizeResearchId(researchId) {
    return String(researchId ?? '').trim();
  }

  normalizeOptionalCostGold(costGold) {
    if (costGold === undefined || costGold === null) {
      return undefined;
    }

    const value = Number(costGold);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.floor(value);
  }

  normalizeOptionalDurationSeconds(durationSeconds) {
    if (durationSeconds === undefined || durationSeconds === null) {
      return undefined;
    }

    return this.normalizeDurationSeconds(durationSeconds);
  }

  normalizeDurationSeconds(durationSeconds) {
    const value = Number(durationSeconds);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.min(maxResearchDurationSeconds, Math.floor(value));
  }

  readCostGoldByResearchId() {
    const costs = this.balance?.researchCostsGold;

    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
      throw new Error('game_config.research requires researchCostsGold.');
    }

    for (const cost of Object.values(costs)) {
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error('game_config.research costs must be zero or positive numbers.');
      }
    }

    return { ...costs };
  }

  readCostCrystalByResearchId() {
    const costs = this.balance?.researchCostsCrystal;

    if (costs === undefined) {
      return {};
    }

    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
      throw new Error('game_config.research researchCostsCrystal must be an object.');
    }

    for (const cost of Object.values(costs)) {
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error('game_config.research crystal costs must be zero or positive numbers.');
      }
    }

    return { ...costs };
  }

  readCostRubyByResearchId() {
    const costs = this.balance?.researchCostsRuby;

    if (costs === undefined) {
      return { ...DEFAULT_RESEARCH_BALANCE.researchCostsRuby };
    }

    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
      throw new Error('game_config.research researchCostsRuby must be an object.');
    }

    for (const cost of Object.values(costs)) {
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error('game_config.research ruby costs must be zero or positive numbers.');
      }
    }

    return {
      ...DEFAULT_RESEARCH_BALANCE.researchCostsRuby,
      ...costs,
    };
  }

  readDurationSecondsByResearchId() {
    const durations = this.balance?.researchDurationsSeconds;

    if (durations === undefined) {
      return { ...DEFAULT_RESEARCH_BALANCE.researchDurationsSeconds };
    }

    if (!durations || typeof durations !== 'object' || Array.isArray(durations)) {
      throw new Error('game_config.research researchDurationsSeconds must be an object.');
    }

    for (const durationSeconds of Object.values(durations)) {
      if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
        throw new Error('game_config.research durations must be zero or positive numbers.');
      }
    }

    return {
      ...DEFAULT_RESEARCH_BALANCE.researchDurationsSeconds,
      ...durations,
    };
  }
}
