import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

import {
  DeviceIdentityFooter,
  PixiTextButton,
  PixiTabButton,
  createDialogPaperSection,
  PixiNineSliceFrame,
  PixiTextField,
  PixiTextLabel,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  resolveDialogPaperOutsets,
  RootRunDevicePreferenceRow,
  RootRunDevicePreferencesPanel,
  setDialogPaperSectionBounds,
} from '../../primitives/index.js';
import { PooledCollection, WidgetPool } from '../../retained/index.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_SQUIRCLE_TINTS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { getPlayerFrameTint } from '../../../../player/playerFrames.js';
import { getClientReleaseVersion } from '../../../../shared/clientReleaseVersion.js';
import {
  PLAYER_PROFILE_SIZE,
  PlayerProfileWidget,
  PlayerSelectableProfileWidget,
} from '../chrome/PlayerProfileWidgets.js';
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

const SETTINGS_CONTENT_WIDTH = GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const SETTINGS_STANDARD_CONTENT_HEIGHT = 410;
const SETTINGS_STANDARD_SCROLL_HEIGHT = 390;
const ACCOUNT_HEADER_WIDTH = PIXI_ROOT_RUN_GEOMETRY.dialog.innerBoardWidth;
const ACCOUNT_HEADER_HEIGHT = 281 / 3;
const ACCOUNT_USERNAME_EDIT_HIT_SIZE = 32;
const ACCOUNT_SCROLL_X = (SETTINGS_CONTENT_WIDTH - ACCOUNT_HEADER_WIDTH) / 2;
const ACCOUNT_SECTION_CONTENT_X =
  (ACCOUNT_HEADER_WIDTH - SETTINGS_CONTENT_WIDTH) / 2;
