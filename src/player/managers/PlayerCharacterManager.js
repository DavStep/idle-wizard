import {
  DEFAULT_PLAYER_CHARACTER,
  normalizePlayerCharacter,
} from '../playerCharacters.js';

export class PlayerCharacterManager {
  constructor() {
    this.character = DEFAULT_PLAYER_CHARACTER;
  }

  getCharacter() {
    return this.character;
  }

  setCharacter(character) {
    this.character = normalizePlayerCharacter(character);
    return this.character;
  }

  applyServerCharacter(character) {
    this.character = normalizePlayerCharacter(character);
    return this.character;
  }
}
