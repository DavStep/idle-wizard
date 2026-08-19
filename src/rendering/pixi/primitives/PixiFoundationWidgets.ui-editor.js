import { Container } from 'pixi.js';

import { defineUiEditorIntegration } from '../../../uiEditor/sdk/defineUiEditorIntegration.js';
import {
  createUiEditorPixiHierarchyComponent,
  createUiEditorPixiSurface,
} from '../../../uiEditor/widgets/createUiEditorPixiSurface.js';
import { createUiEditorPixiThumbnail } from '../../../uiEditor/widgets/createUiEditorPixiThumbnail.js';
import {
  RootRunHudCurrencyCapsule,
  RootRunHudLevelRail,
} from '../global/chrome/RootRunTopHudWidgets.js';
import {
  PIXI_BOTTOM_PANEL_TABS,
  PIXI_GUILD_HUD_TABS,
  PixiBottomHudTextTab,
  PixiBottomPanelView,
  PixiBottomRoomTab,
} from '../global/chrome/PixiBottomPanelView.js';
import {
  RetainedPanel,
  RetainedScrollArea,
} from '../pages/workshop/RetainedPageKit.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import {
  DeviceIdentityFooter,
  ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT,
  RootRunDevicePreferenceRow,
  RootRunDevicePreferencesPanel,
} from './PixiDeviceSettingsWidgets.js';
import { PixiInlineText } from './PixiInlineText.js';
import { PixiResourceLabel } from './PixiResourceLabel.js';
import { RootRunSettingsTogglePixi } from './PixiSettingsControls.js';
import { PixiStarLevelLabel } from './PixiStarLevelLabel.js';
import { PixiTextField } from './PixiTextField.js';
import { PixiTextLabel } from './PixiTextLabel.js';

const HUD_SOURCE_SCALE = PIXI_UI_GEOMETRY.sourceScale;
const FOUNDATION_SECTION = 'composite-widgets';

