import { gameViewport } from '../../viewport/gameViewport.js';
import { QuickUiScreenManager } from './managers/QuickUiScreenManager.js';

export class QuickUiFacade {
  static explain =
    'Loads Figma-authored qUIck screens into Pixi so their layout, buttons, and stretchable frames render exactly as exported.';

  constructor({
    whenPixiReady,
    getCanvas,
    manager = null,
  } = {}) {
    this.manager =
      manager ??
      new QuickUiScreenManager({
        whenPixiReady,
        getCanvas,
        viewport: gameViewport,
      });
  }

  createScreen(name, options) {
    return this.manager.createScreen(name, options);
  }

  mountPreview(name, options) {
    return this.manager.mountPreview(name, options);
  }

  mountScreen(screen, targetLayer) {
    return this.manager.mountScreen(screen, targetLayer);
  }

  unmountScreen(screen, options) {
    this.manager.unmountScreen(screen, options);
  }

  unmount() {
    this.manager.unmount();
  }
}
