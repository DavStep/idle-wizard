import { BrewingCauldronManager } from './managers/BrewingCauldronManager.js';
import { BrewingPageNameManager } from './managers/BrewingPageNameManager.js';
import { BrewingPageNavigationManager } from './managers/BrewingPageNavigationManager.js';
import { BrewingPotionInventoryManager } from './managers/BrewingPotionInventoryManager.js';
import { BrewingRecipeBookManager } from './managers/BrewingRecipeBookManager.js';
import { BrewingRecipeGuideManager } from './managers/BrewingRecipeGuideManager.js';
import { BrewingRoomViewManager } from './managers/BrewingRoomViewManager.js';

export class BrewingPageFacade {
  static explain =
    'Shows the brewing room page where herbs go into the cauldron and mana starts a brew.';

  constructor({ gameplayFacade, onShowGarden } = {}) {
    this.roomViewManager = new BrewingRoomViewManager();
    this.cauldronManager = new BrewingCauldronManager({ gameplayFacade });
    this.recipeGuideManager = new BrewingRecipeGuideManager({ gameplayFacade });
    this.potionInventoryManager = new BrewingPotionInventoryManager({ gameplayFacade });
    this.recipeBookManager = new BrewingRecipeBookManager({
      gameplayFacade,
      getSelectedRecipeKey: () => this.recipeGuideManager.getSelectedRecipeKey(),
      onSelectRecipe: (recipe) => this.recipeGuideManager.selectRecipe(recipe.key),
    });
    this.navigationManager = new BrewingPageNavigationManager({
      onShowGarden,
    });
    this.pageNameManager = new BrewingPageNameManager();
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    this.cauldronManager.mount(uiLayer);
    this.recipeBookManager.mount(uiLayer);
    this.potionInventoryManager.mount(uiLayer);
    this.recipeGuideManager.mount(uiLayer);
    this.navigationManager.mount(uiLayer);
    this.pageNameManager.mount(uiLayer);
  }

  unmount() {
    this.pageNameManager.unmount();
    this.navigationManager.unmount();
    this.recipeGuideManager.unmount();
    this.potionInventoryManager.unmount();
    this.recipeBookManager.unmount();
    this.cauldronManager.unmount();
    this.roomViewManager.unmount();
  }
}
