import { describe, expect, it } from 'vitest';

import {
  OPTIONAL_CAPTURE_STEP_IDS,
  assertCaptureContract,
  getTutorialCaptureStepIds,
} from './capture-tutorial-flow.js';
import { TUTORIAL_STEP_IDS } from '../src/pages/tutorial/managers/TutorialStepManager.js';

describe('tutorial capture flow script', () => {
  it('tracks the source tutorial graph except documented optional branches', () => {
    expect(() => assertCaptureContract()).not.toThrow();
    expect(getTutorialCaptureStepIds()).toEqual(
      TUTORIAL_STEP_IDS.filter((stepId) => !OPTIONAL_CAPTURE_STEP_IDS.includes(stepId)),
    );
    expect(getTutorialCaptureStepIds()).toContain('summon-five-seeds');
    expect(getTutorialCaptureStepIds()).toContain('intro-level-requirements');
    expect(getTutorialCaptureStepIds()).toContain('unselect-sage-seed-sale');
  });
});
