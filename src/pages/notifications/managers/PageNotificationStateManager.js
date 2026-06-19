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
import { WORKSHOP_DISCOVERY_ALLIANCE_UNLOCK_LEVEL } from '../../workshop/managers/WorkshopSecondaryActionGateManager.js';
import { hasClaimableTradeAllianceQuest } from '../../workshop/managers/tradeAllianceQuestStatus.js';

export class PageNotificationStateManager {
  getSnapshot(gameplaySnapshot = {}, { playerShop = {}, tradeAlliance = {} } = {}) {
    const snapshot = gameplaySnapshot ?? {};
    const playerShopSnapshot = playerShop ?? {};
    const tradeAllianceSnapshot = tradeAlliance ?? {};
    const pages = {
      brewing: this.getBrewingPage(snapshot),
      garden: this.getGardenPage(snapshot),
      workshop: this.getWorkshopPage(snapshot, tradeAllianceSnapshot),
      research: this.getResearchPage(snapshot),
      shop: this.getShopPage(snapshot, playerShopSnapshot),
    };

    return {
      pages,
      active: Object.values(pages).some((page) => page.active),
    };
  }

  getWorkshopPage(snapshot, tradeAlliance = {}) {
    return this.createPage({
      seeds: getSeedSummonNotification(snapshot),
      tasks: (snapshot.tasks?.level?.tasks ?? []).some(
        (task) => task.canFill === true || task.canComplete === true,
      ),
      alliance: getTradeAllianceQuestNotification(snapshot, tradeAlliance),
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
      cauldron: canBuyNextCauldron(snapshot, brewing),
      herbs: canUseHerb,
      action:
        brewing.canBrew === true ||
        brewing.canStartBottling === true ||
        brewing.activeBrew?.canStartBottling === true,
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
    const hasNpcSellItem = this.getVisibleActionItems(snapshot, npcSellItems).some(
      (item) => item.quantity > 0,
    );
    const hasNpcEmptyStand = (shop.shelf?.slots ?? []).some(
      (slot) => slot.unlocked && !slot.sellItemTypeId,
    );

    return this.createPage({
      npcStand: canBuyNextSlot(snapshot, shop.shelf),
      npcListing: hasNpcEmptyStand && hasNpcSellItem,
      playerStand: false,
      playerListing: false,
      playerProceeds:
        playerShop.connected === true && (playerShop.proceedsGold ?? 0) > 0,
      playerMarket:
        playerShop.connected === true &&
        hasListingForOwnPlayerRequest(playerShop, snapshot.gold?.current),
      crystals: shop.goldOffer?.canCollect === true,
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

export function getSeedSummonNotification(snapshot = {}) {
  if (snapshot?.seedSummoning?.canSummon !== true) {
    return false;
  }

  if (getCurrentTaskLevel(snapshot) <= 2) {
    return true;
  }

  return isManaCapped(snapshot?.mana) ? NOTIFICATION_TONE_ORANGE : false;
}

export function getTradeAllianceQuestNotification(
  gameplaySnapshot = {},
  tradeAllianceSnapshot = {},
) {
  if (getCurrentTaskLevel(gameplaySnapshot) < WORKSHOP_DISCOVERY_ALLIANCE_UNLOCK_LEVEL) {
    return false;
  }

  return hasClaimableTradeAllianceQuest(tradeAllianceSnapshot);
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

function canBuyNextCauldron(snapshot, brewing) {
  return (
    Number.isInteger(brewing?.nextCauldronNumber) &&
    brewing?.nextCauldronLockedByLevel !== true &&
    Number.isFinite(brewing?.nextCauldronCost) &&
    (snapshot.gold?.current ?? 0) >= brewing.nextCauldronCost
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

function getCurrentTaskLevel(snapshot = {}) {
  const level = snapshot?.tasks?.currentLevel ?? snapshot?.playerLevel?.currentLevel ?? 1;

  return Number.isFinite(level) ? level : 1;
}

function isManaCapped(mana = {}) {
  const current = Number(mana?.current);
  const cap = Number(mana?.cap);

  return Number.isFinite(current) && Number.isFinite(cap) && cap > 0 && current >= cap;
}

function hasListingForOwnPlayerRequest(playerShop = {}, currentGold = 0) {
  const ownRequests = (playerShop.ownRequests ?? []).filter(
    (request) =>
      request?.itemKey &&
      (request.quantity ?? 0) > 0 &&
      (request.priceGold ?? 0) > 0,
  );

  if (ownRequests.length === 0) {
    return false;
  }

  const gold = Number(currentGold) || 0;

  return (playerShop.listings ?? []).some((listing) => {
    const priceGold = Number(listing?.priceGold);

    if (
      !listing?.itemKey ||
      (listing.quantity ?? 0) <= 0 ||
      !Number.isFinite(priceGold) ||
      priceGold > gold
    ) {
      return false;
    }

    return ownRequests.some(
      (request) =>
        request.itemKey === listing.itemKey &&
        (!request.itemKind || request.itemKind === listing.itemKind) &&
        Number(request.priceGold) >= priceGold,
    );
  });
}
