import {
  Graphics,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  PixiButton,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { RetainedGlobalDialog } from './GlobalDialogKit.js';

const PLAYER_CONTENT_WIDTH = 260;
const PORTRAIT_SIZE = 72;
const SUMMARY_GAP = 12;

/**
 * Retained public player card. It consumes a renderer-neutral player snapshot
 * and delegates alliance navigation without subscribing to gameplay itself.
 */
export class PixiPlayerInfoDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.player' } = {}) {
    super({
      context,
      dialogId,
      title: 'player info',
      contentWidth: PLAYER_CONTENT_WIDTH,
      contentHeight: 108,
      placement: 'center',
      label: `${dialogId}:playerInfoDialog`,
    });
    this.character = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
      label: `${dialogId}:character`,
    });
    this.character.width = PORTRAIT_SIZE;
    this.character.height = PORTRAIT_SIZE;
    this.name = new PixiTextLabel({
      label: `${dialogId}:name`,
    });
    this.allianceButton = new PixiButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.alliance`,
      text: '',
      width: 40,
      height: 18,
      action: () => this.openAlliance(),
      label: `${dialogId}:alliance`,
    });
    this.allianceButton.frame.visible = false;
    this.allianceButton.frame.renderable = false;
    this.allianceButton.textLabel.setAnchor(0, 0.5);
    this.levelLabel = new PixiTextLabel({
      text: 'level',
      label: `${dialogId}:levelLabel`,
    });
    this.levelValue = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${dialogId}:levelValue`,
    });
    this.prestigeLabel = new PixiTextLabel({
      text: 'prestige',
      label: `${dialogId}:prestigeLabel`,
    });
    this.prestigeValue = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${dialogId}:prestigeValue`,
    });
    this.divider = new Graphics();
    this.divider.label = `${dialogId}:divider`;
    this.totalLabel = new PixiTextLabel({
      text: 'total produced coin',
      label: `${dialogId}:totalLabel`,
    });
    this.totalValue = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${dialogId}:totalValue`,
    });
    this.loadingLabel = new PixiTextLabel({
      text: 'loading player info',
      color: 'muted',
      label: `${dialogId}:loading`,
    });
    this.panel.content.addChild(
      this.character,
      this.allianceButton,
      this.name,
      this.levelLabel,
      this.levelValue,
      this.prestigeLabel,
      this.prestigeValue,
      this.divider,
      this.totalLabel,
      this.totalValue,
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
      this.character,
      this.allianceButton,
      this.name,
      this.levelLabel,
      this.levelValue,
      this.prestigeLabel,
      this.prestigeValue,
      this.divider,
      this.totalLabel,
      this.totalValue,
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

    this.character.texture = getCharacterTexture(
      this.context.assets,
      this.playerModel.character,
    );
    this.name.setText(this.playerModel.username);
    this.levelValue.setText(this.playerModel.playerLevel);
    this.prestigeValue.setText(this.playerModel.prestige);
    this.totalValue.setText(this.playerModel.totalProducedCoin);
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
    this.setPanelContentSize(PLAYER_CONTENT_WIDTH, 108);
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
    this.character.position.set(0, 0);
    this.character.width = PORTRAIT_SIZE;
    this.character.height = PORTRAIT_SIZE;

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
    this.prestigeLabel.position.set(detailsX, 45);
    this.prestigeValue.position.set(rightX, 45);

    this.divider
      .clear()
      .moveTo(0, 82)
      .lineTo(PLAYER_CONTENT_WIDTH, 82)
      .stroke({ color: this.theme.stroke, width: 1 });
    this.totalLabel.position.set(0, 89);
    this.totalValue.position.set(rightX, 89);
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
      this.prestigeValue,
      this.totalLabel,
      this.totalValue,
      this.loadingLabel,
    ]) {
      label?.applyTheme(theme);
    }
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
    prestige: `${prestigeCount} ${
      prestigeCount === 1 ? 'time' : 'times'
    }`,
    totalProducedCoin: String(
      nonNegativeInteger(
        source.totalProducedCoin ??
          source.totalGeneratedCoin ??
          source.totalIncome,
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
