import { SpineAssetManager } from './managers/SpineAssetManager.js';

export class SpineRuntimeFacade {
  static explain =
    'Loads exported Spine skeletons into Pixi render layers so animated characters can exist without leaking runtime details.';

  constructor({
    assetManager = new SpineAssetManager(),
    whenPixiReady = async () => null,
    getLayers = () => null,
  } = {}) {
    this.assetManager = assetManager;
    this.whenPixiReady = whenPixiReady;
    this.getLayers = getLayers;
  }

  loadSkeleton(definition) {
    return this.assetManager.loadSkeleton(definition);
  }

  async createSkeleton({
    layer = 'ui',
    position = null,
    scale = null,
    animationName = null,
    loop = true,
    trackIndex = 0,
    ...assetOptions
  } = {}) {
    const readyLayers = await this.whenPixiReady();
    const spine = await this.assetManager.createSkeleton(assetOptions);

    this.applyPosition(spine, position);
    this.applyScale(spine, scale);
    this.playAnimation(spine, { animationName, loop, trackIndex });

    if (layer) {
      this.resolveLayer(layer, readyLayers).addChild(spine);
    }

    return spine;
  }

  resolveLayer(layerName, readyLayers = null) {
    const layers = this.getLayers() ?? readyLayers;
    const layer = layers?.[layerName];

    if (!layer || typeof layer.addChild !== 'function') {
      throw new Error(`Spine render layer "${layerName}" is not available.`);
    }

    return layer;
  }

  applyPosition(spine, position) {
    if (!position) {
      return;
    }

    spine.position?.set?.(position.x ?? 0, position.y ?? 0);
  }

  applyScale(spine, scale) {
    if (scale === null || scale === undefined) {
      return;
    }

    if (typeof scale === 'number') {
      spine.scale?.set?.(scale);
      return;
    }

    spine.scale?.set?.(scale.x ?? 1, scale.y ?? scale.x ?? 1);
  }

  playAnimation(spine, { animationName, loop, trackIndex }) {
    if (!animationName) {
      return;
    }

    const setAnimation = spine.state?.setAnimation;
    if (typeof setAnimation !== 'function') {
      throw new Error('Spine animation state is not available.');
    }

    setAnimation.call(spine.state, trackIndex, animationName, loop);
  }
}
