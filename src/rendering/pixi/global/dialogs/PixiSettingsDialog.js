import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  ClickableWidget,
  DeviceIdentityFooter,
  PixiTextButton,
  PixiTabButton,
  createDialogPaperSection,
  PixiNineSliceFrame,
  PixiScrollView,
  PixiTextField,
  PixiTextLabel,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  resolveDialogPaperOutsets,
  RootRunDevicePreferenceRow,
  RootRunDevicePreferencesPanel,
  setDialogPaperSectionBounds,
} from '../../primitives/index.js';
import {
  PooledCollection,
  WidgetPool,
} from '../../retained/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_SQUIRCLE_TINTS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { getPlayerFrameTint } from '../../../../player/playerFrames.js';
import { getClientReleaseVersion } from '../../../../shared/clientReleaseVersion.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  RetainedGlobalDialog,
  orderDisplayObjects,
} from './GlobalDialogKit.js';
import {
  RETAINED_SCROLLBAR_GEOMETRY,
  RetainedButton,
  RetainedScrollArea,
} from '../../pages/workshop/RetainedPageKit.js';

const SETTINGS_CONTENT_WIDTH =
  GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const SETTINGS_STANDARD_CONTENT_HEIGHT = 410;
const SETTINGS_STANDARD_SCROLL_HEIGHT = 390;
const ACCOUNT_HEADER_WIDTH =
  PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth;
const ACCOUNT_HEADER_HEIGHT = 281 / 3;
const ACCOUNT_SCROLL_X =
  (SETTINGS_CONTENT_WIDTH - ACCOUNT_HEADER_WIDTH) / 2;
const ACCOUNT_SECTION_CONTENT_X =
  (ACCOUNT_HEADER_WIDTH - SETTINGS_CONTENT_WIDTH) / 2;
const ACCOUNT_HEADER_X = 0;
const ACCOUNT_TILE_SIZE = 183 / 3;
const ACCOUNT_GRID_COLUMNS = 4;
const ACCOUNT_HEADER_TILE_SIZE = 209 / 3;
const ACCOUNT_HEADER_PORTRAIT_WIDTH = 170 / 3;
const ACCOUNT_CHOICES_SCROLL_INSET_Y = 24 / 3;
const ACCOUNT_CHOICE_INDICATOR_BLEED = 4;
const ACCOUNT_CHOICE_SCROLL_LEFT_INSET = 4;
const ACCOUNT_CHOICE_SCROLL_RIGHT_INSET = 2;
const ACCOUNT_SCROLLBAR_OUTSET =
  RETAINED_SCROLLBAR_GEOMETRY.gap +
  RETAINED_SCROLLBAR_GEOMETRY.width;
const ACCOUNT_CHOICE_SCROLL_WIDTH =
  ACCOUNT_HEADER_WIDTH -
  ACCOUNT_CHOICE_SCROLL_LEFT_INSET -
  ACCOUNT_SCROLLBAR_OUTSET -
  ACCOUNT_CHOICE_SCROLL_RIGHT_INSET;
const ACCOUNT_TILE_GAP =
  (ACCOUNT_CHOICE_SCROLL_WIDTH -
    ACCOUNT_CHOICE_INDICATOR_BLEED * 2 -
    ACCOUNT_GRID_COLUMNS * ACCOUNT_TILE_SIZE) /
  (ACCOUNT_GRID_COLUMNS - 1);
const ACCOUNT_VISIBLE_CHOICE_ROWS = 3.3;
const ACCOUNT_FULL_VISIBLE_CHOICE_ROWS =
  Math.floor(ACCOUNT_VISIBLE_CHOICE_ROWS);
const ACCOUNT_PARTIAL_VISIBLE_CHOICE_ROW =
  ACCOUNT_VISIBLE_CHOICE_ROWS -
  ACCOUNT_FULL_VISIBLE_CHOICE_ROWS;
const ACCOUNT_CHOICE_SCROLL_HEIGHT =
  ACCOUNT_CHOICE_INDICATOR_BLEED +
  ACCOUNT_FULL_VISIBLE_CHOICE_ROWS * ACCOUNT_TILE_SIZE +
  ACCOUNT_FULL_VISIBLE_CHOICE_ROWS * ACCOUNT_TILE_GAP +
  ACCOUNT_PARTIAL_VISIBLE_CHOICE_ROW * ACCOUNT_TILE_SIZE;
const ACCOUNT_TAB_ROW_WIDTH = 286;
const ACCOUNT_TAB_HEIGHT = 28;
const ACCOUNT_TAB_GAP = 3;
const ACCOUNT_TABS_BOTTOM_INSET = 7;
const ACCOUNT_TABS_TOP_INSET =
  ACCOUNT_TABS_BOTTOM_INSET +
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
const ACCOUNT_CHOICE_BOARD_BOTTOM_INSET = 8;
const ACCOUNT_CHOICE_BOARD_HEIGHT =
  ACCOUNT_CHOICES_SCROLL_INSET_Y +
  ACCOUNT_CHOICE_SCROLL_HEIGHT +
  ACCOUNT_CHOICE_BOARD_BOTTOM_INSET;
const ACCOUNT_CHOICES_HEIGHT =
  ACCOUNT_CHOICE_BOARD_HEIGHT +
  ACCOUNT_TABS_TOP_INSET +
  ACCOUNT_TAB_HEIGHT +
  ACCOUNT_TABS_BOTTOM_INSET;
const ACCOUNT_SAVE_WIDTH = 456 * (ACCOUNT_HEADER_WIDTH / 925);
const ACCOUNT_SAVE_HEIGHT = 52;
const ACCOUNT_SAVE_FONT_SIZE = 16;
const ACCOUNT_SAVE_GAP = 8;
const ACCOUNT_BOTTOM_GAP = 8;
const SETTINGS_DEVICE_CONTENT_HEIGHT = 442;
const SETTINGS_DEVICE_SCROLL_HEIGHT = 422;
const SETTINGS_TABS = new Set([
  'account',
  'report',
  'configurations',
]);
const FEEDBACK_KINDS = Object.freeze([
  Object.freeze({
    key: 'feedback',
    label: 'feedback',
    title: 'feedback',
    placeholder: 'write feedback',
    emptyMessage: 'write feedback',
  }),
  Object.freeze({
    key: 'bug',
    label: 'bug',
    title: 'report a bug',
    placeholder: 'describe the bug',
    emptyMessage: 'describe the bug',
  }),
  Object.freeze({
    key: 'feature',
    label: 'feature',
    title: 'request a feature',
    placeholder: 'describe the feature',
    emptyMessage: 'describe the feature',
  }),
]);
const DEVICE_PREFERENCES = Object.freeze([
  Object.freeze({
    key: 'sfx',
    text: 'SOUND',
    iconAssetId: PIXI_ROOT_RUN_ASSETS.settingsSound,
  }),
  Object.freeze({
    key: 'music',
    text: 'MUSIC',
    iconAssetId: PIXI_ROOT_RUN_ASSETS.settingsMusic,
  }),
  Object.freeze({
    key: 'haptics',
    text: 'VIBRATION',
    iconAssetId: PIXI_ROOT_RUN_ASSETS.settingsVibration,
  }),
  Object.freeze({
    key: 'theme',
    text: 'THEME',
    iconAssetId: PIXI_ROOT_RUN_ASSETS.settingsThemeNight,
    onIconAssetId: PIXI_ROOT_RUN_ASSETS.settingsThemeDay,
  }),
]);
const DEVICE_SECTION_GAP = 8;
const DEVICE_ACCOUNT_PANEL_HEIGHT = 92;
const DEVICE_ACCOUNT_PANEL_PADDING_TOP = 10;
const DEVICE_ACCOUNT_STATUS_GAP = 2;
const DEVICE_ACCOUNT_BUTTON_GAP = 6;
const DEVICE_ACCOUNT_BUTTON_WIDTH = 218;
const DEVICE_ACCOUNT_BUTTON_HEIGHT = 30;
const DEVICE_ACCOUNT_FOOTER_GAP = 12;

