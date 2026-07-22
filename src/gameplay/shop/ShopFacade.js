import { ShopBalanceManager } from './managers/ShopBalanceManager.js';
import { ShopAutoSellManager } from './managers/ShopAutoSellManager.js';
import { ShopShelfEntityManager } from './managers/ShopShelfEntityManager.js';
import { ShopShelfSlotSelectionManager } from './managers/ShopShelfSlotSelectionManager.js';
import { ShopShelfFutureLoadManager } from './managers/ShopShelfFutureLoadManager.js';
import { ShopSellItemVisibilityManager } from './managers/ShopSellItemVisibilityManager.js';
import { ShopSellKindManager } from './managers/ShopSellKindManager.js';
import { ShopPlayerShelfEntityManager } from './managers/ShopPlayerShelfEntityManager.js';
import { ShopPlayerShelfListingManager } from './managers/ShopPlayerShelfListingManager.js';
import { ShopPlayerRequestEntityManager } from './managers/ShopPlayerRequestEntityManager.js';
import { ShopPlayerRequestManager } from './managers/ShopPlayerRequestManager.js';
import { ShopNpcPriceManager } from './managers/ShopNpcPriceManager.js';
import { ShopSellAvailabilityManager } from './managers/ShopSellAvailabilityManager.js';
import { ShopCoinOfferManager } from './managers/ShopCoinOfferManager.js';
import { ShopNpcSellQuoteManager } from './managers/ShopNpcSellQuoteManager.js';
import { ShopStockPurchaseManager } from './managers/ShopStockPurchaseManager.js';
import { ShopStockPriceQuoteManager } from './managers/ShopStockPriceQuoteManager.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';
import { marketLicences } from '../../shared/marketLicence.js';

const MARKET_MAX_STALLS = marketLicences.length;

export class ShopFacade {
  static explain =
    'The market has trader stands for automatic sales, shared trader stock to buy, and player stands for listings other players can buy.';

