// @vitest-environment jsdom

import { Container, Graphics, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { createPixiAssetManagerFake } from '../workshop/PixiPageTestHarness.js';
import {
  PIXI_TOOLTIP_ENTRY_DURATION_MS,
  PIXI_TOOLTIP_POINTER_ASSET_ID,
  PixiTooltip,
  getPixiTooltipEntryScale,
} from './PixiTooltip.js';

describe('PixiTooltip', () => {
  it('uses image-backed chrome and a generated pointer instead of a solid fallback', () => {
    const assetManager = createAssetManager();
    const tooltip = new PixiTooltip({ assetManager });

    tooltip.bind('Complete prior research');
    tooltip.show({ x: 20, y: 30, animate: false });

    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_TOOLTIP_POINTER_ASSET_ID,
    );
    expect(tooltip.panel.frame.visible).toBe(true);
    expect(tooltip.panel.fallback.visible).toBe(false);
    expect(tooltip.pointer.visible).toBe(true);
    expect(tooltip.pointer.texture).toBe(Texture.WHITE);

    tooltip.destroy();
  });

  it('anchors above its target, dismisses on an outside press, and keeps anchor presses', () => {
    let pointerDownObserver = null;
    const inputRouter = {
      subscribePointerDown: vi.fn((observer) => {
        pointerDownObserver = observer;
        return vi.fn();
      }),
    };
    const container = new Container();
    const target = new Graphics().rect(240, 220, 80, 40).fill(0xffffff);
    const targetChild = new Container();
    target.addChild(targetChild);
    container.addChild(target);
    const tooltip = new PixiTooltip({
      assetManager: createAssetManager(),
      inputRouter,
    });
    container.addChild(tooltip.root);
    tooltip.bind('You need to research first.');

    expect(
      tooltip.showNearTarget({
        target,
        container,
        boundaryWidth: 390,
        boundaryHeight: 844,
        animate: false,
      }),
    ).toBe(true);
    expect(tooltip.placement).toBe('above');
    expect(tooltip.root.visible).toBe(true);

    pointerDownObserver({ target: targetChild, point: { x: 260, y: 230 } });
    expect(tooltip.root.visible).toBe(true);

    pointerDownObserver({ target: container, point: { x: 30, y: 500 } });
    expect(tooltip.root.visible).toBe(false);

    tooltip.destroy();
    container.destroy({ children: true });
  });

  it('plays one restrained snap and settles immediately for reduced motion', () => {
    let now = 1_000;
    const tooltip = new PixiTooltip({
      assetManager: createAssetManager(),
      timeSource: () => now,
    });
    tooltip.bind('Locked');
    tooltip.show({ x: 0, y: 0 });

    expect(tooltip.root.scale.x).toBeCloseTo(getPixiTooltipEntryScale(0));
    expect(tooltip.root.alpha).toBeLessThan(1);

    now += PIXI_TOOLTIP_ENTRY_DURATION_MS * 0.72;
    tooltip.updateTime(now);
    expect(tooltip.root.scale.x).toBeGreaterThan(1);

    now += PIXI_TOOLTIP_ENTRY_DURATION_MS;
    tooltip.updateTime(now);
    expect(tooltip.entryStartedAt).toBeNull();
    expect(tooltip.root.scale.x).toBe(1);
    expect(tooltip.root.alpha).toBe(1);
    tooltip.destroy();

    const reduced = new PixiTooltip({
      assetManager: createAssetManager(),
      prefersReducedMotion: () => true,
    });
    reduced.bind('Locked');
    reduced.show({ x: 0, y: 0 });
    expect(reduced.entryStartedAt).toBeNull();
    expect(reduced.root.scale.x).toBe(1);
    expect(reduced.root.alpha).toBe(1);
    reduced.destroy();
  });
});

function createAssetManager() {
  const assetManager = createPixiAssetManagerFake(Texture);
  assetManager.has = vi.fn(() => true);
  assetManager.getTexture = vi.fn(() => Texture.WHITE);
  return assetManager;
}
