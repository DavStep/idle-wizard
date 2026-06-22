import { GAMEPLAY_SAVE_VERSION } from '../../../gameplay/persistence/managers/GameplayMigrationManager.js';

const RESET_CONFIRMATION = 'RESET';

const CHEAT_HELP = Object.freeze([
  'cheats.fillMana()',
  'cheats.addMana(amount)',
  'cheats.setMana(amount)',
  'cheats.addCoin(amount)',
  'cheats.addCrystal(amount)',
  'cheats.addEmerald(amount)',
  "cheats.addItem('sageSeed', quantity)",
  "cheats.completeResearch('unlockSeed:sageSeed')",
  "cheats.unlockSeed('sage')",
  "cheats.unlockRecipe('manaTonic')",
  "cheats.resetData('RESET')",
  'cheats.listItems()',
  'cheats.listResearch()',
  'cheats.snapshot()',
]);

export class DevCheatCommandManager {
  constructor({ backendFacade, gameplayFacade } = {}) {
    this.backendFacade = backendFacade;
    this.gameplayFacade = gameplayFacade;
  }

  run(command, ...args) {
    if (!this.gameplayFacade) {
      return { ok: false, reason: 'gameplay_missing' };
    }

    const [commandName, commandArgs] = this.parseCommand(command, args);

    switch (this.normalizeCommandName(commandName)) {
      case 'help':
        return { ok: true, commands: [...CHEAT_HELP] };
      case 'snapshot':
        return { ok: true, snapshot: this.gameplayFacade.getSnapshot() };
      case 'fillmana':
        return this.fillMana();
      case 'addmana':
        return this.addMana(commandArgs[0]);
      case 'setmana':
        return this.setMana(commandArgs[0]);
      case 'addcoin':
        return this.addCoin(commandArgs[0]);
      case 'addcrystal':
        return this.addCrystal(commandArgs[0]);
      case 'addemerald':
        return this.addEmerald(commandArgs[0]);
      case 'additem':
        return this.addItem(commandArgs[0], commandArgs[1] ?? 1);
      case 'completeresearch':
        return this.completeResearch(commandArgs[0]);
      case 'unlockseed':
        return this.completeResearch(`unlockSeed:${this.toSeedKey(commandArgs[0])}`);
      case 'unlockrecipe':
        return this.completeResearch(`unlockRecipe:${commandArgs[0]}`);
      case 'resetdata':
        return this.resetData(commandArgs[0]);
      case 'listitems':
        return this.listItems();
      case 'listresearch':
        return this.listResearch();
      default:
        return {
          ok: false,
          reason: 'unknown_command',
          command: commandName,
          help: [...CHEAT_HELP],
        };
    }
  }

  fillMana() {
    this.gameplayFacade.manaFacade.fill();
    this.gameplayFacade.publishAndSaveSnapshot();
    return {
      ok: true,
      mana: this.gameplayFacade.getSnapshot().mana,
    };
  }

  addMana(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.manaFacade.add(safeAmount.value);
    this.gameplayFacade.publishAndSaveSnapshot();
    return {
      ok: true,
      mana: this.gameplayFacade.getSnapshot().mana,
    };
  }

  setMana(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.manaFacade.setCurrent(safeAmount.value);
    this.gameplayFacade.publishAndSaveSnapshot();
    return {
      ok: true,
      mana: this.gameplayFacade.getSnapshot().mana,
    };
  }

  addCoin(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.coinFacade.add(safeAmount.value);
    this.gameplayFacade.publishAndSaveSnapshot();
    return {
      ok: true,
      coin: this.gameplayFacade.getSnapshot().coin,
    };
  }

  addCrystal(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.crystalFacade.add(safeAmount.value);
    this.gameplayFacade.publishAndSaveSnapshot();
    return {
      ok: true,
      crystal: this.gameplayFacade.getSnapshot().crystal,
    };
  }

