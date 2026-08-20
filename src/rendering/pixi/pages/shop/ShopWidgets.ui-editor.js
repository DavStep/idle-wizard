import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { RETAINED_DIALOG_LIST_GEOMETRY } from '../workshop/RetainedPageKit.js';
import { MarketTitleRibbon } from './MarketTitleRibbon.js';
import {
  MarketOfferRow,
  ShopCompactRow,
  ShopRowsSection,
  ShopStallWidget,
  ShopStallsSection,
} from './ShopPixiPage.js';
import {
  AmountSelectorPixi,
  DialogField,
  DialogSummaryRow,
  MarketLedgerRowPixi,
  PlayerMarketOfferRow,
} from './ShopDialogPixi.js';

const WIDTH = 342;
const LEDGER_ROW_WIDTH =
  RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth +
  PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
const marketAssets = ({ id }) => id.includes('/ui/') || id.includes('/icons/') || id.includes('/items/');

export default [
  widget('compound.market-title-ribbon', 'Market Title Ribbon', ['primitive.star-level-label'], ribbonControl, [scenario('rank-1', 'Rank 1', { rank: 1 }), scenario('rank-3', 'Rank 3', { rank: 3 })]),
  widget('compound.market-stall', 'Market Stall', ['primitive.progress-bar', 'primitive.star-level-label', 'text-button', 'primitive.notification-badge'], stallControl, [scenario('selling', 'Occupied, Cancel', { state: 'selling' }), scenario('empty', 'Empty, Select', { state: 'empty' }), scenario('locked', 'Locked', { state: 'locked' })]),
  widget('compound.market-offer-row', 'Market Offer Row', ['text-button'], offerControl, [scenario('coin', 'Coin offer', { resourceKey: 'coin' }), scenario('amber', 'Amber offer', { resourceKey: 'crystal' }), scenario('amethyst', 'Amethyst offer', { resourceKey: 'amethyst' }), scenario('disabled', 'Unavailable', { resourceKey: 'amethyst', disabled: true })]),
  widget('compound.market-compact-row', 'Market Compact Row', ['text-button', 'primitive.notification-badge'], compactRowControl, [scenario('value', 'Label and value', { mode: 'value' }), scenario('action', 'Inline action', { mode: 'action' }), scenario('disabled', 'Disabled', { mode: 'value', disabled: true })]),
  widget('compound.market-stalls-section', 'Market Stalls Section', ['compound.market-stall'], stallsSectionControl, [scenario('loaded', 'Loaded stalls', {}), scenario('empty', 'Empty stall', { empty: true })]),
  widget('compound.market-rows-section', 'Market Rows Section', ['compound.market-compact-row'], rowsSectionControl, [scenario('requests', 'Requests', {}), scenario('empty', 'Empty', { empty: true })]),
  widget('compound.market-ledger-row', 'Market Ledger Row', ['primitive.resource-label', 'primitive.star-level-label'], ledgerRowControl, [scenario('available', 'Available to buy', { state: 'available' }), scenario('no-stock', 'No trader stock', { state: 'no-stock' }), scenario('other-market', 'Different market', { state: 'other-market' })]),
  widget('compound.player-market-offer-row', 'Player Market Offer Row', ['compound.player-profile', 'primitive.resource-label', 'text-button'], playerMarketOfferRowControl, [scenario('listing', 'Listing', {}), scenario('alliance', 'Alliance seller', { alliance: true }), scenario('request', 'Request without Buy', { request: true })]),
  widget('compound.dialog-summary-row', 'Dialog Summary Row', [], summaryRowControl, [scenario('plain', 'Plain', {}), scenario('resource', 'Resource value', { resource: true }), scenario('item', 'Item icon', { item: true })]),
  widget('compound.dialog-field', 'Dialog Field', ['primitive.text-field'], fieldControl, [scenario('integer', 'Integer', { inputKind: 'integer' }), scenario('text', 'Text', { inputKind: 'text' }), scenario('multiline', 'Multiline', { inputKind: 'text', multiline: true })]),
  widget('compound.amount-selector', 'Amount Selector', ['text-button', 'primitive.text-field'], amountControl, [scenario('enabled', 'Enabled', {}), scenario('disabled', 'Disabled', { disabled: true })]),
];

