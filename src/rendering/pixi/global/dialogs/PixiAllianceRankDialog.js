import { Container, Graphics, Rectangle, Texture } from 'pixi.js';

import {
  PixiNineSliceFrame,
  PixiTextButton,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { RetainedGlobalDialog } from './GlobalDialogKit.js';

const CONTENT_WIDTH = 260;
const ROW_HEIGHT = 64;
const ROW_GAP = 4;
const ROW_PITCH = ROW_HEIGHT + ROW_GAP;
const ACTION_GAP = 8;
const ACTION_HEIGHT = 30;
const STATUS_HEIGHT = 15;
const CONTENT_HEIGHT = ROW_PITCH * 5 - ROW_GAP + ACTION_GAP + ACTION_HEIGHT + STATUS_HEIGHT;

export class AllianceRankRowPixi {
  constructor({
    assetManager = null,
    inputRouter = null,
    semanticRegistry = null,
    label = 'allianceRankRow',
  } = {}) {
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.model = {};
    this.selected = false;
    this.enabled = false;
    this.width = CONTENT_WIDTH;
    this.height = ROW_HEIGHT;
    this.root = new Container({ label });
    this.background = new PixiNineSliceFrame({
      texture:
        assetManager?.getTexture?.(PIXI_ROOT_RUN_ASSETS.settingsRow) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowSourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
      label: `${label}:background`,
    });
    this.selectionOutline = new Graphics({ label: `${label}:selection` });
    this.name = new PixiTextLabel({
      fontWeight: 'bold',
      label: `${label}:name`,
    });
    this.capacity = new PixiTextLabel({
      anchor: { x: 1, y: 0 },
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${label}:capacity`,
    });
    this.permissions = new PixiTextLabel({
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      lineHeight: PIXI_UI_GEOMETRY.borderLabelLineHeight,
      wordWrap: true,
      wrapWidth: CONTENT_WIDTH - 20,
      label: `${label}:permissions`,
    });
    this.root.addChild(
      this.background,
      this.selectionOutline,
      this.name,
      this.capacity,
      this.permissions,
    );
    this.pressRegistration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () => this.isInteractive(),
        haptic: 'selection',
        onActivate: () => this.activate(),
      }) ?? null;
    this.semanticId = null;
    this.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
  }

  bind(model = {}) {
    this.unregisterSemanticTarget();
    this.model = model ?? {};
    this.selected = this.model.selected === true;
    this.enabled = this.model.enabled !== false;
    this.name.setText(this.model.label ?? 'Rank');
    this.capacity.setText(`Max ${Math.max(1, Number(this.model.maxMembers) || 1)}`);
    this.permissions.setText(this.model.permissions ?? '');
    const semanticId = String(this.model.semanticId ?? '').trim();
    if (semanticId) {
      this.semanticRegistry?.register?.({
        semanticId,
        displayObject: this.root,
        state: () => ({
          enabled: this.enabled,
          interactive: this.isInteractive(),
          selected: this.selected,
          value: this.model.id,
          visible: this.root.visible && this.root.renderable,
        }),
        activate: () => this.activate(),
      });
      this.semanticId = semanticId;
    }
    this.root.eventMode = this.isInteractive() ? 'static' : 'none';
    this.redraw();
    return this;
  }

  activate() {
    return this.isInteractive()
      ? this.model.onSelect?.(this.model.id) ?? false
      : false;
  }

  isInteractive() {
    return this.enabled && typeof this.model.onSelect === 'function';
  }

  setBounds(x, y, width = CONTENT_WIDTH, height = ROW_HEIGHT) {
    this.root.position.set(x, y);
    this.width = Math.max(0, Number(width) || 0);
    this.height = Math.max(ROW_HEIGHT, Number(height) || ROW_HEIGHT);
    this.root.hitArea = new Rectangle(0, 0, this.width, this.height);
    const visibleHeight = Math.max(0, this.height - ROW_GAP);
    this.background.setSize(
      this.width,
      visibleHeight,
      PIXI_ROOT_RUN_GEOMETRY.settings.rowBorderInsets,
    );
    this.name.position.set(10, 7);
    this.capacity.position.set(this.width - 10, 9);
    this.permissions.position.set(10, 27);
    this.permissions.setWrapWidth(Math.max(0, this.width - 20));
    this.redraw();
    return this;
  }

  applyTheme(theme = DEFAULT_PIXI_THEME_SNAPSHOT) {
    this.theme = theme;
    this.name.applyTheme(theme);
    this.capacity.applyTheme(theme);
    this.permissions.applyTheme(theme);
    this.redraw();
    return this;
  }

  redraw() {
    if (!this.theme) {
      return;
    }
    const secondaryColor = this.enabled ? this.theme.muted : this.theme.disabled;
    this.name.setColor(this.enabled ? this.theme.text : this.theme.disabled);
    this.capacity.setColor(secondaryColor);
    this.permissions.setColor(secondaryColor);
    this.selectionOutline
      .clear()
      .roundRect(1, 1, Math.max(0, this.width - 2), Math.max(0, this.height - ROW_GAP - 2), 5)
      .stroke({
        alpha: this.selected ? 0.95 : 0,
        color: this.theme.text,
        width: 1.5,
      });
  }

  unregisterSemanticTarget() {
    if (this.semanticId) {
      this.semanticRegistry?.unregister?.(this.semanticId, {
        displayObject: this.root,
      });
    }
    this.semanticId = null;
  }

  destroy() {
    this.unregisterSemanticTarget();
    this.pressRegistration?.unregister?.();
    this.pressRegistration = null;
    this.root.destroy({ children: true });
  }
}

export class PixiAllianceRankDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.allianceRank' } = {}) {
    super({
      context,
      dialogId,
      title: 'Change Rank',
      contentWidth: CONTENT_WIDTH,
      contentHeight: CONTENT_HEIGHT,
      placement: 'center',
      label: `${dialogId}:allianceRankDialog`,
    });
    this.selectedRole = '';
    this.pending = false;
    this.rows = Array.from({ length: 5 }, (_, index) =>
      new AllianceRankRowPixi({
        assetManager: this.context.assets,
        inputRouter: this.context.inputRouter,
        semanticRegistry: this.context.semanticRegistry,
        label: `${dialogId}:rank:${index}`,
      }),
    );
    this.status = new PixiTextLabel({
      align: 'center',
      anchor: { x: 0.5, y: 0 },
      color: 'muted',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      label: `${dialogId}:status`,
    });
    this.applyButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.apply`,
      text: 'Apply Rank',
      width: CONTENT_WIDTH,
      height: ACTION_HEIGHT,
      sizeTier: 50,
      variant: 'green',
      action: () => this.applySelection(),
      label: `${dialogId}:apply`,
    });
    this.panel.content.addChild(...this.rows.map((row) => row.root), this.applyButton, this.status);
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel = {}) {
    const roles = Array.isArray(viewModel.roles) ? viewModel.roles : [];
    const selectedStillExists = roles.some((role) => role.id === this.selectedRole);
    if (!selectedStillExists || !this.shown) {
      this.selectedRole = String(viewModel.selectedRole ?? '').trim();
    }
    this.pending = false;
    this.status.setText(String(viewModel.status ?? ''));
    this.rows.forEach((row, index) => {
      const role = roles[index];
      row.root.visible = Boolean(role);
      row.root.renderable = Boolean(role);
      if (role) {
        row.bind({
          ...role,
          selected: role.id === this.selectedRole,
          semanticId: `${this.dialogId}.rank.${role.id}`,
          onSelect: (roleId) => this.selectRole(roleId),
        });
      }
    });
    this.syncApplyState();
    this.layoutDialog();
  }

  selectRole(roleId) {
    if (this.pending) {
      return false;
    }
    const role = this.model.roles?.find((candidate) => candidate.id === roleId);
    if (!role || role.enabled === false) {
      return false;
    }
    this.selectedRole = role.id;
    this.status.setText('');
    this.rows.forEach((row) => {
      row.bind({
        ...row.model,
        selected: row.model.id === this.selectedRole,
      });
    });
    this.syncApplyState();
    return true;
  }

  async applySelection() {
    if (!this.canApply()) {
      return false;
    }
    this.pending = true;
    this.applyButton.setText('Applying...').setEnabled(false);
    this.status.setText('Saving rank');
    let result;
    try {
      result = await this.actions.apply?.(this.selectedRole);
    } catch {
      result = { ok: false, reason: 'offline' };
    }
    this.pending = false;
    if (result?.ok === false || result === false) {
      this.status.setText(
        result?.message ?? (result?.reason === 'offline' ? 'Offline' : 'Rank not changed'),
      );
      this.syncApplyState();
      return result;
    }
    this.closeThroughRegistry();
    return result ?? true;
  }

  canApply() {
    const role = this.model.roles?.find((candidate) => candidate.id === this.selectedRole);
    return Boolean(
      !this.pending &&
        role?.enabled !== false &&
        this.selectedRole &&
        this.selectedRole !== this.model.selectedRole &&
        this.actions.apply,
    );
  }

  syncApplyState() {
    this.applyButton
      .setText(this.pending ? 'Applying...' : 'Apply Rank')
      .setEnabled(this.canApply());
  }

  layoutDialog() {
    this.rows.forEach((row, index) =>
      row.setBounds(0, index * ROW_PITCH, CONTENT_WIDTH, ROW_HEIGHT),
    );
    const actionY = ROW_PITCH * this.rows.length - ROW_GAP + ACTION_GAP;
    this.applyButton.position.set(0, actionY);
    this.applyButton.setSize(CONTENT_WIDTH, ACTION_HEIGHT);
    this.status.position.set(CONTENT_WIDTH / 2, actionY + ACTION_HEIGHT + 2);
  }

  applyDialogTheme(theme) {
    this.rows.forEach((row) => row.applyTheme(theme));
    this.applyButton?.applyTheme(theme);
    this.status?.applyTheme(theme);
  }

  destroyDialog() {
    this.rows.forEach((row) => row.destroy());
    this.rows = [];
    this.applyButton?.destroy();
  }
}
