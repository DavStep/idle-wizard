import { itemKinds } from '../itemKinds.js';
import {
  ingredientCatalog,
  ingredientRarities,
  retiredIngredientKeys,
} from '../ingredientCatalog.js';
import { getMarketGradeForCatalogIndex } from '../../../shared/marketLicence.js';

const HERB_TYPE_ID_START = 1001;
const POTION_TYPE_ID_START = 2001;
const SEED_SUMMON_MANA_COST = 10;

const herbCatalog = [
  { key: 'sage', label: 'sage', growthDurationMs: 12_000 },
  { key: 'mint', label: 'mint', growthDurationMs: 25_000 },
  { key: 'nettle', label: 'nettle', growthDurationMs: 30_000 },
  { key: 'lavender', label: 'lavender', growthDurationMs: 40_000 },
  { key: 'briar', label: 'briar', growthDurationMs: 50_000 },
  { key: 'glowcap', label: 'glowcap', growthDurationMs: 60_000 },
  { key: 'mandrake', label: 'mandrake', growthDurationMs: 75_000 },
  { key: 'sunroot', label: 'sunroot', growthDurationMs: 90_000 },
  { key: 'moonflower', label: 'moonflower', growthDurationMs: 105_000 },
  { key: 'frostmoss', label: 'frostmoss', growthDurationMs: 120_000 },
  { key: 'dreambell', label: 'dreambell', growthDurationMs: 135_000 },
  { key: 'starAnise', label: 'star anise', growthDurationMs: 150_000 },
  { key: 'bloodrose', label: 'bloodrose', growthDurationMs: 180_000 },
  { key: 'dragonpepper', label: 'dragonpepper', growthDurationMs: 210_000 },
  { key: 'silverleaf', label: 'silverleaf', growthDurationMs: 240_000 },
  { key: 'yarrow', label: 'yarrow', growthDurationMs: 270_000 },
  { key: 'hyssop', label: 'hyssop', growthDurationMs: 300_000 },
  { key: 'valerian', label: 'valerian', growthDurationMs: 330_000 },
  { key: 'comfrey', label: 'comfrey', growthDurationMs: 360_000 },
  { key: 'nightshade', label: 'nightshade', growthDurationMs: 390_000 },
  { key: 'belladonna', label: 'belladonna', growthDurationMs: 420_000 },
  { key: 'wormwood', label: 'wormwood', growthDurationMs: 450_000 },
  { key: 'snowdrop', label: 'snowdrop', growthDurationMs: 480_000 },
  { key: 'pearlroot', label: 'pearlroot', growthDurationMs: 520_000 },
];

const knownPotionCatalog = [
  { key: 'manaTonic', label: 'mana tonic' },
  { key: 'minorHealingPotion', label: 'minor healing potion' },
  { key: 'nettleVigor', label: 'nettle vigor' },
  { key: 'calmingDraught', label: 'calming draught' },
  { key: 'simpleAntidote', label: 'simple antidote' },
  { key: 'venomDraught', label: 'venom draught' },
  { key: 'briarWard', label: 'briar ward' },
  { key: 'lanternTonic', label: 'lantern tonic' },
  { key: 'healingPotion', label: 'healing potion' },
  { key: 'moonlitFocus', label: 'moonlit focus' },
  { key: 'sunrootStamina', label: 'sunroot stamina' },
  { key: 'frostmossCleanse', label: 'frostmoss cleanse' },
  { key: 'sleepDraught', label: 'sleep draught' },
  { key: 'elixirOfLife', label: 'elixir of life' },
  { key: 'starLuckPhiltre', label: 'star-luck philtre' },
  { key: 'dragonCourage', label: 'dragon courage' },
  { key: 'deepDreamVision', label: 'deep dream vision' },
  { key: 'pactWard', label: 'pact ward' },
];

const extraKnownPotionCatalog = [
  { key: 'silverleafSalve', label: 'silverleaf salve' },
  { key: 'yarrowPoultice', label: 'yarrow poultice' },
  { key: 'hyssopClarity', label: 'hyssop clarity' },
  { key: 'valerianRest', label: 'valerian rest' },
  { key: 'comfreyBalm', label: 'comfrey balm' },
  { key: 'nightshadeVeil', label: 'nightshade veil' },
  { key: 'belladonnaSight', label: 'belladonna sight' },
  { key: 'wormwoodPurge', label: 'wormwood purge' },
  { key: 'snowdropBreath', label: 'snowdrop breath' },
  { key: 'pearlrootDraught', label: 'pearlroot draught' },
];

