#!/usr/bin/env node
/* global console, process */

import { createRequire } from 'node:module';
import { ItemDefinitionManager } from '../src/gameplay/items/managers/ItemDefinitionManager.js';
import { PotionRecipeManager } from '../src/gameplay/items/managers/PotionRecipeManager.js';
import { itemKinds } from '../src/gameplay/items/itemKinds.js';

const require = createRequire(import.meta.url);

const tasksBalance = require('../src/gameplay/tasks/tasks.json');
const gardenBalance = require('../src/gameplay/garden/garden-balance.json');
const playerLevelBalance = require('../src/gameplay/playerLevel/player-level-balance.json');
const researchBalance = require('../src/gameplay/research/research-balance.json');
const shopBalance = require('../src/gameplay/shop/shop-balance.json');

const DEFAULT_MARK_HOURS = [1 / 6, 0.5, 1, 2, 4, 8, 12, 24, 72, 168];
const DEFAULT_DAYS = 7;
const DEFAULT_STEP_SECONDS = 5;
const RNG_SEED = 0x1d1e12d;
const LEVEL_COMPLETION_GOLD_COST_PER_LEVEL = 20;
const DEFAULT_COMPLETED_RESEARCH_IDS = ['unlockSeed:sageSeed'];
const PRESTIGE_STEP = 10;

function main() {
  const simulator = new BalanceSimulator(parseArgs(process.argv.slice(2)));
  printReport(simulator.run());
}

class BalanceSimulator {
  constructor({
    days = DEFAULT_DAYS,
    stepSeconds = DEFAULT_STEP_SECONDS,
    markHours = DEFAULT_MARK_HOURS,
    allowPrestige = false,
  } = {}) {
    this.totalSeconds = days * 24 * 60 * 60;
    this.stepSeconds = stepSeconds;
    this.markSeconds = markHours.map((hours) => Math.round(hours * 60 * 60));
    this.allowPrestige = allowPrestige;
    this.rng = createRng(RNG_SEED);
    this.timeSeconds = 0;
    this.samples = [];
    this.events = [];
    this.firsts = new Map();
    this.lastGold = 0;
    this.lastGoldHour = 0;

    this.itemDefinitionManager = new ItemDefinitionManager();
    this.potionRecipeManager = new PotionRecipeManager({
      itemDefinitionManager: this.itemDefinitionManager,
    });
    this.seedDefinitions = this.itemDefinitionManager.getSeedDefinitions();
    this.herbDefinitions = this.itemDefinitionManager.getHerbDefinitions();
    this.potionDefinitions = this.itemDefinitionManager.getPotionDefinitions();
    this.recipes = this.potionRecipeManager
      .getPotionRecipes()
      .filter((recipe) => recipe.researchable !== false && !recipe.unknown);

    this.researchCatalog = createResearchCatalog({
      recipes: this.recipes,
      seedDefinitions: this.seedDefinitions,
    });
    this.researchDurations = createResearchDurations();
    this.researchCosts = createResearchCosts();

    this.state = this.createInitialState();
  }

  createInitialState() {
    const level = 1;
    const mana = this.getManaForLevel(level);
    const maxGardenTiles = this.getMaxByLevel(level, 'maxGardenTiles');
    const maxNpcStands = this.getMaxByLevel(level, 'maxNpcMarketStands');
    const maxCauldrons = this.getMaxByLevel(level, 'maxCauldrons');

    return {
      level,
      mana: {
        current: 0,
        cap: mana.maxManaCap,
        perSecond: mana.manaPerSecond,
      },
      gold: {
        current: 0,
        totalGenerated: 0,
      },
      crystal: 0,
      ruby: 0,
      inventory: new Map(),
      taskProgress: new Map(),
      completedTasks: new Set(),
      completedResearch: new Set(DEFAULT_COMPLETED_RESEARCH_IDS),
      inProgressResearch: new Map(),
      completedPrestigeLevels: new Set(),
      gardenTiles: Array.from(
        {
          length: Math.min(
            gardenBalance.garden.initialUnlockedTiles,
            maxGardenTiles,
          ),
        },
        () => this.createEmptyGardenTile(),
      ),
      shopStands: Array.from(
        {
          length: Math.min(
            shopBalance.shopShelf.initialUnlockedSlots,
            maxNpcStands,
          ),
        },
        () => this.createEmptyShopStand(),
      ),
      cauldrons: Array.from({ length: maxCauldrons }, () =>
        this.createEmptyCauldron(),
      ),
    };
  }

  createEmptyGardenTile() {
    return {
      phase: 'empty',
      seedKey: null,
      herbKey: null,
      remainingSeconds: 0,
    };
  }

  createEmptyShopStand() {
    return {
      itemKey: null,
      progressSeconds: 0,
    };
  }

  createEmptyCauldron() {
    return {
      phase: 'empty',
      potionKey: null,
      remainingSeconds: 0,
    };
  }

