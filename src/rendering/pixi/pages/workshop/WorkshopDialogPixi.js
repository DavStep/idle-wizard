import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import { getIngredientIconFrameName } from '../../../../assets/items/ingredients/ingredientIcons.js';
import { getPotionIconFrameName } from '../../../../assets/items/potions/potionIcons.js';
import {
  getSeedIconFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import {
  TRADE_ALLIANCE_TAG_COLORS,
  normalizeTradeAllianceTagColor,
} from '../../../../shared/tradeAllianceTagColors.js';
import {
  TRADE_ALLIANCE_BANNER_COLORS,
  TRADE_ALLIANCE_EMBLEM_COLORS,
  getTradeAllianceEmblemColor,
  normalizeTradeAllianceBannerColor,
  normalizeTradeAllianceEmblemColor,
} from '../../../../shared/tradeAllianceBannerColors.js';
import {
  TRADE_ALLIANCE_EMBLEMS,
  getTradeAllianceEmblem,
  normalizeTradeAllianceEmblem,
} from '../../../../shared/tradeAllianceEmblems.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { ClickableWidget } from '../../primitives/ClickableWidget.js';
import {
  PIXI_DIALOG_BASE_GEOMETRY,
  PIXI_DIALOG_FOOTER_TABS_GEOMETRY,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  createDialogPaperSection,
  resolveDialogFooterTabLayout,
  resolveDialogPaperOutsets,
  resolveAdaptiveDialogHeight,
  setDialogPaperAboveFooterTabs,
  setDialogPaperSectionBounds,
} from '../../primitives/PixiDialogFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiResourceLabel } from '../../primitives/PixiResourceLabel.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PixiInlineText } from '../../primitives/PixiInlineText.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { AllianceFlagWidget } from '../../primitives/AllianceFlagWidget.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  PLAYER_PROFILE_SIZE,
  PlayerProfileWidget,
} from '../../global/chrome/PlayerProfileWidgets.js';
import { getPlayerFrameTint } from '../../../../player/playerFrames.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_DIALOG_SCROLL_GEOMETRY,
  RETAINED_DIALOG_LIST_GEOMETRY,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedProgressBar,
  RetainedScrollArea,
  applyTextTheme,
  createText,
  normalizeRows,
  resolveRetainedDialogListLayout,
  setText,
} from './RetainedPageKit.js';
import { GuildColorSwatch } from '../guild/GuildDialogPixi.js';
import { RootRunInventoryChoiceRowPixi } from '../shop/ShopDialogPixi.js';
import { PlayerRelationshipRowPixi } from '../../global/dialogs/PlayerRelationshipRowPixi.js';

const WORKSHOP_DIALOG_CONTENT_WIDTH = 264;
export const ALLIANCE_DIALOG_CONTENT_WIDTH = WORKSHOP_DIALOG_CONTENT_WIDTH;
const DIALOG_SCROLL_VIEWPORT_TOP = 18;
const DIALOG_SCROLL_VIEWPORT_BOTTOM_INSET = 30;
const DIALOG_PAPER_TOP =
  PIXI_ROOT_RUN_GEOMETRY.dialog.paperInsetTop -
  PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
const DIALOG_PAPER_BOTTOM_INSET =
  PIXI_ROOT_RUN_GEOMETRY.dialog.paperInsetBottom -
  PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
const BAG_SCROLL_VIEWPORT_TOP_INSET = 4;
const BAG_TAB_COLUMN_COUNT = 3;
const BAG_TAB_ROW_GAP = 4;
const BAG_ITEM_ICON_SIZE = 32;
const BAG_POTION_ICON_SIZE = 36;
const STATS_SCROLL_VIEWPORT_TOP_INSET = 6;
const STATS_SCROLLBAR_SHIFT_RIGHT = 4;
const LEADERBOARD_FOOTER_ROW_GAP = 4;
const LEADERBOARD_LIST_TOP = DIALOG_PAPER_TOP;
const LEADERBOARD_ROW_HEIGHT = PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch;
const LEADERBOARD_AVATAR_SIZE = 37;
const LEADERBOARD_IDENTITY_X = 29;
const LEADERBOARD_LIST_LEFT_EXPANSION = 4;
const WORLD_CHAT_ROW_GAP = 3;
const WORLD_CHAT_SCROLL_PADDING_TOP = 8;
const WORLD_CHAT_CONTENT_INSET_X = 8;
const WORLD_CHAT_DIALOG_MIN_TOP = 18;
const WORLD_CHAT_HEADER_SHELL_GAP = 4;
const WORLD_CHAT_DIALOG_HEIGHT = 382 * 1.5;
const TRADE_ALLIANCE_DIALOG_HEIGHT = 470;
const WORLD_CHAT_OPEN_START_HEIGHT = 190;
const WORLD_CHAT_OPEN_DURATION_MS = 280;
const WORLD_CHAT_RESIZE_DURATION_MS = 240;
const WORLD_CHAT_MOTION_EPSILON = 0.01;
const WORLD_CHAT_ROW_HEIGHT_SCALE = 1.3;
const WORLD_CHAT_AVATAR_SCALE = 1.5;
const WORLD_CHAT_TEXT_SCALE = 1.35;
const WORLD_CHAT_COMPOSER_GAP = 6;
const WORLD_CHAT_COMPOSER_INSET_RIGHT = 4;
const WORLD_CHAT_COMPOSER_HEIGHT = 34;
const WORLD_CHAT_COMPOSER_FIELD_HEIGHT = 29;
const WORLD_CHAT_COMPOSER_SEND_WIDTH = 74;
const WORLD_CHAT_COMPOSER_SEND_HEIGHT = 29;
const DIRECT_MESSAGE_IDENTITY_COLLAPSED_HEIGHT = 64;
const DIRECT_MESSAGE_IDENTITY_EXPANDED_HEIGHT = 98;
const DIRECT_MESSAGE_IDENTITY_SECTION_GAP =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap;
const DIRECT_MESSAGE_IDENTITY_AVATAR_SIZE = 48;
const DIRECT_MESSAGE_IDENTITY_TOGGLE_HEIGHT = 58;
const DIRECT_MESSAGE_UNFRIEND_WIDTH = 100;
const DIRECT_MESSAGE_UNFRIEND_HEIGHT = 29;
const FRIENDS_DIALOG_HEIGHT = 594;
const WORLD_CHAT_ROW_SCROLLBAR_GUTTER = 3;
const WORLD_CHAT_AVATAR_SIZE =
  22 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_AVATAR_SCALE;
const WORLD_CHAT_TEXT_X =
  25 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_AVATAR_SCALE;
const WORLD_CHAT_HEADER_FONT_SIZE = 11 * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_HEADER_HEIGHT =
  12 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_HEADER_TOP = -1;
const WORLD_CHAT_BODY_TOP =
  10 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_BODY_FONT_SIZE = 11 * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_BODY_LINE_HEIGHT =
  10 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_OWN_BODY_TOP =
  11 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_OWN_BODY_FONT_SIZE = WORLD_CHAT_BODY_FONT_SIZE * 0.95;
const WORLD_CHAT_OWN_BODY_LINE_HEIGHT =
  9.5 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_PLAYER_MIN_HEIGHT =
  27 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_AVATAR_SCALE;
const WORLD_CHAT_SYSTEM_MIN_HEIGHT =
  25 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_PLAYER_BOTTOM_INSET =
  1 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_AVATAR_SCALE;
const WORLD_CHAT_SYSTEM_BOTTOM_INSET =
  3 * WORLD_CHAT_ROW_HEIGHT_SCALE * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_TIMESTAMP_FONT_SIZE = 8.5 * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_TIMESTAMP_LINE_HEIGHT = 10 * WORLD_CHAT_TEXT_SCALE;
const WORLD_CHAT_TIMESTAMP_COLOR = '#946a2e';
const WORLD_CHAT_SYSTEM_BACKGROUND = '#efd0a2';
const WORLD_CHAT_SYSTEM_TITLE_COLOR = '#432d20';
const WORLD_CHAT_SYSTEM_PLAYER_COLOR = '#72533a';
const WORLD_CHAT_REPORT_HOLD_MS = 530;
const WORLD_CHAT_REPORT_ACTION_HEIGHT = 29;
const WORLD_CHAT_REPORT_ACTION_GAP = 4;
const SCROLL_ROW_RENDER_BUFFER = 16;
const DISCOVERY_MAX_INGREDIENTS = 6;
const DISCOVERY_DIALOG_OUTER_WIDTH = 304;
const DISCOVERY_DIALOG_OUTER_HEIGHT = 404;
const DISCOVERY_BOOK_SIDE_OVERFLOW = 4;
const DISCOVERY_BOOK_WIDTH =
  DISCOVERY_DIALOG_OUTER_WIDTH + DISCOVERY_BOOK_SIDE_OVERFLOW * 2;
const DISCOVERY_BOOK_TOP = PIXI_UI_GEOMETRY.dialogPadding + 2;
const DISCOVERY_PAGE_GAP = 2;
const DISCOVERY_PAGE_WIDTH = (DISCOVERY_BOOK_WIDTH - DISCOVERY_PAGE_GAP) / 2;
const DISCOVERY_PAGE_HEIGHT = 341;
const DISCOVERY_PAGE_CONTENT_INSET = 7;
const DISCOVERY_ICON_SIZE = 46;
const UNKNOWN_POTION_ICON_FRAME = 'status:lockDefault';
const UNKNOWN_POTION_ICON_ASPECT_RATIO = 53 / 60;
const UNKNOWN_RECIPE_STATUS_LABEL = 'Recipe not yet discovered';
const UNKNOWN_RECIPE_LOCK_CENTER_OFFSET_Y = -22;
const UNKNOWN_RECIPE_OVERLAY_ALPHA = 0.18;
const UNKNOWN_RECIPE_STATUS_HEIGHT = 30;
const DISCOVERY_HEADER_GAP = 5;
const DISCOVERY_INGREDIENT_ROW_HEIGHT = 20;
const DISCOVERY_INGREDIENT_ICON_SIZE = 14;
const DISCOVERY_INGREDIENT_ICON_GAP = 2;
const DISCOVERY_PAGER_BUTTON_WIDTH = 72;
const DISCOVERY_PAGER_BUTTON_HEIGHT = 28;
const DISCOVERY_PAGER_GAP = 4;
const DISCOVERY_METADATA_ROW_HEIGHT = 15;
const DISCOVERY_RESOURCE_ICON_SIZE = 13;
const DISCOVERY_RESOURCE_ICON_GAP = 2;
const DISCOVERY_PLAYER_COLOR = '#7c359d';
const WORLD_CHAT_TAG_COLORS = Object.freeze({
  ink: '#634934',
  red: '#9b3439',
  amber: '#9a6d1f',
  green: '#397a42',
  teal: '#337b78',
  blue: '#3e6392',
  violet: '#74518e',
  magenta: '#934a78',
  brown: '#704b35',
  slate: '#596271',
});
const ALLIANCE_TAG_FIELD_COLORS = Object.freeze({
  red: '#e88b7e',
  amber: '#e4c774',
  green: '#78cf93',
  teal: '#76c8c8',
  blue: '#89afe0',
  violet: '#bd9ae1',
  magenta: '#db91bf',
  brown: '#c6a17d',
  slate: '#b5bac4',
});
const ALLIANCE_DIRECTORY_ROW_HEIGHT = 78;
const ALLIANCE_DIRECTORY_BANNER_SIZE = 56;
const ALLIANCE_DIRECTORY_LEADER_PROFILE_SIZE = 28;
const ALLIANCE_DIRECTORY_INFO_TOP = 29;
const ALLIANCE_DIRECTORY_INFO_LINE_GAP = 30;
const ALLIANCE_DIRECTORY_LEADER_ROLE_GAP = 14;
const ALLIANCE_DIRECTORY_BANNER_TOP = 7;
const ALLIANCE_DIRECTORY_SECTION_INSET = 8;
const ALLIANCE_DIRECTORY_PAPER_WIDTH =
  PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth + 16;
const ALLIANCE_DIRECTORY_SECTION_GAP = 5;
const ALLIANCE_MEMBER_ROW_HEIGHT = PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch;
const ALLIANCE_QUEST_ROW_HEIGHT = PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch;
const ALLIANCE_QUEST_SCROLL_BOTTOM_INSET =
  DIALOG_PAPER_BOTTOM_INSET + RETAINED_DIALOG_SCROLL_GEOMETRY.contentPaddingTop;
const ALLIANCE_QUEST_ITEM_ICON_SIZE = 36;
const ALLIANCE_MEMBER_AVATAR_SIZE = LEADERBOARD_AVATAR_SIZE;
const OWNED_ALLIANCE_SECTION_GAP = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap;
const OWNED_ALLIANCE_SECTION_FRAME_TOP = PIXI_UI_GEOMETRY.dialogPadding;
const OWNED_ALLIANCE_SECTION_CONTENT_TOP =
  OWNED_ALLIANCE_SECTION_FRAME_TOP +
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
const OWNED_ALLIANCE_SECTION_CONTENT_BOTTOM =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
const OWNED_ALLIANCE_MEMBER_SCROLL_TOP = 22;
const WORLD_EVENT_SECTION_GAP = 4;
const WORLD_EVENT_MAX_QUEST_ROWS = 2;
const WORLD_EVENT_QUEST_ROW_WIDTH = 314;
const WORLD_EVENT_QUEST_TITLE_HEIGHT = 16;
const WORLD_EVENT_QUEST_DESCRIPTION_GAP = 4;
const WORLD_EVENT_QUEST_OPTION_HEIGHT = 42;
const WORLD_EVENT_QUEST_OPTION_GAP = 6;
const WORLD_EVENT_QUEST_CONTENT_INSET = 10;
const WORLD_EVENT_QUEST_CONTENT_TOP = 14;
const WORLD_EVENT_QUEST_ACTION_WIDTH = 58;
const WORLD_EVENT_QUEST_ACTION_HEIGHT = 29;
const WORLD_EVENT_QUEST_ICON_SIZE = 36;
const WORLD_EVENT_QUEST_MIN_DESCRIPTION_HEIGHT = 24;
const WORLD_EVENT_MAX_DONATION_OPTIONS = 4;
const WORLD_EVENT_HEADER_CONTENT_INSET = 5;
const WORLD_EVENT_HEADER_ART_GAP = 6;
const WORLD_EVENT_HEADER_ART_HEIGHT = 98;
const WORLD_EVENT_HEADER_ART_HORIZONTAL_OUTSET = 15;
const WORLD_EVENT_HEADER_ART_RADIUS = 8;
const WORLD_EVENT_LIST_CONTENT_INSET = 5;
const WORLD_EVENT_REWARD_ICON_SIZE = 28;
const WORLD_EVENT_REWARD_ICON_GAP = 8;
const WORLD_EVENT_REWARD_ICON_RIGHT_INSET = 8;
const PERSONAL_TASK_SECTION_HEADER_HEIGHT = 48;
const PERSONAL_TASK_SECTION_ROW_GAP = 2;
const RESOURCE_ICON_FRAMES = Object.freeze({
  coin: 'resource:coin',
  crystal: 'resource:crystal',
  amethyst: 'resource:amethyst',
  emerald: 'resource:emerald',
  mana: 'resource:mana',
  ruby: 'resource:ruby',
});

function resolveBagFooterTabLayout({ coreWidth, coreHeight, tabCount } = {}) {
  const count = Math.max(0, Math.floor(Number(tabCount) || 0));
  const columnCount = Math.min(BAG_TAB_COLUMN_COUNT, count);
  const rowCount = Math.max(1, Math.ceil(count / BAG_TAB_COLUMN_COUNT));
  const baseLayout = resolveDialogFooterTabLayout({
    coreWidth,
    coreHeight,
    tabCount: columnCount,
  });
  const gridHeight =
    rowCount * PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight +
    Math.max(0, rowCount - 1) * BAG_TAB_ROW_GAP;
  const rowY =
    baseLayout.shellBottom -
    PIXI_DIALOG_FOOTER_TABS_GEOMETRY.bottomInset -
    gridHeight;

  return Object.freeze({
    ...baseLayout,
    columnCount,
    gridHeight,
    paperBottom: rowY - PIXI_DIALOG_FOOTER_TABS_GEOMETRY.paperGap,
    rowCount,
    rowGap: BAG_TAB_ROW_GAP,
    rowY,
  });
}

function createPersonalTaskSectionChrome(dialog, sectionId) {
  const root = new Container({
    label: `${dialog.dialogId}-${sectionId}-section`,
  });
  const paper = createDialogPaperSection(
    dialog.panel.paperFrame.texture,
    `${root.label}:paper`,
  );
  const title = createText('', RETAINED_TEXT_STYLES.bold);
  const points = createText('', {
    ...RETAINED_TEXT_STYLES.bold,
    align: 'right',
  });
  points.anchor.set(1, 0);
  const reset = createText('', RETAINED_TEXT_STYLES.border);
  const detail = createText('', {
    ...RETAINED_TEXT_STYLES.border,
    align: 'right',
  });
  detail.anchor.set(1, 0);
  const progress = new RetainedProgressBar({
    assetManager: dialog.assetManager,
    label: `${root.label}:progress`,
    tone: 'root',
    usePlayerStyle: false,
  });
  const dividers = new Graphics({ label: `${root.label}:dividers` });
  dividers.eventMode = 'none';
  const rowLayer = new Container({ label: `${root.label}:rows` });

  root.addChild(
    paper,
    title,
    points,
    reset,
    detail,
    progress.root,
    dividers,
    rowLayer,
  );

  return {
    root,
    paper,
    title,
    points,
    reset,
    detail,
    progress,
    dividers,
    rowLayer,
  };
}

export function createAllianceTradeSection(dialog) {
  const root = new Container({
    label: `${dialog.dialogId}-trade-info-section`,
  });
  const paper = createDialogPaperSection(
    dialog.panel.paperFrame.texture,
    `${root.label}:paper`,
  );
  const title = createText('Trade Info', RETAINED_TEXT_STYLES.bold);
  const identity = createText('', RETAINED_TEXT_STYLES.bold);
  const detail = createText('', {
    ...RETAINED_TEXT_STYLES.border,
    lineHeight: 14,
    wordWrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
  });
  const rowsLayer = new Container({ label: `${root.label}:rows` });

  root.addChild(paper, title, identity, detail, rowsLayer);
  root.visible = false;
  root.renderable = false;
  return { root, paper, title, identity, detail, rowsLayer };
}

export function createAllianceMembersSection(dialog) {
  const root = new Container({
    label: `${dialog.dialogId}-members-section`,
  });
  const paper = createDialogPaperSection(
    dialog.panel.paperFrame.texture,
    `${root.label}:paper`,
  );
  const title = createText('Members', RETAINED_TEXT_STYLES.bold);
  const count = createText('', {
    ...RETAINED_TEXT_STYLES.border,
    align: 'right',
  });
  count.anchor.set(1, 0);
  const scroll = new RetainedScrollArea({
    assetManager: dialog.assetManager,
    inputRouter: dialog.inputRouter,
    label: `${root.label}:scroll`,
  });

  root.addChild(paper, title, count, scroll.root);
  root.visible = false;
  root.renderable = false;
  return { root, paper, title, count, scroll };
}

/**
 * Shared retained shell for Workshop-owned list/dialog surfaces.
 *
 * Feature presenters provide already-formatted tabs, rows, copy, and actions;
 * this view does not reproduce bag, alliance, event, or leaderboard rules.
 */
