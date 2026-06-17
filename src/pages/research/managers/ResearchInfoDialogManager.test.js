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
});
