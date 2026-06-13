import { GameplayLoadManager } from './managers/GameplayLoadManager.js';
import { GameplayMigrationManager } from './managers/GameplayMigrationManager.js';
import { GameplaySaveManager } from './managers/GameplaySaveManager.js';
import { GameplayStorageManager } from './managers/GameplayStorageManager.js';

const AUTOSAVE_SECONDS = 30;

export class GameplayPersistenceFacade {
  static explain =
    'Creates and restores player progress saves; the app chooses the storage behind it.';

  constructor({
    storage,
    storageManager,
    manaFacade,
    goldFacade,
    crystalFacade,
    rubyFacade,
    gameplayLogFacade,
    itemsFacade,
    researchFacade,
    visualSettingsFacade,
    shopFacade,
    brewingFacade,
    gardenFacade,
    tasksFacade,
    now = () => Date.now(),
  }) {
    this.storageManager = storageManager ?? new GameplayStorageManager({ storage });
    this.migrationManager = new GameplayMigrationManager();
    this.saveManager = new GameplaySaveManager({
      manaFacade,
      goldFacade,
      crystalFacade,
      rubyFacade,
      gameplayLogFacade,
      itemsFacade,
      researchFacade,
      visualSettingsFacade,
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
      rubyFacade,
      gameplayLogFacade,
      itemsFacade,
      researchFacade,
      visualSettingsFacade,
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
    return this.loadSave(this.storageManager.load());
  }

  loadSave(save) {
    const migratedSave = this.migrationManager.migrate(save);

    if (!migratedSave) {
      this.offlineDeltaSeconds = 0;
      return false;
    }

    const loaded = this.loadManager.applySave(migratedSave);
    this.offlineDeltaSeconds = loaded ? this.getOfflineDeltaSeconds(migratedSave) : 0;
    return loaded;
  }

  setStorageManager(storageManager) {
    this.storageManager = storageManager ?? new GameplayStorageManager();
  }

  save() {
    return this.storageManager.save(this.saveManager.createSave());
  }

  createSave() {
    return this.saveManager.createSave();
  }

  saveAndFlush() {
    const save = this.saveManager.createSave();

    if (typeof this.storageManager.saveAndFlush === 'function') {
      return this.storageManager.saveAndFlush(save);
    }

    return this.storageManager.save(save);
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
