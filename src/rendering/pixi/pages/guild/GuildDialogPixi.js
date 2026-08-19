import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';

import {
  DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
  TRADE_ALLIANCE_TAG_COLORS,
  normalizeTradeAllianceTagColor,
} from '../../../../shared/tradeAllianceTagColors.js';
import { BasePixiRetainedView } from '../../primitives/BasePixiRetainedView.js';
import { PixiTextButton } from '../../primitives/PixiTextButton.js';
import {
  createDialogPaperSection,
  PIXI_DIALOG_FOOTER_TABS_GEOMETRY,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  PixiDialogFrame,
  resolveAdaptiveDialogHeight,
  resolveDialogPaperOutsets,
  resolveDialogFooterTabLayout,
  setDialogPaperAboveFooterTabs,
  setDialogPaperSectionBounds,
} from '../../primitives/PixiDialogFrame.js';
import { PixiFrame } from '../../primitives/PixiFrame.js';
import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiTextField } from '../../primitives/PixiTextField.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import { PooledCollection } from '../../retained/PooledCollection.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RetainedButton,
  RETAINED_SCROLLBAR_GEOMETRY,
  RetainedScrollArea,
} from '../workshop/RetainedPageKit.js';
import { capitalizeGuildText } from './GuildPageWidgets.js';

export const GUILD_DIALOG_IDS = Object.freeze({
  CHARTER: 'guild.charter',
  SETTINGS: 'guild.settings',
  REQUEST: 'guild.request',
  REQUEST_STACK: 'guild.requestStack',
  ADVENTURER: 'guild.adventurer',
  APPLICANT: 'guild.applicant',
});

const CARD_TABS = Object.freeze([
  Object.freeze({ id: 'stats', label: 'Stats' }),
  Object.freeze({ id: 'life', label: 'Life' }),
  Object.freeze({ id: 'history', label: 'History' }),
]);

const PROFILE_DIALOG_WIDTH = 304;
const CHARTER_DIALOG_WIDTH = 324;
const CARD_DIALOG_WIDTH = 304;
const CARD_DIALOG_HEIGHT = 518;
const REQUEST_DIALOG_WIDTH = 304;
const REQUEST_DIALOG_HEIGHT = 280;
const STACK_DIALOG_WIDTH = 304;
// Keep the Recipes dialog's full-width parchment and pager edge rhythm.
const STACK_PAGE_SIDE_OVERFLOW = 4;
const STACK_PAGE_TOP = 22;
const STACK_PAGE_WIDTH = STACK_DIALOG_WIDTH + STACK_PAGE_SIDE_OVERFLOW * 2;
const STACK_PAGE_HEIGHT = 341;
const STACK_PAGE_CONTENT_INSET = 7;
const STACK_PAGE_ACTION_HEIGHT = 30;
const STACK_PAGE_ACTION_BOTTOM_INSET = 8;
const STACK_PAGER_BUTTON_WIDTH = 72;
const STACK_PAGER_BUTTON_HEIGHT = 28;
const STACK_PAGER_GAP = 4;
const STACK_PAGER_Y = STACK_PAGE_TOP + STACK_PAGE_HEIGHT + STACK_PAGER_GAP;
const STACK_DIALOG_BOTTOM_INSET = 9;
const STACK_DIALOG_HEIGHT =
  STACK_PAGER_Y + STACK_PAGER_BUTTON_HEIGHT + STACK_DIALOG_BOTTOM_INSET;
const GUILD_QUEST_ART_ASSET_IDS = Object.freeze([
  'source:assets/guild/quest-requests.png',
  'source:assets/guild/quest-requests-hillside.png',
  'source:assets/guild/quest-requests-bridge.png',
  'source:assets/guild/quest-requests-village.png',
  'source:assets/guild/quest-requests-road.png',
  'source:assets/guild/quest-requests-mine.png',
  'source:assets/guild/quest-requests-political.png',
  'source:assets/guild/quest-requests-magic.png',
  'source:assets/guild/quest-requests-military.png',
]);
const GUILD_QUEST_ART_RULES = Object.freeze([
  Object.freeze({
    assetId: 'source:assets/guild/quest-requests-bridge.png',
    terms: Object.freeze(['bridge']),
  }),
  Object.freeze({
    assetId: 'source:assets/guild/quest-requests-political.png',
    terms: Object.freeze([
      'political',
      'noble',
      'blackmail',
      'charter',
      'palace',
      'crownless',
      'guarded witness',
      'seal runner',
      'silent contract',
    ]),
  }),
  Object.freeze({
    assetId: 'source:assets/guild/quest-requests-magic.png',
    terms: Object.freeze([
      'magic',
      'research',
      'curse',
      'cursed',
      'mirror',
      'relic',
      'glowcap',
      'marking copy',
    ]),
  }),
  Object.freeze({
    assetId: 'source:assets/guild/quest-requests-mine.png',
    terms: Object.freeze([
      'mine',
      'crypt',
      'dungeon',
      'tunnel',
      'sealed room',
      'lower dark',
      'first stair',
      'lamp run',
    ]),
  }),
  Object.freeze({
    assetId: 'source:assets/guild/quest-requests-road.png',
    terms: Object.freeze([
      'road',
      'trade',
      'courier',
      'escort',
      'convoy',
      'caravan',
      'ambush',
      'bandit toll',
      'thief nest',
    ]),
  }),
  Object.freeze({
    assetId: 'source:assets/guild/quest-requests-village.png',
    terms: Object.freeze([
      'village',
      'tavern',
      'medical',
      'fever',
      'sickroom',
      'quarantine',
      'clean water',
      'cellar trouble',
      'warehouse',
    ]),
  }),
  Object.freeze({
    assetId: 'source:assets/guild/quest-requests-military.png',
    terms: Object.freeze([
      'military',
      'arena',
      'siege',
      'wall-run',
      'black banner',
      'field bottle',
      'night watch',
    ]),
  }),
  Object.freeze({
    assetId: 'source:assets/guild/quest-requests-hillside.png',
    terms: Object.freeze(['exploration', 'hill', 'scout', 'pine sweep']),
  }),
]);
const GUILD_QUEST_ART_HEIGHT = 98;
const GUILD_QUEST_ART_RADIUS = 8;
const GUILD_QUEST_ART_GAP = 6;
const GUILD_QUEST_REWARD_ROW_HEIGHT = 50;
const GUILD_QUEST_REWARD_ICON_SIZE = 28;
const GUILD_QUEST_REWARD_ICON_GAP = 8;
const GUILD_QUEST_REWARD_ASSETS = Object.freeze({
  coin: PIXI_ROOT_RUN_ASSETS.coin,
  seed: 'source:assets/icons/icon-seed-box.png',
  herb: 'source:assets/icons/icon-herb-box.png',
});
// The source PNGs have different transparent padding. These values keep their
// visible artwork equally weighted inside the shared World Event-sized slot.
const GUILD_QUEST_REWARD_ICON_GEOMETRY = Object.freeze({
  coin: Object.freeze({ size: 26, y: 0 }),
  seed: Object.freeze({ size: 29, y: 0 }),
  herb: Object.freeze({ size: 31, y: -3 }),
});
const GUILD_DIFFICULTY_COLOR_KEYS = Object.freeze({
  trivial: '#4aa83f',
  easy: '#4aa83f',
  medium: '#d8ad32',
  hard: '#be403b',
  deadly: '#be403b',
});
const CARD_PORTRAIT_BOX = Object.freeze({
  x: -14,
  y: 0,
  width: 108,
  height: 108,
});
const CARD_SUMMARY_HEIGHT = 108;
const CARD_SUMMARY_DETAILS_GAP = 8;
const CARD_SUMMARY_CONTENT_TOP = 6;
const CARD_DETAIL_ROW_PITCH = 18;
const CARD_DETAILS_PADDING_TOP =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
const CARD_DETAILS_PADDING_BOTTOM =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
// Match the Wizard cosmetics choice board and its Save action geometry.
const CARD_DETAILS_BOARD_WIDTH = PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth;
const CARD_DETAILS_BOARD_SOURCE_INSETS = Object.freeze({
  top: 17,
  right: 25,
  bottom: 19,
  left: 13,
});
const CARD_DETAILS_BOARD_BORDER_INSETS = Object.freeze({
  top: 17 / 3,
  right: 25 / 3,
  bottom: 19 / 3,
  left: 13 / 3,
});
const CARD_DETAILS_SCROLL_INSET_Y = 8;
const CARD_DETAILS_SCROLL_LEFT_INSET = 4;
const CARD_DETAILS_SCROLL_RIGHT_INSET = 2;
const CARD_DETAILS_SCROLL_CONTENT_BLEED = 4;
const CARD_DETAILS_SCROLLBAR_OUTSET =
  RETAINED_SCROLLBAR_GEOMETRY.gap + RETAINED_SCROLLBAR_GEOMETRY.width;
