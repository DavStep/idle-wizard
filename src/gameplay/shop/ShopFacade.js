import { ShopBalanceManager } from './managers/ShopBalanceManager.js';
import { ShopAutoSellManager } from './managers/ShopAutoSellManager.js';
import { ShopShelfEntityManager } from './managers/ShopShelfEntityManager.js';
import { ShopShelfSlotSelectionManager } from './managers/ShopShelfSlotSelectionManager.js';
import { ShopSellItemVisibilityManager } from './managers/ShopSellItemVisibilityManager.js';
import { ShopSellKindManager } from './managers/ShopSellKindManager.js';
import { ShopSlotPurchaseManager } from './managers/ShopSlotPurchaseManager.js';
import { ShopPlayerShelfEntityManager } from './managers/ShopPlayerShelfEntityManager.js';
import { ShopPlayerShelfListingManager } from './managers/ShopPlayerShelfListingManager.js';

export class ShopFacade {
  static explain =
    'The shop has a trader shelf for automatic sales and a player shelf for listing items other players can buy.';

  constructor({ goldFacade, itemsFacade, researchFacade, onItemSold } = {}) {
    this.shopBalanceManager = new ShopBalanceManager();
    this.shopSellKindManager = new ShopSellKindManager();
    this.shopSellItemVisibilityManager = new ShopSellItemVisibilityManager({
      researchFacade,
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
      shopBalanceManager: this.shopBalanceManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
    });
    this.shopPlayerSlotPurchaseManager = new ShopSlotPurchaseManager({
      goldFacade,
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
      shopPlayerShelfEntityManager: this.shopPlayerShelfEntityManager,
    });
    this.shopAutoSellManager = new ShopAutoSellManager({
      goldFacade,
      itemsFacade,
      shopBalanceManager: this.shopBalanceManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
      onItemSold,
    });
    this.itemsFacade = itemsFacade;
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
    const nextSlotNumber = unlockedSlots + 1;
    const nextSlotCost = this.shopBalanceManager.getSlotCost(nextSlotNumber);
    const nextPlayerSlotNumber = playerUnlockedSlots + 1;
    const nextPlayerSlotCost = this.shopBalanceManager.getSlotCost(nextPlayerSlotNumber);
    const sellableItems = this.itemsFacade.getSellableItemSnapshots();
    const visibleSellItems = this.getVisibleSellItemSnapshots(sellableItems);
    const sellKinds = this.shopSellKindManager.getSellKinds().map((sellKind) => ({
      ...sellKind,
      sellGold: this.shopBalanceManager.getSellGold(sellKind.kind),
    }));

    return {
      shelf: {
        unlockedSlots,
        maxSlots,
        slotCosts: this.shopBalanceManager.getSlotCosts(),
        nextSlotNumber: nextSlotCost === null ? null : nextSlotNumber,
        nextSlotCost,
        selectedSlotNumber: this.shopShelfEntityManager.getSelectedSlotNumber(),
        autoSellSeconds: this.shopBalanceManager.getAutoSellSeconds(),
        sellKinds,
        sellItems: visibleSellItems,
        slots: this.getSlotSnapshots(sellableItems),
      },
      playerShelf: {
        unlockedSlots: playerUnlockedSlots,
        maxSlots,
        slotCosts: this.shopBalanceManager.getSlotCosts(),
        nextSlotNumber: nextPlayerSlotCost === null ? null : nextPlayerSlotNumber,
        nextSlotCost: nextPlayerSlotCost,
        selectedSlotNumber: this.shopPlayerShelfEntityManager.getSelectedSlotNumber(),
        sellKinds,
        sellItems: visibleSellItems,
        slots: this.getPlayerSlotSnapshots(),
      },
    };
  }

  getVisibleSellItemSnapshots(sellableItems = this.itemsFacade.getSellableItemSnapshots()) {
    return this.shopSellItemVisibilityManager
      .getVisibleSellItems(sellableItems)
      .map((item) => ({
        ...item,
        sellGold: this.shopBalanceManager.getSellGold(item.kind, item),
      }));
  }

  getSlotSnapshots(sellableItems = this.itemsFacade.getSellableItemSnapshots()) {
    const sellableItemsById = new Map(sellableItems.map((item) => [item.itemTypeId, item]));

    return this.shopShelfEntityManager.getSlotSnapshots().map((slot) => {
      if (!slot.sellItemTypeId) {
        return {
          ...slot,
          sellKind: null,
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
        sellLabel: item.label,
        sellQuantity: sellableItem?.quantity ?? 0,
        sellGold: this.shopBalanceManager.getSellGold(item.kind, item),
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
      unlockedSlots: shelfSnapshot.unlockedSlots,
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
      unlockedSlots: playerShelfSnapshot?.unlockedSlots,
      selectedSlotNumber: playerShelfSnapshot?.selectedSlotNumber,
      slots: playerSlots,
    });
  }
}
