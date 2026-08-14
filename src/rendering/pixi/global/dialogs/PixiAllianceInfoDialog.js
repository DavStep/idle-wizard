import { Container } from 'pixi.js';

import {
  PixiTextButton,
  PixiScrollView,
  PixiTextLabel,
} from '../../primitives/index.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  PooledDialogRows,
  RetainedGlobalDialog,
} from './GlobalDialogKit.js';

const ALLIANCE_CONTENT_WIDTH =
  GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const ALLIANCE_CONTENT_HEIGHT = 360;
const ROLE_ORDER = Object.freeze([
  'tradeMaster',
  'quartermaster',
  'factor',
  'broker',
  'trader',
]);
const ROLE_LABELS = Object.freeze({
  tradeMaster: 'trade master',
  quartermaster: 'quartermaster',
  factor: 'factor',
  broker: 'broker',
  trader: 'trader',
});
const JOIN_MODE_LABELS = Object.freeze({
  open: 'open',
  apply: 'apply',
  closed: 'closed',
});

/**
 * Retained public alliance card with a keyed/pool-backed member list.
 */
export class PixiAllianceInfoDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.alliance' } = {}) {
    super({
      context,
      dialogId,
      title: 'alliance',
      contentWidth: ALLIANCE_CONTENT_WIDTH,
      contentHeight: ALLIANCE_CONTENT_HEIGHT,
      placement: 'center',
      label: `${dialogId}:allianceInfoDialog`,
    });
    this.statusText = '';
    this.actionPending = false;
    this.activateMemberRow = (member) =>
      this.openPlayer(member);

    this.scroll = new PixiScrollView({
      inputRouter: this.context.inputRouter,
      assetManager: this.context.assets,
      width: ALLIANCE_CONTENT_WIDTH,
      height: ALLIANCE_CONTENT_HEIGHT - 20,
      contentPaddingTop: PIXI_UI_GEOMETRY.dialogScrollPaddingTop,
      showProgress: false,
      label: `${dialogId}:scroll`,
    });
    this.rowsLayer = new Container();
    this.rowsLayer.label = `${dialogId}:rows`;
    this.scroll.content.addChild(this.rowsLayer);
    this.panel.content.addChild(this.scroll);
    this.rows = new PooledDialogRows({
      parent: this.rowsLayer,
      inputRouter: this.context.inputRouter,
      counters: this.context.counters,
      name: `${dialogId} alliance rows`,
      maxSize: 72,
      theme: this.theme,
    });

    this.primaryAction = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.join`,
      text: 'join',
      width: ALLIANCE_CONTENT_WIDTH,
      height: 30,
      action: () => this.runPrimaryAction(),
      label: `${dialogId}:action`,
    });
    this.statusLabel = new PixiTextLabel({
      color: 'muted',
      label: `${dialogId}:status`,
    });
    this.panel.content.addChild(
      this.primaryAction,
      this.statusLabel,
    );
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel) {
    this.allianceModel = normalizeAllianceModel(viewModel);
    this.panel.setTitle(this.allianceModel.title);
    if (viewModel.status !== undefined) {
      this.statusText = String(viewModel.status ?? '');
    }
    this.statusLabel.setText(this.statusText);
    const action = this.allianceModel.action;
    this.primaryAction.visible = Boolean(action);
    this.primaryAction.renderable = Boolean(action);
    this.primaryAction
      .setText(
        this.actionPending
          ? '...'
          : action?.label ?? 'join',
      )
      .setEnabled(
        Boolean(action) &&
          !this.actionPending &&
          action.enabled !== false,
      );
    this.rows.reconcile(this.createRows());
    this.layoutDialog();
  }

  createRows() {
    const model = this.allianceModel;
    const rows = [];
    if (model.loading) {
      rows.push({
        id: 'alliance-state',
        kind: 'message',
        text: model.connected ? 'loading alliance' : 'offline',
        mutedLabel: true,
      });
    } else {
      rows.push(
        {
          id: 'members-count',
          label: 'members',
          value: `${model.memberCount}/50`,
        },
        {
          id: 'join-mode',
          label: 'join mode',
          value:
            JOIN_MODE_LABELS[model.joinMode] ??
            model.joinMode,
        },
        {
          id: 'season-income',
          label: 'season income',
          value: model.seasonIncome,
          resource: 'coin',
        },
      );
      if (model.description) {
        rows.push({
          id: 'description',
          kind: 'paragraph',
          text: model.description,
          mutedLabel: true,
        });
      }
      if (model.notice) {
        rows.push({
          id: 'notice',
          kind: 'paragraph',
          text: model.notice,
          mutedLabel: true,
        });
      }
    }

    rows.push(
      { id: 'member-divider', kind: 'divider' },
      {
        id: 'member-section',
        kind: 'message',
        text: 'members',
        mutedLabel: true,
      },
    );

    if (model.loading) {
      rows.push({
        id: 'member-state',
        kind: 'message',
        text: model.connected ? 'loading members' : 'offline',
        mutedLabel: true,
      });
      return rows;
    }
    if (model.members.length === 0) {
      rows.push({
        id: 'member-empty',
        kind: 'message',
        text: 'no members',
        mutedLabel: true,
      });
      return rows;
    }

    for (const role of getRoleOrder(model.members)) {
      const members = model.members.filter(
        (member) => member.role === role,
      );
      if (members.length === 0) {
        continue;
      }
      rows.push({
        id: `role:${role}`,
        kind: 'message',
        text: ROLE_LABELS[role] ?? role,
        mutedLabel: true,
      });
      for (const member of members) {
        rows.push({
          id: `member:${member.memberIdentity || member.username}`,
          label: member.username,
          value: member.playerLevel,
          payload: member,
          action: this.activateMemberRow,
        });
      }
    }
    return rows;
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
    if (!action || this.actionPending) {
      return false;
    }
    const handler =
      action.kind === 'join'
        ? this.actions.joinAlliance ??
          this.model.onJoin
        : this.actions.applyAlliance ??
          this.model.onApply;
    if (!handler) {
      return false;
    }
    this.actionPending = true;
    this.setStatus('saving');
    this.primaryAction.setText('...').setEnabled(false);
    let result;
    try {
      result = await handler(
        this.allianceModel.allianceId,
        this.allianceModel,
      );
    } catch {
      result = { ok: false, reason: 'offline' };
    }
    this.actionPending = false;
    this.primaryAction
      .setText(action.label)
      .setEnabled(action.enabled !== false);
    this.setStatus(
      result?.ok === false || result === false
        ? formatFailure(result?.reason)
        : '',
    );
    return result ?? true;
  }

  setStatus(status) {
    this.statusText = String(status ?? '');
    this.statusLabel.setText(this.statusText);
  }

  layoutCloseControl() {
    if (!this.closeControl || !this.panel) {
      return;
    }
    const width = Math.max(
      32,
      Math.ceil(this.closeControl.textWidth + 8),
    );
    this.closeControl.setBounds(
      this.panel.outerWidth -
        PIXI_UI_GEOMETRY.dialogPadding -
        width,
      this.panel.outerHeight -
        PIXI_UI_GEOMETRY.borderLabelLineHeight / 2,
      width,
      PIXI_UI_GEOMETRY.borderLabelLineHeight,
    );
  }

  layoutDialog() {
    if (!this.rows || !this.allianceModel) {
      return;
    }
    const showAction = this.primaryAction.visible;
    const actionBlock = showAction ? 36 : 0;
    const statusHeight = 20;
    const viewportHeight =
      ALLIANCE_CONTENT_HEIGHT -
      actionBlock -
      statusHeight;
    this.scroll.position.set(0, 0);
    this.scroll.setViewportSize(
      ALLIANCE_CONTENT_WIDTH,
      viewportHeight,
    );
    const rowsHeight = this.rows.layout(
      ALLIANCE_CONTENT_WIDTH,
      { gap: 5 },
    );
    this.scroll.setContentHeight(rowsHeight);
    this.primaryAction.position.set(
      0,
      viewportHeight + 6,
    );
    this.primaryAction.setSize(
      ALLIANCE_CONTENT_WIDTH,
      30,
    );
    this.statusLabel.position.set(
      0,
      viewportHeight + actionBlock,
    );
  }

  applyDialogTheme(theme) {
    this.scroll?.applyTheme(theme);
    this.rows?.applyTheme(theme);
    this.primaryAction?.applyTheme(theme);
    this.statusLabel?.applyTheme(theme);
  }

  activateDialog() {
    this.actions.activate?.(this.allianceModel);
  }

  deactivateDialog() {
    this.actions.deactivate?.(this.allianceModel);
    this.actionPending = false;
  }

  destroyDialog() {
    this.rows?.destroy();
    this.rows = null;
  }

  getPoolStats() {
    return this.rows?.getStats() ?? null;
  }
}

function normalizeAllianceModel(model = {}) {
  const alliance = model.alliance ?? model;
  const suppliedMembers = Array.isArray(model.members)
    ? model.members
    : Array.isArray(alliance.members)
      ? alliance.members
      : [];
  const tag = normalizeTag(
    alliance.tag ?? alliance.allianceTag,
  );
  const name = String(
    alliance.name ?? alliance.allianceName ?? '',
  ).trim();
  const joinMode = String(
    alliance.joinMode ?? 'closed',
  );
  const connected = model.connected !== false;
  const loading =
    Boolean(model.loading ?? alliance.loading) ||
    model.state === 'loading';
  const ownsAlliance = Boolean(
    model.ownAlliance ?? model.isMember,
  );
  const allianceId = String(
    alliance.allianceId ?? alliance.id ?? '',
  );
  const canAct =
    Boolean(allianceId) &&
    !ownsAlliance &&
    joinMode !== 'closed';
  return {
    ...alliance,
    allianceId,
    title:
      [tag ? `[${tag}]` : '', name || (tag ? '' : 'alliance')]
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
    seasonIncome: formatNumber(
      alliance.seasonIncome ??
        alliance.weeklyIncome ??
        alliance.totalIncome,
    ),
    description: String(alliance.description ?? '').trim(),
    notice: String(alliance.notice ?? '').trim(),
    members: suppliedMembers.map(normalizeMember),
    action: canAct
      ? {
          kind: joinMode === 'open' ? 'join' : 'apply',
          label: joinMode === 'open' ? 'join' : 'apply',
          enabled: model.actionEnabled !== false,
        }
      : null,
  };
}

function normalizeMember(member = {}) {
  return {
    ...member,
    memberIdentity: String(
      member.memberIdentity ?? member.identity ?? '',
    ),
    username: String(
      member.username ?? member.name ?? 'player',
    ),
    playerLevel: String(
      Math.max(
        1,
        Math.floor(Number(member.playerLevel ?? member.level)) || 1,
      ),
    ),
    role: String(member.role ?? 'trader'),
  };
}

function getRoleOrder(members) {
  const extraRoles = [];
  for (const member of members) {
    if (
      !ROLE_ORDER.includes(member.role) &&
      !extraRoles.includes(member.role)
    ) {
      extraRoles.push(member.role);
    }
  }
  return [...ROLE_ORDER, ...extraRoles];
}

function normalizeTag(value) {
  return String(value ?? '')
    .replace(/^\[|\]$/g, '')
    .trim()
    .toUpperCase();
}

function nonNegativeInteger(value) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatNumber(value) {
  return nonNegativeInteger(value).toLocaleString('en-US');
}

function formatFailure(reason) {
  return reason === 'offline' ? 'offline' : 'not saved';
}