export class WorkshopDialogPixi {
  constructor({
    dialogId,
    parent,
    assetManager = null,
    inputRouter = null,
    textEntryService = null,
    semanticTargets = null,
    counters = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
  } = {}) {
    if (!dialogId || !parent?.addChild) {
      throw new Error(
        'WorkshopDialogPixi requires a dialog id and Pixi parent layer.',
      );
    }

    this.dialogId = dialogId;
    this.parent = parent;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.textEntryService = textEntryService;
    this.semanticTargets = semanticTargets;
    this.onClose = onClose;
    this.theme = theme;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion =
      typeof reducedMotion === 'function'
        ? reducedMotion
        : () => Boolean(reducedMotion);
    this.worldChatMotion = null;
    this.handleWorldChatMotionFrame = () => this.tickWorldChatMotion();
    this.registeredTargetIds = new Set();
    this.viewModel = {};
    this.sourceWidth = RETAINED_PAGE_GEOMETRY.width;
    this.sourceHeight = RETAINED_PAGE_GEOMETRY.height;
    this.isBagDialog = this.dialogId === 'workshop.bag';
    this.isStatsDialog = this.dialogId === 'workshop.stats';
    this.isLeaderboardDialog = this.dialogId === 'workshop.leaderboard';
    this.isWorldChatDialog = this.dialogId === 'workshop.worldChat';
    this.isDirectMessageDialog = this.dialogId === 'global.directMessage';
    this.isChatDialog = this.isWorldChatDialog || this.isDirectMessageDialog;
    this.isFriendsDialog = this.dialogId === 'global.friends';
    this.viewModelRevision = null;
    this.isDiscoveriesDialog = this.dialogId === 'workshop.discoveries';
    this.isAllianceDialog = this.dialogId === 'workshop.alliance';
    this.isWorldEventDialog = this.dialogId === 'workshop.worldEvent';
    this.isPersonalTasksDialog = this.dialogId === 'workshop.personalTasks';
    this.counters = counters;
    this.scrollContentPaddingTop = this.isBagDialog
      ? 0
      : RETAINED_DIALOG_SCROLL_GEOMETRY.contentPaddingTop;
    this.scrollViewportTopInset = this.isChatDialog
      ? WORLD_CHAT_SCROLL_PADDING_TOP
      : this.isBagDialog
        ? BAG_SCROLL_VIEWPORT_TOP_INSET
        : this.isStatsDialog
          ? STATS_SCROLL_VIEWPORT_TOP_INSET
          : 0;
    this.scrollViewportWidth = this.isChatDialog
      ? this.sourceWidth -
        PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset * 2 -
        WORLD_CHAT_CONTENT_INSET_X * 2
      : this.isFriendsDialog
        ? PIXI_DIALOG_BASE_GEOMETRY.contentWidth
        : WORKSHOP_DIALOG_CONTENT_WIDTH +
          (this.isBagDialog
            ? RETAINED_DIALOG_SCROLL_GEOMETRY.scrollbarShiftRight
            : this.isStatsDialog
              ? STATS_SCROLLBAR_SHIFT_RIGHT
              : 0);

    this.modalId = `dialog:${this.dialogId}`;
    this.modal = new PixiOwnedDialogSurface({
      id: this.modalId,
      parent: this.parent,
      assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticTargets,
      title: dialogId.split('.').at(-1),
      onClose: () => this.onClose?.(),
      theme,
      openMotion: this.isChatDialog ? false : 'center',
      label: `${dialogId}-dialog`,
    });
    this.root = this.modal.root;
    this.backdrop = this.modal.backdrop;
    this.panel = this.modal.panel;
    if (this.isChatDialog) {
      this.panel.setHeaderLayout('edge');
    }
    if (this.isFriendsDialog) {
      this.panel.setPaperVisible(false);
    }
    this.copy = createText('', {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 264,
    });
    this.headerHeadline = createText('', {
      ...RETAINED_TEXT_STYLES.bold,
      wordWrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
    });
    this.headerBody = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      lineHeight: 14,
      wordWrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
    });
    this.headerMeta = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
    });
    this.status = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      wordWrapWidth: 264,
    });
    this.directMessageProfile = this.isDirectMessageDialog
      ? new PlayerProfileWidget({
          assets: this.assetManager,
          texture: Texture.EMPTY,
          label: `${dialogId}:friend-profile`,
        })
      : null;
    this.directMessageTag = this.isDirectMessageDialog
      ? createText('', RETAINED_TEXT_STYLES.bold)
      : null;
    this.directMessageName = this.isDirectMessageDialog
      ? createText('', RETAINED_TEXT_STYLES.bold)
      : null;
    this.directMessageLevel = this.isDirectMessageDialog
      ? createText('', RETAINED_TEXT_STYLES.border)
      : null;
    this.directMessageExpandGlyph = this.isDirectMessageDialog
      ? createText('▼', RETAINED_TEXT_STYLES.bold)
      : null;
    this.directMessageIdentitySection = this.isDirectMessageDialog
      ? new Container({ label: `${dialogId}:friend-identity-section` })
      : null;
    this.directMessageIdentityPaper = this.isDirectMessageDialog
      ? createDialogPaperSection(
          this.panel.paperFrame.texture,
          `${dialogId}:friend-identity-paper`,
        )
      : null;
    this.directMessageMessagePaper = this.isDirectMessageDialog
      ? createDialogPaperSection(
          this.panel.paperFrame.texture,
          `${dialogId}:message-paper`,
        )
      : null;
    this.directMessageIdentityHitTarget = this.isDirectMessageDialog
      ? new Container({ label: `${dialogId}:friend-identity-toggle` })
      : null;
    this.directMessageUnfriend = this.isDirectMessageDialog
      ? new PixiTextButton({
          assetManager,
          inputRouter,
          semanticRegistry: semanticTargets,
          semanticId: `${dialogId}.unfriend`,
          text: 'Unfriend',
          width: DIRECT_MESSAGE_UNFRIEND_WIDTH,
          height: DIRECT_MESSAGE_UNFRIEND_HEIGHT,
          sizeTier: 50,
          variant: 'red',
          action: () => this.activateDirectMessageUnfriend(),
          label: `${dialogId}:unfriend`,
        })
      : null;
    this.directMessageIdentityExpanded = false;
    this.directMessageTagColor = WORLD_CHAT_TAG_COLORS.green;
    if (this.directMessageIdentitySection) {
      this.panel.setPaperVisible(false);
      this.directMessageExpandGlyph.anchor.set(0.5);
      this.directMessageIdentitySection.addChild(
        this.directMessageIdentityPaper,
        this.directMessageProfile,
        this.directMessageTag,
        this.directMessageName,
        this.directMessageLevel,
        this.directMessageExpandGlyph,
        this.directMessageIdentityHitTarget,
        this.directMessageUnfriend,
      );
    }
    this.directMessageProfileRegistration = this.directMessageIdentityHitTarget
      ? (this.inputRouter?.registerPressTarget?.(
          this.directMessageIdentityHitTarget,
          {
            fallbackHitTest: true,
            enabled: () =>
              this.modal.shown === true &&
              typeof this.viewModel.actions?.unfriend === 'function',
            onActivate: () => this.toggleDirectMessageIdentityActions(),
            haptic: 'selection',
            excludePageSwipe: true,
          },
        ) ?? null)
      : null;
    this.scrollableRowLayouts = new Map();
    this.scroll = new RetainedScrollArea({
      assetManager: this.assetManager,
      label: `${dialogId}-scroll`,
      inputRouter: this.inputRouter,
      onScroll: () => this.updateScrollableRowVisibility(),
    });
    this.ownedAllianceLayout = false;
    this.allianceTradeSection = this.isAllianceDialog
      ? createAllianceTradeSection(this)
      : null;
    this.allianceMembersSection = this.isAllianceDialog
      ? createAllianceMembersSection(this)
      : null;
    this.allianceSettingsPane = this.isAllianceDialog
      ? new AllianceSettingsPane({ dialog: this })
      : null;
    this.personalTaskSectionChrome = this.isPersonalTasksDialog
      ? new Map(
          ['daily', 'weekly'].map((sectionId) => [
            sectionId,
            createPersonalTaskSectionChrome(this, sectionId),
          ]),
        )
      : null;
    this.worldEventHeaderPaper = this.isWorldEventDialog
      ? createDialogPaperSection(
          this.panel.paperFrame.texture,
          `${dialogId}-header-paper`,
        )
      : null;
    this.worldEventListPaper = this.isWorldEventDialog
      ? createDialogPaperSection(
          this.panel.paperFrame.texture,
          `${dialogId}-list-paper`,
        )
      : null;
    this.worldEventHeaderArt = this.isWorldEventDialog
      ? new Sprite({
          texture: Texture.EMPTY,
          label: `${dialogId}-header-art`,
          roundPixels: true,
        })
      : null;
    this.worldEventHeaderArtMask = this.isWorldEventDialog
      ? new Graphics({ label: `${dialogId}-header-art-mask` })
      : null;
    if (this.isWorldEventDialog) {
      this.panel.setPaperVisible(false);
      this.worldEventHeaderArt.eventMode = 'none';
      this.worldEventHeaderArtMask.eventMode = 'none';
      this.worldEventHeaderArt.mask = this.worldEventHeaderArtMask;
      this.panel.content.addChild(
        this.worldEventHeaderPaper,
        this.worldEventListPaper,
        this.worldEventHeaderArt,
        this.worldEventHeaderArtMask,
      );
    }
    if (this.isPersonalTasksDialog) {
      this.panel.setPaperVisible(false);
    }
    this.discoveryBook = this.isDiscoveriesDialog
      ? new Container({ label: `${dialogId}-book` })
      : null;
    this.discoveryEmptyPages = this.isDiscoveriesDialog
      ? [0, 1].map((index) =>
          createDialogPaperSection(
            this.panel.paperFrame.texture,
            `${dialogId}-empty-page-${index}`,
          ),
        )
      : [];
    this.discoveryEmptyText = this.isDiscoveriesDialog
      ? createText('No potion discoveries yet.', {
          ...RETAINED_TEXT_STYLES.body,
          wordWrapWidth:
            DISCOVERY_PAGE_WIDTH - DISCOVERY_PAGE_CONTENT_INSET * 2,
        })
      : null;
    this.discoveryPrevious = this.isDiscoveriesDialog
      ? new PixiTextButton({
          assetManager,
          inputRouter,
          semanticRegistry: semanticTargets,
          semanticId: 'workshop.discoveries.previous',
          text: 'Prev',
          width: DISCOVERY_PAGER_BUTTON_WIDTH,
          height: DISCOVERY_PAGER_BUTTON_HEIGHT,
          sizeTier: 30,
          variant: 'yellow',
          action: () => this.showPreviousDiscoverySpread(),
          label: 'workshop.discoveries.previous',
        })
      : null;
    this.discoveryNext = this.isDiscoveriesDialog
      ? new PixiTextButton({
          assetManager,
          inputRouter,
          semanticRegistry: semanticTargets,
          semanticId: 'workshop.discoveries.next',
          text: 'Next',
          width: DISCOVERY_PAGER_BUTTON_WIDTH,
          height: DISCOVERY_PAGER_BUTTON_HEIGHT,
          sizeTier: 30,
          variant: 'yellow',
          action: () => this.showNextDiscoverySpread(),
          label: 'workshop.discoveries.next',
        })
      : null;
    this.discoveryPageLabel = this.isDiscoveriesDialog
      ? createText('', {
          ...RETAINED_TEXT_STYLES.border,
          align: 'center',
        })
      : null;
    if (this.discoveryPageLabel) {
      this.discoveryPageLabel.anchor.set(0.5, 0);
    }
    this.discoverySpreadIndex = 0;
    if (this.isDiscoveriesDialog) {
      this.panel.setPaperVisible(false);
      this.discoveryBook.eventMode = 'static';
      this.panel.content.addChild(
        this.discoveryBook,
        this.discoveryPrevious,
        this.discoveryNext,
        this.discoveryPageLabel,
      );
    }
    this.tabsLayer = new Container({ label: `${dialogId}-tabs` });
    this.periodTabsLayer = this.isLeaderboardDialog
      ? new Container({ label: `${dialogId}-period-tabs` })
      : null;
    this.panel.content.addChild(
      ...(this.directMessageMessagePaper
        ? [this.directMessageMessagePaper, this.directMessageIdentitySection]
        : []),
      ...(this.isAllianceDialog
        ? [
            this.allianceTradeSection.root,
            this.allianceMembersSection.root,
            this.allianceSettingsPane.root,
          ]
        : []),
      this.copy,
      this.headerHeadline,
      this.headerBody,
      this.headerMeta,
      this.scroll.root,
      this.status,
    );
    this.panel.addChild(
      ...(this.periodTabsLayer ? [this.periodTabsLayer] : []),
      this.tabsLayer,
    );
    this.composerField = null;
    this.composerSubmit = null;
    this.composerSubmitting = false;
    this.composerSubmissionToken = 0;
    this.composerStatus = '';
    this.boundStatus = '';

    if (this.isChatDialog) {
      this.composerField = new PixiTextField({
        assetManager: this.assetManager,
        inputRouter: this.inputRouter,
        textEntryService: this.textEntryService,
        placeholder: 'Message',
        inputKind: 'text',
        maxLength: 160,
        retainOnSubmit: true,
        variant: 'clean-inset',
        label: `${dialogId}-composer`,
        onChange: () => this.updateComposerControl(),
        onSubmit: () => void this.submitComposer(),
      });
      this.composerSubmit = new RetainedButton({
        assetManager: this.assetManager,
        buttonLabel: `${dialogId}-submit`,
        inputRouter: this.inputRouter,
        sizeTier: 30,
        variant: 'yellow',
        preserveFocus: true,
      });
      this.panel.content.addChild(this.composerField, this.composerSubmit.root);
      this.composerField.visible = false;
      this.composerField.renderable = false;
      this.composerSubmit.root.visible = false;
      this.composerSubmit.root.renderable = false;
    }

    this.rowPool = new WidgetPool({
      name: `${dialogId} row pool`,
      counters,
      create: () =>
        this.isChatDialog
          ? new WorldChatMessageRowPixi({ dialog: this })
          : this.isFriendsDialog
            ? new PlayerRelationshipRowPixi({ dialog: this })
            : this.isDiscoveriesDialog
              ? new PotionDiscoveryPagePixi({ dialog: this })
              : this.isLeaderboardDialog
                ? new LeaderboardRowPixi({ dialog: this })
                : this.isBagDialog
                  ? new WorkshopBagInventoryRow({ dialog: this })
                  : new WorkshopDialogRow({ dialog: this }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 30,
    });
    this.rows = new PooledCollection({
      name: `${dialogId} rows`,
      pool: this.rowPool,
      counters,
      keyOf: (row, index) => row.id ?? row.key ?? index,
      revisionOf: this.isChatDialog
        ? (row) => createRetainedModelRevision(row)
        : null,
      bind: (widget, row) => widget.bind(row),
      afterReconcile: (widgets) => this.orderRows(widgets),
    });
    this.discoverySwipeRegistration = this.isDiscoveriesDialog
      ? (this.inputRouter?.registerPageSwipe?.({
          id: 'workshop.discoveries.book-swipe',
          displayObject: this.discoveryBook,
          modalId: this.modal.id,
          threshold: 30,
          onSwipe: ({ direction }) =>
            direction === 'next'
              ? this.showNextDiscoverySpread()
              : this.showPreviousDiscoverySpread(),
        }) ?? null)
      : null;
    this.defaultRows = this.rows;
    this.allianceRowPool = this.isAllianceDialog
      ? new WidgetPool({
          name: `${dialogId} alliance directory row pool`,
          counters,
          create: () => new AllianceDirectoryRow({ dialog: this }),
          reset: (row) => row.reset(),
          dispose: (row) => row.destroy(),
          maxSize: 30,
        })
      : null;
    this.allianceRows = this.allianceRowPool
      ? new PooledCollection({
          name: `${dialogId} alliance directory rows`,
          pool: this.allianceRowPool,
          counters,
          keyOf: (row, index) => row.id ?? row.allianceId ?? index,
          bind: (widget, row) => widget.bind(row),
          afterReconcile: (widgets) => this.orderRows(widgets),
        })
      : null;
    this.allianceMemberRowPool = this.isAllianceDialog
      ? new WidgetPool({
          name: `${dialogId} owned alliance member row pool`,
          counters,
          create: () => new AllianceMemberRow({ dialog: this }),
          reset: (row) => row.reset(),
          dispose: (row) => row.destroy(),
          maxSize: 50,
        })
      : null;
    this.allianceMemberRows = this.allianceMemberRowPool
      ? new PooledCollection({
          name: `${dialogId} owned alliance member rows`,
          pool: this.allianceMemberRowPool,
          counters,
          keyOf: (row, index) => row.id ?? row.memberIdentity ?? index,
          bind: (widget, row) => widget.bind(row),
          afterReconcile: (widgets) =>
            this.orderOwnedAllianceMemberRows(widgets),
        })
      : null;
    this.allianceRequestRowPool = this.isAllianceDialog
      ? new WidgetPool({
          name: `${dialogId} alliance request row pool`,
          counters,
          create: () => new PlayerRelationshipRowPixi({ dialog: this }),
          reset: (row) => row.reset(),
          dispose: (row) => row.destroy(),
          maxSize: 30,
        })
      : null;
    this.allianceRequestRows = this.allianceRequestRowPool
      ? new PooledCollection({
          name: `${dialogId} alliance request rows`,
          pool: this.allianceRequestRowPool,
          counters,
          keyOf: (row, index) => row.id ?? row.identity ?? index,
          bind: (widget, row) => widget.bind(row),
          afterReconcile: (widgets) => this.orderRows(widgets),
        })
      : null;
    this.allianceQuestRowPool = this.isAllianceDialog
      ? new WidgetPool({
          name: `${dialogId} alliance quest row pool`,
          counters,
          create: () => new AllianceQuestRow({ dialog: this }),
          reset: (row) => row.reset(),
          dispose: (row) => row.destroy(),
          maxSize: 30,
        })
      : null;
    this.allianceQuestRows = this.allianceQuestRowPool
      ? new PooledCollection({
          name: `${dialogId} alliance quest rows`,
          pool: this.allianceQuestRowPool,
          counters,
          keyOf: (row, index) => row.id ?? row.questId ?? index,
          bind: (widget, row) => widget.bind(row),
          afterReconcile: (widgets) => this.orderRows(widgets),
        })
      : null;
    this.worldEventRowPool = this.isWorldEventDialog
      ? new WidgetPool({
          name: `${dialogId} world event quest row pool`,
          counters,
          create: () => new WorldEventQuestRow({ dialog: this }),
          reset: (row) => row.reset(),
          dispose: (row) => row.destroy(),
          maxSize: 16,
        })
      : null;
    this.worldEventRows = this.worldEventRowPool
      ? new PooledCollection({
          name: `${dialogId} world event quest rows`,
          pool: this.worldEventRowPool,
          counters,
          keyOf: (row, index) => row.id ?? row.requestId ?? index,
          bind: (widget, row) => widget.bind(row),
          afterReconcile: (widgets) => this.orderRows(widgets),
        })
      : null;
    this.worldEventLeaderboardRowPool = this.isWorldEventDialog
      ? new WidgetPool({
          name: `${dialogId} world event leaderboard row pool`,
          counters,
          create: () => new LeaderboardRowPixi({ dialog: this }),
          reset: (row) => row.reset(),
          dispose: (row) => row.destroy(),
          maxSize: 30,
        })
      : null;
    this.worldEventLeaderboardRows = this.worldEventLeaderboardRowPool
      ? new PooledCollection({
          name: `${dialogId} world event leaderboard rows`,
          pool: this.worldEventLeaderboardRowPool,
          counters,
          keyOf: (row, index) => row.id ?? row.identity ?? index,
          bind: (widget, row) => widget.bind(row),
          afterReconcile: (widgets) => this.orderRows(widgets),
        })
      : null;
    this.worldEventRewardRowPool = this.isWorldEventDialog
      ? new WidgetPool({
          name: `${dialogId} world event reward row pool`,
          counters,
          create: () => new WorldEventRewardRow({ dialog: this }),
          reset: (row) => row.reset(),
          dispose: (row) => row.destroy(),
          maxSize: 16,
        })
      : null;
    this.worldEventRewardRows = this.worldEventRewardRowPool
      ? new PooledCollection({
          name: `${dialogId} world event reward rows`,
          pool: this.worldEventRewardRowPool,
          counters,
          keyOf: (row, index) => row.id ?? index,
          bind: (widget, row) => widget.bind(row),
          afterReconcile: (widgets) => this.orderRows(widgets),
        })
      : null;
    this.tabPool = new WidgetPool({
      name: `${dialogId} tab pool`,
      counters,
      create: () =>
        new RetainedButton({
          assetManager: this.assetManager,
          buttonLabel: `${dialogId}-tab`,
          inputRouter: this.inputRouter,
          variant: 'tab',
        }),
      reset: (button) => button.setModel({ label: '', enabled: false }),
      dispose: (button) => button.destroy(),
      maxSize: 8,
    });
    this.tabs = new PooledCollection({
      name: `${dialogId} tabs`,
      pool: this.tabPool,
      counters,
      keyOf: (tab) => tab.id,
      bind: (button, tab) => this.bindTab(button, tab),
      afterReconcile: (buttons) => this.orderTabs(buttons),
    });
    this.periodTabPool = this.isLeaderboardDialog
      ? new WidgetPool({
          name: `${dialogId} period tab pool`,
          counters,
          create: () =>
            new RetainedButton({
              assetManager: this.assetManager,
              buttonLabel: `${dialogId}-period-tab`,
              inputRouter: this.inputRouter,
              variant: 'tab',
            }),
          reset: (button) => button.setModel({ label: '', enabled: false }),
          dispose: (button) => button.destroy(),
          maxSize: 4,
        })
      : null;
    this.periodTabs = this.periodTabPool
      ? new PooledCollection({
          name: `${dialogId} period tabs`,
          pool: this.periodTabPool,
          counters,
          keyOf: (tab) => tab.id,
          bind: (button, tab) => this.bindPeriodTab(button, tab),
          afterReconcile: (buttons) => this.orderPeriodTabs(buttons),
        })
      : null;
    this.applyTheme(theme);
    this.layout(
      this.viewportProjection ?? {
        sourceWidth: this.sourceWidth,
        sourceHeight: this.sourceHeight,
      },
    );
  }

  bind(viewModel) {
    const nextViewModel = viewModel ?? {};
    const nextViewModelRevision = this.isChatDialog
      ? createRetainedModelRevision(nextViewModel)
      : null;
    if (
      this.isChatDialog &&
      this.viewModelRevision !== null &&
      nextViewModelRevision === this.viewModelRevision
    ) {
      this.viewModel = nextViewModel;
      return;
    }

    const keepWorldChatPinnedToNewest =
      this.isChatDialog &&
      this.modal.shown === true &&
      this.scroll.offsetY >=
        Math.max(0, this.scroll.contentHeight - this.scroll.height) - 0.5;
    this.viewModel = nextViewModel;
    this.viewModelRevision = nextViewModelRevision;
    this.ownedAllianceHomeLayout = Boolean(
      this.isAllianceDialog &&
      (this.viewModel.ownedAllianceHome === true ||
        (this.viewModel.ownedAlliance === true &&
          this.viewModel.selectedTabId == null)),
    );
    this.ownedAllianceLayout = this.ownedAllianceHomeLayout;
    this.modal.setTitle(
      this.viewModel.title ?? this.dialogId.split('.').at(-1),
    );
    setText(this.copy, this.viewModel.copy ?? this.viewModel.description ?? '');
    setText(this.headerHeadline, this.viewModel.header?.headline ?? '');
    setText(this.headerBody, this.viewModel.header?.body ?? '');
    setText(this.headerMeta, this.viewModel.header?.meta ?? '');
    if (this.directMessageProfile) {
      const friend = this.viewModel.friend ?? {};
      this.directMessageProfile
        .setTexture(
          resolveCharacterTexture(this.assetManager, friend.character),
        )
        .setBackgroundTint(getPlayerFrameTint(friend.frame));
      const allianceTag = normalizeWorldChatTag(friend.allianceTag);
      const allianceTagColor = normalizeWorldChatTagColor(
        friend.allianceTagColor,
      );
      setText(this.directMessageTag, allianceTag ? `[${allianceTag}]` : '');
      this.directMessageTagColor = WORLD_CHAT_TAG_COLORS[allianceTagColor];
      this.directMessageTag.style.fill = this.directMessageTagColor;
      setText(this.directMessageName, friend.username ?? 'Wizard');
      setText(
        this.directMessageLevel,
        `Level ${Math.max(1, Math.floor(Number(friend.playerLevel) || 1))}`,
      );
      if (this.viewModel.identityExpanded === true) {
        this.directMessageIdentityExpanded = true;
      } else if (typeof this.viewModel.actions?.unfriend !== 'function') {
        this.directMessageIdentityExpanded = false;
      }
      this.syncDirectMessageIdentityState();
    }
    if (this.isWorldEventDialog) {
      const headerArtAssetId = String(
        this.viewModel.header?.artAssetId ?? '',
      ).trim();
      this.worldEventHeaderArt.texture = headerArtAssetId
        ? (this.assetManager?.getTexture?.(headerArtAssetId) ?? Texture.EMPTY)
        : Texture.EMPTY;
      this.worldEventHeaderArt.visible = Boolean(headerArtAssetId);
      this.worldEventHeaderArt.renderable = Boolean(headerArtAssetId);
      this.worldEventHeaderArtMask.visible = Boolean(headerArtAssetId);
      this.worldEventHeaderArtMask.renderable = Boolean(headerArtAssetId);
    }
    const hasHeader = Boolean(
      this.headerHeadline.text || this.headerBody.text || this.headerMeta.text,
    );
    this.headerHeadline.visible = hasHeader;
    this.headerBody.visible = hasHeader;
    this.headerMeta.visible = hasHeader;
    this.boundStatus = this.viewModel.status ?? '';
    this.status.visible = true;
    this.status.renderable = true;
    if (this.isAllianceDialog) {
      const tradeInfo = this.viewModel.tradeInfo ?? {};
      const detail = [tradeInfo.description, tradeInfo.notice]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .join('\n');
      setText(
        this.allianceTradeSection.identity,
        tradeInfo.identityLabel ?? '',
      );
      setText(this.allianceTradeSection.detail, detail);
      setText(
        this.allianceMembersSection.count,
        tradeInfo.memberCountLabel ?? '',
      );
      this.allianceTradeSection.root.visible = this.ownedAllianceHomeLayout;
      this.allianceTradeSection.root.renderable = this.ownedAllianceHomeLayout;
      this.allianceMembersSection.root.visible = this.ownedAllianceLayout;
      this.allianceMembersSection.root.renderable = this.ownedAllianceLayout;
      const settingsVisible = Boolean(this.viewModel.settings);
      this.allianceSettingsPane.bind(this.viewModel.settings);
      this.scroll.root.visible = !this.ownedAllianceLayout && !settingsVisible;
      this.scroll.root.renderable =
        !this.ownedAllianceLayout && !settingsVisible;
      this.panel.setPaperVisible(
        !this.ownedAllianceLayout && this.viewModel.directory !== true,
      );
      this.copy.visible = !this.ownedAllianceLayout && Boolean(this.copy.text);
      this.copy.renderable = this.copy.visible;
      this.headerHeadline.renderable = !this.ownedAllianceLayout && hasHeader;
      this.headerBody.renderable = !this.ownedAllianceLayout && hasHeader;
      this.headerMeta.renderable = !this.ownedAllianceLayout && hasHeader;
      this.tabsLayer.renderable = true;
    }
    this.bindComposer(this.viewModel.composer);
    this.tabs.reconcile(normalizeRows(this.viewModel.tabs));
    this.periodTabs?.reconcile(normalizeRows(this.viewModel.periodTabs));
    const nextRows =
      this.isAllianceDialog &&
      this.viewModel.rowWidget === 'allianceQuest' &&
      this.allianceQuestRows
        ? this.allianceQuestRows
        : this.isAllianceDialog &&
            this.viewModel.rowWidget === 'playerRelationship' &&
            this.allianceRequestRows
          ? this.allianceRequestRows
          : this.isAllianceDialog &&
              this.viewModel.directory === true &&
              this.allianceRows
            ? this.allianceRows
            : this.isWorldEventDialog &&
                this.viewModel.rowWidget === 'worldEventQuest' &&
                this.worldEventRows
              ? this.worldEventRows
              : this.isWorldEventDialog &&
                  this.viewModel.rowWidget === 'leaderboard' &&
                  this.worldEventLeaderboardRows
                ? this.worldEventLeaderboardRows
                : this.isWorldEventDialog &&
                    this.viewModel.rowWidget === 'worldEventReward' &&
                    this.worldEventRewardRows
                  ? this.worldEventRewardRows
                  : this.defaultRows;
    if (this.rows !== nextRows) {
      this.rows.reconcile([]);
      this.rows = nextRows;
    }
    const rows = normalizeRows(
      this.ownedAllianceHomeLayout
        ? this.viewModel.tradeInfoRows
        : this.viewModel.rows,
    );
    if (!this.boundStatus && rows.length === 0) {
      this.boundStatus = this.viewModel.emptyLabel ?? '';
    }
    if (this.isDiscoveriesDialog) {
      if (Number.isInteger(this.viewModel.spreadIndex)) {
        this.discoverySpreadIndex = this.viewModel.spreadIndex;
      }
      this.clampDiscoverySpread(rows.length);
    }
    this.updateStatus();
    this.rows.reconcile(
      this.isWorldEventDialog && this.viewModel.rowWidget === 'worldEventQuest'
        ? rows.slice(0, WORLD_EVENT_MAX_QUEST_ROWS)
        : rows,
    );
    this.allianceMemberRows?.reconcile(
      this.ownedAllianceLayout ? normalizeRows(this.viewModel.members) : [],
    );
    this.layout(
      this.viewportProjection ?? {
        sourceWidth: this.sourceWidth,
        sourceHeight: this.sourceHeight,
      },
    );
    if (keepWorldChatPinnedToNewest) {
      this.scroll.scrollTo(
        Math.max(0, this.scroll.contentHeight - this.scroll.height),
      );
    }
  }

  bindTab(button, tab) {
    button.applyTheme(this.contentTheme ?? this.theme);
    button.setModel({
      label: tab.label ?? tab.id,
      selected:
        tab.selected === true || tab.id === this.viewModel.selectedTabId,
      notification: tab.notification === true,
      enabled: tab.enabled !== false,
      action: () =>
        tab.onSelect?.(tab.id) ?? this.viewModel.onSelectTab?.(tab.id),
    });
    button.control.textLabel.setFontSize(PIXI_UI_GEOMETRY.borderLabelFontSize);
  }

  bindPeriodTab(button, tab) {
    button.applyTheme(this.contentTheme ?? this.theme);
    button.setModel({
      label: tab.label ?? tab.id,
      selected:
        tab.selected === true || tab.id === this.viewModel.selectedPeriodId,
      enabled: tab.enabled !== false,
      action: () =>
        tab.onSelect?.(tab.id) ?? this.viewModel.onSelectPeriod?.(tab.id),
    });
    button.control.textLabel.setFontSize(PIXI_UI_GEOMETRY.borderLabelFontSize);
  }

  navigateToTarget({ targetId, indication = 'boink' } = {}) {
    const target = String(targetId ?? '').trim();
    const row = this.rows
      ?.getWidgets?.()
      ?.find((candidate) => candidate.semanticId === target);
    const layout = row ? this.scrollableRowLayouts.get(row) : null;
    if (!row || !layout) {
      return false;
    }
    this.scroll.scrollTo(
      layout.top - Math.max(0, (this.scroll.height - layout.height) / 2),
    );
    this.updateScrollableRowVisibility();
    if (indication === 'boink') {
      row.startAttentionEffect?.();
    }
    return true;
  }

  orderRows(widgets) {
    if (this.ownedAllianceLayout) {
      this.orderOwnedAllianceTradeRows(widgets);
      return;
    }
    if (this.isPersonalTasksDialog) {
      this.orderPersonalTaskRows(widgets);
      return;
    }
    if (this.isDiscoveriesDialog) {
      this.orderDiscoveryPages(widgets);
      return;
    }

    this.scroll.content.removeChildren();
    this.scrollableRowLayouts.clear();
    const contentPaddingTop =
      this.isWorldEventDialog && this.viewModel.rowWidget === 'worldEventQuest'
        ? 0
        : this.scrollContentPaddingTop;
    const rowGap = this.isChatDialog
      ? WORLD_CHAT_ROW_GAP
      : this.isBagDialog
        ? 0
        : this.isWorldEventDialog &&
            this.viewModel.rowWidget === 'worldEventQuest'
          ? WORLD_EVENT_SECTION_GAP
          : this.isAllianceDialog && this.viewModel.directory
            ? ALLIANCE_DIRECTORY_SECTION_GAP
            : this.isLeaderboardDialog ||
                (this.isWorldEventDialog &&
                  (this.viewModel.rowWidget === 'leaderboard' ||
                    this.viewModel.rowWidget === 'worldEventReward')) ||
                (this.isAllianceDialog &&
                  this.viewModel.rowWidget === 'allianceQuest')
              ? 0
              : 4;
    const rowWidth = this.isChatDialog
      ? this.scroll.width - WORLD_CHAT_ROW_SCROLLBAR_GUTTER
      : this.isFriendsDialog
        ? PIXI_DIALOG_BASE_GEOMETRY.contentWidth
        : this.isBagDialog
          ? (this.bagRowWidth ?? WORKSHOP_DIALOG_CONTENT_WIDTH)
          : this.isAllianceDialog && this.viewModel.directory
            ? (this.allianceDirectoryRowWidth ?? WORKSHOP_DIALOG_CONTENT_WIDTH)
            : this.isWorldEventDialog &&
                this.viewModel.rowWidget === 'worldEventQuest'
              ? this.scroll.width
              : this.isLeaderboardDialog ||
                  (this.isWorldEventDialog &&
                    (this.viewModel.rowWidget === 'leaderboard' ||
                      this.viewModel.rowWidget === 'worldEventReward'))
                ? (this.leaderboardRowWidth ?? WORKSHOP_DIALOG_CONTENT_WIDTH)
                : this.isAllianceDialog &&
                    this.viewModel.rowWidget === 'allianceQuest'
                  ? this.allianceQuestRowWidth || WORKSHOP_DIALOG_CONTENT_WIDTH
                  : WORKSHOP_DIALOG_CONTENT_WIDTH;
    const preferredHeights = widgets.map((widget) =>
      widget.getPreferredHeight(rowWidth),
    );
    const rowsGapHeight = Math.max(0, widgets.length - 1) * rowGap;
    const rowsHeight =
      preferredHeights.reduce((height, rowHeight) => height + rowHeight, 0) +
      rowsGapHeight;
    let y = this.isChatDialog
      ? Math.max(WORLD_CHAT_SCROLL_PADDING_TOP, this.scroll.height - rowsHeight)
      : contentPaddingTop;

    widgets.forEach((widget, index) => {
      const rowHeight = preferredHeights[index] ?? widget.getPreferredHeight();
      this.scroll.content.addChild(widget.root);
      this.scrollableRowLayouts.set(widget, {
        top: y,
        height: rowHeight,
      });
      widget.setBounds(0, y, rowWidth, rowHeight);
      y += rowHeight + rowGap;
    });

    const contentHeight = Math.max(
      this.isChatDialog ? WORLD_CHAT_SCROLL_PADDING_TOP : contentPaddingTop,
      y - (widgets.length > 0 ? rowGap : 0),
    );
    const locksWorldEventQuestScroll =
      this.isWorldEventDialog &&
      this.viewModel.rowWidget === 'worldEventQuest' &&
      widgets.length <= WORLD_EVENT_MAX_QUEST_ROWS;
    this.scroll.setContentHeight(
      locksWorldEventQuestScroll
        ? Math.min(contentHeight, this.scroll.height)
        : contentHeight,
    );
    if (locksWorldEventQuestScroll) {
      this.scroll.scrollTo(0);
    } else if (this.isChatDialog) {
      const selectedRow = widgets.find(
        (widget) => widget.selectedForReport === true,
      );
      const selectedLayout = selectedRow
        ? this.scrollableRowLayouts.get(selectedRow)
        : null;
      if (selectedLayout) {
        const viewportTop = this.scroll.offsetY;
        const viewportBottom = viewportTop + this.scroll.height;
        const selectedBottom = selectedLayout.top + selectedLayout.height;
        if (selectedLayout.top < viewportTop) {
          this.scroll.scrollTo(selectedLayout.top);
        } else if (selectedBottom > viewportBottom) {
          this.scroll.scrollTo(selectedBottom - this.scroll.height);
        }
      }
    }
    this.updateScrollableRowVisibility();
  }

  orderDiscoveryPages(widgets = this.rows?.getWidgets?.() ?? []) {
    if (!this.discoveryBook) {
      return;
    }

    this.discoveryBook.removeChildren();
    this.clampDiscoverySpread(widgets.length);
    const start = this.discoverySpreadIndex * 2;
    const visiblePages = widgets.slice(start, start + 2);
    for (const widget of widgets) {
      const visible = visiblePages.includes(widget);
      widget.root.visible = visible;
      widget.root.renderable = visible;
    }
    visiblePages.forEach((widget, index) => {
      this.discoveryBook.addChild(widget.root);
      widget.setBounds(
        index === 0 ? 0 : DISCOVERY_PAGE_WIDTH + DISCOVERY_PAGE_GAP,
        0,
        DISCOVERY_PAGE_WIDTH,
        DISCOVERY_PAGE_HEIGHT,
      );
    });
    if (widgets.length === 0) {
      this.discoveryEmptyPages.forEach((page, index) => {
        page.position.set(
          index === 0 ? 0 : DISCOVERY_PAGE_WIDTH + DISCOVERY_PAGE_GAP,
          0,
        );
        page.setSize(DISCOVERY_PAGE_WIDTH, DISCOVERY_PAGE_HEIGHT);
        this.discoveryBook.addChild(page);
      });
      this.discoveryEmptyText.position.set(
        DISCOVERY_PAGE_CONTENT_INSET,
        DISCOVERY_PAGE_CONTENT_INSET + 5,
      );
      this.discoveryBook.addChild(this.discoveryEmptyText);
    }

    const pageCount = Math.max(1, widgets.length);
    const leftPage = Math.min(pageCount, start + 1);
    const rightPage = Math.min(pageCount, start + 2);
    setText(
      this.discoveryPageLabel,
      widgets.length > 1
        ? `${leftPage}-${rightPage} / ${pageCount}`
        : `${leftPage} / ${pageCount}`,
    );
    this.discoveryPrevious.setEnabled(this.discoverySpreadIndex > 0);
    this.discoveryNext.setEnabled(
      this.discoverySpreadIndex <
        this.getDiscoverySpreadCount(widgets.length) - 1,
    );
  }

  showPreviousDiscoverySpread() {
    if (!this.isDiscoveriesDialog || this.discoverySpreadIndex <= 0) {
      return false;
    }
    this.discoverySpreadIndex -= 1;
    this.viewModel.actions?.turnSpread?.(this.discoverySpreadIndex);
    this.orderDiscoveryPages();
    return true;
  }

  showNextDiscoverySpread() {
    const rowCount = this.rows?.getWidgets?.().length ?? 0;
    if (
      !this.isDiscoveriesDialog ||
      this.discoverySpreadIndex >= this.getDiscoverySpreadCount(rowCount) - 1
    ) {
      return false;
    }
    this.discoverySpreadIndex += 1;
    this.viewModel.actions?.turnSpread?.(this.discoverySpreadIndex);
    this.orderDiscoveryPages();
    return true;
  }

  clampDiscoverySpread(rowCount) {
    this.discoverySpreadIndex = Math.min(
      Math.max(0, Math.floor(Number(this.discoverySpreadIndex)) || 0),
      this.getDiscoverySpreadCount(rowCount) - 1,
    );
  }

  getDiscoverySpreadCount(rowCount = this.rows?.getWidgets?.().length ?? 0) {
    return Math.max(1, Math.ceil(rowCount / 2));
  }

  updateScrollableRowVisibility() {
    if (!this.scrollableRowLayouts || !this.scroll) {
      return;
    }

    const viewportHeight = this.scroll.height;
    if (viewportHeight <= 0) {
      for (const widget of this.scrollableRowLayouts.keys()) {
        widget.root.renderable = true;
      }
      return;
    }

    const viewportTop = this.scroll.offsetY - SCROLL_ROW_RENDER_BUFFER;
    const viewportBottom =
      this.scroll.offsetY + viewportHeight + SCROLL_ROW_RENDER_BUFFER;
    for (const [widget, layout] of this.scrollableRowLayouts) {
      widget.root.renderable =
        layout.top + layout.height >= viewportTop &&
        layout.top <= viewportBottom;
    }
  }

  orderOwnedAllianceTradeRows(widgets) {
    const section = this.allianceTradeSection;
    if (!section) {
      return;
    }
    section.rowsLayer.removeChildren();
    let y = 0;
    for (const widget of widgets) {
      const rowHeight = widget.getPreferredHeight();
      section.rowsLayer.addChild(widget.root);
      widget.setBounds(0, y, WORKSHOP_DIALOG_CONTENT_WIDTH, rowHeight);
      y += rowHeight;
    }
    this.ownedAllianceTradeRowsHeight = y;
  }

  orderOwnedAllianceMemberRows(widgets) {
    const scroll = this.allianceMembersSection?.scroll;
    if (!scroll) {
      return;
    }
    scroll.content.removeChildren();
    let y = 0;
    const rowWidth =
      this.allianceMemberRowWidth ?? WORKSHOP_DIALOG_CONTENT_WIDTH;
    const rowX = this.allianceMemberRowX ?? 0;
    for (const widget of widgets) {
      scroll.content.addChild(widget.root);
      widget.setBounds(rowX, y, rowWidth, ALLIANCE_MEMBER_ROW_HEIGHT);
      y += ALLIANCE_MEMBER_ROW_HEIGHT;
    }
    scroll.setContentHeight(y);
  }

  orderPersonalTaskRows(widgets) {
    this.scroll.content.removeChildren();
    const sectionModels = normalizeRows(this.viewModel.periodSections);
    const paperOutsets = resolveDialogPaperOutsets({
      top: PIXI_UI_GEOMETRY.dialogPadding,
      right: PIXI_UI_GEOMETRY.dialogPadding,
      bottom: PIXI_UI_GEOMETRY.dialogPadding,
      left: PIXI_UI_GEOMETRY.dialogPadding,
    });
    let y = 0;

    for (const chrome of this.personalTaskSectionChrome?.values?.() ?? []) {
      chrome.root.visible = false;
      chrome.root.renderable = false;
      chrome.rowLayer.removeChildren();
    }

    for (const section of sectionModels) {
      const chrome = this.personalTaskSectionChrome?.get(section.id);
      if (!chrome) {
        continue;
      }

      const sectionRows = widgets.filter(
        (widget) => widget.model?.sectionId === section.id,
      );
      const rowsHeight = sectionRows.reduce(
        (height, widget, index) =>
          height +
          widget.getPreferredHeight() +
          (index > 0 ? PERSONAL_TASK_SECTION_ROW_GAP : 0),
        0,
      );
      const contentY = paperOutsets.top;
      const contentHeight = PERSONAL_TASK_SECTION_HEADER_HEIGHT + rowsHeight;
      const sectionHeight =
        paperOutsets.top + contentHeight + paperOutsets.bottom;

      chrome.root.position.set(0, y);
      chrome.root.visible = true;
      chrome.root.renderable = true;
      setDialogPaperSectionBounds(
        chrome.paper,
        {
          x: PIXI_UI_GEOMETRY.dialogPadding,
          y: contentY,
          width: WORKSHOP_DIALOG_CONTENT_WIDTH,
          height: contentHeight,
        },
        paperOutsets,
      );
      setText(chrome.title, section.title ?? section.id);
      setText(chrome.points, section.pointsLabel ?? '');
      setText(chrome.reset, section.resetLabel ?? '');
      setText(chrome.detail, section.detail ?? '');
      chrome.title.position.set(PIXI_UI_GEOMETRY.dialogPadding, contentY + 4);
      chrome.points.position.set(
        PIXI_UI_GEOMETRY.dialogPadding + WORKSHOP_DIALOG_CONTENT_WIDTH,
        contentY + 4,
      );
      chrome.reset.position.set(PIXI_UI_GEOMETRY.dialogPadding, contentY + 20);
      chrome.detail.position.set(
        PIXI_UI_GEOMETRY.dialogPadding + WORKSHOP_DIALOG_CONTENT_WIDTH,
        contentY + 20,
      );
      chrome.progress.setBounds(
        PIXI_UI_GEOMETRY.dialogPadding,
        contentY + 34,
        WORKSHOP_DIALOG_CONTENT_WIDTH,
        PIXI_UI_GEOMETRY.progressTotalHeight,
      );
      chrome.progress.setProgress(section.progress ?? 0);
      chrome.dividers.clear();

      let rowY = contentY + PERSONAL_TASK_SECTION_HEADER_HEIGHT;
      sectionRows.forEach((widget, index) => {
        if (index > 0) {
          chrome.dividers
            .moveTo(PIXI_UI_GEOMETRY.dialogPadding, rowY - 1)
            .lineTo(
              PIXI_UI_GEOMETRY.dialogPadding + WORKSHOP_DIALOG_CONTENT_WIDTH,
              rowY - 1,
            )
            .stroke({
              color: this.contentTheme.stroke,
              alpha: 0.28,
              width: 1,
            });
        }
        chrome.rowLayer.addChild(widget.root);
        widget.setBounds(
          PIXI_UI_GEOMETRY.dialogPadding,
          rowY,
          WORKSHOP_DIALOG_CONTENT_WIDTH,
          widget.getPreferredHeight(),
        );
        rowY += widget.getPreferredHeight() + PERSONAL_TASK_SECTION_ROW_GAP;
      });

      this.scroll.content.addChild(chrome.root);
      y += sectionHeight + PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap;
    }

    this.scroll.setContentHeight(
      Math.max(0, y - PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap),
    );
  }

  orderTabs(buttons) {
    this.tabsLayer.removeChildren();

    for (const button of buttons) {
      this.tabsLayer.addChild(button.root);
    }
  }

  orderPeriodTabs(buttons) {
    if (!this.periodTabsLayer) {
      return;
    }
    this.periodTabsLayer.removeChildren();
    for (const button of buttons) {
      this.periodTabsLayer.addChild(button.root);
    }
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    const contentTheme = this.modal.getContentTheme();
    this.contentTheme = contentTheme;
    applyTextTheme(this.copy, contentTheme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: 264,
    });
    applyTextTheme(this.headerHeadline, contentTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      wordWrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
    });
    applyTextTheme(this.headerBody, contentTheme, {
      ...RETAINED_TEXT_STYLES.border,
      lineHeight: 14,
      wordWrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
    });
    applyTextTheme(this.headerMeta, contentTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: contentTheme.muted,
      wordWrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
    });
    applyTextTheme(this.status, contentTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: contentTheme.muted,
      wordWrapWidth: 264,
    });
    this.discoveryPrevious?.applyTheme(contentTheme);
    this.discoveryNext?.applyTheme(contentTheme);
    if (this.discoveryPageLabel) {
      applyTextTheme(this.discoveryPageLabel, this.theme, {
        ...RETAINED_TEXT_STYLES.border,
        align: 'center',
        fill: this.theme.text,
      });
    }
    if (this.discoveryEmptyText) {
      applyTextTheme(this.discoveryEmptyText, contentTheme, {
        ...RETAINED_TEXT_STYLES.body,
        fill: contentTheme.muted,
        wordWrapWidth: DISCOVERY_PAGE_WIDTH - DISCOVERY_PAGE_CONTENT_INSET * 2,
      });
    }

    const allRows = new Set([
      ...(this.defaultRows?.getWidgets?.() ?? []),
      ...(this.allianceRows?.getWidgets?.() ?? []),
      ...(this.allianceMemberRows?.getWidgets?.() ?? []),
      ...(this.allianceQuestRows?.getWidgets?.() ?? []),
      ...(this.worldEventRows?.getWidgets?.() ?? []),
    ]);
    for (const row of allRows) {
      row.applyTheme(contentTheme);
    }

    for (const button of this.tabs?.getWidgets?.() ?? []) {
      button.applyTheme(contentTheme);
    }
    for (const button of this.periodTabs?.getWidgets?.() ?? []) {
      button.applyTheme(contentTheme);
    }
    this.allianceSettingsPane?.applyTheme(contentTheme);

    for (const chrome of this.personalTaskSectionChrome?.values?.() ?? []) {
      applyTextTheme(chrome.title, contentTheme, {
        ...RETAINED_TEXT_STYLES.bold,
      });
      applyTextTheme(chrome.points, contentTheme, {
        ...RETAINED_TEXT_STYLES.bold,
        align: 'right',
      });
      applyTextTheme(chrome.reset, contentTheme, {
        ...RETAINED_TEXT_STYLES.border,
        fill: contentTheme.muted,
      });
      applyTextTheme(chrome.detail, contentTheme, {
        ...RETAINED_TEXT_STYLES.border,
        align: 'right',
        fill: contentTheme.muted,
      });
      chrome.progress.applyTheme(contentTheme);
    }

    if (this.allianceTradeSection) {
      applyTextTheme(this.allianceTradeSection.title, contentTheme, {
        ...RETAINED_TEXT_STYLES.bold,
      });
      applyTextTheme(this.allianceTradeSection.identity, contentTheme, {
        ...RETAINED_TEXT_STYLES.bold,
      });
      applyTextTheme(this.allianceTradeSection.detail, contentTheme, {
        ...RETAINED_TEXT_STYLES.border,
        lineHeight: 14,
        wordWrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
      });
      applyTextTheme(this.allianceMembersSection.title, contentTheme, {
        ...RETAINED_TEXT_STYLES.bold,
      });
      applyTextTheme(this.allianceMembersSection.count, contentTheme, {
        ...RETAINED_TEXT_STYLES.border,
        align: 'right',
        fill: contentTheme.muted,
      });
    }

    this.composerField?.applyTheme(contentTheme);
    this.composerSubmit?.applyTheme(contentTheme);
    if (this.directMessageName) {
      applyTextTheme(
        this.directMessageTag,
        contentTheme,
        RETAINED_TEXT_STYLES.bold,
      );
      this.directMessageTag.style.fill = this.directMessageTagColor;
      applyTextTheme(
        this.directMessageName,
        contentTheme,
        RETAINED_TEXT_STYLES.bold,
      );
      applyTextTheme(
        this.directMessageLevel,
        contentTheme,
        RETAINED_TEXT_STYLES.border,
      );
      applyTextTheme(
        this.directMessageExpandGlyph,
        contentTheme,
        RETAINED_TEXT_STYLES.bold,
      );
    }
    this.directMessageUnfriend?.applyTheme(contentTheme);
  }

  layout(viewportProjection) {
    this.viewportProjection =
      viewportProjection ?? this.viewportProjection ?? {};
    viewportProjection = this.viewportProjection;
    const keepWorldChatPinnedToNewest =
      this.isChatDialog &&
      this.scroll.offsetY >=
        Math.max(0, this.scroll.contentHeight - this.scroll.height) - 0.5;
    this.sourceWidth =
      Number(viewportProjection?.sourceWidth) || PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || PIXI_UI_GEOMETRY.sourceHeight;
    if (this.isDiscoveriesDialog) {
      this.layoutDiscoveriesDialog(viewportProjection);
      return;
    }
    const frameOutset = PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
    const width = this.isChatDialog ? this.sourceWidth - frameOutset * 2 : 304;
    if (this.isChatDialog) {
      this.scrollViewportWidth = width - WORLD_CHAT_CONTENT_INSET_X * 2;
    }
    const tabs = this.tabs.getWidgets();
    const tabsInShellFooter = tabs.length > 0;
    const composerHeight =
      this.composerField?.visible === true ? WORLD_CHAT_COMPOSER_HEIGHT : 0;
    const baseHeight = this.isChatDialog
      ? WORLD_CHAT_DIALOG_HEIGHT
      : this.isFriendsDialog
        ? FRIENDS_DIALOG_HEIGHT
        : this.isWorldEventDialog
          ? this.worldEventHeaderArt?.visible === true
            ? 590
            : 486
          : this.isPersonalTasksDialog
            ? 470
            : this.isAllianceDialog
              ? TRADE_ALLIANCE_DIALOG_HEIGHT
              : 382;
    const viewportReserve = this.isChatDialog ? 80 : 118;
    const hasPrimaryVerticalScroll =
      this.isAllianceDialog ||
      (!this.isWorldEventDialog && !this.ownedAllianceLayout);
    let height = hasPrimaryVerticalScroll
      ? resolveAdaptiveDialogHeight({
          viewportHeight: this.sourceHeight,
          baseHeight,
          minimumHeight: this.isChatDialog ? 360 : 260,
          maximumHeight: this.sourceHeight - viewportReserve,
          hasPrimaryVerticalScroll: true,
        })
      : Math.min(baseHeight, this.sourceHeight - viewportReserve);
    const panelX = this.isChatDialog
      ? frameOutset
      : (this.sourceWidth - width) / 2;
    const centeredPanelY = (this.sourceHeight - height) / 2;
    const keyboardShift = this.isChatDialog
      ? Math.min(0, Number(viewportProjection?.worldChatShift) || 0)
      : 0;
    let panelY = this.isChatDialog
      ? Math.max(
          WORLD_CHAT_DIALOG_MIN_TOP,
          this.sourceHeight - height - frameOutset,
        ) + keyboardShift
      : centeredPanelY;
    if (this.isChatDialog && keyboardShift < 0) {
      const keyboardPanelY =
        WORLD_CHAT_DIALOG_MIN_TOP +
        frameOutset +
        PIXI_ROOT_RUN_GEOMETRY.dialog.titleHeight +
        WORLD_CHAT_HEADER_SHELL_GAP;
      const keyboardCoreBottom =
        this.sourceHeight + keyboardShift - frameOutset;
      height = Math.min(
        height,
        Math.max(
          PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
          keyboardCoreBottom - keyboardPanelY,
        ),
      );
      panelY = Math.min(keyboardPanelY, keyboardCoreBottom - height);
    }
    if (this.isChatDialog) {
      const animatedBounds = this.resolveWorldChatMotionBounds({
        y: panelY,
        height,
      });
      panelY = animatedBounds.y;
      height = animatedBounds.height;
    }
    this.modal.layout(viewportProjection);
    this.modal.setBounds(panelX, panelY, width, height);
    let shellFooterPaperReduction = 0;
    let footerTabLayout = null;
    if (tabsInShellFooter) {
      footerTabLayout = this.isBagDialog
        ? resolveBagFooterTabLayout({
            coreWidth: this.panel.coreWidth,
            coreHeight: this.panel.coreHeight,
            tabCount: tabs.length,
          })
        : resolveDialogFooterTabLayout({
            coreWidth: this.panel.coreWidth,
            coreHeight: this.panel.coreHeight,
            tabCount: tabs.length,
          });
    }
    if (this.isWorldEventDialog) {
      this.layoutWorldEventDialog({
        width,
        height,
        tabs,
        footerTabLayout,
      });
      return;
    }
    if (this.isPersonalTasksDialog) {
      this.layoutPersonalTasksDialog({
        width,
        height,
        tabs,
        footerTabLayout,
      });
      return;
    }
    if (this.ownedAllianceLayout) {
      this.layoutOwnedAllianceDialog({
        width,
        height,
        tabs,
        footerTabLayout,
      });
      return;
    }
    if (footerTabLayout) {
      const paperBottom = setDialogPaperAboveFooterTabs(
        this.panel,
        footerTabLayout,
      );
      const defaultPaperBottom = height - DIALOG_PAPER_BOTTOM_INSET;
      shellFooterPaperReduction = Math.max(0, defaultPaperBottom - paperBottom);
    }
    if (this.isAllianceDialog && this.viewModel.settings) {
      this.layoutAllianceSettingsDialog({
        height,
        tabs,
        footerTabLayout,
      });
      return;
    }
    if (this.isLeaderboardDialog) {
      this.layoutLeaderboardDialog({
        footerTabLayout,
        height,
        tabs,
      });
      return;
    }
    const usesAllianceQuestRows =
      this.isAllianceDialog && this.viewModel.rowWidget === 'allianceQuest';
    const usesAllianceDirectoryRows =
      this.isAllianceDialog && this.viewModel.directory === true;
    if (!tabsInShellFooter && this.isChatDialog && composerHeight > 0) {
      const paperBottom = height - 52;
      this.panel.paperFrame.setSize(
        this.panel.paperFrame.frameWidth,
        Math.max(0, paperBottom - this.panel.paperFrame.y),
        PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
      );
    }
    const directMessageMessageTop = this.isDirectMessageDialog
      ? this.layoutDirectMessageSections()
      : null;
    this.copy.position.set(20, 18);
    const copyHeight = this.copy.text ? Math.ceil(this.copy.height) + 8 : 0;
    this.headerHeadline.position.set(20, DIALOG_SCROLL_VIEWPORT_TOP);
    this.headerBody.position.set(
      20,
      DIALOG_SCROLL_VIEWPORT_TOP +
        (this.headerHeadline.text
          ? Math.ceil(this.headerHeadline.height) + 4
          : 0),
    );
    this.headerMeta.position.set(
      20,
      this.headerBody.y +
        (this.headerBody.text ? Math.ceil(this.headerBody.height) + 4 : 0),
    );
    const headerHeight =
      directMessageMessageTop === null
        ? this.headerHeadline.visible
          ? this.headerMeta.y -
            DIALOG_SCROLL_VIEWPORT_TOP +
            Math.ceil(this.headerMeta.height) +
            8
          : 0
        : Math.max(0, directMessageMessageTop - DIALOG_SCROLL_VIEWPORT_TOP);
    const statusHeight = this.status.text ? 18 : 0;
    const bagListLayout = this.isBagDialog
      ? resolveRetainedDialogListLayout({
          bodyWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
          paperRight:
            WORKSHOP_DIALOG_CONTENT_WIDTH +
            resolveDialogPaperOutsets({
              top: PIXI_UI_GEOMETRY.dialogPadding,
              right: PIXI_UI_GEOMETRY.dialogPadding,
              bottom: PIXI_UI_GEOMETRY.dialogPadding,
              left: PIXI_UI_GEOMETRY.dialogPadding,
            }).right,
          rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
        })
      : null;
    if (bagListLayout) {
      this.bagRowWidth = bagListLayout.rowWidth;
    }
    const allianceDirectoryListLayout = usesAllianceDirectoryRows
      ? {
          x:
            (WORKSHOP_DIALOG_CONTENT_WIDTH - ALLIANCE_DIRECTORY_PAPER_WIDTH) /
            2,
          viewportWidth:
            ALLIANCE_DIRECTORY_PAPER_WIDTH +
            RETAINED_DIALOG_LIST_GEOMETRY.scrollbarViewportOutset,
          rowWidth:
            ALLIANCE_DIRECTORY_PAPER_WIDTH +
            PIXI_ROOT_RUN_GEOMETRY.settings.rowGap,
        }
      : null;
    if (allianceDirectoryListLayout) {
      this.allianceDirectoryRowWidth = allianceDirectoryListLayout.rowWidth;
    }
    const allianceQuestListLayout = usesAllianceQuestRows
      ? resolveRetainedDialogListLayout({
          bodyWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
          paperRight:
            WORKSHOP_DIALOG_CONTENT_WIDTH +
            PIXI_UI_GEOMETRY.dialogPadding +
            14 / 3,
          rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
        })
      : null;
    if (allianceQuestListLayout) {
      this.allianceQuestRowWidth = allianceQuestListLayout.rowWidth;
    }
    this.scroll.setBounds(
      this.isChatDialog
        ? WORLD_CHAT_CONTENT_INSET_X
        : this.isFriendsDialog
          ? 0
          : bagListLayout
            ? 20 + bagListLayout.x
            : allianceDirectoryListLayout
              ? 20 + allianceDirectoryListLayout.x
              : usesAllianceQuestRows
                ? 20 + allianceQuestListLayout.x
                : 20,
      DIALOG_SCROLL_VIEWPORT_TOP +
        copyHeight +
        headerHeight +
        this.scrollViewportTopInset,
      usesAllianceQuestRows
        ? allianceQuestListLayout.viewportWidth
        : this.isFriendsDialog
          ? PIXI_DIALOG_BASE_GEOMETRY.contentWidth
          : allianceDirectoryListLayout
            ? allianceDirectoryListLayout.viewportWidth
            : bagListLayout
              ? bagListLayout.viewportWidth
              : this.scrollViewportWidth,
      height -
        DIALOG_SCROLL_VIEWPORT_TOP -
        (usesAllianceQuestRows
          ? ALLIANCE_QUEST_SCROLL_BOTTOM_INSET
          : DIALOG_SCROLL_VIEWPORT_BOTTOM_INSET) -
        copyHeight -
        headerHeight -
        statusHeight -
        composerHeight -
        shellFooterPaperReduction -
        this.scrollViewportTopInset,
    );
    if (
      this.isChatDialog ||
      bagListLayout ||
      allianceDirectoryListLayout ||
      usesAllianceQuestRows
    ) {
      this.orderRows(this.rows.getWidgets());
    }
    this.tabsLayer.position.set(
      footerTabLayout?.rowX ?? width / 2,
      footerTabLayout?.rowY ?? height,
    );
    this.tabsLayer.visible = tabs.length > 0;
    const gap = footerTabLayout?.gap ?? 0;
    const tabWidth = footerTabLayout?.tabWidth ?? 0;
    for (const [index, button] of tabs.entries()) {
      const columnCount = footerTabLayout?.columnCount ?? tabs.length;
      const rowIndex = Math.floor(index / columnCount);
      const columnIndex = index % columnCount;
      const itemsInRow = Math.min(
        columnCount,
        tabs.length - rowIndex * columnCount,
      );
      const rowWidth =
        itemsInRow * tabWidth + Math.max(0, itemsInRow - 1) * gap;
      const rowOffsetX = Math.max(
        0,
        ((footerTabLayout?.rowWidth ?? rowWidth) - rowWidth) / 2,
      );
      button.setBounds(
        rowOffsetX + columnIndex * (tabWidth + gap),
        rowIndex *
          (PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight +
            (footerTabLayout?.rowGap ?? 0)),
        tabWidth,
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      );
    }

    const centersAllianceRequestEmpty =
      this.isAllianceDialog &&
      this.viewModel.rowWidget === 'playerRelationship' &&
      this.rows.getWidgets().length === 0 &&
      Boolean(this.status.text);
    this.status.style.align = centersAllianceRequestEmpty ? 'center' : 'left';
    this.status.position.set(
      20,
      centersAllianceRequestEmpty
        ? this.scroll.root.y +
            Math.max(0, (this.scroll.height - statusHeight) / 2)
        : height -
            24 -
            statusHeight -
            composerHeight -
            shellFooterPaperReduction,
    );

    if (this.composerField) {
      const composerLeft = this.panel.paperFrame.x;
      const composerRight =
        this.panel.paperFrame.x + this.panel.paperFrame.frameWidth;
      const sendX =
        composerRight -
        WORLD_CHAT_COMPOSER_INSET_RIGHT -
        WORLD_CHAT_COMPOSER_SEND_WIDTH;
      const composerY = height - 40;
      this.composerField.position.set(composerLeft, composerY);
      this.composerField.setSize(
        sendX - WORLD_CHAT_COMPOSER_GAP - composerLeft,
        WORLD_CHAT_COMPOSER_FIELD_HEIGHT,
      );
      this.composerSubmit.setBounds(
        sendX,
        composerY,
        WORLD_CHAT_COMPOSER_SEND_WIDTH,
        WORLD_CHAT_COMPOSER_SEND_HEIGHT,
      );
    }
    if (keepWorldChatPinnedToNewest) {
      this.scroll.scrollTo(
        Math.max(0, this.scroll.contentHeight - this.scroll.height),
      );
    }
  }

  layoutDirectMessageSections() {
    const identityHeight = this.directMessageIdentityExpanded
      ? DIRECT_MESSAGE_IDENTITY_EXPANDED_HEIGHT
      : DIRECT_MESSAGE_IDENTITY_COLLAPSED_HEIGHT;
    const paperLeft = this.panel.paperFrame.x;
    const paperTop = this.panel.paperFrame.y;
    const paperWidth = this.panel.paperFrame.frameWidth;
    const paperBottom = paperTop + this.panel.paperFrame.frameHeight;
    const messageTop =
      paperTop + identityHeight + DIRECT_MESSAGE_IDENTITY_SECTION_GAP;

    this.panel.setPaperVisible(false);
    this.directMessageIdentitySection.position.set(paperLeft, paperTop);
    this.directMessageIdentityPaper.position.set(0, 0);
    this.directMessageIdentityPaper.setSize(
      paperWidth,
      identityHeight,
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
    );
    this.directMessageMessagePaper.position.set(paperLeft, messageTop);
    const minimumMessagePaperHeight =
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets.top +
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets.bottom;
    this.directMessageMessagePaper.setSize(
      paperWidth,
      Math.max(minimumMessagePaperHeight, paperBottom - messageTop),
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
    );

    const identityX = 10;
    const textX = identityX + DIRECT_MESSAGE_IDENTITY_AVATAR_SIZE + 10;
    this.directMessageProfile.position.set(identityX, 8);
    this.directMessageProfile.scale.set(
      DIRECT_MESSAGE_IDENTITY_AVATAR_SIZE / PLAYER_PROFILE_SIZE,
    );
    this.directMessageTag.position.set(textX, 13);
    this.directMessageName.position.set(
      textX +
        (this.directMessageTag.text
          ? Math.ceil(this.directMessageTag.width) + 4
          : 0),
      13,
    );
    this.directMessageLevel.position.set(textX, 33);
    this.directMessageExpandGlyph.position.set(paperWidth - 19, 23);
    this.directMessageIdentityHitTarget.position.set(0, 0);
    this.directMessageIdentityHitTarget.hitArea = new Rectangle(
      0,
      0,
      paperWidth,
      DIRECT_MESSAGE_IDENTITY_TOGGLE_HEIGHT,
    );
    this.directMessageUnfriend.position.set(textX, 61);
    this.directMessageUnfriend.setSize(
      DIRECT_MESSAGE_UNFRIEND_WIDTH,
      DIRECT_MESSAGE_UNFRIEND_HEIGHT,
    );
    return messageTop;
  }

  layoutDiscoveriesDialog(viewportProjection) {
    this.modal.layout(viewportProjection);
    this.modal.setBounds(
      (this.sourceWidth - DISCOVERY_DIALOG_OUTER_WIDTH) / 2,
      (this.sourceHeight - DISCOVERY_DIALOG_OUTER_HEIGHT) / 2,
      DISCOVERY_DIALOG_OUTER_WIDTH,
      DISCOVERY_DIALOG_OUTER_HEIGHT,
    );
    this.panel.setPaperVisible(false);
    for (const displayObject of [
      this.copy,
      this.headerHeadline,
      this.headerBody,
      this.headerMeta,
      this.scroll.root,
      this.status,
      this.tabsLayer,
    ]) {
      displayObject.visible = false;
      displayObject.renderable = false;
    }
    const bookX = -DISCOVERY_BOOK_SIDE_OVERFLOW;
    const controlsY =
      DISCOVERY_BOOK_TOP + DISCOVERY_PAGE_HEIGHT + DISCOVERY_PAGER_GAP;
    this.discoveryBook.position.set(bookX, DISCOVERY_BOOK_TOP);
    this.discoveryBook.hitArea = new Rectangle(
      0,
      0,
      DISCOVERY_BOOK_WIDTH,
      DISCOVERY_PAGE_HEIGHT,
    );
    this.discoveryPrevious.position.set(bookX, controlsY);
    this.discoveryPrevious.setSize(
      DISCOVERY_PAGER_BUTTON_WIDTH,
      DISCOVERY_PAGER_BUTTON_HEIGHT,
    );
    this.discoveryNext.position.set(
      bookX + DISCOVERY_BOOK_WIDTH - DISCOVERY_PAGER_BUTTON_WIDTH,
      controlsY,
    );
    this.discoveryNext.setSize(
      DISCOVERY_PAGER_BUTTON_WIDTH,
      DISCOVERY_PAGER_BUTTON_HEIGHT,
    );
    this.discoveryPageLabel.position.set(
      bookX + DISCOVERY_BOOK_WIDTH / 2,
      controlsY + 8,
    );
    this.orderDiscoveryPages();
  }

  resolveWorldChatMotionBounds(target) {
    const normalizedTarget = {
      y: Number(target?.y) || 0,
      height: Math.max(
        PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
        Number(target?.height) || 0,
      ),
    };
    const motion = this.worldChatMotion;
    if (!this.modal.active || this.reducedMotion() || !motion) {
      this.stopWorldChatMotion();
      this.worldChatMotion = createSettledWorldChatMotion(normalizedTarget);
      return normalizedTarget;
    }

    const now = this.timeSource();
    this.sampleWorldChatMotion(now);
    if (!sameWorldChatBounds(motion.target, normalizedTarget)) {
      motion.from = { ...motion.current };
      motion.target = normalizedTarget;
      motion.startedAt = now;
      motion.duration = WORLD_CHAT_RESIZE_DURATION_MS;
      motion.active = !sameWorldChatBounds(motion.from, motion.target);
    }
    this.sampleWorldChatMotion(now);
    if (motion.active) {
      this.scheduleWorldChatMotionFrame();
    }
    return { ...motion.current };
  }

  startWorldChatOpenMotion() {
    const target = this.modal.fixedBounds
      ? {
          y: this.modal.fixedBounds.y,
          height: this.modal.fixedBounds.height,
        }
      : null;
    if (!target || this.reducedMotion()) {
      this.stopWorldChatMotion();
      this.worldChatMotion = target
        ? createSettledWorldChatMotion(target)
        : null;
      return;
    }

    const startHeight = Math.min(
      target.height,
      Math.max(
        PIXI_DIALOG_BASE_GEOMETRY.minCoreHeight,
        WORLD_CHAT_OPEN_START_HEIGHT,
      ),
    );
    const bottom = target.y + target.height;
    const from = {
      y: bottom - startHeight,
      height: startHeight,
    };
    this.stopWorldChatMotion();
    this.worldChatMotion = {
      active: !sameWorldChatBounds(from, target),
      current: { ...from },
      from,
      target: { ...target },
      startedAt: this.timeSource(),
      duration: WORLD_CHAT_OPEN_DURATION_MS,
      frameId: 0,
    };
  }

  sampleWorldChatMotion(now = this.timeSource()) {
    const motion = this.worldChatMotion;
    if (!motion?.active) {
      return motion?.current ?? null;
    }
    const progress = Math.max(
      0,
      Math.min(1, (now - motion.startedAt) / motion.duration),
    );
    const eased = easeOutQuart(progress);
    motion.current = {
      y: interpolate(motion.from.y, motion.target.y, eased),
      height: interpolate(motion.from.height, motion.target.height, eased),
    };
    if (progress >= 1) {
      motion.active = false;
      motion.current = { ...motion.target };
    }
    return motion.current;
  }

  scheduleWorldChatMotionFrame() {
    const motion = this.worldChatMotion;
    if (!motion?.active || motion.frameId) {
      return;
    }
    motion.frameId = this.requestFrame(this.handleWorldChatMotionFrame);
  }

  tickWorldChatMotion() {
    const motion = this.worldChatMotion;
    if (!motion) {
      return;
    }
    motion.frameId = 0;
    if (!this.modal.active || !motion.active) {
      return;
    }
    this.layout(this.viewportProjection);
  }

  stopWorldChatMotion() {
    const frameId = this.worldChatMotion?.frameId;
    if (frameId) {
      this.cancelFrame(frameId);
    }
    if (this.worldChatMotion) {
      this.worldChatMotion.frameId = 0;
      this.worldChatMotion.active = false;
    }
  }

  layoutAllianceSettingsDialog({ height, tabs, footerTabLayout }) {
    const pane = this.allianceSettingsPane;
    if (!pane) {
      return;
    }
    this.copy.visible = false;
    this.copy.renderable = false;
    this.headerHeadline.visible = false;
    this.headerBody.visible = false;
    this.headerMeta.visible = false;
    this.status.visible = false;
    this.status.renderable = false;
    const creating = this.viewModel.settings?.mode === 'create';
    this.panel.setPaperVisible(!creating);
    const paneTop =
      this.panel.paperFrame.y +
      RETAINED_DIALOG_SCROLL_GEOMETRY.contentPaddingTop;
    const paperBottom =
      footerTabLayout?.paperBottom ?? height - DIALOG_PAPER_BOTTOM_INSET;
    pane.setBounds(
      creating ? 0 : PIXI_UI_GEOMETRY.dialogPadding,
      creating ? 0 : paneTop,
      WORKSHOP_DIALOG_CONTENT_WIDTH,
      Math.max(0, paperBottom - (creating ? 0 : paneTop)),
    );
    this.tabsLayer.position.set(
      footerTabLayout?.rowX ?? 152,
      footerTabLayout?.rowY ?? height,
    );
    this.tabsLayer.visible = tabs.length > 0;
    this.tabsLayer.renderable = this.tabsLayer.visible;
    const gap = footerTabLayout?.gap ?? 0;
    const tabWidth = footerTabLayout?.tabWidth ?? 0;
    tabs.forEach((button, index) => {
      button.setBounds(
        index * (tabWidth + gap),
        0,
        tabWidth,
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      );
    });
  }

  layoutLeaderboardDialog({ footerTabLayout, height, tabs }) {
    this.copy.visible = false;
    this.copy.renderable = false;
    this.headerHeadline.visible = false;
    this.headerHeadline.renderable = false;
    this.headerBody.visible = false;
    this.headerBody.renderable = false;
    this.headerMeta.visible = false;
    this.headerMeta.renderable = false;

    const periodTabs = this.periodTabs?.getWidgets?.() ?? [];
    const basePeriodTabLayout = resolveDialogFooterTabLayout({
      coreWidth: this.panel.coreWidth,
      coreHeight: this.panel.coreHeight,
      tabCount: periodTabs.length,
    });
    const periodRowY =
      (footerTabLayout?.rowY ?? basePeriodTabLayout.rowY) -
      PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight -
      LEADERBOARD_FOOTER_ROW_GAP;
    const periodTabLayout = {
      ...basePeriodTabLayout,
      rowY: periodRowY,
      paperBottom: periodRowY - PIXI_DIALOG_FOOTER_TABS_GEOMETRY.paperGap,
    };
    const paperBottom = setDialogPaperAboveFooterTabs(
      this.panel,
      periodTabLayout,
    );
    this.periodTabsLayer.position.set(
      periodTabLayout.rowX,
      periodTabLayout.rowY,
    );
    this.periodTabsLayer.visible = periodTabs.length > 0;
    this.periodTabsLayer.renderable = this.periodTabsLayer.visible;
    const alignPeriodPairsToScopeTabs =
      periodTabs.length === 4 && tabs.length === 2 && footerTabLayout;
    const periodPairWidth = alignPeriodPairsToScopeTabs
      ? footerTabLayout.tabWidth
      : 0;
    const periodTabWidth = alignPeriodPairsToScopeTabs
      ? (periodPairWidth - periodTabLayout.gap) / 2
      : periodTabLayout.tabWidth;
    periodTabs.forEach((button, index) => {
      const pairIndex = Math.floor(index / 2);
      const indexInPair = index % 2;
      const buttonX = alignPeriodPairsToScopeTabs
        ? pairIndex * (periodPairWidth + footerTabLayout.gap) +
          indexInPair * (periodTabWidth + periodTabLayout.gap)
        : index * (periodTabLayout.tabWidth + periodTabLayout.gap);
      button.setBounds(
        buttonX,
        0,
        periodTabWidth,
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      );
    });

    const listLayout = resolveRetainedDialogListLayout({
      bodyWidth: WORKSHOP_DIALOG_CONTENT_WIDTH,
      paperRight:
        WORKSHOP_DIALOG_CONTENT_WIDTH + PIXI_UI_GEOMETRY.dialogPadding + 14 / 3,
      rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
    });
    const statusHeight = this.status.text ? 18 : 0;
    this.leaderboardRowWidth =
      listLayout.rowWidth + LEADERBOARD_LIST_LEFT_EXPANSION;
    this.scroll.setBounds(
      20 + listLayout.x - LEADERBOARD_LIST_LEFT_EXPANSION,
      LEADERBOARD_LIST_TOP,
      listLayout.viewportWidth + LEADERBOARD_LIST_LEFT_EXPANSION,
      Math.max(
        LEADERBOARD_ROW_HEIGHT,
        paperBottom - LEADERBOARD_LIST_TOP - 7 - statusHeight,
      ),
    );
    this.orderRows(this.rows.getWidgets());

    this.status.position.set(
      28,
      LEADERBOARD_LIST_TOP +
        Math.max(16, (this.scroll.height - statusHeight) / 2),
    );
    this.tabsLayer.position.set(
      footerTabLayout?.rowX ?? 152,
      footerTabLayout?.rowY ?? height,
    );
    this.tabsLayer.visible = tabs.length > 0;
    this.tabsLayer.renderable = this.tabsLayer.visible;
    const gap = footerTabLayout?.gap ?? 0;
    const tabWidth = footerTabLayout?.tabWidth ?? 0;
    tabs.forEach((button, index) => {
      button.setBounds(
        index * (tabWidth + gap),
        0,
        tabWidth,
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      );
    });
  }

  layoutPersonalTasksDialog({ width, height, tabs, footerTabLayout }) {
    this.panel.setPaperVisible(false);
    this.copy.visible = false;
    this.copy.renderable = false;
    this.headerHeadline.visible = false;
    this.headerBody.visible = false;
    this.headerMeta.visible = false;
    const statusHeight = this.status.text ? 16 : 0;
    const scrollTop = DIALOG_SCROLL_VIEWPORT_TOP;
    const paperBottom =
      footerTabLayout?.paperBottom ?? height - DIALOG_PAPER_BOTTOM_INSET;

    this.scroll.setBounds(
      0,
      scrollTop,
      width,
      Math.max(0, paperBottom - scrollTop - statusHeight),
    );
    this.status.position.set(
      PIXI_UI_GEOMETRY.dialogPadding,
      paperBottom - statusHeight,
    );
    this.orderRows(this.rows.getWidgets());

    this.tabsLayer.position.set(
      footerTabLayout?.rowX ?? width / 2,
      footerTabLayout?.rowY ?? height,
    );
    this.tabsLayer.visible = tabs.length > 0;
    this.tabsLayer.renderable = this.tabsLayer.visible;
    const gap = footerTabLayout?.gap ?? 0;
    const tabWidth = footerTabLayout?.tabWidth ?? 0;
    let tabX = 0;
    for (const button of tabs) {
      button.setBounds(
        tabX,
        0,
        tabWidth,
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      );
      tabX += tabWidth + gap;
    }
  }

  layoutOwnedAllianceDialog({ height, tabs, footerTabLayout }) {
    const trade = this.allianceTradeSection;
    const members = this.allianceMembersSection;
    if (!trade || !members) {
      return;
    }

    this.panel.setPaperVisible(false);
    this.copy.visible = false;
    this.copy.renderable = false;
    this.headerHeadline.visible = false;
    this.headerHeadline.renderable = false;
    this.headerBody.visible = false;
    this.headerBody.renderable = false;
    this.headerMeta.visible = false;
    this.headerMeta.renderable = false;
    this.scroll.root.visible = false;
    this.scroll.root.renderable = false;
    this.tabsLayer.visible = tabs.length > 0;
    this.tabsLayer.renderable = this.tabsLayer.visible;

    const paperOutsets = resolveDialogPaperOutsets({
      top: PIXI_UI_GEOMETRY.dialogPadding,
      right: PIXI_UI_GEOMETRY.dialogPadding,
      bottom: PIXI_UI_GEOMETRY.dialogPadding,
      left: PIXI_UI_GEOMETRY.dialogPadding,
    });
    const contentX = PIXI_UI_GEOMETRY.dialogPadding;
    const sectionFrameY = OWNED_ALLIANCE_SECTION_FRAME_TOP;
    const contentY = OWNED_ALLIANCE_SECTION_CONTENT_TOP;
    const contentWidth = WORKSHOP_DIALOG_CONTENT_WIDTH;

    trade.root.position.set(0, 0);
    trade.title.visible = false;
    trade.title.renderable = false;
    trade.title.position.set(contentX, contentY);
    trade.identity.position.set(contentX, contentY);
    const detailY = trade.identity.y + Math.ceil(trade.identity.height) + 2;
    trade.detail.position.set(contentX, detailY);
    trade.detail.style.wordWrap = true;
    trade.detail.style.wordWrapWidth = contentWidth;
    const rowsY =
      detailY + (trade.detail.text ? Math.ceil(trade.detail.height) + 4 : 0);
    trade.rowsLayer.position.set(contentX, rowsY);
    this.orderOwnedAllianceTradeRows(this.defaultRows.getWidgets());
    const tradeContentHeight =
      rowsY -
      sectionFrameY +
      (this.ownedAllianceTradeRowsHeight ?? 0) +
      OWNED_ALLIANCE_SECTION_CONTENT_BOTTOM;
    setDialogPaperSectionBounds(
      trade.paper,
      {
        x: contentX,
        y: sectionFrameY,
        width: contentWidth,
        height: tradeContentHeight,
      },
      paperOutsets,
    );
    const tradeSectionHeight = trade.paper.y + trade.paper.frameHeight;
    const membersY = this.ownedAllianceHomeLayout
      ? tradeSectionHeight + OWNED_ALLIANCE_SECTION_GAP - trade.paper.y
      : 0;
    const paperBottom = footerTabLayout?.paperBottom ?? height;
    const membersHeight = Math.max(80, paperBottom - membersY);
    const membersContentHeight = Math.max(
      40,
      membersHeight - sectionFrameY - paperOutsets.bottom,
    );

    members.root.position.set(0, membersY);
    const memberHeaderVisible = !this.ownedAllianceHomeLayout;
    members.title.visible = memberHeaderVisible;
    members.title.renderable = memberHeaderVisible;
    members.count.visible = memberHeaderVisible;
    members.count.renderable = memberHeaderVisible;
    members.title.position.set(contentX, contentY);
    members.count.position.set(contentX + contentWidth, contentY + 1);
    const memberScrollTop = memberHeaderVisible
      ? OWNED_ALLIANCE_MEMBER_SCROLL_TOP
      : 0;
    const statusHeight = this.status.text ? 16 : 0;
    const listLayout = resolveRetainedDialogListLayout({
      bodyWidth: contentWidth,
      paperRight: contentWidth + contentX + 14 / 3,
      rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
    });
    this.allianceMemberRowX = 0;
    this.allianceMemberRowWidth = listLayout.rowWidth;
    members.scroll.setBounds(
      contentX + listLayout.x,
      contentY + memberScrollTop,
      listLayout.viewportWidth,
      Math.max(
        ALLIANCE_MEMBER_ROW_HEIGHT,
        membersContentHeight -
          (contentY - sectionFrameY) -
          memberScrollTop -
          OWNED_ALLIANCE_SECTION_CONTENT_BOTTOM -
          statusHeight,
      ),
    );
    this.orderOwnedAllianceMemberRows(
      this.allianceMemberRows?.getWidgets?.() ?? [],
    );
    setDialogPaperSectionBounds(
      members.paper,
      {
        x: contentX,
        y: sectionFrameY,
        width: contentWidth,
        height: membersContentHeight,
      },
      paperOutsets,
    );
    this.status.position.set(
      contentX,
      membersY +
        sectionFrameY +
        membersContentHeight -
        OWNED_ALLIANCE_SECTION_CONTENT_BOTTOM -
        statusHeight,
    );
    this.tabsLayer.position.set(
      footerTabLayout?.rowX ?? 152,
      footerTabLayout?.rowY ?? height,
    );
    const gap = footerTabLayout?.gap ?? 0;
    const tabWidth = footerTabLayout?.tabWidth ?? 0;
    tabs.forEach((button, index) => {
      button.setBounds(
        index * (tabWidth + gap),
        0,
        tabWidth,
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      );
    });
  }

  layoutWorldEventDialog({ width, height, tabs, footerTabLayout }) {
    this.panel.setPaperVisible(false);
    this.copy.visible = false;
    this.copy.renderable = false;
    const paperOutsets = resolveDialogPaperOutsets({
      top: PIXI_UI_GEOMETRY.dialogPadding,
      right: PIXI_UI_GEOMETRY.dialogPadding,
      bottom: PIXI_UI_GEOMETRY.dialogPadding,
      left: PIXI_UI_GEOMETRY.dialogPadding,
    });
    const contentX = PIXI_UI_GEOMETRY.dialogPadding;
    const contentWidth = WORKSHOP_DIALOG_CONTENT_WIDTH;
    const headerY = PIXI_UI_GEOMETRY.dialogPadding;
    const hasHeader = this.headerHeadline.visible === true;
    const usesQuestSectionRows = this.viewModel.rowWidget === 'worldEventQuest';
    const usesLeaderboardRows =
      this.viewModel.rowWidget === 'leaderboard' ||
      this.viewModel.rowWidget === 'worldEventReward';
    const questRowsX = (width - WORLD_EVENT_QUEST_ROW_WIDTH) / 2;
    const hasHeaderArt = this.worldEventHeaderArt?.visible === true;
    const artX = contentX - WORLD_EVENT_HEADER_ART_HORIZONTAL_OUTSET;
    const artY = headerY + WORLD_EVENT_HEADER_CONTENT_INSET;
    const artWidth =
      contentWidth + WORLD_EVENT_HEADER_ART_HORIZONTAL_OUTSET * 2;
    const headerTextX = hasHeaderArt ? artX : contentX;
    const headerTextWidth = hasHeaderArt ? artWidth : contentWidth;

    if (hasHeaderArt) {
      this.worldEventHeaderArt.position.set(artX, artY);
      this.worldEventHeaderArt.width = artWidth;
      this.worldEventHeaderArt.height = WORLD_EVENT_HEADER_ART_HEIGHT;
      this.worldEventHeaderArtMask
        .clear()
        .roundRect(
          artX,
          artY,
          artWidth,
          WORLD_EVENT_HEADER_ART_HEIGHT,
          WORLD_EVENT_HEADER_ART_RADIUS,
        )
        .fill('#ffffff');
    } else {
      this.worldEventHeaderArtMask.clear();
    }

    this.headerHeadline.style.wordWrapWidth = headerTextWidth;
    this.headerBody.style.wordWrapWidth = headerTextWidth;
    this.headerMeta.style.wordWrapWidth = headerTextWidth;
    this.headerHeadline.position.set(
      headerTextX,
      hasHeaderArt
        ? artY + WORLD_EVENT_HEADER_ART_HEIGHT + WORLD_EVENT_HEADER_ART_GAP
        : headerY + WORLD_EVENT_HEADER_CONTENT_INSET,
    );
    this.headerBody.position.set(
      headerTextX,
      this.headerHeadline.y +
        (this.headerHeadline.text
          ? Math.ceil(this.headerHeadline.height) + 3
          : 0),
    );
    this.headerMeta.position.set(
      headerTextX,
      this.headerBody.y +
        (this.headerBody.text ? Math.ceil(this.headerBody.height) + 3 : 0),
    );
    const headerContentHeight = hasHeader
      ? Math.max(
          52,
          this.headerMeta.y +
            Math.ceil(this.headerMeta.height) +
            WORLD_EVENT_HEADER_CONTENT_INSET -
            headerY,
        )
      : 0;

    this.worldEventHeaderPaper.visible = hasHeader;
    this.worldEventHeaderPaper.renderable = hasHeader;
    if (hasHeader) {
      setDialogPaperSectionBounds(
        this.worldEventHeaderPaper,
        {
          x: contentX,
          y: headerY,
          width: contentWidth,
          height: headerContentHeight,
        },
        paperOutsets,
      );
    }

    const listFrameTop = hasHeader
      ? headerY +
        headerContentHeight +
        paperOutsets.bottom +
        WORLD_EVENT_SECTION_GAP
      : headerY - paperOutsets.top;
    const listY = listFrameTop + paperOutsets.top;
    const paperBottom =
      footerTabLayout?.paperBottom ?? height - DIALOG_PAPER_BOTTOM_INSET;
    const listHeight = Math.max(0, paperBottom - listY - paperOutsets.bottom);
    this.worldEventListPaper.visible = !usesQuestSectionRows;
    this.worldEventListPaper.renderable = !usesQuestSectionRows;
    if (!usesQuestSectionRows) {
      setDialogPaperSectionBounds(
        this.worldEventListPaper,
        {
          x: contentX,
          y: listY,
          width: contentWidth,
          height: listHeight,
        },
        paperOutsets,
      );
    }

    const statusHeight = this.status.text ? 16 : 0;
    const scrollY = usesQuestSectionRows
      ? listFrameTop
      : listY + WORLD_EVENT_LIST_CONTENT_INSET;
    const scrollBottom = usesQuestSectionRows
      ? paperBottom
      : listY + listHeight - WORLD_EVENT_LIST_CONTENT_INSET;
    const leaderboardListLayout = usesLeaderboardRows
      ? resolveRetainedDialogListLayout({
          bodyWidth: contentWidth,
          paperRight: contentX + contentWidth + 14 / 3,
          rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
        })
      : null;
    if (leaderboardListLayout) {
      this.leaderboardRowWidth =
        leaderboardListLayout.rowWidth + LEADERBOARD_LIST_LEFT_EXPANSION;
    }
    this.scroll.setBounds(
      usesQuestSectionRows
        ? questRowsX
        : usesLeaderboardRows
          ? contentX + leaderboardListLayout.x - LEADERBOARD_LIST_LEFT_EXPANSION
          : contentX,
      scrollY,
      usesQuestSectionRows
        ? WORLD_EVENT_QUEST_ROW_WIDTH
        : usesLeaderboardRows
          ? leaderboardListLayout.viewportWidth +
            LEADERBOARD_LIST_LEFT_EXPANSION
          : contentWidth,
      Math.max(0, scrollBottom - scrollY - statusHeight),
    );
    this.status.position.set(contentX, scrollBottom - statusHeight);
    this.orderRows(this.rows.getWidgets());

    this.tabsLayer.position.set(
      footerTabLayout?.rowX ?? width / 2,
      footerTabLayout?.rowY ?? height,
    );
    this.tabsLayer.visible = tabs.length > 0;
    this.tabsLayer.renderable = this.tabsLayer.visible;
    const gap = footerTabLayout?.gap ?? 0;
    const tabWidth = footerTabLayout?.tabWidth ?? 0;
    let tabX = 0;
    for (const button of tabs) {
      button.setBounds(
        tabX,
        0,
        tabWidth,
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      );
      tabX += tabWidth + gap;
    }
  }

  activate() {
    if (this.isFriendsDialog || this.isDirectMessageDialog) {
      this.viewModel.actions?.activate?.();
    }
    if (this.isChatDialog) {
      this.startWorldChatOpenMotion();
    }
    this.modal.activate();
    if (this.isChatDialog) {
      this.layout(this.viewportProjection);
      this.scroll.scrollTo(
        Math.max(0, this.scroll.contentHeight - this.scroll.height),
      );
    }
  }

  deactivate() {
    if (this.isFriendsDialog || this.isDirectMessageDialog) {
      this.viewModel.actions?.deactivate?.();
    }
    this.stopWorldChatMotion();
    this.composerSubmissionToken += 1;
    this.composerSubmitting = false;
    this.composerStatus = '';
    this.composerField?.blur();
    this.updateStatus();
    this.updateComposerControl();
    this.directMessageIdentityExpanded = false;
    this.syncDirectMessageIdentityState();
    this.modal.deactivate();
  }

  toggleDirectMessageIdentityActions() {
    if (
      !this.directMessageIdentitySection ||
      typeof this.viewModel.actions?.unfriend !== 'function'
    ) {
      return false;
    }
    this.directMessageIdentityExpanded = !this.directMessageIdentityExpanded;
    this.syncDirectMessageIdentityState();
    this.layout(this.viewportProjection);
    return true;
  }

  syncDirectMessageIdentityState() {
    if (!this.directMessageUnfriend) {
      return;
    }
    const canUnfriend = typeof this.viewModel.actions?.unfriend === 'function';
    const showAction = canUnfriend && this.directMessageIdentityExpanded;
    this.directMessageUnfriend.visible = showAction;
    this.directMessageUnfriend.renderable = showAction;
    this.directMessageUnfriend.setEnabled(showAction);
    this.directMessageExpandGlyph.visible = canUnfriend;
    this.directMessageExpandGlyph.renderable = canUnfriend;
  }

  activateDirectMessageUnfriend() {
    if (typeof this.viewModel.actions?.unfriend !== 'function') {
      return false;
    }
    const result = this.viewModel.actions.unfriend();
    this.directMessageIdentityExpanded = false;
    this.syncDirectMessageIdentityState();
    this.layout(this.viewportProjection);
    return result ?? true;
  }

  destroy() {
    this.stopWorldChatMotion();
    this.clearTargets();
    disposeInputRegistration(this.discoverySwipeRegistration);
    this.discoverySwipeRegistration = null;
    this.composerSubmissionToken += 1;
    this.composerField?.destroy({ children: true });
    this.composerField = null;
    this.composerSubmit?.destroy();
    this.composerSubmit = null;
    disposeInputRegistration(this.directMessageProfileRegistration);
    this.directMessageProfileRegistration = null;
    this.directMessageUnfriend?.destroy();
    this.directMessageUnfriend = null;

    this.defaultRows?.destroy();
    this.allianceRows?.destroy();
    this.allianceMemberRows?.destroy();
    this.allianceRequestRows?.destroy();
    this.allianceQuestRows?.destroy();
    this.worldEventRows?.destroy();
    this.worldEventLeaderboardRows?.destroy();
    this.worldEventRewardRows?.destroy();
    this.rows = null;
    this.defaultRows = null;
    this.allianceRows = null;
    this.allianceMemberRows = null;
    this.allianceRequestRows = null;
    this.allianceQuestRows = null;
    this.worldEventRows = null;
    this.worldEventLeaderboardRows = null;
    this.worldEventRewardRows = null;
    for (const chrome of this.personalTaskSectionChrome?.values?.() ?? []) {
      chrome.progress.destroy();
      chrome.root.destroy({ children: true });
    }
    this.personalTaskSectionChrome?.clear?.();
    this.personalTaskSectionChrome = null;
    this.rowPool.destroy();
    this.allianceRowPool?.destroy();
    this.allianceRowPool = null;
    this.allianceMemberRowPool?.destroy();
    this.allianceMemberRowPool = null;
    this.allianceRequestRowPool?.destroy();
    this.allianceRequestRowPool = null;
    this.allianceQuestRowPool?.destroy();
    this.allianceQuestRowPool = null;
    this.worldEventRowPool?.destroy();
    this.worldEventRowPool = null;
    this.worldEventLeaderboardRowPool?.destroy();
    this.worldEventLeaderboardRowPool = null;
    this.worldEventRewardRowPool?.destroy();
    this.worldEventRewardRowPool = null;
    this.tabs.destroy();
    this.tabPool.destroy();
    this.periodTabs?.destroy();
    this.periodTabPool?.destroy();
    this.periodTabs = null;
    this.periodTabPool = null;
    this.allianceSettingsPane?.destroy();
    this.allianceSettingsPane = null;
    this.allianceMembersSection?.scroll.destroy();
    this.discoveryPrevious?.destroy();
    this.discoveryPrevious = null;
    this.discoveryNext?.destroy();
    this.discoveryNext = null;
    this.scroll.destroy();
    this.modal.destroy();
  }

  bindComposer(model) {
    if (!this.composerField || !this.composerSubmit) {
      return;
    }

    this.composerModel = model && this.viewModel.onSubmit ? model : null;
    const visible = Boolean(this.composerModel);
    this.composerField.visible = visible;
    this.composerField.renderable = visible;
    this.composerSubmit.root.visible = visible;
    this.composerSubmit.root.renderable = visible;

    if (!visible) {
      this.composerField.blur();
      return;
    }

    this.composerField.placeholder =
      this.composerModel.placeholder ?? 'Message';
    this.composerField.maxLength = this.composerModel.maxLength ?? 160;
    this.composerField.inputKind = 'text';
    this.composerField.multiline = false;
    this.updateComposerControl();
  }

  updateComposerControl() {
    if (!this.composerSubmit) {
      return;
    }

    this.composerSubmit.setModel({
      label: 'Send',
      enabled: Boolean(
        this.composerModel && this.composerModel.enabled !== false,
      ),
      action: () => this.submitComposer(),
    });
  }

  async submitComposer() {
    const body = String(this.composerField?.value ?? '');
    if (
      this.composerSubmitting ||
      this.composerModel?.enabled === false ||
      !body.trim() ||
      typeof this.viewModel.onSubmit !== 'function'
    ) {
      this.updateComposerControl();
      return false;
    }

    const token = ++this.composerSubmissionToken;
    this.composerSubmitting = true;
    this.composerField.setValue('');
    this.updateComposerControl();

    let result;
    try {
      result = await this.viewModel.onSubmit(body);
    } catch {
      result = { ok: false, reason: 'send_failed' };
    }

    if (token !== this.composerSubmissionToken) {
      return false;
    }

    this.composerSubmitting = false;
    if (result?.ok !== true && this.composerField.value === '') {
      this.composerField.setValue(body);
    }
    this.updateStatus();
    this.updateComposerControl();
    return result?.ok === true;
  }

  updateStatus() {
    setText(
      this.status,
      this.isChatDialog ? '' : this.composerStatus || this.boundStatus || '',
    );
  }

  registerTarget(descriptor) {
    if (!this.semanticTargets || !descriptor.semanticId) {
      return;
    }

    this.unregisterTarget(descriptor.semanticId);
    this.semanticTargets.register(descriptor);
    this.registeredTargetIds.add(descriptor.semanticId);
  }

  unregisterTarget(semanticId) {
    if (!this.registeredTargetIds.delete(semanticId)) {
      return false;
    }

    return this.semanticTargets?.unregister(semanticId) ?? false;
  }

  clearTargets() {
    for (const semanticId of this.registeredTargetIds) {
      this.semanticTargets?.unregister(semanticId);
    }

    this.registeredTargetIds.clear();
  }
}

