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
    'compound.guild-chronicle-section',
    'compound.guild-chronicle-entry',
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
    { fixture: { branch: 'adventurers', created: true, tab: 'roster' }, id: 'roster', label: 'Roster', mount },
    { fixture: { branch: 'adventurers', created: true, tab: 'log' }, id: 'log', label: 'Living Guild Log', mount },
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
  return { guild: { unlocked: true, created: fixture.created, profile: { name: 'Moonlit Order', tag: 'MOON', color: 'violet' }, secretary: { level: 2, hiredCap: 4, boardSlots: 3, canUpgrade: true, next: { level: 3, hiredCap: 5, boardSlots: 4, costCoin: 800 } }, board: [{ id: 'quest-1', title: 'The Flooded Archive', lore: 'Recover the moonstone ledger.', difficulty: 'hard', rewardText: '120-180 coin', expiresLabel: '2h' }], normalBoard: [], availableRequests: [{ id: 'quest-2', title: 'Escort The Herbalist', lore: 'Guide the village herbalist through the mosswood.', difficulty: 'medium', rewardText: '80-120 coin', expiresLabel: '4h' }, { id: 'quest-3', title: 'Repair The Watchtower', lore: 'Carry tools to the northern ridge.', difficulty: 'easy', rewardText: '60-90 coin', expiresLabel: '6h' }], adventurers: [{ id: 'mira', displayName: 'Mira Ashveil', iconKey: 'adventurer_cleric', level: 7, status: 'idle', activityLabel: 'With Orin Moss', activityText: 'Shares supper and trades stories from the road with Orin Moss.' }, { id: 'orin-adventurer', displayName: 'Orin Moss', iconKey: 'adventurer_shadowdagger', level: 5, status: 'questing', activityLabel: 'Questing', activityText: 'Travels for The Flooded Archive. Returns in 2h.' }], applicants: [{ id: 'selka', displayName: 'Selka Thorn', iconKey: 'adventurer_shadowdagger', level: 5, status: 'waiting' }], logs: [{ id: '1', text: 'Mira Ashveil and Orin Moss share supper and trade stories from the road.', timeLabel: 'Now' }, { id: '2', text: 'Orin Moss takes The Flooded Archive.', timeLabel: '20m ago' }, { id: '3', text: 'Mira Ashveil reaches level 7.', timeLabel: '1h ago' }], applicantResetLabel: '5h', boardWaveLabel: '2h' }, actions: {}, navigationPlacement: 'hud', selectedBranchId: fixture.branch ?? 'hall', selectedAdventurerTabId: fixture.tab ?? 'board' };
}
