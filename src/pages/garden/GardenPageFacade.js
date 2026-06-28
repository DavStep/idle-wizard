import { GardenPlotManager } from './managers/GardenPlotManager.js';
import {
  GardenHerbInventoryManager,
  GardenSeedInventoryManager,
} from './managers/GardenHerbInventoryManager.js';
import { GardenRoomViewManager } from './managers/GardenRoomViewManager.js';
import { RewardFlyoutManager } from '../shared/RewardFlyoutManager.js';
import { RoomInventoryButtonManager } from '../shared/RoomInventoryButtonManager.js';

export class GardenPageFacade {
  static explain =
    'Shows the garden room page: a plot world for growing herbs, seed choices, and harvest feedback.';

  constructor({
    gameplayFacade,
    pixiProgressOverlayManager = null,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new GardenRoomViewManager();
    this.flyoutManager = new RewardFlyoutManager();
    this.rewardEventsUnsubscribe = null;
    this.inventoryPanelLayer = null;
    this.activeInventoryTab = null;
    this.herbInventoryManager = new GardenHerbInventoryManager({ gameplayFacade });
    this.plotManager = new GardenPlotManager({
      gameplayFacade,
      pixiProgressOverlayManager,
    });
    this.seedInventoryManager = new GardenSeedInventoryManager({
      gameplayFacade,
      onSeedDragStart: (event, seed) =>
        this.plotManager.onInventorySeedPointerDown(event, seed),
    });
    this.inventoryButtonManager = new RoomInventoryButtonManager({
      className: 'garden-page__inventory-buttons',
      onOpenInventory: (tabId) => this.toggleInventoryBox(tabId),
      buttons: [
        {
          tabId: 'herbs',
          label: 'herbs',
          icon: 'herbs',
          side: 'left',
          className: 'garden-page__inventory-button garden-page__inventory-button--herbs',
        },
        {
          tabId: 'seeds',
          label: 'seeds',
          icon: 'seeds',
          side: 'right',
          className: 'garden-page__inventory-button garden-page__inventory-button--seeds',
        },
      ],
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.mountInventoryPanelLayer(uiLayer);
    this.inventoryButtonManager.mount(uiLayer);
    this.plotManager.mount(uiLayer, popupLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) =>
        this.flyoutManager.showReward(event),
      ) ?? null;
  }

  unmount() {
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.flyoutManager.unmount();
    this.plotManager.unmount();
    this.inventoryButtonManager.unmount();
    this.herbInventoryManager.unmount();
    this.seedInventoryManager.unmount();
    this.inventoryPanelLayer?.remove();
    this.inventoryPanelLayer = null;
    this.activeInventoryTab = null;
    this.roomViewManager.unmount();
  }

  mountInventoryPanelLayer(uiLayer) {
    if (this.inventoryPanelLayer || !uiLayer) {
      return;
    }

    this.inventoryPanelLayer = document.createElement('section');
    this.inventoryPanelLayer.className = 'garden-page__inventory-panel-layer';
    this.inventoryPanelLayer.setAttribute('aria-label', 'garden inventory');
    uiLayer.append(this.inventoryPanelLayer);
    this.herbInventoryManager.mount(this.inventoryPanelLayer);
    this.seedInventoryManager.mount(this.inventoryPanelLayer);
  }

  toggleInventoryBox(tabId) {
    this.activeInventoryTab = this.activeInventoryTab === tabId ? null : tabId;
    this.herbInventoryManager.setVisible(this.activeInventoryTab === 'herbs');
    this.seedInventoryManager.setVisible(this.activeInventoryTab === 'seeds');
    this.inventoryButtonManager.setActiveTab(this.activeInventoryTab);
  }
}
