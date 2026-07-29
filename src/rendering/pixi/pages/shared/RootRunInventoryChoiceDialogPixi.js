import { Container } from 'pixi.js';

import {
  createDialogPaperSection,
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY,
  resolveDialogPaperOutsets,
  setDialogPaperSectionBounds,
} from '../../primitives/PixiDialogFrame.js';
import {
  PixiButton,
} from '../../primitives/PixiButton.js';
import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_DIALOG_LIST_GEOMETRY,
  RETAINED_PAGE_GEOMETRY,
  RETAINED_TEXT_STYLES,
  applyTextTheme,
  createText,
  normalizeRows,
  resolveRetainedDialogListLayout,
} from '../workshop/RetainedPageKit.js';
import { RootRunInventoryChoiceList } from '../shop/ShopDialogPixi.js';

const DIALOG_PADDING = PIXI_UI_GEOMETRY.dialogPadding;
const DIALOG_OUTER_WIDTH = 304;
const DIALOG_CONTENT_WIDTH =
  DIALOG_OUTER_WIDTH - DIALOG_PADDING * 2;
const ROW_HEIGHT = PIXI_ROOT_RUN_GEOMETRY.settings.rowPitch;
const CONTENT_PADDING_TOP =
  PIXI_UI_GEOMETRY.dialogScrollPaddingTop;
const MIN_VISIBLE_ROWS = 4.5;
const CONTENT_MIN_HEIGHT =
  ROW_HEIGHT * MIN_VISIBLE_ROWS + CONTENT_PADDING_TOP;
const CONTENT_MAX_HEIGHT = 312;
const AMOUNT_SECTION_HEIGHT = 75;
const AMOUNT_SECTION_TITLE_HEIGHT = 20;
const AMOUNT_BUTTON_SIZE = 34;
const AMOUNT_BUTTON_GAP = 6;
const AMOUNT_SECTION_GAP =
  PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.sectionGap;
const DIALOG_PAPER_OUTSETS = resolveDialogPaperOutsets({
  top: DIALOG_PADDING,
  right: DIALOG_PADDING,
  bottom: DIALOG_PADDING,
  left: DIALOG_PADDING,
});
const AMOUNT_SECTION_OFFSET =
  AMOUNT_SECTION_HEIGHT +
  DIALOG_PAPER_OUTSETS.bottom +
  AMOUNT_SECTION_GAP +
  DIALOG_PAPER_OUTSETS.top;
const SELECTED_ROW_ID = 'selected-herb';

export const ROOT_RUN_INVENTORY_CHOICE_DIALOG_GEOMETRY = Object.freeze({
  amountSectionGap: AMOUNT_SECTION_GAP,
  amountSectionHeight: AMOUNT_SECTION_HEIGHT,
  amountSectionOffset: AMOUNT_SECTION_OFFSET,
  amountSectionTitleHeight: AMOUNT_SECTION_TITLE_HEIGHT,
  amountButtonGap: AMOUNT_BUTTON_GAP,
  amountButtonSize: AMOUNT_BUTTON_SIZE,
  contentMaxHeight: CONTENT_MAX_HEIGHT,
  contentMinHeight: CONTENT_MIN_HEIGHT,
  contentPaddingTop: CONTENT_PADDING_TOP,
  contentWidth: DIALOG_CONTENT_WIDTH,
  minimumVisibleRows: MIN_VISIBLE_ROWS,
  outerWidth: DIALOG_OUTER_WIDTH,
  rowHeight: ROW_HEIGHT,
});

/**
 * Shared Root Run inventory chooser used by Garden seeds and Brewing herbs.
 * Feature presenters own filtering, copy, selection, and gameplay actions.
 */
