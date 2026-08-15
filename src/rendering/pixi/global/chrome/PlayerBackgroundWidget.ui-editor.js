import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import {
  PLAYER_PROFILE_SIZE,
  PlayerBackgroundWidget,
} from './PlayerProfileWidgets.js';

const WIDGET_ID = 'primitive.player-background';
const DISPLAY_SIZE = PLAYER_PROFILE_SIZE / PIXI_UI_GEOMETRY.sourceScale;

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createThumbnail,
  folderPath: ['Player'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Player Background',
  properties: [
    { label: 'Production class', value: 'PlayerBackgroundWidget' },
    { label: 'Contract', value: 'Tintable profile frame and inner decoration' },
  ],
  scenarios: [
    { fixture: { tint: 0xffffff }, id: 'classic', label: 'Classic', mount },
    { fixture: { tint: 0x2ed46f }, id: 'emerald', label: 'Emerald', mount },
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
    component: 'PlayerBackgroundWidget',
    createControl: ({ assets }) =>
      createControl({ assets, fixture: { tint: 0x2ed46f } }),
    id: WIDGET_ID,
  });
}

async function mount(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter,
    component: 'PlayerBackgroundWidget',
    createControl: ({ assets }) => createControl({ assets, fixture }),
  });
}

function createControl({ assets, fixture }) {
  const widget = new PlayerBackgroundWidget({
    assets,
    label: 'playerBackground',
  });
  widget.setTint(fixture?.tint ?? 0xffffff);
  widget.scale.set(1 / PIXI_UI_GEOMETRY.sourceScale);
  return {
    destroy: () => widget.destroy({ children: true }),
    height: DISPLAY_SIZE,
    root: widget,
    width: DISPLAY_SIZE,
  };
}

function assetFilter({ id }) {
  return String(id ?? '').startsWith(
    'source:assets/ui/root-run-top-hud/avatar-',
  );
}
