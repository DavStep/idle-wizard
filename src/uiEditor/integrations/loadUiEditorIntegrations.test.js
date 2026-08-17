// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { loadUiEditorIntegrations } from './loadUiEditorIntegrations.js';
import {
  createUiEditorIntegrationEntries,
} from '../sdk/createUiEditorIntegrationEntries.js';
import {
  validateUiEditorCompositionCoverage,
} from '../sdk/validateUiEditorCompositionCoverage.js';
import {
  createIdleWizardButtonEntries,
} from '../catalog/createIdleWizardButtonEntries.js';
import {
  UI_EDITOR_RETAINED_DIALOG_IDS,
} from '../../rendering/pixi/RetainedDialogs.ui-editor.js';

describe('loadUiEditorIntegrations', () => {
  it('discovers colocated primitive and feature integrations without a central list', () => {
    const ids = loadUiEditorIntegrations().map(({ id }) => id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'feature.brewing-hud',
        'feature.research-room',
        'compound.dialog-frame',
        'compound.bottom-room-tab',
        'compound.bottom-room-tabs',
        'compound.device-preferences',
        'compound.hud-currency-capsule',
        'compound.hud-level-rail',
        'compound.research-row',
        'compound.research-station-title',
        'primitive.data-dialog',
        'primitive.inline-text',
        'primitive.managed-scroll-area',
        'primitive.progress-bar',
        'primitive.resource-label',
        'primitive.settings-toggle',
        'primitive.settings-slider',
        'primitive.star-level-label',
        'primitive.text-field',
        'primitive.text-label',
      ]),
    );
  });

  it('keeps every large preview linked to selectable child widgets', () => {
    const integrations = loadUiEditorIntegrations();
    const largePreviews = integrations.filter(
      ({ id, kind }) =>
        kind === 'scene' || kind === 'dialog' || id.startsWith('feature.'),
    );

    expect(largePreviews.length).toBeGreaterThan(0);
    expect(
      largePreviews.every(({ childWidgetIds }) => childWidgetIds.length > 0),
    ).toBe(true);
    expect(() =>
      validateUiEditorCompositionCoverage([
        ...createIdleWizardButtonEntries(),
        ...createUiEditorIntegrationEntries(integrations),
      ]),
    ).not.toThrow();
  });

  it('keeps the foundational widget batch grouped and independently selectable', () => {
    const integrations = loadUiEditorIntegrations();
    const expected = new Map([
      ['compound.bottom-room-tab', { folderPath: ['Navigation'], sectionId: 'composite-widgets' }],
      ['compound.bottom-room-tabs', { folderPath: ['Navigation'], sectionId: 'composite-widgets' }],
      ['compound.device-preferences', { folderPath: ['Settings'], sectionId: 'composite-widgets' }],
      ['compound.hud-currency-capsule', { folderPath: ['HUD'], sectionId: 'composite-widgets' }],
      ['primitive.inline-text', { folderPath: ['Text'], sectionId: 'composite-widgets' }],
      ['primitive.managed-scroll-area', { folderPath: ['Scrolling'], sectionId: 'composite-widgets' }],
      ['primitive.resource-label', { folderPath: ['Text'], sectionId: 'composite-widgets' }],
      ['primitive.settings-toggle', { folderPath: ['Settings'], sectionId: 'composite-widgets' }],
      ['primitive.star-level-label', { folderPath: ['Text'], sectionId: 'composite-widgets' }],
      ['primitive.text-field', { folderPath: ['Inputs'], sectionId: 'composite-widgets' }],
      ['primitive.text-label', { folderPath: ['Text'], sectionId: 'composite-widgets' }],
    ]);

    for (const [id, { folderPath, sectionId }] of expected) {
      const integration = integrations.find((candidate) => candidate.id === id);

      expect(integration, id).toBeDefined();
      expect(integration.kind, id).toBe('widget');
      expect(integration.sectionId, id).toBe(sectionId);
      expect(integration.folderPath, id).toEqual(folderPath);
      expect(integration.scenarios.length, id).toBeGreaterThan(0);
    }
  });

  it('lists the level progress widget directly with the progress bars', () => {
    const levelProgress = loadUiEditorIntegrations().find(
      ({ id }) => id === 'compound.hud-level-rail',
    );

    expect(levelProgress).toMatchObject({
      folderPath: [],
      label: 'Level Progress Bar',
      sectionId: 'progress-bars',
    });
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

  it('discovers every retained production dialog in its feature folder', () => {
    const dialogs = loadUiEditorIntegrations().filter(
      ({ id }) => id.startsWith('dialog.'),
    );
    const expectedIds = UI_EDITOR_RETAINED_DIALOG_IDS.map(
      (dialogId) => `dialog.${dialogId}`,
    );

    expect(dialogs).toHaveLength(expectedIds.length);
    expect(dialogs.map(({ id }) => id).sort()).toEqual(
      [...expectedIds].sort(),
    );
    expect(
      new Set(dialogs.map(({ folderPath }) => folderPath[0])),
    ).toEqual(
      new Set([
        'Global',
        'Workshop',
        'Garden',
        'Brewing',
        'Market',
        'Guild',
        'Prestige',
      ]),
    );
    expect(
      dialogs.every(
        ({ kind, scenarios, sectionId }) =>
          kind === 'dialog' &&
          sectionId === 'dialogs' &&
          scenarios.length >= 2,
      ),
    ).toBe(true);
  });

  it('catalogues every retained production room as a scene', () => {
    const scenes = loadUiEditorIntegrations().filter(
      ({ id, kind }) => kind === 'scene' && id.startsWith('feature.'),
    );

    expect(scenes.map(({ id }) => id).sort()).toEqual([
      'feature.brewing-room',
      'feature.garden-room',
      'feature.guild-room',
      'feature.market-room',
      'feature.prestige-room',
      'feature.research-room',
      'feature.workshop-room',
    ]);
    expect(
      scenes.every(({ childWidgetIds }) => childWidgetIds.length > 0),
    ).toBe(true);
  });
});
