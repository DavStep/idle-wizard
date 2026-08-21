import { Container } from 'pixi.js';

import { formatCoinAmount } from '../../../../shared/coinPrice.js';
import {
  AllianceFlagWidget,
  PixiTextButton,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  PIXI_DIALOG_FOOTER_TABS_GEOMETRY,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  createDialogPaperSection,
  resolveAdaptiveDialogHeight,
  resolveDialogFooterTabLayout,
  resolveDialogPaperOutsets,
  setDialogPaperSectionBounds,
} from '../../primitives/PixiDialogFrame.js';
import { PooledCollection, WidgetPool } from '../../retained/index.js';
import {
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  AllianceMemberRow,
  WorkshopDialogRow,
} from '../../pages/workshop/WorkshopDialogPixi.js';
import {
  RETAINED_DIALOG_LIST_GEOMETRY,
  RETAINED_TEXT_STYLES,
  RetainedScrollArea,
  applyTextTheme,
  createText,
  resolveRetainedDialogListLayout,
  setText,
} from '../../pages/workshop/RetainedPageKit.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  RetainedGlobalDialog,
} from './GlobalDialogKit.js';

const ALLIANCE_CONTENT_WIDTH = GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const ALLIANCE_CONTENT_HEIGHT = 430;
const ALLIANCE_MEMBER_ROW_HEIGHT = PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch;
const SECTION_GAP = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap;
const SECTION_CONTENT_TOP = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
const SECTION_CONTENT_BOTTOM = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
const ALLIANCE_INFO_FLAG_SIZE = 56;
const ALLIANCE_INFO_FLAG_GAP = 7;
const STATUS_HEIGHT = 16;
const JOIN_MODE_LABELS = Object.freeze({
  open: 'Open',
  apply: 'Apply',
  closed: 'Closed',
});
const ROLE_LABELS = Object.freeze({
  tradeMaster: 'Trade Master',
  quartermaster: 'Quartermaster',
  factor: 'Factor',
  broker: 'Broker',
  trader: 'Trader',
});
const ROLE_RANKS = Object.freeze({
  tradeMaster: 5,
  quartermaster: 4,
  factor: 3,
  broker: 2,
  trader: 1,
});

/**
 * Retained public alliance card that reuses the Trade Alliance Home
 * split-paper summary and member-row composition.
 */
