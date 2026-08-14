import {
  Texture,
} from 'pixi.js';

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
import {
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { normalizeTradeAllianceTagColor } from '../../../../shared/tradeAllianceTagColors.js';
import { RootRunAvatarWidget } from '../chrome/RootRunTopHudWidgets.js';
import { RetainedGlobalDialog } from './GlobalDialogKit.js';

const PLAYER_CONTENT_WIDTH = 260;
const PORTRAIT_SIZE = 72;
const SUMMARY_GAP = 12;
const SUMMARY_PADDING_TOP = 7;
const SUMMARY_PADDING_BOTTOM = 5;
const SUMMARY_HEIGHT =
  SUMMARY_PADDING_TOP + PORTRAIT_SIZE + SUMMARY_PADDING_BOTTOM;
const DETAIL_ROW_PITCH = 18;
const STATS_HEIGHT =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop +
  54 +
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
const STATS_PADDING_X = 10;
const STATS_PADDING_Y =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
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
    this.avatarWidget = new RootRunAvatarWidget({
      assets: this.context.assets,
      texture: Texture.EMPTY,
      label: `${dialogId}:avatarWidget`,
    });
    this.avatarWidget.scale.set(PORTRAIT_SIZE / 186);
    this.character = this.avatarWidget.portrait;
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
    this.loadingLabel = new PixiTextLabel({
      text: 'Loading Player Info',
      color: 'muted',
      label: `${dialogId}:loading`,
    });
    this.panel.content.addChild(
      this.summaryFrame,
      this.statsFrame,
      this.avatarWidget,
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
      this.loadingLabel,
    );
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel) {
    this.playerModel = normalizePlayerModel(viewModel);
    const loading = this.playerModel.loading;
    for (const object of [
      this.summaryFrame,
      this.avatarWidget,
      this.allianceButton,
      this.name,
      this.levelLabel,
      this.levelValue,
      this.prestigeLabel,
      this.prestigeStars,
      this.statsFrame,
      this.totalCoinLabel,
      this.totalCoinValue,
      this.totalPotionsLabel,
      this.totalPotionsValue,
      this.totalHerbsLabel,
      this.totalHerbsValue,
    ]) {
      object.visible = !loading;
      object.renderable = !loading;
    }
    this.loadingLabel.visible = loading;
    this.loadingLabel.renderable = loading;
    this.panel.setPaperVisible(loading);

    if (loading) {
      this.setPanelContentSize(PLAYER_CONTENT_WIDTH, 20);
      return;
    }

    this.avatarWidget.setTexture(
      getCharacterTexture(
        this.context.assets,
        this.playerModel.character,
      ),
    );
    this.name.setText(this.playerModel.username);
    this.levelValue.setText(this.playerModel.playerLevel);
    this.prestigeStars.setLevel(this.playerModel.prestigeCount);
    this.totalCoinValue.setAmount(this.playerModel.totalProducedCoin);
    this.totalPotionsValue.setText(this.playerModel.totalBrewedPotions);
    this.totalHerbsValue.setText(this.playerModel.totalHarvestedHerbs);
    const showAlliance = Boolean(this.playerModel.allianceTag);
    this.allianceButton.visible = showAlliance;
    this.allianceButton.renderable = showAlliance;
    this.allianceButton
      .setText(
        showAlliance
          ? `[${this.playerModel.allianceTag}]`
          : '',
      )
      .setEnabled(
        showAlliance &&
          Boolean(
            this.actions.openAlliance ??
              this.model.onOpenAlliance,
          ),
      );
    this.applyAllianceTagColor();
    this.setPanelContentSize(PLAYER_CONTENT_WIDTH, PLAYER_CONTENT_HEIGHT);
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
    if (!this.playerModel) {
      return;
    }
    if (this.playerModel.loading) {
      this.loadingLabel.position.set(0, 0);
      return;
    }
    const rightX = PLAYER_CONTENT_WIDTH;
    const detailsX = PORTRAIT_SIZE + SUMMARY_GAP;
    const detailsWidth = PLAYER_CONTENT_WIDTH - detailsX;
    const paperOutsets = resolveDialogPaperOutsets(
      this.panel.contentInsets,
    );
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

    this.avatarWidget.position.set(0, SUMMARY_PADDING_TOP);
    this.avatarWidget.scale.set(PORTRAIT_SIZE / 186);

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
    this.name.setWrapWidth(
      Math.max(0, PLAYER_CONTENT_WIDTH - nameX),
    );

    const levelY = SUMMARY_PADDING_TOP + 1 + DETAIL_ROW_PITCH;
    const prestigeY = levelY + DETAIL_ROW_PITCH;
    this.levelLabel.position.set(detailsX, levelY);
    this.levelValue.position.set(rightX, levelY);
    this.prestigeLabel.position.set(detailsX, prestigeY);
    this.prestigeStars.position.set(
      rightX - this.prestigeStars.measuredWidth,
      prestigeY,
    );

    const statsRightX = rightX - STATS_PADDING_X;
    this.totalCoinLabel.position.set(
      STATS_PADDING_X,
      STATS_Y + STATS_PADDING_Y,
    );
    this.totalCoinValue.position.set(
      statsRightX - this.totalCoinValue.measuredWidth,
      STATS_Y + STATS_PADDING_Y,
    );
    this.totalPotionsLabel.position.set(
      STATS_PADDING_X,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH,
    );
    this.totalPotionsValue.position.set(
      statsRightX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH,
    );
    this.totalHerbsLabel.position.set(
      STATS_PADDING_X,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH * 2,
    );
    this.totalHerbsValue.position.set(
      statsRightX,
      STATS_Y + STATS_PADDING_Y + STATS_ROW_PITCH * 2,
    );
    this.levelLabel.setWrapWidth(
      Math.max(
        0,
        detailsWidth - this.levelValue.measuredWidth - 6,
      ),
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
      this.loadingLabel,
    ]) {
      label?.applyTheme(theme);
    }
    this.totalCoinValue?.applyTheme({
      ...theme,
      iconMode: 'icons',
    });
    this.allianceButton?.applyTheme(theme);
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
    Boolean(model.loading ?? source.loading) ||
    source.state === 'loading';
  const prestigeCount = nonNegativeInteger(
    source.prestigeCount ?? source.prestige,
    0,
  );
  return {
    loading,
    identity: String(source.identity ?? ''),
    username: String(
      source.username ?? source.name ?? '',
    ).trim(),
    allianceId: String(
      source.allianceId ?? source.alliance_id ?? '',
    ),
    allianceName: String(
      source.allianceName ?? source.alliance_name ?? '',
    ),
    allianceTag: normalizeTag(
      source.allianceTag ?? source.alliance_tag,
    ),
    allianceTagColor:
      source.allianceTagColor ?? source.alliance_tag_color ?? '',
    character: String(source.character ?? 'elara'),
    playerLevel: String(
      positiveInteger(
        source.playerLevel ?? source.level,
        1,
      ),
    ),
    prestigeCount,
    totalProducedCoin: String(
      nonNegativeInteger(
        source.totalProducedCoin ??
          source.totalGeneratedCoin ??
          source.totalIncome,
        0,
      ),
    ),
    totalBrewedPotions: String(
      nonNegativeInteger(
        source.totalBrewedPotions ?? source.total_brewed_potions,
        0,
      ),
    ),
    totalHarvestedHerbs: String(
      nonNegativeInteger(
        source.totalHarvestedHerbs ?? source.total_harvested_herbs,
        0,
      ),
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
  return Number.isFinite(number) && number >= 1
    ? number
    : fallback;
}

function nonNegativeInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0
    ? number
    : fallback;
}

function getCharacterTexture(assetManager, key) {
  try {
    return (
      assetManager?.getTexture?.(
        `source:assets/avatars/${key}.png`,
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
