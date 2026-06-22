import { itemKinds } from '../itemKinds.js';

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

const herbSellPricesByKey = {
  sage: 6,
  mint: 7,
  nettle: 8,
  lavender: 10,
  briar: 12,
  glowcap: 14,
  mandrake: 17,
  sunroot: 20,
  moonflower: 24,
  frostmoss: 28,
  dreambell: 32,
  starAnise: 36,
  bloodrose: 44,
  dragonpepper: 52,
  silverleaf: 64,
  yarrow: 76,
  hyssop: 92,
  valerian: 112,
  comfrey: 132,
  nightshade: 160,
  belladonna: 192,
  wormwood: 228,
  snowdrop: 276,
  pearlroot: 328,
};

const potionSellPricesByKey = {
  manaTonic: 55,
  minorHealingPotion: 60,
  nettleVigor: 65,
  calmingDraught: 75,
  simpleAntidote: 100,
  venomDraught: 125,
  briarWard: 105,
  lanternTonic: 100,
  healingPotion: 90,
  moonlitFocus: 125,
  sunrootStamina: 155,
  frostmossCleanse: 160,
  sleepDraught: 200,
  elixirOfLife: 250,
  starLuckPhiltre: 255,
  dragonCourage: 285,
  deepDreamVision: 365,
  pactWard: 270,
  ashenMemory: 130,
  silverleafQuiet: 130,
  emberSight: 255,
  thornSleep: 155,
  glassMoonElixir: 285,
  rootboundResolve: 175,
  nightOrchardTonic: 245,
  starlessCourage: 325,
  frostveinDraught: 225,
  bloodlightWard: 250,
  silverleafSalve: 340,
  yarrowPoultice: 368,
  hyssopClarity: 400,
  valerianRest: 436,
  comfreyBalm: 476,
  nightshadeVeil: 520,
  belladonnaSight: 568,
  wormwoodPurge: 620,
  snowdropBreath: 676,
  pearlrootDraught: 740,
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
}));

const seedDefinitions = herbCatalog.map((herb, index) => ({
  id: index + 1,
  key: `${herb.key}Seed`,
  label: `${herb.label} seed`,
  kind: itemKinds.seed,
  producesHerbTypeId: HERB_TYPE_ID_START + index,
  dropWeight: 1,
  summonManaCost: SEED_SUMMON_MANA_COST,
  baseSellPrice: 1,
}));

export class ItemDefinitionManager {
  constructor() {
    this.setDefinitions({
      seedDefinitions,
      herbDefinitions,
      potionDefinitions,
    });
  }

  setRuntimeConfig(config) {
    this.setDefinitions(this.createDefinitionsFromConfig(config));
  }

  setDefinitions({ seedDefinitions, herbDefinitions, potionDefinitions }) {
    this.seedDefinitions = seedDefinitions;
    this.herbDefinitions = herbDefinitions;
    this.potionDefinitions = potionDefinitions;
    this.definitionsById = new Map();
    this.definitionsByKey = new Map();

    for (const definition of [
      ...this.seedDefinitions,
      ...this.herbDefinitions,
      ...this.potionDefinitions,
    ]) {
      if (this.definitionsById.has(definition.id) || this.definitionsByKey.has(definition.key)) {
        throw new Error('Duplicate item definition.');
      }

      this.definitionsById.set(definition.id, definition);
      this.definitionsByKey.set(definition.key, definition);
    }
  }

  createDefinitionsFromConfig(config = {}) {
    const seeds = this.readDefinitions(config.seeds, itemKinds.seed).map((seed) => ({
      ...seed,
      producesHerbTypeId: this.readPositiveInteger(seed.producesHerbTypeId),
      dropWeight: this.readPositiveNumber(seed.dropWeight ?? 1),
      summonManaCost: this.readNonNegativeNumber(seed.summonManaCost ?? SEED_SUMMON_MANA_COST),
      baseSellPrice: this.readNonNegativeNumber(seed.baseSellPrice ?? 1),
    }));
    const herbs = this.readDefinitions(config.herbs, itemKinds.herb).map((herb) => ({
      ...herb,
      growthDurationMs: this.readPositiveNumber(herb.growthDurationMs),
      baseSellPrice: this.readNonNegativeNumber(herb.baseSellPrice),
    }));
    const potions = this.readDefinitions(config.potions, itemKinds.potion).map((potion) => ({
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
    }));

    return {
      seedDefinitions: seeds,
      herbDefinitions: herbs,
      potionDefinitions: potions,
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
    return this.readNonEmptyString(value).toLowerCase();
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

  getSeedDefinitions() {
    return this.seedDefinitions;
  }

  getHerbDefinitions() {
    return this.herbDefinitions;
  }

  getPotionDefinitions() {
    return this.potionDefinitions;
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
