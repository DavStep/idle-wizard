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

    const coinEach = this.getCoinEach(sale);
    const remainingCoin = this.getRemainingCoin(sale, snapshot);

    if (coinEach <= 0 || remainingCoin <= 0) {
      return null;
    }

    const requestedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    const ownedQuantity = this.getItemQuantity(snapshot, itemKey);
    const maxTutorialQuantity = Number.isFinite(remainingCoin)
      ? Math.max(1, Math.ceil(remainingCoin / coinEach))
      : requestedQuantity;
    const sellQuantity = Math.min(requestedQuantity, ownedQuantity, maxTutorialQuantity);

    if (sellQuantity <= 0) {
      return null;
    }

    return {
      ok: true,
      quantity: sellQuantity,
      priceCoin: Math.min(coinEach, remainingCoin),
      totalPriceCoin: Math.min(remainingCoin, sellQuantity * coinEach),
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

    const result = gameplayFacade?.sellTutorialItemForCoin?.({
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

    return this.getTutorialFullSellPriceCoin({ item, itemKey });
  }

  getNpcStockBuyQuoteOverride({ snapshot, item, itemKey, quantity = 1 } = {}) {
    if (!this.isTutorialMarketActive(snapshot)) {
      return null;
    }

    const priceCoin = this.getTutorialBuyPriceCoin({ item, itemKey });

    if (!Number.isFinite(priceCoin) || priceCoin <= 0) {
      return null;
    }

    const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

    return {
      ok: true,
      quantity: safeQuantity,
      priceCoin,
      totalPriceCoin: priceCoin * safeQuantity,
      tutorial: true,
    };
  }

  canPreviewSale(sale = {}, snapshot = {}, itemKey) {
    return (
      itemKey === sale.itemKey &&
      this.getRemainingCoin(sale, snapshot) > 0 &&
      this.getItemQuantity(snapshot, itemKey) > 0
    );
  }

  canSell(sale = {}, snapshot = {}, dom = {}) {
    const itemKey = sale.itemKey;

    if (!itemKey || this.getCoin(snapshot) >= sale.coinTarget) {
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

  getCoin(snapshot) {
    return Math.max(0, Math.floor(Number(snapshot?.coin?.current) || 0));
  }

  getCoinEach(sale = {}) {
    return Math.max(0, Number(sale.coinEach) || 0);
  }

  getRemainingCoin(sale = {}, snapshot = {}) {
    const currentCoin = this.getCoin(snapshot);

    if (!Number.isFinite(sale.coinTarget)) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(0, Math.floor(Number(sale.coinTarget)) - currentCoin);
  }

  getFailureMessage(reason) {
    if (reason === 'not_enough_items') {
      return 'not enough items';
    }

    if (reason === 'coin_target_met') {
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

    const coinEach = this.getTutorialFastSellPriceCoin({
      item,
      itemKey: resolvedItemKey,
    });

    if (!Number.isFinite(coinEach) || coinEach <= 0) {
      return null;
    }

    return {
      itemKey: resolvedItemKey,
      quantity: 1,
      coinEach,
      coinTarget: this.getTutorialCoinTarget(snapshot),
    };
  }

  isTutorialMarketActive(snapshot = {}) {
    return (
      this.getCurrentLevel(snapshot) < 5 &&
      !this.hasCompletedPrestige(snapshot)
    );
  }

  getTutorialCoinTarget(snapshot = {}) {
    const costCoin = Math.max(
      0,
      Math.floor(Number(snapshot?.tasks?.level?.completion?.costCoin) || 0),
    );

    return costCoin > 0 ? costCoin : null;
  }

  getTutorialFastSellPriceCoin({ item, itemKey } = {}) {
    const resolvedItemKey = this.getItemKey(item, itemKey);
    const resolvedItemKind = item?.kind ?? null;

    return (
      TUTORIAL_FAST_SELL_PRICE_BY_ITEM_KEY[resolvedItemKey] ??
      TUTORIAL_FAST_SELL_PRICE_BY_KIND[resolvedItemKind] ??
      null
    );
  }

  getTutorialFullSellPriceCoin({ item, itemKey } = {}) {
    const fastSellCoin = this.getTutorialFastSellPriceCoin({ item, itemKey });

    if (!Number.isFinite(fastSellCoin) || fastSellCoin <= 0) {
      return null;
    }

    return Math.round((fastSellCoin / (TUTORIAL_FAST_SELL_PERCENT / 100)) * 100) / 100;
  }

  getTutorialBuyPriceCoin({ item, itemKey } = {}) {
    return this.getTutorialFullSellPriceCoin({ item, itemKey });
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
