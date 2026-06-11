import {
  multiplyGoldPrice,
  normalizePositiveGoldPrice,
} from '../../../shared/goldPrice.js';

export class ShopStockPurchaseManager {
  constructor({
    goldFacade,
    itemsFacade,
    shopNpcPriceManager,
  } = {}) {
    this.goldFacade = goldFacade;
    this.itemsFacade = itemsFacade;
    this.shopNpcPriceManager = shopNpcPriceManager;
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
    const priceGold = normalizePositiveGoldPrice(
      this.shopNpcPriceManager.getNpcSellPriceGold(item),
    );
    const stock = this.shopNpcPriceManager.getNpcStock(item);

    if (priceGold === null) {
      return {
        ok: false,
        reason: 'missing_price',
      };
    }

    if (!Number.isFinite(stock) || stock < safeQuantity) {
      return {
        ok: false,
        reason: 'empty_stock',
      };
    }

    const totalPriceGold = multiplyGoldPrice(priceGold, safeQuantity);

    if (totalPriceGold === null || !this.goldFacade.canSpend(totalPriceGold)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        cost: totalPriceGold ?? 0,
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

    if (!this.goldFacade.spend(totalPriceGold)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        cost: totalPriceGold,
      };
    }

    this.itemsFacade.addItem(itemTypeId, safeQuantity);

    return {
      ok: true,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceGold,
      totalPriceGold,
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
