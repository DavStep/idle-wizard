import { QuickUiFacade } from '../../rendering/quickUi/QuickUiFacade.js';
import { getQuickUiNameFromSearch } from '../../rendering/quickUi/managers/QuickUiScreenManager.js';

export class QuickUiPreviewFacade {
  static explain =
    'Opens one exported qUIck screen over the live game so artists can inspect its real Pixi rendering without wiring gameplay first.';

  constructor({ app, search = window.location.search } = {}) {
    this.app = app;
    this.search = search;
    this.quickUiFacade = null;
    this.mountPromise = null;
  }

  mount() {
    const name = getQuickUiNameFromSearch(this.search);

    if (!name) {
      return false;
    }

    const stage = this.app.lifecycleManager?.stage;

    if (!stage) {
      throw new Error('qUIck preview requires the mounted game stage.');
    }

    this.app.renderFacade.mount(stage);
    this.quickUiFacade = new QuickUiFacade({
      whenPixiReady: () => this.app.renderFacade.whenPixiReady(),
      getCanvas: () => this.app.renderFacade.getCanvas(),
    });

    const params = new URLSearchParams(this.search);
    const debug =
      params.get('quick_debug') === '1' || params.get('ui_debug') === '1';

    this.mountPromise = this.quickUiFacade
      .mountPreview(name, {
        debug,
        debugDrawBounds: debug,
        debugShowNames: debug,
      })
      .catch((error) => {
        globalThis.console.warn(
          `[qUIck] Failed to mount preview "${name}".`,
          error,
        );
      });

    return true;
  }

  unmount() {
    this.quickUiFacade?.unmount();
    this.quickUiFacade = null;
    this.mountPromise = null;
  }
}
