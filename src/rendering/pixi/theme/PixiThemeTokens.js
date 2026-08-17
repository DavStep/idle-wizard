import {
  DEFAULT_PLAYER_COLOR_MODE,
  normalizePlayerColorMode,
} from '../../../player/playerColorModes.js';
import { DEFAULT_PLAYER_FONT, normalizePlayerFont } from '../../../player/playerFonts.js';
import {
  DEFAULT_PLAYER_ICON_MODE,
  normalizePlayerIconMode,
} from '../../../player/playerIconModes.js';
import {
  DEFAULT_PLAYER_PROGRESS_BAR,
  normalizePlayerProgressBar,
} from '../../../player/playerProgressBars.js';
import { DEFAULT_PLAYER_THEME, normalizePlayerTheme } from '../../../player/playerThemes.js';
import { gameViewport } from '../../../viewport/gameViewport.js';

const ROOT_RUN_DIALOG_INNER_BOARD_WIDTH = 298;
const ROOT_RUN_ACCOUNT_X_SCALE = ROOT_RUN_DIALOG_INNER_BOARD_WIDTH / 925;
const ROOT_RUN_TO_SOURCE_SCALE = gameViewport.width / 390;

export const PIXI_UI_GEOMETRY = Object.freeze({
  sourceScale: 3,
  authoredWidth: gameViewport.width * 3,
  authoredHeight: gameViewport.height * 3,
  sourceWidth: gameViewport.width,
  sourceHeight: gameViewport.height,
  bodyFontSize: 13,
  strokedTextWidth: 3,
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
  roomChatBottom: 92,
  roomChatHeight: 41,
  roomChatTitleOverhang: 12,
  roomChatGap: 8,
  topPanelContentGap: 16,
  progressRailBorderWidth: 1,
  progressHeight: 8,
  progressTotalHeight: 10,
  progressTopPanelHeight: 12,
  progressTopPanelTotalHeight: 14,
  progressKnobSize: 14,
  notificationSize: 12,
  notificationOutset: 0,
  notificationTabInset: 4,
  buttonWidth: 100,
  roomControlHeight: 36,
  tabHeight: 28,
  dialogShadowX: 5,
  dialogShadowY: 5,
  dialogShadowBlur: 5,
});

export const PIXI_TEXT_STROKE_WIDTH =
  PIXI_UI_GEOMETRY.strokedTextWidth;
export const PIXI_TEXT_STROKE_RATIO =
  PIXI_TEXT_STROKE_WIDTH / PIXI_UI_GEOMETRY.bodyFontSize;
export const PIXI_TEXT_STROKE_COLOR = '#0a0a0a';

export function resolvePixiTextStrokeWidth(
  fontSize = PIXI_UI_GEOMETRY.bodyFontSize,
) {
  const resolvedFontSize = Number(fontSize);
  return (
    (Number.isFinite(resolvedFontSize) && resolvedFontSize > 0
      ? resolvedFontSize
      : PIXI_UI_GEOMETRY.bodyFontSize) * PIXI_TEXT_STROKE_RATIO
  );
}

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
      text: '#be403b',
      textStroke: PIXI_TEXT_STROKE_COLOR,
    }),
    green: Object.freeze({
      fill: '#4aa83f',
      edge: '#8bdc69',
      text: '#4aa83f',
      textStroke: PIXI_TEXT_STROKE_COLOR,
    }),
    yellow: Object.freeze({
      fill: '#f5c542',
      edge: '#ffee7d',
      text: '#d8ad32',
      textStroke: PIXI_TEXT_STROKE_COLOR,
    }),
  }),
});

