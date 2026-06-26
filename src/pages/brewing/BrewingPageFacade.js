import { BrewingCauldronManager } from './managers/BrewingCauldronManager.js';
import { BrewingPotionInventoryBoxManager } from './managers/BrewingPotionInventoryManager.js';
import { BrewingRecipeBookManager } from './managers/BrewingRecipeBookManager.js';
import { BrewingRecipeChoiceDialogManager } from './managers/BrewingRecipeChoiceDialogManager.js';
import { BrewingRecipeGuideManager } from './managers/BrewingRecipeGuideManager.js';
import { BrewingRoomViewManager } from './managers/BrewingRoomViewManager.js';
import { RewardFlyoutManager } from '../shared/RewardFlyoutManager.js';
import { RoomInventoryButtonManager } from '../shared/RoomInventoryButtonManager.js';

export class BrewingPageFacade {
  static explain =
    'Shows the brewing room page where herbs go into the cauldron and mana starts a brew.';

  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new BrewingRoomViewManager();
    this.flyoutManager = new RewardFlyoutManager();
    this.rewardEventsUnsubscribe = null;
    this.inventoryPanelLayer = null;
    this.activeInventoryTab = null;
    this.recipeGuideManager = new BrewingRecipeGuideManager({ gameplayFacade });
    this.recipeChoiceDialogManager = new BrewingRecipeChoiceDialogManager({
      onClearRecipe: (cauldronIndex) => this.selectRecipe(null, cauldronIndex),
      onChooseAnother: (cauldronIndex) => {
        this.recipeGuideManager.setCurrentCauldronIndex(cauldronIndex);
        this.recipeBookManager.show();
      },
    });
    this.potionInventoryManager = new BrewingPotionInventoryBoxManager({ gameplayFacade });
    this.inventoryButtonManager = new RoomInventoryButtonManager({
      className: 'brewing-page__inventory-buttons',
      onOpenInventory: (tabId) => this.toggleInventoryBox(tabId),
      buttons: [
        {
          tabId: 'herbs',
          label: 'herbs',
          icon: 'herbs',
          side: 'left',
          className: 'brewing-page__inventory-button brewing-page__inventory-button--herbs',
        },
        {
          tabId: 'potions',
          label: 'potions',
          icon: 'potions',
          side: 'right',
          className: 'brewing-page__inventory-button brewing-page__inventory-button--potions',
        },
      ],
    });
    this.cauldronManager = new BrewingCauldronManager({
      gameplayFacade,
      getSelectedRecipeKey: (cauldronIndex) =>
        this.recipeGuideManager.getSelectedRecipeKey(cauldronIndex),
      onCurrentCauldronChange: (cauldronIndex) =>
        this.recipeGuideManager.setCurrentCauldronIndex(cauldronIndex),
      onOpenSelectRecipe: (cauldronIndex) => {
        this.recipeGuideManager.setCurrentCauldronIndex(cauldronIndex);
        this.recipeBookManager.show();
      },
      onOpenRecipeChoice: (cauldronIndex) => {
        this.recipeGuideManager.setCurrentCauldronIndex(cauldronIndex);
        this.recipeChoiceDialogManager.show(cauldronIndex);
      },
      onClearSelectedRecipe: (cauldronIndex) =>
        this.selectRecipe(null, cauldronIndex),
      onSelectBrewQuantity: (quantity, cauldronIndex) =>
        this.setBrewQuantity(quantity, cauldronIndex),
      onRewardNotice: (event) => this.flyoutManager.showReward(event),
      rewardEventsAvailable: Boolean(gameplayFacade?.subscribeRewardEvents),
    });
    this.recipeBookManager = new BrewingRecipeBookManager({
      gameplayFacade,
      getSelectedRecipeKey: () =>
        this.recipeGuideManager.getSelectedRecipeKey(
          this.recipeGuideManager.getCurrentCauldronIndex(),
        ),
      getCurrentCauldronIndex: () => this.recipeGuideManager.getCurrentCauldronIndex(),
      onSelectRecipe: (recipe) =>
        this.selectRecipe(
          recipe?.key ?? null,
          this.recipeGuideManager.getCurrentCauldronIndex(),
        ),
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.cauldronManager.mount(uiLayer);
    this.mountInventoryPanelLayer(uiLayer);
    this.inventoryButtonManager.mount(uiLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) =>
        this.flyoutManager.showReward(event),
      ) ?? null;
    this.recipeBookManager.mount(uiLayer, popupLayer);
    this.recipeChoiceDialogManager.mount(popupLayer);
  }

