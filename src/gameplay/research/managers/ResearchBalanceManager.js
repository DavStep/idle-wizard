import { automationResearchIds } from '../../automation/automationResearchIds.js';
import { advancedResearchIds, advancedResearchMaxLevel } from '../advancedResearchIds.js';
import {
  automationReserveResearchIds,
  automationReserveResearchMaxLevel,
} from '../automationReserveResearch.js';
import {
  capacityResearchIds,
  cauldronCapacityEndCauldronNumber,
  cauldronCapacityStartCauldronNumber,
  plotCapacityEndPlotNumber,
  plotCapacityStartPlotNumber,
} from '../capacityResearchIds.js';
import {
  stallStaffingMaxStalls,
  stallStaffingResearchIds,
} from '../stallStaffingResearch.js';
import {
  minimumResearchDurationSeconds,
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
const quickResearchDurationSeconds = minimumResearchDurationSeconds;
const defaultResearchDurationSeconds = 10 * 60;

const discoveredRecipeResearchCostsCoin = {
  'unlockRecipe:ashenMemory': 102_400,
  'unlockRecipe:silverleafQuiet': 51_200,
  'unlockRecipe:emberSight': 1_638_400,
  'unlockRecipe:thornSleep': 204_800,
  'unlockRecipe:glassMoonElixir': 409_600,
  'unlockRecipe:rootboundResolve': 25_600,
  'unlockRecipe:nightOrchardTonic': 819_200,
  'unlockRecipe:starlessCourage': 1_638_400,
  'unlockRecipe:frostveinDraught': 102_400,
  'unlockRecipe:bloodlightWard': 819_200,
};

const seedResearchDurationSecondsById = {
  'unlockSeed:sageSeed': quickResearchDurationSeconds,
  'unlockSeed:mintSeed': 60,
  'unlockSeed:nettleSeed': 2 * 60,
  'unlockSeed:lavenderSeed': 3 * 60,
  'unlockSeed:briarSeed': 4 * 60,
  'unlockSeed:glowcapSeed': 5 * 60,
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
  'unlockRecipe:minorHealingPotion': 2 * 60,
  'unlockRecipe:nettleVigor': 3 * 60,
  'unlockRecipe:calmingDraught': 4 * 60,
  'unlockRecipe:briarWard': 5 * 60,
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
  ...Object.fromEntries(
    Object.keys(discoveredRecipeResearchCostsCoin).map((researchId) => [researchId, 0]),
  ),
};

const DEFAULT_RESEARCH_BALANCE = {
  researchCostsCoin: {
    'unlockSeed:sageSeed': 0,
    'unlockSeed:mintSeed': 0,
    'unlockSeed:nettleSeed': 400,
    'unlockSeed:lavenderSeed': 800,
    'unlockSeed:briarSeed': 1_600,
    'unlockSeed:glowcapSeed': 3_200,
    'unlockSeed:mandrakeSeed': 6_400,
    'unlockSeed:sunrootSeed': 12_800,
    'unlockSeed:moonflowerSeed': 25_600,
    'unlockSeed:frostmossSeed': 51_200,
    'unlockSeed:dreambellSeed': 102_400,
    'unlockSeed:starAniseSeed': 204_800,
    'unlockSeed:bloodroseSeed': 409_600,
    'unlockSeed:dragonpepperSeed': 819_200,
    'unlockSeed:silverleafSeed': 1_638_400,
    'unlockSeed:yarrowSeed': 3_276_800,
    'unlockSeed:hyssopSeed': 6_553_600,
    'unlockSeed:valerianSeed': 13_107_200,
    'unlockSeed:comfreySeed': 26_214_400,
    'unlockSeed:nightshadeSeed': 52_428_800,
    'unlockSeed:belladonnaSeed': 104_857_600,
    'unlockSeed:wormwoodSeed': 209_715_200,
    'unlockSeed:snowdropSeed': 419_430_400,
    'unlockSeed:pearlrootSeed': 838_860_800,
    'summonSeedsX2': 1_000,
    'summonSeedsX3': 10_000,
    'summonSeedsX4': 100_000,
    'summonSeedsX5': 1_000_000,
    'garden:plantAll': 1_000,
    'garden:harvestAll': 10_000,
    'unlockRecipe:manaTonic': 0,
    'unlockRecipe:minorHealingPotion': 400,
    'unlockRecipe:nettleVigor': 700,
    'unlockRecipe:calmingDraught': 1_200,
    'unlockRecipe:briarWard': 2_100,
    'unlockRecipe:lanternTonic': 3_800,
    'unlockRecipe:simpleAntidote': 6_600,
    'unlockRecipe:venomDraught': 11_000,
    'unlockRecipe:healingPotion': 20_000,
    'unlockRecipe:sunrootStamina': 35_000,
    'unlockRecipe:moonlitFocus': 62_000,
    'unlockRecipe:frostmossCleanse': 110_000,
    'unlockRecipe:sleepDraught': 190_000,
    'unlockRecipe:elixirOfLife': 330_000,
    'unlockRecipe:starLuckPhiltre': 580_000,
    'unlockRecipe:deepDreamVision': 1_000_000,
    'unlockRecipe:pactWard': 1_800_000,
    'unlockRecipe:dragonCourage': 3_100_000,
    'unlockRecipe:silverleafSalve': 5_400_000,
    'unlockRecipe:yarrowPoultice': 9_500_000,
    'unlockRecipe:hyssopClarity': 17_000_000,
    'unlockRecipe:valerianRest': 29_000_000,
    'unlockRecipe:comfreyBalm': 51_000_000,
    'unlockRecipe:nightshadeVeil': 89_000_000,
    'unlockRecipe:belladonnaSight': 160_000_000,
    'unlockRecipe:wormwoodPurge': 270_000_000,
    'unlockRecipe:snowdropBreath': 480_000_000,
    'unlockRecipe:pearlrootDraught': 830_000_000,
    ...discoveredRecipeResearchCostsCoin,
    ...createDefaultAutomationCosts(),
  },
  researchCostsCrystal: createDefaultMultiplierCosts(),
  researchCostsRuby: {
    'automation:autoSeedSpawn': 2,
    ...createDefaultAutomationCosts(),
  },
  researchCostsEmerald: createDefaultAdvancedCosts(),
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
  }

  for (
    let cauldronNumber = 1;
    cauldronNumber <= cauldronCapacityEndCauldronNumber;
    cauldronNumber += 1
  ) {
    costs[automationResearchIds.autoBrewCauldron(cauldronNumber)] = cauldronNumber;
  }

  return costs;
}

