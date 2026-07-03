import { StatsCounterManager } from './managers/StatsCounterManager.js';

export class StatsFacade {
  static explain =
    'Tracks lifetime totals for produced items and earned coin so the stats popup can show history without making pages own gameplay rules.';

  constructor({ itemsFacade } = {}) {
    this.itemsFacade = itemsFacade;
    this.statsCounterManager = new StatsCounterManager();
  }

  recordSeedsGenerated(seedCounts) {
    this.statsCounterManager.recordSeedsGenerated(seedCounts);
  }

  recordHerbsGrown(event) {
    this.statsCounterManager.recordHerbsGrown(event);
  }

  recordPotionsBrewed(event) {
    this.statsCounterManager.recordPotionsBrewed(event);
  }

  recordNpcTradeCoin(coin) {
    this.statsCounterManager.recordNpcTradeCoin(coin);
  }

  recordPlayerMarketProceeds(event) {
    this.statsCounterManager.recordPlayerMarketProceeds(event);
  }

  getSnapshot() {
    return this.statsCounterManager.getSnapshot({
      seedDefinitions: this.itemsFacade?.getSeedDefinitions?.() ?? [],
      herbDefinitions: this.itemsFacade?.getHerbDefinitions?.() ?? [],
      potionDefinitions: this.itemsFacade?.getPotionDefinitions?.() ?? [],
    });
  }

  getPersistenceSnapshot() {
    return this.statsCounterManager.getPersistenceSnapshot();
  }

  applyPersistenceSnapshot(snapshot) {
    this.statsCounterManager.applyPersistenceSnapshot(snapshot);
  }
}
