import { automationResearchIds } from '../../automation/automationResearchIds.js';
import {
  advancedResearchIds,
  advancedResearchMaxLevel,
  getAdvancedResearchLevelReductionPercent,
} from '../advancedResearchIds.js';
import {
  fastSellResearchIds,
  fastSellResearchMaxLevel,
  getFastSellPercent,
} from '../fastSellResearch.js';
import {
  getResearchTimeReductionPercent,
  researchTimeResearchIds,
  researchTimeResearchMaxLevel,
} from '../researchTimeResearch.js';
import {
  getResearchCostReductionPercent,
  researchCostResearchIds,
  researchCostResearchMaxLevel,
} from '../researchCostResearch.js';
import {
  emeraldResearchIds,
  emeraldResearchMaxMultiplier,
  emeraldResearchMinMultiplier,
  formatEmeraldResearchStars,
  getEmeraldResearchStarLevel,
} from '../emeraldResearchIds.js';
import {
  capacityResearchIds,
  cauldronCapacityEndCauldronNumber,
  cauldronCapacityStartCauldronNumber,
  getCauldronCapacityPrestigeRequirement,
  getPlotCapacityPrestigeRequirement,
  plotCapacityEndPlotNumber,
  plotCapacityStartPlotNumber,
} from '../capacityResearchIds.js';

const summonSeedResearches = [
  {
    id: 'summonSeedsX2',
    label: 'x2 summon',
    value: '20 mana',
    description: 'summons 2 researched seeds for 20 mana.',
  },
  {
    id: 'summonSeedsX3',
    label: 'x3 summon',
    value: '30 mana',
    requiredResearchIds: ['summonSeedsX2'],
    description: 'summons 3 researched seeds for 30 mana.',
  },
  {
    id: 'summonSeedsX4',
    label: 'x4 summon',
    value: '40 mana',
    requiredResearchIds: ['summonSeedsX3'],
    description: 'summons 4 researched seeds for 40 mana.',
  },
  {
    id: 'summonSeedsX5',
    label: 'x5 summon',
    value: '50 mana',
    requiredResearchIds: ['summonSeedsX4'],
    description: 'summons 5 researched seeds for 50 mana.',
  },
];

const seedUnlockRequiredPlayerLevels = {
  mintSeed: 3,
  nettleSeed: 4,
  lavenderSeed: 5,
  briarSeed: 7,
  glowcapSeed: 9,
  mandrakeSeed: 11,
  sunrootSeed: 13,
  moonflowerSeed: 16,
  frostmossSeed: 19,
  dreambellSeed: 22,
  starAniseSeed: 25,
  bloodroseSeed: 28,
  dragonpepperSeed: 31,
  silverleafSeed: 34,
  yarrowSeed: 37,
  hyssopSeed: 40,
  valerianSeed: 43,
  comfreySeed: 46,
  nightshadeSeed: 49,
  belladonnaSeed: 52,
  wormwoodSeed: 55,
  snowdropSeed: 58,
  pearlrootSeed: 61,
};

const recipeUnlockRequiredPlayerLevels = {
  manaTonic: 4,
  minorHealingPotion: 5,
  nettleVigor: 6,
  calmingDraught: 8,
  briarWard: 10,
  lanternTonic: 12,
  simpleAntidote: 14,
  venomDraught: 16,
  healingPotion: 18,
  sunrootStamina: 20,
  moonlitFocus: 23,
  frostmossCleanse: 26,
  sleepDraught: 29,
  elixirOfLife: 32,
  starLuckPhiltre: 35,
  deepDreamVision: 38,
  pactWard: 41,
  dragonCourage: 44,
  silverleafSalve: 47,
  yarrowPoultice: 50,
  hyssopClarity: 53,
  valerianRest: 56,
  comfreyBalm: 59,
  nightshadeVeil: 62,
  belladonnaSight: 65,
  wormwoodPurge: 68,
  snowdropBreath: 71,
  pearlrootDraught: 74,
};

