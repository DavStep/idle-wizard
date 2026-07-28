import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiProgressBar } from './PixiProgressBar.js';

const SETTINGS_SLIDER_HEIGHT =
  PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
const SETTINGS_SLIDER_RAIL_HEIGHT =
  PIXI_ROOT_RUN_GEOMETRY.settings.sliderRailHeight;
export const ROOT_RUN_SETTINGS_TOGGLE_WIDTH = 60;
const SETTINGS_TOGGLE_HEIGHT = 24;
const SETTINGS_TOGGLE_TRACK = '#82735d';
const SETTINGS_TOGGLE_TRACK_INSET = '#574536';
const SETTINGS_TOGGLE_ON = '#9cc737';
const SETTINGS_TOGGLE_ON_EDGE = '#d8eb50';
const SETTINGS_TOGGLE_STROKE = '#17100b';
const SETTINGS_MILESTONE_COLOR = '#4c3b2f';
const TUTORIAL_ALLOCATION_TARGET_VALUE = 25;

export const ROOT_RUN_SETTINGS_SLIDER_MODES = Object.freeze({
  RANGE: 'range',
  MILESTONES: 'milestones',
});

/**
 * Shared Root Run settings slider.
 *
 * It uses the thicker shared slider rail and reuses the exact Settings dialog
 * knob. Milestone mode snaps to named stops and marks only interior stops;
 * range mode maps an integer value across an authoritative min/max range.
 */
