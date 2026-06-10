export const GAMEPLAY_SAVE_VERSION = 2;

export class GameplayMigrationManager {
  constructor() {
    this.progressResetPending = false;
  }

  migrate(save) {
    this.progressResetPending = false;

    if (!save || typeof save !== 'object') {
      return null;
    }

    if (save.version === GAMEPLAY_SAVE_VERSION) {
      return save;
    }

    if (save.version === 1) {
      this.progressResetPending = true;
      return this.createResetSave(save);
    }

    return null;
  }

  createResetSave(save) {
    return {
      version: GAMEPLAY_SAVE_VERSION,
      gold: {
        current: 0,
        totalGenerated: this.readTotalGeneratedGold(save),
      },
    };
  }

  readTotalGeneratedGold(save) {
    const gold = save?.gold;
    if (!gold || typeof gold !== 'object') {
      return 0;
    }

    return Math.max(
      0,
      this.toWholeNumber(gold.totalGenerated),
      this.toWholeNumber(gold.totalGeneratedGold),
      this.toWholeNumber(gold.totalIncome),
      this.toWholeNumber(gold.current),
    );
  }

  toWholeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.floor(number) : 0;
  }

  consumeProgressResetPending() {
    const pending = this.progressResetPending;
    this.progressResetPending = false;
    return pending;
  }
}
