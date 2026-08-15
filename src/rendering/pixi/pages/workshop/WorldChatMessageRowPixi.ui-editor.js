import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { WorldChatMessageRowPixi } from './WorkshopDialogPixi.js';

const ROW_WIDTH = 288;

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createWorldChatMessageRowThumbnail,
  folderPath: ['Workshop'],
  id: 'compound.world-chat-message-row',
  kind: 'widget',
  label: 'World Chat Message Row',
  properties: [
    {
      label: 'Production class',
      value: 'WorldChatMessageRowPixi',
    },
    {
      label: 'Contract',
      value: 'Compact player or system message row used by World Chat',
    },
  ],
  scenarios: [
    {
      fixture: createPlayerFixture(),
      id: 'player',
      label: 'Player message',
      mount: mountWorldChatMessageRow,
    },
    {
      fixture: createPlayerFixture({ isOwn: true, username: 'You' }),
      id: 'own-player',
      label: 'Own player message',
      mount: mountWorldChatMessageRow,
    },
    {
      fixture: createSystemFixture(),
      id: 'system',
      label: 'System message',
      mount: mountWorldChatMessageRow,
    },
    {
      fixture: createPlayerFixture({ enabled: false }),
      id: 'disabled',
      label: 'Player message, passive',
      mount: mountWorldChatMessageRow,
    },
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'World Chat dialog row',
      source: 'src/rendering/pixi/pages/workshop/WorkshopDialogPixi.js',
    },
  ],
});

function createWorldChatMessageRowThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: worldChatAssetFilter,
    component: 'WorldChatMessageRowPixi',
    createControl: ({ assets }) =>
      createWorldChatMessageRowControl({
        assets,
        fixture: createPlayerFixture(),
        input: null,
      }),
    id: 'compound.world-chat-message-row',
  });
}

async function mountWorldChatMessageRow(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: worldChatAssetFilter,
    component: 'WorldChatMessageRow',
    createControl: ({ assets, input }) =>
      createWorldChatMessageRowControl({
        assets,
        fixture: {
          ...fixture,
          onActivate: () => {
            context.emit('worldChatPlayerActivated', {
              username:
                fixture.systemPlayerUsername ?? fixture.username,
            });
            return true;
          },
        },
        input,
      }),
  });
}

function createWorldChatMessageRowControl({ assets, fixture, input }) {
  const contentTheme = createDialogContentTheme(
    DEFAULT_PIXI_THEME_SNAPSHOT,
  );
  const dialog = {
    assetManager: assets,
    contentTheme,
    dialogId: 'workshop.worldChat',
    inputRouter: input,
    registerTarget() {},
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    unregisterTarget() {},
  };
  const row = new WorldChatMessageRowPixi({ dialog });
  row.bind(fixture);
  const height = row.getPreferredHeight();
  row.setBounds(0, 0, ROW_WIDTH, height);

  return {
    atomicComponents: createWorldChatMessageRowHierarchy(row),
    destroy: () => row.destroy(),
    height,
    root: row.root,
    row,
    width: ROW_WIDTH,
  };
}

function createWorldChatMessageRowHierarchy(row) {
  return [
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.systemBackground],
      id: 'world-chat-message-row:system-background',
      label: 'System background',
      primary: row.systemBackground,
      type: 'image',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.avatar],
      id: 'world-chat-message-row:avatar',
      label: 'Player avatar',
      primary: row.avatar,
      type: 'image',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.tag],
      id: 'world-chat-message-row:alliance-tag',
      label: 'Alliance tag',
      primary: row.tag,
      textTarget: row.tag,
      type: 'label',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.username],
      id: 'world-chat-message-row:username',
      label: 'Player name label',
      primary: row.username,
      textTarget: row.username,
      type: 'label',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.systemPlayerUsername],
      id: 'world-chat-message-row:system-player-name',
      label: 'System player name label',
      primary: row.systemPlayerUsername,
      textTarget: row.systemPlayerUsername,
      type: 'label',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.body],
      id: 'world-chat-message-row:message',
      label: 'Message body',
      primary: row.body,
      type: 'label',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.timestamp],
      id: 'world-chat-message-row:timestamp',
      label: 'Timestamp label',
      primary: row.timestamp,
      textTarget: row.timestamp,
      type: 'label',
    }),
  ];
}

function createPlayerFixture(overrides = {}) {
  return {
    ageLabel: 'now',
    allianceTag: 'ARC',
    allianceTagColor: 'violet',
    body: 'Anyone joining the next expedition?',
    character: 'mira',
    enabled: true,
    id: 'world-chat-player',
    username: 'Mira',
    ...overrides,
  };
}

function createSystemFixture(overrides = {}) {
  return {
    ageLabel: '1m',
    body: 'discovered a rare potion.',
    id: 'world-chat-system',
    systemPlayerDetail: 'discovered a rare potion.',
    systemPlayerUsername: 'Mira',
    type: 'system',
    username: 'System',
    ...overrides,
  };
}

function worldChatAssetFilter({ id }) {
  return String(id ?? '').startsWith('source:assets/avatars/')
    || String(id ?? '').startsWith('source:assets/characters/')
    || String(id ?? '').startsWith('source:assets/icons/');
}
