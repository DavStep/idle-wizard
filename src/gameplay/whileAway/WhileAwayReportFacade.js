import { WhileAwayReportCollectorManager } from './managers/WhileAwayReportCollectorManager.js';

export class WhileAwayReportFacade {
  static explain =
    'Summarizes what existing timers and automation did while the player was away, so the return screen can show one small report.';

  constructor() {
    this.collectorManager = new WhileAwayReportCollectorManager();
  }

  beginCatchup(options) {
    return this.collectorManager.beginCatchup(options);
  }

  finishCatchup(options) {
    return this.collectorManager.finishCatchup(options);
  }

  cancelCatchup() {
    this.collectorManager.cancelCatchup();
  }

  recordResearchComplete(event) {
    this.collectorManager.recordResearchComplete(event);
  }

  recordItemSold(event) {
    this.collectorManager.recordItemSold(event);
  }

  recordSeedSummoned(event) {
    this.collectorManager.recordSeedSummoned(event);
  }

  recordBrewComplete(event) {
    this.collectorManager.recordBrewComplete(event);
  }

  recordGardenHarvestComplete(event) {
    this.collectorManager.recordGardenHarvestComplete(event);
  }

  recordBrewStarted(event) {
    this.collectorManager.recordBrewStarted(event);
  }

  recordGardenSeedPlanted(event) {
    this.collectorManager.recordGardenSeedPlanted(event);
  }

  consumeReports() {
    return this.collectorManager.consumeReports();
  }

  getReportRevision() {
    return this.collectorManager.getReportRevision();
  }
}
