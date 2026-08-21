import { Container, Graphics, Texture } from 'pixi.js';

import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { AllianceFlagWidget } from '../../primitives/AllianceFlagWidget.js';
import {
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  createDialogContentTheme,
  createDialogPaperSection,
  resolveDialogPaperOutsets,
  setDialogPaperSectionBounds,
} from '../../primitives/PixiDialogFrame.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  createPixiPageBackgroundGradient,
  drawPixiPageBackground,
} from '../../theme/PixiPageBackground.js';
import { PlayerRelationshipRowPixi } from '../../global/dialogs/PlayerRelationshipRowPixi.js';
import { RootRunHudCurrencyCapsule } from '../../global/chrome/RootRunTopHudWidgets.js';
import { TRADE_ALLIANCE_ROLES } from '../../../../shared/tradeAllianceRoles.js';
import {
  ALLIANCE_DIALOG_CONTENT_WIDTH,
  AllianceDirectoryRow,
  AllianceMemberRow,
  AllianceQuestRow,
  AllianceSettingsPane,
  createAllianceMembersSection,
} from '../workshop/WorkshopDialogPixi.js';
import {
  RETAINED_DIALOG_SCROLL_GEOMETRY,
  RETAINED_DIALOG_LIST_GEOMETRY,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedButton,
  RetainedScrollArea,
  applyTextTheme,
  createText,
  resolveRetainedDialogListLayout,
  setText,
} from '../workshop/RetainedPageKit.js';
import { MarketTitleRibbon } from '../shop/MarketTitleRibbon.js';

const PAGE_TABS = Object.freeze([
  'browse',
  'create',
  'home',
  'quests',
  'requests',
  'settings',
]);
const PAGE_EDGE = PIXI_UI_GEOMETRY.roomContentEdge;
const PAGE_TOP = PIXI_UI_GEOMETRY.roomContentTop;
const PAGE_TITLE_GAP = 5;
const PAGE_TITLE_HEIGHT = PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon.height;
const PAGE_CONTENT_TOP = PAGE_TOP + PAGE_TITLE_HEIGHT + PAGE_TITLE_GAP;
const PAGE_BOTTOM_CLEARANCE = RETAINED_PAGE_GEOMETRY.chatClearance;
const ROW_GAP = 4;
const REQUESTS_JOIN_MODE_GAP = 6;
const REQUESTS_JOIN_MODE_HEIGHT = 102;
const SECTION_FRAME_TOP = PIXI_UI_GEOMETRY.dialogPadding;
const SECTION_CONTENT_TOP =
  SECTION_FRAME_TOP + PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
const SECTION_CONTENT_BOTTOM =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
const SECTION_GAP = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap;
const MEMBER_ROW_HEIGHT = PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch;
const MAX_HOME_CONTENT_WIDTH = 350;
const HOME_CONTENT_INSET = 14;
const HOME_CONTENT_OFFSET_Y = -8;
const HOME_IDENTITY_OFFSET_Y = -8;
const HOME_IDENTITY_CONTENT_HEIGHT = 120;
const HOME_ANNOUNCEMENT_CONTENT_HEIGHT = 62;
const HOME_ANNOUNCEMENT_TITLE_SCALE = 0.86;
const HOME_ANNOUNCEMENT_TITLE = 'Announcement';
const HOME_ANNOUNCEMENT_EMPTY = 'No Alliance Announcement';
const HOME_FLAG_SIZE = 92;
const HOME_STAT_SOURCE_WIDTH = 270;
const HOME_STAT_SCALE = 1 / PIXI_UI_GEOMETRY.sourceScale;
const ALLIANCE_MEMBERS_ICON_FRAME = 'alliance:members';

/**
 * Full retained Trade Alliance workspace.
 *
 * The page owns only presentation and UI drafts. Alliance membership, chat,
 * applications, settings, and quests remain authoritative in the backend
 * facade and arrive as projected view models.
 */
