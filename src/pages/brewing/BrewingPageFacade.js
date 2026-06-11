import { BrewingAutoBrewManager } from './managers/BrewingAutoBrewManager.js';
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
    this.autoBrewManager = new BrewingAutoBrewManager({ gameplayFacade });
    this.recipeGuideManager = new BrewingRecipeGuideManager({ gameplayFacade });
    this.cauldronManager = new BrewingCauldronManager({
      gameplayFacade,
      getSelectedRecipeKey: () => this.recipeGuideManager.getSelectedRecipeKey(),
      onOpenAutoBrew: () => this.autoBrewManager.show(),
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
    this.autoBrewManager.mount(popupLayer);
    this.recipeBookManager.mount(uiLayer, popupLayer);
    this.potionInventoryManager.mount(uiLayer, popupLayer);
  }

  unmount() {
    this.recipeGuideManager.unmount();
    this.potionInventoryManager.unmount();
    this.recipeBookManager.unmount();
    this.autoBrewManager.unmount();
    this.cauldronManager.unmount();
    this.roomViewManager.unmount();
  }

  selectRecipe(recipeKey) {
    this.recipeGuideManager.selectRecipe(recipeKey);
    this.cauldronManager.render(this.gameplayFacade?.getSnapshot());
  }
}
