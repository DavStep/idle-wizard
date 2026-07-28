import { Container, Sprite, Texture } from 'pixi.js';

import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

export const PIXI_NOTIFICATION_TONES = Object.freeze({
  red: 'red',
  orange: 'orange',
});

/**
 * Shared notification badge sprite. Its parent and top-right bounds are data,
 * so repeated rows can reuse the same display object without rebuilding.
 */
export class PixiNotificationBadge {
  constructor({ assetManager = null } = {}) {
    this.assetManager = assetManager;
    this.root = new Container();
    this.root.label = 'notificationBadge';
    this.root.eventMode = 'none';
    this.sprite = new Sprite({
      texture: Texture.EMPTY,
      label: 'notificationBadge:sprite',
      roundPixels: true,
    });
    this.sprite.anchor.set(0.5);
    this.sprite.width = PIXI_UI_GEOMETRY.notificationSize;
    this.sprite.height = PIXI_UI_GEOMETRY.notificationSize;
    this.root.addChild(this.sprite);
    this.dot = this.sprite;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.key = null;
    this.model = {};
    this.parent = null;
    this.tone = null;
    this.root.visible = false;
    this.root.renderable = false;
  }

  bind(key, model = {}, policy = null) {
    this.key = key;
    this.model = model;
    const parent = model.parent ?? null;
    if (parent && parent !== this.parent) {
      parent.addChild?.(this.root);
      this.parent = parent;
    }
    const allowed = isBadgeAllowed(model, policy);
    this.root.visible = allowed;
    this.root.renderable = allowed;
    const bounds = resolveBadgeBounds(model);
    this.placeAtTopRight(bounds);
    this.setTone(model.tone);
    return this;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    return this;
  }

  setActive(active) {
    const visible = active === true;
    this.root.visible = visible;
    this.root.renderable = visible;
    return this;
  }

  setTone(tone) {
    const nextTone =
      tone === PIXI_NOTIFICATION_TONES.orange
        ? PIXI_NOTIFICATION_TONES.orange
        : PIXI_NOTIFICATION_TONES.red;
    if (nextTone === this.tone && this.sprite.texture !== Texture.EMPTY) {
      return this;
    }
    this.tone = nextTone;
    const textureId =
      nextTone === PIXI_NOTIFICATION_TONES.orange
        ? PIXI_ROOT_RUN_ASSETS.notificationOrange
        : PIXI_ROOT_RUN_ASSETS.notificationRed;
    this.sprite.texture =
      this.assetManager?.getTexture?.(textureId) ?? Texture.EMPTY;
    const size = PIXI_UI_GEOMETRY.notificationSize;
    this.sprite.width = size;
    this.sprite.height = size;
    return this;
  }

  placeAtTopRight(bounds = {}) {
    const size = PIXI_UI_GEOMETRY.notificationSize;
    const outset = PIXI_UI_GEOMETRY.notificationOutset;
    const x = Number(bounds.x) || 0;
    const y = Number(bounds.y) || 0;
    const width = Math.max(0, Number(bounds.width) || 0);
    this.root.position.set(
      x + width + outset - size / 2,
      y - outset + size / 2,
    );
    return this;
  }

  placeInsideTopRight(
    bounds = {},
    inset = PIXI_UI_GEOMETRY.notificationTabInset,
  ) {
    const size = PIXI_UI_GEOMETRY.notificationSize;
    const safeInset = Math.max(0, Number(inset) || 0);
    const x = Number(bounds.x) || 0;
    const y = Number(bounds.y) || 0;
    const width = Math.max(0, Number(bounds.width) || 0);
    this.root.position.set(
      x + width - safeInset - size / 2,
      y + safeInset + size / 2,
    );
    return this;
  }

  reset() {
    this.root.removeFromParent?.();
    this.root.visible = false;
    this.root.renderable = false;
    this.root.position.set(0, 0);
    this.key = null;
    this.model = {};
    this.parent = null;
    this.tone = null;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/**
 * Keyed high-water pool for persistent notification dots on retained rows,
 * tabs, and controls.
 */
export class PooledPixiNotificationBadges {
  constructor({
    assetManager = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    counters = null,
    maxIdle = 48,
  } = {}) {
    this.theme = theme;
    this.policy = null;
    this.items = [];
    this.pool = new WidgetPool({
      name: 'Pixi notification badges',
      counters,
      maxSize: maxIdle,
      create: () => {
        const badge = new PixiNotificationBadge({ assetManager });
        badge.applyTheme(this.theme);
        return badge;
      },
      reset: (badge) => badge.reset(),
      dispose: (badge) => badge.destroy(),
    });
    this.collection = new PooledCollection({
      name: 'Pixi notification badge collection',
      pool: this.pool,
      counters,
      keyOf: (item) => item.key,
      bind: (badge, item, key) => {
        badge.applyTheme(this.theme);
        badge.bind(key, item, this.policy);
      },
    });
  }

  reconcile(items) {
    this.items = [...(items ?? [])]
      .filter((item) => item?.active === true)
      .map((item, index) => ({
        ...item,
        key: item.key ?? item.semanticId ?? `notification-${index}`,
      }));
    return this.collection.reconcile(this.items);
  }

  setVisibilityPolicy(policy = null) {
    this.policy =
      policy?.active === true
        ? {
            active: true,
            allowedTutorialIds: new Set(
              (policy.allowedTutorialIds ?? []).filter(Boolean),
            ),
          }
        : null;
    return this.collection.reconcile(this.items);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    for (const badge of this.collection.getWidgets()) {
      badge.applyTheme(this.theme);
    }
  }

  clear() {
    this.items = [];
    this.collection.clear();
  }

  getStats() {
    return Object.freeze({
      pool: this.pool.getStats(),
      collection: this.collection.getStats(),
    });
  }

  destroy() {
    this.collection.destroy();
    this.pool.destroy();
  }
}

export function createPooledPixiNotificationBadges(options = {}) {
  return new PooledPixiNotificationBadges(options);
}

function isBadgeAllowed(model, policy) {
  if (model.active !== true) {
    return false;
  }
  if (model.tutorialOwned === true || !policy?.active) {
    return true;
  }
  if (policy.allowedTutorialIds.size === 0) {
    return false;
  }
  const ids = [
    model.tutorialId,
    ...(model.relatedTutorialIds ?? []),
  ].filter(Boolean);
  return ids.some((id) => policy.allowedTutorialIds.has(id));
}

function resolveBadgeBounds(model) {
  const bounds =
    typeof model.bounds === 'function'
      ? model.bounds()
      : model.bounds ?? model.parent?.getLocalBounds?.();
  return {
    x: Number(bounds?.x) || 0,
    y: Number(bounds?.y) || 0,
    width: Math.max(0, Number(bounds?.width) || 0),
    height: Math.max(0, Number(bounds?.height) || 0),
  };
}