export default [
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createRetainedPanelThumbnail,
    folderPath: ['Panels'],
    id: 'primitive.retained-panel',
    kind: 'widget',
    label: 'Border-Labeled Panel',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'RetainedPanel' },
      { label: 'Contract', value: 'Shared ordinary room panel with embedded border title' },
    ],
    usages: [
      {
        label: 'Room boxes and compact global chrome',
        source: 'src/rendering/pixi/pages/workshop/RetainedPageKit.js',
      },
    ],
    scenarios: [
      { fixture: { label: 'Inventory', strong: false }, id: 'ordinary', label: 'Ordinary', mount: mountRetainedPanel },
      { fixture: { label: 'Elara\'s Request', strong: true }, id: 'strong', label: 'Strong title', mount: mountRetainedPanel },
      { fixture: { label: '', strong: false }, id: 'untitled', label: 'Untitled', mount: mountRetainedPanel },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    folderPath: ['Settings'],
    id: 'primitive.settings-toggle',
    kind: 'widget',
    label: 'Settings Toggle',
    createThumbnail: createSettingsToggleThumbnail,
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'RootRunSettingsTogglePixi' },
      { label: 'Contract', value: 'Boolean setting control' },
    ],
    usages: [
      {
        label: 'Device and visual settings',
        source: 'src/rendering/pixi/primitives/PixiDeviceSettingsWidgets.js',
      },
    ],
    scenarios: [
      { fixture: { enabled: true, value: false }, id: 'off', label: 'Off', mount: mountSettingsToggle },
      { fixture: { enabled: true, value: true }, id: 'on', label: 'On', mount: mountSettingsToggle },
      { fixture: { enabled: false, value: true }, id: 'disabled', label: 'Disabled', mount: mountSettingsToggle },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createDevicePreferenceRowThumbnail,
    folderPath: ['Settings'],
    id: 'compound.device-preference-row',
    kind: 'widget',
    label: 'Device Preference Row',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'RootRunDevicePreferenceRow' },
      { label: 'Contract', value: 'Icon-led preference row with compact boolean toggle or full-width percentage slider' },
    ],
    usages: [
      {
        label: 'Settings device and theme controls',
        source: 'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
      },
    ],
    scenarios: [
      { fixture: { controlKind: 'slider', enabled: true, key: 'sfx', text: 'SOUND', value: 64 }, id: 'slider-intermediate', label: 'Slider intermediate', mount: mountDevicePreferenceRow },
      { fixture: { controlKind: 'slider', enabled: true, key: 'music', text: 'MUSIC', value: 0 }, id: 'slider-muted', label: 'Slider muted', mount: mountDevicePreferenceRow },
      { fixture: { enabled: false, key: 'haptics', text: 'VIBRATION', value: true }, id: 'disabled', label: 'Disabled', mount: mountDevicePreferenceRow },
      { fixture: { enabled: true, key: 'theme', text: 'THEME', value: true }, id: 'theme', label: 'Day theme', mount: mountDevicePreferenceRow },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createDeviceIdentityFooterThumbnail,
    folderPath: ['Settings'],
    id: 'compound.device-identity-footer',
    kind: 'widget',
    label: 'Device Identity Footer',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'DeviceIdentityFooter' },
      { label: 'Contract', value: 'Client version, compact identity, and copy state' },
    ],
    usages: [
      {
        label: 'Settings configuration footer',
        source: 'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
      },
    ],
    scenarios: [
      { fixture: { userId: '', version: '0.12.0' }, id: 'unavailable', label: 'Not connected', mount: mountDeviceIdentityFooter },
      { fixture: { userId: 'c83af094129c4bbfa6e2b44c2e943acd', version: '0.12.0' }, id: 'ready', label: 'Ready to copy', mount: mountDeviceIdentityFooter },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    folderPath: ['Inputs'],
    id: 'primitive.text-field',
    kind: 'widget',
    label: 'Text Field',
    createThumbnail: createTextFieldThumbnail,
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'PixiTextField' },
      { label: 'Default skin', value: 'brown-inset' },
      { label: 'Compact composer skin', value: 'clean-inset' },
    ],
    usages: [
      {
        label: 'Chat, username, naming, feedback, and amount entry',
        source: 'src/rendering/pixi/primitives/PixiTextField.js',
      },
    ],
    scenarios: [
      { fixture: { placeholder: 'Enter message', value: '' }, id: 'empty', label: 'Empty', mount: mountTextField },
      { fixture: { placeholder: 'Message', value: '', variant: 'clean-inset' }, id: 'clean-inset', label: 'Clean inset', mount: mountTextField },
      { fixture: { placeholder: 'Enter message', value: 'Ready to brew' }, id: 'value', label: 'With value', mount: mountTextField },
      { fixture: { focused: true, placeholder: 'Enter message', value: 'Ready to brew' }, id: 'focused', label: 'Focused caret', mount: mountTextField },
      { fixture: { height: 64, multiline: true, placeholder: 'Write feedback', value: 'The workshop button disappears after I write a longer report that wraps onto several visible lines.' }, id: 'multiline', label: 'Multiline overflow', mount: mountTextField },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    folderPath: ['Text'],
    id: 'primitive.text-label',
    kind: 'widget',
    label: 'Text Label',
    createThumbnail: createTextLabelThumbnail,
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'PixiTextLabel' },
      { label: 'Theme font', value: 'Lilita One' },
    ],
    usages: [
      {
        label: 'Shared retained labels',
        source: 'src/rendering/pixi/primitives/PixiTextLabel.js',
      },
    ],
    scenarios: [
      { fixture: { text: 'Mana restored' }, id: 'regular', label: 'Regular', mount: mountTextLabel },
      { fixture: { outlined: true, text: 'Collect Reward' }, id: 'outlined', label: 'Outlined', mount: mountTextLabel },
      { fixture: { text: 'A compact wrapped label for narrow panels.', wrapWidth: 150 }, id: 'wrapped', label: 'Wrapped', mount: mountTextLabel },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createInlineTextThumbnail,
    folderPath: ['Text'],
    id: 'primitive.inline-text',
    kind: 'widget',
    label: 'Inline Text',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'PixiInlineText' },
      { label: 'Contract', value: 'Ordered text and icon runs' },
    ],
    usages: [
      {
        label: 'Mixed resource and narrative lines',
        source: 'src/rendering/pixi/primitives/PixiInlineText.js',
      },
    ],
    scenarios: [
      { fixture: { wrapWidth: 250 }, id: 'resource', label: 'Resource run', mount: mountInlineText },
      { fixture: { wrapWidth: 150 }, id: 'wrapped', label: 'Wrapped run', mount: mountInlineText },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    folderPath: ['Text'],
    id: 'primitive.resource-label',
    kind: 'widget',
    label: 'Resource Label',
    createThumbnail: createResourceLabelThumbnail,
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'PixiResourceLabel' },
      { label: 'Contract', value: 'Semantic icon and amount' },
    ],
    usages: [
      {
        label: 'HUD currencies and resource costs',
        source: 'src/rendering/pixi/primitives/PixiResourceLabel.js',
      },
    ],
    scenarios: [
      { fixture: { amount: '12,450', resource: 'coin' }, id: 'coin', label: 'Coin', mount: mountResourceLabel },
      { fixture: { amount: '320', resource: 'mana' }, id: 'mana', label: 'Mana', mount: mountResourceLabel },
      { fixture: { amount: '18', resource: 'crystal' }, id: 'crystal', label: 'Crystal', mount: mountResourceLabel },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    folderPath: ['Text'],
    id: 'primitive.star-level-label',
    kind: 'widget',
    label: 'Star Level Label',
    createThumbnail: createStarLevelThumbnail,
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'PixiStarLevelLabel' },
      { label: 'Maximum visual level', value: '12' },
    ],
    usages: [
      {
        label: 'Research, Market, and cauldron ranks',
        source: 'src/rendering/pixi/primitives/PixiStarLevelLabel.js',
      },
    ],
    scenarios: [
      { fixture: { level: 0, slotCount: 3 }, id: 'empty', label: 'Empty', mount: mountStarLevel },
      { fixture: { level: 2, slotCount: 3 }, id: 'yellow', label: 'Yellow rank', mount: mountStarLevel },
      { fixture: { level: 8, slotCount: 3 }, id: 'red', label: 'Red rank', mount: mountStarLevel },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    folderPath: ['Scrolling'],
    id: 'primitive.managed-scroll-area',
    kind: 'widget',
    label: 'Managed Scroll Area',
    createThumbnail: createScrollAreaThumbnail,
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'RetainedScrollArea' },
      { label: 'Physics', value: 'Root Run station scroll' },
    ],
    usages: [
      {
        label: 'Room pages, dialogs, and bounded lists',
        source: 'src/rendering/pixi/pages/workshop/RetainedPageKit.js',
      },
    ],
    scenarios: [
      { fixture: { rowCount: 12 }, id: 'overflowing', label: 'Overflowing', mount: mountScrollArea },
      { fixture: { rowCount: 4 }, id: 'fits', label: 'Fits viewport', mount: mountScrollArea },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createDevicePreferencesThumbnail,
    folderPath: ['Settings'],
    id: 'compound.device-preferences',
    kind: 'widget',
    label: 'Device Preferences',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production classes', value: 'RootRunDevicePreferencesPanel + Row' },
      { label: 'Row pitch', value: '50px' },
    ],
    usages: [
      {
        label: 'Settings device controls',
        source: 'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
      },
    ],
    scenarios: [
      { fixture: { theme: false }, id: 'night', label: 'Night theme', mount: mountDevicePreferences },
      { fixture: { theme: true }, id: 'day', label: 'Day theme', mount: mountDevicePreferences },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    id: 'compound.hud-level-rail',
    kind: 'widget',
    label: 'Level Progress Bar',
    createThumbnail: createHudLevelThumbnail,
    sectionId: 'progress-bars',
    properties: [
      { label: 'Production class', value: 'RootRunHudLevelRail' },
      { label: 'Authored scale', value: 'Root Run /3' },
    ],
    usages: [
      {
        label: 'Player level and request progress',
        source: 'src/rendering/pixi/global/chrome/PixiTopPanelView.js',
      },
    ],
    scenarios: [
      { fixture: { completed: 1, level: 7, ratio: 0.42, total: 4 }, id: 'partial', label: 'Partial', mount: mountHudLevelRail },
      { fixture: { completed: 4, level: 8, ratio: 1, total: 4 }, id: 'complete', label: 'Complete', mount: mountHudLevelRail },
      { fixture: { level: 0, questVisible: false, ratio: 0 }, id: 'level-only', label: 'Level only', mount: mountHudLevelRail },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createHudCurrencyThumbnail,
    folderPath: ['HUD'],
    id: 'compound.hud-currency-capsule',
    kind: 'widget',
    label: 'HUD Currency Capsule',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'RootRunHudCurrencyCapsule' },
      { label: 'Authored scale', value: 'Root Run /3' },
    ],
    usages: [
      {
        label: 'Top HUD resource capsules',
        source: 'src/rendering/pixi/global/chrome/PixiTopPanelView.js',
      },
    ],
    scenarios: [
      { fixture: { amount: '12.4K', resource: 'coin' }, id: 'coin', label: 'Coin', mount: mountHudCurrency },
      { fixture: { amount: '320', resource: 'mana' }, id: 'mana', label: 'Mana', mount: mountHudCurrency },
      { fixture: { amount: '18', resource: 'crystal' }, id: 'crystal', label: 'Crystal', mount: mountHudCurrency },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createBottomRoomTabThumbnail,
    folderPath: ['Navigation'],
    id: 'compound.bottom-room-tab',
    kind: 'widget',
    label: 'Bottom Room Tab',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'PixiBottomRoomTab' },
      { label: 'Contract', value: 'One room navigation tab and its visual states' },
    ],
    usages: [
      {
        label: 'Bottom room navigation group',
        source: 'src/rendering/pixi/global/chrome/PixiBottomPanelView.js',
      },
    ],
    scenarios: [
      { fixture: { pageId: 'workshop' }, id: 'default', label: 'Default', mount: mountBottomRoomTab },
      { fixture: { pageId: 'workshop', selected: true }, id: 'selected', label: 'Selected', mount: mountBottomRoomTab },
      { fixture: { pageId: 'garden', unlocked: false }, id: 'locked', label: 'Locked', mount: mountBottomRoomTab },
      { fixture: { notification: true, pageId: 'shop' }, id: 'notification', label: 'Notification', mount: mountBottomRoomTab },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    createThumbnail: createBottomHudTextTabThumbnail,
    folderPath: ['Navigation'],
    id: 'compound.bottom-hud-text-tab',
    kind: 'widget',
    label: 'Bottom HUD Text Tab',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'PixiBottomHudTextTab' },
      { label: 'Contract', value: 'Always-labeled alternate HUD tab using room-tab chrome' },
    ],
    usages: [
      {
        label: 'Iconless alternate HUD navigation',
        source: 'src/rendering/pixi/global/chrome/PixiBottomPanelView.js',
      },
    ],
    scenarios: [
      { fixture: { guildTabId: 'hall' }, id: 'default', label: 'Default', mount: mountBottomHudTextTab },
      { fixture: { guildTabId: 'adventurers', selected: true }, id: 'selected', label: 'Selected', mount: mountBottomHudTextTab },
      { fixture: { guildTabId: 'fishers', unlocked: false }, id: 'locked', label: 'Locked', mount: mountBottomHudTextTab },
      { fixture: { guildTabId: 'adventurers', notification: true }, id: 'notification', label: 'Notification', mount: mountBottomHudTextTab },
    ],
  }),
  defineUiEditorIntegration({
    apiVersion: 1,
    childWidgetIds: [
      'compound.bottom-room-tab',
    ],
    createThumbnail: createBottomRoomTabsThumbnail,
    folderPath: ['Navigation'],
    id: 'compound.bottom-room-tabs',
    kind: 'widget',
    label: 'Bottom Room Tabs',
    sectionId: FOUNDATION_SECTION,
    properties: [
      { label: 'Production class', value: 'PixiBottomPanelView' },
      { label: 'Default tabs', value: 'Brewing, Garden, Workshop, Research, Market' },
    ],
    usages: [
      {
        label: 'Global room navigation',
        source: 'src/rendering/pixi/global/chrome/PixiBottomPanelView.js',
      },
    ],
    scenarios: [
      { fixture: { currentPageId: 'workshop' }, id: 'workshop', label: 'Workshop selected', mount: mountBottomRoomTabs },
      { fixture: { currentPageId: 'research', lockedPageId: 'garden' }, id: 'locked', label: 'Locked Garden', mount: mountBottomRoomTabs },
      { fixture: { currentPageId: 'shop', notifiedPageId: 'shop' }, id: 'notification', label: 'Market notification', mount: mountBottomRoomTabs },
      { fixture: { currentPageId: 'guild', hudMode: 'guild' }, id: 'guild', label: 'Guild HUD', mount: mountBottomRoomTabs },
      { fixture: { currentPageId: 'prestige', hudMode: 'prestige' }, id: 'prestige', label: 'Prestige HUD', mount: mountBottomRoomTabs },
    ],
  }),
];

