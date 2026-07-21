const POLICIES = new Set(['active', 'normal', 'idle']);
const ACTION_CADENCE_SECONDS = {
  active: 5,
  normal: 20,
  idle: 30,
};
const SESSION_SCHEDULES = {
  active: {
    always: true,
  },
  normal: {
    starts: [0, 8 * 60 * 60, 13 * 60 * 60, 20 * 60 * 60],
    duration: 12 * 60,
  },
  idle: {
    starts: [0, 20 * 60 * 60],
    duration: 6 * 60,
  },
};
const SELL_BUFFER_QUANTITY = 0;

export class PlayerPolicyManager {
  normalizePolicy(policy) {
    return POLICIES.has(policy) ? policy : 'normal';
  }

  shouldAct(context, options) {
    if (context.timeSeconds < context.nextPolicyActionSeconds) {
      return false;
    }

    const schedule = SESSION_SCHEDULES[options.policy] ?? SESSION_SCHEDULES.normal;
    if (schedule.always) {
      return true;
    }

    const secondsInDay = context.timeSeconds % (24 * 60 * 60);
    return schedule.starts.some(
      (start) => secondsInDay >= start && secondsInDay < start + schedule.duration,
    );
  }

  scheduleNextAction(context, options) {
    context.nextPolicyActionSeconds =
      context.timeSeconds + (ACTION_CADENCE_SECONDS[options.policy] ?? 20);
  }

  async takeNextAction(context, options) {
    const gameplayFacade = context.gameplayFacade;
    const snapshot = gameplayFacade.getSnapshot();

    return (
      this.completeReadyTurnInTask(gameplayFacade, snapshot) ??
      this.completeLevel(gameplayFacade, snapshot) ??
      this.completePrestige(gameplayFacade, snapshot, options) ??
      this.startReadyBottling(gameplayFacade, snapshot) ??
      this.buyRequiredResearch(gameplayFacade, snapshot) ??
      this.buyFreeResearch(gameplayFacade, snapshot) ??
      this.buyUsefulCapacity(gameplayFacade, snapshot) ??
      this.startGardenWork(gameplayFacade, snapshot) ??
      this.startBrewingWork(gameplayFacade, snapshot) ??
      this.summonSeeds(gameplayFacade, snapshot) ??
      (await this.sellUsefulItems(gameplayFacade, snapshot))
    );
  }

  completeReadyTurnInTask(gameplayFacade, snapshot) {
    for (const task of snapshot.tasks.level.tasks) {
      if (task.canFill) {
        const result = gameplayFacade.fillTask(task.taskId);
        if (result.ok) {
          return this.action('fill_task', `fill ${task.itemKey}`, result);
        }
      }

    }

    return null;
  }

  completeLevel(gameplayFacade, snapshot) {
    if (!snapshot.tasks.level.completion.canComplete) {
      return null;
    }

    if (snapshot.coin.current < snapshot.tasks.level.completion.costCoin) {
      return null;
    }

    const result = gameplayFacade.completeTaskLevel();
    return result.ok ? this.action('level_up', `level ${result.currentLevel}`, result) : null;
  }

  completePrestige(gameplayFacade, snapshot, options) {
    if (!options.allowPrestige) {
      return null;
    }

    const milestone = snapshot.prestige.milestones.find(
      (candidate) => candidate.canComplete && !candidate.completed,
    );
    if (!milestone) {
      return null;
    }

    const result = gameplayFacade.completePrestigeMilestone(milestone.level);
    return result.ok ? this.action('prestige', `prestige ${milestone.level}`, result) : null;
  }

  startReadyBottling(gameplayFacade, snapshot) {
    for (const cauldron of snapshot.brewing.cauldrons) {
      if (!cauldron.canStartBottling) {
        continue;
      }

      const result = gameplayFacade.startBrewingBottling(cauldron.cauldronIndex);
      if (result.ok) {
        return this.action('bottle', `bottle cauldron ${cauldron.cauldronNumber}`, result);
      }
    }

    return null;
  }

  buyRequiredResearch(gameplayFacade, snapshot) {
    const requiredResearchIds = snapshot.tasks.level.tasks
      .filter((task) => !task.completed && task.type === 'research')
      .map((task) => task.researchId)
      .filter(Boolean);

    for (const researchId of requiredResearchIds) {
      const research = this.findResearch(snapshot, researchId);
      if (!research?.canResearch) {
        continue;
      }

      const result = gameplayFacade.buyResearch(researchId);
      if (result.ok) {
        return this.action('research', `research ${researchId}`, result);
      }
    }

    return null;
  }

  buyFreeResearch(gameplayFacade, snapshot) {
    const research = this
      .getResearches(snapshot)
      .filter((candidate) => candidate.canResearch && this.getResearchCost(candidate).amount === 0)
      .sort((left, right) => this.getResearchPriority(left) - this.getResearchPriority(right))[0];

    if (!research) {
      return null;
    }

    const result = gameplayFacade.buyResearch(research.id);
    return result.ok ? this.action('research', `research ${research.id}`, result) : null;
  }

