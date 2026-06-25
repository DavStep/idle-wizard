/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

import { TopPanelViewManager } from './TopPanelViewManager.js';

describe('TopPanelViewManager', () => {
  it('renders visual setting previews and account settings', () => {
    const stage = document.createElement('section');
    const manager = new TopPanelViewManager();

    manager.mount(stage);

    const usernameButton = stage.querySelector('.room-top-panel__username');
    expect(usernameButton?.textContent).toBe('wizard');
    const avatarButton = stage.querySelector('.room-top-panel__avatar-button');
    expect(avatarButton).not.toBeNull();
    expect(
      avatarButton
        ?.querySelector('.room-top-panel__username-avatar')
        ?.getAttribute('src'),
    ).toContain('/assets/characters/elara.png');
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
    ).toBeNull();
    expect(
      stage.querySelector(
        '#room-top-panel-settings-avatar .room-top-panel__character-section',
      ),
    ).not.toBeNull();
    expect(
      stage.querySelector(
        '#room-top-panel-settings-theme .room-top-panel__character-section',
      ),
    ).toBeNull();
    expect(
      [...stage.querySelectorAll('.room-top-panel__settings-tab-button')].map((button) => [
        button.dataset.settingsTab,
        button.textContent,
      ]),
    ).toEqual([
      ['account', 'account'],
      ['report', 'report'],
      ['theme', 'configurations'],
    ]);
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
      [
        ...stage.querySelectorAll(
          '#room-top-panel-settings-theme > .room-top-panel__settings-section > .style-box__title',
        ),
      ].map((title) => title.textContent),
    ).toEqual([
      'device',
      'theme',
      'font',
      'progress bar',
    ]);

    expect(stage.querySelector('.room-top-panel__plotView-section')).toBeNull();
    expect(stage.querySelector('.room-top-panel__plot-view-button')).toBeNull();

    expect(
      [...stage.querySelectorAll('.room-top-panel__color-preview')].map((preview) => ({
        mode: preview.dataset.previewColor,
        labels: [...preview.querySelectorAll('.room-top-panel__color-preview-item')].map(
          (item) => [item.textContent, item.dataset.resourceColor],
        ),
      })),
    ).toEqual([]);

    expect(
      [
        ...stage.querySelectorAll(
          '#room-top-panel-settings-avatar .room-top-panel__character-buttons > .room-top-panel__character-button',
        ),
      ].map((button) => button.dataset.character),
    ).toContain('mira');
    expect(
      stage.querySelectorAll(
        '#room-top-panel-settings-avatar .room-top-panel__character-section .room-top-panel__visual-option-price',
      ),
    ).toHaveLength(0);

    const iconPreviews = [
      ...stage.querySelectorAll('.room-top-panel__icon-preview'),
    ].map((preview) => ({
      mode: preview.dataset.previewIcons,
      labels: [...preview.querySelectorAll('.room-top-panel__icon-preview-item')].map(
        (item) => item.textContent,
      ),
      hasCoinIcon: Boolean(preview.querySelector('.style-resource-label--coin')),
      hasSeedIcon: Boolean(preview.querySelector('.style-seed-label')),
      hasPotionIcon: Boolean(preview.querySelector('.style-potion-label')),
    }));

    expect(iconPreviews).toEqual([]);
  });

  it('keeps top-panel character images larger than the shared inline icon default', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const topAvatarRule = baseCss.match(
      /\.room-top-panel__avatar-button \.room-top-panel__username-avatar\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const pickerAvatarRule = baseCss.match(
      /\.room-top-panel__character-button \.room-top-panel__character-option-icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(topAvatarRule).toMatch(/\bwidth:\s*var\(--room-top-panel-avatar-size\);/);
    expect(topAvatarRule).toMatch(/\bheight:\s*var\(--room-top-panel-avatar-size\);/);
    expect(topAvatarRule).toMatch(/\bborder:\s*0;/);
    expect(pickerAvatarRule).toMatch(/\bwidth:\s*72px;/);
    expect(pickerAvatarRule).toMatch(/\bheight:\s*72px;/);
  });

  it('keeps top-panel identity chrome tight to the left edge', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const topPanelRule = baseCss.match(
      /\.style-panel\.room-top-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(topPanelRule).toMatch(/\bgap:\s*2px 6px;/);
    expect(topPanelRule).toMatch(/\bpadding-left:\s*2px;/);
  });
});
