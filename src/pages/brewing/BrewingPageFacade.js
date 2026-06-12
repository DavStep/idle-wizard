import { BrewingCauldronManager } from './managers/BrewingCauldronManager.js';
import { BrewingPotionInventoryManager } from './managers/BrewingPotionInventoryManager.js';
import { BrewingRecipeBookManager } from './managers/BrewingRecipeBookManager.js';
import { BrewingRecipeGuideManager } from './managers/BrewingRecipeGuideManager.js';
import { BrewingRoomViewManager } from './managers/BrewingRoomViewManager.js';

export class BrewingPageFacade {
  static explain =
    'Shows the brewing room page where herbs go into the cauldron and mana starts a brew.';

  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new BrewingRoomViewManager();
    this.recipeGuideManager = new BrewingRecipeGuideManager({ gameplayFacade });
    this.cauldronManager = new BrewingCauldronManager({
      gameplayFacade,
      getSelectedRecipeKey: () => this.recipeGuideManager.getSelectedRecipeKey(),
      onOpenSelectRecipe: () => this.recipeBookManager.show(),
    });
    this.recipeBookManager = new BrewingRecipeBookManager({
      gameplayFacade,
      getSelectedRecipeKey: () => this.recipeGuideManager.getSelectedRecipeKey(),
      onSelectRecipe: (recipe) => this.selectRecipe(recipe?.key),
    });
    this.potionInventoryManager = new BrewingPotionInventoryManager({ gameplayFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.cauldronManager.mount(uiLayer);
    this.recipeBookManager.mount(uiLayer, popupLayer);
    this.potionInventoryManager.mount(uiLayer, popupLayer);
  }

  unmount() {
    this.recipeGuideManager.unmount();
    this.potionInventoryManager.unmount();
    this.recipeBookManager.unmount();
    this.cauldronManager.unmount();
    this.roomViewManager.unmount();
  }

  selectRecipe(recipeKey) {
    if (!recipeKey) {
      return null;
    }

    this.recipeGuideManager.selectRecipe(recipeKey);
    const result = this.gameplayFacade?.prepareBrewingRecipe?.(recipeKey) ?? null;
    const snapshot = this.gameplayFacade?.getSnapshot();

    if (snapshot?.brewing?.autoBrewEnabled === true) {
      this.gameplayFacade?.setBrewingAutoBrewRecipe?.(recipeKey);
    }

    this.cauldronManager.render(this.gameplayFacade?.getSnapshot());
    return result;
  }
}
