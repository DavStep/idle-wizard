import {
  DEFAULT_PLAYER_COLOR_MODE,
  normalizePlayerColorMode,
} from '../../../player/playerColorModes.js';
import {
  DEFAULT_PLAYER_FONT,
  normalizePlayerFont,
} from '../../../player/playerFonts.js';
import {
  DEFAULT_PLAYER_ICON_MODE,
  normalizePlayerIconMode,
} from '../../../player/playerIconModes.js';
import {
  DEFAULT_PLAYER_PROGRESS_BAR,
  normalizePlayerProgressBar,
} from '../../../player/playerProgressBars.js';
import {
  DEFAULT_PLAYER_THEME,
  normalizePlayerTheme,
} from '../../../player/playerThemes.js';

export const PIXI_UI_GEOMETRY = Object.freeze({
  authoredWidth: 1080,
  authoredHeight: 2170,
  sourceScale: 3,
  sourceWidth: 360,
  sourceHeight: 2170 / 3,
  bodyFontSize: 13,
  dialogTitleFontSize: 14,
  borderLabelFontSize: 11,
  borderLabelLineHeight: 14,
  tinyFontSize: 10,
  tinyLineHeight: 12,
  ordinaryBorderWidth: 2,
  strongBorderWidth: 2,
  panelPaddingX: 10,
  panelPaddingY: 5,
  dialogPadding: 20,
  dialogScrollPaddingTop: 12,
  dialogTabGap: 8,
  rowMinHeight: 20,
  rowColumnGap: 6,
  roomChromeEdge: 16,
  roomContentEdge: 16,
  roomContentTop: 104,
  roomChatBottom: 101,
  roomChatHeight: 41,
  roomChatTitleOverhang: 12,
  roomChatGap: 8,
  progressRailBorderWidth: 1,
  progressHeight: 8,
  progressTotalHeight: 10,
  progressTopPanelHeight: 12,
  progressTopPanelTotalHeight: 14,
  progressKnobSize: 14,
  notificationSize: 9.569444,
  notificationOutset: 2,
  buttonWidth: 100,
  tabHeight: 28,
  dialogShadowX: 5,
  dialogShadowY: 5,
  dialogShadowBlur: 5,
});

export const PIXI_PROGRESS_VISUALS = Object.freeze({
  railBackground: '#000000',
  railBackgroundAlpha: 0.6,
  railBorder: '#000000',
  railInset: '#090705',
  railInsetAlpha: 0.64,
  knobFill: '#fee5c3',
  knobBorder: '#ceac82',
  knobRing: '#241b14',
  tones: Object.freeze({
    root: Object.freeze({
      fill: '#8740df',
      edge: '#bd72f3',
    }),
    blue: Object.freeze({
      fill: '#2d8fe6',
      edge: '#72c8ff',
    }),
    red: Object.freeze({
      fill: '#be403b',
      edge: '#e66a5d',
      text: '#912f2b',
    }),
    green: Object.freeze({
      fill: '#4aa83f',
      edge: '#8bdc69',
      text: '#256b25',
    }),
    yellow: Object.freeze({
      fill: '#d8ad32',
      edge: '#f6d86a',
      text: '#795909',
    }),
  }),
});

