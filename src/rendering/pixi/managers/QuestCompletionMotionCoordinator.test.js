import { describe, expect, it, vi } from 'vitest';

import {
  QUEST_REQUEST_FILL_DURATION_MS,
  QuestCompletionMotionCoordinator,
} from './QuestCompletionMotionCoordinator.js';

describe('QuestCompletionMotionCoordinator', () => {
  it('publishes fill, flight, and completion in order', () => {
    const coordinator = new QuestCompletionMotionCoordinator();
    const listener = vi.fn();
    coordinator.subscribe(listener);

    const transitionId = coordinator.begin({
      previousTaskId: 'request-1',
      nextTaskId: 'request-2',
    });
    expect(coordinator.getSnapshot()).toMatchObject({
      active: true,
      phase: 'filling',
      transitionId,
      previousTaskId: 'request-1',
      nextTaskId: 'request-2',
      fillDurationMs: QUEST_REQUEST_FILL_DURATION_MS,
    });

    expect(coordinator.startFlight(transitionId)).toBe(true);
    expect(coordinator.getSnapshot().phase).toBe('flying');
    expect(coordinator.complete(transitionId)).toBe(true);
    expect(coordinator.getSnapshot()).toMatchObject({
      active: false,
      phase: 'idle',
      transitionId,
    });
    expect(listener.mock.calls.map(([snapshot]) => snapshot.phase)).toEqual([
      'filling',
      'flying',
      'complete',
    ]);
  });
});
