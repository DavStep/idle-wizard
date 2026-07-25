import { Container, Graphics } from 'pixi.js';

import {
  PixiButton,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  PooledDialogRows,
  RetainedGlobalDialog,
} from './GlobalDialogKit.js';

const LEVEL_CONTENT_WIDTH = 286;
const LEVEL_CONTENT_HEIGHT = 360;
const LEVEL_WRAPPER_WIDTH = 330;
const LEVEL_PAGER_GAP = 3;

/**
 * Retained level detail dialog. Presenters may provide the already-formatted
 * `addedRows`/`totalRows` contract or the equivalent rows on a selected level.
 * Level progression rules remain outside the view.
 */
export class PixiLevelDialog extends RetainedGlobalDialog {
  constructor({ context, dialogId = 'global.level' } = {}) {
    super({
      context,
      dialogId,
      title: 'level 1',
      contentWidth: LEVEL_CONTENT_WIDTH,
      contentHeight: LEVEL_CONTENT_HEIGHT,
      placement: 'top',
      label: `${dialogId}:levelDialog`,
    });
    this.selectedLevel = 1;
    this.currentLevel = 1;
    this.maxLevel = 1;

    this.currentLabelBacking = new Graphics();
    this.currentLabelBacking.label = `${dialogId}:currentBacking`;
    this.currentLabel = new PixiTextLabel({
      text: 'current',
      fontSize: 11,
      label: `${dialogId}:current`,
    });
    this.currentBacking = new Container();
    this.currentBacking.label = `${dialogId}:current`;
    this.currentBacking.addChild(
      this.currentLabelBacking,
      this.currentLabel,
    );
    this.panel.addChild(this.currentBacking);

    this.rowsLayer = new Container();
    this.rowsLayer.label = `${dialogId}:rows`;
    this.panel.content.addChild(this.rowsLayer);
    this.rows = new PooledDialogRows({
      parent: this.rowsLayer,
      inputRouter: this.context.inputRouter,
      counters: this.context.counters,
      name: `${dialogId} level rows`,
      maxSize: 24,
      theme: this.theme,
    });

    this.pager = new Container();
    this.pager.label = `${dialogId}:pager`;
    this.previousButton = new PixiButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.previous`,
      text: '',
      height: 20,
      action: () => this.selectLevel(this.selectedLevel - 1),
      label: `${dialogId}:previous`,
    });
    this.nextButton = new PixiButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.next`,
      text: '',
      height: 20,
      action: () => this.selectLevel(this.selectedLevel + 1),
      label: `${dialogId}:next`,
    });
    this.pager.addChild(this.previousButton, this.nextButton);
    this.root.addChild(this.pager);
    this.applyTheme(this.context.theme);
    this.bind({});
    this.layout(this.context.projection);
  }

  bindDialog(viewModel) {
    const normalized = normalizeLevelModel(viewModel, this.selectedLevel);
    this.levelModel = normalized;
    this.currentLevel = normalized.currentLevel;
    this.maxLevel = normalized.maxLevel;
    this.selectedLevel = normalized.selectedLevel;
    this.renderSelectedLevel();
  }

  selectLevel(level) {
    const next = clampInteger(level, 1, this.maxLevel);
    if (next === this.selectedLevel) {
      return true;
    }
    const result =
      this.actions.selectLevel?.(next) ??
      this.model.onSelectLevel?.(next);
    if (result === false) {
      return false;
    }
    this.selectedLevel = next;
    this.renderSelectedLevel();
    return result ?? true;
  }

  renderSelectedLevel() {
    const selected =
      this.levelModel.levels.find(
        (candidate) => candidate.level === this.selectedLevel,
      ) ??
      normalizeLevelSnapshot(
        {
          level: this.selectedLevel,
          current: this.selectedLevel === this.currentLevel,
          unlocked: this.selectedLevel <= this.currentLevel,
        },
        this.selectedLevel,
      );
    const addedRows = selected.addedRows;
    const totalRows = selected.totalRows;
    const rows = [];

    if (addedRows.length > 0) {
      rows.push({
        id: 'added-label',
        kind: 'message',
        text: 'bonuses gained at this level',
        mutedLabel: true,
        boldLabel: true,
      });
      rows.push(
        ...addedRows.map((row, index) => ({
          ...row,
          id: `added:${row.id ?? row.key ?? index}`,
          disabled: !selected.unlocked,
        })),
      );
    }
    if (addedRows.length > 0 && totalRows.length > 0) {
      rows.push({ id: 'divider', kind: 'divider' });
    }
    if (totalRows.length > 0) {
      rows.push({
        id: 'total-label',
        kind: 'message',
        text: 'total bonuses at this level',
        mutedLabel: true,
        boldLabel: true,
      });
      rows.push(
        ...totalRows.map((row, index) => ({
          ...row,
          id: `total:${row.id ?? row.key ?? index}`,
          disabled: !selected.unlocked,
        })),
      );
    }

    this.panel.setTitle(`level ${this.selectedLevel}`);
    this.currentBacking.visible = selected.current;
    this.currentBacking.renderable = selected.current;
    this.rows.reconcile(rows);
    this.updatePager();
    this.layoutDialog();
  }

  updatePager() {
    const previous = this.selectedLevel - 1;
    const next = this.selectedLevel + 1;
    const hasPrevious = previous >= 1;
    const hasNext = next <= this.maxLevel;
    this.previousButton
      .setText(hasPrevious ? `level ${previous}` : '')
      .setEnabled(hasPrevious);
    this.previousButton.visible = hasPrevious;
    this.previousButton.renderable = hasPrevious;
    this.nextButton
      .setText(hasNext ? `level ${next}` : '')
      .setEnabled(hasNext);
    this.nextButton.visible = hasNext;
    this.nextButton.renderable = hasNext;
  }

  applyDialogTheme(theme) {
    this.currentLabel?.applyTheme(theme);
    this.previousButton?.applyTheme(theme);
    this.nextButton?.applyTheme(theme);
    this.rows?.applyTheme(theme);
    this.redrawCurrentBacking();
  }

  layoutDialog() {
    if (!this.rows) {
      return;
    }
    this.rowsLayer.position.set(0, 0);
    this.rows.layout(LEVEL_CONTENT_WIDTH, {
      gap: GLOBAL_DIALOG_GEOMETRY.rowGap,
    });

    const labelWidth = Math.ceil(this.currentLabel.measuredWidth) + 8;
    this.currentBacking.position.set(
      (this.panel.outerWidth - labelWidth) / 2,
      -7,
    );
    this.currentLabel.position.set(4, 0);
    this.redrawCurrentBacking(labelWidth);

    const panelBottom =
      this.panel.y - this.panel.pivot.y + this.panel.outerHeight;
    this.pager.position.set(
      (GLOBAL_DIALOG_GEOMETRY.sourceWidth -
        LEVEL_WRAPPER_WIDTH) /
        2,
      panelBottom + GLOBAL_DIALOG_GEOMETRY.tabGap,
    );
    const buttonWidth =
      (LEVEL_WRAPPER_WIDTH - LEVEL_PAGER_GAP) / 2;
    this.previousButton.setSize(buttonWidth, 20);
    this.nextButton.setSize(buttonWidth, 20);
    this.previousButton.position.set(0, 0);
    this.nextButton.position.set(
      buttonWidth + LEVEL_PAGER_GAP,
      0,
    );
  }

  activateDialog() {
    this.actions.activate?.();
  }

  deactivateDialog() {
    this.actions.deactivate?.();
  }

  destroyDialog() {
    this.rows?.destroy();
    this.rows = null;
  }

  getPoolStats() {
    return this.rows?.getStats() ?? null;
  }

  redrawCurrentBacking(
    width = Math.ceil(this.currentLabel?.measuredWidth ?? 0) + 8,
  ) {
    this.currentLabelBacking
      ?.clear()
      .rect(0, 0, width, 14)
      .fill(this.theme?.surface ?? '#ffffff');
  }
}

