import { Container, Graphics, Rectangle, Texture } from 'pixi.js';

import { getPlayerFrameTint } from '../../../../player/playerFrames.js';
import { PixiNotificationBadge } from '../transient/PixiNotificationBadges.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import { createDialogPaperSection } from '../../primitives/PixiDialogFrame.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  PLAYER_PROFILE_SIZE,
  PlayerProfileWidget,
} from '../chrome/PlayerProfileWidgets.js';
import {
  RETAINED_TEXT_STYLES,
  applyTextTheme,
  createText,
  setText,
} from '../../pages/workshop/RetainedPageKit.js';

const COMPACT_ROW_HEIGHT = 62;
const FRIEND_ROW_HEIGHT = 96;
const COMPACT_AVATAR_SIZE = 46;
const FRIEND_AVATAR_SIZE = 64;
const FRIEND_ROW_INSET_X = 12;
const FRIEND_ROW_COPY_GAP = 10;
const FRIEND_ROW_ACTION_WIDTH = 68;
const FRIEND_ROW_ACTION_INSET = 8;
const ACTION_HEIGHT = 24;
const ACTION_GAP = 4;
const FRIEND_TAG_COLORS = Object.freeze({
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

/**
 * Reusable friend/request row with one player identity and up to two compact
 * relationship actions. The body opens the player or conversation supplied by
 * the presenter; the widget owns no friendship rules.
 */
export class PlayerRelationshipRowPixi {
  constructor({ dialog }) {
    this.dialog = dialog;
    this.usesFriendCard =
      dialog.isFriendsDialog === true || dialog.dialogId === 'global.friends';
    this.root = new Container({ label: `${dialog.dialogId}-relationship-row` });
    this.paper = this.usesFriendCard
      ? createDialogPaperSection(
          resolvePaperTexture(dialog),
          `${this.root.label}:paper`,
        )
      : null;
    this.divider = new Graphics({ label: `${this.root.label}:divider` });
    this.profile = new PlayerProfileWidget({
      assets: dialog.assetManager,
      texture: Texture.EMPTY,
      label: `${this.root.label}:profile`,
    });
    this.profile.pivot.set(PLAYER_PROFILE_SIZE / 2);
    this.allianceTag = createText('', RETAINED_TEXT_STYLES.bold);
    this.name = createText('', RETAINED_TEXT_STYLES.bold);
    this.detail = createText('', RETAINED_TEXT_STYLES.border);
    this.preview = createText('', RETAINED_TEXT_STYLES.border);
    this.status = createText('', {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
    });
    this.status.anchor.set(1, 0.5);
    this.notificationBadge = new PixiNotificationBadge({
      assetManager: dialog.assetManager,
    });
    this.notificationBadge.setTone('red');
    this.notificationDot = this.notificationBadge.root;
    this.notificationDot.label = `${this.root.label}:notification`;
    this.primary = this.createAction('primary');
    this.secondary = this.createAction('secondary');
    this.root.addChild(
      ...(this.paper ? [this.paper] : []),
      this.divider,
      this.profile,
      this.allianceTag,
      this.name,
      this.detail,
      this.preview,
      this.status,
      this.notificationDot,
      this.primary,
      this.secondary,
    );
    this.registration =
      dialog.inputRouter?.registerPressTarget?.(this.root, {
        enabled: () => typeof this.model?.onActivate === 'function',
        onActivate: () => this.model?.onActivate?.(this.model) ?? false,
        haptic: 'selection',
        excludePageSwipe: true,
      }) ?? null;
    this.root.visible = false;
  }

  createAction(id) {
    return new PixiTextButton({
      assetManager: this.dialog.assetManager,
      inputRouter: this.dialog.inputRouter,
      semanticRegistry: null,
      semanticId: `${this.dialog.dialogId}.relationship.${id}`,
      text: '',
      width: 60,
      height: ACTION_HEIGHT,
      sizeTier: 30,
      variant: id === 'primary' ? 'green' : 'red',
      action: () => this.activateAction(id),
      label: `${this.dialog.dialogId}:relationship:${id}`,
    });
  }

  bind(model = {}) {
    this.model = model;
    this.root.visible = true;
    this.root.renderable = true;
    this.profile
      .setTexture(resolveCharacterTexture(this.dialog.assetManager, model.character))
      .setBackgroundTint(getPlayerFrameTint(model.frame));
    const allianceTag = normalizeAllianceTag(model.allianceTag);
    setText(this.allianceTag, allianceTag ? `[${allianceTag}]` : '');
    this.allianceTag.style.fill = resolveAllianceTagColor(
      model.allianceTagColor,
    );
    setText(this.name, model.username ?? model.label ?? 'Wizard');
    setText(this.detail, model.detail ?? `Level ${model.playerLevel ?? 1}`);
    setText(this.preview, model.preview ?? '');
    setText(this.status, model.status ?? '');
    const notificationVisible =
      this.usesFriendCard &&
      Boolean(model.notification ?? model.unread ?? model.hasUnreadMessage);
    this.notificationBadge.setActive(notificationVisible);
    this.bindAction(this.primary, model.primaryAction);
    this.bindAction(this.secondary, model.secondaryAction);
    this.applyTheme(this.dialog.contentTheme ?? this.dialog.theme);
  }

  bindAction(button, action) {
    const visible = Boolean(action?.label);
    button.visible = visible;
    button.renderable = visible;
    if (!visible) {
      return;
    }
    button.setText(action.label);
    button.setVariant(action.variant ?? (button === this.primary ? 'green' : 'red'));
    button.setEnabled(action.enabled !== false && typeof action.onActivate === 'function');
  }

  activateAction(id) {
    const action = id === 'primary' ? this.model?.primaryAction : this.model?.secondaryAction;
    return action?.onActivate?.(this.model) ?? false;
  }

  setBounds(x, y, width, height = this.getPreferredHeight()) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    if (this.usesFriendCard) {
      this.layoutFriendCard(width, height);
      return;
    }
    this.divider.clear().moveTo(0, height - 1).lineTo(width, height - 1).stroke({
      color: this.dialog.contentTheme?.stroke ?? this.dialog.theme?.stroke ?? '#5e321b',
      alpha: 0.22,
      width: 1,
    });
    this.profile.position.set(COMPACT_AVATAR_SIZE / 2 + 2, height / 2);
    this.profile.scale.set(COMPACT_AVATAR_SIZE / PLAYER_PROFILE_SIZE);
    const actions = [this.primary, this.secondary].filter((button) => button.visible);
    const actionWidth = actions.length > 1 ? 58 : 66;
    const actionsWidth = actions.length * actionWidth + Math.max(0, actions.length - 1) * ACTION_GAP;
    const actionStartX = width - actionsWidth;
    actions.forEach((button, index) => {
      button.position.set(actionStartX + index * (actionWidth + ACTION_GAP), (height - ACTION_HEIGHT) / 2);
      button.setSize(actionWidth, ACTION_HEIGHT);
    });
    const copyX = COMPACT_AVATAR_SIZE + 10;
    const copyRight = actions.length > 0 ? actionStartX - 6 : width;
    this.name.position.set(copyX, 9);
    this.name.style.wordWrap = true;
    this.name.style.wordWrapWidth = Math.max(40, copyRight - copyX);
    this.detail.position.set(copyX, 29);
    this.detail.style.wordWrap = true;
    this.detail.style.wordWrapWidth = Math.max(40, copyRight - copyX);
    this.status.position.set(width, height / 2);
    this.status.visible = actions.length === 0 && Boolean(this.status.text);
    this.status.renderable = this.status.visible;
  }

  layoutFriendCard(width, height) {
    this.paper.position.set(0, 0);
    this.paper.setSize(
      width,
      height,
      PIXI_ROOT_RUN_GEOMETRY.dialog.paperBorderInsets,
    );
    this.divider.clear();
    this.divider.visible = false;
    this.divider.renderable = false;

    const copyX =
      FRIEND_ROW_INSET_X + FRIEND_AVATAR_SIZE + FRIEND_ROW_COPY_GAP;
    this.profile.position.set(
      FRIEND_ROW_INSET_X + FRIEND_AVATAR_SIZE / 2,
      height / 2,
    );
    this.profile.scale.set(FRIEND_AVATAR_SIZE / PLAYER_PROFILE_SIZE);

    const actions = [this.primary, this.secondary].filter(
      (button) => button.visible,
    );
    const actionX = width - FRIEND_ROW_ACTION_INSET - FRIEND_ROW_ACTION_WIDTH;
    actions.forEach((button, index) => {
      const actionY =
        actions.length > 1
          ? 14 + index * (ACTION_HEIGHT + 10)
          : (height - ACTION_HEIGHT) / 2;
      button.position.set(actionX, actionY);
      button.setSize(FRIEND_ROW_ACTION_WIDTH, ACTION_HEIGHT);
    });
    const copyRight = actions.length > 0 ? actionX - 6 : width - 16;
    const copyWidth = Math.max(40, copyRight - copyX);

    this.allianceTag.position.set(copyX, 14);
    this.name.position.set(
      copyX +
        (this.allianceTag.text
          ? Math.ceil(this.allianceTag.width) + 4
          : 0),
      14,
    );
    this.name.style.wordWrap = false;
    this.name.style.wordWrapWidth = copyWidth;
    this.detail.position.set(copyX, 38);
    this.detail.style.wordWrap = false;
    this.detail.style.wordWrapWidth = copyWidth;
    this.preview.position.set(copyX, 61);
    this.preview.style.wordWrap = false;
    this.preview.style.wordWrapWidth = copyWidth;
    this.status.position.set(width - 16, height / 2);
    this.status.visible =
      actions.length === 0 &&
      this.status.text.length > 0 &&
      this.preview.text.length === 0;
    this.status.renderable = this.status.visible;
    this.notificationDot.position.set(width - 18, 28);
  }

  getPreferredHeight() {
    return this.usesFriendCard ? FRIEND_ROW_HEIGHT : COMPACT_ROW_HEIGHT;
  }

  applyTheme(theme) {
    applyTextTheme(this.name, theme, RETAINED_TEXT_STYLES.bold);
    applyTextTheme(
      this.detail,
      theme,
      this.usesFriendCard
        ? RETAINED_TEXT_STYLES.border
        : {
            ...RETAINED_TEXT_STYLES.border,
            fill: theme?.muted,
          },
    );
    applyTextTheme(this.preview, theme, RETAINED_TEXT_STYLES.border);
    applyTextTheme(this.allianceTag, theme, RETAINED_TEXT_STYLES.bold);
    this.allianceTag.style.fill = resolveAllianceTagColor(
      this.model?.allianceTagColor,
    );
    applyTextTheme(this.status, theme, {
      ...RETAINED_TEXT_STYLES.border,
      align: 'right',
      fill: theme?.muted,
    });
    this.primary.applyTheme(theme);
    this.secondary.applyTheme(theme);
  }

  reset() {
    this.model = null;
    this.root.visible = false;
    this.root.renderable = false;
    this.notificationBadge.setActive(false);
  }

  destroy() {
    this.registration?.unregister?.();
    this.primary.destroy();
    this.secondary.destroy();
    this.root.destroy({ children: true });
  }
}

function resolvePaperTexture(dialog) {
  try {
    return (
      dialog.panel?.paperFrame?.texture ??
      dialog.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.dialogPaper) ??
      Texture.EMPTY
    );
  } catch {
    return Texture.EMPTY;
  }
}

function normalizeAllianceTag(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 5);
}

function resolveAllianceTagColor(value) {
  const colorId = String(value ?? '')
    .trim()
    .toLowerCase();
  return FRIEND_TAG_COLORS[colorId] ?? FRIEND_TAG_COLORS.ink;
}

function resolveCharacterTexture(assetManager, character) {
  try {
    return (
      assetManager?.getTexture?.(`source:assets/avatars/${character || 'elara'}.png`) ??
      assetManager?.getTexture?.('source:assets/avatars/elara.png') ??
      Texture.EMPTY
    );
  } catch {
    return Texture.EMPTY;
  }
}
