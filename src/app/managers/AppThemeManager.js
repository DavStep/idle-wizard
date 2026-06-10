import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../player/playerThemes.js';

export class AppThemeManager {
  constructor({ rootElement = globalThis.document?.documentElement } = {}) {
    this.rootElement = rootElement ?? null;
    this.playerFacade = null;
    this.unsubscribe = null;
  }

  mount(playerFacade) {
    this.playerFacade = playerFacade ?? null;
    this.applyTheme(this.playerFacade?.getSnapshot?.().theme);

    if (this.playerFacade?.subscribe) {
      this.unsubscribe = this.playerFacade.subscribe((snapshot) => {
        this.applyTheme(snapshot?.theme);
      });
    }
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.playerFacade = null;
    this.applyTheme(DEFAULT_PLAYER_THEME);
  }

  applyTheme(theme) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.styleTheme = normalizePlayerTheme(theme);
  }
}
