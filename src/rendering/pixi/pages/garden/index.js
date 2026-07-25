import { GardenPixiPage } from './GardenPixiPage.js';

export {
  GARDEN_PIXI_GEOMETRY,
  GardenPixiPage,
} from './GardenPixiPage.js';
export {
  GardenConfirmDialogPixi,
  GardenSeedDialogPixi,
} from './GardenDialogPixi.js';

/**
 * PageRegistry factory. Runtime dependencies are passed through unchanged so
 * the page shares the one application/router/registries owned by RenderFacade.
 */
export function createGardenPixiPage(context = {}) {
  return new GardenPixiPage(context);
}