export class WorldEventDonationOptionRow {
  constructor({ dialog, index }) {
    this.dialog = dialog;
    this.root = new Container({
      label: `${dialog.dialogId}-quest-donation:${index}`,
    });
    this.backing = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      width: 100,
      height: WORLD_EVENT_QUEST_OPTION_HEIGHT,
      label: `${this.root.label}:backing`,
    });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.anchor.set(0.5);
    this.iconOverlay = new Sprite(Texture.EMPTY);
    this.iconOverlay.anchor.set(0.5);
    this.label = createText('', {
      fontSize: 10,
      lineHeight: 11,
      wordWrapWidth: 72,
    });
    this.points = createText('', {
      fontSize: 11,
      lineHeight: 12,
      align: 'right',
    });
    this.points.anchor.set(1, 0);
    this.total = createText('', {
      fontSize: 10,
      lineHeight: 11,
      align: 'right',
    });
    this.total.anchor.set(1, 0);
    this.action = new PixiTextButton({
      assetManager: dialog.assetManager,
      inputRouter: dialog.inputRouter,
      color: 'green',
      sizeTier: 30,
      width: WORLD_EVENT_QUEST_ACTION_WIDTH,
      height: WORLD_EVENT_QUEST_ACTION_HEIGHT,
      label: `${this.root.label}:action`,
    });
    this.root.addChild(
      this.backing,
      this.icon,
      this.iconOverlay,
      this.label,
      this.points,
      this.total,
      this.action,
    );
    this.root.visible = false;
  }

  bind(model) {
    this.unregisterTarget();
    this.model = model ?? {};
    this.root.visible = true;
    this.root.renderable = true;
    setText(this.label, this.model.label ?? 'Donation');
    setText(this.points, this.model.pointsEachLabel ?? '');
    setText(this.total, this.model.totalLabel ?? '');
    const iconFrames = resolveValueIconFrames(this.model);
    this.icon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      iconFrames.base,
    );
    this.iconOverlay.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      iconFrames.overlay,
    );
    this.icon.visible = this.icon.texture !== Texture.EMPTY;
    this.icon.renderable = this.icon.visible;
    this.iconOverlay.visible =
      this.icon.visible && this.iconOverlay.texture !== Texture.EMPTY;
    this.iconOverlay.renderable = this.iconOverlay.visible;
    const enabled =
      this.model.enabled === true &&
      typeof this.model.onActivate === 'function';
    this.action.bind(
      this.model.id,
      {
        label: this.model.actionLabel ?? (enabled ? 'Donate' : 'Unavailable'),
        enabled,
        notification: this.model.notification === true,
      },
      enabled ? () => this.model.onActivate?.(this.model) : null,
    );
    this.targetId = this.model.semanticId ?? null;
    if (this.targetId) {
      this.dialog.registerTarget({
        semanticId: this.targetId,
        displayObject: this.action,
        state: () => ({
          enabled,
          interactive: enabled,
          selected: false,
        }),
        activate: () =>
          enabled ? (this.model?.onActivate?.(this.model) ?? true) : false,
      });
    }
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  setBounds(x, y, width, height = WORLD_EVENT_QUEST_OPTION_HEIGHT) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.backing.position.set(0, 0);
    this.backing.setSize(
      width,
      height,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    const actionX = width - WORLD_EVENT_QUEST_ACTION_WIDTH - 6;
    const iconCenterX = 4 + WORLD_EVENT_QUEST_ICON_SIZE / 2;
    const iconCenterY = height / 2;
    if (this.iconOverlay.visible) {
      layoutPixiSeedPackIcon({
        base: this.icon,
        item: this.iconOverlay,
        x: iconCenterX,
        y: iconCenterY,
        width: WORLD_EVENT_QUEST_ICON_SIZE,
        height: WORLD_EVENT_QUEST_ICON_SIZE,
        fitPositionX: 1,
      });
    } else {
      this.icon.position.set(iconCenterX, iconCenterY);
      this.icon.width = WORLD_EVENT_QUEST_ICON_SIZE;
      this.icon.height = WORLD_EVENT_QUEST_ICON_SIZE;
      this.iconOverlay.rotation = 0;
    }
    const copyX = this.icon.visible ? WORLD_EVENT_QUEST_ICON_SIZE + 8 : 6;
    const copyRight = actionX - 7;
    this.label.position.set(copyX, Math.max(2, (height - 11) / 2));
    this.label.style.wordWrap = true;
    this.label.style.wordWrapWidth = Math.max(52, copyRight - copyX - 92);
    this.points.position.set(copyRight, 7);
    this.total.position.set(copyRight, 23);
    this.action.position.set(
      actionX,
      Math.max(0, (height - WORLD_EVENT_QUEST_ACTION_HEIGHT) / 2),
    );
    this.action.setSize(
      WORLD_EVENT_QUEST_ACTION_WIDTH,
      WORLD_EVENT_QUEST_ACTION_HEIGHT,
    );
    this.root.hitArea = new Rectangle(0, 0, width, height);
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? this.dialog.theme;
    this.backing.setTexture(
      this.dialog.assetManager?.getTexture?.(
        PIXI_ROOT_RUN_ASSETS.settingsRow,
      ) ?? Texture.EMPTY,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
    );
    applyTextTheme(this.label, resolvedTheme, {
      fontSize: 10,
      lineHeight: 11,
      fill: resolvedTheme.text,
      wordWrapWidth: this.label.style.wordWrapWidth ?? 72,
    });
    applyTextTheme(this.points, resolvedTheme, {
      fontSize: 11,
      lineHeight: 12,
      align: 'right',
      fill: resolvedTheme.text,
    });
    applyTextTheme(this.total, resolvedTheme, {
      fontSize: 10,
      lineHeight: 11,
      align: 'right',
      fill: resolvedTheme.text,
    });
    this.action.applyTheme(resolvedTheme);
  }

  reset() {
    this.unregisterTarget();
    this.model = null;
    this.icon.texture = Texture.EMPTY;
    this.iconOverlay.texture = Texture.EMPTY;
    this.iconOverlay.rotation = 0;
    this.root.visible = false;
    this.root.renderable = false;
    this.action.reset();
  }

  unregisterTarget() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    this.targetId = null;
  }

  destroy() {
    this.unregisterTarget();
    this.action.destroy();
    this.root.destroy({ children: true });
  }
}

