import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import { getPlayerVisualSettingCategories } from '../../../../player/playerVisualSettings.js';
import {
  PixiButton,
  PixiPanel,
  PixiScrollView,
  PixiTextField,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  PooledCollection,
  WidgetPool,
} from '../../retained/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  RetainedGlobalDialog,
  orderDisplayObjects,
} from './GlobalDialogKit.js';

const SETTINGS_CONTENT_WIDTH =
  GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const SETTINGS_CONTENT_HEIGHT = 410;
const SETTINGS_SCROLL_HEIGHT = 390;
const SETTINGS_WRAPPER_WIDTH =
  GLOBAL_DIALOG_GEOMETRY.maxShellWidth;
const SETTINGS_SECTION_CONTENT_WIDTH =
  SETTINGS_CONTENT_WIDTH - 24;
const SETTINGS_TAB_KEYS = Object.freeze([
  Object.freeze({ key: 'account', label: 'account' }),
  Object.freeze({ key: 'report', label: 'report' }),
  Object.freeze({ key: 'configurations', label: 'configurations' }),
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
const CONFIGURATION_KEYS = Object.freeze([
  'theme',
  'font',
  'color',
  'icons',
  'progressBar',
]);
const AVATAR_CELL_HEIGHT = 94;
const AVATAR_GAP = 8;
const AVATAR_CELL_WIDTH =
  (SETTINGS_CONTENT_WIDTH - AVATAR_GAP * 2) / 3;

/**
 * Retained settings surface used by both global.settings and global.feedback.
 * The feedback factory starts on the report pane but shares the same exact
 * three-tab dialog vocabulary as the DOM reference.
 */
export class PixiSettingsDialog extends RetainedGlobalDialog {
  constructor({
    context,
    dialogId,
    initialTab = 'account',
    initialFeedbackKind = 'feedback',
  }) {
    super({
      context,
      dialogId,
      title: 'settings',
      contentWidth: SETTINGS_CONTENT_WIDTH,
      contentHeight: SETTINGS_CONTENT_HEIGHT,
      placement: 'top',
      label: `${dialogId}:settingsDialog`,
    });
    this.initialTab = normalizeSettingsTab(initialTab);
    this.selectedTab = this.initialTab;
    this.feedbackKind = normalizeFeedbackKind(initialFeedbackKind);
    this.usernameDraft = '';
    this.feedbackDraft = '';
    this.feedbackPending = false;
    this.scrollOffsets = new Map();

    this.scroll = new PixiScrollView({
      inputRouter: this.context.inputRouter,
      assetManager: this.context.assets,
      width: SETTINGS_CONTENT_WIDTH,
      height: SETTINGS_SCROLL_HEIGHT,
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
    this.avatarLayer = new Container();
    this.avatarLayer.label = `${dialogId}:avatarPane`;
    this.scroll.content.addChild(
      this.accountLayer,
      this.reportLayer,
      this.configurationsLayer,
      this.avatarLayer,
    );

    this.buildTabs();
    this.buildAccountPane();
    this.buildReportPane();
    this.buildConfigurationsPane();
    this.buildAvatarPane();
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  buildTabs() {
    this.tabsLayer = new Container();
    this.tabsLayer.label = `${this.dialogId}:tabs`;
    this.root.addChild(this.tabsLayer);
    this.tabButtons = SETTINGS_TAB_KEYS.map(({ key, label }) => {
      const button = new PixiButton({
        assetManager: this.context.assets,
        inputRouter: this.context.inputRouter,
        semanticRegistry: this.context.semanticRegistry,
        semanticId: `${this.dialogId}.tab.${key}`,
        text: label,
        height: GLOBAL_DIALOG_GEOMETRY.tabHeight,
        variant: 'tab',
        action: () => this.selectTab(key),
        label: `${this.dialogId}:tab:${key}`,
      });
      this.tabsLayer.addChild(button);
      return { key, button };
    });
  }

  buildAccountPane() {
    this.usernameLabel = new PixiTextLabel({
      text: 'username',
      label: `${this.dialogId}:usernameLabel`,
    });
    this.usernameField = new PixiTextField({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      textEntryService: this.context.textEntryService,
      width: 244,
      height: 30,
      maxLength: 24,
      onChange: (value) => {
        this.usernameDraft = value;
        this.setUsernameStatus('');
      },
      onSubmit: () => this.saveUsername(),
      onCancel: () => this.requestClose('text-cancel'),
      label: `${this.dialogId}:usernameField`,
    });
    this.usernameSave = new PixiButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.username.save`,
      tutorialId: 'top:username-input',
      text: 'save',
      width: 58,
      height: 30,
      action: () => this.saveUsername(),
      label: `${this.dialogId}:usernameSave`,
    });
    this.usernameStatus = new PixiTextLabel({
      color: 'disabled',
      label: `${this.dialogId}:usernameStatus`,
    });
    this.accountLabel = new PixiTextLabel({
      text: 'account',
      label: `${this.dialogId}:accountLabel`,
    });
    this.accountStatus = new PixiTextLabel({
      text: 'not connected',
      color: 'muted',
      label: `${this.dialogId}:accountStatus`,
    });
    this.connectAccount = new PixiButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${this.dialogId}.account.connect`,
      text: 'connect account',
      width: 218,
      height: 30,
      action: () => this.runAction('connectAccount'),
      label: `${this.dialogId}:connectAccount`,
    });
    this.versionLabel = new PixiTextLabel({
      text: 'version',
      label: `${this.dialogId}:versionLabel`,
    });
    this.versionValue = new PixiTextLabel({
      color: 'muted',
      label: `${this.dialogId}:versionValue`,
    });
    this.accountLayer.addChild(
      this.usernameLabel,
      this.usernameField,
      this.usernameSave,
      this.usernameStatus,
      this.accountLabel,
      this.accountStatus,
      this.connectAccount,
      this.versionLabel,
      this.versionValue,
    );
  }

  buildReportPane() {
    this.feedbackKindButtons = FEEDBACK_KINDS.map(({ key, label }) => {
      const button = new PixiButton({
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
    this.feedbackSend = new PixiButton({
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
    this.devicePanel = new PixiPanel({
      assetManager: this.context.assets,
      title: 'device',
      contentWidth: SETTINGS_SECTION_CONTENT_WIDTH,
      contentHeight: 68,
      label: `${this.dialogId}:devicePanel`,
    });
    this.configurationsLayer.addChild(this.devicePanel);
    this.preferenceRows = ['haptics', 'music', 'sfx'].map((key) => {
      const label = new PixiTextLabel({
        text: key,
        label: `${this.dialogId}:preference:${key}:label`,
      });
      const button = new PixiButton({
        assetManager: this.context.assets,
        inputRouter: this.context.inputRouter,
        semanticRegistry: this.context.semanticRegistry,
        semanticId: `${this.dialogId}.preference.${key}`,
        text: 'on',
        width: 58,
        height: 24,
        action: () => this.togglePreference(key),
        label: `${this.dialogId}:preference:${key}:button`,
      });
      this.devicePanel.content.addChild(label, button);
      return { key, label, button, enabled: true };
    });

    this.categoryPanels = new Map();
    this.categoryLayers = new Map();
    for (const key of CONFIGURATION_KEYS) {
      const panel = new PixiPanel({
        assetManager: this.context.assets,
        title: formatCategoryLabel(key),
        contentWidth: SETTINGS_SECTION_CONTENT_WIDTH,
        contentHeight: 20,
        label: `${this.dialogId}:configuration:${key}`,
      });
      const layer = new Container();
      layer.label = `${this.dialogId}:configuration:${key}:options`;
      panel.content.addChild(layer);
      this.categoryPanels.set(key, panel);
      this.categoryLayers.set(key, layer);
      this.configurationsLayer.addChild(panel);
    }

    this.optionPool = new WidgetPool({
      name: `${this.dialogId} visual option pool`,
      counters: this.context.counters,
      maxSize: 24,
      create: () => {
        const option = new SettingsOptionWidget({
          assetManager: this.context.assets,
          inputRouter: this.context.inputRouter,
          label: `${this.dialogId}:visualOption`,
        });
        option.applyTheme(this.theme ?? this.context.theme);
        return option;
      },
      reset: (option) => option.reset(),
      dispose: (option) => option.destroy(),
    });
    this.options = new PooledCollection({
      name: `${this.dialogId} visual options`,
      pool: this.optionPool,
      counters: this.context.counters,
      keyOf: (option) => `${option.category}:${option.key}`,
      bind: (widget, option, key) =>
        widget.bind(key, option, {
          select: (data) => this.selectVisualOption(data),
          research: (data) => this.researchVisualOption(data),
        }),
      afterReconcile: (widgets) => this.orderConfigurationOptions(widgets),
    });
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
          select: (data) => this.selectVisualOption(data),
          research: (data) => this.researchVisualOption(data),
        }),
      afterReconcile: (widgets) =>
        orderDisplayObjects(this.avatarLayer, widgets),
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

    if (!this.usernameField.focused) {
      this.usernameDraft = model.account.username;
      this.usernameField.setValue(this.usernameDraft);
    }
    if (!this.feedbackField.focused) {
      this.feedbackDraft = model.feedback.value;
      this.feedbackField.setValue(this.feedbackDraft);
    }
    this.usernameStatus.setText(model.account.status);
    this.accountStatus.setText(model.account.accountStatus);
    this.connectAccount
      .setText(model.account.connectLabel)
      .setEnabled(model.account.connectEnabled);
    this.versionValue.setText(model.account.version);
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
      preference.button
        .setText(preference.enabled ? 'on' : 'off')
        .setSelected(preference.enabled);
    }

    this.options.reconcile(model.options);
    this.avatars.reconcile(model.avatars);
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
          : this.selectedTab === 'avatar'
            ? this.avatarLayer
            : this.accountLayer;
    for (const layer of [
      this.accountLayer,
      this.reportLayer,
      this.configurationsLayer,
      this.avatarLayer,
    ]) {
      const visible = layer === pane;
      layer.visible = visible;
      layer.renderable = visible;
      layer.eventMode = visible ? 'passive' : 'none';
    }
    for (const { key, button } of this.tabButtons) {
      button.setSelected(
        key === this.selectedTab ||
          (this.selectedTab === 'avatar' && key === 'account'),
      );
    }
    this.layoutActivePane();
    this.scroll.setContentHeight(this.activePaneHeight);
    this.scroll.scrollTo(this.scrollOffsets.get(this.selectedTab) ?? 0);
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
    if (this.selectedTab === 'avatar') {
      this.activePaneHeight = this.layoutAvatarPane();
      return;
    }
    this.activePaneHeight = this.layoutAccountPane();
  }

  layoutAccountPane() {
    const usernameSaveWidth = 58;
    const usernameGap = 8;
    const usernameFieldWidth =
      SETTINGS_CONTENT_WIDTH -
      usernameSaveWidth -
      usernameGap;
    this.usernameLabel.position.set(0, 0);
    this.usernameField.position.set(0, 22);
    this.usernameField.setSize(usernameFieldWidth, 30);
    this.usernameSave.position.set(
      usernameFieldWidth + usernameGap,
      22,
    );
    this.usernameSave.setSize(usernameSaveWidth, 30);
    this.usernameStatus.position.set(0, 58);
    this.accountLabel.position.set(0, 92);
    this.accountStatus.position.set(0, 114);
    this.connectAccount.position.set(0, 139);
    this.connectAccount.setSize(218, 30);
    this.versionLabel.position.set(0, 191);
    this.versionValue.position.set(0, 213);
    return 237;
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
    let y = 7;
    this.devicePanel.position.set(0, y);
    this.devicePanel.setContentSize(
      SETTINGS_SECTION_CONTENT_WIDTH,
      68,
    );
    this.preferenceRows.forEach(({ label, button }, index) => {
      const rowY = index * 22;
      label.position.set(0, rowY + 3);
      button.position.set(
        SETTINGS_SECTION_CONTENT_WIDTH - 58,
        rowY,
      );
      button.setSize(58, 20);
    });
    y += this.devicePanel.outerHeight + GLOBAL_DIALOG_GEOMETRY.sectionGap;

    for (const key of CONFIGURATION_KEYS) {
      const panel = this.categoryPanels.get(key);
      const layer = this.categoryLayers.get(key);
      let optionY = 0;
      for (const option of this.options.getWidgets()) {
        if (option.data.category !== key) {
          continue;
        }
        const height = option.getPreferredHeight();
        option.setBounds(
          0,
          optionY,
          SETTINGS_SECTION_CONTENT_WIDTH,
          height,
        );
        optionY += height + 6;
      }
      optionY = Math.max(20, optionY - 6);
      panel.setContentSize(
        SETTINGS_SECTION_CONTENT_WIDTH,
        optionY,
      );
      panel.position.set(0, y);
      layer.position.set(0, 0);
      y += panel.outerHeight + GLOBAL_DIALOG_GEOMETRY.sectionGap;
    }
    return Math.max(SETTINGS_SCROLL_HEIGHT, y);
  }

  layoutAvatarPane() {
    this.avatars.getWidgets().forEach((avatar, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      avatar.setBounds(
        column * (AVATAR_CELL_WIDTH + AVATAR_GAP),
        row * (AVATAR_CELL_HEIGHT + AVATAR_GAP),
        AVATAR_CELL_WIDTH,
        AVATAR_CELL_HEIGHT,
      );
    });
    return Math.max(
      SETTINGS_SCROLL_HEIGHT,
      Math.ceil(this.avatars.getWidgets().length / 3) *
        (AVATAR_CELL_HEIGHT + AVATAR_GAP),
    );
  }

  orderConfigurationOptions(widgets) {
    for (const layer of this.categoryLayers.values()) {
      layer.removeChildren();
    }
    for (const widget of widgets) {
      this.categoryLayers
        .get(widget.data.category)
        ?.addChild(widget.root);
    }
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
    const username = String(this.usernameDraft ?? '').trim();
    if (
      this.settingsModel?.account?.usernameRequired &&
      !username
    ) {
      this.setUsernameStatus('enter a name');
      return false;
    }
    const action =
      this.model.onSaveUsername ??
      this.actions.saveUsername ??
      this.actions.setUsername;
    if (!action) {
      return false;
    }
    const result = action(username);
    if (result?.ok === false || result === false) {
      this.setUsernameStatus(
        result?.message ?? 'not saved',
      );
      return result;
    }
    this.setUsernameStatus('');
    return result ?? true;
  }

  setUsernameStatus(status) {
    this.usernameStatus.setText(status ?? '');
  }

  togglePreference(key) {
    const row = this.preferenceRows.find(
      (candidate) => candidate.key === key,
    );
    if (!row) {
      return false;
    }
    const next = !row.enabled;
    const result =
      this.actions.togglePreference?.(key, next) ??
      this.actions[`toggle${capitalize(key)}`]?.(next);
    if (result === false) {
      return false;
    }
    row.enabled = next;
    row.button.setText(next ? 'on' : 'off').setSelected(next);
    return result ?? true;
  }

  selectVisualOption(option) {
    if (option.researched === false) {
      return false;
    }
    return (
      this.actions.selectVisualOption?.(
        option.category,
        option.key,
      ) ??
      this.actions.selectSetting?.(
        option.category,
        option.key,
      ) ??
      false
    );
  }

  researchVisualOption(option) {
    if (option.researched !== false) {
      return false;
    }
    return (
      this.actions.researchVisualOption?.(
        option.category,
        option.key,
      ) ??
      this.actions.researchSetting?.(
        option.category,
        option.key,
      ) ??
      false
    );
  }

  runAction(name, ...args) {
    return this.actions[name]?.(...args) ?? false;
  }

  applyDialogTheme(theme) {
    this.scroll?.applyTheme(theme);
    for (const label of [
      this.usernameLabel,
      this.usernameStatus,
      this.accountLabel,
      this.accountStatus,
      this.versionLabel,
      this.versionValue,
      this.feedbackStatus,
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
      this.usernameSave,
      this.connectAccount,
      this.feedbackSend,
      ...this.tabButtons?.map(({ button }) => button) ?? [],
      ...this.feedbackKindButtons?.map(({ button }) => button) ?? [],
      ...this.preferenceRows?.map(({ button }) => button) ?? [],
    ]) {
      button?.applyTheme(theme);
    }
    this.devicePanel?.applyTheme(theme);
    for (const panel of this.categoryPanels?.values?.() ?? []) {
      panel.applyTheme(theme);
    }
    for (const option of this.options?.getWidgets?.() ?? []) {
      option.applyTheme(theme);
    }
    for (const avatar of this.avatars?.getWidgets?.() ?? []) {
      avatar.applyTheme(theme);
    }
  }

  layoutDialog() {
    this.scroll.position.set(0, 0);
    this.scroll.setViewportSize(
      SETTINGS_CONTENT_WIDTH,
      SETTINGS_SCROLL_HEIGHT,
    );
    const outerHeight = this.panel.outerHeight;
    const x =
      (GLOBAL_DIALOG_GEOMETRY.sourceWidth -
        SETTINGS_WRAPPER_WIDTH) /
      2;
    const y =
      this.top +
      (this.viewportProjection?.dialogShift ?? 0) +
      outerHeight +
      GLOBAL_DIALOG_GEOMETRY.tabGap;
    this.tabsLayer.position.set(x, y);
    const gap = 3;
    const tabWidth =
      (SETTINGS_WRAPPER_WIDTH -
        gap * (this.tabButtons.length - 1)) /
      this.tabButtons.length;
    this.tabButtons.forEach(({ button }, index) => {
      button.position.set(index * (tabWidth + gap), 0);
      button.setSize(tabWidth, GLOBAL_DIALOG_GEOMETRY.tabHeight);
    });
    this.layoutActivePane();
    this.scroll.setContentHeight(this.activePaneHeight);
  }

  getModalContentRoots() {
    return [this.panel, this.tabsLayer];
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
    this.actions.deactivate?.();
  }

  destroyDialog() {
    this.options?.destroy();
    this.optionPool?.destroy();
    this.avatars?.destroy();
    this.avatarPool?.destroy();
  }

  getPoolStats() {
    return Object.freeze({
      options: this.optionPool.getStats(),
      avatars: this.avatarPool.getStats(),
    });
  }
}

class SettingsOptionWidget {
  constructor({
    assetManager,
    inputRouter,
    label,
  }) {
    this.root = new Container();
    this.root.label = label;
    this.name = new PixiButton({
      assetManager,
      inputRouter,
      text: '',
      action: () => this.select(),
      label: `${label}:name`,
    });
    this.price = new PixiButton({
      assetManager,
      inputRouter,
      text: '',
      action: () => this.research(),
      label: `${label}:price`,
    });
    this.name.frame.visible = false;
    this.name.frame.renderable = false;
    this.price.frame.visible = false;
    this.price.frame.renderable = false;
    this.name.textLabel.setAnchor(0, 0.5);
    this.price.textLabel.setAnchor(1, 0.5);
    this.selectedLine = new Graphics();
    this.preview = new Graphics();
    this.root.addChild(
      this.name,
      this.price,
      this.selectedLine,
      this.preview,
    );
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
    this.name
      .setText(data.label)
      .setEnabled(data.enabled !== false && data.researched !== false);
    this.price
      .setText(data.priceLabel)
      .setEnabled(
        data.enabled !== false &&
          data.researched === false &&
          data.priceHidden !== true,
      );
    this.price.visible =
      data.researched === false &&
      data.priceHidden !== true;
    this.price.renderable = this.price.visible;
    this.redraw();
  }

  reset() {
    this.data = {};
    this.actions = {};
    this.root.visible = false;
    this.root.renderable = false;
    this.name.setEnabled(false);
    this.price.setEnabled(false);
    this.preview.clear();
    this.selectedLine.clear();
  }

  select() {
    return this.actions.select?.(this.data) ?? false;
  }

  research() {
    return this.actions.research?.(this.data) ?? false;
  }

  getPreferredHeight() {
    if (this.data.category === 'theme') {
      return 62;
    }
    if (this.data.category === 'progressBar') {
      return 34;
    }
    return 24;
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    const priceWidth = Math.max(
      44,
      this.price.textLabel.measuredWidth + 8,
    );
    this.name.position.set(0, 0);
    this.name.setSize(
      Math.max(0, width - priceWidth - 12),
      20,
    );
    this.name.textLabel.position.set(0, 10);
    this.price.position.set(width - priceWidth, 0);
    this.price.setSize(priceWidth, 20);
    this.price.textLabel.position.set(priceWidth, 10);
    this.preview.position.set(0, 24);
    this.redraw(width, height);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.name.applyTheme(this.theme);
    this.price.applyTheme(this.theme);
    this.redraw();
  }

  redraw(width = this.root.hitArea?.width ?? 286) {
    this.selectedLine.clear();
    if (this.data.selected) {
      this.selectedLine
        .moveTo(0, 19)
        .lineTo(
          Math.min(width, this.name.textLabel.measuredWidth),
          19,
        )
        .stroke({ color: this.theme.text, width: 1 });
    }
    this.preview.clear();
    if (this.data.category === 'theme') {
      const previewTheme =
        THEME_PREVIEW_TOKENS[this.data.key] ??
        THEME_PREVIEW_TOKENS.midnight;
      this.preview
        .rect(0, 0, width, 34)
        .fill(previewTheme.background)
        .rect(5, 5, width - 10, 24)
        .fill(previewTheme.surface)
        .stroke({
          color: previewTheme.stroke,
          width: 1,
          alignment: 1,
        })
        .rect(10, 21, (width - 20) * 0.64, 3)
        .fill(previewTheme.text);
    } else if (this.data.category === 'progressBar') {
      const y = 4;
      this.preview
        .rect(0, y, width, 7)
        .fill(this.theme.surface)
        .stroke({
          color: this.theme.stroke,
          width: 2,
          alignment: 1,
        });
      if (this.data.key === 'gradient') {
        const colors = ['#7f3cff', '#d868ff', '#64caff', '#ffd76a'];
        const segment = (width * 0.68) / colors.length;
        colors.forEach((color, index) => {
          this.preview
            .rect(2 + segment * index, y + 2, segment, 3)
            .fill(color);
        });
      } else {
        this.preview
          .rect(2, y + 2, (width - 4) * 0.68, 3)
          .fill(
            this.data.key === 'notched'
              ? '#b79a6b'
              : this.theme.text,
          );
      }
    }
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

class SettingsAvatarWidget {
  constructor({
    assetManager,
    inputRouter,
    label,
  }) {
    this.assetManager = assetManager;
    this.root = new Container();
    this.root.label = label;
    this.frame = new Graphics();
    this.sprite = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
      label: `${label}:portrait`,
    });
    this.status = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
      label: `${label}:status`,
    });
    this.text = new PixiTextLabel({
      anchor: { x: 0.5, y: 0 },
      label: `${label}:label`,
    });
    this.root.addChild(
      this.frame,
      this.sprite,
      this.status,
      this.text,
    );
    this.data = {};
    this.actions = {};
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () =>
          this.root.visible &&
          this.root.renderable &&
          this.data.enabled !== false,
        onActivate: () =>
          this.data.researched === false
            ? this.actions.research?.(this.data)
            : this.actions.select?.(this.data),
        haptic: 'light',
      }) ?? null;
    this.root.visible = false;
  }

  bind(_key, data, actions) {
    this.data = data;
    this.actions = actions ?? {};
    this.root.visible = true;
    this.root.renderable = true;
    this.root.eventMode =
      data.enabled === false ? 'none' : 'static';
    this.sprite.texture = getCharacterTexture(
      this.assetManager,
      data.key,
    );
    this.status.texture = getStatusTexture(
      this.assetManager,
      data.selected ? 'check' : 'lock',
    );
    this.status.visible =
      data.selected || data.researched === false;
    this.status.renderable = this.status.visible;
    this.sprite.alpha = data.researched === false ? 0.35 : 1;
    this.text.setText(data.label);
    this.redraw();
  }

  reset() {
    this.data = {};
    this.actions = {};
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
  }

  setBounds(x, y, width, height) {
    this.root.position.set(x, y);
    this.root.hitArea = new Rectangle(0, 0, width, height);
    const portraitSize = 72;
    const textureWidth = Math.max(
      1,
      Number(this.sprite.texture?.width) || 1,
    );
    const textureHeight = Math.max(
      1,
      Number(this.sprite.texture?.height) || 1,
    );
    const portraitScale = Math.min(
      portraitSize / textureWidth,
      portraitSize / textureHeight,
    );
    const portraitWidth = textureWidth * portraitScale;
    const portraitHeight = textureHeight * portraitScale;
    const portraitX = (width - portraitWidth) / 2;
    const portraitY = (portraitSize - portraitHeight) / 2;
    this.sprite.position.set(portraitX, portraitY);
    this.sprite.width = portraitWidth;
    this.sprite.height = portraitHeight;
    this.status.position.set(
      (width + portraitSize) / 2 - 21,
      3,
    );
    this.status.width = 18;
    this.status.height = 18;
    this.text.position.set(width / 2, 76);
    this.redraw(width);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.text.applyTheme(this.theme);
    this.text.setColor(
      this.data.researched === false ? 'disabled' : 'text',
    );
    this.redraw();
  }

  redraw(width = this.root.hitArea?.width ?? AVATAR_CELL_WIDTH) {
    const portraitSize = 72;
    const portraitX = (width - portraitSize) / 2;
    this.frame
      .clear()
      .rect(portraitX, 0, portraitSize, portraitSize)
      .fill(this.theme.surface)
      .stroke({
        color: this.data.selected
          ? this.theme.text
          : this.theme.stroke,
        width: PIXI_UI_GEOMETRY.strongBorderWidth,
        alignment: 1,
      });
  }

  destroy() {
    if (typeof this.registration === 'function') {
      this.registration();
    } else {
      this.registration?.unregister?.();
    }
    this.root.destroy({ children: true });
  }
}

const THEME_PREVIEW_TOKENS = Object.freeze({
  black: Object.freeze({
    background: '#1a1a1a',
    surface: '#202020',
    text: '#e8e8e8',
    stroke: '#6a6a6a',
  }),
  midnight: Object.freeze({
    background: '#1c1e26',
    surface: '#17191f',
    text: '#d4d4d4',
    stroke: '#3f465c',
  }),
  witchcraft: Object.freeze({
    background: '#07040e',
    surface: '#1a1028',
    text: '#f2e4bc',
    stroke: '#674579',
  }),
});

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
  const selections = settings.selections ?? {};
  const costs = settings.costsCrystal ?? {};
  const researched = settings.researched ?? {};
  const suppliedCategories = Array.isArray(settings.categories)
    ? settings.categories
    : getPlayerVisualSettingCategories();
  const categories = suppliedCategories.map((category) => ({
    ...category,
    options: Array.isArray(category.options)
      ? category.options
      : [],
  }));
  const options = categories
    .filter((category) =>
      CONFIGURATION_KEYS.includes(category.key),
    )
    .flatMap((category) =>
      category.options.map((option) =>
        normalizeVisualOption({
          category: category.key,
          option,
          selection:
            selections[category.key] ??
            settings[category.key],
          researched:
            researched[category.key]?.[option.key],
          cost:
            costs[category.key]?.[option.key],
        }),
      ),
    );
  const avatarCategory = categories.find(
    (category) => category.key === 'character',
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
      version: String(account.version ?? settings.version ?? ''),
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
    },
    options,
    avatars,
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

function normalizeSettingsTab(tabId) {
  const normalized = String(tabId ?? '').toLowerCase();
  if (normalized === 'theme' || normalized === 'appearance') {
    return 'configurations';
  }
  if (normalized === 'avatar') {
    return 'avatar';
  }
  return SETTINGS_TAB_KEYS.some(({ key }) => key === normalized)
    ? normalized
    : 'account';
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

function formatCategoryLabel(key) {
  if (key === 'progressBar') {
    return 'progress bar';
  }
  if (key === 'color') {
    return 'resource colors';
  }
  if (key === 'icons') {
    return 'resource icons';
  }
  return key;
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
      `source:assets/characters/${key}.png`,
    ) ?? Texture.EMPTY;
  } catch {
    try {
      return assetManager?.getTexture?.(
        'source:assets/characters/elara.png',
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
