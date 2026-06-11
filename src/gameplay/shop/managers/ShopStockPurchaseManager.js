import {
  multiplyGoldPrice,
  normalizePositiveGoldPrice,
} from '../../../shared/goldPrice.js';

export class ShopStockPurchaseManager {
  constructor({
    goldFacade,
    itemsFacade,
    shopNpcPriceManager,
    shopStockPriceQuoteManager,
  } = {}) {
    this.goldFacade = goldFacade;
    this.itemsFacade = itemsFacade;
    this.shopNpcPriceManager = shopNpcPriceManager;
    this.shopStockPriceQuoteManager = shopStockPriceQuoteManager;
  }

  async buyItem({ itemTypeId, quantity = 1 } = {}) {
    const safeQuantity = Math.floor(Number(quantity));

    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) {
      return {
        ok: false,
        reason: 'invalid_quantity',
      };
    }

    const item = this.itemsFacade.getItemDefinition(itemTypeId);
    const quote = this.quoteItem({ itemTypeId, quantity: safeQuantity });

    if (!quote.ok) {
      return quote;
    }

    if (!this.goldFacade.canSpend(quote.totalPriceGold)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        cost: quote.totalPriceGold,
      };
    }

    const buyResult = await this.shopNpcPriceManager.recordBuyFromNpc(
      item,
      safeQuantity,
    );

    if (!buyResult?.ok) {
      return {
        ok: false,
        reason: buyResult?.reason ?? 'buy_failed',
      };
    }

    if (!this.goldFacade.spend(quote.totalPriceGold)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        cost: quote.totalPriceGold,
      };
    }

    this.itemsFacade.addItem(itemTypeId, safeQuantity);

    return {
      ok: true,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceGold: quote.priceGold,
      totalPriceGold: quote.totalPriceGold,
    };
  }

  quoteItem({ itemTypeId, quantity = 1 } = {}) {
    const safeQuantity = Math.floor(Number(quantity));

    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) {
      return {
        ok: false,
        reason: 'invalid_quantity',
      };
    }

    const item = this.itemsFacade.getItemDefinition(itemTypeId);
    const quote = this.shopStockPriceQuoteManager?.quoteItem({
      item,
      quantity: safeQuantity,
    });

    if (quote) {
      return quote;
    }

    const priceGold = normalizePositiveGoldPrice(
      this.shopNpcPriceManager.getNpcSellPriceGold(item),
    );

    if (priceGold === null) {
      return {
        ok: false,
        reason: 'missing_price',
      };
    }

    return {
      ok: true,
      quantity: safeQuantity,
      priceGold,
      totalPriceGold: multiplyGoldPrice(priceGold, safeQuantity),
    };
  }

  mapItem(item) {
    return {
      itemTypeId: item.id,
      key: item.key,
      label: item.label,
      kind: item.kind,
    };
  }
}