  constructor({
    coinFacade,
    itemsFacade,
    marketLicenceFacade,
    playerLevelFacade,
    playerShopFacade,
    researchFacade,
    npcMarketFacade,
    onItemSold,
    getReservedItemQuantity,
    now,
  } = {}) {
    this.itemsFacade = itemsFacade;
    this.marketLicenceFacade = marketLicenceFacade;
    this.playerShopFacade = playerShopFacade;
    this.shopBalanceManager = new ShopBalanceManager();
    this.shopNpcPriceManager = new ShopNpcPriceManager({
      npcMarketFacade,
      playerLevelFacade,
      getActiveMarketId: () => this.getActiveMarketLicence().id,
    });
    this.shopSellKindManager = new ShopSellKindManager();
    this.shopSellItemVisibilityManager = new ShopSellItemVisibilityManager({
      researchFacade,
    });
    this.shopSellAvailabilityManager = new ShopSellAvailabilityManager({
      itemsFacade,
      getReservedItemQuantity,
    });
    this.shopNpcSellQuoteManager = new ShopNpcSellQuoteManager({
      shopNpcPriceManager: this.shopNpcPriceManager,
    });
    this.shopStockPriceQuoteManager = new ShopStockPriceQuoteManager({
      shopNpcPriceManager: this.shopNpcPriceManager,
    });
    this.shopCoinOfferManager = new ShopCoinOfferManager({
      coinFacade,
      playerLevelFacade,
    });
    this.shopShelfEntityManager = new ShopShelfEntityManager({
      initialUnlockedSlots: this.shopBalanceManager.getInitialUnlockedSlots(),
      maxSlots: MARKET_MAX_STALLS,
    });
    this.shopPlayerShelfEntityManager = new ShopPlayerShelfEntityManager({
      initialUnlockedSlots: this.shopBalanceManager.getInitialUnlockedSlots(),
      maxSlots: MARKET_MAX_STALLS,
    });
    this.shopPlayerRequestEntityManager = new ShopPlayerRequestEntityManager({
      maxSlots: MARKET_MAX_STALLS,
    });
    this.shopShelfSlotSelectionManager = new ShopShelfSlotSelectionManager({
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      getAccessibleSlotCount: () => this.getMarketStallCount(),
      getItemAccess: (item) => this.getMarketItemAccess(item),
    });
    this.shopShelfFutureLoadManager = new ShopShelfFutureLoadManager({
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
      shopShelfSlotSelectionManager: this.shopShelfSlotSelectionManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      getItemAccess: (item) => this.getMarketItemAccess(item),
    });
    this.shopPlayerShelfListingManager = new ShopPlayerShelfListingManager({
      coinFacade,
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      shopPlayerShelfEntityManager: this.shopPlayerShelfEntityManager,
      getAccessibleSlotCount: () => this.getMarketStallCount(),
      getItemAccess: (item) => this.getMarketItemAccess(item),
    });
    this.shopPlayerRequestManager = new ShopPlayerRequestManager({
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopPlayerRequestEntityManager: this.shopPlayerRequestEntityManager,
      isRequestSlotUnlocked: (slotNumber) =>
        this.shopPlayerShelfEntityManager.isSlotUnlocked(slotNumber),
      getAccessibleSlotCount: () => this.getMarketStallCount(),
      getItemAccess: (item) => this.getMarketItemAccess(item),
    });
    this.shopStockPurchaseManager = new ShopStockPurchaseManager({
      coinFacade,
      itemsFacade,
      shopNpcPriceManager: this.shopNpcPriceManager,
      shopStockPriceQuoteManager: this.shopStockPriceQuoteManager,
      getItemAccess: (item) => this.getMarketItemAccess(item),
    });
    this.shopAutoSellManager = new ShopAutoSellManager({
      coinFacade,
      itemsFacade,
      shopBalanceManager: this.shopBalanceManager,
      shopNpcPriceManager: this.shopNpcPriceManager,
      shopNpcSellQuoteManager: this.shopNpcSellQuoteManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
      getAccessibleSlotCount: () => this.getMarketStallCount(),
      getItemAccess: (item) => this.getMarketItemAccess(item),
      getStallBatchSize: (slotNumber) => researchFacade?.getStallBatchSize?.(slotNumber) ?? 1,
      onItemSold,
      now,
    });
  }

  setNpcMarketFacade(npcMarketFacade) {
    this.shopNpcPriceManager.setNpcMarketFacade(npcMarketFacade);
    this.syncActiveMarketLicence();
  }

  setPlayerShopFacade(playerShopFacade) {
    this.playerShopFacade = playerShopFacade;
    this.syncActiveMarketLicence();
  }

  applyRuntimeConfig(snapshot = {}) {
    const balance = parseGameConfig(snapshot, 'shop');

    if (!balance) {
      return;
    }

    try {
      this.shopBalanceManager.setRuntimeBalance(balance);
      const capacity = {
        initialUnlockedSlots: this.shopBalanceManager.getInitialUnlockedSlots(),
        maxSlots: MARKET_MAX_STALLS,
      };
      this.shopShelfEntityManager.configureCapacity(capacity);
      this.shopPlayerShelfEntityManager.configureCapacity(capacity);
      this.shopPlayerRequestEntityManager.configureCapacity(capacity);
    } catch {
      return;
    }
  }

  setPotionDiscoveryFacade(potionDiscoveryFacade) {
    this.shopSellItemVisibilityManager.setPotionDiscoveryFacade(potionDiscoveryFacade);
  }

  initialize(ecsManagers) {
    this.shopShelfEntityManager.initialize(ecsManagers);
    this.shopPlayerShelfEntityManager.initialize(ecsManagers);
    this.shopPlayerRequestEntityManager.initialize(ecsManagers);
    this.shopCoinOfferManager.initialize(ecsManagers);
    this.shopShelfFutureLoadManager.initialize(ecsManagers.systems);
    this.shopAutoSellManager.register(ecsManagers.systems);
    this.shopCoinOfferManager.register(ecsManagers.systems);
  }

  buyNextShelfSlot() {
    return {
      ok: false,
      reason: 'market_rank',
      marketRank: this.getMarketStallCount(),
    };
  }