function createDefaultAdvancedCosts() {
  const costs = {};

  for (let level = 1; level <= researchTimeResearchMaxLevel; level += 1) {
    costs[researchTimeResearchIds.reduction(level)] = level;
  }

  for (let level = 1; level <= researchCostResearchMaxLevel; level += 1) {
    costs[researchCostResearchIds.reduction(level)] = level;
  }

  for (let level = 1; level <= automationReserveResearchMaxLevel; level += 1) {
    costs[automationReserveResearchIds.controls(level)] = level;
  }

  for (let stallNumber = 1; stallNumber <= stallStaffingMaxStalls; stallNumber += 1) {
    costs[stallStaffingResearchIds.capacity(stallNumber)] = stallNumber;
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

function createDefaultMultiplierCosts() {
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
    this.migrateCurrencyRoleCosts();
    this.durationSecondsByResearchId = this.readDurationSecondsByResearchId();
  }

  migrateCurrencyRoleCosts() {
    const crystalCosts = this.getConfiguredCurrencyCosts('researchCostsCrystal');
    const rubyCosts = this.getConfiguredCurrencyCosts('researchCostsRuby');
    const emeraldCosts = this.getConfiguredCurrencyCosts('researchCostsEmerald');

    this.costCrystalByResearchId = this.getMigratedCurrencyCosts({
      defaults: DEFAULT_RESEARCH_BALANCE.researchCostsCrystal,
      currentCosts: crystalCosts,
      legacyCosts: emeraldCosts,
    });
    this.costRubyByResearchId = this.getMigratedCurrencyCosts({
      defaults: DEFAULT_RESEARCH_BALANCE.researchCostsRuby,
      currentCosts: rubyCosts,
      legacyCosts: crystalCosts,
    });
    this.costEmeraldByResearchId = this.getMigratedCurrencyCosts({
      defaults: DEFAULT_RESEARCH_BALANCE.researchCostsEmerald,
      currentCosts: emeraldCosts,
      legacyCosts: rubyCosts,
    });
  }

  getConfiguredCurrencyCosts(key) {
    const costs = this.balance?.[key];

    return costs && typeof costs === 'object' && !Array.isArray(costs) ? costs : {};
  }

  getMigratedCurrencyCosts({ defaults, currentCosts, legacyCosts }) {
    const knownCurrencyResearchIds = new Set([
      ...Object.keys(DEFAULT_RESEARCH_BALANCE.researchCostsCrystal),
      ...Object.keys(DEFAULT_RESEARCH_BALANCE.researchCostsRuby),
      ...Object.keys(DEFAULT_RESEARCH_BALANCE.researchCostsEmerald),
    ]);
    const costs = {};

    for (const [researchId, amount] of Object.entries(currentCosts)) {
      if (!knownCurrencyResearchIds.has(researchId)) {
        costs[researchId] = amount;
      }
    }

    for (const [researchId, defaultAmount] of Object.entries(defaults)) {
      const configuredAmount = currentCosts[researchId] ?? legacyCosts[researchId];
      costs[researchId] = configuredAmount ?? defaultAmount;
    }

    return costs;
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

    const wholeDurationSeconds = Math.floor(value);

    if (wholeDurationSeconds === 0) {
      return 0;
    }

    return Math.min(
      maxResearchDurationSeconds,
      Math.max(minimumResearchDurationSeconds, wholeDurationSeconds),
    );
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