/**
 * Retained single-pane surface used by settings, feedback, username, and
 * avatar entry points. Normal settings open directly on device preferences,
 * Google account connection, and identity details without visual-option tabs.
 */
export class PixiSettingsDialog extends RetainedGlobalDialog {
  constructor({
    context,
    dialogId,
    initialTab = 'account',
    initialFeedbackKind = 'feedback',
  }) {
    const startsOnDevicePreferences =
      normalizeSettingsTab(initialTab) === 'configurations';
    super({
      context,
      dialogId,
      title: 'Settings',
      contentWidth: SETTINGS_CONTENT_WIDTH,
      contentHeight: startsOnDevicePreferences
        ? SETTINGS_DEVICE_CONTENT_HEIGHT
        : SETTINGS_STANDARD_CONTENT_HEIGHT,
      placement: 'top',
      label: `${dialogId}:settingsDialog`,
    });
    this.initialTab = normalizeSettingsTab(initialTab);
    this.selectedTab = this.initialTab;
    this.feedbackKind = normalizeFeedbackKind(initialFeedbackKind);
    this.feedbackDraft = '';
    this.feedbackPending = false;
    this.accountChoiceTab = 'avatar';
    this.accountDraft = { username: '', character: 'elara', frame: 'classic' };
    this.accountDraftDirty = false;
    this.scrollOffsets = new Map();

    this.scroll = new PixiScrollView({
      inputRouter: this.context.inputRouter,
      assetManager: this.context.assets,
      width: SETTINGS_CONTENT_WIDTH,
      height: startsOnDevicePreferences
        ? SETTINGS_DEVICE_SCROLL_HEIGHT
        : SETTINGS_STANDARD_SCROLL_HEIGHT,
      contentPaddingTop: PIXI_UI_GEOMETRY.dialogScrollPaddingTop,
      showProgress: true,
      label: `${dialogId}:scroll`,
    });
    this.panel.content.addChild(this.scroll);

    this.accountLayer = new Container();
    this.accountLayer.label = `${dialogId}:accountPane`;
    this.reportLayer = new Container();
    this.reportLayer.label = `${dialogId}:reportPane`;
    this.configurationsLayer = new Container();
    this.configurationsLayer.label = `${dialogId}:configurationsPane`;
    this.panel.content.addChild(this.accountLayer);
    this.scroll.content.addChild(
      this.reportLayer,
      this.configurationsLayer,
    );

    this.buildAccountPane();
    this.buildReportPane();
    this.buildConfigurationsPane();
    this.buildAvatarPane();
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  buildAccountPane() {
    this.accountHeaderSection = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${this.dialogId}:accountHeaderSection`,
    );
    this.accountChoiceSection = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${this.dialogId}:accountChoiceSection`,
    );
    this.accountHeader = new PixiNineSliceFrame({
      texture: this.context.assets.getTexture(PIXI_ROOT_RUN_ASSETS.settingsRow),
      sourceInsets: { top: 17, right: 25, bottom: 19, left: 13 },
      borderInsets: { top: 17 / 3, right: 25 / 3, bottom: 19 / 3, left: 13 / 3 },
      width: SETTINGS_CONTENT_WIDTH,
      height: 92,
      label: `${this.dialogId}:accountHeader`,
    });
    this.accountPreviewTile = new Sprite({
      texture: this.context.assets.getTexture(PIXI_ROOT_RUN_ASSETS.accountChoice),
      roundPixels: true,
      label: `${this.dialogId}:accountPreviewFrame`,
    });
    this.accountPreviewPortrait = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
      label: `${this.dialogId}:accountPreviewPortrait`,
    });
    const usernameGeometry = PIXI_ROOT_RUN_GEOMETRY.account.username;
    this.usernameBacking = new PixiNineSliceFrame({
      texture: this.context.assets.getTexture(PIXI_ROOT_RUN_ASSETS.accountUsername),
      sourceInsets: usernameGeometry.sourceInsets,
      borderInsets: usernameGeometry.borderInsets,
      width: usernameGeometry.width,
      height: usernameGeometry.height,
      label: `${this.dialogId}:usernameBacking`,
    });
    this.usernameBacking.tint = PIXI_SQUIRCLE_TINTS.usernameBar;
    this.usernameBacking.alpha = usernameGeometry.alpha;
    this.usernameField = new PixiTextField({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      textEntryService: this.context.textEntryService,
      width: 166,
      height: 34,
      variant: 'account-username',
      inputKind: 'username',
      maxLength: 24,
      onChange: (value) => {
        this.accountDraft.username = value;
        this.accountDraftDirty = true;
        this.setUsernameStatus('');
      },
      onSubmit: () => this.saveAccount(),
      onCancel: () => this.requestClose('text-cancel'),
      label: `${this.dialogId}:usernameField`,
    });
    this.usernameEdit = new Sprite({
      texture: this.context.assets.getTexture(PIXI_ROOT_RUN_ASSETS.accountEdit),
      roundPixels: true,
      label: `${this.dialogId}:usernameEdit`,
    });
    this.usernameEditRegistration =
      this.context.inputRouter?.registerPressTarget?.(this.usernameEdit, {
        enabled: () =>
          this.accountLayer.visible &&
          this.accountLayer.renderable,
        onActivate: () => this.usernameField.focus(),
        haptic: 'selection',
      }) ?? null;
    this.usernameStatus = new PixiTextLabel({
      color: 'disabled',
      label: `${this.dialogId}:usernameStatus`,
    });
    this.avatarTab = new RetainedButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.account.avatarTab`,
      label: 'Avatar',
      buttonLabel: `${this.dialogId}:avatarTab`,
      variant: 'tab',
      onActivate: () => this.selectAccountChoiceTab('avatar'),
    });
    this.avatarTabButton = this.avatarTab.control;
    this.frameTab = new RetainedButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.account.frameTab`,
      label: 'Frame',
      buttonLabel: `${this.dialogId}:frameTab`,
      variant: 'tab',
      onActivate: () => this.selectAccountChoiceTab('frame'),
    });
    this.frameTabButton = this.frameTab.control;
    this.accountChoiceBoard = new PixiNineSliceFrame({
      texture: this.context.assets.getTexture(PIXI_ROOT_RUN_ASSETS.settingsRow),
      sourceInsets: { top: 17, right: 25, bottom: 19, left: 13 },
      borderInsets: { top: 17 / 3, right: 25 / 3, bottom: 19 / 3, left: 13 / 3 },
      width: SETTINGS_CONTENT_WIDTH,
      height: 224,
      label: `${this.dialogId}:accountChoicesBoard`,
    });
    this.accountChoiceScroll = new RetainedScrollArea({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      label: `${this.dialogId}:accountChoices`,
    });
    this.accountSave = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.account.save`,
      text: 'Save',
      variant: 'green',
      width: ACCOUNT_SAVE_WIDTH,
      height: ACCOUNT_SAVE_HEIGHT,
      action: () => this.saveAccount(),
      label: `${this.dialogId}:accountSave`,
    });
    this.accountSave.textLabel.setFontSize(ACCOUNT_SAVE_FONT_SIZE);
    this.usernameSave = this.accountSave;
    this.accountLayer.addChild(
      this.accountHeaderSection,
      this.accountChoiceSection,
      this.accountHeader,
      this.accountPreviewTile,
      this.accountPreviewPortrait,
      this.usernameBacking,
      this.usernameField,
      this.usernameEdit,
      this.usernameStatus,
      this.accountChoiceBoard,
      this.accountChoiceScroll.root,
      this.avatarTab.root,
      this.frameTab.root,
      this.accountSave,
    );
    this.syncAccountChoiceTabs();
  }

  buildReportPane() {
    this.feedbackKindButtons = FEEDBACK_KINDS.map(({ key, label }) => {
      const button = new PixiTabButton({
        assetManager: this.context.assets,
        inputRouter: this.context.inputRouter,
        semanticRegistry: this.context.semanticRegistry,
        semanticId: `${this.dialogId}.feedback.${key}`,
        text: label,
        width: 100,
        height: 24,
        action: () => this.selectFeedbackKind(key),
        label: `${this.dialogId}:feedbackKind:${key}`,
      });
      this.reportLayer.addChild(button);
      return { key, button };
    });
    this.feedbackField = new PixiTextField({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      textEntryService: this.context.textEntryService,
      width: SETTINGS_CONTENT_WIDTH,
      height: 144,
      placeholder: 'write feedback',
      multiline: true,
      maxLength: 2000,
      onChange: (value) => {
        this.feedbackDraft = value;
        this.setFeedbackStatus('');
      },
      onSubmit: () => this.sendFeedback(),
      onCancel: () => this.requestClose('text-cancel'),
      label: `${this.dialogId}:feedbackField`,
    });
    this.feedbackStatus = new PixiTextLabel({
      color: 'muted',
      label: `${this.dialogId}:feedbackStatus`,
    });
    this.feedbackSend = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.feedback.send`,
      text: 'send',
      width: 100,
      height: 30,
      action: () => this.sendFeedback(),
      label: `${this.dialogId}:feedbackSend`,
    });
    this.reportLayer.addChild(
      this.feedbackField,
      this.feedbackStatus,
      this.feedbackSend,
    );
  }

  buildConfigurationsPane() {
    this.devicePanel = new RootRunDevicePreferencesPanel({
      assetManager: this.context.assets,
      width: SETTINGS_CONTENT_WIDTH,
      label: `${this.dialogId}:devicePanel`,
    });
    this.preferenceRows = DEVICE_PREFERENCES.map((definition) => {
      const widget = new RootRunDevicePreferenceRow({
        assetManager: this.context.assets,
        inputRouter: this.context.inputRouter,
        semanticRegistry: this.context.semanticRegistry,
        semanticId: `${this.dialogId}.preference.${definition.key}`,
        preferenceKey: definition.key,
        text: definition.text,
        iconAssetId: definition.iconAssetId,
        onIconAssetId: definition.onIconAssetId,
        label: `${this.dialogId}:preference:${definition.key}`,
      });
      return {
        key: definition.key,
        widget,
        label: widget.textLabel,
        toggle: widget.toggle,
        enabled: true,
      };
    });
    this.devicePanel.setRows(
      this.preferenceRows
        .filter(({ key }) => key !== 'theme')
        .map(({ widget }) => widget),
    );
    this.themePanel = new RootRunDevicePreferencesPanel({
      assetManager: this.context.assets,
      width: SETTINGS_CONTENT_WIDTH,
      label: `${this.dialogId}:themePanel`,
    });
    this.themePanel.setRows(
      this.preferenceRows
        .filter(({ key }) => key === 'theme')
        .map(({ widget }) => widget),
    );
    this.accountConnectionPanel = new PixiNineSliceFrame({
      texture: this.context.assets.getTexture(
        PIXI_ROOT_RUN_ASSETS.settingsRow,
      ),
      sourceInsets:
        PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets:
        PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      width: SETTINGS_CONTENT_WIDTH,
      height: DEVICE_ACCOUNT_PANEL_HEIGHT,
      label: `${this.dialogId}:accountConnectionPanel`,
    });
    this.accountConnectionLabel = new PixiTextLabel({
      text: 'GOOGLE ACCOUNT',
      fontSize: 17,
      fontFamily:
        '"Lilita One", "Arial Black", Arial, sans-serif',
      color: '#735036',
      anchor: { x: 0.5, y: 0 },
      label: `${this.dialogId}:accountConnectionLabel`,
    });
    this.accountStatus = new PixiTextLabel({
      text: 'not connected',
      fontSize: 12,
      color: 'muted',
      anchor: { x: 0.5, y: 0 },
      label: `${this.dialogId}:accountStatus`,
    });
    this.accountConnectButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.account.connect`,
      text: 'connect account',
      width: DEVICE_ACCOUNT_BUTTON_WIDTH,
      height: DEVICE_ACCOUNT_BUTTON_HEIGHT,
      variant: 'yellow',
      action: () => this.runAction('connectAccount'),
      label: `${this.dialogId}:accountConnect`,
    });
    this.identityFooter = new DeviceIdentityFooter({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.identity.copy`,
      width: SETTINGS_CONTENT_WIDTH,
      label: `${this.dialogId}:identityFooter`,
    });
    this.configurationsLayer.addChild(
      this.devicePanel,
      this.themePanel,
      this.accountConnectionPanel,
      this.accountConnectionLabel,
      this.accountStatus,
      this.accountConnectButton,
      this.identityFooter,
    );
  }

  buildAvatarPane() {
    this.avatarPool = new WidgetPool({
      name: `${this.dialogId} avatar option pool`,
      counters: this.context.counters,
      maxSize: 48,
      create: () => {
        const avatar = new SettingsAvatarWidget({
          assetManager: this.context.assets,
          inputRouter: this.context.inputRouter,
          label: `${this.dialogId}:avatarOption`,
        });
        avatar.applyTheme(this.theme ?? this.context.theme);
        return avatar;
      },
      reset: (avatar) => avatar.reset(),
      dispose: (avatar) => avatar.destroy(),
    });
    this.avatars = new PooledCollection({
      name: `${this.dialogId} avatar options`,
      pool: this.avatarPool,
      counters: this.context.counters,
      keyOf: (avatar) => avatar.key,
      bind: (widget, avatar, key) =>
        widget.bind(key, avatar, {
          select: (data) => this.selectAccountOption(data),
        }),
      afterReconcile: (widgets) =>
        orderDisplayObjects(this.accountChoiceScroll.content, widgets),
    });
    this.framePool = new WidgetPool({
      name: `${this.dialogId} frame option pool`,
      counters: this.context.counters,
      maxSize: 12,
      create: () => new SettingsAvatarWidget({
        assetManager: this.context.assets,
        inputRouter: this.context.inputRouter,
        label: `${this.dialogId}:frameOption`,
      }),
      reset: (widget) => widget.reset(),
      dispose: (widget) => widget.destroy(),
    });
    this.frames = new PooledCollection({
      name: `${this.dialogId} frame options`,
      pool: this.framePool,
      counters: this.context.counters,
      keyOf: (frame) => frame.key,
      bind: (widget, frame, key) =>
        widget.bind(key, frame, {
          select: (data) => this.selectAccountOption(data),
        }),
      afterReconcile: (widgets) =>
        orderDisplayObjects(this.accountChoiceScroll.content, widgets),
    });
  }

  bindDialog(viewModel) {
    const model = normalizeSettingsModel(viewModel, {
      initialTab: this.initialTab,
      initialFeedbackKind: this.feedbackKind,
    });
    this.settingsModel = model;
    this.selectedTab = model.tabId;
    this.feedbackKind = model.feedback.kind;
    this.closeControl?.setText(
      model.account.usernameRequired ? 'later' : 'close',
    );

    if (!this.accountDraftDirty && !this.usernameField.focused) {
      this.accountDraft = {
        username: model.account.username,
        character: model.selections.character,
        frame: model.selections.frame,
      };
      this.usernameField.setValue(this.accountDraft.username);
    }
    if (!this.feedbackField.focused) {
      this.feedbackDraft = model.feedback.value;
      this.feedbackField.setValue(this.feedbackDraft);
    }
    this.usernameStatus.setText(model.account.status);
    this.feedbackStatus.setText(model.feedback.status);
    this.feedbackPending = model.feedback.pending;
    this.feedbackSend
      .setText(this.feedbackPending ? '...' : 'send')
      .setEnabled(!this.feedbackPending);
    this.updateFeedbackKindButtons();
    this.updateFeedbackPlaceholder();

    for (const preference of this.preferenceRows) {
      preference.enabled =
        model.preferences[preference.key] !== false;
      preference.widget.bind({
        value: preference.enabled,
        onChange: (enabled) =>
          this.setPreference(preference.key, enabled),
      });
    }
    this.accountStatus.setText(
      compactConnectionStatus(model.account.accountStatus),
    );
    this.accountConnectButton
      .setText(model.account.connectLabel)
      .setEnabled(model.account.connectEnabled);
    this.identityFooter.bind({
      version: model.account.version,
      userId: model.account.userId,
      onCopy:
        this.actions.copyUserId ??
        copyTextToClipboard,
    });

    this.refreshAccountChoices();
    this.refreshAccountPreview();
    this.renderSelectedPane();
  }

  selectTab(tabId) {
    const next = normalizeSettingsTab(tabId);
    if (next === this.selectedTab) {
      return true;
    }
    this.scrollOffsets.set(this.selectedTab, this.scroll.scrollY);
    this.selectedTab = next;
    const result =
      this.actions.selectTab?.(next) ??
      this.actions.selectSettingsTab?.(next);
    if (result === false) {
      this.selectedTab = normalizeSettingsTab(
        this.settingsModel?.tabId ?? this.initialTab,
      );
      return false;
    }
    this.renderSelectedPane();
    return true;
  }

  renderSelectedPane() {
    const pane =
      this.selectedTab === 'report'
        ? this.reportLayer
        : this.selectedTab === 'configurations'
          ? this.configurationsLayer
          : this.accountLayer;
    for (const layer of [
      this.accountLayer,
      this.reportLayer,
      this.configurationsLayer,
    ]) {
      const visible = layer === pane;
      layer.visible = visible;
      layer.renderable = visible;
      layer.eventMode = visible ? 'passive' : 'none';
    }
    this.layoutActivePane();
    const devicePreferences = this.selectedTab === 'configurations';
    const account = this.selectedTab === 'account';
    this.accountLayer.position.set(
      ACCOUNT_SCROLL_X,
      PIXI_UI_GEOMETRY.dialogScrollPaddingTop,
    );
    this.scroll.position.set(0, 0);
    this.setPanelContentSize(
      SETTINGS_CONTENT_WIDTH,
      account
        ? this.activePaneHeight
        : devicePreferences
          ? SETTINGS_DEVICE_CONTENT_HEIGHT
          : SETTINGS_STANDARD_CONTENT_HEIGHT,
    );
    this.scroll.setViewportSize(
      account ? ACCOUNT_HEADER_WIDTH : SETTINGS_CONTENT_WIDTH,
      account
        ? this.activePaneHeight
        : devicePreferences
          ? SETTINGS_DEVICE_SCROLL_HEIGHT
          : SETTINGS_STANDARD_SCROLL_HEIGHT,
    );
    this.scroll.setContentHeight(this.activePaneHeight);
    this.scroll.scrollTo(this.scrollOffsets.get(this.selectedTab) ?? 0);
    this.syncOuterScrollState(account);
    this.syncAccountPaper(account);
    this.syncTitleFrame(account);
  }

  syncOuterScrollState(account) {
    const visible = !account;
    this.scroll.visible = visible;
    this.scroll.renderable = visible;
    this.scroll.eventMode = visible ? 'static' : 'none';
    if (account) {
      this.scroll.scrollTo(0);
      this.scroll.progressBar.visible = false;
    }
  }

  syncAccountPaper(account) {
    this.panel.setPaperVisible(!account);
    for (const section of [
      this.accountHeaderSection,
      this.accountChoiceSection,
    ]) {
      section.visible = account;
      section.renderable = account;
    }
  }

  syncTitleFrame(account) {
    this.panel.setTitle(
      account
        ? 'Wizard'
        : this.model.title ?? this.defaultTitle,
    );
    const titleFrame = this.panel.titleFrame;
    if (!titleFrame) {
      return;
    }
    if (account) {
      const sourceInsets = { top: 120, right: 133, bottom: 0, left: 95 };
      const borderInsets = {
        top: 40,
        right: 133 / 3,
        bottom: 0,
        left: 95 / 3,
      };
      titleFrame
        .setTexture(
          this.context.assets.getTexture(PIXI_ROOT_RUN_ASSETS.accountTitle),
          sourceInsets,
        )
        .setSize(titleFrame.frameWidth, titleFrame.frameHeight, borderInsets);
      return;
    }
    titleFrame
      .setTexture(
        this.context.assets.getTexture(PIXI_ROOT_RUN_ASSETS.dialogTitle),
        PIXI_ROOT_RUN_GEOMETRY.dialog.titleSourceInsets,
      )
      .setSize(
        titleFrame.frameWidth,
        titleFrame.frameHeight,
        PIXI_ROOT_RUN_GEOMETRY.dialog.titleBorderInsets,
      );
  }

  layoutActivePane() {
    if (this.selectedTab === 'report') {
      this.activePaneHeight = this.layoutReportPane();
      return;
    }
    if (this.selectedTab === 'configurations') {
      this.activePaneHeight = this.layoutConfigurationsPane();
      return;
    }
    this.activePaneHeight = this.layoutAccountPane();
  }

  layoutAccountPane() {
    const username = PIXI_ROOT_RUN_GEOMETRY.account.username;
    const paperOutsets = resolveDialogPaperOutsets(
      this.panel.contentInsets,
    );
    const sectionInset =
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
    const headerSectionHeight =
      sectionInset +
      ACCOUNT_HEADER_HEIGHT +
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
    setDialogPaperSectionBounds(
      this.accountHeaderSection,
      {
        x: ACCOUNT_SECTION_CONTENT_X,
        y: 0,
        width: SETTINGS_CONTENT_WIDTH,
        height: headerSectionHeight,
      },
      paperOutsets,
    );
    this.accountHeader.position.set(
      ACCOUNT_HEADER_X,
      sectionInset,
    );
    this.accountHeader.setSize(ACCOUNT_HEADER_WIDTH, ACCOUNT_HEADER_HEIGHT);
    this.accountPreviewTile.position.set(
      ACCOUNT_HEADER_X + 22 * (ACCOUNT_HEADER_WIDTH / 925),
      sectionInset + 35 / 3,
    );
    this.accountPreviewTile.width = ACCOUNT_HEADER_TILE_SIZE;
    this.accountPreviewTile.height = ACCOUNT_HEADER_TILE_SIZE;
    this.accountPreviewPortrait.position.set(
      ACCOUNT_HEADER_X + 42 * (ACCOUNT_HEADER_WIDTH / 925),
      sectionInset + 54 / 3,
    );
    this.accountPreviewPortrait.width = ACCOUNT_HEADER_PORTRAIT_WIDTH;
    this.accountPreviewPortrait.height = ACCOUNT_HEADER_PORTRAIT_WIDTH;
    this.usernameBacking.position.set(
      ACCOUNT_HEADER_X + 253 * (ACCOUNT_HEADER_WIDTH / 925),
      sectionInset + 96 / 3,
    );
    this.usernameBacking.setSize(
      username.width,
      username.height,
      username.borderInsets,
    );
    this.usernameField.position.set(
      this.usernameBacking.x + username.textInsetX,
      this.usernameBacking.y + username.textInsetY,
    );
    this.usernameField.setSize(
      535 / 3,
      username.height - username.textInsetY,
    );
    this.usernameEdit.position.set(
      this.usernameBacking.x +
        username.width -
        username.editInsetRight -
        username.editSize,
      this.usernameBacking.y +
        (username.height - username.editSize) / 2,
    );
    this.usernameEdit.width = username.editSize;
    this.usernameEdit.height = username.editSize;
    this.usernameStatus.position.set(
      this.usernameField.x,
      this.usernameBacking.y + username.height + 2,
    );

    const choiceSectionY =
      headerSectionHeight +
      paperOutsets.bottom +
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap +
      paperOutsets.top;
    const choiceSectionHeight =
      sectionInset +
      ACCOUNT_CHOICES_HEIGHT +
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
    setDialogPaperSectionBounds(
      this.accountChoiceSection,
      {
        x: ACCOUNT_SECTION_CONTENT_X,
        y: choiceSectionY,
        width: SETTINGS_CONTENT_WIDTH,
        height: choiceSectionHeight,
      },
      paperOutsets,
    );
    this.accountChoiceBoard.position.set(
      ACCOUNT_HEADER_X,
      choiceSectionY + sectionInset,
    );
    this.accountChoiceBoard.setSize(
      ACCOUNT_HEADER_WIDTH,
      ACCOUNT_CHOICE_BOARD_HEIGHT,
    );
    this.accountChoiceScroll.setBounds(
      this.accountChoiceBoard.x + ACCOUNT_CHOICE_SCROLL_LEFT_INSET,
      this.accountChoiceBoard.y + ACCOUNT_CHOICES_SCROLL_INSET_Y,
      ACCOUNT_CHOICE_SCROLL_WIDTH,
      ACCOUNT_CHOICE_SCROLL_HEIGHT,
    );
    const tabX =
      (ACCOUNT_HEADER_WIDTH - ACCOUNT_TAB_ROW_WIDTH) / 2;
    const tabY =
      this.accountChoiceBoard.y +
      ACCOUNT_CHOICE_BOARD_HEIGHT +
      ACCOUNT_TABS_TOP_INSET;
    const tabWidth =
      (ACCOUNT_TAB_ROW_WIDTH - ACCOUNT_TAB_GAP) / 2;
    this.avatarTab.setBounds(
      tabX,
      tabY,
      tabWidth,
      ACCOUNT_TAB_HEIGHT,
    );
    this.frameTab.setBounds(
      tabX + tabWidth + ACCOUNT_TAB_GAP,
      tabY,
      tabWidth,
      ACCOUNT_TAB_HEIGHT,
    );
    const choiceSectionBottom =
      this.accountChoiceSection.y +
      this.accountChoiceSection.frameHeight;
    this.accountSave.position.set(
      (ACCOUNT_HEADER_WIDTH - ACCOUNT_SAVE_WIDTH) / 2,
      choiceSectionBottom + ACCOUNT_SAVE_GAP,
    );
    this.accountSave.setSize(
      ACCOUNT_SAVE_WIDTH,
      ACCOUNT_SAVE_HEIGHT,
    );
    this.layoutAvatarPane();
    return (
      this.accountSave.y +
      ACCOUNT_SAVE_HEIGHT +
      ACCOUNT_BOTTOM_GAP
    );
  }

  layoutReportPane() {
    const gap = 5;
    const width =
      (SETTINGS_CONTENT_WIDTH - gap * 2) / 3;
    this.feedbackKindButtons.forEach(({ button }, index) => {
      button.position.set(index * (width + gap), 0);
      button.setSize(width, 24);
    });
    this.feedbackField.position.set(0, 36);
    this.feedbackField.setSize(SETTINGS_CONTENT_WIDTH, 144);
    this.feedbackStatus.position.set(0, 188);
    this.feedbackSend.position.set(0, 214);
    this.feedbackSend.setSize(100, 30);
    return 250;
  }

  layoutConfigurationsPane() {
    let y = 0;
    this.devicePanel.position.set(0, y);
    this.devicePanel.setWidth(SETTINGS_CONTENT_WIDTH);
    y +=
      this.devicePanel.panelHeight +
      DEVICE_SECTION_GAP;
    this.themePanel.position.set(0, y);
    this.themePanel.setWidth(SETTINGS_CONTENT_WIDTH);
    y +=
      this.themePanel.panelHeight +
      DEVICE_SECTION_GAP;
    this.accountConnectionPanel.position.set(0, y);
    this.accountConnectionPanel.setSize(
      SETTINGS_CONTENT_WIDTH,
      DEVICE_ACCOUNT_PANEL_HEIGHT,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    const accountPanelY = y;
    y += DEVICE_ACCOUNT_PANEL_PADDING_TOP;
    this.accountConnectionLabel.position.set(
      SETTINGS_CONTENT_WIDTH / 2,
      y,
    );
    y +=
      this.accountConnectionLabel.measuredHeight +
      DEVICE_ACCOUNT_STATUS_GAP;
    this.accountStatus.position.set(
      SETTINGS_CONTENT_WIDTH / 2,
      y,
    );
    y +=
      this.accountStatus.measuredHeight +
      DEVICE_ACCOUNT_BUTTON_GAP;
    this.accountConnectButton.position.set(
      (SETTINGS_CONTENT_WIDTH - DEVICE_ACCOUNT_BUTTON_WIDTH) / 2,
      y,
    );
    this.accountConnectButton.setSize(
      DEVICE_ACCOUNT_BUTTON_WIDTH,
      DEVICE_ACCOUNT_BUTTON_HEIGHT,
    );
    y =
      accountPanelY +
      DEVICE_ACCOUNT_PANEL_HEIGHT +
      DEVICE_ACCOUNT_FOOTER_GAP;
    this.identityFooter.position.set(0, y);
    this.identityFooter.setWidth(SETTINGS_CONTENT_WIDTH);
    y += this.identityFooter.footerHeight;
    return y;
  }

  layoutAvatarPane() {
    const widgets = this.accountChoiceTab === 'frame'
      ? this.frames.getWidgets()
      : this.avatars.getWidgets();
    widgets.forEach((widget, index) => {
      const column = index % ACCOUNT_GRID_COLUMNS;
      const row = Math.floor(index / ACCOUNT_GRID_COLUMNS);
      widget.setBounds(
        ACCOUNT_CHOICE_INDICATOR_BLEED +
          column * (ACCOUNT_TILE_SIZE + ACCOUNT_TILE_GAP),
        ACCOUNT_CHOICE_INDICATOR_BLEED +
          row * (ACCOUNT_TILE_SIZE + ACCOUNT_TILE_GAP),
        ACCOUNT_TILE_SIZE,
        ACCOUNT_TILE_SIZE,
      );
    });
    const rows = Math.ceil(widgets.length / ACCOUNT_GRID_COLUMNS);
    this.accountChoiceScroll.setContentHeight(
      Math.max(
        this.accountChoiceScroll.height,
        ACCOUNT_CHOICE_INDICATOR_BLEED * 2 +
          rows * ACCOUNT_TILE_SIZE +
          Math.max(0, rows - 1) * ACCOUNT_TILE_GAP,
      ),
    );
    return this.accountChoiceScroll.contentHeight;
  }

  selectAccountChoiceTab(tab) {
    this.accountChoiceTab = tab === 'frame' ? 'frame' : 'avatar';
    this.syncAccountChoiceTabs();
    this.refreshAccountChoices();
    return true;
  }

  syncAccountChoiceTabs() {
    this.avatarTab.setModel({
      label: 'Avatar',
      selected: this.accountChoiceTab === 'avatar',
      action: () => this.selectAccountChoiceTab('avatar'),
    });
    this.frameTab.setModel({
      label: 'Frame',
      selected: this.accountChoiceTab === 'frame',
      action: () => this.selectAccountChoiceTab('frame'),
    });
  }

  selectAccountOption(data) {
    if (data.researched === false) {
      return false;
    }
    if (data.category === 'frame') {
      this.accountDraft.frame = data.key;
    } else {
      this.accountDraft.character = data.key;
    }
    this.accountDraftDirty = true;
    this.refreshAccountChoices();
    this.refreshAccountPreview();
    return true;
  }

  refreshAccountChoices() {
    const equipped = this.settingsModel?.selections ?? {};
    const draft = this.accountDraft;
    const avatars = (this.settingsModel?.avatars ?? []).map((option) => ({
      ...option,
      selected: draft.character === option.key,
      equipped: equipped.character === option.key,
      portraitKey: option.key,
      frameTint: getPlayerFrameTint(draft.frame),
    }));
    const frames = (this.settingsModel?.frames ?? []).map((option) => ({
      ...option,
      selected: draft.frame === option.key,
      equipped: equipped.frame === option.key,
      portraitKey: draft.character,
      frameTint: option.tint ?? getPlayerFrameTint(option.key),
    }));
    if (this.accountChoiceTab === 'frame') {
      this.avatars.reconcile([]);
      this.frames.reconcile(frames);
    } else {
      this.frames.reconcile([]);
      this.avatars.reconcile(avatars);
    }
    this.layoutAvatarPane();
  }

  refreshAccountPreview() {
    this.accountPreviewTile.tint = getPlayerFrameTint(this.accountDraft.frame);
    this.accountPreviewPortrait.texture = getCharacterTexture(
      this.context.assets,
      this.accountDraft.character,
    );
  }

  selectFeedbackKind(kind) {
    this.feedbackKind = normalizeFeedbackKind(kind);
    const result =
      this.actions.selectFeedbackKind?.(this.feedbackKind) ??
      this.actions.selectReportKind?.(this.feedbackKind);
    if (result === false) {
      this.feedbackKind = normalizeFeedbackKind(
        this.settingsModel?.feedback?.kind,
      );
      return false;
    }
    this.updateFeedbackKindButtons();
    this.updateFeedbackPlaceholder();
    this.setFeedbackStatus('');
    return true;
  }

  updateFeedbackKindButtons() {
    for (const { key, button } of this.feedbackKindButtons) {
      button.setSelected(key === this.feedbackKind);
    }
  }

  updateFeedbackPlaceholder() {
    const config = getFeedbackKind(this.feedbackKind);
    this.feedbackField.placeholder = config.placeholder;
    this.feedbackField.redrawTextState();
  }

  async sendFeedback() {
    if (this.feedbackPending) {
      return false;
    }
    const config = getFeedbackKind(this.feedbackKind);
    const body = String(this.feedbackDraft ?? '').trim();
    if (!body) {
      this.setFeedbackStatus(config.emptyMessage);
      return false;
    }
    const action =
      this.model.onSubmit ??
      this.actions.sendFeedback ??
      this.actions.submitFeedback;
    if (!action) {
      this.setFeedbackStatus('offline');
      return false;
    }
    this.setFeedbackPending(true);
    let result;
    try {
      result = await action({
        kind: this.feedbackKind,
        body,
      });
    } catch {
      result = { ok: false, reason: 'offline' };
    }
    this.setFeedbackPending(false);
    if (result?.ok === false || result === false) {
      this.setFeedbackStatus(
        result?.message ??
          formatFeedbackFailure(result?.reason),
      );
      return result;
    }
    this.feedbackDraft = '';
    this.feedbackField.setValue('');
    this.setFeedbackStatus('sent');
    return result ?? { ok: true };
  }

  setFeedbackPending(pending) {
    this.feedbackPending = Boolean(pending);
    this.feedbackSend
      .setText(this.feedbackPending ? '...' : 'send')
      .setEnabled(!this.feedbackPending);
  }

  setFeedbackStatus(status) {
    this.feedbackStatus.setText(status ?? '');
  }

  saveUsername() {
    return this.saveAccount();
  }

  saveAccount() {
    const username = String(this.accountDraft.username ?? '').trim();
    if (
      this.settingsModel?.account?.usernameRequired &&
      !username
    ) {
      this.setUsernameStatus('enter a name');
      return false;
    }
    const action =
      this.actions.saveAccount ??
      this.model.onSaveUsername ??
      this.actions.saveUsername ??
      this.actions.setUsername;
    if (!action) {
      return false;
    }
    const result = this.actions.saveAccount
      ? action({
          username,
          character: this.accountDraft.character,
          frame: this.accountDraft.frame,
        })
      : action(username);
    if (result?.ok === false || result === false) {
      this.setUsernameStatus(
        result?.message ?? 'not saved',
      );
      return result;
    }
    this.setUsernameStatus('');
    this.accountDraftDirty = false;
    return result ?? true;
  }

  setUsernameStatus(status) {
    this.usernameStatus.setText(status ?? '');
  }

  setPreference(key, enabled) {
    const row = this.preferenceRows.find(
      (candidate) => candidate.key === key,
    );
    if (!row) {
      return false;
    }
    const result =
      this.actions.togglePreference?.(key, enabled) ??
      this.actions[`toggle${capitalize(key)}`]?.(enabled);
    if (result === false) {
      row.toggle.bind({
        value: row.enabled,
        onChange: (nextEnabled) =>
          this.setPreference(key, nextEnabled),
      });
      return false;
    }
    row.enabled = enabled;
    return result ?? true;
  }

  runAction(name, ...args) {
    return this.actions[name]?.(...args) ?? false;
  }

  applyDialogTheme(theme) {
    this.scroll?.applyTheme(theme);
    for (const label of [
      this.usernameStatus,
      this.feedbackStatus,
      this.accountConnectionLabel,
      this.accountStatus,
    ]) {
      label?.applyTheme(theme);
    }
    for (const field of [
      this.usernameField,
      this.feedbackField,
    ]) {
      field?.applyTheme(theme);
    }
    for (const button of [
      this.avatarTabButton,
      this.frameTabButton,
      this.accountSave,
      this.feedbackSend,
      this.accountConnectButton,
      ...this.feedbackKindButtons?.map(({ button }) => button) ?? [],
    ]) {
      button?.applyTheme(theme);
    }
    const deviceTheme = this.theme ?? this.context.theme;
    this.devicePanel?.applyTheme(deviceTheme);
    this.themePanel?.applyTheme(deviceTheme);
    this.identityFooter?.applyTheme(deviceTheme);
    for (const avatar of this.avatars?.getWidgets?.() ?? []) {
      avatar.applyTheme(theme);
    }
    for (const frame of this.frames?.getWidgets?.() ?? []) {
      frame.applyTheme(theme);
    }
    if (this.usernameField) {
      this.usernameField.insetFrame.visible = false;
    }
  }

  layoutDialog() {
    const account = this.selectedTab === 'account';
    this.accountLayer.position.set(
      ACCOUNT_SCROLL_X,
      PIXI_UI_GEOMETRY.dialogScrollPaddingTop,
    );
    this.scroll.position.set(0, 0);
    this.scroll.setViewportSize(
      SETTINGS_CONTENT_WIDTH,
      this.selectedTab === 'configurations'
          ? SETTINGS_DEVICE_SCROLL_HEIGHT
          : SETTINGS_STANDARD_SCROLL_HEIGHT,
    );
    this.layoutActivePane();
    this.scroll.setContentHeight(this.activePaneHeight);
    this.syncOuterScrollState(account);
    if (this.selectedTab === 'account') {
      this.syncAccountPaper(true);
    }
  }

  getModalContentRoots() {
    return [this.panel];
  }

  activateDialog() {
    this.actions.activate?.();
    if (this.selectedTab === 'report' && this.model.focusInput) {
      void this.feedbackField.focus();
    }
  }

  deactivateDialog() {
    this.usernameField.blur();
    this.feedbackField.blur();
    this.feedbackPending = false;
    this.accountDraftDirty = false;
    this.actions.deactivate?.();
  }

  destroyDialog() {
    if (typeof this.usernameEditRegistration === 'function') {
      this.usernameEditRegistration();
    } else {
      this.usernameEditRegistration?.unregister?.();
    }
    this.usernameEditRegistration = null;
    this.avatars?.destroy();
    this.avatarPool?.destroy();
    this.frames?.destroy();
    this.framePool?.destroy();
    this.accountChoiceScroll?.destroy();
  }

  getPoolStats() {
    return Object.freeze({
      avatars: this.avatarPool.getStats(),
      frames: this.framePool.getStats(),
    });
  }
}