function normalizeLevelModel(model = {}, previousSelected = 1) {
  const suppliedLevels = Array.isArray(model.levels)
    ? model.levels
    : Array.isArray(model.playerLevel?.levels)
      ? model.playerLevel.levels
      : [];
  const currentLevel = clampInteger(
    model.currentLevel ??
      model.playerLevel?.currentLevel ??
      model.level ??
      1,
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const maxFromLevels = suppliedLevels.reduce(
    (maximum, candidate) =>
      Math.max(maximum, Number(candidate?.level) || 0),
    currentLevel,
  );
  const maxLevel = clampInteger(
    model.maxLevel ??
      model.playerLevel?.maxLevel ??
      maxFromLevels,
    currentLevel,
    Number.MAX_SAFE_INTEGER,
  );
  const selectedLevel = clampInteger(
    model.selectedLevel ??
      model.level ??
      previousSelected ??
      currentLevel,
    1,
    maxLevel,
  );
  const levels =
    suppliedLevels.length > 0
      ? suppliedLevels.map((level, index) =>
          normalizeLevelSnapshot(level, index + 1),
        )
      : [
          normalizeLevelSnapshot(
            {
              ...model,
              level: selectedLevel,
              current: selectedLevel === currentLevel,
              unlocked: selectedLevel <= currentLevel,
            },
            selectedLevel,
          ),
        ];
  return {
    currentLevel,
    maxLevel,
    selectedLevel,
    levels,
  };
}

function normalizeLevelSnapshot(level = {}, fallbackLevel = 1) {
  const number = clampInteger(
    level.level ?? fallbackLevel,
    1,
    Number.MAX_SAFE_INTEGER,
  );
  return {
    ...level,
    level: number,
    current: Boolean(level.current),
    unlocked: level.unlocked !== false,
    addedRows: normalizeRows(
      level.addedRows ??
        level.bonuses ??
        level.effects,
    ),
    totalRows: normalizeRows(
      level.totalRows ??
        level.totalsRows ??
        (Array.isArray(level.totals) ? level.totals : []),
    ),
  };
}

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter(
      (row) =>
        row !== null &&
        row !== undefined &&
        row !== 'current level' &&
        row !== 'no new limit' &&
        row !== 'no new unlock',
    )
    .map((row, index) => {
      if (typeof row === 'string') {
        return { id: index, label: row, value: '' };
      }
      return {
        ...row,
        label: row.label ?? row.keyText ?? row.key ?? '',
        value: row.value ?? row.valueText ?? '',
      };
    });
}

function clampInteger(value, minimum, maximum) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) {
    return minimum;
  }
  return Math.max(minimum, Math.min(maximum, number));
}
