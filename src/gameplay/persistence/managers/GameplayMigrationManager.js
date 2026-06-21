export const GAMEPLAY_SAVE_VERSION = 6;

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

    if (save.version === 5) {
      return this.createVersion6Save(save);
    }

    if (save.version === 4) {
      return this.createVersion6Save(this.createVersion5Save(save));
    }

    if (save.version === 3) {
      return this.createVersion6Save(this.createVersion5Save(this.createVersion4Save(save)));
    }

    if (save.version === 2) {
      return this.createVersion6Save(
        this.createVersion5Save(this.createVersion4Save(this.createVersion3Save(save))),
      );
    }

    if (save.version === 1) {
      return this.createVersion6Save(
        this.createVersion5Save(
          this.createVersion4Save(this.createVersion3Save(this.createVersion2Save(save))),
        ),
      );
    }

    return null;
  }

  createVersion2Save(save) {
    const migratedSave = {
      version: 2,
    };

    for (const key of [
      'savedAt',
      'mana',
      'gold',
      'crystal',
      'emerald',
      'ruby',
      'logs',
      'inventory',
      'research',
      'automation',
      'seedSummoning',
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

  createVersion3Save(save) {
    const migratedSave = {
      version: 3,
    };

    for (const key of [
      'savedAt',
      'mana',
      'gold',
      'crystal',
      'emerald',
      'ruby',
      'logs',
      'inventory',
      'research',
      'automation',
      'seedSummoning',
      'prestige',
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

    if (!migratedSave.prestige) {
      migratedSave.prestige = {
        completedLevels: [],
      };
    }

    return migratedSave;
  }

  createVersion4Save(save) {
    const migratedSave = {
      version: 4,
    };

    for (const key of [
      'savedAt',
      'mana',
      'gold',
      'crystal',
      'emerald',
      'ruby',
      'logs',
      'inventory',
      'research',
      'automation',
      'seedSummoning',
      'prestige',
      'visualSettings',
      'shop',
      'brewing',
      'garden',
      'tasks',
      'personalTasks',
      'worldNotice',
    ]) {
      if (save[key] !== undefined) {
        migratedSave[key] = save[key];
      }
    }

    if (!migratedSave.prestige) {
      migratedSave.prestige = {
        completedLevels: [],
      };
    }

    if (!migratedSave.personalTasks) {
      migratedSave.personalTasks = {
        version: 1,
        periods: {},
      };
    }

    if (!migratedSave.worldNotice) {
      migratedSave.worldNotice = {
        version: 2,
        current: null,
        archive: [],
      };
    }

    return migratedSave;
  }

  createVersion5Save(save) {
    const migratedSave = {
      version: 5,
    };

    for (const key of [
      'savedAt',
      'mana',
      'gold',
      'crystal',
      'emerald',
      'ruby',
      'logs',
      'inventory',
      'research',
      'automation',
      'seedSummoning',
      'prestige',
      'visualSettings',
      'shop',
      'brewing',
      'garden',
      'tasks',
      'personalTasks',
      'worldNotice',
      'guild',
    ]) {
      if (save[key] !== undefined) {
        migratedSave[key] = save[key];
      }
    }

    if (!migratedSave.prestige) {
      migratedSave.prestige = {
        completedLevels: [],
      };
    }

    if (!migratedSave.personalTasks) {
      migratedSave.personalTasks = {
        version: 1,
        periods: {},
      };
    }

    if (!migratedSave.worldNotice) {
      migratedSave.worldNotice = {
        version: 2,
        current: null,
        archive: [],
      };
    }

    if (!migratedSave.guild) {
      migratedSave.guild = {
        version: 1,
        profile: null,
      };
    }

    return migratedSave;
  }

  createVersion6Save(save) {
    const migratedSave = {
      version: GAMEPLAY_SAVE_VERSION,
    };

    for (const key of [
      'savedAt',
      'mana',
      'gold',
      'crystal',
      'emerald',
      'ruby',
      'logs',
      'inventory',
      'research',
      'automation',
      'seedSummoning',
      'prestige',
      'visualSettings',
      'shop',
      'brewing',
      'garden',
      'tasks',
      'personalTasks',
      'worldNotice',
      'guild',
    ]) {
      if (save[key] !== undefined) {
        migratedSave[key] = save[key];
      }
    }

    if (!migratedSave.emerald) {
      migratedSave.emerald = {
        current: 0,
      };
    }

    return migratedSave;
  }

  consumeProgressResetPending() {
    const pending = this.progressResetPending;
    this.progressResetPending = false;
    return pending;
  }
}
