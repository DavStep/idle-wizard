// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import integrations from './ResearchWidgets.ui-editor.js';

describe('ResearchWidgets UI editor integrations', () => {
  it('exposes every retained Research compound independently', () => {
    const entries = new Map(integrations.map((entry) => [entry.id, entry]));

    expect([...entries.keys()]).toEqual([
      'compound.research-row',
      'compound.research-station-title',
      'compound.research-station-box',
      'compound.research-lock-tooltip',
    ]);
    expect(entries.get('compound.research-station-box')?.childWidgetIds).toEqual([
      'compound.research-station-title',
      'compound.research-row',
    ]);
    expect(
      [...entries.values()].every(
        ({ createThumbnail, kind, scenarios }) =>
          kind === 'widget' &&
          typeof createThumbnail === 'function' &&
          scenarios.length > 0,
      ),
    ).toBe(true);
  });
});
