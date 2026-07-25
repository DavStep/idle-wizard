import { Container, Graphics } from 'pixi.js';

import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

export const PIXI_NOTIFICATION_TONES = Object.freeze({
  red: 'red',
  orange: 'orange',
});

/**
 * Poolable 6px notification dot. Its parent and top-right anchor are data, so
 * repeated rows can reuse the same display object without rebuilding.
 */
export class PixiNotificationBadge {
  constructor() {
    this.root = new Container();
    this.root.label = 'notificationBadge';
    this.root.eventMode = 'none';
    this.dot = new Graphics();
    this.dot.label = 'notificationBadge:dot';
    this.root.addChild(this.dot);
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.key = null;
    this.model = {};
    this.parent = null;
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
    this.root.position.set(bounds.x + bounds.width, bounds.y);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redraw();
  }

  redraw() {
    const size = PIXI_UI_GEOMETRY.notificationSize;
    const color =
      this.model.tone === PIXI_NOTIFICATION_TONES.orange
        ? this.theme.notificationOrange
        : this.theme.notificationRed;
    this.dot
      .clear()
      .circle(0, 0, size / 2)
      .fill(color)
      .stroke({
        color: this.theme.surface,
        width: 1,
        alignment: 0,
      });
  }

  reset() {
    this.root.removeFromParent?.();
    this.root.visible = false;
    this.root.renderable = false;
    this.root.position.set(0, 0);
    this.key = null;
    this.model = {};
    this.parent = null;
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
        const badge = new PixiNotificationBadge();
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
