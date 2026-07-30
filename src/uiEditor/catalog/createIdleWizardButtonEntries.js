import { createUiEditorPixiButtonPreview } from '../widgets/UiEditorPixiButtonPreview.js';

export const IDLE_WIZARD_BUTTON_WIDGETS = Object.freeze([
  buttonWidget('control-button', 'Control Button', {
    type: 'button',
    text: 'Control',
    variant: 'regular',
  }),
  buttonWidget('yellow-button', 'Yellow Button', {
    type: 'button',
    text: 'Continue',
    variant: 'yellow',
  }),
  buttonWidget('green-button', 'Green Button', {
    type: 'button',
    text: 'Confirm',
    variant: 'green',
  }),
  buttonWidget('red-button', 'Red Button', {
    type: 'button',
    text: 'Cancel',
    variant: 'red',
  }),
  buttonWidget('brown-dark-button', 'Brown Dark Button', {
    type: 'button',
    text: 'Previous',
    variant: 'brown-dark',
  }),
  buttonWidget('brown-light-button', 'Brown Light Button', {
    type: 'button',
    text: 'Selected',
    variant: 'brown-light',
  }),
  buttonWidget('disabled-button', 'Disabled Button', {
    enabled: false,
    type: 'button',
    text: 'Unavailable',
    variant: 'green',
  }),
  buttonWidget('inline-button', 'Inline Button', {
    type: 'button',
    text: 'Open',
    variant: 'inline',
  }),
  buttonWidget('border-label-button', 'Border Label Button', {
    height: 24,
    type: 'button',
    text: 'Expand',
    variant: 'border-label',
    width: 78,
  }),
  buttonWidget('popup-tab-button', 'Popup Tab Button', {
    height: 28,
    type: 'button',
    text: 'Inventory',
    variant: 'tab',
    width: 92,
  }),
  buttonWidget('popup-tab-selected-button', 'Popup Tab Selected Button', {
    height: 28,
    selected: true,
    type: 'button',
    text: 'Inventory',
    variant: 'tab',
    width: 92,
  }),
  buttonWidget('account-tab-button', 'Account Tab Button', {
    height: 40,
    type: 'button',
    text: 'Account',
    variant: 'account-tab',
    width: 114,
  }),
  buttonWidget('account-tab-selected-button', 'Account Tab Selected Button', {
    height: 40,
    selected: true,
    type: 'button',
    text: 'Account',
    variant: 'account-tab',
    width: 114,
  }),
  buttonWidget('account-save-button', 'Account Save Button', {
    height: 52,
    type: 'button',
    text: 'Save',
    variant: 'account-save',
    width: 148,
  }),
  buttonWidget('cost-button', 'Cost Button', {
    amountLabel: '25 Coin',
    type: 'cost',
  }),
  buttonWidget('compact-cost-button', 'Compact Cost Button', {
    amountLabel: '5 Coin',
    compact: true,
    height: 28,
    type: 'cost',
    width: 100,
  }),
  buttonWidget('stacked-cost-button', 'Stacked Cost Button', {
    actionLabel: 'Unlock',
    amountLabel: '25 Coin',
    height: 52,
    stacked: true,
    type: 'cost',
    width: 92,
  }),
  buttonWidget('research-cost-button', 'Research Cost Button', {
    amountLabel: '120 Coin',
    height: 48,
    research: true,
    type: 'cost',
    width: 80,
  }),
  buttonWidget('info-button', 'Info Button', {
    size: 24,
    type: 'info',
  }),
  buttonWidget('hud-settings-button', 'HUD Settings Button', {
    type: 'hud-settings',
  }),
  buttonWidget('hud-avatar-button', 'HUD Avatar Button', {
    type: 'hud-avatar',
  }),
]);

export function createIdleWizardButtonEntries() {
  return IDLE_WIZARD_BUTTON_WIDGETS.map((definition) => ({
    createPreview: () => createUiEditorPixiButtonPreview(definition),
    id: definition.id,
    kind: 'widget',
    label: definition.label,
    sectionId: 'buttons',
  }));
}

function buttonWidget(id, label, preview) {
  return Object.freeze({
    id,
    label,
    preview: Object.freeze({ ...preview }),
  });
}
