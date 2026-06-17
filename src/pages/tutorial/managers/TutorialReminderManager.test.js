/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TutorialReminderManager } from './TutorialReminderManager.js';

function createClock(start = 0) {
  let now = start;

  return {
    now: () => now,
    tick: (ms) => {
      now += ms;
    },
  };
}

describe('TutorialReminderManager', () => {
  it('shows a new prompt once, then hides it until reminder delay passes', () => {
    const clock = createClock();
    const manager = new TutorialReminderManager({
      now: clock.now,
      visibleMs: 100,
      reminderMs: 500,
    });
    const prompt = {
      id: 'fill-sage-seed-task',
      targetId: 'workshop:summonSeed',
      text: 'summon seed',
    };

    expect(manager.getCue(prompt)).toEqual({ shouldShow: true, nextDelayMs: 100 });

    clock.tick(99);
    expect(manager.getCue(prompt)).toEqual({ shouldShow: true, nextDelayMs: 1 });

    clock.tick(1);
    expect(manager.getCue(prompt)).toEqual({ shouldShow: false, nextDelayMs: 400 });

    clock.tick(400);
    expect(manager.getCue(prompt)).toEqual({ shouldShow: true, nextDelayMs: 100 });
  });

  it('shows each loop prompt once, then uses one reminder delay for the loop', () => {
    const clock = createClock();
    const manager = new TutorialReminderManager({
      now: clock.now,
      visibleMs: 100,
      reminderMs: 500,
    });

    expect(
      manager.getCue({
        id: 'fill-sage-seed-task',
        targetId: 'workshop:summonSeed',
        text: 'summon seed',
        reminderKey: 'fill-loop',
      }).shouldShow,
    ).toBe(true);

    clock.tick(100);

    expect(
      manager.getCue({
        id: 'fill-sage-seed-task',
        targetId: 'task:level1-sage-seeds',
        text: 'turn in',
        reminderKey: 'fill-loop',
      }).shouldShow,
    ).toBe(true);

    clock.tick(100);

    expect(
      manager.getCue({
        id: 'fill-sage-seed-task',
        targetId: 'workshop:summonSeed',
        text: 'summon seed',
        reminderKey: 'fill-loop',
      }),
    ).toEqual({ shouldShow: false, nextDelayMs: 500 });
  });

  it('delays a reminder after player activity on the current prompt', () => {
    const clock = createClock();
    const manager = new TutorialReminderManager({
      now: clock.now,
      visibleMs: 100,
      reminderMs: 500,
    });
    const prompt = {
      id: 'fill-sage-seed-task',
      targetId: 'workshop:summonSeed',
      text: 'summon seed',
      reminderKey: 'fill-loop',
    };

    expect(manager.getCue(prompt).shouldShow).toBe(true);

    clock.tick(250);
    manager.recordActivity();

    expect(manager.getCue(prompt)).toEqual({ shouldShow: false, nextDelayMs: 500 });

    clock.tick(499);
    expect(manager.getCue(prompt)).toEqual({ shouldShow: false, nextDelayMs: 1 });

    clock.tick(1);
    expect(manager.getCue(prompt)).toEqual({ shouldShow: true, nextDelayMs: 100 });
  });

  it('turns on passive attention only after idle time', () => {
    const clock = createClock();
    const manager = new TutorialReminderManager({
      now: clock.now,
      visibleMs: 100,
      reminderMs: 500,
    });
    const prompt = {
      id: 'research-mint-seed',
      targetId: 'research:unlockSeed:mintSeed',
      text: 'research mint seed',
    };

    expect(manager.getAttentionState({ step: prompt })).toEqual({
      shouldNotify: false,
      nextRefreshAt: 500,
    });

    clock.tick(499);
    expect(manager.getAttentionState({ step: prompt })).toEqual({
      shouldNotify: false,
      nextRefreshAt: 500,
    });

    clock.tick(1);
    expect(manager.getAttentionState({ step: prompt })).toEqual({
      shouldNotify: true,
      nextRefreshAt: null,
    });

    manager.recordActivity();

    expect(manager.getAttentionState({ step: prompt })).toEqual({
      shouldNotify: false,
      nextRefreshAt: 1000,
    });
  });

  it('uses a step-specific reminder delay when supplied', () => {
    const clock = createClock();
    const manager = new TutorialReminderManager({
      now: clock.now,
      visibleMs: 100,
      reminderMs: 500,
    });
    const prompt = {
      id: 'grow-sage',
      targetId: 'workshop:summonSeed',
      text: 'summon seed',
      reminderMs: 3500,
    };

    expect(manager.getAttentionState({ step: prompt })).toEqual({
      shouldNotify: false,
      nextRefreshAt: 3500,
    });

    clock.tick(3499);
    expect(manager.getAttentionState({ step: prompt })).toEqual({
      shouldNotify: false,
      nextRefreshAt: 3500,
    });

    clock.tick(1);
    expect(manager.getAttentionState({ step: prompt })).toEqual({
      shouldNotify: true,
      nextRefreshAt: null,
    });
  });

  it('can discard an interrupted prompt so it shows again after a blocking dialog closes', () => {
    const clock = createClock();
    const manager = new TutorialReminderManager({
      now: clock.now,
      visibleMs: 100,
      reminderMs: 500,
    });
    const prompt = {
      id: 'open-tasks',
      targetId: 'workshop:tasks',
      text: 'open level 2 requirements',
    };

    expect(manager.getCue(prompt).shouldShow).toBe(true);

    manager.discardActivePrompt();
    clock.tick(10);

    expect(manager.getCue(prompt)).toEqual({ shouldShow: true, nextDelayMs: 100 });
  });
});
