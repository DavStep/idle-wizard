export class TutorialSaleManager {
  update({ step } = {}) {
    if (step?.effect !== 'tutorial-sale') {
      this.cancel();
    }
  }

  handleDirectSellOverride({
    step,
    snapshot,
    dom,
    gameplayFacade,
    itemKey,
    quantity = 1,
  } = {}) {
    if (step?.effect !== 'tutorial-sale') {
      return { handled: false };
    }

    if (!this.canSell(step.sale, snapshot, dom) || itemKey !== step.sale?.itemKey) {
      return { handled: false };
    }

    const result = gameplayFacade?.sellTutorialItemForGold?.({
      ...step.sale,
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

  getFailureMessage(reason) {
    if (reason === 'not_enough_items') {
      return 'not enough items';
    }

    if (reason === 'gold_target_met') {
      return 'done selling';
    }

    return 'sell failed';
  }
}