/**
 * Image-backed World Event quest row derived from the Research station card.
 *
 * The quest owns its narrative and nested donation options while each option
 * reuses the shared green/gray text-button interaction and press contract.
 */
export class WorldEventQuestRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.root = new Container({
      label: `${dialog.dialogId}-quest-row`,
    });
    this.card = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.dialogPaper) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.paperSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
      width: WORKSHOP_DIALOG_CONTENT_WIDTH,
      height: 100,
      label: `${this.root.label}:card`,
    });
    this.title = createText('', {
      fontSize: 13,
      lineHeight: WORLD_EVENT_QUEST_TITLE_HEIGHT,
      fontWeight: '700',
      wordWrapWidth: 170,
    });
    this.points = createText('', {
      fontSize: 11,
      lineHeight: 13,
      align: 'right',
    });
    this.points.anchor.set(1, 0);
    this.description = createText('', {
      fontSize: 10,
      lineHeight: 12,
      wordWrapWidth:
        WORKSHOP_DIALOG_CONTENT_WIDTH - WORLD_EVENT_QUEST_CONTENT_INSET * 2,
    });
    this.progress = createText('', {
      fontSize: 10,
      lineHeight: 12,
    });
    this.progress.anchor.set(0, 1);
    this.status = createText('', {
      fontSize: 10,
      lineHeight: 12,
      align: 'right',
    });
    this.status.anchor.set(1, 1);
    this.options = Array.from(
      { length: WORLD_EVENT_MAX_DONATION_OPTIONS },
      (_, index) => new WorldEventDonationOptionRow({ dialog, index }),
    );
    this.root.addChild(
      this.card,
      this.title,
      this.points,
      this.description,
      this.progress,
      this.status,
      ...this.options.map((option) => option.root),
    );
    this.root.visible = false;
  }

  bind(model) {
    this.model = model ?? {};
    this.root.visible = true;
    this.root.renderable = true;
    setText(this.title, this.model.title ?? this.model.label ?? 'Quest');
    setText(this.points, this.model.pointsLabel ?? '');
    setText(this.description, this.model.description ?? '');
    setText(this.progress, this.model.progressLabel ?? '');
    setText(this.status, this.model.statusLabel ?? '');
    const options = normalizeRows(this.model.donationOptions).slice(
      0,
      WORLD_EVENT_MAX_DONATION_OPTIONS,
    );
    this.visibleOptionCount = options.length;
    this.options.forEach((option, index) => {
      if (options[index]) {
        option.bind(options[index]);
      } else {
        option.reset();
      }
    });
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  setBounds(x, y, width, height = this.getPreferredHeight()) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.card.position.set(0, 0);
    this.card.setSize(
      width,
      height,
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
    );
    this.title.position.set(
      WORLD_EVENT_QUEST_CONTENT_INSET,
      WORLD_EVENT_QUEST_CONTENT_TOP,
    );
    this.setTextWrapWidth(width);
    this.points.position.set(width - WORLD_EVENT_QUEST_CONTENT_INSET, 9);
    this.description.position.set(
      WORLD_EVENT_QUEST_CONTENT_INSET,
      WORLD_EVENT_QUEST_CONTENT_TOP +
        WORLD_EVENT_QUEST_TITLE_HEIGHT +
        WORLD_EVENT_QUEST_DESCRIPTION_GAP,
    );
    let optionY =
      this.description.y +
      Math.max(
        WORLD_EVENT_QUEST_MIN_DESCRIPTION_HEIGHT,
        Math.ceil(this.description.height),
      ) +
      8;
    for (const option of this.options) {
      if (!option.root.visible) {
        continue;
      }
      option.setBounds(
        WORLD_EVENT_QUEST_CONTENT_INSET,
        optionY,
        width - WORLD_EVENT_QUEST_CONTENT_INSET * 2,
        WORLD_EVENT_QUEST_OPTION_HEIGHT,
      );
      optionY += WORLD_EVENT_QUEST_OPTION_HEIGHT + WORLD_EVENT_QUEST_OPTION_GAP;
    }
    this.progress.position.set(WORLD_EVENT_QUEST_CONTENT_INSET, height - 8);
    this.status.position.set(
      width - WORLD_EVENT_QUEST_CONTENT_INSET,
      height - 8,
    );
    this.root.hitArea = new Rectangle(0, 0, width, height);
  }

  setTextWrapWidth(width) {
    this.title.style.wordWrap = true;
    this.title.style.wordWrapWidth = Math.max(
      80,
      width - WORLD_EVENT_QUEST_CONTENT_INSET * 2 - 84,
    );
    this.description.style.wordWrap = true;
    this.description.style.wordWrapWidth =
      width - WORLD_EVENT_QUEST_CONTENT_INSET * 2;
  }

  getPreferredHeight(width = this.width ?? WORLD_EVENT_QUEST_ROW_WIDTH) {
    this.setTextWrapWidth(width);
    const descriptionHeight = Math.max(
      WORLD_EVENT_QUEST_MIN_DESCRIPTION_HEIGHT,
      Math.ceil(this.description.height),
    );
    const optionsHeight =
      this.visibleOptionCount > 0
        ? this.visibleOptionCount * WORLD_EVENT_QUEST_OPTION_HEIGHT +
          Math.max(0, this.visibleOptionCount - 1) *
            WORLD_EVENT_QUEST_OPTION_GAP
        : this.progress.text || this.status.text
          ? 18
          : 0;
    return (
      WORLD_EVENT_QUEST_CONTENT_TOP +
      WORLD_EVENT_QUEST_TITLE_HEIGHT +
      WORLD_EVENT_QUEST_DESCRIPTION_GAP +
      descriptionHeight +
      8 +
      optionsHeight +
      12
    );
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? this.dialog.theme;
    this.card.setTexture(
      this.dialog.assetManager?.getTexture?.(
        PIXI_ROOT_RUN_ASSETS.dialogPaper,
      ) ?? Texture.EMPTY,
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperSourceInsets,
    );
    this.card.alpha = 1;
    const textColor = resolvedTheme.text;
    applyTextTheme(this.title, resolvedTheme, {
      fontSize: 13,
      lineHeight: WORLD_EVENT_QUEST_TITLE_HEIGHT,
      fontWeight: '700',
      fill: textColor,
      wordWrapWidth: this.title.style.wordWrapWidth ?? 170,
    });
    applyTextTheme(this.points, resolvedTheme, {
      fontSize: 11,
      lineHeight: 13,
      align: 'right',
      fill: textColor,
    });
    applyTextTheme(this.description, resolvedTheme, {
      fontSize: 10,
      lineHeight: 12,
      fill: textColor,
      wordWrapWidth:
        this.description.style.wordWrapWidth ??
        WORKSHOP_DIALOG_CONTENT_WIDTH - WORLD_EVENT_QUEST_CONTENT_INSET * 2,
    });
    applyTextTheme(this.progress, resolvedTheme, {
      fontSize: 10,
      lineHeight: 12,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.status, resolvedTheme, {
      fontSize: 10,
      lineHeight: 12,
      align: 'right',
      fill: resolvedTheme.muted,
    });
    for (const option of this.options) {
      option.applyTheme(resolvedTheme);
    }
  }

  reset() {
    this.model = null;
    this.visibleOptionCount = 0;
    for (const option of this.options) {
      option.reset();
    }
    this.root.visible = false;
    this.root.renderable = false;
  }

  destroy() {
    for (const option of this.options) {
      option.destroy();
    }
    this.root.destroy({ children: true });
  }
}

