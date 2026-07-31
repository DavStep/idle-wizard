import {
  createUiEditorPixiButtonPreview,
  createUiEditorPixiButtonThumbnail,
} from '../widgets/UiEditorPixiButtonPreview.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../rendering/pixi/theme/PixiThemeTokens.js';
import {
  validateNineSliceCompatibility,
} from '../../rendering/pixi/nineSlice/NineSliceCompatibility.js';

const FIXED_BUTTON_FONT = 'Lilita One';
const THEME_BUTTON_FONT = 'Theme font (Lilita One by default)';
const NO_PROPERTY_VALUE = 'None';

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
      'Account Save action',
      'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
    ],
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
  return IDLE_WIZARD_BUTTON_WIDGETS.map((definition) => {
    const minimumSize = resolveDefinitionMinimumSize(definition);
    const editorDefinition = Object.freeze({
      ...definition,
      minimumHeight: minimumSize.height,
      minimumWidth: minimumSize.width,
    });

    return {
      createPreview: () => createUiEditorPixiButtonPreview(editorDefinition),
      createThumbnail: () =>
        createUiEditorPixiButtonThumbnail(editorDefinition),
      id: definition.id,
      kind: 'widget',
      label: definition.label,
      assets: definition.assets,
      minimumSize,
      properties: createButtonProperties(definition.preview),
      sectionId: 'buttons',
      usages: BUTTON_USAGES[definition.id] ?? [],
    };
  });
}

export function validateIdleWizardButtonNineSliceRegistrations() {
  return IDLE_WIZARD_BUTTON_WIDGETS.flatMap((definition) => {
    const minimumSize = resolveDefinitionMinimumSize(definition);

    return definition.assets
      .filter(({ nineSlice }) => nineSlice)
      .map((asset) =>
        validateNineSliceCompatibility({
          assetId: asset.id,
          minimumCenter: asset.minimumCenter,
          outputInsets: asset.borderInsets,
          targetLabel: definition.label,
          targetSize: {
            width: asset.width ?? minimumSize.width,
            height: asset.height ?? minimumSize.height,
          },
        }),
      )
      .filter(({ compatible }) => !compatible);
  });
}

function createButtonProperties(preview) {
  const backgroundAsset =
    resolveButtonBackgroundAsset(preview)?.id ?? NO_PROPERTY_VALUE;

  return Object.freeze([
    Object.freeze({
      label: 'Font',
      value: resolveButtonFont(preview),
    }),
    Object.freeze({
      label: 'Background asset',
      monospace: backgroundAsset !== NO_PROPERTY_VALUE,
      value: backgroundAsset,
    }),
  ]);
}

function resolveButtonFont(preview) {
  if (['info', 'hud-settings', 'hud-avatar'].includes(preview.type)) {
    return NO_PROPERTY_VALUE;
  }

  if (
    preview.type === 'button' &&
    ['regular', 'inline', 'border-label'].includes(preview.variant)
  ) {
    return THEME_BUTTON_FONT;
  }

  return FIXED_BUTTON_FONT;
}

function resolveButtonBackgroundAsset(preview) {
  if (preview.type === 'cost') {
    return standardButtonNineSlice(
      PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice,
      preview,
    );
  }

  if (preview.type === 'info') {
    return asset(PIXI_ROOT_RUN_ASSETS.info, 'Icon');
  }
  if (preview.type === 'hud-settings') {
    return nineSliceAsset({
      borderInsets: divideInsets(46, 3),
      height: 122 / 3,
      id: PIXI_ROOT_RUN_ASSETS.topHudSettings,
      sourceInsets: uniformInsets(46),
      width: 122 / 3,
    });
  }
  if (preview.type === 'hud-avatar') {
    return asset(PIXI_ROOT_RUN_ASSETS.topHudAvatarHead);
  }

  if (preview.enabled === false) {
    return standardButtonNineSlice(
      PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
      preview,
    );
  }

  switch (preview.variant) {
    case 'regular':
      return nineSliceAsset({
        borderInsets: DEFAULT_PIXI_THEME_SNAPSHOT.frames.controlBorder,
        height: preview.height ?? 36,
        id: DEFAULT_PIXI_THEME_SNAPSHOT.frames.control,
        sourceInsets:
          DEFAULT_PIXI_THEME_SNAPSHOT.frames.controlSourceInsets,
        width: preview.width ?? 100,
      });
    case 'yellow':
      return standardButtonNineSlice(
        PIXI_ROOT_RUN_ASSETS.buttonYellow,
        preview,
      );
    case 'green':
      return standardButtonNineSlice(
        PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice,
        preview,
      );
    case 'red':
      return standardButtonNineSlice(
        PIXI_ROOT_RUN_ASSETS.buttonRedNineSlice,
        preview,
      );
    case 'brown-dark':
      return standardButtonNineSlice(
        PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
        preview,
      );
    case 'brown-light':
      return standardButtonNineSlice(
        PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
        preview,
      );
    case 'tab':
      return compactTabNineSlice(
        preview.selected
          ? PIXI_ROOT_RUN_ASSETS.buttonTabActive
          : PIXI_ROOT_RUN_ASSETS.buttonTabInactive,
        preview,
      );
    default:
      return null;
  }
}