  run() {
    this.runPolicy();
    this.recordFirsts();
    this.recordSamples();

    while (this.timeSeconds < this.totalSeconds) {
      const deltaSeconds = Math.min(
        this.stepSeconds,
        this.totalSeconds - this.timeSeconds,
      );

      this.timeSeconds += deltaSeconds;
      this.advance(deltaSeconds);
      this.runPolicy();
      this.recordFirsts();
      this.recordSamples();
    }

    return {
      seconds: this.totalSeconds,
      firsts: Object.fromEntries(this.firsts.entries()),
      samples: this.samples,
      final: this.createSummary(),
      events: this.events,
    };
  }

  advance(deltaSeconds) {
    this.state.mana.current = Math.min(
      this.state.mana.cap,
      this.state.mana.current + this.state.mana.perSecond * deltaSeconds,
    );
    this.advanceResearch(deltaSeconds);
    this.advanceGarden(deltaSeconds);
    this.advanceBrewing(deltaSeconds);
    this.advanceMarket(deltaSeconds);
  }

  advanceResearch(deltaSeconds) {
    for (const [researchId, progress] of this.state.inProgressResearch.entries()) {
      progress.remainingSeconds = Math.max(0, progress.remainingSeconds - deltaSeconds);

      if (progress.remainingSeconds > 0) {
        continue;
      }

      this.state.inProgressResearch.delete(researchId);
      this.state.completedResearch.add(researchId);
      this.addEvent(`research complete: ${this.getResearchLabel(researchId)}`);
    }
  }

  advanceGarden(deltaSeconds) {
    for (const tile of this.state.gardenTiles) {
      if (tile.phase !== 'growing' && tile.phase !== 'harvesting') {
        continue;
      }

      tile.remainingSeconds = Math.max(0, tile.remainingSeconds - deltaSeconds);

      if (tile.remainingSeconds > 0) {
        continue;
      }

      if (tile.phase === 'growing') {
        tile.phase = 'ready';
        continue;
      }

      this.addItem(tile.herbKey, 1);
      this.recordFirst('first herb harvest', true);
      tile.phase = 'empty';
      tile.seedKey = null;
      tile.herbKey = null;
    }
  }

  advanceBrewing(deltaSeconds) {
    for (const cauldron of this.state.cauldrons) {
      if (cauldron.phase !== 'brewing' && cauldron.phase !== 'bottling') {
        continue;
      }

      cauldron.remainingSeconds = Math.max(
        0,
        cauldron.remainingSeconds - deltaSeconds,
      );

      if (cauldron.remainingSeconds > 0) {
        continue;
      }

      if (cauldron.phase === 'brewing') {
        cauldron.phase = 'readyToBottle';
        continue;
      }

      this.addItem(cauldron.potionKey, 1);
      this.recordFirst('first potion brewed', true);
      cauldron.phase = 'empty';
      cauldron.potionKey = null;
    }
  }

  advanceMarket(deltaSeconds) {
    for (const stand of this.state.shopStands) {
      if (!stand.itemKey) {
        continue;
      }

      stand.progressSeconds += deltaSeconds;

      while (stand.progressSeconds >= shopBalance.shopShelf.autoSellSeconds) {
        if (this.getSellableItemQuantity(stand.itemKey) <= 0) {
          stand.itemKey = null;
          stand.progressSeconds = 0;
          break;
        }

        this.removeItem(stand.itemKey, 1);
        const gold = this.getItemValue(stand.itemKey);
        this.state.gold.current += gold;
        this.state.gold.totalGenerated += gold;
        stand.progressSeconds -= shopBalance.shopShelf.autoSellSeconds;
      }
    }
  }

  runPolicy() {
    let changed = true;
    let guard = 0;

    while (changed && guard < 12) {
      guard += 1;
      changed = false;
      changed = this.buyResearch() || changed;
      changed = this.buySlots() || changed;
      changed = this.runBrewing() || changed;
      changed = this.summonSeeds() || changed;
      changed = this.runGarden() || changed;
      changed = this.fillTasks() || changed;
      changed = this.completePrestige() || changed;
      changed = this.assignMarket() || changed;
    }
  }

  buyResearch() {
    const available = this.researchCatalog
      .filter((research) => this.canBuyResearch(research))
      .sort((left, right) => {
        const priorityDelta =
          this.getResearchPriority(left.id) - this.getResearchPriority(right.id);

        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return this.getResearchCost(left.id).amount - this.getResearchCost(right.id).amount;
      });
    let changed = false;

    for (const research of available) {
      const cost = this.getResearchCost(research.id);

      if (!this.spendCurrency(cost.currency, cost.amount)) {
        continue;
      }

      const durationSeconds = this.researchDurations.get(research.id) ?? 0;

      if (durationSeconds > 0) {
        this.state.inProgressResearch.set(research.id, {
          totalSeconds: durationSeconds,
          remainingSeconds: durationSeconds,
        });
        this.addEvent(`research start: ${research.label}`);
      } else {
        this.state.completedResearch.add(research.id);
        this.addEvent(`research complete: ${research.label}`);
      }

      changed = true;
    }

    return changed;
  }

