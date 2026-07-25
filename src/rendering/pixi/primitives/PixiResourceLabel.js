import { Container, Sprite } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiTextLabel } from './PixiTextLabel.js';

const RESOURCE_FRAMES = Object.freeze({
  coin: 'resource:coin',
  crystal: 'resource:crystal',
  emerald: 'resource:emerald',
  herb: 'herb:sageHerb',
  mana: 'resource:mana',
  ruby: 'resource:ruby',
  seed: 'seed:pack',
});

/**
 * Retained equivalent of the resource-label DOM helper. It preserves the
 * icon-mode contract without reparsing or rebuilding text nodes on updates.
 */
export class PixiResourceLabel extends Container {
  constructor({
    assetManager,
    resource = 'coin',
    amount = 0,
    fontSize = PIXI_UI_GEOMETRY.bodyFontSize,
    fontWeight = 'normal',
    includeResourceName = true,
    label = 'resourceLabel',
  } = {}) {
    super();
    this.label = label;
    this.assetManager = assetManager;
    this.resource = normalizeResource(resource);
    this.amount = String(amount ?? '');
    this.fontSize = fontSize;
    this.includeResourceName = includeResourceName;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.icon = new Sprite({
      texture: this.getTexture(this.resource),
      label: `${label}:icon`,
      roundPixels: true,
    });
    this.icon.anchor.set(0, 0.5);
    this.amountLabel = new PixiTextLabel({
      fontSize,
      fontWeight,
      color: (theme) => theme.resourceColors[this.resource] ?? theme.text,
      label: `${label}:amount`,
    });
    this.amountLabel.textObject.anchor.set(0, 0.5);
    this.addChild(this.icon, this.amountLabel);
    this.applyTheme(this.theme);
  }

  bind(_key, data = {}) {
    const resource = normalizeResource(data.resource ?? this.resource);
    if (resource !== this.resource) {
      this.resource = resource;
      this.icon.texture = this.getTexture(resource);
    }
    this.amount = String(data.amount ?? data.value ?? '');
    this.includeResourceName = data.includeResourceName ?? this.includeResourceName;
    this.visible = data.hidden !== true;
    this.renderable = this.visible;
    this.applyTheme(this.theme);
  }

  setAmount(amount) {
    this.amount = String(amount ?? '');
    this.relayout();
    return this;
  }

  setResource(resource) {
    const next = normalizeResource(resource);
    if (next !== this.resource) {
      this.resource = next;
      this.icon.texture = this.getTexture(next);
      this.applyTheme(this.theme);
    }
    return this;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.amountLabel.applyTheme(this.theme);
    this.amountLabel.setColor(
      this.theme.resourceColors[this.resource] ?? this.theme.text,
    );
    this.relayout();
  }

  relayout() {
    const iconMode = this.theme.iconMode === 'icons';
    const resourceName = this.includeResourceName ? ` ${this.resource}` : '';
    this.amountLabel.setText(
      iconMode ? this.amount : `${this.amount}${resourceName}`,
    );
    this.icon.visible = iconMode;
    this.icon.renderable = iconMode;

    if (iconMode) {
      const size = this.fontSize * 1.032;
      const bounds = this.icon.texture?.orig ?? this.icon.texture?.frame;
      const aspect =
        bounds?.width > 0 && bounds?.height > 0
          ? bounds.width / bounds.height
          : 1;
      this.icon.width = size * aspect;
      this.icon.height = size;
      this.icon.position.set(0, this.fontSize * 0.5);
      this.amountLabel.position.set(
        this.icon.width + this.fontSize * 0.14,
        this.fontSize * 0.5,
      );
    } else {
      this.amountLabel.position.set(0, this.fontSize * 0.5);
    }
  }

  get measuredWidth() {
    return this.amountLabel.measuredWidth +
      (this.icon.visible ? this.icon.width + this.fontSize * 0.14 : 0);
  }

  getTexture(resource) {
    const frame = RESOURCE_FRAMES[resource] ?? RESOURCE_FRAMES.coin;
    return this.assetManager.getAtlasTexture(frame);
  }
}

function normalizeResource(resource) {
  const normalized = String(resource ?? '').toLowerCase().replace(/s$/, '');
  return normalized === 'rubie' ? 'ruby' : normalized;
}
