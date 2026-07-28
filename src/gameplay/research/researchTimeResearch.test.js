import { describe, expect, it } from 'vitest';

import { applyResearchTimeReductionSeconds } from './researchTimeResearch.js';

describe('research time reduction', () => {
  it('keeps every timed research at or above five seconds after reductions', () => {
    expect(applyResearchTimeReductionSeconds(3, 0)).toBe(5);
    expect(applyResearchTimeReductionSeconds(10, 8)).toBe(5);
    expect(applyResearchTimeReductionSeconds(60, 8)).toBe(12);
  });

  it('preserves zero as the instant-research sentinel', () => {
    expect(applyResearchTimeReductionSeconds(0, 8)).toBe(0);
  });
});