  canBuyResearch(research) {
    if (!this.isResearchUnlockedForLevel(research.id)) {
      return false;
    }

    if (
      this.state.completedResearch.has(research.id) ||
      this.state.inProgressResearch.has(research.id)
    ) {
      return false;
    }

    if (
      research.requiredResearchIds.some(
        (requiredId) => !this.state.completedResearch.has(requiredId),
      )
    ) {
      return false;
    }

    const cost = this.getResearchCost(research.id);
    return this.canSpendCurrency(cost.currency, cost.amount);
  }

  isResearchUnlockedForLevel(researchId) {
    if (this.state.level < 2) {
      return false;
    }

    if (researchId.startsWith('unlockRecipe:') && this.state.level < 3) {
      return false;
    }

    return true;
  }

  getResearchPriority(researchId) {
    if (researchId === 'unlockSeed:sageSeed') return 0;
    if (researchId.startsWith('unlockSeed:')) return 10;
    if (researchId.startsWith('unlockRecipe:')) return 20;
    if (researchId.startsWith('summonSeeds')) return 30;
    if (researchId.startsWith('automation:')) return 40;
    if (researchId.startsWith('advanced:')) return 50;
    return 100;
  }

  getResearchCost(researchId) {
    return (
      this.researchCosts.get(researchId) ?? {
        currency: 'gold',
        amount: Number.POSITIVE_INFINITY,
      }
    );
  }

  getResearchLabel(researchId) {
    return this.researchCatalog.find((research) => research.id === researchId)?.label ?? researchId;
  }

  canSpendCurrency(currency, amount) {
    if (currency === 'crystal') return this.state.crystal >= amount;
    if (currency === 'ruby') return this.state.ruby >= amount;
    return this.state.gold.current >= amount;
  }

  spendCurrency(currency, amount) {
    if (!this.canSpendCurrency(currency, amount)) {
      return false;
    }

    if (currency === 'crystal') {
      this.state.crystal -= amount;
      return true;
    }

    if (currency === 'ruby') {
      this.state.ruby -= amount;
      return true;
    }

    this.state.gold.current -= amount;
    return true;
  }

  fillTasks() {
    const tasks = this.getCurrentTasks();
    let changed = false;

    for (const task of tasks) {
      if (this.state.completedTasks.has(task.id)) {
        continue;
      }

      const progress = this.state.taskProgress.get(task.id) ?? 0;
      const remaining = task.quantity - progress;

      if (remaining <= 0) {
        this.state.completedTasks.add(task.id);
        this.addEvent(`task complete: ${task.itemKey}`);
        changed = true;
        continue;
      }

      const owned = this.getItemQuantity(task.itemKey);
      const fillQuantity = Math.min(owned, remaining);

      if (fillQuantity <= 0) {
        continue;
      }

      this.removeItem(task.itemKey, fillQuantity);
      this.state.taskProgress.set(task.id, progress + fillQuantity);
      changed = true;

      if (progress + fillQuantity >= task.quantity) {
        this.state.completedTasks.add(task.id);
        this.addEvent(`task complete: ${task.itemKey}`);
      }
    }

    if (
      this.getCurrentTasks().every((task) => this.state.completedTasks.has(task.id)) &&
      this.state.level < tasksBalance.levels.length
    ) {
      const cost = this.getCurrentLevelCompletionGoldCost();

      if (this.state.gold.current >= cost) {
        this.state.gold.current -= cost;
        this.state.level += 1;
        this.state.crystal += playerLevelBalance.crystal.perLevel;
        this.syncLevelEffects();
        this.addEvent(`level ${this.state.level}`);
        changed = true;
      }
    }

    return changed;
  }

  completePrestige() {
    if (!this.allowPrestige) {
      return false;
    }

    const availableLevel = this.getHighestAvailablePrestigeLevel();

    if (!availableLevel) {
      return false;
    }

    this.state.completedPrestigeLevels.add(availableLevel);
    const ruby = this.getPrestigeRubyTotal();
    this.addEvent(`prestige ${availableLevel}: ${ruby} total ruby`);
    this.resetRunAfterPrestige();
    return true;
  }

  resetRunAfterPrestige() {
    const completedPrestigeLevels = new Set(this.state.completedPrestigeLevels);
    this.state = this.createInitialState();
    this.state.completedPrestigeLevels = completedPrestigeLevels;
    this.state.ruby = this.getPrestigeRubyTotal();
  }

  buySlots() {
    let changed = false;

    const maxGardenTiles = this.getMaxByLevel(this.state.level, 'maxGardenTiles');
    const nextGardenTile = this.state.gardenTiles.length + 1;
    const gardenCost = gardenBalance.garden.tileCostsGold[nextGardenTile - 1];

    if (
      this.state.gardenTiles.length < maxGardenTiles &&
      Number.isFinite(gardenCost) &&
      this.state.gold.current >= gardenCost
    ) {
      this.state.gold.current -= gardenCost;
      this.state.gardenTiles.push(this.createEmptyGardenTile());
      this.addEvent(`garden tile ${nextGardenTile}`);
      changed = true;
    }

    const maxNpcStands = this.getMaxByLevel(this.state.level, 'maxNpcMarketStands');
    const nextStand = this.state.shopStands.length + 1;
    const standCost = shopBalance.shopShelf.slotCostsGold[nextStand - 1];

    if (
      this.state.shopStands.length < maxNpcStands &&
      Number.isFinite(standCost) &&
      this.state.gold.current >= standCost
    ) {
      this.state.gold.current -= standCost;
      this.state.shopStands.push(this.createEmptyShopStand());
      this.addEvent(`npc stand ${nextStand}`);
      changed = true;
    }

    return changed;
  }

