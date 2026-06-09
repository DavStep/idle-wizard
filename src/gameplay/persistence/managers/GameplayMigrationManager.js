export const GAMEPLAY_SAVE_VERSION = 1;

export class GameplayMigrationManager {
  migrate(save) {
    if (!save || typeof save !== 'object') {
      return null;
    }

    if (save.version === GAMEPLAY_SAVE_VERSION) {
      return save;
    }

    return null;
  }
}