const CARD_DETAILS_SCROLL_WIDTH =
  CARD_DETAILS_BOARD_WIDTH -
  CARD_DETAILS_SCROLL_LEFT_INSET -
  CARD_DETAILS_SCROLLBAR_OUTSET -
  CARD_DETAILS_SCROLL_RIGHT_INSET;
const CARD_ACTION_WIDTH =
  456 * (PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth / 925);
const CARD_ACTION_HEIGHT = 52;
const CARD_ACTION_FONT_SIZE = 16;
const CARD_ACTION_GAP = 8;

const SWATCH_COLORS = Object.freeze({
  ink: null,
  red: '#8a3530',
  amber: '#815b24',
  green: '#356a3f',
  teal: '#276566',
  blue: '#3a587d',
  violet: '#65457c',
  magenta: '#793b68',
  brown: '#604b37',
  slate: '#4e5967',
});

/**
 * Retained Guild profile, quest-paper, and adventurer-card dialog.
 */
export class GuildDialogPixi extends BasePixiRetainedView {
  constructor({
    dialogId,
    parent = null,
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    textEntryService = null,
    counters = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    if (!Object.values(GUILD_DIALOG_IDS).includes(dialogId)) {
      throw new Error(`Unknown retained Guild dialog: ${dialogId}`);
    }
    if (dialogId === GUILD_DIALOG_IDS.REQUEST_STACK) {
      throw new Error(
        'Use GuildRequestStackDialogPixi for guild.requestStack.',
      );
    }

    super({ label: `${dialogId}:dialog` });
    this.dialogId = dialogId;
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.textEntryService = textEntryService;
    this.onClose = onClose;
    this.theme = theme;
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.model = {};
    this.modalHandle = null;
    this.selectedCardTab = 'stats';
    this.profileDraft = {
      name: '',
      tag: '',
      color: DEFAULT_TRADE_ALLIANCE_TAG_COLOR,
    };

    this.backdrop = new Graphics();
    this.backdrop.label = `${dialogId}:backdrop`;
    this.backdrop.eventMode = 'static';
    this.backdropRegistration =
      inputRouter?.registerPressTarget?.(this.backdrop, {
        enabled: () => this.active,
        onActivate: () => this.onClose?.(),
        haptic: false,
        sound: false,
      }) ?? null;

    const size = getDialogSize(dialogId);
    this.panel = new PixiDialogFrame({
      assetManager,
      inputRouter,
      semanticRegistry,
      closeSemanticId: `${dialogId}.close`,
      title: getDialogTitle(dialogId),
      coreWidth: size.width,
      coreHeight: size.height,
      closeAction: () => this.onClose?.(),
      label: `${dialogId}:panel`,
    });
    this.panel.setContentBoxSize(
      size.width - PIXI_UI_GEOMETRY.dialogPadding * 2,
      size.height - PIXI_UI_GEOMETRY.dialogPadding * 2,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    this.root.addChild(this.backdrop, this.panel);

    if (isProfileDialog(dialogId)) {
      this.buildProfileDialog();
    } else if (dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.buildRequestDialog({ counters });
    } else {
      this.buildCardDialog({ counters });
    }

    parent?.addChild?.(this.root);
    this.onApplyTheme(theme);
    this.relayout();
  }

  buildProfileDialog() {
    this.nameField = new GuildProfileField({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      textEntryService: this.textEntryService,
      labelText: 'Name',
      maxLength: 24,
      label: `${this.dialogId}:name`,
      onChange: (value) => {
        this.profileDraft.name = value;
      },
    });
    this.tagField = new GuildProfileField({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      textEntryService: this.textEntryService,
      labelText: 'Tag',
      maxLength: 5,
      label: `${this.dialogId}:tag`,
      onChange: (value) => {
        this.profileDraft.tag = value;
      },
    });
    this.colorLabel = new PixiTextLabel({
      text: 'Tag Color',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${this.dialogId}:colorLabel`,
    });
    this.swatchLayer = new Container();
    this.swatchLayer.label = `${this.dialogId}:swatches`;
    this.swatches = TRADE_ALLIANCE_TAG_COLORS.map(
      (color) =>
        new GuildColorSwatch({
          inputRouter: this.inputRouter,
          semanticRegistry: this.semanticRegistry,
          semanticId: `${this.dialogId}.color.${color.id}`,
          colorId: color.id,
          label: `${this.dialogId}:color:${color.id}`,
          action: () => this.selectColor(color.id),
        }),
    );
    this.swatchLayer.addChild(...this.swatches.map((swatch) => swatch.root));
    this.submitButton = new PixiTextButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticRegistry,
      semanticId: `${this.dialogId}.submit`,
      text: this.dialogId === GUILD_DIALOG_IDS.CHARTER ? 'Create' : 'Save',
      sizeTier: 30,
      label: `${this.dialogId}:submit`,
      action: () => this.submitProfile(),
    });
    this.statusLabel = new PixiTextLabel({
      color: 'muted',
      align: 'center',
      label: `${this.dialogId}:status`,
    });
    this.panel.content.addChild(
      this.nameField.root,
      this.tagField.root,
      this.colorLabel,
      this.swatchLayer,
      this.submitButton,
      this.statusLabel,
    );
  }

  buildRequestDialog() {
    this.requestDetail = new GuildQuestDetail({
      assetManager: this.assetManager,
      label: `${this.dialogId}:detail`,
    });
    this.requestAction = new PixiTextButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticRegistry,
      semanticId: 'guild.request.action',
      sizeTier: 30,
      label: `${this.dialogId}:action`,
    });
    this.panel.content.addChild(this.requestDetail.root, this.requestAction);
  }

  buildCardDialog({ counters }) {
    this.panel.setPaperVisible(false);
    this.summaryFrame = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${this.dialogId}:summaryFrame`,
    );
    this.detailsFrame = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${this.dialogId}:detailsFrame`,
    );
    this.cardSummary = new Container();
    this.cardSummary.label = `${this.dialogId}:summary`;
    this.cardIconFrame = new PixiFrame({
      assetManager: this.assetManager,
      width: 72,
      height: 72,
      label: `${this.dialogId}:iconFrame`,
    });
    this.cardIconFrame.visible = false;
    this.cardIconFrame.renderable = false;
    this.cardIcon = new Sprite(Texture.EMPTY);
    this.cardIcon.label = `${this.dialogId}:icon`;
    this.cardIcon.visible = false;
    this.cardInitial = new PixiTextLabel({
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: 'muted',
      label: `${this.dialogId}:initial`,
    });
    this.cardName = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${this.dialogId}:name`,
    });
    this.cardLevelLabel = new PixiTextLabel({
      text: 'Level',
      label: `${this.dialogId}:levelLabel`,
    });
    this.cardLevel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${this.dialogId}:level`,
    });
    this.cardStatusLabel = new PixiTextLabel({
      text: 'Status',
      label: `${this.dialogId}:statusLabel`,
    });
    this.cardStatus = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${this.dialogId}:status`,
    });
    this.cardXpLabel = new PixiTextLabel({
      text: 'XP',
      label: `${this.dialogId}:xpLabel`,
    });
    this.cardXp = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${this.dialogId}:xp`,
    });
    this.cardPersonalityLabel = new PixiTextLabel({
      text: 'Personality',
      label: `${this.dialogId}:personalityLabel`,
    });
    this.cardPersonality = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${this.dialogId}:personality`,
    });
    this.cardSummary.addChild(
      this.cardIconFrame,
      this.cardIcon,
      this.cardInitial,
      this.cardName,
      this.cardLevelLabel,
      this.cardLevel,
      this.cardStatusLabel,
      this.cardStatus,
      this.cardXpLabel,
      this.cardXp,
      this.cardPersonalityLabel,
      this.cardPersonality,
    );
    this.cardDetailsBoard = new PixiNineSliceFrame({
      texture:
        this.assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: CARD_DETAILS_BOARD_SOURCE_INSETS,
      borderInsets: CARD_DETAILS_BOARD_BORDER_INSETS,
      width: CARD_DETAILS_BOARD_WIDTH,
      height:
        CARD_DETAILS_BOARD_BORDER_INSETS.top +
        CARD_DETAILS_BOARD_BORDER_INSETS.bottom,
      label: `${this.dialogId}:detailsBoard`,
    });
    this.detailScroll = new RetainedScrollArea({
      inputRouter: this.inputRouter,
      label: `${this.dialogId}:details`,
    });
    this.detailPool = new WidgetPool({
      name: `${this.dialogId} detail row pool`,
      counters,
      create: () =>
        new GuildDetailRow({
          label: `${this.dialogId}:detailRow`,
        }),
      reset: (row) => row.reset(),
      dispose: (row) => row.destroy(),
      maxSize: 24,
    });
    this.detailRows = new PooledCollection({
      name: `${this.dialogId} detail rows`,
      pool: this.detailPool,
      counters,
      keyOf: (row, index) => row.id ?? row.key ?? index,
      bind: (widget, row, key) => widget.bind(key, row),
      afterReconcile: (widgets) =>
        orderChildren(this.detailScroll.content, widgets),
    });
    this.cardAction = new PixiTextButton({
      assetManager: this.assetManager,
      inputRouter: this.inputRouter,
      semanticRegistry: this.semanticRegistry,
      semanticId: `${this.dialogId}.action`,
      sizeTier: 30,
      label: `${this.dialogId}:action`,
    });
    this.cardAction.textLabel.setFontSize(CARD_ACTION_FONT_SIZE);
    this.cardTabsLayer = new Container();
    this.cardTabsLayer.label = `${this.dialogId}:tabs`;
    this.cardTabs = CARD_TABS.map(
      (tab) =>
        new RetainedButton({
          assetManager: this.assetManager,
          inputRouter: this.inputRouter,
          semanticRegistry: this.semanticRegistry,
          semanticId: `${this.dialogId}.tab.${tab.id}`,
          label: tab.label,
          buttonLabel: `${this.dialogId}:tab:${tab.id}`,
          variant: 'tab',
          onActivate: () => this.selectCardTab(tab.id),
        }),
    );
    for (const tab of this.cardTabs) {
      tab.control.textLabel.setFontSize(PIXI_UI_GEOMETRY.borderLabelFontSize);
    }
    this.cardTabsLayer.addChild(...this.cardTabs.map((tab) => tab.root));
    this.panel.content.addChild(
      this.summaryFrame,
      this.detailsFrame,
      this.cardDetailsBoard,
      this.cardSummary,
      this.detailScroll.root,
      this.cardAction,
    );
    this.panel.addChild(this.cardTabsLayer);
  }

  onBind(viewModel) {
    this.model = viewModel ?? {};
    this.panel.setTitle(
      capitalizeGuildText(this.model.title ?? getDialogTitle(this.dialogId)),
    );
    if (isProfileDialog(this.dialogId)) {
      this.bindProfile();
    } else if (this.dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.bindRequest();
    } else {
      this.bindCard();
    }
    this.relayout();
  }

  bindRequest() {
    const request = this.model.request ?? this.model;
    this.requestDetail.bind({ ...request, title: '' });
    const action = this.model.action ?? request.action;
    this.requestAction
      .setText(
        capitalizeGuildText(this.model.actionLabel ?? request.actionLabel),
      )
      .setAction(action)
      .setEnabled(Boolean(action) && this.model.actionDisabled !== true);
    this.requestAction.visible = Boolean(action);
    this.requestAction.renderable = this.requestAction.visible;
  }

  bindProfile() {
    const profile = this.model.profile ?? this.model;
    const fieldsFocused =
      this.nameField.field.focused || this.tagField.field.focused;
    if (!fieldsFocused) {
      this.profileDraft = {
        name: String(profile.name ?? ''),
        tag: String(profile.tag ?? ''),
        color: normalizeTradeAllianceTagColor(profile.color),
      };
      this.nameField.setValue(this.profileDraft.name);
      this.tagField.setValue(this.profileDraft.tag);
    }
    this.selectColor(this.profileDraft.color, { notify: false });
    this.statusLabel.setText(capitalizeGuildText(this.model.status));
    this.statusLabel.visible = Boolean(this.model.status);
    this.submitButton.setEnabled(this.model.canSubmit !== false);
  }

  bindCard() {
    const card = this.model.card ?? this.model.adventurer ?? this.model;
    const isApplicant = this.dialogId === GUILD_DIALOG_IDS.APPLICANT;
    this.selectedCardTab =
      this.model.selectedTabId ?? card.selectedTabId ?? this.selectedCardTab;
    this.cardName.setText(
      capitalizeGuildText(card.displayName ?? card.name ?? 'Nameless'),
    );
    this.cardLevel.setText(
      formatCardLevelValue(card.levelLabel ?? card.level ?? 1),
    );
    this.cardStatus.setText(
      capitalizeGuildText(card.statusLabel ?? card.status ?? 'Idle'),
    );
    this.cardXp.setText(`${card.xp ?? 0}/${card.nextLevelXp ?? '?'}`);
    this.cardPersonality.setText(capitalizeGuildText(card.personalityLabel));
    this.cardInitial.setText(
      String(card.displayName ?? card.name ?? '?')
        .trim()
        .slice(0, 1)
        .toUpperCase() || '?',
    );
    this.cardIcon.visible = false;
    const texture = resolveCharacterTexture(this.assetManager, card);
    if (texture) {
      this.cardIcon.texture = texture;
      this.cardIcon.visible = true;
    }
    this.cardInitial.visible = !this.cardIcon.visible;
    const rows =
      this.model.tabs?.find((tab) => tab.id === this.selectedCardTab)?.rows ??
      card.tabs?.[this.selectedCardTab] ??
      this.model.rows ??
      deriveCardRows(card, this.selectedCardTab);
    this.detailRows.reconcile(
      this.selectedCardTab === 'stats'
        ? safeArray(rows).filter((row) => !isCardSummaryRow(row))
        : safeArray(rows),
    );
    const contentTheme = this.panel.getContentTheme();
    for (const row of this.detailRows.getWidgets()) {
      row.applyTheme(contentTheme);
    }
    this.cardTabs.forEach((button, index) => {
      const tab = CARD_TABS[index];
      button.setModel({
        label: tab.label,
        selected: tab.id === this.selectedCardTab,
        enabled: true,
        action: () => this.selectCardTab(tab.id),
      });
    });
    const action = this.model.action ?? card.action;
    this.cardAction
      .setColor(isApplicant ? 'green' : 'red')
      .setText(
        capitalizeGuildText(
          this.model.actionLabel ??
            card.actionLabel ??
            (isApplicant ? 'Hire' : 'Fire'),
        ),
      )
      .setAction(action)
      .setEnabled(Boolean(action) && this.model.actionEnabled !== false);
    this.cardAction.visible = Boolean(action);
    this.cardAction.renderable = this.cardAction.visible;
  }

  selectCardTab(tabId) {
    if (
      !CARD_TABS.some((tab) => tab.id === tabId) ||
      tabId === this.selectedCardTab
    ) {
      return false;
    }
    this.selectedCardTab = tabId;
    this.model.onSelectTab?.(tabId);
    this.bindCard();
    this.relayout();
    return true;
  }

  selectColor(colorId, { notify = true } = {}) {
    this.profileDraft.color = normalizeTradeAllianceTagColor(colorId);
    for (const swatch of this.swatches) {
      swatch.setSelected(swatch.colorId === this.profileDraft.color);
    }
    if (notify) {
      this.model.onChange?.({ ...this.profileDraft });
    }
  }

  submitProfile() {
    const submit = this.model.onSubmit ?? this.model.action;
    return submit?.({ ...this.profileDraft }) ?? false;
  }

  onApplyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redrawBackdrop();
    this.panel?.applyTheme(this.theme);
    const contentTheme = this.panel?.getContentTheme?.() ?? this.theme;
    if (isProfileDialog(this.dialogId)) {
      this.nameField?.applyTheme(contentTheme);
      this.tagField?.applyTheme(contentTheme);
      this.colorLabel?.applyTheme(contentTheme);
      this.statusLabel?.applyTheme(contentTheme);
      this.submitButton?.applyTheme(contentTheme);
      for (const swatch of this.swatches ?? []) {
        swatch.applyTheme(contentTheme);
      }
    } else if (this.dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.requestDetail?.applyTheme(contentTheme);
      this.requestAction?.applyTheme(contentTheme);
    } else {
      this.cardIconFrame?.applyTheme(contentTheme);
      this.cardInitial?.applyTheme(contentTheme);
      this.cardName?.applyTheme(contentTheme);
      this.cardLevelLabel?.applyTheme(contentTheme);
      this.cardLevel?.applyTheme(contentTheme);
      this.cardStatusLabel?.applyTheme(contentTheme);
      this.cardStatus?.applyTheme(contentTheme);
      this.cardXpLabel?.applyTheme(contentTheme);
      this.cardXp?.applyTheme(contentTheme);
      this.cardPersonalityLabel?.applyTheme(contentTheme);
      this.cardPersonality?.applyTheme(contentTheme);
      this.cardAction?.applyTheme(contentTheme);
      for (const row of this.detailRows?.getWidgets?.() ?? []) {
        row.applyTheme(contentTheme);
      }
      for (const tab of this.cardTabs ?? []) {
        tab.applyTheme(contentTheme);
      }
    }
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

  onActivate() {
    this.modalHandle =
      this.inputRouter?.pushModal?.({
        id: this.dialogId,
        root: this.root,
        onBack: () => this.onClose?.() ?? true,
        onEscape: () => this.onClose?.() ?? true,
      }) ?? null;
    const subscribe = this.model.subscribe;
    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((nextModel) => this.bind(nextModel));
      if (typeof unsubscribe === 'function') {
        this.addActiveCleanup(unsubscribe);
      }
    }
  }

  onDeactivate() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.nameField?.blur();
    this.tagField?.blur();
  }

  relayout() {
    if (!this.panel) {
      return;
    }
    const size = getDialogSize(this.dialogId, this.sourceHeight);
    this.panel.setContentBoxSize(
      size.width - PIXI_UI_GEOMETRY.dialogPadding * 2,
      size.height - PIXI_UI_GEOMETRY.dialogPadding * 2,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    const centerY = getDialogCenterY(this.sourceHeight);
    const shift = finiteOr(this.viewportProjection?.dialogShift, 0);
    const x = Math.round((this.sourceWidth - size.width) / 2);
    const y = Math.round(centerY - size.height / 2 + shift);
    this.panel.position.set(x, y);
    this.backdrop.hitArea = new Rectangle(
      0,
      0,
      this.sourceWidth,
      this.sourceHeight,
    );

    if (isProfileDialog(this.dialogId)) {
      this.layoutProfile();
    } else if (this.dialogId === GUILD_DIALOG_IDS.REQUEST) {
      const actionHeight = this.requestAction.visible ? 28 : 0;
      const actionGap = actionHeight > 0 ? 8 : 0;
      this.requestDetail.setSize(
        this.panel.contentBoxWidth,
        this.panel.contentBoxHeight - actionHeight - actionGap,
      );
      if (this.requestAction.visible) {
        this.requestAction.position.set(
          0,
          this.panel.contentBoxHeight - actionHeight,
        );
        this.requestAction.setSize(this.panel.contentBoxWidth, actionHeight);
      }
    } else {
      this.layoutCard();
    }
    this.redrawBackdrop();
  }

  layoutProfile() {
    const width = this.panel.contentBoxWidth;
    this.nameField.setBounds(0, 0, width, 38);
    this.tagField.setBounds(0, 44, width, 38);
    this.colorLabel.position.set(0, 88);
    this.swatchLayer.position.set(0, 104);
    this.swatches.forEach((swatch, index) => {
      const column = index % 10;
      swatch.setBounds(column * 25, 0, 20);
    });
    this.submitButton.position.set(0, 134);
    this.submitButton.setSize(width, 28);
    this.statusLabel.position.set(
      Math.max(0, (width - this.statusLabel.measuredWidth) / 2),
      168,
    );
  }

  layoutCard() {
    const width = this.panel.contentBoxWidth;
    const footerTabLayout = resolveDialogFooterTabLayout({
      coreWidth: this.panel.coreWidth,
      coreHeight: this.panel.coreHeight,
      tabCount: this.cardTabs.length,
    });
    setDialogPaperAboveFooterTabs(this.panel, footerTabLayout);
    const paperContentBottom = Math.max(
      0,
      Math.min(
        this.panel.contentBoxHeight,
        footerTabLayout.paperBottom - this.panel.content.y,
      ),
    );
    const paperOutsets = resolveDialogPaperOutsets(this.panel.contentInsets);
    const detailsY =
      CARD_SUMMARY_HEIGHT +
      paperOutsets.bottom +
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap +
      paperOutsets.top;
    const detailsHeight = Math.max(
      0,
      paperContentBottom - paperOutsets.bottom - detailsY,
    );
    setDialogPaperSectionBounds(
      this.summaryFrame,
      {
        x: 0,
        y: 0,
        width,
        height: CARD_SUMMARY_HEIGHT,
      },
      paperOutsets,
    );
    setDialogPaperSectionBounds(
      this.detailsFrame,
      {
        x: 0,
        y: detailsY,
        width,
        height: detailsHeight,
      },
      paperOutsets,
    );
    this.cardSummary.position.set(0, 0);
    this.cardIconFrame.position.set(CARD_PORTRAIT_BOX.x, CARD_PORTRAIT_BOX.y);
    this.cardIconFrame.setSize(
      CARD_PORTRAIT_BOX.width,
      CARD_PORTRAIT_BOX.height,
    );
    fitSpriteInside(this.cardIcon, CARD_PORTRAIT_BOX);
    this.cardInitial.position.set(
      CARD_PORTRAIT_BOX.x + CARD_PORTRAIT_BOX.width / 2,
      CARD_PORTRAIT_BOX.y + CARD_PORTRAIT_BOX.height / 2,
    );
    const summaryDetailsX =
      CARD_PORTRAIT_BOX.x + CARD_PORTRAIT_BOX.width + CARD_SUMMARY_DETAILS_GAP;
    const summaryRightX = width - CARD_DETAILS_SCROLL_LEFT_INSET;
    this.cardName.position.set(summaryDetailsX, CARD_SUMMARY_CONTENT_TOP);
    this.cardName.setWrapWidth(Math.max(0, summaryRightX - summaryDetailsX));
    const levelY = CARD_SUMMARY_CONTENT_TOP + CARD_DETAIL_ROW_PITCH;
    const statusY = levelY + CARD_DETAIL_ROW_PITCH;
    const xpY = statusY + CARD_DETAIL_ROW_PITCH;
    const personalityY = xpY + CARD_DETAIL_ROW_PITCH;
    this.cardLevelLabel.position.set(summaryDetailsX, levelY);
    this.cardLevel.position.set(summaryRightX, levelY);
    this.cardStatusLabel.position.set(summaryDetailsX, statusY);
    this.cardStatus.position.set(summaryRightX, statusY);
    this.cardXpLabel.position.set(summaryDetailsX, xpY);
    this.cardXp.position.set(summaryRightX, xpY);
    this.cardPersonalityLabel.position.set(summaryDetailsX, personalityY);
    this.cardPersonality.position.set(summaryRightX, personalityY);

    const actionHeight = this.cardAction.visible ? CARD_ACTION_HEIGHT : 0;
    const actionGap = actionHeight > 0 ? CARD_ACTION_GAP : 0;
    const detailsBoardHeight = Math.max(
      0,
      detailsHeight -
        CARD_DETAILS_PADDING_TOP -
        CARD_DETAILS_PADDING_BOTTOM -
        actionHeight -
        actionGap,
    );
    const detailsBoardX = (width - CARD_DETAILS_BOARD_WIDTH) / 2;
    const detailsBoardY = detailsY + CARD_DETAILS_PADDING_TOP;
    this.cardDetailsBoard.position.set(detailsBoardX, detailsBoardY);
    this.cardDetailsBoard.setSize(
      CARD_DETAILS_BOARD_WIDTH,
      detailsBoardHeight,
      CARD_DETAILS_BOARD_BORDER_INSETS,
    );
    const detailScrollHeight = Math.max(
      0,
      detailsBoardHeight - CARD_DETAILS_SCROLL_INSET_Y * 2,
    );
    this.detailScroll.setBounds(
      detailsBoardX + CARD_DETAILS_SCROLL_LEFT_INSET,
      detailsBoardY + CARD_DETAILS_SCROLL_INSET_Y,
      CARD_DETAILS_SCROLL_WIDTH,
      detailScrollHeight,
    );
    const detailRowWidth = Math.max(
      0,
      CARD_DETAILS_SCROLL_WIDTH - CARD_DETAILS_SCROLL_CONTENT_BLEED * 2,
    );
    let rowY = CARD_DETAILS_SCROLL_CONTENT_BLEED;
    for (const row of this.detailRows.getWidgets()) {
      const rowHeight = row.getPreferredHeight(detailRowWidth);
      row.setBounds(
        CARD_DETAILS_SCROLL_CONTENT_BLEED,
        rowY,
        detailRowWidth,
        rowHeight,
      );
      rowY += rowHeight + 4;
    }
    this.detailScroll.setContentHeight(
      Math.max(detailScrollHeight, rowY + CARD_DETAILS_SCROLL_CONTENT_BLEED),
    );
    if (this.cardAction.visible) {
      this.cardAction.position.set(
        (width - CARD_ACTION_WIDTH) / 2,
        detailsBoardY + detailsBoardHeight + actionGap,
      );
      this.cardAction.setSize(CARD_ACTION_WIDTH, actionHeight);
    }
    this.cardTabsLayer.position.set(footerTabLayout.rowX, footerTabLayout.rowY);
    layoutButtons(
      this.cardTabs,
      0,
      0,
      footerTabLayout.rowWidth,
      PIXI_DIALOG_FOOTER_TABS_GEOMETRY.rowHeight,
      footerTabLayout.gap,
    );
  }

  redrawBackdrop() {
    if (!this.backdrop || !this.theme) {
      return;
    }
    this.backdrop
      .clear()
      .rect(0, 0, this.sourceWidth, this.sourceHeight)
      .fill({ color: this.theme.backdrop, alpha: 0.78 });
  }

  onDestroy() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.backdropRegistration?.();
    this.backdropRegistration = null;
    if (isProfileDialog(this.dialogId)) {
      this.nameField.destroy();
      this.tagField.destroy();
      this.submitButton.destroy({ children: true });
      for (const swatch of this.swatches) {
        swatch.destroy();
      }
    } else if (this.dialogId === GUILD_DIALOG_IDS.REQUEST) {
      this.requestDetail.destroy();
      this.requestAction.destroy({ children: true });
    } else {
      this.detailRows.destroy();
      this.detailPool.destroy();
      this.cardAction.destroy({ children: true });
      for (const tab of this.cardTabs) {
        tab.destroy({ children: true });
      }
      this.detailScroll.destroy();
    }
  }
}

