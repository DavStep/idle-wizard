const TUTORIAL_FAST_SELL_PRICE_BY_ITEM_KEY = Object.freeze({
  sageSeed: 10,
  sageHerb: 20,
  mintSeed: 20,
  mintHerb: 40,
  manaTonic: 80,
});

const TUTORIAL_FAST_SELL_PRICE_BY_KIND = Object.freeze({
  seed: 10,
  herb: 20,
  potion: 80,
});

const TUTORIAL_FAST_SELL_PERCENT = 80;

export class TutorialSaleManager {
  update({ step } = {}) {
    if (step?.effect !== 'tutorial-sale') {
      this.cancel();
    }
  }

  getDirectSellQuoteOverride({ step, snapshot, item, itemKey, quantity = 1 } = {}) {
    const sale = this.getDirectSellSaleConfig({
      step,
      snapshot,
      item,
      itemKey,
    });

    if (!sale || !this.canPreviewSale(sale, snapshot, sale.itemKey)) {
      return null;
    }

    const goldEach = this.getGoldEach(sale);
    const remainingGold = this.getRemainingGold(sale, snapshot);

    if (goldEach <= 0 || remainingGold <= 0) {
      return null;
    }

    const requestedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    const ownedQuantity = this.getItemQuantity(snapshot, itemKey);
    const maxTutorialQuantity = Number.isFinite(remainingGold)
      ? Math.max(1, Math.ceil(remainingGold / goldEach))
      : requestedQuantity;
    const sellQuantity = Math.min(requestedQuantity, ownedQuantity, maxTutorialQuantity);

    if (sellQuantity <= 0) {
      return null;
    }

    return {
      ok: true,
      quantity: sellQuantity,
      priceGold: Math.min(goldEach, remainingGold),
      totalPriceGold: Math.min(remainingGold, sellQuantity * goldEach),
      tutorial: true,
    };
  }

  handleDirectSellOverride({
    step,
    snapshot,
    dom,
    gameplayFacade,
    item,
    itemKey,
    quantity = 1,
  } = {}) {
    const sale = this.getDirectSellSaleConfig({
      step,
      snapshot,
      item,
      itemKey,
    });

    if (!sale) {
      return { handled: false };
    }

    if (!this.canSell(sale, snapshot, dom) || itemKey !== sale.itemKey) {
      return { handled: false };
    }

    const result = gameplayFacade?.sellTutorialItemForGold?.({
      ...sale,
      quantity,
    }) ?? {
      ok: false,
      reason: 'sell_failed',
    };

    return {
      handled: true,
      ...result,
      message: this.getFailureMessage(result.reason),
    };
  }

  cancel() {}

  getNpcSellPriceOverride({ snapshot, item, itemKey } = {}) {
    if (!this.isTutorialMarketActive(snapshot)) {
      return null;
    }

    return this.getTutorialFullSellPriceGold({ item, itemKey });
  }

  getNpcStockBuyQuoteOverride({ snapshot, item, itemKey, quantity = 1 } = {}) {
    if (!this.isTutorialMarketActive(snapshot)) {
      return null;
    }

    const priceGold = this.getTutorialBuyPriceGold({ item, itemKey });

    if (!Number.isFinite(priceGold) || priceGold <= 0) {
      return null;
    }

    const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

    return {
      ok: true,
      quantity: safeQuantity,
      priceGold,
      totalPriceGold: priceGold * safeQuantity,
      tutorial: true,
    };
  }

  canPreviewSale(sale = {}, snapshot = {}, itemKey) {
    return (
      itemKey === sale.itemKey &&
      this.getRemainingGold(sale, snapshot) > 0 &&
      this.getItemQuantity(snapshot, itemKey) > 0
    );
  }

  canSell(sale = {}, snapshot = {}, dom = {}) {
    const itemKey = sale.itemKey;

    if (!itemKey || this.getGold(snapshot) >= sale.goldTarget) {
      return false;
    }

    if (!this.isSelectedForNpcSale(snapshot, itemKey, dom)) {
      return false;
    }

    return this.getItemQuantity(snapshot, itemKey) > 0;
  }

