import { Container, Graphics } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { PixiNotificationBadge } from './PixiNotificationBadges.js';

const WIDGET_ID = 'primitive.notification-badge';

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createBadgeThumbnail,
  folderPath: ['Feedback'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Notification Badge',
  properties: [
    { label: 'Production class', value: 'PixiNotificationBadge' },
    { label: 'Contract', value: 'Shared red or orange top-right notification dot' },
  ],
  scenarios: [
    { fixture: { inside: false, tone: 'red' }, id: 'red', label: 'Red, outside corner', mount: mountBadge },
    { fixture: { inside: false, tone: 'orange' }, id: 'orange', label: 'Orange, outside corner', mount: mountBadge },
    { fixture: { inside: true, tone: 'red' }, id: 'inside', label: 'Inside tab corner', mount: mountBadge },
  ],
  sectionId: 'composite-widgets',
  usages: [
    { label: 'Room tabs, inventory rows, quests, and controls', source: 'src/rendering/pixi/global/transient/PixiNotificationBadges.js' },
  ],
});

function createBadgeThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: badgeAssetFilter,
    component: 'PixiNotificationBadge',
    createControl: ({ assets }) => createBadgeControl({ assets, fixture: { tone: 'red' }, compact: true }),
    id: WIDGET_ID,
  });
}

async function mountBadge(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: badgeAssetFilter,
    component: 'PixiNotificationBadge',
    createControl: ({ assets }) => createBadgeControl({ assets, fixture }),
  });
}

function createBadgeControl({ assets, fixture, compact = false }) {
  const width = compact ? 42 : 160;
  const height = compact ? 42 : 72;
  const root = new Container({ label: 'uiLabNotificationBadge' });
  const target = new Graphics({ label: 'uiLabNotificationBadge:target' })
    .roundRect(8, 12, width - 24, height - 24, 8)
    .fill({ color: 0x293248 })
    .stroke({ color: 0x5e6985, width: 2 });
  root.addChild(target);
  const badge = new PixiNotificationBadge({ assetManager: assets });
  root.addChild(badge.root);
  badge.setTone(fixture.tone).setActive(true);
  const bounds = { x: 8, y: 12, width: width - 24, height: height - 24 };
  if (fixture.inside) {
    badge.placeInsideTopRight(bounds);
  } else {
    badge.placeAtTopRight(bounds);
  }
  return {
    badge,
    destroy: () => {
      badge.destroy();
      target.destroy();
      root.destroy();
    },
    height,
    root,
    width,
  };
}

function badgeAssetFilter({ id }) {
  return String(id ?? '').includes('/ui/notifications/');
}