  buyUsefulCapacity(gameplayFacade, snapshot) {
    if (
      snapshot.garden.plot.nextTileNumber &&
      !snapshot.garden.plot.nextTileLockedByLevel &&
      !snapshot.garden.plot.nextTileLockedByResearch &&
      snapshot.coin.current >= snapshot.garden.plot.nextTileCost
    ) {
      const result = gameplayFacade.buyGardenTile();
      if (result.ok) {
        return this.action('buy_garden_tile', `buy plot ${result.tileNumber}`, result);
      }
    }

    if (
      snapshot.brewing.nextCauldronNumber &&
      !snapshot.brewing.nextCauldronLockedByLevel &&
      !snapshot.brewing.nextCauldronLockedByResearch &&
      snapshot.coin.current >= snapshot.brewing.nextCauldronCost
    ) {
      const result = gameplayFacade.buyBrewingCauldron();
      if (result.ok) {
        return this.action('buy_cauldron', `buy cauldron ${result.cauldronNumber}`, result);
      }
    }

    if (
      snapshot.shop.shelf.nextSlotNumber &&
      !snapshot.shop.shelf.nextSlotLockedByLevel &&
      snapshot.coin.current >= snapshot.shop.shelf.nextSlotCost
    ) {
      const result = gameplayFacade.buyShopShelfSlot();
      if (result.ok) {
        return this.action('buy_market_stand', `buy stand ${result.slotNumber}`, result);
      }
    }

    return null;
  }

  startGardenWork(gameplayFacade, snapshot) {
    for (const tile of snapshot.garden.plot.tiles) {
      if (tile.phase === 'ready') {
        const result = gameplayFacade.startGardenHarvest(tile.tileNumber);
        if (result.ok) {
          return this.action('harvest', `harvest plot ${tile.tileNumber}`, result);
        }
      }
    }

    const seed = this.chooseSeedToPlant(snapshot);
    if (!seed) {
      return null;
    }

    for (const tile of snapshot.garden.plot.tiles) {
      if (!tile.unlocked || tile.phase !== 'empty') {
        continue;
      }

      const result = gameplayFacade.plantGardenSeed(tile.tileNumber, seed.itemTypeId);
      if (result.ok) {
        return this.action('plant', `plant ${seed.key}`, result);
      }
    }

    return null;
  }

  startBrewingWork(gameplayFacade, snapshot) {
    const recipe = this.chooseRecipeToBrew(snapshot);
    if (!recipe) {
      return null;
    }

    for (const cauldron of snapshot.brewing.cauldrons) {
      if (cauldron.activeBrew || cauldron.ingredients.length > 0) {
        continue;
      }

      const prepared = gameplayFacade.prepareBrewingRecipe(recipe.key, cauldron.cauldronIndex);
      if (!prepared.ok) {
        continue;
      }

      const result = gameplayFacade.brewCauldron(cauldron.cauldronIndex);
      if (result.ok) {
        return this.action('brew', `brew ${recipe.key}`, result);
      }
    }

    return null;
  }

  summonSeeds(gameplayFacade, snapshot) {
    if (!snapshot.seedSummoning.canSummon) {
      return null;
    }

    const result = gameplayFacade.summonSeed();
    return result.ok ? this.action('summon', 'summon seeds', result) : null;
  }

  async sellUsefulItems(gameplayFacade, snapshot) {
    const sellTarget = this.getCurrentSellTaskTarget(snapshot);
    const reserves = this.getReservedQuantities(snapshot);
    const sellableItems = [...snapshot.shop.stock.items]
      .filter((item) => item.quantity > 0 && item.sellCoin > 0)
      .sort((left, right) => {
        if (sellTarget && left.key === sellTarget.itemKey) return -1;
        if (sellTarget && right.key === sellTarget.itemKey) return 1;
        return right.sellCoin - left.sellCoin;
      });

    for (const item of sellableItems) {
      const reserve = reserves.get(item.key) ?? 0;
      const targetQuantity =
        sellTarget?.itemKey === item.key ? sellTarget.remainingQuantity : item.quantity - reserve;
      const quantity = Math.max(0, Math.floor(targetQuantity - SELL_BUFFER_QUANTITY));

      if (quantity <= 0) {
        continue;
      }

      const slot = snapshot.shop.shelf.slots.find(
        (candidate) => candidate.unlocked && !candidate.sellItemTypeId,
      ) ?? snapshot.shop.shelf.slots.find((candidate) => candidate.unlocked);
      if (!slot) continue;
      gameplayFacade.selectShopShelfSlot(slot.slotNumber);
      const result = gameplayFacade.loadSelectedShopShelfSlotItem(
        item.itemTypeId,
        quantity,
      );
      if (result.ok) {
        return this.action('load-stall', `load ${quantity} ${item.key}`, result);
      }
    }

    return null;
  }

  chooseSeedToPlant(snapshot) {
    const wantedHerbKeys = this.getWantedHerbKeys(snapshot);
    const seeds = snapshot.garden.seeds.filter((seed) => seed.quantity > 0);

    for (const herbKey of wantedHerbKeys) {
      const seedKey = herbKey.replace(/Herb$/, 'Seed');
      const seed = seeds.find((candidate) => candidate.key === seedKey);
      if (seed) {
        return seed;
      }
    }

    return seeds[0] ?? null;
  }