  runGarden() {
    if (this.state.level < 2) {
      return false;
    }

    let changed = false;

    for (const tile of this.state.gardenTiles) {
      if (tile.phase === 'ready') {
        tile.phase = 'harvesting';
        tile.remainingSeconds = gardenBalance.garden.harvestSeconds;
        changed = true;
        continue;
      }

      if (tile.phase !== 'empty') {
        continue;
      }

      const seed = this.chooseSeedToPlant();

      if (!seed) {
        continue;
      }

      this.removeItem(seed.key, 1);
      const herb = this.itemDefinitionManager.getDefinition(seed.producesHerbTypeId);
      tile.phase = 'growing';
      tile.seedKey = seed.key;
      tile.herbKey = herb.key;
      tile.remainingSeconds = this.getReducedPlotGrowthSeconds(
        this.state.gardenTiles.indexOf(tile) + 1,
        herb.growthDurationMs / 1000,
      );
      changed = true;
    }

    return changed;
  }

  chooseSeedToPlant() {
    const neededHerbSeed = this.getNeededHerbSeed();

    if (neededHerbSeed && this.getItemQuantity(neededHerbSeed.key) > 0) {
      return neededHerbSeed;
    }

    return this.seedDefinitions
      .filter((seed) => this.getItemQuantity(seed.key) > 0)
      .sort((left, right) => {
        const leftHerb = this.itemDefinitionManager.getDefinition(left.producesHerbTypeId);
        const rightHerb = this.itemDefinitionManager.getDefinition(right.producesHerbTypeId);
        return this.getItemValue(rightHerb.key) - this.getItemValue(leftHerb.key);
      })[0];
  }

  getNeededHerbSeed() {
    const herbTask = this.getCurrentTasks().find((task) => {
      if (this.state.completedTasks.has(task.id)) {
        return false;
      }

      const item = this.itemDefinitionManager.getDefinitionByKey(task.itemKey);
      return item.kind === itemKinds.herb;
    });

    if (!herbTask) {
      const neededIngredient = this.getMissingPotionIngredientKeys().find((itemKey) => {
        const item = this.itemDefinitionManager.getDefinitionByKey(itemKey);
        return item.kind === itemKinds.herb;
      });

      if (!neededIngredient) {
        return null;
      }

      const herb = this.itemDefinitionManager.getDefinitionByKey(neededIngredient);
      return this.seedDefinitions.find((seed) => seed.producesHerbTypeId === herb.id);
    }

    const herb = this.itemDefinitionManager.getDefinitionByKey(herbTask.itemKey);
    return this.seedDefinitions.find((seed) => seed.producesHerbTypeId === herb.id);
  }

  runBrewing() {
    if (this.state.level < 3) {
      return false;
    }

    let changed = false;

    for (const cauldron of this.state.cauldrons) {
      if (cauldron.phase === 'readyToBottle') {
        cauldron.phase = 'bottling';
        cauldron.remainingSeconds = 2;
        changed = true;
        continue;
      }

      if (cauldron.phase !== 'empty') {
        continue;
      }

      const recipe = this.chooseRecipeToBrew();

      if (!recipe) {
        continue;
      }

      for (const ingredient of recipe.ingredients) {
        this.removeItem(ingredient.key, ingredient.quantity);
      }

      this.state.mana.current -= recipe.manaCost;
      cauldron.phase = 'brewing';
      cauldron.potionKey = recipe.key;
      cauldron.remainingSeconds = this.getReducedCauldronSeconds(
        this.state.cauldrons.indexOf(cauldron) + 1,
        recipe.brewDurationMs / 1000,
      );
      changed = true;
    }

    return changed;
  }

  chooseRecipeToBrew() {
    const recipes = this.recipes
      .filter((recipe) => this.isRecipeUnlocked(recipe))
      .filter((recipe) => this.canBrewRecipe(recipe));

    if (recipes.length <= 0) {
      return null;
    }

    const neededPotionKeys = new Set(
      this.getCurrentTasks()
        .filter((task) => {
          if (this.state.completedTasks.has(task.id)) {
            return false;
          }

          return (
            this.itemDefinitionManager.getDefinitionByKey(task.itemKey).kind ===
            itemKinds.potion
          );
        })
        .map((task) => task.itemKey),
    );

    return recipes.sort((left, right) => {
      const leftNeeded = neededPotionKeys.has(left.key) ? 1 : 0;
      const rightNeeded = neededPotionKeys.has(right.key) ? 1 : 0;

      if (leftNeeded !== rightNeeded) {
        return rightNeeded - leftNeeded;
      }

      return this.getRecipeProfit(right) - this.getRecipeProfit(left);
    })[0];
  }

