import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { RETAINED_DIALOG_LIST_GEOMETRY } from '../workshop/RetainedPageKit.js';
import { MarketTitleRibbon } from './MarketTitleRibbon.js';
import {
  MarketOfferCard,
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
  widget('compound.market-title-ribbon', 'Market Title Ribbon', ['primitive.star-level-label'], ribbonControl, [scenario('market', 'Market red', { assetId: PIXI_ROOT_RUN_ASSETS.marketTitleRibbonRed, rank: 1 }), scenario('rank-3', 'Market red, Rank 3', { assetId: PIXI_ROOT_RUN_ASSETS.marketTitleRibbonRed, rank: 3 }), scenario('brewing', 'Brewing blue', { assetId: PIXI_ROOT_RUN_ASSETS.marketTitleRibbonBlue, rank: 2, title: 'Cauldron 1' }), scenario('garden', 'Garden green', { assetId: PIXI_ROOT_RUN_ASSETS.marketTitleRibbonGreen, rank: 0, showStars: false, title: 'Garden' }), scenario('research', 'Research yellow', { assetId: PIXI_ROOT_RUN_ASSETS.marketTitleRibbonYellow, rank: 0, showStars: false, title: 'Research' }), scenario('alliance', 'Trade Alliance purple', { assetId: PIXI_ROOT_RUN_ASSETS.marketTitleRibbon, rank: 0, showStars: false, title: 'Trade Alliance' }), scenario('elara-compact', 'Elara compact', { compact: true, rank: 0, showStars: false, title: "Elara's Request" })]),
  widget('compound.market-stall', 'Market Stall', ['primitive.progress-bar', 'primitive.star-level-label', 'text-button', 'cost-button', 'primitive.notification-badge'], stallControl, [scenario('selling', 'Occupied, Cancel', { state: 'selling' }), scenario('empty', 'Empty, Select', { state: 'empty' }), scenario('purchasable', 'Purchasable, Unlock', { state: 'purchasable' }), scenario('level-locked', 'Level Locked', { state: 'level-locked' })]),
  widget('compound.market-offer-card', 'Market Offer Card', ['text-button'], offerControl, [scenario('amber', 'Amber Pouch', { resourceKey: 'crystal', title: 'Amber Pouch' }), scenario('amethyst', 'Amethyst Chest', { resourceKey: 'amethyst', title: 'Amethyst Chest' }), scenario('daily', 'Daily Amber offer', { resourceKey: 'crystal', title: 'Daily Offer', wide: true }), scenario('weekly-plot', 'Weekly Extra Plot', { amountLabel: 'E1', claimCadence: 'Unlocks 1 extra automated plot for 7 days.', iconAssetId: 'source:assets/icons/icon-garden-plot-tab.png', title: 'Extra Plot', wide: true }), scenario('weekly-cauldron', 'Weekly Extra Cauldron', { amountLabel: 'E1', claimCadence: 'Unlocks 1 extra automated cauldron for 7 days.', iconAssetId: 'source:assets/icons/icon-brewing-cauldron-tab.png', title: 'Extra Cauldron', wide: true }), scenario('disabled', 'Unavailable', { resourceKey: 'amethyst', title: 'Amethyst Hoard', disabled: true })]),
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
  const compact = fixture.compact === true;
  const control = new MarketTitleRibbon({
    assetManager: assets,
    assetId:
      fixture.assetId ??
      (compact
        ? PIXI_ROOT_RUN_ASSETS.workshopRequestTitleRibbon
        : PIXI_ROOT_RUN_ASSETS.marketTitleRibbon),
    geometry: compact
      ? PIXI_ROOT_RUN_GEOMETRY.workshopRequestTitleRibbon
      : PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon,
    showStars: fixture.showStars !== false,
  });
  control.bind(fixture.title ?? 'Market', fixture.rank);
  return wrap(control.root, control.width, control.height, () => control.root.destroy({ children: true }), { control });
}

function stallControl({ assets, input, fixture }) {
  const control = new ShopStallWidget({ assetManager: assets, inputRouter: input });
  const locked = fixture.state === 'level-locked';
  const purchasable = fixture.state === 'purchasable';
  const empty = fixture.state === 'empty';
  const buySlot = purchasable || locked;
  control.bind('stall-1', { affordable: true, batchLabel: empty || buySlot ? '' : 'x2', buySlot, costCoin: 50, enabled: !locked, itemLabel: locked ? 'Reach Level 4' : empty || purchasable ? '' : 'Sage Seed', lockedByLevel: locked, priceLabel: locked ? '' : purchasable ? '50 coin' : empty ? 'Select' : 'Cancel', priceVariant: buySlot ? null : empty ? 'green' : 'red', salePriceLabel: empty || buySlot ? '' : '24 coin', salePriceResourceKey: empty || buySlot ? null : 'coin', progress: empty || buySlot ? null : 0.62, selected: !empty && !buySlot, slotNumber: 1, starLevel: buySlot ? 0 : 2, timerLabel: empty || buySlot ? '' : '18s' }, () => true);
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  control.setBounds(0, 0, WIDTH, 84);
  return wrap(control.root, WIDTH, 84, () => control.destroy(), { control });
}

function offerControl({ assets, input, fixture }) {
  const control = new MarketOfferCard({ assetManager: assets, inputRouter: input, label: 'ui-lab:offer' });
  control.bind('offer', { amountLabel: fixture.amountLabel ?? (fixture.resourceKey === 'amethyst' ? '1,000' : '12'), claimCadence: fixture.claimCadence ?? (fixture.wide ? 'Claim every 24 hours' : ''), compact: !fixture.wide, enabled: !fixture.disabled, fullWidth: fixture.wide, iconAssetId: fixture.iconAssetId, priceLabel: fixture.disabled ? 'Unavailable' : fixture.iconAssetId ? '$15.00' : fixture.wide ? 'Free' : '$19.99', resourceKey: fixture.resourceKey, title: fixture.title }, () => true);
  control.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  const width = fixture.wide ? WIDTH : 112;
  const height = fixture.wide ? 84 : 126;
  control.setBounds(0, 0, width, height);
  return wrap(control.root, width, height, () => control.destroy(), { control });
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