const unknownPotionCatalog = [
  { key: 'ashenMemory', label: 'ashen memory' },
  { key: 'silverleafQuiet', label: 'silverleaf quiet' },
  { key: 'emberSight', label: 'ember sight' },
  { key: 'thornSleep', label: 'thorn sleep' },
  { key: 'glassMoonElixir', label: 'glass moon elixir' },
  { key: 'rootboundResolve', label: 'rootbound resolve' },
  { key: 'nightOrchardTonic', label: 'night orchard tonic' },
  { key: 'starlessCourage', label: 'starless courage' },
  { key: 'frostveinDraught', label: 'frostvein draught' },
  { key: 'bloodlightWard', label: 'bloodlight ward' },
].map((potion) => ({
  ...potion,
  discoveryType: 'unknown',
  type: 'unknown',
  unknown: true,
  known: false,
  researchable: false,
}));

const seedSellPricesByKey = {
  sage: 1,
  mint: 2,
  nettle: 3,
  lavender: 5,
  briar: 8,
  glowcap: 12,
  mandrake: 20,
  sunroot: 32,
  moonflower: 50,
  frostmoss: 80,
  dreambell: 125,
  starAnise: 200,
  bloodrose: 320,
  dragonpepper: 500,
  silverleaf: 800,
  yarrow: 1_250,
  hyssop: 2_000,
  valerian: 3_200,
  comfrey: 5_000,
  nightshade: 8_000,
  belladonna: 12_500,
  wormwood: 20_000,
  snowdrop: 32_000,
  pearlroot: 50_000,
};

const herbSellPricesByKey = {
  sage: 5,
  mint: 10,
  nettle: 15,
  lavender: 25,
  briar: 40,
  glowcap: 60,
  mandrake: 100,
  sunroot: 160,
  moonflower: 250,
  frostmoss: 400,
  dreambell: 625,
  starAnise: 1_000,
  bloodrose: 1_600,
  dragonpepper: 2_500,
  silverleaf: 4_000,
  yarrow: 6_250,
  hyssop: 10_000,
  valerian: 16_000,
  comfrey: 25_000,
  nightshade: 40_000,
  belladonna: 62_500,
  wormwood: 100_000,
  snowdrop: 160_000,
  pearlroot: 250_000,
};

const potionSellPricesByKey = {
  manaTonic: 60,
  minorHealingPotion: 80,
  nettleVigor: 140,
  calmingDraught: 180,
  simpleAntidote: 380,
  venomDraught: 760,
  briarWard: 360,
  lanternTonic: 520,
  healingPotion: 440,
  moonlitFocus: 1_200,
  sunrootStamina: 1_400,
  frostmossCleanse: 2_080,
  sleepDraught: 3_700,
  elixirOfLife: 3_200,
  starLuckPhiltre: 6_080,
  dragonCourage: 11_400,
  deepDreamVision: 11_000,
  pactWard: 8_320,
  ashenMemory: 1_720,
  silverleafQuiet: 1_280,
  emberSight: 14_020,
  thornSleep: 2_760,
  glassMoonElixir: 7_600,
  rootboundResolve: 1_360,
  nightOrchardTonic: 8_980,
  starlessCourage: 17_100,
  frostveinDraught: 3_660,
  bloodlightWard: 7_060,
  silverleafSalve: 132_020,
  yarrowPoultice: 50_140,
  hyssopClarity: 81_240,
  valerianRest: 130_600,
  comfreyBalm: 201_040,
  nightshadeVeil: 168_000,
  belladonnaSight: 254_480,
  wormwoodPurge: 401_720,
  snowdropBreath: 658_000,
  pearlrootDraught: 1_260_640,
};

const potionCatalog = [
  ...knownPotionCatalog,
  ...unknownPotionCatalog,
  { key: 'wastedPotion', label: 'wasted potion', hasRecipe: false, baseSellPrice: 1 },
  ...extraKnownPotionCatalog,
];

