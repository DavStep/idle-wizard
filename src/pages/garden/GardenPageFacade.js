import { GardenPageNameManager } from './managers/GardenPageNameManager.js';
import { GardenPageNavigationManager } from './managers/GardenPageNavigationManager.js';
import { GardenHerbInventoryManager } from './managers/GardenHerbInventoryManager.js';
import { GardenPlotManager } from './managers/GardenPlotManager.js';
import { GardenRoomViewManager } from './managers/GardenRoomViewManager.js';

export class GardenPageFacade {
  static explain =
    'Shows the garden room page, a quiet place between brewing and the workshop for later plant work.';

  constructor({ gameplayFacade, onShowBrewing, onShowWorkshop } = {}) {
    this.roomViewManager = new GardenRoomViewManager();
    this.plotManager = new GardenPlotManager({ gameplayFacade });
    this.herbInventoryManager = new GardenHerbInventoryManager({ gameplayFacade });
    this.navigationManager = new GardenPageNavigationManager({
      onShowBrewing,
      onShowWorkshop,
    });
    this.pageNameManager = new GardenPageNameManager();
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    this.plotManager.mount(uiLayer);
    this.herbInventoryManager.mount(uiLayer);
    this.navigationManager.mount(uiLayer);
    this.pageNameManager.mount(uiLayer);
  }

  unmount() {
    this.pageNameManager.unmount();
    this.navigationManager.unmount();
    this.herbInventoryManager.unmount();
    this.plotManager.unmount();
    this.roomViewManager.unmount();
  }
}
