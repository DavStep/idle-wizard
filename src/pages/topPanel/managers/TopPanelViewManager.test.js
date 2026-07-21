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
      stage.querySelector('.room-top-panel__quest-progress')?.hasAttribute('hidden'),
    ).toBe(true);
    expect(stage.querySelector('.room-top-panel__level-star')?.getAttribute('src')).toContain(
      '/ui/level-star.webp',
    );
    expect(stage.querySelector('.room-top-panel__quest-progress-fill')).not.toBeNull();
    expect(
      stage.querySelector('.room-top-panel__quest-progress-rail')?.getAttribute('role'),
    ).toBe('progressbar');
    expect(
      stage.querySelector('.room-top-panel__quest-progress-text')?.getAttribute('aria-live'),
    ).toBe('polite');

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
        '#room-top-panel-settings-avatar .room-top-panel__character-section.style-box',
      ),
    ).toBeNull();
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
      [...stage.querySelectorAll('.room-top-panel__settings-tab-button')].every(
        (button) => button.getAttribute('role') === 'tab',
      ),
    ).toBe(true);
    expect(
      stage.querySelector('.room-top-panel__level-pager')?.getAttribute('role'),
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
    ).toEqual(['black', 'midnight', 'witchcraft']);

    expect(
      [...stage.querySelectorAll('.room-top-panel__theme-preview-box')].map(
        (box) => box.querySelector('.room-top-panel__theme-preview-title')?.textContent,
      ),
    ).toEqual(['sample', 'sample', 'sample']);

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
      ['notched', '68%'],
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
    const lockedAvatarButton = stage.querySelector(
      '#room-top-panel-settings-avatar .room-top-panel__character-button[data-character="adventurer_cleric"]',
    );
    expect(
      lockedAvatarButton?.querySelector('.room-top-panel__character-lock svg')?.dataset
        .assetAtlasFrame,
    ).toBe('status:lockDefault');
    expect(
      lockedAvatarButton?.querySelector('.room-top-panel__character-check svg')?.dataset
        .assetAtlasFrame,
    ).toBe('status:checkDefault');
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

  it('renders the bronze progress style with a continuous engraved stroke', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const notchedRootRule = baseCss.match(
      /:root\[data-style-progress="notched"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const notchedPreviewRule = baseCss.match(
      /\.room-top-panel__progress-preview\[data-preview-progress="notched"\]\s+\.room-top-panel__preview-progress-fill\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(notchedRootRule).toMatch(
      /--style-progress-fill-background:\s*var\(--style-progress-notched-fill\);/,
    );
    expect(notchedRootRule).toMatch(
      /--style-progress-fill-shadow:\s*inset 0 1px 0\s*var\(--style-progress-notched-stroke-light\),\s*inset 0 -1px 0 var\(--style-progress-notched-stroke-dark\);/,
    );
    expect(baseCss).not.toMatch(
      /:root\[data-style-progress="notched"\][^{]*\.style-progress[^:]*::after/,
    );
    expect(notchedPreviewRule).toMatch(
      /\bbackground:\s*var\(--style-progress-notched-fill\);/,
    );
    expect(notchedPreviewRule).toMatch(
      /\bbox-shadow:\s*inset 0 1px 0 var\(--style-progress-notched-stroke-light\),\s*inset 0 -1px 0 var\(--style-progress-notched-stroke-dark\);/,
    );
  });

  it('keeps top-panel character images larger than the shared inline icon default', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const topAvatarRule = baseCss.match(
      /\.room-top-panel__avatar-button \.room-top-panel__username-avatar\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const pickerAvatarRule = baseCss.match(
      /\.room-top-panel__character-button \.room-top-panel__character-option-icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const pickerFrameRule = baseCss.match(
      /\.room-top-panel__character-option-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const lockedFrameRule = baseCss.match(
      /\.room-top-panel__character-button\.is-unresearched\s+\.room-top-panel__character-option-frame\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const silhouetteBaseRule = baseCss.match(
      /\.room-top-panel__character-option-silhouette\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const statusBaseRule = baseCss.match(
      /\.room-top-panel__character-status\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const lockedSilhouetteRule = baseCss.match(
      /\.room-top-panel__character-button\.is-unresearched\s+\.room-top-panel__character-option-silhouette\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const lockedIconRule = baseCss.match(
      /\.room-top-panel__character-button\.is-unresearched:not\(\[aria-checked="true"\]\)\s+\.room-top-panel__character-lock\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const checkedIconRule = baseCss.match(
      /\.room-top-panel__character-button\[aria-checked="true"\]\s+\.room-top-panel__character-check\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(topAvatarRule).toMatch(/\bwidth:\s*var\(--room-top-panel-avatar-size\);/);
    expect(topAvatarRule).toMatch(/\bheight:\s*86px;/);
    expect(topAvatarRule).toMatch(/\bborder:\s*0;/);
    expect(pickerFrameRule).toMatch(/\bwidth:\s*72px;/);
    expect(pickerFrameRule).toMatch(/\bheight:\s*72px;/);
    expect(pickerAvatarRule).toMatch(/\bwidth:\s*100%;/);
    expect(pickerAvatarRule).toMatch(/\bheight:\s*100%;/);
    expect(lockedFrameRule).toMatch(/\bborder-color:\s*var\(--style-stroke\);/);
    expect(silhouetteBaseRule).toMatch(/\bbackground:\s*var\(--style-stroke\);/);
    expect(statusBaseRule).toMatch(/\bbackground:\s*transparent;/);
    expect(lockedSilhouetteRule).toMatch(/\bdisplay:\s*block;/);
    expect(lockedIconRule).toMatch(/\bdisplay:\s*flex;/);
    expect(checkedIconRule).toMatch(/\bdisplay:\s*flex;/);
  });

  it('reserves compact spacing for the composed player card', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const topPanelRule = baseCss.match(
      /\.style-panel\.room-top-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(topPanelRule).toMatch(/--room-top-panel-avatar-size:\s*64px;/);
    expect(topPanelRule).toMatch(/--room-top-panel-avatar-column-size:\s*50px;/);
    expect(topPanelRule).toMatch(/--room-top-panel-level-size:\s*28px;/);
    expect(topPanelRule).toMatch(/\bgap:\s*2px 7px;/);
    expect(topPanelRule).toMatch(/\bpadding-bottom:\s*9px;/);
    expect(topPanelRule).toMatch(/\bpadding-left:\s*3px;/);
  });

  it('uses one continuous quest fill, divider ticks, and compact caption copy', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const fillRule = baseCss.match(
      /\.room-top-panel__quest-progress-fill\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const railRule = baseCss.match(
      /\.room-top-panel__quest-progress-rail\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const segmentsRule = baseCss.match(
      /\.room-top-panel__quest-segments\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const segmentRule = baseCss.match(
      /\.room-top-panel__quest-segment\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const dividerRule = baseCss.match(
      /\.room-top-panel__quest-segment \+ \.room-top-panel__quest-segment\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const completedDividerRule = baseCss.match(
      /\.room-top-panel__quest-segment\.is-complete\s*\+\s*\.room-top-panel__quest-segment::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const captionRule = baseCss.match(
      /\.room-top-panel__quest-progress-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toMatch(/--style-resource-mana:\s*#2da9ff;/);
    expect(fillRule).toMatch(
      /\bclip-path:\s*inset\(0 var\(--room-top-panel-quest-fill-clip-right, 100%\) 0 0\);/,
    );
    expect(fillRule).not.toMatch(/scaleX/);
    expect(baseCss).not.toMatch(/--room-top-panel-quest-track-frame/);
    expect(baseCss).not.toMatch(/\.room-top-panel__quest-progress-rail::before/);
    expect(railRule).toMatch(/\bbackground:\s*#0d1118;/);
    expect(railRule).toMatch(/\bborder:\s*1px solid #41434d;/);
    expect(railRule).toMatch(/\bborder-radius:\s*5px;/);
    expect(fillRule).toMatch(/\binset:\s*2px;/);
    expect(segmentsRule).toMatch(/\binset:\s*2px;/);
    expect(fillRule).toMatch(/\bbackground:\s*#8740df;/);
    expect(fillRule).toMatch(/\bborder-radius:\s*2\.5px 0 0 2\.5px;/);
    expect(fillRule).toMatch(/\bbox-shadow:\s*none;/);
    expect(fillRule).not.toMatch(/linear-gradient/);
    expect(segmentRule).toMatch(/\bbackground:\s*transparent;/);
    expect(dividerRule).toMatch(/\bposition:\s*relative;/);
    expect(completedDividerRule).toMatch(/\bbackground:\s*rgb\(32 19 49 \/ 82%\);/);
    expect(captionRule).toMatch(/\bfont-size:\s*7px;/);
    expect(captionRule).toMatch(/\btext-align:\s*left;/);

  });

  it('keeps quest progress hidden until first-run requests are revealed', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const hiddenRule = baseCss.match(
      /\.game-stage\[data-tutorial-reveal\]\s+\.room-top-panel__quest-progress\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const revealedRule = baseCss.match(
      /\.game-stage\[data-tutorial-reveal~="tasks"\]\s+\.room-top-panel__quest-progress:not\(\[hidden\]\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(hiddenRule).toMatch(/\bdisplay:\s*none;/);
    expect(revealedRule).toMatch(/\bdisplay:\s*grid;/);
  });

  it('keeps amount-icon labels tight when resource words are hidden', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const itemIconRule = baseCss.match(
      /\.style-seed-label__icon,\s*\.style-herb-label__icon,\s*\.style-potion-label__icon,\s*\.style-ingredient-label__icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const globalSpacerRule = baseCss.match(
      /:root\[data-style-icons="icons"\]\s+\.style-resource-label__spacer\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const globalAmountIconRule = baseCss.match(
      /:root\[data-style-icons="icons"\]\s+\.style-resource-label__amount\s*\+\s*\.style-resource-label__spacer\s*\+\s*\.style-resource-label__icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const previewSpacerRule = baseCss.match(
      /:root\s+\.room-top-panel__icon-preview\[data-preview-icons="icons"\]\s+\.style-resource-label__spacer\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const previewAmountIconRule = baseCss.match(
      /:root\s+\.room-top-panel__icon-preview\[data-preview-icons="icons"\]\s+\.style-resource-label__amount\s*\+\s*\.style-resource-label__spacer\s*\+\s*\.style-resource-label__icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toMatch(/--style-icon-label-gap:\s*0\.14em;/);
    expect(itemIconRule).toMatch(/\bmargin-right:\s*var\(--style-icon-label-gap\);/);
    expect(globalSpacerRule).toMatch(/\bdisplay:\s*none;/);
    expect(globalAmountIconRule).toMatch(
      /\bmargin-left:\s*var\(--style-icon-label-gap\);/,
    );
    expect(previewSpacerRule).toMatch(/\bdisplay:\s*none;/);
    expect(previewAmountIconRule).toMatch(
      /\bmargin-left:\s*var\(--style-icon-label-gap\);/,
    );
  });

  it('labels level reward sections and keeps the level dialog non-scrollable', () => {
    const stage = document.createElement('section');
    const manager = new TopPanelViewManager();

    manager.mount(stage);

    expect(
      [...stage.querySelectorAll('.room-top-panel__level-section-label')].map(
        (label) => label.textContent,
      ),
    ).toEqual(['bonuses gained at this level', 'total bonuses at this level']);

    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rootRule = baseCss.match(/:root\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const dialogRule = baseCss.match(
      /\.style-dialog\.room-top-panel__level-dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const contentRule = baseCss.match(
      /\.room-top-panel__level-content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rootRule).toMatch(/--room-top-panel-level-dialog-height:\s*360px;/);
    expect(dialogRule).toMatch(
      /\bheight:\s*var\(--room-top-panel-level-dialog-height\);/,
    );
    expect(contentRule).toMatch(/\boverflow:\s*visible;/);
    expect(contentRule).not.toMatch(/\boverflow:\s*hidden auto;/);
  });
});
