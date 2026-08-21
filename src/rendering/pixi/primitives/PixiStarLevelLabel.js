import { Container, Sprite, Texture } from 'pixi.js';

import {
  STARS_PER_TONE,
  normalizeStarSlotCount,
  resolveStarLevel,
} from '../../../shared/starLevel.js';
import { PIXI_ROOT_RUN_ASSETS } from '../theme/PixiThemeTokens.js';

const TONE_ASSETS = Object.freeze({
  yellow: PIXI_ROOT_RUN_ASSETS.starYellow,
  orange: PIXI_ROOT_RUN_ASSETS.starOrange,
  red: PIXI_ROOT_RUN_ASSETS.starRed,
  purple: PIXI_ROOT_RUN_ASSETS.starPurple,
  blue: PIXI_ROOT_RUN_ASSETS.starBlue,
  green: PIXI_ROOT_RUN_ASSETS.starGreen,
  silver: PIXI_ROOT_RUN_ASSETS.starSilver,
});

/**
 * Retained three-slot star rank. All six sprites are built once and rebound.
 */
export class PixiStarLevelLabel extends Container {
  constructor({
    assetManager,
    level = 0,
    slotCount = STARS_PER_TONE,
    size = 12,
    gap = 1,
    label = 'starLevel',
  } = {}) {
    super({ label });
    this.assetManager = assetManager;
    this.level = 0;
    this.slotCount = normalizeStarSlotCount(slotCount);
    this.starSize = size;
    this.gap = gap;
    this.slots = Array.from({ length: STARS_PER_TONE }, (_, index) =>
      this.createSlot(index),
    );
    this.addChild(...this.slots.map((slot) => slot.root));
    this.setLevel(level);
    this.relayout();
  }

  createSlot(index) {
    const root = new Container({ label: `${this.label}:slot:${index + 1}` });
    const empty = new Sprite({
      texture: this.resolveTexture(PIXI_ROOT_RUN_ASSETS.starEmpty),
      label: `${this.label}:slot:${index + 1}:empty`,
      roundPixels: true,
    });
    const fill = new Sprite({
      texture: Texture.EMPTY,
      label: `${this.label}:slot:${index + 1}:fill`,
      roundPixels: true,
    });
    root.addChild(empty, fill);
    return { root, empty, fill };
  }

  bind(_key, data = {}) {
    this.setLevel(data.level ?? data.starLevel ?? 0, {
      slotCount: data.slotCount ?? this.slotCount,
    });
    this.visible = data.hidden !== true;
    this.renderable = this.visible;
  }

  setLevel(level, { slotCount = this.slotCount } = {}) {
    this.setSlotCount(slotCount);
    const starLevel = resolveStarLevel(level, { slotCount: this.slotCount });
    const texture = starLevel.tone !== 'empty'
      ? this.resolveTexture(TONE_ASSETS[starLevel.tone])
      : Texture.EMPTY;

    this.level = starLevel.level;
    this.tone = starLevel.tone;
    this.starCount = starLevel.starCount;
    this.slots.forEach((slot, index) => {
      slot.fill.texture = texture;
      slot.fill.visible = index < starLevel.starCount;
      slot.fill.renderable = slot.fill.visible;
    });
    return this;
  }

  setSlotCount(slotCount) {
    this.slotCount = normalizeStarSlotCount(slotCount);
    this.slots.forEach((slot, index) => {
      slot.root.visible = index < this.slotCount;
      slot.root.renderable = slot.root.visible;
    });
    this.relayout();
    return this;
  }

  setSize(size, gap = this.gap) {
    this.starSize = Math.max(0, Number(size) || 0);
    this.gap = Math.max(0, Number(gap) || 0);
    this.relayout();
    return this;
  }

  relayout() {
    this.slots.forEach((slot, index) => {
      slot.root.position.set(index * (this.starSize + this.gap), 0);
      slot.empty.width = this.starSize;
      slot.empty.height = this.starSize;
      slot.fill.width = this.starSize;
      slot.fill.height = this.starSize;
    });
  }

  reset() {
    this.setLevel(0);
    this.visible = false;
    this.renderable = false;
  }

  get measuredWidth() {
    return this.slotCount * this.starSize +
      (this.slotCount - 1) * this.gap;
  }

  get accessibleLabel() {
    return this.level > 0
      ? `${this.tone} star ${this.starCount}`
      : '0 stars';
  }

  resolveTexture(assetId) {
    return this.assetManager?.has?.(assetId)
      ? this.assetManager.getTexture(assetId)
      : Texture.EMPTY;
  }
}