  buyNextPlayerShelfSlot() {
    return {
      ok: false,
      reason: 'market_rank',
      marketRank: this.getMarketStallCount(),
    };
  }

  selectShelfSlot(slotNumber) {
    return this.shopShelfSlotSelectionManager.selectSlot(slotNumber);
  }

  selectPlayerShelfSlot(slotNumber) {
    return this.shopPlayerShelfListingManager.selectSlot(slotNumber);
  }

  loadSelectedShelfSlotItem(itemTypeId, quantity = 1) {
    return this.shopShelfSlotSelectionManager.loadSelectedSlot(itemTypeId, quantity);
  }

  unloadSelectedShelfSlotItem(quantity = 1) {
    return this.shopShelfSlotSelectionManager.unloadSelectedSlot(quantity);
  }

  unloadSelectedShelfSlotItemAll() {
    return this.shopShelfSlotSelectionManager.unloadSelectedSlotAll();
  }

  setSelectedShelfSlotAllocation(itemTypeId, percentage) {
    return this.shopShelfSlotSelectionManager.setSelectedSlotAllocation(
      itemTypeId,
      percentage,
    );
  }

  setSelectedShelfFutureItem(itemTypeId, enabled) {
    return this.shopShelfFutureLoadManager.setSelectedFutureItem(itemTypeId, enabled);
  }

  clearSelectedShelfSlot() {
    const slot = this.shopShelfSlotSelectionManager.getSelectedSlot();
    if (!slot) return { ok: false, reason: 'no_selected_slot' };

    if (slot.futureItemTypeId) {
      const futureResult = this.shopShelfFutureLoadManager.setSelectedFutureItem(
        slot.futureItemTypeId,
        false,
      );
      if (!futureResult?.ok) return futureResult;
    }

    let returnedQuantity = 0;
    if (slot.sellItemTypeId && slot.loadedQuantity > 0) {
      const unloadResult = this.shopShelfSlotSelectionManager.unloadSelectedSlotAll();
      if (!unloadResult?.ok) return unloadResult;
      returnedQuantity = unloadResult.quantity;
    }

    return {
      ok: true,
      slotNumber: slot.slotNumber,
      returnedQuantity,
    };
  }

  setSelectedPlayerShelfSlotListing(listing) {
    return this.shopPlayerShelfListingManager.setSelectedSlotListing(listing);
  }

  clearSelectedPlayerShelfSlotListing() {
    return this.shopPlayerShelfListingManager.clearSelectedSlotListing();
  }

  setPlayerShopRequest(slotNumber, request) {
    return this.shopPlayerRequestManager.setRequest(slotNumber, request);
  }

  clearPlayerShopRequest(slotNumber) {
    return this.shopPlayerRequestManager.clearRequest(slotNumber);
  }

  applyPlayerShopMarketSlotQuantity(slotNumber, quantity) {
    return this.shopPlayerShelfListingManager.applyMarketSlotQuantity(slotNumber, quantity);
  }

  buyPlayerShopListingItem(listing) {
    return this.shopPlayerShelfListingManager.buyListingItem(listing);
  }

  buyStockItem(itemTypeId, quantity = 1) {
    return this.shopStockPurchaseManager.buyItem({ itemTypeId, quantity });
  }

  quoteStockPurchase(itemTypeId, quantity = 1) {
    return this.shopStockPurchaseManager.quoteItem({ itemTypeId, quantity });
  }

  claimPlayerShopSaleProceeds(coin) {
    return this.shopPlayerShelfListingManager.claimSaleProceeds(coin);
  }

  collectCoinOffer() {
    return this.shopCoinOfferManager.collect();
  }

  hasFrameTimerWork() {
    return (
      this.shopCoinOfferManager.hasFrameTimerWork() ||
      this.shopShelfFutureLoadManager.hasFrameTimerWork() ||
      this.shopAutoSellManager.hasFrameTimerWork()
    );
  }

