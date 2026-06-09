export class ShopShelfManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.message = '';
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

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__shelf style-box';
    this.root.setAttribute('aria-label', 'Shop shelf');

    this.refs.title = this.createTitle();
    this.refs.gold = this.createGoldRow();
    this.refs.rows = [];
    this.refs.message = document.createElement('div');
    this.refs.message.className = 'shop-page__shelf-message';
    this.refs.popup = this.createSellPopup();

    this.root.append(this.refs.title, this.refs.gold.row, this.refs.message);
    parent.append(this.root, this.refs.popup);
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
    this.message = '';
    this.selectedSellTab = 'seed';
    this.visible = false;
    this.previousFocus = null;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'shop shelf';
    return title;
  }

  createGoldRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__slot-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'gold';

    const value = document.createElement('span');
    value.className = 'row_val';
    value.textContent = '0';

    row.append(label, value);
    return { row, value };
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
    label.textContent = `slot ${slotNumber}`;

    const value = document.createElement('span');
    value.className = 'row_val';

    const button = document.createElement('button');
    button.className = 'style-button shop-page__buy-slot-button';
    button.type = 'button';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onBuySlot();
    });

    row.append(label, value);
    return { row, value, button };
  }

  createSellControls() {
    const root = document.createElement('section');
    root.className = 'shop-page__sell-controls';
    root.setAttribute('aria-label', 'Select item to sell');

    const tabRow = document.createElement('div');
    tabRow.className = 'shop-page__sell-tab-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'type';

    const value = document.createElement('span');
    value.className = 'row_val shop-page__sell-tab-buttons';

    const itemList = document.createElement('div');
    itemList.className = 'shop-page__sell-item-list';

    const tabButtons = new Map();
    const itemRows = new Map();
    const itemButtons = new Map();
    const itemLabels = new Map();
    const itemQuantities = new Map();

    tabRow.append(label, value);
    root.append(tabRow, itemList);
    return {
      root,
      tabValue: value,
      itemList,
      tabButtons,
      itemRows,
      itemButtons,
      itemLabels,
      itemQuantities,
    };
  }

  createSellPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__sell-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__sell-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Select item to sell');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'sell';

    this.refs.sellControls = this.createSellControls();
    dialog.append(title, this.refs.sellControls.root);
    popup.append(dialog);
    this.refs.dialog = dialog;

    return popup;
  }

  onSelectSlot(event, slotNumber) {
    if (event.target?.tagName === 'BUTTON') {
      return;
    }

    const result = this.gameplayFacade.selectShopShelfSlot(slotNumber);

    if (result.ok) {
      this.message = `selected slot ${result.slotNumber}`;
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
    const result = this.gameplayFacade.buyShopShelfSlot();

    if (result.ok) {
      this.message = `bought slot ${result.slotNumber}`;
    } else if (result.reason === 'max_slots') {
      this.message = 'shelf full';
    } else if (result.reason === 'not_enough_gold') {
      this.message = 'not enough gold';
    } else {
      this.message = 'cannot buy slot';
    }

    this.render(this.gameplayFacade.getSnapshot());
  }

  onSelectSellTab(kind) {
    this.selectedSellTab = kind;
    this.render(this.gameplayFacade.getSnapshot());
  }

  onSetSellItem(itemTypeId) {
    const result = this.gameplayFacade.setSelectedShopShelfSlotSellItem(itemTypeId);

    if (result.ok) {
      this.message = `slot ${result.slotNumber} sells ${result.item.label}`;
      this.selectedSellTab = result.item.kind;
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

    this.refs.gold.value.textContent = String(snapshot.gold.current);
    this.refs.message.textContent = this.message;
    this.renderSellControls(shelf);

    this.refs.rows.forEach(({ row, value, button }, index) => {
      const slotNumber = index + 1;
      const cost = shelf.slotCosts[index];
      const slot = shelf.slots[index];

      row.classList.toggle('is-selected', slotNumber === shelf.selectedSlotNumber);

      if (slot.unlocked) {
        row.classList.add('shop-page__slot-row--interactive');
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.setAttribute('aria-label', `select shelf slot ${slotNumber}`);
        value.textContent = this.formatSlotSellValue(slot, shelf);
        return;
      }

      if (slotNumber === shelf.nextSlotNumber) {
        row.classList.remove('shop-page__slot-row--interactive');
        row.removeAttribute('role');
        row.removeAttribute('aria-label');
        row.removeAttribute('tabindex');
        button.textContent = cost === 0 ? 'open (free)' : `buy (${cost} gold)`;
        button.disabled = snapshot.gold.current < cost;
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
      value.textContent = `${cost} gold`;
    });
  }

  renderSellControls(shelf) {
    const selectedSlot = shelf.slots.find(
      (slot) => slot.slotNumber === shelf.selectedSlotNumber,
    );

    this.refs.sellControls.root.hidden = !selectedSlot;

    if (!selectedSlot) {
      return;
    }

    for (const sellKind of shelf.sellKinds) {
      const button = this.refs.sellControls.tabButtons.get(sellKind.kind);
      button.setAttribute('aria-pressed', this.selectedSellTab === sellKind.kind ? 'true' : 'false');
    }

    const itemsForSelectedTab = shelf.sellItems.filter(
      (item) => item.kind === this.selectedSellTab,
    );

    for (const item of shelf.sellItems) {
      const row = this.refs.sellControls.itemRows.get(item.itemTypeId);
      const button = this.refs.sellControls.itemButtons.get(item.itemTypeId);
      const label = this.refs.sellControls.itemLabels.get(item.itemTypeId);
      const quantity = this.refs.sellControls.itemQuantities.get(item.itemTypeId);
      row.hidden = item.kind !== this.selectedSellTab;
      label.textContent = `${item.label} `;
      quantity.textContent = `(${item.quantity}) ${this.formatSellGold(item.sellGold)}`;
      button.setAttribute(
        'aria-pressed',
        selectedSlot.sellItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
    }

    this.refs.sellControls.itemList.hidden = itemsForSelectedTab.length === 0;
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
      button.addEventListener('click', () => this.onSelectSellTab(sellKind.kind));
      this.refs.sellControls.tabButtons.set(sellKind.kind, button);
      this.refs.sellControls.tabValue.append(button);
    }
  }

  ensureRows(rowCount) {
    while (this.refs.rows.length < rowCount) {
      const row = this.createSlotRow(this.refs.rows.length + 1);
      this.refs.rows.push(row);
      this.root.insertBefore(row.row, this.refs.message);
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

  formatSlotSellValue(slot, shelf) {
    if (!slot.sellLabel) {
      return 'empty';
    }

    const sellGold = slot.sellGold ?? this.getSellItemGold(shelf, slot.sellItemTypeId);

    if (!Number.isFinite(sellGold)) {
      return slot.sellLabel;
    }

    return `${slot.sellLabel} (${this.formatSellGold(sellGold)})`;
  }

  getSellItemGold(shelf, itemTypeId) {
    return shelf.sellItems.find((item) => item.itemTypeId === itemTypeId)?.sellGold ?? null;
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
