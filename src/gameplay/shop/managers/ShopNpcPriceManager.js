import { normalizePositiveGoldPrice } from '../../../shared/goldPrice.js';
import { getNpcMarketPriceState } from './npcMarketPricing.js';

export class ShopNpcPriceManager {
  constructor({ npcMarketFacade = null } = {}) {
    this.npcMarketFacade = npcMarketFacade;
  }

  setNpcMarketFacade(npcMarketFacade) {
    this.npcMarketFacade = npcMarketFacade;
  }

  getNpcBuyPriceGold(item) {
    const priceState = this.getNpcPrice(item);
    const priceGold = normalizePositiveGoldPrice(priceState?.npcBuyPriceGold);

    if (priceGold !== null) {
      return priceGold;
    }

    return normalizePositiveGoldPrice(this.npcMarketFacade?.getNpcBuyPriceGold?.(item.key));
  }

  getNpcSellPriceGold(item) {
    const priceState = this.getNpcPrice(item);
    const priceGold = normalizePositiveGoldPrice(priceState?.npcSellPriceGold);

    if (priceGold !== null) {
      return priceGold;
    }

    return normalizePositiveGoldPrice(this.npcMarketFacade?.getNpcSellPriceGold?.(item.key));
  }

  getNpcPrice(item) {
    return getNpcMarketPriceState(
      this.npcMarketFacade?.getPrice?.(item.key) ?? null,
    );
  }

  getNpcStock(item) {
    const npcStock =
      this.npcMarketFacade?.getNpcStock?.(item.key) ??
      this.npcMarketFacade?.getPrice?.(item.key)?.npcStock;

    if (Number.isFinite(npcStock) && npcStock >= 0) {
      return Math.floor(npcStock);
    }

    return null;
  }

  getNpcNeed(item) {
    const npcNeed =
      this.getNpcPrice(item)?.npcNeed ??
      this.npcMarketFacade?.getNpcNeed?.(item.key);

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

  canBuyFromNpc(item, quantity = 1) {
    const safeQuantity = Math.floor(Number(quantity));
    const npcSellPriceGold = this.getNpcSellPriceGold(item);
    const npcStock = this.getNpcStock(item);

    return (
      Number.isInteger(safeQuantity) &&
      safeQuantity > 0 &&
      Number.isFinite(npcSellPriceGold) &&
      npcSellPriceGold > 0 &&
      Number.isFinite(npcStock) &&
      npcStock >= safeQuantity
    );
  }

  recordBuyFromNpc(item, quantity = 1) {
    return this.npcMarketFacade?.buyFromNpc?.({
      itemKey: item.key,
      quantity,
    }) ?? Promise.resolve({
      ok: false,
      reason: 'offline',
    });
  }
}
