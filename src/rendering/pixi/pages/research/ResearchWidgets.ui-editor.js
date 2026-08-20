import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import {
  RESEARCH_PIXI_GEOMETRY,
  ResearchBoxWidget,
  ResearchLockTooltip,
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
      {
        fixture: { manaModifier: 'capacity', state: 'available' },
        id: 'mana-capacity',
        label: 'Mana Capacity',
        mount: mountResearchRow,
      },
      {
        fixture: { manaModifier: 'generation', state: 'available' },
        id: 'mana-generation',
        label: 'Mana Generation',
        mount: mountResearchRow,
      },
      {
        fixture: { itemTimer: true, state: 'available' },
        id: 'item-timer',
        label: 'Item Timer',
        mount: mountResearchRow,
      },
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
      stationTitleScenario('crystal', 'Amber Studies'),
    ],
    usages: [
      {
        label: 'Research room station headings',
        source: 'src/rendering/pixi/pages/research/ResearchPixiPage.js',
      },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: [
      'compound.research-station-title',
      'compound.research-row',
      'base-button',
    ],
    createThumbnail: createResearchBoxThumbnail,
    folderPath: ['Research'],
    id: 'compound.research-station-box',
    kind: 'widget',
    label: 'Research Station Box',
    sectionId: 'composite-widgets',
    properties: [
      { label: 'Production class', value: 'ResearchBoxWidget' },
      { label: 'Contract', value: 'Station title with retained research rows' },
    ],
    scenarios: [
      {
        fixture: { states: ['available'] },
        id: 'single-row',
        label: 'Single row',
        mount: mountResearchBox,
      },
      {
        fixture: { states: ['available', 'in-progress', 'completed'] },
        id: 'multiple-rows',
        label: 'Multiple rows',
        mount: mountResearchBox,
      },
      {
        fixture: { states: ['mana-capacity', 'mana-generation'] },
        id: 'mana-icons',
        label: 'Mana icons',
        mount: mountResearchBox,
      },
    ],
    usages: [
      {
        label: 'Research room station groups',
        source: 'src/rendering/pixi/pages/research/ResearchPixiPage.js',
      },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createResearchTooltipThumbnail,
    folderPath: ['Research'],
    id: 'compound.research-lock-tooltip',
    kind: 'widget',
    label: 'Research Lock Tooltip',
    sectionId: 'composite-widgets',
    properties: [
      { label: 'Production class', value: 'ResearchLockTooltip' },
      { label: 'Contract', value: 'Requirement explanation for locked research' },
    ],
    scenarios: [
      {
        fixture: { copy: 'Complete prior research' },
        id: 'requirement',
        label: 'Requirement',
        mount: mountResearchTooltip,
      },
      {
        fixture: { copy: 'Reach Level 10 to unlock Advanced Research' },
        id: 'wrapped',
        label: 'Wrapped copy',
        mount: mountResearchTooltip,
      },
    ],
    usages: [
      {
        label: 'Locked Research rows and tabs',
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
    createResearchRowModel(fixture),
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

function createResearchRowModel({ itemTimer = false, manaModifier = null, state }) {
  const completed = state === 'completed';
  const inProgress = state === 'in-progress';
  const locked = state === 'locked';
  const unavailable = state === 'unavailable';
  return {
    artAssetId: manaModifier
      ? 'source:assets/icons/icon-mana-drop.png'
      : RESEARCH_ART_ASSET_ID,
    ...(manaModifier
      ? {
          artExtraAssetId:
            manaModifier === 'capacity'
              ? 'source:assets/icons/research/icon-research-mana-capacity-up.png'
              : 'source:assets/icons/research/icon-research-mana-generation-plus.png',
        }
      : {}),
    ...(itemTimer
      ? {
          artExtraKey: 'timerReduction',
          artExtraAssetId:
            'source:assets/icons/research/icon-research-time.png',
          itemKey: 'mintHerb',
          itemKind: 'herb',
        }
      : {}),
    canResearch: state === 'available',
    completed,
    cost: {
      amountLabel: '25',
      lockPrompt: locked ? 'Complete prior research' : '',
      resource: 'coin',
    },
    displayName: manaModifier
      ? manaModifier === 'capacity'
        ? 'Mana Capacity'
        : 'Mana Generation'
      : itemTimer
        ? 'Mint Growing'
        : 'Mint Cultivation',
    displayValue: completed ? 'Researched' : '25 coin',
    effect: manaModifier
      ? manaModifier === 'capacity'
        ? 'Increases mana capacity'
        : 'Increases mana generation'
      : completed
        ? 'Growth improved'
        : 'Learn to grow mint',
    id: manaModifier
      ? manaModifier === 'capacity'
        ? 'manaSphereCap:1'
        : 'manaProductionRate:1'
      : itemTimer
        ? 'timer:herbGrowth:mintHerb:1'
        : 'mint-cultivation',
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

function createResearchBoxThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: researchAssetFilter,
    component: 'ResearchBoxWidget',
    createControl: ({ assets, input }) => createResearchBoxControl({
      assets,
      fixture: { states: ['available', 'in-progress'] },
      input,
      now: () => 0,
    }),
    id: 'compound.research-station-box',
  });
}

async function mountResearchBox(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: researchAssetFilter,
    component: 'ResearchBoxWidget',
    createControl: ({ assets, input }) => createResearchBoxControl({
      assets,
      fixture,
      input,
      now: () => context.clock.now(),
    }),
  });
}

function createResearchBoxControl({ assets, fixture, input, now }) {
  const page = createResearchWidgetPage({ assets, input });
  if (fixture.states.includes('completed')) {
    page.toggleCompletedResearches('herbs');
  }
  const rows = fixture.states.map((state, index) => {
    const manaModifier = state === 'mana-capacity'
      ? 'capacity'
      : state === 'mana-generation'
        ? 'generation'
        : null;
    const rowModel = createResearchRowModel({
      manaModifier,
      state: manaModifier ? 'available' : state,
    });
    const row = new ResearchRowWidget({
      assetManager: assets,
      page,
      prefersReducedMotion: () => true,
      timeSource: now,
    });
    row.bind(
      {
        ...rowModel,
        displayName: manaModifier
          ? rowModel.displayName
          : ['Mint Cultivation', 'Sage Mastery', 'Herbal Memory'][index],
        id: manaModifier ? rowModel.id : `research-editor-${index}`,
      },
      { buy: () => true, locked: () => true },
      'herbs',
    );
    return row;
  });
  const box = new ResearchBoxWidget({ page });
  box.bind({ id: 'herbs', label: 'Herbal Studies' });
  box.setRows(rows);
  box.setBounds(0, 0, RESEARCH_PIXI_GEOMETRY.cardWidth);
  return {
    destroy: () => {
      box.reset();
      for (const row of rows) row.destroy();
      box.destroy();
    },
    height: box.getPreferredHeight(),
    root: box.root,
    width: RESEARCH_PIXI_GEOMETRY.cardWidth,
  };
}

function createResearchTooltipThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: researchAssetFilter,
    component: 'ResearchLockTooltip',
    createControl: ({ assets }) => createResearchTooltipControl({
      assets,
      fixture: { copy: 'Complete prior research' },
    }),
    id: 'compound.research-lock-tooltip',
  });
}