export const PIXI_ROOT_RUN_ASSETS = Object.freeze({
  buttonYellow: 'source:assets/ui/root-run-cost-button/yellow-button-9slice.png',
  buttonYellowShort:
    'source:assets/ui/root-run-cost-button/yellow-button-short.png',
  buttonGreen: 'source:assets/ui/root-run-cost-button/green-button-short.png',
  buttonGray: 'source:assets/ui/root-run-cost-button/gray-button-short.png',
  buttonGreenStacked:
    'source:assets/ui/root-run-cost-button/green-button.png',
  buttonBlueShort:
    'source:assets/ui/root-run-cost-button/blue-button-short.png',
  buttonGrayStacked:
    'source:assets/ui/root-run-cost-button/gray-button.png',
  buttonGreenNineSlice:
    'source:assets/ui/root-run-cost-button/green-button-9slice.png',
  buttonRedNineSlice:
    'source:assets/ui/root-run-cost-button/red-button-9slice.png',
  buttonGrayNineSlice:
    'source:assets/ui/root-run-cost-button/gray-button-9slice.png',
  buttonBrownDark:
    'source:assets/ui/root-run-cost-button/brown-button-dark-9slice.png',
  buttonBrownLight:
    'source:assets/ui/root-run-cost-button/brown-button-light-9slice.png',
  textFieldBrownInset:
    'source:assets/ui/root-run-world-chat/world-chat-text-field-9slice.png',
  coin: 'source:assets/ui/root-run-cost-button/coin.png',
  settingsKnob:
    'source:assets/ui/root-run-settings/settings-knob.png',
  settingsRow:
    'source:assets/ui/root-run-settings/settings-row-bg-9slice.png',
  settingsSound:
    'source:assets/ui/root-run-settings/settings-icon-sound.png',
  settingsMusic:
    'source:assets/ui/root-run-settings/settings-icon-music.png',
  settingsVibration:
    'source:assets/ui/root-run-settings/settings-icon-vibration.png',
  dialogBack: 'source:assets/ui/root-run-dialog/expedition-dialog-back.png',
  dialogPaper: 'source:assets/ui/root-run-dialog/expedition-dialog-front.png',
  dialogTitle:
    'source:assets/ui/root-run-dialog/expedition-dialog-title-purple.png',
  dialogClose: 'source:assets/ui/root-run-dialog/expedition-dialog-close.png',
  marketTitleRibbon:
    'source:assets/ui/root-run-market/market-title-ribbon-9slice.png',
  researchCard:
    'source:assets/ui/root-run-research/research-card-1000x304.png',
  researchCardLocked:
    'source:assets/ui/root-run-research/research-card-locked-1000x304.png',
  researchArt:
    'source:assets/ui/root-run-research/research-art-well-204x194.png',
  researchArtLocked:
    'source:assets/ui/root-run-research/research-art-well-locked-204x194.png',
  researchRank:
    'source:assets/ui/root-run-research/research-rank-badge-217x62.png',
  researchStationTitle:
    'source:assets/ui/root-run-research/research-station-title-red.png',
  researchStationTitleRegular:
    'source:assets/ui/root-run-research/research-station-title-yellow.png',
  researchStationTitleAutomation:
    'source:assets/ui/root-run-research/research-station-title-red.png',
  researchStationTitleAdvanced:
    'source:assets/ui/root-run-research/research-station-title-green.png',
  researchStationTitleCrystal:
    'source:assets/ui/root-run-research/research-station-title-purple.png',
  roomTabActive:
    'source:assets/ui/midnight-room-tab-top-cap-selected-9slice.png',
  roomTabInactive:
    'source:assets/ui/midnight-room-tab-top-cap-9slice.png',
  info: 'source:assets/ui/prop_info.png',
  workshopBag: 'source:assets/icons/icon-bag.png',
  workshopStats:
    'source:assets/icons/icon-stats-ledger-bag-style.png',
  workshopInbox: 'source:assets/icons/icon-inbox-envelope-bag-style.png',
  workshopAlliance:
    'source:assets/icons/icon-alliance-banner-base.webp',
  workshopAllianceCloth:
    'source:assets/icons/icon-alliance-banner-cloth-mask.webp',
  workshopLeaderboard:
    'source:assets/icons/icon-leaderboard-trophy.webp',
  workshopDiscoveries:
    'source:assets/icons/icon-discoveries-journal.webp',
  workshopPersonalTasks:
    'source:assets/rooms/workshop/characters/miso-daily-tasks.webp',
  workshopWorldEvent:
    'source:assets/icons/icon-quests-scroll-bag-style.png',
  lock: 'source:assets/ui/prop_lock.png',
  checkmark: 'source:assets/ui/prop_checkmark.png',
  notificationRed: 'source:assets/ui/notification-circle-red.png',
  notificationOrange: 'source:assets/ui/notification-circle-orange.png',
  starEmpty: 'source:assets/ui/stars/star-empty.png',
  starYellow: 'source:assets/ui/stars/star-yellow.png',
  starOrange: 'source:assets/ui/stars/star-orange.png',
  starRed: 'source:assets/ui/stars/star-red.png',
  starPurple: 'source:assets/ui/stars/star-purple.png',
});

