import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { PrestigePixiPage } from './PrestigePixiPage.js';

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: ['compound.market-title-ribbon', 'compound.research-station-title', 'compound.prestige-description', 'compound.prestige-row', 'compound.prestige-confirm-panel', 'compound.prestige-tooltip', 'text-button'],
  folderPath: ['Prestige'],
  id: 'feature.prestige-room',
  kind: 'scene',
  label: 'Prestige Room',
  sectionId: 'scenes',
  properties: [{ label: 'Production class', value: 'PrestigePixiPage' }],
  scenarios: [
    { fixture: { tab: 'main' }, id: 'milestones', label: 'Milestones', mount },
    { fixture: { tab: 'points' }, id: 'points', label: 'Prestige points', mount },
  ],
});

async function mount(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: ({ id }) => id.includes('/ui/') || id.includes('/icons/'),
    component: 'PrestigePixiPage',
    createControl: ({ assets, input, projection }) => {
      const page = new PrestigePixiPage({ assetManager: assets, inputRouter: input });
      page.layout(projection);
      page.bind(createModel(fixture.tab));
      page.activate();
      return { destroy: () => page.destroy(), layout: (next) => page.layout(next), root: page.root };
    },
    layout: 'fill',
  });
}

function createModel(selectedTabId) {
  return { prestige: { selectedTabId, starLevel: 2, summary: { flow: 'Level 10 → Level 1', resourceLead: 'Receive', resources: [{ amount: 10, resource: 'crystal' }] }, milestones: [{ id: 'level-10', level: 10, title: 'Level 10', canComplete: true, rewardResources: [{ amount: 10, resource: 'crystal' }], tooltip: { text: 'Awards all lower unclaimed milestones.' } }, { id: 'level-20', level: 20, title: 'Level 20', locked: true, rewardResources: [{ amount: 20, resource: 'crystal' }] }], pointRewards: [{ id: 'point-1', count: 1, title: '1 Point', completed: true, rewardText: '+1 Market stall' }, { id: 'point-3', count: 3, title: '3 Points', rewardText: 'Unlock uncommon trades' }] } };
}
