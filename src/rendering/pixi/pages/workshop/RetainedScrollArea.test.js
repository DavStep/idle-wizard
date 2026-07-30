// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import './PixiPageTestHarness.js';
import {
  RETAINED_SCROLLBAR_GEOMETRY,
  RetainedScrollArea,
} from './RetainedPageKit.js';
import {
  PIXI_CAPSULE_ASSETS,
} from '../../primitives/PixiCapsuleSkin.js';

describe('RetainedScrollArea', () => {
  let scroll = null;

  afterEach(() => {
    scroll?.destroy();
    scroll = null;
  });

  it('renders release inertia from the shared station physics', () => {
    scroll = overflowingScroll();
    scroll.beginDrag(pointerContext(0, 120));
    scroll.dragTo(pointerContext(40, 80));
    const releasedOffset = scroll.offsetY;

    scroll.endDrag();
    scroll.update(1 / 60);

    expect(scroll.offsetY).toBeGreaterThan(releasedOffset);
    expect(scroll.content.y).toBe(-scroll.offsetY);
  });

  it('samples the final pointer-up position before releasing inertia', () => {
    scroll = overflowingScroll();
    scroll.beginDrag(pointerContext(0, 120));
    scroll.dragTo(pointerContext(40, 80));

    scroll.endDrag(pointerContext(80, 40));

    expect(scroll.offsetY).toBeCloseTo(80, 10);
    expect(scroll.physics.velocity).toBeGreaterThan(0);
  });

  it('keeps release inertia through unchanged layout refreshes', () => {
    scroll = overflowingScroll();
    scroll.beginDrag(pointerContext(0, 120));
    scroll.dragTo(pointerContext(40, 80));
    scroll.endDrag();
    scroll.update(1 / 60);
    const offsetBeforeRefresh = scroll.offsetY;

    scroll.setBounds(0, 0, 100, 120);
    scroll.setContentHeight(420);
    scroll.update(1 / 60);

    expect(scroll.offsetY).toBeGreaterThan(offsetBeforeRefresh);
    expect(scroll.physics.velocity).toBeGreaterThan(0);
  });

  it('supports elastic wheel overscroll and settles exactly at the top', () => {
    scroll = overflowingScroll();
    const event = wheelEvent(-180);

    expect(
      scroll.onWheelInput({
        event,
        point: { x: 0, y: 0 },
      }),
    ).toBe(true);
    expect(scroll.offsetY).toBeLessThan(0);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();

    settle(scroll);
    expect(scroll.offsetY).toBe(0);
    expect(scroll.content.y).toBeCloseTo(0, 10);
  });

  it('compresses the thumb at both edges and anchors it at the bottom', () => {
    scroll = overflowingScroll();
    const baseHeight =
      scroll.scrollbarThumb.getLocalBounds().height;

    scroll.physics.scrollByElastic(-180);
    scroll.applyPhysicsOffset();
    const topBounds = scroll.scrollbarThumb.getLocalBounds();

    expect(topBounds.height).toBeLessThan(baseHeight);
    expect(topBounds.y).toBeCloseTo(
      RETAINED_SCROLLBAR_GEOMETRY.trackInset,
      5,
    );

    scroll.physics.snapTo(scroll.physics.maxOffset);
    scroll.physics.scrollByElastic(180);
    scroll.applyPhysicsOffset();
    const bottomBounds = scroll.scrollbarThumb.getLocalBounds();
    const trackBottom =
      scroll.height - RETAINED_SCROLLBAR_GEOMETRY.trackInset;

    expect(bottomBounds.height).toBeLessThan(baseHeight);
    expect(bottomBounds.y + bottomBounds.height).toBeCloseTo(
      trackBottom,
      5,
    );
  });

  it('hides the scrollbar and rejects input for short content', () => {
    scroll = new RetainedScrollArea();
    scroll.setBounds(0, 0, 100, 120);
    scroll.setContentHeight(80);

    expect(scroll.beginDrag(pointerContext(0, 100))).toBe(false);
    expect(
      scroll.onWheelInput({
        event: wheelEvent(100),
        point: { x: 0, y: 0 },
      }),
    ).toBe(false);
    expect(scroll.offsetY).toBe(0);
    expect(scroll.scrollbarTrack.visible).toBe(false);
    expect(scroll.scrollbarThumb.visible).toBe(false);
  });

  it('uses the shared capsule assets for the vertical track and thumb mask', () => {
    const getTexture = vi.fn(() => ({
      frame: { x: 0, y: 0, width: 1, height: 1 },
      source: {},
    }));
    scroll = new RetainedScrollArea({
      assetManager: { getTexture },
    });

    expect(getTexture).toHaveBeenNthCalledWith(
      1,
      PIXI_CAPSULE_ASSETS.track,
    );
    expect(getTexture).toHaveBeenNthCalledWith(
      2,
      PIXI_CAPSULE_ASSETS.fillMask,
    );
    expect(scroll.scrollbarTrack.sprite).toBeDefined();
    expect(scroll.scrollbarThumbFill.effects).toContain(
      scroll.scrollbarThumbAlphaMask,
    );
    expect(scroll.scrollbarThumbAlphaMask).toMatchObject({
      pipe: 'alphaMask',
      mask: scroll.scrollbarThumbMask,
      channel: 'alpha',
    });
    expect(scroll.scrollbarThumbFill._maskOptions).toMatchObject({
      channel: 'alpha',
    });
  });

  it('preserves rounded thumb caps while compressing at both edges', () => {
    scroll = overflowingScroll();

    expect(scroll.scrollbarThumbAlphaMask.mask).toBe(
      scroll.scrollbarThumbMask,
    );

    scroll.physics.scrollByElastic(-180);
    scroll.applyPhysicsOffset();

    expect(scroll.scrollbarThumbAlphaMask.mask.visible).toBe(true);
    expect(scroll.scrollbarThumbFill.effects).toContain(
      scroll.scrollbarThumbAlphaMask,
    );
  });
});

function overflowingScroll() {
  const area = new RetainedScrollArea();
  area.setBounds(0, 0, 100, 120);
  area.setContentHeight(420);
  return area;
}

function pointerContext(timeStamp, y) {
  return {
    event: { timeStamp },
    point: { x: 20, y },
  };
}

function wheelEvent(deltaY) {
  return {
    deltaY,
    deltaMode: 0,
    cancelable: true,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

function settle(area) {
  for (let frame = 0; frame < 240 && area.physics.isAnimating; frame += 1) {
    area.update(1 / 60);
  }
}
