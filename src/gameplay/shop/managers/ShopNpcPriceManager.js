export class ShopNpcPriceManager {
  constructor({ npcMarketFacade = null } = {}) {
    this.npcMarketFacade = npcMarketFacade;
  }

  setNpcMarketFacade(npcMarketFacade) {
    this.npcMarketFacade = npcMarketFacade;
  }

  getNpcBuyPriceGold(item) {
    const dynamicPrice = this.npcMarketFacade?.getNpcBuyPriceGold?.(item.key);

    if (Number.isFinite(dynamicPrice) && dynamicPrice > 0) {
      return Math.floor(dynamicPrice);
    }

    return null;
  }

  getNpcSellPriceGold(item) {
    const dynamicPrice = this.npcMarketFacade?.getNpcSellPriceGold?.(item.key);

    if (Number.isFinite(dynamicPrice) && dynamicPrice > 0) {
      return Math.floor(dynamicPrice);
    }

    return null;
  }

  getNpcNeed(item) {
    const npcNeed = this.npcMarketFacade?.getNpcNeed?.(item.key);

    if (Number.isFinite(npcNeed) && npcNeed >= 0) {
      return Math.floor(npcNeed);
    }

    return null;
  }

  canSellToNpc(item) {
    const npcBuyPriceGold = this.getNpcBuyPriceGold(item);
    const npcNeed = this.getNpcNeed(item);

    return (
      Number.isFinite(npcBuyPriceGold) &&
      npcBuyPriceGold > 0 &&
      Number.isFinite(npcNeed) &&
      npcNeed > 0
    );
  }

  recordSellToNpc(item, quantity = 1) {
    return this.npcMarketFacade?.sellToNpc?.({
      itemKey: item.key,
      quantity,
    }) ?? Promise.resolve({
      ok: false,
      reason: 'offline',
    });
  }
}
