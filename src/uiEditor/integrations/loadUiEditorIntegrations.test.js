// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { loadUiEditorIntegrations } from './loadUiEditorIntegrations.js';
import {
  createUiEditorIntegrationEntries,
} from '../sdk/createUiEditorIntegrationEntries.js';

describe('loadUiEditorIntegrations', () => {
  it('discovers colocated primitive and feature integrations without a central list', () => {
    const ids = loadUiEditorIntegrations().map(({ id }) => id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'feature.brewing-hud',
        'feature.research-room',
        'primitive.data-dialog',
        'primitive.progress-bar',
        'primitive.settings-slider',
      ]),
    );
  });

  it('projects production progress and slider thumbnails into library entries', () => {
    const entries = createUiEditorIntegrationEntries(
      loadUiEditorIntegrations(),
    );
    const progress = entries.find(
      ({ integrationId }) => integrationId === 'primitive.progress-bar',
    );
    const slider = entries.find(
      ({ integrationId }) => integrationId === 'primitive.settings-slider',
    );

    expect(progress?.createThumbnail).toEqual(expect.any(Function));
    expect(slider?.createThumbnail).toEqual(expect.any(Function));
    expect(progress.createThumbnail().dataset.editorLibraryThumbnail).toBe(
      'primitive.progress-bar',
    );
    expect(slider.createThumbnail().dataset.editorLibraryThumbnail).toBe(
      'primitive.settings-slider',
    );
  });
});