export class SettingsAvatarWidget extends ClickableWidget {
  constructor({
    assetManager,
    inputRouter,
    label,
  }) {
    super({
      enabled: false,
      inputRouter,
      label,
    });
    this.assetManager = assetManager;
    this.visual = new Container({ label: `${label}:visual` });
    this.setClickableVisual(this.visual);
    this.frame = new Sprite({
      texture: assetManager.getTexture(PIXI_ROOT_RUN_ASSETS.accountChoice),
      roundPixels: true,
      label: `${label}:frame`,
    });
    this.sprite = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
      label: `${label}:portrait`,
    });
    this.lockOverlay = new Graphics({
      label: `${label}:lockOverlay`,
    });
    this.selectionFrame = new Sprite({
      texture: assetManager.getTexture(PIXI_ROOT_RUN_ASSETS.accountSelected),
      roundPixels: true,
      label: `${label}:selectedFrame`,
    });
    this.status = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
      label: `${label}:status`,
    });
    this.visual.addChild(
      this.frame,
      this.sprite,
      this.lockOverlay,
      this.selectionFrame,
      this.status,
    );
    this.root.addChild(this.visual);
    this.data = {};
    this.actions = {};
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.root.visible = false;
  }

  bind(_key, data, actions) {
    this.data = data;
    this.actions = actions ?? {};
    this.root.visible = true;
    this.root.renderable = true;
    this.setClickableState({
      action: () => this.actions.select?.(this.data),
      enabled:
        data.enabled !== false &&
        data.researched !== false &&
        data.selected !== true,
    });
    this.sprite.texture = getCharacterTexture(
      this.assetManager,
      data.portraitKey ?? data.key,
    );
    this.frame.tint = data.frameTint ?? 0xffffff;
    this.status.texture = getStatusTexture(
      this.assetManager,
      data.equipped ? 'check' : 'lock',
    );
    this.status.visible =
      data.equipped || data.researched === false;
    this.status.renderable = this.status.visible;
    this.selectionFrame.visible = data.selected === true;
    this.selectionFrame.renderable = this.selectionFrame.visible;
    this.lockOverlay.visible = data.researched === false;
    this.lockOverlay.renderable = this.lockOverlay.visible;
    this.sprite.alpha = 1;
    this.redraw();
  }

  reset() {
    this.data = {};
    this.actions = {};
    this.resetClickableState();
    this.root.visible = false;
    this.root.renderable = false;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.visual.pivot.set(width / 2, height / 2);
    this.visual.position.set(width / 2, height / 2);
    this.frame.position.set(0, 0);
    this.frame.width = width;
    this.frame.height = height;
    const inset = 4;
    this.sprite.position.set(inset, inset);
    this.sprite.width = width - inset * 2;
    this.sprite.height = height - inset * 2;
    this.lockOverlay
      .clear()
      .roundRect(1, 1, width - 2, height - 2, 7)
      .fill({ color: '#090b12', alpha: 0.62 });
    this.selectionFrame.position.set(-4, -4);
    this.selectionFrame.width = width + 8;
    this.selectionFrame.height = height + 8;
    this.status.position.set(
      width - 17,
      this.data.equipped ? height - 17 : 1,
    );
    this.status.width = 16;
    this.status.height = 16;
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    return this;
  }

  redraw() {}

  destroy() {
    super.destroy({ children: true });
  }
}

