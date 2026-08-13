import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';
import { RootRunInventoryChoiceRowPixi } from '../shop/ShopDialogPixi.js';

const ROW_WIDTH = 276;
const ROW_HEIGHT = 50;

export default defineUiEditorIntegration({
  apiVersion: 1,
  createThumbnail: createInventoryChoiceRowThumbnail,
  folderPath: ['Brewing'],
  id: 'compound.inventory-choice-row',
  kind: 'widget',
  label: 'Inventory Choice Row',
  properties: [
    {
      label: 'Production class',
      value: 'RootRunInventoryChoiceRowPixi',
    },
    {
      label: 'Contract',
      value: 'Shared seed and herb inventory choice row',
    },
  ],
  scenarios: [
    {
      fixture: createHerbFixture(),
      id: 'unselected',
      label: 'Herb, unselected',
      mount: mountInventoryChoiceRow,
    },
    {
      fixture: createHerbFixture({ selected: true }),
      id: 'selected',
      label: 'Herb, selected',
      mount: mountInventoryChoiceRow,
    },
    {
      fixture: createHerbFixture({ pressed: true }),
      id: 'pressed',
      label: 'Herb, pressed',
      mount: mountInventoryChoiceRow,
    },
    {
      fixture: createHerbFixture({ disabled: true }),
      id: 'disabled',
      label: 'Herb, unavailable',
      mount: mountInventoryChoiceRow,
    },
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'Choose Herb dialog row',
      source: 'src/rendering/pixi/pages/shared/RootRunInventoryChoiceDialogPixi.js',
    },
    {
      label: 'Choose Seed dialog row',
      source: 'src/rendering/pixi/pages/garden/GardenDialogPixi.js',
    },
  ],
});

function createInventoryChoiceRowThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: inventoryChoiceAssetFilter,
    component: 'RootRunInventoryChoiceRowPixi',
    createControl: ({ assets }) =>
      createInventoryChoiceRowControl({
        assets,
        fixture: createHerbFixture(),
        input: null,
      }),
    id: 'compound.inventory-choice-row',
  });
}

async function mountInventoryChoiceRow(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: inventoryChoiceAssetFilter,
    component: 'InventoryChoiceRow',
    createControl: ({ assets, input }) =>
      createInventoryChoiceRowControl({
        assets,
        fixture: {
          ...fixture,
          action: () => {
            context.emit('inventoryChoiceActivated', {
              itemKey: fixture.key,
            });
            return true;
          },
        },
        input,
      }),
  });
}

function createInventoryChoiceRowControl({ assets, fixture, input }) {
  const row = new RootRunInventoryChoiceRowPixi({
    assetManager: assets,
    inputRouter: input,
    label: 'inventoryChoiceRow',
    useSettingsStyle: true,
  });
  row.bind(fixture.key, fixture);
  row.setBounds(0, 0, ROW_WIDTH, ROW_HEIGHT, ROW_HEIGHT);
  row.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  row.setPressed(fixture.pressed === true);

  return {
    atomicComponents: createInventoryChoiceRowHierarchy(row),
    destroy: () => row.destroy(),
    height: ROW_HEIGHT,
    root: row.root,
    row,
    width: ROW_WIDTH,
  };
}

function createInventoryChoiceRowHierarchy(row) {
  return [
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.itemIcon, row.itemIconOverlay],
      id: 'inventory-choice-row:icon',
      label: 'Herb icon',
      primary: row.itemIcon,
      type: 'image',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.label],
      id: 'inventory-choice-row:name',
      label: 'Herb name label',
      primary: row.label,
      textTarget: row.label,
      type: 'label',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.detail],
      id: 'inventory-choice-row:available',
      label: 'Available herb label',
      primary: row.detail,
      textTarget: row.detail,
      type: 'label',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [row.selectedIndicator],
      id: 'inventory-choice-row:selected',
      label: 'Selected indicator',
      primary: row.selectedIndicator,
      type: 'image',
    }),
  ];
}

function createHerbFixture(overrides = {}) {
  return {
    detail: '2 Available',
    enabled: overrides.disabled !== true,
    itemKind: 'herb',
    key: 'sageHerb',
    label: 'Sage',
    selected: false,
    ...overrides,
  };
}

function inventoryChoiceAssetFilter({ id }) {
  return id.includes('/ui/root-run-settings/')
    || id.includes('/ui/prop_checkmark')
    || id.includes('/ui/notification-circle-');
}