async function mountSettingsToggle(context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    assetFilter: settingsAssetFilter,
    component: 'RootRunSettingsTogglePixi',
    createControl: ({ assets, input }) => {
      const toggle = createSettingsToggleControl({ assets, input, model: toggleModel() });
      return toggle;
    },
  });
  const toggle = surface.control.toggle;
  const refresh = () => toggle.bind(toggleModel());

  return {
    ...surface,
    controls: [
      checkboxControl('value', 'On', () => state.value, (value) => {
        state.value = value;
        refresh();
      }),
      checkboxControl('enabled', 'Enabled', () => state.enabled, (value) => {
        state.enabled = value;
        refresh();
      }),
    ],
  };

  function toggleModel() {
    return {
      enabled: state.enabled,
      value: state.value,
      onChange: (value) => {
        state.value = value;
        context.emit('settingChanged', { value });
        context.invalidate();
        return true;
      },
    };
  }
}

async function mountRetainedPanel(_context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: panelAssetFilter,
    component: 'RetainedPanel',
    createControl: ({ assets }) => createRetainedPanelControl({ assets, fixture }),
  });
}

async function mountDevicePreferenceRow(context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    assetFilter: settingsAssetFilter,
    component: 'RootRunDevicePreferenceRow',
    createControl: ({ assets, input }) => createDevicePreferenceRowControl({
      assets,
      fixture: state,
      input,
      onChange: (value) => {
        state.value = value;
        context.emit('preferenceChanged', { key: state.key, value });
        return true;
      },
    }),
  });
  const row = surface.control.row;
  const valueControl = state.controlKind === 'slider'
    ? rangeControl('value', 'Volume', 0, 100, 1, () => state.value, (value) => {
        state.value = Number(value);
        row.bind({ enabled: state.enabled, value: state.value, onChange: () => true });
      })
    : checkboxControl('value', 'On', () => state.value, (value) => {
        state.value = value;
        row.bind({ enabled: state.enabled, value, onChange: () => true });
      });
  return {
    ...surface,
    controls: [
      valueControl,
      checkboxControl('enabled', 'Enabled', () => state.enabled, (value) => {
        state.enabled = value;
        row.bind({ enabled: value, value: state.value, onChange: () => true });
      }),
    ],
  };
}

async function mountDeviceIdentityFooter(context, fixture) {
  return createUiEditorPixiSurface({
    assetFilter: settingsAssetFilter,
    component: 'DeviceIdentityFooter',
    createControl: ({ assets, input }) => createDeviceIdentityFooterControl({
      assets,
      fixture,
      input,
      onCopy: (userId) => {
        context.emit('identityCopied', { userId });
        return true;
      },
    }),
  });
}