export class AlliancePixiPage extends BasePixiRetainedView {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    textEntryService = null,
    counters = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ label: 'alliance:page' });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.textEntryService = textEntryService;
    this.theme = theme;
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.model = normalizeAllianceModel({});
    this.selectedTabId = 'browse';
    this.backgroundGradient = null;
    this.registeredTargetIds = new Set();

    this.background = new Graphics({ label: 'alliance:background' });
    this.identityLayer = new Container({ label: 'alliance:identity' });
    this.titleRibbon = new MarketTitleRibbon({
      assetManager,
      label: 'alliance:title-ribbon',
      showStars: false,
    });
    this.titleRibbon.bind('Trade Alliance', 0);
    this.identityLayer.addChild(this.titleRibbon.root);
    this.contentLayer = new Container({ label: 'alliance:content' });
    this.scrolls = new Map(
      ['browse', 'quests', 'requests'].map((tabId) => [
        tabId,
        new RetainedScrollArea({
          assetManager,
          inputRouter,
          label: `alliance:${tabId}:scroll`,
        }),
      ]),
    );
    this.contentLayer.addChild(
      ...[...this.scrolls.values()].map((scroll) => scroll.root),
    );

    this.paperHost = this.createRowHost({ paper: true });
    this.homeIdentitySection = createHomePaperSection(
      this.paperHost,
      'identity',
    );
    this.homeFlag = new AllianceFlagWidget({
      assetManager,
      label: 'alliance:home:flag',
    });
    this.homeName = createText('', {
      ...RETAINED_TEXT_STYLES.bold,
      fontSize: 19,
      lineHeight: 22,
    });
    this.homeTag = createText('', {
      ...RETAINED_TEXT_STYLES.bold,
      fontSize: 13,
      lineHeight: 16,
    });
    this.homeMemberStat = new RootRunHudCurrencyCapsule({
      amount: '0/50',
      assets: assetManager,
      iconFrame: ALLIANCE_MEMBERS_ICON_FRAME,
      label: 'alliance:home:member-count',
      resource: 'coin',
      width: HOME_STAT_SOURCE_WIDTH,
    });
    this.homeIncomeStat = new RootRunHudCurrencyCapsule({
      amount: '0',
      assets: assetManager,
      label: 'alliance:home:season-income',
      resource: 'coin',
      width: HOME_STAT_SOURCE_WIDTH,
    });
    this.homeMemberStat.scale.set(HOME_STAT_SCALE);
    this.homeIncomeStat.scale.set(HOME_STAT_SCALE);
    this.homeIdentitySection.root.addChild(
      this.homeFlag,
      this.homeName,
      this.homeTag,
      this.homeMemberStat,
      this.homeIncomeStat,
    );

    this.homeAnnouncement = createHomeAnnouncementSection(this.paperHost);
    this.homeLeaveButton = new PixiTextButton({
      assetManager,
      fallbackHitTest: true,
      height: 26,
      inputRouter,
      label: 'alliance:home:leave',
      semanticId: 'workshop.alliance.leave',
      semanticRegistry,
      sizeTier: 30,
      text: 'Leave',
      variant: 'red',
      width: 64,
    });
    this.homeIdentitySection.root.addChild(this.homeLeaveButton);
    this.homeMembersSection = createAllianceMembersSection(this.paperHost);
    this.contentLayer.addChild(
      this.homeIdentitySection.root,
      this.homeAnnouncement.root,
      this.homeMembersSection.root,
    );
    this.homeMemberRows = this.createCollection({
      counters,
      id: 'home-members',
      host: this.paperHost,
      RowClass: AllianceMemberRow,
      layer: this.homeMembersSection.scroll.content,
    });

    this.directory = this.createCollection({
      counters,
      id: 'directory',
      host: this.paperHost,
      RowClass: AllianceDirectoryRow,
      scrollId: 'browse',
    });
    this.quests = this.createCollection({
      counters,
      id: 'quests',
      host: this.paperHost,
      RowClass: AllianceQuestRow,
      scrollId: 'quests',
    });
    this.requests = this.createCollection({
      counters,
      id: 'requests',
      host: this.paperHost,
      RowClass: PlayerRelationshipRowPixi,
      scrollId: 'requests',
    });
    this.requestJoinModePane = new AllianceJoinModePane({
      host: this.paperHost,
    });
    this.contentLayer.addChild(this.requestJoinModePane.root);

    this.emptyLabels = new Map(
      ['browse', 'quests', 'requests'].map((tabId) => {
        const label = createText('', {
          ...RETAINED_TEXT_STYLES.body,
          align: 'center',
        });
        label.anchor.set(0.5);
        this.scrolls.get(tabId).content.addChild(label);
        return [tabId, label];
      }),
    );

    this.settingsPane = new AllianceSettingsPane({ dialog: this.paperHost });
    this.contentLayer.addChild(this.settingsPane.root);

    this.root.addChild(
      this.background,
      this.identityLayer,
      this.contentLayer,
    );
    this.rebuildBackgroundGradient();
    this.onApplyTheme(theme);
    this.onBind({});
    this.relayout();
  }

  createRowHost({ paper }) {
    const host = {
      dialogId: paper ? 'alliance.workspace' : 'alliance.chat',
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      textEntryService: this.textEntryService,
      semanticTargets: this.semanticRegistry,
      theme: this.theme,
      contentTheme: paper ? createDialogContentTheme(this.theme) : this.theme,
      panel: {
        paperFrame: {
          texture:
            this.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.dialogPaper) ??
            Texture.EMPTY,
        },
      },
      isFriendsDialog: false,
      registerTarget: (descriptor) => this.registerTarget(descriptor),
      unregisterTarget: (semanticId) => this.unregisterTarget(semanticId),
    };
    return host;
  }

  createCollection({
    counters,
    id,
    host,
    RowClass,
    scrollId = null,
    layer = null,
  }) {
    const rowLayer = layer ?? new Container({ label: `alliance:${id}:rows` });
    if (scrollId) this.scrolls.get(scrollId).content.addChild(rowLayer);
    const pool = new WidgetPool({
      name: `Alliance ${id} row pool`,
      counters,
      maxSize: 48,
      create: () => new RowClass({ dialog: host }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
    });
    const rows = new PooledCollection({
      name: `Alliance ${id} rows`,
      pool,
      counters,
      keyOf: (row, index) => row.id ?? row.key ?? index,
      bind: (widget, row) => widget.bind(row),
      afterReconcile: (widgets) => {
        for (const widget of widgets) rowLayer.addChild(widget.root);
      },
    });
    return { layer: rowLayer, pool, rows };
  }

  onBind(viewModel = {}) {
    this.model = normalizeAllianceModel(viewModel);
    this.selectedTabId = this.model.selectedTabId;
    this.paperHost.theme = this.theme;
    this.paperHost.contentTheme = createDialogContentTheme(this.theme);

    const info = this.model.tradeInfo ?? {};
    const identity = resolveAllianceIdentity(info);
    const seasonIncome = findTradeInfoRow(
      this.model.tradeInfoRows,
      'season-income',
      'income',
    );
    const membership = findTradeInfoRow(
      this.model.tradeInfoRows,
      'membership',
      'leave',
    );
    setText(this.homeName, identity.name);
    setText(this.homeTag, identity.tag ? `[${identity.tag}]` : '');
    const announcementText = String(info.notice ?? '').trim();
    this.homeAnnouncement.empty = !announcementText;
    setText(
      this.homeAnnouncement.detail,
      announcementText || HOME_ANNOUNCEMENT_EMPTY,
    );
    this.homeFlag.setColors(this.model.flag ?? {});
    this.homeMemberStat.setAmount(info.memberCountLabel ?? '0/50');
    this.homeIncomeStat.setAmount(seasonIncome?.value ?? '0');
    const leaveLabel = membership?.value || membership?.actionLabel || 'Leave';
    const leaveWidth = leaveLabel.length > 10 ? 112 : 64;
    const leaveVisible = Boolean(membership);
    this.homeLeaveButton.visible = leaveVisible;
    this.homeLeaveButton.renderable = leaveVisible;
    this.homeLeaveButton
      .setText(leaveLabel)
      .setSize(leaveWidth, 26)
      .setAction(membership?.onActivate)
      .setEnabled(membership?.enabled !== false && Boolean(membership?.onActivate));
    this.homeMemberRows.rows.reconcile(
      createAllianceHomeRosterRows(this.model.members),
    );

    this.directory.rows.reconcile(this.model.directoryRows);
    this.quests.rows.reconcile(this.model.questRows);
    this.requests.rows.reconcile(this.model.requestRows);
    this.requestJoinModePane.bind(this.model.requestsSettings);
    this.settingsPane.bind(this.model.settings);
    this.relayout();
  }

  onLayout(viewportProjection) {
    this.sourceWidth = finiteOr(
      viewportProjection?.sourceWidth,
      PIXI_UI_GEOMETRY.sourceWidth,
    );
    this.sourceHeight = finiteOr(
      viewportProjection?.sourceHeight,
      PIXI_UI_GEOMETRY.sourceHeight,
    );
    this.relayout();
  }

  onApplyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.paperHost.theme = this.theme;
    this.paperHost.contentTheme = createDialogContentTheme(this.theme);
    applyTextTheme(
      this.homeName,
      this.paperHost.contentTheme,
      {
        ...RETAINED_TEXT_STYLES.bold,
        fontSize: 19,
        lineHeight: 22,
      },
    );
    applyTextTheme(
      this.homeTag,
      this.paperHost.contentTheme,
      {
        ...RETAINED_TEXT_STYLES.bold,
        fontSize: 13,
        lineHeight: 16,
        fill: this.paperHost.contentTheme.muted,
      },
    );
    applyTextTheme(this.homeAnnouncement.detail, this.paperHost.contentTheme, {
      ...RETAINED_TEXT_STYLES.tiny,
      fill: this.paperHost.contentTheme.muted,
    });
    this.homeMemberStat.applyTheme(this.theme);
    this.homeIncomeStat.applyTheme(this.theme);
    this.homeLeaveButton.applyTheme(this.theme);
    for (const collection of [
      this.homeMemberRows,
      this.directory,
      this.quests,
      this.requests,
    ]) {
      for (const row of collection.rows.getWidgets()) {
        row.applyTheme?.(this.paperHost.contentTheme);
      }
    }
    for (const label of this.emptyLabels.values()) {
      applyTextTheme(label, this.theme, RETAINED_TEXT_STYLES.body);
    }
    this.settingsPane.applyTheme(this.theme);
    this.requestJoinModePane.applyTheme(this.theme);
    this.rebuildBackgroundGradient();
    this.redrawBackground();
  }

  relayout() {
    if (!this.background) return;
    const viewportHeight = Math.max(
      0,
      this.sourceHeight - PAGE_BOTTOM_CLEARANCE - PAGE_CONTENT_TOP,
    );
    this.identityLayer.position.set(0, PAGE_TOP);
    this.titleRibbon.setMaxWidth(this.sourceWidth);
    this.titleRibbon.root.position.set(
      (this.sourceWidth - this.titleRibbon.width) / 2,
      0,
    );
    for (const [tabId, scroll] of this.scrolls) {
      scroll.root.visible = tabId === this.selectedTabId;
      scroll.root.renderable = scroll.root.visible;
    }

    this.layoutHome(viewportHeight);
    this.layoutCollection(this.directory, 'browse', 318, viewportHeight);
    const listLayout = resolveRetainedDialogListLayout({
      bodyWidth: ALLIANCE_DIALOG_CONTENT_WIDTH,
      paperRight:
        ALLIANCE_DIALOG_CONTENT_WIDTH + PIXI_UI_GEOMETRY.dialogPadding + 14 / 3,
      rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
    });
    this.layoutCollection(
      this.quests,
      'quests',
      this.sourceWidth - PAGE_EDGE * 2 + 2,
      viewportHeight,
      {
        rowInsetX: PAGE_EDGE,
        viewportWidth: this.sourceWidth - PAGE_EDGE,
        viewportX: 0,
      },
    );
    const requestsViewportHeight = Math.max(
      0,
      viewportHeight -
        (this.requestJoinModePane.visible
          ? REQUESTS_JOIN_MODE_HEIGHT + REQUESTS_JOIN_MODE_GAP
          : 0),
    );
    this.layoutCollection(
      this.requests,
      'requests',
      listLayout.rowWidth,
      requestsViewportHeight,
    );
    if (this.requestJoinModePane.visible) {
      this.requestJoinModePane.setBounds(
        (this.sourceWidth - listLayout.rowWidth) / 2,
        PAGE_CONTENT_TOP + requestsViewportHeight + REQUESTS_JOIN_MODE_GAP,
        listLayout.rowWidth,
      );
    }

    const settingsVisible = ['create', 'settings'].includes(this.selectedTabId);
    this.settingsPane.root.visible = settingsVisible;
    this.settingsPane.root.renderable = settingsVisible;
    if (settingsVisible) {
      const settingsWidth = Math.min(318, this.sourceWidth - PAGE_EDGE * 2);
      this.settingsPane.setBounds(
        (this.sourceWidth - settingsWidth) / 2,
        PAGE_CONTENT_TOP,
        settingsWidth,
        viewportHeight,
      );
    }

    this.redrawBackground();
  }

  layoutHome(viewportHeight) {
    const visible = this.selectedTabId === 'home';
    const identity = this.homeIdentitySection;
    const announcement = this.homeAnnouncement;
    const members = this.homeMembersSection;
    identity.root.visible = visible;
    identity.root.renderable = visible;
    announcement.root.visible = visible;
    announcement.root.renderable = visible;
    members.root.visible = visible;
    members.root.renderable = visible;
    if (!visible) return;

    const paperOutsets = resolveDialogPaperOutsets({
      top: PIXI_UI_GEOMETRY.dialogPadding,
      right: PIXI_UI_GEOMETRY.dialogPadding,
      bottom: PIXI_UI_GEOMETRY.dialogPadding,
      left: PIXI_UI_GEOMETRY.dialogPadding,
    });
    const homeContentWidth = Math.max(
      0,
      Math.min(
        MAX_HOME_CONTENT_WIDTH,
        this.sourceWidth -
          PAGE_EDGE * 2 -
          paperOutsets.left -
          paperOutsets.right,
      ),
    );
    const rootX = (this.sourceWidth - homeContentWidth) / 2;
    const paperTop = SECTION_FRAME_TOP - paperOutsets.top;
    const homeContentTop = PAGE_CONTENT_TOP + HOME_CONTENT_OFFSET_Y;
    identity.root.position.set(
      rootX,
      homeContentTop + HOME_IDENTITY_OFFSET_Y,
    );
    setDialogPaperSectionBounds(
      identity.paper,
      {
        x: 0,
        y: SECTION_FRAME_TOP,
        width: homeContentWidth,
        height: HOME_IDENTITY_CONTENT_HEIGHT,
      },
      paperOutsets,
    );
    this.homeFlag.setSize(HOME_FLAG_SIZE, HOME_FLAG_SIZE);
    const homeFlagX = (homeContentWidth - HOME_FLAG_SIZE) / 2;
    this.homeFlag.position.set(homeFlagX, SECTION_CONTENT_TOP + 1);
    this.homeName.position.set(HOME_CONTENT_INSET, SECTION_CONTENT_TOP + 24);
    fitTextToWidth(
      this.homeName,
      Math.max(0, homeFlagX - HOME_CONTENT_INSET - 6),
    );
    this.homeTag.position.set(HOME_CONTENT_INSET, SECTION_CONTENT_TOP + 51);
    const statWidth = HOME_STAT_SOURCE_WIDTH * HOME_STAT_SCALE;
    const statX = homeContentWidth - HOME_CONTENT_INSET - statWidth;
    this.homeMemberStat.position.set(statX, SECTION_CONTENT_TOP + 20);
    this.homeIncomeStat.position.set(statX, SECTION_CONTENT_TOP + 51);
    this.homeLeaveButton.position.set(
      HOME_CONTENT_INSET,
      SECTION_CONTENT_TOP + 74,
    );

    const identityBottom = identity.paper.y + identity.paper.frameHeight;
    const announcementY = identityBottom + SECTION_GAP - paperTop;
    announcement.root.position.set(rootX, homeContentTop + announcementY);
    announcement.titleRibbon.setMaxWidth(
      Math.min(
        PIXI_ROOT_RUN_GEOMETRY.workshopRequestTitleRibbon.width,
        homeContentWidth - HOME_CONTENT_INSET * 2,
      ),
    );
    announcement.titleRibbon.root.scale.set(
      HOME_ANNOUNCEMENT_TITLE_SCALE,
    );
    const announcementTitleWidth =
      announcement.titleRibbon.width * HOME_ANNOUNCEMENT_TITLE_SCALE;
    const announcementTitleHeight =
      announcement.titleRibbon.height * HOME_ANNOUNCEMENT_TITLE_SCALE;
    announcement.titleRibbon.root.position.set(
      (homeContentWidth - announcementTitleWidth) / 2,
      SECTION_FRAME_TOP - announcementTitleHeight / 2,
    );
    announcement.detail.anchor.set(
      0.5,
      announcement.empty ? 0.5 : 0,
    );
    announcement.detail.position.set(
      homeContentWidth / 2,
      announcement.empty
        ? SECTION_FRAME_TOP + HOME_ANNOUNCEMENT_CONTENT_HEIGHT / 2
        : SECTION_FRAME_TOP + announcementTitleHeight / 2 + 4,
    );
    announcement.detail.style.align = 'center';
    announcement.detail.style.wordWrap = true;
    announcement.detail.style.wordWrapWidth = Math.max(
      0,
      homeContentWidth - HOME_CONTENT_INSET * 2,
    );
    setDialogPaperSectionBounds(
      announcement.paper,
      {
        x: 0,
        y: SECTION_FRAME_TOP,
        width: homeContentWidth,
        height: HOME_ANNOUNCEMENT_CONTENT_HEIGHT,
      },
      paperOutsets,
    );

    const announcementBottom =
      announcement.paper.y + announcement.paper.frameHeight;
    const membersY =
      announcementY + announcementBottom + SECTION_GAP - paperTop;
    members.root.position.set(rootX, homeContentTop + membersY);
    members.title.visible = false;
    members.title.renderable = false;
    members.count.visible = false;
    members.count.renderable = false;
    const remainingHeight = Math.max(90, viewportHeight - membersY);
    const membersContentHeight = Math.max(
      70,
      remainingHeight - SECTION_FRAME_TOP - paperOutsets.bottom,
    );
    const listLayout = resolveRetainedDialogListLayout({
      bodyWidth: homeContentWidth,
      paperRight: homeContentWidth + 14 / 3,
      rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
    });
    members.scroll.setBounds(
      listLayout.x,
      SECTION_CONTENT_TOP,
      listLayout.viewportWidth,
      Math.max(
        MEMBER_ROW_HEIGHT,
        membersContentHeight -
          (SECTION_CONTENT_TOP - SECTION_FRAME_TOP) -
          SECTION_CONTENT_BOTTOM,
      ),
    );
    let memberY = 0;
    for (const row of this.homeMemberRows.rows.getWidgets()) {
      const rowHeight = row.getPreferredHeight();
      row.setBounds(0, memberY, listLayout.rowWidth, rowHeight);
      memberY += rowHeight;
    }
    members.scroll.setContentHeight(memberY);
    members.scroll.scrollbarTrack.x =
      RETAINED_DIALOG_SCROLL_GEOMETRY.scrollbarShiftRight;
    members.scroll.scrollbarThumb.x =
      RETAINED_DIALOG_SCROLL_GEOMETRY.scrollbarShiftRight;
    setDialogPaperSectionBounds(
      members.paper,
      {
        x: 0,
        y: SECTION_FRAME_TOP,
        width: homeContentWidth,
        height: membersContentHeight,
      },
      paperOutsets,
    );
  }

  layoutCollection(
    collection,
    tabId,
    width,
    viewportHeight,
    {
      rowInsetX = 0,
      topInset = 6,
      viewportWidth: authoredViewportWidth = null,
      viewportX: authoredViewportX = null,
    } = {},
  ) {
    const scroll = this.scrolls.get(tabId);
    const viewportWidth = Number.isFinite(authoredViewportWidth)
      ? Math.max(0, authoredViewportWidth)
      : Math.min(this.sourceWidth - PAGE_EDGE * 2, width + 2);
    const viewportX = Number.isFinite(authoredViewportX)
      ? authoredViewportX
      : (this.sourceWidth - viewportWidth) / 2;
    scroll.setBounds(
      viewportX,
      PAGE_CONTENT_TOP,
      viewportWidth,
      viewportHeight,
    );
    const widgets = collection.rows.getWidgets();
    let y = topInset;
    const rowGap = tabId === 'quests' ? 5 : ROW_GAP;
    for (const widget of widgets) {
      const height = widget.getPreferredHeight?.(width) ?? 62;
      widget.setBounds(rowInsetX, y, width, height);
      y += height + rowGap;
    }
    const label = this.emptyLabels.get(tabId);
    const emptyText = resolveEmptyLabel(tabId, this.model);
    setText(label, widgets.length === 0 ? emptyText : '');
    label.visible = widgets.length === 0;
    label.renderable = label.visible;
    label.position.set(
      rowInsetX + width / 2,
      topInset + Math.max(0, viewportHeight - topInset) / 2,
    );
    scroll.setContentHeight(Math.max(viewportHeight, y + 6));
  }

  registerTarget(descriptor) {
    const semanticId = descriptor?.semanticId;
    if (!semanticId || !this.semanticRegistry) return false;
    this.unregisterTarget(semanticId);
    this.semanticRegistry.register(descriptor);
    this.registeredTargetIds.add(semanticId);
    return true;
  }

  unregisterTarget(semanticId) {
    if (!this.registeredTargetIds.delete(semanticId)) return false;
    return this.semanticRegistry?.unregister?.(semanticId) ?? false;
  }

  rebuildBackgroundGradient() {
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = createPixiPageBackgroundGradient(
      'alliance',
      this.theme,
    );
  }

  redrawBackground() {
    drawPixiPageBackground(this.background, {
      pageId: 'alliance',
      theme: this.theme,
      width: this.sourceWidth,
      height: this.sourceHeight,
      background: this.backgroundGradient ?? this.theme.surface,
    });
  }

  onDestroy() {
    for (const collection of [
      this.homeMemberRows,
      this.directory,
      this.quests,
      this.requests,
    ]) {
      collection.rows.destroy();
      collection.pool.destroy();
    }
    this.homeLeaveButton.destroy();
    this.homeMembersSection.scroll.destroy();
    this.requestJoinModePane.destroy();
    this.settingsPane.destroy();
    for (const scroll of this.scrolls.values()) scroll.destroy();
    for (const semanticId of this.registeredTargetIds) {
      this.semanticRegistry?.unregister?.(semanticId);
    }
    this.registeredTargetIds.clear();
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = null;
  }
}

