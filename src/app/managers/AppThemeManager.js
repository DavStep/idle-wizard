import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../player/playerThemes.js';
import {
  DEFAULT_PLAYER_COLOR_MODE,
  normalizePlayerColorMode,
} from '../../player/playerColorModes.js';
import {
  DEFAULT_PLAYER_FONT,
  normalizePlayerFont,
} from '../../player/playerFonts.js';
import {
  DEFAULT_PLAYER_ICON_MODE,
  normalizePlayerIconMode,
} from '../../player/playerIconModes.js';
import {
  DEFAULT_PLAYER_PROGRESS_BAR,
  normalizePlayerProgressBar,
} from '../../player/playerProgressBars.js';
import {
  DEFAULT_PLAYER_PLOT_VIEW,
  normalizePlayerPlotView,
} from '../../player/playerPlotViews.js';

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
    this.applyFont(DEFAULT_PLAYER_FONT);
    this.applyColorMode(DEFAULT_PLAYER_COLOR_MODE);
    this.applyIconMode(DEFAULT_PLAYER_ICON_MODE);
    this.applyProgressBar(DEFAULT_PLAYER_PROGRESS_BAR);
    this.applyPlotView(DEFAULT_PLAYER_PLOT_VIEW);
  }

  applySettings(snapshot) {
    this.applyTheme(snapshot?.theme);
    this.applyFont(snapshot?.font);
    this.applyColorMode(snapshot?.colorMode);
    this.applyIconMode(snapshot?.iconMode);
    this.applyProgressBar(snapshot?.progressBar);
    this.applyPlotView(snapshot?.plotView);
  }

  applyTheme(theme) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.styleTheme = normalizePlayerTheme(theme);
  }

  applyFont(font) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.styleFont = normalizePlayerFont(font);
  }

  applyColorMode(colorMode) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.styleColor = normalizePlayerColorMode(colorMode);
  }

  applyIconMode(iconMode) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.styleIcons = normalizePlayerIconMode(iconMode);
  }

  applyProgressBar(progressBar) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.styleProgress = normalizePlayerProgressBar(progressBar);
  }

  applyPlotView(plotView) {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.dataset.stylePlotView = normalizePlayerPlotView(plotView);
  }
}
