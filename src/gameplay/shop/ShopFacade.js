import { ShopBalanceManager } from './managers/ShopBalanceManager.js';
import { ShopAutoSellManager } from './managers/ShopAutoSellManager.js';
import { ShopShelfEntityManager } from './managers/ShopShelfEntityManager.js';
import { ShopShelfSlotSelectionManager } from './managers/ShopShelfSlotSelectionManager.js';
import { ShopSellItemVisibilityManager } from './managers/ShopSellItemVisibilityManager.js';
import { ShopSellKindManager } from './managers/ShopSellKindManager.js';
import { ShopSlotPurchaseManager } from './managers/ShopSlotPurchaseManager.js';
import { ShopPlayerShelfEntityManager } from './managers/ShopPlayerShelfEntityManager.js';
import { ShopPlayerShelfListingManager } from './managers/ShopPlayerShelfListingManager.js';
import { ShopNpcPriceManager } from './managers/ShopNpcPriceManager.js';
import { ShopSellAvailabilityManager } from './managers/ShopSellAvailabilityManager.js';

export class ShopFacade {
  static explain =
    'The market has NPC stands for automatic sales and player stands for listings other players can buy.';

  constructor({
    goldFacade,
    itemsFacade,
    playerLevelFacade,
    researchFacade,
    npcMarketFacade,
    onItemSold,
    getReservedItemQuantity,
  } = {}) {
    this.shopBalanceManager = new ShopBalanceManager();
    this.shopNpcPriceManager = new ShopNpcPriceManager({
      shopBalanceManager: this.shopBalanceManager,
      npcMarketFacade,
    });
    this.shopSellKindManager = new ShopSellKindManager();
    this.shopSellItemVisibilityManager = new ShopSellItemVisibilityManager({
      researchFacade,
    });
    this.shopSellAvailabilityManager = new ShopSellAvailabilityManager({
      itemsFacade,
      getReservedItemQuantity,
    });
    this.shopShelfEntityManager = new ShopShelfEntityManager({
      initialUnlockedSlots: this.shopBalanceManager.getInitialUnlockedSlots(),
      maxSlots: this.shopBalanceManager.getMaxShelfSlots(),
    });
    this.shopPlayerShelfEntityManager = new ShopPlayerShelfEntityManager({
      initialUnlockedSlots: this.shopBalanceManager.getInitialUnlockedSlots(),
      maxSlots: this.shopBalanceManager.getMaxShelfSlots(),
    });
    this.shopSlotPurchaseManager = new ShopSlotPurchaseManager({
      goldFacade,
      playerLevelFacade,
      getMaxSlotsByLevel: () => this.getMaxNpcMarketStandsByLevel(),
      getRequiredLevelForSlot: (slotNumber) =>
        this.playerLevelFacade?.getRequiredLevelForNpcMarketStand(slotNumber) ?? null,
      shopBalanceManager: this.shopBalanceManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
    });
    this.shopPlayerSlotPurchaseManager = new ShopSlotPurchaseManager({
      goldFacade,
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
    });
    this.shopPlayerShelfListingManager = new ShopPlayerShelfListingManager({
      goldFacade,
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      shopPlayerShelfEntityManager: this.shopPlayerShelfEntityManager,
    });
    this.shopAutoSellManager = new ShopAutoSellManager({
      goldFacade,
      itemsFacade,
      shopBalanceManager: this.shopBalanceManager,
      shopNpcPriceManager: this.shopNpcPriceManager,
      shopSellAvailabilityManager: this.shopSellAvailabilityManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
      onItemSold,
    });
    this.itemsFacade = itemsFacade;
    this.playerLevelFacade = playerLevelFacade;
  }

  setNpcMarketFacade(npcMarketFacade) {
    this.shopNpcPriceManager.setNpcMarketFacade(npcMarketFacade);
  }

  setPotionDiscoveryFacade(potionDiscoveryFacade) {
    this.shopSellItemVisibilityManager.setPotionDiscoveryFacade(potionDiscoveryFacade);
  }

  initialize(ecsManagers) {
    this.shopShelfEntityManager.initialize(ecsManagers);
    this.shopPlayerShelfEntityManager.initialize(ecsManagers);
    this.shopAutoSellManager.register(ecsManagers.systems);
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

  setSelectedShelfSlotSellItem(itemTypeId) {
    return this.shopShelfSlotSelectionManager.setSelectedSlotSellItem(itemTypeId);
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

  applyPlayerShopMarketSlotQuantity(slotNumber, quantity) {
    return this.shopPlayerShelfListingManager.applyMarketSlotQuantity(slotNumber, quantity);
  }

  buyPlayerShopListingItem(listing) {
    return this.shopPlayerShelfListingManager.buyListingItem(listing);
  }

  claimPlayerShopSaleProceeds(gold) {
    return this.shopPlayerShelfListingManager.claimSaleProceeds(gold);
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
      sellGold: this.shopBalanceManager.getSellGold(sellKind.kind),
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
    return this.shopSellItemVisibilityManager
      .getVisibleSellItems(sellableItems)
      .map((item) => ({
        ...item,
        ...(this.shopSellItemVisibilityManager.isResearched(item)
          ? { discovered: item.discoveryType === 'unknown', researched: true, unlocked: true, known: true }
          : {}),
        sellGold: this.shopNpcPriceManager.getNpcBuyPriceGold(item),
      }));
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
          sellGold: null,
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
        sellGold: this.shopNpcPriceManager.getNpcBuyPriceGold(item),
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

  getPersistenceSnapshot() {
    const snapshot = this.getSnapshot();
    const shelf = snapshot.shelf;
    const playerShelf = snapshot.playerShelf;

    return {
      shelf: {
        unlockedSlots: shelf.unlockedSlots,
        selectedSlotNumber: shelf.selectedSlotNumber,
        slots: this.shopShelfEntityManager.getSlotSnapshots().map((slot) => ({
          slotNumber: slot.slotNumber,
          sellItemKey: slot.sellItemTypeId
            ? this.itemsFacade.getItemDefinition(slot.sellItemTypeId).key
            : null,
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
          priceGold: slot.priceGold,
        })),
      },
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
          sellProgressSeconds: slot.sellProgressSeconds,
        }))
      : [];

    this.shopShelfEntityManager.applySnapshot({
      unlockedSlots: this.clampUnlockedSlotsByLevel(shelfSnapshot.unlockedSlots),
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
          priceGold: slot.priceGold,
        }))
      : [];

    this.shopPlayerShelfEntityManager.applySnapshot({
      unlockedSlots: this.clampPlayerUnlockedSlotsByLevel(playerShelfSnapshot?.unlockedSlots),
      selectedSlotNumber: playerShelfSnapshot?.selectedSlotNumber,
      slots: playerSlots,
    });
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
