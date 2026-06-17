import { describe, expect, it } from 'vitest';

import {
  formatLevelRequirementsLabel,
  formatOpenLevelRequirementsLabel,
  getLevelRequirementTargetLevel,
} from './levelRequirementsLabel.js';

describe('levelRequirementsLabel', () => {
  it('labels requirements with the level the player is trying to reach', () => {
    const tasks = {
      currentLevel: 4,
      maxLevel: 20,
      level: {
        level: 4,
      },
    };

    expect(getLevelRequirementTargetLevel(tasks)).toBe(5);
    expect(formatLevelRequirementsLabel(tasks)).toBe('level 5 requirements');
    expect(formatOpenLevelRequirementsLabel(tasks)).toBe('open level 5 requirements');
  });

  it('does not label a target beyond the configured max level', () => {
    expect(
      formatLevelRequirementsLabel({
        currentLevel: 20,
        maxLevel: 20,
        level: {
          level: 20,
        },
      }),
    ).toBe('level 20 requirements');
  });
});
