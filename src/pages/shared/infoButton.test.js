// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { setInfoButtonIcon } from './infoButton.js';

describe('setInfoButtonIcon', () => {
  it('replaces text glyphs with the shared accessible info asset', () => {
    const button = document.createElement('button');
    button.textContent = '[I]';
    button.setAttribute('aria-label', 'Show Information');

    const image = setInfoButtonIcon(button);

    expect(button.classList.contains('style-info-button')).toBe(true);
    expect(button.textContent).toBe('');
    expect(button.getAttribute('aria-label')).toBe('Show Information');
    expect(image).toBe(button.querySelector('.style-info-button__icon'));
    expect(image?.getAttribute('src')).toMatch(/prop_info\.png$/);
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('aria-hidden')).toBe('true');
  });
});