function normalizeSettingsModel(
  source = {},
  {
    initialTab,
    initialFeedbackKind,
  },
) {
  const settings = source.settings ?? source;
  const account = settings.account ?? {};
  const feedback = settings.feedback ?? {};
  const costs = settings.costsCrystal ?? {};
  const researched = settings.researched ?? {};
  const suppliedCategories = Array.isArray(settings.categories)
    ? settings.categories
    : [];
  const categories = suppliedCategories.map((category) => ({
    ...category,
    options: Array.isArray(category.options)
      ? category.options
      : [],
  }));
  const selections = settings.selections ?? {};
  const avatarCategory = categories.find(
    (category) => category.key === 'character',
  );
  const frameCategory = categories.find(
    (category) => category.key === 'frame',
  );
  const avatars = (avatarCategory?.options ?? []).map((option) =>
    normalizeVisualOption({
      category: 'character',
      option,
      selection:
        selections.character ??
        settings.character,
      researched: researched.character?.[option.key],
      cost: costs.character?.[option.key],
    }),
  );
  const frames = (frameCategory?.options ?? []).map((option) => ({
    ...normalizeVisualOption({
      category: 'frame',
      option,
      selection: selections.frame ?? settings.frame,
      researched: researched.frame?.[option.key],
      cost: costs.frame?.[option.key],
    }),
    tint: option.tint ?? getPlayerFrameTint(option.key),
  }));
  const requestedTab =
    settings.tabId ??
    settings.selectedTab ??
    source.tab ??
    initialTab;
  return {
    tabId: normalizeSettingsTab(requestedTab),
    account: {
      username: String(
        account.username ??
          settings.username ??
          'Wizard',
      ),
      usernameRequired:
        account.usernameRequired === true ||
        settings.usernamePromptMode === true,
      status: String(
        account.status ??
          account.usernameError ??
          '',
      ),
      accountStatus: String(
        account.accountStatus ??
          account.authStatus ??
          'not connected',
      ),
      connectLabel: String(
        account.connectLabel ?? 'connect account',
      ),
      connectEnabled:
        account.connectEnabled !== false &&
        account.loginAvailable !== false,
      version: String(
        account.version ??
          settings.version ??
          getClientReleaseVersion(),
      ),
      userId: String(
        account.userId ??
          account.identity ??
          settings.userId ??
          '',
      ),
    },
    feedback: {
      kind: normalizeFeedbackKind(
        feedback.kind ??
          settings.feedbackKind ??
          source.kind ??
          initialFeedbackKind,
      ),
      value: String(feedback.value ?? ''),
      status: String(feedback.status ?? ''),
      pending: feedback.pending === true,
    },
    preferences: {
      haptics:
        settings.preferences?.haptics ??
        settings.hapticsEnabled ??
        true,
      music:
        settings.preferences?.music ??
        settings.musicEnabled ??
        true,
      sfx:
        settings.preferences?.sfx ??
        settings.sfxEnabled ??
        true,
      theme:
        settings.preferences?.theme ??
        settings.theme === 'day',
    },
    avatars,
    frames,
    selections: {
      character: String(selections.character ?? settings.character ?? 'elara'),
      frame: String(selections.frame ?? settings.frame ?? 'classic'),
    },
  };
}

