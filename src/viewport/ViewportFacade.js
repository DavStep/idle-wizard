import { ViewportManager } from './managers/ViewportManager.js';
import { ViewportScaleManager } from './managers/ViewportScaleManager.js';
import { gameViewport } from './gameViewport.js';

export class ViewportFacade {
  static explain =
    'Uses Root Run’s 390x844 game surface, then contain-fits that surface to each device.';

  constructor({ viewport = gameViewport } = {}) {
    this.viewport = viewport;
    this.viewportManager = new ViewportManager({ viewport });
    this.scaleManager = new ViewportScaleManager({ viewport });
  }

  mount(parent) {
    const stage = this.viewportManager.mount(parent);
    this.scaleManager.watch(stage);
    return stage;
  }

  unmount() {
    this.scaleManager.unwatch();
    this.viewportManager.unmount();
  }

  getStageElement() {
    return this.viewportManager.getStageElement();
  }
}
