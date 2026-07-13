import { normalizePrestigeRunFocus } from '../../prestige/prestigeUnlocks.js';
import { getLegacyMultiplierResearchCrystalCost } from '../../research/emeraldResearchIds.js';

export const GAMEPLAY_SAVE_VERSION = 11;

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

    if (save.version === 10) {
      return this.createVersion10Save(save);
    }

    if (save.version === 9) {
      return this.createVersion10Save(save);
    }

    if (save.version === 8) {
      return this.createVersion10Save(this.createVersion9Save(save));
    }

    if (save.version === 7) {
      return this.createVersion10Save(this.createVersion9Save(this.createVersion8Save(save)));
    }

    if (save.version === 6) {
      return this.createVersion10Save(
        this.createVersion9Save(this.createVersion8Save(this.createVersion7Save(save))),
      );
    }

    if (save.version === 5) {
      return this.createVersion10Save(
        this.createVersion9Save(
          this.createVersion8Save(this.createVersion7Save(this.createVersion6Save(save))),
        ),
      );
    }

    if (save.version === 4) {
      return this.createVersion10Save(
        this.createVersion9Save(
          this.createVersion8Save(
            this.createVersion7Save(this.createVersion6Save(this.createVersion5Save(save))),
          ),
        ),
      );
    }

    if (save.version === 3) {
      return this.createVersion10Save(
        this.createVersion9Save(
          this.createVersion8Save(
            this.createVersion7Save(
              this.createVersion6Save(this.createVersion5Save(this.createVersion4Save(save))),
            ),
          ),
        ),
      );
    }

    if (save.version === 2) {
      return this.createVersion10Save(
        this.createVersion9Save(
          this.createVersion8Save(
            this.createVersion7Save(
              this.createVersion6Save(
                this.createVersion5Save(this.createVersion4Save(this.createVersion3Save(save))),
              ),
            ),
          ),
        ),
      );
    }

    if (save.version === 1) {
      return this.createVersion10Save(
        this.createVersion9Save(
          this.createVersion8Save(
            this.createVersion7Save(
              this.createVersion6Save(
                this.createVersion5Save(
                  this.createVersion4Save(this.createVersion3Save(this.createVersion2Save(save))),
                ),
              ),
            ),
          ),
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
      'coin',
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
      'guild',
      'inboxRewards',
      'stats',
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
      'coin',
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
      'guild',
      'inboxRewards',
      'stats',
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
      'coin',
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
      'inboxRewards',
      'stats',
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
        version: 2,
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
      'coin',
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
      'inboxRewards',
      'stats',
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
        version: 2,
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
      version: 6,
    };

    for (const key of [
      'savedAt',
      'mana',
      'coin',
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
      'inboxRewards',
      'stats',
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

  createVersion7Save(save) {
    const migratedSave = {
      version: 7,
    };

    for (const key of [
      'savedAt',
      'mana',
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
      'inboxRewards',
      'stats',
    ]) {
      if (save[key] !== undefined) {
        migratedSave[key] = save[key];
      }
    }

    const coin = save.coin ?? save.gold;
    if (coin !== undefined) {
      migratedSave.coin = coin;
      // Legacy mirror keeps old clients/backends from treating the save as empty.
      migratedSave.gold = coin;
    }

    if (!migratedSave.emerald) {
      migratedSave.emerald = {
        current: 0,
      };
    }

    return migratedSave;
  }

  createVersion8Save(save) {
    const migratedSave = {
      version: 8,
    };

    for (const key of [
      'savedAt',
      'mana',
      'coin',
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
      'inboxRewards',
      'stats',
    ]) {
      if (save[key] !== undefined) {
        migratedSave[key] = save[key];
      }
    }

    if (!migratedSave.inboxRewards) {
      migratedSave.inboxRewards = {
        version: 1,
        claimedMailKeys: [],
      };
    }

    return migratedSave;
  }

  createVersion9Save(save) {
    const migratedSave = {
      version: 9,
    };

    for (const key of [
      'savedAt',
      'mana',
      'coin',
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
      'inboxRewards',
      'stats',
    ]) {
      if (save[key] !== undefined) {
        migratedSave[key] = save[key];
      }
    }

    migratedSave.prestige = normalizeMigratedPrestige(migratedSave.prestige);

    return migratedSave;
  }

  createVersion10Save(save) {
    const migratedSave = {
      version: GAMEPLAY_SAVE_VERSION,
    };

    for (const key of [
      'savedAt',
      'mana',
      'coin',
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
      'inboxRewards',
      'stats',
    ]) {
      if (save[key] !== undefined) {
        migratedSave[key] = save[key];
      }
    }

    if (!migratedSave.stats) {
      migratedSave.stats = createEmptyStatsPersistenceSnapshot();
    }

    if (!Number.isInteger(migratedSave.tasks?.currentLevel)) {
      migratedSave.tasks = {
        ...(migratedSave.tasks ?? {}),
        currentLevel: 1,
        tasks: migratedSave.tasks?.tasks ?? [],
      };
    }

    if (migratedSave.research && typeof migratedSave.research === 'object') {
      migratedSave.research = createLegacyMultiplierResearchCrystalCostSnapshot(
        migratedSave.research,
      );
    }

    return migratedSave;
  }

  consumeProgressResetPending() {
    const pending = this.progressResetPending;
    this.progressResetPending = false;
    return pending;
  }
}

function normalizeMigratedPrestige(prestige = {}) {
  const prestigeBranch = prestige && typeof prestige === 'object' ? prestige : {};

  return {
    ...prestigeBranch,
    completedLevels: normalizeMigratedPrestigeLevels(prestigeBranch.completedLevels),
    runFocus: normalizePrestigeRunFocus(prestigeBranch.runFocus),
  };
}

function normalizeMigratedPrestigeLevels(levels = []) {
  const completedLevels = Array.isArray(levels)
    ? levels
        .map((level) => Math.floor(Number(level)))
        .filter(
          (level) => Number.isFinite(level) && level >= 10 && level % 10 === 0,
        )
    : [];
  const highestLevel = completedLevels.length > 0 ? Math.max(...completedLevels) : 0;
  const normalizedLevels = [];

  for (let level = 10; level <= highestLevel; level += 10) {
    normalizedLevels.push(level);
  }

  return normalizedLevels;
}

function createLegacyMultiplierResearchCrystalCostSnapshot(research) {
  const completedIds = Array.isArray(research.completedIds) ? research.completedIds : [];
  const inProgress = Array.isArray(research.inProgress) ? research.inProgress : [];
  const committedResearchIds = new Set([
    ...completedIds,
    ...inProgress.map((progress) => progress?.researchId),
  ]);
  const existingCosts =
    research.crystalCostById && typeof research.crystalCostById === 'object'
      ? research.crystalCostById
      : {};
  const crystalCostById = {};

  for (const researchId of committedResearchIds) {
    if (typeof researchId !== 'string') {
      continue;
    }

    const existingCost = Math.floor(Number(existingCosts[researchId]));
    const legacyCost = getLegacyMultiplierResearchCrystalCost(researchId);

    if (Number.isFinite(existingCost) && existingCost >= 0) {
      crystalCostById[researchId] = existingCost;
    } else if (legacyCost !== null) {
      crystalCostById[researchId] = legacyCost;
    }
  }

  return {
    ...research,
    crystalCostById,
  };
}

function createEmptyStatsPersistenceSnapshot() {
  return {
    version: 1,
    seeds: { total: 0, byKey: {} },
    herbs: { total: 0, byKey: {} },
    potions: { total: 0, byKey: {} },
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
