// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import {
  setNotificationBadge,
  setNotificationVisibilityPolicy,
} from './notificationBadge.js';

describe('notificationBadge', () => {
  afterEach(() => {
    setNotificationVisibilityPolicy(null);
    document.body.textContent = '';
  });

  it('suppresses unrelated visible badges and restores them when policy clears', () => {
    const root = document.createElement('section');
    const button = document.createElement('button');

    root.append(button);
    document.body.append(root);

    setNotificationBadge(button, true);

    expect(button.dataset.notification).toBe('true');

    setNotificationVisibilityPolicy(
      {
        active: true,
        allowedTutorialIds: ['workshop:summonSeed'],
      },
      { root },
    );

    expect(button.dataset.notification).toBeUndefined();

    setNotificationVisibilityPolicy(null, { root });

    expect(button.dataset.notification).toBe('true');
  });

  it('keeps badges on the current tutorial target and target container', () => {
    const root = document.createElement('section');
    const target = document.createElement('button');
    const row = document.createElement('button');
    const label = document.createElement('span');

    target.dataset.tutorialId = 'workshop:summonSeed';
    label.dataset.tutorialId = 'task:level1-sage-seeds';
    row.append(label);
    root.append(target, row);
    document.body.append(root);

    setNotificationVisibilityPolicy(
      {
        active: true,
        allowedTutorialIds: ['workshop:summonSeed', 'task:level1-sage-seeds'],
      },
      { root },
    );
    setNotificationBadge(target, true);
    setNotificationBadge(row, true);

    expect(target.dataset.notification).toBe('true');
    expect(row.dataset.notification).toBe('true');
  });

  it('does not restore a suppressed badge after its source turns inactive', () => {
    const root = document.createElement('section');
    const button = document.createElement('button');

    root.append(button);
    document.body.append(root);

    setNotificationVisibilityPolicy(
      {
        active: true,
        allowedTutorialIds: ['workshop:summonSeed'],
      },
      { root },
    );
    setNotificationBadge(button, true);
    setNotificationBadge(button, false);
    setNotificationVisibilityPolicy(null, { root });

    expect(button.dataset.notification).toBeUndefined();
  });

  it('never suppresses tutorial-owned attention badges', () => {
    const root = document.createElement('section');
    const layer = document.createElement('div');
    const button = document.createElement('button');

    layer.className = 'tutorial-layer';
    layer.append(button);
    root.append(layer);
    document.body.append(root);

    setNotificationVisibilityPolicy(
      {
        active: true,
        allowedTutorialIds: [],
      },
      { root },
    );
    setNotificationBadge(button, true);

    expect(button.dataset.notification).toBe('true');
  });
});
