import { normalizePositiveCoinPrice } from '../../../shared/coinPrice.js';

const MAX_PLAYER_SHOP_SLOTS = 5;

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
    const priceCoin = normalizePositiveCoinPrice(slot.priceCoin);

    if (!setPlayerShopSlot) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    if (priceCoin === null) {
      return {
        ok: false,
        reason: 'invalid_price',
      };
    }

    try {
      await setPlayerShopSlot({
        slotNumber: slot.slotNumber,
        itemKey: slot.itemKey,
        itemLabel: slot.itemLabel,
        itemKind: slot.itemKind,
        quantity: slot.quantity,
        priceCoin,
        priceGold: priceCoin,
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

  async setSlotRequest(slot) {
    const setPlayerShopRequest = this.findReducer(
      'setPlayerShopRequest',
      'set_player_shop_request',
    );
    const priceCoin = normalizePositiveCoinPrice(slot.priceCoin);

    if (!setPlayerShopRequest) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    if (priceCoin === null) {
      return {
        ok: false,
        reason: 'invalid_price',
      };
    }

    try {
      await setPlayerShopRequest({
        slotNumber: slot.slotNumber,
        itemKey: slot.itemKey,
        itemLabel: slot.itemLabel,
        itemKind: slot.itemKind,
        quantity: slot.quantity,
        priceCoin,
        priceGold: priceCoin,
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

  async clearSlotRequest(slotNumber) {
    const clearPlayerShopRequest = this.findReducer(
      'clearPlayerShopRequest',
      'clear_player_shop_request',
    );

    if (!clearPlayerShopRequest) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await clearPlayerShopRequest({ slotNumber });

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

  async clearOwnProgress() {
    const clearPlayerShopSlot = this.findReducer('clearPlayerShopSlot', 'clear_player_shop_slot');
    const claimPlayerShopProceeds = this.findReducer(
      'claimPlayerShopProceeds',
      'claim_player_shop_proceeds',
    );
    const clearPlayerShopRequest = this.findReducer(
      'clearPlayerShopRequest',
      'clear_player_shop_request',
    );

    if (!clearPlayerShopSlot && !claimPlayerShopProceeds && !clearPlayerShopRequest) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    let failed = false;

    if (clearPlayerShopSlot) {
      for (let slotNumber = 1; slotNumber <= MAX_PLAYER_SHOP_SLOTS; slotNumber += 1) {
        try {
          await clearPlayerShopSlot({ slotNumber });
        } catch {
          failed = true;
        }
      }
    }

    if (clearPlayerShopRequest) {
      for (let slotNumber = 1; slotNumber <= MAX_PLAYER_SHOP_SLOTS; slotNumber += 1) {
        try {
          await clearPlayerShopRequest({ slotNumber });
        } catch {
          failed = true;
        }
      }
    }

    if (claimPlayerShopProceeds) {
      try {
        await claimPlayerShopProceeds({});
      } catch {
        failed = true;
      }
    }

    return failed
      ? {
          ok: false,
          reason: 'clear_failed',
        }
      : {
          ok: true,
        };
  }

  findReducer(camelName, snakeName) {
    const reducers = this.connection?.reducers;
    return reducers?.[camelName] ?? reducers?.[snakeName] ?? null;
  }
}
