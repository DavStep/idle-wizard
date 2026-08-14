import {
  Texture,
} from 'pixi.js';

import {
  PixiTextButton,
  PixiNineSliceFrame,
  PixiResourceLabel,
  PixiStarLevelLabel,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { RootRunAvatarWidget } from '../chrome/RootRunTopHudWidgets.js';
import { RetainedGlobalDialog } from './GlobalDialogKit.js';

const PLAYER_CONTENT_WIDTH = 260;
const PORTRAIT_SIZE = 72;
const SUMMARY_GAP = 12;
const SUMMARY_HEIGHT = 72;
const STATS_GAP = 8;
const STATS_HEIGHT = 70;
const STATS_PADDING_X = 10;
const STATS_PADDING_Y = 8;
const STATS_ROW_PITCH = 18;
const PLAYER_CONTENT_HEIGHT = SUMMARY_HEIGHT + STATS_GAP + STATS_HEIGHT;

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
    this.statsFrame = new PixiNineSliceFrame({
      texture: this.context.assets.getTexture(
        PIXI_ROOT_RUN_ASSETS.innerSectionPanelWhite,
      ),
      sourceInsets:
        PIXI_ROOT_RUN_GEOMETRY.innerSectionPanelWhite.sourceInsets,
      borderInsets:
        PIXI_ROOT_RUN_GEOMETRY.innerSectionPanelWhite.borderInsets,
      width: PLAYER_CONTENT_WIDTH,
      height: STATS_HEIGHT,
      label: `${dialogId}:statsFrame`,
    });
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
    this.avatarWidget.position.set(0, 0);
    this.avatarWidget.scale.set(PORTRAIT_SIZE / 186);

    let nameX = detailsX;
    if (this.allianceButton.visible) {
      const allianceWidth = Math.ceil(
        this.allianceButton.textLabel.measuredWidth,
      );
      this.allianceButton.position.set(detailsX, 0);
      this.allianceButton.setSize(allianceWidth, 18);
      this.allianceButton.textLabel.position.set(0, 9);
      nameX += allianceWidth + 4;
    }
    this.name.position.set(nameX, 1);
    this.name.setWrapWidth(
      Math.max(0, PLAYER_CONTENT_WIDTH - nameX),
    );

    this.levelLabel.position.set(detailsX, 25);
    this.levelValue.position.set(rightX, 25);
    this.prestigeLabel.position.set(detailsX, 47);
    this.prestigeStars.position.set(
      rightX - this.prestigeStars.measuredWidth,
      47,
    );

    const statsY = SUMMARY_HEIGHT + STATS_GAP;
    const statsRightX = rightX - STATS_PADDING_X;
    this.statsFrame.position.set(0, statsY);
    this.statsFrame.setSize(PLAYER_CONTENT_WIDTH, STATS_HEIGHT);
    this.totalCoinLabel.position.set(
      STATS_PADDING_X,
      statsY + STATS_PADDING_Y,
    );
    this.totalCoinValue.position.set(
      statsRightX - this.totalCoinValue.measuredWidth,
      statsY + STATS_PADDING_Y,
    );
    this.totalPotionsLabel.position.set(
      STATS_PADDING_X,
      statsY + STATS_PADDING_Y + STATS_ROW_PITCH,
    );
    this.totalPotionsValue.position.set(
      statsRightX,
      statsY + STATS_PADDING_Y + STATS_ROW_PITCH,
    );
    this.totalHerbsLabel.position.set(
      STATS_PADDING_X,
      statsY + STATS_PADDING_Y + STATS_ROW_PITCH * 2,
    );
    this.totalHerbsValue.position.set(
      statsRightX,
      statsY + STATS_PADDING_Y + STATS_ROW_PITCH * 2,
    );
    this.levelLabel.setWrapWidth(
      Math.max(
        0,
        detailsWidth - this.levelValue.measuredWidth - 6,
      ),
    );
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
    this.layoutDialog();
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
