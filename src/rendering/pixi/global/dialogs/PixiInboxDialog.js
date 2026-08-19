import {
  Container,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  PixiTextButton,
  PixiNineSliceFrame,
  PixiTextLabel,
} from '../../primitives/index.js';
import { PixiInlineText } from '../../primitives/PixiInlineText.js';
import {
  PooledCollection,
  WidgetPool,
} from '../../retained/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  PIXI_DIALOG_PALETTE,
  resolveAdaptiveDialogHeight,
} from '../../primitives/PixiDialogFrame.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  RetainedGlobalDialog,
  orderDisplayObjects,
} from './GlobalDialogKit.js';
import { RetainedScrollArea } from '../../pages/workshop/RetainedPageKit.js';

const INBOX_CONTENT_WIDTH =
  GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const INBOX_CONTENT_HEIGHT = 360;
const MAIL_GAP = 8;
const MAIL_PADDING_X = 10;
const MAIL_PADDING_Y = 10;
const MAIL_ACTION_WIDTH = 80;
const MAIL_COLUMN_GAP = 8;
const MAIL_SECTION_GAP = 4;
const MAIL_FOOTER_GAP = 8;
const MAIL_MIN_HEIGHT = 88;
const MAIL_CLAIM_HEIGHT = 30;
const INBOX_EMPTY_FONT_SIZE = 20;
const INBOX_REWARD_RESOURCE_PATTERN =
  /\b(?:crystals?|emeralds?|coin|herbs?|mana|rubies|ruby|seeds?)\b/gi;
const INBOX_REWARD_RESOURCE_FRAMES = Object.freeze({
  coin: 'resource:coin',
  crystal: 'resource:crystal',
  emerald: 'resource:emerald',
  herb: 'herb:sageHerb',
  mana: 'resource:mana',
  ruby: 'resource:ruby',
  seed: 'seed:pack',
});

/**
 * Retained, keyed inbox. Mail cards are pooled and keep one installed claim
 * handler each; changing mailbox snapshots never rebuilds the dialog tree.
 */
