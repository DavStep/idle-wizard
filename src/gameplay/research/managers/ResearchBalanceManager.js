import { automationResearchIds } from '../../automation/automationResearchIds.js';
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
import {
  researchTimeResearchIds,
  researchTimeResearchMaxLevel,
} from '../researchTimeResearch.js';
import {
  applyResearchCostReductionAmount,
  researchCostResearchIds,
  researchCostResearchMaxLevel,
} from '../researchCostResearch.js';
import {
  emeraldResearchIds,
  emeraldResearchMaxMultiplier,
  emeraldResearchMinMultiplier,
  getEmeraldResearchCost,
} from '../emeraldResearchIds.js';

const maxResearchDurationSeconds = 4 * 60 * 60;
const quickResearchDurationSeconds = 3;
const defaultResearchDurationSeconds = 10 * 60;

const seedResearchDurationSecondsById = {
  'unlockSeed:sageSeed': quickResearchDurationSeconds,
  'unlockSeed:mintSeed': 5 * 60,
  'unlockSeed:nettleSeed': 5 * 60,
  'unlockSeed:lavenderSeed': 7 * 60,
  'unlockSeed:briarSeed': 10 * 60,
  'unlockSeed:glowcapSeed': 12 * 60,
  'unlockSeed:mandrakeSeed': 15 * 60,
  'unlockSeed:sunrootSeed': 18 * 60,
  'unlockSeed:moonflowerSeed': 22 * 60,
  'unlockSeed:frostmossSeed': 26 * 60,
  'unlockSeed:dreambellSeed': 30 * 60,
  'unlockSeed:starAniseSeed': 35 * 60,
  'unlockSeed:bloodroseSeed': 40 * 60,
  'unlockSeed:dragonpepperSeed': 45 * 60,
  'unlockSeed:silverleafSeed': 50 * 60,
  'unlockSeed:yarrowSeed': 60 * 60,
  'unlockSeed:hyssopSeed': 70 * 60,
  'unlockSeed:valerianSeed': 80 * 60,
  'unlockSeed:comfreySeed': 90 * 60,
  'unlockSeed:nightshadeSeed': 100 * 60,
  'unlockSeed:belladonnaSeed': 110 * 60,
  'unlockSeed:wormwoodSeed': 120 * 60,
  'unlockSeed:snowdropSeed': 135 * 60,
  'unlockSeed:pearlrootSeed': 150 * 60,
};

const recipeResearchDurationSecondsById = {
  'unlockRecipe:manaTonic': 10,
  'unlockRecipe:minorHealingPotion': 5 * 60,
  'unlockRecipe:nettleVigor': 7 * 60,
  'unlockRecipe:calmingDraught': 10 * 60,
  'unlockRecipe:briarWard': 12 * 60,
  'unlockRecipe:lanternTonic': 15 * 60,
  'unlockRecipe:simpleAntidote': 18 * 60,
  'unlockRecipe:venomDraught': 22 * 60,
  'unlockRecipe:healingPotion': 26 * 60,
  'unlockRecipe:sunrootStamina': 30 * 60,
  'unlockRecipe:moonlitFocus': 35 * 60,
  'unlockRecipe:frostmossCleanse': 40 * 60,
  'unlockRecipe:sleepDraught': 45 * 60,
  'unlockRecipe:elixirOfLife': 50 * 60,
  'unlockRecipe:starLuckPhiltre': 60 * 60,
  'unlockRecipe:deepDreamVision': 70 * 60,
  'unlockRecipe:pactWard': 80 * 60,
  'unlockRecipe:dragonCourage': 90 * 60,
  'unlockRecipe:silverleafSalve': 100 * 60,
  'unlockRecipe:yarrowPoultice': 110 * 60,
  'unlockRecipe:hyssopClarity': 120 * 60,
  'unlockRecipe:valerianRest': 135 * 60,
  'unlockRecipe:comfreyBalm': 150 * 60,
  'unlockRecipe:nightshadeVeil': 165 * 60,
  'unlockRecipe:belladonnaSight': 180 * 60,
  'unlockRecipe:wormwoodPurge': 195 * 60,
  'unlockRecipe:snowdropBreath': 210 * 60,
  'unlockRecipe:pearlrootDraught': 240 * 60,
};

