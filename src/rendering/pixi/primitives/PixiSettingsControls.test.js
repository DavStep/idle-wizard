// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  PIXI_PROGRESS_VISUALS,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';

let Texture;
let RootRunSettingsSliderPixi;
let RootRunSettingsTogglePixi;

beforeAll(async () => {
  globalThis.HTMLCanvasElement.prototype.getContext = () => ({
    createLinearGradient: () => ({
      addColorStop() {},
    }),
    fillRect() {},
  });
  ({ Texture } = await import('pixi.js'));
  ({
    RootRunSettingsSliderPixi,
    RootRunSettingsTogglePixi,
  } = await import('./PixiSettingsControls.js'));
});

describe('Root Run settings controls', () => {
  it('snaps milestone drags from router points and changes fill tone', () => {
    const harness = createHarness();
    const onChange = vi.fn();
    const slider = new RootRunSettingsSliderPixi({
      ...harness.dependencies,
      semanticId: 'settings.dropRate',
      label: 'dropRate',
    });
    slider.bind({
      mode: 'milestones',
      value: 'medium',
      options: [
        { value: 'none', tone: 'root' },
        { value: 'low', tone: 'red' },
        { value: 'medium', tone: 'yellow' },
        { value: 'high', tone: 'green' },
      ],
      onChange,
    });
    const milestoneCircle = vi.spyOn(
      slider.milestoneGraphic,
      'circle',
    );
    milestoneCircle.mockClear();
    slider.setBounds(0, 0, 200);

    expect(harness.assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.settingsKnob,
    );
    expect(slider.knob).toMatchObject({
      width: PIXI_ROOT_RUN_GEOMETRY.settings.knobSize,
      height: PIXI_ROOT_RUN_GEOMETRY.settings.knobSize,
    });
    expect(slider.progress.barHeight).toBe(
      PIXI_ROOT_RUN_GEOMETRY.settings.sliderRailHeight,
    );
    expect(slider.progress.fillColor).toBe(
      PIXI_PROGRESS_VISUALS.tones.yellow.fill,
    );
    const knobSize = PIXI_ROOT_RUN_GEOMETRY.settings.knobSize;
    const railStart = knobSize / 2;
    const milestoneGap = (200 - knobSize) / 3;
    expect(milestoneCircle.mock.calls).toEqual([
      [railStart + milestoneGap, slider.controlHeight / 2, 1.5],
      [railStart + milestoneGap * 2, slider.controlHeight / 2, 1.5],
    ]);

    harness.gestures[0].onMove({ point: { x: 200, y: 12 } });

    expect(onChange).toHaveBeenCalledWith('high');
    expect(slider.value).toBe('high');
    expect(slider.progress.fillColor).toBe(
      PIXI_PROGRESS_VISUALS.tones.green.fill,
    );

    harness.gestures[0].onMove({ point: { x: 0, y: 12 } });

    expect(onChange).toHaveBeenLastCalledWith('none');
    expect(slider.value).toBe('none');
    expect(slider.normalizedValue).toBe(0);

    slider.destroy({ children: true });
  });

  it('maps the continuous range from zero to the authoritative maximum', () => {
    const harness = createHarness();
    const onChange = vi.fn();
    const slider = new RootRunSettingsSliderPixi({
      ...harness.dependencies,
      semanticId: 'settings.manaReserve',
      label: 'manaReserve',
    });
    slider.bind({
      mode: 'range',
      min: 0,
      max: 5_000,
      step: 1,
      value: 0,
      tone: 'blue',
      onChange,
    });
    slider.setBounds(0, 0, 200);

    harness.presses[0].onActivate({ point: { x: 100, y: 12 } });

    expect(onChange).toHaveBeenCalledWith(2_500);
    expect(slider.value).toBe(2_500);
    expect(slider.progress.fillColor).toBe(
      PIXI_PROGRESS_VISUALS.tones.blue.fill,
    );
    expect(slider.milestoneGraphic.getLocalBounds().width).toBe(0);

    slider.destroy({ children: true });
  });

  it('anchors the stall tutorial cue to the knob and describes a drag to 25%', () => {
    const harness = createHarness();
    const slider = new RootRunSettingsSliderPixi({
      ...harness.dependencies,
      semanticId: 'shop.stall.1.allocation',
      tutorialId: 'shop:sell:percentage',
      label: 'stallAllocation',
    });
    slider.bind({
      mode: 'range',
      min: 0,
      max: 100,
      step: 5,
      value: 0,
      onChange: vi.fn(),
    });
    slider.setBounds(0, 0, 200);

    const semanticDefinition =
      harness.dependencies.semanticRegistry.register.mock.calls[0][0];

    expect(semanticDefinition.bounds()).toEqual(
      slider.knob.getBounds(),
    );
    expect(
      semanticDefinition.state().tutorialPointerGesture,
    ).toEqual({
      kind: 'horizontal-drag',
      travelX:
        (200 - PIXI_ROOT_RUN_GEOMETRY.settings.knobSize) * 0.25,
    });

    slider.destroy({ children: true });
  });

  it('keeps the disabled knob opaque while rejecting press and drag changes', () => {
    const harness = createHarness();
    const onChange = vi.fn();
    const slider = new RootRunSettingsSliderPixi({
      ...harness.dependencies,
      semanticId: 'shop.stall.allocation',
      label: 'stallAllocation',
    });
    slider.bind({
      mode: 'range',
      min: 0,
      max: 100,
      step: 5,
      value: 100,
      enabled: false,
      onChange,
    });
    slider.setBounds(0, 0, 200);

    expect(slider.knob.alpha).toBe(1);
    expect(harness.presses[0].enabled()).toBe(false);
    expect(harness.gestures[0].enabled()).toBe(false);
    expect(
      harness.presses[0].onActivate({ point: { x: 50, y: 12 } }),
    ).toBe(false);
    expect(
      harness.gestures[0].onMove({ point: { x: 50, y: 12 } }),
    ).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(slider.value).toBe(100);

    slider.destroy({ children: true });
  });

  it('uses the same exact knob asset for an on/off Root Run toggle', () => {
    const harness = createHarness();
    const onChange = vi.fn();
    const toggle = new RootRunSettingsTogglePixi({
      ...harness.dependencies,
      semanticId: 'settings.autoSummon',
      label: 'autoSummon',
    });
    toggle.bind({
      value: true,
      onChange,
    });
    toggle.setBounds(0, 0);

    expect(harness.assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.settingsKnob,
    );
    expect(toggle.controlWidth).toBe(60);
    expect(toggle.knob.x).toBeGreaterThan(toggle.controlWidth / 2);

    harness.presses[0].onActivate();

    expect(onChange).toHaveBeenCalledWith(false);
    expect(toggle.value).toBe(false);
    expect(toggle.knob.x).toBeLessThan(toggle.controlWidth / 2);

    toggle.destroy({ children: true });
  });
});

function createHarness() {
  const presses = [];
  const gestures = [];
  const assetManager = {
    getTexture: vi.fn(() => Texture.EMPTY),
  };
  const inputRouter = {
    registerPressTarget: vi.fn((displayObject, descriptor) => {
      presses.push(descriptor);
      return vi.fn();
    }),
    registerGestureSurface: vi.fn((displayObject, descriptor) => {
      gestures.push(descriptor);
      return vi.fn();
    }),
  };
  const semanticRegistry = {
    register: vi.fn(() => ({})),
    unregister: vi.fn(),
  };
  return {
    assetManager,
    presses,
    gestures,
    dependencies: {
      assetManager,
      inputRouter,
      semanticRegistry,
    },
  };
}
