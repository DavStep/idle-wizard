// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

vi.mock('../widgets/UiEditorPixiButtonPreview.js', () => ({
  createUiEditorPixiButtonPreview: (definition) => definition,
  createUiEditorPixiButtonThumbnail: (definition) => definition,
}));

import {
  createIdleWizardButtonEntries,
  IDLE_WIZARD_BUTTON_WIDGETS,
  validateIdleWizardButtonNineSliceRegistrations,
} from './createIdleWizardButtonEntries.js';

describe('createIdleWizardButtonEntries', () => {
  it('keeps every registered nine-slice within its widget minimum size', () => {
    expect(validateIdleWizardButtonNineSliceRegistrations()).toEqual([]);
  });

  it('registers every supported shared button preview in the Buttons folder', () => {
    const entries = createIdleWizardButtonEntries();

    expect(entries).toHaveLength(21);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    expect(entries.every((entry) => entry.kind === 'widget')).toBe(true);
    expect(entries.every((entry) => entry.sectionId === 'buttons')).toBe(true);
    expect(entries.every((entry) => entry.properties.length === 2)).toBe(true);
    expect(entries.every((entry) => Array.isArray(entry.assets))).toBe(true);
    expect(entries.every((entry) => typeof entry.createPreview === 'function')).toBe(
      true,
    );
    expect(
      entries.every((entry) => typeof entry.createThumbnail === 'function'),
    ).toBe(true);
    expect(entries.map((entry) => entry.label)).toEqual(
      IDLE_WIZARD_BUTTON_WIDGETS.map((definition) => definition.label),
    );
  });

  it('covers regular, cost, info, and HUD button contracts', () => {
    expect(
      new Set(
        IDLE_WIZARD_BUTTON_WIDGETS.map(
          (definition) => definition.preview.type,
        ),
      ),
    ).toEqual(
      new Set(['button', 'cost', 'info', 'hud-settings', 'hud-avatar']),
    );
  });

  it('registers production usage locations for active widget contracts', () => {
    const entries = createIdleWizardButtonEntries();
    const greenButton = entries.find(({ id }) => id === 'green-button');
    const accountTab = entries.find(({ id }) => id === 'account-tab-button');

    expect(greenButton.usages).toContainEqual({
      label: 'Garden Harvest All action',
      source: 'src/rendering/pixi/pages/garden/GardenPixiPage.js',
    });
    expect(accountTab.usages).toEqual([]);
  });

  it('registers font and production background metadata for inspection', () => {
    const entries = createIdleWizardButtonEntries();
    const greenButton = entries.find(({ id }) => id === 'green-button');
    const inlineButton = entries.find(({ id }) => id === 'inline-button');
    const infoButton = entries.find(({ id }) => id === 'info-button');

    expect(greenButton.properties).toEqual([
      { label: 'Font', value: 'Lilita One' },
      {
        label: 'Background asset',
        monospace: true,
        value: 'source:assets/ui/regular-button/green-button-50.9.png',
      },
    ]);
    expect(inlineButton.properties).toContainEqual({
      label: 'Background asset',
      monospace: false,
      value: 'None',
    });
    expect(infoButton.properties).toContainEqual({
      label: 'Font',
      value: 'None',
    });
  });

  it('declares every production asset mounted by each atomic preview', () => {
    const entries = createIdleWizardButtonEntries();
    const greenButton = entries.find(({ id }) => id === 'green-button');
    const inlineButton = entries.find(({ id }) => id === 'inline-button');
    const costButton = entries.find(({ id }) => id === 'cost-button');
    const hudSettings = entries.find(
      ({ id }) => id === 'hud-settings-button',
    );
    const hudAvatar = entries.find(({ id }) => id === 'hud-avatar-button');

    expect(greenButton.assets).toContainEqual(
      expect.objectContaining({
        id: 'source:assets/ui/regular-button/green-button-50.9.png',
        nineSlice: true,
        role: 'Background',
      }),
    );
    expect(inlineButton.assets).toEqual([]);
    expect(costButton.assets.map(({ role }) => role)).toEqual([
      'Background',
      'Resource icon',
    ]);
    expect(hudSettings.assets.map(({ role }) => role)).toEqual([
      'Background',
      'Icon',
    ]);
    expect(hudAvatar.assets.map(({ role }) => role)).toEqual([
      'Frame',
      'Background',
      'Portrait',
    ]);
  });

  it('uses .9.png notation for every nine-slice button asset', () => {
    const nineSliceAssets = createIdleWizardButtonEntries()
      .flatMap(({ assets }) => assets)
      .filter(({ nineSlice }) => nineSlice);

    expect(nineSliceAssets.length).toBeGreaterThan(0);
    expect(
      nineSliceAssets.every(({ id }) => id.endsWith('.9.png')),
    ).toBe(true);
  });
});