async function mountTextField(_context, fixture) {
  const state = { value: fixture.value };
  const height = fixture.height ?? 30;
  const surface = await createUiEditorPixiSurface({
    assetFilter: textFieldAssetFilter,
    component: 'PixiTextField',
    createControl: ({ assets, input }) => {
      const field = new PixiTextField({
        assetManager: assets,
        height,
        inputRouter: input,
        multiline: fixture.multiline,
        placeholder: fixture.placeholder,
        variant: fixture.variant,
        width: 240,
      });
      field.setValue(state.value);
      if (fixture.focused) {
        field.applySessionSnapshot({
          active: true,
          selectionEnd: state.value.length,
          selectionStart: state.value.length,
          value: state.value,
        });
      }
      return {
        destroy: () => field.destroy({ children: true }),
        field,
        height,
        root: field,
        width: 240,
      };
    },
  });
  const field = surface.control.field;
  return {
    ...surface,
    controls: [
      textControl('value', 'Value', () => state.value, (value) => {
        state.value = String(value);
        field.setValue(state.value);
      }),
    ],
  };
}

async function mountTextLabel(_context, fixture) {
  const state = { fontSize: 13, text: fixture.text };
  const surface = await createUiEditorPixiSurface({
    component: 'PixiTextLabel',
    createControl: () => {
      const label = createTextLabelControl(fixture);
      return label;
    },
  });
  const label = surface.control.label;
  return {
    ...surface,
    controls: [
      textControl('text', 'Text', () => state.text, (value) => {
        state.text = String(value);
        label.setText(state.text);
      }),
      rangeControl('font-size', 'Font size', 8, 24, 1, () => state.fontSize, (value) => {
        state.fontSize = Number(value);
        label.setFontSize(state.fontSize);
      }),
    ],
  };
}

async function mountInlineText(_context, fixture) {
  const state = { text: 'Collect 25 coin from the Market before the timer expires.' };
  const surface = await createUiEditorPixiSurface({
    component: 'PixiInlineText',
    createControl: ({ assets }) => {
      const inline = new PixiInlineText({
        runs: createInlineRuns(assets, state.text),
        style: inlineTextStyle(),
        wrapWidth: fixture.wrapWidth,
      });
      return {
        destroy: () => inline.destroy({ children: true }),
        height: Math.max(18, inline.layoutHeight),
        inline,
        root: inline,
        width: fixture.wrapWidth,
      };
    },
  });
  const inline = surface.control.inline;
  return {
    ...surface,
    controls: [
      textControl('text', 'Text', () => state.text, (value) => {
        state.text = String(value);
        inline.setRuns(createInlineRuns(null, state.text, inline.iconObjects[0]?.texture));
      }),
    ],
  };
}

async function mountResourceLabel(_context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    component: 'PixiResourceLabel',
    createControl: ({ assets }) => {
      const label = new PixiResourceLabel({
        amount: state.amount,
        assetManager: assets,
        includeResourceName: false,
        resource: state.resource,
      });
      return {
        destroy: () => label.destroy({ children: true }),
        height: 18,
        label,
        root: label,
        width: 150,
      };
    },
  });
  const label = surface.control.label;
  return {
    ...surface,
    controls: [
      selectControl('resource', 'Resource', () => state.resource, (value) => {
        state.resource = value;
        label.setResource(value);
      }, ['coin', 'mana', 'crystal', 'ruby', 'emerald']),
      textControl('amount', 'Amount', () => state.amount, (value) => {
        state.amount = String(value);
        label.setAmount(state.amount);
      }),
    ],
  };
}

async function mountStarLevel(_context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    assetFilter: starAssetFilter,
    component: 'PixiStarLevelLabel',
    createControl: ({ assets }) => createStarLevelControl({ assets, ...state }),
  });
  const label = surface.control.label;
  return {
    ...surface,
    controls: [
      rangeControl('level', 'Level', 0, 12, 1, () => state.level, (value) => {
        state.level = Number(value);
        label.setLevel(state.level, { slotCount: state.slotCount });
      }),
      selectControl('slots', 'Slots', () => String(state.slotCount), (value) => {
        state.slotCount = Number(value);
        label.setLevel(state.level, { slotCount: state.slotCount });
      }, ['2', '3']),
    ],
  };
}

async function mountScrollArea(_context, fixture) {
  const state = { offset: 0 };
  const surface = await createUiEditorPixiSurface({
    component: 'RetainedScrollArea',
    createControl: ({ input }) => createScrollAreaControl({ input, rowCount: fixture.rowCount }),
  });
  const scroll = surface.control.scroll;
  return {
    ...surface,
    controls: [
      rangeControl('offset', 'Scroll offset', 0, scroll.physics.maxOffset / HUD_SOURCE_SCALE, 1, () => state.offset, (value) => {
        state.offset = Number(value);
        scroll.scrollTo(state.offset);
      }),
    ],
    actions: [
      { id: 'top', label: 'Scroll to top', run: () => scroll.scrollTo(0) },
      { id: 'bottom', label: 'Scroll to bottom', run: () => scroll.scrollTo(scroll.contentHeight) },
    ],
  };
}

async function mountDevicePreferences(context, fixture) {
  const state = { haptics: true, music: 72, sound: 58, theme: fixture.theme };
  let panel = null;
  const surface = await createUiEditorPixiSurface({
    assetFilter: settingsAssetFilter,
    component: 'RootRunDevicePreferencesPanel',
    createControl: ({ assets, input }) => {
      panel = createDevicePreferencesControl({ assets, input, state, onChange: handleChange });
      return panel;
    },
  });
  return {
    ...surface,
    controls: [
      rangeControl('sound', 'Sound', 0, 100, 1, () => state.sound, (value) => handleChange('sound', value)),
      rangeControl('music', 'Music', 0, 100, 1, () => state.music, (value) => handleChange('music', value)),
      checkboxControl('haptics', 'Vibration', () => state.haptics, (value) => handleChange('haptics', value)),
      checkboxControl('theme', 'Day theme', () => state.theme, (value) => handleChange('theme', value)),
    ],
  };

  function handleChange(key, value) {
    state[key] = key === 'sound' || key === 'music'
      ? Number(value)
      : value === true;
    panel.bindRows(state, handleChange);
    context.emit('preferenceChanged', { key, value: state[key] });
    context.invalidate();
    return true;
  }
}

