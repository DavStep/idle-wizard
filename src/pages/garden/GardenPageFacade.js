import { GardenHerbInventoryManager } from './managers/GardenHerbInventoryManager.js';
import { GardenPlotManager } from './managers/GardenPlotManager.js';
import { GardenRoomViewManager } from './managers/GardenRoomViewManager.js';

export class GardenPageFacade {
  static explain =
    'Shows the garden room page, a quiet place between brewing and the workshop for later plant work.';

  constructor({ gameplayFacade } = {}) {
    this.roomViewManager = new GardenRoomViewManager();
    this.plotManager = new GardenPlotManager({ gameplayFacade });
    this.herbInventoryManager = new GardenHerbInventoryManager({ gameplayFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    this.plotManager.mount(uiLayer);
    this.herbInventoryManager.mount(uiLayer);
  }

  unmount() {
    this.herbInventoryManager.unmount();
    this.plotManager.unmount();
    this.roomViewManager.unmount();
  }
}
