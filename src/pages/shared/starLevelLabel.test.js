// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { formatStarLevel, setStarLevelLabel } from './starLevelLabel.js';

describe('star level labels', () => {
  it('maps levels through the seven star tiers up to level 20', () => {
    expect(formatStarLevel(0)).toMatchObject({
      text: '☆☆☆',
      tone: 'empty',
      starCount: 0,
      ariaLabel: '0 stars',
    });
    expect(formatStarLevel(1)).toMatchObject({
      text: '★',
      tone: 'yellow',
      starCount: 1,
      ariaLabel: 'yellow star 1',
    });
    expect(formatStarLevel(3)).toMatchObject({
      text: '★★★',
      tone: 'yellow',
      starCount: 3,
      ariaLabel: 'yellow star 3',
    });
    expect(formatStarLevel(4)).toMatchObject({
      text: '★',
      tone: 'orange',
      starCount: 1,
      ariaLabel: 'orange star 1',
    });
    expect(formatStarLevel(7)).toMatchObject({
      text: '★',
      tone: 'red',
      starCount: 1,
      ariaLabel: 'red star 1',
    });
    expect(formatStarLevel(10)).toMatchObject({
      text: '★',
      tone: 'purple',
      starCount: 1,
      ariaLabel: 'purple star 1',
    });
    expect(formatStarLevel(12)).toMatchObject({
      text: '★★★',
      tone: 'purple',
      starCount: 3,
      ariaLabel: 'purple star 3',
    });
    expect(formatStarLevel(13)).toMatchObject({
      text: '★',
      tone: 'blue',
      starCount: 1,
      ariaLabel: 'blue star 1',
    });
    expect(formatStarLevel(16)).toMatchObject({
      text: '★',
      tone: 'green',
      starCount: 1,
      ariaLabel: 'green star 1',
    });
    expect(formatStarLevel(19)).toMatchObject({
      text: '★',
      tone: 'silver',
      starCount: 1,
      ariaLabel: 'silver star 1',
    });
    expect(formatStarLevel(20)).toMatchObject({
      text: '★★',
      tone: 'silver',
      starCount: 2,
      ariaLabel: 'silver star 2',
    });
    expect(formatStarLevel(21)).toMatchObject({
      text: '★★',
      tone: 'silver',
      starCount: 2,
      ariaLabel: 'silver star 2',
    });
  });

  it('uses the matching high-tier image in DOM labels', () => {
    const element = document.createElement('span');

    setStarLevelLabel(element, 20);

    expect(element.dataset.starTone).toBe('silver');
    expect(element.dataset.starCount).toBe('2');
    expect(element.querySelectorAll('.style-star-level__image--fill')).toHaveLength(2);
    expect(
      element
        .querySelector('.style-star-level__slot[data-star-filled="true"]')
        ?.querySelector('.style-star-level__image--fill')
        ?.getAttribute('src'),
    ).toContain('star-silver.png');
  });

  it('renders three empty slots for zero stars', () => {
    const element = document.createElement('span');

    setStarLevelLabel(element, 0);

    expect(element.textContent).toBe('☆☆☆');
    expect(element.dataset.starTone).toBe('empty');
    expect(element.dataset.starCount).toBe('0');
    expect(element.dataset.starSlots).toBe('3');
    expect(element.getAttribute('aria-label')).toBe('0 stars');
    expect(element.querySelectorAll('.style-star-level__slot')).toHaveLength(3);
    expect(
      element.querySelectorAll('.style-star-level__slot[data-star-filled="true"]'),
    ).toHaveLength(0);
    expect(element.querySelectorAll('.style-star-level__image--empty')).toHaveLength(3);
    expect(element.querySelectorAll('.style-star-level__image--fill')).toHaveLength(0);
  });

  it('sets text, tier data, and accessible label on an element', () => {
    const element = document.createElement('span');

    setStarLevelLabel(element, 5);

    expect(element.textContent).toBe('★★');
    expect(element.dataset.starTone).toBe('orange');
    expect(element.dataset.starCount).toBe('2');
    expect(element.dataset.starSlots).toBe('3');
    expect(element.getAttribute('aria-label')).toBe('orange star 2');
    expect(element.querySelectorAll('.style-star-level__slot')).toHaveLength(3);
    expect(
      element.querySelectorAll('.style-star-level__slot[data-star-filled="true"]'),
    ).toHaveLength(2);
    expect(element.querySelectorAll('.style-star-level__image--empty')).toHaveLength(3);
    expect(element.querySelectorAll('.style-star-level__image--fill')).toHaveLength(2);
    expect(
      element
        .querySelector('.style-star-level__slot[data-star-filled="true"]')
        ?.querySelector('.style-star-level__image--fill')
        ?.getAttribute('src'),
    ).toContain('star-orange.png');
  });

  it('limits the visible slots for research with two levels', () => {
    const element = document.createElement('span');

    setStarLevelLabel(element, 1, { slotCount: 2 });

    expect(element.textContent).toBe('★');
    expect(element.dataset.starCount).toBe('1');
    expect(element.dataset.starSlots).toBe('2');
    expect(element.querySelectorAll('.style-star-level__slot')).toHaveLength(2);
    expect(
      element.querySelectorAll('.style-star-level__slot[data-star-filled="true"]'),
    ).toHaveLength(1);
    expect(element.querySelectorAll('.style-star-level__image--empty')).toHaveLength(2);
  });
});
