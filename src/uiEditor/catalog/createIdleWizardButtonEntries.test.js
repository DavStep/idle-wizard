// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

vi.mock('../widgets/UiEditorPixiButtonPreview.js', () => ({
  createUiEditorPixiButtonPreview: (definition) => definition,
  createUiEditorPixiButtonThumbnail: (definition) => definition,
}));

import {
  createIdleWizardButtonEntries,
  IDLE_WIZARD_BUTTON_WIDGETS,
} from './createIdleWizardButtonEntries.js';

describe('createIdleWizardButtonEntries', () => {
  it('registers every supported shared button preview in the Buttons folder', () => {
    const entries = createIdleWizardButtonEntries();

    expect(entries).toHaveLength(21);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    expect(entries.every((entry) => entry.kind === 'widget')).toBe(true);
    expect(entries.every((entry) => entry.sectionId === 'buttons')).toBe(true);
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
});