export const PIXI_ROOT_RUN_GEOMETRY = Object.freeze({
  designWidth: 1080,
  marketTitleRibbon: Object.freeze({
    sourceInsets: Object.freeze({
      top: 27,
      right: 73,
      bottom: 27,
      left: 73,
    }),
    borderInsets: Object.freeze({
      top: 27 * (360 / 390),
      right: 73 * (360 / 390),
      bottom: 27 * (360 / 390),
      left: 73 * (360 / 390),
    }),
    width: 370 * (360 / 390),
    height: 55 * (360 / 390),
    contentInsetX: 66 * (360 / 390),
    contentGap: 5 * (360 / 390),
    contentOffsetY: -6 * (360 / 390),
    titleFontSize: 20 * (360 / 390),
    titleLineHeight: 24 * (360 / 390),
    titleStroke: 3 * (360 / 390),
    titleMinFontSize: 13,
    starSize: 15 * (360 / 390),
    starGap: 2 * (360 / 390),
  }),
  settings: Object.freeze({
    knobSize: 69 / 3,
    sliderRailHeight: 14,
    rowPitch: 150 / 3,
    rowPadding: 24 / 3,
    rowGap: 18 / 3,
    rowSourceInsets: Object.freeze({
      top: 17,
      right: 25,
      bottom: 19,
      left: 13,
    }),
    rowBorderInsets: Object.freeze({
      top: 17 / 3,
      right: 25 / 3,
      bottom: 19 / 3,
      left: 13 / 3,
    }),
  }),
  button: Object.freeze({
    sourceInsets: Object.freeze({ top: 100, right: 43, bottom: 68, left: 115 }),
    borderInsets: Object.freeze({ top: 17, right: 7, bottom: 12, left: 20 }),
  }),
  textFieldBrownInset: Object.freeze({
    sourceInsets: Object.freeze({ top: 26, right: 26, bottom: 26, left: 26 }),
    borderInsets: Object.freeze({
      top: 26 / 3,
      right: 26 / 3,
      bottom: 26 / 3,
      left: 26 / 3,
    }),
  }),
  researchCard: Object.freeze({
    sourceInsets: Object.freeze({
      top: 55,
      right: 77,
      bottom: 88,
      left: 64,
    }),
    borderInsets: Object.freeze({
      top: 55 / 3,
      right: 77 / 3,
      bottom: 88 / 3,
      left: 64 / 3,
    }),
  }),
  dialog: Object.freeze({
    frameOutset: 10,
    frameSourceInsets: Object.freeze({ top: 139, right: 163, bottom: 83, left: 83 }),
    frameBorderInsets: Object.freeze({
      top: 139 / 3,
      right: 163 / 3,
      bottom: 83 / 3,
      left: 83 / 3,
    }),
    paperSourceInsets: Object.freeze({ top: 99, right: 53, bottom: 72, left: 84 }),
    paperBorderInsets: Object.freeze({
      top: 99 / 3,
      right: 53 / 3,
      bottom: 72 / 3,
      left: 84 / 3,
    }),
    paperInsetX: 16 / 3,
    paperInsetTop: 85 / 3,
    paperInsetBottom: 57 / 3,
    titleSourceInsets: Object.freeze({ top: 0, right: 132, bottom: 0, left: 85 }),
    titleBorderInsets: Object.freeze({ top: 0, right: 44, bottom: 0, left: 85 / 3 }),
    titleHeight: 121 / 3,
    titleMinWidth: 614 / 3,
    titleOverhang: 61 / 3,
    titleTextSize: 64 / 3,
    titleTextStroke: 8 / 3,
    closeSize: 114 / 3,
    closeGap: 64 / 3,
  }),
});

export const PIXI_FONT_FAMILIES = Object.freeze({
  'lilita-one':
    '"Lilita One", "Arial Black", Arial, ui-sans-serif, system-ui, sans-serif',
  lexend:
    'Lexend, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'comic-sans-mono':
    '"Comic Sans Mono", "Comic Mono", "Comic Code", "Comic Sans MS", "Comic Sans", ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
});

const SHARED_RESOURCE_COLORS = Object.freeze({
  mana: '#2da9ff',
});

/**
 * Precomputed sRGB equivalents of the legacy OKLCH page mixes in base.css.
 *
 * The endpoint colors are frozen here so production Pixi rendering never
 * reads CSS, computed styles, or DOM geometry. Gradient stops remain at 0%,
 * 48%, and 100%, matching the legacy `linear-gradient(0deg, ...)`
 * declaration. Workshop intentionally repeats the surface color so its
 * production fill stays solid.
 */