/**
 * Compact, action-chrome-free World Chat row.
 *
 * Player avatars/usernames and announced player names expose the existing
 * Player Info action while clan tags, message detail, timestamps, and the
 * system title/surface remain passive.
 */
export class WorldChatMessageRowPixi {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.root = new Container({ label: `${dialog.dialogId}-message-row` });
    this.systemBackground = new Graphics({
      label: `${dialog.dialogId}-message-row:system-background`,
    });
    this.avatarWidget = new PlayerProfileWidget({
      assets: dialog.assetManager,
      texture: Texture.EMPTY,
      label: `${dialog.dialogId}-message-row:avatar`,
    });
    this.avatarWidget.pivot.set(PLAYER_PROFILE_SIZE / 2);
    this.avatar = this.avatarWidget;
    this.tag = createText('', {
      fontSize: WORLD_CHAT_HEADER_FONT_SIZE,
      lineHeight: WORLD_CHAT_HEADER_HEIGHT,
      fontWeight: '700',
    });
    this.username = createText('', {
      fontSize: WORLD_CHAT_HEADER_FONT_SIZE,
      lineHeight: WORLD_CHAT_HEADER_HEIGHT,
      fontWeight: '700',
    });
    this.body = new PixiInlineText({
      label: `${dialog.dialogId}-message-row:body`,
      style: {
        fontSize: WORLD_CHAT_BODY_FONT_SIZE,
        lineHeight: WORLD_CHAT_BODY_LINE_HEIGHT,
      },
      wrapWidth: WORKSHOP_DIALOG_CONTENT_WIDTH - WORLD_CHAT_TEXT_X,
    });
    this.systemPlayerUsername = createText('', {
      fontSize: WORLD_CHAT_BODY_FONT_SIZE,
      lineHeight: WORLD_CHAT_BODY_LINE_HEIGHT,
      fontWeight: '700',
    });
    this.timestamp = createText('', {
      fontSize: WORLD_CHAT_TIMESTAMP_FONT_SIZE,
      lineHeight: WORLD_CHAT_TIMESTAMP_LINE_HEIGHT,
      align: 'right',
    });
    this.timestamp.anchor.set(1, 0);
    this.root.addChild(
      this.systemBackground,
      this.avatar,
      this.tag,
      this.username,
      this.systemPlayerUsername,
      this.body,
      this.timestamp,
    );
    this.holdTimer = null;
    this.holdTriggered = false;
    this.holdPointerId = null;
    this.rowRegistration =
      dialog.inputRouter?.registerPressTarget?.(this.root, {
        enabled: () => this.canReport(),
        onPressChange: (pressed, context) =>
          this.handleReportPressChange(pressed, context),
        onActivate: () => this.activateRow(),
        haptic: 'selection',
        excludePageSwipe: true,
      }) ?? null;
    this.avatarRegistration =
      dialog.inputRouter?.registerPressTarget?.(this.avatar, {
        enabled: () => this.isPlayerInteractive(),
        onPressChange: (pressed, context) =>
          this.handleReportPressChange(pressed, context),
        onActivate: () => this.activatePlayerUnlessHeld(),
        haptic: 'selection',
        excludePageSwipe: true,
      }) ?? null;
    this.usernameRegistration =
      dialog.inputRouter?.registerPressTarget?.(this.username, {
        enabled: () => this.isPlayerInteractive(),
        onPressChange: (pressed, context) =>
          this.handleReportPressChange(pressed, context),
        onActivate: () => this.activatePlayerUnlessHeld(),
        haptic: 'selection',
        excludePageSwipe: true,
      }) ?? null;
    this.systemPlayerRegistration =
      dialog.inputRouter?.registerPressTarget?.(this.systemPlayerUsername, {
        enabled: () => this.isSystemPlayerInteractive(),
        onActivate: () => this.activatePlayer(),
        haptic: 'selection',
        excludePageSwipe: true,
      }) ?? null;
  }

  bind(model) {
    this.model = model ?? {};
    this.root.visible = true;
    this.isSystem = this.model.type === 'system';
    this.isOwn = !this.isSystem && this.model.isOwn === true;
    this.selectedForReport =
      !this.isSystem && !this.isOwn && this.model.selectedForReport === true;
    const tag = normalizeWorldChatTag(this.model.allianceTag);
    setText(this.tag, tag ? `[${tag}]` : '');
    setText(
      this.username,
      this.isSystem
        ? this.model.username || 'System'
        : this.model.username || 'Wizard',
    );
    setText(
      this.systemPlayerUsername,
      this.isSystem ? (this.model.systemPlayerUsername ?? '') : '',
    );
    this.bindBody(
      this.isSystem && this.model.systemPlayerUsername
        ? (this.model.systemPlayerDetail ?? this.model.body ?? '')
        : (this.model.body ?? ''),
      this.model.bodyRuns,
      this.model.bodyIcon,
    );
    setText(this.timestamp, this.model.ageLabel ?? '');
    this.avatarWidget
      .setTexture(
        this.isSystem
          ? Texture.EMPTY
          : resolveCharacterTexture(
              this.dialog.assetManager,
              this.model.character,
            ),
      )
      .setBackgroundTint(getPlayerFrameTint(this.model.frame));
    this.avatar.visible = !this.isSystem;
    this.avatar.renderable = !this.isSystem;
    this.systemBackground.visible = this.isSystem;
    this.systemBackground.renderable = this.isSystem;
    this.tag.visible = Boolean(tag);
    this.tag.renderable = Boolean(tag);
    this.systemPlayerUsername.visible = Boolean(
      this.isSystem && this.model.systemPlayerUsername,
    );
    this.systemPlayerUsername.renderable = this.systemPlayerUsername.visible;
    this.syncInteraction();
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
    this.targetId = this.model.semanticId ?? null;

    const nextReportTargetId = this.model.reportHighlightId ?? null;
    if (this.reportTargetId && this.reportTargetId !== nextReportTargetId) {
      this.dialog.unregisterTarget(this.reportTargetId);
    }
    this.reportTargetId = nextReportTargetId;
    if (this.reportTargetId) {
      this.dialog.registerTarget({
        semanticId: this.reportTargetId,
        displayObject: this.root,
        state: () => ({
          enabled: this.canReport(),
          interactive: this.canReport(),
          visible: this.root.visible && this.root.renderable,
        }),
      });
    }

    if (this.targetId) {
      this.dialog.registerTarget({
        semanticId: this.targetId,
        tutorialId: this.model.tutorialId ?? null,
        displayObject: this.isSystem
          ? this.systemPlayerUsername
          : this.username,
        state: () => ({
          enabled: this.isInteractive(),
          interactive: this.isInteractive(),
        }),
        activate: () => this.activatePlayer(),
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    const contentX = this.isSystem ? 6 : WORLD_CHAT_TEXT_X;
    const bodyTop = this.isOwn ? WORLD_CHAT_OWN_BODY_TOP : WORLD_CHAT_BODY_TOP;
    const timestampInset = this.isSystem ? 6 : 0;
    this.systemBackground
      .clear()
      .roundRect(0, 0, width, height, 5)
      .fill(WORLD_CHAT_SYSTEM_BACKGROUND);
    this.avatar.position.set(
      this.isOwn
        ? width - WORLD_CHAT_AVATAR_SIZE / 2
        : WORLD_CHAT_AVATAR_SIZE / 2,
      WORLD_CHAT_AVATAR_SIZE / 2 + WORLD_CHAT_ROW_HEIGHT_SCALE,
    );
    this.avatar.scale.set(WORLD_CHAT_AVATAR_SIZE / PLAYER_PROFILE_SIZE);
    const headerWidth =
      (this.tag.visible ? this.tag.width + 2 : 0) + this.username.width;
    const headerX = this.isOwn
      ? Math.max(0, width - WORLD_CHAT_TEXT_X - headerWidth)
      : contentX;
    this.tag.position.set(headerX, WORLD_CHAT_HEADER_TOP);
    this.username.position.set(
      headerX + (this.tag.visible ? this.tag.width + 2 : 0),
      WORLD_CHAT_HEADER_TOP,
    );
    this.timestamp.anchor.set(this.isOwn ? 0 : 1, 0);
    this.timestamp.position.set(
      this.isOwn ? 0 : width - timestampInset,
      WORLD_CHAT_ROW_HEIGHT_SCALE,
    );
    this.systemPlayerUsername.position.set(contentX, WORLD_CHAT_BODY_TOP);
    const bodyX = this.systemPlayerUsername.visible
      ? contentX + this.systemPlayerUsername.width + 2
      : contentX;
    const bodyWrapWidth = Math.max(
      0,
      this.isOwn ? width - WORLD_CHAT_TEXT_X : width - bodyX,
    );
    this.body.setWrapWidth(bodyWrapWidth);
    this.body.position.set(
      this.isOwn
        ? Math.max(0, width - WORLD_CHAT_TEXT_X - this.body.layoutWidth)
        : bodyX,
      bodyTop,
    );
    this.avatar.hitArea = new Rectangle(
      0,
      0,
      PLAYER_PROFILE_SIZE,
      PLAYER_PROFILE_SIZE,
    );
    this.username.hitArea = new Rectangle(
      0,
      0,
      Math.max(1, this.username.width),
      Math.max(1, this.username.height),
    );
    this.systemPlayerUsername.hitArea = new Rectangle(
      0,
      0,
      Math.max(1, this.systemPlayerUsername.width),
      Math.max(1, this.systemPlayerUsername.height),
    );
    this.root.hitArea = new Rectangle(0, 0, width, height);
  }

  getPreferredHeight() {
    const bodyTop = this.isOwn ? WORLD_CHAT_OWN_BODY_TOP : WORLD_CHAT_BODY_TOP;
    const bodyLineHeight = this.isOwn
      ? WORLD_CHAT_OWN_BODY_LINE_HEIGHT
      : WORLD_CHAT_BODY_LINE_HEIGHT;
    const bodyHeight = Math.max(
      bodyLineHeight,
      Math.ceil(this.body.layoutHeight),
    );
    const messageHeight = Math.max(
      this.isSystem
        ? WORLD_CHAT_SYSTEM_MIN_HEIGHT
        : WORLD_CHAT_PLAYER_MIN_HEIGHT,
      bodyTop +
        bodyHeight +
        (this.isSystem
          ? WORLD_CHAT_SYSTEM_BOTTOM_INSET
          : WORLD_CHAT_PLAYER_BOTTOM_INSET),
    );
    return this.selectedForReport
      ? messageHeight +
          WORLD_CHAT_REPORT_ACTION_GAP +
          WORLD_CHAT_REPORT_ACTION_HEIGHT
      : messageHeight;
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? this.dialog.theme;
    applyTextTheme(this.tag, resolvedTheme, {
      fontSize: WORLD_CHAT_HEADER_FONT_SIZE,
      lineHeight: WORLD_CHAT_HEADER_HEIGHT,
      fontWeight: '700',
      fill:
        WORLD_CHAT_TAG_COLORS[
          normalizeWorldChatTagColor(this.model?.allianceTagColor)
        ] ?? WORLD_CHAT_TAG_COLORS.ink,
    });
    applyTextTheme(this.username, resolvedTheme, {
      fontSize: WORLD_CHAT_HEADER_FONT_SIZE,
      lineHeight: WORLD_CHAT_HEADER_HEIGHT,
      fontWeight: '700',
      fill: this.isSystem ? WORLD_CHAT_SYSTEM_TITLE_COLOR : resolvedTheme.text,
    });
    applyTextTheme(this.systemPlayerUsername, resolvedTheme, {
      fontSize: WORLD_CHAT_BODY_FONT_SIZE,
      lineHeight: WORLD_CHAT_BODY_LINE_HEIGHT,
      fontWeight: '700',
      fill: WORLD_CHAT_SYSTEM_PLAYER_COLOR,
    });
    applyTextTheme(this.body, resolvedTheme, {
      fontSize: this.isOwn
        ? WORLD_CHAT_OWN_BODY_FONT_SIZE
        : WORLD_CHAT_BODY_FONT_SIZE,
      lineHeight: this.isOwn
        ? WORLD_CHAT_OWN_BODY_LINE_HEIGHT
        : WORLD_CHAT_BODY_LINE_HEIGHT,
      fill: resolvedTheme.text,
      wordWrapWidth:
        (this.width || WORKSHOP_DIALOG_CONTENT_WIDTH) -
        (this.systemPlayerUsername.visible
          ? this.systemPlayerUsername.x + this.systemPlayerUsername.width + 2
          : this.isSystem
            ? 6
            : WORLD_CHAT_TEXT_X),
    });
    applyTextTheme(this.timestamp, resolvedTheme, {
      fontSize: WORLD_CHAT_TIMESTAMP_FONT_SIZE,
      lineHeight: WORLD_CHAT_TIMESTAMP_LINE_HEIGHT,
      align: 'right',
      fill: WORLD_CHAT_TIMESTAMP_COLOR,
    });
  }

  canReport() {
    return Boolean(
      !this.isSystem &&
      !this.isOwn &&
      this.model?.canReport === true &&
      typeof this.model?.onLongPress === 'function' &&
      this.root.visible,
    );
  }

  handleReportPressChange(pressed, context = {}) {
    if (pressed) {
      if (!this.canReport() || this.holdPointerId !== null) {
        return;
      }
      this.holdTriggered = false;
      this.holdPointerId = context.pointerId ?? 'router';
      this.clearHoldTimer();
      this.holdTimer = globalThis.setTimeout(() => {
        this.holdTimer = null;
        if (this.holdPointerId === null || !this.canReport()) {
          this.stopHold();
          return;
        }
        this.holdTriggered = true;
        this.model.onLongPress(this.model);
      }, WORLD_CHAT_REPORT_HOLD_MS);
      return;
    }

    if (context.pointerId == null || context.pointerId === this.holdPointerId) {
      this.stopHold({
        preserveTriggered: this.holdTriggered && context.confirmed === true,
      });
    }
  }

  activateRow() {
    this.holdTriggered = false;
    return false;
  }

  activatePlayerUnlessHeld() {
    if (this.holdTriggered) {
      this.holdTriggered = false;
      return false;
    }
    return this.activatePlayer();
  }

  stopHold({ preserveTriggered = false } = {}) {
    this.clearHoldTimer();
    this.holdPointerId = null;
    if (!preserveTriggered) {
      this.holdTriggered = false;
    }
  }

  clearHoldTimer() {
    if (this.holdTimer !== null) {
      globalThis.clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  isInteractive() {
    return this.isPlayerInteractive() || this.isSystemPlayerInteractive();
  }

  isPlayerInteractive() {
    return Boolean(
      !this.isSystem &&
      this.model?.enabled !== false &&
      typeof this.model?.onActivate === 'function' &&
      this.root.visible,
    );
  }

  isSystemPlayerInteractive() {
    return Boolean(
      this.isSystem &&
      this.model?.systemPlayerUsername &&
      this.model?.enabled !== false &&
      typeof this.model?.onActivate === 'function' &&
      this.root.visible,
    );
  }

  syncInteraction() {
    for (const target of [this.avatar, this.username]) {
      target.eventMode = this.isPlayerInteractive() ? 'static' : 'none';
      target.cursor = this.isPlayerInteractive() ? 'pointer' : 'default';
    }
    this.systemPlayerUsername.eventMode = this.isSystemPlayerInteractive()
      ? 'static'
      : 'none';
    this.systemPlayerUsername.cursor = this.isSystemPlayerInteractive()
      ? 'pointer'
      : 'default';
  }

  activatePlayer() {
    if (!this.isInteractive()) {
      return false;
    }
    return this.model.onActivate(this.model) ?? true;
  }

  bindBody(body, bodyRuns, bodyIcon) {
    const rawBody = String(body ?? '');
    this.body.setRuns(
      resolveWorldChatBodyRuns(
        this.dialog.assetManager,
        rawBody,
        bodyRuns,
        bodyIcon,
      ),
    );
  }

  reset() {
    this.stopHold();
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    if (this.reportTargetId) {
      this.dialog.unregisterTarget(this.reportTargetId);
    }
    this.targetId = null;
    this.reportTargetId = null;
    this.model = null;
    this.isSystem = false;
    this.isOwn = false;
    this.selectedForReport = false;
    this.avatarWidget.setTexture(Texture.EMPTY).setBackgroundTint(0xffffff);
    this.body.setRuns([]);
    setText(this.systemPlayerUsername, '');
    this.root.visible = false;
    this.syncInteraction();
  }

  destroy() {
    this.stopHold();
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    if (this.reportTargetId) {
      this.dialog.unregisterTarget(this.reportTargetId);
    }
    disposeInputRegistration(this.rowRegistration);
    this.rowRegistration = null;
    disposeInputRegistration(this.avatarRegistration);
    disposeInputRegistration(this.usernameRegistration);
    disposeInputRegistration(this.systemPlayerRegistration);
    this.avatarRegistration = null;
    this.usernameRegistration = null;
    this.systemPlayerRegistration = null;
    this.root.destroy({ children: true });
  }
}

export class AllianceSettingsPane {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.model = null;
    this.draft = null;
    this.draftAllianceId = null;
    this.dirty = false;
    this.saving = false;
    this.statusText = '';
    this.mode = null;
    this.activeSection = 'profile';
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.lastBounds = null;
    this.root = new Container({ label: `${dialog.dialogId}-settings` });
    this.root.visible = false;
    this.root.renderable = false;
    this.scroll = new RetainedScrollArea({
      inputRouter: dialog.inputRouter,
      label: `${dialog.dialogId}-settings-scroll`,
    });
    this.sectionTabLayer = new Container({
      label: `${dialog.dialogId}-settings-section-tabs`,
    });
    this.content = new Container({
      label: `${dialog.dialogId}-settings-content`,
    });
    this.scroll.content.addChild(this.content);
    this.root.addChild(this.scroll.root, this.sectionTabLayer);
    this.createIdentitySection = createDialogPaperSection(
      dialog.panel.paperFrame.texture,
      `${dialog.dialogId}-create-identity-section`,
    );
    this.createAccessSection = createDialogPaperSection(
      dialog.panel.paperFrame.texture,
      `${dialog.dialogId}-create-access-section`,
    );
    this.createSections = [
      this.createIdentitySection,
      this.createAccessSection,
    ];
    this.createSections.forEach((section) => {
      section.visible = false;
      section.renderable = false;
    });
    this.content.addChild(...this.createSections);
    this.sectionTabs = [
      ['profile', 'Profile'],
      ['banner', 'Banner'],
    ].map(
      ([sectionId]) =>
        new RetainedButton({
          assetManager: dialog.assetManager,
          buttonLabel: `${dialog.dialogId}-settings-section-${sectionId}`,
          inputRouter: dialog.inputRouter,
          variant: 'tab',
        }),
    );
    this.sectionTabLayer.addChild(
      ...this.sectionTabs.map((button) => button.root),
    );
    this.fieldSpecs = [
      ['name', 'Name', 24],
      ['tag', 'Tag', 5],
      ['description', 'Description', 120],
      ['notice', 'Notice', 160],
    ];
    this.labels = new Map();
    this.fields = new Map();
    for (const [key, label, maxLength] of this.fieldSpecs) {
      const labelText = createText(label, RETAINED_TEXT_STYLES.border);
      const field = new PixiTextField({
        assetManager: dialog.assetManager,
        inputRouter: dialog.inputRouter,
        textEntryService: dialog.textEntryService,
        inputKind: 'text',
        maxLength,
        label: `${dialog.dialogId}-settings-${key}`,
        onChange: (value) => {
          if (!this.draft) {
            return;
          }
          this.draft[key] = key === 'tag' ? value.toUpperCase() : value;
          this.dirty = true;
        },
      });
      this.labels.set(key, labelText);
      this.fields.set(key, field);
      this.content.addChild(labelText, field);
    }
    this.tagColorLabel = createText('Tag Color', RETAINED_TEXT_STYLES.border);
    this.tagColorSwatchLayer = new Container({
      label: `${dialog.dialogId}-settings-tag-color-swatches`,
    });
    this.swatches = TRADE_ALLIANCE_TAG_COLORS.map(
      (color) =>
        new GuildColorSwatch({
          assetManager: dialog.assetManager,
          inputRouter: dialog.inputRouter,
          semanticRegistry: dialog.semanticTargets,
          semanticId: `${dialog.dialogId}.settings.tagColor.${color.id}`,
          colorId: color.id,
          label: `${dialog.dialogId}-settings-tag-color-${color.id}`,
          action: () => this.selectTagColor(color.id),
        }),
    );
    this.tagColorSwatchLayer.addChild(
      ...this.swatches.map((swatch) => swatch.root),
    );
    this.bannerPreview = new AllianceFlagWidget({
      assetManager: dialog.assetManager,
      label: `${dialog.dialogId}-settings-banner-preview`,
    });
    this.bannerSectionLabel = createText('Banner', RETAINED_TEXT_STYLES.bold);
    this.emblemLabel = createText('Emblem', RETAINED_TEXT_STYLES.border);
    this.emblemOptionLayer = new Container({
      label: `${dialog.dialogId}-settings-emblem-options`,
    });
    this.emblemOptions = TRADE_ALLIANCE_EMBLEMS.map(
      (emblem) =>
        new AllianceEmblemOption({
          assetManager: dialog.assetManager,
          inputRouter: dialog.inputRouter,
          semanticRegistry: dialog.semanticTargets,
          semanticId: `${dialog.dialogId}.banner.emblem.${emblem.id}`,
          emblemId: emblem.id,
          label: `${dialog.dialogId}-banner-emblem-${emblem.id}`,
          action: () => this.selectEmblem(emblem.id),
        }),
    );
    this.emblemOptionLayer.addChild(
      ...this.emblemOptions.map((option) => option.root),
    );
    this.bannerColorLabel = createText(
      'Banner Color',
      RETAINED_TEXT_STYLES.border,
    );
    this.bannerColorSwatchLayer = new Container({
      label: `${dialog.dialogId}-settings-banner-color-swatches`,
    });
    this.bannerColorSwatches = TRADE_ALLIANCE_BANNER_COLORS.map(
      (color) =>
        new GuildColorSwatch({
          assetManager: dialog.assetManager,
          inputRouter: dialog.inputRouter,
          semanticRegistry: dialog.semanticTargets,
          semanticId: `${dialog.dialogId}.banner.bannerColor.${color.id}`,
          colorId: color.id,
          colorValue: color.value,
          label: `${dialog.dialogId}-banner-color-${color.id}`,
          action: () => this.selectBannerColor(color.id),
        }),
    );
    this.bannerColorSwatchLayer.addChild(
      ...this.bannerColorSwatches.map((swatch) => swatch.root),
    );
    this.emblemColorLabel = createText(
      'Emblem Color',
      RETAINED_TEXT_STYLES.border,
    );
    this.emblemColorSwatchLayer = new Container({
      label: `${dialog.dialogId}-settings-emblem-color-swatches`,
    });
    this.emblemColorSwatches = TRADE_ALLIANCE_EMBLEM_COLORS.map(
      (color) =>
        new GuildColorSwatch({
          assetManager: dialog.assetManager,
          inputRouter: dialog.inputRouter,
          semanticRegistry: dialog.semanticTargets,
          semanticId: `${dialog.dialogId}.banner.emblemColor.${color.id}`,
          colorId: color.id,
          colorValue: color.value,
          label: `${dialog.dialogId}-emblem-color-${color.id}`,
          action: () => this.selectEmblemColor(color.id),
        }),
    );
    this.emblemColorSwatchLayer.addChild(
      ...this.emblemColorSwatches.map((swatch) => swatch.root),
    );
    this.joinModeLabel = createText('Join Mode', RETAINED_TEXT_STYLES.border);
    this.joinModeButtons = ['open', 'apply', 'closed'].map(
      (joinMode) =>
        new RetainedButton({
          assetManager: dialog.assetManager,
          buttonLabel: `${dialog.dialogId}-settings-${joinMode}`,
          inputRouter: dialog.inputRouter,
          variant: 'tab',
        }),
    );
    this.saveButton = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-settings-save`,
      inputRouter: dialog.inputRouter,
      sizeTier: 30,
      variant: 'green',
    });
    this.disbandButton = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-settings-disband`,
      inputRouter: dialog.inputRouter,
      sizeTier: 30,
      variant: 'red',
    });
    this.status = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'center',
    });
    this.content.addChild(
      this.tagColorLabel,
      this.tagColorSwatchLayer,
      this.bannerSectionLabel,
      this.bannerPreview,
      this.emblemLabel,
      this.emblemOptionLayer,
      this.bannerColorLabel,
      this.bannerColorSwatchLayer,
      this.emblemColorLabel,
      this.emblemColorSwatchLayer,
      this.joinModeLabel,
      ...this.joinModeButtons.map((button) => button.root),
      this.saveButton.root,
      this.disbandButton.root,
      this.status,
    );
  }

  bind(model) {
    this.model = model ?? null;
    const visible = Boolean(this.model);
    this.root.visible = visible;
    this.root.renderable = visible;
    if (!visible) {
      this.setCreateSectionsVisible(false);
      for (const field of this.fields.values()) {
        field.blur();
      }
      return;
    }
    const allianceId = String(this.model.allianceId ?? '');
    const allianceChanged = this.draftAllianceId !== allianceId;
    const modeChanged = this.mode !== this.model.mode;
    this.mode = this.model.mode;
    if (allianceChanged || modeChanged) {
      this.scroll.scrollTo(0);
      this.activeSection = 'profile';
    }
    if (allianceChanged || !this.dirty) {
      this.draftAllianceId = allianceId;
      if (allianceChanged) {
        this.statusText = '';
      }
      this.draft = {
        name: this.model.name ?? '',
        tag: this.model.tag ?? '',
        tagColor: this.model.tagColor ?? 'ink',
        bannerColor: normalizeTradeAllianceBannerColor(this.model.bannerColor),
        emblemColor: normalizeTradeAllianceEmblemColor(this.model.emblemColor),
        emblemId: normalizeTradeAllianceEmblem(this.model.emblemId),
        description: this.model.description ?? '',
        notice: this.model.notice ?? '',
        joinMode: this.model.joinMode ?? 'apply',
      };
      for (const [key, field] of this.fields) {
        field.setValue(this.draft[key] ?? '');
      }
    }
    const editable = this.model.editable === true;
    const creating = this.model.mode === 'create';
    const settings = this.model.mode === 'settings';
    const editingBanner =
      this.model.mode === 'banner' ||
      (settings && this.activeSection === 'banner');
    this.sectionTabLayer.visible = editable && settings;
    this.sectionTabLayer.renderable = editable && settings;
    this.sectionTabs.forEach((button, index) => {
      const sectionId = ['profile', 'banner'][index];
      button.root.visible = editable && settings;
      button.root.renderable = editable && settings;
      button.setModel({
        label: sectionId[0].toUpperCase() + sectionId.slice(1),
        selected: this.activeSection === sectionId,
        enabled: editable && !this.saving,
        action: () => this.selectSection(sectionId),
      });
    });
    this.setCreateSectionsVisible(creating);
    for (const [key, field] of this.fields) {
      const label = this.labels.get(key);
      const visible =
        editable &&
        !editingBanner &&
        (!creating || key === 'name' || key === 'tag');
      field.visible = visible;
      field.renderable = visible;
      label.visible = visible;
      label.renderable = visible;
      if (!visible) {
        field.blur();
      }
    }
    this.tagColorLabel.visible = editable && !editingBanner;
    this.tagColorLabel.renderable = editable && !editingBanner;
    this.tagColorSwatchLayer.visible = editable && !editingBanner;
    this.tagColorSwatchLayer.renderable = editable && !editingBanner;
    const selectedTagColor = normalizeTradeAllianceTagColor(
      this.draft?.tagColor,
    );
    this.fields
      .get('tag')
      .setValueColor(
        ALLIANCE_TAG_FIELD_COLORS[selectedTagColor] ?? this.theme.text,
      );
    for (const swatch of this.swatches) {
      swatch.root.visible = editable && !editingBanner;
      swatch.root.renderable = editable && !editingBanner;
      swatch.setSelected(swatch.colorId === selectedTagColor);
    }
    const editingAllianceBanner = editable && (creating || editingBanner);
    this.bannerSectionLabel.visible =
      editingAllianceBanner && !creating && !settings;
    this.bannerSectionLabel.renderable = this.bannerSectionLabel.visible;
    this.bannerPreview.visible = editingAllianceBanner;
    this.bannerPreview.renderable = editingAllianceBanner;
    this.emblemLabel.visible = editingAllianceBanner;
    this.emblemLabel.renderable = editingAllianceBanner;
    this.emblemOptionLayer.visible = editingAllianceBanner;
    this.emblemOptionLayer.renderable = editingAllianceBanner;
    this.bannerColorLabel.visible = editingAllianceBanner;
    this.bannerColorLabel.renderable = editingAllianceBanner;
    this.bannerColorSwatchLayer.visible = editingAllianceBanner;
    this.bannerColorSwatchLayer.renderable = editingAllianceBanner;
    this.emblemColorLabel.visible = editingAllianceBanner;
    this.emblemColorLabel.renderable = editingAllianceBanner;
    this.emblemColorSwatchLayer.visible = editingAllianceBanner;
    this.emblemColorSwatchLayer.renderable = editingAllianceBanner;
    this.bannerPreview.setColors({
      bannerColor: this.draft?.bannerColor,
      emblemColor: this.draft?.emblemColor,
      emblemId: this.draft?.emblemId,
    });
    const emblemTint = getTradeAllianceEmblemColor(
      this.draft?.emblemColor,
    ).value;
    for (const option of this.emblemOptions) {
      option.root.visible = editingAllianceBanner;
      option.root.renderable = editingAllianceBanner;
      option.setSelected(option.emblemId === this.draft?.emblemId);
      option.setTint(emblemTint);
    }
    for (const swatch of this.bannerColorSwatches) {
      swatch.root.visible = editingAllianceBanner;
      swatch.root.renderable = editingAllianceBanner;
      swatch.setSelected(swatch.colorId === this.draft?.bannerColor);
    }
    for (const swatch of this.emblemColorSwatches) {
      swatch.root.visible = editingAllianceBanner;
      swatch.root.renderable = editingAllianceBanner;
      swatch.setSelected(swatch.colorId === this.draft?.emblemColor);
    }
    this.joinModeLabel.visible = editable && creating;
    this.joinModeLabel.renderable = editable && creating;
    this.joinModeButtons.forEach((button, index) => {
      const joinMode = ['open', 'apply', 'closed'][index];
      button.root.visible = editable && creating;
      button.root.renderable = editable && creating;
      button.setModel({
        label: joinMode[0].toUpperCase() + joinMode.slice(1),
        selected: this.draft?.joinMode === joinMode,
        enabled: editable && !this.saving,
        action: () => this.selectJoinMode(joinMode),
      });
    });
    this.saveButton.root.visible = editable;
    this.saveButton.root.renderable = editable;
    this.saveButton.setModel({
      label: this.saving
        ? creating
          ? 'Creating'
          : 'Saving'
        : editingBanner
          ? 'Save Banner'
          : creating
            ? 'Create Alliance'
            : 'Save Profile',
      enabled: editable && !this.saving,
      action: () => this.save(),
    });
    this.disbandButton.root.visible = editable && settings && !editingBanner;
    this.disbandButton.root.renderable =
      editable && settings && !editingBanner;
    this.disbandButton.setModel({
      label: this.model.canDisband ? 'Disband' : 'Remove Members First',
      enabled: editable && this.model.canDisband === true && !this.saving,
      action: () => this.model?.onDisband?.(),
    });
    if (!editable) {
      this.statusText = 'Trade Master Only';
    }
    setText(this.status, this.statusText);
  }

  setCreateSectionsVisible(visible) {
    for (const section of this.createSections) {
      section.visible = visible;
      section.renderable = visible;
    }
  }

  selectSection(sectionId) {
    if (
      !['profile', 'banner'].includes(sectionId) ||
      this.model?.mode !== 'settings' ||
      this.saving
    ) {
      return false;
    }
    if (this.activeSection === sectionId) {
      return true;
    }
    this.activeSection = sectionId;
    this.scroll.scrollTo(0);
    this.bind(this.model);
    if (this.lastBounds) {
      this.setBounds(
        this.lastBounds.x,
        this.lastBounds.y,
        this.lastBounds.width,
        this.lastBounds.height,
      );
    }
    return true;
  }

  selectJoinMode(joinMode) {
    if (!this.draft || this.saving) {
      return false;
    }
    this.draft.joinMode = joinMode;
    this.dirty = true;
    this.bind(this.model);
    return true;
  }

  selectTagColor(tagColor) {
    if (!this.draft || this.saving) {
      return false;
    }
    this.draft.tagColor = normalizeTradeAllianceTagColor(tagColor);
    this.dirty = true;
    this.bind(this.model);
    return true;
  }

  selectBannerColor(bannerColor) {
    if (!this.draft || this.saving) {
      return false;
    }
    this.draft.bannerColor = normalizeTradeAllianceBannerColor(bannerColor);
    this.dirty = true;
    this.bind(this.model);
    return true;
  }

  selectEmblemColor(emblemColor) {
    if (!this.draft || this.saving) {
      return false;
    }
    this.draft.emblemColor = normalizeTradeAllianceEmblemColor(emblemColor);
    this.dirty = true;
    this.bind(this.model);
    return true;
  }

  selectEmblem(emblemId) {
    if (!this.draft || this.saving) {
      return false;
    }
    this.draft.emblemId = normalizeTradeAllianceEmblem(emblemId);
    this.dirty = true;
    this.bind(this.model);
    return true;
  }

  async save() {
    if (this.saving || !this.draft || this.model?.editable !== true) {
      return false;
    }
    this.saving = true;
    this.statusText = 'Saving';
    this.bind(this.model);
    let result;
    try {
      result = await this.model.onSave?.({ ...this.draft });
    } catch {
      result = { ok: false };
    }
    this.saving = false;
    this.dirty = result?.ok !== true;
    this.statusText =
      result?.ok === true
        ? this.model?.mode === 'create'
          ? 'Created'
          : 'Saved'
        : this.model?.mode === 'create'
          ? 'Not Created'
          : 'Not Saved';
    this.bind(this.model);
    return result?.ok === true;
  }

  setBounds(x, y, width, height = 0) {
    this.lastBounds = { x, y, width, height };
    this.root.position.set(x, y);
    const creating = this.model?.mode === 'create';
    const settingsNavigation =
      this.model?.mode === 'settings' && this.model?.editable === true;
    const settingsTabHeight = 28;
    const settingsTabGap = 6;
    const scrollHeight = settingsNavigation
      ? Math.max(0, height - settingsTabHeight - settingsTabGap)
      : height;
    this.scroll.setBounds(
      0,
      0,
      creating ? width + PIXI_UI_GEOMETRY.dialogPadding * 2 : width,
      scrollHeight,
    );
    if (settingsNavigation) {
      this.sectionTabLayer.position.set(0, scrollHeight + settingsTabGap);
      this.layoutSettingsTabs(width);
    }
    if (this.model?.editable !== true) {
      this.status.position.set(0, 8);
      this.scroll.setContentHeight(26);
      return;
    }
    if (this.model?.mode === 'banner') {
      const editorBottom = this.layoutBannerEditor(0, { large: true, width });
      const actionY = editorBottom + 14;
      this.saveButton.setBounds(0, actionY, width, 28);
      this.status.position.set(0, actionY + 32);
      this.scroll.setContentHeight(actionY + 50);
      return;
    }
    if (creating) {
      this.scroll.setContentHeight(this.layoutCreateSections(width));
      return;
    }
    this.scroll.setContentHeight(
      this.activeSection === 'banner'
        ? this.layoutBannerSettings(width)
        : this.layoutProfileSettings(width),
    );
  }

  layoutSettingsTabs(width) {
    const gap = 6;
    const tabWidth = (width - gap) / 2;
    this.sectionTabs.forEach((button, index) => {
      button.setBounds(index * (tabWidth + gap), 0, tabWidth, 28);
    });
  }

  layoutProfileSettings(width) {
    const fieldHeight = 40;
    let fieldY = 0;
    this.fieldSpecs.forEach(([key]) => {
      this.labels.get(key).position.set(0, fieldY);
      const field = this.fields.get(key);
      field.position.set(0, fieldY + 13);
      field.setSize(width, 25);
      fieldY += fieldHeight;
      if (key === 'tag') {
        this.tagColorLabel.position.set(0, fieldY);
        this.tagColorSwatchLayer.position.set(0, fieldY + 13);
        this.swatches.forEach((swatch, index) => {
          swatch.setBounds(index * 25, 0, 20);
        });
        fieldY += fieldHeight;
      }
    });
    const actionY = fieldY + 6;
    const actionGap = 8;
    const actionWidth = (width - actionGap) / 2;
    this.saveButton.setBounds(0, actionY, actionWidth, 28);
    this.disbandButton.setBounds(
      actionWidth + actionGap,
      actionY,
      actionWidth,
      28,
    );
    this.status.position.set(0, actionY + 32);
    return actionY + 50;
  }

  layoutBannerSettings(width) {
    const contentY = 0;
    this.bannerSectionLabel.position.set(0, contentY);
    const editorBottom = this.layoutBannerEditor(contentY, {
      large: true,
      width,
    });
    const actionY = editorBottom + 14;
    this.saveButton.setBounds(0, actionY, width, 28);
    this.status.position.set(0, actionY + 32);
    return actionY + 50;
  }

  layoutCreateSections(width) {
    const paperOutsets = resolveDialogPaperOutsets({
      top: PIXI_UI_GEOMETRY.dialogPadding,
      right: PIXI_UI_GEOMETRY.dialogPadding,
      bottom: PIXI_UI_GEOMETRY.dialogPadding,
      left: PIXI_UI_GEOMETRY.dialogPadding,
    });
    const contentInsetTop = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
    const contentInsetBottom =
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
    const sectionGap = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap;
    const contentX = PIXI_UI_GEOMETRY.dialogPadding;
    let sectionY = PIXI_UI_GEOMETRY.dialogPadding;

    const layoutSection = (section, contentHeight) => {
      setDialogPaperSectionBounds(
        section,
        {
          x: contentX,
          y: sectionY,
          width,
          height: contentInsetTop + contentHeight + contentInsetBottom,
        },
        paperOutsets,
      );
      const contentY = sectionY + contentInsetTop;
      sectionY =
        section.y + section.frameHeight + sectionGap + paperOutsets.top;
      return contentY;
    };

    const bannerSize = 88;
    const emblemTileSize = 24;
    const emblemTileGap = 2;
    const emblemTilePitch = emblemTileSize + emblemTileGap;
    const emblemsPerRow = Math.max(
      1,
      Math.floor((width + emblemTileGap) / emblemTilePitch),
    );
    const emblemRowCount = Math.ceil(this.emblemOptions.length / emblemsPerRow);
    const emblemRowOffset = 94;
    const emblemTilesOffset = emblemRowOffset + 14;
    const emblemGridHeight =
      (emblemRowCount - 1) * emblemTilePitch + emblemTileSize;
    const emblemColorOffset = emblemTilesOffset + emblemGridHeight + 3;
    const colorRowPitch = 37;
    const bannerColorOffset = emblemColorOffset + colorRowPitch;
    const tagColorOffset = bannerColorOffset + colorRowPitch;
    const identityContentHeight = tagColorOffset + 13 + 20 + 4;
    const identityY = layoutSection(
      this.createIdentitySection,
      identityContentHeight,
    );
    const bannerOffsetX = -Math.round(bannerSize * 0.15);
    const bannerX = contentX + bannerOffsetX;
    const infoX = bannerX + bannerSize + 8;
    const infoWidth = width - (infoX - contentX);
    this.bannerPreview.position.set(bannerX, identityY);
    this.bannerPreview.setSize(bannerSize, bannerSize);
    const identityFieldPitch = 38;
    this.labels.get('name').position.set(infoX, identityY);
    this.fields.get('name').position.set(infoX, identityY + 13);
    this.fields.get('name').setSize(infoWidth, 25);
    this.labels.get('tag').position.set(infoX, identityY + identityFieldPitch);
    this.fields
      .get('tag')
      .position.set(infoX, identityY + identityFieldPitch + 13);
    this.fields.get('tag').setSize(infoWidth, 25);

    const emblemRowY = identityY + emblemRowOffset;
    this.emblemLabel.position.set(contentX, emblemRowY);
    this.emblemOptionLayer.position.set(
      contentX,
      identityY + emblemTilesOffset,
    );
    this.emblemOptions.forEach((option, index) => {
      option.setBounds(
        (index % emblemsPerRow) * emblemTilePitch,
        Math.floor(index / emblemsPerRow) * emblemTilePitch,
        emblemTileSize,
      );
    });
    const emblemColorY = identityY + emblemColorOffset;
    this.emblemColorLabel.position.set(contentX, emblemColorY);
    this.emblemColorSwatchLayer.position.set(contentX, emblemColorY + 13);
    this.emblemColorSwatches.forEach((swatch, index) => {
      swatch.setBounds(index * 25, 0, 20);
    });

    const bannerColorY = identityY + bannerColorOffset;
    this.bannerColorLabel.position.set(contentX, bannerColorY);
    this.bannerColorSwatchLayer.position.set(contentX, bannerColorY + 13);
    this.bannerColorSwatches.forEach((swatch, index) => {
      swatch.setBounds(index * 25, 0, 20);
    });

    const tagColorY = identityY + tagColorOffset;
    this.tagColorLabel.position.set(contentX, tagColorY);
    this.tagColorSwatchLayer.position.set(contentX, tagColorY + 13);
    this.swatches.forEach((swatch, index) => {
      swatch.setBounds(index * 25, 0, 20);
    });

    const accessY = layoutSection(this.createAccessSection, 75);
    this.joinModeLabel.position.set(contentX, accessY);
    const joinButtonY = accessY + 13;
    const joinGap = 6;
    const joinWidth = (width - joinGap * 2) / 3;
    this.joinModeButtons.forEach((button, index) => {
      button.setBounds(
        contentX + index * (joinWidth + joinGap),
        joinButtonY,
        joinWidth,
        28,
      );
    });
    const actionY = joinButtonY + 34;
    this.saveButton.setBounds(contentX, actionY, width, 28);
    this.status.position.set(contentX, actionY + 30);
    return this.status.y + 18;
  }

  layoutBannerEditor(y, { x = 0, large = false, width = 0 } = {}) {
    if (large) {
      const previewSize = 160;
      const tileSize = 40;
      const tileGap = 6;
      const columns = 6;
      const gridWidth = columns * tileSize + (columns - 1) * tileGap;
      const gridX = x + (width - gridWidth) / 2;
      const emblemLabelY = y + previewSize + 12;
      const emblemGridY = emblemLabelY + 16;
      const emblemRows = Math.ceil(this.emblemOptions.length / columns);
      const emblemGridHeight =
        emblemRows * tileSize + Math.max(0, emblemRows - 1) * tileGap;
      const bannerColorY = emblemGridY + emblemGridHeight + 18;
      const emblemColorY = bannerColorY + 59;
      this.bannerPreview.position.set(
        x + (width - previewSize) / 2,
        y,
      );
      this.bannerPreview.setSize(previewSize, previewSize);
      this.emblemLabel.position.set(gridX, emblemLabelY);
      this.emblemOptionLayer.position.set(gridX, emblemGridY);
      this.emblemOptions.forEach((option, index) => {
        option.setBounds(
          (index % columns) * (tileSize + tileGap),
          Math.floor(index / columns) * (tileSize + tileGap),
          tileSize,
        );
      });
      this.bannerColorLabel.position.set(x, bannerColorY);
      this.bannerColorSwatchLayer.position.set(x, bannerColorY + 15);
      const swatchGap = Math.max(0, (width - 24 * 10) / 9);
      this.bannerColorSwatches.forEach((swatch, index) => {
        swatch.setBounds(index * (24 + swatchGap), 0, 24);
      });
      this.emblemColorLabel.position.set(x, emblemColorY);
      this.emblemColorSwatchLayer.position.set(x, emblemColorY + 15);
      this.emblemColorSwatches.forEach((swatch, index) => {
        swatch.setBounds(index * (24 + swatchGap), 0, 24);
      });
      return emblemColorY + 39;
    }
    this.bannerPreview.position.set(x, y);
    this.bannerPreview.setSize(86, 100);
    this.emblemLabel.position.set(x + 96, y);
    this.emblemOptionLayer.position.set(x + 96, y + 17);
    this.emblemOptions.forEach((option, index) => {
      option.setBounds((index % 6) * 28, Math.floor(index / 6) * 28, 24);
    });
    this.bannerColorLabel.position.set(x, y + 104);
    this.bannerColorSwatchLayer.position.set(x, y + 119);
    this.bannerColorSwatches.forEach((swatch, index) => {
      swatch.setBounds(index * 25, 0, 20);
    });
    this.emblemColorLabel.position.set(x, y + 151);
    this.emblemColorSwatchLayer.position.set(x, y + 166);
    this.emblemColorSwatches.forEach((swatch, index) => {
      swatch.setBounds(index * 25, 0, 20);
    });
    return y + 186;
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.theme = resolvedTheme;
    for (const label of this.labels.values()) {
      applyTextTheme(label, resolvedTheme, RETAINED_TEXT_STYLES.border);
    }
    for (const [key, field] of this.fields) {
      field.applyTheme(resolvedTheme);
      if (key !== 'tag') {
        field.setValueColor(resolvedTheme.text);
      }
    }
    applyTextTheme(
      this.tagColorLabel,
      resolvedTheme,
      RETAINED_TEXT_STYLES.border,
    );
    for (const swatch of this.swatches) {
      swatch.applyTheme(resolvedTheme);
    }
    applyTextTheme(
      this.emblemLabel,
      resolvedTheme,
      RETAINED_TEXT_STYLES.border,
    );
    applyTextTheme(
      this.bannerSectionLabel,
      resolvedTheme,
      RETAINED_TEXT_STYLES.bold,
    );
    for (const option of this.emblemOptions) {
      option.applyTheme(resolvedTheme);
    }
    applyTextTheme(
      this.bannerColorLabel,
      resolvedTheme,
      RETAINED_TEXT_STYLES.border,
    );
    applyTextTheme(
      this.emblemColorLabel,
      resolvedTheme,
      RETAINED_TEXT_STYLES.border,
    );
    for (const swatch of this.bannerColorSwatches) {
      swatch.applyTheme(resolvedTheme);
    }
    for (const swatch of this.emblemColorSwatches) {
      swatch.applyTheme(resolvedTheme);
    }
    applyTextTheme(
      this.joinModeLabel,
      resolvedTheme,
      RETAINED_TEXT_STYLES.border,
    );
    applyTextTheme(this.status, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'center',
      fill: resolvedTheme.muted,
    });
    this.joinModeButtons.forEach((button) => button.applyTheme(resolvedTheme));
    this.sectionTabs.forEach((button) => button.applyTheme(resolvedTheme));
    this.saveButton.applyTheme(resolvedTheme);
    this.disbandButton.applyTheme(resolvedTheme);
  }

  destroy() {
    for (const field of this.fields.values()) {
      field.destroy({ children: true });
    }
    for (const swatch of this.swatches) {
      swatch.destroy();
    }
    for (const swatch of this.bannerColorSwatches) {
      swatch.destroy();
    }
    for (const option of this.emblemOptions) {
      option.destroy();
    }
    for (const swatch of this.emblemColorSwatches) {
      swatch.destroy();
    }
    this.joinModeButtons.forEach((button) => button.destroy());
    this.sectionTabs.forEach((button) => button.destroy());
    this.saveButton.destroy();
    this.disbandButton.destroy();
    this.scroll.destroy();
    this.root.destroy({ children: true });
  }
}

