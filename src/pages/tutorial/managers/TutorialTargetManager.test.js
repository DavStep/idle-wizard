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

  it('lets the intro username step guide the settings input', () => {
    const stage = document.createElement('section');
    const settings = document.createElement('section');
    const input = document.createElement('input');
    const manaSphere = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    settings.className = 'room-top-panel__settings';
    input.dataset.tutorialId = 'top:username-input';
    manaSphere.dataset.tutorialId = 'workshop:manaSphere';
    settings.append(input);
    stage.append(settings, manaSphere);
    document.body.append(stage);

    expect(manager.getDomState().isUsernameSettingsOpen()).toBe(true);
    expect(
      manager
        .getDomState()
        .isBlockingDialogOpenForStep({ targetId: 'top:username-input' }, input),
    ).toBe(false);
    expect(
      manager
        .getDomState()
        .isBlockingDialogOpenForStep({ targetId: 'workshop:manaSphere' }, manaSphere),
    ).toBe(true);

    settings.hidden = true;

    expect(manager.getDomState().isUsernameSettingsOpen()).toBe(false);
  });

  it('allows popup guidance when the active target is inside the open popup', () => {
    const stage = document.createElement('section');
    const popup = document.createElement('section');
    const target = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    popup.className = 'shop-page__direct-sell-popup';
    target.dataset.tutorialId = 'shop:directSell:sageSeed';
    popup.append(target);
    stage.append(popup);
    document.body.append(stage);

    expect(
      manager
        .getDomState()
        .isBlockingDialogOpenForStep({ targetId: 'shop:directSell:sageSeed' }, target),
    ).toBe(false);
  });

  it('reads the selected brewing recipe row from the open popup', () => {
    const stage = document.createElement('section');
    const popup = document.createElement('section');
    const row = document.createElement('button');
    const manager = new TutorialTargetManager({ stage });

    popup.className = 'brewing-page__recipes-popup';
    row.className = 'brewing-page__recipe-row';
    row.dataset.tutorialId = 'brewing:recipe:manaTonic';
    row.setAttribute('aria-pressed', 'true');
    popup.append(row);
    stage.append(popup);

    expect(manager.getDomState().isBrewingRecipeSelected('manaTonic')).toBe(true);
    expect(manager.getDomState().isBrewingRecipeSelected('minorHealingPotion')).toBe(false);
  });

  it('keeps copy-only popup guidance visible only for the popup it needs', () => {
    const stage = document.createElement('section');
    const directSellPopup = document.createElement('section');
    const otherPopup = document.createElement('section');
    const manager = new TutorialTargetManager({ stage });

    directSellPopup.className = 'shop-page__direct-sell-popup';
    otherPopup.className = 'workshop-page__leaderboard-popup';
    stage.append(directSellPopup, otherPopup);
    document.body.append(stage);

    expect(
      manager.getDomState().isBlockingDialogOpenForStep({
        targetId: null,
        allowedPopupClasses: ['shop-page__direct-sell-popup'],
      }),
    ).toBe(true);

    otherPopup.hidden = true;

    expect(
      manager.getDomState().isBlockingDialogOpenForStep({
        targetId: null,
        allowedPopupClasses: ['shop-page__direct-sell-popup'],
      }),
    ).toBe(false);
  });
});