  chooseRecipeToBrew(snapshot) {
    const wantedPotionKeys = snapshot.tasks.level.tasks
      .filter(
        (task) =>
          !task.completed &&
          (task.type === 'brew' || task.type === 'turnIn') &&
          task.itemKind === 'potion',
      )
      .map((task) => task.itemKey);
    const recipes = snapshot.brewing.recipes
      .filter((recipe) => recipe.unlocked)
      .filter((recipe) => this.canBrewRecipe(snapshot, recipe));

    for (const potionKey of wantedPotionKeys) {
      const recipe = recipes.find((candidate) => candidate.key === potionKey);
      if (recipe) {
        return recipe;
      }
    }

    return recipes[0] ?? null;
  }

  canBrewRecipe(snapshot, recipe) {
    if (snapshot.mana.current < recipe.manaCost) {
      return false;
    }

    return recipe.ingredients.every((ingredient) => {
      const herb = snapshot.brewing.herbs.find((candidate) => candidate.key === ingredient.key);
      return (herb?.availableQuantity ?? 0) >= ingredient.quantity;
    });
  }

  getWantedHerbKeys(snapshot) {
    const wanted = [];

    for (const task of snapshot.tasks.level.tasks) {
      if (task.completed) {
        continue;
      }

      if ((task.type === 'grow' || task.type === 'turnIn') && task.itemKind === 'herb') {
        wanted.push(task.itemKey);
      }

      if ((task.type === 'brew' || task.type === 'turnIn') && task.itemKind === 'potion') {
        const recipe = snapshot.brewing.recipes.find((candidate) => candidate.key === task.itemKey);
        if (recipe?.unlocked) {
          wanted.push(...recipe.ingredients.map((ingredient) => ingredient.key));
        }
      }
    }

    return [...new Set(wanted)];
  }

  getCurrentSellTaskTarget(snapshot) {
    const task = snapshot.tasks.level.tasks.find(
      (candidate) => !candidate.completed && candidate.type === 'sell',
    );

    if (!task) {
      return null;
    }

    return {
      itemKey: task.itemKey,
      remainingQuantity: task.remainingQuantity,
    };
  }

  getReservedQuantities(snapshot) {
    const reserves = new Map();

    for (const task of snapshot.tasks.level.tasks) {
      if (task.completed) {
        continue;
      }

      if (task.type === 'turnIn') {
        addReserve(reserves, task.itemKey, task.remainingQuantity);
      }

      if ((task.type === 'brew' || task.type === 'turnIn') && task.itemKind === 'potion') {
        const recipe = snapshot.brewing.recipes.find((candidate) => candidate.key === task.itemKey);
        if (recipe?.unlocked) {
          for (const ingredient of recipe.ingredients) {
            addReserve(reserves, ingredient.key, ingredient.quantity);
          }
        }
      }
    }

    return reserves;
  }

  getResearches(snapshot) {
    return snapshot.research.tabs.flatMap((tab) =>
      tab.boxes.flatMap((box) => box.researches),
    );
  }

  findResearch(snapshot, researchId) {
    return this.getResearches(snapshot).find((research) => research.id === researchId) ?? null;
  }

  getResearchPriority(research) {
    if (research.id.startsWith('unlockSeed:')) return 10;
    if (research.id.startsWith('unlockRecipe:')) return 20;
    if (research.id.startsWith('summonSeeds')) return 30;
    if (research.id.startsWith('automation:')) return 40;
    if (research.id.startsWith('advanced:')) return 50;
    return 100;
  }

  getResearchCost(research) {
    if (research.costCurrency === 'crystal') {
      return { currency: 'crystal', amount: research.costCrystal ?? 0 };
    }
    if (research.costCurrency === 'ruby') {
      return { currency: 'ruby', amount: research.costRuby ?? 0 };
    }
    if (research.costCurrency === 'emerald') {
      return { currency: 'emerald', amount: research.costEmerald ?? 0 };
    }
    return { currency: 'coin', amount: research.costCoin ?? 0 };
  }

  action(actionType, label, result) {
    return {
      type: 'action',
      actionType,
      label,
      changed: true,
      result: this.trimResult(result),
    };
  }

  trimResult(result) {
    if (!result || typeof result !== 'object') {
      return result;
    }

    const trimmed = {};
    for (const key of [
      'ok',
      'reason',
      'quantity',
      'coin',
      'cost',
      'costCoin',
      'totalPriceCoin',
      'currentLevel',
      'level',
      'researchId',
      'taskId',
      'item',
      'seedCounts',
    ]) {
      if (result[key] !== undefined) {
        trimmed[key] = result[key];
      }
    }
    return trimmed;
  }
}

function addReserve(reserves, itemKey, quantity) {
  if (!itemKey || quantity <= 0) {
    return;
  }

  reserves.set(itemKey, (reserves.get(itemKey) ?? 0) + quantity);
}
