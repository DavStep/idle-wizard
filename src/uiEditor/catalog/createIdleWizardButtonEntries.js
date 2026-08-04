import {
  createUiEditorPixiButtonPreview,
  createUiEditorPixiButtonThumbnail,
} from '../widgets/UiEditorPixiButtonPreview.js';
import {
  PIXI_ROOT_RUN_ASSETS,
} from '../../rendering/pixi/theme/PixiThemeTokens.js';
import {
  validateNineSliceCompatibility,
} from '../../rendering/pixi/nineSlice/NineSliceCompatibility.js';
import {
  getPixiButtonSkin,
} from '../../rendering/pixi/primitives/PixiButtonStyle.js';

const FIXED_BUTTON_FONT = 'Lilita One';
const THEME_BUTTON_FONT = 'Theme font (Lilita One by default)';
const NO_PROPERTY_VALUE = 'None';

const BUTTON_USAGES = Object.freeze({
  'base-button': usageSet(
    [
      'Settings feedback category controls',
      'src/rendering/pixi/global/dialogs/PixiSettingsDialog.js',
    ],
    [
      'Shared retained page actions',
      'src/rendering/pixi/pages/workshop/RetainedPageKit.js',
    ],
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
    [
      'Market cancel and remove actions',
      'src/rendering/pixi/pages/shop/createShop.js',
    ],
    [
      'Destructive confirmation actions',
      'src/rendering/pixi/global/dialogs/PixiMessageDialogs.js',
    ],
    [
      'Unselected dialog footer tabs',
      'src/rendering/pixi/primitives/PixiButton.js',
    ],
    [
      'Unselected shop item actions',
      'src/rendering/pixi/pages/shop/ShopDialogPixi.js',
    ],
    [
      'Selected dialog footer tabs',
      'src/rendering/pixi/primitives/PixiButton.js',
    ],
    [
      'Elara Help toggle',
      'src/rendering/pixi/global/tutorial/TutorialPixiOverlay.js',
    ],
    [
      'Unavailable state for every retained button color',
      'src/rendering/pixi/primitives/PixiButton.js',
    ],
  ),
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
  'cost-button': usageSet(
    [
      'Brewing purchase action',
      'src/rendering/pixi/pages/brewing/BrewingPixiPage.js',
    ],
    [
      'Workshop dialog purchase action',
      'src/rendering/pixi/pages/workshop/WorkshopDialogPixi.js',
    ],
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
  buttonWidget('base-button', 'Base / Text Button', {
    color: 'yellow',
    sizeTier: 50,
    type: 'button',
    text: 'Continue',
    variant: 'regular',
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
  buttonWidget('cost-button', 'Cost Button', {
    amountLabel: '25 Coin',
    actionLabel: 'Unlock',
    color: 'green',
    showLabel: false,
    sizeTier: 50,
    type: 'cost',
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
    ['inline', 'border-label'].includes(preview.variant)
  ) {
    return THEME_BUTTON_FONT;
  }

  if (preview.type === 'button' && preview.variant === 'regular' && !preview.color) {
    return THEME_BUTTON_FONT;
  }

  return FIXED_BUTTON_FONT;
}

function resolveButtonBackgroundAsset(preview) {
  if (preview.type === 'cost') {
    return configuredButtonNineSlice(preview.color ?? 'green', preview);
  }

  if (preview.type === 'info') {
    return asset(PIXI_ROOT_RUN_ASSETS.info, 'Icon');
  }
  if (preview.type === 'hud-settings') {
    return nineSliceAsset({
      borderInsets: divideInsets(41, 3),
      height: 122 / 3,
      id: PIXI_ROOT_RUN_ASSETS.topHudSettings,
      sourceInsets: uniformInsets(41),
      width: 122 / 3,
    });
  }
  if (preview.type === 'hud-avatar') {
    return asset(PIXI_ROOT_RUN_ASSETS.topHudAvatarHead);
  }

  if (preview.enabled === false) {
    return configuredButtonNineSlice('gray', preview);
  }

  switch (preview.variant) {
    case 'regular':
      return configuredButtonNineSlice(preview.color ?? 'brown', preview);
    case 'yellow':
      return configuredButtonNineSlice(preview.color ?? 'yellow', preview);
    case 'green':
      return configuredButtonNineSlice(preview.color ?? 'green', preview);
    case 'red':
      return configuredButtonNineSlice(preview.color ?? 'red', preview);
    case 'blue':
    case 'purple':
    case 'gray':
    case 'brown':
    case 'brown-dark':
    case 'brown-light':
      return configuredButtonNineSlice(
        preview.color ?? preview.variant,
        preview,
      );
    case 'tab':
      return configuredButtonNineSlice(
        preview.selected ? 'brown-light' : 'brown-dark',
        preview,
        { compactTab: true },
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

function configuredButtonNineSlice(color, preview, { compactTab = false } = {}) {
  const skin = getPixiButtonSkin({
    color,
    compactTab,
    sizeTier: preview.sizeTier,
  });

  return nineSliceAsset({
    borderInsets: skin.borderInsets,
    height: preview.height ?? 36,
    id: skin.assetId,
    minimumCenter: skin.minimumCenter,
    sourceInsets: skin.sourceInsets,
    width: preview.width ?? 100,
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