export class RootRunSettingsSliderPixi extends Container {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    semanticId = null,
    tutorialId = null,
    label = 'rootRunSettingsSlider',
  } = {}) {
    super();
    this.label = label;
    this.controlWidth = 0;
    this.controlHeight = SETTINGS_SLIDER_HEIGHT;
    this.mode = ROOT_RUN_SETTINGS_SLIDER_MODES.RANGE;
    this.enabled = false;
    this.action = null;
    this.options = [];
    this.min = 0;
    this.max = 1;
    this.step = 1;
    this.value = 0;
    this.normalizedValue = 0;
    this.tone = 'blue';
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;

    this.progress = new PixiProgressBar({
      assetManager,
      tone: this.tone,
      label: `${label}:progress`,
    });
    this.milestoneGraphic = new Graphics({
      label: `${label}:milestones`,
    });
    this.knob = new Sprite({
      texture:
        assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.settingsKnob,
        ) ?? Texture.EMPTY,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:knob`,
    });
    this.knob.width = PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
    this.knob.height = PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
    this.addChild(this.progress, this.milestoneGraphic, this.knob);

    this.inputRouter = inputRouter;
    this.pressRegistration =
      inputRouter?.registerPressTarget?.(this, {
        fallbackHitTest: Boolean(tutorialId),
        enabled: () => this.isInteractive(),
        onActivate: (payload) => this.activate(payload),
        haptic: 'selection',
      }) ?? null;
    this.dragRegistration =
      inputRouter?.registerGestureSurface?.(this, {
        kind: 'drag',
        axis: 'x',
        excludePageSwipe: true,
        enabled: () => this.isInteractive(),
        onStart: (payload) => this.setFromPayload(payload),
        onMove: (payload) => this.setFromPayload(payload),
      }) ?? null;

    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.semanticDefinition =
      semanticId && semanticRegistry
        ? semanticRegistry.register({
            semanticId,
            tutorialId,
            displayObject: this,
            bounds: tutorialId ? () => this.knob.getBounds() : null,
            state: () => ({
              enabled: this.enabled,
              interactive: Boolean(this.action),
              value: this.value,
              visible: this.visible && this.renderable,
              tutorialPointerGesture:
                tutorialId === 'shop:sell:percentage'
                  ? this.getTutorialPointerGesture()
                  : null,
            }),
            activate: (payload) => this.activate(payload),
          })
        : null;
    this.bind(null);
  }

  bind(model) {
    this.model = model ?? null;
    this.visible = Boolean(model);
    this.renderable = this.visible;
    if (!model) {
      this.enabled = false;
      this.eventMode = 'none';
      this.action = null;
      return this;
    }

    this.mode =
      model.mode === ROOT_RUN_SETTINGS_SLIDER_MODES.MILESTONES
        ? ROOT_RUN_SETTINGS_SLIDER_MODES.MILESTONES
        : ROOT_RUN_SETTINGS_SLIDER_MODES.RANGE;
    this.enabled = model.enabled !== false;
    this.action = model.onChange ?? model.action ?? null;
    this.eventMode = this.isInteractive() ? 'static' : 'none';

    if (this.mode === ROOT_RUN_SETTINGS_SLIDER_MODES.MILESTONES) {
      this.bindMilestones(model);
    } else {
      this.bindRange(model);
    }
    this.redraw();
    return this;
  }

  bindMilestones(model) {
    this.options = Array.isArray(model.options)
      ? model.options.map((option) =>
          typeof option === 'object'
            ? {
                ...option,
                value: option.value ?? option.id,
              }
            : { value: option },
        )
      : [];
    let index = this.options.findIndex(
      (option) => option.value === model.value,
    );
    if (index < 0) {
      index = this.options.findIndex((option) => option.enabled !== false);
    }
    index = Math.max(0, index);
    const option = this.options[index] ?? {};
    this.value = option.value ?? null;
    this.normalizedValue =
      this.options.length > 1 ? index / (this.options.length - 1) : 0;
    this.tone = normalizeTone(option.tone ?? model.tone ?? 'yellow');
  }

  bindRange(model) {
    this.options = [];
    const usesLegacyPercentage =
      model.max === undefined && model.min === undefined;
    this.min = finiteOr(model.min, 0);
    this.max = Math.max(
      this.min,
      finiteOr(model.max, usesLegacyPercentage ? 100 : this.min),
    );
    this.step = Math.max(
      1,
      finiteOr(model.step, usesLegacyPercentage ? 5 : 1),
    );
    const rawValue = finiteOr(model.value ?? model.percent, this.min);
    this.value = clamp(
      quantize(
        usesLegacyPercentage && rawValue <= 1
          ? rawValue * 100
          : rawValue,
        this.min,
        this.step,
      ),
      this.min,
      this.max,
    );
    this.normalizedValue =
      this.max > this.min
        ? (this.value - this.min) / (this.max - this.min)
        : 0;
    this.tone = normalizeTone(model.tone ?? 'blue');
  }

  setBounds(x, y, width, height = SETTINGS_SLIDER_HEIGHT) {
    this.position.set(x, y);
    this.controlWidth = Math.max(0, finiteOr(width, 0));
    this.controlHeight = Math.max(
      SETTINGS_SLIDER_HEIGHT,
      finiteOr(height, SETTINGS_SLIDER_HEIGHT),
    );
    this.hitArea = new Rectangle(
      0,
      0,
      this.controlWidth,
      this.controlHeight,
    );
    this.eventMode = this.isInteractive() ? 'static' : 'none';

    const knobSize = PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
    const railWidth = Math.max(0, this.controlWidth - knobSize);
    this.progress.position.set(
      knobSize / 2,
      Math.round(
        (this.controlHeight - SETTINGS_SLIDER_RAIL_HEIGHT) / 2,
      ),
    );
    this.progress.setSize(
      railWidth,
      SETTINGS_SLIDER_RAIL_HEIGHT,
    );
    this.redraw();
    return this;
  }

  activate(payload = {}) {
    if (!this.isInteractive()) {
      return false;
    }
    if (hasPayloadPoint(payload)) {
      return this.setFromPayload(payload);
    }
    if (this.mode === ROOT_RUN_SETTINGS_SLIDER_MODES.MILESTONES) {
      const currentIndex = this.options.findIndex(
        (option) => option.value === this.value,
      );
      const nextIndex = findNextEnabledIndex(
        this.options,
        Math.max(0, currentIndex + 1),
      );
      return nextIndex >= 0
        ? this.commitMilestone(nextIndex)
        : false;
    }
    return this.commitRange(Math.min(this.max, this.value + this.step));
  }

  setFromPayload(payload = {}) {
    if (!this.isInteractive()) {
      return false;
    }
    const localX = this.resolveLocalX(payload);
    if (!Number.isFinite(localX)) {
      return false;
    }
    const knobRadius =
      PIXI_ROOT_RUN_GEOMETRY.settings.knobSize / 2;
    const normalized = clamp01(
      (localX - knobRadius) /
        Math.max(1, this.controlWidth - knobRadius * 2),
    );
    if (this.mode === ROOT_RUN_SETTINGS_SLIDER_MODES.MILESTONES) {
      const requestedIndex = Math.round(
        normalized * Math.max(0, this.options.length - 1),
      );
      const index = findNearestEnabledIndex(
        this.options,
        requestedIndex,
      );
      return index >= 0 ? this.commitMilestone(index) : false;
    }
    const rawValue =
      this.min + normalized * Math.max(0, this.max - this.min);
    return this.commitRange(
      clamp(
        quantize(rawValue, this.min, this.step),
        this.min,
        this.max,
      ),
    );
  }

  resolveLocalX(payload) {
    const explicit = Number(payload?.localX);
    if (Number.isFinite(explicit)) {
      return explicit;
    }
    const point = payload?.point ?? payload?.global ?? null;
    if (!point || typeof this.toLocal !== 'function') {
      return Number.NaN;
    }
    return this.toLocal(point).x;
  }

  commitMilestone(index) {
    const option = this.options[index];
    if (!option || option.enabled === false || option.value === this.value) {
      return false;
    }
    this.value = option.value;
    this.normalizedValue =
      this.options.length > 1 ? index / (this.options.length - 1) : 0;
    this.tone = normalizeTone(option.tone ?? 'yellow');
    this.redraw();
    return this.action?.(this.value) ?? true;
  }

  commitRange(value) {
    if (value === this.value) {
      return false;
    }
    this.value = value;
    this.normalizedValue =
      this.max > this.min
        ? (this.value - this.min) / (this.max - this.min)
        : 0;
    this.redraw();
    return this.action?.(this.value) ?? true;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.progress.applyTheme({
      ...this.theme,
      progress: { key: 'classic' },
    });
    this.redraw();
    return this;
  }

  redraw() {
    this.progress
      .setTone(this.tone)
      .setProgress(this.normalizedValue);
    this.redrawMilestones();
    const knobRadius =
      PIXI_ROOT_RUN_GEOMETRY.settings.knobSize / 2;
    const centerX =
      knobRadius +
      Math.max(0, this.controlWidth - knobRadius * 2) *
        this.normalizedValue;
    this.knob.position.set(centerX, this.controlHeight / 2);
    this.knob.alpha = 1;
  }

  redrawMilestones() {
    this.milestoneGraphic.clear();
    if (
      this.mode !== ROOT_RUN_SETTINGS_SLIDER_MODES.MILESTONES ||
      this.options.length < 2
    ) {
      return;
    }
    const knobSize = PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
    const railStart = knobSize / 2;
    const railWidth = Math.max(0, this.controlWidth - knobSize);
    const centerY = this.controlHeight / 2;
    for (let index = 1; index < this.options.length - 1; index += 1) {
      const option = this.options[index];
      const x =
        railStart + railWidth * (index / (this.options.length - 1));
      this.milestoneGraphic
        .circle(x, centerY, 1.5)
        .fill({
          color: SETTINGS_MILESTONE_COLOR,
          alpha: option.enabled === false ? 0.24 : 0.68,
        });
    }
  }

  getTutorialPointerGesture() {
    const targetNormalizedValue =
      this.max > this.min
        ? clamp01(
            (TUTORIAL_ALLOCATION_TARGET_VALUE - this.min) /
              (this.max - this.min),
          )
        : 0;
    const travelX =
      Math.max(
        0,
        this.controlWidth -
          PIXI_ROOT_RUN_GEOMETRY.settings.knobSize,
      ) *
      Math.max(0, targetNormalizedValue - this.normalizedValue);
    return {
      kind: 'horizontal-drag',
      travelX,
    };
  }

  isInteractive() {
    return (
      this.enabled &&
      Boolean(this.action) &&
      this.visible &&
      this.renderable
    );
  }

  destroy(options) {
    this.pressRegistration?.();
    this.dragRegistration?.();
    this.pressRegistration = null;
    this.dragRegistration = null;
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this,
      });
      this.semanticDefinition = null;
    }
    super.destroy(options);
  }
}

/**
 * Root Run Settings dialog toggle with its exact knob asset.
 */
export class RootRunSettingsTogglePixi extends Container {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    semanticId = null,
    tutorialId = null,
    label = 'rootRunSettingsToggle',
  } = {}) {
    super();
    this.label = label;
    this.controlWidth = ROOT_RUN_SETTINGS_TOGGLE_WIDTH;
    this.controlHeight = SETTINGS_TOGGLE_HEIGHT;
    this.value = false;
    this.enabled = false;
    this.action = null;
    this.pressed = false;
    this.track = new Graphics({ label: `${label}:track` });
    this.knob = new Sprite({
      texture:
        assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.settingsKnob,
        ) ?? Texture.EMPTY,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:knob`,
    });
    this.knob.width = PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
    this.knob.height = PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
    this.addChild(this.track, this.knob);

    this.inputRouter = inputRouter;
    this.registration =
      inputRouter?.registerPressTarget?.(this, {
        enabled: () => this.isInteractive(),
        onPressChange: (pressed) => {
          this.pressed = pressed;
          this.redraw();
        },
        onActivate: () => this.activate(),
        haptic: 'selection',
      }) ?? null;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.semanticDefinition =
      semanticId && semanticRegistry
        ? semanticRegistry.register({
            semanticId,
            tutorialId,
            displayObject: this,
            state: () => ({
              enabled: this.enabled,
              interactive: Boolean(this.action),
              selected: this.value,
              visible: this.visible && this.renderable,
            }),
            activate: () => this.activate(),
          })
        : null;
    this.bind(null);
  }

  bind(model) {
    this.model = model ?? null;
    this.visible = Boolean(model);
    this.renderable = this.visible;
    if (!model) {
      this.enabled = false;
      this.eventMode = 'none';
      this.action = null;
      return this;
    }
    this.value = model.value === true || model.selected === true;
    this.enabled = model.enabled !== false;
    this.action = model.onChange ?? model.action ?? null;
    this.eventMode = this.isInteractive() ? 'static' : 'none';
    this.redraw();
    return this;
  }

  setBounds(
    x,
    y,
    width = ROOT_RUN_SETTINGS_TOGGLE_WIDTH,
    height = SETTINGS_TOGGLE_HEIGHT,
  ) {
    this.position.set(x, y);
    this.controlWidth = Math.max(
      ROOT_RUN_SETTINGS_TOGGLE_WIDTH,
      finiteOr(width, ROOT_RUN_SETTINGS_TOGGLE_WIDTH),
    );
    this.controlHeight = Math.max(
      SETTINGS_TOGGLE_HEIGHT,
      finiteOr(height, SETTINGS_TOGGLE_HEIGHT),
    );
    this.hitArea = new Rectangle(
      0,
      0,
      this.controlWidth,
      this.controlHeight,
    );
    this.eventMode = this.isInteractive() ? 'static' : 'none';
    this.redraw();
    return this;
  }

  activate() {
    if (!this.isInteractive()) {
      return false;
    }
    const next = !this.value;
    this.value = next;
    this.redraw();
    return this.action?.(next) ?? true;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redraw();
    return this;
  }

  redraw() {
    const width = this.controlWidth;
    const height = SETTINGS_TOGGLE_HEIGHT;
    const y = (this.controlHeight - height) / 2;
    const radius = height / 2;
    this.track
      .clear()
      .roundRect(0, y, width, height, radius)
      .fill(SETTINGS_TOGGLE_TRACK)
      .roundRect(0, y, width, height, radius)
      .stroke({
        color: SETTINGS_TOGGLE_STROKE,
        width: 2,
        alignment: 1,
      })
      .roundRect(5, y + 5, Math.max(0, width - 10), height - 10, 7)
      .fill(
        this.value
          ? SETTINGS_TOGGLE_ON
          : SETTINGS_TOGGLE_TRACK_INSET,
      );
    if (this.value) {
      this.track
        .roundRect(5, y + 5, Math.max(0, width - 10), height - 10, 7)
        .stroke({
          color: SETTINGS_TOGGLE_ON_EDGE,
          width: 1,
          alignment: 1,
        });
    }
    const knobRadius =
      PIXI_ROOT_RUN_GEOMETRY.settings.knobSize / 2;
    this.knob.position.set(
      this.value ? width - knobRadius : knobRadius,
      this.controlHeight / 2,
    );
    this.alpha = this.enabled ? (this.pressed ? 0.82 : 1) : 0.45;
  }

  isInteractive() {
    return (
      this.enabled &&
      Boolean(this.action) &&
      this.visible &&
      this.renderable
    );
  }

  destroy(options) {
    this.registration?.();
    this.registration = null;
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this,
      });
      this.semanticDefinition = null;
    }
    super.destroy(options);
  }
}

function hasPayloadPoint(payload) {
  return (
    Number.isFinite(Number(payload?.localX)) ||
    Boolean(payload?.point ?? payload?.global)
  );
}

function findNearestEnabledIndex(options, requestedIndex) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  options.forEach((option, index) => {
    if (option.enabled === false) {
      return;
    }
    const distance = Math.abs(index - requestedIndex);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });
  return bestIndex;
}

function findNextEnabledIndex(options, startIndex) {
  for (let index = startIndex; index < options.length; index += 1) {
    if (options[index]?.enabled !== false) {
      return index;
    }
  }
  return -1;
}

function normalizeTone(tone) {
  return ['blue', 'green', 'red', 'root', 'yellow'].includes(tone)
    ? tone
    : 'root';
}

function quantize(value, min, step) {
  return min + Math.round((value - min) / step) * step;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(Number(value) || 0, 0, 1);
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