function createButtonAssets(preview) {
  if (preview.type === 'hud-settings') {
    return assetSet(
      resolveButtonBackgroundAsset(preview),
      asset(PIXI_ROOT_RUN_ASSETS.settingsGear, 'Icon'),
    );
  }

  if (preview.type === 'hud-avatar') {
    return assetSet(
      nineSliceAsset({
        borderInsets: divideInsets(
          { top: 54, right: 55, bottom: 55, left: 54 },
          3,
        ),
        height: 186 / 3,
        id: PIXI_ROOT_RUN_ASSETS.topHudAvatarFrame,
        role: 'Frame',
        sourceInsets: {
          top: 54,
          right: 55,
          bottom: 55,
          left: 54,
        },
        width: 186 / 3,
      }),
      resolveButtonBackgroundAsset(preview),
      asset('source:assets/avatars/elara.png', 'Portrait'),
    );
  }

  const background = resolveButtonBackgroundAsset(preview);

  if (preview.type === 'cost') {
    return assetSet(
      background,
      asset(PIXI_ROOT_RUN_ASSETS.coin, 'Resource icon'),
    );
  }

  return assetSet(background);
}

function standardButtonNineSlice(id, preview) {
  const geometry = preview.compact
    ? PIXI_ROOT_RUN_GEOMETRY.compactButton
    : PIXI_ROOT_RUN_GEOMETRY.button;

  return nineSliceAsset({
    borderInsets: geometry.borderInsets,
    height: preview.height ?? 36,
    id,
    sourceInsets: geometry.sourceInsets,
    width: preview.width ?? 100,
  });
}

function compactTabNineSlice(id, preview) {
  return nineSliceAsset({
    borderInsets: PIXI_ROOT_RUN_GEOMETRY.tabButton.borderInsets,
    height: preview.height ?? 28,
    id,
    sourceInsets: PIXI_ROOT_RUN_GEOMETRY.tabButton.sourceInsets,
    width: preview.width ?? 92,
  });
}

function asset(id, role = 'Background') {
  return Object.freeze({ id, role });
}

function nineSliceAsset({
  borderInsets,
  height,
  id,
  minimumCenter,
  role = 'Background',
  sourceInsets,
  width,
}) {
  return Object.freeze({
    borderInsets,
    height,
    id,
    minimumCenter,
    nineSlice: true,
    role,
    sourceInsets,
    width,
  });
}

function assetSet(...assets) {
  return Object.freeze(assets.filter(Boolean));
}

function uniformInsets(value) {
  return Object.freeze({
    top: value,
    right: value,
    bottom: value,
    left: value,
  });
}

function divideInsets(insets, divisor) {
  const source =
    typeof insets === 'number' ? uniformInsets(insets) : insets;

  return Object.freeze({
    top: source.top / divisor,
    right: source.right / divisor,
    bottom: source.bottom / divisor,
    left: source.left / divisor,
  });
}

function buttonWidget(id, label, preview) {
  const normalizedPreview = Object.freeze({ ...preview });

  return Object.freeze({
    assets: createButtonAssets(normalizedPreview),
    id,
    label,
    preview: normalizedPreview,
  });
}

function resolveDefinitionMinimumSize(definition) {
  const background = definition.assets.find(
    ({ nineSlice, role }) => nineSlice && role === 'Background',
  );

  return Object.freeze({
    width: Math.max(
      0,
      Number(definition.preview.minimumWidth)
      || Number(background?.width)
      || Number(definition.preview.width)
      || 0,
    ),
    height: Math.max(
      0,
      Number(definition.preview.minimumHeight)
      || Number(background?.height)
      || Number(definition.preview.height)
      || 0,
    ),
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