async function mountHudLevelRail(_context, fixture) {
  const state = {
    completed: fixture.completed ?? 0,
    level: fixture.level ?? 0,
    questVisible: fixture.questVisible !== false,
    ratio: fixture.ratio ?? 0,
    total: fixture.total ?? 4,
  };
  const surface = await createUiEditorPixiSurface({
    assetFilter: hudAssetFilter,
    component: 'RootRunHudLevelRail',
    createControl: ({ assets }) => createHudLevelControl({ assets, state }),
  });
  const rail = surface.control.rail;
  const refresh = () => {
    rail.setLevel(state.level);
    rail.setQuestVisible(state.questVisible);
    rail.renderProgress(state);
  };
  return {
    ...surface,
    controls: [
      rangeControl('level', 'Level', 0, 99, 1, () => state.level, (value) => {
        state.level = Number(value);
        refresh();
      }),
      rangeControl('ratio', 'Progress', 0, 1, 0.01, () => state.ratio, (value) => {
        state.ratio = Number(value);
        refresh();
      }, formatPercent),
      checkboxControl('quest', 'Show quest rail', () => state.questVisible, (value) => {
        state.questVisible = value;
        refresh();
      }),
    ],
  };
}

async function mountHudCurrency(_context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    assetFilter: hudAssetFilter,
    component: 'RootRunHudCurrencyCapsule',
    createControl: ({ assets }) => createHudCurrencyControl({ assets, state }),
  });
  const capsule = surface.control.capsule;
  return {
    ...surface,
    controls: [
      selectControl('resource', 'Resource', () => state.resource, (value) => {
        state.resource = value;
        capsule.setResource(value);
      }, ['coin', 'mana', 'crystal', 'ruby', 'emerald']),
      textControl('amount', 'Amount', () => state.amount, (value) => {
        state.amount = String(value);
        capsule.setAmount(state.amount);
      }),
    ],
  };
}

async function mountBottomRoomTabs(context, fixture) {
  const state = {
    currentPageId: fixture.currentPageId,
    guildTabId: fixture.guildTabId ?? 'hall',
    prestigeTabId: fixture.prestigeTabId ?? 'main',
    hudMode: fixture.hudMode ?? 'rooms',
    lockedPageId: fixture.lockedPageId ?? '',
    notifiedPageId: fixture.notifiedPageId ?? '',
  };
  let view = null;
  const surface = await createUiEditorPixiSurface({
    assetFilter: bottomPanelAssetFilter,
    component: 'PixiBottomPanelView',
    createControl: ({ assets, input, projection }) => {
      view = new PixiBottomPanelView({
        assets,
        inputRouter: input,
        reducedMotion: true,
      });
      view.layout(projection);
      view.bind(bottomPanelModel());
      view.activate();
      return {
        atomicComponents: createBottomRoomTabsHierarchy(view),
        destroy: () => view.destroy(),
        layout: (nextProjection) => view.layout(nextProjection),
        root: view.root,
      };
    },
    layout: 'fill',
  });
  const refresh = () => {
    view.bind(bottomPanelModel());
    context.invalidate();
  };
  return {
    ...surface,
    controls: [
      selectControl('page', 'Selected room', () => state.currentPageId, (value) => {
        state.currentPageId = value;
        refresh();
      }, ['brewing', 'garden', 'workshop', 'research', 'shop', 'guild', 'prestige']),
      selectControl('hud-mode', 'HUD mode', () => state.hudMode, (value) => {
        state.hudMode = value;
        state.currentPageId = ['guild', 'prestige'].includes(value)
          ? value
          : 'workshop';
        refresh();
      }, ['rooms', 'guild', 'prestige']),
      checkboxControl('garden-lock', 'Lock Garden', () => state.lockedPageId === 'garden', (value) => {
        state.lockedPageId = value ? 'garden' : '';
        refresh();
      }),
      checkboxControl('market-dot', 'Notify Market', () => state.notifiedPageId === 'shop', (value) => {
        state.notifiedPageId = value ? 'shop' : '';
        refresh();
      }),
    ],
  };

  function bottomPanelModel() {
    const ids = ['brewing', 'garden', 'workshop', 'research', 'shop'];
    return {
      actions: {
        showPage: (pageId) => {
          state.currentPageId = pageId;
          context.emit('roomSelected', { pageId });
          refresh();
          return true;
        },
        selectGuildTab: (tabId) => {
          state.guildTabId = tabId;
          context.emit('guildTabSelected', { tabId });
          refresh();
          return true;
        },
        selectPrestigeTab: (tabId) => {
          state.prestigeTabId = tabId;
          context.emit('prestigeTabSelected', { tabId });
          refresh();
          return true;
        },
      },
      currentPageId: state.currentPageId,
      guildHud: {
        notifications: {},
        selectedTabId: state.guildTabId,
      },
      prestigeHud: {
        notifications: {},
        selectedTabId: state.prestigeTabId,
      },
      hudMode: state.hudMode,
      notifications: state.notifiedPageId
        ? { [state.notifiedPageId]: { active: true, tone: 'red' } }
        : {},
      pages: ids.map((id) => ({
        id,
        unlocked: id !== state.lockedPageId,
        visible: true,
      })),
      reveal: { rooms: true },
    };
  }
}

async function mountBottomHudTextTab(context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    assetFilter: bottomPanelAssetFilter,
    component: 'PixiBottomHudTextTab',
    createControl: ({ assets, input }) => createBottomHudTextTabControl({
      assets,
      fixture: state,
      input,
      onActivate: () => context.emit('guildTabSelected', {
        tabId: state.guildTabId,
      }),
    }),
  });
  const tab = surface.control.tab;
  const refresh = () => {
    bindBottomRoomTab(tab, state);
    context.invalidate();
  };
  return {
    ...surface,
    controls: [
      checkboxControl('selected', 'Selected', () => state.selected === true, (value) => {
        state.selected = value;
        refresh();
      }),
      checkboxControl('notification', 'Notification', () => state.notification === true, (value) => {
        state.notification = value;
        refresh();
      }),
    ],
  };
}

async function mountBottomRoomTab(context, fixture) {
  const state = { ...fixture };
  const surface = await createUiEditorPixiSurface({
    assetFilter: bottomPanelAssetFilter,
    component: 'PixiBottomRoomTab',
    createControl: ({ assets, input }) => createBottomRoomTabControl({
      assets,
      fixture: state,
      input,
      onActivate: () => context.emit('roomSelected', { pageId: state.pageId }),
    }),
  });
  const tab = surface.control.tab;
  const refresh = () => {
    bindBottomRoomTab(tab, state);
    context.invalidate();
  };

  return {
    ...surface,
    controls: [
      checkboxControl('selected', 'Selected', () => state.selected === true, (value) => {
        state.selected = value;
        refresh();
      }),
      checkboxControl('locked', 'Locked', () => state.unlocked === false, (value) => {
        state.unlocked = !value;
        refresh();
      }),
      checkboxControl('notification', 'Notification', () => state.notification === true, (value) => {
        state.notification = value;
        refresh();
      }),
    ],
  };
}

