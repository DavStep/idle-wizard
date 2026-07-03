import { normalizeCoinPrice } from '../../../shared/coinPrice.js';

const MAX_RECORDED_MARKET_EVENT_IDS = 1000;

export class StatsCounterManager {
  constructor() {
    this.state = this.createEmptyState();
  }

  createEmptyState() {
    return {
      version: 1,
      seeds: this.createCountBranch(),
      herbs: this.createCountBranch(),
      potions: this.createCountBranch(),
      coin: {
        npcTrade: 0,
        playerTrade: 0,
        royalties: {
          total: 0,
          byPotionKey: {},
        },
      },
      recordedPlayerTradeIds: [],
      recordedRoyaltyIds: [],
    };
  }

  createCountBranch() {
    return {
      total: 0,
      byKey: {},
    };
  }

  recordSeedsGenerated(seedCounts = []) {
    for (const seedCount of Array.isArray(seedCounts) ? seedCounts : []) {
      this.addItemCount('seeds', seedCount?.seed, seedCount?.quantity);
    }
  }

  recordHerbsGrown({ herb, quantity } = {}) {
    this.addItemCount('herbs', herb, quantity);
  }

  recordPotionsBrewed({ potion, quantity } = {}) {
    this.addItemCount('potions', potion, quantity);
  }

  recordNpcTradeCoin(coin) {
    this.state.coin.npcTrade = this.addCoin(this.state.coin.npcTrade, coin);
  }

  recordPlayerMarketProceeds({
    proceedsCoin = 0,
    playerTrades = [],
    royalties = [],
    fallbackPlayerTradeCoin = 0,
  } = {}) {
    let countedCoin = 0;

    for (const trade of Array.isArray(playerTrades) ? playerTrades : []) {
      const tradeId = this.normalizeId(trade?.tradeId);

      if (!tradeId || this.state.recordedPlayerTradeIds.includes(tradeId)) {
        continue;
      }

      const coin = this.normalizeCoin(trade?.coin);

      if (coin > 0) {
        this.state.coin.playerTrade = this.addCoin(this.state.coin.playerTrade, coin);
        countedCoin = this.addCoin(countedCoin, coin);
      }

      this.addRecordedId('recordedPlayerTradeIds', tradeId);
    }

    for (const royalty of Array.isArray(royalties) ? royalties : []) {
      const royaltyId = this.normalizeId(royalty?.royaltyId);

      if (!royaltyId || this.state.recordedRoyaltyIds.includes(royaltyId)) {
        continue;
      }

      const coin = this.normalizeCoin(royalty?.coin);

      if (coin > 0) {
        const potionKey = this.normalizeKey(royalty?.potionKey) || 'unknown';
        const royaltiesBranch = this.state.coin.royalties;
        royaltiesBranch.total = this.addCoin(royaltiesBranch.total, coin);
        royaltiesBranch.byPotionKey[potionKey] = this.addCoin(
          royaltiesBranch.byPotionKey[potionKey],
          coin,
        );
        countedCoin = this.addCoin(countedCoin, coin);
      }

      this.addRecordedId('recordedRoyaltyIds', royaltyId);
    }

    const fallbackCoin = this.normalizeCoin(fallbackPlayerTradeCoin);
    const safeProceedsCoin = this.normalizeCoin(proceedsCoin);
    const remainingCoin = Math.max(0, this.addCoin(safeProceedsCoin, -countedCoin));
    const playerFallbackCoin =
      fallbackCoin > 0 ? Math.min(fallbackCoin, remainingCoin) : 0;

    if (playerFallbackCoin > 0) {
      this.state.coin.playerTrade = this.addCoin(
        this.state.coin.playerTrade,
        playerFallbackCoin,
      );
    }
  }

  addItemCount(branchName, item, quantity) {
    const key = this.normalizeKey(item?.key ?? item?.itemKey);
    const count = this.normalizeCount(quantity);

    if (!key || count <= 0 || !this.state[branchName]) {
      return;
    }

    const branch = this.state[branchName];
    branch.total = this.normalizeCount(branch.total + count);
    branch.byKey[key] = this.normalizeCount((branch.byKey[key] ?? 0) + count);
  }

  addRecordedId(branchName, id) {
    if (!id || !Array.isArray(this.state[branchName])) {
      return;
    }

    this.state[branchName].push(id);

    if (this.state[branchName].length > MAX_RECORDED_MARKET_EVENT_IDS) {
      this.state[branchName] = this.state[branchName].slice(
        -MAX_RECORDED_MARKET_EVENT_IDS,
      );
    }
  }

  getSnapshot({
    seedDefinitions = [],
    herbDefinitions = [],
    potionDefinitions = [],
  } = {}) {
    return {
      version: 1,
      seeds: this.createItemStatsSnapshot(this.state.seeds, seedDefinitions),
      herbs: this.createItemStatsSnapshot(this.state.herbs, herbDefinitions),
      potions: this.createItemStatsSnapshot(this.state.potions, potionDefinitions),
      coin: {
        npcTrade: this.normalizeCoin(this.state.coin.npcTrade),
        playerTrade: this.normalizeCoin(this.state.coin.playerTrade),
        royalties: this.createRoyaltyStatsSnapshot(
          this.state.coin.royalties,
          potionDefinitions,
        ),
      },
    };
  }