const recipeUnlockOrder = [
  'manaTonic',
  'minorHealingPotion',
  'nettleVigor',
  'calmingDraught',
  'briarWard',
  'lanternTonic',
  'simpleAntidote',
  'venomDraught',
  'healingPotion',
  'sunrootStamina',
  'moonlitFocus',
  'frostmossCleanse',
  'sleepDraught',
  'elixirOfLife',
  'starLuckPhiltre',
  'deepDreamVision',
  'pactWard',
  'dragonCourage',
  'silverleafSalve',
  'yarrowPoultice',
  'hyssopClarity',
  'valerianRest',
  'comfreyBalm',
  'nightshadeVeil',
  'belladonnaSight',
  'wormwoodPurge',
  'snowdropBreath',
  'pearlrootDraught',
];

const maxAutomationGardenTiles = 10;
const maxAutomationCauldrons = 5;

export class ResearchDefinitionManager {
  constructor({ itemsFacade, playerLevelFacade, prestigeFacade, researchBalanceManager }) {
    this.itemsFacade = itemsFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.prestigeFacade = prestigeFacade;
    this.researchBalanceManager = researchBalanceManager;
    this.researchTabsCache = new Map();
    this.researchLookupCache = new Map();
  }

  clearCache() {
    this.researchTabsCache.clear();
    this.researchLookupCache.clear();
  }

  getResearchTabs({ includeLevelLockedAutomation = false } = {}) {
    const cacheKey = this.getResearchTabsCacheKey({ includeLevelLockedAutomation });
    const cachedTabs = this.researchTabsCache.get(cacheKey);

    if (cachedTabs) {
      return cachedTabs;
    }

    const tabs = [
      {
        id: 'regular',
        label: 'regular research',
        boxes: this.getRegularResearchBoxes({
          includeHiddenRecipeUnlocks: includeLevelLockedAutomation,
        }),
      },
      {
        id: 'automation',
        label: 'automation',
        boxes: this.getAutomationResearchBoxes({ includeLevelLockedAutomation }),
      },
      {
        id: 'advanced',
        label: 'advanced research',
        boxes: this.getAdvancedResearchBoxes({ includeLevelLockedAutomation }),
      },
      {
        id: 'emerald',
        label: 'emerald research',
        boxes: this.getEmeraldResearchBoxes({ includeLevelLockedAutomation }),
      },
    ];

    this.researchTabsCache.set(cacheKey, tabs);
    return tabs;
  }

  getRegularResearchBoxes({ includeHiddenRecipeUnlocks = false } = {}) {
    const boxes = [
      {
        id: 'seedUnlocks',
        label: 'seed unlock researches',
        researches: this.getSeedUnlockResearches(),
      },
      {
        id: 'summonSeeds',
        label: 'summon seeds unlock',
        researches: summonSeedResearches,
      },
    ];

    if (includeHiddenRecipeUnlocks || this.areRecipeUnlocksVisible()) {
      boxes.push({
        id: 'recipeUnlocks',
        label: 'recipe unlocks research',
        researches: this.getRecipeUnlockResearches(),
      });
    }

    return boxes;
  }

  areRecipeUnlocksVisible() {
    return (this.playerLevelFacade?.getSnapshot?.().currentLevel ?? 1) >= 4;
  }

  getResearchBoxes(options) {
    return this.getResearchTabs(options).flatMap((tab) => tab.boxes);
  }

  getVisibleResearchBoxes(completedResearchIds = []) {
    return this.getVisibleResearchTabs(completedResearchIds)[0]?.boxes ?? [];
  }

  getVisibleResearchTabs(completedResearchIds = []) {
    const completedIds = new Set(
      completedResearchIds.map((researchId) => this.normalizeResearchId(researchId)),
    );

    return this.getResearchTabs().map((tab) => ({
      ...tab,
      boxes: tab.boxes.map((box) => ({
        ...box,
        researches: box.researches.filter((research) =>
          this.isVisibleResearch(research, completedIds),
        ),
      })),
    }));
  }

  getSeedUnlockResearches() {
    return this.itemsFacade.getSeedDefinitions().map((seed, index, seeds) => {
      const previousSeed = seeds[index - 1];

      return {
        id: `unlockSeed:${seed.key}`,
        label: seed.label,
        value: 'drop',
        ...(seedUnlockRequiredPlayerLevels[seed.key]
          ? { requiredPlayerLevel: seedUnlockRequiredPlayerLevels[seed.key] }
          : {}),
        ...(previousSeed
          ? { requiredResearchIds: [`unlockSeed:${previousSeed.key}`] }
          : {}),
        description: `allows ${seed.label} to drop from summon seed.`,
      };
    });
  }

