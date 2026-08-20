import { Container, Sprite, Texture } from 'pixi.js';

import {
  getTradeAllianceBannerColor,
  getTradeAllianceEmblemColor,
  normalizeTradeAllianceBannerColor,
  normalizeTradeAllianceEmblemColor,
} from '../../../shared/tradeAllianceBannerColors.js';
import {
  getTradeAllianceEmblem,
  normalizeTradeAllianceEmblem,
} from '../../../shared/tradeAllianceEmblems.js';

export const ALLIANCE_FLAG_ASSETS = Object.freeze({
  base: 'source:assets/icons/icon-alliance-banner-base.png',
  cloth: 'source:assets/icons/icon-alliance-banner-cloth-mask.png',
  emblem: 'source:assets/icons/icon-alliance-banner-emblem.png',
});

export const ALLIANCE_FLAG_GEOMETRY = Object.freeze({
  sourceWidth: 128,
  sourceHeight: 128,
  emblemSize: 61.6,
  emblemY: 60,
});

/**
 * Shared alliance identity flag. The gold rod and dark contour stay fixed while
 * persisted alliance colors tint the single-tail cloth and simple emblem.
 */
export class AllianceFlagWidget extends Container {
  constructor({
    assetManager = null,
    bannerColor,
    emblemColor,
    emblemId,
    label = 'alliance-flag',
  } = {}) {
    super({ label });
    this.assetManager = assetManager;
    this.base = this.createLayer(ALLIANCE_FLAG_ASSETS.base, `${label}:base`);
    this.cloth = this.createLayer(ALLIANCE_FLAG_ASSETS.cloth, `${label}:cloth`);
    this.emblem = this.createLayer(ALLIANCE_FLAG_ASSETS.emblem, `${label}:emblem`);
    this.addChild(this.base, this.cloth, this.emblem);
    this.setColors({ bannerColor, emblemColor, emblemId });
    this.setSize(
      ALLIANCE_FLAG_GEOMETRY.sourceWidth,
      ALLIANCE_FLAG_GEOMETRY.sourceHeight,
    );
  }

  createLayer(assetId, label) {
    const layer = new Sprite({
      texture: this.assetManager?.getTexture?.(assetId) ?? Texture.EMPTY,
      anchor: 0.5,
      label,
      roundPixels: true,
    });
    layer.visible = layer.texture !== Texture.EMPTY;
    layer.renderable = layer.visible;
    return layer;
  }

  setColors({ bannerColor, emblemColor, emblemId } = {}) {
    this.bannerColor = normalizeTradeAllianceBannerColor(bannerColor);
    this.emblemColor = normalizeTradeAllianceEmblemColor(emblemColor);
    this.cloth.tint = getTradeAllianceBannerColor(this.bannerColor).value;
    this.emblem.tint = getTradeAllianceEmblemColor(this.emblemColor).value;
    this.setEmblem(emblemId ?? this.emblemId);
    return this;
  }

  setEmblem(emblemId) {
    this.emblemId = normalizeTradeAllianceEmblem(emblemId);
    const emblem = getTradeAllianceEmblem(this.emblemId);
    this.emblem.texture =
      this.assetManager?.getTexture?.(emblem.assetId) ?? Texture.EMPTY;
    this.emblem.visible = this.emblem.texture !== Texture.EMPTY;
    this.emblem.renderable = this.emblem.visible;
    return this;
  }

  setSize(width, height) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const sourceWidth = ALLIANCE_FLAG_GEOMETRY.sourceWidth;
    const sourceHeight = ALLIANCE_FLAG_GEOMETRY.sourceHeight;
    const scale = Math.min(safeWidth / sourceWidth, safeHeight / sourceHeight);
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;
    for (const layer of [this.base, this.cloth]) {
      layer.position.set(renderedWidth / 2, renderedHeight / 2);
      layer.width = renderedWidth;
      layer.height = renderedHeight;
    }
    const emblemSize = ALLIANCE_FLAG_GEOMETRY.emblemSize * scale;
    this.emblem.position.set(
      renderedWidth / 2,
      ALLIANCE_FLAG_GEOMETRY.emblemY * scale,
    );
    this.emblem.width = emblemSize;
    this.emblem.height = emblemSize;
    this.flagWidth = renderedWidth;
    this.flagHeight = renderedHeight;
    return this;
  }
}