  isRecipeUnlocked(recipe) {
    return this.state.completedResearch.has(`unlockRecipe:${recipe.key}`);
  }

  canBrewRecipe(recipe) {
    if (this.state.mana.current < recipe.manaCost) {
      return false;
    }

    return recipe.ingredients.every(
      (ingredient) => this.getItemQuantity(ingredient.key) >= ingredient.quantity,
    );
  }

  getRecipeProfit(recipe) {
    const inputValue = recipe.ingredients.reduce(
      (total, ingredient) =>
        total + this.getItemValue(ingredient.key) * ingredient.quantity,
      0,
    );

    return this.getItemValue(recipe.key) - inputValue;
  }

  summonSeeds() {
    const pool = this.getSummonableSeeds();

    if (pool.length <= 0) {
      return false;
    }

    let changed = false;
    let guard = 0;
    const quantity = this.getSummonQuantity();
    const cost = this.itemDefinitionManager.getVisibleSummonCost() * quantity;

    while (guard < 1000 && this.state.mana.current >= cost) {
      guard += 1;
      this.state.mana.current -= cost;

      for (let index = 0; index < quantity; index += 1) {
        this.addItem(this.pickWeightedSeed(pool).key, 1);
      }

      this.recordFirst('first seed summon', true);
      changed = true;
    }

    return changed;
  }

  getSummonableSeeds() {
    return this.seedDefinitions.filter((seed) =>
      this.state.completedResearch.has(`unlockSeed:${seed.key}`),
    );
  }

  getSummonQuantity() {
    if (this.state.completedResearch.has('summonSeedsX5')) return 5;
    if (this.state.completedResearch.has('summonSeedsX4')) return 4;
    if (this.state.completedResearch.has('summonSeedsX3')) return 3;
    if (this.state.completedResearch.has('summonSeedsX2')) return 2;
    return 1;
  }

  pickWeightedSeed(seeds) {
    const totalWeight = seeds.reduce((total, seed) => total + seed.dropWeight, 0);
    let roll = this.rng() * totalWeight;

    for (const seed of seeds) {
      roll -= seed.dropWeight;

      if (roll <= 0) {
        return seed;
      }
    }

    return seeds.at(-1);
  }

  assignMarket() {
    if (!this.isMarketUnlocked()) {
      return false;
    }

    const sellable = this.getSellableItemsByValue();
    let changed = false;

    for (const stand of this.state.shopStands) {
      if (stand.itemKey && this.getItemQuantity(stand.itemKey) > 0) {
        continue;
      }

      const item = sellable.find(
        (candidate) =>
          this.getItemQuantity(candidate.key) > 0 &&
          this.getSellableItemQuantity(candidate.key) > 0,
      );

      if (!item) {
        stand.itemKey = null;
        continue;
      }

      if (stand.itemKey !== item.key) {
        stand.itemKey = item.key;
        stand.progressSeconds = 0;
        changed = true;
      }
    }

    return changed;
  }

  getSellableItemsByValue() {
    return [
      ...this.seedDefinitions,
      ...this.herbDefinitions,
      ...this.potionDefinitions,
    ]
      .filter((item) => {
        if (item.unknown && !this.state.completedResearch.has(`unlockRecipe:${item.key}`)) {
          return false;
        }

        return this.getItemValue(item.key) > 0;
      })
      .sort((left, right) => this.getItemValue(right.key) - this.getItemValue(left.key));
  }

  isMarketUnlocked() {
    return (
      this.state.level >= 2 ||
      this.state.completedTasks.has('level1-sage-seeds')
    );
  }

  isNeededForCurrentTask(itemKey) {
    if (
      this.getCurrentTasks().some(
        (task) =>
          !this.state.completedTasks.has(task.id) &&
          task.itemKey === itemKey &&
          (this.state.taskProgress.get(task.id) ?? 0) < task.quantity,
      )
    ) {
      return true;
    }

    return this.getNeededPotionIngredientKeys().includes(itemKey);
  }

  getSellableItemQuantity(itemKey) {
    return Math.max(0, this.getItemQuantity(itemKey) - this.getReservedItemQuantity(itemKey));
  }

  getReservedItemQuantity(itemKey) {
    const taskReserve = this.getCurrentTasks().reduce((total, task) => {
      if (this.state.completedTasks.has(task.id) || task.itemKey !== itemKey) {
        return total;
      }

      const progress = this.state.taskProgress.get(task.id) ?? 0;
      return total + Math.max(0, task.quantity - progress);
    }, 0);

    return taskReserve + this.getNeededPotionIngredientKeys().filter((key) => key === itemKey).length;
  }

  getNeededPotionIngredientKeys() {
    return this.getCurrentTasks()
      .filter(
        (task) =>
          !this.state.completedTasks.has(task.id) &&
          (this.state.taskProgress.get(task.id) ?? 0) < task.quantity &&
          this.itemDefinitionManager.getDefinitionByKey(task.itemKey).kind ===
            itemKinds.potion,
      )
      .flatMap((task) => {
        const recipe = this.recipes.find((candidate) => candidate.key === task.itemKey);
        return recipe ? recipe.ingredients.map((ingredient) => ingredient.key) : [];
      });
  }

