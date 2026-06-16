export const TUTORIAL_FAKE_SELL_DELAY_MS = 700;

export class TutorialSaleManager {
  constructor({ delayMs = TUTORIAL_FAKE_SELL_DELAY_MS } = {}) {
    this.delayMs = delayMs;
    this.timeout = null;
  }

  update({ step, snapshot, dom, gameplayFacade, onChange }) {
    if (step?.effect !== 'tutorial-sale') {
      this.cancel();
      return;
    }

    if (this.timeout || !this.canSell(step.sale, snapshot, dom)) {
      return;
    }

    this.timeout = globalThis.setTimeout(() => {
      this.timeout = null;
      gameplayFacade?.sellTutorialItemForGold?.(step.sale);
      onChange?.();
    }, this.delayMs);
    this.timeout?.unref?.();
  }

  cancel() {
    if (this.timeout === null) {
      return;
    }

    globalThis.clearTimeout(this.timeout);
    this.timeout = null;
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
}
