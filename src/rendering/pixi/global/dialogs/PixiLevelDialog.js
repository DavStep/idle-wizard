import { Container, Graphics } from 'pixi.js';

import {
  createDialogPaperSection,
  PixiButton,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  PixiTextLabel,
  resolveDialogPaperOutsets,
  setDialogPaperSectionBounds,
} from '../../primitives/index.js';
import {
  GLOBAL_DIALOG_GEOMETRY,
  PooledDialogRows,
  RetainedGlobalDialog,
} from './GlobalDialogKit.js';

const LEVEL_CONTENT_WIDTH =
  GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const LEVEL_CONTENT_HEIGHT = 320;
const LEVEL_ROW_GAP = 2;
const LEVEL_PAGER_HEIGHT = 28;
const LEVEL_PAGER_WIDTH = 96;
const LEVEL_SECTION_TITLE_HEIGHT =
  GLOBAL_DIALOG_GEOMETRY.rowHeight;

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
      title: 'Level 1',
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
      text: 'Current',
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
    this.panel.setPaperVisible(false);

    this.addedSection = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${dialogId}:addedSection`,
    );
    this.totalSection = createDialogPaperSection(
      this.panel.paperFrame.texture,
      `${dialogId}:totalSection`,
    );
    this.addedSectionLayer = new Container({
      label: `${dialogId}:addedSectionLayer`,
    });
    this.totalSectionLayer = new Container({
      label: `${dialogId}:totalSectionLayer`,
    });
    this.addedSectionTitle = new PixiTextLabel({
      text: 'Bonuses Gained at This Level',
      fontSize: 13,
      fontWeight: 'bold',
      label: `${dialogId}:addedSectionTitle`,
    });
    this.totalSectionTitle = new PixiTextLabel({
      text: 'Total Bonuses at This Level',
      fontSize: 13,
      fontWeight: 'bold',
      label: `${dialogId}:totalSectionTitle`,
    });
    this.addedRowsLayer = new Container({
      label: `${dialogId}:addedRows`,
    });
    this.totalRowsLayer = new Container({
      label: `${dialogId}:totalRows`,
    });
    this.addedSectionLayer.addChild(
      this.addedSectionTitle,
      this.addedRowsLayer,
    );
    this.totalSectionLayer.addChild(
      this.totalSectionTitle,
      this.totalRowsLayer,
    );
    this.panel.content.addChild(
      this.addedSection,
      this.totalSection,
      this.addedSectionLayer,
      this.totalSectionLayer,
    );
    this.addedRows = new PooledDialogRows({
      assetManager: this.context.assets,
      parent: this.addedRowsLayer,
      inputRouter: this.context.inputRouter,
      counters: this.context.counters,
      name: `${dialogId} added level rows`,
      maxSize: 12,
      theme: this.theme,
    });
    this.totalRows = new PooledDialogRows({
      assetManager: this.context.assets,
      parent: this.totalRowsLayer,
      inputRouter: this.context.inputRouter,
      counters: this.context.counters,
      name: `${dialogId} total level rows`,
      maxSize: 12,
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
      width: LEVEL_PAGER_WIDTH,
      height: LEVEL_PAGER_HEIGHT,
      variant: 'yellow',
      action: () => this.selectLevel(this.selectedLevel - 1),
      label: `${dialogId}:previous`,
    });
    this.nextButton = new PixiButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.next`,
      text: '',
      width: LEVEL_PAGER_WIDTH,
      height: LEVEL_PAGER_HEIGHT,
      variant: 'yellow',
      action: () => this.selectLevel(this.selectedLevel + 1),
      label: `${dialogId}:next`,
    });
    this.pager.addChild(this.previousButton, this.nextButton);
    this.panel.content.addChild(this.pager);
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

    this.panel.setTitle(`Level ${this.selectedLevel}`);
    this.currentBacking.visible = selected.current;
    this.currentBacking.renderable = selected.current;
    this.addedSection.visible = addedRows.length > 0;
    this.addedSection.renderable = this.addedSection.visible;
    this.addedSectionLayer.visible = this.addedSection.visible;
    this.addedSectionLayer.renderable = this.addedSection.visible;
    this.totalSection.visible = totalRows.length > 0;
    this.totalSection.renderable = this.totalSection.visible;
    this.totalSectionLayer.visible = this.totalSection.visible;
    this.totalSectionLayer.renderable = this.totalSection.visible;
    this.addedRows.reconcile(
      addedRows.map((row, index) => ({
        ...row,
        id: `added:${row.id ?? row.key ?? index}`,
        disabled: !selected.unlocked,
        keyWidthRatio: 0.58,
      })),
    );
    this.totalRows.reconcile(
      totalRows.map((row, index) => ({
        ...row,
        id: `total:${row.id ?? row.key ?? index}`,
        disabled: !selected.unlocked,
        keyWidthRatio: 0.58,
      })),
    );
    this.updatePager();
    this.layoutDialog();
  }

  updatePager() {
    const previous = this.selectedLevel - 1;
    const next = this.selectedLevel + 1;
    const hasPrevious = previous >= 1;
    const hasNext = next <= this.maxLevel;
    this.previousButton.visible = hasPrevious;
    this.previousButton.renderable = hasPrevious;
    this.previousButton
      .setText(hasPrevious ? `‹ Level ${previous}` : '')
      .setEnabled(hasPrevious);
    this.nextButton.visible = hasNext;
    this.nextButton.renderable = hasNext;
    this.nextButton
      .setText(hasNext ? `Level ${next} ›` : '')
      .setEnabled(hasNext);
  }

  applyDialogTheme(theme) {
    this.currentLabel?.applyTheme(theme);
    this.addedSectionTitle?.applyTheme(theme);
    this.totalSectionTitle?.applyTheme(theme);
    this.previousButton?.applyTheme(theme);
    this.nextButton?.applyTheme(theme);
    this.addedRows?.applyTheme(theme);
    this.totalRows?.applyTheme(theme);
    this.redrawCurrentBacking();
  }

  layoutDialog() {
    if (!this.addedRows || !this.totalRows) {
      return;
    }
    const paperOutsets = resolveDialogPaperOutsets(
      this.panel.contentInsets,
    );
    let sectionY = 0;
    if (this.addedSection.visible) {
      const addedRowsHeight = this.addedRows.layout(
        LEVEL_CONTENT_WIDTH,
        { gap: LEVEL_ROW_GAP },
      );
      const addedSectionHeight =
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop +
        LEVEL_SECTION_TITLE_HEIGHT +
        addedRowsHeight +
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
      setDialogPaperSectionBounds(
        this.addedSection,
        {
          x: 0,
          y: sectionY,
          width: LEVEL_CONTENT_WIDTH,
          height: addedSectionHeight,
        },
        paperOutsets,
      );
      this.addedSectionLayer.position.set(0, sectionY);
      this.addedSectionTitle.position.set(
        0,
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop,
      );
      this.addedRowsLayer.position.set(
        0,
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop +
          LEVEL_SECTION_TITLE_HEIGHT,
      );
      sectionY +=
        addedSectionHeight +
        paperOutsets.bottom +
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap +
        paperOutsets.top;
    }
    if (this.totalSection.visible) {
      const totalRowsHeight = this.totalRows.layout(
        LEVEL_CONTENT_WIDTH,
        { gap: LEVEL_ROW_GAP },
      );
      const totalSectionHeight =
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop +
        LEVEL_SECTION_TITLE_HEIGHT +
        totalRowsHeight +
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetBottom;
      setDialogPaperSectionBounds(
        this.totalSection,
        {
          x: 0,
          y: sectionY,
          width: LEVEL_CONTENT_WIDTH,
          height: totalSectionHeight,
        },
        paperOutsets,
      );
      this.totalSectionLayer.position.set(0, sectionY);
      this.totalSectionTitle.position.set(
        0,
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop,
      );
      this.totalRowsLayer.position.set(
        0,
        PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop +
          LEVEL_SECTION_TITLE_HEIGHT,
      );
    }

    const labelWidth = Math.ceil(this.currentLabel.measuredWidth) + 8;
    this.currentBacking.position.set(
      (this.panel.outerWidth - labelWidth) / 2,
      -7,
    );
    this.currentLabel.position.set(4, 0);
    this.redrawCurrentBacking(labelWidth);

    this.pager.position.set(
      0,
      LEVEL_CONTENT_HEIGHT - LEVEL_PAGER_HEIGHT,
    );
    this.previousButton.setSize(
      LEVEL_PAGER_WIDTH,
      LEVEL_PAGER_HEIGHT,
    );
    this.nextButton.setSize(
      LEVEL_PAGER_WIDTH,
      LEVEL_PAGER_HEIGHT,
    );
    this.previousButton.position.set(0, 0);
    this.nextButton.position.set(
      LEVEL_CONTENT_WIDTH - LEVEL_PAGER_WIDTH,
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
    this.addedRows?.destroy();
    this.totalRows?.destroy();
    this.addedRows = null;
    this.totalRows = null;
  }

  getPoolStats() {
    return Object.freeze({
      added: this.addedRows?.getStats() ?? null,
      total: this.totalRows?.getStats() ?? null,
    });
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
        return {
          id: index,
          label: toTitleCase(row),
          value: '',
        };
      }
      return {
        ...row,
        label: toTitleCase(
          row.label ?? row.keyText ?? row.key ?? '',
        ),
        value: row.value ?? row.valueText ?? '',
      };
    });
}

function toTitleCase(value) {
  return String(value ?? '').replace(
    /\b([a-z])/g,
    (character) => character.toUpperCase(),
  );
}

function clampInteger(value, minimum, maximum) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) {
    return minimum;
  }
  return Math.max(minimum, Math.min(maximum, number));
}