/**
 * Special retained paper-stack dialog used by available Guild quests.
 */
export class GuildRequestStackDialogPixi extends BasePixiRetainedView {
  constructor({
    parent = null,
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    onClose = null,
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    super({ label: `${GUILD_DIALOG_IDS.REQUEST_STACK}:dialog` });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.onClose = onClose;
    this.theme = theme;
    this.sourceWidth = PIXI_UI_GEOMETRY.sourceWidth;
    this.sourceHeight = PIXI_UI_GEOMETRY.sourceHeight;
    this.model = {};
    this.modalHandle = null;
    this.requests = [];
    this.selectedIndex = 0;

    this.backdrop = new Graphics();
    this.backdrop.eventMode = 'static';
    this.backdropRegistration =
      inputRouter?.registerPressTarget?.(this.backdrop, {
        enabled: () => this.active,
        onActivate: () => this.onClose?.(),
        haptic: false,
        sound: false,
      }) ?? null;
    this.panel = new PixiDialogFrame({
      assetManager,
      inputRouter,
      semanticRegistry,
      closeSemanticId: 'guild.requestStack.close',
      title: 'Quest Requests',
      coreWidth: STACK_DIALOG_WIDTH,
      coreHeight: STACK_DIALOG_HEIGHT,
      closeAction: () => this.onClose?.(),
      label: 'guild:requestStack:panel',
    });
    this.panel.setCoreSize(STACK_DIALOG_WIDTH, STACK_DIALOG_HEIGHT);
    this.panel.setPaperVisible(false);
    this.pageRoot = new Container({
      label: 'guild:requestStack:page',
    });
    this.pageRoot.eventMode = 'static';
    this.pageFrame = createDialogPaperSection(
      assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.dialogPaper) ??
        Texture.EMPTY,
      'guild:requestStack:pageFrame',
    );
    this.detail = new GuildQuestDetail({
      assetManager,
      showArtwork: true,
      label: 'guild:requestStack:detail',
    });
    this.postButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.requestStack.post',
      color: 'green',
      sizeTier: 30,
      label: 'guild:requestStack:post',
      action: () => this.postSelected(),
    });
    this.nextButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.requestStack.next',
      color: 'yellow',
      sizeTier: 30,
      label: 'guild:requestStack:next',
      action: () => this.nextPage(),
    });
    this.previousButton = new PixiTextButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: 'guild.requestStack.previous',
      color: 'yellow',
      sizeTier: 30,
      label: 'guild:requestStack:previous',
      action: () => this.previousPage(),
    });
    this.pageLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 0.5, y: 0 },
      color: 'text',
      label: 'guild:requestStack:pageLabel',
    });
    this.pageRoot.addChild(this.pageFrame, this.detail.root, this.postButton);
    this.panel.content.addChild(
      this.pageRoot,
      this.previousButton,
      this.nextButton,
      this.pageLabel,
    );
    this.swipeRegistration =
      inputRouter?.registerPageSwipe?.({
        id: 'guild.requestStack.swipe',
        displayObject: this.pageRoot,
        modalId: GUILD_DIALOG_IDS.REQUEST_STACK,
        priority: 10,
        threshold: 30,
        onSwipe: ({ direction }) =>
          direction === 'next' ? this.nextPage() : this.previousPage(),
      }) ?? null;
    this.root.addChild(this.backdrop, this.panel);
    parent?.addChild?.(this.root);
    this.onApplyTheme(theme);
    this.relayout();
  }

  onBind(viewModel) {
    this.model = viewModel ?? {};
    this.requests = safeArray(
      this.model.requests ?? this.model.availableRequests,
    );
    this.selectedIndex = clampInteger(
      this.model.selectedIndex ?? this.selectedIndex,
      0,
      Math.max(0, this.requests.length - 1),
    );
    if (this.requests.length === 0) {
      this.onClose?.();
      return;
    }
    this.renderSelectedRequest();
  }

  renderSelectedRequest() {
    const selected = this.requests[this.selectedIndex];
    this.detail.bind(selected);
    this.pageLabel.setText(
      `${this.selectedIndex + 1} / ${this.requests.length}`,
    );
    const boardFull = this.model.boardFull === true;
    this.postButton
      .setText(boardFull ? 'Board Full' : 'Post Request')
      .setEnabled(!boardFull);
    this.previousButton.setText('Prev').setEnabled(this.selectedIndex > 0);
    this.nextButton
      .setText('Next')
      .setEnabled(this.selectedIndex < this.requests.length - 1);
    this.relayout();
  }

  selectRequest(index) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.requests.length ||
      index === this.selectedIndex
    ) {
      return false;
    }
    this.selectedIndex = index;
    this.model.onSelect?.(index, this.requests[index]);
    this.renderSelectedRequest();
    return true;
  }

  nextPage() {
    if (this.selectedIndex >= this.requests.length - 1) {
      return false;
    }
    return this.selectRequest(this.selectedIndex + 1);
  }

  previousPage() {
    if (this.selectedIndex <= 0) {
      return false;
    }
    return this.selectRequest(this.selectedIndex - 1);
  }

  postSelected() {
    const request = this.requests[this.selectedIndex];
    if (!request || this.model.boardFull) {
      return false;
    }
    return (
      request.postAction?.(request) ??
      this.model.onPost?.(request.id, request) ??
      false
    );
  }

  onApplyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redrawBackdrop();
    this.panel?.applyTheme(this.theme);
    const contentTheme = this.panel?.getContentTheme?.() ?? this.theme;
    this.detail?.applyTheme(contentTheme);
    this.postButton?.applyTheme(contentTheme);
    this.previousButton?.applyTheme(contentTheme);
    this.nextButton?.applyTheme(contentTheme);
    this.pageLabel?.applyTheme(this.theme);
    this.pageLabel?.setColor('text');
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

  onActivate() {
    this.modalHandle =
      this.inputRouter?.pushModal?.({
        id: GUILD_DIALOG_IDS.REQUEST_STACK,
        root: this.root,
        onBack: () => this.onClose?.() ?? true,
        onEscape: () => this.onClose?.() ?? true,
      }) ?? null;
    const subscribe = this.model.subscribe;
    if (typeof subscribe === 'function') {
      const unsubscribe = subscribe((nextModel) => this.bind(nextModel));
      if (typeof unsubscribe === 'function') {
        this.addActiveCleanup(unsubscribe);
      }
    }
  }

  onDeactivate() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
  }

  relayout() {
    if (!this.panel) {
      return;
    }
    const centerY = getDialogCenterY(this.sourceHeight);
    const shift = finiteOr(this.viewportProjection?.dialogShift, 0);
    const x = Math.round((this.sourceWidth - STACK_DIALOG_WIDTH) / 2);
    const y = Math.round(centerY - STACK_DIALOG_HEIGHT / 2 + shift);
    this.panel.position.set(x, y);
    this.pageRoot.position.set(-STACK_PAGE_SIDE_OVERFLOW, STACK_PAGE_TOP);
    this.pageFrame.position.set(0, 0);
    this.pageFrame.setSize(STACK_PAGE_WIDTH, STACK_PAGE_HEIGHT);
    this.detail.root.position.set(
      STACK_PAGE_CONTENT_INSET,
      STACK_PAGE_CONTENT_INSET,
    );
    this.detail.setSize(
      STACK_PAGE_WIDTH - STACK_PAGE_CONTENT_INSET * 2,
      STACK_PAGE_HEIGHT -
        STACK_PAGE_CONTENT_INSET -
        STACK_PAGE_ACTION_HEIGHT -
        STACK_PAGE_ACTION_BOTTOM_INSET,
    );
    this.pageRoot.hitArea = new Rectangle(
      0,
      0,
      STACK_PAGE_WIDTH,
      STACK_PAGE_HEIGHT,
    );
    this.postButton.position.set(
      STACK_PAGE_CONTENT_INSET,
      STACK_PAGE_HEIGHT -
        STACK_PAGE_ACTION_HEIGHT -
        STACK_PAGE_ACTION_BOTTOM_INSET,
    );
    this.postButton.setSize(
      STACK_PAGE_WIDTH - STACK_PAGE_CONTENT_INSET * 2,
      STACK_PAGE_ACTION_HEIGHT,
    );
    this.previousButton.position.set(-STACK_PAGE_SIDE_OVERFLOW, STACK_PAGER_Y);
    this.previousButton.setSize(
      STACK_PAGER_BUTTON_WIDTH,
      STACK_PAGER_BUTTON_HEIGHT,
    );
    this.nextButton.position.set(
      -STACK_PAGE_SIDE_OVERFLOW + STACK_PAGE_WIDTH - STACK_PAGER_BUTTON_WIDTH,
      STACK_PAGER_Y,
    );
    this.nextButton.setSize(
      STACK_PAGER_BUTTON_WIDTH,
      STACK_PAGER_BUTTON_HEIGHT,
    );
    this.pageLabel.position.set(
      -STACK_PAGE_SIDE_OVERFLOW + STACK_PAGE_WIDTH / 2,
      STACK_PAGER_Y + 7,
    );
    this.backdrop.hitArea = new Rectangle(
      0,
      0,
      this.sourceWidth,
      this.sourceHeight,
    );
    this.redrawBackdrop();
  }

  redrawBackdrop() {
    if (!this.backdrop || !this.theme) {
      return;
    }
    this.backdrop
      .clear()
      .rect(0, 0, this.sourceWidth, this.sourceHeight)
      .fill({ color: this.theme.backdrop, alpha: 0.78 });
  }

  onDestroy() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.backdropRegistration?.();
    this.backdropRegistration = null;
    this.swipeRegistration?.();
    this.swipeRegistration = null;
    this.detail.destroy();
    this.postButton.destroy({ children: true });
    this.previousButton.destroy({ children: true });
    this.nextButton.destroy({ children: true });
  }
}

