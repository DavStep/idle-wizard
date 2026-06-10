export class PotionDiscoverySendManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  async discoverPotionRecipe(potionKey) {
    const safePotionKey = this.normalizePotionKey(potionKey);

    if (!safePotionKey) {
      return {
        ok: false,
        reason: 'missing_potion',
      };
    }

    const discoverPotionRecipe = this.findDiscoverPotionRecipeReducer();

    if (!discoverPotionRecipe) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await discoverPotionRecipe({ potionKey: safePotionKey });
      return {
        ok: true,
        potionKey: safePotionKey,
      };
    } catch {
      return {
        ok: false,
        reason: 'send_failed',
        potionKey: safePotionKey,
      };
    }
  }

  normalizePotionKey(potionKey) {
    return String(potionKey ?? '').trim().slice(0, 64);
  }

  findDiscoverPotionRecipeReducer() {
    const reducers = this.connection?.reducers;
    return reducers?.discoverPotionRecipe ?? reducers?.discover_potion_recipe ?? null;
  }
}
