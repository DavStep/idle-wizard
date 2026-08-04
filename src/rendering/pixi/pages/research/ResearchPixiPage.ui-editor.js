import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { ResearchPixiPage } from './ResearchPixiPage.js';

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: [
    'compound.research-row',
    'compound.research-station-title',
    'base-button',
  ],
  folderPath: ['Research'],
  id: 'feature.research-room',
  kind: 'scene',
  label: 'Research Room',
  sectionId: 'scenes',
  properties: [
    { label: 'Production class', value: 'ResearchPixiPage' },
    { label: 'State source', value: 'Isolated view model' },
  ],
  scenarios: [
    { fixture: { state: 'available' }, id: 'available', label: 'Available research', mount: mountResearch },
    { fixture: { state: 'locked' }, id: 'locked', label: 'Locked research', mount: mountResearch },
    { fixture: { state: 'completed' }, id: 'researched', label: 'Researched', mount: mountResearch },
  ],
});

async function mountResearch(context, fixture) {
  const state = { cost: 25, researchState: fixture.state };
  let page = null;
  const viewModel = () => ({
    actions: {
      buyResearch: (id) => {
        context.emit('researchPurchased', { cost: state.cost, id });
        state.researchState = 'completed';
        refresh();
        return true;
      },
      showLockedReason: (research) =>
        context.emit('lockedResearchPressed', { id: research.id }),
    },
    research: {
      selectedTabId: 'regular',
      tabs: [
        {
          boxes: [
            {
              id: 'herbs',
              label: 'Herbal Studies',
              researches: [createResearchRow(state)],
            },
          ],
          id: 'regular',
          label: 'Regular Research',
        },
      ],
    },
  });
  const surface = await createUiEditorPixiSurface({
    assetFilter: ({ id }) =>
      id.includes('/ui/') || id.includes('/icons/'),
    component: 'ResearchPixiPage',
    createControl: ({ application, assets, input, projection }) => {
      page = new ResearchPixiPage({
        assetManager: assets,
        inputRouter: input,
        ticker: application.ticker,
        timeSource: () => context.clock.now(),
      });
      page.layout(projection);
      page.bind(viewModel());
      page.activate();
      return {
        destroy: () => page.destroy(),
        layout: (nextProjection) => page.layout(nextProjection),
        root: page.root,
      };
    },
    layout: 'fill',
  });

  function refresh() {
    page?.bind(viewModel());
    context.invalidate();
  }

  return {
    ...surface,
    controls: [
      {
        getValue: () => state.cost,
        id: 'cost',
        label: 'Research cost',
        max: 500,
        min: 0,
        setValue: (value) => {
          state.cost = Math.max(0, Number(value) || 0);
          refresh();
        },
        step: 5,
        type: 'range',
      },
      {
        getValue: () => state.researchState,
        id: 'state',
        label: 'State',
        options: ['available', 'locked', 'completed'],
        setValue: (value) => {
          state.researchState = value;
          refresh();
        },
        type: 'select',
      },
    ],
  };
}

function createResearchRow(state) {
  const locked = state.researchState === 'locked';
  const researched = state.researchState === 'completed';
  return {
    canResearch: !locked && !researched,
    cost: {
      amountLabel: String(state.cost),
      lockPrompt: locked ? 'Complete prior research' : '',
      resource: 'coin',
    },
    displayName: 'Mint Cultivation',
    displayValue: researched ? '+1 Mint' : `${state.cost} coin`,
    effect: researched ? 'Growth improved' : 'Learn to grow mint',
    id: 'mint-cultivation',
    locked,
    completed: researched,
    state: state.researchState,
  };
}
