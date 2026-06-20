const DEFAULT_WASTED_BREW_MANA_COST = 5;
const DEFAULT_WASTED_BREW_DURATION_MS = 4_000;
const DEFAULT_BOTTLING_DURATION_MS = 2_000;
const DEFAULT_MAX_CAULDRON_INGREDIENTS = 5;
const DEFAULT_INITIAL_UNLOCKED_CAULDRONS = 1;
const DEFAULT_CAULDRON_COSTS_GOLD = [0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800];
const WASTED_POTION_KEY = 'wastedPotion';

export class BrewingBalanceManager {
  constructor({
    wastedBrewManaCost = DEFAULT_WASTED_BREW_MANA_COST,
    wastedBrewDurationMs = DEFAULT_WASTED_BREW_DURATION_MS,
    bottlingDurationMs = DEFAULT_BOTTLING_DURATION_MS,
    maxCauldronIngredients = DEFAULT_MAX_CAULDRON_INGREDIENTS,
    initialUnlockedCauldrons = DEFAULT_INITIAL_UNLOCKED_CAULDRONS,
    cauldronCostsGold = DEFAULT_CAULDRON_COSTS_GOLD,
    wastedPotionKey = WASTED_POTION_KEY,
  } = {}) {
    this.setBalance({
      wastedBrewManaCost,
      wastedBrewDurationMs,
      bottlingDurationMs,
      maxCauldronIngredients,
      initialUnlockedCauldrons,
      cauldronCostsGold,
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
    initialUnlockedCauldrons = DEFAULT_INITIAL_UNLOCKED_CAULDRONS,
    cauldronCostsGold = DEFAULT_CAULDRON_COSTS_GOLD,
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

    if (!Array.isArray(cauldronCostsGold) || cauldronCostsGold.length <= 0) {
      throw new Error('brewing config requires cauldronCostsGold.');
    }

    if (cauldronCostsGold.some((cost) => !Number.isFinite(cost) || cost < 0)) {
      throw new Error('brewing config cauldron costs must be zero or positive numbers.');
    }

    if (
      !Number.isInteger(initialUnlockedCauldrons) ||
      initialUnlockedCauldrons < 1 ||
      initialUnlockedCauldrons > cauldronCostsGold.length
    ) {
      throw new Error('brewing config initialUnlockedCauldrons must fit cauldron costs.');
    }

    if (typeof wastedPotionKey !== 'string' || wastedPotionKey.length <= 0) {
      throw new Error('brewing config requires wastedPotionKey.');
    }

    this.wastedBrewManaCost = wastedBrewManaCost;
    this.wastedBrewDurationMs = wastedBrewDurationMs;
    this.bottlingDurationMs = bottlingDurationMs;
    this.maxCauldronIngredients = maxCauldronIngredients;
    this.initialUnlockedCauldrons = initialUnlockedCauldrons;
    this.cauldronCostsGold = [...cauldronCostsGold];
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

  getInitialUnlockedCauldrons() {
    return this.initialUnlockedCauldrons;
  }

  getMaxCauldrons() {
    return this.cauldronCostsGold.length;
  }

  getCauldronCost(cauldronNumber) {
    return this.cauldronCostsGold[cauldronNumber - 1] ?? null;
  }

  getCauldronCosts() {
    return [...this.cauldronCostsGold];
  }

  getWastedPotionKey() {
    return this.wastedPotionKey;
  }
}
