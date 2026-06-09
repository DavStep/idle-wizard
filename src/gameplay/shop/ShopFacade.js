import { ShopBalanceManager } from './managers/ShopBalanceManager.js';
import { ShopAutoSellManager } from './managers/ShopAutoSellManager.js';
import { ShopShelfEntityManager } from './managers/ShopShelfEntityManager.js';
import { ShopShelfSlotSelectionManager } from './managers/ShopShelfSlotSelectionManager.js';
import { ShopSellKindManager } from './managers/ShopSellKindManager.js';
import { ShopSlotPurchaseManager } from './managers/ShopSlotPurchaseManager.js';

export class ShopFacade {
  static explain =
    'The shop shelf sells chosen items over time, earns gold, and uses gold to open more slots.';

  constructor({ goldFacade, itemsFacade } = {}) {
    this.shopBalanceManager = new ShopBalanceManager();
    this.shopSellKindManager = new ShopSellKindManager();
    this.shopShelfEntityManager = new ShopShelfEntityManager({
      initialUnlockedSlots: this.shopBalanceManager.getInitialUnlockedSlots(),
      maxSlots: this.shopBalanceManager.getMaxShelfSlots(),
    });
    this.shopSlotPurchaseManager = new ShopSlotPurchaseManager({
      goldFacade,
      shopBalanceManager: this.shopBalanceManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
    });
    this.shopShelfSlotSelectionManager = new ShopShelfSlotSelectionManager({
      itemsFacade,
      shopSellKindManager: this.shopSellKindManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
    });
    this.shopAutoSellManager = new ShopAutoSellManager({
      goldFacade,
      itemsFacade,
      shopBalanceManager: this.shopBalanceManager,
      shopShelfEntityManager: this.shopShelfEntityManager,
    });
    this.itemsFacade = itemsFacade;
  }

  initialize(ecsManagers) {
    this.shopShelfEntityManager.initialize(ecsManagers);
    this.shopAutoSellManager.register(ecsManagers.systems);
  }

  buyNextShelfSlot() {
    return this.shopSlotPurchaseManager.buyNextSlot();
  }

  selectShelfSlot(slotNumber) {
    return this.shopShelfSlotSelectionManager.selectSlot(slotNumber);
  }

  setSelectedShelfSlotSellItem(itemTypeId) {
    return this.shopShelfSlotSelectionManager.setSelectedSlotSellItem(itemTypeId);
  }

  getSnapshot() {
    const unlockedSlots = this.shopShelfEntityManager.getUnlockedSlots();
    const maxSlots = this.shopBalanceManager.getMaxShelfSlots();
    const nextSlotNumber = unlockedSlots + 1;
    const nextSlotCost = this.shopBalanceManager.getSlotCost(nextSlotNumber);

    return {
      shelf: {
        unlockedSlots,
        maxSlots,
        slotCosts: this.shopBalanceManager.getSlotCosts(),
        nextSlotNumber: nextSlotCost === null ? null : nextSlotNumber,
        nextSlotCost,
        selectedSlotNumber: this.shopShelfEntityManager.getSelectedSlotNumber(),
        autoSellSeconds: this.shopBalanceManager.getAutoSellSeconds(),
        sellKinds: this.shopSellKindManager.getSellKinds().map((sellKind) => ({
          ...sellKind,
          sellGold: this.shopBalanceManager.getSellGold(sellKind.kind),
        })),
        sellItems: this.itemsFacade.getSellableItemSnapshots().map((item) => ({
          ...item,
          sellGold: this.shopBalanceManager.getSellGold(item.kind),
        })),
        slots: this.getSlotSnapshots(),
      },
    };
  }

  getSlotSnapshots() {
    return this.shopShelfEntityManager.getSlotSnapshots().map((slot) => {
      if (!slot.sellItemTypeId) {
        return {
          ...slot,
          sellKind: null,
          sellLabel: null,
          sellGold: null,
        };
      }

      const item = this.itemsFacade.getItemDefinition(slot.sellItemTypeId);

      return {
        ...slot,
        sellKind: item.kind,
        sellLabel: item.label,
        sellGold: this.shopBalanceManager.getSellGold(item.kind),
      };
    });
  }
}