function normalizeVisualOption({
  category,
  option,
  selection,
  researched,
  cost,
}) {
  const isResearched =
    option.researched ??
    researched ??
    true;
  const safeCost = Math.max(
    0,
    Number(option.cost ?? cost) || 0,
  );
  return {
    category,
    key: String(option.key ?? option.id ?? ''),
    label: String(option.label ?? option.key ?? ''),
    selected:
      option.selected === true ||
      String(selection ?? '') === String(option.key ?? ''),
    researched: isResearched !== false,
    enabled: option.enabled !== false,
    priceLabel: String(
      option.priceLabel ??
        (safeCost > 0 ? `${safeCost} crystal` : 'free'),
    ),
    priceHidden: option.priceHidden === true,
  };
}

async function copyTextToClipboard(text) {
  const clipboard = globalThis.navigator?.clipboard;
  if (typeof clipboard?.writeText !== 'function') {
    return false;
  }
  try {
    await clipboard.writeText(String(text ?? ''));
    return true;
  } catch {
    return false;
  }
}

function compactConnectionStatus(status) {
  const value = String(status ?? '').trim();
  if (value.length <= 42) {
    return value;
  }
  return `${value.slice(0, 25)}…${value.slice(-16)}`;
}

function normalizeSettingsTab(tabId) {
  const normalized = String(tabId ?? '').toLowerCase();
  if (normalized === 'theme' || normalized === 'appearance') {
    return 'configurations';
  }
  if (normalized === 'avatar') {
    return 'account';
  }
  return SETTINGS_TABS.has(normalized) ? normalized : 'account';
}

