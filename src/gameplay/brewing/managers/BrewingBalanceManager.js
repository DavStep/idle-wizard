const DEFAULT_WASTED_BREW_MANA_COST = 5;
const DEFAULT_WASTED_BREW_DURATION_MS = 4_000;
const DEFAULT_BOTTLING_DURATION_MS = 2_000;
const DEFAULT_MAX_CAULDRON_INGREDIENTS = 5;
const WASTED_POTION_KEY = 'wastedPotion';

export class BrewingBalanceManager {
  constructor({
    wastedBrewManaCost = DEFAULT_WASTED_BREW_MANA_COST,
    wastedBrewDurationMs = DEFAULT_WASTED_BREW_DURATION_MS,
    bottlingDurationMs = DEFAULT_BOTTLING_DURATION_MS,
    maxCauldronIngredients = DEFAULT_MAX_CAULDRON_INGREDIENTS,
    wastedPotionKey = WASTED_POTION_KEY,
  } = {}) {
    this.wastedBrewManaCost = wastedBrewManaCost;
    this.wastedBrewDurationMs = wastedBrewDurationMs;
    this.bottlingDurationMs = bottlingDurationMs;
    this.maxCauldronIngredients = maxCauldronIngredients;
    this.wastedPotionKey = wastedPotionKey;
  }

  getWastedBrewManaCost() {
    return this.wastedBrewManaCost;
  }

  getWastedBrewDurationMs() {
    return this.wastedBrewDurationMs;
  }

  getBottlingDurationMs() {
    return this.bottlingDurationMs;
  }

  getMaxCauldronIngredients() {
    return this.maxCauldronIngredients;
  }

  getWastedPotionKey() {
    return this.wastedPotionKey;
  }
}
