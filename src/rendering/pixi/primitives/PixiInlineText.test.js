// @vitest-environment jsdom

import { Sprite, Texture } from 'pixi.js';
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

  it('keeps differently styled text runs in one measured wrapping flow', () => {
    const inline = new PixiInlineText({
      runs: [
        {
          kind: 'text',
          text: 'Mira',
          style: { fill: '#72533a', fontWeight: '700' },
        },
        { kind: 'text', text: ' was approved by ' },
        {
          kind: 'text',
          text: 'Luna',
          style: { fill: '#72533a', fontWeight: '700' },
        },
        { kind: 'text', text: ' and joined the alliance.' },
      ],
      style: TEST_STYLE,
      wrapWidth: 180,
    });

    const highlighted = inline.textObjects.filter(
      (textObject) => textObject.visible && textObject.style.fill === '#72533a',
    );

    expect(inline.text).toBe(
      'Mira was approved by Luna and joined the alliance.',
    );
    expect(highlighted.map((textObject) => textObject.text)).toEqual([
      'Mira',
      'Luna',
    ]);
    expect(inline.layoutHeight).toBeGreaterThan(TEST_STYLE.lineHeight);

    inline.destroy({ children: true });
  });

  it('measures retained widgets between adjacent text runs and hides them on rebind', () => {
    const avatar = new Sprite(Texture.WHITE);
    const inline = new PixiInlineText({
      runs: [
        { kind: 'text', text: 'Welcome ' },
        {
          kind: 'widget',
          displayObject: avatar,
          fallbackText: '[Mira]',
          label: 'Mira avatar',
          size: 12,
        },
        { kind: 'text', text: ' Mira' },
      ],
      style: TEST_STYLE,
      wrapWidth: 160,
    });
    const followingText = inline.textObjects.find(
      (textObject) => textObject.visible && textObject.text.startsWith('Mira'),
    );

    expect(inline.text).toBe('Welcome [Mira] Mira');
    expect(inline.widgetObjects).toEqual([avatar]);
    expect(avatar.parent).toBe(inline);
    expect(avatar.visible).toBe(true);
    expect(avatar.width).toBe(12);
    expect(avatar.height).toBe(12);
    expect(followingText).toBeDefined();
    expect(avatar.x + avatar.width).toBeLessThan(followingText.x);

    inline.setRuns([{ kind: 'text', text: 'No avatar' }]);
    expect(avatar.visible).toBe(false);
    expect(avatar.renderable).toBe(false);

    inline.setRuns([
      { kind: 'widget', displayObject: avatar, fallbackText: '[Mira]', size: 12 },
    ]);
    expect(inline.widgetObjects).toEqual([avatar]);
    expect(avatar.visible).toBe(true);

    inline.destroy({ children: true });
  });

  it('uses widget fallback text when a run has no resolved display object', () => {
    const inline = new PixiInlineText({
      runs: [
        { kind: 'text', text: 'Welcome ' },
        {
          kind: 'widget',
          displayObject: null,
          fallbackText: '[player]',
        },
      ],
      style: TEST_STYLE,
      wrapWidth: 120,
    });

    expect(inline.text).toBe('Welcome [player]');
    expect(inline.widgetObjects).toHaveLength(0);
    expect(
      inline.textObjects.some(
        (textObject) =>
          textObject.visible && textObject.text.includes('[player]'),
      ),
    ).toBe(true);

    inline.destroy({ children: true });
  });
});
