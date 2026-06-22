// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { setResourceIconText } from './resourceIconLabel.js';

describe('resource icon labels', () => {
  it('marks resource words while preserving text content', () => {
    const element = document.createElement('span');

    setResourceIconText(element, 'cost 10 mana, 2 coin, 5 crystals, 1 emerald, and 3 rubies');

    expect(element.textContent).toBe(
      'cost 10 mana, 2 coin, 5 crystals, 1 emerald, and 3 rubies',
    );
    expect(
      [...element.querySelectorAll('.style-resource-label__icon')].map(
        (icon) => icon.dataset.assetAtlasFrame,
      ),
    ).toEqual([
      'resource:mana',
      'resource:coin',
      'resource:crystal',
      'resource:emerald',
      'resource:ruby',
    ]);
    expect(element.querySelector('.style-resource-label--crystal')?.textContent).toBe('crystals');
    expect(element.querySelector('.style-resource-label--emerald')?.textContent).toBe('emerald');
    expect(element.querySelector('.style-resource-label--ruby')?.textContent).toBe('rubies');
    expect(element.querySelector('.style-resource-label--emerald')?.dataset.resourceColor).toBe(
      'emerald',
    );
  });

  it('leaves mana phrases plain when mana is not the resource', () => {
    const element = document.createElement('span');

    setResourceIconText(element, 'mana tonic uses the mana sphere');

    expect(element.textContent).toBe('mana tonic uses the mana sphere');
    expect(element.querySelector('.style-resource-label--mana')).toBeNull();
  });

  it('keeps already-marked unchanged text stable', () => {
    const element = document.createElement('span');

    setResourceIconText(element, '1 coin');
    const coinLabel = element.querySelector('.style-resource-label--coin');

    setResourceIconText(element, '1 coin');

    expect(element.querySelector('.style-resource-label--coin')).toBe(coinLabel);
  });
});
