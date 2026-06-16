/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TutorialRevealManager } from './TutorialRevealManager.js';

describe('TutorialRevealManager', () => {
  it('reveals the top panel during the username step', () => {
    const stage = document.createElement('section');
    const manager = new TutorialRevealManager();

    manager.setStage(stage);
    manager.update({
      step: { id: 'intro-username', revealTokens: ['top'] },
    });

    expect(stage.dataset.tutorialReveal).toBe('top');
  });

  it('reveals the mana sphere before the rest of the room UI', () => {
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
        revealTokens: ['mana', 'summon', 'tasks', 'top', 'rooms'],
      },
    });
    expect(stage.dataset.tutorialReveal).toBe('mana summon tasks top rooms');
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
  });
});
