import { PixiBaseButton } from './PixiBaseButton.js';
import { PixiTextLabel } from './PixiTextLabel.js';

/**
 * Shared text button composed from the stateful base button plus one label.
 */
export class PixiTextButton extends PixiBaseButton {
  constructor({ text = '', label = 'text-button', ...options } = {}) {
    super({ ...options, label });
    this.textLabel = new PixiTextLabel({
      text,
      anchor: { x: 0.5, y: 0.5 },
      label: `${label}:label`,
    });
    this.visual.addChildAt(this.textLabel, 2);
    this.textLabel.applyTheme(this.theme);
    this.layoutContent();
    this.syncAppearance();
  }

  bind(key, data = {}, actions = null) {
    this.setText(data.label ?? data.text ?? '');
    super.bind(key, data, actions);
  }

  setText(text) {
    this.textLabel.setText(text);
    return this;
  }

  applyTheme(theme) {
    this.textLabel?.applyTheme(theme ?? this.theme);
    super.applyTheme(theme);
  }

  syncContentAppearance(visualGeometry) {
    if (!this.textLabel) {
      return;
    }
    if (visualGeometry) {
      this.textLabel.setFontFamily('"Lilita One", "Arial Black", Arial, sans-serif');
      if (Number.isFinite(visualGeometry.fontSize)) {
        this.textLabel.setFontSize(visualGeometry.fontSize);
      }
      this.textLabel.setStroke({
        color: '#0a0a0a',
        width: visualGeometry.textStroke,
      });
      this.textLabel.setColor(visualGeometry.textColor);
    } else {
      this.textLabel.setFontFamily(null);
      this.textLabel.setStroke(null);
      this.textLabel.setColor(this.enabled ? 'text' : 'disabled');
    }
  }

  layoutContent() {
    this.textLabel?.position.set(this.buttonWidth / 2, this.buttonHeight / 2);
  }
}
