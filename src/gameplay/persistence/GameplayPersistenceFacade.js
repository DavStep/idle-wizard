import { GameplayLoadManager } from './managers/GameplayLoadManager.js';
import { GameplayMigrationManager } from './managers/GameplayMigrationManager.js';
import { GameplaySaveManager } from './managers/GameplaySaveManager.js';
import { GameplayStorageManager } from './managers/GameplayStorageManager.js';

const AUTOSAVE_SECONDS = 60;

export class GameplayPersistenceFacade {
  static explain =
    'Creates and restores player progress saves; the app chooses the storage behind it.';

  constructor({
    storage,
    storageManager,
    manaFacade,
    coinFacade,
    crystalFacade,
    emeraldFacade,
    rubyFacade,
    gameplayLogFacade,
    itemsFacade,
    researchFacade,
    automationFacade,
    seedSummoningFacade,
    prestigeFacade,
    visualSettingsFacade,
    shopFacade,
    brewingFacade,
    gardenFacade,
    tasksFacade,
    personalTasksFacade,
    worldNoticeFacade,
    guildFacade,
    now = () => Date.now(),
    windowRef = globalThis,
    documentRef = globalThis.document,
  }) {
    this.storageManager = storageManager ?? new GameplayStorageManager({ storage });
    this.migrationManager = new GameplayMigrationManager();
    this.saveManager = new GameplaySaveManager({
      manaFacade,
      coinFacade,
      crystalFacade,
      emeraldFacade,
      rubyFacade,
      gameplayLogFacade,
      itemsFacade,
      researchFacade,
      automationFacade,
      seedSummoningFacade,
      prestigeFacade,
      visualSettingsFacade,
      shopFacade,
      brewingFacade,
      gardenFacade,
      tasksFacade,
      personalTasksFacade,
      worldNoticeFacade,
      guildFacade,
      now,
    });
    this.loadManager = new GameplayLoadManager({
      manaFacade,
      coinFacade,
      crystalFacade,
      emeraldFacade,
      rubyFacade,
      gameplayLogFacade,
      itemsFacade,
      researchFacade,
      automationFacade,
      seedSummoningFacade,
      prestigeFacade,
      visualSettingsFacade,
      shopFacade,
      brewingFacade,
      gardenFacade,
      tasksFacade,
      personalTasksFacade,
      worldNoticeFacade,
      guildFacade,
    });
    this.now = now;
    this.windowRef = windowRef;
    this.documentRef = documentRef;
    this.offlineDeltaSeconds = 0;
    this.autosaveElapsedSeconds = 0;
    this.boundSave = () => this.saveAndFlush();
    this.boundVisibilitySave = () => this.saveWhenHidden();
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

  applyRuntimeSave(save) {
    const loaded = this.loadManager.applySave(save);
    this.offlineDeltaSeconds = 0;
    this.autosaveElapsedSeconds = 0;
    return loaded;
  }

  setStorageManager(storageManager) {
    this.storageManager = storageManager ?? new GameplayStorageManager();
  }

  save() {
    if (this.storageManager.canSave?.() === false) {
      return false;
    }

    return this.storageManager.save(this.saveManager.createSave());
  }

  createSave() {
    return this.saveManager.createSave();
  }

  saveAndFlush() {
    if (this.storageManager.canSave?.() === false) {
      return false;
    }

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
    this.windowRef?.addEventListener?.('pagehide', this.boundSave);
    this.windowRef?.addEventListener?.('beforeunload', this.boundSave);
    this.documentRef?.addEventListener?.('visibilitychange', this.boundVisibilitySave);
  }

  stop() {
    this.saveAndFlush();

    this.windowRef?.removeEventListener?.('pagehide', this.boundSave);
    this.windowRef?.removeEventListener?.('beforeunload', this.boundSave);
    this.documentRef?.removeEventListener?.(
      'visibilitychange',
      this.boundVisibilitySave,
    );
  }

  saveWhenHidden() {
    if (this.documentRef?.visibilityState !== 'hidden') {
      return false;
    }

    return this.saveAndFlush();
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