export class PixiAllianceInfoDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.alliance' } = {}) {
    super({
      context,
      dialogId,
      title: 'Alliance',
      contentWidth: ALLIANCE_CONTENT_WIDTH,
      contentHeight: ALLIANCE_CONTENT_HEIGHT,
      placement: 'center',
      label: `${dialogId}:allianceInfoDialog`,
    });
    this.assetManager = this.context.assets;
    this.inputRouter = this.context.inputRouter;
    this.contentTheme = this.panel.getContentTheme?.() ?? this.theme;
    this.isBagDialog = false;
    this.registeredTargetIds = new Set();
    this.statusText = '';
    this.actionPending = false;

    this.summarySection = new Container({ label: `${dialogId}:tradeInfoSection` });
    this.summaryPaper = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${dialogId}:tradeInfoPaper`,
    );
    this.allianceFlag = new AllianceFlagWidget({
      assetManager: this.assetManager,
      label: `${dialogId}:allianceFlag`,
    });
    this.identityLabel = createText('', RETAINED_TEXT_STYLES.bold);
    this.detailLabel = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      lineHeight: 14,
      wordWrapWidth: ALLIANCE_CONTENT_WIDTH,
    });
    this.summaryRowsLayer = new Container({ label: `${dialogId}:tradeInfoRows` });
    this.summarySection.addChild(
      this.summaryPaper,
      this.allianceFlag,
      this.identityLabel,
      this.detailLabel,
      this.summaryRowsLayer,
    );

    this.membersSection = new Container({ label: `${dialogId}:membersSection` });
    this.membersPaper = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${dialogId}:membersPaper`,
    );
    this.membersScroll = new RetainedScrollArea({
      inputRouter: this.inputRouter,
      label: `${dialogId}:membersScroll`,
    });
    this.membersSection.addChild(this.membersPaper, this.membersScroll.root);

    this.summaryRowPool = new WidgetPool({
      name: `${dialogId} summary row pool`,
      counters: this.context.counters,
      create: () => new WorkshopDialogRow({ dialog: this }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 3,
    });
    this.summaryRows = new PooledCollection({
      name: `${dialogId} summary rows`,
      pool: this.summaryRowPool,
      counters: this.context.counters,
      keyOf: (row, index) => row.id ?? index,
      bind: (widget, row) => widget.bind(row),
      afterReconcile: (widgets) => this.orderSummaryRows(widgets),
    });
    this.memberRowPool = new WidgetPool({
      name: `${dialogId} member row pool`,
      counters: this.context.counters,
      create: () => new AllianceMemberRow({ dialog: this }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 50,
    });
    this.memberRows = new PooledCollection({
      name: `${dialogId} member rows`,
      pool: this.memberRowPool,
      counters: this.context.counters,
      keyOf: (member, index) =>
        `member:${member.memberIdentity || member.username || index}`,
      bind: (widget, member) => widget.bind(member),
      afterReconcile: (widgets) => this.orderMemberRows(widgets),
    });
    this.rows = { collection: this.memberRows };

    this.primaryAction = new PixiTextButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.join`,
      text: 'Apply',
      width: ALLIANCE_CONTENT_WIDTH,
      height: PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      color: 'green',
      sizeTier: 50,
      action: () => this.runPrimaryAction(),
      label: `${dialogId}:action`,
    });
    this.statusLabel = new PixiTextLabel({
      color: 'muted',
      label: `${dialogId}:status`,
    });

    this.panel.setPaperVisible(false);
    this.panel.content.addChild(
      this.summarySection,
      this.membersSection,
      this.statusLabel,
    );
    this.panel.addChild(this.primaryAction);
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel) {
    this.allianceModel = normalizeAllianceModel(viewModel);
    this.panel.setTitle(this.allianceModel.title);
    this.statusText = String(viewModel.status ?? '');
    setText(this.identityLabel, this.allianceModel.title);
    this.allianceFlag.setColors({
      bannerColor: this.allianceModel.bannerColor,
      emblemColor: this.allianceModel.emblemColor,
      emblemId: this.allianceModel.emblemId,
    });
    this.allianceFlag.visible = !this.allianceModel.loading;
    this.allianceFlag.renderable = this.allianceFlag.visible;
    setText(
      this.detailLabel,
      [this.allianceModel.description, this.allianceModel.notice]
        .filter(Boolean)
        .join('\n'),
    );

    const action = this.allianceModel.action;
    const showAction = Boolean(action);
    this.primaryAction.visible = showAction;
    this.primaryAction.renderable = showAction;
    this.primaryAction
      .setColor(action?.kind === 'pending' ? 'gray' : 'green')
      .setText(this.actionPending ? '...' : action?.label ?? '')
      .setEnabled(showAction && !this.actionPending && action.enabled !== false);

    this.summaryRows.reconcile(this.createSummaryRows());
    this.memberRows.reconcile(this.createMemberRows());
    this.updateStatusLabel();
    this.layoutDialog();
  }

  createSummaryRows() {
    if (this.allianceModel.loading) {
      return [];
    }
    return [
      {
        id: 'trade-info:members',
        label: 'Members',
        value: `${this.allianceModel.memberCount}/50`,
      },
      {
        id: 'trade-info:join-mode',
        label: 'Join Mode',
        value:
          JOIN_MODE_LABELS[this.allianceModel.joinMode] ??
          titleCaseLabel(this.allianceModel.joinMode),
      },
      {
        id: 'trade-info:season-income',
        label: 'Season Income',
        value: this.allianceModel.seasonIncome,
        itemKind: 'resource',
        itemKey: 'coin',
        resourceKey: 'coin',
      },
    ];
  }

  createMemberRows() {
    if (this.allianceModel.loading) {
      return [];
    }
    return this.allianceModel.members.map((member, index) => ({
      ...member,
      semanticId: `${this.dialogId}.member.${member.memberIdentity || index}`,
      onActivate: () => this.openPlayer(member),
    }));
  }

  openPlayer(member) {
    return (
      this.actions.openPlayer?.(member) ??
      this.model.onOpenPlayer?.(member) ??
      false
    );
  }

  async runPrimaryAction() {
    const action = this.allianceModel.action;
    if (!action || action.enabled === false || this.actionPending) {
      return false;
    }
    const handler =
      action.kind === 'join'
        ? this.actions.joinAlliance ?? this.model.onJoin
        : this.actions.applyAlliance ?? this.model.onApply;
    if (!handler) {
      return false;
    }
    this.actionPending = true;
    this.primaryAction.setText('...').setEnabled(false);
    this.setStatus('Saving');
    let result;
    try {
      result = await handler(this.allianceModel.allianceId, this.allianceModel);
    } catch {
      result = { ok: false, reason: 'offline' };
    }
    this.actionPending = false;
    const failed = result?.ok === false || result === false;
    if (!failed && action.kind === 'apply') {
      this.allianceModel.action = {
        kind: 'pending',
        label: 'Pending',
        enabled: false,
      };
      this.primaryAction
        .setColor('gray')
        .setText('Pending')
        .setEnabled(false);
    } else {
      this.primaryAction
        .setColor('green')
        .setText(action.label)
        .setEnabled(action.enabled !== false);
    }
    this.setStatus(failed ? formatFailure(result?.reason) : '');
    return result ?? true;
  }

  setStatus(status) {
    this.statusText = String(status ?? '');
    this.updateStatusLabel();
    this.layoutDialog();
  }

  updateStatusLabel() {
    const status =
      this.statusText ||
      (this.allianceModel.loading
        ? this.allianceModel.connected
          ? 'Loading Alliance'
          : 'Offline'
        : this.allianceModel.members.length === 0
          ? 'No Members'
          : '');
    this.statusLabel.setText(status);
    this.statusLabel.visible = Boolean(status);
    this.statusLabel.renderable = this.statusLabel.visible;
  }

  orderSummaryRows(widgets = this.summaryRows?.getWidgets?.() ?? []) {
    if (!this.summaryRowsLayer) {
      return 0;
    }
    this.summaryRowsLayer.removeChildren();
    let y = 0;
    for (const widget of widgets) {
      const rowHeight = widget.getPreferredHeight();
      this.summaryRowsLayer.addChild(widget.root);
      widget.setBounds(0, y, ALLIANCE_CONTENT_WIDTH, rowHeight);
      y += rowHeight;
    }
    this.summaryRowsHeight = y;
    return y;
  }

  orderMemberRows(widgets = this.memberRows?.getWidgets?.() ?? []) {
    if (!this.membersScroll) {
      return;
    }
    this.membersScroll.content.removeChildren();
    const listLayout = this.memberListLayout ?? resolveAllianceMemberListLayout();
    let y = 0;
    for (const widget of widgets) {
      const rowHeight = widget.getPreferredHeight();
      this.membersScroll.content.addChild(widget.root);
      widget.setBounds(0, y, listLayout.rowWidth, rowHeight);
      y += rowHeight;
    }
    this.membersScroll.setContentHeight(y);
  }

  layoutCloseControl() {
    if (!this.closeControl || !this.panel) {
      return;
    }
    const width = Math.max(32, Math.ceil(this.closeControl.textWidth + 8));
    this.closeControl.setBounds(
      this.panel.outerWidth - PIXI_UI_GEOMETRY.dialogPadding - width,
      this.panel.outerHeight - PIXI_UI_GEOMETRY.borderLabelLineHeight / 2,
      width,
      PIXI_UI_GEOMETRY.borderLabelLineHeight,
    );
  }

  layoutDialog(projection = this.viewportProjection) {
    if (!this.summaryRows || !this.memberRows || !this.allianceModel) {
      return;
    }
    const contentHeight = resolveAdaptiveDialogHeight({
      viewportHeight: projection?.sourceHeight,
      baseHeight: ALLIANCE_CONTENT_HEIGHT,
      minimumHeight: 240,
      maximumHeight: Math.max(240, (projection?.sourceHeight ?? 844) - 200),
      hasPrimaryVerticalScroll: true,
    });
    this.setPanelContentSize(ALLIANCE_CONTENT_WIDTH, contentHeight);
    this.panel.setPaperVisible(false);

    const footerLayout = this.primaryAction.visible
      ? resolveDialogFooterTabLayout({
          coreWidth: this.panel.coreWidth,
          coreHeight: this.panel.coreHeight,
          tabCount: 1,
        })
      : null;
    const paperBottom = footerLayout?.paperBottom ?? this.panel.coreHeight;
    const contentBottom = paperBottom - this.panel.content.y;
    const paperOutsets = resolveDialogPaperOutsets({
      top: PIXI_UI_GEOMETRY.dialogPadding,
      right: PIXI_UI_GEOMETRY.dialogPadding,
      bottom: PIXI_UI_GEOMETRY.dialogPadding,
      left: PIXI_UI_GEOMETRY.dialogPadding,
    });

    this.summarySection.position.set(0, 0);
    this.allianceFlag.setSize(ALLIANCE_INFO_FLAG_SIZE, ALLIANCE_INFO_FLAG_SIZE);
    this.allianceFlag.position.set(0, SECTION_CONTENT_TOP);
    const identityX = this.allianceFlag.visible
      ? this.allianceFlag.flagWidth + ALLIANCE_INFO_FLAG_GAP
      : 0;
    this.identityLabel.position.set(identityX, SECTION_CONTENT_TOP);
    const detailY = this.identityLabel.y + Math.ceil(this.identityLabel.height) + 2;
    this.detailLabel.position.set(identityX, detailY);
    this.detailLabel.style.wordWrap = true;
    this.detailLabel.style.wordWrapWidth = ALLIANCE_CONTENT_WIDTH - identityX;
    const textBottom =
      detailY +
      (this.detailLabel.text ? Math.ceil(this.detailLabel.height) : 0);
    const flagBottom = this.allianceFlag.visible
      ? this.allianceFlag.y + this.allianceFlag.flagHeight
      : SECTION_CONTENT_TOP;
    const rowsY = Math.max(textBottom, flagBottom) + 4;
    this.summaryRowsLayer.position.set(0, rowsY);
    this.orderSummaryRows();
    const summaryContentHeight =
      rowsY + (this.summaryRowsHeight ?? 0) + SECTION_CONTENT_BOTTOM;
    setDialogPaperSectionBounds(
      this.summaryPaper,
      { x: 0, y: 0, width: ALLIANCE_CONTENT_WIDTH, height: summaryContentHeight },
      paperOutsets,
    );
    const summarySectionHeight = this.summaryPaper.y + this.summaryPaper.frameHeight;
    const membersY = summarySectionHeight + SECTION_GAP - this.summaryPaper.y;
    const membersHeight = Math.max(80, contentBottom - membersY);
    const membersContentHeight = Math.max(
      40,
      membersHeight - paperOutsets.bottom,
    );
    const statusHeight = this.statusLabel.visible ? STATUS_HEIGHT : 0;

    this.membersSection.position.set(0, membersY);
    this.memberListLayout = resolveAllianceMemberListLayout();
    this.membersScroll.setBounds(
      this.memberListLayout.x,
      SECTION_CONTENT_TOP,
      this.memberListLayout.viewportWidth,
      Math.max(
        ALLIANCE_MEMBER_ROW_HEIGHT,
        membersContentHeight -
          SECTION_CONTENT_TOP -
          SECTION_CONTENT_BOTTOM -
          statusHeight,
      ),
    );
    this.orderMemberRows();
    setDialogPaperSectionBounds(
      this.membersPaper,
      { x: 0, y: 0, width: ALLIANCE_CONTENT_WIDTH, height: membersContentHeight },
      paperOutsets,
    );
    this.statusLabel.position.set(
      0,
      membersY + membersContentHeight - SECTION_CONTENT_BOTTOM - statusHeight,
    );

    if (footerLayout) {
      this.primaryAction.position.set(footerLayout.rowX, footerLayout.rowY);
      this.primaryAction.setSize(
        footerLayout.tabWidth,
        PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      );
    }
  }

  applyDialogTheme(theme) {
    this.contentTheme = theme;
    if (this.identityLabel) {
      applyTextTheme(this.identityLabel, theme, RETAINED_TEXT_STYLES.bold);
      applyTextTheme(this.detailLabel, theme, {
        ...RETAINED_TEXT_STYLES.border,
        lineHeight: 14,
        wordWrapWidth: ALLIANCE_CONTENT_WIDTH,
      });
      for (const row of this.summaryRows?.getWidgets?.() ?? []) {
        row.applyTheme(theme);
      }
      for (const row of this.memberRows?.getWidgets?.() ?? []) {
        row.applyTheme(theme);
      }
    }
    this.primaryAction?.applyTheme(theme);
    this.statusLabel?.applyTheme(theme);
  }

  registerTarget(descriptor) {
    const semanticId = descriptor?.semanticId;
    if (!semanticId || !this.context.semanticRegistry) {
      return null;
    }
    this.unregisterTarget(semanticId);
    const definition = this.context.semanticRegistry.register(descriptor);
    this.registeredTargetIds.add(semanticId);
    return definition;
  }

  unregisterTarget(semanticId) {
    if (!this.registeredTargetIds.delete(semanticId)) {
      return false;
    }
    return this.context.semanticRegistry?.unregister?.(semanticId) ?? false;
  }

  activateDialog() {
    this.actions.activate?.(this.allianceModel);
  }

  deactivateDialog() {
    this.actions.deactivate?.(this.allianceModel);
    this.actionPending = false;
  }

  destroyDialog() {
    this.summaryRows?.destroy();
    this.summaryRows = null;
    this.summaryRowPool?.destroy();
    this.summaryRowPool = null;
    this.memberRows?.destroy();
    this.memberRows = null;
    this.memberRowPool?.destroy();
    this.memberRowPool = null;
    this.membersScroll?.destroy();
    this.membersScroll = null;
    this.primaryAction?.destroy();
    this.primaryAction = null;
    this.registeredTargetIds.clear();
    this.rows = null;
  }

  getPoolStats() {
    return Object.freeze({
      collection: this.memberRows?.getStats?.() ?? null,
      pool: this.memberRowPool?.getStats?.() ?? null,
      summary: Object.freeze({
        collection: this.summaryRows?.getStats?.() ?? null,
        pool: this.summaryRowPool?.getStats?.() ?? null,
      }),
    });
  }
}

function normalizeAllianceModel(model = {}) {
  const alliance = model.alliance ?? model;
  const suppliedMembers = Array.isArray(model.members)
    ? model.members
    : Array.isArray(alliance.members)
      ? alliance.members
      : [];
  const tag = normalizeTag(alliance.tag ?? alliance.allianceTag);
  const name = String(alliance.name ?? alliance.allianceName ?? '').trim();
  const joinMode = String(alliance.joinMode ?? 'closed');
  const connected = model.connected !== false;
  const loading =
    Boolean(model.loading ?? alliance.loading) || model.state === 'loading';
  const ownsAlliance = Boolean(model.ownAlliance ?? model.isMember);
  const allianceId = normalizeId(alliance.allianceId ?? alliance.id);
  const ownApplications = Array.isArray(model.ownApplications)
    ? model.ownApplications
    : [];
  const pending =
    !ownsAlliance &&
    Boolean(allianceId) &&
    ownApplications.some(
      (application) => normalizeId(application?.allianceId) === allianceId,
    );
  const canAct =
    Boolean(allianceId) &&
    !loading &&
    !ownsAlliance &&
    model.actionEnabled !== false &&
    (joinMode === 'open' || joinMode === 'apply');
  return {
    ...alliance,
    allianceId,
    title: [tag ? `[${tag}]` : '', name || (tag ? '' : 'Alliance')]
      .filter(Boolean)
      .join(' '),
    tag,
    name,
    connected,
    loading,
    memberCount: nonNegativeInteger(
      alliance.memberCount ?? suppliedMembers.length,
    ).toLocaleString('en-US'),
    joinMode,
    seasonIncome: formatCoinAmount(
      alliance.seasonIncome ??
        alliance.weeklyIncome ??
        alliance.totalIncome ??
        0,
    ),
    description: String(alliance.description ?? '').trim(),
    notice: String(alliance.notice ?? '').trim(),
    bannerColor: alliance.bannerColor,
    emblemColor: alliance.emblemColor,
    emblemId: alliance.emblemId,
    members: suppliedMembers
      .map(normalizeMember)
      .sort((left, right) => {
        if (left.roleRank !== right.roleRank) {
          return right.roleRank - left.roleRank;
        }
        return left.username.localeCompare(right.username);
      })
      .map((member, index, members) => ({
        ...member,
        showRankHeader:
          index === 0 || members[index - 1].role !== member.role,
      })),
    action: pending
      ? { kind: 'pending', label: 'Pending', enabled: false }
      : canAct
        ? {
            kind: joinMode === 'open' ? 'join' : 'apply',
            label: joinMode === 'open' ? 'Join' : 'Apply',
            enabled: true,
          }
        : null,
  };
}

function normalizeMember(member = {}) {
  const role = String(member.role ?? 'trader');
  const level = Math.max(
    1,
    Math.floor(Number(member.playerLevel ?? member.level)) || 1,
  );
  return {
    ...member,
    memberIdentity: normalizeId(member.memberIdentity ?? member.identity),
    username: String(member.username ?? member.name ?? 'Wizard'),
    playerLevel: level,
    levelLabel: `Lv ${level}`,
    role,
    roleRank: ROLE_RANKS[role] ?? ROLE_RANKS.trader,
    roleLabel: ROLE_LABELS[role] ?? titleCaseLabel(role),
    prestigeCount: nonNegativeInteger(member.prestigeCount),
    totalContributionLabel: formatCoinAmount(
      member.totalContribution ?? 0,
    ),
  };
}

function resolveAllianceMemberListLayout() {
  return resolveRetainedDialogListLayout({
    bodyWidth: ALLIANCE_CONTENT_WIDTH,
    paperRight:
      ALLIANCE_CONTENT_WIDTH + PIXI_UI_GEOMETRY.dialogPadding + 14 / 3,
    rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
  });
}

function normalizeTag(value) {
  return String(value ?? '')
    .replace(/^\[|\]$/g, '')
    .trim()
    .toUpperCase();
}

function normalizeId(value) {
  return String(value ?? '').trim();
}

function nonNegativeInteger(value) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function titleCaseLabel(value) {
  return String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatFailure(reason) {
  return reason === 'offline' ? 'Offline' : 'Not Saved';
}