  unmount() {
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.recipeChoiceDialogManager.unmount();
    this.recipeGuideManager.unmount();
    this.recipeBookManager.unmount();
    this.flyoutManager.unmount();
    this.inventoryButtonManager.unmount();
    this.potionInventoryManager.unmount();
    this.inventoryPanelLayer?.remove();
    this.inventoryPanelLayer = null;
    this.activeInventoryTab = null;
    this.cauldronManager.unmount();
    this.roomViewManager.unmount();
  }

  mountInventoryPanelLayer(uiLayer) {
    if (this.inventoryPanelLayer || !uiLayer) {
      return;
    }

    this.inventoryPanelLayer = document.createElement('section');
    this.inventoryPanelLayer.className = 'brewing-page__inventory-panel-layer';
    this.inventoryPanelLayer.setAttribute('aria-label', 'brewing inventory');
    uiLayer.append(this.inventoryPanelLayer);
    this.potionInventoryManager.mount(this.inventoryPanelLayer);
  }

  toggleInventoryBox(tabId) {
    this.activeInventoryTab = this.activeInventoryTab === tabId ? null : tabId;
    this.cauldronManager.setHerbsVisible(this.activeInventoryTab === 'herbs');
    this.potionInventoryManager.setVisible(this.activeInventoryTab === 'potions');
    this.inventoryButtonManager.setActiveTab(this.activeInventoryTab);
  }

  selectRecipe(recipeKey, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const autoBrewState = this.getAutoBrewState(safeCauldronIndex);

    if (!recipeKey) {
      this.recipeGuideManager.selectRecipe(null, safeCauldronIndex);
      const result = autoBrewState.autoBrewEnabled
        ? this.gameplayFacade?.setBrewingAutoBrewRecipe?.(null, safeCauldronIndex) ?? null
        : null;
      this.cauldronManager.render(this.gameplayFacade?.getSnapshot());
      return result;
    }

    this.recipeGuideManager.selectRecipe(recipeKey, safeCauldronIndex);
    const result =
      this.gameplayFacade?.prepareBrewingRecipe?.(recipeKey, safeCauldronIndex) ?? null;

    if (autoBrewState.autoBrewEnabled) {
      this.gameplayFacade?.setBrewingAutoBrewRecipe?.(recipeKey, safeCauldronIndex);
    }

    this.cauldronManager.render(this.gameplayFacade?.getSnapshot());
    return result;
  }

  getAutoBrewState(cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const snapshot = this.gameplayFacade?.getSnapshot();
    const cauldron =
      (snapshot?.brewing?.cauldrons ?? []).find(
        (candidate) => candidate.cauldronIndex === safeCauldronIndex,
      ) ?? (safeCauldronIndex === 0 ? snapshot?.brewing : null);

    return {
      autoBrewEnabled: cauldron?.autoBrewEnabled === true,
      autoBrewRecipeKey: cauldron?.autoBrewRecipeKey ?? null,
    };
  }

  setBrewQuantity(quantity, cauldronIndex = 0) {
    const safeCauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
    const result =
      this.gameplayFacade?.setBrewingBrewQuantity?.(quantity, safeCauldronIndex) ?? null;
    this.cauldronManager.render(this.gameplayFacade?.getSnapshot());
    return result;
  }

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