  getRecipeUnlockResearches() {
    return this.getRecipePotionDefinitionsInResearchOrder().map((potion, index, potions) => {
      const previousPotion = potions[index - 1];

      return {
        id: `unlockRecipe:${potion.key}`,
        label: potion.label,
        value: 'brew',
        ...(recipeUnlockRequiredPlayerLevels[potion.key]
          ? { requiredPlayerLevel: recipeUnlockRequiredPlayerLevels[potion.key] }
          : {}),
        ...(previousPotion
          ? { requiredResearchIds: [`unlockRecipe:${previousPotion.key}`] }
          : {}),
        description: `allows valid cauldron ingredients to brew ${potion.label}.`,
      };
    });
  }

  getRecipePotionDefinitionsInResearchOrder() {
    const potionsByKey = new Map(
      this.itemsFacade.getRecipePotionDefinitions().map((potion) => [potion.key, potion]),
    );
    const orderedPotions = recipeUnlockOrder
      .map((potionKey) => potionsByKey.get(potionKey))
      .filter(Boolean);
    const orderedKeys = new Set(orderedPotions.map((potion) => potion.key));
    const extraPotions = [...potionsByKey.values()].filter((potion) => !orderedKeys.has(potion.key));

    return [...orderedPotions, ...extraPotions];
  }

  getAutomationResearchBoxes({ includeLevelLockedAutomation = false } = {}) {
    return [
      {
        id: 'autoSeedSpawn',
        label: 'auto seed spawn research',
        researches: [
          {
            id: automationResearchIds.autoSeedSpawn(),
            label: 'auto seed spawn',
            value: 'auto',
            description: 'summons researched seeds when enough mana is available.',
          },
        ],
      },
      {
        id: 'autoPlantTiles',
        label: 'auto plant tile research',
        researches: this.getNumberedResearches({
          count: this.getAutomationGardenTileCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoPlantTile,
          label: (tileNumber) => `auto plant tile ${tileNumber}`,
          description: (tileNumber) =>
            `garden tile ${tileNumber} plants its selected seed when one is available.`,
        }),
      },
      {
        id: 'autoHarvestTiles',
        label: 'auto harvest tile research',
        researches: this.getNumberedResearches({
          count: this.getAutomationGardenTileCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoHarvestPlant,
          label: (tileNumber) => `auto harvest tile ${tileNumber}`,
          description: (tileNumber) =>
            `garden tile ${tileNumber} starts harvesting ready plants without a tap.`,
        }),
      },
      {
        id: 'autoBrewCauldrons',
        label: 'auto brew cauldron research',
        researches: this.getNumberedResearches({
          count: this.getAutomationCauldronCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoBrewCauldron,
          label: (cauldronNumber) => `auto brew cauldron ${cauldronNumber}`,
          description: (cauldronNumber) =>
            `cauldron ${cauldronNumber} starts brewing when staged ingredients and mana are ready.`,
        }),
      },
      {
        id: 'autoBottleCauldrons',
        label: 'auto bottle cauldron research',
        researches: this.getNumberedResearches({
          count: this.getAutomationCauldronCount({ includeLevelLockedAutomation }),
          getId: automationResearchIds.autoBottleCauldron,
          label: (cauldronNumber) => `auto bottle cauldron ${cauldronNumber}`,
          description: (cauldronNumber) =>
            `cauldron ${cauldronNumber} starts bottling finished brews without a tap. potions enter inventory when bottling ends.`,
        }),
      },
    ];
  }