function createHomePaperSection(host, sectionId) {
  const root = new Container({
    label: `alliance:home:${sectionId}-section`,
  });
  const paper = createDialogPaperSection(
    host.panel.paperFrame.texture,
    `${root.label}:paper`,
  );
  root.addChild(paper);
  root.visible = false;
  root.renderable = false;
  return { root, paper };
}

function createHomeAnnouncementSection(host) {
  const section = createHomePaperSection(host, 'announcement');
  const titleRibbon = new MarketTitleRibbon({
    assetManager: host.assetManager,
    assetId: PIXI_ROOT_RUN_ASSETS.workshopRequestTitleRibbon,
    geometry: PIXI_ROOT_RUN_GEOMETRY.workshopRequestTitleRibbon,
    label: 'alliance:home:announcement-title-ribbon',
    showStars: false,
  });
  titleRibbon.root.eventMode = 'none';
  titleRibbon.bind(HOME_ANNOUNCEMENT_TITLE);
  const detail = createText('', {
    ...RETAINED_TEXT_STYLES.tiny,
  });
  section.root.addChild(detail, titleRibbon.root);
  return { ...section, detail, empty: true, titleRibbon };
}

function resolveAllianceIdentity(info = {}) {
  const name = String(info.name ?? '').trim();
  const tag = String(info.tag ?? '').trim().toUpperCase();
  if (name || tag) {
    return { name: name || 'Trade Alliance', tag };
  }
  const identityLabel = String(info.identityLabel ?? '').trim();
  const match = identityLabel.match(/^\[([^\]]+)]\s*(.*)$/);
  return match
    ? {
        name: match[2].trim() || 'Trade Alliance',
        tag: match[1].trim().toUpperCase(),
      }
    : { name: identityLabel || 'Trade Alliance', tag: '' };
}

