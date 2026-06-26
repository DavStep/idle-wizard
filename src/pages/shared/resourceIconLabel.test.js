// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { setResourceIconText } from './resourceIconLabel.js';

describe('resource icon labels', () => {
  it('marks resource words while preserving text content', () => {
    const element = document.createElement('span');

    setResourceIconText(
      element,
      'cost 10 mana, 2 coin, 5 crystals, 1 emerald, 3 rubies, 4 seeds, and 6 herbs',
    );

    expect(element.textContent).toBe(
      'cost 10 mana, 2 coin, 5 crystals, 1 emerald, 3 rubies, 4 seeds, and 6 herbs',
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
      'seed:regular',
      'herb:sageHerb',
    ]);
    expect(element.querySelector('.style-resource-label--coin')?.textContent).toBe('2 coin');
    expect(element.querySelector('.style-resource-label--coin .style-resource-label__amount')?.textContent).toBe(
      '2',
    );
    expect(element.querySelector('.style-resource-label--crystal')?.textContent).toBe(
      '5 crystals',
    );
    expect(element.querySelector('.style-resource-label--emerald')?.textContent).toBe(
      '1 emerald',
    );
    expect(element.querySelector('.style-resource-label--ruby')?.textContent).toBe('3 rubies');
    expect(element.querySelector('.style-resource-label--seed')?.textContent).toBe('4 seeds');
    expect(
      element.querySelector('.style-resource-label--seed .style-resource-label__icon')?.dataset
        .seedPackItemFrame,
    ).toBe('herb:sageHerb');
    expect(element.querySelector('.style-resource-label--herb')?.textContent).toBe('6 herbs');
    expect(element.querySelector('.style-resource-label--emerald')?.dataset.resourceColor).toBe(
      'emerald',
    );
    expect(element.querySelector('.style-resource-label--seed')?.dataset.resourceColor).toBe(
      'seed',
    );
    expect(element.querySelector('.style-resource-label--herb')?.dataset.resourceColor).toBe(
      'herb',
    );
  });

  it('keeps reward ranges inside colored resource labels', () => {
    const element = document.createElement('span');

    setResourceIconText(element, 'reward: 220-300 coin, 34-50 seeds, or 65-100 herbs');

    expect(element.textContent).toBe('reward: 220-300 coin, 34-50 seeds, or 65-100 herbs');
    expect(element.querySelector('.style-resource-label--coin')?.textContent).toBe(
      '220-300 coin',
    );
    expect(element.querySelector('.style-resource-label--seed')?.textContent).toBe(
      '34-50 seeds',
    );
    expect(element.querySelector('.style-resource-label--herb')?.textContent).toBe(
      '65-100 herbs',
    );
    expect(
      element.querySelector('.style-resource-label--coin .style-resource-label__amount')
        ?.textContent,
    ).toBe('220-300');
    expect(
      element.querySelector('.style-resource-label--seed .style-resource-label__amount')
        ?.textContent,
    ).toBe('34-50');
    expect(
      element.querySelector('.style-resource-label--herb .style-resource-label__amount')
        ?.textContent,
    ).toBe('65-100');
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