const DEFAULT_RESEARCH_BALANCE = {
  researchCostsCoin: {
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
    'unlockSeed:silverleafSeed': 45000,
    'unlockSeed:yarrowSeed': 63000,
    'unlockSeed:hyssopSeed': 88000,
    'unlockSeed:valerianSeed': 123000,
    'unlockSeed:comfreySeed': 172000,
    'unlockSeed:nightshadeSeed': 240000,
    'unlockSeed:belladonnaSeed': 335000,
    'unlockSeed:wormwoodSeed': 470000,
    'unlockSeed:snowdropSeed': 660000,
    'unlockSeed:pearlrootSeed': 925000,
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
    'unlockRecipe:silverleafSalve': 150000,
    'unlockRecipe:yarrowPoultice': 195000,
    'unlockRecipe:hyssopClarity': 255000,
    'unlockRecipe:valerianRest': 335000,
    'unlockRecipe:comfreyBalm': 440000,
    'unlockRecipe:nightshadeVeil': 580000,
    'unlockRecipe:belladonnaSight': 765000,
    'unlockRecipe:wormwoodPurge': 1000000,
    'unlockRecipe:snowdropBreath': 1300000,
    'unlockRecipe:pearlrootDraught': 1700000,
    ...createDefaultAutomationCosts(),
  },
  researchCostsCrystal: {
    'automation:autoSeedSpawn': 10,
    ...createDefaultAutomationCosts(),
  },
  researchCostsRuby: createDefaultAdvancedRubyCosts(),
  researchCostsEmerald: createDefaultEmeraldCosts(),
};

DEFAULT_RESEARCH_BALANCE.researchDurationsSeconds = createDefaultResearchDurations(
  DEFAULT_RESEARCH_BALANCE.researchCostsCoin,
  DEFAULT_RESEARCH_BALANCE.researchCostsCrystal,
  DEFAULT_RESEARCH_BALANCE.researchCostsRuby,
  DEFAULT_RESEARCH_BALANCE.researchCostsEmerald,
);

function createDefaultAutomationCosts() {
  const costs = {};

  for (let plotNumber = 1; plotNumber <= plotCapacityEndPlotNumber; plotNumber += 1) {
    costs[automationResearchIds.autoPlantTile(plotNumber)] = plotNumber;
    costs[automationResearchIds.autoHarvestPlant(plotNumber)] = plotNumber;
  }

  for (
    let cauldronNumber = 1;
    cauldronNumber <= cauldronCapacityEndCauldronNumber;
    cauldronNumber += 1
  ) {
    costs[automationResearchIds.autoBrewCauldron(cauldronNumber)] = cauldronNumber;
    costs[automationResearchIds.autoBottleCauldron(cauldronNumber)] = cauldronNumber;
  }

  return costs;
}