function fitTextToWidth(text, maximumWidth) {
  text.scale.set(1);
  const width = Math.max(0, Number(text.width) || 0);
  if (width > maximumWidth) {
    const scale = maximumWidth / width;
    text.scale.set(scale);
  }
}

function findTradeInfoRow(rows, ...needles) {
  const normalizedNeedles = needles.map((needle) =>
    String(needle).toLowerCase(),
  );
  return rows.find((row) => {
    const haystack = `${row?.id ?? ''} ${row?.label ?? ''}`.toLowerCase();
    return normalizedNeedles.some((needle) => haystack.includes(needle));
  });
}

function normalizeAllianceModel(viewModel = {}) {
  const model = viewModel.alliance ?? viewModel;
  const selectedTabId = PAGE_TABS.includes(model.selectedTabId)
    ? model.selectedTabId
    : model.ownedAlliance
      ? 'home'
      : 'browse';
  return {
    ...model,
    selectedTabId,
    tradeInfo: model.tradeInfo ?? {},
    tradeInfoRows: Array.isArray(model.tradeInfoRows)
      ? model.tradeInfoRows
      : [],
    members: Array.isArray(model.members) ? model.members : [],
    directoryRows:
      model.directory === true && Array.isArray(model.rows) ? model.rows : [],
    questRows:
      selectedTabId === 'quests' && Array.isArray(model.rows) ? model.rows : [],
    requestRows:
      selectedTabId === 'requests' && Array.isArray(model.rows)
        ? model.rows
        : [],
    requestsSettings: model.requestsSettings ?? null,
    settings: model.settings ?? null,
  };
}

