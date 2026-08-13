// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import {
  createPixiAssetManagerFake,
} from '../workshop/PixiPageTestHarness.js';
import { ClickableWidget } from '../../primitives/ClickableWidget.js';
import { RootRunInventoryChoiceRowPixi } from '../shop/ShopDialogPixi.js';

globalThis.CanvasRenderingContext2D.prototype.createLinearGradient =
  () => ({
    addColorStop() {},
  });
globalThis.CanvasRenderingContext2D.prototype.fillRect = () => {};

describe('RootRunInventoryChoiceRowPixi', () => {
  it('uses compact whole-row press feedback for inventory selection', () => {
    let pressTarget = null;
    let now = 0;
    let releaseFrame = null;
    const unregister = vi.fn();
    unregister.update = vi.fn();
    const action = vi.fn(() => true);
    const row = new RootRunInventoryChoiceRowPixi({
      assetManager: createPixiAssetManagerFake(Texture),
      cancelFrame: vi.fn(),
      inputRouter: {
        registerPressTarget: vi.fn((_displayObject, descriptor) => {
          pressTarget = descriptor;
          return unregister;
        }),
      },
      label: 'inventory-choice-row',
      reducedMotion: () => false,
      requestFrame: vi.fn((callback) => {
        releaseFrame = callback;
        return 1;
      }),
      timeSource: () => now,
      useSettingsStyle: true,
    });

    row.bind('sageSeed', {
      action,
      detail: '52 Available',
      enabled: true,
      itemKind: 'seed',
      key: 'sageSeed',
      label: 'Sage Seed',
    });
    row.setBounds(0, 0, 276, 50, 50);

    expect(row).toBeInstanceOf(ClickableWidget);
    pressTarget.onPressChange(true, { confirmed: false });

    expect(row.visual.scale.x).toBeCloseTo(0.97);
    expect(row.visual.scale.y).toBeCloseTo(0.97);

    pressTarget.onPressChange(false, { confirmed: true });
    expect(releaseFrame).toBeTypeOf('function');
    now = 180;
    releaseFrame();
    expect(row.visual.scale.x).toBe(1);
    expect(row.visual.scale.y).toBe(1);

    expect(pressTarget.onActivate({ source: 'pointer' })).toBe(true);
    expect(action).toHaveBeenCalledOnce();

    row.destroy();
    expect(unregister).toHaveBeenCalledOnce();
  });
});
