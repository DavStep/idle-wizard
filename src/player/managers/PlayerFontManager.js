import {
  getPlayerFontOptions,
  normalizePlayerFont,
} from '../playerFonts.js';

export class PlayerFontManager {
  constructor() {
    this.font = normalizePlayerFont();
  }

  getFont() {
    return this.font;
  }

  getFontOptions() {
    return getPlayerFontOptions();
  }

  setFont(font) {
    this.font = normalizePlayerFont(font);
    return this.font;
  }

  applyServerFont(font) {
    this.font = normalizePlayerFont(font);
    return this.font;
  }
}