  isSelectedForNpcSale(snapshot, itemKey, dom = {}) {
    if (dom.isShopDirectSellItemSelected?.(itemKey)) {
      return true;
    }

    return (snapshot?.shop?.shelf?.slots ?? []).some(
      (slot) => slot?.unlocked && slot.sellKey === itemKey,
    );
  }

  getItemQuantity(snapshot, itemKey) {
    const inventories = [
      snapshot?.inventory ?? [],
      snapshot?.seedInventory ?? [],
      snapshot?.garden?.seeds ?? [],
      snapshot?.garden?.herbs ?? [],
    ];

    return inventories
      .flat()
      .filter((item) => item?.key === itemKey)
      .reduce((total, item) => total + (Number(item.quantity) || 0), 0);
  }

  getGold(snapshot) {
    return Math.max(0, Math.floor(Number(snapshot?.gold?.current) || 0));
  }

  getGoldEach(sale = {}) {
    return Math.max(0, Number(sale.goldEach) || 0);
  }

  getRemainingGold(sale = {}, snapshot = {}) {
    const currentGold = this.getGold(snapshot);

    if (!Number.isFinite(sale.goldTarget)) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(0, Math.floor(Number(sale.goldTarget)) - currentGold);
  }

  getFailureMessage(reason) {
    if (reason === 'not_enough_items') {
      return 'not enough items';
    }

    if (reason === 'gold_target_met') {
      return 'done selling';
    }

    return 'sell failed';
  }

  getDirectSellSaleConfig({ step, snapshot, item, itemKey } = {}) {
    if (step?.effect === 'tutorial-sale' && step.sale?.itemKey) {
      return step.sale;
    }

    if (!this.isTutorialMarketActive(snapshot)) {
      return null;
    }

    const resolvedItemKey = this.getItemKey(item, itemKey);

    if (!resolvedItemKey) {
      return null;
    }

    const goldEach = this.getTutorialFastSellPriceGold({
      item,
      itemKey: resolvedItemKey,
    });

    if (!Number.isFinite(goldEach) || goldEach <= 0) {
      return null;
    }

    return {
      itemKey: resolvedItemKey,
      quantity: 1,
      goldEach,
      goldTarget: this.getTutorialGoldTarget(snapshot),
    };
  }

  isTutorialMarketActive(snapshot = {}) {
    return (
      this.getCurrentLevel(snapshot) < 5 &&
      !this.hasCompletedPrestige(snapshot)
    );
  }

  getTutorialGoldTarget(snapshot = {}) {
    const costGold = Math.max(
      0,
      Math.floor(Number(snapshot?.tasks?.level?.completion?.costGold) || 0),
    );

    return costGold > 0 ? costGold : null;
  }

  getTutorialFastSellPriceGold({ item, itemKey } = {}) {
    const resolvedItemKey = this.getItemKey(item, itemKey);
    const resolvedItemKind = item?.kind ?? null;

    return (
      TUTORIAL_FAST_SELL_PRICE_BY_ITEM_KEY[resolvedItemKey] ??
      TUTORIAL_FAST_SELL_PRICE_BY_KIND[resolvedItemKind] ??
      null
    );
  }

  getTutorialFullSellPriceGold({ item, itemKey } = {}) {
    const fastSellGold = this.getTutorialFastSellPriceGold({ item, itemKey });

    if (!Number.isFinite(fastSellGold) || fastSellGold <= 0) {
      return null;
    }

    return Math.round((fastSellGold / (TUTORIAL_FAST_SELL_PERCENT / 100)) * 100) / 100;
  }

  getTutorialBuyPriceGold({ item, itemKey } = {}) {
    return this.getTutorialFullSellPriceGold({ item, itemKey });
  }

  getItemKey(item, itemKey) {
    return item?.key ?? itemKey ?? null;
  }

  getCurrentLevel(snapshot = {}) {
    return Math.max(1, Math.floor(Number(snapshot?.tasks?.currentLevel) || 1));
  }

  hasCompletedPrestige(snapshot = {}) {
    return (snapshot?.prestige?.completedLevels ?? []).length > 0;
  }
}
