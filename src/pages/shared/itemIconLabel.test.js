// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { appendTextWithItemIcons, setItemIconLabel } from './itemIconLabel.js';

describe('item icon labels', () => {
  it('marks potion labels with their potion icon while preserving text', () => {
    const element = document.createElement('span');
    element.textContent = 'mana tonic (2)';

    setItemIconLabel(element, 'potion', 'manaTonic');

    const icon = element.querySelector('.style-potion-label__icon');
    expect(element.textContent).toBe('mana tonic (2)');
    expect(element.classList.contains('style-potion-label')).toBe(true);
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('src')).toContain('potion-mana-tonic');
  });

  it('marks herb labels with their herb icon while preserving text', () => {
    const element = document.createElement('span');
    element.textContent = 'sage (6)';

    setItemIconLabel(element, 'herb', 'sageHerb');

    const icon = element.querySelector('.style-herb-label__icon');
    expect(element.textContent).toBe('sage (6)');
    expect(element.classList.contains('style-herb-label')).toBe(true);
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('src')).toContain('herb-sage');
  });

  it('marks seed labels with the seed pack icon while preserving text', () => {
    const element = document.createElement('span');
    element.textContent = 'sage seed (3)';

    setItemIconLabel(element, 'seed', 'sageSeed');

    const icon = element.querySelector('.style-seed-label__icon');
    expect(element.textContent).toBe('sage seed (3)');
    expect(element.classList.contains('style-seed-label')).toBe(true);
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('src')).toContain('seed-pack-regular');
  });

  it('adds potion and seed icons inside mixed text', () => {
    const element = document.createElement('span');

    appendTextWithItemIcons(element, 'brewed mana tonic and found sage seed');

    expect(element.textContent).toBe('brewed mana tonic and found sage seed');
    expect(element.querySelector('.style-potion-label')).not.toBeNull();
    expect(element.querySelector('.style-seed-label')).not.toBeNull();
    expect(element.querySelector('.style-seed-label__icon')).not.toBeNull();
  });

  it('does not mark plural potion category labels as potion names', () => {
    const element = document.createElement('span');

    appendTextWithItemIcons(element, 'potions');

    expect(element.textContent).toBe('potions');
    expect(element.querySelector('.style-potion-label')).toBeNull();
  });
});
