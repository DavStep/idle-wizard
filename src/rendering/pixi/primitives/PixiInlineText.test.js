// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import { PixiInlineText } from './PixiInlineText.js';

installPixiPageTestCanvas();

const TEST_STYLE = Object.freeze({
  fontFamily: 'Arial',
  fontSize: 11,
  fontWeight: '400',
  fill: '#ffffff',
  lineHeight: 13,
});

describe('PixiInlineText', () => {
  it('reserves the rendered icon width between adjacent text runs', () => {
    const inline = new PixiInlineText({
      runs: [
        { kind: 'text', text: 'reached ' },
        {
          kind: 'icon',
          texture: Texture.WHITE,
          fallbackText: '⭐',
          size: 12,
        },
        { kind: 'text', text: ' 4 times' },
      ],
      style: TEST_STYLE,
      wrapWidth: 160,
    });

    const icon = inline.iconObjects[0];
    const followingText = inline.textObjects.find(
      (textObject) =>
        textObject.visible && textObject.text.startsWith('4'),
    );

    expect(inline.text).toBe('reached ⭐ 4 times');
    expect(icon.visible).toBe(true);
    expect(followingText).toBeDefined();
    expect(icon.x + icon.width / 2).toBeLessThan(followingText.x);
    expect(icon.y).toBeGreaterThan(0);
    expect(icon.y).toBeLessThan(TEST_STYLE.lineHeight);

    inline.destroy({ children: true });
  });

  it('wraps text and icon runs as one ordered flow', () => {
    const inline = new PixiInlineText({
      runs: [
        { kind: 'text', text: 'A ' },
        {
          kind: 'icon',
          texture: Texture.WHITE,
          fallbackText: '★',
          size: 12,
        },
        { kind: 'text', text: ' B' },
      ],
      style: TEST_STYLE,
      wrapWidth: 25,
    });
    const icon = inline.iconObjects[0];
    const followingText = inline.textObjects.find(
      (textObject) =>
        textObject.visible && textObject.text.startsWith('B'),
    );

    expect(followingText.y).toBeGreaterThanOrEqual(
      icon.y + icon.height / 2,
    );
    expect(inline.layoutHeight).toBeGreaterThan(TEST_STYLE.lineHeight);

    inline.destroy({ children: true });
  });

  it('supports multiple icon runs in one message', () => {
    const inline = new PixiInlineText({
      runs: [
        { kind: 'text', text: 'gain ' },
        {
          kind: 'icon',
          texture: Texture.WHITE,
          fallbackText: '★',
          size: 10,
        },
        { kind: 'text', text: ' and ' },
        {
          kind: 'icon',
          texture: Texture.WHITE,
          fallbackText: '◆',
          size: 8,
        },
      ],
      style: TEST_STYLE,
      wrapWidth: 120,
    });

    expect(inline.text).toBe('gain ★ and ◆');
    expect(inline.iconObjects).toHaveLength(2);
    expect(inline.iconObjects[0].x).toBeLessThan(
      inline.iconObjects[1].x,
    );

    inline.destroy({ children: true });
  });

  it('uses text fallback when an icon texture is unavailable', () => {
    const inline = new PixiInlineText({
      runs: [
        { kind: 'text', text: 'prestige ' },
        {
          kind: 'icon',
          texture: Texture.EMPTY,
          fallbackText: '⭐',
          size: 12,
        },
      ],
      style: TEST_STYLE,
      wrapWidth: 100,
    });

    expect(inline.text).toBe('prestige ⭐');
    expect(inline.iconObjects).toHaveLength(0);
    expect(
      inline.textObjects.some(
        (textObject) =>
          textObject.visible && textObject.text.includes('⭐'),
      ),
    ).toBe(true);

    inline.destroy({ children: true });
  });

  it('reuses retained children when message runs are rebound', () => {
    const inline = new PixiInlineText({
      runs: [
        { kind: 'text', text: 'first message' },
        {
          kind: 'icon',
          texture: Texture.WHITE,
          fallbackText: '★',
          size: 12,
        },
      ],
      style: TEST_STYLE,
      wrapWidth: 120,
    });
    const firstTextObject = inline.textObjects[0];
    const firstIconObject = inline.iconObjects[0];

    inline.setRuns([
      { kind: 'text', text: 'next message' },
      {
        kind: 'icon',
        texture: Texture.WHITE,
        fallbackText: '★',
        size: 10,
      },
    ]);

    expect(inline.textObjects[0]).toBe(firstTextObject);
    expect(inline.iconObjects[0]).toBe(firstIconObject);
    expect(inline.text).toBe('next message★');

    inline.destroy({ children: true });
  });
});
