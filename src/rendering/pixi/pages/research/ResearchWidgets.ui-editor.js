import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import {
  RESEARCH_PIXI_GEOMETRY,
  ResearchRowWidget,
  ResearchStationTitlePlaque,
} from './ResearchPixiPage.js';

const RESEARCH_ART_ASSET_ID =
  'source:assets/icons/research/icon-research-plot-growth.png';

export default [
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: [
      'cost-button',
      'primitive.star-level-label',
      'primitive.progress-bar',
    ],
    createThumbnail: createResearchRowThumbnail,
    folderPath: ['Research'],
    id: 'compound.research-row',
    kind: 'widget',
    label: 'Research Row',
    sectionId: 'composite-widgets',
    properties: [
      { label: 'Production class', value: 'ResearchRowWidget' },
      { label: 'Contract', value: 'Research state, artwork, cost, and progress' },
    ],
    scenarios: [
      researchRowScenario('available', 'Available'),
      researchRowScenario('unavailable', 'Unaffordable'),
      researchRowScenario('locked', 'Locked'),
      researchRowScenario('in-progress', 'Researching'),
      researchRowScenario('completed', 'Researched'),
    ],
    usages: [
      {
        label: 'Research room station rows',
        source: 'src/rendering/pixi/pages/research/ResearchPixiPage.js',
      },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createStationTitleThumbnail,
    folderPath: ['Research'],
    id: 'compound.research-station-title',
    kind: 'widget',
    label: 'Research Station Title',
    sectionId: 'composite-widgets',
    properties: [
      { label: 'Production class', value: 'ResearchStationTitlePlaque' },
      { label: 'Contract', value: 'Research station label and tab skin' },
    ],
    scenarios: [
      stationTitleScenario('regular', 'Herbal Studies'),
      stationTitleScenario('automation', 'Automation Studies'),
      stationTitleScenario('advanced', 'Advanced Studies'),
      stationTitleScenario('crystal', 'Crystal Studies'),
    ],
    usages: [
      {
        label: 'Research room station headings',
        source: 'src/rendering/pixi/pages/research/ResearchPixiPage.js',
      },
    ],
  }),
];

function researchRowScenario(state, label) {
  return {
    fixture: { state },
    id: state,
    label,
    mount: mountResearchRow,
  };
}

function stationTitleScenario(tabId, label) {
  return {
    fixture: { label, tabId },
    id: tabId,
    label,
    mount: mountStationTitle,
  };
}

function createResearchRowThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: researchAssetFilter,
    component: 'ResearchRowWidget',
    createControl: ({ assets, input }) => createResearchRowControl({
      assets,
      fixture: { state: 'available' },
      input,
      now: () => 0,
    }),
    id: 'compound.research-row',
  });
}

async function mountResearchRow(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: researchAssetFilter,
    component: 'ResearchRowWidget',
    createControl: ({ assets, input }) => createResearchRowControl({
      assets,
      fixture,
      input,
      now: () => context.clock.now(),
      onBuy: (research) => context.emit('researchPurchased', { id: research.id }),
      onLocked: (research) => context.emit('lockedResearchPressed', { id: research.id }),
    }),
  });
}

function createResearchRowControl({
  assets,
  fixture,
  input,
  now,
  onBuy = () => true,
  onLocked = () => true,
}) {
  const semanticTargets = new Map();
  const page = {
    inputRouter: input,
    registerSemanticTarget(target) {
      semanticTargets.set(target.semanticId, target);
    },
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    unregisterSemanticTarget(semanticId) {
      return semanticTargets.delete(semanticId);
    },
  };
  const row = new ResearchRowWidget({
    assetManager: assets,
    page,
    prefersReducedMotion: () => true,
    timeSource: now,
  });
  row.bind(
    createResearchRowModel(fixture.state),
    { buy: onBuy, locked: onLocked },
    'herbs',
  );
  row.setBounds(0, 0);
  return {
    destroy: () => row.destroy(),
    height: RESEARCH_PIXI_GEOMETRY.rowHeight,
    root: row.root,
    row,
    width: RESEARCH_PIXI_GEOMETRY.cardWidth,
  };
}

function createResearchRowModel(state) {
  const completed = state === 'completed';
  const inProgress = state === 'in-progress';
  const locked = state === 'locked';
  const unavailable = state === 'unavailable';
  return {
    artAssetId: RESEARCH_ART_ASSET_ID,
    canResearch: state === 'available',
    completed,
    cost: {
      amountLabel: '25',
      lockPrompt: locked ? 'Complete prior research' : '',
      resource: 'coin',
    },
    displayName: 'Mint Cultivation',
    displayValue: completed ? 'Researched' : '25 coin',
    effect: completed ? 'Growth improved' : 'Learn to grow mint',
    id: 'mint-cultivation',
    inProgress,
    locked,
    state,
    timer: inProgress
      ? {
          active: true,
          progress: 0.4,
          remainingLabel: '3s',
          remainingMs: 3000,
          totalMs: 5000,
        }
      : undefined,
    unavailable,
  };
}

function createStationTitleThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: researchAssetFilter,
    component: 'ResearchStationTitlePlaque',
    createControl: ({ assets }) => createStationTitleControl({
      assets,
      fixture: { label: 'Herbal Studies', tabId: 'regular' },
    }),
    id: 'compound.research-station-title',
  });
}

async function mountStationTitle(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: researchAssetFilter,
    component: 'ResearchStationTitlePlaque',
    createControl: ({ assets }) => createStationTitleControl({ assets, fixture }),
  });
}

function createStationTitleControl({ assets, fixture }) {
  const plaque = new ResearchStationTitlePlaque({ assetManager: assets });
  plaque.setMaxWidth(260);
  plaque.bind(fixture.label, fixture.tabId);
  return {
    destroy: () => plaque.root.destroy({ children: true }),
    height: RESEARCH_PIXI_GEOMETRY.categoryTitleHeight,
    root: plaque.root,
    width: plaque.width,
  };
}

function researchAssetFilter({ id }) {
  return id.includes('/ui/') || id.includes('/icons/');
}