function createBottomRoomTabControl({
  assets,
  fixture,
  input,
  onActivate = () => true,
}) {
  const root = new Container();
  const notificationLayer = new Container();
  const tab = new PixiBottomRoomTab({
    assets,
    definition: getBottomRoomTabDefinition(fixture.pageId),
    inputRouter: input,
    notificationLayer,
    onActivate,
  });
  tab.setWidth(78);
  tab.setLayoutX(0);
  bindBottomRoomTab(tab, fixture);
  root.addChild(tab.root, notificationLayer);
  return {
    atomicComponents: createBottomRoomTabAtoms(tab),
    destroy: () => {
      tab.destroy();
      root.destroy({ children: true });
    },
    height: 82,
    root,
    tab,
    width: 78,
  };
}

function createBottomHudTextTabControl({
  assets,
  fixture,
  input,
  onActivate = () => true,
}) {
  const root = new Container();
  const notificationLayer = new Container();
  const definition = PIXI_GUILD_HUD_TABS.find(
    ({ guildTabId }) => guildTabId === fixture.guildTabId,
  ) ?? PIXI_GUILD_HUD_TABS.find(({ guildTabId }) => guildTabId === 'hall');
  const textDefinition = {
    ...definition,
    icon: undefined,
  };
  const tab = new PixiBottomHudTextTab({
    assets,
    definition: textDefinition,
    inputRouter: input,
    notificationLayer,
    onActivate,
  });
  tab.setWidth(78);
  tab.setLayoutX(0);
  bindBottomRoomTab(tab, fixture);
  root.addChild(tab.root, notificationLayer);
  return {
    atomicComponents: createBottomRoomTabAtoms(tab),
    destroy: () => {
      tab.destroy();
      root.destroy({ children: true });
    },
    height: 82,
    root,
    tab,
    width: 78,
  };
}

function bindBottomRoomTab(tab, state) {
  tab.bind({
    id: tab.definition.id,
    notification: state.notification
      ? { active: true, tone: 'red' }
      : undefined,
    selected: state.selected === true,
    unlocked: state.unlocked !== false,
    visible: true,
  });
}

function createBottomRoomTabsHierarchy(view) {
  const tabs = view.allTabs ?? [
    ...(view.tabs ?? []),
    ...(view.guildTabs ?? []),
  ];
  return tabs
    .filter((tab) => tab.root.visible !== false)
    .map((tab) => createUiEditorPixiHierarchyComponent({
      displayObjects: [tab.root, tab.notification.root],
      id: `bottom-room-tab:${tab.definition.id}`,
      label: `${tab.definition.label} tab`,
      libraryEntryId: tab instanceof PixiBottomHudTextTab
        ? 'compound.bottom-hud-text-tab'
        : 'compound.bottom-room-tab',
      primary: tab.root,
      type: 'widget',
    }));
}

function createBottomRoomTabAtoms(tab) {
  return [
    createUiEditorPixiHierarchyComponent({
      displayObjects: [tab.frame],
      id: 'bottom-room-tab:frame',
      label: 'Frame',
      primary: tab.frame,
      type: 'image',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [tab.iconFrame],
      id: 'bottom-room-tab:icon',
      label: 'Room icon',
      primary: tab.iconFrame,
      type: 'image',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [tab.labelRoot],
      id: 'bottom-room-tab:label',
      label: 'Room label',
      primary: tab.labelRoot,
      textTarget: tab.text,
      type: 'text',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [tab.lock],
      id: 'bottom-room-tab:lock',
      label: 'Lock',
      primary: tab.lock,
      type: 'image',
    }),
    createUiEditorPixiHierarchyComponent({
      displayObjects: [tab.notification.root],
      id: 'bottom-room-tab:notification',
      label: 'Notification',
      primary: tab.notification.root,
      type: 'image',
    }),
  ];
}

function getBottomRoomTabDefinition(pageId) {
  return PIXI_BOTTOM_PANEL_TABS.find(({ id }) => id === pageId)
    ?? PIXI_BOTTOM_PANEL_TABS.find(({ id }) => id === 'workshop');
}

function createBottomRoomTabThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: bottomPanelAssetFilter,
    component: 'PixiBottomRoomTab',
    createControl: ({ assets, input }) => createBottomRoomTabControl({
      assets,
      fixture: { pageId: 'workshop', selected: true },
      input,
    }),
    id: 'compound.bottom-room-tab',
  });
}

function createBottomHudTextTabThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: bottomPanelAssetFilter,
    component: 'PixiBottomHudTextTab',
    createControl: ({ assets, input }) => createBottomHudTextTabControl({
      assets,
      fixture: { guildTabId: 'hall', selected: true },
      input,
    }),
    id: 'compound.bottom-hud-text-tab',
  });
}

function createSettingsToggleThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: settingsAssetFilter,
    component: 'RootRunSettingsTogglePixi',
    createControl: ({ assets }) => createSettingsToggleControl({
      assets,
      input: null,
      model: { enabled: true, onChange: () => true, value: true },
    }),
    id: 'primitive.settings-toggle',
  });
}

function createRetainedPanelThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: panelAssetFilter,
    component: 'RetainedPanel',
    createControl: ({ assets }) => createRetainedPanelControl({
      assets,
      fixture: { label: 'Inventory', strong: false },
    }),
    id: 'primitive.retained-panel',
  });
}

function createDevicePreferenceRowThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: settingsAssetFilter,
    component: 'RootRunDevicePreferenceRow',
    createControl: ({ assets }) => createDevicePreferenceRowControl({
      assets,
      fixture: { controlKind: 'slider', enabled: true, key: 'sfx', text: 'SOUND', value: 64 },
      input: null,
    }),
    id: 'compound.device-preference-row',
  });
}

function createDeviceIdentityFooterThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: settingsAssetFilter,
    component: 'DeviceIdentityFooter',
    createControl: ({ assets }) => createDeviceIdentityFooterControl({
      assets,
      fixture: { userId: 'c83af094129c4bbfa6e2b44c2e943acd', version: '0.12.0' },
      input: null,
    }),
    id: 'compound.device-identity-footer',
  });
}

function createTextFieldThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: textFieldAssetFilter,
    component: 'PixiTextField',
    createControl: ({ assets }) => {
      const field = new PixiTextField({
        assetManager: assets,
        height: 30,
        placeholder: 'Enter message',
        width: 180,
      });
      return {
        destroy: () => field.destroy({ children: true }),
        height: 30,
        root: field,
        width: 180,
      };
    },
    id: 'primitive.text-field',
  });
}

function createTextLabelThumbnail() {
  return createUiEditorPixiThumbnail({
    component: 'PixiTextLabel',
    createControl: () => createTextLabelControl({ text: 'Mana restored' }),
    id: 'primitive.text-label',
  });
}

function createInlineTextThumbnail() {
  return createUiEditorPixiThumbnail({
    component: 'PixiInlineText',
    createControl: ({ assets }) => {
      const inline = new PixiInlineText({
        runs: createInlineRuns(assets, 'Collect 25'),
        style: inlineTextStyle(),
        wrapWidth: 150,
      });
      return {
        destroy: () => inline.destroy({ children: true }),
        height: Math.max(18, inline.layoutHeight),
        root: inline,
        width: 150,
      };
    },
    id: 'primitive.inline-text',
  });
}

function createDevicePreferencesThumbnail() {
  const state = { haptics: true, music: 72, sound: 58, theme: false };
  return createUiEditorPixiThumbnail({
    assetFilter: settingsAssetFilter,
    component: 'RootRunDevicePreferencesPanel',
    createControl: ({ assets }) => createDevicePreferencesControl({
      assets,
      input: null,
      onChange: () => true,
      state,
    }),
    id: 'compound.device-preferences',
  });
}

function createHudCurrencyThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: hudAssetFilter,
    component: 'RootRunHudCurrencyCapsule',
    createControl: ({ assets }) => createHudCurrencyControl({
      assets,
      state: { amount: '12.4K', resource: 'coin' },
    }),
    id: 'compound.hud-currency-capsule',
  });
}

function createBottomRoomTabsThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: bottomPanelAssetFilter,
    component: 'PixiBottomPanelView',
    createControl: ({ assets }) => {
      const view = new PixiBottomPanelView({ assets, reducedMotion: true });
      view.layout({ sourceHeight: 844, sourceWidth: 390 });
      view.bind({
        currentPageId: 'workshop',
        notifications: {},
        pages: ['brewing', 'garden', 'workshop', 'research', 'shop'].map((id) => ({ id, unlocked: true, visible: true })),
        reveal: { rooms: true },
      });
      view.activate();
      return {
        destroy: () => view.destroy(),
        height: 844,
        root: view.root,
        width: 390,
      };
    },
    id: 'compound.bottom-room-tabs',
  });
}

function createResourceLabelThumbnail() {
  return createUiEditorPixiThumbnail({
    component: 'PixiResourceLabel',
    createControl: ({ assets }) => {
      const label = new PixiResourceLabel({
        amount: '12,450',
        assetManager: assets,
        includeResourceName: false,
        resource: 'coin',
      });
      return {
        destroy: () => label.destroy({ children: true }),
        height: 18,
        root: label,
        width: 90,
      };
    },
    id: 'primitive.resource-label',
  });
}

function createStarLevelThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: starAssetFilter,
    component: 'PixiStarLevelLabel',
    createControl: ({ assets }) => createStarLevelControl({ assets, level: 2, slotCount: 3 }),
    id: 'primitive.star-level-label',
  });
}

function createScrollAreaThumbnail() {
  return createUiEditorPixiThumbnail({
    component: 'RetainedScrollArea',
    createControl: () => createScrollAreaControl({ input: null, rowCount: 8, width: 180, height: 44 }),
    id: 'primitive.managed-scroll-area',
  });
}

function createHudLevelThumbnail() {
  return createUiEditorPixiThumbnail({
    assetFilter: hudAssetFilter,
    component: 'RootRunHudLevelRail',
    createControl: ({ assets }) => createHudLevelControl({
      assets,
      state: { completed: 1, level: 7, questVisible: true, ratio: 0.42, total: 4 },
    }),
    id: 'compound.hud-level-rail',
  });
}

function createSettingsToggleControl({ assets, input, model }) {
  const toggle = new RootRunSettingsTogglePixi({
    assetManager: assets,
    inputRouter: input,
  });
  toggle.bind(model);
  toggle.setBounds(0, 0);
  return {
    destroy: () => toggle.destroy({ children: true }),
    height: toggle.controlHeight,
    root: toggle,
    toggle,
    width: toggle.controlWidth,
  };
}

function createTextLabelControl(fixture) {
  const label = new PixiTextLabel({
    fontSize: 13,
    stroke: fixture.outlined ? 'outlined' : null,
    text: fixture.text,
    wordWrap: Boolean(fixture.wrapWidth),
    wrapWidth: fixture.wrapWidth ?? 0,
  });
  return {
    destroy: () => label.destroy({ children: true }),
    height: Math.max(18, label.measuredHeight),
    label,
    root: label,
    width: fixture.wrapWidth ?? Math.max(1, label.measuredWidth),
  };
}

function createStarLevelControl({ assets, level, slotCount }) {
  const label = new PixiStarLevelLabel({
    assetManager: assets,
    level,
    size: 20,
    slotCount,
  });
  return {
    destroy: () => label.destroy({ children: true }),
    height: 20,
    label,
    root: label,
    width: label.measuredWidth,
  };
}

function createScrollAreaControl({ input, rowCount, width = 250, height = 180 }) {
  const scroll = new RetainedScrollArea({
    inputRouter: input,
    label: 'uiLabManagedScroll',
  });
  const rowHeight = 28;
  for (let index = 0; index < rowCount; index += 1) {
    const label = new PixiTextLabel({ text: `${index + 1}. Inventory row` });
    label.position.set(8, index * rowHeight + 5);
    scroll.content.addChild(label);
  }
  scroll.setBounds(0, 0, width, height);
  scroll.setContentHeight(rowCount * rowHeight);
  return {
    destroy: () => scroll.destroy(),
    height,
    root: scroll.root,
    scroll,
    width: width + 10,
  };
}

