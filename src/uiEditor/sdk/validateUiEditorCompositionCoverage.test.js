import { describe, expect, it } from 'vitest';

import {
  validateUiEditorCompositionCoverage,
} from './validateUiEditorCompositionCoverage.js';

function widget(id, overrides = {}) {
  return {
    childWidgetIds: [],
    createThumbnail: () => document.createElement('span'),
    id,
    kind: 'widget',
    ...overrides,
  };
}

describe('validateUiEditorCompositionCoverage', () => {
  it('accepts a production composition whose children are selectable widgets', () => {
    expect(() =>
      validateUiEditorCompositionCoverage([
        widget('cost-button'),
        widget('lab:compound.research-row', {
          childWidgetIds: ['cost-button'],
          integrationId: 'compound.research-row',
        }),
        {
          childWidgetIds: ['compound.research-row'],
          id: 'lab:feature.research-room',
          integrationId: 'feature.research-room',
          kind: 'scene',
        },
      ]),
    ).not.toThrow();
  });

  it('rejects missing, non-widget, hidden, and self-referential children', () => {
    expect(() =>
      validateUiEditorCompositionCoverage([
        {
          childWidgetIds: ['missing-widget'],
          id: 'lab:feature.room',
          integrationId: 'feature.room',
          kind: 'scene',
        },
      ]),
    ).toThrow('missing child widget: missing-widget');

    expect(() =>
      validateUiEditorCompositionCoverage([
        { id: 'lab:dialog.child', integrationId: 'dialog.child', kind: 'dialog' },
        {
          childWidgetIds: ['dialog.child'],
          id: 'lab:feature.room',
          integrationId: 'feature.room',
          kind: 'scene',
        },
      ]),
    ).toThrow('must be a widget');

    expect(() =>
      validateUiEditorCompositionCoverage([
        widget('hidden-widget', { createThumbnail: null }),
        {
          childWidgetIds: ['hidden-widget'],
          id: 'lab:feature.room',
          integrationId: 'feature.room',
          kind: 'scene',
        },
      ]),
    ).toThrow('must provide a library thumbnail');

    expect(() =>
      validateUiEditorCompositionCoverage([
        widget('lab:feature.room', {
          childWidgetIds: ['feature.room'],
          integrationId: 'feature.room',
        }),
      ]),
    ).toThrow('cannot reference itself');
  });
});
