import { Texture } from 'pixi.js';

import {
  createDialogPaperSection,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  PixiTextButton,
  PixiResourceLabel,
  PixiStarLevelLabel,
  PixiTextLabel,
  resolveDialogPaperOutsets,
  setDialogPaperSectionBounds,
} from '../../primitives/index.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';
import { formatBigNumber } from '../../../../shared/bigNumber.js';
import { normalizeTradeAllianceTagColor } from '../../../../shared/tradeAllianceTagColors.js';
import { getPlayerFrameTint } from '../../../../player/playerFrames.js';
import { PlayerProfileWidget } from '../chrome/PlayerProfileWidgets.js';
import { RetainedGlobalDialog } from './GlobalDialogKit.js';

const PLAYER_CONTENT_WIDTH = 260;
const PORTRAIT_SIZE = 72;
const SUMMARY_GAP = 12;
const SUMMARY_PADDING_TOP = 7;
const SUMMARY_PADDING_BOTTOM = 5;
const SUMMARY_HEIGHT =
  SUMMARY_PADDING_TOP + PORTRAIT_SIZE + SUMMARY_PADDING_BOTTOM;
const DETAIL_ROW_PITCH = 18;
const SECTION_CONTENT_OUTSET_X = PIXI_UI_GEOMETRY.panelPaddingX;
const STATS_HEIGHT =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop +
  90 +
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
const STATS_PADDING_Y = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
const STATS_ROW_PITCH = 18;
const PLAYER_PAPER_OUTSETS = resolveDialogPaperOutsets({
  top: PIXI_UI_GEOMETRY.dialogPadding,
  right: PIXI_UI_GEOMETRY.dialogPadding,
  bottom: PIXI_UI_GEOMETRY.dialogPadding,
  left: PIXI_UI_GEOMETRY.dialogPadding,
});
const STATS_Y =
  SUMMARY_HEIGHT +
  PLAYER_PAPER_OUTSETS.bottom +
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap +
  PLAYER_PAPER_OUTSETS.top;
const PLAYER_CONTENT_HEIGHT = STATS_Y + STATS_HEIGHT;
const COSMETICS_ACTION_GAP = 8;
const COSMETICS_ACTION_HEIGHT = 30;
const COSMETICS_ACTION_SIDE_INSET = 2;
const COSMETICS_ACTION_BOTTOM_INSET = 10;
const COSMETICS_ACTION_X =
  -PLAYER_PAPER_OUTSETS.left + COSMETICS_ACTION_SIDE_INSET;
const COSMETICS_ACTION_WIDTH =
  PLAYER_CONTENT_WIDTH +
  PLAYER_PAPER_OUTSETS.left +
  PLAYER_PAPER_OUTSETS.right -
  COSMETICS_ACTION_SIDE_INSET * 2;
const PLAYER_ACTION_GAP = 6;
const PLAYER_ACTION_HALF_WIDTH =
  (COSMETICS_ACTION_WIDTH - PLAYER_ACTION_GAP) / 2;
const COSMETICS_ACTION_Y =
  PLAYER_CONTENT_HEIGHT +
  PLAYER_PAPER_OUTSETS.bottom +
  COSMETICS_ACTION_GAP;
const OWN_PLAYER_CONTENT_HEIGHT =
  COSMETICS_ACTION_Y +
  COSMETICS_ACTION_HEIGHT -
  (PIXI_UI_GEOMETRY.dialogPadding - COSMETICS_ACTION_BOTTOM_INSET);