const herbDefinitions = herbCatalog.map((herb, index) => ({
  id: HERB_TYPE_ID_START + index,
  key: `${herb.key}Herb`,
  label: herb.label,
  kind: itemKinds.herb,
  growthDurationMs: herb.growthDurationMs,
  baseSellPrice: herbSellPricesByKey[herb.key],
  marketGrade: getMarketGradeForCatalogIndex(index, herbCatalog.length),
}));

const potionDefinitions = potionCatalog.map((potion, index) => ({
  id: POTION_TYPE_ID_START + index,
  key: potion.key,
  label: potion.label,
  kind: itemKinds.potion,
  ...(potion.discoveryType ? { discoveryType: potion.discoveryType } : {}),
  ...(potion.type ? { type: potion.type } : {}),
  ...(potion.unknown === undefined ? {} : { unknown: potion.unknown }),
  ...(potion.known === undefined ? {} : { known: potion.known }),
  ...(potion.researchable === undefined ? {} : { researchable: potion.researchable }),
  ...(potion.hasRecipe === false ? { hasRecipe: false } : {}),
  baseSellPrice: potion.baseSellPrice ?? potionSellPricesByKey[potion.key],
  marketGrade: getMarketGradeForCatalogIndex(index, potionCatalog.length),
}));

const seedDefinitions = herbCatalog.map((herb, index) => ({
  id: index + 1,
  key: `${herb.key}Seed`,
  label: `${herb.label} seed`,
  kind: itemKinds.seed,
  producesHerbTypeId: HERB_TYPE_ID_START + index,
  dropWeight: 1,
  summonManaCost: SEED_SUMMON_MANA_COST,
  baseSellPrice: seedSellPricesByKey[herb.key],
  marketGrade: getMarketGradeForCatalogIndex(index, herbCatalog.length),
}));

const ingredientDefinitions = ingredientCatalog.map((ingredient) => ({
  id: ingredient.id,
  key: ingredient.key,
  label: ingredient.label,
  kind: itemKinds.ingredient,
  rarity: ingredient.rarity,
}));

export class ItemDefinitionManager {
  constructor() {
    this.setDefinitions({
      seedDefinitions,
      herbDefinitions,
      potionDefinitions,
      ingredientDefinitions,
    });
  }

  setRuntimeConfig(config) {
    this.setDefinitions(this.createDefinitionsFromConfig(config));
  }

  setDefinitions({
    seedDefinitions,
    herbDefinitions,
    potionDefinitions,
    ingredientDefinitions: nextIngredientDefinitions = ingredientDefinitions,
  }) {
    this.seedDefinitions = seedDefinitions;
    this.herbDefinitions = herbDefinitions;
    this.potionDefinitions = potionDefinitions;
    this.ingredientDefinitions = nextIngredientDefinitions;
    this.definitionsById = new Map();
    this.definitionsByKey = new Map();

    for (const definition of [
      ...this.seedDefinitions,
      ...this.herbDefinitions,
      ...this.potionDefinitions,
      ...this.ingredientDefinitions,
    ]) {
      if (this.definitionsById.has(definition.id) || this.definitionsByKey.has(definition.key)) {
        throw new Error('Duplicate item definition.');
      }

      this.definitionsById.set(definition.id, definition);
      this.definitionsByKey.set(definition.key, definition);
    }
  }