export class RootRunInventoryChoiceDialogPixi {
  constructor({
    id,
    title,
    itemKind,
    selectActionName,
    listLabel,
    parent,
    inputRouter = null,
    semanticTargets = null,
    assetManager = null,
    counters = null,
    onClose = null,
    amountSelection = false,
    amountActionName = 'setItemQuantity',
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.defaultTitle = title;
    this.itemKind = itemKind;
    this.selectActionName = selectActionName;
    this.amountActionName = amountActionName;
    this.modal = new PixiOwnedDialogSurface({
      id,
      parent,
      inputRouter,
      semanticRegistry: semanticTargets,
      assetManager,
      title,
      onClose,
      theme,
    });
    this.root = this.modal.root;
    this.actions = {};
    this.list = new RootRunInventoryChoiceList({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      counters,
      rowHeight: ROW_HEIGHT,
      useSettingsRows: true,
      label: listLabel,
    });
    this.rows = this.list.rows;
    this.amountSelection = amountSelection
      ? new RootRunInventoryChoiceAmountSection({
          id,
          assetManager,
          inputRouter,
          semanticTargets,
          counters,
          onStep: (item, quantity) =>
            this.setSelectedItemQuantity(item, quantity),
        })
      : null;
    this.selectionPaper = this.amountSelection
      ? createDialogPaperSection(
          this.modal.panel.paperFrame.texture,
          `${id}:selectionPaper`,
        )
      : null;
    this.listPaper = this.amountSelection
      ? createDialogPaperSection(
          this.modal.panel.paperFrame.texture,
          `${id}:listPaper`,
        )
      : null;
    this.modal.panel.setPaperVisible(!this.amountSelection);
    this.modal.panel.content.addChild(
      ...(this.amountSelection
        ? [
            this.selectionPaper,
            this.listPaper,
            this.amountSelection.root,
          ]
        : []),
      this.list.root,
    );
    this.applyTheme(theme);
    this.layout({
      sourceWidth: RETAINED_PAGE_GEOMETRY.width,
      sourceHeight: RETAINED_PAGE_GEOMETRY.height,
    });
  }

  bind(viewModel) {
    const model = viewModel ?? {};
    this.actions = model.actions ?? {};
    this.modal.setTitle(model.title ?? this.defaultTitle);
    this.items = normalizeRows(model.rows ?? model.items).map((item) => ({
      ...item,
      itemKind: item.itemKind ?? this.itemKind,
      detail:
        item.detail ??
        `${item.quantityText ?? item.quantity ?? 0} Available`,
      value: '',
    }));
    this.amountSelection?.bind(
      model.selectedItem ?? model.selection ?? null,
    );
    this.refreshList();
    this.list.applyTheme(this.modal.getContentTheme());
    this.layout({
      sourceWidth: this.sourceWidth,
      sourceHeight: this.sourceHeight,
    });
  }

  applyTheme(themeSnapshot) {
    this.theme = themeSnapshot ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.modal.applyTheme(this.theme);
    this.list?.applyTheme(this.modal.getContentTheme());
    this.amountSelection?.applyTheme(this.modal.getContentTheme());
  }

  layout(viewportProjection) {
    this.sourceWidth =
      Number(viewportProjection?.sourceWidth) ||
      RETAINED_PAGE_GEOMETRY.width;
    this.sourceHeight =
      Number(viewportProjection?.sourceHeight) ||
      RETAINED_PAGE_GEOMETRY.height;
    const rowCount = this.list?.items?.length ?? 0;
    this.listHeight = Math.min(
      CONTENT_MAX_HEIGHT,
      Math.max(
        CONTENT_MIN_HEIGHT,
        rowCount * ROW_HEIGHT + CONTENT_PADDING_TOP,
      ),
    );
    const selectionOffset = this.amountSelection
      ? AMOUNT_SECTION_OFFSET
      : 0;
    this.contentHeight = this.listHeight + selectionOffset;
    const outerHeight = this.contentHeight + DIALOG_PADDING * 2;
    this.modal.setBounds(
      (this.sourceWidth - DIALOG_OUTER_WIDTH) / 2,
      (this.sourceHeight - outerHeight) / 2,
      DIALOG_OUTER_WIDTH,
      outerHeight,
    );
    this.modal.panel.setContentBoxSize(
      DIALOG_CONTENT_WIDTH,
      this.contentHeight,
      DIALOG_PADDING,
    );
    const listLayout = resolveRetainedDialogListLayout({
      bodyWidth: DIALOG_CONTENT_WIDTH,
      paperRight: DIALOG_CONTENT_WIDTH + DIALOG_PADDING + 14 / 3,
      rowFrameWidth: RETAINED_DIALOG_LIST_GEOMETRY.rowFrameWidth,
    });
    this.list.setBounds(
      listLayout.x,
      selectionOffset,
      listLayout.viewportWidth,
      this.listHeight,
      listLayout.rowWidth,
    );
    this.amountSelection?.setBounds(
      listLayout.x,
      0,
      listLayout.rowWidth,
      AMOUNT_SECTION_HEIGHT,
    );
    if (this.amountSelection) {
      setDialogPaperSectionBounds(
        this.selectionPaper,
        {
          x: 0,
          y: 0,
          width: DIALOG_CONTENT_WIDTH,
          height: AMOUNT_SECTION_HEIGHT,
        },
        DIALOG_PAPER_OUTSETS,
      );
      setDialogPaperSectionBounds(
        this.listPaper,
        {
          x: 0,
          y: selectionOffset,
          width: DIALOG_CONTENT_WIDTH,
          height: this.listHeight,
        },
        DIALOG_PAPER_OUTSETS,
      );
    }
    this.modal.layout(viewportProjection);
  }

  selectItem(item) {
    const result =
      item.onSelect?.(item) ??
      this.actions[this.selectActionName]?.(item) ??
      this.actions.selectItem?.(item) ??
      true;
    if (this.amountSelection && result !== false && result?.ok !== false) {
      this.amountSelection.applyResult(item, result, 1);
      this.refreshList();
    }
    return result;
  }

  setSelectedItemQuantity(item, quantity) {
    const result =
      this.actions[this.amountActionName]?.(item, quantity) ??
      this.actions.setItemQuantity?.(item, quantity) ??
      false;
    if (result !== false && result?.ok !== false) {
      this.amountSelection?.applyResult(item, result, quantity);
      this.refreshList();
    }
    return result;
  }

  refreshList() {
    const selectedItemTypeId =
      this.amountSelection?.model?.itemTypeId ?? null;
    const selectedKey = this.amountSelection?.model?.key ?? null;
    this.list.setItems(
      (this.items ?? []).map((item) => ({
        ...item,
        selected: this.amountSelection
          ? (selectedItemTypeId !== null &&
              item.itemTypeId === selectedItemTypeId) ||
            Boolean(selectedKey && item.key === selectedKey)
          : item.selected === true,
        action: () => this.selectItem(item),
      })),
    );
  }

  activate() {
    this.modal.activate();
  }

  deactivate() {
    this.modal.deactivate();
  }

  destroy() {
    this.amountSelection?.destroy();
    this.list.destroy();
    this.modal.destroy();
  }

  getDisplayObject() {
    return this.root;
  }
}

class RootRunInventoryChoiceAmountSection {
  constructor({
    id,
    assetManager,
    inputRouter,
    semanticTargets,
    counters,
    onStep,
  }) {
    this.onStep = onStep;
    this.root = new Container({
      label: `${id}-selected-item-amount`,
    });
    this.title = createText('Selected Herb', {
      ...RETAINED_TEXT_STYLES.bold,
    });
    this.list = new RootRunInventoryChoiceList({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      counters,
      rowHeight: ROW_HEIGHT,
      useSettingsRows: true,
      label: `${id}-selected-herb-row`,
    });
    this.list.contentPaddingTop = 0;
    this.decrement = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: `${id}.selected-herb.decrement`,
      text: '−',
      width: AMOUNT_BUTTON_SIZE,
      height: AMOUNT_BUTTON_SIZE,
      action: () => this.step(-1),
      variant: 'yellow',
      label: `${id}-selected-herb-decrement`,
    });
    this.increment = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry: semanticTargets,
      semanticId: `${id}.selected-herb.increment`,
      text: '+',
      width: AMOUNT_BUTTON_SIZE,
      height: AMOUNT_BUTTON_SIZE,
      action: () => this.step(1),
      variant: 'yellow',
      label: `${id}-selected-herb-increment`,
    });
    this.root.addChild(
      this.title,
      this.list.root,
      this.decrement,
      this.increment,
    );
    this.bind(null);
  }

  bind(model) {
    const quantity = Math.max(
      0,
      Math.floor(Number(model?.selectedQuantity ?? model?.quantity) || 0),
    );
    this.model = quantity > 0 ? { ...model, quantity } : null;
    const selected = Boolean(this.model);
    const maxQuantity = Math.max(
      quantity,
      Math.floor(Number(model?.maxQuantity) || quantity),
    );
    this.maxQuantity = maxQuantity;
    const key = this.model?.itemKey ?? this.model?.key ?? null;
    this.list.setItems([
      selected
        ? {
            ...this.model,
            id: SELECTED_ROW_ID,
            key: SELECTED_ROW_ID,
            label: titleCase(this.model.label ?? key),
            detail: `${quantity} Selected`,
            value: '',
            itemKind: 'herb',
            itemKey: key,
            icon: { kind: 'herb', key },
            enabled: true,
            action: null,
            selected: false,
            semanticId: null,
            tutorialId: null,
          }
        : {
            id: SELECTED_ROW_ID,
            key: SELECTED_ROW_ID,
            label: 'Select an Herb Below',
            detail: '',
            value: '',
            enabled: true,
            action: null,
            selected: false,
          },
    ]);
    for (const displayObject of [this.decrement, this.increment]) {
      displayObject.visible = selected;
      displayObject.renderable = selected;
    }
    this.decrement.setEnabled(selected && quantity > 0);
    this.increment.setEnabled(selected && quantity < maxQuantity);
  }

  applyResult(item, result, fallbackQuantity) {
    const quantity = Math.max(
      0,
      Math.floor(
        Number(result?.quantity ?? result?.selectedQuantity ?? fallbackQuantity) ||
          0,
      ),
    );
    if (quantity === 0) {
      this.bind(null);
      return;
    }
    this.bind({
      ...item,
      ...(result?.item ?? {}),
      quantity,
      selectedQuantity: quantity,
      maxQuantity:
        result?.maxQuantity ??
        item?.maxQuantity ??
        Math.max(quantity, this.maxQuantity ?? quantity),
    });
  }

  step(delta) {
    if (!this.model) {
      return false;
    }
    const quantity = this.model.quantity + delta;
    return this.onStep?.(this.model, Math.max(0, quantity)) ?? false;
  }

  setBounds(x, y, width) {
    this.root.position.set(x, y);
    this.title.position.set(
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop,
      PIXI_DIALOG_SPLIT_PAPER_GEOMETRY.contentInsetTop,
    );
    const rowY = AMOUNT_SECTION_TITLE_HEIGHT;
    this.list.setBounds(
      0,
      rowY,
      width,
      ROW_HEIGHT,
      width,
    );
    const controlsWidth =
      AMOUNT_BUTTON_SIZE * 2 + AMOUNT_BUTTON_GAP;
    const controlsX = width - 8 - controlsWidth;
    const controlsY = rowY + (ROW_HEIGHT - AMOUNT_BUTTON_SIZE) / 2;
    this.decrement.position.set(controlsX, controlsY);
    this.increment.position.set(
      controlsX + AMOUNT_BUTTON_SIZE + AMOUNT_BUTTON_GAP,
      controlsY,
    );
    this.decrement.setSize(AMOUNT_BUTTON_SIZE, AMOUNT_BUTTON_SIZE);
    this.increment.setSize(AMOUNT_BUTTON_SIZE, AMOUNT_BUTTON_SIZE);
    const row = this.list.rows.get(SELECTED_ROW_ID);
    const textRight = Math.max(0, controlsX - 8);
    if (row) {
      row.label.setWrapWidth(
        Math.max(0, textRight - row.label.position.x),
      );
      row.detail.setWrapWidth(
        Math.max(0, textRight - row.detail.position.x),
      );
    }
  }

  applyTheme(theme) {
    applyTextTheme(this.title, theme, RETAINED_TEXT_STYLES.bold);
    this.list.applyTheme(theme);
    this.decrement.applyTheme(theme);
    this.increment.applyTheme(theme);
  }

  destroy() {
    this.list.destroy();
    this.root.destroy({ children: true });
  }
}

function titleCase(value) {
  return String(value ?? '')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
