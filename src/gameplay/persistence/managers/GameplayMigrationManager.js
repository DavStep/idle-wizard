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
      return this.createVersion2Save(save);
    }

    return null;
  }

  createVersion2Save(save) {
    const migratedSave = {
      version: GAMEPLAY_SAVE_VERSION,
    };

    for (const key of [
      'savedAt',
      'mana',
      'gold',
      'crystal',
      'ruby',
      'logs',
      'inventory',
      'research',
      'visualSettings',
      'shop',
      'brewing',
      'garden',
      'tasks',
    ]) {
      if (save[key] !== undefined) {
        migratedSave[key] = save[key];
      }
    }

    return migratedSave;
  }

  consumeProgressResetPending() {
    const pending = this.progressResetPending;
    this.progressResetPending = false;
    return pending;
  }
}
