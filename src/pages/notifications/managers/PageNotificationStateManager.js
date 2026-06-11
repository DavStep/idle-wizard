import {
  isItemResearched,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';

export class PageNotificationStateManager {
  getSnapshot(gameplaySnapshot = {}, { playerShop = {} } = {}) {
    const pages = {
      brewing: this.getBrewingPage(gameplaySnapshot),
      garden: this.getGardenPage(gameplaySnapshot),
      workshop: this.getWorkshopPage(gameplaySnapshot),
      research: this.getResearchPage(gameplaySnapshot),
      shop: this.getShopPage(gameplaySnapshot, playerShop),
    };

    return {
      pages,
      active: Object.values(pages).some((page) => page.active),
    };
  }

  getWorkshopPage(snapshot) {
    return this.createPage({
      seeds: snapshot.seedSummoning?.canSummon === true,
      tasks: (snapshot.tasks?.level?.tasks ?? []).some(
        (task) => task.canFill === true || task.canComplete === true,
      ),
    });
  }

  getBrewingPage(snapshot) {
    const brewing = snapshot.brewing ?? {};
    const canUseHerb =
      brewing.canAddIngredient === true &&
      !brewing.activeBrew &&
      this.getVisibleActionItems(snapshot, brewing.herbs).some(
        (herb) => (herb.availableQuantity ?? herb.quantity ?? 0) > 0,
      );

    return this.createPage({
      herbs: canUseHerb,
      action:
        brewing.canBrew === true ||
        brewing.canStartBottling === true ||
        brewing.canCollectPotion === true ||
        brewing.activeBrew?.canStartBottling === true ||
        brewing.activeBrew?.canCollect === true,
    });
  }

  getGardenPage(snapshot) {
    const garden = snapshot.garden ?? {};
    const plot = garden.plot ?? {};
    const context = getGardenNotificationContext(snapshot);

    return this.createPage({
      plots: (plot.tiles ?? []).some((tile) =>
        hasGardenTileNotification({
          tile,
          plot,
          gold: snapshot.gold,
          seedQuantityById: context.seedQuantityById,
          hasPlantableSeed: context.hasPlantableSeed,
        }),
      ),
    });
  }

  getResearchPage(snapshot) {
    return this.createPage({
      research: getResearchTabs(snapshot).some((tab) =>
        (tab.boxes ?? []).some((box) =>
          (box.researches ?? []).some((research) => research.canResearch === true),
        ),
      ),
    });
  }

  getShopPage(snapshot, playerShop = {}) {
    const shop = snapshot.shop ?? {};
    const sellItems = shop.shelf?.sellItems ?? [];
    const hasSellItem = this.getVisibleActionItems(snapshot, sellItems).some(
      (item) => item.quantity > 0,
    );
    const hasNpcEmptyStand = (shop.shelf?.slots ?? []).some(
      (slot) => slot.unlocked && !slot.sellItemTypeId,
    );
    const hasPlayerEmptyStand = (shop.playerShelf?.slots ?? []).some(
      (slot) => slot.unlocked && !slot.itemTypeId,
    );
    const hasAffordableListing = (playerShop.listings ?? []).some(
      (listing) => (snapshot.gold?.current ?? 0) >= (listing.priceGold ?? Infinity),
    );

    return this.createPage({
      npcStand: canBuyNextSlot(snapshot, shop.shelf),
      npcListing: hasNpcEmptyStand && hasSellItem,
      playerStand: canBuyNextSlot(snapshot, shop.playerShelf),
      playerListing:
        playerShop.connected === true && hasPlayerEmptyStand && hasSellItem,
      playerProceeds:
        playerShop.connected === true && (playerShop.proceedsGold ?? 0) > 0,
      playerMarket:
        playerShop.connected === true && hasAffordableListing,
    });
  }

  getVisibleActionItems(snapshot, items = []) {
    return (items ?? [])
      .map((item) => ({
        ...item,
        researched: isItemResearched(snapshot, item),
      }))
      .filter((item) => shouldShowItemInActionList(snapshot, item, item.quantity));
  }

  createPage(children) {
    return {
      active: Object.values(children).some(Boolean),
      children,
    };
  }
}

export function getResearchTabs(snapshot) {
  const tabs = snapshot.research?.tabs;

  if (Array.isArray(tabs) && tabs.length > 0) {
    return tabs;
  }

  return [
    {
      id: 'regular',
      label: 'regular research',
      boxes: snapshot.research?.boxes ?? [],
    },
  ];
}

export function getGardenNotificationContext(snapshot) {
  const seeds = (snapshot.garden?.seeds ?? [])
    .map((seed) => ({
      ...seed,
      researched: isItemResearched(snapshot, seed),
    }))
    .filter((seed) => shouldShowItemInActionList(snapshot, seed, seed.quantity));

  return {
    seedQuantityById: new Map(
      seeds.map((seed) => [seed.itemTypeId, seed.quantity]),
    ),
    hasPlantableSeed: seeds.some((seed) => seed.quantity > 0),
  };
}

export function hasGardenTileNotification({
  tile,
  plot,
  gold,
  seedQuantityById,
  hasPlantableSeed,
} = {}) {
  if (!tile) {
    return false;
  }

  if (!tile.unlocked) {
    return canBuyNextTile({ tile, plot, gold });
  }

  if (tile.phase === 'ready') {
    return true;
  }

  if (tile.phase !== 'empty') {
    return false;
  }

  if (tile.selectedSeedItemTypeId) {
    return (seedQuantityById?.get(tile.selectedSeedItemTypeId) ?? 0) > 0;
  }

  return Boolean(hasPlantableSeed);
}

function canBuyNextTile({ tile, plot, gold }) {
  return (
    tile.tileNumber === plot?.nextTileNumber &&
    plot?.nextTileLockedByLevel !== true &&
    Number.isFinite(plot?.nextTileCost) &&
    (gold?.current ?? 0) >= plot.nextTileCost
  );
}

function canBuyNextSlot(snapshot, shelf) {
  return (
    Number.isInteger(shelf?.nextSlotNumber) &&
    shelf?.nextSlotLockedByLevel !== true &&
    Number.isFinite(shelf?.nextSlotCost) &&
    (snapshot.gold?.current ?? 0) >= shelf.nextSlotCost
  );
}