function createDefaultAdvancedRubyCosts() {
  const costs = {};

  fastSellResearchCostsRuby.forEach((cost, index) => {
    costs[fastSellResearchIds.payout(index + 1)] = cost;
  });

  for (let level = 1; level <= researchTimeResearchMaxLevel; level += 1) {
    costs[researchTimeResearchIds.reduction(level)] = level;
  }

  for (let level = 1; level <= researchCostResearchMaxLevel; level += 1) {
    costs[researchCostResearchIds.reduction(level)] = level;
  }

  for (
    let cauldronNumber = 1;
    cauldronNumber <= cauldronCapacityEndCauldronNumber;
    cauldronNumber += 1
  ) {
    for (let level = 1; level <= advancedResearchMaxLevel; level += 1) {
      costs[advancedResearchIds.cauldronBrewing(cauldronNumber, level)] = level;
    }
  }

  for (let plotNumber = 1; plotNumber <= plotCapacityEndPlotNumber; plotNumber += 1) {
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

function createDefaultEmeraldCosts() {
  const costs = {};

  for (let plotNumber = 1; plotNumber <= plotCapacityEndPlotNumber; plotNumber += 1) {
    for (
      let multiplier = emeraldResearchMinMultiplier;
      multiplier <= emeraldResearchMaxMultiplier;
      multiplier += 1
    ) {
      costs[emeraldResearchIds.plotPlanting(plotNumber, multiplier)] =
        getEmeraldResearchCost({ targetNumber: plotNumber, multiplier });
    }
  }

  for (
    let cauldronNumber = 1;
    cauldronNumber <= cauldronCapacityEndCauldronNumber;
    cauldronNumber += 1
  ) {
    for (
      let multiplier = emeraldResearchMinMultiplier;
      multiplier <= emeraldResearchMaxMultiplier;
      multiplier += 1
    ) {
      costs[emeraldResearchIds.cauldronBrewing(cauldronNumber, multiplier)] =
        getEmeraldResearchCost({ targetNumber: cauldronNumber, multiplier });
    }
  }

  return costs;
}

function createDefaultResearchDurations(
  costsCoin,
  costsCrystal = {},
  costsRuby = {},
  costsEmerald = {},
) {
  const researchIds = [
    ...Object.keys(costsCoin),
    ...Object.keys(costsCrystal).filter((researchId) => costsCoin[researchId] === undefined),
    ...Object.keys(costsRuby).filter(
      (researchId) =>
        costsCoin[researchId] === undefined && costsCrystal[researchId] === undefined,
    ),
    ...Object.keys(costsEmerald).filter(
      (researchId) =>
        costsCoin[researchId] === undefined &&
        costsCrystal[researchId] === undefined &&
        costsRuby[researchId] === undefined,
    ),
  ];

  return Object.fromEntries(
    researchIds.map((researchId) => [
      researchId,
      getDefaultResearchDurationSeconds(researchId, {
        costsCrystal,
        costsRuby,
        costsEmerald,
      }),
    ]),
  );
}

function getDefaultResearchDurationSeconds(
  researchId,
  { costsCrystal = {}, costsRuby = {}, costsEmerald = {} } = {},
) {
  if (
    costsCrystal[researchId] !== undefined ||
    costsRuby[researchId] !== undefined ||
    costsEmerald[researchId] !== undefined
  ) {
    return quickResearchDurationSeconds;
  }

  if (seedResearchDurationSecondsById[researchId] !== undefined) {
    return seedResearchDurationSecondsById[researchId];
  }

  if (recipeResearchDurationSecondsById[researchId] !== undefined) {
    return recipeResearchDurationSecondsById[researchId];
  }

  return defaultResearchDurationSeconds;
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
    this.costCoinByResearchId = this.readCostCoinByResearchId();
    this.costCrystalByResearchId = this.readCostCrystalByResearchId();
    this.costRubyByResearchId = this.readCostRubyByResearchId();
    this.costEmeraldByResearchId = this.readCostEmeraldByResearchId();
    this.durationSecondsByResearchId = this.readDurationSecondsByResearchId();
  }

  getCost(researchId, { researchCostReductionLevel = 0 } = {}) {
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

    const costEmerald = this.costEmeraldByResearchId[normalizedResearchId];

    if (Number.isFinite(costEmerald)) {
      return {
        amount: costEmerald,
        currency: 'emerald',
      };
    }

    const costCoin =
      this.runtimeConfigByResearchId.get(normalizedResearchId)?.costCoin ??
      this.costCoinByResearchId[normalizedResearchId];

    if (!Number.isFinite(costCoin)) {
      throw new Error(`game_config.research missing cost for ${researchId}.`);
    }

    return {
      amount: applyResearchCostReductionAmount(costCoin, researchCostReductionLevel),
      currency: 'coin',
    };
  }

  getCostCoin(researchId, options) {
    const cost = this.getCost(researchId, options);

    return cost.currency === 'coin' ? cost.amount : 0;
  }

  getCostCrystal(researchId, options) {
    const cost = this.getCost(researchId, options);

    return cost.currency === 'crystal' ? cost.amount : 0;
  }

  getCostRuby(researchId, options) {
    const cost = this.getCost(researchId, options);

    return cost.currency === 'ruby' ? cost.amount : 0;
  }

  getCostEmerald(researchId, options) {
    const cost = this.getCost(researchId, options);

    return cost.currency === 'emerald' ? cost.amount : 0;
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
        costCoin: this.normalizeOptionalCostCoin(config?.costCoin),
        durationSeconds: this.normalizeOptionalDurationSeconds(config?.durationSeconds),
        enabled: config?.enabled !== false,
      });
    }
  }

  normalizeResearchId(researchId) {
    return String(researchId ?? '').trim();
  }

  normalizeOptionalCostCoin(costCoin) {
    if (costCoin === undefined || costCoin === null) {
      return undefined;
    }

    const value = Number(costCoin);

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

  readCostCoinByResearchId() {
    const costs = this.balance?.researchCostsCoin;

    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
      throw new Error('game_config.research requires researchCostsCoin.');
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
      return { ...DEFAULT_RESEARCH_BALANCE.researchCostsCrystal };
    }

    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
      throw new Error('game_config.research researchCostsCrystal must be an object.');
    }

    for (const cost of Object.values(costs)) {
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error('game_config.research crystal costs must be zero or positive numbers.');
      }
    }

    return {
      ...DEFAULT_RESEARCH_BALANCE.researchCostsCrystal,
      ...costs,
    };
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

  readCostEmeraldByResearchId() {
    const costs = this.balance?.researchCostsEmerald;

    if (costs === undefined) {
      return { ...DEFAULT_RESEARCH_BALANCE.researchCostsEmerald };
    }

    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
      throw new Error('game_config.research researchCostsEmerald must be an object.');
    }

    for (const cost of Object.values(costs)) {
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error('game_config.research emerald costs must be zero or positive numbers.');
      }
    }

    return {
      ...DEFAULT_RESEARCH_BALANCE.researchCostsEmerald,
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
