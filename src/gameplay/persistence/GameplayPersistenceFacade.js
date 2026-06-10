import { GameplayLoadManager } from './managers/GameplayLoadManager.js';
import { GameplayMigrationManager } from './managers/GameplayMigrationManager.js';
import { GameplaySaveManager } from './managers/GameplaySaveManager.js';
import { GameplayStorageManager } from './managers/GameplayStorageManager.js';

const AUTOSAVE_SECONDS = 5;

export class GameplayPersistenceFacade {
  static explain =
    'Saves player progress on this device so reloads do not erase the wizard state.';

  constructor({
    storage,
    manaFacade,
    goldFacade,
    crystalFacade,
    gameplayLogFacade,
    itemsFacade,
    researchFacade,
    shopFacade,
    brewingFacade,
    gardenFacade,
    tasksFacade,
    now = () => Date.now(),
  }) {
    this.storageManager = new GameplayStorageManager({ storage });
    this.migrationManager = new GameplayMigrationManager();
    this.saveManager = new GameplaySaveManager({
      manaFacade,
      goldFacade,
      crystalFacade,
      gameplayLogFacade,
      itemsFacade,
      researchFacade,
      shopFacade,
      brewingFacade,
      gardenFacade,
      tasksFacade,
      now,
    });
    this.loadManager = new GameplayLoadManager({
      manaFacade,
      goldFacade,
      crystalFacade,
      gameplayLogFacade,
      itemsFacade,
      researchFacade,
      shopFacade,
      brewingFacade,
      gardenFacade,
      tasksFacade,
    });
    this.now = now;
    this.offlineDeltaSeconds = 0;
    this.autosaveElapsedSeconds = 0;
    this.boundSave = () => this.save();
  }

  load() {
    const save = this.migrationManager.migrate(this.storageManager.load());

    if (!save) {
      this.offlineDeltaSeconds = 0;
      return false;
    }

    const loaded = this.loadManager.applySave(save);
    this.offlineDeltaSeconds = loaded ? this.getOfflineDeltaSeconds(save) : 0;
    return loaded;
  }

  save() {
    return this.storageManager.save(this.saveManager.createSave());
  }

  afterUpdate(frame = {}) {
    const deltaSeconds = Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : Number.isFinite(frame.deltaSeconds)
        ? frame.deltaSeconds
        : 0;
    this.autosaveElapsedSeconds += deltaSeconds;

    if (this.autosaveElapsedSeconds < AUTOSAVE_SECONDS) {
      return false;
    }

    this.autosaveElapsedSeconds = 0;
    return this.save();
  }

  start() {
    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('pagehide', this.boundSave);
    }
  }

  stop() {
    this.save();

    if (typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('pagehide', this.boundSave);
    }
  }

  consumeOfflineDeltaSeconds() {
    const deltaSeconds = this.offlineDeltaSeconds;
    this.offlineDeltaSeconds = 0;
    return deltaSeconds;
  }

  consumeProgressResetPending() {
    return this.migrationManager.consumeProgressResetPending();
  }

  getOfflineDeltaSeconds(save) {
    if (!Number.isFinite(save?.savedAt)) {
      return 0;
    }

    return Math.max(0, (this.now() - save.savedAt) / 1_000);
  }
}
