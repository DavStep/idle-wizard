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
    this.setBalance({
      wastedBrewManaCost,
      wastedBrewDurationMs,
      bottlingDurationMs,
      maxCauldronIngredients,
      wastedPotionKey,
    });
  }

  setRuntimeBalance(balance) {
    this.setBalance(balance);
  }

  setBalance({
    wastedBrewManaCost = DEFAULT_WASTED_BREW_MANA_COST,
    wastedBrewDurationMs = DEFAULT_WASTED_BREW_DURATION_MS,
    bottlingDurationMs = DEFAULT_BOTTLING_DURATION_MS,
    maxCauldronIngredients = DEFAULT_MAX_CAULDRON_INGREDIENTS,
    wastedPotionKey = WASTED_POTION_KEY,
  } = {}) {
    if (!Number.isFinite(wastedBrewManaCost) || wastedBrewManaCost < 0) {
      throw new Error('brewing config requires non-negative wastedBrewManaCost.');
    }

    if (!Number.isFinite(wastedBrewDurationMs) || wastedBrewDurationMs <= 0) {
      throw new Error('brewing config requires positive wastedBrewDurationMs.');
    }

    if (!Number.isFinite(bottlingDurationMs) || bottlingDurationMs <= 0) {
      throw new Error('brewing config requires positive bottlingDurationMs.');
    }

    if (!Number.isInteger(maxCauldronIngredients) || maxCauldronIngredients <= 0) {
      throw new Error('brewing config requires positive maxCauldronIngredients.');
    }

    if (typeof wastedPotionKey !== 'string' || wastedPotionKey.length <= 0) {
      throw new Error('brewing config requires wastedPotionKey.');
    }

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