function createDevicePreferencesControl({ assets, input, state, onChange }) {
  const definitions = [
    ['sound', 'SOUND', PIXI_ROOT_RUN_ASSETS.settingsSound, null, 'slider'],
    ['music', 'MUSIC', PIXI_ROOT_RUN_ASSETS.settingsMusic, null, 'slider'],
    ['haptics', 'VIBRATION', PIXI_ROOT_RUN_ASSETS.settingsVibration, null, 'toggle'],
    ['theme', 'THEME', PIXI_ROOT_RUN_ASSETS.settingsThemeNight, PIXI_ROOT_RUN_ASSETS.settingsThemeDay, 'toggle'],
  ];
  const rows = definitions.map(([key, text, iconAssetId, onIconAssetId, controlKind]) =>
    new RootRunDevicePreferenceRow({
      assetManager: assets,
      controlKind,
      iconAssetId,
      inputRouter: input,
      onIconAssetId,
      preferenceKey: key,
      text,
    }),
  );
  const panel = new RootRunDevicePreferencesPanel({
    assetManager: assets,
    width: 264,
  });
  panel.setRows(rows);
  panel.bindRows = (values, handler) => {
    rows.forEach((row, index) => {
      const key = definitions[index][0];
      row.bind({
        enabled: true,
        onChange: (value) => handler(key, value),
        value: values[key],
      });
    });
  };
  panel.bindRows(state, onChange);
  return {
    bindRows: panel.bindRows,
    destroy: () => panel.destroy({ children: true }),
    height: panel.panelHeight,
    panel,
    root: panel,
    width: 264,
  };
}

function createRetainedPanelControl({ assets, fixture }) {
  const panel = new RetainedPanel({
    assetManager: assets,
    label: fixture.label,
    panelLabel: 'uiLabRetainedPanel',
    strong: fixture.strong,
  });
  panel.setBounds(0, 0, 250, 74);
  panel.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  const body = new PixiTextLabel({ text: 'Shared production panel content' });
  body.position.set(10, 28);
  panel.body.addChild(body);
  return {
    destroy: () => panel.destroy(),
    height: 86,
    panel,
    root: panel.root,
    width: 250,
  };
}

function createDevicePreferenceRowControl({ assets, fixture, input, onChange = () => true }) {
  const iconDefinition = resolvePreferenceIconDefinition(fixture.key);
  const row = new RootRunDevicePreferenceRow({
    assetManager: assets,
    controlKind: fixture.controlKind,
    iconAssetId: iconDefinition.off,
    inputRouter: input,
    onIconAssetId: iconDefinition.on,
    preferenceKey: fixture.key,
    text: fixture.text,
  });
  row.setBounds(0, 0, 244);
  row.bind({ enabled: fixture.enabled, onChange, value: fixture.value });
  return {
    destroy: () => row.destroy({ children: true }),
    height: ROOT_RUN_DEVICE_PREFERENCE_ROW_HEIGHT,
    root: row,
    row,
    width: 244,
  };
}

function createDeviceIdentityFooterControl({ assets, fixture, input, onCopy = () => true }) {
  const footer = new DeviceIdentityFooter({
    assetManager: assets,
    inputRouter: input,
    width: 264,
  });
  footer.bind({ ...fixture, onCopy });
  return {
    destroy: () => footer.destroy({ children: true }),
    footer,
    height: footer.footerHeight,
    root: footer,
    width: 264,
  };
}

function resolvePreferenceIconDefinition(key) {
  if (key === 'theme') {
    return {
      off: PIXI_ROOT_RUN_ASSETS.settingsThemeNight,
      on: PIXI_ROOT_RUN_ASSETS.settingsThemeDay,
    };
  }
  return {
    off: key === 'music'
      ? PIXI_ROOT_RUN_ASSETS.settingsMusic
      : key === 'haptics'
        ? PIXI_ROOT_RUN_ASSETS.settingsVibration
        : PIXI_ROOT_RUN_ASSETS.settingsSound,
    on: null,
  };
}

function createHudLevelControl({ assets, state }) {
  const wrapper = new Container({ label: 'uiLabHudLevelRail' });
  const rail = new RootRunHudLevelRail({ assets });
  rail.setLevel(state.level);
  rail.setQuestVisible(state.questVisible);
  rail.renderProgress(state);
  rail.scale.set(1 / HUD_SOURCE_SCALE);
  wrapper.addChild(rail);
  return {
    destroy: () => wrapper.destroy({ children: true }),
    height: 93 / HUD_SOURCE_SCALE,
    rail,
    root: wrapper,
    width: 662 / HUD_SOURCE_SCALE,
  };
}

function createHudCurrencyControl({ assets, state }) {
  const wrapper = new Container({ label: 'uiLabHudCurrencyCapsule' });
  const capsule = new RootRunHudCurrencyCapsule({
    amount: state.amount,
    assets,
    resource: state.resource,
  });
  capsule.scale.set(1 / HUD_SOURCE_SCALE);
  wrapper.addChild(capsule);
  return {
    capsule,
    destroy: () => wrapper.destroy({ children: true }),
    height: 66 / HUD_SOURCE_SCALE,
    root: wrapper,
    width: 208 / HUD_SOURCE_SCALE,
  };
}

function createInlineRuns(assets, text, existingTexture = null) {
  const texture = existingTexture ?? assets?.getAtlasTexture?.('resource:coin');
  return [
    { kind: 'text', text: `${text} ` },
    {
      fallbackText: 'coin',
      kind: 'icon',
      offsetY: -1,
      size: 14,
      texture,
    },
  ];
}

function inlineTextStyle() {
  return {
    fill: '#d4d4d4',
    fontFamily: '"Lilita One", "Arial Black", Arial, sans-serif',
    fontSize: 13,
    lineHeight: 16,
  };
}

function settingsAssetFilter({ id }) {
  return id.includes('/ui/root-run-settings/');
}

function panelAssetFilter({ id }) {
  return String(id ?? '').includes('/ui/inner-section-panel-');
}

function textFieldAssetFilter({ id }) {
  return id === PIXI_ROOT_RUN_ASSETS.textFieldBrownInset
    || id === PIXI_ROOT_RUN_ASSETS.textFieldCleanInset;
}

function starAssetFilter({ id }) {
  return id.includes('/ui/stars/');
}

function hudAssetFilter({ id }) {
  return id.includes('/ui/root-run-top-hud/')
    || id.includes('/ui/white-squircle/')
    || id.endsWith('ui/root-run-level-star.png');
}

function bottomPanelAssetFilter({ id }) {
  return id.includes('/ui/') || id.includes('/icons/');
}

function checkboxControl(id, label, getValue, setValue) {
  return { getValue, id, label, setValue, type: 'checkbox' };
}

function textControl(id, label, getValue, setValue) {
  return { getValue, id, label, setValue, type: 'text' };
}

function rangeControl(id, label, min, max, step, getValue, setValue, formatValue) {
  return { formatValue, getValue, id, label, max, min, setValue, step, type: 'range' };
}

function selectControl(id, label, getValue, setValue, options) {
  return { getValue, id, label, options, setValue, type: 'select' };
}

function formatPercent(value) {
  return `${Math.round(Number(value) * 100)}%`;
}
