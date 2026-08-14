import { Container, Sprite, Texture } from 'pixi.js';

import {
  createDialogPaperSection,
  PixiTextButton,
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
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

const LEVEL_CONTENT_WIDTH =
  GLOBAL_DIALOG_GEOMETRY.maxContentWidth;
const LEVEL_CONTENT_HEIGHT = 320;
const LEVEL_ROW_GAP = 2;
const LEVEL_PAGER_HEIGHT = 28;
const LEVEL_PAGER_WIDTH = 96;
const LEVEL_PAGER_ICON_SIZE = 22;
const LEVEL_PAGER_ICON_GAP = 1;
const LEVEL_SECTION_TITLE_HEIGHT =
  GLOBAL_DIALOG_GEOMETRY.rowHeight;
const LEVEL_PAGER_ICON_ASSETS = Object.freeze({
  previous: 'source:assets/ui/brewing-carousel/chevron-left.png',
  next: 'source:assets/ui/brewing-carousel/chevron-right.png',
});
const LEVEL_CURRENT_BADGE_HEIGHT = 27;
const LEVEL_CURRENT_BADGE_MIN_WIDTH = 30;
const LEVEL_CURRENT_BADGE_HORIZONTAL_PADDING = 10;
const LEVEL_CURRENT_BADGE_RIGHT_INSET = 14;
const LEVEL_CURRENT_BADGE_TOP = 1;
const LEVEL_CURRENT_BADGE_TEXT_CENTER_Y = 10;
const LEVEL_CURRENT_BADGE_TEXT_COLOR = '#ffffff';
const LEVEL_CURRENT_BADGE_TEXT_STROKE = Object.freeze({
  color: '#2a160d',
  width: 2,
});

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

    this.currentLabelBacking = new Sprite(Texture.EMPTY);
    this.currentLabelBacking.label = `${dialogId}:currentBacking`;
    this.currentLabelBacking.anchor.set(0.5, 0);
    this.currentLabel = new PixiTextLabel({
      text: 'Current',
      fontSize: PIXI_UI_GEOMETRY.borderLabelFontSize,
      fontWeight: 'bold',
      anchor: { x: 0.5, y: 0.5 },
      color: LEVEL_CURRENT_BADGE_TEXT_COLOR,
      stroke: LEVEL_CURRENT_BADGE_TEXT_STROKE,
      label: `${dialogId}:current`,
    });
    this.currentBacking = new Container();
    this.currentBacking.label = `${dialogId}:current`;
    this.currentBacking.addChild(
      this.currentLabelBacking,
      this.currentLabel,
    );
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
      this.currentBacking,
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
    this.previousButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.previous`,
      text: '',
      width: LEVEL_PAGER_WIDTH,
      height: LEVEL_PAGER_HEIGHT,
      sizeTier: 30,
      variant: 'yellow',
      action: () => this.selectLevel(this.selectedLevel - 1),
      label: `${dialogId}:previous`,
    });
    this.nextButton = new PixiTextButton({
      assetManager: this.context.assets,
      inputRouter: this.context.inputRouter,
      semanticRegistry: this.context.semanticRegistry,
      semanticId: `${dialogId}.next`,
      text: '',
      width: LEVEL_PAGER_WIDTH,
      height: LEVEL_PAGER_HEIGHT,
      sizeTier: 30,
      variant: 'yellow',
      action: () => this.selectLevel(this.selectedLevel + 1),
      label: `${dialogId}:next`,
    });
    this.previousIcon = createPagerIcon(
      this.context.assets,
      LEVEL_PAGER_ICON_ASSETS.previous,
      `${dialogId}:previousIcon`,
    );
    this.nextIcon = createPagerIcon(
      this.context.assets,
      LEVEL_PAGER_ICON_ASSETS.next,
      `${dialogId}:nextIcon`,
    );
    addPagerIcon(this.previousButton, this.previousIcon);
    addPagerIcon(this.nextButton, this.nextIcon);
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
      .setText(hasPrevious ? `Level ${previous}` : '')
      .setEnabled(hasPrevious);
    this.nextButton.visible = hasNext;
    this.nextButton.renderable = hasNext;
    this.nextButton
      .setText(hasNext ? `Level ${next}` : '')
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
    this.currentLabelBacking.texture =
      this.context.assets?.getTexture?.(
        PIXI_ROOT_RUN_ASSETS.stallBatchBadge,
      ) ?? Texture.EMPTY;
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

    const currentSection = this.addedSection.visible
      ? this.addedSection
      : this.totalSection;
    const labelWidth = Math.max(
      LEVEL_CURRENT_BADGE_MIN_WIDTH,
      Math.ceil(this.currentLabel.measuredWidth) +
        LEVEL_CURRENT_BADGE_HORIZONTAL_PADDING,
    );
    const currentBadgeCenterX =
      currentSection.x +
      currentSection.frameWidth -
      LEVEL_CURRENT_BADGE_RIGHT_INSET -
      labelWidth / 2;
    this.currentBacking.position.set(
      currentBadgeCenterX,
      currentSection.y + LEVEL_CURRENT_BADGE_TOP,
    );
    this.currentLabelBacking.width = labelWidth;
    this.currentLabelBacking.height =
      LEVEL_CURRENT_BADGE_HEIGHT;
    this.currentLabel.position.set(
      0,
      LEVEL_CURRENT_BADGE_TEXT_CENTER_Y,
    );

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
    layoutPagerContent(
      this.previousButton,
      this.previousIcon,
      'leading',
    );
    layoutPagerContent(
      this.nextButton,
      this.nextIcon,
      'trailing',
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

}

function createPagerIcon(assetManager, assetId, label) {
  const icon = new Sprite(
    assetManager?.getTexture?.(assetId) ?? Texture.EMPTY,
  );
  icon.anchor.set(0.5);
  icon.label = label;
  return icon;
}

function addPagerIcon(button, icon) {
  const labelIndex = button.visual.getChildIndex(
    button.textLabel,
  );
  button.visual.addChildAt(icon, Math.max(0, labelIndex));
}

function layoutPagerContent(button, icon, iconPosition) {
  const labelWidth = button.textLabel.measuredWidth;
  const contentWidth =
    LEVEL_PAGER_ICON_SIZE +
    LEVEL_PAGER_ICON_GAP +
    labelWidth;
  const contentLeft = (button.buttonWidth - contentWidth) / 2;
  const iconLeading = iconPosition === 'leading';
  icon.width = LEVEL_PAGER_ICON_SIZE;
  icon.height = LEVEL_PAGER_ICON_SIZE;
  icon.position.set(
    iconLeading
      ? contentLeft + LEVEL_PAGER_ICON_SIZE / 2
      : contentLeft +
          labelWidth +
          LEVEL_PAGER_ICON_GAP +
          LEVEL_PAGER_ICON_SIZE / 2,
    button.buttonHeight / 2,
  );
  button.textLabel.position.set(
    iconLeading
      ? contentLeft +
          LEVEL_PAGER_ICON_SIZE +
          LEVEL_PAGER_ICON_GAP +
          labelWidth / 2
      : contentLeft + labelWidth / 2,
    button.buttonHeight / 2,
  );
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
