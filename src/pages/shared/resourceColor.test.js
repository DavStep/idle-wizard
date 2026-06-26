// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { setResourceColor, setResourceColorFromText } from './resourceColor.js';

describe('resource colors', () => {
  it('keeps potion item labels marked with potion metadata', () => {
    const element = document.createElement('span');

    setResourceColor(element, 'potion');

    expect(element.dataset.resourceColor).toBe('potion');
  });

  it('marks plural crystals as crystal-colored resources', () => {
    const element = document.createElement('span');

    setResourceColorFromText(element, '5 crystals');

    expect(element.dataset.resourceColor).toBe('crystal');
  });
});
