export class ShopNpcPriceManager {
  constructor({ shopBalanceManager, npcMarketFacade = null }) {
    this.shopBalanceManager = shopBalanceManager;
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

    return this.shopBalanceManager.getSellGold(item.kind, item);
  }

  getNpcSellPriceGold(item) {
    const dynamicPrice = this.npcMarketFacade?.getNpcSellPriceGold?.(item.key);

    if (Number.isFinite(dynamicPrice) && dynamicPrice > 0) {
      return Math.floor(dynamicPrice);
    }

    return this.getNpcBuyPriceGold(item) + 1;
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
