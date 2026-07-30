import {
  createUiEditorPixiButtonPreview,
  createUiEditorPixiButtonThumbnail,
} from '../widgets/UiEditorPixiButtonPreview.js';

const BUTTON_USAGES = Object.freeze({
  'control-button': usageSet(
    [
      'Settings feedback category controls',
      'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
    ],
    [
      'Shared retained page actions',
      'src/rendering/pixi/pages/workshop/RetainedPageKit.js',
    ],
  ),
  'yellow-button': usageSet(
    [
      'First-run and tutorial advance actions',
      'src/rendering/pixi/global/intro/FirstRunIntroPixiView.js',
    ],
    [
      'Account connection and device copy actions',
      'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
    ],
    [
      'Garden Seeds action',
      'src/rendering/pixi/pages/garden/GardenPixiPage.js',
    ],
    [
      'Level pager and online gate actions',
      'src/rendering/pixi/global/dialogs/PixiLevelDialog.js',
    ],
  ),
  'green-button': usageSet(
    [
      'Inbox reward claim',
      'src/rendering/pixi/global/dialogs/PixiInboxDialog.js',
    ],
    [
      'Garden Harvest All action',
      'src/rendering/pixi/pages/garden/GardenPixiPage.js',
    ],
    [
      'Market offer and listing actions',
      'src/rendering/pixi/pages/shop/ShopPixiPage.js',
    ],
    [
      'Fresh-start confirmation',
      'src/rendering/pixi/global/gates/PixiFreshStartChoiceView.js',
    ],
  ),
  'red-button': usageSet(
    [
      'Market cancel and remove actions',
      'src/rendering/pixi/pages/shop/createShop.js',
    ],
    [
      'Destructive confirmation actions',
      'src/rendering/pixi/global/dialogs/PixiMessageDialogs.js',
    ],
  ),
  'brown-dark-button': usageSet(
    [
      'Unselected dialog footer tabs',
      'src/rendering/pixi/primitives/PixiButton.js',
    ],
    [
      'Unselected shop item actions',
      'src/rendering/pixi/pages/shop/ShopDialogPixi.js',
    ],
  ),
  'brown-light-button': usageSet(
    [
      'Selected dialog footer tabs',
      'src/rendering/pixi/primitives/PixiButton.js',
    ],
    [
      'Elara Help toggle',
      'src/rendering/pixi/global/tutorial/TutorialPixiOverlay.js',
    ],
  ),
  'disabled-button': usageSet([
    'Unavailable state for every retained button variant',
    'src/rendering/pixi/primitives/PixiButton.js',
  ]),
  'inline-button': usageSet(
    [
      'Brewing ingredient slots',
      'src/rendering/pixi/pages/brewing/BrewingHudPixi.js',
    ],
    [
      'Workshop dialog row actions',
      'src/rendering/pixi/pages/workshop/WorkshopDialogPixi.js',
    ],
  ),
  'border-label-button': usageSet([
    'Workshop request border actions',
    'src/rendering/pixi/pages/workshop/WorkshopPixiPage.js',
  ]),
  'popup-tab-button': popupTabUsages(),
  'popup-tab-selected-button': popupTabUsages(),
  'account-save-button': usageSet([
    'Settings account Save action',
    'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
  ]),
  'compact-cost-button': usageSet(
    [
      'Brewing purchase action',
      'src/rendering/pixi/pages/brewing/BrewingPixiPage.js',
    ],
    [
      'Workshop dialog purchase action',
      'src/rendering/pixi/pages/workshop/WorkshopDialogPixi.js',
    ],
  ),
  'stacked-cost-button': usageSet(
    [
      'Workshop Summon Seed action',
      'src/rendering/pixi/pages/workshop/WorkshopPixiPage.js',
    ],
    [
      'Garden plot purchase action',
      'src/rendering/pixi/pages/garden/GardenPixiPage.js',
    ],
    [
      'Brewing cauldron unlock action',
      'src/rendering/pixi/pages/brewing/BrewingHudPixi.js',
    ],
  ),
  'research-cost-button': usageSet(
    [
      'Research purchase and researched states',
      'src/rendering/pixi/pages/research/ResearchPixiPage.js',
    ],
    [
      'Prestige upgrade action',
      'src/rendering/pixi/pages/prestige/PrestigePixiPage.js',
    ],
  ),
  'info-button': usageSet(
    [
      'Workshop summon information',
      'src/rendering/pixi/pages/workshop/WorkshopPixiPage.js',
    ],
    [
      'Prestige upgrade help',
      'src/rendering/pixi/pages/prestige/PrestigePixiPage.js',
    ],
  ),
  'hud-settings-button': usageSet([
    'Top HUD Settings control',
    'src/rendering/pixi/global/chrome/PixiTopPanelView.js',
  ]),
  'hud-avatar-button': usageSet([
    'Top HUD avatar control',
    'src/rendering/pixi/global/chrome/PixiTopPanelView.js',
  ]),
});

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
    createThumbnail: () => createUiEditorPixiButtonThumbnail(definition),
    id: definition.id,
    kind: 'widget',
    label: definition.label,
    sectionId: 'buttons',
    usages: BUTTON_USAGES[definition.id] ?? [],
  }));
}

function buttonWidget(id, label, preview) {
  return Object.freeze({
    id,
    label,
    preview: Object.freeze({ ...preview }),
  });
}

function popupTabUsages() {
  return usageSet(
    [
      'Settings Avatar and Frame tabs',
      'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
    ],
    [
      'Research page tabs',
      'src/rendering/pixi/pages/research/ResearchPixiPage.js',
    ],
    [
      'Market and item picker tabs',
      'src/rendering/pixi/pages/shop/ShopDialogPixi.js',
    ],
    [
      'Guild dialog tabs',
      'src/rendering/pixi/pages/guild/GuildDialogPixi.js',
    ],
  );
}

function usageSet(...usages) {
  return Object.freeze(
    usages.map(([label, source]) => Object.freeze({ label, source })),
  );
}
