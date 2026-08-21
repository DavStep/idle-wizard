import { describe, expect, it } from 'vitest';

import chromeIntegrations from './chrome/GlobalChrome.ui-editor.js';
import selectableProfileIntegration from './dialogs/PlayerSelectableProfileWidget.ui-editor.js';
import loadingIntegration from './gates/PixiLoadingSplash.ui-editor.js';
import badgeIntegration from './transient/PixiNotificationBadges.ui-editor.js';
import rewardIntegration from './transient/PixiTransientEffectsLayer.ui-editor.js';
import tutorialIntegration from './tutorial/TutorialPixiOverlay.ui-editor.js';

describe('shared Pixi UI editor integrations', () => {
  it('exposes each shared production widget with a passive library thumbnail', () => {
    const integrations = [
      ...chromeIntegrations,
      selectableProfileIntegration,
      loadingIntegration,
      badgeIntegration,
      rewardIntegration,
      tutorialIntegration,
    ];

    expect(integrations.map(({ id }) => id)).toEqual([
      'compound.player-hud',
      'compound.compact-world-chat',
      'compound.player-selectable-profile',
      'global.loading-splash',
      'primitive.notification-badge',
      'compound.reward-flyout',
      'compound.tutorial-lesson-surface',
    ]);
    expect(
      integrations.every(
        ({ createThumbnail, kind, scenarios }) =>
          kind === 'widget' &&
          typeof createThumbnail === 'function' &&
          scenarios.length > 0,
      ),
    ).toBe(true);
  });

  it('declares the independently selectable pieces used by compound chrome', () => {
    expect(chromeIntegrations[0].childWidgetIds).toEqual([
      'compound.player-profile',
      'compound.hud-level-rail',
      'compound.hud-currency-capsule',
      'compound.hud-bag-capsule',
      'hud-avatar-button',
      'hud-settings-button',
      'primitive.notification-badge',
    ]);
    expect(chromeIntegrations[1].childWidgetIds).toEqual([
      'primitive.retained-panel',
      'compound.player-profile',
    ]);
  });
});