export class GuildProfileField {
  constructor({
    assetManager,
    inputRouter,
    textEntryService,
    labelText,
    maxLength,
    label,
    onChange,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.label = new PixiTextLabel({
      text: labelText,
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${label}:label`,
    });
    this.field = new PixiTextField({
      assetManager,
      inputRouter,
      textEntryService,
      inputKind: 'text',
      maxLength,
      label: `${label}:field`,
      onChange,
    });
    this.root.addChild(this.label, this.field);
  }

  setValue(value) {
    this.field.setValue(value);
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.label.position.set(0, 0);
    this.field.position.set(0, 14);
    this.field.setSize(width, Math.max(24, height - 14));
  }

  applyTheme(theme) {
    this.label.applyTheme(theme);
    this.field.applyTheme(theme);
  }

  blur() {
    this.field.blur();
  }

  destroy() {
    this.field.destroy({ children: true });
    this.root.destroy({ children: true });
  }
}

export class GuildColorSwatch {
  constructor({
    inputRouter,
    semanticRegistry,
    semanticId,
    colorId,
    action,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.graphic = new Graphics();
    this.root.addChild(this.graphic);
    this.colorId = colorId;
    this.action = action;
    this.selected = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () => this.root.visible && this.root.renderable,
        onActivate: () => this.action?.(),
        haptic: 'selection',
      }) ?? null;
    this.semanticRegistry = semanticRegistry;
    this.semanticId = semanticId;
    this.semanticDefinition =
      semanticRegistry?.register?.({
        semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: true,
          interactive: true,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: () => this.action?.(),
      }) ?? null;
  }

  setSelected(selected) {
    this.selected = Boolean(selected);
    this.redraw();
  }

  setBounds(x, y, size) {
    this.root.position.set(x, y);
    this.size = size;
    this.root.hitArea = new Rectangle(0, 0, size, size);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redraw();
  }

  redraw() {
    const color = SWATCH_COLORS[this.colorId] ?? this.theme.text;
    this.graphic
      .clear()
      .rect(0, 0, this.size ?? 20, this.size ?? 20)
      .fill(color)
      .stroke({
        color: this.selected ? this.theme.text : this.theme.stroke,
        width: this.selected ? 2 : 1,
        alignment: 1,
      });
  }

  destroy() {
    this.registration?.();
    this.registration = null;
    if (this.semanticDefinition) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
      this.semanticDefinition = null;
    }
    this.root.destroy({ children: true });
  }
}

export class GuildDetailRow {
  constructor({ label }) {
    this.root = new Container();
    this.root.label = label;
    this.keyLabel = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      label: `${label}:key`,
    });
    this.valueLabel = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      label: `${label}:value`,
    });
    this.paragraph = new PixiTextLabel({
      wordWrap: true,
      label: `${label}:paragraph`,
    });
    this.root.addChild(this.keyLabel, this.valueLabel, this.paragraph);
  }

  bind(key, row = {}) {
    this.key = key;
    this.model = row;
    this.root.visible = true;
    this.root.renderable = true;
    const paragraph = row.paragraph === true || row.text != null;
    this.keyLabel.visible = !paragraph;
    this.valueLabel.visible = !paragraph;
    this.paragraph.visible = paragraph;
    if (paragraph) {
      this.paragraph.setText(capitalizeGuildText(row.text));
    } else {
      this.keyLabel.setText(capitalizeGuildText(row.label ?? row.keyText));
      this.valueLabel.setText(capitalizeGuildText(row.value ?? row.valueText));
    }
  }

  getPreferredHeight(width) {
    if (this.paragraph.visible) {
      this.paragraph.setWrapWidth(width);
      return Math.max(
        PIXI_UI_GEOMETRY.rowMinHeight,
        this.paragraph.measuredHeight,
      );
    }
    return PIXI_UI_GEOMETRY.rowMinHeight;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    if (this.paragraph.visible) {
      this.paragraph.position.set(0, 0);
      this.paragraph.setWrapWidth(width);
      return;
    }
    const textY = Math.max(1, (height - 16) / 2);
    this.keyLabel.position.set(0, textY);
    this.valueLabel.position.set(width, textY);
    this.keyLabel.setWrapWidth(
      Math.max(
        0,
        width - this.valueLabel.measuredWidth - PIXI_UI_GEOMETRY.rowColumnGap,
      ),
    );
  }

  applyTheme(theme) {
    this.keyLabel.applyTheme(theme);
    this.valueLabel.applyTheme(theme);
    this.paragraph.applyTheme(theme);
    this.valueLabel.setColor(
      resolveThemeColor(this.model?.valueResourceKey ?? 'text'),
    );
  }

  reset() {
    this.model = null;
    this.key = null;
    this.root.visible = false;
    this.root.renderable = false;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

export class GuildRequestListItem {
  constructor({ assetManager, inputRouter, semanticRegistry }) {
    this.assetManager = assetManager;
    this.semanticRegistry = semanticRegistry;
    this.root = new Container();
    this.frame = new PixiFrame({
      assetManager,
      width: 1,
      height: 1,
      label: 'guild:requestStack:listItem:frame',
    });
    this.number = new PixiTextLabel({
      fontSize: 9,
      fontWeight: 'bold',
      anchor: { x: 1, y: 0 },
      color: 'muted',
      label: 'guild:requestStack:listItem:number',
    });
    this.title = new PixiTextLabel({
      fontSize: 8.8,
      fontWeight: 'bold',
      label: 'guild:requestStack:listItem:title',
    });
    this.root.addChild(this.frame, this.number, this.title);
    this.action = null;
    this.enabled = true;
    this.selected = false;
    this.semanticId = null;
    this.semanticDefinition = null;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () => this.root.visible && this.root.renderable,
        onActivate: () => this.action?.(),
        haptic: 'selection',
      }) ?? null;
  }

  bind(request, { selected, pageNumber, action }) {
    this.unregisterSemantic();
    this.request = request;
    this.selected = selected;
    this.action = action;
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode = 'static';
    this.number.setText(pageNumber);
    this.title.setText(toDisplayCase(request.title));
    this.semanticId = `guild.requestStack.request.${request.id}`;
    if (this.semanticRegistry) {
      this.semanticDefinition = this.semanticRegistry.register({
        semanticId: this.semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: true,
          interactive: true,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: () => this.action?.(),
      });
    }
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.frame.setSize(width, height);
    this.number.position.set(19, Math.max(2, (height - 16) / 2));
    this.title.position.set(23, Math.max(2, (height - 16) / 2));
    this.title.setWrapWidth(width - 30);
  }

  applyTheme(theme) {
    this.number.applyTheme(theme);
    this.title.applyTheme(theme);
    this.frame.applyTheme(theme);
    this.number.setColor('muted');
    this.title.setColor('text');
  }

  reset() {
    this.unregisterSemantic();
    this.request = null;
    this.action = null;
    this.root.eventMode = 'none';
    this.root.visible = false;
    this.root.renderable = false;
  }

  unregisterSemantic() {
    if (this.semanticDefinition && this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
    }
    this.semanticDefinition = null;
    this.semanticId = null;
  }

  destroy() {
    this.unregisterSemantic();
    this.registration?.();
    this.registration = null;
    this.root.destroy({ children: true });
  }
}

export class GuildQuestDetail {
  constructor({ assetManager = null, showArtwork = false, label }) {
    this.assetManager = assetManager;
    this.showArtwork = showArtwork;
    this.root = new Container();
    this.root.label = label;
    this.art = new Sprite({
      texture: Texture.EMPTY,
      label: `${label}:art`,
      roundPixels: true,
    });
    this.art.eventMode = 'none';
    this.artMask = new Graphics({
      label: `${label}:artMask`,
    });
    this.artMask.eventMode = 'none';
    this.art.mask = this.artMask;
    this.title = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.dialogTitleFontSize,
      fontWeight: 'bold',
      wordWrap: true,
      label: `${label}:title`,
    });
    this.page = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      anchor: { x: 1, y: 0 },
      color: 'muted',
      label: `${label}:page`,
    });
    this.lore = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      wordWrap: true,
      label: `${label}:lore`,
    });
    this.rows = [
      new GuildQuestDetailLine({
        assetManager,
        label: 'Difficulty',
      }),
      new GuildQuestDetailLine({
        assetManager,
        label: 'Stats',
      }),
      new GuildQuestDetailLine({
        assetManager,
        label: 'Choose One Reward',
        reward: true,
      }),
      new GuildQuestDetailLine({
        assetManager,
        label: 'Expires',
      }),
      new GuildQuestDetailLine({
        assetManager,
        label: 'Event',
      }),
    ];
    this.root.addChild(
      this.art,
      this.artMask,
      this.title,
      this.page,
      this.lore,
      ...this.rows.map((row) => row.root),
    );
  }

  bind(request = {}, { pageLabel = '' } = {}) {
    const title = toDisplayCase(request.title ?? 'Quest');
    this.title.setText(title);
    this.title.visible = Boolean(title);
    this.title.renderable = this.title.visible;
    this.page.setText(pageLabel);
    this.lore.setText(capitalizeGuildText(request.lore));
    const artAssetId = resolveGuildQuestArtAssetId(request);
    this.artAssetId = artAssetId;
    this.art.texture = artAssetId
      ? (this.assetManager?.getTexture?.(artAssetId) ?? Texture.EMPTY)
      : Texture.EMPTY;
    this.art.visible = this.showArtwork && Boolean(artAssetId);
    this.art.renderable = this.art.visible;
    this.artMask.visible = this.art.visible;
    this.artMask.renderable = this.art.visible;
    const values = [
      toDisplayCase(request.difficulty),
      toDisplayCase(request.statLabel),
      capitalizeGuildText(request.rewardText),
      capitalizeGuildText(request.expiresLabel ?? 'Now'),
      capitalizeGuildText(request.eventLabel),
    ];
    this.rows.forEach((row, index) => {
      row.setValue(values[index], {
        colorKey:
          index === 0
            ? (GUILD_DIFFICULTY_COLOR_KEYS[
                String(request.difficulty ?? '').toLowerCase()
              ] ?? 'text')
            : 'text',
      });
      row.root.visible = index < 4 || Boolean(values[index]);
    });
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.art.position.set(0, 0);
    this.art.width = width;
    this.art.height = GUILD_QUEST_ART_HEIGHT;
    this.artMask
      .clear()
      .roundRect(0, 0, width, GUILD_QUEST_ART_HEIGHT, GUILD_QUEST_ART_RADIUS)
      .fill('#ffffff');
    const textTop = this.art.visible
      ? GUILD_QUEST_ART_HEIGHT + GUILD_QUEST_ART_GAP
      : 0;
    this.title.position.set(0, textTop);
    this.title.setWrapWidth(Math.max(0, width - 52));
    this.page.position.set(width, textTop + 2);
    const loreY = textTop + (this.title.visible ? 24 : 0);
    this.lore.position.set(0, loreY);
    this.lore.setWrapWidth(width);
    let y = Math.max(
      textTop + (this.title.visible ? 54 : 30),
      loreY + 6 + this.lore.measuredHeight,
    );
    for (const row of this.rows) {
      if (!row.root.visible) {
        continue;
      }
      const rowHeight = row.reward ? GUILD_QUEST_REWARD_ROW_HEIGHT : 22;
      row.setBounds(0, y, width, rowHeight);
      y += rowHeight;
    }
  }

  applyTheme(theme) {
    this.title.applyTheme(theme);
    this.page.applyTheme(theme);
    this.lore.applyTheme(theme);
    this.page.setColor('muted');
    for (const row of this.rows) {
      row.applyTheme(theme);
    }
  }

  destroy() {
    for (const row of this.rows) {
      row.destroy();
    }
    this.root.destroy({ children: true });
  }
}

function resolveGuildQuestArtAssetId(request = {}) {
  const explicitAssetId = String(request.artAssetId ?? '').trim();
  if (explicitAssetId) {
    return explicitAssetId;
  }

  const requestIdentity = [
    request.title,
    ...(Array.isArray(request.tags) ? request.tags : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const requestContext = String(request.lore ?? '').toLowerCase();
  const findMatchingRule = (value) =>
    GUILD_QUEST_ART_RULES.find(({ terms }) =>
      terms.some((term) => value.includes(term)),
    );
  const matchingRule =
    findMatchingRule(requestIdentity) ?? findMatchingRule(requestContext);
  if (matchingRule) {
    return matchingRule.assetId;
  }

  const stableKey = String(request.id ?? request.title ?? 'guild-request');
  let hash = 0;
  for (let index = 0; index < stableKey.length; index += 1) {
    hash = (hash * 31 + stableKey.charCodeAt(index)) >>> 0;
  }
  return GUILD_QUEST_ART_ASSET_IDS[hash % GUILD_QUEST_ART_ASSET_IDS.length];
}

export class GuildQuestDetailLine {
  constructor({ assetManager = null, label, reward = false }) {
    this.root = new Container();
    this.labelText = label;
    this.assetManager = assetManager;
    this.reward = reward;
    this.valueColorKey = 'text';
    this.rewardValues = [];
    this.background = reward
      ? new PixiNineSliceFrame({
          texture:
            assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
            Texture.EMPTY,
          sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
          borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
          label: `guild:questDetail:${label}:background`,
        })
      : null;
    this.label = new PixiTextLabel({
      text: label,
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      label: `guild:questDetail:${label}:label`,
    });
    this.value = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      align: 'right',
      anchor: { x: 1, y: 0 },
      wordWrap: true,
      label: `guild:questDetail:${label}:value`,
    });
    this.rewardBadges = reward
      ? Object.entries(GUILD_QUEST_REWARD_ASSETS).map(
          ([resourceKey, assetId]) => {
            const root = new Container({
              label: `guild:questDetail:${label}:${resourceKey}`,
            });
            const icon = new Sprite({
              texture: assetManager?.getTexture?.(assetId) ?? Texture.EMPTY,
              anchor: 0.5,
              roundPixels: true,
              label: `${root.label}:icon`,
            });
            const amount = new PixiTextLabel({
              fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
              fontWeight: 'bold',
              anchor: { x: 0.5, y: 1 },
              color: '#ffffff',
              stroke: 'outlined',
              label: `${root.label}:amount`,
            });
            root.addChild(icon, amount);
            return { amount, icon, resourceKey, root };
          },
        )
      : [];
    this.root.addChild(
      ...(this.background ? [this.background] : []),
      this.label,
      this.value,
      ...this.rewardBadges.map(({ root }) => root),
    );
  }

  setValue(value, { colorKey = 'text' } = {}) {
    this.valueColorKey = colorKey;
    if (this.reward) {
      this.rewardValues = parseGuildRewardValues(value);
      this.rewardBadges.forEach((badge) => {
        const rewardValue = this.rewardValues.find(
          (entry) => entry.resourceKey === badge.resourceKey,
        );
        badge.amount.setText(rewardValue?.amount ?? '');
        badge.root.visible = Boolean(rewardValue);
        badge.root.renderable = badge.root.visible;
      });
      this.value.setText('');
      return;
    }
    this.value.setText(capitalizeGuildText(value));
    if (this.theme) {
      this.value.setColor(resolveThemeColor(this.valueColorKey));
    }
  }

  setBounds(x, y, width, height = 22) {
    this.root.position.set(x, y);
    if (this.reward) {
      this.background.position.set(0, 0);
      this.background.setSize(
        width,
        height,
        PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      );
      this.label.position.set(10, 17);
      const visibleBadges = this.rewardBadges.filter(
        ({ root }) => root.visible,
      );
      const badgesWidth =
        visibleBadges.length * GUILD_QUEST_REWARD_ICON_SIZE +
        Math.max(0, visibleBadges.length - 1) * GUILD_QUEST_REWARD_ICON_GAP;
      const badgesLeft = width - 10 - badgesWidth;
      visibleBadges.forEach((badge, index) => {
        const iconGeometry =
          GUILD_QUEST_REWARD_ICON_GEOMETRY[badge.resourceKey] ??
          GUILD_QUEST_REWARD_ICON_GEOMETRY.coin;
        badge.root.position.set(
          badgesLeft +
            GUILD_QUEST_REWARD_ICON_SIZE / 2 +
            index *
              (GUILD_QUEST_REWARD_ICON_SIZE + GUILD_QUEST_REWARD_ICON_GAP),
          0,
        );
        badge.icon.position.set(0, height / 2 + iconGeometry.y);
        badge.icon.width = iconGeometry.size;
        badge.icon.height = iconGeometry.size;
        badge.amount.position.set(
          0,
          height / 2 + GUILD_QUEST_REWARD_ICON_SIZE / 2 - 1,
        );
      });
      return;
    }
    this.label.position.set(0, 4);
    this.value.position.set(width, 3);
    this.value.setWrapWidth(Math.max(0, width - 92));
  }

  applyTheme(theme) {
    this.theme = theme;
    this.label.applyTheme(theme);
    this.value.applyTheme(theme);
    this.value.setColor(resolveThemeColor(this.valueColorKey));
    for (const badge of this.rewardBadges) {
      badge.amount.applyTheme(theme);
      badge.amount.setColor('#ffffff');
    }
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

function parseGuildRewardValues(value) {
  const rewards = [];
  const pattern = /([\d,.]+(?:\s*-\s*[\d,.]+)?)\s+(coin|seeds?|herbs?)/gi;
  for (const match of String(value ?? '').matchAll(pattern)) {
    const word = match[2].toLowerCase();
    rewards.push({
      amount: match[1].replace(/\s+/g, ''),
      resourceKey: word.startsWith('seed')
        ? 'seed'
        : word.startsWith('herb')
          ? 'herb'
          : 'coin',
    });
  }
  return rewards;
}

function getDialogSize(dialogId, sourceHeight = PIXI_UI_GEOMETRY.sourceHeight) {
  if (dialogId === GUILD_DIALOG_IDS.CHARTER) {
    return { width: CHARTER_DIALOG_WIDTH, height: 230 };
  }
  if (dialogId === GUILD_DIALOG_IDS.SETTINGS) {
    return { width: PROFILE_DIALOG_WIDTH, height: 230 };
  }
  if (dialogId === GUILD_DIALOG_IDS.REQUEST) {
    return {
      width: REQUEST_DIALOG_WIDTH,
      height: REQUEST_DIALOG_HEIGHT,
    };
  }
  return {
    width: CARD_DIALOG_WIDTH,
    height: resolveAdaptiveDialogHeight({
      viewportHeight: sourceHeight,
      baseHeight: CARD_DIALOG_HEIGHT,
      minimumHeight: 260,
      maximumHeight: sourceHeight - 160,
      hasPrimaryVerticalScroll: true,
    }),
  };
}

function resolveThemeColor(token) {
  return (theme) =>
    theme?.[token] ?? theme?.resourceColors?.[token] ?? token ?? theme?.text;
}

function getDialogTitle(dialogId) {
  const titles = {
    [GUILD_DIALOG_IDS.CHARTER]: 'Guild Charter',
    [GUILD_DIALOG_IDS.SETTINGS]: 'Guild Settings',
    [GUILD_DIALOG_IDS.REQUEST]: 'Request',
    [GUILD_DIALOG_IDS.ADVENTURER]: 'Adventurer Info',
    [GUILD_DIALOG_IDS.APPLICANT]: 'Applicant Info',
  };
  return titles[dialogId] ?? 'Guild';
}

function isProfileDialog(dialogId) {
  return (
    dialogId === GUILD_DIALOG_IDS.CHARTER ||
    dialogId === GUILD_DIALOG_IDS.SETTINGS
  );
}

function formatCardLevelValue(value) {
  return capitalizeGuildText(value).replace(/^Level\s+/i, '');
}

function fitSpriteInside(sprite, box) {
  const textureBounds = sprite.texture?.orig ?? sprite.texture?.frame;
  const textureWidth = Math.max(1, Number(textureBounds?.width) || 1);
  const textureHeight = Math.max(1, Number(textureBounds?.height) || 1);
  const scale = Math.min(box.width / textureWidth, box.height / textureHeight);
  sprite.width = textureWidth * scale;
  sprite.height = textureHeight * scale;
  sprite.position.set(
    box.x + (box.width - sprite.width) / 2,
    box.y + box.height - sprite.height,
  );
}

function deriveCardRows(card, tabId) {
  if (tabId === 'life') {
    return [
      { id: 'morale', label: 'Morale', value: card.morale },
      { id: 'fatigue', label: 'Fatigue', value: card.fatigue },
      { id: 'injury', label: 'Injury', value: card.injury },
      {
        id: 'lifeText',
        text: card.lifeText ?? card.personalityLife ?? '',
        paragraph: true,
      },
    ];
  }
  if (tabId === 'history') {
    const history = safeArray(card.history);
    return history.length > 0
      ? history.map((entry, index) => ({
          id: entry.id ?? index,
          text: entry.text ?? entry,
          paragraph: true,
        }))
      : [{ id: 'empty', text: 'No History', paragraph: true }];
  }
  return [
    ...Object.entries(card.stats ?? {}).map(([key, value]) => ({
      id: `stat:${key}`,
      label: capitalizeGuildText(key),
      value,
    })),
  ];
}

function isCardSummaryRow(row = {}) {
  const id = String(row.id ?? row.key ?? '').toLowerCase();
  return id === 'xp' || id === 'personality';
}

function resolveCharacterTexture(assetManager, model = {}) {
  if (!assetManager?.loaded) {
    return null;
  }
  if (model.textureId) {
    return assetManager.getTexture(model.textureId);
  }
  if (model.iconKey) {
    return assetManager.getTexture(
      `source:assets/characters/${model.iconKey}.png`,
    );
  }
  return null;
}

function getDialogCenterY(sourceHeight) {
  const chatClearance =
    PIXI_UI_GEOMETRY.roomChatBottom +
    PIXI_UI_GEOMETRY.roomChatHeight +
    PIXI_UI_GEOMETRY.roomChatTitleOverhang +
    PIXI_UI_GEOMETRY.roomChatGap;
  return (PIXI_UI_GEOMETRY.roomContentTop + (sourceHeight - chatClearance)) / 2;
}

function orderChildren(container, widgets) {
  container.removeChildren();
  for (const widget of widgets) {
    container.addChild(widget.root ?? widget);
  }
}

function layoutButtons(buttons, x, y, width, height, gap) {
  if (buttons.length === 0) {
    return;
  }
  const buttonWidth = (width - gap * (buttons.length - 1)) / buttons.length;
  let cursorX = x;
  for (const button of buttons) {
    if (button?.root && typeof button.setBounds === 'function') {
      button.setBounds(cursorX, y, buttonWidth, height);
    } else {
      button.position.set(cursorX, y);
      button.setSize(buttonWidth, height);
    }
    cursorX += buttonWidth + gap;
  }
}

function toDisplayCase(value) {
  return String(value ?? '').replace(/\b[a-z]/g, (letter) =>
    letter.toUpperCase(),
  );
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clampInteger(value, min, max) {
  const number = Math.floor(Number(value) || min);
  return Math.max(min, Math.min(max, number));
}
