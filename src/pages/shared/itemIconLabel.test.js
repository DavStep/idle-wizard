// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  appendTextWithItemIcons,
  setItemIconLabel,
  setTextWithItemIcons,
} from './itemIconLabel.js';

describe('item icon labels', () => {
  it('marks potion labels with their potion icon while preserving text', () => {
    const element = document.createElement('span');
    element.textContent = 'mana tonic (2)';

    setItemIconLabel(element, 'potion', 'manaTonic');

    const icon = element.querySelector('.style-potion-label__icon');
    expect(element.textContent).toBe('mana tonic (2)');
    expect(element.classList.contains('style-potion-label')).toBe(true);
    expect(icon).not.toBeNull();
    expect(icon?.dataset.assetAtlasFrame).toBe('potion:manaTonic');
  });

  it('marks revealed hidden potion labels with their own potion icons', () => {
    const hiddenPotions = [
      ['ashen memory', 'ashenMemory'],
      ['silverleaf quiet', 'silverleafQuiet'],
      ['ember sight', 'emberSight'],
      ['thorn sleep', 'thornSleep'],
      ['glass moon elixir', 'glassMoonElixir'],
      ['rootbound resolve', 'rootboundResolve'],
      ['night orchard tonic', 'nightOrchardTonic'],
      ['starless courage', 'starlessCourage'],
      ['frostvein draught', 'frostveinDraught'],
      ['bloodlight ward', 'bloodlightWard'],
    ];

    for (const [label, key] of hiddenPotions) {
      const element = document.createElement('span');
      element.textContent = label;

      setItemIconLabel(element, 'potion', key);

      const icon = element.querySelector('.style-potion-label__icon');
      expect(element.textContent).toBe(label);
      expect(icon).not.toBeNull();
      expect(icon?.dataset.assetAtlasFrame).toBe(`potion:${key}`);
    }
  });

  it('marks herb labels with their herb icon while preserving text', () => {
    const element = document.createElement('span');
    element.textContent = 'sage (6)';

    setItemIconLabel(element, 'herb', 'sageHerb');

    const icon = element.querySelector('.style-herb-label__icon');
    expect(element.textContent).toBe('sage (6)');
    expect(element.classList.contains('style-herb-label')).toBe(true);
    expect(icon).not.toBeNull();
    expect(icon?.dataset.assetAtlasFrame).toBe('herb:sageHerb');
  });

  it('marks late-game herb and potion labels with item icons', () => {
    const herb = document.createElement('span');
    herb.textContent = 'pearlroot';
    const potion = document.createElement('span');
    potion.textContent = 'pearlroot draught';

    setItemIconLabel(herb, 'herb', 'pearlrootHerb');
    setItemIconLabel(potion, 'potion', 'pearlrootDraught');

    expect(herb.querySelector('.style-herb-label__icon')?.dataset.assetAtlasFrame).toBe(
      'herb:pearlrootHerb',
    );
    expect(potion.querySelector('.style-potion-label__icon')?.dataset.assetAtlasFrame).toBe(
      'potion:pearlrootDraught',
    );
  });

  it('marks seed labels with the seed pack icon while preserving text', () => {
    const element = document.createElement('span');
    element.textContent = 'sage seed (3)';

    setItemIconLabel(element, 'seed', 'sageSeed');

    const icon = element.querySelector('.style-seed-label__icon');
    expect(element.textContent).toBe('sage seed (3)');
    expect(element.classList.contains('style-seed-label')).toBe(true);
    expect(icon).not.toBeNull();
    expect(icon?.dataset.assetAtlasFrame).toBe('seed:regular');
  });

  it('adds potion, herb, seed, and resource icons inside mixed text', () => {
    const element = document.createElement('span');

    appendTextWithItemIcons(
      element,
      'brewed mana tonic, harvested sage, found star anise seed, sold mint seed for 2 coin, 5 crystals, and 3 rubies',
    );

    expect(element.textContent).toBe(
      'brewed mana tonic, harvested sage, found star anise seed, sold mint seed for 2 coin, 5 crystals, and 3 rubies',
    );
    expect(element.querySelector('.style-potion-label')).not.toBeNull();
    expect(element.querySelector('.style-herb-label')).not.toBeNull();
    expect(element.querySelector('.style-seed-label')).not.toBeNull();
    expect(element.querySelector('.style-resource-label--coin')).not.toBeNull();
    expect(element.querySelector('.style-resource-label--crystal')).not.toBeNull();
    expect(element.querySelector('.style-resource-label--ruby')).not.toBeNull();
    expect(element.querySelector('.style-resource-label--mana')).toBeNull();
    expect(element.querySelector('.style-seed-label__icon')).not.toBeNull();
    expect(element.querySelector('.style-herb-label')?.textContent).toBe('sage');
    expect(element.querySelector('.style-seed-label')?.textContent).toBe('star anise seed');
  });

  it('does not mark plural potion category labels as potion names', () => {
    const element = document.createElement('span');

    appendTextWithItemIcons(element, 'potions');

    expect(element.textContent).toBe('potions');
    expect(element.querySelector('.style-potion-label')).toBeNull();
  });

  it('keeps quantity prefixes before herb icons', () => {
    const element = document.createElement('span');

    setTextWithItemIcons(element, '- 3 sage');

    expect(element.textContent).toBe('- 3 sage');
    expect(element.childNodes[0]?.textContent).toBe('- 3 ');
    expect(element.childNodes[1]?.classList.contains('style-herb-label')).toBe(true);
    expect(element.querySelector('.style-herb-label__icon')).not.toBeNull();
  });
});
