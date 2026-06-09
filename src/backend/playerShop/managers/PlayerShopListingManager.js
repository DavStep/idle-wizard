export class PlayerShopListingManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  async setSlotListing(slot) {
    const setPlayerShopSlot = this.findReducer('setPlayerShopSlot', 'set_player_shop_slot');

    if (!setPlayerShopSlot) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await setPlayerShopSlot({
        slotNumber: slot.slotNumber,
        itemKey: slot.itemKey,
        itemLabel: slot.itemLabel,
        itemKind: slot.itemKind,
        quantity: slot.quantity,
        priceGold: BigInt(slot.priceGold),
      });

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'publish_failed',
      };
    }
  }

  async clearSlotListing(slotNumber) {
    const clearPlayerShopSlot = this.findReducer('clearPlayerShopSlot', 'clear_player_shop_slot');

    if (!clearPlayerShopSlot) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await clearPlayerShopSlot({ slotNumber });

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'clear_failed',
      };
    }
  }

  async buyListing({ listingKey, quantity = 1 }) {
    const buyPlayerShopListing = this.findReducer(
      'buyPlayerShopListing',
      'buy_player_shop_listing',
    );

    if (!buyPlayerShopListing) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await buyPlayerShopListing({
        listingKey,
        quantity,
      });

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'buy_failed',
      };
    }
  }

  async claimProceeds() {
    const claimPlayerShopProceeds = this.findReducer(
      'claimPlayerShopProceeds',
      'claim_player_shop_proceeds',
    );

    if (!claimPlayerShopProceeds) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await claimPlayerShopProceeds({});

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'claim_failed',
      };
    }
  }

  findReducer(camelName, snakeName) {
    const reducers = this.connection?.reducers;
    return reducers?.[camelName] ?? reducers?.[snakeName] ?? null;
  }
}
