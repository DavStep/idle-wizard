import {
  Container,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiTextButton } from './PixiTextButton.js';
import { PixiNineSliceFrame } from './PixiNineSliceFrame.js';
import {
  RootRunSettingsSliderPixi,
  RootRunSettingsTogglePixi,
} from './PixiSettingsControls.js';
import { PixiTextLabel } from './PixiTextLabel.js';

export const ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT = 50;
const DEVICE_PANEL_PADDING_X = 10;
const DEVICE_PANEL_PADDING_Y = 10;
const DEVICE_PREFERENCE_ICON_WIDTH = 36;
const DEVICE_PREFERENCE_LABEL_X = 50;
const DEVICE_PREFERENCE_SLIDER_X = 118;
const DEVICE_PREFERENCE_LABEL_COLOR = '#735036';
const DEVICE_PREFERENCE_LABEL_FONT_SIZE = 19;
const DEVICE_IDENTITY_COLOR = '#8a684c';
const DEVICE_IDENTITY_ROW_GAP = 6;
const DEVICE_IDENTITY_COPY_WIDTH = 58;
const DEVICE_IDENTITY_COPY_HEIGHT = 24;

/**
 * Approved Root Run settings board. It owns one light nine-sliced backing and
 * the compact vertical rhythm for device preference rows.
 */
export class RootRunDevicePreferencesPanel extends Container {
  constructor({
    assetManager = null,
    width = 264,
    label = 'rootRunDevicePreferencesPanel',
  } = {}) {
    super({ label });
    this.assetManager = assetManager;
    this.panelWidth = Math.max(0, Number(width) || 0);
    this.rows = [];
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.background = new PixiNineSliceFrame({
      texture:
        assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.settingsRow,
        ) ?? Texture.EMPTY,
      sourceInsets:
        PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets:
        PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      width: this.panelWidth,
      height: DEVICE_PANEL_PADDING_Y * 2,
      label: `${label}:background`,
    });
    this.content = new Container({
      label: `${label}:content`,
    });
    this.addChild(this.background, this.content);
    this.relayout();
  }

  setRows(rows = []) {
    this.content.removeChildren();
    this.rows = rows.filter(Boolean);
    this.content.addChild(...this.rows);
    this.relayout();
    return this;
  }

  setWidth(width) {
    this.panelWidth = Math.max(0, Number(width) || 0);
    this.relayout();
    return this;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    for (const row of this.rows) {
      row.applyTheme?.(this.theme);
    }
    return this;
  }

  relayout() {
    const contentWidth = Math.max(
      0,
      this.panelWidth - DEVICE_PANEL_PADDING_X * 2,
    );
    this.rows.forEach((row, index) => {
      row.setBounds(
        DEVICE_PANEL_PADDING_X,
        DEVICE_PANEL_PADDING_Y +
          index * ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT,
        contentWidth,
        ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT,
      );
    });
    this.background.setSize(
      this.panelWidth,
      this.panelHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    this.hitArea = new Rectangle(
      0,
      0,
      this.panelWidth,
      this.panelHeight,
    );
  }

  get panelHeight() {
    return (
      DEVICE_PANEL_PADDING_Y * 2 +
      this.rows.length * ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT
    );
  }
}

/**
 * Approved icon-led device preference row. The icon and label are visual
 * identity. Compact preferences use the shared switch; sound preferences use
 * the wider shared settings slider with a numeric percentage value.
 */
