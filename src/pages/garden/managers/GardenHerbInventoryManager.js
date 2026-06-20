import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { applyMysteryText } from '../../shared/mysteryText.js';
import { setResourceColor } from '../../shared/resourceColor.js';

const COLLAPSED_ROW_COUNT = 3;

export class GardenInventoryBoxManager {
  constructor({
    gameplayFacade,
    kind = 'herb',
    title = 'herbs',
    rootClassName = 'garden-page__herbs',
    rowsClassName = 'garden-page__herb-rows',
    rowClassName = 'garden-page__herb-row',
    dividerClassName = 'garden-page__herb-divider',
    countClassName = 'garden-page__inventory-count',
    toggleClassName = 'garden-page__inventory-toggle',
    getItems = (snapshot) => snapshot.garden?.herbs ?? [],
    seedDragController = null,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.kind = kind;
    this.title = title;
    this.rootClassName = rootClassName;
    this.rowsClassName = rowsClassName;
    this.rowClassName = rowClassName;
    this.dividerClassName = dividerClassName;
    this.countClassName = countClassName;
    this.toggleClassName = toggleClassName;
    this.getItems = getItems;
    this.seedDragController = seedDragController;
    this.root = null;
    this.rows = null;
    this.count = null;
    this.toggle = null;
    this.unsubscribe = null;
    this.itemRefs = new Map();
    this.divider = null;
    this.expanded = false;
    this.handleToggleClick = () => this.toggleExpanded();
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = `garden-page__inventory ${this.rootClassName} style-box`;
    this.root.setAttribute('aria-label', this.title);

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = this.title;

    this.count = document.createElement('div');
    this.count.className = `${this.countClassName} ${this.rootClassName}-count`;
    this.count.textContent = '0/0';

    this.rows = document.createElement('div');
    this.rows.className = `garden-page__inventory-rows ${this.rowsClassName}`;
    this.rows.id = `${this.rootClassName.replace(/[^a-z0-9_-]+/gi, '-')}-rows`;
    this.toggle = document.createElement('button');
    this.toggle.className = `${this.toggleClassName} ${this.rootClassName}-toggle`;
    this.toggle.type = 'button';
    this.toggle.textContent = 'expand';
    this.toggle.setAttribute('aria-controls', this.rows.id);
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.addEventListener('click', this.handleToggleClick);

    this.root.append(title, this.count, this.rows, this.toggle);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.toggle?.removeEventListener('click', this.handleToggleClick);
    this.root?.remove();
    this.root = null;
    this.rows = null;
    this.count = null;
    this.toggle = null;
    this.itemRefs.clear();
    this.divider = null;
  }

  render(snapshot) {
    const items = this.getVisibleRows(snapshot);
    this.ensureRows(items);

    for (const item of items) {
      const refs = this.itemRefs.get(item.itemTypeId);
      refs.label.textContent = item.display.label;
      applyMysteryText(refs.label, item, item.display.unknown);
      setItemIconLabel(refs.label, item.display.unknown ? null : item.kind, item.key);
      refs.quantity.textContent = item.display.quantity;
      refs.row.classList.toggle('is-empty', item.quantity <= 0);
      refs.row.classList.toggle('is-locked', item.display.locked);
      refs.row.classList.toggle('is-unknown', item.display.unknown);
      this.renderSeedDragState(refs.row, item);
    }

    this.applyRowOrder(items);
    this.renderToggle(items.length);
  }

  getVisibleRows(snapshot) {
    return this.getItems(snapshot)
      .map((item) => ({
        ...item,
        display: getItemDisplay(snapshot, item, item.quantity),
      }))
      .filter((item) => shouldShowItemInActionList(snapshot, item, item.quantity));
  }

  ensureRows(items) {
    for (const item of items) {
      if (this.itemRefs.has(item.itemTypeId)) {
        continue;
      }

      const row = document.createElement('div');
      row.className = `garden-page__inventory-row ${this.rowClassName}`;
      setResourceColor(row, this.kind);
      this.bindSeedDrag(row, item.itemTypeId);

      const label = document.createElement('span');
      label.className = 'row_key';

      const quantity = document.createElement('span');
      quantity.className = 'row_val';

      row.append(label, quantity);
      this.itemRefs.set(item.itemTypeId, { row, label, quantity });
      this.rows.append(row);
    }
  }

  bindSeedDrag(row, itemTypeId) {
    if (!this.seedDragController || this.kind !== 'seed') {
      return;
    }

    row.addEventListener('dragstart', (event) => {
      const item = this.getDragItem(itemTypeId);

      if (item) {
        this.seedDragController.onSeedNativeDragStart?.(event, item);
      }
    });
    row.addEventListener('dragend', () => {
      this.seedDragController.onSeedNativeDragEnd?.();
    });
    row.addEventListener('pointerdown', (event) => {
      const item = this.getDragItem(itemTypeId);

      if (item) {
        this.seedDragController.onSeedPointerDown?.(event, item);
      }
    });
  }

  renderSeedDragState(row, item) {
    if (!this.seedDragController || this.kind !== 'seed') {
      return;
    }

    const canDrag = item.quantity > 0 && !item.display.locked && !item.display.unknown;
    row.classList.toggle('is-draggable', canDrag);
    row.draggable = canDrag && this.seedDragController.canUseNativeSeedDrag?.() !== false;
    row.setAttribute('aria-disabled', canDrag ? 'false' : 'true');
    row.setAttribute(
      'aria-label',
      canDrag
        ? `drag ${item.label} to a plot, owned ${item.quantity}`
        : `${item.label}, owned ${item.quantity}`,
    );
  }

  getDragItem(itemTypeId) {
    return this.getVisibleRows(this.gameplayFacade.getSnapshot()).find(
      (item) => item.itemTypeId === itemTypeId,
    );
  }

  applyRowOrder(items) {
    const knownItems = items.filter((item) => !item.display.locked);
    const unknownItems = items.filter((item) => item.display.locked);
    const visibleCount = this.getVisibleCount(items.length);
    const visibleKnownCount = Math.min(knownItems.length, visibleCount);
    const visibleUnknownCount = Math.max(0, visibleCount - knownItems.length);
    const orderedRows = [
      ...knownItems.map((item) => this.itemRefs.get(item.itemTypeId)?.row),
      ...(knownItems.length > 0 && unknownItems.length > 0
        ? [this.getDivider()]
        : []),
      ...unknownItems.map((item) => this.itemRefs.get(item.itemTypeId)?.row),
    ].filter(Boolean);

    this.rows.replaceChildren(...orderedRows);

    knownItems.forEach((item, index) => {
      this.itemRefs.get(item.itemTypeId)?.row.toggleAttribute(
        'hidden',
        index >= visibleKnownCount,
      );
    });
    unknownItems.forEach((item, index) => {
      this.itemRefs.get(item.itemTypeId)?.row.toggleAttribute(
        'hidden',
        index >= visibleUnknownCount,
      );
    });
    this.divider?.toggleAttribute(
      'hidden',
      visibleKnownCount <= 0 || visibleUnknownCount <= 0,
    );
  }

  getDivider() {
    if (!this.divider) {
      this.divider = document.createElement('div');
      this.divider.className = `garden-page__inventory-divider ${this.dividerClassName}`;
      this.divider.setAttribute('role', 'separator');
    }

    return this.divider;
  }

  renderToggle(itemCount) {
    const visibleCount = this.getVisibleCount(itemCount);
    const canToggle = itemCount > COLLAPSED_ROW_COUNT;

    this.root?.classList.toggle('is-expanded', this.expanded);
    this.root?.classList.toggle('is-collapsed', !this.expanded);
    this.count.textContent = `${visibleCount}/${itemCount}`;
    this.toggle.hidden = !canToggle;
    this.toggle.textContent = this.expanded ? 'collapse' : 'expand';
    this.toggle.setAttribute('aria-expanded', this.expanded ? 'true' : 'false');
    this.toggle.setAttribute(
      'aria-label',
      this.expanded ? `collapse ${this.title}` : `expand ${this.title}`,
    );
  }

  getVisibleCount(itemCount) {
    return this.expanded ? itemCount : Math.min(itemCount, COLLAPSED_ROW_COUNT);
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
    this.render(this.gameplayFacade.getSnapshot());
  }
}

export class GardenHerbInventoryManager extends GardenInventoryBoxManager {
  constructor({ gameplayFacade } = {}) {
    super({
      gameplayFacade,
      kind: 'herb',
      title: 'herbs',
      rootClassName: 'garden-page__herbs',
      rowsClassName: 'garden-page__herb-rows',
      rowClassName: 'garden-page__herb-row',
      dividerClassName: 'garden-page__herb-divider',
      getItems: (snapshot) => snapshot.garden?.herbs ?? [],
    });
  }
}

export class GardenSeedInventoryManager extends GardenInventoryBoxManager {
  constructor({ gameplayFacade, seedDragController } = {}) {
    super({
      gameplayFacade,
      kind: 'seed',
      title: 'seeds',
      rootClassName: 'garden-page__seeds',
      rowsClassName: 'garden-page__seed-inventory-rows',
      rowClassName: 'garden-page__seed-inventory-row',
      dividerClassName: 'garden-page__seed-inventory-divider',
      getItems: (snapshot) => snapshot.garden?.seeds ?? [],
      seedDragController,
    });
  }
}
