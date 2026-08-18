import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { GuildPixiPage } from './GuildPixiPage.js';
import { guildUiEditorAssetFilter } from './GuildUiEditorAssets.js';

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: [
    'compound.guild-rows-section',
    'compound.guild-section-row',
    'compound.guild-charter-panel',
    'compound.guild-secretary-section',
    'compound.guild-quest-board',
    'compound.guild-quest-card',
    'compound.guild-people-section',
    'compound.guild-person-row',
    'text-button',
    'cost-button',
  ],
  folderPath: ['Guild'],
  id: 'feature.guild-room',
  kind: 'scene',
  label: 'Guild Room',
  sectionId: 'scenes',
  properties: [{ label: 'Production class', value: 'GuildPixiPage' }],
  scenarios: [
    { fixture: { branch: 'hall', created: true }, id: 'hall', label: 'Guild Hall', mount },
    { fixture: { branch: 'adventurers', created: true, tab: 'board' }, id: 'adventurers', label: 'Adventurers Lodge', mount },
    { fixture: { created: false }, id: 'charter', label: 'Guild Charter', mount },
  ],
});

async function mount(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: guildUiEditorAssetFilter,
    component: 'GuildPixiPage',
    createControl: ({ assets, input, projection }) => {
      const page = new GuildPixiPage({ assetManager: assets, inputRouter: input });
      page.layout(projection);
      page.bind(createModel(fixture));
      page.activate();
      return { destroy: () => page.destroy(), layout: (next) => page.layout(next), root: page.root };
    },
    layout: 'fill',
  });
}

function createModel(fixture = {}) {
  return { guild: { unlocked: true, created: fixture.created, profile: { name: 'Moonlit Order', tag: 'MOON', color: 'violet' }, secretary: { level: 2, hiredCap: 4, boardSlots: 3, canUpgrade: true, next: { level: 3, hiredCap: 5, boardSlots: 4, costCoin: 800 } }, board: [{ id: 'quest-1', title: 'The Flooded Archive', lore: 'Recover the moonstone ledger.', difficulty: 'hard', rewardText: '120-180 coin', expiresLabel: '2h' }], normalBoard: [], adventurers: [{ id: 'mira', displayName: 'Mira Ashveil', level: 7, status: 'idle' }], applicants: [{ id: 'orin', displayName: 'Orin Moss', level: 5, status: 'waiting' }], logs: [{ id: '1', text: 'A request reaches the board.' }], applicantResetLabel: '5h', boardWaveLabel: '2h' }, actions: {}, navigationPlacement: 'hud', selectedBranchId: fixture.branch ?? 'hall', selectedAdventurerTabId: fixture.tab ?? 'board' };
}
