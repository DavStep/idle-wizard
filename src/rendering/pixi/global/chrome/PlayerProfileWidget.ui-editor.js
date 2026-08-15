import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import {
  PLAYER_PROFILE_SIZE,
  PlayerProfileWidget,
} from './PlayerProfileWidgets.js';

const WIDGET_ID = 'compound.player-profile';
const DISPLAY_SIZE = PLAYER_PROFILE_SIZE / PIXI_UI_GEOMETRY.sourceScale;

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: ['primitive.player-background', 'primitive.player-avatar'],
  createThumbnail: createProfileThumbnail,
  folderPath: ['Player'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Player Profile',
  properties: [
    { label: 'Production class', value: 'PlayerProfileWidget' },
    {
      label: 'Contract',
      value: 'Passive player background plus masked avatar',
    },
  ],
  scenarios: [
    {
      fixture: { character: 'mira', frameTint: 0xffffff },
      id: 'mira',
      label: 'Mira',
      mount: mountProfile,
    },
    {
      fixture: { character: 'elara', frameTint: 0xd41414 },
      id: 'tinted-background',
      label: 'Tinted Background',
      mount: mountProfile,
    },
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'Top panel avatar button',
      source: 'src/rendering/pixi/global/chrome/RootRunTopHudWidgets.js',
    },
    {
      label: 'Wizard profile preview',
      source: 'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
    },
    {
      label: 'Player Info dialog',
      source: 'src/rendering/pixi/global/dialogs/PixiPlayerInfoDialog.js',
    },
  ],
});

function createProfileThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: playerProfileAssetFilter,
    component: 'PlayerProfileWidget',
    createControl: ({ assets }) =>
      createProfileControl({
        assets,
        fixture: { character: 'mira', frameTint: 0xffffff },
      }),
    id: WIDGET_ID,
  });
}

async function mountProfile(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: playerProfileAssetFilter,
    component: 'PlayerProfileWidget',
    createControl: ({ assets }) => createProfileControl({ assets, fixture }),
  });
}

function createProfileControl({ assets, fixture }) {
  const character = String(fixture?.character ?? 'elara');
  const profile = new PlayerProfileWidget({
    assets,
    texture: assets.getTexture(`source:assets/avatars/${character}.png`),
    label: 'playerProfile',
  });
  profile.setBackgroundTint(fixture?.frameTint ?? 0xffffff);
  profile.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);

  return {
    atomicComponents: [
      createUiEditorPixiHierarchyComponent({
        displayObjects: [profile.backgroundWidget],
        id: 'player-profile:background',
        label: 'Background:PlayerBackgroundWidget',
        libraryEntryId: 'primitive.player-background',
        primary: profile.backgroundWidget,
        type: 'widget',
      }),
      createUiEditorPixiHierarchyComponent({
        displayObjects: [profile.avatarWidget],
        id: 'player-profile:avatar',
        label: 'Avatar:PlayerAvatarWidget',
        libraryEntryId: 'primitive.player-avatar',
        primary: profile.avatarWidget,
        type: 'widget',
      }),
    ],
    destroy: () => profile.destroy({ children: true }),
    height: DISPLAY_SIZE,
    root: profile,
    width: DISPLAY_SIZE,
  };
}

function playerProfileAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return (
    assetId.startsWith('source:assets/avatars/') ||
    assetId.startsWith('source:assets/ui/root-run-top-hud/')
  );
}
