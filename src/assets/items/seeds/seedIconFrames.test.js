import { describe, expect, it } from 'vitest';

import {
  SEED_PACK_ASPECT_RATIO,
  getSeedPackIconFrames,
  getSeedPackIconLayout,
} from './seedIconFrames.js';

describe('seed pack icon contract', () => {
  it('uses one pack frame and places the herb mark on the pack body', () => {
    expect(
      getSeedPackIconFrames({
        key: 'sageSeed',
        label: 'Sage Seed',
      }),
    ).toEqual({
      base: 'seed:pack',
      item: 'herb:sageHerb',
    });

    const layout = getSeedPackIconLayout({
      x: 20,
      y: 30,
      width: 40,
      height: 40,
    });

    expect(layout.base.width / layout.base.height).toBeCloseTo(
      SEED_PACK_ASPECT_RATIO,
    );
    expect(layout.item.centerX).toBeCloseTo(
      layout.base.x + layout.base.width / 2,
    );
    expect(layout.item.centerY).toBeCloseTo(
      layout.base.y + layout.base.height * 0.63,
    );
    expect(layout.item.centerY).toBeGreaterThan(
      layout.base.y + layout.base.height / 2,
    );
    expect(layout.item.size / layout.base.width).toBeCloseTo(0.44);
    expect(layout.item.rotationDegrees).toBe(6);
  });
});
