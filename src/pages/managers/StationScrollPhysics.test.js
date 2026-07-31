import { describe, expect, it } from 'vitest';
import {
  ROOT_RUN_STATION_SCROLL_CONSTANTS,
  StationScrollPhysics,
} from './StationScrollPhysics.js';

describe('StationScrollPhysics', () => {
  it('continues with inertia after a quick finger release', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);
    scroll.beginDrag(600, 0);
    scroll.dragTo(500, 100);
    const releasedOffset = scroll.offset;

    scroll.endDrag();
    scroll.update(1 / 60);

    expect(scroll.offset).toBeGreaterThan(releasedOffset);
    expect(scroll.velocity).toBeGreaterThan(0);
  });

  it('uses the exact progressive rubber-band formula at both edges', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);

    scroll.beginDrag(200, 0);
    scroll.dragTo(360, 120);
    expect(scroll.offset).toBeCloseTo(
      rubberBand(-160, 0.66, 220),
      10,
    );

    scroll.endDrag();
    scroll.snapTo(1000);
    scroll.beginDrag(360, 200);
    scroll.dragTo(200, 320);
    expect(scroll.offset).toBeCloseTo(
      1000 + rubberBand(160, 0.38, 118),
      10,
    );
  });

  it('settles top and bottom overscroll exactly onto their edges', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);
    scroll.scrollByElastic(-180);

    settle(scroll);
    expect(scroll.offset).toBe(0);
    expect(scroll.velocity).toBe(0);

    scroll.snapTo(1000);
    scroll.scrollByElastic(180);
    settle(scroll);
    expect(scroll.offset).toBe(1000);
    expect(scroll.velocity).toBe(0);
  });

  it('matches Root Run quick edge return without snapping on the first frame', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);
    scroll.scrollByElastic(-180);

    scroll.update(1 / 60);

    expect(scroll.offset).toBeLessThan(0);
    expect(scroll.offset).toBeGreaterThan(-77);

    for (let frame = 1; frame < 10; frame += 1) {
      scroll.update(1 / 60);
    }

    expect(scroll.offset).toBe(0);
    expect(scroll.velocity).toBe(0);
  });

  it('allows elastic wheel input and springs it back', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);

    scroll.scrollByElastic(-180);
    expect(scroll.offset).toBeLessThan(0);

    settle(scroll);
    expect(scroll.offset).toBe(0);
  });

  it('caps release velocity at 2600', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(10_000);
    scroll.beginDrag(1000, 0);
    scroll.dragTo(0, 1);

    expect(scroll.velocity).toBe(
      ROOT_RUN_STATION_SCROLL_CONSTANTS.maxReleaseVelocity,
    );

    scroll.endDrag();
    expect(scroll.velocity).toBe(
      ROOT_RUN_STATION_SCROLL_CONSTANTS.maxReleaseVelocity,
    );
  });

  it('uses Root Run station spring and release filtering constants', () => {
    expect(ROOT_RUN_STATION_SCROLL_CONSTANTS.edgeSpringStiffness).toBe(520);
    expect(ROOT_RUN_STATION_SCROLL_CONSTANTS.edgeSpringDamping).toBe(26);

    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(10_000);
    scroll.beginDrag(600, 0);
    scroll.dragTo(500, 100);

    expect(scroll.velocity).toBeCloseTo(680, 10);
  });

  it('caps a frame delta at 0.05 seconds', () => {
    const longFrame = releasedScroll();
    const cappedFrame = releasedScroll();

    longFrame.update(10);
    cappedFrame.update(0.05);

    expect(longFrame.offset).toBeCloseTo(cappedFrame.offset, 10);
    expect(longFrame.velocity).toBeCloseTo(cappedFrame.velocity, 10);
  });

  it('does not drag or wheel-scroll short content', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(0);

    expect(scroll.beginDrag(100, 0)).toBe(false);
    scroll.dragTo(0, 10);
    expect(scroll.scrollByElastic(100)).toBe(false);
    scroll.update(1 / 60);

    expect(scroll.offset).toBe(0);
    expect(scroll.velocity).toBe(0);
    expect(scroll.isDragging).toBe(false);
  });
});

function rubberBand(distance, resistance, maxOverscroll) {
  const direction = Math.sign(distance);
  const resistedDistance = Math.abs(distance) * resistance;
  return (
    (direction * maxOverscroll * resistedDistance) /
    (maxOverscroll + resistedDistance)
  );
}

function settle(scroll) {
  for (let frame = 0; frame < 240 && scroll.isAnimating; frame += 1) {
    scroll.update(1 / 60);
  }
}

function releasedScroll() {
  const scroll = new StationScrollPhysics();
  scroll.setMaxOffset(10_000);
  scroll.beginDrag(1000, 0);
  scroll.dragTo(900, 100);
  scroll.endDrag();
  return scroll;
}