export class PixiInboxDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.inbox' } = {}) {
    super({
      context,
      dialogId,
      title: 'Inbox',
      contentWidth: INBOX_CONTENT_WIDTH,
      contentHeight: INBOX_CONTENT_HEIGHT,
      placement: 'center',
      label: `${dialogId}:inboxDialog`,
    });
    this.panel.paperFrame.visible = false;
    this.panel.paperFrame.renderable = false;
    this.pendingMailKeys = new Set();
    this.scroll = new RetainedScrollArea({
      inputRouter: this.context.inputRouter,
      label: `${dialogId}:scroll`,
    });
    this.panel.content.addChild(this.scroll.root);
    const emptyPanelSkin = PIXI_ROOT_RUN_GEOMETRY.innerSectionPanelWhite;
    this.emptyFrame = new PixiNineSliceFrame({
      texture:
        this.context.assets?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.innerSectionPanelWhite,
        ) ?? Texture.EMPTY,
      sourceInsets: emptyPanelSkin.sourceInsets,
      borderInsets: emptyPanelSkin.borderInsets,
      width: INBOX_CONTENT_WIDTH,
      height: MAIL_MIN_HEIGHT,
      label: `${dialogId}:emptyFrame`,
    });
    this.emptyLabel = new PixiTextLabel({
      text: 'No Mail',
      fontSize: INBOX_EMPTY_FONT_SIZE,
      anchor: { x: 0.5, y: 0.5 },
      color: 'muted',
      label: `${dialogId}:empty`,
    });
    this.scroll.content.addChild(this.emptyFrame, this.emptyLabel);

    this.mailPool = new WidgetPool({
      name: `${dialogId} mail row pool`,
      counters: this.context.counters,
      maxSize: 80,
      create: () =>
        new InboxMailWidget({
          assetManager: this.context.assets,
          inputRouter: this.context.inputRouter,
          theme:
            this.panel.getContentTheme?.() ??
            this.theme,
          label: `${dialogId}:mail`,
        }),
      reset: (widget) => widget.reset(),
      dispose: (widget) => widget.destroy(),
    });
    this.mailRows = new PooledCollection({
      name: `${dialogId} mail rows`,
      pool: this.mailPool,
      counters: this.context.counters,
      keyOf: (mail, index) => mail.mailKey ?? mail.id ?? index,
      bind: (widget, mail, key) =>
        widget.bind(key, mail, {
          claim: (candidate) => this.claimMail(candidate),
        }),
      afterReconcile: (widgets) => {
        orderDisplayObjects(this.scroll.content, widgets);
        this.scroll.content.addChild(this.emptyFrame, this.emptyLabel);
      },
    });
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel) {
    this.inboxModel = normalizeInboxModel(viewModel);
    for (const mail of this.inboxModel.mail) {
      if (mail.rewardCollected) {
        this.pendingMailKeys.delete(mail.mailKey);
      }
      mail.pending = this.pendingMailKeys.has(mail.mailKey);
    }
    this.mailRows.reconcile(this.inboxModel.mail);
    const empty = this.inboxModel.mail.length === 0;
    this.emptyLabel.visible = empty;
    this.emptyLabel.renderable = empty;
    this.emptyFrame.visible = empty;
    this.emptyFrame.renderable = empty;
    this.layoutDialog(this.viewportProjection);
  }

  async claimMail(mail) {
    const mailKey = String(mail?.mailKey ?? '');
    if (!mailKey || this.pendingMailKeys.has(mailKey)) {
      return false;
    }
    const action =
      this.actions.claimReward ??
      this.actions.claimMail ??
      this.model.onClaim;
    if (!action) {
      return false;
    }
    this.pendingMailKeys.add(mailKey);
    this.refreshPendingMail();
    let result;
    try {
      result = await action(mailKey, mail);
    } catch {
      result = { ok: false, reason: 'offline' };
    } finally {
      this.pendingMailKeys.delete(mailKey);
      if (isConfirmedClaim(result)) {
        const claimedMail = this.inboxModel?.mail?.find(
          (candidate) => candidate.mailKey === mailKey,
        );
        if (claimedMail) {
          claimedMail.read = true;
          claimedMail.rewardCollected = true;
        }
      }
      this.refreshPendingMail();
    }
    return result ?? true;
  }

  refreshPendingMail() {
    if (!this.inboxModel) {
      return;
    }
    for (const mail of this.inboxModel.mail) {
      mail.pending = this.pendingMailKeys.has(mail.mailKey);
    }
    this.mailRows.reconcile(this.inboxModel.mail);
    this.layoutRows();
  }

  layoutRows() {
    if (!this.mailRows) {
      return;
    }
    let y = 0;
    for (const widget of this.mailRows.getWidgets()) {
      const height = widget.getPreferredHeight(INBOX_CONTENT_WIDTH);
      widget.setBounds(0, y, INBOX_CONTENT_WIDTH, height);
      y += height + MAIL_GAP;
    }
    const contentHeight = Math.max(0, y - MAIL_GAP);
    this.emptyFrame.position.set(0, 0);
    this.emptyFrame.setSize(
      INBOX_CONTENT_WIDTH,
      MAIL_MIN_HEIGHT,
      PIXI_ROOT_RUN_GEOMETRY.innerSectionPanelWhite.borderInsets,
    );
    this.emptyLabel.position.set(
      INBOX_CONTENT_WIDTH / 2,
      MAIL_MIN_HEIGHT / 2,
    );
    this.scroll.setContentHeight(
      this.inboxModel?.mail?.length > 0 ? contentHeight : MAIL_MIN_HEIGHT,
    );
  }

  measureRowsHeight() {
    const widgets = this.mailRows?.getWidgets?.() ?? [];
    if (widgets.length === 0) {
      return MAIL_MIN_HEIGHT;
    }
    return widgets.reduce(
      (height, widget, index) =>
        height +
        widget.getPreferredHeight(INBOX_CONTENT_WIDTH) +
        (index > 0 ? MAIL_GAP : 0),
      0,
    );
  }

  applyDialogTheme(theme) {
    this.emptyLabel?.applyTheme(theme);
    for (const widget of this.mailRows?.getWidgets?.() ?? []) {
      widget.applyTheme(theme);
    }
  }

  layoutDialog(projection = this.viewportProjection) {
    const maximumContentHeight = resolveAdaptiveDialogHeight({
      viewportHeight: projection?.sourceHeight,
      baseHeight: INBOX_CONTENT_HEIGHT,
      minimumHeight: 240,
      maximumHeight: Math.max(240, (projection?.sourceHeight ?? 844) - 200),
      hasPrimaryVerticalScroll: true,
    });
    const contentHeight = Math.min(
      maximumContentHeight,
      Math.max(MAIL_MIN_HEIGHT, this.measureRowsHeight()),
    );
    if (
      this.contentWidth !== INBOX_CONTENT_WIDTH ||
      this.contentHeight !== contentHeight
    ) {
      this.setPanelContentSize(INBOX_CONTENT_WIDTH, contentHeight);
    }
    this.scroll?.setBounds(
      0,
      0,
      INBOX_CONTENT_WIDTH,
      contentHeight,
    );
    this.layoutRows();
  }

  activateDialog() {
    this.actions.activate?.();
    this.actions.markVisibleRead?.();
    this.model.onVisible?.();
  }

  deactivateDialog() {
    for (const widget of this.mailRows?.getWidgets?.() ?? []) {
      widget.cancelPendingVisual();
    }
    this.actions.deactivate?.();
  }

  destroyDialog() {
    this.mailRows?.destroy();
    this.mailRows = null;
    this.mailPool?.destroy();
    this.mailPool = null;
    this.pendingMailKeys.clear();
    this.scroll?.destroy();
    this.scroll = null;
  }

  getPoolStats() {
    return Object.freeze({
      collection: this.mailRows?.getStats() ?? null,
      pool: this.mailPool?.getStats() ?? null,
    });
  }
}

