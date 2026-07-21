// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { UiEditorLayoutOverrideManager } from './UiEditorLayoutOverrideManager.js';

afterEach(() => {
  document.body.replaceChildren();
});

describe('UiEditorLayoutOverrideManager', () => {
  it('applies, serializes, and resets source-unit layout overrides', () => {
    const stage = document.createElement('section');
    const panel = document.createElement('div');
    panel.className = 'workshop-page__tasks';
    panel.style.width = '120px';
    stage.append(panel);
    document.body.append(stage);

    const selector = ':scope > div.workshop-page__tasks';
    const manager = new UiEditorLayoutOverrideManager({ stage });

    manager.update(selector, {
      offsetX: 12.345,
      offsetY: -4,
      width: 180,
      opacity: 1.5,
    });

    expect(panel.style.translate).toBe('12.35px -4px');
    expect(panel.style.width).toBe('180px');
    expect(panel.style.opacity).toBe('1');
    expect(manager.serialize()).toEqual({
      version: 1,
      elements: {
        [selector]: {
          offsetX: 12.35,
          offsetY: -4,
          width: 180,
          opacity: 1,
        },
      },
    });

    manager.reset(selector);

    expect(panel.style.translate).toBe('');
    expect(panel.style.width).toBe('120px');
    expect(manager.serialize().elements).toEqual({});
  });

  it('can replace an image asset without losing its authored source on reset', () => {
    const stage = document.createElement('section');
    const image = document.createElement('img');
    image.className = 'room-top-panel__level-star';
    image.src = '/ui/old.webp';
    stage.append(image);
    document.body.append(stage);

    const selector = ':scope > img.room-top-panel__level-star';
    const manager = new UiEditorLayoutOverrideManager({ stage });
    manager.update(selector, { asset: '/ui/new.webp' });

    expect(image.getAttribute('src')).toBe('/ui/new.webp');

    manager.reset(selector);

    expect(image.getAttribute('src')).toBe('/ui/old.webp');
  });
});