  getSnapshot() {
    const market = this.getActiveMarketLicence();
    const marketStallCount = this.syncMarketCapacity();
    const sellableItems = this.getAvailableSellableItemSnapshots();
    const visibleSellItems = this.getVisibleSellItemSnapshots(sellableItems);
    const sellKinds = this.shopSellKindManager.getSellKinds().map((sellKind) => ({
      ...sellKind,
    }));

    return {
      market,
      shelf: {
        unlockedSlots: marketStallCount,
        maxSlots: marketStallCount,
        maxUnlockedSlotsByLevel: marketStallCount,
        slotCosts: [],
        nextSlotNumber: null,
        nextSlotCost: null,
        nextSlotLockedByLevel: false,
        nextSlotRequiresLevel: null,
        selectedSlotNumber: this.shopShelfEntityManager.getSelectedSlotNumber(),
        autoSellSeconds: this.shopBalanceManager.getAutoSellSeconds(),
        sellKinds,
        sellItems: visibleSellItems,
        slots: this.getSlotSnapshots().slice(0, marketStallCount),
      },
      playerShelf: {
        unlockedSlots: marketStallCount,
        maxSlots: marketStallCount,
        maxUnlockedSlotsByLevel: marketStallCount,
        slotCosts: [],
        nextSlotNumber: null,
        nextSlotCost: null,
        nextSlotLockedByLevel: false,
        nextSlotRequiresLevel: null,
        selectedSlotNumber: this.shopPlayerShelfEntityManager.getSelectedSlotNumber(),
        sellKinds,
        sellItems: visibleSellItems,
        slots: this.getPlayerSlotSnapshots().slice(0, marketStallCount),
      },
      playerRequests: {
        unlockedSlots: marketStallCount,
        maxSlots: marketStallCount,
        maxUnlockedSlotsByLevel: marketStallCount,
        nextSlotNumber: null,
        nextSlotLockedByLevel: false,
        nextSlotRequiresLevel: null,
        slots: this.getPlayerRequestSlotSnapshots(marketStallCount).slice(0, marketStallCount),
      },
      stock: {
        sellKinds,
        items: visibleSellItems,
      },
      coinOffer: this.shopCoinOfferManager.getSnapshot(),
    };
  }

  getActiveMarketLicence() {
    return this.marketLicenceFacade?.getActiveLicence?.() ?? {
      id: 'smallTown',
      name: 'Small Town Market',
      requiredStars: 0,
      rank: 1,
    };
  }

  getMarketStallCount() {
    return this.marketLicenceFacade?.getStallCount?.() ?? 1;
  }

  getMarketItemAccess(item) {
    return this.marketLicenceFacade?.getItemAccess?.(item) ?? {
      grade: 1,
      tradedHere: true,
      requiredMarket: this.getActiveMarketLicence(),
    };
  }

  syncMarketCapacity() {
    const stallCount = Math.min(MARKET_MAX_STALLS, this.getMarketStallCount());

    while (this.shopShelfEntityManager.getUnlockedSlots() < stallCount) {
      if (!this.shopShelfEntityManager.unlockNextSlot()) break;
    }

    while (this.shopPlayerShelfEntityManager.getUnlockedSlots() < stallCount) {
      if (!this.shopPlayerShelfEntityManager.unlockNextSlot()) break;
    }

    if ((this.shopShelfEntityManager.getSelectedSlotNumber() ?? 1) > stallCount) {
      this.shopShelfEntityManager.selectSlot(1);
    }

    if ((this.shopPlayerShelfEntityManager.getSelectedSlotNumber() ?? 1) > stallCount) {
      this.shopPlayerShelfEntityManager.selectSlot(1);
    }

    return stallCount;
  }

  syncActiveMarketLicence(market = this.getActiveMarketLicence()) {
    this.playerShopFacade?.setActiveMarketId?.(market.id);
    this.shopNpcPriceManager?.setActiveMarketId?.(market.id);
  }

  getAvailableSellableItemSnapshots() {
    return this.shopSellAvailabilityManager.getAvailableSellableItems(
      this.itemsFacade.getSellableItemSnapshots(),
    );
  }