export class RootRunDevicePreferenceRow extends Container {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    semanticId = null,
    preferenceKey,
    text,
    iconAssetId,
    onIconAssetId = null,
    controlKind = 'toggle',
    label = 'rootRunDevicePreferenceRow',
  } = {}) {
    super({ label });
    this.preferenceKey = String(preferenceKey ?? '');
    this.rowWidth = 0;
    this.rowHeight = ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT;
    this.controlKind = controlKind === 'slider' ? 'slider' : 'toggle';
    this.value = this.controlKind === 'slider' ? 0 : false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.iconTextures = {
      off:
        assetManager?.getTexture?.(iconAssetId) ??
        Texture.EMPTY,
      on:
        (
          onIconAssetId
            ? assetManager?.getTexture?.(onIconAssetId)
            : null
        ) ??
        assetManager?.getTexture?.(iconAssetId) ??
        Texture.EMPTY,
    };
    this.icon = new Sprite({
      texture: this.iconTextures.off,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:icon`,
    });
    this.icon.width = DEVICE_PREFERENCE_ICON_WIDTH;
    this.icon.height = getPreferenceIconHeight(
      this.preferenceKey,
    );
    this.textLabel = new PixiTextLabel({
      text,
      fontSize: DEVICE_PREFERENCE_LABEL_FONT_SIZE,
      fontFamily:
        '"Lilita One", "Arial Black", Arial, sans-serif',
      color: DEVICE_PREFERENCE_LABEL_COLOR,
      label: `${label}:label`,
    });
    this.slider =
      this.controlKind === 'slider'
        ? new RootRunSettingsSliderPixi({
            assetManager,
            inputRouter,
            semanticRegistry,
            semanticId,
            label: `${label}:slider`,
          })
        : null;
    this.toggle =
      this.controlKind === 'toggle'
        ? new RootRunSettingsTogglePixi({
            assetManager,
            inputRouter,
            semanticRegistry,
            semanticId,
            label: `${label}:toggle`,
          })
        : null;
    this.control = this.slider ?? this.toggle;
    this.addChild(this.icon, this.textLabel, this.control);
    this.rowRegistration =
      inputRouter?.registerPressTarget?.(this, {
        enabled: () => this.isInteractive(),
        focusable: false,
        onPressChange: (pressed) => this.toggle?.setPressed(pressed),
        onActivate: () => this.activate(),
        haptic: 'selection',
      }) ?? null;
  }

  bind({
    value,
    enabled = true,
    min = 0,
    max = 100,
    step = 1,
    onChange = null,
  } = {}) {
    this.value = this.slider
      ? normalizeRangeValue(value, min, max)
      : value === true;
    this.icon.texture =
      isPreferenceOn(this.value)
        ? this.iconTextures.on
        : this.iconTextures.off;
    const commit = (nextValue) => {
      const normalizedValue = this.slider
        ? normalizeRangeValue(nextValue, min, max)
        : nextValue === true;
      const result = onChange?.(normalizedValue) ?? true;
      if (result !== false) {
        this.value = normalizedValue;
        this.icon.texture = isPreferenceOn(normalizedValue)
          ? this.iconTextures.on
          : this.iconTextures.off;
      }
      return result;
    };
    if (this.slider) {
      this.slider.bind({
        value: this.value,
        enabled,
        min,
        max,
        step,
        tone: 'green',
        onChange: commit,
      });
    } else {
      this.toggle.bind({
        value: this.value,
        enabled,
        onChange: commit,
      });
    }
    this.eventMode = this.isInteractive() ? 'static' : 'none';
    return this;
  }

  activate() {
    return this.slider
      ? this.slider.commitRange(
          this.value > this.slider.min
            ? this.slider.min
            : this.slider.max,
        )
      : this.toggle.activate();
  }

  isInteractive() {
    return this.control.isInteractive();
  }

  setBounds(
    x,
    y,
    width,
    height = ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT,
  ) {
    this.position.set(x, y);
    this.rowWidth = Math.max(0, Number(width) || 0);
    this.rowHeight = Math.max(
      ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT,
      Number(height) || 0,
    );
    this.hitArea = new Rectangle(
      0,
      0,
      this.rowWidth,
      this.rowHeight,
    );
    this.relayout();
    return this;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.textLabel.applyTheme(this.theme);
    this.control.applyTheme(this.theme);
    return this;
  }

  relayout() {
    this.icon.position.set(
      DEVICE_PREFERENCE_ICON_WIDTH / 2,
      this.rowHeight / 2,
    );
    this.textLabel.position.set(
      DEVICE_PREFERENCE_LABEL_X,
      (this.rowHeight - this.textLabel.measuredHeight) / 2,
    );
    if (this.slider) {
      this.slider.setBounds(
        DEVICE_PREFERENCE_SLIDER_X,
        (this.rowHeight - this.slider.controlHeight) / 2,
        Math.max(0, this.rowWidth - DEVICE_PREFERENCE_SLIDER_X),
      );
    } else {
      this.toggle.setBounds(
        Math.max(
          DEVICE_PREFERENCE_LABEL_X,
          this.rowWidth - this.toggle.controlWidth,
        ),
        (this.rowHeight - this.toggle.controlHeight) / 2,
      );
    }
  }

  get labelText() {
    return this.textLabel.text;
  }

  destroy(options) {
    this.rowRegistration?.();
    this.rowRegistration = null;
    super.destroy(options);
  }
}

/**
 * Approved settings footer for the real client version and connected user id.
 * The full id is copied while only a compact form is rendered.
 */
export class DeviceIdentityFooter extends Container {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    semanticId = null,
    width = 264,
    label = 'deviceIdentityFooter',
  } = {}) {
    super({ label });
    this.footerWidth = Math.max(0, Number(width) || 0);
    this.userId = '';
    this.copyAction = null;
    this.copyPending = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.versionLabel = new PixiTextLabel({
      fontSize: 13,
      fontFamily:
        '"Lilita One", "Arial Black", Arial, sans-serif',
      color: DEVICE_IDENTITY_COLOR,
      anchor: { x: 0.5, y: 0 },
      label: `${label}:version`,
    });
    this.userIdLabel = new PixiTextLabel({
      fontSize: 10,
      fontFamily:
        '"Lilita One", "Arial Black", Arial, sans-serif',
      color: DEVICE_IDENTITY_COLOR,
      anchor: { x: 1, y: 0 },
      label: `${label}:userId`,
    });
    this.copyButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId,
      text: 'Copy',
      width: DEVICE_IDENTITY_COPY_WIDTH,
      height: DEVICE_IDENTITY_COPY_HEIGHT,
      sizeTier: 30,
      variant: 'yellow',
      action: () => this.copyUserId(),
      label: `${label}:copy`,
    });
    this.addChild(
      this.versionLabel,
      this.userIdLabel,
      this.copyButton,
    );
    this.relayout();
  }

  bind({
    version = '',
    userId = '',
    onCopy = null,
  } = {}) {
    this.userId = String(userId ?? '').trim();
    this.copyAction =
      typeof onCopy === 'function' ? onCopy : null;
    this.copyPending = false;
    this.versionLabel.setText(
      version ? `v ${String(version).replace(/^v\\s*/i, '')}` : '',
    );
    this.userIdLabel.setText(
      this.userId
        ? compactIdentity(this.userId)
        : 'Not Connected',
    );
    this.copyButton
      .setText('Copy')
      .setEnabled(Boolean(this.userId && this.copyAction));
    this.relayout();
    return this;
  }

  setWidth(width) {
    this.footerWidth = Math.max(0, Number(width) || 0);
    this.relayout();
    return this;
  }

  async copyUserId() {
    if (
      this.copyPending ||
      !this.userId ||
      !this.copyAction
    ) {
      return false;
    }
    this.copyPending = true;
    this.copyButton.setText('...');
    let copied = false;
    try {
      copied = (await this.copyAction(this.userId)) !== false;
    } catch {
      copied = false;
    }
    this.copyPending = false;
    this.copyButton
      .setText(copied ? 'Copied' : 'Retry')
      .setEnabled(true);
    return copied;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.versionLabel.applyTheme(this.theme);
    this.userIdLabel.applyTheme(this.theme);
    this.copyButton.applyTheme(this.theme);
    return this;
  }

  relayout() {
    this.versionLabel.position.set(
      this.footerWidth / 2,
      0,
    );
    const groupWidth =
      this.userIdLabel.measuredWidth +
      DEVICE_IDENTITY_ROW_GAP +
      DEVICE_IDENTITY_COPY_WIDTH;
    const startX = Math.max(
      0,
      (this.footerWidth - groupWidth) / 2,
    );
    const rowY = 26;
    this.userIdLabel.position.set(
      startX + this.userIdLabel.measuredWidth,
      rowY + 6,
    );
    this.copyButton.position.set(
      startX +
        this.userIdLabel.measuredWidth +
        DEVICE_IDENTITY_ROW_GAP,
      rowY,
    );
  }

  get footerHeight() {
    return 50;
  }
}

function getPreferenceIconHeight(key) {
  if (key === 'sfx') {
    return 34;
  }
  if (key === 'music') {
    return 33;
  }
  if (key === 'haptics') {
    return 29;
  }
  return 33;
}

function isPreferenceOn(value) {
  return typeof value === 'number' ? value > 0 : value === true;
}

function normalizeRangeValue(value, min, max) {
  const minimum = Number.isFinite(Number(min)) ? Number(min) : 0;
  const maximum = Math.max(
    minimum,
    Number.isFinite(Number(max)) ? Number(max) : 100,
  );
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return minimum;
  }
  return Math.max(minimum, Math.min(maximum, numeric));
}

function compactIdentity(identity) {
  const value = String(identity ?? '').trim();
  if (value.length <= 22) {
    return value;
  }
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}
