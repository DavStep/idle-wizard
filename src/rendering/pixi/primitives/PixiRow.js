import { Container } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiTextLabel } from './PixiTextLabel.js';

export class PixiRow extends Container {
  constructor({
    width = 280,
    height = PIXI_UI_GEOMETRY.rowMinHeight,
    gap = PIXI_UI_GEOMETRY.rowColumnGap,
    keyText = '',
    valueText = '',
    label = 'row',
  } = {}) {
    super();
    this.label = label;
    this.rowWidth = width;
    this.rowHeight = height;
    this.gap = gap;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.keyLabel = new PixiTextLabel({
      text: keyText,
      label: `${label}:key`,
    });
    this.valueLabel = new PixiTextLabel({
      text: valueText,
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.addChild(this.keyLabel, this.valueLabel);
    this.relayout();
  }

  bind(_key, data = {}) {
    this.keyLabel.setText(data.label ?? data.keyText ?? '');
    this.valueLabel.setText(data.value ?? data.valueText ?? '');
    this.setDisabled(Boolean(data.disabled || data.locked || data.empty || data.unknown));
    this.visible = data.hidden !== true;
  }

  reset() {
    this.keyLabel.setText('');
    this.valueLabel.setText('');
    this.visible = false;
    this.eventMode = 'none';
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.keyLabel.applyTheme(this.theme);
    this.valueLabel.applyTheme(this.theme);
  }

  setSize(width, height = this.rowHeight) {
    this.rowWidth = Math.max(0, Number(width) || 0);
    this.rowHeight = Math.max(0, Number(height) || 0);
    this.relayout();
    return this;
  }

  setDisabled(disabled) {
    const color = disabled ? 'disabled' : 'text';
    this.keyLabel.setColor(color);
    this.valueLabel.setColor(color);
    return this;
  }

  relayout() {
    const y = Math.max(0, (this.rowHeight - PIXI_UI_GEOMETRY.bodyFontSize) / 2 - 1);
    this.keyLabel.position.set(0, y);
    this.valueLabel.position.set(this.rowWidth, y);
    this.keyLabel.setWrapWidth(
      Math.max(0, this.rowWidth - this.valueLabel.measuredWidth - this.gap),
    );
  }
}