  addEmerald(amount) {
    const safeAmount = this.readFiniteNumber(amount, 'amount');

    if (!safeAmount.ok) {
      return safeAmount;
    }

    this.gameplayFacade.emeraldFacade.add(safeAmount.value);
    this.gameplayFacade.publishAndSaveSnapshot();
    return {
      ok: true,
      emerald: this.gameplayFacade.getSnapshot().emerald,
    };
  }

  addItem(itemKeyOrId, quantity = 1) {
    const definition = this.getItemDefinition(itemKeyOrId);

    if (!definition.ok) {
      return definition;
    }

    const safeQuantity = this.readPositiveInteger(quantity, 'quantity');

    if (!safeQuantity.ok) {
      return safeQuantity;
    }

    this.gameplayFacade.itemsFacade.addItem(definition.item.itemTypeId, safeQuantity.value);
    this.gameplayFacade.publishAndSaveSnapshot();

    return {
      ok: true,
      item: {
        ...definition.item,
        quantity: this.gameplayFacade.itemsFacade.getItemQuantity(definition.item.itemTypeId),
      },
      addedQuantity: safeQuantity.value,
    };
  }

  completeResearch(researchId) {
    if (typeof researchId !== 'string' || researchId.trim().length <= 0) {
      return { ok: false, reason: 'invalid_research_id' };
    }

    const trimmedResearchId = researchId.trim();
    const snapshot = this.gameplayFacade.researchFacade.getPersistenceSnapshot();
    const completedIds = new Set(snapshot.completedIds);
    const beforeCount = completedIds.size;
    completedIds.add(trimmedResearchId);
    this.gameplayFacade.researchFacade.applyPersistenceSnapshot({
      completedIds: [...completedIds],
    });

    const nextCompletedIds =
      this.gameplayFacade.researchFacade.getPersistenceSnapshot().completedIds;

    if (!nextCompletedIds.includes(trimmedResearchId)) {
      return {
        ok: false,
        reason: 'unknown_research',
        researchId: trimmedResearchId,
      };
    }

    this.gameplayFacade.publishAndSaveSnapshot();
    return {
      ok: true,
      researchId: trimmedResearchId,
      alreadyCompleted: beforeCount === completedIds.size,
      completedResearchIds: nextCompletedIds,
    };
  }

  async resetData(confirmation) {
    if (confirmation !== RESET_CONFIRMATION) {
      return {
        ok: false,
        reason: 'confirmation_required',
        confirmation: RESET_CONFIRMATION,
      };
    }

    if (!this.canSaveReset()) {
      return {
        ok: false,
        reason: 'backend_save_not_ready',
      };
    }

    const loaded = this.gameplayFacade.loadPersistenceSave(this.createResetSave());

    if (!loaded) {
      return {
        ok: false,
        reason: 'reset_failed',
      };
    }

    const saved = await Promise.resolve(
      this.gameplayFacade.savePersistenceSnapshotAndFlush(),
    );
    const playerShop = await this.clearPlayerShopProgress();
    const playerShopRequired = Boolean(this.backendFacade?.getPlayerShopFacade?.());
    const ok = Boolean(saved) && (!playerShopRequired || playerShop.ok !== false);

    return {
      ok,
      ...(ok ? {} : { reason: saved ? playerShop.reason : 'save_failed' }),
      scope: 'gameplay_progress',
      preserved: ['auth', 'profile', 'global_config', 'global_discoveries', 'chat'],
      playerShop,
      snapshot: this.gameplayFacade.getSnapshot(),
    };
  }

  listItems() {
    return {
      ok: true,
      items: [
        ...this.gameplayFacade.itemsFacade.getSeedDefinitions(),
        ...this.gameplayFacade.itemsFacade.getHerbDefinitions(),
        ...this.gameplayFacade.itemsFacade.getPotionDefinitions(),
      ].map((definition) => ({
        itemTypeId: definition.id,
        key: definition.key,
        label: definition.label,
        kind: definition.kind,
      })),
    };
  }

