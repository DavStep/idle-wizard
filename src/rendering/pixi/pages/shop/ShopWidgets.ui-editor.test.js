// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { loadUiEditorIntegrations } from '../../../../uiEditor/integrations/loadUiEditorIntegrations.js';
import { createIdleWizardButtonEntries } from '../../../../uiEditor/catalog/createIdleWizardButtonEntries.js';
import { createUiEditorIntegrationEntries } from '../../../../uiEditor/sdk/createUiEditorIntegrationEntries.js';
import { validateUiEditorCompositionCoverage } from '../../../../uiEditor/sdk/validateUiEditorCompositionCoverage.js';
import { guildUiEditorAssetFilter } from '../guild/GuildUiEditorAssets.js';

describe('Market, Guild, and Prestige UI editor coverage', () => {
  it('loads public guild quest textures used by production widgets', () => {
    expect(
      guildUiEditorAssetFilter({
        id: 'public:ui/guild-quest/paper.9.png',
      }),
    ).toBe(true);
  });

  it('discovers every feature widget and resolves parent composition contracts', () => {
    const integrations = loadUiEditorIntegrations();
    const expectedIds = [
      'feature.market-room',
      'feature.guild-room',
      'feature.prestige-room',
      'compound.market-title-ribbon',
      'compound.market-stall',
      'compound.market-offer-row',
      'compound.market-compact-row',
      'compound.market-stalls-section',
      'compound.market-rows-section',
      'compound.market-ledger-row',
      'compound.dialog-summary-row',
      'compound.dialog-field',
      'compound.amount-selector',
      'compound.guild-section-row',
      'compound.guild-rows-section',
      'compound.guild-charter-panel',
      'compound.guild-secretary-section',
      'compound.guild-quest-card',
      'compound.guild-quest-board',
      'compound.guild-person-row',
      'compound.guild-people-section',
      'compound.guild-profile-field',
      'primitive.guild-color-swatch',
      'compound.guild-detail-row',
      'compound.guild-request-list-item',
      'compound.guild-quest-detail',
      'compound.guild-quest-detail-line',
      'compound.prestige-description',
      'compound.prestige-row',
      'compound.prestige-confirm-panel',
      'compound.prestige-tooltip',
    ];
    const allEntries = [
      ...createIdleWizardButtonEntries(),
      ...createUiEditorIntegrationEntries(integrations),
    ];
    const ownedIds = new Set(expectedIds);
    const dependencyIds = new Set(
      allEntries
        .filter((entry) => ownedIds.has(entry.integrationId ?? entry.id))
        .flatMap((entry) => entry.childWidgetIds ?? []),
    );
    const focusedEntries = allEntries
      .filter((entry) => {
        const id = entry.integrationId ?? entry.id;
        return ownedIds.has(id) || dependencyIds.has(id);
      })
      .map((entry) => {
        const id = entry.integrationId ?? entry.id;
        return ownedIds.has(id) ? entry : { ...entry, childWidgetIds: [] };
      });

    expect(() => validateUiEditorCompositionCoverage(focusedEntries)).not.toThrow();
    expect(integrations.map(({ id }) => id)).toEqual(expect.arrayContaining(expectedIds));
  });
});
