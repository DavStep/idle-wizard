function defaultRuntimeImporter() {
  return import('@esotericsoftware/spine-pixi-v8');
}

function defaultPixiImporter() {
  return import('pixi.js');
}

export class SpineAssetManager {
  constructor({
    importRuntime = defaultRuntimeImporter,
    importPixi = defaultPixiImporter,
  } = {}) {
    this.importRuntime = importRuntime;
    this.importPixi = importPixi;
    this.runtimePromise = null;
    this.assetsPromise = null;
    this.assetSources = new Map();
  }

  async loadSkeleton({
    key,
    skeletonAlias,
    skeletonSrc,
    atlasAlias,
    atlasSrc,
  } = {}) {
    this.assertAssetInput({ skeletonSrc, atlasSrc });
    const aliases = this.resolveAliases({ key, skeletonAlias, atlasAlias });

    await this.loadRuntime();
    const Assets = await this.loadAssets();
    this.registerAsset(Assets, aliases.skeletonAlias, skeletonSrc);
    this.registerAsset(Assets, aliases.atlasAlias, atlasSrc);
    await Assets.load([aliases.skeletonAlias, aliases.atlasAlias]);

    return aliases;
  }

  async createSkeleton({
    key,
    skeletonAlias,
    atlasAlias,
    ...spineOptions
  } = {}) {
    const aliases = this.resolveAliases({ key, skeletonAlias, atlasAlias });
    const { Spine } = await this.loadRuntime();

    return new Spine({
      skeleton: aliases.skeletonAlias,
      atlas: aliases.atlasAlias,
      ...spineOptions,
    });
  }

  resolveAliases({ key, skeletonAlias, atlasAlias } = {}) {
    const resolvedSkeletonAlias = skeletonAlias ?? (key ? `${key}:skeleton` : null);
    const resolvedAtlasAlias = atlasAlias ?? (key ? `${key}:atlas` : null);

    if (!resolvedSkeletonAlias || !resolvedAtlasAlias) {
      throw new Error('Spine skeletons require a key or explicit skeleton/atlas aliases.');
    }

    return {
      skeletonAlias: resolvedSkeletonAlias,
      atlasAlias: resolvedAtlasAlias,
    };
  }

  assertAssetInput({ skeletonSrc, atlasSrc }) {
    if (!skeletonSrc || !atlasSrc) {
      throw new Error('Spine skeletons require skeletonSrc and atlasSrc.');
    }
  }

  registerAsset(Assets, alias, src) {
    const previousSrc = this.assetSources.get(alias);
    if (previousSrc === src) {
      return;
    }

    if (previousSrc) {
      throw new Error(`Spine asset alias "${alias}" is already registered with another source.`);
    }

    Assets.add({ alias, src });
    this.assetSources.set(alias, src);
  }

  async loadRuntime() {
    if (!this.runtimePromise) {
      this.runtimePromise = this.importRuntime();
    }

    return this.runtimePromise;
  }

  async loadAssets() {
    if (!this.assetsPromise) {
      this.assetsPromise = this.importPixi().then(({ Assets }) => {
        if (!Assets) {
          throw new Error('Pixi Assets API is required for Spine assets.');
        }

        return Assets;
      });
    }

    return this.assetsPromise;
  }
}
