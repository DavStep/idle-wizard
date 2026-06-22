import {
  getPlayerCharacterOptions,
  normalizePlayerCharacter,
} from '../playerCharacters.js';

const CHARACTER_STORAGE_KEY = 'idle-wizard.player.character';

export class PlayerCharacterManager {
  constructor({ storage } = {}) {
    this.storage = storage ?? this.getDefaultStorage();
    this.character = normalizePlayerCharacter(this.readStoredCharacter());
  }

  getCharacter() {
    return this.character;
  }

  getCharacterOptions() {
    return getPlayerCharacterOptions();
  }

  setCharacter(character) {
    this.character = normalizePlayerCharacter(character);
    this.writeStoredCharacter(this.character);
    return this.character;
  }

  applyServerCharacter(character) {
    this.character = normalizePlayerCharacter(character);
    this.writeStoredCharacter(this.character);
    return this.character;
  }

  readStoredCharacter() {
    try {
      return this.storage?.getItem?.(CHARACTER_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  writeStoredCharacter(character) {
    try {
      this.storage?.setItem?.(CHARACTER_STORAGE_KEY, character);
    } catch {
      // Local storage can be unavailable in embedded or private browser contexts.
    }
  }

  getDefaultStorage() {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
