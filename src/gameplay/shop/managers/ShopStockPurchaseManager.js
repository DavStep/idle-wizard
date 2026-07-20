import {
  multiplyCoinPrice,
  normalizePositiveCoinPrice,
} from '../../../shared/coinPrice.js';

export class ShopStockPurchaseManager {
  constructor({
    coinFacade,
    itemsFacade,
    shopNpcPriceManager,
    shopStockPriceQuoteManager,
    getItemAccess,
  } = {}) {
    this.coinFacade = coinFacade;
    this.itemsFacade = itemsFacade;
    this.shopNpcPriceManager = shopNpcPriceManager;
    this.shopStockPriceQuoteManager = shopStockPriceQuoteManager;
    this.getItemAccess = getItemAccess;
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
    const marketAccess = this.getItemAccess?.(item);
    if (marketAccess && !marketAccess.tradedHere) {
      return {
        ok: false,
        reason: 'market_locked',
        requiredMarket: marketAccess.requiredMarket,
      };
    }
    const quote = this.quoteItem({ itemTypeId, quantity: safeQuantity });

    if (!quote.ok) {
      return quote;
    }

    if (!this.coinFacade.canSpend(quote.totalPriceCoin)) {
      return {
        ok: false,
        reason: 'not_enough_coin',
        cost: quote.totalPriceCoin,
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

    if (!this.coinFacade.spend(quote.totalPriceCoin)) {
      return {
        ok: false,
        reason: 'not_enough_coin',
        cost: quote.totalPriceCoin,
      };
    }

    this.itemsFacade.addItem(itemTypeId, safeQuantity);

    return {
      ok: true,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceCoin: quote.priceCoin,
      totalPriceCoin: quote.totalPriceCoin,
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
    const marketAccess = this.getItemAccess?.(item);
    if (marketAccess && !marketAccess.tradedHere) {
      return {
        ok: false,
        reason: 'market_locked',
        requiredMarket: marketAccess.requiredMarket,
      };
    }
    const quote = this.shopStockPriceQuoteManager?.quoteItem({
      item,
      quantity: safeQuantity,
    });

    if (quote) {
      return quote;
    }

    const priceCoin = normalizePositiveCoinPrice(
      this.shopNpcPriceManager.getNpcSellPriceCoin(item),
    );

    if (priceCoin === null) {
      return {
        ok: false,
        reason: 'missing_price',
      };
    }

    return {
      ok: true,
      quantity: safeQuantity,
      priceCoin,
      totalPriceCoin: multiplyCoinPrice(priceCoin, safeQuantity),
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
