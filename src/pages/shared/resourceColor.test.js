// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { setResourceColor } from './resourceColor.js';

describe('resource colors', () => {
  it('marks potion item labels as potion-colored resources', () => {
    const element = document.createElement('span');

    setResourceColor(element, 'potion');

    expect(element.dataset.resourceColor).toBe('potion');
  });
});
