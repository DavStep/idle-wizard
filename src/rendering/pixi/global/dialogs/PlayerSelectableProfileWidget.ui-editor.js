import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { PlayerSelectableProfileWidget } from '../chrome/PlayerProfileWidgets.js';

const WIDGET_ID = 'compound.player-selectable-profile';
const TILE_SIZE = 61;

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: ['compound.player-profile'],
  createThumbnail: createThumbnail,
  folderPath: ['Player'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Player Selectable Profile',
  properties: [
    { label: 'Production class', value: 'PlayerSelectableProfileWidget' },
    {
      label: 'Contract',
      value: 'Player profile with picker-only interaction and state overlays',
    },
  ],
  scenarios: [
    {
      fixture: { key: 'elara', researched: true },
      id: 'available',
      label: 'Available',
      mount,
    },
    {
      fixture: {
        frameTint: 0x2ed46f,
        key: 'mira',
        researched: true,
        selected: true,
      },
      id: 'selected',
      label: 'Selected',
      mount,
    },
    {
      fixture: { equipped: true, key: 'mira', researched: true },
      id: 'equipped',
      label: 'Equipped',
      mount,
    },
    {
      fixture: { key: 'mira', previewable: true, researched: false },
      id: 'locked-preview',
      label: 'Locked Preview',
      mount,
    },
    {
      fixture: { key: 'mira', researched: false },
      id: 'locked-unavailable',
      label: 'Locked Unavailable',
      mount,
    },
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'Wizard profile picker',
      source: 'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
    },
  ],
});

function createThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter,
    component: 'PlayerSelectableProfileWidget',
    createControl: ({ assets }) =>
      createControl({
        assets,
        fixture: { key: 'elara', researched: true },
        input: null,
      }),
    id: WIDGET_ID,
  });
}

async function mount(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter,
    component: 'PlayerSelectableProfileWidget',
    createControl: ({ assets, input }) =>
      createControl({
        assets,
        fixture,
        input,
        onSelect: (data) => {
          context.emit('profileSelected', { key: data.key });
          return true;
        },
      }),
  });
}

function createControl({ assets, fixture, input, onSelect = () => true }) {
  const widget = new PlayerSelectableProfileWidget({
    assetManager: assets,
    inputRouter: input,
    label: 'uiLabSelectableProfile',
  });
  widget.bind(fixture.key, { enabled: true, ...fixture }, { select: onSelect });
  widget.setBounds(0, 0, TILE_SIZE, TILE_SIZE);
  return {
    destroy: () => widget.destroy(),
    height: TILE_SIZE,
    root: widget.root,
    widget,
    width: TILE_SIZE,
  };
}

function assetFilter({ id }) {
  const assetId = String(id ?? '');
  return (
    assetId.includes('/avatars/') ||
    assetId.includes('/root-run-account/') ||
    assetId.includes('/root-run-top-hud/') ||
    assetId.includes('/ui/status/')
  );
}
