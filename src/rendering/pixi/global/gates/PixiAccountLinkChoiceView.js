import { Container } from 'pixi.js';

import {
  DEFAULT_PLAYER_CHARACTER,
  normalizePlayerCharacter,
} from '../../../../player/playerCharacters.js';
import {
  DEFAULT_PLAYER_FRAME,
  getPlayerFrameTint,
  normalizePlayerFrame,
} from '../../../../player/playerFrames.js';
import {
  createDialogPaperSection,
  PixiButton,
  PixiModalSurface,
  PixiResourceLabel,
  PixiTextLabel,
  resolveDialogPaperOutsets,
  setDialogPaperSectionBounds,
} from '../../primitives/index.js';
import {
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
} from '../../primitives/PixiDialogFrame.js';
import {
  PIXI_UI_GEOMETRY,
  resolvePixiTextStrokeWidth,
} from '../../theme/PixiThemeTokens.js';
import {
  ROOT_RUN_TOP_HUD_GEOMETRY,
  RootRunHudAvatarButton,
} from '../chrome/RootRunTopHudWidgets.js';

const CONTENT_WIDTH = 260;
const SECTION_HEIGHT = 80;
const ROW_INSET_X = 8;
const SECTION_LABEL_Y = 6;
const ACCOUNT_DETAILS_X = 66;
const DEVICE_LEVEL_Y = 28;
const ACCOUNT_LEVEL_Y = 25;
const CURRENCY_Y = 51;
const ACTION_RIGHT = 8;
const ACTION_WIDTH = 72;
const ACTION_HEIGHT = 42;
const ACTION_X = CONTENT_WIDTH - ACTION_RIGHT - ACTION_WIDTH;
const ACTION_Y = (SECTION_HEIGHT - ACTION_HEIGHT) / 2;
const CURRENCY_RIGHT = ACTION_X - 8;
const CURRENCY_MIN_GAP = 4;
const ROW_DATA_FONT_SIZE = 12;
const CURRENCY_FONT_SIZE = 11;
const ACCOUNT_AVATAR_SCALE = 0.27;
const ACCOUNT_AVATAR_Y =
  (SECTION_HEIGHT -
    ROOT_RUN_TOP_HUD_GEOMETRY.avatarSize * ACCOUNT_AVATAR_SCALE) /
  2;
const WOOD_WARNING_GAP = 8;
const WOOD_WARNING_BOTTOM_GAP = 2;
const WOOD_WARNING_COLOR = '#fff4dc';
const WOOD_WARNING_STROKE = '#0a0a0a';

export class PixiAccountLinkChoiceView extends PixiModalSurface {
  constructor({ assets, inputRouter } = {}) {
    super({
      assetManager: assets,
      title: 'Account Data',
      contentWidth: CONTENT_WIDTH,
      contentHeight: 206,
      backdropAlpha: 0.68,
      inputRouter,
      modalId: 'gate.accountLinkChoice',
      label: 'accountLinkChoice',
    });
    this.assets = assets;
    this.preferredLayer = 'interactionLocks';
    this.panel.setPaperVisible(false);
    this.deviceSection = createDialogPaperSection(
      this.panel.paperFrame.texture,
      'accountLinkChoice:deviceSection',
    );
    this.accountSection = createDialogPaperSection(
      this.panel.paperFrame.texture,
      'accountLinkChoice:accountSection',
    );
    this.accountAvatar = new RootRunHudAvatarButton({
      assets,
      texture: this.getCharacterTexture(DEFAULT_PLAYER_CHARACTER),
    });
    this.accountAvatar
      .setEnabled(false)
      .setFrameTint(getPlayerFrameTint(DEFAULT_PLAYER_FRAME));
    this.accountAvatar.scale.set(ACCOUNT_AVATAR_SCALE);
    this.deviceRow = createChoiceRow({
      assets,
      inputRouter,
      label: 'This Device',
      objectLabel: 'accountLinkChoice:device',
    });
    this.accountRow = createChoiceRow({
      assets,
      inputRouter,
      label: 'Wizard',
      objectLabel: 'accountLinkChoice:account',
      avatar: this.accountAvatar,
      useUsernameAsLabel: true,
    });
    this.warning = new PixiTextLabel({
      text: 'The Progress You Do Not Select Will Be Lost',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      color: WOOD_WARNING_COLOR,
      stroke: {
        color: WOOD_WARNING_STROKE,
        width: resolvePixiTextStrokeWidth(
          PIXI_UI_GEOMETRY.borderLabelFontSize,
        ),
      },
      anchor: { x: 0.5, y: 0.5 },
      align: 'center',
      wordWrap: true,
      wrapWidth: CONTENT_WIDTH - 8,
      label: 'accountLinkChoice:warning',
    });
    this.panel.content.addChild(
      this.deviceSection,
      this.accountSection,
      this.deviceRow.root,
      this.accountRow.root,
      this.warning,
    );
    this.relayoutContent();
  }

