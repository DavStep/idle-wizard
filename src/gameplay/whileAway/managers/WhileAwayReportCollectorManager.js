export class WhileAwayReportCollectorManager {
  constructor() {
    this.active = null;
    this.pendingReports = [];
    this.reportRevision = 0;
  }

  beginCatchup({ beforeSnapshot, offlineSeconds = 0, source = 'offline' } = {}) {
    const safeOfflineSeconds = Math.max(0, Number(offlineSeconds) || 0);

    this.active = {
      beforeSnapshot,
      offlineSeconds: safeOfflineSeconds,
      source,
      marketCoinSold: 0,
      seedSummonedQuantity: 0,
      brewCompletions: new Map(),
      harvestCompletions: new Map(),
    };
  }

  finishCatchup() {
    if (!this.active) {
      return null;
    }

    const active = this.active;
    this.active = null;

    const rows = this.createRows(active);

    if (rows.length <= 0) {
      return null;
    }

    const report = {
      kind: 'whileAway',
      source: active.source,
      offlineSeconds: active.offlineSeconds,
      rows,
    };

    this.pendingReports.push(report);
    this.reportRevision += 1;
    return report;
  }

  cancelCatchup() {
    this.active = null;
  }

  recordResearchComplete() {}

  recordItemSold(event = {}) {
    if (!this.active) {
      return;
    }

    const coin = Math.floor(Number(event.coin) || 0);

    if (coin <= 0) {
      return;
    }

    this.active.marketCoinSold += coin;
  }

  recordSeedSummoned(event = {}) {
    if (!this.active) {
      return;
    }

    const quantity = Math.floor(Number(event.quantity) || 0);

    if (quantity <= 0) {
      return;
    }

    this.active.seedSummonedQuantity += quantity;
  }

  recordBrewComplete(event = {}) {
    if (!this.active) {
      return;
    }

    const label = this.normalizeLabel(event.potion?.label);
    const quantity = Math.max(1, Math.floor(Number(event.quantity) || 1));

    if (!label) {
      return;
    }

    this.addQuantity(this.active.brewCompletions, label, quantity);
  }

  recordGardenHarvestComplete(event = {}) {
    if (!this.active) {
      return;
    }

    const label = this.normalizeLabel(event.herb?.label);
    const quantity = Math.max(1, Math.floor(Number(event.quantity) || 1));

    if (!label) {
      return;
    }

    this.addQuantity(this.active.harvestCompletions, label, quantity);
  }

  recordBrewStarted() {}

  recordGardenSeedPlanted() {}

  consumeReports() {
    const reports = this.pendingReports;
    this.pendingReports = [];
    return reports;
  }

  getReportRevision() {
    return this.reportRevision;
  }

  createRows(active) {
    const rows = [];

    if (active.seedSummonedQuantity > 0) {
      rows.push({ type: 'auto_seed_summoned', quantity: active.seedSummonedQuantity });
    }

    for (const [label, quantity] of active.harvestCompletions) {
      rows.push({ type: 'garden_harvested', label, quantity });
    }

    for (const [label, quantity] of active.brewCompletions) {
      rows.push({ type: 'brewing_complete', label, quantity });
    }

    if (active.marketCoinSold > 0) {
      rows.push({ type: 'npc_market_sold', coin: active.marketCoinSold });
    }

    return rows;
  }

  addQuantity(map, label, quantity) {
    map.set(label, (map.get(label) ?? 0) + quantity);
  }

  normalizeLabel(label) {
    return String(label ?? '').replace(/\s+/g, ' ').trim();
  }
}
