import { describe, expect, it } from 'vitest';

import integrations from './WorkshopWidgets.ui-editor.js';

describe('Workshop widget UI editor integrations', () => {
  it('keeps every reusable Workshop widget independently selectable', () => {
    expect(integrations.map(({ id }) => id)).toEqual([
      'compound.workshop-task-panel',
      'compound.workshop-task-row',
      'compound.workshop-summon-control',
      'compound.root-run-side-action',
      'compound.world-event-donation-option-row',
      'compound.alliance-directory-row',
      'compound.alliance-member-row',
      'compound.potion-discovery-row',
      'compound.workshop-dialog-row',
    ]);
    expect(integrations.every(({ kind, scenarios }) =>
      kind === 'widget' && scenarios.length > 0 &&
      scenarios.every(({ mount }) => typeof mount === 'function')),
    ).toBe(true);
  });
});
