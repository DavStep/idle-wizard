/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TutorialTargetManager } from './TutorialTargetManager.js';

describe('TutorialTargetManager', () => {
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
