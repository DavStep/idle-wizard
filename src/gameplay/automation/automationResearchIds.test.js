import { describe, expect, it } from 'vitest';

import {
  automationResearchIds,
  migrateLegacySplitAutomationResearchId,
} from './automationResearchIds.js';

describe('automation research ids', () => {
  it('migrates split harvest and bottle research into combined automation', () => {
    expect(
      migrateLegacySplitAutomationResearchId(
        automationResearchIds.autoHarvestPlant(3),
      ),
    ).toBe(automationResearchIds.autoPlantTile(3));
    expect(
      migrateLegacySplitAutomationResearchId(
        automationResearchIds.autoBottleCauldron(2),
      ),
    ).toBe(automationResearchIds.autoBrewCauldron(2));
    expect(
      migrateLegacySplitAutomationResearchId(automationResearchIds.autoSeedSpawn()),
    ).toBe(automationResearchIds.autoSeedSpawn());
  });
});
