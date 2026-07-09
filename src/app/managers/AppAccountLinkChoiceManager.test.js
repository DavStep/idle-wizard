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
        coin: { current: 12 },
        crystal: { current: 2 },
      },
      accountSave: {
        tasks: { currentLevel: 2 },
        coin: { current: 3 },
        crystal: { current: 0 },
      },
      accountUsername: 'Mira',
    });

    expect(stage.querySelector('.app-account-link-choice').hidden).toBe(false);
    expect(stage.textContent).toContain('level 5, 12 coin, 2 crystal');
    expect(stage.textContent).toContain('username Mira, level 2, 3 coin, 0 crystal');
    expect(stage.textContent).toContain(
      'the progress you do not select will be lost',
    );

    stage
      .querySelectorAll('.app-account-link-choice__button')[0]
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
      .querySelectorAll('.app-account-link-choice__button')[1]
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    await expect(choicePromise).resolves.toBe(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
  });

  it('defaults to forget device when not mounted', async () => {
    const manager = new AppAccountLinkChoiceManager();

    await expect(manager.choose()).resolves.toBe(ACCOUNT_LINK_CHOICE_FORGET_DEVICE);
  });
});
