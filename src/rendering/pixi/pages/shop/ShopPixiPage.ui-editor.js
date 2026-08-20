import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { ShopPixiPage } from './ShopPixiPage.js';

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: [
    'compound.market-title-ribbon',
    'compound.market-stalls-section',
    'compound.market-stall',
    'compound.market-rows-section',
    'compound.market-offer-row',
    'compound.market-compact-row',
    'text-button',
  ],
  folderPath: ['Market'],
  id: 'feature.market-room',
  kind: 'scene',
  label: 'Market Room',
  sectionId: 'scenes',
  properties: [{ label: 'Production class', value: 'ShopPixiPage' }],
  scenarios: [
    { fixture: { tab: 'traders' }, id: 'traders', label: 'Traders', mount: mount },
    { fixture: { tab: 'players' }, id: 'players', label: 'Players', mount: mount },
    { fixture: { tab: 'crystals' }, id: 'gems', label: 'Gems', mount: mount },
  ],
});

async function mount(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: ({ id }) => id.includes('/ui/') || id.includes('/icons/') || id.includes('/items/'),
    component: 'ShopPixiPage',
    createControl: ({ assets, input, projection }) => {
      const page = new ShopPixiPage({ assetManager: assets, inputRouter: input });
      page.layout(projection);
      page.bind(createModel(fixture.tab));
      page.activate();
      return { destroy: () => page.destroy(), layout: (next) => page.layout(next), root: page.root };
    },
    layout: 'fill',
  });
}

function createModel(selectedTabId) {
  return { shop: { selectedTabId, market: { name: 'Small Town Market', rank: 2 }, traders: { timerLabel: 'refresh 2m', stalls: [{ id: 'stall-1', slotNumber: 1, starLevel: 2, itemLabel: 'Sage Seed', quantityLabel: 'x4', priceLabel: '12 coin', priceResourceKey: 'coin', progress: 0.52, timerLabel: '18s' }, { id: 'stall-2', slotNumber: 2, itemLabel: 'Empty', progress: null }] }, players: { requests: { countLabel: '1/3', slots: [{ id: 'request-1', slotNumber: 1, itemLabel: 'Mint Herb x3', value: '42 coin' }] }, market: { countLabel: '1/3', slots: [{ id: 'listing-1', slotNumber: 1, itemLabel: 'Sage Seed x5', value: '24 coin' }] } }, crystals: { coinOffer: { rewardLabel: '500 coin', actionLabel: 'Collect', canCollect: true }, dailyCrystalOffer: { rewardLabel: '1 amber', actionLabel: 'Free', canCollect: true }, offers: [{ id: 'amber-1', resourceKey: 'crystal', amount: 1, bundleLabel: '1 Amber', priceLabel: '$4.99' }, { id: 'amethyst-100', resourceKey: 'amethyst', amount: 100, bundleLabel: '100 Amethyst', priceLabel: '$4.99' }] } } };
}
