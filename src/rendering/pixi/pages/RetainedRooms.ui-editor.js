import { defineUiEditorIntegration } from '../../../uiEditor/sdk/defineUiEditorIntegration.js';
import { createUiEditorPixiSurface } from '../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createPageViewModel } from '../acceptance/RetainedAcceptanceFixtures.js';
import { BrewingPixiPage } from './brewing/BrewingPixiPage.js';
import { GardenPixiPage } from './garden/GardenPixiPage.js';
import { WorkshopPixiPage } from './workshop/WorkshopPixiPage.js';

const ROOM_ASSET_FILTER = ({ id }) =>
  id.includes('/ui/') ||
  id.includes('/icons/') ||
  id.includes('/items/') ||
  id.includes('/rooms/') ||
  id.includes('/characters/');

export default [
  roomIntegration({
    childWidgetIds: [
      'compound.workshop-task-panel',
      'compound.workshop-task-row',
      'compound.workshop-summon-control',
      'compound.root-run-side-action',
      'cost-button',
      'info-button',
    ],
    folder: 'Workshop',
    id: 'feature.workshop-room',
    label: 'Workshop Room',
    pageClass: WorkshopPixiPage,
    pageId: 'workshop',
  }),
  roomIntegration({
    childWidgetIds: [
      'compound.garden-seed-action-bar',
      'compound.garden-plot',
      'compound.garden-plot-tooltip',
      'cost-button',
      'primitive.progress-bar',
      'primitive.star-level-label',
    ],
    folder: 'Garden',
    id: 'feature.garden-room',
    label: 'Garden Room',
    pageClass: GardenPixiPage,
    pageId: 'garden',
  }),
  roomIntegration({
    childWidgetIds: [
      'compound.brewing-cauldron',
      'compound.brewing-cauldron-row',
      'compound.brewing-cauldron-button',
      'compound.brewing-inventory-panel',
      'compound.brewing-inventory-row',
      'compound.brewing-inventory-opener',
      'compound.brewing-batch-detail',
      'compound.brewing-ingredient-picker-slot',
    ],
    folder: 'Brewing',
    id: 'feature.brewing-room',
    label: 'Brewing Room',
    pageClass: BrewingPixiPage,
    pageId: 'brewing',
  }),
];

function roomIntegration({
  childWidgetIds,
  folder,
  id,
  label,
  pageClass,
  pageId,
}) {
  return defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds,
    folderPath: [folder],
    id,
    kind: 'scene',
    label,
    properties: [
      { label: 'Production class', value: pageClass.name },
      { label: 'State source', value: 'Retained acceptance fixture' },
    ],
    scenarios: [
      { fixture: { variant: 'a' }, id: 'populated', label: 'Populated', mount },
      { fixture: { variant: 'b' }, id: 'alternate', label: 'Alternate state', mount },
    ],
    sectionId: 'scenes',
    usages: [
      {
        label: `${folder} production room`,
        source: `src/rendering/pixi/pages/${pageId}/`,
      },
    ],
  });

  async function mount(_context, fixture) {
    return createUiEditorPixiSurface({
      assetFilter: ROOM_ASSET_FILTER,
      component: pageClass.name,
      createControl: ({ application, assets, input, projection }) => {
        const page = new pageClass({
          assetManager: assets,
          inputRouter: input,
          ticker: application.ticker,
          timeSource: () => 0,
        });
        page.layout(projection);
        page.bind(createPageViewModel(pageId, fixture.variant));
        page.activate();
        return {
          destroy: () => page.destroy(),
          layout: (nextProjection) => page.layout(nextProjection),
          root: page.root,
        };
      },
      layout: 'fill',
    });
  }
}