  getMissingPotionIngredientKeys() {
    const missing = [];

    for (const task of this.getCurrentTasks()) {
      if (
        this.state.completedTasks.has(task.id) ||
        (this.state.taskProgress.get(task.id) ?? 0) >= task.quantity
      ) {
        continue;
      }

      const item = this.itemDefinitionManager.getDefinitionByKey(task.itemKey);

      if (item.kind !== itemKinds.potion) {
        continue;
      }

      const recipe = this.recipes.find((candidate) => candidate.key === task.itemKey);

      if (!recipe || !this.isRecipeUnlocked(recipe)) {
        continue;
      }

      for (const ingredient of recipe.ingredients) {
        const owned = this.getItemQuantity(ingredient.key);
        const deficit = Math.max(0, ingredient.quantity - owned);

        for (let index = 0; index < deficit; index += 1) {
          missing.push(ingredient.key);
        }
      }

      if (missing.length > 0) {
        return missing;
      }
    }

    return missing;
  }

  getCurrentTasks() {
    return tasksBalance.levels[this.state.level - 1]?.tasks ?? [];
  }

  getCurrentLevelCompletionGoldCost() {
    const level = tasksBalance.levels[this.state.level - 1];

    return level?.completionCostGold ?? this.state.level * LEVEL_COMPLETION_GOLD_COST_PER_LEVEL;
  }

  syncLevelEffects() {
    const mana = this.getManaForLevel(this.state.level);
    this.state.mana.cap = mana.maxManaCap;
    this.state.mana.perSecond = mana.manaPerSecond;
    this.state.mana.current = Math.min(this.state.mana.current, this.state.mana.cap);

    const maxCauldrons = this.getMaxByLevel(this.state.level, 'maxCauldrons');
    while (this.state.cauldrons.length < maxCauldrons) {
      this.state.cauldrons.push(this.createEmptyCauldron());
    }
  }

  getManaForLevel(level) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    const mana = playerLevelBalance.mana;

