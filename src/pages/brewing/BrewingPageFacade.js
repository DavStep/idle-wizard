import { BrewingCauldronManager } from './managers/BrewingCauldronManager.js';
import { BrewingPotionInventoryManager } from './managers/BrewingPotionInventoryManager.js';
import { BrewingRecipeBookManager } from './managers/BrewingRecipeBookManager.js';
import { BrewingRecipeGuideManager } from './managers/BrewingRecipeGuideManager.js';
import { BrewingRoomViewManager } from './managers/BrewingRoomViewManager.js';
import { RewardFlyoutManager } from '../shared/RewardFlyoutManager.js';

export class BrewingPageFacade {
  static explain =
    'Shows the brewing room page where herbs go into the cauldron and mana starts a brew.';

  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new BrewingRoomViewManager();
    this.flyoutManager = new RewardFlyoutManager();
    this.rewardEventsUnsubscribe = null;
    this.recipeGuideManager = new BrewingRecipeGuideManager({ gameplayFacade });
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
      onRewardNotice: (event) => this.flyoutManager.showReward(event),
      rewardEventsAvailable: Boolean(gameplayFacade?.subscribeRewardEvents),
    });
    this.recipeBookManager = new BrewingRecipeBookManager({
      gameplayFacade,
      getSelectedRecipeKey: () =>
        this.recipeGuideManager.getSelectedRecipeKey(
          this.recipeGuideManager.getCurrentCauldronIndex(),
        ),
      onSelectRecipe: (recipe) =>
        this.selectRecipe(
          recipe?.key ?? null,
          this.recipeGuideManager.getCurrentCauldronIndex(),
        ),
    });
    this.potionInventoryManager = new BrewingPotionInventoryManager({ gameplayFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.cauldronManager.mount(uiLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) =>
        this.flyoutManager.showReward(event),
      ) ?? null;
    this.recipeBookManager.mount(uiLayer, popupLayer);
    this.potionInventoryManager.mount(uiLayer, popupLayer);
  }

  unmount() {
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.recipeGuideManager.unmount();
    this.potionInventoryManager.unmount();
    this.recipeBookManager.unmount();
    this.flyoutManager.unmount();
    this.cauldronManager.unmount();
    this.roomViewManager.unmount();
  }

  selectRecipe(recipeKey, cauldronIndex = 0) {
    if (!recipeKey) {
      this.recipeGuideManager.selectRecipe(null, cauldronIndex);
      const result = this.gameplayFacade?.setBrewingAutoBrewRecipe?.(null) ?? null;
      this.cauldronManager.render(this.gameplayFacade?.getSnapshot());
      return result;
    }

    this.recipeGuideManager.selectRecipe(recipeKey, cauldronIndex);
    const result =
      this.gameplayFacade?.prepareBrewingRecipe?.(recipeKey, cauldronIndex) ?? null;
    const snapshot = this.gameplayFacade?.getSnapshot();

    if (snapshot?.brewing?.autoBrewEnabled === true) {
      this.gameplayFacade?.setBrewingAutoBrewRecipe?.(recipeKey);
    }

    this.cauldronManager.render(this.gameplayFacade?.getSnapshot());
    return result;
  }
}
