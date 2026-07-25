// @vitest-environment jsdom

import { Container, Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';

import {
  createPixiAssetManagerFake,
  installPixiPageTestCanvas,
} from '../workshop/PixiPageTestHarness.js';
import { ResearchInfoDialogPixi } from './ResearchInfoDialogPixi.js';

installPixiPageTestCanvas();

describe('ResearchInfoDialogPixi', () => {
  it('matches the DOM content box, asymmetric padding, and copy wrap', () => {
    const parent = new Container();
    const dialog = new ResearchInfoDialogPixi({
      parent,
      assetManager: createPixiAssetManagerFake(Texture),
    });

    dialog.bind({
      label: 'mint',
      copy: 'learn to grow mint.',
    });

    expect(dialog.frame).toMatchObject({
      contentBoxWidth: 304,
      contentBoxHeight: 53,
      outerWidth: 344,
      outerHeight: 93,
    });
    expect(dialog.frame.content.position).toMatchObject({
      x: 20,
      y: 25,
    });
    expect(dialog.copy.style).toMatchObject({
      wordWrap: true,
      wordWrapWidth: 304,
    });
    expect(dialog.copy.position.x).toBe(0);
    expect(dialog.copy.position.y).toBeCloseTo(
      (53 - dialog.copy.height) / 2,
    );
    expect(dialog.frame.position.x).toBe(8);
    expect(dialog.frame.position.y).toBeCloseTo(
      (2170 / 3 - 93) / 2,
    );

    dialog.destroy();
  });

  it('grows only the content box when wrapped copy exceeds its minimum', () => {
    const parent = new Container();
    const dialog = new ResearchInfoDialogPixi({
      parent,
      assetManager: createPixiAssetManagerFake(Texture),
    });

    dialog.bind({
      label: 'mana capacity',
      copy: Array.from(
        { length: 16 },
        () => 'mana capacity expands this research record.',
      ).join(' '),
    });

    const expectedContentHeight = Math.ceil(dialog.copy.height);
    expect(expectedContentHeight).toBeGreaterThan(53);
    expect(dialog.copy.width).toBeLessThanOrEqual(304);
    expect(dialog.frame.contentBoxHeight).toBe(expectedContentHeight);
    expect(dialog.frame.outerHeight).toBe(
      expectedContentHeight + 25 + 15,
    );
    expect(dialog.copy.position.y).toBeCloseTo(
      (expectedContentHeight - dialog.copy.height) / 2,
    );

    dialog.destroy();
  });
});
