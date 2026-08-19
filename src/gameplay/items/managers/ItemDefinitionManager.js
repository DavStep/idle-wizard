import { itemKinds } from '../itemKinds.js';
import {
  ingredientCatalog,
  ingredientRarities,
  retiredIngredientKeys,
} from '../ingredientCatalog.js';
import { getMarketGradeForCatalogIndex } from '../../../shared/marketLicence.js';
import { createPotionSellPrices } from '../../../shared/itemPriceBalance.js';
import { defaultPotionRecipeCatalog } from './PotionRecipeManager.js';

const HERB_TYPE_ID_START = 1001;
const POTION_TYPE_ID_START = 2001;
const SEED_SUMMON_MANA_COST = 10;

const herbCatalog = [
  { key: 'sage', label: 'sage', growthDurationMs: 12_000 },
  { key: 'mint', label: 'mint', growthDurationMs: 27_500 },
  { key: 'nettle', label: 'nettle', growthDurationMs: 37_500 },
  { key: 'lavender', label: 'lavender', growthDurationMs: 56_000 },
  { key: 'briar', label: 'briar', growthDurationMs: 80_000 },
  { key: 'glowcap', label: 'glowcap', growthDurationMs: 111_000 },
  { key: 'mandrake', label: 'mandrake', growthDurationMs: 138_750 },
  { key: 'sunroot', label: 'sunroot', growthDurationMs: 166_500 },
  { key: 'moonflower', label: 'moonflower', growthDurationMs: 194_250 },
  { key: 'frostmoss', label: 'frostmoss', growthDurationMs: 222_000 },
  { key: 'dreambell', label: 'dreambell', growthDurationMs: 249_750 },
  { key: 'starAnise', label: 'star anise', growthDurationMs: 277_500 },
  { key: 'bloodrose', label: 'bloodrose', growthDurationMs: 333_000 },
  { key: 'dragonpepper', label: 'dragonpepper', growthDurationMs: 388_500 },
  { key: 'silverleaf', label: 'silverleaf', growthDurationMs: 444_000 },
  { key: 'yarrow', label: 'yarrow', growthDurationMs: 499_500 },
  { key: 'hyssop', label: 'hyssop', growthDurationMs: 555_000 },
  { key: 'valerian', label: 'valerian', growthDurationMs: 610_500 },
  { key: 'comfrey', label: 'comfrey', growthDurationMs: 666_000 },
  { key: 'nightshade', label: 'nightshade', growthDurationMs: 721_500 },
  { key: 'belladonna', label: 'belladonna', growthDurationMs: 777_000 },
  { key: 'wormwood', label: 'wormwood', growthDurationMs: 832_500 },
  { key: 'snowdrop', label: 'snowdrop', growthDurationMs: 888_000 },
  { key: 'pearlroot', label: 'pearlroot', growthDurationMs: 962_000 },
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
  nettle: 4,
  lavender: 8,
  briar: 16,
  glowcap: 32,
  mandrake: 64,
  sunroot: 128,
  moonflower: 256,
  frostmoss: 512,
  dreambell: 1_024,
  starAnise: 2_048,
  bloodrose: 4_096,
  dragonpepper: 8_192,
  silverleaf: 16_384,
  yarrow: 32_768,
  hyssop: 65_536,
  valerian: 131_072,
  comfrey: 262_144,
  nightshade: 524_288,
  belladonna: 1_048_576,
  wormwood: 2_097_152,
  snowdrop: 4_194_304,
  pearlroot: 8_388_608,
};

const herbSellPricesByKey = {
  sage: 5,
  mint: 10,
  nettle: 20,
  lavender: 40,
  briar: 80,
  glowcap: 160,
  mandrake: 320,
  sunroot: 640,
  moonflower: 1_280,
  frostmoss: 2_560,
  dreambell: 5_120,
  starAnise: 10_240,
  bloodrose: 20_480,
  dragonpepper: 40_960,
  silverleaf: 81_920,
  yarrow: 163_840,
  hyssop: 327_680,
  valerian: 655_360,
  comfrey: 1_310_720,
  nightshade: 2_621_440,
  belladonna: 5_242_880,
  wormwood: 10_485_760,
  snowdrop: 20_971_520,
  pearlroot: 41_943_040,
};

const potionSellPricesByKey = createPotionSellPrices(
  defaultPotionRecipeCatalog,
  Object.fromEntries(
    Object.entries(herbSellPricesByKey).map(([herbKey, sellPrice]) => [
      `${herbKey}Herb`,
      sellPrice,
    ]),
  ),
);

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
