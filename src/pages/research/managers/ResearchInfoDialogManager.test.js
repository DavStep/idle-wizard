// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { ResearchInfoDialogManager } from './ResearchInfoDialogManager.js';

describe('ResearchInfoDialogManager', () => {
  it('shows lock reasons alongside research descriptions', () => {
    const manager = new ResearchInfoDialogManager();
    const stage = document.createElement('section');

    manager.mount(stage);
    manager.show({
      label: 'minor healing potion',
      description: 'allows valid cauldron ingredients to brew minor healing potion.',
      lockReason: 'requires mana tonic research and level 5.',
    });

    const popup = stage.querySelector('.research-page__info-popup');

    expect(popup?.hidden).toBe(false);
    expect(popup?.querySelector('[role="dialog"]')).not.toBeNull();
    expect(popup?.textContent).toContain(
      'allows valid cauldron ingredients to brew minor healing potion.',
    );
    expect(popup?.textContent).toContain(
      'requires mana tonic research and level 5.',
    );
  });

  it('labels emerald upgrade information as level up information', () => {
    const manager = new ResearchInfoDialogManager();
    const stage = document.createElement('section');

    manager.mount(stage);
    manager.show({
      label: 'plot 1 lvl 2',
      actionType: 'levelUp',
      description:
        'levels plot 1 to lvl 2: it uses 2 seeds and harvests 2 herbs in one growth timer.',
    });

    const dialog = stage.querySelector('[role="dialog"]');

    expect(dialog?.getAttribute('aria-label')).toBe(
      'plot 1 lvl 2 level up information',
    );
    expect(dialog?.textContent).toContain('plot 1 lvl 2');
    expect(dialog?.textContent).toContain('levels plot 1 to lvl 2');
  });
});
