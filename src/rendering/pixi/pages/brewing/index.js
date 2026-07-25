import { BrewingPixiPage } from './BrewingPixiPage.js';

export {
  BREWING_PIXI_GEOMETRY,
  BrewingPixiPage,
} from './BrewingPixiPage.js';
export {
  BrewingRecipeBookDialogPixi,
  BrewingRecipeChoiceDialogPixi,
} from './BrewingDialogsPixi.js';

/**
 * PageRegistry factory. Runtime dependencies are passed through unchanged so
 * the page shares the one application/router/registries owned by RenderFacade.
 */
export function createBrewingPixiPage(context = {}) {
  return new BrewingPixiPage(context);
}
