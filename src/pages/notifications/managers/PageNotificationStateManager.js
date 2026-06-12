import {
  isItemResearched,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import {
  getNotificationTone,
  isNotificationActive,
  NOTIFICATION_TONE_ORANGE,
  NOTIFICATION_TONE_RED,
} from '../../shared/notificationBadge.js';

export class PageNotificationStateManager {
  getSnapshot(gameplaySnapshot = {}, { playerShop = {} } = {}) {
    const snapshot = gameplaySnapshot ?? {};
    const playerShopSnapshot = playerShop ?? {};
    const pages = {
      brewing: this.getBrewingPage(snapshot),
      garden: this.getGardenPage(snapshot),
      workshop: this.getWorkshopPage(snapshot),
      research: this.getResearchPage(snapshot),
      shop: this.getShopPage(snapshot, playerShopSnapshot),
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
    const npcSellItems = shop.shelf?.sellItems ?? [];
    const playerSellItems = shop.playerShelf?.sellItems ?? npcSellItems;
    const hasNpcSellItem = this.getVisibleActionItems(snapshot, npcSellItems).some(
      (item) => item.quantity > 0,
    );
    const hasPlayerSellItem = this.getVisibleActionItems(snapshot, playerSellItems).some(
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
      npcListing: hasNpcEmptyStand && hasNpcSellItem,
      playerStand: canBuyNextSlot(snapshot, shop.playerShelf),
      playerListing:
        playerShop.connected === true && hasPlayerEmptyStand && hasPlayerSellItem
          ? NOTIFICATION_TONE_ORANGE
          : false,
      playerProceeds:
        playerShop.connected === true && (playerShop.proceedsGold ?? 0) > 0,
      playerMarket:
        playerShop.connected === true && hasAffordableListing,
      crystals: false,
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
    const childTones = Object.values(children)
      .filter(isNotificationActive)
      .map((child) => getNotificationTone(child));
    const active = childTones.length > 0;
    const page = {
      active,
      children,
    };

    if (active) {
      page.tone = childTones.includes(NOTIFICATION_TONE_RED)
        ? NOTIFICATION_TONE_RED
        : NOTIFICATION_TONE_ORANGE;
    }

    return page;
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
