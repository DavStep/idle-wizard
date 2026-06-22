// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  TUTORIAL_STORAGE_KEY,
  TutorialProgressManager,
} from './TutorialProgressManager.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

describe('TutorialProgressManager', () => {
  it('ignores legacy v2 skipped tutorial state', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'idle-wizard.tutorial.v2',
      JSON.stringify({
        skipped: true,
        completedStepIds: ['open-tasks'],
      }),
    );

    const manager = new TutorialProgressManager({ storage });

    expect(manager.isSkipped()).toBe(false);
    expect(manager.hasCompleted('open-tasks')).toBe(false);
  });

  it('saves only completed steps in the current tutorial state', () => {
    const storage = createMemoryStorage();
    const manager = new TutorialProgressManager({ storage });

    manager.complete('open-tasks');

    expect(JSON.parse(storage.getItem(TUTORIAL_STORAGE_KEY))).toEqual({
      completedStepIds: ['open-tasks'],
    });
  });

  it('maps old tutorial coin step ids without resetting progress', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      TUTORIAL_STORAGE_KEY,
      JSON.stringify({
        completedStepIds: ['earn-tutorial-gold'],
      }),
    );

    const manager = new TutorialProgressManager({ storage });

    expect(manager.hasCompleted('earn-tutorial-coin')).toBe(true);
    manager.complete('finish-seed-task');
    expect(JSON.parse(storage.getItem(TUTORIAL_STORAGE_KEY))).toEqual({
      completedStepIds: ['earn-tutorial-coin', 'finish-seed-task'],
    });
  });
});