function widget(id, label, childWidgetIds, factory, scenarios) {
  const createControl = ({ assets, input }, fixture) => factory({ assets, input, fixture });
  return defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds,
    createThumbnail: () => createUiEditorPixiThumbnail({ assetFilter: marketAssets, component: label.replaceAll(' ', ''), createControl: (deps) => createControl(deps, scenarios[0].fixture), id }),
    folderPath: ['Market'],
    id,
    kind: 'widget',
    label,
    sectionId: 'composite-widgets',
    properties: [{ label: 'Production class', value: label.replaceAll(' ', '') }],
    scenarios: scenarios.map((entry) => ({ ...entry, mount: (_context, fixture) => createUiEditorPixiSurface({ assetFilter: marketAssets, component: label.replaceAll(' ', ''), createControl: (deps) => createControl(deps, fixture) }) })),
    usages: [{ label: 'Market production UI', source: 'src/rendering/pixi/pages/shop/' }],
  });
}

function scenario(id, label, fixture) { return { fixture, id, label }; }

function ribbonControl({ assets, fixture }) {
  const control = new MarketTitleRibbon({ assetManager: assets });
  control.bind('Market', fixture.rank);
  return wrap(control.root, control.width, control.height, () => control.root.destroy({ children: true }), { control });
}

function stallControl({ assets, input, fixture }) {
  const control = new ShopStallWidget({ assetManager: assets, inputRouter: input });
  const locked = fixture.state === 'locked';
  const empty = fixture.state === 'empty';
  control.bind('stall-1', { batchLabel: empty ? '' : 'x4', enabled: !locked, itemLabel: empty ? 'Empty' : locked ? 'Locked' : 'Sage Seed', locked, priceLabel: locked ? 'Locked' : empty ? 'Select' : 'Cancel', priceVariant: locked ? null : empty ? 'green' : 'red', progress: empty ? null : 0.62, selected: !empty && !locked, slotNumber: 1, starLevel: 2, timerLabel: empty ? '' : '18s' }, () => true);
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  control.setBounds(0, 0, WIDTH, 84);
  return wrap(control.root, WIDTH, 84, () => control.destroy(), { control });
}

function offerControl({ assets, input, fixture }) {
  const control = new MarketOfferRow({ assetManager: assets, inputRouter: input, label: 'ui-lab:offer' });
  control.bind('offer', { amountLabel: fixture.resourceKey === 'coin' ? '500' : fixture.resourceKey === 'amethyst' ? '100' : '12', enabled: !fixture.disabled, priceLabel: fixture.disabled ? 'Unavailable' : 'Buy', resourceKey: fixture.resourceKey, title: fixture.resourceKey === 'coin' ? 'Coin Purse' : fixture.resourceKey === 'amethyst' ? 'Amethyst Cache' : 'Amber Cache' }, () => true);
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  control.setBounds(0, 0, WIDTH, 84);
  return wrap(control.root, WIDTH, 84, () => control.destroy(), { control });
}

function compactRowControl({ assets, input, fixture }) {
  const control = new ShopCompactRow({ assetManager: assets, inputRouter: input, label: 'ui-lab:compact', paperPresentation: true });
  control.bind('row', { enabled: !fixture.disabled, indexLabel: '1.', itemLabel: 'Sage Seed x5', priceLabel: fixture.mode === 'action' ? 'Buy' : '24 coin', valueResourceKey: fixture.mode === 'value' ? 'coin' : null, valueVariant: fixture.mode === 'action' ? 'green' : null }, () => true);
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  control.setBounds(0, 0, WIDTH, 42);
  return wrap(control.root, WIDTH, 42, () => control.destroy(), { control });
}

function stallsSectionControl({ assets, input, fixture }) {
  const page = { theme: DEFAULT_PIXI_THEME_SNAPSHOT };
  const control = new ShopStallsSection({ page, assetManager: assets, inputRouter: input });
  control.bind({ stalls: [fixture.empty ? { id: '1', itemLabel: 'Empty', progress: null, selected: false, slotNumber: 1 } : { cancelAction: () => true, id: '1', itemLabel: 'Sage Seed', progress: 0.4, selected: true, slotNumber: 1, starLevel: 2, timerLabel: '18s' }], timerLabel: fixture.empty ? '' : 'next sale 18s' });
  const height = control.getPreferredHeight();
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control.root, WIDTH, height, () => control.destroy(), { control });
}