    return {
      maxManaCap: mana.baseMaxManaCap + (safeLevel - 1) * mana.maxManaCapPerLevel,
      manaPerSecond: mana.baseManaPerSecond + (safeLevel - 1) * mana.manaPerSecondPerLevel,
    };
  }

  getMaxByLevel(level, key) {
    const milestones = [...playerLevelBalance.milestones].sort(
      (left, right) => left.level - right.level,
    );
    let value = milestones[0]?.[key] ?? 1;

    for (const milestone of milestones) {
      if (level < milestone.level) {
        break;
      }

      if (Number.isFinite(milestone[key])) {
        value = milestone[key];
      }
    }

    return value;
  }

  getReducedPlotGrowthSeconds(plotNumber, seconds) {
    return Math.max(
      1,
      seconds * getAdvancedResearchTimeMultiplier(this.getAdvancedLevel('plotGrowth', plotNumber)),
    );
  }

  getReducedCauldronSeconds(cauldronNumber, seconds) {
    return Math.max(
      1,
      seconds *
        getAdvancedResearchTimeMultiplier(
          this.getAdvancedLevel('cauldronBrewing', cauldronNumber),
        ),
    );
  }

  getAdvancedLevel(series, targetNumber) {
    let level = 0;

    for (let nextLevel = 1; nextLevel <= 10; nextLevel += 1) {
      if (!this.state.completedResearch.has(`advanced:${series}:${targetNumber}:${nextLevel}`)) {
        break;
      }

      level = nextLevel;
    }

    return level;
  }

  getHighestAvailablePrestigeLevel() {
    const highest = Math.floor(this.state.level / PRESTIGE_STEP) * PRESTIGE_STEP;

    if (highest < PRESTIGE_STEP) {
      return null;
    }

    for (let level = highest; level >= PRESTIGE_STEP; level -= PRESTIGE_STEP) {
      if (!this.state.completedPrestigeLevels.has(level)) {
        return level;
      }
    }

    return null;
  }

  getPrestigeRubyTotal() {
    return [...this.state.completedPrestigeLevels].reduce(
      (total, level) => total + getPrestigeRewardRuby(level),
      0,
    );
  }

  addItem(itemKey, quantity) {
    this.state.inventory.set(itemKey, this.getItemQuantity(itemKey) + quantity);
  }

  removeItem(itemKey, quantity) {
    const owned = this.getItemQuantity(itemKey);
    const next = Math.max(0, owned - quantity);

    if (next <= 0) {
      this.state.inventory.delete(itemKey);
      return;
    }

    this.state.inventory.set(itemKey, next);
  }

  getItemQuantity(itemKey) {
    return this.state.inventory.get(itemKey) ?? 0;
  }

  getItemValue(itemKey) {
    try {
      const item = this.itemDefinitionManager.getDefinitionByKey(itemKey);
      return Number.isFinite(item.baseSellPrice) ? item.baseSellPrice : 0;
    } catch {
      return 0;
    }
  }

  recordFirsts() {
    this.recordFirst(
      'first spare seed',
      this.sumInventoryByKind(itemKinds.seed) > 0,
    );
    this.recordFirst(
      'first spare herb',
      this.sumInventoryByKind(itemKinds.herb) > 0,
    );
    this.recordFirst(
      'first spare potion',
      this.sumInventoryByKind(itemKinds.potion) > 0,
    );
    this.recordFirst('first gold', this.state.gold.totalGenerated > 0);
    this.recordFirst('level 2', this.state.level >= 2);
    this.recordFirst('level 5', this.state.level >= 5);
    this.recordFirst('level 10', this.state.level >= 10);
    this.recordFirst(
      'automation research',
      [...this.state.completedResearch].some((id) => id.startsWith('automation:')),
    );
    this.recordFirst('prestige available', Boolean(this.getHighestAvailablePrestigeLevel()));
  }

  recordFirst(label, condition) {
    if (condition && !this.firsts.has(label)) {
      this.firsts.set(label, this.timeSeconds);
    }
  }

  sumInventoryByKind(kind) {
    return [...this.state.inventory.entries()].reduce((total, [itemKey, quantity]) => {
      const item = this.itemDefinitionManager.getDefinitionByKey(itemKey);
      return item.kind === kind ? total + quantity : total;
    }, 0);
  }

  recordSamples() {
    while (
      this.samples.length < this.markSeconds.length &&
      this.timeSeconds >= this.markSeconds[this.samples.length]
    ) {
      const summary = this.createSummary();
      const elapsedHours = this.timeSeconds / 3600;
      const goldDelta = summary.gold.totalGenerated - this.lastGold;
      const hourDelta = Math.max(0.001, elapsedHours - this.lastGoldHour);

      this.samples.push({
        ...summary,
        rollingGoldPerHour: goldDelta / hourDelta,
      });
      this.lastGold = summary.gold.totalGenerated;
      this.lastGoldHour = elapsedHours;
    }
  }

  createSummary() {
    return {
      timeSeconds: this.timeSeconds,
      level: this.state.level,
      mana: { ...this.state.mana },
      gold: { ...this.state.gold },
      crystal: this.state.crystal,
      ruby: this.state.ruby,
      completedResearch: this.state.completedResearch.size,
      inProgressResearch: this.state.inProgressResearch.size,
      gardenTiles: this.state.gardenTiles.length,
      npcStands: this.state.shopStands.length,
      cauldrons: this.state.cauldrons.length,
      inventoryValue: this.getInventoryValue(),
      currentTasks: this.getCurrentTaskSummaries(),
      topInventory: this.getTopInventory(),
      prestigeAvailable: this.getHighestAvailablePrestigeLevel(),
    };
  }

  getCurrentTaskSummaries() {
    return this.getCurrentTasks().map((task) => {
      const progress = this.state.taskProgress.get(task.id) ?? 0;
      const remaining = Math.max(0, task.quantity - progress);

      return {
        itemKey: task.itemKey,
        required: task.quantity,
        progress,
        remaining,
        owned: this.getItemQuantity(task.itemKey),
        completed: this.state.completedTasks.has(task.id),
      };
    });
  }

  getTopInventory() {
    return [...this.state.inventory.entries()]
      .filter(([, quantity]) => quantity > 0)
      .sort((left, right) => {
        const leftValue = this.getItemValue(left[0]) * left[1];
        const rightValue = this.getItemValue(right[0]) * right[1];
        return rightValue - leftValue;
      })
      .slice(0, 10)
      .map(([itemKey, quantity]) => ({ itemKey, quantity }));
  }

  getInventoryValue() {
    return [...this.state.inventory.entries()].reduce(
      (total, [itemKey, quantity]) => total + this.getItemValue(itemKey) * quantity,
      0,
    );
  }

  addEvent(label) {
    this.events.push({
      seconds: this.timeSeconds,
      label,
    });
  }
}

function createResearchCatalog({ recipes, seedDefinitions }) {
  const catalog = [];

  seedDefinitions.forEach((seed, index) => {
    const previous = seedDefinitions[index - 1];
    catalog.push({
      id: `unlockSeed:${seed.key}`,
      label: seed.label,
      requiredResearchIds: previous ? [`unlockSeed:${previous.key}`] : [],
    });
  });

  [
    ['summonSeedsX2', 'x2 summon', []],
    ['summonSeedsX3', 'x3 summon', ['summonSeedsX2']],
    ['summonSeedsX4', 'x4 summon', ['summonSeedsX3']],
    ['summonSeedsX5', 'x5 summon', ['summonSeedsX4']],
  ].forEach(([id, label, requiredResearchIds]) => {
    catalog.push({ id, label, requiredResearchIds });
  });

  recipes.forEach((recipe, index) => {
    const previous = recipes[index - 1];
    catalog.push({
      id: `unlockRecipe:${recipe.key}`,
      label: recipe.label,
      requiredResearchIds: previous ? [`unlockRecipe:${previous.key}`] : [],
    });
  });

  Object.keys(researchBalance.researchCostsCrystal).forEach((id) => {
    if (!catalog.some((research) => research.id === id)) {
      catalog.push({ id, label: id, requiredResearchIds: [] });
    }
  });

  return catalog;
}