  getVisibleSellItemSnapshots(sellableItems = this.getAvailableSellableItemSnapshots()) {
    return this.shopSellItemVisibilityManager
      .getVisibleSellItems(sellableItems)
      .map((item) => {
        const marketAccess = this.getMarketItemAccess(item);
        const npcPrice = marketAccess.tradedHere
          ? this.shopNpcPriceManager.getNpcPrice(item)
          : null;
        const sellCoin = marketAccess.tradedHere
          ? this.shopNpcPriceManager.getNpcBuyPriceCoin(item)
          : null;

        return {
          ...item,
          ...(this.shopSellItemVisibilityManager.isResearched(item)
            ? { discovered: item.discoveryType === 'unknown', researched: true, unlocked: true, known: true }
            : {}),
          ...(npcPrice
            ? {
                basePriceCoin: npcPrice.basePriceCoin,
                marketPriceCoin: npcPrice.marketPriceCoin,
                npcNeed: npcPrice.npcNeed,
                targetNeed: npcPrice.targetNeed,
                maxNeed: npcPrice.maxNeed,
                targetStock: npcPrice.targetStock,
                priceHistory: npcPrice.priceHistory ?? [],
              }
            : {}),
          marketGrade: marketAccess.grade,
          tradedHere: marketAccess.tradedHere,
          requiredMarket: marketAccess.requiredMarket,
          sellCoin,
          sellNeed: marketAccess.tradedHere ? this.shopNpcPriceManager.getNpcNeed(item) : null,
          buyCoin: marketAccess.tradedHere
            ? this.shopNpcPriceManager.getNpcSellPriceCoin(item)
            : null,
          stock: marketAccess.tradedHere ? this.shopNpcPriceManager.getNpcStock(item) : null,
        };
      });
  }

  getSlotSnapshots() {
    return this.shopShelfEntityManager.getSlotSnapshots().map((slot) => {
      const futureItem = slot.futureItemTypeId
        ? this.itemsFacade.getItemDefinition(slot.futureItemTypeId)
        : null;
      if (!slot.sellItemTypeId) {
        return {
          ...slot,
          sellKind: null,
          sellKey: null,
          sellLabel: null,
          loadedQuantity: 0,
          batchSize: 1,
          sellCoin: null,
          sellNeed: null,
          targetNeed: null,
          maxNeed: null,
          futureItemKind: futureItem?.kind ?? null,
          futureItemKey: futureItem?.key ?? null,
          futureItemLabel: futureItem?.label ?? null,
        };
      }

      const item = this.itemsFacade.getItemDefinition(slot.sellItemTypeId);
      const marketAccess = this.getMarketItemAccess(item);
      const npcPrice = marketAccess.tradedHere
        ? this.shopNpcPriceManager.getNpcPrice(item)
        : null;

      return {
        ...slot,
        sellKind: item.kind,
        sellKey: item.key,
        sellLabel: item.label,
        sellQuantity: slot.loadedQuantity,
        loadedQuantity: slot.loadedQuantity,
        batchSize: this.shopAutoSellManager.getStallBatchSize?.(slot.slotNumber) ?? 1,
        marketGrade: marketAccess.grade,
        tradedHere: marketAccess.tradedHere,
        requiredMarket: marketAccess.requiredMarket,
        sellCoin: marketAccess.tradedHere ? this.shopNpcPriceManager.getNpcBuyPriceCoin(item) : null,
        sellNeed: marketAccess.tradedHere ? this.shopNpcPriceManager.getNpcNeed(item) : null,
        targetNeed: npcPrice?.targetNeed ?? null,
        maxNeed: npcPrice?.maxNeed ?? null,
        futureItemKind: futureItem?.kind ?? null,
        futureItemKey: futureItem?.key ?? null,
        futureItemLabel: futureItem?.label ?? null,
      };
    });
  }

  getPlayerSlotSnapshots() {
    return this.shopPlayerShelfEntityManager.getSlotSnapshots().map((slot) => {
      if (!slot.itemTypeId) {
        return {
          ...slot,
          itemKey: null,
          itemKind: null,
          itemLabel: null,
        };
      }

      const item = this.itemsFacade.getItemDefinition(slot.itemTypeId);
      const marketAccess = this.getMarketItemAccess(item);

      return {
        ...slot,
        itemKey: item.key,
        itemKind: item.kind,
        itemLabel: item.label,
        marketGrade: marketAccess.grade,
        tradedHere: marketAccess.tradedHere,
        requiredMarket: marketAccess.requiredMarket,
      };
    });
  }