  listResearch() {
    return {
      ok: true,
      research: this.gameplayFacade.researchFacade
        .getSnapshot()
        .tabs.flatMap((tab) =>
          tab.boxes.flatMap((box) =>
            box.researches.map((research) => ({
              id: research.id,
              label: research.label,
              boxId: box.id,
              tabId: tab.id,
              completed: research.completed,
              locked: Boolean(research.locked),
            })),
          ),
        ),
    };
  }

  canSaveReset() {
    if (!this.backendFacade) {
      return true;
    }

    const gameplaySaveSnapshot =
      this.backendFacade.getGameplaySaveFacade?.()?.getSnapshot?.();

    return gameplaySaveSnapshot?.connected === true;
  }

  createResetSave() {
    return {
      version: GAMEPLAY_SAVE_VERSION,
      savedAt: this.getNow(),
      mana: {
        current: 0,
      },
      coin: {
        current: 0,
        totalGenerated: 0,
      },
      crystal: {
        current: 0,
      },
      ruby: {
        current: 0,
      },
      logs: {
        nextId: 1,
        entries: [],
      },
      inventory: [],
      research: {
        completedIds: [],
        inProgress: [],
      },
      prestige: {
        completedLevels: [],
      },
      visualSettings: {},
      shop: {
        shelf: {
          slots: [],
        },
        playerShelf: {
          slots: [],
        },
        coinOffer: {
          cooldownRemainingSeconds: 0,
        },
      },
      brewing: {
        autoBrewEnabled: false,
        autoBrewRecipeKey: null,
        cauldronItemKeys: [],
        activeBrew: null,
      },
      garden: {
        tiles: [],
      },
      tasks: {
        tasks: [],
      },
    };
  }

  getNow() {
    const now = this.gameplayFacade?.persistenceFacade?.now;

    if (typeof now !== 'function') {
      return Date.now();
    }

    return now();
  }

  async clearPlayerShopProgress() {
    const playerShopFacade = this.backendFacade?.getPlayerShopFacade?.();

    if (typeof playerShopFacade?.clearOwnProgress !== 'function') {
      return {
        ok: false,
        reason: 'backend_missing',
      };
    }

    try {
      return await playerShopFacade.clearOwnProgress();
    } catch {
      return {
        ok: false,
        reason: 'clear_failed',
      };
    }
  }

  getItemDefinition(itemKeyOrId) {
    try {
      const itemId = Number(itemKeyOrId);
      const definition = Number.isInteger(itemId)
        ? this.gameplayFacade.itemsFacade.getItemDefinition(itemId)
        : this.gameplayFacade.itemsFacade.getItemDefinitionByKey(String(itemKeyOrId));

      return {
        ok: true,
        item: {
          itemTypeId: definition.id,
          key: definition.key,
          label: definition.label,
          kind: definition.kind,
        },
      };
    } catch {
      return {
        ok: false,
        reason: 'unknown_item',
        itemKeyOrId,
      };
    }
  }

  parseCommand(command, args) {
    if (typeof command !== 'string') {
      return [command, args];
    }

    const parts = command.trim().split(/\s+/).filter(Boolean);

    if (parts.length <= 1 || args.length > 0) {
      return [command, args];
    }

    return [parts[0], parts.slice(1)];
  }

  normalizeCommandName(command) {
    return String(command ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  toSeedKey(seedKey) {
    const trimmedSeedKey = String(seedKey ?? '').trim();

    if (trimmedSeedKey.endsWith('Seed')) {
      return trimmedSeedKey;
    }

    return `${trimmedSeedKey}Seed`;
  }

  readFiniteNumber(value, label) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return {
        ok: false,
        reason: 'invalid_number',
        field: label,
        value,
      };
    }

    return {
      ok: true,
      value: number,
    };
  }

  readPositiveInteger(value, label) {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
      return {
        ok: false,
        reason: 'invalid_positive_integer',
        field: label,
        value,
      };
    }

    return {
      ok: true,
      value: number,
    };
  }
}
