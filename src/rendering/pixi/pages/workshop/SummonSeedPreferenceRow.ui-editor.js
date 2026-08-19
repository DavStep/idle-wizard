import { defineUiEditorIntegration } from '../../../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import { SummonSeedPreferenceRowPixi } from '../shop/ShopDialogPixi.js';
import { DEFAULT_PIXI_THEME_SNAPSHOT } from '../../theme/PixiThemeTokens.js';

const ROW_WIDTH = 276;
const ROW_HEIGHT = 50;

export default defineUiEditorIntegration({
  apiVersion: 1,
  childWidgetIds: ['text-button'],
  createThumbnail: createThumbnail,
  folderPath: ['Workshop'],
  id: 'compound.summon-seed-preference-row',
  kind: 'widget',
  label: 'Summon Seed Preference Row',
  properties: [
    {
      label: 'Production class',
      value: 'SummonSeedPreferenceRowPixi',
    },
    {
      label: 'Contract',
      value: 'Disclosure row with a color-coded weight button and button-only press motion',
    },
  ],
  scenarios: [
    createScenario('none', 'None, brown'),
    createScenario('low', 'Low, red'),
    createScenario('medium', 'Medium, yellow'),
    createScenario('high', 'High, green'),
    createScenario('pressed', 'Button pressed', {
      preference: 'high',
      pressed: true,
    }),
    createScenario('disabled', 'Unavailable', {
      disabled: true,
      preference: 'none',
    }),
  ],
  sectionId: 'composite-widgets',
  usages: [
    {
      label: 'Summoning Seeds dialog',
      source: 'src/rendering/pixi/pages/shop/ShopDialogPixi.js',
    },
  ],
});

function createScenario(id, label, overrides = {}) {
  return {
    fixture: createFixture({ preference: id, ...overrides }),
    id,
    label,
    mount: mountRow,
  };
}

function createThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter,
    component: 'SummonSeedPreferenceRowPixi',
    createControl: ({ assets }) =>
      createControl({
        assets,
        fixture: createFixture({ preference: 'medium' }),
        input: null,
      }),
    id: 'compound.summon-seed-preference-row',
  });
}

async function mountRow(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter,
    component: 'SummonSeedPreferenceRow',
    createControl: ({ assets, input }) =>
      createControl({
        assets,
        fixture: {
          ...fixture,
          action: () => context.emit('seedPreferenceDisclosureToggled'),
        },
        input,
      }),
  });
}

function createControl({ assets, fixture, input }) {
  const row = new SummonSeedPreferenceRowPixi({
    assetManager: assets,
    inputRouter: input,
    label: 'summonSeedPreferenceRow',
    useSettingsStyle: true,
  });
  row.bind(fixture.key, fixture);
  row.setBounds(0, 0, ROW_WIDTH, ROW_HEIGHT, ROW_HEIGHT);
  row.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  row.preferenceButton.setPressed(fixture.pressed === true);

  return {
    atomicComponents: [
      createUiEditorPixiHierarchyComponent({
        displayObjects: [row.itemIcon, row.itemIconOverlay],
        id: 'summon-seed-preference-row:icon',
        label: 'Seed icon',
        primary: row.itemIcon,
        type: 'image',
      }),
      createUiEditorPixiHierarchyComponent({
        displayObjects: [row.label],
        id: 'summon-seed-preference-row:name',
        label: 'Seed name',
        primary: row.label,
        textTarget: row.label,
        type: 'label',
      }),
      createUiEditorPixiHierarchyComponent({
        displayObjects: [row.detail],
        id: 'summon-seed-preference-row:chance',
        label: 'Drop chance',
        primary: row.detail,
        textTarget: row.detail,
        type: 'label',
      }),
      createUiEditorPixiHierarchyComponent({
        displayObjects: [row.preferenceButton],
        id: 'summon-seed-preference-row:button',
        label: 'Preference:TextButton',
        libraryEntryId: 'text-button',
        primary: row.preferenceButton,
        type: 'widget',
      }),
    ],
    destroy: () => row.destroy(),
    height: ROW_HEIGHT,
    root: row.root,
    row,
    width: ROW_WIDTH,
  };
}

function createFixture({ preference = 'medium', pressed = false, disabled = false } = {}) {
  const toneByPreference = {
    none: 'text',
    low: 'red',
    medium: 'yellow',
    high: 'green',
  };
  return {
    action: () => true,
    detail: preference === 'none' ? '0% Chance' : '46% Chance',
    disabled,
    dropSlider: {
      mode: 'milestones',
      value: preference,
    },
    itemKey: 'sageSeed',
    itemKind: 'seed',
    key: 'sageSeed',
    label: 'Sage Seed',
    pressed,
    value: preference[0].toUpperCase() + preference.slice(1),
    valueTone: toneByPreference[preference],
  };
}

function assetFilter({ id }) {
  return id.includes('/items/seeds/')
    || id.includes('/ui/prop_checkmark')
    || id.includes('/ui/root-run-settings/')
    || id.includes('/ui/regular-button/')
    || id.includes('/ui/notification-circle-');
}