function createAllianceHomeRosterRows(members = []) {
  const safeMembers = Array.isArray(members) ? members : [];
  return TRADE_ALLIANCE_ROLES.flatMap((role) => {
    const roleMembers = safeMembers.filter(
      (member) => String(member?.role ?? 'trader') === role.id,
    );
    const roleCountLabel = `${roleMembers.length}/${role.maxMembers}`;

    if (roleMembers.length === 0) {
      return [
        {
          id: `alliance-role-section:${role.id}`,
          role: role.id,
          roleLabel: role.label,
          roleCountLabel,
          sectionOnly: true,
          showRankHeader: true,
        },
      ];
    }

    return roleMembers.map((member, index) => ({
      ...member,
      showRankHeader: index === 0,
      roleCountLabel: index === 0 ? roleCountLabel : '',
    }));
  });
}

class AllianceJoinModePane {
  constructor({ host }) {
    this.model = null;
    this.allianceId = '';
    this.projectedJoinMode = null;
    this.draftJoinMode = 'apply';
    this.dirty = false;
    this.saving = false;
    this.statusText = '';
    this.visible = false;
    this.root = new Container({ label: 'alliance:requests:join-mode' });
    this.label = createText('Join Mode', RETAINED_TEXT_STYLES.bold);
    this.buttons = ['open', 'apply', 'closed'].map(
      (joinMode) =>
        new RetainedButton({
          assetManager: host.assetManager,
          buttonLabel: `alliance-requests-join-mode-${joinMode}`,
          inputRouter: host.inputRouter,
          variant: 'tab',
        }),
    );
    this.saveButton = new RetainedButton({
      assetManager: host.assetManager,
      buttonLabel: 'alliance-requests-save-join-mode',
      inputRouter: host.inputRouter,
      sizeTier: 30,
      variant: 'green',
    });
    this.status = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.status.anchor.set(1, 0);
    this.root.addChild(
      this.label,
      ...this.buttons.map((button) => button.root),
      this.saveButton.root,
      this.status,
    );
  }