export class InboxMailWidget {
  constructor({
    assetManager = null,
    inputRouter = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
    label = 'inboxMail',
  } = {}) {
    this.assetManager = assetManager;
    this.theme = theme;
    this.root = new Container();
    this.root.label = label;
    this.root.visible = false;
    this.root.renderable = false;
    const panelSkin = PIXI_ROOT_RUN_GEOMETRY.innerSectionPanelWhite;
    const panelAssetId = PIXI_ROOT_RUN_ASSETS.innerSectionPanelWhite;
    this.frame = new PixiNineSliceFrame({
      texture: assetManager?.getTexture?.(panelAssetId) ?? Texture.EMPTY,
      sourceInsets: panelSkin.sourceInsets,
      borderInsets: panelSkin.borderInsets,
      width: INBOX_CONTENT_WIDTH,
      height: MAIL_MIN_HEIGHT,
      label: `${label}:frame`,
    });
    this.frame.assetId = panelAssetId;
    this.title = new PixiTextLabel({
      fontWeight: 'bold',
      color: PIXI_DIALOG_PALETTE.crystal,
      wordWrap: true,
      label: `${label}:title`,
    });
    this.meta = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      label: `${label}:meta`,
    });
    this.body = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      lineHeight: 16,
      wordWrap: true,
      label: `${label}:body`,
    });
    this.reward = new PixiInlineText({
      style: createRewardTextStyle(theme),
      label: `${label}:reward`,
    });
    this.status = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: 'muted',
      anchor: { x: 1, y: 0 },
      label: `${label}:status`,
    });
    this.claimedLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      fontWeight: 'bold',
      color: PIXI_DIALOG_PALETTE.herb,
      label: `${label}:claimedLabel`,
    });
    this.claimedIcon = new Sprite(getCheckTexture(assetManager));
    this.claimedIcon.label = `${label}:claimed`;
    this.claimedIcon.width = 12;
    this.claimedIcon.height = 12;
    this.claimButton = new PixiTextButton({
      assetManager,
      inputRouter,
      text: 'Claim',
      width: MAIL_ACTION_WIDTH,
      height: MAIL_CLAIM_HEIGHT,
      sizeTier: 50,
      action: () => this.claim(),
      variant: 'green',
      label: `${label}:claim`,
    });
    this.root.addChild(
      this.frame,
      this.title,
      this.meta,
      this.body,
      this.reward,
      this.status,
      this.claimedIcon,
      this.claimedLabel,
      this.claimButton,
    );
    this.data = {};
    this.actions = {};
    this.width = INBOX_CONTENT_WIDTH;
    this.height = MAIL_MIN_HEIGHT;
    this.applyTheme(theme);
  }

  bind(_key, data = {}, actions = {}) {
    this.data = data ?? {};
    this.actions = actions ?? {};
    this.root.visible = true;
    this.root.renderable = true;
    this.title.setText(this.data.title || 'message');
    this.meta.setText(this.data.meta ?? '');
    this.body.setText(this.data.body ?? '');
    this.reward.setRuns(
      this.data.hasReward
        ? createInboxRewardRuns(
            this.assetManager,
            this.data.rewardText || 'reward',
          )
        : [],
    );
    const claimed =
      Boolean(this.data.hasReward) &&
      Boolean(this.data.rewardCollected);
    const claimable =
      Boolean(this.data.hasReward) &&
      !claimed;
    this.status.setText(
      this.data.hasReward
        ? claimed
          ? ''
          : ''
        : this.data.read
          ? 'read'
          : 'new',
    );
    this.claimedIcon.visible = claimed;
    this.claimedIcon.renderable = claimed;
    this.claimedLabel.setText(claimed ? 'Claimed' : '');
    this.claimedLabel.visible = claimed;
    this.claimedLabel.renderable = claimed;
    this.claimButton.visible = claimable;
    this.claimButton.renderable = claimable;
    this.claimButton
      .setText(this.data.pending ? '...' : 'Claim')
      .setEnabled(claimable && !this.data.pending);
    this.layoutCurrent();
  }

  reset() {
    this.data = {};
    this.actions = {};
    this.title.setText('');
    this.meta.setText('');
    this.body.setText('');
    this.reward.setRuns([]);
    this.status.setText('');
    this.claimedIcon.visible = false;
    this.claimedIcon.renderable = false;
    this.claimedLabel.setText('');
    this.claimedLabel.visible = false;
    this.claimedLabel.renderable = false;
    this.claimButton
      .setText('Claim')
      .setEnabled(false);
    this.claimButton.visible = false;
    this.claimButton.renderable = false;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
  }

  getPreferredHeight(width = this.width) {
    const contentWidth = Math.max(0, width - MAIL_PADDING_X * 2);
    const footerTextWidth = Math.max(
      0,
      contentWidth - MAIL_ACTION_WIDTH - MAIL_COLUMN_GAP,
    );
    this.title.setWrapWidth(contentWidth);
    this.body.setWrapWidth(contentWidth);
    this.reward.setWrapWidth(footerTextWidth);
    let contentHeight =
      this.title.measuredHeight +
      2 +
      this.meta.measuredHeight;
    if (this.body.text) {
      contentHeight += MAIL_SECTION_GAP + this.body.measuredHeight;
    }
    const footerHeight = this.getFooterHeight();
    if (footerHeight > 0) {
      contentHeight += MAIL_FOOTER_GAP + footerHeight;
    }
    return Math.max(
      MAIL_MIN_HEIGHT,
      Math.ceil(contentHeight) + MAIL_PADDING_Y * 2,
    );
  }

  setBounds(x, y, width, height = this.getPreferredHeight(width)) {
    this.width = Math.max(0, Number(width) || 0);
    this.height = Math.max(MAIL_MIN_HEIGHT, Number(height) || MAIL_MIN_HEIGHT);
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(
      0,
      0,
      this.width,
      this.height,
    );
    this.layoutCurrent();
  }

  layoutCurrent() {
    const contentWidth = Math.max(0, this.width - MAIL_PADDING_X * 2);
    const footerTextWidth = Math.max(
      0,
      contentWidth - MAIL_ACTION_WIDTH - MAIL_COLUMN_GAP,
    );
    this.frame.setSize(
      this.width,
      this.height,
      PIXI_ROOT_RUN_GEOMETRY.innerSectionPanelWhite.borderInsets,
    );
    this.title.position.set(MAIL_PADDING_X, MAIL_PADDING_Y);
    this.title.setWrapWidth(contentWidth);
    let y =
      MAIL_PADDING_Y +
      this.title.measuredHeight +
      2;
    this.meta.position.set(MAIL_PADDING_X, y);
    y += this.meta.measuredHeight;
    this.body.setWrapWidth(contentWidth);
    if (this.body.text) {
      y += MAIL_SECTION_GAP;
      this.body.position.set(MAIL_PADDING_X, y);
      y += this.body.measuredHeight;
    }
    const footerHeight = this.getFooterHeight();
    const footerY = footerHeight > 0 ? y + MAIL_FOOTER_GAP : y;
    this.reward.setWrapWidth(footerTextWidth);
    this.reward.position.set(MAIL_PADDING_X, footerY);
    const actionRight = this.width - MAIL_PADDING_X;
    this.status.position.set(actionRight, footerY + 8);
    this.claimedIcon.position.set(
      actionRight - this.claimedLabel.measuredWidth - 18,
      footerY + Math.max(0, (footerHeight - 12) / 2),
    );
    this.claimedLabel.position.set(
      actionRight - this.claimedLabel.measuredWidth,
      footerY + Math.max(0, (footerHeight - this.claimedLabel.measuredHeight) / 2),
    );
    this.claimButton.position.set(
      actionRight - MAIL_ACTION_WIDTH,
      footerY,
    );
  }

  getFooterHeight() {
    const claimedHeight = this.claimedLabel.visible
      ? Math.max(12, this.claimedLabel.measuredHeight)
      : 0;
    const statusHeight = this.status.text
      ? this.status.measuredHeight
      : 0;
    const actionHeight = this.claimButton.visible
      ? MAIL_CLAIM_HEIGHT
      : Math.max(claimedHeight, statusHeight);
    return Math.max(
      this.reward.text ? this.reward.layoutHeight : 0,
      actionHeight,
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.title.applyTheme(this.theme);
    this.meta.applyTheme(this.theme);
    this.body.applyTheme(this.theme);
    this.reward.setStyle(createRewardTextStyle(this.theme));
    this.status.applyTheme(this.theme);
    this.claimedLabel.applyTheme(this.theme);
    this.claimButton.applyTheme(this.theme);
  }

  claim() {
    if (this.data.pending) {
      return false;
    }
    return this.actions.claim?.(this.data) ?? false;
  }

  cancelPendingVisual() {
    if (!this.data.pending) {
      return;
    }
    this.claimButton.setText('Claim').setEnabled(false);
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

function normalizeInboxModel(model = {}) {
  const supplied = Array.isArray(model.mail)
    ? model.mail
    : Array.isArray(model.messages)
      ? model.messages
      : [];
  return {
    ...model,
    connected: model.connected !== false,
    mail: supplied.map((mail, index) =>
      normalizeMail(mail, index),
    ),
  };
}

function normalizeMail(mail = {}, index = 0) {
  const timestamp = Number(mail.createdAtMs);
  const body = capitalizeSentences(String(mail.body ?? ''));
  const sender = capitalizeSentences(
    String(mail.senderLabel ?? mail.sender ?? 'system').trim() ||
      'system',
  );
  const createdLabel =
    mail.createdLabel ??
    mail.date ??
    formatMailDate(timestamp);
  const meta =
    mail.meta ??
    (createdLabel ? `${sender} · ${createdLabel}` : sender);
  return {
    ...mail,
    mailKey: String(mail.mailKey ?? mail.id ?? index),
    title: resolveMailTitle(mail, body),
    body,
    meta,
    read: Boolean(mail.read),
    hasReward: Boolean(
      mail.hasReward ??
        mail.rewardText ??
        mail.reward,
    ),
    rewardText: String(
      mail.rewardText ?? mail.reward ?? 'reward',
    ).replace(/,\s+(?=[+-]?\d|\?)/g, ' '),
    rewardCollected: Boolean(
      mail.rewardCollected ?? mail.claimed,
    ),
    pending: Boolean(mail.pending),
  };
}

function resolveMailTitle(mail, body) {
  const title = capitalizeSentences(String(mail.title || 'message'));
  const sourceType = String(mail.sourceType ?? '')
    .replace(/[^a-z]/gi, '')
    .toLowerCase();
  if (sourceType !== 'worldevent' || title.toLowerCase() !== 'event finished') {
    return title;
  }

  const eventHeadline = String(body).match(
    /\bin (.+?) with [\d,]+ points\./i,
  )?.[1];
  return eventHeadline ? capitalizeSentences(eventHeadline) : title;
}

function formatMailDate(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '';
  }
  try {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function createInboxRewardRuns(assetManager, rewardText) {
  const value = String(rewardText ?? '');
  const runs = [];
  let lastIndex = 0;

  for (const match of value.matchAll(INBOX_REWARD_RESOURCE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      runs.push({ kind: 'text', text: value.slice(lastIndex, index) });
    }
    const label = match[0];
    const resource = normalizeRewardResource(label);
    const texture = getAtlasTexture(
      assetManager,
      INBOX_REWARD_RESOURCE_FRAMES[resource],
    );
    runs.push({
      kind: 'icon',
      texture,
      size: PIXI_UI_GEOMETRY.bodyFontSize + 1,
      fallbackText: texture === Texture.EMPTY ? label : '',
    });
    lastIndex = index + label.length;
  }

  if (lastIndex < value.length) {
    runs.push({ kind: 'text', text: value.slice(lastIndex) });
  }

  return runs.length > 0 ? runs : [{ kind: 'text', text: value }];
}

function createRewardTextStyle(theme) {
  const resolved = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
  return {
    fontFamily: resolved.fontFamily,
    fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
    fontWeight: 'bold',
    fill: PIXI_DIALOG_PALETTE.coin,
    lineHeight: 16,
  };
}

function getAtlasTexture(assetManager, frameName) {
  if (!frameName) {
    return Texture.EMPTY;
  }
  try {
    return assetManager?.getAtlasTexture?.(frameName) ?? Texture.EMPTY;
  } catch {
    return Texture.EMPTY;
  }
}

function normalizeRewardResource(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'crystals') {
    return 'crystal';
  }
  if (normalized === 'emeralds') {
    return 'emerald';
  }
  if (normalized === 'rubies') {
    return 'ruby';
  }
  if (normalized === 'seeds') {
    return 'seed';
  }
  if (normalized === 'herbs') {
    return 'herb';
  }
  return normalized;
}

function capitalizeSentences(value) {
  return String(value ?? '').replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_match, prefix, character) => `${prefix}${character.toUpperCase()}`,
  );
}

function getCheckTexture(assetManager) {
  try {
    return (
      assetManager?.getAtlasTexture?.('status:checkDefault') ??
      Texture.EMPTY
    );
  } catch {
    return Texture.EMPTY;
  }
}

function isConfirmedClaim(result) {
  return (
    (result === true || result?.ok === true) &&
    result?.pendingServer !== true
  );
}
