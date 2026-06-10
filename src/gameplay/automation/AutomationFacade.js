import { BrewingAutomationManager } from './managers/BrewingAutomationManager.js';
import { GardenAutomationManager } from './managers/GardenAutomationManager.js';

export class AutomationFacade {
  static explain =
    'Automation lets expensive research turn repeated garden and cauldron taps into rules that run each game tick.';

  constructor({
    brewingFacade,
    gardenFacade,
    gameplayLogFacade,
    onPotionRecipeDiscovery,
    researchFacade,
  } = {}) {
    this.gardenAutomationManager = new GardenAutomationManager({
      gardenFacade,
      gameplayLogFacade,
      researchFacade,
    });
    this.brewingAutomationManager = new BrewingAutomationManager({
      brewingFacade,
      onPotionRecipeDiscovery,
      researchFacade,
    });
    this.registered = false;
  }

  initialize(ecsManagers) {
    if (this.registered) {
      return;
    }

    ecsManagers.systems.register({
      update: () => this.update(),
    });
    this.registered = true;
  }

  update() {
    this.gardenAutomationManager.update();
    this.brewingAutomationManager.update();
  }
}
