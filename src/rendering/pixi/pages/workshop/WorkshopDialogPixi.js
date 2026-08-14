import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { getHerbIconFrameName } from '../../../../assets/items/herbs/herbIcons.js';
import { getIngredientIconFrameName } from '../../../../assets/items/ingredients/ingredientIcons.js';
import { getPotionIconFrameName } from '../../../../assets/items/potions/potionIcons.js';
import {
  getSeedIconFrameName,
  getSeedPackItemFrameName,
} from '../../../../assets/items/seeds/seedIconFrames.js';
import { PixiCostButton } from '../../primitives/PixiCostButton.js';
import {
  PIXI_DIALOG_FOOTER_TABS_GEOMETRY,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  createDialogPaperSection,
  resolveDialogFooterTabLayout,
  resolveDialogPaperOutsets,
  setDialogPaperAboveFooterTabs,
  setDialogPaperSectionBounds,
} from '../../primitives/PixiDialogFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import { PixiInlineText } from '../../primitives/PixiInlineText.js';
import { layoutPixiSeedPackIcon } from '../../primitives/PixiSeedPackIcon.js';
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { normalizePixiTextStroke } from '../../primitives/PixiTextLabel.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_DIALOG_SCROLL_GEOMETRY,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedProgressBar,
  RetainedScrollArea,
  applyTextTheme,
  createText,
  normalizeRows,
  setText,
} from './RetainedPageKit.js';

const WORKSHOP_DIALOG_CONTENT_WIDTH = 264;
const DIALOG_SCROLL_VIEWPORT_TOP = 18;
const DIALOG_SCROLL_VIEWPORT_BOTTOM_INSET = 30;
const DIALOG_PAPER_TOP =
  PIXI_ROOT_RUN_GEOMETRY.dialog.paperInsetTop -
  PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
const DIALOG_PAPER_BOTTOM_INSET =
  PIXI_ROOT_RUN_GEOMETRY.dialog.paperInsetBottom -
  PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
const BAG_SCROLL_VIEWPORT_TOP_INSET =
  DIALOG_SCROLL_VIEWPORT_BOTTOM_INSET -
  DIALOG_PAPER_BOTTOM_INSET -
  (DIALOG_SCROLL_VIEWPORT_TOP - DIALOG_PAPER_TOP);
const BAG_ROW_VALUE_INSET_RIGHT = 2;
const STATS_SCROLL_VIEWPORT_TOP_INSET = 6;
const STATS_SCROLLBAR_SHIFT_RIGHT = 4;
const WORLD_CHAT_ROW_GAP = 3;
const WORLD_CHAT_SCROLL_PADDING_TOP = 8;
const WORLD_CHAT_CONTENT_INSET_X = 8;
const WORLD_CHAT_DIALOG_MIN_TOP = 18;
const WORLD_CHAT_COMPOSER_GAP = 6;
const WORLD_CHAT_COMPOSER_HEIGHT = 34;
const WORLD_CHAT_COMPOSER_FIELD_HEIGHT = 29;
const WORLD_CHAT_COMPOSER_SEND_WIDTH = 74;
const WORLD_CHAT_COMPOSER_SEND_HEIGHT = 29;
const WORLD_CHAT_AVATAR_SIZE = 22;
const WORLD_CHAT_TEXT_X = 25;
const WORLD_CHAT_HEADER_HEIGHT = 12;
const WORLD_CHAT_BODY_TOP = 12;
const WORLD_CHAT_BODY_FONT_SIZE = 11;
const WORLD_CHAT_BODY_LINE_HEIGHT = 13;
const WORLD_CHAT_TIMESTAMP_COLOR = '#946a2e';
const WORLD_CHAT_SYSTEM_BACKGROUND = '#efd0a2';
const WORLD_CHAT_SYSTEM_TITLE_COLOR = '#432d20';
const WORLD_CHAT_SYSTEM_PLAYER_COLOR = '#72533a';
const WORLD_CHAT_TAG_STROKE = '#2b1912';
const DISCOVERY_ROW_GAP = 6;
const DISCOVERY_MAX_INGREDIENTS = 6;
const DISCOVERY_ICON_SIZE = 44;
const DISCOVERY_LOCKED_ROW_HEIGHT = 64;
const DISCOVERY_BASE_ROW_HEIGHT = 92;
const DISCOVERY_RECIPE_COLUMNS = 2;
const DISCOVERY_RECIPE_ROW_HEIGHT = 17;
const DISCOVERY_PLAYER_COLOR = '#7c359d';
const DISCOVERY_DIVIDER_COLOR = '#bd9065';
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
const ALLIANCE_DIRECTORY_HEADER_HEIGHT = 30;
const ALLIANCE_MEMBER_ROW_HEIGHT = 28;
const ALLIANCE_MEMBER_VISIBLE_ROWS = 4.5;
const ALLIANCE_MEMBER_VIEWPORT_HEIGHT =
  ALLIANCE_MEMBER_ROW_HEIGHT * ALLIANCE_MEMBER_VISIBLE_ROWS;