async function mountResearchTooltip(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: researchAssetFilter,
    component: 'ResearchLockTooltip',
    createControl: ({ assets }) => createResearchTooltipControl({ assets, fixture }),
  });
}

function createResearchTooltipControl({ assets, fixture }) {
  const tooltip = new ResearchLockTooltip({ assetManager: assets });
  tooltip.bind(fixture.copy);
  tooltip.show({ x: 0, y: 0, animate: false });
  return {
    destroy: () => tooltip.destroy(),
    height: tooltip.height,
    root: tooltip.root,
    width: tooltip.width,
  };
}

function createResearchWidgetPage({ assets, input }) {
  const semanticTargets = new Map();
  const completedSectionIds = new Set();
  return {
    assetManager: assets,
    inputRouter: input,
    registerSemanticTarget(target) {
      semanticTargets.set(target.semanticId, target);
    },
    rowPool: null,
    selectedTabId: 'regular',
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    isShowingCompletedResearches(boxId) {
      return completedSectionIds.has(`${this.selectedTabId}:${boxId}`);
    },
    toggleCompletedResearches(boxId) {
      const sectionId = `${this.selectedTabId}:${boxId}`;
      if (completedSectionIds.has(sectionId)) {
        completedSectionIds.delete(sectionId);
      } else {
        completedSectionIds.add(sectionId);
      }
      return true;
    },
    unregisterSemanticTarget(semanticId) {
      return semanticTargets.delete(semanticId);
    },
  };
}

function researchAssetFilter({ id }) {
  return id.includes('/ui/') || id.includes('/icons/');
}