export const PIXI_ROOT_RUN_ASSETS = Object.freeze({
  innerSectionPanelWhite:
    'source:assets/ui/inner-section-panel-white.9.png',
  buttonYellow: 'source:assets/ui/regular-button/yellow-button-50.9.png',
  buttonYellowShort: 'source:assets/ui/regular-button/yellow-button-50.9.png',
  buttonGreen: 'source:assets/ui/regular-button/green-button-50.9.png',
  buttonGray: 'source:assets/ui/regular-button/gray-button-50.9.png',
  buttonGreenStacked: 'source:assets/ui/regular-button/green-button-50.9.png',
  buttonBlueShort: 'source:assets/ui/regular-button/blue-button-50.9.png',
  buttonPurpleShort: 'source:assets/ui/regular-button/purple-button-50.9.png',
  buttonGrayStacked: 'source:assets/ui/regular-button/gray-button-50.9.png',
  buttonGreenNineSlice:
    'source:assets/ui/regular-button/green-button-50.9.png',
  buttonRedNineSlice: 'source:assets/ui/regular-button/red-button-50.9.png',
  buttonGrayNineSlice:
    'source:assets/ui/regular-button/gray-button-50.9.png',
  buttonBrownDark: 'source:assets/ui/regular-button/dark-brown-button-50.9.png',
  buttonBrownLight: 'source:assets/ui/regular-button/brown-button-50.9.png',
  textFieldBrownInset: 'source:assets/ui/root-run-world-chat/world-chat-text-field.9.png',
  textFieldCleanInset: 'source:assets/ui/root-run-world-chat/world-chat-text-field-clean.9.png',
  coin: 'source:assets/icons/icon-coin.png',
  settingsKnob: 'source:assets/ui/root-run-settings/settings-knob.png',
  settingsGear: 'source:assets/ui/root-run-settings/settings-icon-gear.png',
  settingsRow: 'source:assets/ui/root-run-settings/settings-row-bg.9.png',
  settingsSound: 'source:assets/ui/root-run-settings/settings-icon-sound.png',
  settingsMusic: 'source:assets/ui/root-run-settings/settings-icon-music.png',
  settingsVibration: 'source:assets/ui/root-run-settings/settings-icon-vibration.png',
  settingsThemeNight:
    'source:assets/ui/root-run-settings/settings-icon-theme-night.png',
  settingsThemeDay:
    'source:assets/ui/root-run-settings/settings-icon-theme-day.png',
  accountTitle: 'source:assets/ui/banners/banner-cream.png',
  accountUsername: 'source:assets/ui/white-squircle/white-squircle-40.9.png',
  accountEdit: 'source:assets/ui/root-run-account/edit-pencil.png',
  accountChoice: 'source:assets/ui/root-run-account/choice-tile.png',
  accountSelected: 'source:assets/ui/root-run-account/choice-selected.png',
  topHudAvatarFrame: 'source:assets/ui/root-run-top-hud/avatar-frame.9.png',
  topHudAvatarHead: 'source:assets/ui/root-run-top-hud/avatar-head-bg.png',
  topHudCurrency: 'source:assets/ui/white-squircle/white-squircle-20.9.png',
  topHudSettings: 'source:assets/ui/white-squircle/white-squircle-40.9.png',
  topHudLevelPanel: 'source:assets/ui/white-squircle/white-squircle-30.9.png',
  topHudLevelTrack: 'source:assets/ui/root-run-top-hud/level-progress-track.9.png',
  topHudLevelFill:
    'source:assets/ui/root-run-top-hud/level-progress-fill-mask.9.png',
  dialogBack: 'source:assets/ui/root-run-dialog/expedition-dialog-back.9.png',
  dialogPaper: 'source:assets/ui/root-run-dialog/expedition-dialog-front.9.png',
  dialogTitle: 'source:assets/ui/banners/banner-purple.9.png',
  dialogClose: 'source:assets/ui/root-run-dialog/expedition-dialog-close.png',
  marketTitleRibbon: 'source:assets/ui/banners/banner-purple-ribbon.9.png',
  researchCard: 'source:assets/ui/root-run-research/research-card-1000x304.9.png',
  researchCardLocked: 'source:assets/ui/root-run-research/research-card-locked-1000x304.9.png',
  researchArt: 'source:assets/ui/white-squircle/white-squircle-40.9.png',
  researchRank: 'source:assets/ui/root-run-research/research-rank-badge-217x62.png',
  researchButtonShine:
    'source:assets/ui/root-run-research/research-button-shine.png',
  stallBatchBadge: 'source:assets/ui/root-run-level-badge-down-red.png',
  researchStationTitle: 'source:assets/ui/banners/banner-red-right.9.png',
  researchStationTitleRegular:
    'source:assets/ui/banners/banner-yellow-right.9.png',
  researchStationTitleAutomation:
    'source:assets/ui/banners/banner-red-right.9.png',
  researchStationTitleAdvanced:
    'source:assets/ui/banners/banner-green-right.9.png',
  researchStationTitleCrystal:
    'source:assets/ui/banners/banner-purple-right.9.png',
  researchStationTitleBrewing:
    'source:assets/ui/banners/banner-blue-right.9.png',
  roomTabActive: 'source:assets/ui/midnight-room-tab-top-cap-selected.9.png',
  roomTabInactive: 'source:assets/ui/midnight-room-tab-top-cap.9.png',
  topPanelBackground: 'source:assets/ui/midnight-top-panel-background.9.png',
  roomTabActiveDay:
    'source:assets/ui/day-room-tab-top-cap-selected.9.png',
  roomTabInactiveDay:
    'source:assets/ui/day-room-tab-top-cap.9.png',
  topPanelBackgroundDay:
    'source:assets/ui/day-top-panel-background.9.png',
  workshopWindowNight:
    'source:assets/rooms/workshop/workshop-window.png',
  workshopWindowDay:
    'source:assets/rooms/workshop/workshop-window-day.png',
  info: 'source:assets/ui/prop_info.png',
  workshopBag: 'source:assets/icons/icon-side-bag-root-run.png',
  workshopStats: 'source:assets/icons/icon-side-stats-root-run.png',
  workshopInbox: 'source:assets/icons/icon-side-inbox-root-run.png',
  workshopAlliance: 'source:assets/icons/icon-side-alliance-root-run.png',
  workshopLeaderboard: 'source:assets/icons/icon-side-leaderboard-root-run.png',
  workshopDiscoveries: 'source:assets/icons/icon-side-discoveries-root-run.png',
  workshopPersonalTasks: 'source:assets/icons/icon-side-tasks-root-run.png',
  workshopWorldEvent: 'source:assets/icons/icon-side-event-root-run.png',
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

export const PIXI_SQUIRCLE_TINTS = Object.freeze({
  artWell: 0xdbc19f,
  lockedArtWell: 0x4f4f4f,
  usernameBar: 0x000000,
});

export const PIXI_ROOT_RUN_GEOMETRY = Object.freeze({
  designWidth: 1080,
  innerSectionPanelWhite: Object.freeze({
    sourceInsets: Object.freeze({
      top: 88,
      right: 72,
      bottom: 86,
      left: 70,
    }),
    borderInsets: Object.freeze({
      top: 88 / 3,
      right: 72 / 3,
      bottom: 86 / 3,
      left: 70 / 3,
    }),
  }),
  marketTitleRibbon: Object.freeze({
    sourceInsets: Object.freeze({
      top: 27,
      right: 73,
      bottom: 27,
      left: 73,
    }),
    borderInsets: Object.freeze({
      top: 27 * ROOT_RUN_TO_SOURCE_SCALE,
      right: 73 * ROOT_RUN_TO_SOURCE_SCALE,
      bottom: 27 * ROOT_RUN_TO_SOURCE_SCALE,
      left: 73 * ROOT_RUN_TO_SOURCE_SCALE,
    }),
    width: 370 * ROOT_RUN_TO_SOURCE_SCALE,
    height: 55 * ROOT_RUN_TO_SOURCE_SCALE,
    contentInsetX: 66 * ROOT_RUN_TO_SOURCE_SCALE,
    contentGap: 5 * ROOT_RUN_TO_SOURCE_SCALE,
    contentOffsetY: -6 * ROOT_RUN_TO_SOURCE_SCALE,
    titleFontSize: 20 * ROOT_RUN_TO_SOURCE_SCALE,
    titleLineHeight: 24 * ROOT_RUN_TO_SOURCE_SCALE,
    titleStroke: 3 * ROOT_RUN_TO_SOURCE_SCALE,
    titleMinFontSize: 13,
    starSize: 15 * ROOT_RUN_TO_SOURCE_SCALE,
    starGap: 2 * ROOT_RUN_TO_SOURCE_SCALE,
  }),
  settings: Object.freeze({
    gearAspectRatio: 80 / 84,
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
  account: Object.freeze({
    username: Object.freeze({
      width: 650 * ROOT_RUN_ACCOUNT_X_SCALE,
      height: 88 / 3,
      sourceInsets: Object.freeze({
        top: 41,
        right: 41,
        bottom: 41,
        left: 41,
      }),
      borderInsets: Object.freeze({
        top: 41 / 3,
        right: 41 / 3,
        bottom: 41 / 3,
        left: 41 / 3,
      }),
      alpha: 0.4,
      textInsetX: 25 * ROOT_RUN_ACCOUNT_X_SCALE,
      textInsetY: 7 / 3,
      editInsetRight: 10 * ROOT_RUN_ACCOUNT_X_SCALE,
      editInsetY: 10 / 3,
      editSize: 64 / 3,
      fontSize: 64 / 3,
      textStroke: PIXI_UI_GEOMETRY.strokedTextWidth,
    }),
  }),
  button: Object.freeze({
    sourceInsets: Object.freeze({ top: 100, right: 52, bottom: 68, left: 86 }),
    borderInsets: Object.freeze({ top: 17, right: 7, bottom: 12, left: 20 }),
  }),
  legacyButton: Object.freeze({
    sourceInsets: Object.freeze({ top: 100, right: 43, bottom: 68, left: 85 }),
    borderInsets: Object.freeze({ top: 17, right: 7, bottom: 12, left: 20 }),
  }),
  compactButton: Object.freeze({
    sourceInsets: Object.freeze({ top: 100, right: 52, bottom: 68, left: 86 }),
    borderInsets: Object.freeze({ top: 16, right: 7, bottom: 11, left: 20 }),
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
  textFieldCleanInset: Object.freeze({
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
    innerBoardWidth: ROOT_RUN_DIALOG_INNER_BOARD_WIDTH,
    frameOutset: 10,
    frameSourceInsets: Object.freeze({
      top: 139,
      right: 163,
      bottom: 83,
      left: 83,
    }),
    frameBorderInsets: Object.freeze({
      top: 139 / 3,
      right: 163 / 3,
      bottom: 83 / 3,
      left: 83 / 3,
    }),
    paperSourceInsets: Object.freeze({
      top: 99,
      right: 53,
      bottom: 72,
      left: 84,
    }),
    paperBorderInsets: Object.freeze({
      top: 99 / 3,
      right: 53 / 3,
      bottom: 72 / 3,
      left: 84 / 3,
    }),
    paperInsetX: 16 / 3,
    paperInsetTop: 85 / 3,
    paperInsetBottom: 57 / 3,
    titleSourceInsets: Object.freeze({
      top: 0,
      right: 132,
      bottom: 0,
      left: 85,
    }),
    titleBorderInsets: Object.freeze({
      top: 0,
      right: 44,
      bottom: 0,
      left: 85 / 3,
    }),
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
  'lilita-one': '"Lilita One", "Arial Black", Arial, ui-sans-serif, system-ui, sans-serif',
  lexend:
    'Lexend, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'comic-sans-mono':
    '"Comic Sans Mono", "Comic Mono", "Comic Code", "Comic Sans MS", "Comic Sans", ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
});

const SHARED_RESOURCE_COLORS = Object.freeze({
  mana: '#2da9ff',
});

/**
 * Solid page surfaces mirrored from base.css.
 *
 * Production Pixi rendering never reads CSS, computed styles, or DOM
 * geometry, so every page repeats its active theme surface color here.
 */
export const PIXI_PAGE_BACKGROUND_COLORS = Object.freeze({
  night: Object.freeze({
    workshop: Object.freeze(['#17191f', '#17191f', '#17191f']),
    brewing: Object.freeze(['#17191f', '#17191f', '#17191f']),
    garden: Object.freeze(['#17191f', '#17191f', '#17191f']),
    research: Object.freeze(['#17191f', '#17191f', '#17191f']),
    shop: Object.freeze(['#17191f', '#17191f', '#17191f']),
    guild: Object.freeze(['#17191f', '#17191f', '#17191f']),
    prestige: Object.freeze(['#17191f', '#17191f', '#17191f']),
  }),
  day: Object.freeze({
    workshop: Object.freeze(['#e8bc8c', '#e8bc8c', '#e8bc8c']),
    brewing: Object.freeze(['#e8bc8c', '#e8bc8c', '#e8bc8c']),
    garden: Object.freeze(['#e8bc8c', '#e8bc8c', '#e8bc8c']),
    research: Object.freeze(['#e8bc8c', '#e8bc8c', '#e8bc8c']),
    shop: Object.freeze(['#e8bc8c', '#e8bc8c', '#e8bc8c']),
    guild: Object.freeze(['#e8bc8c', '#e8bc8c', '#e8bc8c']),
    prestige: Object.freeze(['#e8bc8c', '#e8bc8c', '#e8bc8c']),
  }),
});

const THEME_TOKENS = Object.freeze({
  night: Object.freeze({
    key: 'night',
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
    pageBackgrounds: PIXI_PAGE_BACKGROUND_COLORS.night,
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
      panel: 'source:assets/ui/inner-section-panel-midnight.9.png',
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
    }),
    chrome: Object.freeze({
      roomTabActive: PIXI_ROOT_RUN_ASSETS.roomTabActive,
      roomTabInactive: PIXI_ROOT_RUN_ASSETS.roomTabInactive,
      topPanelBackground: PIXI_ROOT_RUN_ASSETS.topPanelBackground,
      workshopWindow: PIXI_ROOT_RUN_ASSETS.workshopWindowNight,
    }),
  }),
  day: Object.freeze({
    key: 'day',
    background: '#e8bc8c',
    surface: '#543a28',
    text: '#f4eadb',
    stroke: '#765339',
    muted: '#d2b38e',
    disabled: '#9c805f',
    panelFill: '#765238',
    systemText: '#ffd6a3',
    dialogShadow: '#2d1f17',
    overlayShadow: '#2d1f17',
    tooltipShadow: '#2d1f17',
    backdrop: '#543a28',
    notificationRed: '#c1121f',
    notificationOrange: '#d66a00',
    pageBackgrounds: PIXI_PAGE_BACKGROUND_COLORS.day,
    resourceColors: Object.freeze({
      ...SHARED_RESOURCE_COLORS,
      coin: '#f2d36c',
      crystal: '#d8b9f7',
      emerald: '#84d394',
      ruby: '#ff9b92',
      seed: '#efbb91',
      herb: '#91cf92',
    }),
    frames: Object.freeze({
      panel: 'source:assets/ui/inner-section-panel-day.9.png',
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
    }),
    chrome: Object.freeze({
      roomTabActive: PIXI_ROOT_RUN_ASSETS.roomTabActiveDay,
      roomTabInactive: PIXI_ROOT_RUN_ASSETS.roomTabInactiveDay,
      topPanelBackground:
        PIXI_ROOT_RUN_ASSETS.topPanelBackgroundDay,
      workshopWindow: PIXI_ROOT_RUN_ASSETS.workshopWindowDay,
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
  const progress = PROGRESS_TOKENS[progressKey] ?? PROGRESS_TOKENS[DEFAULT_PLAYER_PROGRESS_BAR];

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
