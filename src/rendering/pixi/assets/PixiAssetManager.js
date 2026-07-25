import { Assets, Rectangle, Texture } from 'pixi.js';

import {
  gameAssetAtlasFrames,
} from '../../../assets/generated/game-asset-atlas.generated.js';
import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
} from './PixiProductionAssetManifest.js';

const REQUIRED_FONT_FACES = Object.freeze([
  Object.freeze({ family: 'Lilita One', weight: 400 }),
]);
const ASSET_RETRY_DELAYS_MS = Object.freeze([250, 750, 1500]);

function prepareSpineAssetLoaders() {
  return import('@esotericsoftware/spine-pixi-v8');
}

function waitForRetry(delayMs) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

export class PixiAssetManager {
  static explain =
    'Loads every production image and font before retained Pixi pages are constructed.';

  constructor({
    assets = Assets,
    TextureClass = Texture,
    RectangleClass = Rectangle,
    manifest = PIXI_PRODUCTION_ASSET_MANIFEST,
    atlasFrames = gameAssetAtlasFrames,
    fontFaceSet = globalThis.document?.fonts ?? null,
    prepareSpineLoaders = prepareSpineAssetLoaders,
    retryDelaysMs = ASSET_RETRY_DELAYS_MS,
    waitForRetry: waitForRetryFn = waitForRetry,
  } = {}) {
    this.assets = assets;
    this.TextureClass = TextureClass;
    this.RectangleClass = RectangleClass;
    this.manifest = manifest;
    this.atlasFrames = atlasFrames;
    this.fontFaceSet = fontFaceSet;
    this.prepareSpineLoaders = prepareSpineLoaders;
    this.retryDelaysMs = [...retryDelaysMs];
    this.waitForRetry = waitForRetryFn;
    this.textures = new Map();
    this.values = new Map();
    this.atlasTextures = new Map();
    this.loadPromise = null;
    this.loaded = false;
  }

  loadAll() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.performLoad().catch((error) => {
      this.loadPromise = null;
      throw error;
    });
    return this.loadPromise;
  }

  async performLoad() {
    const duplicateIds = this.findDuplicateIds();
    if (duplicateIds.length > 0) {
      throw new Error(`Duplicate Pixi asset ids: ${duplicateIds.join(', ')}`);
    }

    await this.loadFonts();
    if (this.manifest.some(({ src }) => /\.(?:atlas|skel)$/i.test(src))) {
      await this.prepareSpineLoaders();
    }

    const failures = [];
    await Promise.all(
      this.manifest.map(async (asset) => {
        try {
          const value = await this.loadAssetWithRetry(asset);
          this.values.set(asset.id, value);
          if (asset.kind === 'texture') {
            this.textures.set(asset.id, value);
          }
        } catch (error) {
          failures.push(`${asset.id}: ${String(error?.message ?? error)}`);
        }
      }),
    );

    if (failures.length > 0) {
      throw new Error(`Pixi production assets failed to load:\n${failures.join('\n')}`);
    }

    this.buildAtlasTextures();
    this.loaded = true;
    return this;
  }

  async loadAssetWithRetry(asset) {
    for (
      let attempt = 0;
      attempt <= this.retryDelaysMs.length;
      attempt += 1
    ) {
      try {
        const value = await this.assets.load(asset.src);
        if (!value) {
          throw new Error('loader returned no value');
        }
        return value;
      } catch (error) {
        if (attempt >= this.retryDelaysMs.length) {
          throw error;
        }
        await this.waitForRetry(
          this.retryDelaysMs[attempt],
        );
      }
    }
    throw new Error(`Failed to load Pixi asset: ${asset.id}`);
  }

  async loadFonts() {
    if (!this.fontFaceSet?.load) {
      throw new Error('FontFaceSet is unavailable; Pixi text cannot be validated.');
    }

    const results = await Promise.all(
      REQUIRED_FONT_FACES.map(({ family, weight }) =>
        this.fontFaceSet.load(`${weight} 13px "${family}"`, 'Idle Wizard 0123456789'),
      ),
    );
    const missing = REQUIRED_FONT_FACES.filter((font, index) => !results[index]?.length);

    if (missing.length > 0) {
      throw new Error(
        `Required Pixi fonts are missing: ${missing
          .map(({ family, weight }) => `${family} ${weight}`)
          .join(', ')}`,
      );
    }

    await this.fontFaceSet.ready;
  }

  buildAtlasTextures() {
    const atlasTexture = this.textures.get('atlas:game');
    if (!atlasTexture?.source) {
      throw new Error('The game atlas did not load as a Pixi texture.');
    }

    for (const [frameName, frame] of Object.entries(this.atlasFrames)) {
      const texture = new this.TextureClass({
        source: atlasTexture.source,
        frame: new this.RectangleClass(frame.x, frame.y, frame.width, frame.height),
        label: `atlas:${frameName}`,
      });
      this.atlasTextures.set(frameName, texture);
    }
  }

  requireLoaded() {
    if (!this.loaded) {
      throw new Error('Pixi assets must finish loading before views are constructed.');
    }
  }

  getTexture(assetId) {
    this.requireLoaded();
    const texture = this.textures.get(assetId);
    if (!texture) {
      throw new Error(`Missing Pixi texture: ${assetId}`);
    }
    return texture;
  }

  getAtlasTexture(frameName) {
    this.requireLoaded();
    const texture = this.atlasTextures.get(frameName);
    if (!texture) {
      throw new Error(`Missing Pixi atlas frame: ${frameName}`);
    }
    return texture;
  }

  get(assetId) {
    this.requireLoaded();
    if (!this.values.has(assetId)) {
      throw new Error(`Missing Pixi asset: ${assetId}`);
    }
    return this.values.get(assetId);
  }

  has(assetId) {
    return this.values.has(assetId);
  }

  findDuplicateIds() {
    const seen = new Set();
    const duplicates = new Set();
    for (const asset of this.manifest) {
      if (seen.has(asset.id)) {
        duplicates.add(asset.id);
      }
      seen.add(asset.id);
    }
    return [...duplicates];
  }

  destroy() {
    for (const texture of this.atlasTextures.values()) {
      texture.destroy?.(false);
    }
    this.atlasTextures.clear();
    this.textures.clear();
    this.values.clear();
    this.loaded = false;
    this.loadPromise = null;
  }
}
