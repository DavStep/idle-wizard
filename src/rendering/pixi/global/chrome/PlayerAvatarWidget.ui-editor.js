import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import {
  PLAYER_PROFILE_SIZE,
  PlayerAvatarWidget,
} from './PlayerProfileWidgets.js';

const WIDGET_ID = 'primitive.player-avatar';
const DISPLAY_SIZE = PLAYER_PROFILE_SIZE / PIXI_UI_GEOMETRY.sourceScale;

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createThumbnail,
  folderPath: ['Player'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Player Avatar',
  properties: [
    { label: 'Production class', value: 'PlayerAvatarWidget' },
    {
      label: 'Contract',
      value: 'Fully contained player portrait without profile background',
    },
  ],
  scenarios: [
    { fixture: { character: 'mira' }, id: 'mira', label: 'Mira', mount },
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'Player Profile',
      source: 'src/rendering/pixi/global/chrome/PlayerProfileWidgets.js',
    },
  ],
});

function createThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter,
    component: 'PlayerAvatarWidget',
    createControl: ({ assets }) =>
      createControl({ assets, fixture: { character: 'mira' } }),
    id: WIDGET_ID,
  });
}

async function mount(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter,
    component: 'PlayerAvatarWidget',
    createControl: ({ assets }) => createControl({ assets, fixture }),
  });
}

function createControl({ assets, fixture }) {
  const character = String(fixture?.character ?? 'elara');
  const widget = new PlayerAvatarWidget({
    texture: assets.getTexture(`source:assets/avatars/${character}.png`),
    label: 'playerAvatar',
  });
  widget.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);
  return {
    destroy: () => widget.destroy({ children: true }),
    height: DISPLAY_SIZE,
    root: widget,
    width: DISPLAY_SIZE,
  };
}

function assetFilter({ id }) {
  return String(id ?? '').startsWith('source:assets/avatars/');
}
