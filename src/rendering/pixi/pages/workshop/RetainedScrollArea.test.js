// @vitest-environment jsdom

import { Graphics } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import './PixiPageTestHarness.js';
import {
  RETAINED_SCROLLBAR_GEOMETRY,
  RETAINED_SCROLLBAR_VISUALS,
  RetainedScrollArea,
} from './RetainedPageKit.js';

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
      RETAINED_SCROLLBAR_GEOMETRY.trackInset -
        RETAINED_SCROLLBAR_GEOMETRY.thumbBorderWidth / 2,
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
      trackBottom +
        RETAINED_SCROLLBAR_GEOMETRY.thumbBorderWidth / 2,
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

  it('uses Root Run procedural Pixi graphics for the track and thumb', () => {
    scroll = overflowingScroll();

    expect(RETAINED_SCROLLBAR_GEOMETRY).toEqual({
      width: 6,
      gap: 5 / 3,
      trackInset: 4,
      trackBorderWidth: 1,
      thumbGap: 1,
      thumbBorderWidth: 2 / 3,
      thumbMinHeight: 82 / 3,
    });
    expect(scroll.toPhysicsUnits(12)).toBe(36);
    expect(scroll.toDesignUnits(36)).toBe(12);
    expect(scroll.scrollbarTrack).toBeInstanceOf(Graphics);
    expect(scroll.scrollbarThumb).toBeInstanceOf(Graphics);
    expect(scroll.scrollbarTrack).not.toHaveProperty('sprite');
    expect(scroll.scrollbarThumb).not.toHaveProperty('sprite');

    const [trackFill, trackStroke] =
      scroll.scrollbarTrack.context.instructions;
    const [thumbFill, thumbStroke] =
      scroll.scrollbarThumb.context.instructions;
    expect([trackFill.action, trackStroke.action]).toEqual([
      'fill',
      'stroke',
    ]);
    expect(trackFill.data.style).toMatchObject({
      color: RETAINED_SCROLLBAR_VISUALS.trackBackground,
      alpha: RETAINED_SCROLLBAR_VISUALS.trackBackgroundAlpha,
    });
    expect(trackStroke.data.style).toMatchObject({
      color: RETAINED_SCROLLBAR_VISUALS.trackBorder,
      alpha: RETAINED_SCROLLBAR_VISUALS.trackBorderAlpha,
      width: RETAINED_SCROLLBAR_GEOMETRY.trackBorderWidth,
    });
    expect(
      trackFill.data.path.instructions[0].data.slice(0, 5),
    ).toEqual([
      100 + RETAINED_SCROLLBAR_GEOMETRY.gap,
      RETAINED_SCROLLBAR_GEOMETRY.trackInset,
      RETAINED_SCROLLBAR_GEOMETRY.width,
      120 - RETAINED_SCROLLBAR_GEOMETRY.trackInset * 2,
      RETAINED_SCROLLBAR_GEOMETRY.width / 2,
    ]);
    expect([thumbFill.action, thumbStroke.action]).toEqual([
      'fill',
      'stroke',
    ]);
    expect(thumbFill.data.style.color).toBe(
      RETAINED_SCROLLBAR_VISUALS.thumbBackground,
    );
    expect(thumbStroke.data.style).toMatchObject({
      color: RETAINED_SCROLLBAR_VISUALS.thumbBorder,
      width: RETAINED_SCROLLBAR_GEOMETRY.thumbBorderWidth,
    });
  });

  it('preserves procedural rounded thumb caps while compressing at both edges', () => {
    scroll = overflowingScroll();

    scroll.physics.scrollByElastic(-180);
    scroll.applyPhysicsOffset();

    expect(scroll.scrollbarThumb).toBeInstanceOf(Graphics);
    expect(scroll.scrollbarThumb.getLocalBounds().height).toBeGreaterThan(0);
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
