// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_ROOT_RUN_ASSETS,
} from '../theme/PixiThemeTokens.js';
import { PixiCostButton } from './PixiCostButton.js';

installPixiPageTestCanvas();

function createHarness(options = {}) {
  const registrations = [];
  const assetManager = {
    has: vi.fn(() => true),
    getTexture: vi.fn(() => Texture.EMPTY),
    getAtlasTexture: vi.fn(() => Texture.EMPTY),
  };
  const inputRouter = {
    registerPressTarget: vi.fn((displayObject, descriptor) => {
      registrations.push({ displayObject, descriptor });
      return { unregister: vi.fn() };
    }),
  };
  const button = new PixiCostButton({
    assetManager,
    inputRouter,
    research: options.research,
    compact: options.compact,
    stacked: options.stacked,
    width: options.width,
    height: options.height,
  });
  return { assetManager, button, inputRouter, registrations };
}

describe('PixiCostButton', () => {
  it('installs one retained input registration and parses resource labels', () => {
    const { button, registrations } = createHarness({ research: true });
    const action = vi.fn();

    button.setModel({
      amountLabel: '1.25K Coin',
      action,
    });

    expect(registrations).toHaveLength(1);
    expect(button.amountLabel.text).toBe('1.25K');
    expect(button.resource).toBe('coin');
    expect(button.buttonWidth).toBe(281 / 3);
    expect(button.activate()).toBe(true);
    expect(action).toHaveBeenCalledOnce();
  });

  it('keeps an unaffordable cost green while disabling only its action', () => {
    const { button, registrations } = createHarness();

    button.setModel({
      amountLabel: '900 Crystal',
      state: 'unaffordable',
      action: vi.fn(),
    });

    expect(button.costState).toBe('unaffordable');
    expect(button.enabled).toBe(false);
    expect(button.amountLabel.colorToken).toBe('#c1121f');
    expect(button.lockedLabel.visible).toBe(false);
    expect(registrations[0].descriptor.enabled()).toBe(false);
  });

  it('uses the retained Research lock treatment and clamps its reason to two lines', () => {
    const { button } = createHarness({
      research: true,
      width: 80,
      height: 48,
    });

    button.setModel({
      state: 'locked',
      lockReason:
        'Complete automation focus research before this can unlock',
    });

    expect(button.amountLabel.visible).toBe(false);
    expect(button.resourceIcon.visible).toBe(false);
    expect(button.lockedLabel.text).toBe('Locked');
    expect(button.lockReasonLabel.stroke).toEqual({
      color: '#0a0a0a',
      width: 2,
      join: 'round',
    });
    expect(button.lockReasonLabel.textObject.style.stroke.width).toBe(2);
    expect(button.lockReasonLabel.wrapWidth).toBe(68);
    expect(button.lockReasonLabel.textObject.style.whiteSpace).toBe(
      'pre-line',
    );
    expect(button.lockReasonLabel.text.split('\n')).toHaveLength(2);
    expect(button.lockReasonLabel.text).not.toContain('unlock');
    expect(button.enabled).toBe(false);
  });

  it('uses retained compact nine-slices and compact content metrics', () => {
    const { assetManager, button } = createHarness({
      compact: true,
      width: 100,
      height: 28,
    });

    button.setModel({
      amountLabel: '3 Coin',
      enabled: false,
    });

    expect(button.compact).toBe(true);
    expect(button.background.visible).toBe(false);
    expect(button.compactBackground.visible).toBe(true);
    expect(button.compactBackground.frameWidth).toBe(100);
    expect(button.compactBackground.frameHeight).toBe(28);
    expect(button.resourceIcon.width).toBeCloseTo(16.512);
    expect(button.resourceIcon.height).toBeCloseTo(16.512);
    expect(button.resourceIcon.y).toBe(14);
    expect(button.amountLabel.y).toBe(14);
    expect(button.amountLabel.stroke.width).toBe(4);
    expect(button.lockReasonLabel.stroke.width).toBe(4);
    expect(button.amountLabel.visible).toBe(true);
    expect(button.lockedLabel.visible).toBe(false);
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
    );

    button.setModel({
      amountLabel: '3 Coin',
      enabled: true,
    });

    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice,
    );
  });

  it('uses the approved compact stacked action and cost composition', () => {
    const { assetManager, button, registrations } = createHarness({
      stacked: true,
      width: 92,
      height: 52,
    });
    const action = vi.fn();

    button.setModel({
      actionLabel: 'Unlock',
      amountLabel: '25 coin',
      action,
    });

    expect(button.stacked).toBe(true);
    expect(button.actionTextLabel.text).toBe('Unlock');
    expect(button.actionTextLabel.position).toMatchObject({
      x: 46,
      y: 17.68,
    });
    expect(button.resourceIcon).toMatchObject({
      width: 15,
      height: 15,
      y: 35.36,
    });
    expect(button.amountLabel).toMatchObject({
      text: '25',
      y: 35.36,
    });
    expect(button.amountLabel.stroke.width).toBe(3);
    expect(button.actionTextLabel.stroke.width).toBe(3);
    expect(button.compactBackground.visible).toBe(false);
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonGreenStacked,
    );
    expect(registrations[0].descriptor.enabled()).toBe(true);
    expect(button.activate()).toBe(true);
    expect(action).toHaveBeenCalledOnce();

    button.setModel({
      actionLabel: 'Unlock',
      amountLabel: '25 coin',
      state: 'unaffordable',
      enabled: false,
    });

    expect(button.amountLabel.colorToken).toBe('#c1121f');
    expect(button.enabled).toBe(false);
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonGreenStacked,
    );
  });

  it('rejects empty actionable costs instead of silently rendering fallback copy', () => {
    const { button } = createHarness();

    expect(() => button.setModel({ amountLabel: '' })).toThrow(
      'non-empty amount label',
    );
  });

  it('rejects a stacked cost without its visible action label', () => {
    const { button } = createHarness({ stacked: true });

    expect(() => button.setModel({ amountLabel: '25 coin' })).toThrow(
      'non-empty action label',
    );
  });
});