function rowsSectionControl({ assets, input, fixture }) {
  const page = { theme: DEFAULT_PIXI_THEME_SNAPSHOT };
  const control = new ShopRowsSection({ page, title: 'Requests', assetManager: assets, inputRouter: input, rowHeight: 27, label: 'ui-lab:rows' });
  control.bind(fixture.empty ? [] : [{ id: '1', indexLabel: '1.', itemLabel: 'Mint Herb x3', priceLabel: '42 coin', valueResourceKey: 'coin' }], { countLabel: fixture.empty ? '0/4' : '1/4' });
  const height = control.getPreferredHeight();
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control.root, WIDTH, height, () => control.destroy(), { control });
}

function ledgerRowControl({ assets, input, fixture }) {
  const control = new MarketLedgerRowPixi({
    assetManager: assets,
    inputRouter: input,
    label: 'ui-lab:ledger-row',
  });
  const otherMarket = fixture.state === 'other-market';
  const noStock = fixture.state === 'no-stock';
  control.applyTheme(createDialogContentTheme(DEFAULT_PIXI_THEME_SNAPSHOT));
  control.bind('sage-seed', {
    label: 'Sage Seed',
    stockLabel: noStock ? '0' : '2,897',
    buyersLabel: '1,294',
    buyPriceLabel: '8 coin',
    buyPriceResourceKey: 'coin',
    sellPriceLabel: '6 coin',
    sellPriceResourceKey: 'coin',
    itemKind: 'seed',
    itemKey: 'sageSeed',
    enabled: !noStock && !otherMarket,
    disabled: otherMarket,
    availabilityLabel: 'Trades at City Bazaar',
    requiredMarketRank: 3,
    action: () => true,
  });
  control.setBounds(0, 0, LEDGER_ROW_WIDTH, 58);
  return wrap(control.root, LEDGER_ROW_WIDTH, 58, () => control.destroy(), { control });
}

function playerMarketOfferRowControl({ assets, input, fixture }) {
  const control = new PlayerMarketOfferRow({
    assetManager: assets,
    inputRouter: input,
    label: 'ui-lab:player-market-offer',
  });
  control.bind('listing', {
    username: 'Mira',
    allianceTag: fixture.alliance ? 'OWL' : '',
    allianceTagColor: 'violet',
    character: 'elara',
    frame: 'violet',
    itemLabel: 'Sage Seed',
    itemKind: 'seed',
    itemKey: 'sageSeed',
    quantityLabel: 'x12',
    priceLabel: '8 coin',
    actionLabel: fixture.request ? '' : 'Buy',
    actionVariant: 'green',
    action: fixture.request ? null : () => true,
  });
  control.applyTheme(createDialogContentTheme(DEFAULT_PIXI_THEME_SNAPSHOT));
  control.setBounds(0, 0, WIDTH, 72);
  return wrap(control.root, WIDTH, 72, () => control.destroy(), { control });
}

function summaryRowControl({ assets, input, fixture }) {
  const control = new DialogSummaryRow({ assetManager: assets, inputRouter: input, label: 'ui-lab:summary' });
  control.bind('summary', fixture.item ? { label: 'Sage Seed', itemKind: 'seed', itemKey: 'sageSeed', quantityLabel: 'x5', value: 'Selected' } : { label: 'Price', value: fixture.resource ? '24' : 'Ready', valueIconResourceKey: fixture.resource ? 'coin' : null });
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  control.setBounds(0, 0, WIDTH, 28);
  return wrap(control.root, WIDTH, 28, () => control.destroy(), { control });
}

function fieldControl({ assets, input, fixture }) {
  const control = new DialogField({ assetManager: assets, inputRouter: input, label: 'ui-lab:field' });
  control.bind({ inputKind: fixture.inputKind, label: 'Amount', multiline: fixture.multiline, placeholder: 'Enter amount', value: '12' });
  const height = fixture.multiline ? 72 : 48;
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  control.setBounds(0, 0, WIDTH, height);
  return wrap(control.root, WIDTH, height, () => control.destroy(), { control });
}

function amountControl({ assets, input, fixture }) {
  const control = new AmountSelectorPixi({ assetManager: assets, inputRouter: input, label: 'ui-lab:amount' });
  control.bind({ disabledDeltas: [-100, 100], enabled: !fixture.disabled, value: 12 });
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  control.setBounds(0, 0, WIDTH, 30);
  return wrap(control.root, WIDTH, 30, () => control.destroy(), { control });
}

function wrap(root, width, height, destroy, extra = {}) { return { destroy, height, root, width, ...extra }; }
