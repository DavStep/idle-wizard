/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TutorialRevealManager } from './TutorialRevealManager.js';

describe('TutorialRevealManager', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the reveal gate active when the step reveals only Elara', () => {
    const stage = document.createElement('section');
    const manager = new TutorialRevealManager();

    manager.setStage(stage);
    manager.update({
      step: { id: 'intro-welcome', revealTokens: [] },
    });

    expect(stage.dataset.tutorialReveal).toBe('');
    expect(stage.hasAttribute('data-tutorial-reveal')).toBe(true);
  });

  it('reveals the top panel during the username step', () => {
    const stage = document.createElement('section');
    const manager = new TutorialRevealManager();

    manager.setStage(stage);
    manager.update({
      step: { id: 'intro-mana-sphere', revealTokens: ['top'] },
    });

    expect(stage.dataset.tutorialReveal).toBe('top');
  });

  it('reveals top-panel mana before the rest of the room UI', () => {
    const stage = document.createElement('section');
    const manager = new TutorialRevealManager();

    manager.setStage(stage);
    manager.update({
      step: { id: 'intro-mana-sphere', revealTokens: ['top', 'mana'] },
    });

    expect(stage.dataset.tutorialReveal).toBe('top mana');
  });

  it('reveals Workshop actions and room tabs as the level-one workflow expands', () => {
    const stage = document.createElement('section');
    const manager = new TutorialRevealManager();

    manager.setStage(stage);
    manager.update({
      step: { id: 'first-summon-seed', revealTokens: ['top', 'mana', 'summon'] },
    });
    expect(stage.dataset.tutorialReveal).toBe('top mana summon');

    manager.update({
      step: { id: 'finish-seed-task', revealTokens: ['top', 'mana', 'summon', 'tasks'] },
    });
    expect(stage.dataset.tutorialReveal).toBe('top mana summon tasks');

    manager.update({
      step: {
        id: 'open-market',
        targetId: 'page:shop',
        revealTokens: ['mana', 'summon', 'tasks', 'top', 'rooms'],
      },
    });
    expect(stage.dataset.tutorialReveal).toBe('mana summon tasks top rooms');
    expect(stage.dataset.tutorialTargetId).toBe('page:shop');
  });

  it('plays the summon reveal animation only when the summon token first appears', () => {
    vi.useFakeTimers();
    const stage = document.createElement('section');
    const manager = new TutorialRevealManager();

    manager.setStage(stage);
    manager.update({
      step: { id: 'first-summon-seed', revealTokens: ['top', 'mana', 'summon'] },
    });

    expect(stage.classList.contains('is-tutorial-summon-revealing')).toBe(true);

    vi.advanceTimersByTime(760);

    expect(stage.classList.contains('is-tutorial-summon-revealing')).toBe(false);

    manager.update({
      step: { id: 'finish-seed-task', revealTokens: ['top', 'mana', 'summon', 'tasks'] },
    });

    expect(stage.classList.contains('is-tutorial-summon-revealing')).toBe(false);

    manager.update({
      step: { id: 'intro-mana-sphere', revealTokens: ['top', 'mana'] },
    });
    manager.update({
      step: { id: 'first-summon-seed', revealTokens: ['top', 'mana', 'summon'] },
    });

    expect(stage.classList.contains('is-tutorial-summon-revealing')).toBe(true);
  });

  it('clears reveal restrictions after the first workflow', () => {
    const stage = document.createElement('section');
    const manager = new TutorialRevealManager();

    manager.setStage(stage);
    manager.update({
      step: { id: 'grow-sage' },
      targetId: 'page:garden',
    });

    expect(stage.dataset.tutorialReveal).toBeUndefined();
    expect(stage.dataset.tutorialTargetId).toBeUndefined();
  });
});
