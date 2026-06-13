// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { setResourceIconText } from './resourceIconLabel.js';

describe('resource icon labels', () => {
  it('marks gold words and leaves mana plain while preserving text content', () => {
    const element = document.createElement('span');

    setResourceIconText(element, 'cost 10 mana and 2 gold');

    expect(element.textContent).toBe('cost 10 mana and 2 gold');
    expect(element.querySelector('.style-resource-label--mana')).toBeNull();
    expect(element.querySelector('.style-resource-label--gold')).not.toBeNull();
    expect(
      element.querySelector('.style-resource-label--gold .style-resource-label__icon'),
    ).not.toBeNull();
  });

  it('keeps already-marked unchanged text stable', () => {
    const element = document.createElement('span');

    setResourceIconText(element, '1 gold');
    const goldLabel = element.querySelector('.style-resource-label--gold');

    setResourceIconText(element, '1 gold');

    expect(element.querySelector('.style-resource-label--gold')).toBe(goldLabel);
  });
});
