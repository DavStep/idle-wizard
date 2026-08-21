import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { PlayerRelationshipRowPixi } from './PlayerRelationshipRowPixi.js';

const ROW_WIDTH = 304;

export default [
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: [
      'compound.dialog-frame',
      'compound.player-profile',
      'text-button',
    ],
    createThumbnail: () => createWidgetThumbnail(),
    folderPath: ['Friends'],
    id: 'compound.player-relationship-row',
    kind: 'widget',
    label: 'Player Relationship Row',
    properties: [
      { label: 'Production class', value: 'PlayerRelationshipRowPixi' },
      {
        label: 'Contract',
        value: 'Player identity row for friends, requests, and pending states',
      },
    ],
    scenarios: [
      relationshipScenario('friend', 'Friend', {
        allianceTag: 'DUSK',
        allianceTagColor: 'green',
        notification: true,
        preview: 'The harvest was amazing this week.',
      }),
      relationshipScenario('incoming', 'Incoming request', {
        preview: 'Wants to be your friend.',
        primaryAction: { label: 'Accept', variant: 'green', onActivate: () => true },
        secondaryAction: { label: 'Reject', variant: 'red', onActivate: () => true },
      }),
      relationshipScenario('pending', 'Pending request', {
        preview: 'Request sent.',
        status: 'Pending',
      }),
    ],
    sectionId: 'composite-widgets',
    usages: [
      {
        label: 'Friends dialog rows',
        source: 'src/rendering/pixi/global/dialogs/PlayerRelationshipRowPixi.js',
      },
    ],
  }),
];

function relationshipScenario(id, label, overrides) {
  const fixture = {
    character: 'juniper',
    detail: 'Level 10',
    frame: 'emerald',
    id: 'juniper',
    identity: 'juniper',
    playerLevel: 10,
    username: 'Juniper',
    ...overrides,
  };
  return {
    fixture,
    id,
    label,
    mount: (context, value) => mountRelationshipRow(context, value),
  };
}

function createWidgetThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: friendsAssetFilter,
    component: 'PlayerRelationshipRowPixi',
    createControl: ({ assets }) =>
      createRelationshipControl({
        assets,
        fixture: relationshipScenario('friend', 'Friend', {
          allianceTag: 'DUSK',
          allianceTagColor: 'green',
          notification: true,
          preview: 'The harvest was amazing this week.',
        }).fixture,
        input: null,
      }),
    id: 'compound.player-relationship-row',
  });
}

function mountRelationshipRow(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: friendsAssetFilter,
    component: 'PlayerRelationshipRowPixi',
    createControl: ({ assets, input }) =>
      createRelationshipControl({ assets, fixture, input }),
  });
}

function createRelationshipControl({ assets, fixture, input }) {
  const dialog = createDialogStub(assets, input, 'global.friends');
  const row = new PlayerRelationshipRowPixi({ dialog });
  row.bind(fixture);
  row.setBounds(0, 0, ROW_WIDTH, row.getPreferredHeight());
  return {
    destroy: () => row.destroy(),
    height: row.getPreferredHeight(),
    root: row.root,
    width: ROW_WIDTH,
  };
}

function createDialogStub(assetManager, inputRouter, dialogId) {
  return {
    assetManager,
    contentTheme: createDialogContentTheme(DEFAULT_PIXI_THEME_SNAPSHOT),
    dialogId,
    inputRouter,
    isFriendsDialog: dialogId === 'global.friends',
    semanticTargets: null,
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
  };
}

function friendsAssetFilter({ id }) {
  const value = String(id ?? '');
  return (
    value.startsWith('source:assets/avatars/') ||
    value.startsWith('source:assets/ui/root-run-dialog/') ||
    value.startsWith('source:assets/ui/regular-button/') ||
    value.startsWith('source:assets/ui/root-run-top-hud/') ||
    value.startsWith('source:assets/ui/notification-circle-')
  );
}