const PLAYER_INFO_TAG_COLORS = Object.freeze({
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
 * Retained public player card. It consumes a renderer-neutral player snapshot
 * and delegates alliance navigation without subscribing to gameplay itself.
 */
export class PixiPlayerInfoDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.player' } = {}) {
    super({
      context,
      dialogId,
      title: 'Player Info',
      contentWidth: PLAYER_CONTENT_WIDTH,
      contentHeight: PLAYER_CONTENT_HEIGHT,
      placement: 'center',
      label: `${dialogId}:playerInfoDialog`,
    });
    this.panel.setPaperVisible(false);
    this.summaryFrame = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${dialogId}:summaryFrame`,
    );
    this.profileWidget = new PlayerProfileWidget({
      assets: this.context.assets,
      texture: Texture.EMPTY,
      label: `${dialogId}:profileWidget`,
    });
    this.profileWidget.scale.set(PORTRAIT_SIZE / 186);
    this.character = this.profileWidget.portrait;
    this.name = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${dialogId}:name`,
    });
    this.allianceButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.alliance`,
      text: '',
      width: 40,
      height: 18,
      sizeTier: 15,
      variant: 'text',
      action: () => this.openAlliance(),
      label: `${dialogId}:alliance`,
    });
    this.allianceButton.textLabel.setAnchor(0, 0.5);
    this.levelLabel = new PixiTextLabel({
      text: 'Level',
      label: `${dialogId}:levelLabel`,
    });
    this.levelValue = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${dialogId}:levelValue`,
    });
    this.prestigeLabel = new PixiTextLabel({
      text: 'Prestige',
      label: `${dialogId}:prestigeLabel`,
    });
    this.prestigeStars = new PixiStarLevelLabel({
      assetManager: this.context.assets,
      level: 0,
      size: 12,
      gap: 1,
      label: `${dialogId}:prestigeValue`,
    });
    this.statsFrame = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${dialogId}:statsFrame`,
    );
    this.totalCoinLabel = new PixiTextLabel({
      text: 'Total Produced Coin',
      label: `${dialogId}:totalCoinLabel`,
    });
    this.totalCoinValue = new PixiResourceLabel({
      assetManager: this.context.assets,
      resource: 'coin',
      amount: '0',
      includeResourceName: false,
      label: `${dialogId}:totalCoinValue`,
    });
    this.totalPotionsLabel = new PixiTextLabel({
      text: 'Total Brewed Potions',
      label: `${dialogId}:totalPotionsLabel`,
    });
    this.totalPotionsValue = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${dialogId}:totalPotionsValue`,
    });
    this.totalHerbsLabel = new PixiTextLabel({
      text: 'Total Harvested Herbs',
      label: `${dialogId}:totalHerbsLabel`,
    });
    this.totalHerbsValue = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${dialogId}:totalHerbsValue`,
    });
    this.lastSeenLabel = new PixiTextLabel({
      text: 'Last Seen',
      label: `${dialogId}:lastSeenLabel`,
    });
    this.lastSeenValue = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${dialogId}:lastSeenValue`,
    });
    this.timePlayedLabel = new PixiTextLabel({
      text: 'Time Played',
      label: `${dialogId}:timePlayedLabel`,
    });
    this.timePlayedValue = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${dialogId}:timePlayedValue`,
    });
    this.loadingLabel = new PixiTextLabel({
      text: 'Loading player info',
      anchor: { x: 0.5, y: 0.5 },
      color: 'muted',
      label: `${dialogId}:loading`,
    });
    this.cosmeticsButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.cosmetics`,
      text: 'Cosmetics',
      width: COSMETICS_ACTION_WIDTH,
      height: COSMETICS_ACTION_HEIGHT,
      sizeTier: 50,
      variant: 'yellow',
      action: () => this.openCosmetics(),
      label: `${dialogId}:cosmetics`,
    });
    this.friendsButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.friends`,
      text: 'Friends',
      width: PLAYER_ACTION_HALF_WIDTH,
      height: COSMETICS_ACTION_HEIGHT,
      sizeTier: 50,
      variant: 'yellow',
      action: () => this.openFriends(),
      label: `${dialogId}:friends`,
    });
    this.relationshipPrimaryButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.relationship.primary`,
      text: 'Add Friend',
      width: COSMETICS_ACTION_WIDTH,
      height: COSMETICS_ACTION_HEIGHT,
      sizeTier: 50,
      variant: 'green',
      action: () => this.activateRelationshipPrimary(),
      label: `${dialogId}:relationship:primary`,
    });
    this.relationshipSecondaryButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.relationship.secondary`,
      text: 'Reject',
      width: PLAYER_ACTION_HALF_WIDTH,
      height: COSMETICS_ACTION_HEIGHT,
      sizeTier: 50,
      variant: 'red',
      action: () => this.activateRelationshipSecondary(),
      label: `${dialogId}:relationship:secondary`,
    });
    this.panel.content.addChild(
      this.summaryFrame,
      this.statsFrame,
      this.profileWidget,
      this.allianceButton,
      this.name,
      this.levelLabel,
      this.levelValue,
      this.prestigeLabel,
      this.prestigeStars,
      this.totalCoinLabel,
      this.totalCoinValue,
      this.totalPotionsLabel,
      this.totalPotionsValue,
      this.totalHerbsLabel,
      this.totalHerbsValue,
      this.lastSeenLabel,
      this.lastSeenValue,
      this.timePlayedLabel,
      this.timePlayedValue,
      this.loadingLabel,
      this.cosmeticsButton,
      this.friendsButton,
      this.relationshipPrimaryButton,
      this.relationshipSecondaryButton,
    );
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel) {
    this.playerModel = normalizePlayerModel(viewModel);
    const loading = this.playerModel.loading;
    const showCosmetics = this.playerModel.ownPlayer;
    const showRelationship = !loading && !this.playerModel.ownPlayer;
    for (const object of [
      this.profileWidget,
      this.allianceButton,
      this.name,
      this.levelLabel,
      this.levelValue,
      this.prestigeLabel,
      this.prestigeStars,
      this.totalCoinLabel,
      this.totalCoinValue,
      this.totalPotionsLabel,
      this.totalPotionsValue,
      this.totalHerbsLabel,
      this.totalHerbsValue,
      this.lastSeenLabel,
      this.lastSeenValue,
      this.timePlayedLabel,
      this.timePlayedValue,
    ]) {
      object.visible = !loading;
      object.renderable = !loading;
    }
    this.loadingLabel.visible = loading;
    this.loadingLabel.renderable = loading;
    this.cosmeticsButton.visible = showCosmetics;
    this.cosmeticsButton.renderable = showCosmetics;
    this.cosmeticsButton.setEnabled(
      showCosmetics && Boolean(this.actions.openCosmetics),
    );
    this.friendsButton.visible = showCosmetics;
    this.friendsButton.renderable = showCosmetics;
    this.friendsButton.setEnabled(showCosmetics && Boolean(this.actions.openFriends));
    this.configureRelationshipButtons(showRelationship);
    this.panel.setPaperVisible(false);

    if (loading) {
      this.setPanelContentSize(
        PLAYER_CONTENT_WIDTH,
        this.playerModel.ownPlayer || showRelationship
          ? OWN_PLAYER_CONTENT_HEIGHT
          : PLAYER_CONTENT_HEIGHT,
      );
      this.layoutDialog();
      return;
    }

    this.profileWidget
      .setTexture(
        getCharacterTexture(this.context.assets, this.playerModel.character),
      )
      .setBackgroundTint(getPlayerFrameTint(this.playerModel.frame));
    this.name.setText(this.playerModel.username);
    this.levelValue.setText(this.playerModel.playerLevel);
    this.prestigeStars.setLevel(this.playerModel.prestigeCount);
    this.totalCoinValue.setAmount(this.playerModel.totalProducedCoin);
    this.totalPotionsValue.setText(this.playerModel.totalBrewedPotions);
    this.totalHerbsValue.setText(this.playerModel.totalHarvestedHerbs);
    this.lastSeenValue.setText(
      formatLastSeen(this.playerModel.connected, this.playerModel.lastSeenAtMs),
    );
    this.timePlayedValue.setText(
      formatPlayedHours(this.playerModel.totalPlayTimeSeconds),
    );
    const showAlliance = Boolean(this.playerModel.allianceTag);
    this.allianceButton.visible = showAlliance;
    this.allianceButton.renderable = showAlliance;
    this.allianceButton
      .setText(showAlliance ? `[${this.playerModel.allianceTag}]` : '')
      .setEnabled(
        showAlliance &&
          Boolean(this.actions.openAlliance ?? this.model.onOpenAlliance),
      );
    this.applyAllianceTagColor();
    this.setPanelContentSize(
      PLAYER_CONTENT_WIDTH,
      showCosmetics || showRelationship
        ? OWN_PLAYER_CONTENT_HEIGHT
        : PLAYER_CONTENT_HEIGHT,
    );
    this.layoutDialog();
  }

  openAlliance() {
    const alliance = {
      allianceId: this.playerModel.allianceId,
      name: this.playerModel.allianceName,
      tag: this.playerModel.allianceTag,
      tagColor: this.playerModel.allianceTagColor,
    };
    return (
      this.actions.openAlliance?.(alliance) ??
      this.model.onOpenAlliance?.(alliance) ??
      false
    );
  }

  openCosmetics() {
    return this.actions.openCosmetics?.() ?? false;
  }

  openFriends() {
    return this.actions.openFriends?.() ?? false;
  }

  configureRelationshipButtons(visible) {
    const relationship = this.playerModel?.relationship ?? 'stranger';
    const primary = this.relationshipPrimaryButton;
    const secondary = this.relationshipSecondaryButton;
    primary.visible = visible;
    primary.renderable = visible;
    secondary.visible = visible && relationship === 'incoming';
    secondary.renderable = secondary.visible;
    if (!visible) {
      return;
    }
    const configurations = {
      friend: ['Unfriend', 'red', Boolean(this.actions.unfriend)],
      incoming: ['Accept', 'green', Boolean(this.actions.acceptFriend)],
      outgoing: ['Request Pending', 'gray', false],
      stranger: ['Add Friend', 'green', Boolean(this.actions.addFriend)],
    };
    const [label, variant, enabled] =
      configurations[relationship] ?? configurations.stranger;
    primary.setText(label).setVariant(variant).setEnabled(enabled);
    secondary.setText('Reject').setVariant('red').setEnabled(
      Boolean(this.actions.rejectFriend),
    );
  }

  activateRelationshipPrimary() {
    const relationship = this.playerModel?.relationship ?? 'stranger';
    if (relationship === 'friend') return this.actions.unfriend?.() ?? false;
    if (relationship === 'incoming') return this.actions.acceptFriend?.() ?? false;
    if (relationship === 'stranger') return this.actions.addFriend?.() ?? false;
    return false;
  }

  activateRelationshipSecondary() {
    return this.actions.rejectFriend?.() ?? false;
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

  layoutDialog() {
    if (!this.playerModel) {
      return;
    }
    const leftX = -SECTION_CONTENT_OUTSET_X;
    const rightX = PLAYER_CONTENT_WIDTH + SECTION_CONTENT_OUTSET_X;
    const detailsX = leftX + PORTRAIT_SIZE + SUMMARY_GAP;
    const detailsWidth = rightX - detailsX;
    const paperOutsets = resolveDialogPaperOutsets(this.panel.contentInsets);
    setDialogPaperSectionBounds(
      this.summaryFrame,
      {
        x: 0,
        y: 0,
        width: PLAYER_CONTENT_WIDTH,
        height: SUMMARY_HEIGHT,
      },
      paperOutsets,
    );
    setDialogPaperSectionBounds(
      this.statsFrame,
      {
        x: 0,
        y: STATS_Y,
        width: PLAYER_CONTENT_WIDTH,
        height: STATS_HEIGHT,
      },
      paperOutsets,
    );
    const showOwnActions = this.playerModel.ownPlayer;
    const showTwoRelationshipActions =
      !showOwnActions && this.playerModel.relationship === 'incoming';
    const firstWidth =
      showOwnActions || showTwoRelationshipActions
        ? PLAYER_ACTION_HALF_WIDTH
        : COSMETICS_ACTION_WIDTH;
    this.cosmeticsButton.position.set(COSMETICS_ACTION_X, COSMETICS_ACTION_Y);
    this.cosmeticsButton.setSize(PLAYER_ACTION_HALF_WIDTH, COSMETICS_ACTION_HEIGHT);
    this.friendsButton.position.set(
      COSMETICS_ACTION_X + PLAYER_ACTION_HALF_WIDTH + PLAYER_ACTION_GAP,
      COSMETICS_ACTION_Y,
    );
    this.friendsButton.setSize(PLAYER_ACTION_HALF_WIDTH, COSMETICS_ACTION_HEIGHT);
    this.relationshipPrimaryButton.position.set(COSMETICS_ACTION_X, COSMETICS_ACTION_Y);
    this.relationshipPrimaryButton.setSize(firstWidth, COSMETICS_ACTION_HEIGHT);
    this.relationshipSecondaryButton.position.set(
      COSMETICS_ACTION_X + PLAYER_ACTION_HALF_WIDTH + PLAYER_ACTION_GAP,
      COSMETICS_ACTION_Y,
    );
    this.relationshipSecondaryButton.setSize(
      PLAYER_ACTION_HALF_WIDTH,
      COSMETICS_ACTION_HEIGHT,
    );

    if (this.playerModel.loading) {
      this.loadingLabel.position.set(
        this.summaryFrame.x + this.summaryFrame.frameWidth / 2,
        this.summaryFrame.y + this.summaryFrame.frameHeight / 2,
      );
      return;
    }

    this.profileWidget.position.set(leftX, SUMMARY_PADDING_TOP);
    this.profileWidget.scale.set(PORTRAIT_SIZE / 186);

    let nameX = detailsX;
    if (this.allianceButton.visible) {
      const allianceWidth = Math.ceil(
        this.allianceButton.textLabel.measuredWidth,
      );
      this.allianceButton.position.set(detailsX, SUMMARY_PADDING_TOP);
      this.allianceButton.setSize(allianceWidth, 18);
      this.allianceButton.textLabel.position.set(0, 9);
      nameX += allianceWidth + 4;
    }
    this.name.position.set(nameX, SUMMARY_PADDING_TOP + 1);
    this.name.setWrapWidth(Math.max(0, rightX - nameX));

    const levelY = SUMMARY_PADDING_TOP + 1 + DETAIL_ROW_PITCH;
    const prestigeY = levelY + DETAIL_ROW_PITCH;
    this.levelLabel.position.set(detailsX, levelY);
    this.levelValue.position.set(rightX, levelY);
    this.prestigeLabel.position.set(detailsX, prestigeY);
    this.prestigeStars.position.set(
      rightX - this.prestigeStars.measuredWidth,
      prestigeY,
    );

    const statsRightX = rightX;
    this.totalCoinLabel.position.set(
      leftX,
      STATS_Y + STATS_PADDING_Y,
    );
    this.totalCoinValue.position.set(
      statsRightX - this.totalCoinValue.measuredWidth,
      STATS_Y + STATS_PADDING_Y,
    );
    this.totalPotionsLabel.position.set(
      leftX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH,
    );
    this.totalPotionsValue.position.set(
      statsRightX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH,
    );
    this.totalHerbsLabel.position.set(
      leftX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH * 2,
    );
    this.totalHerbsValue.position.set(
      statsRightX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH * 2,
    );
    this.lastSeenLabel.position.set(
      leftX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH * 3,
    );
    this.lastSeenValue.position.set(
      statsRightX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH * 3,
    );
    this.timePlayedLabel.position.set(
      leftX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH * 4,
    );
    this.timePlayedValue.position.set(
      statsRightX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH * 4,
    );
    this.levelLabel.setWrapWidth(
      Math.max(0, detailsWidth - this.levelValue.measuredWidth - 6),
    );
    this.applyAllianceTagColor();
  }

  applyDialogTheme(theme) {
    for (const label of [
      this.name,
      this.levelLabel,
      this.levelValue,
      this.prestigeLabel,
      this.totalCoinLabel,
      this.totalPotionsLabel,
      this.totalPotionsValue,
      this.totalHerbsLabel,
      this.totalHerbsValue,
      this.lastSeenLabel,
      this.lastSeenValue,
      this.timePlayedLabel,
      this.timePlayedValue,
      this.loadingLabel,
    ]) {
      label?.applyTheme(theme);
    }
    this.totalCoinValue?.applyTheme({
      ...theme,
      iconMode: 'icons',
    });
    this.allianceButton?.applyTheme(theme);
    this.cosmeticsButton?.applyTheme(theme);
    this.friendsButton?.applyTheme(theme);
    this.relationshipPrimaryButton?.applyTheme(theme);
    this.relationshipSecondaryButton?.applyTheme(theme);
    this.applyAllianceTagColor();
    this.layoutDialog();
  }

  applyAllianceTagColor() {
    const colorKey = normalizeTradeAllianceTagColor(
      this.playerModel?.allianceTagColor,
    );
    this.allianceButton?.textLabel.setColor(
      PLAYER_INFO_TAG_COLORS[colorKey] ?? PLAYER_INFO_TAG_COLORS.ink,
    );
  }

  activateDialog() {
    this.actions.activate?.(this.playerModel);
  }

  deactivateDialog() {
    this.actions.deactivate?.(this.playerModel);
  }
}
function normalizePlayerModel(model = {}) {
  const source = model.player ?? model;
  const loading =
    Boolean(model.loading ?? source.loading) || source.state === 'loading';
  const prestigeCount = nonNegativeInteger(
    source.prestigeCount ?? source.prestige,
    0,
  );
  return {
    loading,
    ownPlayer: Boolean(model.ownPlayer ?? source.ownPlayer),
    relationship: String(model.relationship ?? source.relationship ?? 'stranger'),
    identity: String(source.identity ?? ''),
    username: String(source.username ?? source.name ?? '').trim(),
    allianceId: String(source.allianceId ?? source.alliance_id ?? ''),
    allianceName: String(source.allianceName ?? source.alliance_name ?? ''),
    allianceTag: normalizeTag(source.allianceTag ?? source.alliance_tag),
    allianceTagColor:
      source.allianceTagColor ?? source.alliance_tag_color ?? '',
    character: String(source.character ?? 'elara'),
    frame: String(source.frame ?? 'classic'),
    playerLevel: String(positiveInteger(source.playerLevel ?? source.level, 1)),
    prestigeCount,
    totalProducedCoin: formatBigNumber(
      nonNegativeInteger(
        source.totalProducedCoin ??
          source.totalGeneratedCoin ??
          source.totalIncome,
        0,
      ),
    ),
    totalBrewedPotions: formatBigNumber(
      nonNegativeInteger(
        source.totalBrewedPotions ?? source.total_brewed_potions,
        0,
      ),
    ),
    totalHarvestedHerbs: formatBigNumber(
      nonNegativeInteger(
        source.totalHarvestedHerbs ?? source.total_harvested_herbs,
        0,
      ),
    ),
    connected: source.connected === true,
    lastSeenAtMs: nonNegativeNumber(
      source.lastSeenAtMs ?? source.last_seen_at_ms,
      0,
    ),
    totalPlayTimeSeconds: nonNegativeInteger(
      source.totalPlayTimeSeconds ?? source.total_play_time_seconds,
      0,
    ),
  };
}

function normalizeTag(value) {
  return String(value ?? '')
    .replace(/^\[|\]$/g, '')
    .trim()
    .toUpperCase();
}

function positiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 1 ? number : fallback;
}

function nonNegativeInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function formatLastSeen(connected, lastSeenAtMs, nowMs = Date.now()) {
  if (connected) {
    return 'Online Now';
  }

  const timestamp = nonNegativeNumber(lastSeenAtMs, 0);
  if (timestamp <= 0) {
    return 'Unknown';
  }

  const elapsedMinutes = Math.max(0, Math.floor((nowMs - timestamp) / 60_000));
  if (elapsedMinutes < 1) {
    return 'Just Now';
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m Ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 48) {
    return `${elapsedHours}h Ago`;
  }

  return `${Math.floor(elapsedHours / 24)}d Ago`;
}

function formatPlayedHours(totalSeconds) {
  const hours = nonNegativeNumber(totalSeconds, 0) / 3600;
  return `${hours.toLocaleString('en', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} Hours`;
}

function getCharacterTexture(assetManager, key) {
  try {
    return (
      assetManager?.getTexture?.(`source:assets/avatars/${key}.png`) ??
      assetManager?.getTexture?.('source:assets/avatars/elara.png') ??
      Texture.EMPTY
    );
  } catch {
    return Texture.EMPTY;
  }
}
