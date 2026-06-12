// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_LINK_CHOICE_FORGET_DEVICE,
  ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT,
  AppAccountLinkChoiceManager,
} from './AppAccountLinkChoiceManager.js';

describe('AppAccountLinkChoiceManager', () => {
  it('shows both save summaries and resolves overwrite account', async () => {
    const stage = document.createElement('section');
    const manager = new AppAccountLinkChoiceManager();
    manager.mount(stage);

    const choicePromise = manager.choose({
      deviceSave: {
        tasks: { currentLevel: 5 },
        gold: { current: 12 },
        crystal: { current: 2 },
      },
      accountSave: {
        tasks: { currentLevel: 2 },
        gold: { current: 3 },
        crystal: { current: 0 },
      },
    });

    expect(stage.querySelector('.app-account-link-choice').hidden).toBe(false);
    expect(stage.textContent).toContain('level 5, 12 gold, 2 crystal');
    expect(stage.textContent).toContain('level 2, 3 gold, 0 crystal');

    stage
      .querySelector('.app-account-link-choice__button:last-child')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    await expect(choicePromise).resolves.toBe(ACCOUNT_LINK_CHOICE_OVERWRITE_ACCOUNT);
    expect(stage.querySelector('.app-account-link-choice').hidden).toBe(true);
  });

  it('resolves forget device when that button is clicked', async () => {
    const stage = document.createElement('section');
    const manager = new AppAccountLinkChoiceManager();
    manager.mount(stage);

    const choicePromise = manager.choose({
      deviceSave: { tasks: { currentLevel: 4 } },
      accountSave: null,
    });

    stage
      .querySelector('.app-account-link-choice__button:first-child')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    await expect(choicePromise).resolves.toBe(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
  });

  it('defaults to forget device when not mounted', async () => {
    const manager = new AppAccountLinkChoiceManager();

    await expect(manager.choose()).resolves.toBe(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
  });
});