  getAdvancedResearchBoxes({ includeLevelLockedAutomation = false } = {}) {
    return [
      {
        id: 'fastSell',
        label: 'fast sell research',
        researches: this.getFastSellResearches(),
      },
      {
        id: 'researchCost',
        label: 'research cost research',
        researches: this.getResearchCostResearches(),
      },
      {
        id: 'researchTime',
        label: 'research time research',
        researches: this.getResearchTimeResearches(),
      },
      {
        id: 'plotCapacity',
        label: 'plot capacity research',
        researches: this.getPlotCapacityResearches(),
      },
      {
        id: 'cauldronCapacity',
        label: 'cauldron capacity research',
        researches: this.getCauldronCapacityResearches(),
      },
      {
        id: 'cauldronBrewing',
        label: 'cauldron brewing research',
        researches: this.getAdvancedSlotResearches({
          count: this.getAutomationCauldronCount({ includeLevelLockedAutomation }),
          getId: advancedResearchIds.cauldronBrewing,
          seriesId: (cauldronNumber) => `advanced:cauldronBrewing:${cauldronNumber}`,
          label: (cauldronNumber, level) =>
            `cauldron ${cauldronNumber} brewing lvl ${level}`,
          description: (cauldronNumber, level) =>
            `cauldron ${cauldronNumber} brewing time is reduced by ${getAdvancedResearchLevelReductionPercent(level)}%.`,
        }),
      },
      {
        id: 'plotGrowth',
        label: 'plot growth research',
        researches: this.getAdvancedSlotResearches({
          count: this.getAutomationGardenTileCount({ includeLevelLockedAutomation }),
          getId: advancedResearchIds.plotGrowth,
          seriesId: (plotNumber) => `advanced:plotGrowth:${plotNumber}`,
          label: (plotNumber, level) => `plot ${plotNumber} growth lvl ${level}`,
          description: (plotNumber, level) =>
            `plot ${plotNumber} growth time is reduced by ${getAdvancedResearchLevelReductionPercent(level)}%.`,
        }),
      },
    ];
  }

  getEmeraldResearchBoxes({ includeLevelLockedAutomation = false } = {}) {
    return [
      {
        id: 'plotPlanting',
        label: 'plot level up',
        researches: this.getEmeraldSlotResearches({
          count: this.getAutomationGardenTileCount({ includeLevelLockedAutomation }),
          getId: emeraldResearchIds.plotPlanting,
          seriesId: (plotNumber) => `emerald:plotPlanting:${plotNumber}`,
          label: (plotNumber, multiplier) => `plot ${plotNumber} lvl ${multiplier}`,
          effect: (multiplier) => `x${multiplier} herbs`,
          description: (plotNumber, multiplier) =>
            `levels plot ${plotNumber} to lvl ${multiplier}: it uses ${multiplier} seeds and harvests ${multiplier} herbs in one growth timer.`,
        }),
      },
      {
        id: 'cauldronBrewing',
        label: 'cauldron level up',
        researches: this.getEmeraldSlotResearches({
          count: this.getAutomationCauldronCount({ includeLevelLockedAutomation }),
          getId: emeraldResearchIds.cauldronBrewing,
          seriesId: (cauldronNumber) => `emerald:cauldronBrewing:${cauldronNumber}`,
          label: (cauldronNumber) => `cauldron ${cauldronNumber}`,
          effect: (multiplier) => `x${multiplier} potions`,
          starLevel: (multiplier) => getEmeraldResearchStarLevel(multiplier),
          description: (cauldronNumber, multiplier) =>
            `sets cauldron ${cauldronNumber} to ${formatEmeraldResearchStars(
              multiplier,
            )}: it uses ${multiplier} recipe inputs and mana costs to bottle ${multiplier} potions in one brew timer.`,
        }),
      },
    ];
  }

  getPlotCapacityResearches() {
    return this.getCapacityResearches({
      start: plotCapacityStartPlotNumber,
      end: plotCapacityEndPlotNumber,
      getId: capacityResearchIds.plot,
      getPrestigeRequirement: getPlotCapacityPrestigeRequirement,
      seriesId: 'advanced:plotCapacity',
      label: (plotNumber) => `plot ${plotNumber} capacity`,
      value: '+1 plot',
      description: (plotNumber) => `raises garden plot capacity to ${plotNumber}.`,
    });
  }

  getCauldronCapacityResearches() {
    return this.getCapacityResearches({
      start: cauldronCapacityStartCauldronNumber,
      end: cauldronCapacityEndCauldronNumber,
      getId: capacityResearchIds.cauldron,
      getPrestigeRequirement: getCauldronCapacityPrestigeRequirement,
      seriesId: 'advanced:cauldronCapacity',
      label: (cauldronNumber) => `cauldron ${cauldronNumber} capacity`,
      value: '+1 cauldron',
      description: (cauldronNumber) => `raises cauldron capacity to ${cauldronNumber}.`,
    });
  }

