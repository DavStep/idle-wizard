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
  const points = selectedTabId === 'points';
  return { prestige: { selectedTabId, starLevel: 2, summary: points ? { headline: '2 Prestige Points', nextRunLabel: 'Next reward at 3 Points' } : { headline: 'Reach Level 10', nextRunLabel: 'New run starts at Level 1', resourceLead: 'Starting Resources', resources: [{ amount: 5, resource: 'crystal' }, { amount: 1, resource: 'ruby' }, { amount: 2, resource: 'emerald' }] }, milestones: [{ id: 'level-10', level: 10, title: 'Level 10', canComplete: true, rewardResources: [{ amount: 5, resource: 'crystal' }, { amount: 1, resource: 'ruby' }] }, { id: 'level-20', level: 20, title: 'Level 20', locked: true, rewardResources: [{ amount: 10, resource: 'crystal' }, { amount: 2, resource: 'ruby' }] }, { id: 'level-30', level: 30, title: 'Level 30', locked: true, rewardResources: [{ amount: 15, resource: 'crystal' }, { amount: 3, resource: 'ruby' }] }], pointRewards: [{ id: 'point-1', count: 1, title: '1 Point', completed: true, rewardText: 'Crossroads Market', tooltip: { text: 'Permanent market licence reward.' } }, { id: 'point-3', count: 3, title: '3 Points', locked: true, rewardText: 'Village Market', tooltip: { text: 'Permanent market licence reward.' } }] } };
}
