import { normalizePositiveCoinPrice } from '../../../shared/coinPrice.js';
import { getNpcMarketPriceState } from './npcMarketPricing.js';

const REAL_NPC_MARKET_MIN_LEVEL = 4;
const FAKE_NPC_MARKET_DEMAND = 1000;

export class ShopNpcPriceManager {
  constructor({ npcMarketFacade = null, playerLevelFacade = null, getActiveMarketId } = {}) {
    this.npcMarketFacade = npcMarketFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.getActiveMarketId = getActiveMarketId;
    this.releasePriceRetention = null;
  }

  setNpcMarketFacade(npcMarketFacade) {
    this.releaseRetainedPrices();
    this.npcMarketFacade = npcMarketFacade;
  }

  setActiveMarketId(marketId) {
    this.npcMarketFacade?.setActiveMarketId?.(marketId);
  }

  getNpcBuyPriceCoin(item) {
    if (this.isUsingFakeMarket()) {
      return this.getFakeNpcBuyPriceCoin(item);
    }

    const priceState = this.getNpcPrice(item);
    const priceCoin = normalizePositiveCoinPrice(priceState?.npcBuyPriceCoin);

    if (priceCoin !== null) {
      return priceCoin;
    }

    return normalizePositiveCoinPrice(this.npcMarketFacade?.getNpcBuyPriceCoin?.(item.key));
  }

  getNpcSellPriceCoin(item) {
    if (this.isUsingFakeMarket()) {
      return null;
    }

    const priceState = this.getNpcPrice(item);
    const priceCoin = normalizePositiveCoinPrice(priceState?.npcSellPriceCoin);

    if (priceCoin !== null) {
      return priceCoin;
    }

    return normalizePositiveCoinPrice(this.npcMarketFacade?.getNpcSellPriceCoin?.(item.key));
  }

  getNpcPrice(item) {
    if (this.isUsingFakeMarket()) {
      return null;
    }

    return getNpcMarketPriceState(
      this.npcMarketFacade?.getPrice?.(item.key) ?? null,
    );
  }

  getNpcStock(item) {
    if (this.isUsingFakeMarket()) {
      return null;
    }

    const npcStock =
      this.npcMarketFacade?.getNpcStock?.(item.key) ??
      this.npcMarketFacade?.getPrice?.(item.key)?.npcStock;

    if (Number.isFinite(npcStock) && npcStock >= 0) {
      return Math.floor(npcStock);
    }

    return null;
  }

  getNpcNeed(item) {
    if (this.isUsingFakeMarket()) {
      return this.getFakeNpcBuyPriceCoin(item) === null ? null : FAKE_NPC_MARKET_DEMAND;
    }

    const npcNeed =
      this.getNpcPrice(item)?.npcNeed ??
      this.npcMarketFacade?.getNpcNeed?.(item.key);

    if (Number.isFinite(npcNeed) && npcNeed >= 0) {
      return Math.floor(npcNeed);
    }

    return null;
  }

  canSellToNpc(item) {
    const npcBuyPriceCoin = this.getNpcBuyPriceCoin(item);
    const npcNeed = this.getNpcNeed(item);

    return (
      Number.isFinite(npcBuyPriceCoin) &&
      npcBuyPriceCoin > 0 &&
      Number.isFinite(npcNeed) &&
      npcNeed > 0
    );
  }

  recordSellToNpc(item, quantity = 1) {
    if (this.isUsingFakeMarket()) {
      return Promise.resolve({
        ok: true,
        fake: true,
      });
    }

    return this.npcMarketFacade?.sellToNpc?.({
      itemKey: item.key,
      quantity,
      marketId: this.getMarketId(),
    }) ?? Promise.resolve({
      ok: false,
      reason: 'offline',
    });
  }

  canBuyFromNpc(item, quantity = 1) {
    const safeQuantity = Math.floor(Number(quantity));
    const npcSellPriceCoin = this.getNpcSellPriceCoin(item);
    const npcStock = this.getNpcStock(item);

    return (
      Number.isInteger(safeQuantity) &&
      safeQuantity > 0 &&
      Number.isFinite(npcSellPriceCoin) &&
      npcSellPriceCoin > 0 &&
      Number.isFinite(npcStock) &&
      npcStock >= safeQuantity
    );
  }

  recordBuyFromNpc(item, quantity = 1) {
    if (this.isUsingFakeMarket()) {
      return Promise.resolve({
        ok: true,
        fake: true,
      });
    }

    return this.npcMarketFacade?.buyFromNpc?.({
      itemKey: item.key,
      quantity,
      marketId: this.getMarketId(),
    }) ?? Promise.resolve({
      ok: false,
      reason: 'offline',
    });
  }

  isUsingFakeMarket() {
    return this.getPlayerLevel() < REAL_NPC_MARKET_MIN_LEVEL;
  }

  needsBackendPrices() {
    return !this.isUsingFakeMarket();
  }

  syncPriceRetention(shouldRetain) {
    if (shouldRetain && this.needsBackendPrices()) {
      this.retainPrices();
      return;
    }

    this.releaseRetainedPrices();
  }

  retainPrices() {
    if (this.releasePriceRetention) {
      return;
    }

    const release =
      this.npcMarketFacade?.retainPrices?.() ??
      this.npcMarketFacade?.retainPublicData?.() ??
      null;

    this.releasePriceRetention = typeof release === 'function' ? release : null;
  }

  releaseRetainedPrices() {
    this.releasePriceRetention?.();
    this.releasePriceRetention = null;
  }

  getPlayerLevel() {
    const level =
      this.playerLevelFacade?.getSnapshot?.().currentLevel ??
      this.playerLevelFacade?.getCurrentLevel?.() ??
      null;
    const safeLevel = Math.floor(Number(level));

    if (!Number.isInteger(safeLevel) || safeLevel <= 0) {
      return REAL_NPC_MARKET_MIN_LEVEL;
    }

    return safeLevel;
  }

  getMarketId() {
    return this.getActiveMarketId?.() ?? 'smallTown';
  }

  getFakeNpcBuyPriceCoin(item = {}) {
    return normalizePositiveCoinPrice(item.baseSellPrice);
  }
}