  getCapacityResearches({
    start,
    end,
    getId,
    getPrestigeRequirement,
    seriesId,
    label,
    value,
    description,
  }) {
    const researches = [];

    for (let targetNumber = start; targetNumber <= end; targetNumber += 1) {
      researches.push({
        id: getId(targetNumber),
        label: label(targetNumber),
        value,
        showEffect: true,
        seriesId,
        requiredPrestigeCount: getPrestigeRequirement(targetNumber),
        requiredResearchIds: targetNumber > start ? [getId(targetNumber - 1)] : [],
        description: description(targetNumber),
      });
    }

    return researches;
  }

  getFastSellResearches() {
    return Array.from({ length: fastSellResearchMaxLevel }, (_value, index) => {
      const level = index + 1;
      const percent = getFastSellPercent(level);

      return {
        id: fastSellResearchIds.payout(level),
        label: `fast sell lvl ${level}`,
        value: `${percent}% payout`,
        showEffect: true,
        seriesId: 'fastSell',
        requiredResearchIds:
          level > 1 ? [fastSellResearchIds.payout(level - 1)] : [],
        description: `fast sell pays ${percent}% of npc bulk sell price.`,
      };
    });
  }

  getResearchTimeResearches() {
    return Array.from({ length: researchTimeResearchMaxLevel }, (_value, index) => {
      const level = index + 1;
      const percent = getResearchTimeReductionPercent(level);

      return {
        id: researchTimeResearchIds.reduction(level),
        label: `research time lvl ${level}`,
        value: `-${percent}% time`,
        showEffect: true,
        seriesId: 'researchTime',
        requiredResearchIds:
          level > 1 ? [researchTimeResearchIds.reduction(level - 1)] : [],
        description: `future research timers are reduced by ${percent}%.`,
      };
    });
  }

  getResearchCostResearches() {
    return Array.from({ length: researchCostResearchMaxLevel }, (_value, index) => {
      const level = index + 1;
      const percent = getResearchCostReductionPercent(level);

      return {
        id: researchCostResearchIds.reduction(level),
        label: `research cost lvl ${level}`,
        value: `-${percent}% cost`,
        showEffect: true,
        seriesId: 'researchCost',
        requiredResearchIds:
          level > 1 ? [researchCostResearchIds.reduction(level - 1)] : [],
        description: `future coin research costs are reduced by ${percent}%.`,
      };
    });
  }

  getAdvancedSlotResearches({ count, getId, seriesId, label, description }) {
    const researches = [];

    for (let targetNumber = 1; targetNumber <= count; targetNumber += 1) {
      for (let level = 1; level <= advancedResearchMaxLevel; level += 1) {
        researches.push({
          id: getId(targetNumber, level),
          label: label(targetNumber, level),
          value: `-${getAdvancedResearchLevelReductionPercent(level)}% time`,
          showEffect: true,
          seriesId: seriesId(targetNumber),
          requiredResearchIds:
            level > 1 ? [getId(targetNumber, level - 1)] : [],
          description: description(targetNumber, level),
        });
      }
    }

    return researches;
  }

  getEmeraldSlotResearches({
    count,
    getId,
    seriesId,
    label,
    effect,
    starLevel,
    description,
  }) {
    const researches = [];

    for (let targetNumber = 1; targetNumber <= count; targetNumber += 1) {
      for (
        let multiplier = emeraldResearchMinMultiplier;
        multiplier <= emeraldResearchMaxMultiplier;
        multiplier += 1
      ) {
        researches.push({
          id: getId(targetNumber, multiplier),
          label: label(targetNumber, multiplier),
          value: effect(multiplier),
          showEffect: true,
          actionType: 'levelUp',
          level: multiplier,
          ...(starLevel ? { starLevel: starLevel(multiplier) } : {}),
          seriesId: seriesId(targetNumber),
          requiredResearchIds:
            multiplier > emeraldResearchMinMultiplier
              ? [getId(targetNumber, multiplier - 1)]
              : [],
          description: description(targetNumber, multiplier),
        });
      }
    }

    return researches;
  }

  getNumberedResearches({ count, getId, label, description }) {
    return Array.from({ length: count }, (_value, index) => {
      const targetNumber = index + 1;
      const research = {
        id: getId(targetNumber),
        label: label(targetNumber),
        value: 'auto',
        description: description(targetNumber),
      };

      if (targetNumber > 1) {
        research.requiredResearchIds = [getId(targetNumber - 1)];
      }

      return research;
    });
  }