const ALLIANCE_DIRECTORY_ACTION_HEIGHT = 30;
const ALLIANCE_DIRECTORY_EXPANDED_HEIGHT =
  ALLIANCE_DIRECTORY_HEADER_HEIGHT +
  18 +
  ALLIANCE_MEMBER_VIEWPORT_HEIGHT +
  8 +
  ALLIANCE_DIRECTORY_ACTION_HEIGHT +
  8;
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
const WORLD_EVENT_LIST_CONTENT_INSET = 5;
const PERSONAL_TASK_SECTION_HEADER_HEIGHT = 48;
const PERSONAL_TASK_SECTION_ROW_GAP = 2;
const RESOURCE_ICON_FRAMES = Object.freeze({
  coin: 'resource:coin',
  crystal: 'resource:crystal',
  emerald: 'resource:emerald',
  mana: 'resource:mana',
  ruby: 'resource:ruby',
});

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
  } = {}) {
    if (!dialogId || !parent?.addChild) {
      throw new Error('WorkshopDialogPixi requires a dialog id and Pixi parent layer.');
    }

    this.dialogId = dialogId;
    this.parent = parent;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.textEntryService = textEntryService;
    this.semanticTargets = semanticTargets;
    this.onClose = onClose;
    this.theme = theme;
    this.registeredTargetIds = new Set();
    this.viewModel = {};
    this.sourceWidth = RETAINED_PAGE_GEOMETRY.width;
    this.sourceHeight = RETAINED_PAGE_GEOMETRY.height;
    this.isBagDialog = this.dialogId === 'workshop.bag';
    this.isStatsDialog = this.dialogId === 'workshop.stats';
    this.isWorldChatDialog = this.dialogId === 'workshop.worldChat';
    this.isDiscoveriesDialog =
      this.dialogId === 'workshop.discoveries';
    this.isAllianceDialog = this.dialogId === 'workshop.alliance';
    this.isWorldEventDialog = this.dialogId === 'workshop.worldEvent';
    this.isPersonalTasksDialog =
      this.dialogId === 'workshop.personalTasks';
    this.counters = counters;
    this.scrollContentPaddingTop =
      RETAINED_DIALOG_SCROLL_GEOMETRY.contentPaddingTop;
    this.scrollViewportTopInset = this.isWorldChatDialog
      ? WORLD_CHAT_SCROLL_PADDING_TOP
      : this.isBagDialog
        ? BAG_SCROLL_VIEWPORT_TOP_INSET
        : this.isStatsDialog
          ? STATS_SCROLL_VIEWPORT_TOP_INSET
          : 0;
    this.scrollViewportWidth =
      this.isWorldChatDialog
        ? this.sourceWidth -
          PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset * 2 -
          WORLD_CHAT_CONTENT_INSET_X * 2
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
      openMotion: this.isWorldChatDialog ? 'top' : 'center',
      label: `${dialogId}-dialog`,
    });
    this.root = this.modal.root;
    this.backdrop = this.modal.backdrop;
    this.panel = this.modal.panel;
    if (this.isWorldChatDialog) {
      this.panel.setHeaderLayout('edge');
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
    this.scroll = new RetainedScrollArea({
      assetManager: this.assetManager,
      label: `${dialogId}-scroll`,
      inputRouter: this.inputRouter,
    });
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
    if (this.isWorldEventDialog) {
      this.panel.setPaperVisible(false);
      this.panel.content.addChild(
        this.worldEventHeaderPaper,
        this.worldEventListPaper,
      );
    }
    if (this.isPersonalTasksDialog) {
      this.panel.setPaperVisible(false);
    }
    this.tabsLayer = new Container({ label: `${dialogId}-tabs` });
    this.panel.content.addChild(
      this.copy,
      this.headerHeadline,
      this.headerBody,
      this.headerMeta,
      this.scroll.root,
      this.status,
    );
    this.panel.addChild(this.tabsLayer);
    this.composerField = null;
    this.composerSubmit = null;
    this.composerSubmitting = false;
    this.composerSubmissionToken = 0;
    this.composerStatus = '';
    this.boundStatus = '';

    if (this.isWorldChatDialog) {
      this.composerField = new PixiTextField({
        assetManager: this.assetManager,
        inputRouter: this.inputRouter,
        textEntryService: this.textEntryService,
        placeholder: 'Message',
        inputKind: 'text',
        maxLength: 160,
        variant: 'brown-inset',
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
      });
      this.panel.content.addChild(
        this.composerField,
        this.composerSubmit.root,
      );
      this.composerField.visible = false;
      this.composerField.renderable = false;
      this.composerSubmit.root.visible = false;
      this.composerSubmit.root.renderable = false;
    }

    this.rowPool = new WidgetPool({
      name: `${dialogId} row pool`,
      counters,
      create: () =>
        this.isWorldChatDialog
          ? new WorldChatMessageRowPixi({ dialog: this })
          : this.isDiscoveriesDialog
            ? new PotionDiscoveryRowPixi({ dialog: this })
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
      bind: (widget, row) => widget.bind(row),
      afterReconcile: (widgets) => this.orderRows(widgets),
    });
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
    this.applyTheme(theme);
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  bind(viewModel) {
    this.viewModel = viewModel ?? {};
    this.modal.setTitle(
      this.viewModel.title ?? this.dialogId.split('.').at(-1),
    );
    setText(this.copy, this.viewModel.copy ?? this.viewModel.description ?? '');
    setText(this.headerHeadline, this.viewModel.header?.headline ?? '');
    setText(this.headerBody, this.viewModel.header?.body ?? '');
    setText(this.headerMeta, this.viewModel.header?.meta ?? '');
    const hasHeader = Boolean(
      this.headerHeadline.text ||
        this.headerBody.text ||
        this.headerMeta.text,
    );
    this.headerHeadline.visible = hasHeader;
    this.headerBody.visible = hasHeader;
    this.headerMeta.visible = hasHeader;
    this.boundStatus = this.viewModel.status ?? '';
    this.bindComposer(this.viewModel.composer);
    this.updateStatus();
    this.tabs.reconcile(normalizeRows(this.viewModel.tabs));
    const nextRows =
      this.isAllianceDialog &&
      this.viewModel.directory === true &&
      this.allianceRows
        ? this.allianceRows
        : this.isWorldEventDialog &&
            this.viewModel.rowWidget === 'worldEventQuest' &&
            this.worldEventRows
          ? this.worldEventRows
        : this.defaultRows;
    if (this.rows !== nextRows) {
      this.rows.reconcile([]);
      this.rows = nextRows;
    }
    const rows = normalizeRows(this.viewModel.rows);
    this.rows.reconcile(
      this.isWorldEventDialog &&
        this.viewModel.rowWidget === 'worldEventQuest'
        ? rows.slice(0, WORLD_EVENT_MAX_QUEST_ROWS)
        : rows,
    );
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  bindTab(button, tab) {
    button.applyTheme(this.contentTheme ?? this.theme);
    button.setModel({
      label: tab.label ?? tab.id,
      selected: tab.selected === true || tab.id === this.viewModel.selectedTabId,
      notification: tab.notification === true,
      enabled: tab.enabled !== false,
      action: () => tab.onSelect?.(tab.id) ?? this.viewModel.onSelectTab?.(tab.id),
    });
    button.control.textLabel.setFontSize(
      PIXI_UI_GEOMETRY.borderLabelFontSize,
    );
  }

  orderRows(widgets) {
    if (this.isPersonalTasksDialog) {
      this.orderPersonalTaskRows(widgets);
      return;
    }

    this.scroll.content.removeChildren();
    const contentPaddingTop =
      this.isWorldEventDialog &&
      this.viewModel.rowWidget === 'worldEventQuest'
        ? 0
        : this.scrollContentPaddingTop;
    const rowGap = this.isWorldChatDialog
      ? WORLD_CHAT_ROW_GAP
      : this.isDiscoveriesDialog
        ? DISCOVERY_ROW_GAP
        : this.isWorldEventDialog &&
            this.viewModel.rowWidget === 'worldEventQuest'
          ? WORLD_EVENT_SECTION_GAP
        : 4;
    const preferredHeights = widgets.map((widget) =>
      widget.getPreferredHeight(),
    );
    const rowsGapHeight = Math.max(0, widgets.length - 1) * rowGap;
    const rowsHeight =
      preferredHeights.reduce(
        (height, rowHeight) => height + rowHeight,
        0,
      ) +
      rowsGapHeight;
    let y = this.isWorldChatDialog
      ? Math.max(
          WORLD_CHAT_SCROLL_PADDING_TOP,
          this.scroll.height - rowsHeight,
        )
      : contentPaddingTop;

    widgets.forEach((widget, index) => {
      const rowHeight = preferredHeights[index] ?? widget.getPreferredHeight();
      this.scroll.content.addChild(widget.root);
      widget.setBounds(
        0,
        y,
        this.isWorldChatDialog
          ? this.scroll.width
          : this.isWorldEventDialog &&
              this.viewModel.rowWidget === 'worldEventQuest'
            ? this.scroll.width
            : WORKSHOP_DIALOG_CONTENT_WIDTH,
        rowHeight,
      );
      y += rowHeight + rowGap;
    });

    const contentHeight = Math.max(
      this.isWorldChatDialog
        ? WORLD_CHAT_SCROLL_PADDING_TOP
        : contentPaddingTop,
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
    }
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
      chrome.title.position.set(
        PIXI_UI_GEOMETRY.dialogPadding,
        contentY + 4,
      );
      chrome.points.position.set(
        PIXI_UI_GEOMETRY.dialogPadding + WORKSHOP_DIALOG_CONTENT_WIDTH,
        contentY + 4,
      );
      chrome.reset.position.set(
        PIXI_UI_GEOMETRY.dialogPadding,
        contentY + 20,
      );
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

    const allRows = new Set([
      ...(this.defaultRows?.getWidgets?.() ?? []),
      ...(this.allianceRows?.getWidgets?.() ?? []),
      ...(this.worldEventRows?.getWidgets?.() ?? []),
    ]);
    for (const row of allRows) {
      row.applyTheme(contentTheme);
    }

    for (const button of this.tabs?.getWidgets?.() ?? []) {
      button.applyTheme(contentTheme);
    }

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

    this.composerField?.applyTheme(contentTheme);
    this.composerSubmit?.applyTheme(contentTheme);
  }

  layout(viewportProjection) {
    this.sourceWidth =
      Number(viewportProjection?.sourceWidth) || PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) || PIXI_UI_GEOMETRY.sourceHeight;
    const frameOutset = PIXI_ROOT_RUN_GEOMETRY.dialog.frameOutset;
    const width = this.isWorldChatDialog
      ? this.sourceWidth - frameOutset * 2
      : 304;
    if (this.isWorldChatDialog) {
      this.scrollViewportWidth =
        width - WORLD_CHAT_CONTENT_INSET_X * 2;
    }
    const tabs = this.tabs.getWidgets();
    const tabsInShellFooter = tabs.length > 0;
    const composerHeight =
      this.composerField?.visible === true
        ? WORLD_CHAT_COMPOSER_HEIGHT
        : 0;
    const height = this.isWorldEventDialog
      ? Math.min(486, this.sourceHeight - 118)
      : this.isPersonalTasksDialog
        ? Math.min(470, this.sourceHeight - 118)
        : Math.min(382, this.sourceHeight - 80);
    const panelX = this.isWorldChatDialog
      ? frameOutset
      : (this.sourceWidth - width) / 2;
    const centeredPanelY = (this.sourceHeight - height) / 2;
    const keyboardShift = this.isWorldChatDialog
      ? Math.min(
          0,
          (Number(viewportProjection?.dialogShift) || 0) * 2,
        )
      : 0;
    const panelY = this.isWorldChatDialog
      ? Math.max(
          WORLD_CHAT_DIALOG_MIN_TOP,
          this.sourceHeight - height - frameOutset + keyboardShift,
        )
      : centeredPanelY;
    this.modal.layout(viewportProjection);
    this.modal.setBounds(
      panelX,
      panelY,
      width,
      height,
    );
    let shellFooterPaperReduction = 0;
    let footerTabLayout = null;
    if (tabsInShellFooter) {
      footerTabLayout = resolveDialogFooterTabLayout({
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
    if (footerTabLayout) {
      const paperBottom = setDialogPaperAboveFooterTabs(
        this.panel,
        footerTabLayout,
      );
      const defaultPaperBottom = height - DIALOG_PAPER_BOTTOM_INSET;
      shellFooterPaperReduction = Math.max(
        0,
        defaultPaperBottom - paperBottom,
      );
    }
    if (!tabsInShellFooter && this.isWorldChatDialog && composerHeight > 0) {
      const paperBottom = height - 52;
      this.panel.paperFrame.setSize(
        this.panel.paperFrame.frameWidth,
        Math.max(0, paperBottom - this.panel.paperFrame.y),
        PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
      );
    }
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
        (this.headerBody.text
          ? Math.ceil(this.headerBody.height) + 4
          : 0),
    );
    const headerHeight = this.headerHeadline.visible
      ? this.headerMeta.y -
        DIALOG_SCROLL_VIEWPORT_TOP +
        Math.ceil(this.headerMeta.height) +
        8
      : 0;
    const statusHeight = this.status.text ? 18 : 0;
    this.scroll.setBounds(
      this.isWorldChatDialog ? WORLD_CHAT_CONTENT_INSET_X : 20,
      DIALOG_SCROLL_VIEWPORT_TOP +
        copyHeight +
        headerHeight +
        this.scrollViewportTopInset,
      this.scrollViewportWidth,
      height -
        DIALOG_SCROLL_VIEWPORT_TOP -
        DIALOG_SCROLL_VIEWPORT_BOTTOM_INSET -
        copyHeight -
        headerHeight -
        statusHeight -
        composerHeight -
        shellFooterPaperReduction -
        this.scrollViewportTopInset,
    );
    if (this.isWorldChatDialog) {
      this.orderRows(this.rows.getWidgets());
    }
    this.tabsLayer.position.set(
      footerTabLayout?.rowX ?? width / 2,
      footerTabLayout?.rowY ?? height,
    );
    this.tabsLayer.visible = tabs.length > 0;
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

    this.status.position.set(
      20,
      height -
        24 -
        statusHeight -
        composerHeight -
        shellFooterPaperReduction,
    );

    if (this.composerField) {
      const composerLeft = this.panel.paperFrame.x;
      const composerRight =
        this.panel.paperFrame.x +
        this.panel.paperFrame.frameWidth;
      const sendX =
        composerRight - WORLD_CHAT_COMPOSER_SEND_WIDTH;
      const composerY = height - 40;
      this.composerField.position.set(
        composerLeft,
        composerY,
      );
      this.composerField.setSize(
        sendX -
          WORLD_CHAT_COMPOSER_GAP -
          composerLeft,
        WORLD_CHAT_COMPOSER_FIELD_HEIGHT,
      );
      this.composerSubmit.setBounds(
        sendX,
        composerY,
        WORLD_CHAT_COMPOSER_SEND_WIDTH,
        WORLD_CHAT_COMPOSER_SEND_HEIGHT,
      );
    }
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
    const usesQuestSectionRows =
      this.viewModel.rowWidget === 'worldEventQuest';
    const questRowsX = (width - WORLD_EVENT_QUEST_ROW_WIDTH) / 2;

    this.headerHeadline.position.set(
      contentX,
      headerY + WORLD_EVENT_HEADER_CONTENT_INSET,
    );
    this.headerBody.position.set(
      contentX,
      this.headerHeadline.y +
        (this.headerHeadline.text
          ? Math.ceil(this.headerHeadline.height) + 3
          : 0),
    );
    this.headerMeta.position.set(
      contentX,
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
      footerTabLayout?.paperBottom ??
      height - DIALOG_PAPER_BOTTOM_INSET;
    const listHeight = Math.max(
      0,
      paperBottom - listY - paperOutsets.bottom,
    );
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
    this.scroll.setBounds(
      usesQuestSectionRows ? questRowsX : contentX,
      scrollY,
      usesQuestSectionRows ? WORLD_EVENT_QUEST_ROW_WIDTH : contentWidth,
      Math.max(
        0,
        scrollBottom - scrollY - statusHeight,
      ),
    );
    this.status.position.set(
      contentX,
      scrollBottom - statusHeight,
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

  activate() {
    this.modal.activate();
    if (this.isWorldChatDialog) {
      this.scroll.scrollTo(
        Math.max(0, this.scroll.contentHeight - this.scroll.height),
      );
    }
  }

  deactivate() {
    this.composerSubmissionToken += 1;
    this.composerSubmitting = false;
    this.composerStatus = '';
    this.composerField?.blur();
    this.updateStatus();
    this.updateComposerControl();
    this.modal.deactivate();
  }

  destroy() {
    this.clearTargets();
    this.composerSubmissionToken += 1;
    this.composerField?.destroy({ children: true });
    this.composerField = null;
    this.composerSubmit?.destroy();
    this.composerSubmit = null;

    this.defaultRows?.destroy();
    this.allianceRows?.destroy();
    this.worldEventRows?.destroy();
    this.rows = null;
    this.defaultRows = null;
    this.allianceRows = null;
    this.worldEventRows = null;
    for (const chrome of this.personalTaskSectionChrome?.values?.() ?? []) {
      chrome.progress.destroy();
      chrome.root.destroy({ children: true });
    }
    this.personalTaskSectionChrome?.clear?.();
    this.personalTaskSectionChrome = null;
    this.rowPool.destroy();
    this.allianceRowPool?.destroy();
    this.allianceRowPool = null;
    this.worldEventRowPool?.destroy();
    this.worldEventRowPool = null;
    this.tabs.destroy();
    this.tabPool.destroy();
    this.scroll.destroy();
    this.modal.destroy();
  }

  bindComposer(model) {
    if (!this.composerField || !this.composerSubmit) {
      return;
    }

    this.composerModel =
      model && this.viewModel.onSubmit
        ? model
        : null;
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
    this.composerField.maxLength =
      this.composerModel.maxLength ?? 160;
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
      enabled: Boolean(this.composerModel),
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
    if (result?.ok === true) {
      this.composerField.setValue('');
    }
    this.updateStatus();
    this.updateComposerControl();
    return result?.ok === true;
  }

  updateStatus() {
    setText(
      this.status,
      this.isWorldChatDialog
        ? ''
        : this.composerStatus || this.boundStatus || '',
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
        dialog.assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.settingsRow,
        ) ?? Texture.EMPTY,
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
    this.action = new PixiCostButton({
      assetManager: dialog.assetManager,
      inputRouter: dialog.inputRouter,
      compact: true,
      contentScale: 0.68,
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
    this.action.setModel({
      amountLabel: this.model.actionLabel ?? (enabled ? 'Donate' : 'Unavailable'),
      resource: 'none',
      enabled,
      action: enabled ? () => this.model.onActivate?.(this.model) : null,
    });
    this.action.eventMode = enabled ? 'static' : 'none';
    this.action.cursor = enabled ? 'pointer' : 'default';
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
          enabled ? this.model?.onActivate?.(this.model) ?? true : false,
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
    const actionX =
      width - WORLD_EVENT_QUEST_ACTION_WIDTH - 6;
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
    this.action.setBounds(
      actionX,
      Math.max(0, (height - WORLD_EVENT_QUEST_ACTION_HEIGHT) / 2),
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
 * reuses the shared green/gray cost-button interaction and press contract.
 */
export class WorldEventQuestRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.root = new Container({
      label: `${dialog.dialogId}-quest-row`,
    });
    this.card = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.dialogPaper,
        ) ?? Texture.EMPTY,
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
        WORKSHOP_DIALOG_CONTENT_WIDTH -
        WORLD_EVENT_QUEST_CONTENT_INSET * 2,
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
    this.title.style.wordWrap = true;
    this.title.style.wordWrapWidth = Math.max(
      80,
      width - WORLD_EVENT_QUEST_CONTENT_INSET * 2 - 84,
    );
    this.points.position.set(width - WORLD_EVENT_QUEST_CONTENT_INSET, 9);
    this.description.position.set(
      WORLD_EVENT_QUEST_CONTENT_INSET,
      WORLD_EVENT_QUEST_CONTENT_TOP +
        WORLD_EVENT_QUEST_TITLE_HEIGHT +
        WORLD_EVENT_QUEST_DESCRIPTION_GAP,
    );
    this.description.style.wordWrap = true;
    this.description.style.wordWrapWidth =
      width - WORLD_EVENT_QUEST_CONTENT_INSET * 2;
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
      optionY +=
        WORLD_EVENT_QUEST_OPTION_HEIGHT +
        WORLD_EVENT_QUEST_OPTION_GAP;
    }
    this.progress.position.set(
      WORLD_EVENT_QUEST_CONTENT_INSET,
      height - 8,
    );
    this.status.position.set(
      width - WORLD_EVENT_QUEST_CONTENT_INSET,
      height - 8,
    );
    this.root.hitArea = new Rectangle(0, 0, width, height);
  }

  getPreferredHeight() {
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
    this.card.alpha = this.model?.completed === true ? 0.72 : 1;
    const textColor =
      this.model?.completed === true
        ? resolvedTheme.muted
        : resolvedTheme.text;
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
        WORKSHOP_DIALOG_CONTENT_WIDTH -
          WORLD_EVENT_QUEST_CONTENT_INSET * 2,
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
    this.avatar = new Sprite(Texture.EMPTY);
    this.avatar.label = `${dialog.dialogId}-message-row:avatar`;
    this.avatar.anchor.set(0.5);
    this.tag = createText('', {
      fontSize: 11,
      lineHeight: WORLD_CHAT_HEADER_HEIGHT,
      fontWeight: '700',
    });
    this.username = createText('', {
      fontSize: 11,
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
      fontSize: 8.5,
      lineHeight: 10,
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
    this.avatarRegistration =
      dialog.inputRouter?.registerPressTarget?.(this.avatar, {
        enabled: () => this.isPlayerInteractive(),
        onActivate: () => this.activatePlayer(),
        haptic: 'selection',
        excludePageSwipe: true,
      }) ?? null;
    this.usernameRegistration =
      dialog.inputRouter?.registerPressTarget?.(this.username, {
        enabled: () => this.isPlayerInteractive(),
        onActivate: () => this.activatePlayer(),
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
      this.isSystem ? this.model.systemPlayerUsername ?? '' : '',
    );
    this.bindBody(
      this.isSystem && this.model.systemPlayerUsername
        ? this.model.systemPlayerDetail ?? this.model.body ?? ''
        : this.model.body ?? '',
      this.model.bodyRuns,
      this.model.bodyIcon,
    );
    setText(this.timestamp, this.model.ageLabel ?? '');
    this.avatar.texture = this.isSystem
      ? Texture.EMPTY
      : resolveCharacterTexture(
          this.dialog.assetManager,
          this.model.character,
        );
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
    const timestampInset = this.isSystem ? 6 : 0;
    this.systemBackground
      .clear()
      .roundRect(0, 0, width, height, 5)
      .fill(WORLD_CHAT_SYSTEM_BACKGROUND);
    this.avatar.position.set(
      WORLD_CHAT_AVATAR_SIZE / 2,
      WORLD_CHAT_AVATAR_SIZE / 2 + 1,
    );
    this.avatar.width = WORLD_CHAT_AVATAR_SIZE;
    this.avatar.height = WORLD_CHAT_AVATAR_SIZE;
    this.tag.position.set(contentX, 0);
    this.username.position.set(
      contentX + (this.tag.visible ? this.tag.width + 2 : 0),
      0,
    );
    this.timestamp.position.set(width - timestampInset, 1);
    this.systemPlayerUsername.position.set(contentX, WORLD_CHAT_BODY_TOP);
    const bodyX = this.systemPlayerUsername.visible
      ? contentX + this.systemPlayerUsername.width + 2
      : contentX;
    this.body.position.set(bodyX, WORLD_CHAT_BODY_TOP);
    this.body.setWrapWidth(Math.max(0, width - bodyX));
    this.avatar.hitArea = new Rectangle(
      -WORLD_CHAT_AVATAR_SIZE / 2,
      -WORLD_CHAT_AVATAR_SIZE / 2,
      WORLD_CHAT_AVATAR_SIZE,
      WORLD_CHAT_AVATAR_SIZE,
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
    const bodyHeight = Math.max(
      WORLD_CHAT_BODY_LINE_HEIGHT,
      Math.ceil(this.body.layoutHeight),
    );
    return Math.max(
      this.isSystem ? 25 : 27,
      WORLD_CHAT_BODY_TOP + bodyHeight + (this.isSystem ? 3 : 1),
    );
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? this.dialog.theme;
    applyTextTheme(this.tag, resolvedTheme, {
      fontSize: 11,
      lineHeight: WORLD_CHAT_HEADER_HEIGHT,
      fontWeight: '700',
      fill:
        WORLD_CHAT_TAG_COLORS[
          normalizeWorldChatTagColor(this.model?.allianceTagColor)
        ] ?? WORLD_CHAT_TAG_COLORS.ink,
    });
    this.tag.style.stroke = normalizePixiTextStroke({
      color: WORLD_CHAT_TAG_STROKE,
    }, this.tag.style.fontSize);
    applyTextTheme(this.username, resolvedTheme, {
      fontSize: 11,
      lineHeight: WORLD_CHAT_HEADER_HEIGHT,
      fontWeight: '700',
      fill: this.isSystem
        ? WORLD_CHAT_SYSTEM_TITLE_COLOR
        : resolvedTheme.text,
    });
    applyTextTheme(this.systemPlayerUsername, resolvedTheme, {
      fontSize: WORLD_CHAT_BODY_FONT_SIZE,
      lineHeight: WORLD_CHAT_BODY_LINE_HEIGHT,
      fontWeight: '700',
      fill: WORLD_CHAT_SYSTEM_PLAYER_COLOR,
    });
    applyTextTheme(this.body, resolvedTheme, {
      fontSize: WORLD_CHAT_BODY_FONT_SIZE,
      lineHeight: WORLD_CHAT_BODY_LINE_HEIGHT,
      fill: resolvedTheme.text,
      wordWrapWidth:
        (this.width || WORKSHOP_DIALOG_CONTENT_WIDTH) -
        (this.systemPlayerUsername.visible
          ? this.systemPlayerUsername.x +
            this.systemPlayerUsername.width +
            2
          : this.isSystem
            ? 6
            : WORLD_CHAT_TEXT_X),
    });
    applyTextTheme(this.timestamp, resolvedTheme, {
      fontSize: 8.5,
      lineHeight: 10,
      align: 'right',
      fill: WORLD_CHAT_TIMESTAMP_COLOR,
    });
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
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    this.targetId = null;
    this.model = null;
    this.isSystem = false;
    this.avatar.texture = Texture.EMPTY;
    this.body.setRuns([]);
    setText(this.systemPlayerUsername, '');
    this.root.visible = false;
    this.syncInteraction();
  }

  destroy() {
    if (this.targetId) {
      this.dialog.unregisterTarget(this.targetId);
    }
    disposeInputRegistration(this.avatarRegistration);
    disposeInputRegistration(this.usernameRegistration);
    disposeInputRegistration(this.systemPlayerRegistration);
    this.avatarRegistration = null;
    this.usernameRegistration = null;
    this.systemPlayerRegistration = null;
    this.root.destroy({ children: true });
  }
}

export class AllianceMemberRow {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.model = null;
    this.targetId = null;
    this.root = new Container({ label: `${dialog.dialogId}-alliance-member-row` });
    this.hitTarget = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-alliance-member-hit`,
      inputRouter: dialog.inputRouter,
      variant: 'inline',
    });
    this.username = createText('', RETAINED_TEXT_STYLES.body);
    this.role = createText('', RETAINED_TEXT_STYLES.border);
    this.level = createText('', RETAINED_TEXT_STYLES.border);
    this.level.anchor.set(1, 0);
    this.root.addChild(this.hitTarget.root, this.username, this.role, this.level);
  }

  bind(model) {
    this.unregisterTarget();
    this.model = model ?? {};
    this.root.visible = true;
    setText(this.username, this.model.username ?? 'Wizard');
    setText(this.role, this.model.roleLabel ?? 'trader');
    setText(this.level, this.model.levelLabel ?? 'Lv 1');
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

  setBounds(x, y, width, height = ALLIANCE_MEMBER_ROW_HEIGHT) {
    this.root.position.set(x, y);
    this.hitTarget.setBounds(0, 0, width, height);
    this.username.position.set(6, 6);
    this.role.position.set(100, 7);
    this.level.position.set(width - 6, 7);
    this.root.hitArea = new Rectangle(0, 0, width, height);
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
  }

  reset() {
    this.unregisterTarget();
    this.model = null;
    this.root.visible = false;
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
    this.expanded = false;
    this.width = WORKSHOP_DIALOG_CONTENT_WIDTH;
    this.targetIds = [];
    this.memberWidgets = new Map();
    this.root = new Container({ label: `${dialog.dialogId}-alliance-directory-row` });
    this.frame = new Graphics({ label: `${dialog.dialogId}-alliance-directory-frame` });
    this.summaryHit = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-alliance-directory-summary`,
      inputRouter: dialog.inputRouter,
      variant: 'inline',
    });
    this.tag = createText('', RETAINED_TEXT_STYLES.bold);
    this.name = createText('', RETAINED_TEXT_STYLES.body);
    this.total = createText('', RETAINED_TEXT_STYLES.body);
    this.total.anchor.set(1, 0);
    this.coin = new Sprite(Texture.EMPTY);
    this.coin.anchor.set(0.5);
    this.membersLabel = createText('members', RETAINED_TEXT_STYLES.border);
    this.memberCount = createText('', RETAINED_TEXT_STYLES.border);
    this.memberCount.anchor.set(1, 0);
    this.memberViewport = new RetainedScrollArea({
      assetManager: dialog.assetManager,
      label: `${dialog.dialogId}-alliance-member-scroll`,
      inputRouter: dialog.inputRouter,
    });
    this.action = new RetainedButton({
      assetManager: dialog.assetManager,
      buttonLabel: `${dialog.dialogId}-alliance-directory-action`,
      inputRouter: dialog.inputRouter,
      variant: 'green',
    });
    this.details = new Container({ label: `${dialog.dialogId}-alliance-directory-details` });
    this.details.addChild(
      this.membersLabel,
      this.memberCount,
      this.memberViewport.root,
      this.action.root,
    );
    this.root.addChild(
      this.frame,
      this.summaryHit.root,
      this.tag,
      this.name,
      this.total,
      this.coin,
      this.details,
    );
  }

  bind(model) {
    this.unregisterTargets();
    this.model = model ?? {};
    this.root.visible = true;
    this.expanded = this.model.expanded === true;
    const tag = normalizeWorldChatTag(this.model.tag);
    setText(this.tag, tag ? `[${tag}]` : '');
    setText(this.name, this.model.name ?? 'Alliance');
    setText(this.total, this.model.totalIncomeLabel ?? '0');
    setText(
      this.memberCount,
      `${Math.max(0, Number(this.model.memberCount) || 0)}/${Math.max(
        1,
        Number(this.model.memberCapacity) || 50,
      )}`,
    );
    this.coin.texture = resolveAtlasTexture(this.dialog.assetManager, 'resource:coin');
    this.coin.visible = this.coin.texture !== Texture.EMPTY;
    this.summaryHit.setModel({
      label: '',
      enabled: typeof this.model.onActivate === 'function',
      action: () => this.model.onActivate?.(this.model),
    });
    const actionModel = this.model.action ?? {};
    this.action.variant = actionModel.variant ?? 'green';
    this.action.control.setVariant(this.action.variant);
    this.action.setModel({
      label: actionModel.label ?? '',
      enabled: actionModel.enabled !== false,
      action: () => actionModel.onActivate?.(this.model),
    });
    this.details.visible = this.expanded;
    this.details.renderable = this.expanded;
    this.reconcileMembers(this.model.members ?? []);
    this.registerTargets();
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  reconcileMembers(members) {
    const nextIds = new Set();
    for (const [index, member] of members.entries()) {
      const id = String(member.id ?? member.memberIdentity ?? index);
      nextIds.add(id);
      let widget = this.memberWidgets.get(id);
      if (!widget) {
        widget = new AllianceMemberRow({ dialog: this.dialog });
        this.memberWidgets.set(id, widget);
      }
      widget.bind(member);
    }

    for (const [id, widget] of this.memberWidgets) {
      if (!nextIds.has(id)) {
        widget.destroy();
        this.memberWidgets.delete(id);
      }
    }

    this.memberViewport.content.removeChildren();
    let y = 0;
    for (const [index, member] of members.entries()) {
      const id = String(member.id ?? member.memberIdentity ?? index);
      const widget = this.memberWidgets.get(id);
      if (!widget) {
        continue;
      }
      this.memberViewport.content.addChild(widget.root);
      widget.setBounds(0, y, 236, ALLIANCE_MEMBER_ROW_HEIGHT);
      y += ALLIANCE_MEMBER_ROW_HEIGHT;
    }
    this.memberViewport.setContentHeight(y);
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
          expanded: this.expanded,
        }),
        activate: () => this.model?.onActivate?.(this.model) ?? false,
      });
    }
    if (actionId && this.expanded) {
      this.targetIds.push(actionId);
      this.dialog.registerTarget({
        semanticId: actionId,
        displayObject: this.action.root,
        state: () => ({
          enabled: this.model?.action?.enabled !== false,
          interactive: typeof this.model?.action?.onActivate === 'function',
        }),
        activate: () => this.model?.action?.onActivate?.(this.model) ?? false,
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.width = width;
    this.summaryHit.setBounds(0, 0, width, ALLIANCE_DIRECTORY_HEADER_HEIGHT);
    this.tag.position.set(8, 7);
    this.name.position.set(8 + (this.tag.text ? this.tag.width + 5 : 0), 7);
    const coinSize = 14;
    const coinRight = width - 7;
    this.coin.position.set(coinRight - coinSize / 2, ALLIANCE_DIRECTORY_HEADER_HEIGHT / 2);
    this.coin.width = coinSize;
    this.coin.height = coinSize;
    this.total.position.set(
      coinRight - (this.coin.visible ? coinSize + 3 : 0),
      7,
    );
    const nameWidth = Math.max(1, this.total.x - this.total.width - 6 - this.name.x);
    this.name.scale.x =
      this.name.width > nameWidth
        ? Math.max(0.72, nameWidth / this.name.width)
        : 1;
    this.details.position.set(0, ALLIANCE_DIRECTORY_HEADER_HEIGHT + 2);
    this.membersLabel.position.set(8, 1);
    this.memberCount.position.set(width - 8, 1);
    this.memberViewport.setBounds(
      8,
      18,
      236,
      this.expanded ? ALLIANCE_MEMBER_VIEWPORT_HEIGHT : 0,
    );
    this.action.setBounds(
      8,
      18 + ALLIANCE_MEMBER_VIEWPORT_HEIGHT + 6,
      width - 16,
      ALLIANCE_DIRECTORY_ACTION_HEIGHT,
    );
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.redrawFrame();
  }

  getPreferredHeight() {
    return this.expanded
      ? ALLIANCE_DIRECTORY_EXPANDED_HEIGHT
      : ALLIANCE_DIRECTORY_HEADER_HEIGHT;
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.theme = resolvedTheme;
    applyTextTheme(this.tag, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.bold,
      fontSize: 12,
      fill:
        WORLD_CHAT_TAG_COLORS[normalizeWorldChatTagColor(this.model?.tagColor)] ??
        WORLD_CHAT_TAG_COLORS.ink,
      stroke: { color: WORLD_CHAT_TAG_STROKE, width: 2, join: 'round' },
    });
    applyTextTheme(this.name, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.body,
      fontWeight: '700',
      fill: resolvedTheme.text,
    });
    applyTextTheme(this.total, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.body,
      align: 'right',
      fill: resolvedTheme.resourceColors?.coin ?? resolvedTheme.text,
    });
    applyTextTheme(this.membersLabel, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.memberCount, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: resolvedTheme.muted,
    });
    this.summaryHit.applyTheme(resolvedTheme);
    this.action.applyTheme(resolvedTheme);
    for (const widget of this.memberWidgets.values()) {
      widget.applyTheme(resolvedTheme);
    }
    this.redrawFrame();
  }

  redrawFrame() {
    if (!this.theme) {
      return;
    }
    this.frame
      .clear()
      .roundRect(0, 0, this.width, this.getPreferredHeight(), 5)
      .fill({
        color: this.theme.surface,
        alpha: this.expanded ? 0.82 : 0.38,
      })
      .stroke({
        color: this.expanded
          ? this.theme.strokeStrong ?? this.theme.stroke
          : this.theme.stroke,
        width: this.expanded ? 2 : 1,
      });
  }

  reset() {
    this.unregisterTargets();
    for (const widget of this.memberWidgets.values()) {
      widget.destroy();
    }
    this.memberWidgets.clear();
    this.memberViewport.content.removeChildren();
    this.memberViewport.setContentHeight(0);
    this.model = null;
    this.expanded = false;
    this.root.visible = false;
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
    for (const widget of this.memberWidgets.values()) {
      widget.destroy();
    }
    this.memberWidgets.clear();
    this.summaryHit.destroy();
    this.action.destroy();
    this.memberViewport.destroy();
    this.root.destroy({ children: true });
  }
}

class PotionDiscoveryIngredientRowPixi {
  constructor({ dialog, index }) {
    this.dialog = dialog;
    this.root = new Container({
      label: `${dialog.dialogId}-discovery-ingredient:${index}`,
    });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `${this.root.label}:icon`;
    this.icon.anchor.set(0.5);
    this.label = createText('', {
      fontSize: 9,
      lineHeight: 11,
    });
    this.root.addChild(this.icon, this.label);
    this.root.visible = false;
  }

  bind(model) {
    this.model = model ?? {};
    setText(
      this.label,
      `×${this.model.quantity ?? 0} ${this.model.label ?? 'Unknown'}`,
    );
    this.icon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      getHerbIconFrameName(this.model.key),
    );
    this.root.visible = true;
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.icon.position.set(8, 8);
    this.icon.width = 16;
    this.icon.height = 16;
    this.label.position.set(18, 2);
    this.label.style.wordWrap = true;
    this.label.style.wordWrapWidth = Math.max(0, width - 18);
  }

  applyTheme(theme) {
    applyTextTheme(this.label, theme, {
      fontSize: 9,
      lineHeight: 11,
      fill: theme.text,
      wordWrapWidth: Math.max(0, (this.width ?? 100) - 18),
    });
  }

  reset() {
    this.model = null;
    this.icon.texture = Texture.EMPTY;
    setText(this.label, '');
    this.root.visible = false;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/**
 * Approved passive row for a discovered potion and its recipe provenance.
 *
 * The discoverer name is the only action and opens the existing Player Info
 * surface. Unknown potions intentionally hide recipe and economy metadata.
 */
export class PotionDiscoveryRowPixi {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.root = new Container({
      label: `${dialog.dialogId}-potion-discovery-row`,
    });
    this.background = new PixiNineSliceFrame({
      texture:
        dialog.assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.settingsRow,
        ) ?? Texture.EMPTY,
      sourceInsets:
        PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets:
        PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${this.root.label}:background`,
    });
    this.potionIcon = new Sprite(Texture.EMPTY);
    this.potionIcon.label = `${this.root.label}:potion-icon`;
    this.potionIcon.anchor.set(0.5);
    this.name = createText('', {
      fontSize: 13,
      lineHeight: 15,
      fontWeight: '700',
    });
    this.date = createText('', {
      fontSize: 9,
      lineHeight: 11,
      align: 'right',
    });
    this.date.anchor.set(1, 0);
    this.discovererPrefix = createText('', {
      fontSize: 9.5,
      lineHeight: 12,
    });
    this.discovererName = createText('', {
      fontSize: 9.5,
      lineHeight: 12,
      fontWeight: '700',
    });
    this.recipeLabel = createText('', {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
    });
    this.divider = new Graphics({
      label: `${this.root.label}:divider`,
    });
    this.manaIcon = new Sprite(Texture.EMPTY);
    this.manaIcon.label = `${this.root.label}:mana-icon`;
    this.manaIcon.anchor.set(0.5);
    this.mana = createText('', {
      fontSize: 8.5,
      lineHeight: 10,
    });
    this.duration = createText('', {
      fontSize: 8.5,
      lineHeight: 10,
    });
    this.royaltyIcon = new Sprite(Texture.EMPTY);
    this.royaltyIcon.label = `${this.root.label}:royalty-icon`;
    this.royaltyIcon.anchor.set(0.5);
    this.royalty = createText('', {
      fontSize: 8.5,
      lineHeight: 10,
      align: 'right',
    });
    this.royalty.anchor.set(1, 0);
    this.ingredientRows = Array.from(
      { length: DISCOVERY_MAX_INGREDIENTS },
      (_, index) =>
        new PotionDiscoveryIngredientRowPixi({
          dialog,
          index,
        }),
    );
    this.root.addChild(
      this.background,
      this.potionIcon,
      this.name,
      this.date,
      this.discovererPrefix,
      this.discovererName,
      this.recipeLabel,
      ...this.ingredientRows.map((row) => row.root),
      this.divider,
      this.manaIcon,
      this.mana,
      this.duration,
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
        ? this.model.label ?? 'Discovered Potion'
        : 'Undiscovered Potion',
    );
    setText(
      this.discovererPrefix,
      this.discovered
        ? 'Discovered by'
        : 'No wizard has recorded it yet',
    );
    setText(
      this.discovererName,
      this.discovered ? this.model.discovererUsername ?? 'Unknown Wizard' : '',
    );
    setText(
      this.date,
      this.discovered ? this.model.discoveredAtLabel ?? 'Date Unknown' : '',
    );
    setText(
      this.recipeLabel,
      this.discovered ? 'Recipe' : 'Recipe remains hidden',
    );
    setText(this.mana, this.model.manaLabel ?? '');
    setText(this.duration, this.model.durationLabel ?? '');
    setText(this.royalty, this.model.royaltyLabel ?? '');
    this.potionIcon.texture = resolveAtlasTexture(
      this.dialog.assetManager,
      getPotionIconFrameName(this.model.potionKey),
    );
    this.potionIcon.alpha = this.discovered ? 1 : 0.38;
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
    this.root.hitArea = new Rectangle(0, 0, width, height);

    if (!this.discovered) {
      this.potionIcon.position.set(30, height / 2);
      this.potionIcon.width = 40;
      this.potionIcon.height = 40;
      this.name.position.set(56, 10);
      this.name.style.wordWrap = true;
      this.name.style.wordWrapWidth = Math.max(0, width - 64);
      this.discovererPrefix.position.set(56, 29);
      this.recipeLabel.position.set(56, 45);
      return;
    }

    this.potionIcon.position.set(30, 29);
    this.potionIcon.width = DISCOVERY_ICON_SIZE;
    this.potionIcon.height = DISCOVERY_ICON_SIZE;
    this.name.position.set(59, 7);
    this.name.style.wordWrap = true;
    this.name.style.wordWrapWidth = Math.max(0, width - 147);
    this.date.position.set(width - 8, 9);
    this.discovererPrefix.position.set(59, 27);
    this.discovererName.position.set(
      this.discovererPrefix.x + this.discovererPrefix.width + 3,
      27,
    );
    this.discovererName.hitArea = new Rectangle(
      0,
      0,
      Math.max(1, this.discovererName.width),
      Math.max(1, this.discovererName.height),
    );
    this.recipeLabel.position.set(8, 51);

    const ingredientCount = this.visibleIngredientCount;
    const recipeRowCount = Math.max(
      1,
      Math.ceil(ingredientCount / DISCOVERY_RECIPE_COLUMNS),
    );
    const recipeX = 50;
    const ingredientWidth = (width - recipeX - 8) / DISCOVERY_RECIPE_COLUMNS;
    this.ingredientRows.forEach((row, index) => {
      if (!row.root.visible) {
        return;
      }
      row.width = ingredientWidth;
      row.setBounds(
        recipeX + (index % DISCOVERY_RECIPE_COLUMNS) * ingredientWidth,
        45 +
          Math.floor(index / DISCOVERY_RECIPE_COLUMNS) *
            DISCOVERY_RECIPE_ROW_HEIGHT,
        ingredientWidth,
      );
    });

    const dividerY =
      48 + recipeRowCount * DISCOVERY_RECIPE_ROW_HEIGHT;
    this.divider
      .clear()
      .moveTo(8, dividerY)
      .lineTo(width - 8, dividerY)
      .stroke({
        color: DISCOVERY_DIVIDER_COLOR,
        width: 1,
        alpha: 0.48,
      });
    const metadataY = dividerY + 5;
    this.manaIcon.position.set(14, metadataY + 5);
    this.manaIcon.width = 12;
    this.manaIcon.height = 12;
    this.mana.position.set(23, metadataY);
    this.duration.position.set(91, metadataY);
    this.royalty.position.set(width - 8, metadataY);
    this.royaltyIcon.width = 12;
    this.royaltyIcon.height = 12;
    this.royaltyIcon.position.set(
      this.royalty.x - this.royalty.width - 8,
      metadataY + 5,
    );
  }

  getPreferredHeight() {
    if (!this.discovered) {
      return DISCOVERY_LOCKED_ROW_HEIGHT;
    }
    const recipeRowCount = Math.max(
      1,
      Math.ceil(this.visibleIngredientCount / DISCOVERY_RECIPE_COLUMNS),
    );
    return (
      DISCOVERY_BASE_ROW_HEIGHT +
      (recipeRowCount - 1) * DISCOVERY_RECIPE_ROW_HEIGHT
    );
  }

  get visibleIngredientCount() {
    return this.ingredientRows.filter((row) => row.root.visible).length;
  }

  syncMetadataVisibility() {
    for (const displayObject of [
      this.date,
      this.discovererName,
      this.divider,
      this.manaIcon,
      this.mana,
      this.duration,
      this.royaltyIcon,
      this.royalty,
    ]) {
      displayObject.visible = this.discovered;
      displayObject.renderable = this.discovered;
    }
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? this.dialog.theme;
    applyTextTheme(this.name, resolvedTheme, {
      fontSize: 13,
      lineHeight: 15,
      fontWeight: '700',
      fill: this.discovered ? resolvedTheme.text : resolvedTheme.muted,
    });
    applyTextTheme(this.date, resolvedTheme, {
      fontSize: 9,
      lineHeight: 11,
      align: 'right',
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.discovererPrefix, resolvedTheme, {
      fontSize: 9.5,
      lineHeight: 12,
      fill: resolvedTheme.muted,
    });
    applyTextTheme(this.discovererName, resolvedTheme, {
      fontSize: 9.5,
      lineHeight: 12,
      fontWeight: '700',
      fill: DISCOVERY_PLAYER_COLOR,
    });
    applyTextTheme(this.recipeLabel, resolvedTheme, {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
      fill: this.discovered ? resolvedTheme.text : resolvedTheme.muted,
    });
    applyTextTheme(this.mana, resolvedTheme, {
      fontSize: 8.5,
      lineHeight: 10,
      fill: resolvedTheme.resourceColors?.mana ?? resolvedTheme.text,
    });
    applyTextTheme(this.duration, resolvedTheme, {
      fontSize: 8.5,
      lineHeight: 10,
      fill: resolvedTheme.text,
    });
    applyTextTheme(this.royalty, resolvedTheme, {
      fontSize: 8.5,
      lineHeight: 10,
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
    this.action.control.setVariant(
      model.actionVariant ?? 'regular',
    );
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
    this.value.position.set(
      valueRight -
        (this.dialog.isBagDialog ? BAG_ROW_VALUE_INSET_RIGHT : 0),
      contentY,
    );
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
      wordWrapWidth:
        this.action.root.visible
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
        ? theme.resourceColors?.[this.model.resourceKey] ?? theme.text
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
  const kind = String(model.itemKind ?? '').trim().toLowerCase();
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
      assetManager?.getTexture?.(
        'source:assets/avatars/elara.png',
      ) ??
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
    (typeof assetManager.has === 'function' &&
      !assetManager.has(assetId))
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
  const runs = Array.isArray(bodyRuns) && bodyRuns.length > 0
    ? bodyRuns
    : createLegacyWorldChatBodyRuns(body, legacyBodyIcon);

  return runs.map((run) => {
    if (run?.kind !== 'icon') {
      return {
        kind: 'text',
        text:
          typeof run === 'string'
            ? run
            : String(run?.text ?? ''),
      };
    }
    return {
      ...run,
      fallbackText: String(
        run.fallbackText ?? run.marker ?? '',
      ),
      texture: resolveWorldChatBodyIconTexture(
        assetManager,
        run.assetId,
      ),
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
  const normalized = String(color ?? '').trim().toLowerCase();
  return normalized in WORLD_CHAT_TAG_COLORS ? normalized : 'ink';
}

function disposeInputRegistration(registration) {
  if (typeof registration === 'function') {
    registration();
    return;
  }
  registration?.unregister?.();
}
