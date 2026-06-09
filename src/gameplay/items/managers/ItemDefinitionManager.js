import { itemKinds } from '../itemKinds.js';

const HERB_TYPE_ID_START = 1001;
const POTION_TYPE_ID_START = 2001;
const SEED_SUMMON_MANA_COST = 10;

const herbCatalog = [
  { key: 'sage', label: 'Sage' },
  { key: 'mint', label: 'Mint' },
  { key: 'nettle', label: 'Nettle' },
  { key: 'lavender', label: 'Lavender' },
  { key: 'briar', label: 'Briar' },
  { key: 'glowcap', label: 'Glowcap' },
  { key: 'mandrake', label: 'Mandrake' },
  { key: 'sunroot', label: 'Sunroot' },
  { key: 'moonflower', label: 'Moonflower' },
  { key: 'frostmoss', label: 'Frostmoss' },
  { key: 'dreambell', label: 'Dreambell' },
  { key: 'starAnise', label: 'Star Anise' },
  { key: 'bloodrose', label: 'Bloodrose' },
  { key: 'dragonpepper', label: 'Dragonpepper' },
];

const potionCatalog = [
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

const herbDefinitions = herbCatalog.map((herb, index) => ({
  id: HERB_TYPE_ID_START + index,
  key: `${herb.key}Herb`,
  label: herb.label,
  kind: itemKinds.herb,
  growthDurationMs: 60_000,
}));

const potionDefinitions = potionCatalog.map((potion, index) => ({
  id: POTION_TYPE_ID_START + index,
  key: potion.key,
  label: potion.label,
  kind: itemKinds.potion,
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