export class AllianceEmblemOption {
  constructor({
    assetManager,
    inputRouter,
    semanticRegistry,
    semanticId,
    emblemId,
    action,
    label,
  }) {
    this.root = new Container({ label });
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    this.background = new Graphics({ label: `${label}:background` });
    this.emblemId = normalizeTradeAllianceEmblem(emblemId);
    this.icon = new Sprite({
      texture:
        assetManager?.getTexture?.(
          getTradeAllianceEmblem(this.emblemId).assetId,
        ) ?? Texture.EMPTY,
      anchor: 0.5,
      label: `${label}:icon`,
      roundPixels: true,
    });
    this.icon.visible = this.icon.texture !== Texture.EMPTY;
    this.icon.renderable = this.icon.visible;
    this.checkmark = new Sprite({
      texture:
        assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.checkmark) ??
        Texture.EMPTY,
      anchor: 0.5,
      label: `${label}:checkmark`,
      roundPixels: true,
    });
    this.checkmark.eventMode = 'none';
    this.checkmark.visible = false;
    this.checkmark.renderable = false;
    this.root.addChild(this.background, this.icon, this.checkmark);
    this.action = action;
    this.selected = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () => this.root.visible && this.root.renderable,
        onActivate: () => this.action?.(),
        haptic: 'selection',
      }) ?? null;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.semanticDefinition =
      semanticRegistry?.register?.({
        semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: true,
          interactive: true,
          visible: this.root.visible && this.root.renderable,
          selected: this.selected,
        }),
        activate: () => this.action?.(),
      }) ?? null;
  }

  setSelected(selected) {
    this.selected = Boolean(selected);
    this.redraw();
  }

  setTint(tint) {
    this.icon.tint = tint;
  }

  setBounds(x, y, size = 24) {
    this.root.position.set(x, y);
    this.size = size;
    this.root.hitArea = new Rectangle(0, 0, size, size);
    this.icon.position.set(size / 2, size / 2);
    this.icon.width = size - 5;
    this.icon.height = size - 5;
    this.checkmark.position.set(size - 4.5, size - 4.5);
    const checkmarkWidth = size * 0.46;
    this.checkmark.width = checkmarkWidth;
    this.checkmark.height = checkmarkWidth * (57 / 61);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redraw();
  }

  redraw() {
    const size = this.size ?? 24;
    this.background
      .clear()
      .roundRect(0, 0, size, size, 3)
      .fill(this.theme.panelFill)
      .stroke({
        color: this.theme.stroke,
        width: 1,
        alignment: 1,
      });
    const showCheckmark =
      this.selected && this.checkmark.texture !== Texture.EMPTY;
    this.checkmark.visible = showCheckmark;
    this.checkmark.renderable = showCheckmark;
  }

  destroy() {
    this.registration?.();
    this.registration = null;
    if (this.semanticDefinition) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
      this.semanticDefinition = null;
    }
    this.root.destroy({ children: true });
  }
}

export class AllianceMemberRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.model = null;
    this.targetId = null;
    this.root = new Container({
      label: `${dialog.dialogId}-alliance-member-row`,
    });
    this.hitTarget = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-alliance-member-hit`,
      inputRouter: dialog.inputRouter,
      variant: 'inline',
    });
    this.visual = new Container({
      label: `${dialog.dialogId}-alliance-member-visual`,
    });
    this.visual.eventMode = 'none';
    this.background = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${dialog.dialogId}-alliance-member-background`,
    });
    this.avatarWidget = new PlayerProfileWidget({
      assets: dialog.assetManager,
      texture: Texture.EMPTY,
      label: `${dialog.dialogId}-alliance-member-avatar`,
    });
    this.avatar = this.avatarWidget.portrait;
    this.username = createText('', RETAINED_TEXT_STYLES.body);
    this.role = createText('', RETAINED_TEXT_STYLES.border);
    this.level = createText('', RETAINED_TEXT_STYLES.border);
    this.level.anchor.set(1, 0);
    this.visual.addChild(
      this.background,
      this.avatarWidget,
      this.username,
      this.role,
      this.level,
    );
    this.root.addChild(this.hitTarget.root, this.visual);
  }

  bind(model) {
    this.unregisterTarget();
    this.model = model ?? {};
    this.root.visible = true;
    setText(this.username, this.model.username ?? 'Wizard');
    setText(this.role, this.model.roleLabel ?? 'Trader');
    setText(this.level, this.model.levelLabel ?? 'Lv 1');
    this.avatarWidget
      .setTexture(
        resolveCharacterTexture(this.dialog.assetManager, this.model.character),
      )
      .setBackgroundTint(getPlayerFrameTint(this.model.frame));
    const interactive = typeof this.model.onActivate === 'function';
    this.hitTarget.setModel({
      label: '',
      enabled: interactive,
      action: () => this.model.onActivate?.(this.model),
    });
    this.targetId = this.model.semanticId ?? null;
    if (this.targetId) {
      this.dialog.registerTarget({
        semanticId: this.targetId,
        displayObject: this.hitTarget.root,
        state: () => ({ enabled: interactive, interactive }),
        activate: () => this.model.onActivate?.(this.model) ?? false,
      });
    }
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  activate() {
    return this.model?.onActivate?.(this.model) ?? false;
  }

  setBounds(x, y, width, height = ALLIANCE_MEMBER_ROW_HEIGHT) {
    this.root.position.set(x, y);
    this.hitTarget.setBounds(0, 0, width, height);
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const backgroundWidth = Math.max(0, width - rowGap);
    const backgroundHeight = Math.max(0, height - rowGap);
    this.visual.pivot.set(width / 2, height / 2);
    this.visual.position.set(width / 2, height / 2);
    this.background.position.set(0, rowGap / 2);
    this.background.setSize(
      backgroundWidth,
      backgroundHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    const avatarScale = ALLIANCE_MEMBER_AVATAR_SIZE / 186;
    this.avatarWidget.scale.set(avatarScale);
    this.avatarWidget.position.set(
      6,
      (height - ALLIANCE_MEMBER_AVATAR_SIZE) / 2,
    );
    const textX = ALLIANCE_MEMBER_AVATAR_SIZE + 12;
    this.username.position.set(textX, 8);
    this.role.position.set(textX, 27);
    this.level.position.set(backgroundWidth - 8, 18);
    this.root.hitArea = new Rectangle(0, 0, backgroundWidth, height);
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.username, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.body,
      fontWeight: '700',
      fill: resolvedTheme.text,
    });
    applyTextTheme(this.role, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.level, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: resolvedTheme.text,
    });
    this.hitTarget.applyTheme(resolvedTheme);
    this.background.setTexture(
      this.dialog.assetManager?.getTexture?.(
        PIXI_ROOT_RUN_ASSETS.settingsRow,
      ) ?? Texture.EMPTY,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
    );
  }

  reset() {
    this.unregisterTarget();
    this.model = null;
    this.root.visible = false;
    this.avatarWidget.setTexture(Texture.EMPTY);
    this.hitTarget.setModel({ label: '', enabled: false });
  }

  unregisterTarget() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    this.targetId = null;
  }

  destroy() {
    this.unregisterTarget();
    this.hitTarget.destroy();
    this.root.destroy({ children: true });
  }
}

