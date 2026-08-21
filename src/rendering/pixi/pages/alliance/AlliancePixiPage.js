import { Container, Graphics, Texture } from 'pixi.js';

import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { createDialogContentTheme } from '../../primitives/PixiDialogFrame.js';
import { AllianceFlagWidget } from '../../primitives/AllianceFlagWidget.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  createPixiPageBackgroundGradient,
  drawPixiPageBackground,
} from '../../theme/PixiPageBackground.js';
import { PlayerRelationshipRowPixi } from '../../global/dialogs/PlayerRelationshipRowPixi.js';
import { GuildRowsSection } from '../guild/GuildPageWidgets.js';
import {
  AllianceDirectoryRow,
  AllianceQuestRow,
  AllianceSettingsPane,
  WorldChatMessageRowPixi,
} from '../workshop/WorkshopDialogPixi.js';
import {
  RETAINED_TEXT_STYLES,
  RetainedScrollArea,
  applyTextTheme,
  createText,
  setText,
} from '../workshop/RetainedPageKit.js';

const PAGE_TABS = Object.freeze([
  'browse',
  'create',
  'home',
  'quests',
  'requests',
  'chat',
  'settings',
]);
const PAGE_EDGE = PIXI_UI_GEOMETRY.roomContentEdge;
const PAGE_TOP = PIXI_UI_GEOMETRY.roomContentTop;
const PAGE_BOTTOM_CLEARANCE = PIXI_UI_GEOMETRY.roomChatBottom;
const CONTENT_GAP = 12;
const ROW_GAP = 4;
const CHAT_COMPOSER_HEIGHT = 36;
const CHAT_ACTION_WIDTH = 72;

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
    this.contentLayer = new Container({ label: 'alliance:content' });
    this.scrolls = new Map(
      PAGE_TABS.filter((tabId) => !['create', 'settings'].includes(tabId)).map(
        (tabId) => [
          tabId,
          new RetainedScrollArea({
            inputRouter,
            label: `alliance:${tabId}:scroll`,
          }),
        ],
      ),
    );
    this.contentLayer.addChild(...[...this.scrolls.values()].map((scroll) => scroll.root));

    this.paperHost = this.createRowHost({ paper: true });
    this.chatHost = this.createRowHost({ paper: false });

    this.homeHeader = new Container({ label: 'alliance:home:identity' });
    this.homeFlag = new AllianceFlagWidget({
      assetManager,
      label: 'alliance:home:flag',
    });
    this.homeIdentity = createText('', RETAINED_TEXT_STYLES.bold);
    this.homeDescription = createText('', RETAINED_TEXT_STYLES.body);
    this.homeNotice = createText('', RETAINED_TEXT_STYLES.border);
    this.homeHeader.addChild(
      this.homeFlag,
      this.homeIdentity,
      this.homeDescription,
      this.homeNotice,
    );
    this.homeSummary = new GuildRowsSection({
      title: 'Trade Summary',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      label: 'alliance:home:summary',
      joined: true,
    });
    this.homeMembers = new GuildRowsSection({
      title: 'Members',
      assetManager,
      inputRouter,
      semanticRegistry,
      counters,
      label: 'alliance:home:members',
    });
    this.scrolls.get('home').content.addChild(
      this.homeHeader,
      this.homeSummary.root,
      this.homeMembers.root,
    );

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
      host: this.chatHost,
      RowClass: PlayerRelationshipRowPixi,
      scrollId: 'requests',
    });
    this.chatRows = this.createCollection({
      counters,
      id: 'chat',
      host: this.chatHost,
      RowClass: WorldChatMessageRowPixi,
      scrollId: 'chat',
    });

    this.emptyLabels = new Map(
      ['browse', 'quests', 'requests', 'chat'].map((tabId) => {
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

    this.chatComposer = new Container({ label: 'alliance:chat:composer' });
    this.chatField = new PixiTextField({
      assetManager,
      inputRouter,
      textEntryService,
      maxLength: 160,
      label: 'alliance:chat:field',
      onChange: () => this.syncChatAction(),
      onSubmit: () => void this.submitChat(),
    });
    this.chatSend = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'alliance.chat.send',
      text: 'Send',
      width: CHAT_ACTION_WIDTH,
      height: 29,
      variant: 'yellow',
      action: () => this.submitChat(),
      label: 'alliance:chat:send',
    });
    this.chatComposer.addChild(this.chatField, this.chatSend);
    this.contentLayer.addChild(this.chatComposer);

    this.root.addChild(this.background, this.contentLayer);
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

  createCollection({ counters, id, host, RowClass, scrollId }) {
    const layer = new Container({ label: `alliance:${id}:rows` });
    this.scrolls.get(scrollId).content.addChild(layer);
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
        for (const widget of widgets) layer.addChild(widget.root);
      },
    });
    return { layer, pool, rows };
  }

  onBind(viewModel = {}) {
    this.model = normalizeAllianceModel(viewModel);
    this.selectedTabId = this.model.selectedTabId;
    this.paperHost.theme = this.theme;
    this.paperHost.contentTheme = createDialogContentTheme(this.theme);
    this.chatHost.theme = this.theme;
    this.chatHost.contentTheme = this.theme;

    const info = this.model.tradeInfo ?? {};
    setText(this.homeIdentity, info.identityLabel ?? 'Trade Alliance');
    setText(this.homeDescription, info.description ?? '');
    setText(this.homeNotice, info.notice ?? '');
    this.homeFlag.setColors(this.model.flag ?? {});
    this.homeSummary.bind({
      rows: this.model.tradeInfoRows.map((row) =>
        row.actionLabel
          ? {
              id: row.id,
              kind: 'button',
              label: row.actionLabel,
              value: row.value,
              enabled: row.enabled,
              semanticId: row.semanticId,
              action: row.onActivate,
            }
          : {
              id: row.id,
              label: row.label,
              value: row.value,
            },
      ),
    });
    this.homeMembers.bind({
      countLabel: info.memberCountLabel,
      emptyLabel: 'No Alliance Members',
      rows: this.model.members.map((member) => ({
        id: member.id,
        label: member.username,
        value: `${member.roleLabel} · ${member.levelLabel}`,
        semanticId: member.semanticId,
        action: member.onActivate,
      })),
    });

    this.directory.rows.reconcile(this.model.directoryRows);
    this.quests.rows.reconcile(this.model.questRows);
    this.requests.rows.reconcile(this.model.requestRows);
    this.chatRows.rows.reconcile(this.model.chat.rows);
    this.settingsPane.bind(this.model.settings);
    this.chatField.setValue('');
    this.syncChatAction();
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
    this.chatHost.theme = this.theme;
    this.chatHost.contentTheme = this.theme;
    this.homeSummary.applyTheme(this.theme);
    this.homeMembers.applyTheme(this.theme);
    applyTextTheme(this.homeIdentity, this.theme, RETAINED_TEXT_STYLES.bold);
    applyTextTheme(this.homeDescription, this.theme, RETAINED_TEXT_STYLES.body);
    applyTextTheme(this.homeNotice, this.theme, {
      ...RETAINED_TEXT_STYLES.border,
      fill: this.theme.muted,
    });
    for (const collection of [
      this.directory,
      this.quests,
      this.requests,
      this.chatRows,
    ]) {
      for (const row of collection.rows.getWidgets()) row.applyTheme?.(
        collection === this.chatRows || collection === this.requests
          ? this.theme
          : this.paperHost.contentTheme,
      );
    }
    for (const label of this.emptyLabels.values()) {
      applyTextTheme(label, this.theme, RETAINED_TEXT_STYLES.body);
    }
    this.settingsPane.applyTheme(this.theme);
    this.chatField.applyTheme(this.theme);
    this.chatSend.applyTheme(this.theme);
    this.rebuildBackgroundGradient();
    this.redrawBackground();
  }

  relayout() {
    if (!this.background) return;
    const width = this.sourceWidth - PAGE_EDGE;
    const viewportHeight = Math.max(
      0,
      this.sourceHeight - PAGE_BOTTOM_CLEARANCE - PAGE_TOP,
    );
    const rowWidth = Math.max(0, width - PAGE_EDGE);
    for (const [tabId, scroll] of this.scrolls) {
      const chat = tabId === 'chat';
      scroll.root.visible = tabId === this.selectedTabId;
      scroll.root.renderable = scroll.root.visible;
      scroll.setBounds(
        0,
        PAGE_TOP,
        width,
        Math.max(0, viewportHeight - (chat ? CHAT_COMPOSER_HEIGHT : 0)),
      );
    }

    this.layoutHome(rowWidth, viewportHeight);
    this.layoutCollection(this.directory, 'browse', rowWidth, viewportHeight);
    this.layoutCollection(this.quests, 'quests', rowWidth, viewportHeight);
    this.layoutCollection(this.requests, 'requests', rowWidth, viewportHeight);
    this.layoutCollection(
      this.chatRows,
      'chat',
      rowWidth,
      Math.max(0, viewportHeight - CHAT_COMPOSER_HEIGHT),
    );

    const settingsVisible = ['create', 'settings'].includes(this.selectedTabId);
    this.settingsPane.root.visible = settingsVisible;
    this.settingsPane.root.renderable = settingsVisible;
    if (settingsVisible) {
      const settingsWidth = Math.min(318, this.sourceWidth - PAGE_EDGE * 2);
      this.settingsPane.setBounds(
        (this.sourceWidth - settingsWidth) / 2,
        PAGE_TOP,
        settingsWidth,
        viewportHeight,
      );
    }

    const chatVisible = this.selectedTabId === 'chat';
    this.chatComposer.visible = chatVisible;
    this.chatComposer.renderable = chatVisible;
    this.chatComposer.position.set(
      PAGE_EDGE,
      PAGE_TOP + viewportHeight - CHAT_COMPOSER_HEIGHT + 3,
    );
    const composerWidth = this.sourceWidth - PAGE_EDGE * 2;
    const fieldWidth = composerWidth - CHAT_ACTION_WIDTH - 6;
    this.chatField.position.set(0, 0);
    this.chatField.setSize(fieldWidth, 29);
    this.chatSend.position.set(fieldWidth + 6, 0);
    this.chatSend.setSize(CHAT_ACTION_WIDTH, 29);
    this.redrawBackground();
  }

  layoutHome(width, viewportHeight) {
    const scroll = this.scrolls.get('home');
    const headerHeight = 112;
    this.homeHeader.position.set(PAGE_EDGE, 6);
    this.homeFlag.position.set(0, 3);
    this.homeFlag.setSize(86, 100);
    const copyX = 100;
    this.homeIdentity.position.set(copyX, 8);
    this.homeDescription.position.set(copyX, 31);
    this.homeDescription.style.wordWrap = true;
    this.homeDescription.style.wordWrapWidth = Math.max(80, width - copyX);
    this.homeNotice.position.set(copyX, 72);
    this.homeNotice.style.wordWrap = true;
    this.homeNotice.style.wordWrapWidth = Math.max(80, width - copyX);
    const summaryY = headerHeight + CONTENT_GAP;
    const summaryHeight = this.homeSummary.getPreferredHeight(width);
    this.homeSummary.setBounds(0, summaryY, width, summaryHeight);
    const membersY = summaryY + summaryHeight + CONTENT_GAP;
    const membersHeight = this.homeMembers.getPreferredHeight(width);
    this.homeMembers.setBounds(0, membersY, width, membersHeight);
    scroll.setContentHeight(
      Math.max(viewportHeight, membersY + membersHeight + CONTENT_GAP),
    );
  }

  layoutCollection(collection, tabId, width, viewportHeight) {
    const scroll = this.scrolls.get(tabId);
    const widgets = collection.rows.getWidgets();
    let y = 6;
    for (const widget of widgets) {
      const height = widget.getPreferredHeight?.(width) ?? 62;
      widget.setBounds(0, y, width, height);
      y += height + ROW_GAP;
    }
    const label = this.emptyLabels.get(tabId);
    const emptyText = resolveEmptyLabel(tabId, this.model);
    setText(label, widgets.length === 0 ? emptyText : '');
    label.visible = widgets.length === 0;
    label.renderable = label.visible;
    label.position.set(width / 2, viewportHeight / 2);
    scroll.setContentHeight(Math.max(viewportHeight, y + 6));
  }

  syncChatAction() {
    const enabled =
      typeof this.model.chat.onSubmit === 'function' &&
      this.chatField.value.trim().length > 0;
    this.chatSend.setEnabled(enabled);
  }

  async submitChat() {
    const body = this.chatField.value.trim();
    if (!body || typeof this.model.chat.onSubmit !== 'function') return false;
    const result = await this.model.chat.onSubmit(body);
    if (result?.ok === true) this.chatField.setValue('');
    this.syncChatAction();
    return result?.ok === true;
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
      this.directory,
      this.quests,
      this.requests,
      this.chatRows,
    ]) {
      collection.rows.destroy();
      collection.pool.destroy();
    }
    this.homeSummary.destroy();
    this.homeMembers.destroy();
    this.settingsPane.destroy();
    this.chatField.destroy({ children: true });
    this.chatSend.destroy();
    for (const scroll of this.scrolls.values()) scroll.destroy();
    for (const semanticId of this.registeredTargetIds) {
      this.semanticRegistry?.unregister?.(semanticId);
    }
    this.registeredTargetIds.clear();
    this.backgroundGradient?.destroy?.();
    this.backgroundGradient = null;
  }
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
    tradeInfoRows: Array.isArray(model.tradeInfoRows) ? model.tradeInfoRows : [],
    members: Array.isArray(model.members) ? model.members : [],
    directoryRows: model.directory === true && Array.isArray(model.rows) ? model.rows : [],
    questRows: selectedTabId === 'quests' && Array.isArray(model.rows) ? model.rows : [],
    requestRows: selectedTabId === 'requests' && Array.isArray(model.rows) ? model.rows : [],
    flag: model.flag ?? {},
    settings: model.settings ?? null,
    chat: {
      rows: Array.isArray(model.chat?.rows) ? model.chat.rows : [],
      onSubmit: model.chat?.onSubmit ?? null,
    },
  };
}

function resolveEmptyLabel(tabId, model) {
  if (tabId === 'browse') return model.status || 'No Alliances Yet';
  if (tabId === 'quests') return 'No Alliance Quests';
  if (tabId === 'requests') return 'No Pending Requests';
  if (tabId === 'chat') return 'Start The Alliance Conversation';
  return '';
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
