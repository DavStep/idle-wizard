// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  FRESH_START_CHOICE_CONNECT_ACCOUNT,
  FRESH_START_CHOICE_START_FRESH,
  AppFreshStartChoiceManager,
} from './AppFreshStartChoiceManager.js';

describe('AppFreshStartChoiceManager', () => {
  it('asks whether the player has an account and resolves connect account', async () => {
    const stage = document.createElement('section');
    const manager = new AppFreshStartChoiceManager();
    manager.mount(stage);

    const choicePromise = manager.choose({
      authSnapshot: { oidc: { enabled: true } },
    });

    const dialog = stage.querySelector('.app-fresh-start-choice');
    expect(dialog.hidden).toBe(false);
    expect(dialog.textContent).toContain('account');
    expect(dialog.textContent).toContain('do you already have an account?');
    expect(dialog.textContent).toContain('connect account');
    expect(dialog.textContent).toContain('start fresh');
    expect(dialog.textContent).toContain('not connected');

    stage
      .querySelector('.app-fresh-start-choice__button--connect')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    await expect(choicePromise).resolves.toBe(FRESH_START_CHOICE_CONNECT_ACCOUNT);
    expect(dialog.hidden).toBe(true);
  });

  it('resolves start fresh when selected', async () => {
    const stage = document.createElement('section');
    const manager = new AppFreshStartChoiceManager();
    manager.mount(stage);

    const choicePromise = manager.choose({
      authSnapshot: { oidc: { enabled: true } },
    });

    stage
      .querySelector('.app-fresh-start-choice__button--fresh')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    await expect(choicePromise).resolves.toBe(FRESH_START_CHOICE_START_FRESH);
  });

  it('can keep the dialog open and show loading after connect account', async () => {
    const stage = document.createElement('section');
    const manager = new AppFreshStartChoiceManager();
    manager.mount(stage);

    const choicePromise = manager.choose({
      authSnapshot: { oidc: { enabled: true } },
      keepOpenOnConnect: true,
    });

    const dialog = stage.querySelector('.app-fresh-start-choice');
    stage
      .querySelector('.app-fresh-start-choice__button--connect')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    await expect(choicePromise).resolves.toBe(FRESH_START_CHOICE_CONNECT_ACCOUNT);
    expect(dialog.hidden).toBe(false);

    manager.render({
      authSnapshot: { oidc: { enabled: true } },
      statusText: 'connecting...',
      busy: true,
    });

    expect(dialog.getAttribute('aria-busy')).toBe('true');
    expect(stage.querySelector('.app-fresh-start-choice__button--connect').disabled).toBe(
      true,
    );
    expect(stage.querySelector('.app-fresh-start-choice__button--fresh').disabled).toBe(
      true,
    );
    expect(dialog.textContent).toContain('connecting...');

    manager.hide();
    expect(dialog.hidden).toBe(true);
  });

  it('disables account connect when login is unavailable', () => {
    const stage = document.createElement('section');
    const manager = new AppFreshStartChoiceManager();
    manager.mount(stage);

    void manager.choose({
      authSnapshot: { oidc: { enabled: false } },
    });

    const connectButton = stage.querySelector('.app-fresh-start-choice__button--connect');
    expect(connectButton.disabled).toBe(true);
    expect(stage.textContent).toContain('login unavailable');

    manager.unmount();
  });

  it('shows stored google login errors instead of a plain disconnected state', () => {
    const stage = document.createElement('section');
    const manager = new AppFreshStartChoiceManager();
    manager.mount(stage);

    void manager.choose({
      authSnapshot: {
        oidc: {
          enabled: true,
          authenticated: false,
          error: 'missing state',
        },
      },
    });

    expect(stage.querySelector('.app-fresh-start-choice__status').textContent).toBe(
      'login error: missing state',
    );

    manager.unmount();
  });

  it('shows remembered connected account details on the first-run gate', () => {
    const stage = document.createElement('section');
    const manager = new AppFreshStartChoiceManager();
    manager.mount(stage);

    void manager.choose({
      authSnapshot: {
        hasToken: true,
        oidc: {
          enabled: true,
          authenticated: false,
          remembered: true,
          displayName: 'Dav',
          email: 'dav@example.com',
        },
      },
    });

    expect(stage.querySelector('.app-fresh-start-choice__status').textContent).toBe(
      'Dav',
    );

    manager.unmount();
  });

  it('defaults to start fresh when not mounted', async () => {
    const manager = new AppFreshStartChoiceManager();

    await expect(manager.choose()).resolves.toBe(FRESH_START_CHOICE_START_FRESH);
  });
});