export const PIXI_PAGE_BACKGROUND_COLORS = Object.freeze({
  black: Object.freeze({
    workshop: Object.freeze(['#202020', '#202020', '#202020']),
    brewing: Object.freeze(['#253037', '#202020', '#282c2d']),
    garden: Object.freeze(['#283028', '#202020', '#292c29']),
    research: Object.freeze(['#312d26', '#202020', '#2c2b29']),
    shop: Object.freeze(['#362827', '#202020', '#2d2929']),
    guild: Object.freeze(['#2f2824', '#202020', '#2c2a28']),
    prestige: Object.freeze(['#372b32', '#202020', '#2d2a2d']),
  }),
  midnight: Object.freeze({
    workshop: Object.freeze(['#17191f', '#17191f', '#17191f']),
    brewing: Object.freeze(['#212837', '#17191f', '#20242d']),
    garden: Object.freeze(['#1d2834', '#17191f', '#20252c']),
    research: Object.freeze(['#292531', '#17191f', '#20252c']),
    shop: Object.freeze(['#262435', '#17191f', '#22232c']),
    guild: Object.freeze(['#24222e', '#17191f', '#22232b']),
    prestige: Object.freeze(['#262738', '#17191f', '#22242d']),
  }),
  witchcraft: Object.freeze({
    workshop: Object.freeze(['#1a1028', '#1a1028', '#1a1028']),
    brewing: Object.freeze(['#261f3f', '#1a1028', '#231c37']),
    garden: Object.freeze(['#1d2140', '#1a1028', '#201d37']),
    research: Object.freeze(['#311b33', '#1a1028', '#2a1a31']),
    shop: Object.freeze(['#2e1938', '#1a1028', '#281a33']),
    guild: Object.freeze(['#2c1831', '#1a1028', '#281931']),
    prestige: Object.freeze(['#2e1d3d', '#1a1028', '#271b35']),
  }),
});

const THEME_TOKENS = Object.freeze({
  black: Object.freeze({
    key: 'black',
    background: '#1a1a1a',
    surface: '#202020',
    text: '#e8e8e8',
    stroke: '#6a6a6a',
    muted: '#a6a6a6',
    disabled: '#7a7a7a',
    panelFill: '#4b4b4b',
    systemText: '#e88f87',
    dialogShadow: '#b8b8b8',
    overlayShadow: '#d8d8d8',
    tooltipShadow: '#d8d8d8',
    backdrop: '#1a1a1a',
    notificationRed: '#c1121f',
    notificationOrange: '#d66a00',
    pageBackgrounds: PIXI_PAGE_BACKGROUND_COLORS.black,
    resourceColors: Object.freeze({
      ...SHARED_RESOURCE_COLORS,
      coin: '#e2c64f',
      crystal: '#c6a7eb',
      emerald: '#76c788',
      ruby: '#fe8b83',
      seed: '#dfab85',
      herb: '#80c182',
    }),
    frames: Object.freeze({
      panel: 'source:assets/ui/inner-section-panel-black-9slice.png',
      panelSelected: null,
      control: null,
      button: null,
      buttonDisabled: null,
      panelSourceInsets: Object.freeze({
        top: 91,
        right: 73,
        bottom: 90,
        left: 83,
      }),
      panelBorder: Object.freeze({
        top: 91 / 3,
        right: 73 / 3,
        bottom: 30,
        left: 83 / 3,
      }),
      controlSourceInsets: null,
      controlBorder: null,
      compactBorder: null,
    }),
  }),
  midnight: Object.freeze({
    key: 'midnight',
    background: '#1c1e26',
    surface: '#17191f',
    text: '#d4d4d4',
    stroke: '#3f465c',
    muted: '#a6a6a6',
    disabled: '#6a6a6a',
    panelFill: '#242938',
    systemText: '#ec928b',
    dialogShadow: '#0f1118',
    overlayShadow: '#0f1118',
    tooltipShadow: '#0f1118',
    backdrop: '#1c1e26',
    notificationRed: '#c1121f',
    notificationOrange: '#d66a00',
    pageBackgrounds: PIXI_PAGE_BACKGROUND_COLORS.midnight,
    resourceColors: Object.freeze({
      ...SHARED_RESOURCE_COLORS,
      coin: '#e6ca53',
      crystal: '#cdaef2',
      emerald: '#7ccd8e',
      ruby: '#ff9189',
      seed: '#e2ae88',
      herb: '#87c788',
    }),
    frames: Object.freeze({
      panel: 'source:assets/ui/inner-section-panel-midnight-9slice.png',
      panelSelected: 'public:ui/player-card-panel-selected-9slice.png',
      control: 'public:ui/player-card-panel-9slice.png',
      button: 'public:ui/player-card-button-brown-fill-9slice.png',
      buttonDisabled: 'public:ui/player-card-button-brown-dark-fill-9slice.png',
      panelSourceInsets: Object.freeze({
        top: 91,
        right: 73,
        bottom: 90,
        left: 83,
      }),
      panelBorder: Object.freeze({
        top: 91 / 3,
        right: 73 / 3,
        bottom: 30,
        left: 83 / 3,
      }),
      controlSourceInsets: Object.freeze({
        top: 31,
        right: 29,
        bottom: 31,
        left: 29,
      }),
      controlBorder: Object.freeze({
        top: 5,
        right: 6,
        bottom: 5,
        left: 6,
      }),
      compactBorder: Object.freeze({
        top: 4,
        right: 5,
        bottom: 4,
        left: 5,
      }),
    }),
  }),
  witchcraft: Object.freeze({
    key: 'witchcraft',
    background: '#07040e',
    surface: '#1a1028',
    text: '#f2e4bc',
    stroke: '#674579',
    muted: '#d1bd86',
    disabled: '#8f805c',
    panelFill: '#4c335a',
    systemText: '#ffd76a',
    dialogShadow: '#05030a',
    overlayShadow: '#05030a',
    tooltipShadow: '#05030a',
    backdrop: '#07040e',
    notificationRed: '#c1121f',
    notificationOrange: '#d66a00',
    pageBackgrounds: PIXI_PAGE_BACKGROUND_COLORS.witchcraft,
    resourceColors: Object.freeze({
      ...SHARED_RESOURCE_COLORS,
      coin: '#ffd76a',
      crystal: '#a96af0',
      emerald: '#4da977',
      ruby: '#df7653',
      seed: '#e8c878',
      herb: '#8fce48',
    }),
    frames: Object.freeze({
      panel: 'source:assets/ui/inner-section-panel-witchcraft-9slice.png',
      panelSelected: null,
      control: null,
      button: null,
      buttonDisabled: null,
      panelSourceInsets: Object.freeze({
        top: 91,
        right: 73,
        bottom: 90,
        left: 83,
      }),
      panelBorder: Object.freeze({
        top: 91 / 3,
        right: 73 / 3,
        bottom: 30,
        left: 83 / 3,
      }),
      controlSourceInsets: null,
      controlBorder: null,
      compactBorder: null,
    }),
  }),
});

