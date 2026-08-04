import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';

import {
  assertNineSliceCompatibility,
  resolveNineSliceMinimumSize,
  validateNineSliceCompatibility,
} from './NineSliceCompatibility.js';
import { PixiNineSliceFrame } from '../primitives/PixiNineSliceFrame.js';

describe('NineSliceCompatibility', () => {
  it('derives the logical minimum from output borders, not source slices', () => {
    expect(
      resolveNineSliceMinimumSize({
        outputInsets: {
          top: 17,
          right: 7,
          bottom: 12,
          left: 20,
        },
      }),
    ).toEqual({
      width: 28,
      height: 30,
    });
  });

  it('rejects a widget contract that would collapse protected output borders', () => {
    const result = validateNineSliceCompatibility({
      assetId: 'green-button.9.png',
      outputInsets: {
        top: 17,
        right: 7,
        bottom: 12,
        left: 20,
      },
      targetLabel: 'Footer tab',
      targetSize: {
        width: 92,
        height: 28,
      },
    });

    expect(result.compatible).toBe(false);
    expect(result.minimumSize).toEqual({
      width: 28,
      height: 30,
    });
    expect(result.message).toBe(
      'Nine-slice "green-button.9.png" requires at least 28×30, '
      + 'but Footer tab can be as small as 92×28.',
    );
  });

  it('accepts a widget contract at the exact minimum', () => {
    expect(() =>
      assertNineSliceCompatibility({
        outputInsets: {
          top: 13,
          right: 7,
          bottom: 9,
          left: 20,
        },
        targetSize: {
          width: 28,
          height: 23,
        },
      }),
    ).not.toThrow();
  });

  it('keeps a Pixi frame on its last valid size when a skin cannot fit', () => {
    const frame = new PixiNineSliceFrame({
      borderInsets: {
        top: 17,
        right: 7,
        bottom: 12,
        left: 20,
      },
      height: 36,
      label: 'Green button',
      sourceInsets: {
        top: 100,
        right: 43,
        bottom: 68,
        left: 85,
      },
      texture: Texture.EMPTY,
      width: 100,
    });

    expect(() => frame.setSize(92, 28)).toThrow(
      /requires at least 27×29/,
    );
    expect(frame.frameWidth).toBe(100);
    expect(frame.frameHeight).toBe(36);

    expect(() =>
      frame.setSkin({
        assetId: 'regular-button.9.png',
        borderInsets: {
          top: 17,
          right: 7,
          bottom: 12,
          left: 20,
        },
        height: 28,
        sourceInsets: {
          top: 12,
          right: 12,
          bottom: 12,
          left: 12,
        },
        texture: Texture.WHITE,
        width: 92,
      }),
    ).toThrow(/requires at least 27×29/);
    expect(frame.texture).toBe(Texture.EMPTY);
    expect(frame.sourceInsets.left).toBe(85);
  });

  it('allows an empty pre-layout frame but validates its first visible size', () => {
    const frame = new PixiNineSliceFrame({
      borderInsets: {
        top: 17,
        right: 7,
        bottom: 12,
        left: 20,
      },
      sourceInsets: {
        top: 100,
        right: 43,
        bottom: 68,
        left: 85,
      },
      texture: Texture.EMPTY,
    });

    expect(frame).toMatchObject({
      compatibilityError: null,
      frameHeight: 0,
      frameWidth: 0,
    });
    expect(() => frame.setSize(92, 28)).toThrow(
      /requires at least 27×29/,
    );
  });
});