export class AllianceDirectoryRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.model = null;
    this.width = WORKSHOP_DIALOG_CONTENT_WIDTH;
    this.targetIds = [];
    this.root = new Container({
      label: `${dialog.dialogId}-alliance-directory-row`,
    });
    this.background = createDialogPaperSection(
      dialog.panel.paperFrame.texture,
      `${dialog.dialogId}-alliance-directory-paper`,
    );
    this.summaryHit = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-alliance-directory-summary`,
      inputRouter: dialog.inputRouter,
      variant: 'inline',
    });
    this.banner = new AllianceFlagWidget({
      assetManager: dialog.assetManager,
      label: `${this.root.label}:banner`,
    });
    this.tag = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      fontWeight: '700',
    });
    this.name = createText('', RETAINED_TEXT_STYLES.bold);
    this.leaderAvatarWidget = new PlayerProfileWidget({
      assets: dialog.assetManager,
      texture: Texture.EMPTY,
      label: `${dialog.dialogId}-alliance-directory-leader-avatar`,
    });
    this.leaderName = createText('', RETAINED_TEXT_STYLES.border);
    this.leaderRole = createText('Leader', RETAINED_TEXT_STYLES.border);
    this.memberCount = createText('', RETAINED_TEXT_STYLES.border);
    this.memberCount.anchor.set(1, 0);
    this.totalSuffix = createText('total', RETAINED_TEXT_STYLES.border);
    this.total = new PixiResourceLabel({
      assetManager: dialog.assetManager,
      resource: 'coin',
      includeResourceName: false,
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'bold',
      label: `${this.root.label}:total`,
    });
    this.action = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-alliance-directory-action`,
      inputRouter: dialog.inputRouter,
      variant: 'green',
    });
    this.root.addChild(
      this.background,
      this.banner,
      this.tag,
      this.name,
      this.leaderAvatarWidget,
      this.leaderName,
      this.leaderRole,
      this.memberCount,
      this.total,
      this.totalSuffix,
      this.summaryHit.root,
      this.action.root,
    );
  }

  bind(model) {
    this.unregisterTargets();
    this.model = model ?? {};
    this.root.visible = true;
    const tag = normalizeWorldChatTag(this.model.tag);
    setText(this.tag, tag ? `[${tag}]` : '');
    setText(this.name, this.model.name ?? 'Alliance');
    setText(this.leaderName, this.model.leaderName ?? 'Unknown');
    setText(this.leaderRole, 'Leader');
    setText(this.totalSuffix, 'total');
    setText(
      this.memberCount,
      `${Math.max(0, Number(this.model.memberCount) || 0)}/${Math.max(
        1,
        Number(this.model.memberCapacity) || 50,
      )}`,
    );
    this.leaderAvatarWidget
      .setTexture(
        resolveCharacterTexture(
          this.dialog.assetManager,
          this.model.leaderCharacter,
        ),
      )
      .setBackgroundTint(getPlayerFrameTint(this.model.leaderFrame));
    this.total.bind(this.model.id, {
      amount: this.model.totalIncomeLabel ?? '0',
      includeResourceName: false,
      resource: 'coin',
    });
    this.banner.setColors({
      bannerColor: this.model.bannerColor,
      emblemColor: this.model.emblemColor,
      emblemId: this.model.emblemId,
    });
    this.banner.visible = true;
    this.banner.renderable = true;
    this.summaryHit.setModel({
      label: '',
      enabled: typeof this.model.onActivate === 'function',
      action: () => this.model.onActivate?.(this.model),
    });
    const actionModel = this.model.action ?? {};
    const hasAction = Boolean(actionModel.label);
    this.action.root.visible = hasAction;
    this.action.root.renderable = hasAction;
    this.action.variant = actionModel.variant ?? 'green';
    this.action.control.setVariant(this.action.variant);
    this.action.setModel({
      label: actionModel.label ?? '',
      enabled: actionModel.enabled !== false,
      action: () => actionModel.onActivate?.(this.model),
    });
    this.registerTargets();
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  registerTargets() {
    const summaryId = this.model.semanticId
      ? `${this.model.semanticId}.summary`
      : null;
    const actionId = this.model.semanticId
      ? `${this.model.semanticId}.action`
      : null;
    if (summaryId) {
      this.targetIds.push(summaryId);
      this.dialog.registerTarget({
        semanticId: summaryId,
        displayObject: this.summaryHit.root,
        state: () => ({
          enabled: typeof this.model?.onActivate === 'function',
          interactive: typeof this.model?.onActivate === 'function',
        }),
        activate: () => this.model?.onActivate?.(this.model) ?? false,
      });
    }
    if (actionId) {
      this.targetIds.push(actionId);
      this.dialog.registerTarget({
        semanticId: actionId,
        displayObject: this.action.root,
        state: () => ({
          enabled: this.model?.action?.enabled !== false,
          interactive: typeof this.model?.action?.onActivate === 'function',
          visible: this.action.root.visible,
        }),
        activate: () => this.model?.action?.onActivate?.(this.model) ?? false,
      });
    }
  }

  setBounds(x, y, width, height = ALLIANCE_DIRECTORY_ROW_HEIGHT) {
    this.root.position.set(x, y);
    this.width = width;
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const sectionWidth = Math.max(0, width - rowGap);
    this.background.position.set(0, 0);
    this.background.setSize(
      sectionWidth,
      height,
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
    );
    this.summaryHit.setBounds(0, 0, sectionWidth, height);
    const bannerSize = ALLIANCE_DIRECTORY_BANNER_SIZE;
    this.banner.setSize(bannerSize, bannerSize);
    this.banner.position.set(
      ALLIANCE_DIRECTORY_SECTION_INSET +
        (bannerSize - this.banner.flagWidth) / 2,
      ALLIANCE_DIRECTORY_BANNER_TOP,
    );
    const textX = ALLIANCE_DIRECTORY_SECTION_INSET + bannerSize + 7;
    const actionWidth = 62;
    const actionX = sectionWidth - 7 - actionWidth;
    this.tag.position.set(textX, 8);
    this.name.position.set(textX + (this.tag.text ? this.tag.width + 3 : 0), 7);
    this.memberCount.position.set(sectionWidth - 10, 8);
    fitLeaderboardText(
      this.name,
      Math.max(
        1,
        this.memberCount.x - this.memberCount.width - 6 - this.name.x,
      ),
    );

    const leaderY = ALLIANCE_DIRECTORY_INFO_TOP;
    const totalY = leaderY + ALLIANCE_DIRECTORY_INFO_LINE_GAP;
    const leaderAvatarX = textX;
    const leaderAvatarScale =
      ALLIANCE_DIRECTORY_LEADER_PROFILE_SIZE / PLAYER_PROFILE_SIZE;
    this.leaderAvatarWidget.scale.set(leaderAvatarScale);
    this.leaderAvatarWidget.position.set(leaderAvatarX, leaderY - 1);
    this.leaderName.position.set(
      leaderAvatarX + ALLIANCE_DIRECTORY_LEADER_PROFILE_SIZE + 4,
      leaderY,
    );
    this.leaderRole.position.set(
      this.leaderName.x,
      leaderY + ALLIANCE_DIRECTORY_LEADER_ROLE_GAP,
    );
    fitLeaderboardText(
      this.leaderName,
      Math.max(1, actionX - 5 - this.leaderName.x),
    );
    this.total.position.set(textX, totalY);
    this.totalSuffix.position.set(textX + this.total.measuredWidth + 3, totalY);
    if (this.action.root.visible) {
      const metadataCenterY =
        (this.leaderName.y + this.total.y + this.total.fontSize) / 2;
      this.action.setBounds(actionX, metadataCenterY - 14, actionWidth, 28);
    }
    this.root.hitArea = new Rectangle(0, 0, sectionWidth, height);
  }

  getPreferredHeight() {
    return ALLIANCE_DIRECTORY_ROW_HEIGHT;
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.theme = resolvedTheme;
    applyTextTheme(this.tag, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill:
        WORLD_CHAT_TAG_COLORS[
          normalizeWorldChatTagColor(this.model?.tagColor)
        ] ?? WORLD_CHAT_TAG_COLORS.ink,
    });
    applyTextTheme(this.name, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: resolvedTheme.text,
    });
    applyTextTheme(this.leaderName, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.text,
    });
    applyTextTheme(this.leaderRole, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.memberCount, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.totalSuffix, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    this.total.applyTheme(resolvedTheme);
    this.summaryHit.applyTheme(resolvedTheme);
    this.action.applyTheme(resolvedTheme);
  }

  reset() {
    this.unregisterTargets();
    this.model = null;
    this.root.visible = false;
    this.banner.setColors({});
    this.leaderAvatarWidget
      .setTexture(Texture.EMPTY)
      .setBackgroundTint(0xffffff);
    this.summaryHit.setModel({ label: '', enabled: false });
    this.action.setModel({ label: '', enabled: false });
  }

  unregisterTargets() {
    for (const targetId of this.targetIds) {
      this.dialog.unregisterTarget(targetId);
    }
    this.targetIds.length = 0;
  }

  destroy() {
    this.unregisterTargets();
    this.summaryHit.destroy();
    this.action.destroy();
    this.root.destroy({ children: true });
  }
}

class PotionDiscoveryIngredientPageRowPixi {
  constructor({ dialog, index }) {
    this.dialog = dialog;
    this.root = new Container({
      label: `${dialog.dialogId}-discovery-ingredient:${index}`,
    });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `${this.root.label}:icon`;
    this.label = createText('', RETAINED_TEXT_STYLES.border);
    this.quantity = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.quantity.anchor.set(1, 0);
    this.root.addChild(this.icon, this.label, this.quantity);
    this.root.visible = false;
  }

  bind(model) {
    this.model = model ?? {};
    setText(this.label, this.model.label ?? 'Unknown');
    setText(this.quantity, `×${this.model.quantity ?? 0}`);
    this.icon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      getHerbIconFrameName(this.model.key),
    );
    this.root.visible = true;
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.label.position.set(0, 0);
    this.icon.position.set(this.label.width + DISCOVERY_INGREDIENT_ICON_GAP, 1);
    this.icon.width = DISCOVERY_INGREDIENT_ICON_SIZE;
    this.icon.height = DISCOVERY_INGREDIENT_ICON_SIZE;
    this.quantity.position.set(width, 0);
    this.root.hitArea = new Rectangle(
      0,
      0,
      width,
      DISCOVERY_INGREDIENT_ROW_HEIGHT,
    );
  }

  applyTheme(theme) {
    applyTextTheme(this.label, theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: theme.resourceColors?.herb ?? theme.text,
    });
    applyTextTheme(this.quantity, theme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: theme.muted,
    });
  }

  reset() {
    this.model = null;
    this.icon.texture = Texture.EMPTY;
    setText(this.label, '');
    setText(this.quantity, '');
    this.root.visible = false;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/**
 * One passive discovery page inside the Workshop's two-page potion book.
 *
 * The discoverer name is the only action and opens the existing Player Info
 * surface. Unknown potions intentionally hide recipe and economy metadata.
 */
export class PotionDiscoveryPagePixi {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.root = new Container({
      label: `${dialog.dialogId}-potion-discovery-page`,
    });
    this.background = createDialogPaperSection(
      dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.dialogPaper) ??
        Texture.EMPTY,
      `${this.root.label}:paper`,
    );
    this.unknownOverlay = createDialogPaperSection(
      dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.dialogPaper) ??
        Texture.EMPTY,
      `${this.root.label}:unknown-overlay`,
    );
    this.unknownOverlay.tint = 0x000000;
    this.unknownOverlay.alpha = UNKNOWN_RECIPE_OVERLAY_ALPHA;
    this.unknownOverlay.visible = false;
    this.unknownOverlay.renderable = false;
    this.potionIcon = new Sprite(Texture.EMPTY);
    this.potionIcon.label = `${this.root.label}:potion-icon`;
    this.name = createText('', {
      ...RETAINED_TEXT_STYLES.bold,
      wordWrapWidth:
        DISCOVERY_PAGE_WIDTH -
        DISCOVERY_PAGE_CONTENT_INSET * 2 -
        DISCOVERY_ICON_SIZE -
        DISCOVERY_HEADER_GAP,
    });
    this.date = createText('', RETAINED_TEXT_STYLES.border);
    this.discovererPrefix = createText('', {
      ...RETAINED_TEXT_STYLES.border,
    });
    this.discovererName = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      fontWeight: '700',
    });
    this.recipeLabel = createText('', {
      ...RETAINED_TEXT_STYLES.bold,
    });
    this.unknownStatus = new Container({
      label: `${this.root.label}:unknown-status`,
    });
    this.unknownStatus.eventMode = 'none';
    this.unknownStatusBackground = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${this.root.label}:unknown-status-background`,
    });
    this.unknownStatusBackground.eventMode = 'none';
    this.unknownStatusLabel = createText(
      UNKNOWN_RECIPE_STATUS_LABEL,
      RETAINED_TEXT_STYLES.border,
    );
    this.unknownStatusLabel.anchor.set(0.5);
    this.unknownStatus.addChild(
      this.unknownStatusBackground,
      this.unknownStatusLabel,
    );
    this.manaIcon = new Sprite(Texture.EMPTY);
    this.manaIcon.label = `${this.root.label}:mana-icon`;
    this.manaLabel = createText('Required mana:', {
      ...RETAINED_TEXT_STYLES.border,
    });
    this.mana = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.mana.anchor.set(1, 0);
    this.durationLabel = createText(
      'Required Time:',
      RETAINED_TEXT_STYLES.border,
    );
    this.duration = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.duration.anchor.set(1, 0);
    this.royaltyIcon = new Sprite(Texture.EMPTY);
    this.royaltyIcon.label = `${this.root.label}:royalty-icon`;
    this.royaltyLabel = createText('Royalty:', RETAINED_TEXT_STYLES.border);
    this.royalty = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.royalty.anchor.set(1, 0);
    this.ingredientRows = Array.from(
      { length: DISCOVERY_MAX_INGREDIENTS },
      (_, index) =>
        new PotionDiscoveryIngredientPageRowPixi({
          dialog,
          index,
        }),
    );
    this.root.addChild(
      this.background,
      this.unknownOverlay,
      this.potionIcon,
      this.name,
      this.date,
      this.discovererPrefix,
      this.discovererName,
      this.recipeLabel,
      this.unknownStatus,
      ...this.ingredientRows.map((row) => row.root),
      this.manaLabel,
      this.manaIcon,
      this.mana,
      this.durationLabel,
      this.duration,
      this.royaltyLabel,
      this.royaltyIcon,
      this.royalty,
    );
    this.discovererRegistration =
      dialog.inputRouter?.registerPressTarget?.(this.discovererName, {
        enabled: () => this.isDiscovererInteractive(),
        onActivate: () => this.activateDiscoverer(),
        haptic: 'selection',
        excludePageSwipe: true,
      }) ?? null;
    this.root.visible = false;
  }

  bind(model) {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }

    this.model = model ?? {};
    this.targetId = null;
    this.discovered = this.model.discovered === true;
    this.root.visible = true;
    setText(
      this.name,
      this.discovered
        ? (this.model.label ?? 'Discovered Potion')
        : 'Undiscovered Potion',
    );
    setText(
      this.discovererPrefix,
      this.discovered ? 'Discovered by' : 'No wizard has recorded it yet',
    );
    setText(
      this.discovererName,
      this.discovered
        ? (this.model.discovererUsername ?? 'Unknown Wizard')
        : '',
    );
    setText(
      this.date,
      this.discovered ? (this.model.discoveredAtLabel ?? 'Date Unknown') : '',
    );
    setText(
      this.recipeLabel,
      this.discovered ? 'Recipe' : 'Recipe remains hidden',
    );
    setText(this.mana, stripDiscoverySuffix(this.model.manaLabel, /\s+mana$/i));
    setText(
      this.duration,
      stripDiscoverySuffix(this.model.durationLabel, /\s+brew$/i),
    );
    setText(
      this.royalty,
      stripDiscoverySuffix(this.model.royaltyLabel, /\s+coin\s+royalty$/i),
    );
    this.potionIcon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      this.discovered
        ? getPotionIconFrameName(this.model.potionKey)
        : UNKNOWN_POTION_ICON_FRAME,
    );
    this.potionIcon.alpha = 1;
    this.syncPotionIconBounds();
    this.manaIcon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      RESOURCE_ICON_FRAMES.mana,
    );
    this.royaltyIcon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      RESOURCE_ICON_FRAMES.coin,
    );

    const ingredients = this.discovered
      ? (this.model.ingredients ?? []).slice(0, DISCOVERY_MAX_INGREDIENTS)
      : [];
    this.ingredientRows.forEach((row, index) => {
      if (ingredients[index]) {
        row.bind(ingredients[index]);
      } else {
        row.reset();
      }
    });
    this.syncMetadataVisibility();
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
    this.syncInteraction();

    this.targetId = this.model.discovererSemanticId ?? null;
    if (this.targetId && this.discovered) {
      this.dialog.registerTarget({
        semanticId: this.targetId,
        displayObject: this.discovererName,
        state: () => ({
          enabled: this.isDiscovererInteractive(),
          interactive: this.isDiscovererInteractive(),
        }),
        activate: () => this.activateDiscoverer(),
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.height = height;
    this.background.position.set(0, 0);
    this.background.setSize(width, height);
    this.unknownOverlay.position.set(0, 0);
    this.unknownOverlay.setSize(width, height);
    this.root.hitArea = new Rectangle(0, 0, width, height);

    const contentWidth = Math.max(0, width - DISCOVERY_PAGE_CONTENT_INSET * 2);
    this.syncPotionIconBounds();
    this.unknownStatus.position.set(DISCOVERY_PAGE_CONTENT_INSET, height - 38);
    this.unknownStatusBackground.setSize(
      contentWidth,
      UNKNOWN_RECIPE_STATUS_HEIGHT,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    this.unknownStatusLabel.position.set(
      contentWidth / 2,
      UNKNOWN_RECIPE_STATUS_HEIGHT / 2,
    );
    this.name.position.set(
      DISCOVERY_PAGE_CONTENT_INSET + DISCOVERY_ICON_SIZE + DISCOVERY_HEADER_GAP,
      DISCOVERY_PAGE_CONTENT_INSET + 5,
    );
    this.name.style.wordWrap = true;
    this.name.style.wordWrapWidth = Math.max(
      0,
      contentWidth - DISCOVERY_ICON_SIZE - DISCOVERY_HEADER_GAP,
    );
    this.date.position.set(this.name.x, DISCOVERY_PAGE_CONTENT_INSET + 35);
    this.discovererPrefix.position.set(DISCOVERY_PAGE_CONTENT_INSET, 67);
    this.discovererName.position.set(DISCOVERY_PAGE_CONTENT_INSET, 80);
    this.discovererName.hitArea = new Rectangle(
      0,
      0,
      Math.max(1, this.discovererName.width),
      Math.max(1, this.discovererName.height),
    );
    this.recipeLabel.position.set(DISCOVERY_PAGE_CONTENT_INSET, 105);
    const ingredientsY = 127;
    this.ingredientRows.forEach((row, index) => {
      if (!row.root.visible) {
        return;
      }
      row.setBounds(
        DISCOVERY_PAGE_CONTENT_INSET,
        ingredientsY + index * DISCOVERY_INGREDIENT_ROW_HEIGHT,
        contentWidth,
      );
    });
    const metadataY =
      ingredientsY +
      DISCOVERY_MAX_INGREDIENTS * DISCOVERY_INGREDIENT_ROW_HEIGHT +
      6;
    this.manaLabel.position.set(DISCOVERY_PAGE_CONTENT_INSET, metadataY);
    this.manaIcon.position.set(
      width - DISCOVERY_PAGE_CONTENT_INSET - DISCOVERY_RESOURCE_ICON_SIZE,
      metadataY,
    );
    this.manaIcon.width = DISCOVERY_RESOURCE_ICON_SIZE;
    this.manaIcon.height = DISCOVERY_RESOURCE_ICON_SIZE;
    this.mana.position.set(
      this.manaIcon.x - DISCOVERY_RESOURCE_ICON_GAP,
      metadataY,
    );
    this.durationLabel.position.set(
      DISCOVERY_PAGE_CONTENT_INSET,
      metadataY + DISCOVERY_METADATA_ROW_HEIGHT,
    );
    this.duration.position.set(
      width - DISCOVERY_PAGE_CONTENT_INSET,
      metadataY + DISCOVERY_METADATA_ROW_HEIGHT,
    );
    this.royaltyLabel.position.set(
      DISCOVERY_PAGE_CONTENT_INSET,
      metadataY + DISCOVERY_METADATA_ROW_HEIGHT * 2,
    );
    this.royaltyIcon.position.set(
      width - DISCOVERY_PAGE_CONTENT_INSET - DISCOVERY_RESOURCE_ICON_SIZE,
      metadataY + DISCOVERY_METADATA_ROW_HEIGHT * 2,
    );
    this.royaltyIcon.width = DISCOVERY_RESOURCE_ICON_SIZE;
    this.royaltyIcon.height = DISCOVERY_RESOURCE_ICON_SIZE;
    this.royalty.position.set(
      this.royaltyIcon.x - DISCOVERY_RESOURCE_ICON_GAP,
      metadataY + DISCOVERY_METADATA_ROW_HEIGHT * 2,
    );
  }

  syncPotionIconBounds() {
    const width = this.discovered
      ? DISCOVERY_ICON_SIZE
      : DISCOVERY_ICON_SIZE * UNKNOWN_POTION_ICON_ASPECT_RATIO;
    const pageWidth = this.width ?? DISCOVERY_PAGE_WIDTH;
    const pageHeight = this.height ?? DISCOVERY_PAGE_HEIGHT;
    this.potionIcon.position.set(
      this.discovered
        ? DISCOVERY_PAGE_CONTENT_INSET - 4 + (DISCOVERY_ICON_SIZE - width) / 2
        : (pageWidth - width) / 2,
      this.discovered
        ? DISCOVERY_PAGE_CONTENT_INSET + 3
        : (pageHeight - DISCOVERY_ICON_SIZE) / 2 +
            UNKNOWN_RECIPE_LOCK_CENTER_OFFSET_Y,
    );
    this.potionIcon.width = width;
    this.potionIcon.height = DISCOVERY_ICON_SIZE;
  }

  getPreferredHeight() {
    return DISCOVERY_PAGE_HEIGHT;
  }

  get visibleIngredientCount() {
    return this.ingredientRows.filter((row) => row.root.visible).length;
  }

  syncMetadataVisibility() {
    for (const displayObject of [
      this.name,
      this.date,
      this.discovererPrefix,
      this.discovererName,
      this.recipeLabel,
      this.manaLabel,
      this.manaIcon,
      this.mana,
      this.durationLabel,
      this.duration,
      this.royaltyLabel,
      this.royaltyIcon,
      this.royalty,
    ]) {
      displayObject.visible = this.discovered;
      displayObject.renderable = this.discovered;
    }
    this.unknownStatus.visible = !this.discovered;
    this.unknownStatus.renderable = !this.discovered;
    this.unknownOverlay.visible = !this.discovered;
    this.unknownOverlay.renderable = !this.discovered;
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? this.dialog.theme;
    applyTextTheme(this.name, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: this.discovered ? resolvedTheme.text : resolvedTheme.muted,
      wordWrapWidth:
        (this.width ?? DISCOVERY_PAGE_WIDTH) -
        DISCOVERY_PAGE_CONTENT_INSET * 2 -
        DISCOVERY_ICON_SIZE -
        DISCOVERY_HEADER_GAP,
    });
    applyTextTheme(this.date, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.discovererPrefix, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.discovererName, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fontWeight: '700',
      fill: DISCOVERY_PLAYER_COLOR,
    });
    applyTextTheme(this.recipeLabel, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: this.discovered ? resolvedTheme.text : resolvedTheme.muted,
    });
    applyTextTheme(this.unknownStatusLabel, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    for (const label of [
      this.manaLabel,
      this.durationLabel,
      this.royaltyLabel,
    ]) {
      applyTextTheme(label, resolvedTheme, {
        ...RETAINED_TEXT_STYLES.border,
        fill: resolvedTheme.text,
      });
    }
    applyTextTheme(this.mana, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: resolvedTheme.resourceColors?.mana ?? resolvedTheme.text,
    });
    applyTextTheme(this.duration, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.royalty, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: resolvedTheme.text,
    });
    for (const row of this.ingredientRows) {
      row.applyTheme(resolvedTheme);
    }
  }

  isDiscovererInteractive() {
    return Boolean(
      this.discovered &&
      typeof this.model?.onDiscovererActivate === 'function' &&
      this.root.visible,
    );
  }

  syncInteraction() {
    const interactive = this.isDiscovererInteractive();
    this.discovererName.eventMode = interactive ? 'static' : 'none';
    this.discovererName.cursor = interactive ? 'pointer' : 'default';
  }

  activateDiscoverer() {
    if (!this.isDiscovererInteractive()) {
      return false;
    }
    return this.model.onDiscovererActivate(this.model) ?? true;
  }

  reset() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    this.targetId = null;
    this.model = null;
    this.discovered = false;
    this.unknownOverlay.visible = false;
    this.unknownOverlay.renderable = false;
    this.potionIcon.texture = Texture.EMPTY;
    this.manaIcon.texture = Texture.EMPTY;
    this.royaltyIcon.texture = Texture.EMPTY;
    for (const row of this.ingredientRows) {
      row.reset();
    }
    this.root.visible = false;
    this.syncInteraction();
  }

  destroy() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    disposeInputRegistration(this.discovererRegistration);
    this.discovererRegistration = null;
    for (const row of this.ingredientRows) {
      row.destroy();
    }
    this.ingredientRows.length = 0;
    this.root.destroy({ children: true });
  }
}

/**
 * Image-backed leaderboard identity row shared by player and alliance scopes.
 * The complete row is the profile/details action; no repeated Open button is
 * needed, and the right column remains reserved for the selected coin total.
 */
export class LeaderboardRowPixi extends ClickableWidget {
  constructor({ dialog }) {
    super({
      enabled: false,
      inputRouter: dialog.inputRouter,
      label: `${dialog.dialogId}-leaderboard-row`,
      pressScale: 0.98,
    });
    this.dialog = dialog;
    this.model = {};
    this.targetId = null;
    this.visual = new Container({ label: `${this.root.label}:visual` });
    this.setClickableVisual(this.visual);
    this.background = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${this.root.label}:background`,
    });
    this.currentOutline = new Graphics({ label: `${this.root.label}:current` });
    this.rank = createText('', RETAINED_TEXT_STYLES.bold);
    this.rank.anchor.set(0.5, 0);
    this.avatarWidget = new PlayerProfileWidget({
      assets: dialog.assetManager,
      texture: Texture.EMPTY,
      label: `${this.root.label}:profile`,
    });
    this.allianceFlag = new AllianceFlagWidget({
      assetManager: dialog.assetManager,
      label: `${this.root.label}:alliance-flag`,
    });
    this.tag = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      fontWeight: '700',
    });
    this.name = createText('', RETAINED_TEXT_STYLES.bold);
    this.level = createText('', RETAINED_TEXT_STYLES.border);
    this.prestigeStars = new PixiStarLevelLabel({
      assetManager: dialog.assetManager,
      size: 8,
      gap: 0,
      label: `${this.root.label}:prestige-stars`,
    });
    this.detail = createText('', RETAINED_TEXT_STYLES.border);
    this.total = new PixiResourceLabel({
      assetManager: dialog.assetManager,
      resource: 'coin',
      includeResourceName: false,
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'bold',
      label: `${this.root.label}:total`,
    });
    this.pointsTotal = createText('', RETAINED_TEXT_STYLES.bold);
    this.visual.addChild(
      this.background,
      this.currentOutline,
      this.rank,
      this.avatarWidget,
      this.allianceFlag,
      this.tag,
      this.name,
      this.level,
      this.prestigeStars,
      this.detail,
      this.total,
      this.pointsTotal,
    );
    this.root.addChild(this.visual);
  }

  bind(model) {
    this.unregisterTarget();
    this.model = model ?? {};
    const player = this.model.type !== 'leaderboardAlliance';
    this.root.visible = true;
    this.root.renderable = true;
    setText(
      this.rank,
      `${Math.max(1, Math.floor(Number(this.model.rank) || 1))}.`,
    );
    setText(
      this.tag,
      normalizeWorldChatTag(this.model.allianceTag)
        ? `[${normalizeWorldChatTag(this.model.allianceTag)}]`
        : '',
    );
    setText(
      this.name,
      player
        ? (this.model.username ?? 'Wizard')
        : (this.model.name ?? 'Alliance'),
    );
    setText(
      this.level,
      player ? `Lv ${Math.max(1, Number(this.model.playerLevel) || 1)}` : '',
    );
    const prestigeCount = Math.max(
      0,
      Math.floor(Number(this.model.prestigeCount) || 0),
    );
    this.prestigeStars.setLevel(prestigeCount);
    setText(
      this.detail,
      player
        ? this.model.current === true
          ? 'Your Rank'
          : ''
        : this.model.memberCount > 0
          ? `${this.model.memberCount} Members`
          : 'Trade Alliance',
    );
    this.avatarWidget.visible = player;
    this.avatarWidget.renderable = player;
    if (player) {
      this.avatarWidget
        .setTexture(
          resolveCharacterTexture(
            this.dialog.assetManager,
            this.model.character,
          ),
        )
        .setBackgroundTint(getPlayerFrameTint(this.model.frame));
    }
    this.allianceFlag.visible = !player;
    this.allianceFlag.renderable = !player;
    if (!player) {
      this.allianceFlag.setColors({
        bannerColor: this.model.bannerColor,
        emblemColor: this.model.emblemColor,
        emblemId: this.model.emblemId,
      });
    }
    this.prestigeStars.visible = player && prestigeCount > 0;
    this.prestigeStars.renderable = this.prestigeStars.visible;
    const usesPointsTotal = this.model.totalMetric === 'points';
    this.total.visible = !usesPointsTotal;
    this.total.renderable = !usesPointsTotal;
    this.pointsTotal.visible = usesPointsTotal;
    this.pointsTotal.renderable = usesPointsTotal;
    if (usesPointsTotal) {
      setText(
        this.pointsTotal,
        this.model.totalLabel ?? this.model.totalPointsLabel ?? '0',
      );
    } else {
      setText(this.pointsTotal, '');
      this.total.bind(this.model.id, {
        amount: this.model.totalCoinLabel ?? '0',
        includeResourceName: false,
        resource: 'coin',
      });
    }
    this.setClickableState({
      enabled: typeof this.model.onActivate === 'function',
      action: () => this.model.onActivate?.(this.model),
    });
    this.targetId = this.model.semanticId ?? null;
    if (this.targetId) {
      this.dialog.registerTarget({
        semanticId: this.targetId,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: Boolean(this.action),
        }),
        activate: () => this.model.onActivate?.(this.model) ?? false,
      });
    }
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  setBounds(x, y, width, height = LEADERBOARD_ROW_HEIGHT) {
    this.root.position.set(x, y);
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const backgroundWidth = Math.max(0, width - rowGap);
    const backgroundHeight = Math.max(0, height - rowGap);
    this.visual.pivot.set(width / 2, height / 2);
    this.visual.position.set(width / 2, height / 2);
    this.background.position.set(0, rowGap / 2);
    this.background.setSize(
      backgroundWidth,
      backgroundHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    this.currentOutline
      .clear()
      .roundRect(
        1,
        rowGap / 2 + 1,
        backgroundWidth - 2,
        backgroundHeight - 2,
        5,
      )
      .stroke({
        color: this.dialog.contentTheme?.accent ?? '#a864d9',
        width: 1.5,
        alpha: this.model.current ? 0.9 : 0,
      });
    const identityX = LEADERBOARD_IDENTITY_X + LEADERBOARD_LIST_LEFT_EXPANSION;
    this.rank.position.set(identityX / 2, 17);
    const avatarScale = LEADERBOARD_AVATAR_SIZE / 186;
    this.avatarWidget.scale.set(avatarScale);
    this.avatarWidget.position.set(
      identityX,
      (height - LEADERBOARD_AVATAR_SIZE) / 2,
    );
    const flagSize = LEADERBOARD_AVATAR_SIZE - 2;
    this.allianceFlag.setSize(flagSize, flagSize);
    this.allianceFlag.position.set(
      identityX + (LEADERBOARD_AVATAR_SIZE - this.allianceFlag.flagWidth) / 2,
      (height - this.allianceFlag.flagHeight) / 2,
    );
    const textX = identityX + LEADERBOARD_AVATAR_SIZE + 5;
    this.tag.position.set(textX, 7);
    this.name.position.set(textX + (this.tag.text ? this.tag.width + 3 : 0), 6);
    const totalRight = backgroundWidth - 8;
    const totalWidth = this.pointsTotal.visible
      ? this.pointsTotal.width
      : this.total.measuredWidth;
    const totalX = totalRight - totalWidth;
    this.total.position.set(totalX, 17);
    this.pointsTotal.position.set(totalX, 17);
    const maxNameRight = Math.max(textX + 24, totalX - 7);
    fitLeaderboardText(this.name, maxNameRight - this.name.x);
    this.level.position.set(textX, 27);
    const prestigeX = textX + this.level.width + 6;
    this.prestigeStars.position.set(prestigeX, 30);
    this.detail.position.set(
      this.prestigeStars.visible
        ? prestigeX + this.prestigeStars.measuredWidth + 5
        : textX + this.level.width + 7,
      27,
    );
    this.root.hitArea = new Rectangle(0, 0, backgroundWidth, height);
  }

  getPreferredHeight() {
    return LEADERBOARD_ROW_HEIGHT;
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.rank, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: resolvedTheme.text,
    });
    applyTextTheme(this.tag, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fontWeight: '700',
      fill:
        WORLD_CHAT_TAG_COLORS[
          normalizeWorldChatTagColor(this.model.allianceTagColor)
        ] ?? WORLD_CHAT_TAG_COLORS.ink,
    });
    applyTextTheme(this.name, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: resolvedTheme.text,
    });
    applyTextTheme(this.level, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.detail, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: this.model.current ? resolvedTheme.accent : resolvedTheme.muted,
    });
    applyTextTheme(this.pointsTotal, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: resolvedTheme.text,
    });
    this.total.applyTheme(resolvedTheme);
  }

  reset() {
    this.unregisterTarget();
    this.model = {};
    this.root.visible = false;
    this.root.renderable = false;
    this.avatarWidget.setTexture(Texture.EMPTY);
    setText(this.pointsTotal, '');
    this.prestigeStars.reset();
    this.resetClickableState();
  }

  unregisterTarget() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    this.targetId = null;
  }

  destroy() {
    this.unregisterTarget();
    super.destroy({ children: true });
  }
}

