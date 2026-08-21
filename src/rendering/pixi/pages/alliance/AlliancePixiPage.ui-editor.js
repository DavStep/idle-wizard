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
    tabId === 'requests'
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
    detail: `Lv ${playerLevel} · Prestige ${prestigeCount}`,
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
