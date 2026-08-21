import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createDialogViewModel } from '../../acceptance/RetainedAcceptanceFixtures.js';
import { AlliancePixiPage } from './AlliancePixiPage.js';

const allianceAssets = ({ id }) =>
  id.includes('/ui/') ||
  id.includes('/icons/') ||
  id.includes('/avatars/') ||
  id.includes('/items/');

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: [
    'compound.trade-alliance-banner',
    'compound.alliance-directory-row',
    'compound.alliance-quest-row',
    'compound.guild-rows-section',
    'compound.guild-section-row',
    'compound.player-relationship-row',
    'compound.world-chat-message-row',
    'primitive.text-field',
    'text-button',
  ],
  folderPath: ['Alliance'],
  id: 'feature.alliance-workspace',
  kind: 'scene',
  label: 'Alliance Workspace',
  properties: [
    { label: 'Production class', value: 'AlliancePixiPage' },
    { label: 'Navigation', value: 'Alliance alternate bottom HUD' },
  ],
  scenarios: [
    scenario('home', 'Home'),
    scenario('requests', 'Requests'),
    scenario('chat', 'Alliance Chat'),
    scenario('settings', 'Settings'),
    scenario('browse', 'Browse'),
    scenario('create', 'Create'),
  ],
  sectionId: 'scenes',
});

function scenario(id, label) {
  return { fixture: { tabId: id }, id, label, mount };
}

async function mount(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: allianceAssets,
    component: 'AlliancePixiPage',
    createControl: ({ assets, input, projection }) => {
      const page = new AlliancePixiPage({
        assetManager: assets,
        inputRouter: input,
      });
      page.layout(projection);
      page.bind(createModel(fixture.tabId));
      page.activate();
      return {
        destroy: () => page.destroy(),
        layout: (next) => page.layout(next),
        root: page.root,
      };
    },
    layout: 'fill',
  });
}

function createModel(tabId) {
  if (tabId === 'browse') return createBrowseModel();
  if (tabId === 'create') return createCreateModel();

  const home = createDialogViewModel('workshop.alliance', 'a');
  const rows =
    tabId === 'requests'
      ? [
          application('luna', 'Luna', 'mira', 'violet', 14),
          application('thorne', 'Thorne', 'rowan', 'classic', 9),
        ]
      : tabId === 'chat'
        ? [
            message('message-1', 'Luna', 'Welcome to the alliance hall.'),
            message('message-2', 'Juniper', 'I can fill the herb quest.'),
          ]
        : home.rows;

  return {
    ...home,
    flag: { bannerColor: 'violet', emblemColor: 'white', emblemId: 'owl' },
    ownedAlliance: true,
    ownedAllianceHome: tabId === 'home',
    rowWidget: tabId === 'requests' ? 'playerRelationship' : null,
    rows,
    selectedTabId: tabId,
    settings: tabId === 'settings' ? createSettingsModel() : null,
    chat: {
      onSubmit: async () => ({ ok: true }),
      rows: tabId === 'chat' ? rows : [],
    },
  };
}

function createBrowseModel() {
  return {
    directory: true,
    ownedAlliance: false,
    rows: [
      {
        action: {
          enabled: true,
          label: 'Apply',
          onActivate: () => true,
          variant: 'green',
        },
        id: 'night-owls',
        memberCapacity: 50,
        memberCount: 3,
        name: 'Night Owls',
        onActivate: () => true,
        tag: 'OWL',
        tagColor: 'violet',
        totalIncomeLabel: '84.5k',
        type: 'allianceDirectory',
      },
    ],
    selectedTabId: 'browse',
    chat: { rows: [], onSubmit: null },
  };
}

function createCreateModel() {
  return {
    directory: false,
    ownedAlliance: false,
    rows: [],
    selectedTabId: 'create',
    settings: {
      ...createSettingsModel(),
      allianceId: 'new-alliance',
      mode: 'create',
      name: '',
      tag: '',
    },
    chat: { rows: [], onSubmit: null },
  };
}

function createSettingsModel() {
  return {
    allianceId: 'night-owls',
    bannerColor: 'violet',
    canDisband: false,
    description: 'Patient traders building a stronger market together.',
    editable: true,
    emblemColor: 'white',
    emblemId: 'owl',
    joinMode: 'apply',
    mode: 'settings',
    name: 'Night Owls',
    notice: 'Weekly goal: support every active member.',
    onSave: async () => ({ ok: true }),
    tag: 'OWL',
    tagColor: 'violet',
  };
}

function application(id, username, character, frame, playerLevel) {
  return {
    character,
    detail: `Level ${playerLevel}`,
    frame,
    id,
    identity: id,
    primaryAction: {
      label: 'Accept',
      onActivate: () => true,
      variant: 'green',
    },
    secondaryAction: {
      label: 'Deny',
      onActivate: () => true,
      variant: 'red',
    },
    username,
  };
}

function message(id, username, body) {
  return {
    ageLabel: 'now',
    body,
    character: 'mira',
    frame: 'violet',
    id,
    identity: username.toLowerCase(),
    username,
  };
}