/**
 * Passive World Event reward tier using the same image-backed list row as the
 * player leaderboard. Reward amounts sit on the lower edge of their
 * resource icons, matching the compact quantity treatment used by Market
 * stalls.
 */
export class WorldEventRewardRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.model = {};
    this.root = new Container({
      label: `${dialog.dialogId}-world-event-reward-row`,
    });
    this.background = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${this.root.label}:background`,
    });
    this.currentOutline = new Graphics({
      label: `${this.root.label}:current`,
    });
    this.rank = createText('', RETAINED_TEXT_STYLES.bold);
    this.rewardBadges = ['emerald', 'crystal'].map((resourceKey) => {
      const root = new Container({
        label: `${this.root.label}:${resourceKey}`,
      });
      const icon = new Sprite(Texture.EMPTY);
      icon.label = `${root.label}:icon`;
      icon.anchor.set(0.5);
      const amount = new PixiTextLabel({
        fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
        fontWeight: 'bold',
        anchor: { x: 0.5, y: 1 },
        color: '#ffffff',
        stroke: 'outlined',
        label: `${root.label}:amount`,
      });
      root.addChild(icon, amount);
      this.root.addChild(root);
      return { amount, icon, resourceKey, root };
    });
    this.root.addChildAt(this.background, 0);
    this.root.addChildAt(this.currentOutline, 1);
    this.root.addChildAt(this.rank, 2);
  }

  bind(model) {
    this.model = model ?? {};
    this.root.visible = true;
    this.root.renderable = true;
    setText(this.rank, this.model.rankLabel ?? this.model.label ?? 'Rank');
    const rewards = new Map(
      normalizeRows(this.model.rewards).map((reward) => [
        String(reward.resourceKey ?? reward.resource ?? '').toLowerCase(),
        reward,
      ]),
    );
    for (const badge of this.rewardBadges) {
      const reward = rewards.get(badge.resourceKey);
      badge.icon.texture = reward
        ? resolveAtlasTexture(
            this.dialog.assetManager,
            RESOURCE_ICON_FRAMES[badge.resourceKey],
          )
        : Texture.EMPTY;
      badge.amount.setText(reward?.amountLabel ?? reward?.value ?? '');
      badge.root.visible = Boolean(reward);
      badge.root.renderable = badge.root.visible;
    }
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  setBounds(x, y, width, height = LEADERBOARD_ROW_HEIGHT) {
    this.root.position.set(x, y);
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const backgroundWidth = Math.max(0, width - rowGap);
    const backgroundHeight = Math.max(0, height - rowGap);
    this.background.position.set(0, rowGap / 2);
    this.background.setSize(
      backgroundWidth,
      backgroundHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    this.currentOutline
      .clear()
      .roundRect(
        1,
        rowGap / 2 + 1,
        backgroundWidth - 2,
        backgroundHeight - 2,
        5,
      )
      .stroke({
        color: this.dialog.contentTheme?.accent ?? '#a864d9',
        width: 1.5,
        alpha: this.model.current ? 0.9 : 0,
      });
    const visibleBadges = this.rewardBadges.filter(({ root }) => root.visible);
    const badgesWidth =
      visibleBadges.length * WORLD_EVENT_REWARD_ICON_SIZE +
      Math.max(0, visibleBadges.length - 1) * WORLD_EVENT_REWARD_ICON_GAP;
    const badgesLeft =
      backgroundWidth - WORLD_EVENT_REWARD_ICON_RIGHT_INSET - badgesWidth;
    visibleBadges.forEach((badge, index) => {
      const centerX =
        badgesLeft +
        WORLD_EVENT_REWARD_ICON_SIZE / 2 +
        index * (WORLD_EVENT_REWARD_ICON_SIZE + WORLD_EVENT_REWARD_ICON_GAP);
      badge.root.position.set(centerX, rowGap / 2);
      badge.icon.position.set(0, backgroundHeight / 2);
      badge.icon.width = WORLD_EVENT_REWARD_ICON_SIZE;
      badge.icon.height = WORLD_EVENT_REWARD_ICON_SIZE;
      badge.amount.position.set(
        0,
        backgroundHeight / 2 + WORLD_EVENT_REWARD_ICON_SIZE / 2 - 1,
      );
    });
    this.rank.position.set(10, 17);
    fitLeaderboardText(this.rank, Math.max(0, badgesLeft - this.rank.x - 8));
    this.root.hitArea = new Rectangle(0, 0, backgroundWidth, height);
  }

  getPreferredHeight() {
    return LEADERBOARD_ROW_HEIGHT;
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.rank, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fill: resolvedTheme.text,
    });
    for (const badge of this.rewardBadges) {
      badge.amount.applyTheme(resolvedTheme);
      badge.amount.setColor('#ffffff');
    }
  }

  reset() {
    this.model = {};
    this.root.visible = false;
    this.root.renderable = false;
    setText(this.rank, '');
    for (const badge of this.rewardBadges) {
      badge.icon.texture = Texture.EMPTY;
      badge.amount.setText('');
      badge.root.visible = false;
      badge.root.renderable = false;
    }
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/**
 * Image-backed Trade Alliance quest row using the same retained list rhythm as
 * the alliance roster. Quest identity stays left, while progress, reward, and
 * the fixed action occupy stable right-side columns.
 */
export class AllianceQuestRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.model = {};
    this.targetId = null;
    this.root = new Container({
      label: `${dialog.dialogId}-alliance-quest-row`,
    });
    this.background = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${this.root.label}:background`,
    });
    this.itemIcon = new Sprite(Texture.EMPTY);
    this.itemIcon.label = `${this.root.label}:item-icon`;
    this.itemIcon.anchor.set(0.5);
    this.itemIcon.visible = false;
    this.itemIconOverlay = new Sprite(Texture.EMPTY);
    this.itemIconOverlay.label = `${this.root.label}:item-icon-overlay`;
    this.itemIconOverlay.anchor.set(0.5);
    this.itemIconOverlay.visible = false;
    this.title = createText('', RETAINED_TEXT_STYLES.body);
    this.contribution = createText('', RETAINED_TEXT_STYLES.border);
    this.progress = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.progress.anchor.set(1, 0);
    this.reward = new PixiResourceLabel({
      assetManager: dialog.assetManager,
      resource: 'crystal',
      includeResourceName: false,
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      fontWeight: 'bold',
      label: `${this.root.label}:reward`,
    });
    this.action = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${this.root.label}:action`,
      inputRouter: dialog.inputRouter,
      sizeTier: 30,
    });
    this.root.addChild(
      this.background,
      this.itemIcon,
      this.itemIconOverlay,
      this.title,
      this.contribution,
      this.progress,
      this.reward,
      this.action.root,
    );
  }

  bind(model) {
    this.unregisterTarget();
    this.model = model ?? {};
    this.root.visible = true;
    this.root.renderable = true;
    setText(
      this.title,
      this.model.title ?? this.model.label ?? 'Alliance Quest',
    );
    setText(this.contribution, this.model.contributionLabel ?? '');
    setText(this.progress, this.model.progressLabel ?? this.model.value ?? '');
    const iconFrames = resolveValueIconFrames(this.model);
    this.itemIcon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      iconFrames.base,
    );
    this.itemIconOverlay.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      iconFrames.overlay,
    );
    this.itemIcon.visible = this.itemIcon.texture !== Texture.EMPTY;
    this.itemIcon.renderable = this.itemIcon.visible;
    this.itemIconOverlay.visible =
      this.itemIcon.visible && this.itemIconOverlay.texture !== Texture.EMPTY;
    this.itemIconOverlay.renderable = this.itemIconOverlay.visible;
    this.reward.bind(this.model.id, {
      amount: this.model.rewardAmountLabel ?? '0',
      includeResourceName: false,
      resource: this.model.rewardResource ?? 'crystal',
    });
    const hasAction = Boolean(this.model.actionLabel || this.model.onActivate);
    this.action.root.visible = hasAction;
    this.action.root.renderable = hasAction;
    this.action.variant = this.model.actionVariant ?? 'button';
    this.action.control.setVariant(this.model.actionVariant ?? 'regular');
    this.action.setModel({
      label: this.model.actionLabel ?? 'Open',
      enabled: this.model.enabled !== false,
      notification: this.model.notification === true,
      action: () => this.model.onActivate?.(this.model),
    });
    this.targetId = this.model.semanticId ?? null;
    if (this.targetId) {
      this.dialog.registerTarget({
        semanticId: this.targetId,
        displayObject: hasAction ? this.action.root : this.root,
        state: () => ({
          enabled: this.model.enabled !== false,
          interactive: hasAction,
        }),
        activate: () => this.model.onActivate?.(this.model) ?? false,
      });
    }
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  setBounds(x, y, width, height = ALLIANCE_QUEST_ROW_HEIGHT) {
    this.root.position.set(x, y);
    const {
      actionHeight,
      actionWidth,
      actionX,
      detailRight,
      frameWidth,
      titleX,
      titleWidth,
    } = this.resolveLayout(width);
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const frameHeight = Math.max(0, height - rowGap);
    this.background.position.set(0, rowGap / 2);
    this.background.setSize(
      frameWidth,
      frameHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );

    this.applyTitleWrap(titleWidth);
    const iconCenterX = 4 + ALLIANCE_QUEST_ITEM_ICON_SIZE / 2;
    const iconCenterY = height / 2;
    if (this.itemIconOverlay.visible) {
      layoutPixiSeedPackIcon({
        base: this.itemIcon,
        item: this.itemIconOverlay,
        x: iconCenterX,
        y: iconCenterY,
        width: ALLIANCE_QUEST_ITEM_ICON_SIZE,
        height: ALLIANCE_QUEST_ITEM_ICON_SIZE,
        fitPositionX: 1,
      });
    } else if (this.itemIcon.visible) {
      this.itemIcon.position.set(iconCenterX, iconCenterY);
      this.itemIcon.width = ALLIANCE_QUEST_ITEM_ICON_SIZE;
      this.itemIcon.height = ALLIANCE_QUEST_ITEM_ICON_SIZE;
      this.itemIconOverlay.rotation = 0;
    }
    this.title.position.set(titleX, 6);
    this.contribution.position.set(
      titleX,
      6 + Math.ceil(this.title.height) + 5,
    );
    this.progress.position.set(detailRight, 7);
    this.reward.position.set(detailRight - this.reward.measuredWidth, 28);
    this.action.setBounds(
      actionX,
      Math.max(0, (height - actionHeight) / 2),
      actionWidth,
      actionHeight,
    );
    this.root.hitArea = new Rectangle(0, 0, width, height);
  }

  resolveLayout(width) {
    const rowGap = PIXI_ROOT_RUN_GEOMETRY.settings.rowGap;
    const frameWidth = Math.max(0, width - rowGap);
    const actionWidth = Math.max(0, Number(this.model.actionWidth) || 58);
    const actionHeight = Math.max(20, Number(this.model.actionHeight) || 28);
    const actionX = frameWidth - actionWidth - 6;
    const detailRight = actionX - 7;
    const detailWidth = Math.max(
      58,
      Math.ceil(this.progress.width),
      Math.ceil(this.reward.measuredWidth),
    );
    const titleX = this.itemIcon.visible
      ? ALLIANCE_QUEST_ITEM_ICON_SIZE + 10
      : 8;
    const titleRight = detailRight - detailWidth - 7;

    return {
      actionHeight,
      actionWidth,
      actionX,
      detailRight,
      frameWidth,
      titleX,
      titleWidth: Math.max(
        this.itemIcon.visible ? 52 : 90,
        titleRight - titleX,
      ),
    };
  }

  applyTitleWrap(width) {
    applyTextTheme(this.title, this.dialog.contentTheme ?? this.dialog.theme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: width,
    });
  }

  getPreferredHeight(
    width = this.dialog.allianceQuestRowWidth || WORKSHOP_DIALOG_CONTENT_WIDTH,
  ) {
    const { actionHeight, titleWidth } = this.resolveLayout(width);
    this.applyTitleWrap(titleWidth);
    const titleBottom = 6 + Math.ceil(this.title.height);
    const contributionBottom = this.contribution.text
      ? titleBottom + 5 + Math.ceil(this.contribution.height)
      : titleBottom;

    return Math.max(
      ALLIANCE_QUEST_ROW_HEIGHT,
      actionHeight + PIXI_ROOT_RUN_GEOMETRY.settings.rowGap,
      contributionBottom + PIXI_ROOT_RUN_GEOMETRY.settings.rowGap,
    );
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? this.dialog.theme;
    this.background.setTexture(
      this.dialog.assetManager?.getTexture?.(
        PIXI_ROOT_RUN_ASSETS.settingsRow,
      ) ?? Texture.EMPTY,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
    );
    applyTextTheme(this.title, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.body,
      wordWrapWidth: this.title.style.wordWrapWidth ?? 100,
    });
    applyTextTheme(this.contribution, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.progress, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: resolvedTheme.text,
    });
    this.reward.applyTheme(resolvedTheme);
    this.action.applyTheme(resolvedTheme);
  }

  reset() {
    this.unregisterTarget();
    this.model = {};
    this.itemIcon.texture = Texture.EMPTY;
    this.itemIcon.visible = false;
    this.itemIcon.renderable = false;
    this.itemIconOverlay.texture = Texture.EMPTY;
    this.itemIconOverlay.visible = false;
    this.itemIconOverlay.renderable = false;
    this.itemIconOverlay.rotation = 0;
    this.reward.bind('', { amount: '', hidden: true, resource: 'crystal' });
    this.root.visible = false;
    this.root.renderable = false;
  }

  unregisterTarget() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    this.targetId = null;
  }

  destroy() {
    this.unregisterTarget();
    this.action.destroy();
    this.root.destroy({ children: true });
  }
}

class WorkshopBagInventoryRow extends RootRunInventoryChoiceRowPixi {
  constructor({ dialog }) {
    super({
      assetManager: dialog.assetManager,
      inputRouter: dialog.inputRouter,
      label: `${dialog.dialogId}-inventory-row`,
      semanticRegistry: dialog.semanticTargets,
      useSettingsStyle: true,
    });
    this.dialog = dialog;
  }

  bind(model) {
    const itemKind = String(model?.itemKind ?? '').toLowerCase();
    super.bind(model?.id ?? model?.key ?? '', {
      ...(model ?? {}),
      iconSize:
        model?.iconSize ??
        (itemKind === 'potion' ? BAG_POTION_ICON_SIZE : BAG_ITEM_ICON_SIZE),
    });
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  getPreferredHeight() {
    return PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch;
  }
}

export class WorkshopDialogRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.root = new Container({ label: `${dialog.dialogId}-row` });
    this.label = createText('', RETAINED_TEXT_STYLES.body);
    this.value = createText('', RETAINED_TEXT_STYLES.body);
    this.value.anchor.set(1, 0);
    this.valueIcon = new Sprite(Texture.EMPTY);
    this.valueIcon.label = `${dialog.dialogId}-row:value-icon`;
    this.valueIcon.anchor.set(0.5);
    this.valueIcon.visible = false;
    this.valueIconOverlay = new Sprite(Texture.EMPTY);
    this.valueIconOverlay.label = `${dialog.dialogId}-row:value-icon-overlay`;
    this.valueIconOverlay.anchor.set(0.5);
    this.valueIconOverlay.visible = false;
    this.resourceValue = new PixiInlineText({
      label: `${dialog.dialogId}-row:resource-value`,
      style: RETAINED_TEXT_STYLES.body,
    });
    this.resourceValue.visible = false;
    this.statusIcon = new Sprite(Texture.EMPTY);
    this.statusIcon.label = `${dialog.dialogId}-row:status-icon`;
    this.statusIcon.anchor.set(0.5);
    this.statusIcon.visible = false;
    this.action = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-row-action`,
      inputRouter: dialog.inputRouter,
      sizeTier: 30,
    });
    this.root.addChild(
      this.label,
      this.valueIcon,
      this.valueIconOverlay,
      this.resourceValue,
      this.value,
      this.statusIcon,
      this.action.root,
    );
  }

  bind(model) {
    this.model = model;
    this.root.visible = true;
    setText(this.label, model.label ?? model.text ?? '');
    setText(this.value, model.value ?? '');
    const iconFrames = resolveValueIconFrames(model);
    this.valueIcon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      iconFrames.base,
    );
    this.valueIconOverlay.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      iconFrames.overlay,
    );
    this.valueIcon.visible = this.valueIcon.texture !== Texture.EMPTY;
    this.valueIconOverlay.visible =
      this.valueIcon.visible && this.valueIconOverlay.texture !== Texture.EMPTY;
    const resourceValues = normalizeRows(model.resourceValues);
    this.resourceValue.setRuns(
      resourceValues.flatMap((resource, index) => [
        ...(index > 0 ? [{ kind: 'text', text: '\n' }] : []),
        {
          kind: 'icon',
          texture: resolveAtlasTexture(
            this.dialog.assetManager,
            RESOURCE_ICON_FRAMES[resource.resourceKey],
          ),
          size: 14,
          fallbackText: resource.resourceKey ?? '',
        },
        {
          kind: 'text',
          text: ` ${resource.amountLabel ?? resource.value ?? ''}`,
        },
      ]),
    );
    this.resourceValue.visible = resourceValues.length > 0;
    this.resourceValue.renderable = this.resourceValue.visible;
    if (this.resourceValue.visible) {
      this.valueIcon.visible = false;
      this.valueIconOverlay.visible = false;
    }
    const statusAsset =
      model.statusIcon === 'checkmark'
        ? PIXI_ROOT_RUN_ASSETS.checkmark
        : model.statusIcon === 'lock'
          ? PIXI_ROOT_RUN_ASSETS.lock
          : null;
    this.statusIcon.texture = statusAsset
      ? (this.dialog.assetManager?.getTexture?.(statusAsset) ?? Texture.EMPTY)
      : Texture.EMPTY;
    this.statusIcon.visible = this.statusIcon.texture !== Texture.EMPTY;
    this.statusIcon.renderable = this.statusIcon.visible;
    const hasAction = Boolean(model.actionLabel || model.onActivate);
    this.action.root.visible = hasAction;
    this.action.variant = model.actionVariant ?? 'button';
    this.action.control.setVariant(model.actionVariant ?? 'regular');
    this.action.setModel({
      label: model.actionLabel ?? 'open',
      enabled: model.enabled !== false,
      notification: model.notification === true,
      action: () => model.onActivate?.(model),
    });
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
    this.targetId = model.semanticId ?? null;

    if (this.targetId) {
      this.dialog.registerTarget({
        semanticId: this.targetId,
        tutorialId: model.tutorialId ?? null,
        displayObject: hasAction ? this.action.root : this.root,
        state: () => ({
          enabled: model.enabled !== false,
          interactive: hasAction,
        }),
        activate: () => model.onActivate?.(model) ?? false,
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    const hasAction = this.action.root.visible;
    const hasValue = Boolean(this.value.text);
    const hasResourceValue = this.resourceValue.visible;
    const actionWidth = hasAction
      ? Math.max(0, Number(this.model?.actionWidth) || 74)
      : 0;
    const actionHeight = hasAction
      ? Math.max(20, Number(this.model?.actionHeight) || 20)
      : 0;
    const actionX = width - actionWidth;
    const valueRight = hasAction ? actionX - 6 : width;
    const statusIconSize = this.statusIcon.visible ? 14 : 0;
    const statusGroupWidth = hasValue
      ? this.value.width + (statusIconSize > 0 ? statusIconSize + 3 : 0)
      : 0;
    const resourceRight = hasAction
      ? actionX - 6
      : hasValue
        ? valueRight - statusGroupWidth - 8
        : width;
    const labelWidth = hasResourceValue
      ? Math.max(68, resourceRight - this.resourceValue.layoutWidth - 8)
      : hasAction
        ? 78
        : hasValue
          ? 164
          : width;
    const valueWidth = hasAction ? 96 : 92;
    this.label.style.wordWrap = true;
    this.label.style.wordWrapWidth = labelWidth;
    this.value.style.wordWrap = true;
    this.value.style.wordWrapWidth = valueWidth;
    this.value.style.align = 'right';
    const contentY = Math.max(0, (height - 16) / 2);
    this.label.position.set(0, contentY);
    this.action.setBounds(
      actionX,
      Math.max(0, (height - actionHeight) / 2),
      actionWidth,
      actionHeight,
    );
    this.value.position.set(valueRight, contentY);
    this.resourceValue.position.set(
      Math.max(labelWidth + 6, resourceRight - this.resourceValue.layoutWidth),
      Math.max(0, (height - this.resourceValue.layoutHeight) / 2),
    );
    if (this.statusIcon.visible) {
      this.statusIcon.position.set(
        valueRight - this.value.width - statusIconSize / 2 - 3,
        height / 2,
      );
      this.statusIcon.width = statusIconSize;
      this.statusIcon.height = statusIconSize;
    }
    const iconSize = 16;
    const iconCenterX = this.value.x - this.value.width - 3 - iconSize / 2;
    if (this.valueIconOverlay.visible) {
      layoutPixiSeedPackIcon({
        base: this.valueIcon,
        item: this.valueIconOverlay,
        x: iconCenterX,
        y: 9,
        width: iconSize,
        height: iconSize,
        fitPositionX: 1,
      });
    } else {
      this.valueIcon.position.set(iconCenterX, 9);
      this.valueIcon.width = iconSize;
      this.valueIcon.height = iconSize;
      this.valueIconOverlay.rotation = 0;
    }
    this.root.hitArea = new Rectangle(0, 0, width, height);
  }

  getPreferredHeight() {
    return Math.max(
      20,
      this.label.height,
      this.value.height,
      this.resourceValue.layoutHeight,
      Number(this.model?.height) || 0,
    );
  }

  applyTheme(theme) {
    applyTextTheme(this.label, theme, {
      ...RETAINED_TEXT_STYLES.body,
      fontWeight: this.model?.strong ? '700' : '400',
      fill: this.model?.muted ? theme.muted : theme.text,
      wordWrapWidth: this.action.root.visible
        ? 78
        : this.value.text
          ? 164
          : WORKSHOP_DIALOG_CONTENT_WIDTH,
    });
    applyTextTheme(this.value, theme, {
      ...RETAINED_TEXT_STYLES.body,
      align: 'right',
      wordWrapWidth: this.action.root.visible ? 96 : 92,
      fill: this.dialog.isBagDialog
        ? theme.text
        : this.model?.resourceKey
          ? (theme.resourceColors?.[this.model.resourceKey] ?? theme.text)
          : this.model?.muted
            ? theme.muted
            : theme.text,
    });
    this.resourceValue.setStyle({
      ...RETAINED_TEXT_STYLES.body,
      fill: this.model?.muted ? theme.muted : theme.text,
    });
    this.action.applyTheme(theme);
  }

  reset() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }

    this.targetId = null;
    this.model = null;
    this.valueIcon.texture = Texture.EMPTY;
    this.valueIcon.visible = false;
    this.valueIconOverlay.texture = Texture.EMPTY;
    this.valueIconOverlay.visible = false;
    this.valueIconOverlay.rotation = 0;
    this.resourceValue.setRuns([]);
    this.resourceValue.visible = false;
    this.resourceValue.renderable = false;
    this.statusIcon.texture = Texture.EMPTY;
    this.statusIcon.visible = false;
    this.statusIcon.renderable = false;
    this.root.visible = false;
  }

  destroy() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }

    this.action.destroy();
    this.root.destroy({ children: true });
  }
}

function resolveValueIconFrames(model = {}) {
  const kind = String(model.itemKind ?? '')
    .trim()
    .toLowerCase();
  const key = model.itemKey ?? null;

  if (kind === 'resource') {
    return { base: RESOURCE_ICON_FRAMES[key] ?? null, overlay: null };
  }

  if (kind === 'seed') {
    return {
      base: getSeedIconFrameName(key),
      overlay: getSeedPackItemFrameName({
        key,
        label: model.label,
      }),
    };
  }

  if (kind === 'herb') {
    return { base: getHerbIconFrameName(key), overlay: null };
  }

  if (kind === 'potion') {
    return { base: getPotionIconFrameName(key), overlay: null };
  }

  if (kind === 'ingredient') {
    return { base: getIngredientIconFrameName(key), overlay: null };
  }

  return { base: null, overlay: null };
}

function resolveAtlasTexture(assetManager, frameName) {
  if (!frameName || !assetManager?.getAtlasTexture) {
    return Texture.EMPTY;
  }

  return assetManager.getAtlasTexture(frameName) ?? Texture.EMPTY;
}

function resolveCharacterTexture(assetManager, character) {
  const key = String(character ?? 'elara')
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]/g, '');
  try {
    return (
      assetManager?.getTexture?.(
        `source:assets/avatars/${key || 'elara'}.png`,
      ) ??
      assetManager?.getTexture?.('source:assets/avatars/elara.png') ??
      Texture.EMPTY
    );
  } catch {
    return Texture.EMPTY;
  }
}

function resolveWorldChatBodyIconTexture(assetManager, assetId) {
  if (
    !assetId ||
    !assetManager?.getTexture ||
    (typeof assetManager.has === 'function' && !assetManager.has(assetId))
  ) {
    return Texture.EMPTY;
  }

  return assetManager.getTexture(assetId) ?? Texture.EMPTY;
}

function resolveWorldChatBodyRuns(
  assetManager,
  body,
  bodyRuns,
  legacyBodyIcon,
) {
  const runs =
    Array.isArray(bodyRuns) && bodyRuns.length > 0
      ? bodyRuns
      : createLegacyWorldChatBodyRuns(body, legacyBodyIcon);

  return runs.map((run) => {
    if (run?.kind !== 'icon') {
      return {
        kind: 'text',
        text: typeof run === 'string' ? run : String(run?.text ?? ''),
      };
    }
    return {
      ...run,
      fallbackText: String(run.fallbackText ?? run.marker ?? ''),
      texture: resolveWorldChatBodyIconTexture(assetManager, run.assetId),
    };
  });
}

function createLegacyWorldChatBodyRuns(body, bodyIcon) {
  const rawBody = String(body ?? '');
  const marker = String(bodyIcon?.marker ?? '');
  const markerIndex = marker ? rawBody.indexOf(marker) : -1;
  if (markerIndex < 0) {
    return [{ kind: 'text', text: rawBody }];
  }
  return [
    { kind: 'text', text: rawBody.slice(0, markerIndex) },
    {
      ...bodyIcon,
      fallbackText: marker,
      kind: 'icon',
    },
    {
      kind: 'text',
      text: rawBody.slice(markerIndex + marker.length),
    },
  ];
}

function normalizeWorldChatTag(tag) {
  const normalized = String(tag ?? '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .toUpperCase();
  return /^[A-Z]{2,5}$/.test(normalized) ? normalized : '';
}

function normalizeWorldChatTagColor(color) {
  const normalized = String(color ?? '')
    .trim()
    .toLowerCase();
  return normalized in WORLD_CHAT_TAG_COLORS ? normalized : 'ink';
}

function stripDiscoverySuffix(value, suffixPattern) {
  return String(value ?? '')
    .replace(suffixPattern, '')
    .trim();
}

function fitLeaderboardText(text, maxWidth) {
  text.scale.set(1);
  const width = Math.max(0, Number(maxWidth) || 0);
  if (width > 0 && text.width > width) {
    text.scale.set(Math.max(0.72, width / text.width));
  }
}

function disposeInputRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
    return;
  }
  registration?.unregister?.();
}

function createRetainedModelRevision(model) {
  try {
    return JSON.stringify(model, (_key, value) => {
      if (typeof value === 'function') {
        return undefined;
      }
      if (typeof value === 'bigint') {
        return { bigint: String(value) };
      }
      return value;
    });
  } catch {
    return model;
  }
}

function createSettledWorldChatMotion(bounds) {
  const current = { ...bounds };
  return {
    active: false,
    current,
    from: { ...current },
    target: { ...current },
    startedAt: 0,
    duration: 0,
    frameId: 0,
  };
}

function sameWorldChatBounds(left, right) {
  return Boolean(
    left &&
    right &&
    Math.abs(left.y - right.y) <= WORLD_CHAT_MOTION_EPSILON &&
    Math.abs(left.height - right.height) <= WORLD_CHAT_MOTION_EPSILON,
  );
}

function interpolate(from, to, progress) {
  return from + (to - from) * progress;
}

function easeOutQuart(progress) {
  const clamped = Math.max(0, Math.min(1, Number(progress) || 0));
  return 1 - (1 - clamped) ** 4;
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout?.(() => callback(defaultTimeSource()), 16) ?? 0;
}

function defaultCancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
  } else {
    globalThis.clearTimeout?.(frameId);
  }
}

function defaultTimeSource() {
  return globalThis.performance?.now?.() ?? Date.now();
}
