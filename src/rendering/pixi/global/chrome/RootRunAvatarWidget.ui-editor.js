import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import { RootRunAvatarWidget } from './RootRunTopHudWidgets.js';

const AVATAR_AUTHORED_SIZE = 186;
const AVATAR_DISPLAY_SIZE = AVATAR_AUTHORED_SIZE / PIXI_UI_GEOMETRY.sourceScale;

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createAvatarThumbnail,
  folderPath: ['HUD'],
  id: 'compound.player-avatar',
  kind: 'widget',
  label: 'Player Avatar',
  properties: [
    { label: 'Production class', value: 'RootRunAvatarWidget' },
    { label: 'Contract', value: 'Framed player portrait visual' },
  ],
  scenarios: [
    {
      fixture: { character: 'mira', frameTint: 0xffffff },
      id: 'mira',
      label: 'Mira',
      mount: mountAvatar,
    },
    {
      fixture: { character: 'elara', frameTint: 0x79b93f },
      id: 'tinted-frame',
      label: 'Tinted Frame',
      mount: mountAvatar,
    },
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'Top panel avatar button',
      source: 'src/rendering/pixi/global/chrome/RootRunTopHudWidgets.js',
    },
    {
      label: 'Player Info dialog',
      source: 'src/rendering/pixi/global/dialogs/PixiPlayerInfoDialog.js',
    },
  ],
});

function createAvatarThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: avatarAssetFilter,
    component: 'RootRunAvatarWidget',
    createControl: ({ assets }) =>
      createAvatarControl({
        assets,
        fixture: { character: 'mira', frameTint: 0xffffff },
      }),
    id: 'compound.player-avatar',
  });
}

async function mountAvatar(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: avatarAssetFilter,
    component: 'RootRunAvatarWidget',
    createControl: ({ assets }) => createAvatarControl({ assets, fixture }),
  });
}

function createAvatarControl({ assets, fixture }) {
  const character = String(fixture?.character ?? 'elara');
  const avatar = new RootRunAvatarWidget({
    assets,
    texture: assets.getTexture(`source:assets/avatars/${character}.png`),
    label: 'playerAvatar',
  });
  avatar.setFrameTint(fixture?.frameTint ?? 0xffffff);
  avatar.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);

  return {
    atomicComponents: createAvatarHierarchy(avatar),
    destroy: () => avatar.destroy({ children: true }),
    height: AVATAR_DISPLAY_SIZE,
    root: avatar,
    width: AVATAR_DISPLAY_SIZE,
  };
}

function createAvatarHierarchy(avatar) {
  return [
    createUiEditorPixiHierarchyComponent({
      displayObjects: [avatar.avatarFrame],
      id: 'player-avatar:frame',
      label: 'Frame',
      primary: avatar.avatarFrame,
      type: 'image',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [avatar.headBackground],
      id: 'player-avatar:background',
      label: 'Background',
      primary: avatar.headBackground,
      type: 'image',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [avatar.portrait],
      id: 'player-avatar:portrait',
      label: 'Portrait',
      primary: avatar.portrait,
      type: 'image',
    }),
  ];
}

function avatarAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return assetId.startsWith('source:assets/avatars/') ||
    assetId.startsWith('source:assets/ui/root-run-top-hud/');
}
