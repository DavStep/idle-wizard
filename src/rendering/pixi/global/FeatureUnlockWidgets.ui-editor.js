import { Container } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../theme/PixiThemeTokens.js';
import { FeatureUnlockFlyoutWidget } from './chrome/PixiBottomPanelView.js';
import { FeatureUnlockAnnouncementItem } from './dialogs/PixiMessageDialogs.js';

const FLYOUT_ID = 'compound.feature-unlock-flyout';
const ANNOUNCEMENT_ID = 'compound.feature-unlock-announcement-item';

export default [
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createFlyoutThumbnail,
    folderPath: ['Feedback'],
    id: FLYOUT_ID,
    kind: 'widget',
    label: 'Feature Unlock Flyout',
    properties: [
      { label: 'Production class', value: 'FeatureUnlockFlyoutWidget' },
      { label: 'Contract', value: 'Room icon flight from announcement to destination tab' },
    ],
    scenarios: [
      { fixture: { progress: 0, pageId: 'garden' }, id: 'origin', label: 'Origin', mount: mountFlyout },
      { fixture: { progress: 0.5, pageId: 'garden' }, id: 'travel', label: 'Travel', mount: mountFlyout },
      { fixture: { progress: 1, pageId: 'garden' }, id: 'destination', label: 'Destination', mount: mountFlyout },
    ],
    sectionId: 'composite-widgets',
    usages: [
      { label: 'Bottom navigation unlock celebration', source: 'src/rendering/pixi/global/chrome/PixiBottomPanelView.js' },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createAnnouncementThumbnail,
    folderPath: ['Feedback'],
    id: ANNOUNCEMENT_ID,
    kind: 'widget',
    label: 'Feature Unlock Announcement Item',
    properties: [
      { label: 'Production class', value: 'FeatureUnlockAnnouncementItem' },
      { label: 'Contract', value: 'Feature, level-reward, or research-unlock icon stage with label and bottom detail' },
    ],
    scenarios: [
      { fixture: createAnnouncementFixture(), id: 'single', label: 'Single feature', mount: mountAnnouncement },
      { fixture: createAnnouncementFixture({ compact: true, detail: '', label: 'Garden' }), id: 'compact', label: 'Compact grid item', mount: mountAnnouncement },
      { fixture: createAnnouncementFixture({ detail: 'A new social room is now available.', fallbackLabel: 'G', label: 'Guild', pageId: 'guild' }), id: 'fallback', label: 'Fallback icon', mount: mountAnnouncement },
      { fixture: createAnnouncementFixture({ detail: '+50', icon: { frameName: 'resource:mana' }, label: 'Mana Capacity', variant: 'reward' }), id: 'level-reward', label: 'Large level reward', mount: mountAnnouncement },
      { fixture: createAnnouncementFixture({ detail: 'Now available in Research', icon: { frameName: 'research:autoBrew' }, label: 'Auto Brew', lockedReveal: true, pageId: 'research', variant: 'researchUnlock' }), id: 'research-unlock', label: 'Locked research reveal', mount: mountAnnouncement },
    ],
    sectionId: 'composite-widgets',
    usages: [
      { label: 'Full-screen feature unlock announcement', source: 'src/rendering/pixi/global/dialogs/PixiMessageDialogs.js' },
      { label: 'Level reward and research unlock sequence', source: 'src/rendering/pixi/global/dialogs/PixiMessageDialogs.js' },
    ],
  }),
];

function createFlyoutThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: featureAssetFilter,
    component: 'FeatureUnlockFlyoutWidget',
    createControl: ({ assets }) => createFlyoutControl({ assets, fixture: { progress: 0.5, pageId: 'garden' } }),
    id: FLYOUT_ID,
  });
}

function createAnnouncementThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: featureAssetFilter,
    component: 'FeatureUnlockAnnouncementItem',
    createControl: ({ assets }) => createAnnouncementControl({ assets, fixture: createAnnouncementFixture() }),
    id: ANNOUNCEMENT_ID,
  });
}

async function mountFlyout(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: featureAssetFilter,
    component: 'FeatureUnlockFlyoutWidget',
    createControl: ({ assets }) => createFlyoutControl({ assets, fixture }),
  });
}

async function mountAnnouncement(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: featureAssetFilter,
    component: 'FeatureUnlockAnnouncementItem',
    createControl: ({ assets }) => createAnnouncementControl({ assets, fixture }),
  });
}

function createFlyoutControl({ assets, fixture }) {
  const root = new Container({ label: 'uiLabFeatureUnlockFlyout' });
  const widget = new FeatureUnlockFlyoutWidget({ parent: root });
  widget.bind({
    arcHeight: 58,
    height: 50,
    origin: { x: 48, y: 102 },
    sourceScale: 0.72,
    target: { x: 250, y: 102 },
    targetScale: 1,
    texture: assets.getTexture(`source:assets/icons/icon-${fixture.pageId}-plot-tab.png`),
    width: 50,
  });
  widget.update(fixture.progress);
  return {
    destroy: () => {
      widget.destroy();
      root.destroy();
    },
    height: 140,
    root,
    widget,
    width: 300,
  };
}

function createAnnouncementControl({ assets, fixture }) {
  const widget = new FeatureUnlockAnnouncementItem({
    assets,
    label: 'uiLabFeatureUnlockAnnouncementItem',
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
  });
  widget.bind({
    compact: fixture.compact,
    detail: fixture.detail,
    lockedReveal: fixture.lockedReveal,
    icon:
      fixture.icon ??
      (fixture.fallbackLabel
        ? { fallbackLabel: fixture.fallbackLabel }
        : { assetId: 'source:assets/icons/icon-garden-plot-tab.png' }),
    label: fixture.label,
    pageId: fixture.pageId,
    variant: fixture.variant,
  });
  widget.setBounds(0, 0, fixture.compact ? 86 : 260, fixture.compact);
  return {
    destroy: () => widget.destroy(),
    height: widget.preferredHeight,
    root: widget.root,
    widget,
    width: fixture.compact ? 86 : 260,
  };
}

function createAnnouncementFixture(overrides = {}) {
  return {
    compact: false,
    detail: 'Grow herbs and harvest ingredients for Brewing.',
    label: 'Garden unlocked',
    pageId: 'garden',
    variant: 'feature',
    ...overrides,
  };
}

function featureAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return (
    assetId.includes('/icons/') ||
    assetId.includes('/ui/prop_lock')
  );
}