  createItemStatsSnapshot(branch = this.createCountBranch(), definitions = []) {
    const byKey = this.normalizeCountMap(branch.byKey);
    const seenKeys = new Set();
    const items = [];

    for (const definition of Array.isArray(definitions) ? definitions : []) {
      const key = this.normalizeKey(definition?.key);

      if (!key) {
        continue;
      }

      seenKeys.add(key);
      items.push({
        itemTypeId: definition.id,
        key,
        label: this.normalizeLabel(definition.label, key),
        kind: definition.kind,
        quantity: byKey[key] ?? 0,
      });
    }

    for (const [key, quantity] of Object.entries(byKey)) {
      if (seenKeys.has(key)) {
        continue;
      }

      items.push({
        itemTypeId: null,
        key,
        label: this.normalizeLabel(null, key),
        kind: null,
        quantity,
      });
    }

    return {
      total: this.normalizeCount(branch.total),
      items,
    };
  }

  createRoyaltyStatsSnapshot(branch = {}, potionDefinitions = []) {
    const byPotionKey = this.normalizeCoinMap(branch.byPotionKey);
    const seenKeys = new Set();
    const items = [];

    for (const definition of Array.isArray(potionDefinitions) ? potionDefinitions : []) {
      const key = this.normalizeKey(definition?.key);

      if (!key || !byPotionKey[key]) {
        continue;
      }

      seenKeys.add(key);
      items.push({
        potionKey: key,
        potionLabel: this.normalizeLabel(definition.label, key),
        coin: byPotionKey[key],
      });
    }

    for (const [key, coin] of Object.entries(byPotionKey)) {
      if (seenKeys.has(key) || coin <= 0) {
        continue;
      }

      items.push({
        potionKey: key,
        potionLabel: this.normalizeLabel(null, key),
        coin,
      });
    }

    return {
      total: this.normalizeCoin(branch.total),
      items,
    };
  }

  getPersistenceSnapshot() {
    return {
      version: 1,
      seeds: {
        total: this.normalizeCount(this.state.seeds.total),
        byKey: this.normalizeCountMap(this.state.seeds.byKey),
      },
      herbs: {
        total: this.normalizeCount(this.state.herbs.total),
        byKey: this.normalizeCountMap(this.state.herbs.byKey),
      },
      potions: {
        total: this.normalizeCount(this.state.potions.total),
        byKey: this.normalizeCountMap(this.state.potions.byKey),
      },
      coin: {
        npcTrade: this.normalizeCoin(this.state.coin.npcTrade),
        playerTrade: this.normalizeCoin(this.state.coin.playerTrade),
        royalties: {
          total: this.normalizeCoin(this.state.coin.royalties.total),
          byPotionKey: this.normalizeCoinMap(this.state.coin.royalties.byPotionKey),
        },
      },
      recordedPlayerTradeIds: this.normalizeIdList(this.state.recordedPlayerTradeIds),
      recordedRoyaltyIds: this.normalizeIdList(this.state.recordedRoyaltyIds),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      this.state = this.createEmptyState();
      return;
    }

    const empty = this.createEmptyState();
    const coin = snapshot.coin && typeof snapshot.coin === 'object' ? snapshot.coin : {};
    const royalties =
      coin.royalties && typeof coin.royalties === 'object' ? coin.royalties : {};

    this.state = {
      version: 1,
      seeds: this.normalizeCountBranch(snapshot.seeds, empty.seeds),
      herbs: this.normalizeCountBranch(snapshot.herbs, empty.herbs),
      potions: this.normalizeCountBranch(snapshot.potions, empty.potions),
      coin: {
        npcTrade: this.normalizeCoin(coin.npcTrade),
        playerTrade: this.normalizeCoin(coin.playerTrade),
        royalties: {
          total: this.normalizeCoin(royalties.total),
          byPotionKey: this.normalizeCoinMap(royalties.byPotionKey),
        },
      },
      recordedPlayerTradeIds: this.normalizeIdList(snapshot.recordedPlayerTradeIds),
      recordedRoyaltyIds: this.normalizeIdList(snapshot.recordedRoyaltyIds),
    };
  }

  normalizeCountBranch(value, fallback = this.createCountBranch()) {
    const branch = value && typeof value === 'object' ? value : fallback;
    return {
      total: this.normalizeCount(branch.total),
      byKey: this.normalizeCountMap(branch.byKey),
    };
  }

  normalizeCountMap(value) {
    const source = value && typeof value === 'object' ? value : {};
    const normalized = {};

    for (const [key, count] of Object.entries(source)) {
      const safeKey = this.normalizeKey(key);
      const safeCount = this.normalizeCount(count);

      if (safeKey && safeCount > 0) {
        normalized[safeKey] = safeCount;
      }
    }

    return normalized;
  }

  normalizeCoinMap(value) {
    const source = value && typeof value === 'object' ? value : {};
    const normalized = {};

    for (const [key, coin] of Object.entries(source)) {
      const safeKey = this.normalizeKey(key);
      const safeCoin = this.normalizeCoin(coin);

      if (safeKey && safeCoin > 0) {
        normalized[safeKey] = safeCoin;
      }
    }

    return normalized;
  }

  normalizeIdList(value) {
    return [
      ...new Set(
        (Array.isArray(value) ? value : [])
          .map((id) => this.normalizeId(id))
          .filter(Boolean),
      ),
    ].slice(-MAX_RECORDED_MARKET_EVENT_IDS);
  }

  normalizeKey(value) {
    return String(value ?? '').trim();
  }

  normalizeId(value) {
    return String(value ?? '').trim();
  }

  normalizeLabel(value, fallback) {
    return (
      String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim() || String(fallback ?? 'unknown')
    );
  }

  normalizeCount(value) {
    const count = Math.floor(Number(value) || 0);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  normalizeCoin(value) {
    return normalizeCoinPrice(value) ?? 0;
  }

  addCoin(left, right) {
    return this.normalizeCoin(this.normalizeCoin(left) + Number(right || 0));
  }
}
