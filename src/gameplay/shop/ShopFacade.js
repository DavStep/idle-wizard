import { ShopBalanceManager } from './managers/ShopBalanceManager.js';
import { ShopAutoSellManager } from './managers/ShopAutoSellManager.js';
import { ShopDirectSellManager } from './managers/ShopDirectSellManager.js';
import { ShopShelfEntityManager } from './managers/ShopShelfEntityManager.js';
import { ShopShelfSlotSelectionManager } from './managers/ShopShelfSlotSelectionManager.js';
import { ShopSellItemVisibilityManager } from './managers/ShopSellItemVisibilityManager.js';
import { ShopSellKindManager } from './managers/ShopSellKindManager.js';
import { ShopSlotPurchaseManager } from './managers/ShopSlotPurchaseManager.js';
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

export class ShopFacade {
  static explain =
    'The market has NPC stands for automatic sales, shared NPC stock to buy, and player stands for listings other players can buy.';

  constructor({
    coinFacade,
    itemsFacade,
    playerLevelFacade,
    researchFacade,
    npcMarketFacade,
    onItemSold,
    getReservedItemQuantity,
    now,
  } = {}) {
    this.shopBalanceManager = new ShopBalanceManager();
    this.shopNpcPriceManager = new ShopNpcPriceManager({
      npcMarketFacade,
      playerLevelFacade,
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
      maxSlots: this.shopBalanceManager.getMaxShelfSlots(),
    });
    this.shopPlayerShelfEntityManager = new ShopPlayerShelfEntityManager({
      initialUnlockedSlots: this.shopBalanceManager.getInitialUnlockedSlots(),
      maxSlots: this.shopBalanceManager.getMaxShelfSlots(),
    });
    this.shopPlayerRequestEntityManager = new ShopPlayerRequestEntityManager({
      maxSlots: this.shopBalanceManager.getMaxShelfSlots(),
    });
    this.shopSlotPurchaseManager = new ShopSlotPurchaseManager({
      coinFacade,
      playerLevelFacade,
      getMaxSlotsByLevel: () => this.getMaxNpcMarketStandsByLevel(),
      getRequiredLevelForSlot: (slotNumber) =>
        this.playerLevelFacade?.getRequiredLevelForNpcMarketStand(slotNumber) ?? null,
      shopBalanceManager: this.shopBalanceManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
    });
    this.shopPlayerSlotPurchaseManager = new ShopSlotPurchaseManager({
      coinFacade,
      playerLevelFacade,
      getMaxSlotsByLevel: () => this.getMaxPlayerMarketStandsByLevel(),
      getRequiredLevelForSlot: (slotNumber) =>
        this.playerLevelFacade?.getRequiredLevelForPlayerMarketStand(slotNumber) ?? null,
      shopBalanceManager: this.shopBalanceManager,
      shopShelfEntityManager: this.shopPlayerShelfEntityManager,
    });
    this.shopShelfSlotSelectionManager = new ShopShelfSlotSelectionManager({
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
    });
    this.shopPlayerShelfListingManager = new ShopPlayerShelfListingManager({
      coinFacade,
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      shopPlayerShelfEntityManager: this.shopPlayerShelfEntityManager,
    });
    this.shopPlayerRequestManager = new ShopPlayerRequestManager({
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopPlayerRequestEntityManager: this.shopPlayerRequestEntityManager,
      isRequestSlotUnlocked: (slotNumber) =>
        this.shopPlayerShelfEntityManager.isSlotUnlocked(slotNumber),
    });
    this.shopStockPurchaseManager = new ShopStockPurchaseManager({
      coinFacade,
      itemsFacade,
      shopNpcPriceManager: this.shopNpcPriceManager,
      shopStockPriceQuoteManager: this.shopStockPriceQuoteManager,
    });
    this.shopDirectSellManager = new ShopDirectSellManager({
      coinFacade,
      itemsFacade,
      researchFacade,
      shopNpcPriceManager: this.shopNpcPriceManager,
      shopNpcSellQuoteManager: this.shopNpcSellQuoteManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      onItemSold,
    });
    this.shopAutoSellManager = new ShopAutoSellManager({
      coinFacade,
      itemsFacade,
      shopBalanceManager: this.shopBalanceManager,
      shopNpcPriceManager: this.shopNpcPriceManager,
      shopNpcSellQuoteManager: this.shopNpcSellQuoteManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
      onItemSold,
      now,
    });
    this.itemsFacade = itemsFacade;
    this.playerLevelFacade = playerLevelFacade;
  }