  createDefinitionsFromConfig(config = {}) {
    const seeds = this.readDefinitions(config.seeds, itemKinds.seed).map((seed, index, rows) => ({
      ...seed,
      producesHerbTypeId: this.readPositiveInteger(seed.producesHerbTypeId),
      dropWeight: this.readPositiveNumber(seed.dropWeight ?? 1),
      summonManaCost: this.readNonNegativeNumber(seed.summonManaCost ?? SEED_SUMMON_MANA_COST),
      baseSellPrice: this.readNonNegativeNumber(seed.baseSellPrice ?? 1),
      marketGrade: getMarketGradeForCatalogIndex(index, rows.length),
    }));
    const herbs = this.readDefinitions(config.herbs, itemKinds.herb).map((herb, index, rows) => ({
      ...herb,
      growthDurationMs: this.readPositiveNumber(herb.growthDurationMs),
      baseSellPrice: this.readNonNegativeNumber(herb.baseSellPrice),
      marketGrade: getMarketGradeForCatalogIndex(index, rows.length),
    }));
    const potions = this.readDefinitions(config.potions, itemKinds.potion).map((potion, index, rows) => ({
      ...potion,
      ...(potion.discoveryType ? { discoveryType: String(potion.discoveryType) } : {}),
      ...(potion.type ? { type: String(potion.type) } : {}),
      ...(potion.unknown === undefined ? {} : { unknown: Boolean(potion.unknown) }),
      ...(potion.known === undefined ? {} : { known: Boolean(potion.known) }),
      ...(potion.researchable === undefined
        ? {}
        : { researchable: Boolean(potion.researchable) }),
      ...(potion.hasRecipe === undefined ? {} : { hasRecipe: Boolean(potion.hasRecipe) }),
      baseSellPrice: this.readNonNegativeNumber(potion.baseSellPrice),
      marketGrade: getMarketGradeForCatalogIndex(index, rows.length),
    }));
    const ingredients = Array.isArray(config.ingredients)
      ? this.readDefinitions(config.ingredients, itemKinds.ingredient)
          .filter((ingredient) => !retiredIngredientKeys.includes(ingredient.key))
          .map((ingredient) => ({
            ...ingredient,
            rarity: this.readIngredientRarity(ingredient.rarity),
          }))
      : ingredientDefinitions;

    return {
      seedDefinitions: seeds,
      herbDefinitions: herbs,
      potionDefinitions: potions,
      ingredientDefinitions: ingredients,
    };
  }

  readDefinitions(definitions, expectedKind) {
    if (!Array.isArray(definitions) || definitions.length <= 0) {
      throw new Error('Item config requires definitions.');
    }

    return definitions.map((definition) => ({
      ...definition,
      id: this.readPositiveInteger(definition.id),
      key: this.readNonEmptyString(definition.key),
      label: this.readDisplayLabel(definition.label),
      kind: expectedKind,
    }));
  }

  readNonEmptyString(value) {
    if (typeof value !== 'string' || value.trim().length <= 0) {
      throw new Error('Item config requires non-empty strings.');
    }

    return value.trim();
  }

  readDisplayLabel(value) {
    return this.readNonEmptyString(value);
  }

  readPositiveInteger(value) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Item config requires positive integers.');
    }

    return value;
  }

  readPositiveNumber(value) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('Item config requires positive numbers.');
    }

    return value;
  }

  readNonNegativeNumber(value) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Item config requires non-negative numbers.');
    }

    return value;
  }

  readIngredientRarity(value) {
    const rarity = this.readNonEmptyString(value).toLowerCase();

    if (!ingredientRarities.includes(rarity)) {
      throw new Error('Item config requires a known ingredient rarity.');
    }

    return rarity;
  }

  getSeedDefinitions() {
    return this.seedDefinitions;
  }

  getHerbDefinitions() {
    return this.herbDefinitions;
  }

  getPotionDefinitions() {
    return this.potionDefinitions;
  }

  getIngredientDefinitions() {
    return this.ingredientDefinitions;
  }

  getRecipePotionDefinitions() {
    return this.potionDefinitions.filter(
      (potion) => potion.hasRecipe !== false && potion.researchable !== false,
    );
  }

  getUnknownPotionDefinitions() {
    return this.potionDefinitions.filter((potion) => potion.discoveryType === 'unknown');
  }

  getSeedDefinition(seedTypeId) {
    return this.getDefinition(seedTypeId);
  }

  getDefinition(itemTypeId) {
    const definition = this.definitionsById.get(itemTypeId);

    if (!definition) {
      throw new Error(`Unknown item type: ${itemTypeId}`);
    }

    return definition;
  }

  getDefinitionByKey(itemKey) {
    const definition = this.definitionsByKey.get(itemKey);

    if (!definition) {
      throw new Error(`Unknown item key: ${itemKey}`);
    }

    return definition;
  }

  getVisibleSummonCost() {
    return this.seedDefinitions[0]?.summonManaCost ?? 0;
  }
}
