import { PixiOwnedDialogSurface } from '../../primitives/PixiOwnedDialogSurface.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_GEOMETRY,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import {
  RETAINED_DIALOG_LIST_GEOMETRY,
  RETAINED_PAGE_GEOMETRY,
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

export const ROOT_RUN_INVENTORY_CHOICE_DIALOG_GEOMETRY = Object.freeze({
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
    theme = DEFAULT_PIXI_THEME_SNAPSHOT,
  } = {}) {
    this.defaultTitle = title;
    this.itemKind = itemKind;
    this.selectActionName = selectActionName;
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
    this.modal.panel.content.addChild(this.list.root);
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
    this.contentHeight = this.listHeight;
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
      0,
      listLayout.viewportWidth,
      this.listHeight,
      listLayout.rowWidth,
    );
    this.modal.layout(viewportProjection);
  }

  selectItem(item) {
    const result =
      item.onSelect?.(item) ??
      this.actions[this.selectActionName]?.(item) ??
      this.actions.selectItem?.(item) ??
      true;
    return result;
  }

  refreshList() {
    this.list.setItems(
      (this.items ?? []).map((item) => ({
        ...item,
        selected: item.selected === true,
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
    this.list.destroy();
    this.modal.destroy();
  }

  getDisplayObject() {
    return this.root;
  }
}
