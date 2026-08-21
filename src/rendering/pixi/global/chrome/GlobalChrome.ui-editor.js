import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { PixiTopPanelView } from './PixiTopPanelView.js';
import { PixiWorldChatView } from './PixiWorldChatView.js';

const HUD_ID = 'compound.player-hud';
const CHAT_ID = 'compound.compact-world-chat';

export default [
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: [
      'compound.player-profile',
      'compound.hud-level-rail',
      'compound.hud-currency-capsule',
      'compound.hud-bag-capsule',
      'hud-avatar-button',
      'hud-settings-button',
    ],
    createThumbnail: createHudThumbnail,
    folderPath: ['HUD'],
    id: HUD_ID,
    kind: 'widget',
    label: 'Root Run Player HUD',
    properties: [
      { label: 'Production class', value: 'PixiTopPanelView' },
      {
        label: 'Contract',
        value:
          'Shared avatar, level, mana, currencies, username, and settings chrome',
      },
    ],
    scenarios: [
      {
        fixture: createHudFixture(),
        id: 'active',
        label: 'Active request',
        mount: mountHud,
      },
      {
        fixture: createHudFixture({
          contextCurrency: { amount: 18, resource: 'crystal', visible: true },
          level: 0,
          quest: { visible: false },
        }),
        id: 'level-zero',
        label: 'Level zero',
        mount: mountHud,
      },
      {
        fixture: createHudFixture({
          character: 'mira',
          showBag: true,
          username: 'Mira',
          contextCurrency: {
            amount: 240,
            cap: 240,
            perSecond: 8,
            resource: 'mana',
            visible: true,
          },
        }),
        id: 'full-mana',
        label: 'Full mana',
        mount: mountHud,
      },
    ],
    sectionId: 'composite-widgets',
    usages: [
      {
        label: 'Global room top chrome',
        source: 'src/rendering/pixi/global/chrome/PixiTopPanelView.js',
      },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: ['primitive.retained-panel', 'compound.player-profile'],
    createThumbnail: createWorldChatThumbnail,
    folderPath: ['HUD'],
    id: CHAT_ID,
    kind: 'widget',
    label: 'Compact World Chat',
    properties: [
      { label: 'Production class', value: 'PixiWorldChatView' },
      {
        label: 'Contract',
        value: 'Shared two-row room chat opener with sender identity',
      },
    ],
    scenarios: [
      {
        fixture: {
          label: 'World Chat',
          messages: [
            {
              allianceTag: 'ARC',
              allianceTagColor: 'violet',
              body: 'Ready for the event?',
              character: 'mira',
              frame: 'violet',
              playerLevel: 7,
              username: 'Mira',
            },
            { body: 'New crisis begins soon.', username: 'system' },
          ],
        },
        id: 'messages',
        label: 'Recent messages',
        mount: mountWorldChat,
      },
      {
        fixture: { label: 'World Chat', preview: 'No messages yet.' },
        id: 'empty',
        label: 'Empty',
        mount: mountWorldChat,
      },
    ],
    sectionId: 'composite-widgets',
    usages: [
      {
        label: 'Global room chat preview',
        source: 'src/rendering/pixi/global/chrome/PixiWorldChatView.js',
      },
    ],
  }),
];

function createHudThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: globalChromeAssetFilter,
    component: 'PixiTopPanelView',
    createControl: ({ assets }) =>
      createHudControl({
        assets,
        fixture: createHudFixture(),
        projection: { sourceHeight: 844, sourceWidth: 390 },
      }),
    id: HUD_ID,
  });
}

function createWorldChatThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: globalChromeAssetFilter,
    component: 'PixiWorldChatView',
    createControl: ({ assets }) =>
      createWorldChatControl({
        assets,
        fixture: {
          label: 'World Chat',
          messages: [
            {
              body: 'Ready for the event?',
              character: 'mira',
              frame: 'violet',
              playerLevel: 7,
              username: 'Mira',
            },
          ],
        },
        projection: { sourceHeight: 844, sourceWidth: 390 },
      }),
    id: CHAT_ID,
  });
}

async function mountHud(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: globalChromeAssetFilter,
    component: 'PixiTopPanelView',
    createControl: ({ assets, input, projection }) =>
      createHudControl({ assets, fixture, input, projection, context }),
    layout: 'fill',
  });
}

async function mountWorldChat(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: globalChromeAssetFilter,
    component: 'PixiWorldChatView',
    createControl: ({ assets, input, projection }) =>
      createWorldChatControl({ assets, fixture, input, projection, context }),
    layout: 'fill',
  });
}

function createHudControl({
  assets,
  fixture,
  input = null,
  projection,
  context = null,
}) {
  const view = new PixiTopPanelView({
    assets,
    inputRouter: input,
    reducedMotion: true,
  });
  view.layout(projection);
  view.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  view.bind({
    ...fixture,
    actions: {
      openAccount: () => context?.emit('accountOpened'),
      openAvatar: () => context?.emit('avatarOpened'),
      openBag: () => context?.emit('bagOpened'),
      openLevel: () => context?.emit('levelOpened'),
      openSettings: () => context?.emit('settingsOpened'),
    },
  });
  view.activate();
  return {
    destroy: () => view.destroy(),
    height: 150,
    layout: (nextProjection) => view.layout(nextProjection),
    root: view.root,
    view,
    width: 390,
  };
}

function createWorldChatControl({
  assets,
  fixture,
  input = null,
  projection,
  context = null,
}) {
  const view = new PixiWorldChatView({ assets, inputRouter: input });
  view.layout(projection);
  view.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  view.bind({
    ...fixture,
    onActivate: () => context?.emit('worldChatOpened'),
    visible: true,
  });
  view.activate();
  return {
    destroy: () => view.destroy(),
    height: 844,
    layout: (nextProjection) => view.layout(nextProjection),
    root: view.root,
    view,
    width: 390,
  };
}

function createHudFixture(overrides = {}) {
  return {
    character: 'elara',
    coin: 12450,
    contextCurrency: { amount: 7, resource: 'ruby', visible: true },
    level: 7,
    showBag: false,
    quest: {
      activeFraction: 0.42,
      completed: 1,
      remaining: 3,
      total: 4,
      visible: true,
    },
    reveal: {
      avatar: true,
      mana: true,
      manaRegen: true,
      quest: true,
      resources: true,
      top: true,
      username: true,
    },
    username: 'Starbrew',
    ...overrides,
  };
}

function globalChromeAssetFilter({ id }) {
  const assetId = String(id ?? '');
  return (
    assetId.includes('/ui/') ||
    assetId.includes('/avatars/') ||
    assetId.includes('/icons/')
  );
}