  onBind(model = {}) {
    bindChoiceRow(this.deviceRow, model.device);
    bindChoiceRow(this.accountRow, model.account);
    const accountCharacter = normalizePlayerCharacter(
      model.account?.character,
    );
    const accountFrame = normalizePlayerFrame(model.account?.frame);
    this.accountAvatar
      .setTexture(
        this.getCharacterTexture(accountCharacter),
      )
      .setFrameTint(getPlayerFrameTint(accountFrame));
    this.relayoutContent();
    this.deviceRow.button
      .setEnabled(true)
      .setAction(model.onSelectDevice ?? null);
    this.accountRow.button
      .setEnabled(true)
      .setAction(model.onSelectAccount ?? null);
    this.show();
  }

  onApplyTheme(theme) {
    super.onApplyTheme(theme);
    const contentTheme =
      this.panel.getContentTheme?.() ?? theme;
    for (const item of [
      this.deviceRow.label,
      this.deviceRow.level,
      this.deviceRow.coin,
      this.deviceRow.crystal,
      this.deviceRow.emerald,
      this.deviceRow.ruby,
      this.deviceRow.button,
      this.accountRow.label,
      this.accountRow.level,
      this.accountRow.coin,
      this.accountRow.crystal,
      this.accountRow.emerald,
      this.accountRow.ruby,
      this.accountRow.button,
    ]) {
      item.applyTheme(contentTheme);
    }
    setCurrencyTextColor(this.deviceRow, contentTheme.text);
    setCurrencyTextColor(this.accountRow, contentTheme.text);
    this.accountAvatar.applyTheme(theme);
    this.warning.applyTheme(theme);
    this.warning
      .setColor(WOOD_WARNING_COLOR)
      .setStroke({
        color: WOOD_WARNING_STROKE,
        width: resolvePixiTextStrokeWidth(
          PIXI_UI_GEOMETRY.borderLabelFontSize,
        ),
      });
    this.relayoutContent();
  }

