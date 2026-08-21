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
    'primitive.alliance-emblem-option',
    'compound.hud-currency-capsule',
    'compound.alliance-directory-row',
    'compound.alliance-member-row',
    'compound.alliance-quest-row',
    'compound.player-relationship-row',
    'text-button',
    'tab-button',
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
    scenario('quests', 'Quests'),
    scenario('requests', 'Requests'),
    scenario('settings', 'Settings'),
    {
      fixture: { settingsSection: 'banner', tabId: 'settings' },
      id: 'settings-banner',
      label: 'Settings Banner',
      mount,
    },
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
      if (fixture.settingsSection) {
        page.settingsPane.selectSection(fixture.settingsSection);
        page.layout(projection);
      }
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
  const home = createDialogViewModel('workshop.alliance', 'a');
  const rows =
    tabId === 'quests'
      ? questRows()
      : tabId === 'requests'
      ? [
          application('luna', 'Luna', 'mira', 'violet', 14),
          application('thorne', 'Thorne', 'rowan', 'classic', 9),
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
    requestsSettings:
      tabId === 'requests'
        ? {
            allianceId: 'night-owls',
            editable: true,
            joinMode: 'apply',
            onSave: async () => ({ ok: true }),
          }
        : null,
    settings: tabId === 'settings' ? createSettingsModel() : null,
  };
}

function questRows() {
  return [
    {
      actionHeight: 42,
      actionLabel: 'Fill',
      actionVariant: 'green',
      actionWidth: 72,
      contributionLabel: 'Your contribution 8/10',
      objectiveLabel: 'Donate 500 Mana Tonics',
      enabled: true,
      id: 'fill-mana-tonic',
      itemKey: 'manaTonic',
      itemKind: 'potion',
      onActivate: () => true,
      progress: 0.45,
      progressLabel: '18/40',
      rewardAmountLabel: '3',
      rewardResource: 'crystal',
      title: 'Fill Mana Tonic',
    },
    {
      actionHeight: 42,
      actionLabel: 'Claim',
      actionVariant: 'green',
      actionWidth: 72,
      contributionLabel: 'Your contribution 12,500/12,500',
      objectiveLabel: 'Collect 250,000 Gold Coins',
      enabled: true,
      id: 'grand-route',
      itemKey: 'coin',
      itemKind: 'resource',
      onActivate: () => true,
      progress: 1,
      progressLabel: '250,000/250,000',
      rewardAmountLabel: '12',
      rewardResource: 'crystal',
      title: 'Grand Route',
    },
  ];
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
  const prestigeCount = Math.max(0, playerLevel - 8);
  const totalProducedCoin = playerLevel * 12_500;
  return {
    character,
    detail: `Lv ${playerLevel}`,
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
    prestigeCount,
    preview: `${Math.round(totalProducedCoin / 1_000)}k Produced`,
    totalProducedCoin,
    username,
  };
}