  getPlayerRequestSlotSnapshots(unlockedSlots = this.shopPlayerShelfEntityManager.getUnlockedSlots()) {
    return this.shopPlayerRequestEntityManager.getSlotSnapshots().map((slot) => {
      const unlocked = slot.slotNumber <= unlockedSlots;

      if (!unlocked || !slot.itemTypeId) {
        return {
          slotNumber: slot.slotNumber,
          unlocked,
          itemTypeId: null,
          itemKey: null,
          itemKind: null,
          itemLabel: null,
          quantity: 0,
          priceCoin: 0,
        };
      }

      const item = this.itemsFacade.getItemDefinition(slot.itemTypeId);
      const marketAccess = this.getMarketItemAccess(item);

      return {
        ...slot,
        unlocked,
        itemKey: item.key,
        itemKind: item.kind,
        itemLabel: item.label,
        marketGrade: marketAccess.grade,
        tradedHere: marketAccess.tradedHere,
        requiredMarket: marketAccess.requiredMarket,
      };
    });
  }

  getPersistenceSnapshot() {
    const snapshot = this.getSnapshot();
    const shelf = snapshot.shelf;
    const playerShelf = snapshot.playerShelf;
    const coinOffer = this.shopCoinOfferManager.getPersistenceSnapshot();

    return {
      shelf: {
        unlockedSlots: this.shopShelfEntityManager.getUnlockedSlots(),
        selectedSlotNumber: shelf.selectedSlotNumber,
        slots: this.shopShelfEntityManager.getSlotSnapshots().map((slot) => ({
          slotNumber: slot.slotNumber,
          sellItemKey: slot.sellItemTypeId
            ? this.itemsFacade.getItemDefinition(slot.sellItemTypeId).key
            : null,
          loadedQuantity: slot.loadedQuantity,
          sellProgressSeconds: slot.sellProgressSeconds,
          futureItemKey: slot.futureItemTypeId
            ? this.itemsFacade.getItemDefinition(slot.futureItemTypeId).key
            : null,
          futurePendingQuantity: slot.futurePendingQuantity,
        })),
      },
      playerShelf: {
        unlockedSlots: this.shopPlayerShelfEntityManager.getUnlockedSlots(),
        selectedSlotNumber: playerShelf.selectedSlotNumber,
        slots: this.shopPlayerShelfEntityManager.getSlotSnapshots().map((slot) => ({
          slotNumber: slot.slotNumber,
          itemKey: slot.itemTypeId ? this.itemsFacade.getItemDefinition(slot.itemTypeId).key : null,
          quantity: slot.quantity,
          priceCoin: slot.priceCoin,
        })),
      },
      playerRequests: {
        slots: this.getPlayerRequestSlotSnapshots(
          this.shopPlayerShelfEntityManager.getUnlockedSlots(),
        )
          .filter((slot) => slot.unlocked && slot.itemTypeId)
          .map((slot) => ({
            slotNumber: slot.slotNumber,
            itemKey: slot.itemKey,
            quantity: slot.quantity,
            priceCoin: slot.priceCoin,
          })),
      },
      coinOffer,
      goldOffer: coinOffer,
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    const shelfSnapshot = snapshot.shelf ?? snapshot;
    const slots = Array.isArray(shelfSnapshot.slots)
      ? shelfSnapshot.slots.map((slot) => this.normalizePersistedStall(slot))
      : [];

    this.shopShelfEntityManager.applySnapshot({
      unlockedSlots: this.clampUnlockedSlots(shelfSnapshot.unlockedSlots),
      selectedSlotNumber: shelfSnapshot.selectedSlotNumber,
      slots,
    });

    const playerShelfSnapshot = snapshot.playerShelf;
    const playerSlots = Array.isArray(playerShelfSnapshot?.slots)
      ? playerShelfSnapshot.slots.map((slot) => ({
          slotNumber: slot.slotNumber,
          itemTypeId:
            typeof slot.itemKey === 'string'
              ? this.itemsFacade.safeGetDefinitionByKey(slot.itemKey)?.id
              : 0,
          quantity: slot.quantity,
          priceCoin: slot.priceCoin,
        }))
      : [];

    this.shopPlayerShelfEntityManager.applySnapshot({
      unlockedSlots: this.clampUnlockedSlots(playerShelfSnapshot?.unlockedSlots),
      selectedSlotNumber: playerShelfSnapshot?.selectedSlotNumber,
      slots: playerSlots,
    });
    const playerUnlockedSlots = this.shopPlayerShelfEntityManager.getUnlockedSlots();
    const playerRequestSlots = Array.isArray(snapshot.playerRequests?.slots)
      ? snapshot.playerRequests.slots.map((slot) => ({
          slotNumber: slot.slotNumber,
          itemTypeId:
            typeof slot.itemKey === 'string'
              ? this.itemsFacade.safeGetDefinitionByKey(slot.itemKey)?.id
              : 0,
          quantity: slot.quantity,
          priceCoin: slot.priceCoin,
        }))
      : [];

    this.shopPlayerRequestEntityManager.applySnapshot({
      unlockedSlots: playerUnlockedSlots,
      slots: playerRequestSlots,
    });
    this.shopCoinOfferManager.applyPersistenceSnapshot(
      snapshot.coinOffer ?? snapshot.goldOffer,
    );
    this.syncMarketCapacity();
  }

  normalizePersistedStall(slot = {}) {
    const itemTypeId =
      typeof slot.sellItemKey === 'string'
        ? this.itemsFacade.safeGetDefinitionByKey(slot.sellItemKey)?.id ?? 0
        : 0;
    const cycleSeconds = this.shopBalanceManager.getAutoSellSeconds();
    const sellProgressSeconds = Number.isFinite(slot.sellProgressSeconds)
      ? Math.max(0, slot.sellProgressSeconds) % cycleSeconds
      : 0;
    const futureItemTypeId =
      typeof slot.futureItemKey === 'string'
        ? this.itemsFacade.safeGetDefinitionByKey(slot.futureItemKey)?.id ?? 0
        : 0;
    const futurePendingQuantity = futureItemTypeId
      ? Math.max(0, Math.floor(Number(slot.futurePendingQuantity) || 0))
      : 0;

    if (Object.hasOwn(slot, 'loadedQuantity')) {
      return {
        slotNumber: slot.slotNumber,
        sellItemTypeId: itemTypeId,
        loadedQuantity: Math.max(0, Math.floor(Number(slot.loadedQuantity) || 0)),
        sellProgressSeconds,
        futureItemTypeId,
        futurePendingQuantity,
      };
    }

    if (!itemTypeId) {
      return {
        slotNumber: slot.slotNumber,
        sellItemTypeId: 0,
        loadedQuantity: 0,
        futureItemTypeId,
        futurePendingQuantity,
      };
    }

    const availableQuantity = this.shopSellAvailabilityManager.getAvailableQuantity(itemTypeId);
    const requestedQuantity =
      slot.sellLimitMode === 'amount'
        ? Math.max(0, Math.floor(Number(slot.sellQuantityLimit) || 0))
        : availableQuantity;
    const loadedQuantity = Math.min(availableQuantity, requestedQuantity, 1_000_000);
    if (loadedQuantity > 0) {
      this.itemsFacade.removeItem(itemTypeId, loadedQuantity);
    }

    return {
      slotNumber: slot.slotNumber,
      sellItemTypeId: loadedQuantity > 0 ? itemTypeId : 0,
      loadedQuantity,
      sellProgressSeconds,
      futureItemTypeId,
      futurePendingQuantity,
    };
  }

  clampUnlockedSlots(unlockedSlots) {
    if (!Number.isInteger(unlockedSlots)) {
      return unlockedSlots;
    }

    return Math.min(unlockedSlots, MARKET_MAX_STALLS);
  }
}
