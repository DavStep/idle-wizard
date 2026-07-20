import { normalizeCoinPrice } from '../../../shared/coinPrice.js';
import { fastSellBasePercent } from '../../research/fastSellResearch.js';

export class ShopDirectSellManager {
  constructor({
    coinFacade,
    itemsFacade,
    researchFacade,
    shopNpcPriceManager,
    shopNpcSellQuoteManager,
    shopSellAvailabilityManager,
    getItemAccess,
    onItemSold,
  } = {}) {
    this.coinFacade = coinFacade;
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
    this.shopNpcPriceManager = shopNpcPriceManager;
    this.shopNpcSellQuoteManager = shopNpcSellQuoteManager;
    this.shopSellAvailabilityManager = shopSellAvailabilityManager;
    this.getItemAccess = getItemAccess;
    this.onItemSold = onItemSold;
  }

  quoteItem({ itemTypeId, quantity = 1 } = {}) {
    const safeQuantity = this.normalizeQuantity(quantity);

    if (safeQuantity === null) {
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

    const availableQuantity = this.getAvailableQuantity(itemTypeId);

    if (availableQuantity < safeQuantity) {
      return {
        ok: false,
        reason: 'not_enough_items',
        availableQuantity,
      };
    }

    return this.applyFastSellPercent(this.shopNpcSellQuoteManager.quoteItem({
      item,
      quantity: safeQuantity,
    }));
  }

  async sellItem({ itemTypeId, quantity = 1 } = {}) {
    const safeQuantity = this.normalizeQuantity(quantity);

    if (safeQuantity === null) {
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

    const soldItem = this.itemsFacade.removeItem(itemTypeId, safeQuantity);

    if (!soldItem) {
      return {
        ok: false,
        reason: 'not_enough_items',
        availableQuantity: this.getAvailableQuantity(itemTypeId),
      };
    }

    const sellResult = await this.shopNpcPriceManager.recordSellToNpc(item, safeQuantity);

    if (!sellResult?.ok) {
      this.itemsFacade.addItem(itemTypeId, safeQuantity);
      return {
        ok: false,
        reason: sellResult?.reason ?? 'sell_failed',
      };
    }

    this.coinFacade.add(quote.totalPriceCoin);
    this.onItemSold?.({
      item,
      coin: quote.totalPriceCoin,
      quantity: safeQuantity,
      source: 'direct_sell',
    });

    return {
      ok: true,
      item: {
        itemTypeId,
        key: item.key,
        label: item.label,
        kind: item.kind,
      },
      quantity: safeQuantity,
      priceCoin: quote.priceCoin,
      totalPriceCoin: quote.totalPriceCoin,
      fastSellPercent: quote.fastSellPercent,
    };
  }

  applyFastSellPercent(quote) {
    if (!quote?.ok) {
      return quote;
    }

    return {
      ...quote,
      priceCoin: this.getFastSellPriceCoin(quote.priceCoin),
      totalPriceCoin: this.getFastSellPriceCoin(quote.totalPriceCoin),
      fastSellPercent: this.getFastSellPercent(),
    };
  }

  getFastSellPriceCoin(priceCoin) {
    const price = normalizeCoinPrice(priceCoin);

    if (price === null) {
      return null;
    }

    return normalizeCoinPrice((price * this.getFastSellPercent()) / 100);
  }

  getFastSellPercent() {
    const percent = Number(this.researchFacade?.getFastSellPercent?.());

    if (!Number.isFinite(percent) || percent <= 0) {
      return fastSellBasePercent;
    }

    return Math.max(0, Math.min(100, Math.floor(percent)));
  }

  normalizeQuantity(quantity) {
    const safeQuantity = Math.floor(Number(quantity));

    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) {
      return null;
    }

    return safeQuantity;
  }

  getAvailableQuantity(itemTypeId) {
    return (
      this.shopSellAvailabilityManager?.getAvailableQuantity?.(itemTypeId) ??
      this.itemsFacade?.getItemQuantity?.(itemTypeId) ??
      0
    );
  }
}