  bind(model) {
    this.model = model ?? null;
    this.visible = Boolean(this.model?.editable);
    this.root.visible = this.visible;
    this.root.renderable = this.visible;
    if (!this.visible) {
      return;
    }

    const allianceId = String(this.model.allianceId ?? '');
    const projectedJoinMode = normalizeJoinMode(this.model.joinMode);
    const allianceChanged = allianceId !== this.allianceId;
    const projectionChanged = projectedJoinMode !== this.projectedJoinMode;
    if (allianceChanged || (!this.dirty && projectionChanged)) {
      this.allianceId = allianceId;
      this.draftJoinMode = projectedJoinMode;
      this.dirty = false;
      if (allianceChanged) {
        this.statusText = '';
      }
    }
    this.projectedJoinMode = projectedJoinMode;

    this.buttons.forEach((button, index) => {
      const joinMode = ['open', 'apply', 'closed'][index];
      button.setModel({
        label: joinMode[0].toUpperCase() + joinMode.slice(1),
        selected: this.draftJoinMode === joinMode,
        enabled: !this.saving,
        action: () => this.select(joinMode),
      });
    });
    this.saveButton.setModel({
      label: this.saving ? 'Saving' : 'Save Changes',
      enabled: this.dirty && !this.saving,
      action: () => this.save(),
    });
    setText(this.status, this.statusText);
  }

