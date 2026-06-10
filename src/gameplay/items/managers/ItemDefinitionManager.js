import { itemKinds } from '../itemKinds.js';

const HERB_TYPE_ID_START = 1001;
const POTION_TYPE_ID_START = 2001;
const SEED_SUMMON_MANA_COST = 10;

const herbCatalog = [
  { key: 'sage', label: 'Sage', growthDurationMs: 20_000 },
  { key: 'mint', label: 'Mint', growthDurationMs: 25_000 },
  { key: 'nettle', label: 'Nettle', growthDurationMs: 30_000 },
  { key: 'lavender', label: 'Lavender', growthDurationMs: 40_000 },
  { key: 'briar', label: 'Briar', growthDurationMs: 50_000 },
  { key: 'glowcap', label: 'Glowcap', growthDurationMs: 60_000 },
  { key: 'mandrake', label: 'Mandrake', growthDurationMs: 75_000 },
  { key: 'sunroot', label: 'Sunroot', growthDurationMs: 90_000 },
  { key: 'moonflower', label: 'Moonflower', growthDurationMs: 105_000 },
  { key: 'frostmoss', label: 'Frostmoss', growthDurationMs: 120_000 },
  { key: 'dreambell', label: 'Dreambell', growthDurationMs: 135_000 },
  { key: 'starAnise', label: 'Star Anise', growthDurationMs: 150_000 },
  { key: 'bloodrose', label: 'Bloodrose', growthDurationMs: 180_000 },
  { key: 'dragonpepper', label: 'Dragonpepper', growthDurationMs: 210_000 },
];

const knownPotionCatalog = [
  { key: 'manaTonic', label: 'Mana Tonic' },
  { key: 'minorHealingPotion', label: 'Minor Healing Potion' },
  { key: 'nettleVigor', label: 'Nettle Vigor' },
  { key: 'calmingDraught', label: 'Calming Draught' },
  { key: 'simpleAntidote', label: 'Simple Antidote' },
  { key: 'venomDraught', label: 'Venom Draught' },
  { key: 'briarWard', label: 'Briar Ward' },
  { key: 'lanternTonic', label: 'Lantern Tonic' },
  { key: 'healingPotion', label: 'Healing Potion' },
  { key: 'moonlitFocus', label: 'Moonlit Focus' },
  { key: 'sunrootStamina', label: 'Sunroot Stamina' },
  { key: 'frostmossCleanse', label: 'Frostmoss Cleanse' },
  { key: 'sleepDraught', label: 'Sleep Draught' },
  { key: 'elixirOfLife', label: 'Elixir of Life' },
  { key: 'starLuckPhiltre', label: 'Star-Luck Philtre' },
  { key: 'dragonCourage', label: 'Dragon Courage' },
  { key: 'deepDreamVision', label: 'Deep Dream Vision' },
  { key: 'pactWard', label: 'Pact Ward' },
];

const unknownPotionCatalog = [
  { key: 'ashenMemory', label: 'Ashen Memory' },
  { key: 'silverleafQuiet', label: 'Silverleaf Quiet' },
  { key: 'emberSight', label: 'Ember Sight' },
  { key: 'thornSleep', label: 'Thorn Sleep' },
  { key: 'glassMoonElixir', label: 'Glass Moon Elixir' },
  { key: 'rootboundResolve', label: 'Rootbound Resolve' },
  { key: 'nightOrchardTonic', label: 'Night Orchard Tonic' },
  { key: 'starlessCourage', label: 'Starless Courage' },
  { key: 'frostveinDraught', label: 'Frostvein Draught' },
  { key: 'bloodlightWard', label: 'Bloodlight Ward' },
].map((potion) => ({
  ...potion,
  discoveryType: 'unknown',
  type: 'unknown',
  unknown: true,
  known: false,
  researchable: false,
}));

const potionCatalog = [
  ...knownPotionCatalog,
  ...unknownPotionCatalog,
  { key: 'wastedPotion', label: 'Wasted Potion', hasRecipe: false, baseSellPrice: 1 },
];

const herbDefinitions = herbCatalog.map((herb, index) => ({
  id: HERB_TYPE_ID_START + index,
  key: `${herb.key}Herb`,
  label: herb.label,
  kind: itemKinds.herb,
  growthDurationMs: herb.growthDurationMs,
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
  ...(potion.baseSellPrice === undefined ? {} : { baseSellPrice: potion.baseSellPrice }),
}));

const seedDefinitions = herbCatalog.map((herb, index) => ({
  id: index + 1,
  key: `${herb.key}Seed`,
  label: `${herb.label} Seed`,
  kind: itemKinds.seed,
  producesHerbTypeId: HERB_TYPE_ID_START + index,
  dropWeight: 1,
  summonManaCost: SEED_SUMMON_MANA_COST,
  baseSellPrice: 1,
}));

export class ItemDefinitionManager {
  constructor() {
    this.definitionsById = new Map();
    this.definitionsByKey = new Map();

    for (const definition of [...seedDefinitions, ...herbDefinitions, ...potionDefinitions]) {
      this.definitionsById.set(definition.id, definition);
      this.definitionsByKey.set(definition.key, definition);
    }
  }

  getSeedDefinitions() {
    return seedDefinitions;
  }

  getHerbDefinitions() {
    return herbDefinitions;
  }

  getPotionDefinitions() {
    return potionDefinitions;
  }

  getRecipePotionDefinitions() {
    return potionDefinitions.filter(
      (potion) => potion.hasRecipe !== false && potion.researchable !== false,
    );
  }

  getUnknownPotionDefinitions() {
    return potionDefinitions.filter((potion) => potion.discoveryType === 'unknown');
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
    return seedDefinitions[0]?.summonManaCost ?? 0;
  }
}
