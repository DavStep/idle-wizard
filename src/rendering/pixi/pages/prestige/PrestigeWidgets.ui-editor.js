import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { RESEARCH_PIXI_GEOMETRY } from '../research/ResearchPixiPage.js';
import {
  PRESTIGE_DESCRIPTION_LINES,
  PrestigeConfirmPanel,
  PrestigeDescriptionPanel,
  PrestigeRowWidget,
  PrestigeTooltip,
} from './PrestigePixiPage.js';

const WIDTH = RESEARCH_PIXI_GEOMETRY.cardWidth;
const assetsFilter = ({ id }) => id.includes('/ui/') || id.includes('/icons/');

export default [
  integration('compound.prestige-description', 'Prestige Description', ['info-button'], descriptionControl, states(['summary', 'fallback'])),
  integration('compound.prestige-row', 'Prestige Row', ['cost-button', 'info-button', 'primitive.star-level-label'], rowControl, states(['available', 'completed', 'locked', 'point'])),
  integration('compound.prestige-confirm-panel', 'Prestige Confirm Panel', ['text-button'], confirmControl, states(['milestone', 'long-copy'])),
  integration('compound.prestige-tooltip', 'Prestige Tooltip', [], tooltipControl, states(['licence', 'reward'])),
];

function states(ids) { return ids.map((id) => ({ fixture: { state: id }, id, label: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' ') })); }

function integration(id, label, childWidgetIds, factory, scenarios) {
  const component = label.replaceAll(' ', '');
  return defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds,
    createThumbnail: () => createUiEditorPixiThumbnail({ assetFilter: assetsFilter, component, createControl: (deps) => factory({ ...deps, fixture: scenarios[0].fixture }), id }),
    folderPath: ['Prestige'],
    id,
    kind: 'widget',
    label,
    sectionId: 'composite-widgets',
    properties: [{ label: 'Production widget', value: component }],
    scenarios: scenarios.map((scenario) => ({ ...scenario, mount: (_context, fixture) => createUiEditorPixiSurface({ assetFilter: assetsFilter, component, createControl: (deps) => factory({ ...deps, fixture }) }) })),
    usages: [{ label: 'Prestige room', source: 'src/rendering/pixi/pages/prestige/PrestigePixiPage.js' }],
  });
}

function descriptionControl({ assets, input, fixture }) {
  const control = new PrestigeDescriptionPanel({ assetManager: assets, inputRouter: input, onDetails() {} });
  control.bind(fixture.state === 'summary' ? { headline: 'Reach Level 10', nextRunLabel: 'New run starts at Level 1', resourceLead: 'Starting Resources', resources: [{ amount: 5, resource: 'crystal' }, { amount: 1, resource: 'ruby' }, { amount: 2, resource: 'emerald' }], detailsLines: PRESTIGE_DESCRIPTION_LINES } : { summaryLines: ['Reach Level 10', 'New run starts at Level 1'], descriptionLines: PRESTIGE_DESCRIPTION_LINES.slice(0, 2) });
  control.setBounds(0, 0, WIDTH);
  return wrap(control, WIDTH, control.height);
}

function rowControl({ assets, input, fixture }) {
  const page = {
    inputRouter: input,
    registerSemanticTarget() {},
    requestPrestige() {},
    showTooltip() {},
    theme: DEFAULT_PIXI_THEME_SNAPSHOT,
    unregisterSemanticTarget() {},
  };
  const control = new PrestigeRowWidget({ page, assetManager: assets });
  const point = fixture.state === 'point';
  control.bind({ canComplete: fixture.state === 'available', completed: fixture.state === 'completed', count: point ? 3 : undefined, kind: point ? 'point' : 'milestone', level: point ? undefined : 10, locked: fixture.state === 'locked', rewardResources: point ? [] : [{ amount: 10, resource: 'crystal' }], rewardText: point ? 'Village Market' : '', state: fixture.state, title: point ? '3 Points' : 'Level 10', tooltip: { text: 'Permanent market licence reward.' } }, {});
  control.setBounds(0, 0, WIDTH, control.getPreferredHeight());
  return wrap(control, WIDTH, control.getPreferredHeight());
}

function confirmControl({ assets, input, fixture }) {
  const control = new PrestigeConfirmPanel({ assetManager: assets, inputRouter: input, onCancel() {}, onProceed() {} });
  control.bind({ lines: fixture.state === 'long-copy' ? ['This resets Mana, Coin, items, research, Garden, Brewing, and level tasks.', 'Daily and weekly task timers continue.'] : ['Return to level 1 and receive 10 crystal?'] });
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT); control.setBounds(0, 0, WIDTH);
  return wrap(control, WIDTH, control.height);
}

function tooltipControl({ assets, fixture }) {
  const control = new PrestigeTooltip({ assetManager: assets });
  control.bind({ text: fixture.state === 'licence' ? 'Unlocks one additional Market stall and the next trade grade.' : 'Awards all lower unclaimed milestone rewards.' });
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT); control.show({ x: 0, y: 0 });
  return wrap(control, 180, control.height);
}

function wrap(control, width, height) { return { control, destroy: () => control.destroy(), height, root: control.root, width }; }
