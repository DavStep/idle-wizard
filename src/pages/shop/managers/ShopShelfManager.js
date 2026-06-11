import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';

export class ShopShelfManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.visible = false;
    this.previousFocus = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hideSellPopup();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hideSellPopup();
    };
  }

  mount(parent, popupParent = parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__shelf style-box';
    this.root.setAttribute('aria-label', 'NPC market');

    this.refs.title = this.createTitle();
    this.refs.rows = [];
    this.refs.popup = this.createSellPopup();

    this.root.append(this.refs.title);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyPopupVisibility();

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.visible = false;
    this.previousFocus = null;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'npc market';
    return title;
  }

  createSlotRow(slotNumber) {
    const row = document.createElement('div');
    row.className = 'shop-page__slot-row';
    row.addEventListener('click', (event) => this.onSelectSlot(event, slotNumber));
    row.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      this.onSelectSlot(event, slotNumber);
    });

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = `stand ${slotNumber}`;

    const value = document.createElement('span');
    value.className = 'row_val';

    const itemValue = document.createElement('span');
    itemValue.className = 'shop-page__slot-item-value';

    const priceValue = document.createElement('span');
    priceValue.className = 'shop-page__slot-price-value';

    const button = document.createElement('button');
    button.className = 'style-button shop-page__buy-slot-button';
    button.type = 'button';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onBuySlot();
    });

    row.append(label, value);
    return { row, value, button, itemValue, priceValue };
  }

  createSellControls() {
    const root = document.createElement('section');
    root.className = 'shop-page__sell-controls';
    root.setAttribute('aria-label', 'Select item to sell');

    const itemList = document.createElement('div');
    itemList.className = 'shop-page__sell-item-list';

    const emptyRow = document.createElement('div');
    emptyRow.className = 'shop-page__sell-item-row';

    const emptyButton = document.createElement('button');
    emptyButton.className = 'shop-page__sell-item-button';
    emptyButton.type = 'button';
    emptyButton.addEventListener('click', () => this.onClearSellItem());

    const emptyLabel = document.createElement('span');
    emptyLabel.className = 'row_key';
    emptyLabel.textContent = 'empty';

    emptyButton.append(emptyLabel);
    emptyRow.append(emptyButton);
    itemList.append(emptyRow);

    const tabButtons = new Map();
    const itemRows = new Map();
    const itemButtons = new Map();
    const itemLabels = new Map();
    const itemQuantities = new Map();

    root.append(itemList);
    return {
      root,
      emptyButton,
      itemList,
      tabButtons,
      itemRows,
      itemButtons,
      itemLabels,
      itemQuantities,
    };
  }

  createSellTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__sell-tabs';
    tabs.setAttribute('aria-label', 'Sell item type');
    tabs.setAttribute('role', 'tablist');
    return tabs;
  }

  createSellPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__sell-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const panel = document.createElement('section');
    panel.className = 'shop-page__sell-panel';
    panel.setAttribute('aria-label', 'Select item to sell');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__sell-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'sell';

    this.refs.sellControls = this.createSellControls();
    this.refs.sellTabs = this.createSellTabs();
    dialog.append(title, this.refs.sellControls.root);
    panel.append(dialog, this.refs.sellTabs);
    popup.append(panel);
    this.refs.dialog = panel;

    return popup;
  }

  onSelectSlot(event, slotNumber) {
    if (event.target?.tagName === 'BUTTON') {
      return;
    }

    const result = this.gameplayFacade.selectShopShelfSlot(slotNumber);
    if (!result.ok) {
      this.render(this.gameplayFacade.getSnapshot());
      return;
    }

    const snapshot = this.gameplayFacade.getSnapshot();
    const selectedSlot = snapshot.shop.shelf.slots.find(
      (slot) => slot.slotNumber === result.slotNumber,
    );

    if (selectedSlot?.sellKind) {
      this.selectedSellTab = selectedSlot.sellKind;
    }

    this.render(snapshot);
    this.showSellPopup();
  }

  onBuySlot() {
    this.gameplayFacade.buyShopShelfSlot();
    this.render(this.gameplayFacade.getSnapshot());
  }

  onSelectSellTab(kind) {
    this.selectedSellTab = kind;
    this.render(this.gameplayFacade.getSnapshot());
  }

  onSetSellItem(itemTypeId) {
    const result = this.gameplayFacade.setSelectedShopShelfSlotSellItem(itemTypeId);

    if (result.ok) {
      this.selectedSellTab = result.item.kind;
      this.hideSellPopup();
    }

    this.render(this.gameplayFacade.getSnapshot());
  }

  onClearSellItem() {
    const result = this.gameplayFacade.clearSelectedShopShelfSlotSellItem();

    if (result.ok) {
      this.hideSellPopup();
    }

    this.render(this.gameplayFacade.getSnapshot());
  }

  showSellPopup() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyPopupVisibility();
    this.refs.dialog?.focus();
  }

  hideSellPopup() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyPopupVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  render(snapshot) {
    const shelf = snapshot.shop.shelf;
    this.ensureRows(shelf.maxSlots);
    this.ensureSellTabButtons(shelf.sellKinds);
    this.ensureSellItemButtons(shelf.sellItems);

    this.renderSellControls(snapshot, shelf);

    this.refs.rows.forEach((refs, index) => {
      const { row, value, button } = refs;
      const slotNumber = index + 1;
      const cost = shelf.slotCosts[index];
      const slot = shelf.slots[index];

      row.classList.toggle('is-selected', slotNumber === shelf.selectedSlotNumber);
      row.classList.toggle('is-locked', !slot.unlocked);

      if (slot.unlocked) {
        row.classList.add('shop-page__slot-row--interactive');
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.setAttribute('aria-label', `select npc market stand ${slotNumber}`);
        this.renderSlotSellValue(refs, slot, shelf, snapshot);
        return;
      }

      if (slotNumber === shelf.nextSlotNumber) {
        row.classList.remove('shop-page__slot-row--interactive');
        row.removeAttribute('role');
        row.removeAttribute('aria-label');
        row.removeAttribute('tabindex');
        button.textContent = this.formatLockedSlotAction(shelf, cost);
        setResourceColorFromText(button, button.textContent);
        button.disabled = shelf.nextSlotLockedByLevel || snapshot.gold.current < cost;
        button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');

        if (button.parentElement !== value) {
          value.replaceChildren(button);
        }

        return;
      }

      row.classList.remove('shop-page__slot-row--interactive');
      row.removeAttribute('role');
      row.removeAttribute('aria-label');
      row.removeAttribute('tabindex');
      value.textContent = 'locked';
      setResourceColorFromText(value, value.textContent);
    });
  }

  renderSlotSellValue(refs, slot, shelf, snapshot) {
    const parts = this.getSlotSellParts(slot, shelf, snapshot);

    if (!parts.itemText) {
      refs.value.textContent = 'empty';
      setResourceColorFromText(refs.value, refs.value.textContent);
      return;
    }

    if (
      refs.itemValue.parentElement !== refs.value ||
      refs.priceValue.parentElement !== refs.value
    ) {
      refs.value.replaceChildren(refs.itemValue, refs.priceValue);
    }

    refs.itemValue.textContent = parts.itemText;
    this.applySlotItemColor(refs.itemValue, parts);

    refs.priceValue.textContent = parts.priceText ? ` ${parts.priceText}` : '';
    setResourceColor(refs.priceValue, parts.priceText ? 'gold' : null);
  }

  formatLockedSlotAction(shelf, cost) {
    if (shelf.nextSlotLockedByLevel) {
      return `level ${shelf.nextSlotRequiresLevel}`;
    }

    return cost === 0 ? 'buy (free)' : `buy (${cost} gold)`;
  }

  renderSellControls(snapshot, shelf) {
    const selectedSlot = shelf.slots.find(
      (slot) => slot.slotNumber === shelf.selectedSlotNumber,
    );

    this.refs.sellControls.root.hidden = !selectedSlot;

    if (!selectedSlot) {
      return;
    }

    for (const sellKind of shelf.sellKinds) {
      const button = this.refs.sellControls.tabButtons.get(sellKind.kind);
      const selected = this.selectedSellTab === sellKind.kind;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.setAttribute('tabindex', selected ? '0' : '-1');
    }

    this.refs.sellControls.emptyButton.setAttribute(
      'aria-pressed',
      selectedSlot.sellItemTypeId ? 'false' : 'true',
    );

    const visibleItemTypeIds = new Set(shelf.sellItems.map((item) => item.itemTypeId));

    for (const [itemTypeId, row] of this.refs.sellControls.itemRows) {
      if (!visibleItemTypeIds.has(itemTypeId)) {
        row.hidden = true;
      }
    }

    for (const item of shelf.sellItems) {
      const row = this.refs.sellControls.itemRows.get(item.itemTypeId);
      const button = this.refs.sellControls.itemButtons.get(item.itemTypeId);
      const label = this.refs.sellControls.itemLabels.get(item.itemTypeId);
      const quantity = this.refs.sellControls.itemQuantities.get(item.itemTypeId);
      const display = getItemDisplay(snapshot, item, item.quantity);
      const actionVisible = shouldShowItemInActionList(snapshot, item, item.quantity);
      row.hidden = item.kind !== this.selectedSellTab || !actionVisible;
      row.classList.toggle('is-locked', display.locked);
      row.classList.toggle('is-unknown', display.unknown);
      row.classList.toggle('is-empty', display.empty);
      label.textContent = `${display.label} `;
      setResourceColor(label, item.kind);
      quantity.textContent = `(${display.quantity}) ${this.formatSellGold(item.sellGold)}`;
      setResourceColorFromText(quantity, quantity.textContent);
      button.disabled = !actionVisible;
      button.setAttribute('aria-disabled', actionVisible ? 'false' : 'true');
      button.setAttribute(
        'aria-pressed',
        selectedSlot.sellItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
    }

    this.refs.sellControls.itemList.hidden = false;
  }

  ensureSellTabButtons(sellKinds) {
    for (const sellKind of sellKinds) {
      if (this.refs.sellControls.tabButtons.has(sellKind.kind)) {
        continue;
      }

      const button = document.createElement('button');
      button.className = 'style-button shop-page__sell-tab-button';
      button.type = 'button';
      button.textContent = sellKind.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectSellTab(sellKind.kind));
      this.refs.sellControls.tabButtons.set(sellKind.kind, button);
      this.refs.sellTabs.append(button);
    }
  }

  ensureRows(rowCount) {
    while (this.refs.rows.length < rowCount) {
      const row = this.createSlotRow(this.refs.rows.length + 1);
      this.refs.rows.push(row);
      this.root.append(row.row);
    }
  }

  ensureSellItemButtons(sellItems) {
    for (const item of sellItems) {
      if (this.refs.sellControls.itemButtons.has(item.itemTypeId)) {
        continue;
      }

      const row = document.createElement('div');
      row.className = 'shop-page__sell-item-row';

      const button = document.createElement('button');
      button.className = 'shop-page__sell-item-button';
      button.type = 'button';
      button.addEventListener('click', () => this.onSetSellItem(item.itemTypeId));

      const label = document.createElement('span');
      label.className = 'row_key';

      const quantity = document.createElement('span');
      quantity.className = 'row_val';

      button.append(label, quantity);
      row.append(button);
      this.refs.sellControls.itemRows.set(item.itemTypeId, row);
      this.refs.sellControls.itemButtons.set(item.itemTypeId, button);
      this.refs.sellControls.itemLabels.set(item.itemTypeId, label);
      this.refs.sellControls.itemQuantities.set(item.itemTypeId, quantity);
      this.refs.sellControls.itemList.append(row);
    }
  }

  formatSlotSellValue(slot, shelf, snapshot) {
    const parts = this.getSlotSellParts(slot, shelf, snapshot);
    return [parts.itemText, parts.priceText].filter(Boolean).join(' ');
  }

  getSlotSellParts(slot, shelf, snapshot) {
    if (!slot.sellLabel) {
      return { itemText: '', itemKind: null, priceText: '' };
    }

    const sellItem = this.getSellItem(shelf, slot.sellItemTypeId);
    const quantity = Number.isFinite(slot.sellQuantity) ? slot.sellQuantity : sellItem?.quantity;
    const sellGold = slot.sellGold ?? sellItem?.sellGold;
    const displayItem = sellItem ?? {
      itemTypeId: slot.sellItemTypeId,
      key: slot.sellKey,
      kind: slot.sellKind,
      label: slot.sellLabel,
    };
    const display = displayItem.key
      ? getItemDisplay(snapshot, displayItem, quantity ?? 0)
      : { label: slot.sellLabel, quantity: String(quantity) };
    const itemText = Number.isFinite(quantity)
      ? `${display.label} (${display.quantity})`
      : display.label;

    if (!Number.isFinite(sellGold)) {
      return { itemText, itemKind: displayItem.kind, priceText: '' };
    }

    return {
      itemText,
      itemKind: displayItem.kind,
      priceText: this.formatSellGold(sellGold),
    };
  }

  applySlotItemColor(element, parts) {
    if (parts.itemKind === 'seed' || parts.itemKind === 'herb') {
      setResourceColor(element, parts.itemKind);
      return;
    }

    setResourceColorFromText(element, parts.itemText);
  }

  getSellItem(shelf, itemTypeId) {
    return shelf.sellItems.find((item) => item.itemTypeId === itemTypeId) ?? null;
  }

  formatSellGold(sellGold) {
    if (!Number.isFinite(sellGold)) {
      return '? gold';
    }

    return `${sellGold} gold`;
  }

  applyPopupVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