  setNpcMarketFacade(npcMarketFacade) {
    this.shopNpcPriceManager.setNpcMarketFacade(npcMarketFacade);
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
        maxSlots: this.shopBalanceManager.getMaxShelfSlots(),
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
    this.shopAutoSellManager.register(ecsManagers.systems);
    this.shopCoinOfferManager.register(ecsManagers.systems);
  }

  buyNextShelfSlot() {
    return this.shopSlotPurchaseManager.buyNextSlot();
  }

  buyNextPlayerShelfSlot() {
    return this.shopPlayerSlotPurchaseManager.buyNextSlot();
  }

  selectShelfSlot(slotNumber) {
    return this.shopShelfSlotSelectionManager.selectSlot(slotNumber);
  }

  selectPlayerShelfSlot(slotNumber) {
    return this.shopPlayerShelfListingManager.selectSlot(slotNumber);
  }

  setSelectedShelfSlotSellItem(itemTypeId, sellLimit) {
    return this.shopShelfSlotSelectionManager.setSelectedSlotSellItem(itemTypeId, sellLimit);
  }

  clearSelectedShelfSlotSellItem() {
    return this.shopShelfSlotSelectionManager.clearSelectedSlotSellItem();
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

  sellNpcMarketItem(itemTypeId, quantity = 1) {
    return this.shopDirectSellManager.sellItem({ itemTypeId, quantity });
  }

  quoteNpcMarketSell(itemTypeId, quantity = 1) {
    return this.shopDirectSellManager.quoteItem({ itemTypeId, quantity });
  }

  claimPlayerShopSaleProceeds(coin) {
    return this.shopPlayerShelfListingManager.claimSaleProceeds(coin);
  }

  collectCoinOffer() {
    return this.shopCoinOfferManager.collect();
  }

  getSnapshot() {
    const unlockedSlots = this.shopShelfEntityManager.getUnlockedSlots();
    const playerUnlockedSlots = this.shopPlayerShelfEntityManager.getUnlockedSlots();
    const maxSlots = this.shopBalanceManager.getMaxShelfSlots();
    const maxUnlockedSlotsByLevel = Math.min(maxSlots, this.getMaxNpcMarketStandsByLevel());
    const maxPlayerUnlockedSlotsByLevel = Math.min(
      maxSlots,
      this.getMaxPlayerMarketStandsByLevel(),
    );
    const nextSlotNumber = unlockedSlots + 1;
    const nextSlotCost = this.shopBalanceManager.getSlotCost(nextSlotNumber);
    const nextPlayerSlotNumber = playerUnlockedSlots + 1;
    const nextPlayerSlotCost = this.shopBalanceManager.getSlotCost(nextPlayerSlotNumber);
    const nextSlotLockedByLevel =
      nextSlotCost !== null && nextSlotNumber > maxUnlockedSlotsByLevel;
    const nextPlayerSlotLockedByLevel =
      nextPlayerSlotCost !== null && nextPlayerSlotNumber > maxPlayerUnlockedSlotsByLevel;
    const sellableItems = this.getAvailableSellableItemSnapshots();
    const visibleSellItems = this.getVisibleSellItemSnapshots(sellableItems);
    const sellKinds = this.shopSellKindManager.getSellKinds().map((sellKind) => ({
      ...sellKind,
    }));

    return {
      shelf: {
        unlockedSlots,
        maxSlots,
        maxUnlockedSlotsByLevel,
        slotCosts: this.shopBalanceManager.getSlotCosts(),
        nextSlotNumber: nextSlotCost === null ? null : nextSlotNumber,
        nextSlotCost,
        nextSlotLockedByLevel,
        nextSlotRequiresLevel: nextSlotLockedByLevel
          ? this.playerLevelFacade?.getRequiredLevelForNpcMarketStand(nextSlotNumber) ?? null
          : null,
        selectedSlotNumber: this.shopShelfEntityManager.getSelectedSlotNumber(),
        sellProgressSeconds: this.shopShelfEntityManager.getSellProgressSeconds(),
        autoSellSeconds: this.shopBalanceManager.getAutoSellSeconds(),
        sellKinds,
        sellItems: visibleSellItems,
        slots: this.getSlotSnapshots(sellableItems),
      },
      playerShelf: {
        unlockedSlots: playerUnlockedSlots,
        maxSlots,
        maxUnlockedSlotsByLevel: maxPlayerUnlockedSlotsByLevel,
        slotCosts: this.shopBalanceManager.getSlotCosts(),
        nextSlotNumber: nextPlayerSlotCost === null ? null : nextPlayerSlotNumber,
        nextSlotCost: nextPlayerSlotCost,
        nextSlotLockedByLevel: nextPlayerSlotLockedByLevel,
        nextSlotRequiresLevel: nextPlayerSlotLockedByLevel
          ? this.playerLevelFacade?.getRequiredLevelForPlayerMarketStand(nextPlayerSlotNumber) ?? null
          : null,
        selectedSlotNumber: this.shopPlayerShelfEntityManager.getSelectedSlotNumber(),
        sellKinds,
        sellItems: visibleSellItems,
        slots: this.getPlayerSlotSnapshots(),
      },
      playerRequests: {
        unlockedSlots: playerUnlockedSlots,
        maxSlots,
        maxUnlockedSlotsByLevel: maxPlayerUnlockedSlotsByLevel,
        nextSlotNumber: nextPlayerSlotCost === null ? null : nextPlayerSlotNumber,
        nextSlotLockedByLevel: nextPlayerSlotLockedByLevel,
        nextSlotRequiresLevel: nextPlayerSlotLockedByLevel
          ? this.playerLevelFacade?.getRequiredLevelForPlayerMarketStand(nextPlayerSlotNumber) ?? null
          : null,
        slots: this.getPlayerRequestSlotSnapshots(playerUnlockedSlots),
      },
      stock: {
        sellKinds,
        items: visibleSellItems,
      },
      coinOffer: this.shopCoinOfferManager.getSnapshot(),
    };
  }

  getMaxSlotsByLevel() {
    return this.getMaxNpcMarketStandsByLevel();
  }

  getMaxNpcMarketStandsByLevel() {
    return (
      this.playerLevelFacade?.getMaxNpcMarketStands?.() ?? this.shopBalanceManager.getMaxShelfSlots()
    );
  }

  getMaxPlayerMarketStandsByLevel() {
    return (
      this.playerLevelFacade?.getMaxPlayerMarketStands?.() ??
      this.shopBalanceManager.getMaxShelfSlots()
    );
  }

  getAvailableSellableItemSnapshots() {
    return this.shopSellAvailabilityManager.getAvailableSellableItems(
      this.itemsFacade.getSellableItemSnapshots(),
    );
  }

  getVisibleSellItemSnapshots(sellableItems = this.getAvailableSellableItemSnapshots()) {
    const fastSellPercent = this.shopDirectSellManager.getFastSellPercent();

    return this.shopSellItemVisibilityManager
      .getVisibleSellItems(sellableItems)
      .map((item) => {
        const npcPrice = this.shopNpcPriceManager.getNpcPrice(item);
        const sellCoin = this.shopNpcPriceManager.getNpcBuyPriceCoin(item);

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
              }
            : {}),
          sellCoin,
          fastSellCoin: this.shopDirectSellManager.getFastSellPriceCoin(sellCoin),
          fastSellPercent,
          sellNeed: this.shopNpcPriceManager.getNpcNeed(item),
          buyCoin: this.shopNpcPriceManager.getNpcSellPriceCoin(item),
          stock: this.shopNpcPriceManager.getNpcStock(item),
        };
      });
  }

  getSlotSnapshots(sellableItems = this.getAvailableSellableItemSnapshots()) {
    const sellableItemsById = new Map(sellableItems.map((item) => [item.itemTypeId, item]));

    return this.shopShelfEntityManager.getSlotSnapshots().map((slot) => {
      if (!slot.sellItemTypeId) {
        return {
          ...slot,
          sellKind: null,
          sellKey: null,
          sellLabel: null,
          sellQuantity: null,
          sellLimitMode: 'all',
          sellQuantityLimit: null,
          sellCoin: null,
          sellNeed: null,
        };
      }

      const item = this.itemsFacade.getItemDefinition(slot.sellItemTypeId);
      const sellableItem = sellableItemsById.get(slot.sellItemTypeId);

      return {
        ...slot,
        sellKind: item.kind,
        sellKey: item.key,
        sellLabel: item.label,
        sellQuantity: sellableItem?.quantity ?? 0,
        sellLimitMode: slot.sellLimitMode ?? 'all',
        sellQuantityLimit: slot.sellLimitMode === 'amount' ? slot.sellQuantityLimit ?? 0 : null,
        sellCoin: this.shopNpcPriceManager.getNpcBuyPriceCoin(item),
        sellNeed: this.shopNpcPriceManager.getNpcNeed(item),
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

      return {
        ...slot,
        itemKey: item.key,
        itemKind: item.kind,
        itemLabel: item.label,
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

      return {
        ...slot,
        unlocked,
        itemKey: item.key,
        itemKind: item.kind,
        itemLabel: item.label,
      };
    });
  }

  getPersistenceSnapshot() {
    const snapshot = this.getSnapshot();
    const shelf = snapshot.shelf;
    const playerShelf = snapshot.playerShelf;
    const playerRequests = snapshot.playerRequests;

    return {
      shelf: {
        unlockedSlots: shelf.unlockedSlots,
        selectedSlotNumber: shelf.selectedSlotNumber,
        sellProgressSeconds: this.shopShelfEntityManager.getSellProgressSeconds(),
        slots: this.shopShelfEntityManager.getSlotSnapshots().map((slot) => ({
          slotNumber: slot.slotNumber,
          sellItemKey: slot.sellItemTypeId
            ? this.itemsFacade.getItemDefinition(slot.sellItemTypeId).key
            : null,
          sellLimitMode: slot.sellLimitMode ?? 'all',
          sellQuantityLimit: slot.sellLimitMode === 'amount' ? slot.sellQuantityLimit ?? 0 : null,
          sellProgressSeconds: slot.sellProgressSeconds,
        })),
      },
      playerShelf: {
        unlockedSlots: playerShelf.unlockedSlots,
        selectedSlotNumber: playerShelf.selectedSlotNumber,
        slots: this.shopPlayerShelfEntityManager.getSlotSnapshots().map((slot) => ({
          slotNumber: slot.slotNumber,
          itemKey: slot.itemTypeId ? this.itemsFacade.getItemDefinition(slot.itemTypeId).key : null,
          quantity: slot.quantity,
          priceCoin: slot.priceCoin,
        })),
      },
      playerRequests: {
        slots: playerRequests.slots
          .filter((slot) => slot.unlocked && slot.itemTypeId)
          .map((slot) => ({
            slotNumber: slot.slotNumber,
            itemKey: slot.itemKey,
            quantity: slot.quantity,
            priceCoin: slot.priceCoin,
          })),
      },
      coinOffer: this.shopCoinOfferManager.getPersistenceSnapshot(),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    const shelfSnapshot = snapshot.shelf ?? snapshot;
    const slots = Array.isArray(shelfSnapshot.slots)
      ? shelfSnapshot.slots.map((slot) => ({
          slotNumber: slot.slotNumber,
          sellItemTypeId:
            typeof slot.sellItemKey === 'string'
              ? this.itemsFacade.safeGetDefinitionByKey(slot.sellItemKey)?.id
              : 0,
          sellLimitMode: slot.sellLimitMode,
          sellQuantityLimit: slot.sellQuantityLimit,
          sellProgressSeconds: slot.sellProgressSeconds,
        }))
      : [];

    this.shopShelfEntityManager.applySnapshot({
      unlockedSlots: this.clampUnlockedSlotsByLevel(shelfSnapshot.unlockedSlots),
      selectedSlotNumber: shelfSnapshot.selectedSlotNumber,
      sellProgressSeconds: shelfSnapshot.sellProgressSeconds,
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
      unlockedSlots: this.clampPlayerUnlockedSlotsByLevel(playerShelfSnapshot?.unlockedSlots),
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
    this.shopCoinOfferManager.applyPersistenceSnapshot(snapshot.coinOffer);
  }

  clampUnlockedSlotsByLevel(unlockedSlots) {
    if (!Number.isInteger(unlockedSlots)) {
      return unlockedSlots;
    }

    return Math.min(unlockedSlots, this.getMaxNpcMarketStandsByLevel());
  }

  clampPlayerUnlockedSlotsByLevel(unlockedSlots) {
    if (!Number.isInteger(unlockedSlots)) {
      return unlockedSlots;
    }

    return Math.min(unlockedSlots, this.getMaxPlayerMarketStandsByLevel());
  }
}
