/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { TopPanelViewManager } from './TopPanelViewManager.js';

describe('TopPanelViewManager', () => {
  it('renders visual setting previews and account character choices', () => {
    const stage = document.createElement('section');
    const manager = new TopPanelViewManager();

    manager.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    expect(usernameButton?.textContent).toBe('wizard');
    expect(
      usernameButton?.querySelector('.room-top-panel__username-avatar')?.dataset.character,
    ).toBe('elara');
    expect(usernameButton?.querySelector('.room-top-panel__username-label')?.textContent).toBe(
      'wizard',
    );

    expect(
      stage.querySelector(
        '#room-top-panel-settings-theme .room-top-panel__device-section',
      ),
    ).not.toBeNull();
    expect(
      stage.querySelector(
        '#room-top-panel-settings-account .room-top-panel__device-section',
      ),
    ).toBeNull();
    expect(
      stage.querySelector(
        '#room-top-panel-settings-account .room-top-panel__character-section',
      ),
    ).not.toBeNull();
    expect(
      stage.querySelector(
        '#room-top-panel-settings-theme .room-top-panel__character-section',
      ),
    ).toBeNull();
    expect(
      [
        ...stage.querySelectorAll(
          '.room-top-panel__device-section .room-top-panel__preference-label',
        ),
      ].map((label) => label.textContent),
    ).toEqual(['haptics', 'music', 'sfx']);

    expect(
      [...stage.querySelectorAll('.room-top-panel__theme-preview')].map(
        (preview) => preview.dataset.previewTheme,
      ),
    ).toEqual(['white', 'black', 'midnight', 'witchcraft']);

    expect(
      [...stage.querySelectorAll('.room-top-panel__theme-preview-box')].map(
        (box) => box.querySelector('.room-top-panel__theme-preview-title')?.textContent,
      ),
    ).toEqual(['sample', 'sample', 'sample', 'sample']);

    expect(
      [...stage.querySelectorAll('.room-top-panel__progress-preview')].map(
        (preview) => [
          preview.dataset.previewProgress,
          preview.querySelector('.room-top-panel__preview-progress-fill')?.style.width,
        ],
      ),
    ).toEqual([
      ['regular', '68%'],
      ['gradient', '68%'],
    ]);

    expect(
      [...stage.querySelectorAll('.room-top-panel__color-preview')].map((preview) => ({
        mode: preview.dataset.previewColor,
        labels: [...preview.querySelectorAll('.room-top-panel__color-preview-item')].map(
          (item) => [item.textContent, item.dataset.resourceColor],
        ),
      })),
    ).toEqual([
      {
        mode: 'monochrome',
        labels: [
          ['mana 100/100', 'mana'],
          ['34.4k gold', 'gold'],
          ['sage seed', 'seed'],
          ['sage', 'herb'],
        ],
      },
      {
        mode: 'resources',
        labels: [
          ['mana 100/100', 'mana'],
          ['34.4k gold', 'gold'],
          ['sage seed', 'seed'],
          ['sage', 'herb'],
        ],
      },
    ]);

    expect(
      [...stage.querySelectorAll('.room-top-panel__character-button')].map((button) => ({
        character: button.dataset.character,
        label: button.textContent,
        hasIcon: Boolean(button.querySelector('.room-top-panel__character-option-icon')),
        hasLabel: Boolean(button.querySelector('.room-top-panel__character-option-label')),
      })),
    ).toEqual([
      { character: 'elara', label: 'elara', hasIcon: true, hasLabel: true },
      { character: 'mira', label: 'mira', hasIcon: true, hasLabel: true },
      { character: 'bramble', label: 'bramble', hasIcon: true, hasLabel: true },
      { character: 'corvin', label: 'corvin', hasIcon: true, hasLabel: true },
      { character: 'juniper', label: 'juniper', hasIcon: true, hasLabel: true },
      { character: 'rowan', label: 'rowan', hasIcon: true, hasLabel: true },
    ]);
    expect(
      [
        ...stage.querySelectorAll(
          '#room-top-panel-settings-account .room-top-panel__character-buttons > .room-top-panel__character-button',
        ),
      ],
    ).toHaveLength(6);
    expect(
      stage.querySelectorAll(
        '#room-top-panel-settings-account .room-top-panel__character-section .room-top-panel__visual-option-price',
      ),
    ).toHaveLength(0);

    const iconPreviews = [
      ...stage.querySelectorAll('.room-top-panel__icon-preview'),
    ].map((preview) => ({
      mode: preview.dataset.previewIcons,
      labels: [...preview.querySelectorAll('.room-top-panel__icon-preview-item')].map(
        (item) => item.textContent,
      ),
      hasGoldIcon: Boolean(preview.querySelector('.style-resource-label--gold')),
      hasSeedIcon: Boolean(preview.querySelector('.style-seed-label')),
      hasPotionIcon: Boolean(preview.querySelector('.style-potion-label')),
    }));

    expect(iconPreviews).toEqual([
      {
        mode: 'none',
        labels: ['34.4k gold', 'sage seed', 'mana tonic'],
        hasGoldIcon: true,
        hasSeedIcon: true,
        hasPotionIcon: true,
      },
      {
        mode: 'icons',
        labels: ['34.4k gold', 'sage seed', 'mana tonic'],
        hasGoldIcon: true,
        hasSeedIcon: true,
        hasPotionIcon: true,
      },
    ]);
  });
});
