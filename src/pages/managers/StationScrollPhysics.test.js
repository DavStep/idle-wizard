import { describe, expect, it } from 'vitest';
import { StationScrollPhysics } from './StationScrollPhysics.js';

describe('StationScrollPhysics', () => {
  it('continues with inertia after a quick finger release', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);
    scroll.beginDrag(600, 0);
    scroll.dragTo(500, 100);
    const releasedOffset = scroll.offset;

    scroll.endDrag();
    scroll.update(0.1);

    expect(scroll.offset).toBeGreaterThan(releasedOffset);
  });

  it('rubber-bands past the top and settles back', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);
    scroll.beginDrag(200, 0);
    scroll.dragTo(360, 120);

    expect(scroll.offset).toBeLessThan(0);
    expect(scroll.offset).toBeLessThan(-100);
    expect(scroll.offset).toBeGreaterThan(-230);

    scroll.endDrag();
    for (let i = 0; i < 120; i += 1) {
      scroll.update(1 / 60);
    }

    expect(Math.abs(scroll.offset)).toBeLessThan(1);
  });

  it('rubber-bands past the bottom and settles back', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);
    scroll.snapTo(1000);
    scroll.beginDrag(360, 0);
    scroll.dragTo(200, 120);

    expect(scroll.offset).toBeGreaterThan(1000);
    expect(scroll.offset).toBeLessThan(1160);

    scroll.endDrag();
    for (let i = 0; i < 80; i += 1) {
      scroll.update(1 / 60);
    }

    expect(Math.abs(scroll.offset - 1000)).toBeLessThan(1);
  });

  it('gets progressively harder to pull farther past an edge', () => {
    const scroll = new StationScrollPhysics({
      progressiveEdgeResistance: true,
    });
    scroll.setMaxOffset(1000);
    scroll.beginDrag(200, 0);

    scroll.dragTo(250, 20);
    const firstPull = Math.abs(scroll.offset);
    scroll.dragTo(300, 40);
    const secondPull = Math.abs(scroll.offset) - firstPull;
    scroll.dragTo(350, 60);
    const thirdPull = Math.abs(scroll.offset) - firstPull - secondPull;

    expect(firstPull).toBeGreaterThan(secondPull);
    expect(secondPull).toBeGreaterThan(thirdPull);
    expect(scroll.offset).toBeGreaterThan(-220);
  });

  it('allows elastic wheel overscroll and springs it back', () => {
    const scroll = new StationScrollPhysics();
    scroll.setMaxOffset(1000);
    scroll.scrollByElastic(-180);

    expect(scroll.offset).toBeLessThan(0);

    for (let i = 0; i < 120; i += 1) {
      scroll.update(1 / 60);
    }

    expect(Math.abs(scroll.offset)).toBeLessThan(1);
  });

  it('supports the station fast edge spring without changing the default tuning', () => {
    const scroll = new StationScrollPhysics({
      topEdgeSpringStiffness: 520,
      topEdgeSpringDamping: 26,
      bottomEdgeSpringStiffness: 520,
      bottomEdgeSpringDamping: 26,
    });
    scroll.setMaxOffset(1000);
    scroll.scrollByElastic(-180);

    for (let i = 0; i < 12; i += 1) {
      scroll.update(1 / 60);
    }
    expect(scroll.offset).toBe(0);

    scroll.snapTo(1000);
    scroll.scrollByElastic(180);
    for (let i = 0; i < 12; i += 1) {
      scroll.update(1 / 60);
    }
    expect(scroll.offset).toBe(1000);
  });
});