  getAutomationGardenTileCount({ includeLevelLockedAutomation = false } = {}) {
    if (includeLevelLockedAutomation) {
      return maxAutomationGardenTiles;
    }

    return this.clampAutomationCount(
      this.playerLevelFacade?.getMaxGardenTiles?.(),
      maxAutomationGardenTiles,
    );
  }

  getAutomationCauldronCount({ includeLevelLockedAutomation = false } = {}) {
    if (includeLevelLockedAutomation) {
      return maxAutomationCauldrons;
    }

    return this.clampAutomationCount(
      this.playerLevelFacade?.getMaxCauldrons?.(),
      maxAutomationCauldrons,
    );
  }

  clampAutomationCount(count, maxCount) {
    if (!Number.isInteger(count)) {
      return maxCount;
    }

    return Math.max(0, Math.min(maxCount, count));
  }

  getResearches(options) {
    return this.getResearchBoxes(options).flatMap((box) => box.researches);
  }

  hasResearch(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    return (
      this.researchBalanceManager.isResearchEnabled(normalizedResearchId) &&
      this.getResearchLookup().has(normalizedResearchId)
    );
  }

  hasConfiguredResearch(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    return (
      this.researchBalanceManager.isResearchEnabled(normalizedResearchId) &&
      this.getResearchLookup({ includeLevelLockedAutomation: true }).has(normalizedResearchId)
    );
  }

  getResearch(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);

    if (!this.researchBalanceManager.isResearchEnabled(normalizedResearchId)) {
      return null;
    }

    return this.getResearchLookup().get(normalizedResearchId) ?? null;
  }

  getConfiguredResearch(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);

    if (!this.researchBalanceManager.isResearchEnabled(normalizedResearchId)) {
      return null;
    }

    return (
      this.getResearchLookup({ includeLevelLockedAutomation: true }).get(normalizedResearchId) ??
      null
    );
  }

  getRequiredResearchIds(researchId) {
    return this.getResearch(researchId)?.requiredResearchIds ?? [];
  }

  getMissingRequiredPlayerLevel(researchId) {
    const requiredPlayerLevel = this.getResearch(researchId)?.requiredPlayerLevel;

    if (!Number.isInteger(requiredPlayerLevel)) {
      return null;
    }

    return this.getCurrentPlayerLevel() >= requiredPlayerLevel ? null : requiredPlayerLevel;
  }

  getMissingRequiredPrestigeCount(researchId) {
    const requiredPrestigeCount = this.getResearch(researchId)?.requiredPrestigeCount;

    if (!Number.isInteger(requiredPrestigeCount)) {
      return null;
    }

    return this.getCurrentPrestigeCount() >= requiredPrestigeCount
      ? null
      : requiredPrestigeCount;
  }

  getCurrentPlayerLevel() {
    return this.playerLevelFacade?.getSnapshot?.().currentLevel ?? 1;
  }

  getCurrentPrestigeCount() {
    return this.prestigeFacade?.getCompletedCount?.() ?? 0;
  }

  getResearchTabsCacheKey({ includeLevelLockedAutomation = false } = {}) {
    if (includeLevelLockedAutomation) {
      return 'all';
    }

    return [
      'visible',
      this.areRecipeUnlocksVisible() ? 'recipes' : 'no-recipes',
      this.getAutomationGardenTileCount(),
      this.getAutomationCauldronCount(),
    ].join(':');
  }

  getResearchLookup(options = {}) {
    const cacheKey = this.getResearchTabsCacheKey(options);
    const cachedLookup = this.researchLookupCache.get(cacheKey);

    if (cachedLookup) {
      return cachedLookup;
    }

    const lookup = new Map();

    for (const research of this.getResearches(options)) {
      lookup.set(this.normalizeResearchId(research.id), research);
    }

    this.researchLookupCache.set(cacheKey, lookup);
    return lookup;
  }

  normalizeResearchId(researchId) {
    return this.researchBalanceManager.normalizeResearchId(researchId);
  }

  isVisibleResearch(research, completedIds) {
    if (!this.researchBalanceManager.isResearchEnabled(research.id)) {
      return false;
    }

    if (!research.seriesId) {
      return true;
    }

    if (completedIds.has(research.id)) {
      return false;
    }

    return research.requiredResearchIds.every((requiredResearchId) =>
      completedIds.has(requiredResearchId),
    );
  }
}