const ACCOUNT_HEADER_X = 0;
const ACCOUNT_TILE_SIZE = 183 / 3;
const ACCOUNT_GRID_COLUMNS = 4;
const ACCOUNT_HEADER_TILE_SIZE = 209 / 3;
const ACCOUNT_CHOICES_SCROLL_INSET_Y = 24 / 3;
const ACCOUNT_CHOICE_INDICATOR_BLEED = 4;
const ACCOUNT_CHOICE_SCROLL_LEFT_INSET = 4;
const ACCOUNT_CHOICE_SCROLL_RIGHT_INSET = 2;
const ACCOUNT_SCROLLBAR_OUTSET =
  RETAINED_SCROLLBAR_GEOMETRY.gap + RETAINED_SCROLLBAR_GEOMETRY.width;
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
const ACCOUNT_FULL_VISIBLE_CHOICE_ROWS = Math.floor(
  ACCOUNT_VISIBLE_CHOICE_ROWS,
);
const ACCOUNT_PARTIAL_VISIBLE_CHOICE_ROW =
  ACCOUNT_VISIBLE_CHOICE_ROWS - ACCOUNT_FULL_VISIBLE_CHOICE_ROWS;
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
const SETTINGS_DEVICE_CONTENT_HEIGHT = 480;
const SETTINGS_DEVICE_SCROLL_HEIGHT = 460;
const SETTINGS_TABS = new Set(['account', 'report', 'configurations']);
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
    controlKind: 'slider',
  }),
  Object.freeze({
    key: 'music',
    text: 'MUSIC',
    iconAssetId: PIXI_ROOT_RUN_ASSETS.settingsMusic,
    controlKind: 'slider',
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
const DEVICE_UPDATE_BUTTON_GAP = 8;
const DEVICE_UPDATE_BUTTON_WIDTH = 218;
const DEVICE_UPDATE_BUTTON_HEIGHT = 30;

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
    this.updateCheckPending = false;
    this.accountChoiceTab = 'avatar';
    this.accountDraft = { username: '', character: 'elara', frame: 'classic' };
    this.accountDraftDirty = false;
    this.scrollOffsets = new Map();

    this.scroll = new RetainedScrollArea({
      inputRouter: this.context.inputRouter,
      label: `${dialogId}:scroll`,
    });
    this.panel.content.addChild(this.scroll.root);

    this.accountLayer = new Container();
    this.accountLayer.label = `${dialogId}:accountPane`;
    this.reportLayer = new Container();
    this.reportLayer.label = `${dialogId}:reportPane`;
    this.reportLayer.y = PIXI_UI_GEOMETRY.dialogScrollPaddingTop;
    this.configurationsLayer = new Container();
    this.configurationsLayer.label = `${dialogId}:configurationsPane`;
    this.configurationsLayer.y = PIXI_UI_GEOMETRY.dialogScrollPaddingTop;
    this.panel.content.addChild(this.accountLayer);
    this.scroll.content.addChild(this.reportLayer, this.configurationsLayer);

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
      borderInsets: {
        top: 17 / 3,
        right: 25 / 3,
        bottom: 19 / 3,
        left: 13 / 3,
      },
      width: SETTINGS_CONTENT_WIDTH,
      height: 92,
      label: `${this.dialogId}:accountHeader`,
    });
    this.accountPreviewProfile = new PlayerProfileWidget({
      assets: this.context.assets,
      texture: Texture.EMPTY,
      label: `${this.dialogId}:accountPreviewProfile`,
    });
    const usernameGeometry = PIXI_ROOT_RUN_GEOMETRY.account.username;
    this.usernameBacking = new PixiNineSliceFrame({
      texture: this.context.assets.getTexture(
        PIXI_ROOT_RUN_ASSETS.accountUsername,
      ),
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
      label: `${this.dialogId}:editUsername`,
    });
    this.usernameEdit.eventMode = 'static';
    this.usernameEdit.cursor = 'pointer';
    this.usernameEditRegistration =
      this.context.inputRouter?.registerPressTarget?.(this.usernameEdit, {
        enabled: () =>
          this.selectedTab === 'account' &&
          this.accountLayer.visible &&
          this.accountLayer.renderable,
        onPressChange: (pressed) => {
          this.usernameEdit.alpha = pressed ? 0.72 : 1;
        },
        onActivate: () => this.usernameField.focus(),
        onFocusChange: (focused) => {
          if (!focused) {
            this.usernameField.blur();
          }
        },
        fallbackHitTest: true,
        excludePageSwipe: true,
        haptic: 'selection',
      }) ?? null;
    this.usernameEditSemanticId = `${this.dialogId}.account.editUsername`;
    this.usernameEditSemanticDefinition =
      this.context.semanticRegistry?.register?.({
        semanticId: this.usernameEditSemanticId,
        displayObject: this.usernameEdit,
        state: () => ({
          active: !this.usernameEdit.destroyed,
          enabled: this.selectedTab === 'account',
          interactive: this.usernameEdit.eventMode !== 'none',
          visible: this.usernameEdit.visible && this.usernameEdit.renderable,
        }),
        activate: () => this.usernameField.focus(),
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
      borderInsets: {
        top: 17 / 3,
        right: 25 / 3,
        bottom: 19 / 3,
        left: 13 / 3,
      },
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
      this.accountPreviewProfile,
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
        controlKind: definition.controlKind,
        label: `${this.dialogId}:preference:${definition.key}`,
      });
      return {
        key: definition.key,
        widget,
        label: widget.textLabel,
        control: widget.control,
        slider: widget.slider,
        toggle: widget.toggle,
        value: definition.controlKind === 'slider' ? 100 : true,
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
      texture: this.context.assets.getTexture(PIXI_ROOT_RUN_ASSETS.settingsRow),
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      width: SETTINGS_CONTENT_WIDTH,
      height: DEVICE_ACCOUNT_PANEL_HEIGHT,
      label: `${this.dialogId}:accountConnectionPanel`,
    });
    this.accountConnectionLabel = new PixiTextLabel({
      text: 'GOOGLE ACCOUNT',
      fontSize: 17,
      fontFamily: '"Lilita One", "Arial Black", Arial, sans-serif',
      color: '#735036',
      anchor: { x: 0.5, y: 0 },
      label: `${this.dialogId}:accountConnectionLabel`,
    });
    this.accountStatus = new PixiTextLabel({
      text: 'Not Connected',
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
      text: 'Connect Account',
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
    this.updateCheckButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.updates.check`,
      text: 'Check for updates',
      width: DEVICE_UPDATE_BUTTON_WIDTH,
      height: DEVICE_UPDATE_BUTTON_HEIGHT,
      variant: 'yellow',
      action: () => this.checkForUpdates(),
      label: `${this.dialogId}:updateCheck`,
    });
    this.configurationsLayer.addChild(
      this.devicePanel,
      this.themePanel,
      this.accountConnectionPanel,
      this.accountConnectionLabel,
      this.accountStatus,
      this.accountConnectButton,
      this.identityFooter,
      this.updateCheckButton,
    );
  }

  buildAvatarPane() {
    this.avatarPool = new WidgetPool({
      name: `${this.dialogId} avatar option pool`,
      counters: this.context.counters,
      maxSize: 48,
      create: () => {
        const avatar = new PlayerSelectableProfileWidget({
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
      create: () =>
        new PlayerSelectableProfileWidget({
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
      preference.value = model.preferences[preference.key];
      preference.widget.bind({
        value: preference.value,
        onChange: (value) => this.setPreference(preference.key, value),
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
      onCopy: this.actions.copyUserId ?? copyTextToClipboard,
    });
    this.syncUpdateCheckState(model.updates.enabled);

    this.refreshAccountChoices();
    this.refreshAccountPreview();
    this.syncAccountSaveState();
    this.renderSelectedPane();
  }

  selectTab(tabId) {
    const next = normalizeSettingsTab(tabId);
    if (next === this.selectedTab) {
      return true;
    }
    this.scrollOffsets.set(this.selectedTab, this.scroll.offsetY);
    this.selectedTab = next;
    const result =
      this.actions.selectTab?.(next) ?? this.actions.selectSettingsTab?.(next);
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
    this.setPanelContentSize(
      SETTINGS_CONTENT_WIDTH,
      account
        ? this.activePaneHeight
        : devicePreferences
          ? SETTINGS_DEVICE_CONTENT_HEIGHT
          : SETTINGS_STANDARD_CONTENT_HEIGHT,
    );
    this.scroll.setBounds(
      0,
      0,
      account ? ACCOUNT_HEADER_WIDTH : SETTINGS_CONTENT_WIDTH,
      account
        ? this.activePaneHeight
        : devicePreferences
          ? SETTINGS_DEVICE_SCROLL_HEIGHT
          : SETTINGS_STANDARD_SCROLL_HEIGHT,
    );
    this.scroll.setContentHeight(
      PIXI_UI_GEOMETRY.dialogScrollPaddingTop + this.activePaneHeight,
    );
    this.scroll.scrollTo(this.scrollOffsets.get(this.selectedTab) ?? 0);
    this.syncOuterScrollState(account);
    this.syncAccountPaper(account);
    this.syncTitleFrame(account);
  }

  syncOuterScrollState(account) {
    const visible = !account;
    this.scroll.root.visible = visible;
    this.scroll.root.renderable = visible;
    this.scroll.root.eventMode = visible ? 'static' : 'none';
    if (account) {
      this.scroll.scrollTo(0);
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
      account ? 'Wizard' : (this.model.title ?? this.defaultTitle),
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
    const paperOutsets = resolveDialogPaperOutsets(this.panel.contentInsets);
    const sectionInset = PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop;
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
    this.accountHeader.position.set(ACCOUNT_HEADER_X, sectionInset);
    this.accountHeader.setSize(ACCOUNT_HEADER_WIDTH, ACCOUNT_HEADER_HEIGHT);
    this.accountPreviewProfile.position.set(
      ACCOUNT_HEADER_X + 22 * (ACCOUNT_HEADER_WIDTH / 925),
      sectionInset + 35 / 3,
    );
    this.accountPreviewProfile.scale.set(
      ACCOUNT_HEADER_TILE_SIZE / PLAYER_PROFILE_SIZE,
    );
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
    this.usernameField.setSize(535 / 3, username.height - username.textInsetY);
    this.usernameEdit.position.set(
      this.usernameBacking.x +
        username.width -
        username.editInsetRight -
        username.editSize,
      this.usernameBacking.y + (username.height - username.editSize) / 2,
    );
    this.usernameEdit.width = username.editSize;
    this.usernameEdit.height = username.editSize;
    const usernameEditHitOutset = Math.max(
      0,
      (ACCOUNT_USERNAME_EDIT_HIT_SIZE - username.editSize) / 2,
    );
    this.usernameEdit.hitArea = new Rectangle(
      -usernameEditHitOutset,
      -usernameEditHitOutset,
      ACCOUNT_USERNAME_EDIT_HIT_SIZE,
      ACCOUNT_USERNAME_EDIT_HIT_SIZE,
    );
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
    const tabX = (ACCOUNT_HEADER_WIDTH - ACCOUNT_TAB_ROW_WIDTH) / 2;
    const tabY =
      this.accountChoiceBoard.y +
      ACCOUNT_CHOICE_BOARD_HEIGHT +
      ACCOUNT_TABS_TOP_INSET;
    const tabWidth = (ACCOUNT_TAB_ROW_WIDTH - ACCOUNT_TAB_GAP) / 2;
    this.avatarTab.setBounds(tabX, tabY, tabWidth, ACCOUNT_TAB_HEIGHT);
    this.frameTab.setBounds(
      tabX + tabWidth + ACCOUNT_TAB_GAP,
      tabY,
      tabWidth,
      ACCOUNT_TAB_HEIGHT,
    );
    const choiceSectionBottom =
      this.accountChoiceSection.y + this.accountChoiceSection.frameHeight;
    this.accountSave.position.set(
      (ACCOUNT_HEADER_WIDTH - ACCOUNT_SAVE_WIDTH) / 2,
      choiceSectionBottom + ACCOUNT_SAVE_GAP,
    );
    this.accountSave.setSize(ACCOUNT_SAVE_WIDTH, ACCOUNT_SAVE_HEIGHT);
    this.layoutAvatarPane();
    return this.accountSave.y + ACCOUNT_SAVE_HEIGHT + ACCOUNT_BOTTOM_GAP;
  }

  layoutReportPane() {
    const gap = 5;
    const width = (SETTINGS_CONTENT_WIDTH - gap * 2) / 3;
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
    y += this.devicePanel.panelHeight + DEVICE_SECTION_GAP;
    this.themePanel.position.set(0, y);
    this.themePanel.setWidth(SETTINGS_CONTENT_WIDTH);
    y += this.themePanel.panelHeight + DEVICE_SECTION_GAP;
    this.accountConnectionPanel.position.set(0, y);
    this.accountConnectionPanel.setSize(
      SETTINGS_CONTENT_WIDTH,
      DEVICE_ACCOUNT_PANEL_HEIGHT,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    const accountPanelY = y;
    y += DEVICE_ACCOUNT_PANEL_PADDING_TOP;
    this.accountConnectionLabel.position.set(SETTINGS_CONTENT_WIDTH / 2, y);
    y += this.accountConnectionLabel.measuredHeight + DEVICE_ACCOUNT_STATUS_GAP;
    this.accountStatus.position.set(SETTINGS_CONTENT_WIDTH / 2, y);
    y += this.accountStatus.measuredHeight + DEVICE_ACCOUNT_BUTTON_GAP;
    this.accountConnectButton.position.set(
      (SETTINGS_CONTENT_WIDTH - DEVICE_ACCOUNT_BUTTON_WIDTH) / 2,
      y,
    );
    this.accountConnectButton.setSize(
      DEVICE_ACCOUNT_BUTTON_WIDTH,
      DEVICE_ACCOUNT_BUTTON_HEIGHT,
    );
    y = accountPanelY + DEVICE_ACCOUNT_PANEL_HEIGHT + DEVICE_ACCOUNT_FOOTER_GAP;
    this.identityFooter.position.set(0, y);
    this.identityFooter.setWidth(SETTINGS_CONTENT_WIDTH);
    y += this.identityFooter.footerHeight + DEVICE_UPDATE_BUTTON_GAP;
    this.updateCheckButton.position.set(
      (SETTINGS_CONTENT_WIDTH - DEVICE_UPDATE_BUTTON_WIDTH) / 2,
      y,
    );
    this.updateCheckButton.setSize(
      DEVICE_UPDATE_BUTTON_WIDTH,
      DEVICE_UPDATE_BUTTON_HEIGHT,
    );
    y += DEVICE_UPDATE_BUTTON_HEIGHT;
    return y;
  }

  layoutAvatarPane() {
    const widgets =
      this.accountChoiceTab === 'frame'
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
    if (data.researched === false && data.category !== 'character') {
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
    this.syncAccountSaveState();
    return true;
  }

  refreshAccountChoices() {
    const equipped = this.settingsModel?.selections ?? {};
    const draft = this.accountDraft;
    const avatars = (this.settingsModel?.avatars ?? []).map((option) => ({
      ...option,
      previewable: true,
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
    this.accountPreviewProfile
      .setBackgroundTint(getPlayerFrameTint(this.accountDraft.frame))
      .setTexture(
        getCharacterTexture(this.context.assets, this.accountDraft.character),
      );
  }

  isLockedAvatarPreview() {
    return this.settingsModel?.avatars?.some(
      (option) =>
        option.key === this.accountDraft.character &&
        option.researched === false,
    ) === true;
  }

  syncAccountSaveState() {
    const locked = this.isLockedAvatarPreview();
    this.accountSave
      .setText(locked ? 'Locked' : 'Save')
      .setLocked(locked)
      .setEnabled(!locked);
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
        result?.message ?? formatFeedbackFailure(result?.reason),
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
    if (this.isLockedAvatarPreview()) {
      this.syncAccountSaveState();
      return false;
    }
    const username = String(this.accountDraft.username ?? '').trim();
    if (this.settingsModel?.account?.usernameRequired && !username) {
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
      this.setUsernameStatus(result?.message ?? 'not saved');
      return result;
    }
    this.setUsernameStatus('');
    this.accountDraftDirty = false;
    return result ?? true;
  }

  setUsernameStatus(status) {
    this.usernameStatus.setText(status ?? '');
  }

  setPreference(key, value) {
    const row = this.preferenceRows.find((candidate) => candidate.key === key);
    if (!row) {
      return false;
    }
    const result =
      this.actions.togglePreference?.(key, value) ??
      this.actions[`toggle${capitalize(key)}`]?.(value);
    if (result === false) {
      row.widget.bind({
        value: row.value,
        onChange: (nextValue) => this.setPreference(key, nextValue),
      });
      return false;
    }
    row.value = value;
    return result ?? true;
  }

  async checkForUpdates() {
    if (this.updateCheckPending || !this.settingsModel?.updates?.enabled) {
      return false;
    }
    const action = this.actions.checkForUpdates;
    if (typeof action !== 'function') {
      return false;
    }

    this.updateCheckPending = true;
    this.syncUpdateCheckState(true);
    try {
      return await action();
    } finally {
      this.updateCheckPending = false;
      this.syncUpdateCheckState(this.settingsModel?.updates?.enabled);
    }
  }

  syncUpdateCheckState(enabled = true) {
    this.updateCheckButton
      ?.setText(this.updateCheckPending ? 'Checking...' : 'Check for updates')
      .setEnabled(Boolean(enabled) && !this.updateCheckPending);
  }

  runAction(name, ...args) {
    return this.actions[name]?.(...args) ?? false;
  }

  applyDialogTheme(theme) {
    for (const label of [
      this.usernameStatus,
      this.feedbackStatus,
      this.accountConnectionLabel,
      this.accountStatus,
    ]) {
      label?.applyTheme(theme);
    }
    for (const field of [this.usernameField, this.feedbackField]) {
      field?.applyTheme(theme);
    }
    for (const button of [
      this.avatarTabButton,
      this.frameTabButton,
      this.accountSave,
      this.feedbackSend,
      this.accountConnectButton,
      this.updateCheckButton,
      ...(this.feedbackKindButtons?.map(({ button }) => button) ?? []),
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
    this.scroll.setBounds(
      0,
      0,
      SETTINGS_CONTENT_WIDTH,
      this.selectedTab === 'configurations'
        ? SETTINGS_DEVICE_SCROLL_HEIGHT
        : SETTINGS_STANDARD_SCROLL_HEIGHT,
    );
    this.layoutActivePane();
    this.scroll.setContentHeight(
      PIXI_UI_GEOMETRY.dialogScrollPaddingTop + this.activePaneHeight,
    );
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
    this.updateCheckPending = false;
    this.syncUpdateCheckState(this.settingsModel?.updates?.enabled);
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
    this.context.semanticRegistry?.unregister?.(this.usernameEditSemanticId, {
      displayObject: this.usernameEdit,
    });
    this.usernameEditSemanticDefinition = null;
    this.avatars?.destroy();
    this.avatarPool?.destroy();
    this.frames?.destroy();
    this.framePool?.destroy();
    this.accountChoiceScroll?.destroy();
    this.scroll?.destroy();
    this.scroll = null;
  }

  getPoolStats() {
    return Object.freeze({
      avatars: this.avatarPool.getStats(),
      frames: this.framePool.getStats(),
    });
  }
}

function normalizeSettingsModel(
  source = {},
  { initialTab, initialFeedbackKind },
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
    options: Array.isArray(category.options) ? category.options : [],
  }));
  const selections = settings.selections ?? {};
  const avatarCategory = categories.find(
    (category) => category.key === 'character',
  );
  const frameCategory = categories.find((category) => category.key === 'frame');
  const avatars = (avatarCategory?.options ?? []).map((option) =>
    normalizeVisualOption({
      category: 'character',
      option,
      selection: selections.character ?? settings.character,
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
    settings.tabId ?? settings.selectedTab ?? source.tab ?? initialTab;
  return {
    tabId: normalizeSettingsTab(requestedTab),
    account: {
      username: String(account.username ?? settings.username ?? 'Wizard'),
      usernameRequired:
        account.usernameRequired === true ||
        settings.usernamePromptMode === true,
      status: String(account.status ?? account.usernameError ?? ''),
      accountStatus: String(
        account.accountStatus ?? account.authStatus ?? 'Not Connected',
      ),
      connectLabel: String(account.connectLabel ?? 'Connect Account'),
      connectEnabled:
        account.connectEnabled !== false && account.loginAvailable !== false,
      version: String(
        account.version ?? settings.version ?? getClientReleaseVersion(),
      ),
      userId: String(
        account.userId ?? account.identity ?? settings.userId ?? '',
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
    updates: {
      enabled: settings.updates?.enabled !== false,
    },
    preferences: {
      haptics: settings.preferences?.haptics ?? settings.hapticsEnabled ?? true,
      music: normalizeVolumePercent(
        settings.preferences?.music ??
          settings.musicVolume ??
          settings.musicEnabled,
      ),
      sfx: normalizeVolumePercent(
        settings.preferences?.sfx ??
          settings.sfxVolume ??
          settings.sfxEnabled,
      ),
      theme: settings.preferences?.theme ?? settings.theme === 'day',
    },
    avatars,
    frames,
    selections: {
      character: String(selections.character ?? settings.character ?? 'elara'),
      frame: String(selections.frame ?? settings.frame ?? 'classic'),
    },
  };
}

function normalizeVolumePercent(value) {
  if (typeof value === 'boolean') {
    return value ? 100 : 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 100;
  }
  return Math.round(Math.max(0, Math.min(100, numeric)));
}

function normalizeVisualOption({
  category,
  option,
  selection,
  researched,
  cost,
}) {
  const isResearched = option.researched ?? researched ?? true;
  const safeCost = Math.max(0, Number(option.cost ?? cost) || 0);
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
      option.priceLabel ?? (safeCost > 0 ? `${safeCost} Amber` : 'free'),
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
    FEEDBACK_KINDS.find((candidate) => candidate.key === kind) ??
    FEEDBACK_KINDS[0]
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
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : '';
}

function getCharacterTexture(assetManager, key) {
  try {
    return (
      assetManager?.getTexture?.(`source:assets/avatars/${key}.png`) ??
      Texture.EMPTY
    );
  } catch {
    try {
      return (
        assetManager?.getTexture?.('source:assets/avatars/elara.png') ??
        Texture.EMPTY
      );
    } catch {
      return Texture.EMPTY;
    }
  }
}
