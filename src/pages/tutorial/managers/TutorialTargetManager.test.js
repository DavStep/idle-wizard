/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TutorialTargetManager } from './TutorialTargetManager.js';

describe('TutorialTargetManager', () => {
  it('reads the username from the top-panel target', () => {
    const stage = document.createElement('section');
    const usernameButton = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    usernameButton.dataset.tutorialId = 'top:username';
    usernameButton.textContent = 'Mira';
    stage.append(usernameButton);

    expect(manager.getDomState().getUsername()).toBe('Mira');

    usernameButton.remove();

    expect(manager.getDomState().getUsername()).toBe('wizard');
  });

  it('treats hidden one-task toggle as already expanded', () => {
    const stage = document.createElement('section');
    const toggle = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    toggle.className = 'workshop-page__tasks-toggle';
    toggle.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    stage.append(toggle);

    expect(manager.getDomState().isTasksExpanded()).toBe(true);

    toggle.hidden = false;

    expect(manager.getDomState().isTasksExpanded()).toBe(false);

    toggle.setAttribute('aria-expanded', 'true');

    expect(manager.getDomState().isTasksExpanded()).toBe(true);
  });

  it('treats app and top-panel dialogs as tutorial blockers', () => {
    const stage = document.createElement('section');
    const accountChoice = document.createElement('section');
    const freshStartChoice = document.createElement('section');
    const levelPopup = document.createElement('section');
    const manager = new TutorialTargetManager({ stage });

    accountChoice.className = 'app-account-link-choice';
    document.body.append(stage, accountChoice);

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(true);

    accountChoice.hidden = true;
    freshStartChoice.className = 'app-fresh-start-choice';
    document.body.append(freshStartChoice);

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(true);

    freshStartChoice.hidden = true;
    levelPopup.className = 'room-top-panel__level-popup';
    stage.append(levelPopup);

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(true);

    levelPopup.hidden = true;

    expect(manager.getDomState().isBlockingDialogOpen()).toBe(false);
  });
});
