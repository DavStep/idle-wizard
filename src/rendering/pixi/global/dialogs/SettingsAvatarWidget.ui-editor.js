import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { SettingsAvatarWidget } from './PixiSettingsDialog.js';

const WIDGET_ID = 'compound.settings-avatar-option';
const TILE_SIZE = 61;

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createAvatarOptionThumbnail,
  folderPath: ['Settings'],
  id: WIDGET_ID,
  kind: 'widget',
  label: 'Settings Avatar Option',
  properties: [
    { label: 'Production class', value: 'SettingsAvatarWidget' },
    { label: 'Contract', value: 'Selectable, locked, equipped, and selected portrait tile' },
  ],
  scenarios: [
    { fixture: { key: 'elara', researched: true }, id: 'available', label: 'Available', mount: mountAvatarOption },
    { fixture: { key: 'mira', researched: true, selected: true }, id: 'selected', label: 'Selected', mount: mountAvatarOption },
    { fixture: { equipped: true, key: 'mira', researched: true }, id: 'equipped', label: 'Equipped', mount: mountAvatarOption },
    { fixture: { key: 'mira', researched: false }, id: 'locked', label: 'Locked', mount: mountAvatarOption },
  ],
  sectionId: 'composite-widgets',
  usages: [
    { label: 'Settings Wizard avatar grid', source: 'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js' },
  ],
});

function createAvatarOptionThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: settingsAvatarAssetFilter,
    component: 'SettingsAvatarWidget',
    createControl: ({ assets }) => createAvatarOptionControl({ assets, fixture: { key: 'elara', researched: true }, input: null }),
    id: WIDGET_ID,
  });
}

async function mountAvatarOption(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: settingsAvatarAssetFilter,
    component: 'SettingsAvatarWidget',
    createControl: ({ assets, input }) => createAvatarOptionControl({
      assets,
      fixture,
      input,
      onSelect: (data) => {
        context.emit('avatarSelected', { key: data.key });
        return true;
      },
    }),
  });
}

function createAvatarOptionControl({ assets, fixture, input, onSelect = () => true }) {
  const widget = new SettingsAvatarWidget({
    assetManager: assets,
    inputRouter: input,
    label: 'uiLabSettingsAvatar',
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

function settingsAvatarAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return assetId.includes('/avatars/')
    || assetId.includes('/root-run-settings/')
    || assetId.includes('/ui/status/');
}