  select(joinMode) {
    if (!this.visible || this.saving) {
      return false;
    }
    const nextJoinMode = normalizeJoinMode(joinMode);
    this.draftJoinMode = nextJoinMode;
    this.dirty = nextJoinMode !== this.projectedJoinMode;
    this.statusText = this.dirty ? 'Change Pending' : '';
    this.bind(this.model);
    return true;
  }

  async save() {
    if (!this.visible || !this.dirty || this.saving) {
      return false;
    }
    this.saving = true;
    this.statusText = 'Saving';
    this.bind(this.model);
    let result;
    try {
      result = await this.model.onSave?.(this.draftJoinMode);
    } catch {
      result = { ok: false };
    }
    this.saving = false;
    if (result?.ok === true) {
      this.dirty = false;
      this.statusText = 'Saved';
    } else {
      this.statusText = 'Not Saved';
    }
    this.bind(this.model);
    return result?.ok === true;
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.label.position.set(0, 0);
    const gap = 6;
    const buttonWidth = (width - gap * 2) / 3;
    this.buttons.forEach((button, index) => {
      button.setBounds(index * (buttonWidth + gap), 18, buttonWidth, 28);
    });
    this.saveButton.setBounds(0, 54, width, 28);
    this.status.position.set(width, 84);
  }

  applyTheme(theme) {
    const resolvedTheme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    applyTextTheme(this.label, resolvedTheme, RETAINED_TEXT_STYLES.bold);
    applyTextTheme(this.status, resolvedTheme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: resolvedTheme.muted,
    });
    this.buttons.forEach((button) => button.applyTheme(resolvedTheme));
    this.saveButton.applyTheme(resolvedTheme);
  }

  destroy() {
    this.buttons.forEach((button) => button.destroy());
    this.saveButton.destroy();
    this.root.destroy({ children: true });
  }
}

function normalizeJoinMode(joinMode) {
  return ['open', 'apply', 'closed'].includes(joinMode) ? joinMode : 'apply';
}

function resolveEmptyLabel(tabId, model) {
  if (tabId === 'browse') return model.status || 'No Alliances Yet';
  if (tabId === 'quests') return 'No Alliance Quests';
  if (tabId === 'requests') return 'No Pending Requests';
  return '';
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