  relayoutContent() {
    const paperOutsets = resolveDialogPaperOutsets(
      this.panel.contentInsets,
    );
    const deviceY = 0;
    const accountY =
      SECTION_HEIGHT +
      paperOutsets.bottom +
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap +
      paperOutsets.top;
    const accountPaperBottom =
      accountY + SECTION_HEIGHT + paperOutsets.bottom;
    const warningY =
      accountPaperBottom +
      WOOD_WARNING_GAP +
      this.warning.measuredHeight / 2;
    const contentHeight =
      warningY +
      this.warning.measuredHeight / 2 +
      WOOD_WARNING_BOTTOM_GAP;

    this.panel.setContentBoxSize(
      CONTENT_WIDTH,
      contentHeight,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    setDialogPaperSectionBounds(
      this.deviceSection,
      {
        x: 0,
        y: deviceY,
        width: CONTENT_WIDTH,
        height: SECTION_HEIGHT,
      },
      paperOutsets,
    );
    setDialogPaperSectionBounds(
      this.accountSection,
      {
        x: 0,
        y: accountY,
        width: CONTENT_WIDTH,
        height: SECTION_HEIGHT,
      },
      paperOutsets,
    );
    this.deviceRow.root.position.set(0, deviceY);
    this.accountRow.root.position.set(0, accountY);
    layoutDeviceRow(this.deviceRow);
    layoutAccountRow(this.accountRow);
    this.warning.position.set(CONTENT_WIDTH / 2, warningY);
    this.panel.pivot.set(
      this.panel.outerWidth / 2,
      this.panel.outerHeight / 2,
    );
  }

  getCharacterTexture(character) {
    const resolvedCharacter = normalizePlayerCharacter(character);
    const assetId = `source:assets/avatars/${resolvedCharacter}.png`;
    try {
      return this.assets.getTexture(assetId);
    } catch {
      return this.assets.getTexture(
        `source:assets/avatars/${DEFAULT_PLAYER_CHARACTER}.png`,
      );
    }
  }
}

function createChoiceRow({
  assets,
  inputRouter,
  label,
  objectLabel,
  avatar = null,
  useUsernameAsLabel = false,
}) {
  const root = new Container();
  root.label = objectLabel;
  const labelView = new PixiTextLabel({
    text: label,
    fontWeight: 'bold',
    label: `${objectLabel}:label`,
  });
  const level = new PixiTextLabel({
    text: 'Level 1',
    fontSize: ROW_DATA_FONT_SIZE,
    label: `${objectLabel}:level`,
  });
  const coin = new PixiResourceLabel({
    assetManager: assets,
    resource: 'coin',
    amount: '0',
    fontSize: CURRENCY_FONT_SIZE,
    includeResourceName: false,
    label: `${objectLabel}:coin`,
  });
  const crystal = new PixiResourceLabel({
    assetManager: assets,
    resource: 'crystal',
    amount: '0',
    fontSize: CURRENCY_FONT_SIZE,
    includeResourceName: false,
    label: `${objectLabel}:crystal`,
  });
  const emerald = new PixiResourceLabel({
    assetManager: assets,
    resource: 'emerald',
    amount: '0',
    fontSize: CURRENCY_FONT_SIZE,
    includeResourceName: false,
    label: `${objectLabel}:emerald`,
  });
  const ruby = new PixiResourceLabel({
    assetManager: assets,
    resource: 'ruby',
    amount: '0',
    fontSize: CURRENCY_FONT_SIZE,
    includeResourceName: false,
    label: `${objectLabel}:ruby`,
  });
  const button = new PixiButton({
    assetManager: assets,
    inputRouter,
    text: 'Select',
    width: ACTION_WIDTH,
    height: ACTION_HEIGHT,
    variant: 'yellow',
    label: `${objectLabel}:select`,
  });
  root.addChild(
    labelView,
    ...(avatar ? [avatar] : []),
    level,
    coin,
    crystal,
    emerald,
    ruby,
    button,
  );
  return {
    root,
    label: labelView,
    avatar,
    username: useUsernameAsLabel ? labelView : null,
    level,
    coin,
    crystal,
    emerald,
    ruby,
    button,
  };
}

function bindChoiceRow(row, model = {}) {
  row.username?.setText(normalizeUsername(model?.username));
  row.level.setText(`Level ${normalizeLevel(model?.level)}`);
  row.coin.setAmount(formatCompactNumber(model?.coin));
  row.crystal.setAmount(formatCompactNumber(model?.crystal));
  row.emerald.setAmount(formatCompactNumber(model?.emerald));
  row.ruby.setAmount(formatCompactNumber(model?.ruby));
}

function layoutDeviceRow(row) {
  row.label.position.set(ROW_INSET_X, SECTION_LABEL_Y);
  row.level.position.set(ROW_INSET_X, DEVICE_LEVEL_Y);
  layoutCurrencies(row, ROW_INSET_X);
  row.button.position.set(ACTION_X, ACTION_Y);
}

function layoutAccountRow(row) {
  row.label.position.set(ACCOUNT_DETAILS_X, SECTION_LABEL_Y);
  row.avatar.position.set(ROW_INSET_X, ACCOUNT_AVATAR_Y);
  row.level.position.set(ACCOUNT_DETAILS_X, ACCOUNT_LEVEL_Y);
  layoutCurrencies(row, ACCOUNT_DETAILS_X);
  row.button.position.set(ACTION_X, ACTION_Y);
}

function layoutCurrencies(row, startX) {
  const currencies = getCurrencies(row);
  for (const currency of currencies) {
    currency.scale.set(1);
  }
  const totalWidth = currencies.reduce(
    (width, currency) => width + currency.measuredWidth,
    0,
  );
  const laneWidth = CURRENCY_RIGHT - startX;
  const minimumGapWidth =
    CURRENCY_MIN_GAP * (currencies.length - 1);
  const scale = Math.min(
    1,
    (laneWidth - minimumGapWidth) / totalWidth,
  );
  const gap =
    (laneWidth - totalWidth * scale) /
    (currencies.length - 1);
  let x = startX;
  for (const currency of currencies) {
    currency.scale.set(scale);
    currency.position.set(x, CURRENCY_Y);
    x += currency.measuredWidth * scale + gap;
  }
}

function setCurrencyTextColor(row, color) {
  for (const currency of getCurrencies(row)) {
    currency.amountLabel.setColor(color);
  }
}

function getCurrencies(row) {
  return [row.coin, row.crystal, row.emerald, row.ruby];
}

function normalizeUsername(value) {
  const username = String(value ?? '').replace(/\s+/g, ' ').trim();
  return username || 'Wizard';
}

function normalizeLevel(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

function formatCompactNumber(value) {
  const number = Math.max(0, Math.floor(Number(value) || 0));
  if (number < 1_000) {
    return String(number);
  }
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(number).toLowerCase();
}