function normalizeFeedbackKind(kind) {
  const normalized = String(kind ?? '').toLowerCase();
  return FEEDBACK_KINDS.some(({ key }) => key === normalized)
    ? normalized
    : 'feedback';
}

function getFeedbackKind(kind) {
  return (
    FEEDBACK_KINDS.find(
      (candidate) => candidate.key === kind,
    ) ?? FEEDBACK_KINDS[0]
  );
}

function formatFeedbackFailure(reason) {
  if (reason === 'offline') {
    return 'offline';
  }
  if (reason === 'rate_limited') {
    return 'try again later';
  }
  return 'not sent';
}

function capitalize(value) {
  const text = String(value ?? '');
  return text
    ? `${text[0].toUpperCase()}${text.slice(1)}`
    : '';
}

function getCharacterTexture(assetManager, key) {
  try {
    return assetManager?.getTexture?.(
      `source:assets/avatars/${key}.png`,
    ) ?? Texture.EMPTY;
  } catch {
    try {
      return assetManager?.getTexture?.(
        'source:assets/avatars/elara.png',
      ) ?? Texture.EMPTY;
    } catch {
      return Texture.EMPTY;
    }
  }
}

function getStatusTexture(assetManager, status) {
  try {
    return assetManager?.getAtlasTexture?.(
      status === 'check'
        ? 'status:checkDefault'
        : 'status:lockDefault',
    ) ?? Texture.EMPTY;
  } catch {
    return Texture.EMPTY;
  }
}