const PROGRESS_TOKENS = Object.freeze({
  regular: Object.freeze({
    key: 'regular',
    colors: Object.freeze(['text']),
    insetTop: null,
    insetBottom: null,
  }),
  gradient: Object.freeze({
    key: 'gradient',
    colors: Object.freeze(['#7f3cff', '#d868ff', '#64caff', '#ffd76a']),
    stops: Object.freeze([0, 0.48, 0.74, 1]),
    insetTop: null,
    insetBottom: null,
  }),
  notched: Object.freeze({
    key: 'notched',
    colors: Object.freeze(['#b79a6b']),
    insetTop: 'rgba(255,238,197,0.48)',
    insetBottom: 'rgba(74,57,41,0.72)',
  }),
});

function resolveProgressKey(progressBar) {
  return normalizePlayerProgressBar(progressBar);
}

export function getPixiThemeTokens(theme) {
  return THEME_TOKENS[normalizePlayerTheme(theme)] ?? THEME_TOKENS[DEFAULT_PLAYER_THEME];
}

export function createPixiThemeSnapshot(settings = {}) {
  const themeKey = normalizePlayerTheme(settings.theme);
  const fontKey = normalizePlayerFont(settings.font);
  const colorMode = normalizePlayerColorMode(settings.colorMode);
  const iconMode = normalizePlayerIconMode(settings.iconMode);
  const progressKey = resolveProgressKey(settings.progressBar);
  const theme = getPixiThemeTokens(themeKey);
  const progress =
    PROGRESS_TOKENS[progressKey] ?? PROGRESS_TOKENS[DEFAULT_PLAYER_PROGRESS_BAR];

  return Object.freeze({
    revisionKey: [themeKey, fontKey, colorMode, iconMode, progressKey].join(':'),
    themeKey,
    fontKey,
    fontFamily: PIXI_FONT_FAMILIES[fontKey] ?? PIXI_FONT_FAMILIES[DEFAULT_PLAYER_FONT],
    colorMode: colorMode || DEFAULT_PLAYER_COLOR_MODE,
    iconMode: iconMode || DEFAULT_PLAYER_ICON_MODE,
    progressKey,
    progress,
    ...theme,
    resourceColors:
      colorMode === 'resources'
        ? theme.resourceColors
        : Object.freeze({
            mana: theme.text,
            coin: theme.text,
            crystal: theme.text,
            emerald: theme.text,
            ruby: theme.text,
            seed: theme.text,
            herb: theme.text,
          }),
  });
}

export const DEFAULT_PIXI_THEME_SNAPSHOT = createPixiThemeSnapshot({
  theme: DEFAULT_PLAYER_THEME,
  font: DEFAULT_PLAYER_FONT,
  colorMode: DEFAULT_PLAYER_COLOR_MODE,
  iconMode: DEFAULT_PLAYER_ICON_MODE,
  progressBar: DEFAULT_PLAYER_PROGRESS_BAR,
});
