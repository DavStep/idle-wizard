import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../player/playerThemes.js';
import {
  DEFAULT_PLAYER_COLOR_MODE,
  normalizePlayerColorMode,
} from '../../player/playerColorModes.js';

export class AppThemeManager {
  constructor({ rootElement = globalThis.document?.documentElement } = {}) {
    this.rootElement = rootElement ?? null;
    this.playerFacade = null;
    this.unsubscribe = null;
  }

  mount(playerFacade) {
    this.playerFacade = playerFacade ?? null;
    this.applySettings(this.playerFacade?.getSnapshot?.());

    if (this.playerFacade?.subscribe) {
      this.unsubscribe = this.playerFacade.subscribe((snapshot) => {
        this.applySettings(snapshot);
      });
    }
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.playerFacade = null;
    this.applyTheme(DEFAULT_PLAYER_THEME);
    this.applyColorMode(DEFAULT_PLAYER_COLOR_MODE);
  }

  applySettings(snapshot) {
    this.applyTheme(snapshot?.theme);
    this.applyColorMode(snapshot?.colorMode);
  }

  applyTheme(theme) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.styleTheme = normalizePlayerTheme(theme);
  }

  applyColorMode(colorMode) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.styleColor = normalizePlayerColorMode(colorMode);
  }
}