function createResearchCosts() {
  const costs = new Map();

  Object.entries(researchBalance.researchCostsGold).forEach(([id, amount]) => {
    costs.set(id, { currency: 'gold', amount });
  });

  Object.entries(researchBalance.researchCostsCrystal).forEach(([id, amount]) => {
    costs.set(id, { currency: 'crystal', amount });
  });

  return costs;
}

function createResearchDurations() {
  const ids = [
    ...Object.keys(researchBalance.researchCostsGold),
    ...Object.keys(researchBalance.researchCostsCrystal).filter(
      (id) => researchBalance.researchCostsGold[id] === undefined,
    ),
  ];

  return new Map(
    ids.map((id, index) => [
      id,
      researchBalance.researchDurationsSeconds?.[id] ?? getDefaultResearchDurationSeconds(index),
    ]),
  );
}

function getDefaultResearchDurationSeconds(index) {
  if (index === 0) return 3;
  if (index === 1) return 60;
  return Math.min(10 * 60, 300 + Math.max(0, index - 2) * 300);
}

function getAdvancedResearchTimeMultiplier(level) {
  let totalReduction = 0;

  for (let next = 1; next <= level; next += 1) {
    totalReduction += next + 1;
  }

  return Math.max(0.1, 1 - totalReduction / 100);
}

function getPrestigeRewardRuby(level) {
  if (level === 100) return 5;
  if (level === 50) return 2;
  return 1;
}

function printReport(report) {
  console.log('# idle wizard balance sim');
  console.log('');
  console.log(`duration: ${formatDuration(report.seconds)}`);
  console.log('');
  console.log('## milestones');
  for (const [label, seconds] of Object.entries(report.firsts)) {
    console.log(`- ${label}: ${formatDuration(seconds)}`);
  }

  console.log('');
  console.log('## samples');
  console.log(
    [
      'time',
      'level',
      'gold',
      'gold/h',
      'mana',
      'mana/s',
      'research',
      'garden',
      'stands',
      'cauldrons',
      'inventory value',
      'prestige',
    ].join(' | '),
  );
  console.log(
    [
      '---',
      '---:',
      '---:',
      '---:',
      '---:',
      '---:',
      '---:',
      '---:',
      '---:',
      '---:',
      '---:',
      '---:',
    ].join(' | '),
  );

  for (const sample of report.samples) {
    console.log(
      [
        formatDuration(sample.timeSeconds),
        sample.level,
        formatNumber(sample.gold.current),
        formatNumber(sample.rollingGoldPerHour),
        `${formatNumber(sample.mana.current)}/${formatNumber(sample.mana.cap)}`,
        formatNumber(sample.mana.perSecond),
        `${sample.completedResearch}+${sample.inProgressResearch}`,
        sample.gardenTiles,
        sample.npcStands,
        sample.cauldrons,
        formatNumber(sample.inventoryValue),
        sample.prestigeAvailable ?? '-',
      ].join(' | '),
    );
  }

  console.log('');
  console.log('## final');
  console.log(`level: ${report.final.level}`);
  console.log(`gold: ${formatNumber(report.final.gold.current)}`);
  console.log(`total generated gold: ${formatNumber(report.final.gold.totalGenerated)}`);
  console.log(`inventory value: ${formatNumber(report.final.inventoryValue)}`);
  console.log(`research: ${report.final.completedResearch}+${report.final.inProgressResearch}`);
  console.log(`prestige available: ${report.final.prestigeAvailable ?? '-'}`);
  console.log('current tasks:');
  for (const task of report.final.currentTasks) {
    console.log(
      `- ${task.itemKey}: ${task.progress}/${task.required}, owned ${task.owned}${
        task.completed ? ' complete' : ''
      }`,
    );
  }
  console.log('top inventory:');
  for (const item of report.final.topInventory) {
    console.log(`- ${item.itemKey}: ${item.quantity}`);
  }
  console.log('');
  console.log('## notes');
  console.log('- Standalone expected-value-ish sim; no DOM, server, or save writes.');
  console.log('- Uses current item, task, research, garden, level, and shop balance files.');
  console.log('- Policy is greedy active play: summon, plant, brew, sell, research, tasks.');
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--days' && next) {
      options.days = readPositiveNumber(next, DEFAULT_DAYS);
      index += 1;
      continue;
    }

    if (arg === '--step' && next) {
      options.stepSeconds = readPositiveNumber(next, DEFAULT_STEP_SECONDS);
      index += 1;
      continue;
    }

    if (arg === '--prestige') {
      options.allowPrestige = true;
    }
  }

  return options;
}

function readPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function createRng(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));

  if (safeSeconds < 60) return `${safeSeconds}s`;

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes < 60) {
    return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '0';
  if (Math.abs(number) < 1_000) return formatSmallNumber(number);
  if (Math.abs(number) < 1_000_000) return Math.round(number).toLocaleString('en-US');

  return number.toExponential(2);
}

function formatSmallNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

main();
