import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';

export class ShopPlayerShelfManager {
  constructor({ gameplayFacade, playerShopFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerShopFacade = playerShopFacade;
    this.root = null;
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.listingPopupVisible = false;
    this.marketPopupVisible = false;
    this.previousFocus = null;
    this.lastGameplaySnapshot = null;
    this.lastPlayerShopSnapshot = {
      connected: false,
      listings: [],
      ownListings: [],
      proceedsGold: 0,
    };
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.listingPopup) {
        this.hideListingPopup();
      }

      if (event.target === this.refs.marketPopup) {
        this.hideMarketPopup();
      }
    };
    this.handleKeydown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (this.marketPopupVisible) {
        event.preventDefault();
        this.hideMarketPopup();
        return;
      }

      if (this.listingPopupVisible) {
        event.preventDefault();
        this.hideListingPopup();
      }
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
    this.root.className = 'shop-page__player-shelf style-box';
    this.root.setAttribute('aria-label', 'Player shop shelf');

    this.refs.title = this.createTitle();
    this.refs.rows = [];
    this.refs.proceedsRow = this.createProceedsRow();
    this.refs.otherShopsButton = this.createOtherShopsButton();
    this.refs.listingPopup = this.createListingPopup();
    this.refs.marketPopup = this.createMarketPopup();

    this.root.append(this.refs.title, this.refs.proceedsRow.row, this.refs.otherShopsButton);
    parent.append(this.root, this.refs.listingPopup, this.refs.marketPopup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribeGameplay = this.gameplayFacade.subscribe((snapshot) => {
      this.lastGameplaySnapshot = snapshot;
      this.render();
    });

    if (this.playerShopFacade) {
      this.unsubscribePlayerShop = this.playerShopFacade.subscribe((snapshot) => {
        this.lastPlayerShopSnapshot = snapshot;
        this.syncOwnListings(snapshot);
        this.render();
      });
      this.lastPlayerShopSnapshot = this.playerShopFacade.getSnapshot();
    }

    this.lastGameplaySnapshot = this.gameplayFacade.getSnapshot();
    this.render();
    this.applyPopupVisibility();

    return this.root;
  }

  unmount() {
    this.unsubscribeGameplay?.();
    this.unsubscribePlayerShop?.();
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.listingPopup?.removeEventListener('click', this.handlePopupClick);
    this.refs.marketPopup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.listingPopup?.remove();
    this.refs.marketPopup?.remove();
    this.root = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.listingPopupVisible = false;
    this.marketPopupVisible = false;
    this.previousFocus = null;
    this.lastGameplaySnapshot = null;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'player shop shelf';
    return title;
  }

  createSlotRow(slotNumber) {
    const row = document.createElement('div');
    row.className = 'shop-page__slot-row shop-page__player-slot-row';
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

  createProceedsRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__player-proceeds-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'sales';

    const value = document.createElement('span');
    value.className = 'row_val';

    const button = document.createElement('button');
    button.className = 'style-button shop-page__buy-slot-button';
    button.type = 'button';
    button.addEventListener('click', () => this.onClaimProceeds());

    row.append(label, value);
    return { row, value, button };
  }

  createOtherShopsButton() {
    const button = document.createElement('button');
    button.className = 'style-button shop-page__other-shops-button';
    button.type = 'button';
    button.textContent = 'other shops';
    button.addEventListener('click', () => this.showMarketPopup());
    return button;
  }

  createListingControls() {
    const root = document.createElement('section');
    root.className = 'shop-page__sell-controls shop-page__player-listing-controls';
    root.setAttribute('aria-label', 'List item for sale');

    const fields = document.createElement('div');
    fields.className = 'shop-page__player-listing-fields';

    const quantityField = this.createNumberField('quantity', 'quantity', 'Listing quantity');
    const priceField = this.createNumberField('gold each', 'gold each', 'Listing gold value per item');
    this.refs.quantityInput = quantityField.input;
    this.refs.priceInput = priceField.input;
    fields.append(quantityField.field, priceField.field);

    const itemList = document.createElement('div');
    itemList.className = 'shop-page__sell-item-list';

    const emptyRow = document.createElement('div');
    emptyRow.className = 'shop-page__player-listing-item-row';

    const emptyButton = document.createElement('button');
    emptyButton.className = 'shop-page__sell-item-button';
    emptyButton.type = 'button';
    emptyButton.addEventListener('click', () => this.onClearListing());

    const emptyLabel = document.createElement('span');
    emptyLabel.className = 'row_key';
    emptyLabel.textContent = 'empty';

    emptyButton.append(emptyLabel);
    emptyRow.append(emptyButton);
    itemList.append(emptyRow);

    const status = document.createElement('div');
    status.className = 'shop-page__player-shop-status';

    root.append(fields, itemList, status);
    return {
      root,
      emptyButton,
      itemList,
      status,
      tabButtons: new Map(),
      itemRows: new Map(),
      itemButtons: new Map(),
      itemLabels: new Map(),
      itemQuantities: new Map(),
    };
  }

  createNumberField(labelText, placeholder, ariaLabel) {
    const field = document.createElement('label');
    field.className = 'shop-page__player-listing-field';

    const label = document.createElement('span');
    label.className = 'shop-page__player-listing-field-label';
    label.textContent = labelText;

    const input = document.createElement('input');
    input.className = 'style-input shop-page__player-listing-input';
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '1';
    input.step = '1';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', ariaLabel);

    field.append(label, input);
    return { field, input };
  }

  createSellTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__sell-tabs shop-page__player-listing-tabs';
    tabs.setAttribute('aria-label', 'List item type');
    tabs.setAttribute('role', 'tablist');
    return tabs;
  }

  createListingPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__sell-popup shop-page__player-listing-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const panel = document.createElement('section');
    panel.className = 'shop-page__sell-panel';
    panel.setAttribute('aria-label', 'List item for sale');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__sell-dialog shop-page__player-listing-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'list item';

    this.refs.listingControls = this.createListingControls();
    this.refs.listingTabs = this.createSellTabs();
    dialog.append(title, this.refs.listingControls.root);
    panel.append(dialog, this.refs.listingTabs);
    popup.append(panel);
    this.refs.listingDialog = panel;

    return popup;
  }

  createMarketPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__market-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__market-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Other player shops');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'other shops';

    const rows = document.createElement('div');
    rows.className = 'shop-page__market-rows';

    const status = document.createElement('div');
    status.className = 'shop-page__player-shop-status';

    dialog.append(title, rows, status);
    popup.append(dialog);
    this.refs.marketRows = rows;
    this.refs.marketStatus = status;
    this.refs.marketDialog = dialog;
    this.refs.marketRowByListingKey = new Map();

    return popup;
  }

  onSelectSlot(event, slotNumber) {
    if (event.target?.tagName === 'BUTTON') {
      return;
    }

    const result = this.gameplayFacade.selectPlayerShopShelfSlot(slotNumber);
    if (!result.ok) {
      this.render();
      return;
    }

    const snapshot = this.gameplayFacade.getSnapshot();
    const selectedSlot = snapshot.shop.playerShelf.slots.find(
      (slot) => slot.slotNumber === result.slotNumber,
    );

    if (selectedSlot?.itemKind) {
      this.selectedSellTab = selectedSlot.itemKind;
    }

    this.lastGameplaySnapshot = snapshot;
    this.render();
    this.showListingPopup();
  }

  onBuySlot() {
    this.gameplayFacade.buyPlayerShopShelfSlot();
    this.lastGameplaySnapshot = this.gameplayFacade.getSnapshot();
    this.render();
  }

  onSelectSellTab(kind) {
    this.selectedSellTab = kind;
    this.render();
  }

  async onSetListing(itemTypeId) {
    const shelf = this.lastGameplaySnapshot?.shop?.playerShelf;
    const selectedSlot = this.getSelectedSlot(shelf);
    const item = shelf?.sellItems.find((sellItem) => sellItem.itemTypeId === itemTypeId);
    const quantity = this.readPositiveInteger(this.refs.quantityInput?.value);
    const priceGold = this.readPositiveInteger(this.refs.priceInput?.value);

    if (!selectedSlot || !item) {
      return;
    }

    if (!quantity) {
      this.setListingStatus('bad quantity');
      return;
    }

    if (!priceGold) {
      this.setListingStatus('bad value');
      return;
    }

    const availableQuantity =
      item.quantity + (selectedSlot.itemTypeId === item.itemTypeId ? selectedSlot.quantity : 0);

    if (quantity > availableQuantity) {
      this.setListingStatus('not enough items');
      return;
    }

    if (!this.lastPlayerShopSnapshot.connected) {
      this.setListingStatus('offline');
      return;
    }

    this.setListingStatus('listing');
    const publishResult = await this.playerShopFacade?.setSlotListing({
      slotNumber: selectedSlot.slotNumber,
      itemKey: item.key,
      itemLabel: item.label,
      itemKind: item.kind,
      quantity,
      priceGold,
    });

    if (!publishResult?.ok) {
      this.setListingStatus('listing failed');
      return;
    }

    const result = this.gameplayFacade.setSelectedPlayerShopShelfSlotListing({
      itemTypeId,
      quantity,
      priceGold,
    });

    if (!result.ok) {
      await this.playerShopFacade?.clearSlotListing(selectedSlot.slotNumber);
      this.setListingStatus('listing failed');
      this.render();
      return;
    }

    this.lastGameplaySnapshot = this.gameplayFacade.getSnapshot();
    this.hideListingPopup();
    this.render();
  }

  async onClearListing() {
    const shelf = this.lastGameplaySnapshot?.shop?.playerShelf;
    const selectedSlot = this.getSelectedSlot(shelf);

    if (!selectedSlot) {
      return;
    }

    if (selectedSlot.itemTypeId && !this.lastPlayerShopSnapshot.connected) {
      this.setListingStatus('offline');
      return;
    }

    if (selectedSlot.itemTypeId) {
      const publishResult = await this.playerShopFacade?.clearSlotListing(
        selectedSlot.slotNumber,
      );

      if (!publishResult?.ok) {
        this.setListingStatus('clear failed');
        return;
      }
    }

    const result = this.gameplayFacade.clearSelectedPlayerShopShelfSlotListing();

    if (result.ok) {
      this.lastGameplaySnapshot = this.gameplayFacade.getSnapshot();
      this.hideListingPopup();
    }

    this.render();
  }

  async onClaimProceeds() {
    const proceedsGold = this.lastPlayerShopSnapshot.proceedsGold ?? 0;

    if (proceedsGold <= 0 || !this.lastPlayerShopSnapshot.connected) {
      return;
    }

    const claimResult = await this.playerShopFacade?.claimProceeds();

    if (!claimResult?.ok) {
      return;
    }

    this.gameplayFacade.claimPlayerShopSaleProceeds(proceedsGold);
    this.lastGameplaySnapshot = this.gameplayFacade.getSnapshot();
    this.render();
  }

  async onBuyListing(listing) {
    if (!this.lastPlayerShopSnapshot.connected) {
      this.setMarketStatus('offline');
      return;
    }

    if ((this.lastGameplaySnapshot?.gold?.current ?? 0) < listing.priceGold) {
      this.setMarketStatus('not enough gold');
      return;
    }

    this.setMarketStatus('buying');
    const buyResult = await this.playerShopFacade?.buyListing({
      listingKey: listing.listingKey,
      quantity: 1,
    });

    if (!buyResult?.ok) {
      this.setMarketStatus('buy failed');
      return;
    }

    const result = this.gameplayFacade.buyPlayerShopListingItem({
      itemKey: listing.itemKey,
      quantity: 1,
      priceGold: listing.priceGold,
    });

    this.lastGameplaySnapshot = this.gameplayFacade.getSnapshot();

    if (!result.ok) {
      this.setMarketStatus('buy failed');
      this.render();
      return;
    }

    this.setMarketStatus('');
    this.render();
  }

  showListingPopup() {
    this.previousFocus = document.activeElement;
    this.listingPopupVisible = true;
    this.applyPopupVisibility();
    this.refs.listingDialog?.focus();
  }

  hideListingPopup() {
    const wasVisible = this.listingPopupVisible;
    this.listingPopupVisible = false;
    this.applyPopupVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
    this.setListingStatus('');
  }

  showMarketPopup() {
    this.previousFocus = document.activeElement;
    this.marketPopupVisible = true;
    this.applyPopupVisibility();
    this.refs.marketDialog?.focus();
  }

  hideMarketPopup() {
    const wasVisible = this.marketPopupVisible;
    this.marketPopupVisible = false;
    this.applyPopupVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
    this.setMarketStatus('');
  }

  render() {
    const shelf = this.lastGameplaySnapshot?.shop?.playerShelf;

    if (!this.root || !shelf) {
      return;
    }

    this.ensureRows(shelf.maxSlots);
    this.ensureSellTabButtons(shelf.sellKinds);
    this.ensureSellItemButtons(shelf.sellItems);
    this.renderRows(shelf);
    this.renderListingControls(shelf, this.lastGameplaySnapshot);
    this.renderProceeds();
    this.renderMarketRows();
  }

  renderRows(shelf) {
    this.refs.rows.forEach(({ row, value, button }, index) => {
      const slotNumber = index + 1;
      const cost = shelf.slotCosts[index];
      const slot = shelf.slots[index];

      row.classList.toggle('is-selected', slotNumber === shelf.selectedSlotNumber);
      row.classList.toggle('is-locked', !slot.unlocked);

      if (slot.unlocked) {
        row.classList.add('shop-page__slot-row--interactive');
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.setAttribute('aria-label', `select player shop shelf slot ${slotNumber}`);
        value.textContent = this.formatPlayerSlotValue(slot, shelf, this.lastGameplaySnapshot);
        return;
      }

      if (slotNumber === shelf.nextSlotNumber) {
        row.classList.remove('shop-page__slot-row--interactive');
        row.removeAttribute('role');
        row.removeAttribute('aria-label');
        row.removeAttribute('tabindex');
        button.textContent = cost === 0 ? 'open (free)' : `buy (${cost} gold)`;
        button.disabled = this.lastGameplaySnapshot.gold.current < cost;
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
    });
  }

  renderListingControls(shelf, snapshot) {
    const selectedSlot = this.getSelectedSlot(shelf);
    this.refs.listingControls.root.hidden = !selectedSlot;

    if (!selectedSlot) {
      return;
    }

    for (const sellKind of shelf.sellKinds) {
      const button = this.refs.listingControls.tabButtons.get(sellKind.kind);
      const selected = this.selectedSellTab === sellKind.kind;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.setAttribute('tabindex', selected ? '0' : '-1');
    }

    if (document.activeElement !== this.refs.quantityInput) {
      this.refs.quantityInput.value = String(selectedSlot.quantity || 1);
    }

    if (document.activeElement !== this.refs.priceInput) {
      this.refs.priceInput.value = String(selectedSlot.priceGold || 1);
    }

    this.refs.listingControls.emptyButton.setAttribute(
      'aria-pressed',
      selectedSlot.itemTypeId ? 'false' : 'true',
    );

    const visibleItemTypeIds = new Set(shelf.sellItems.map((item) => item.itemTypeId));

    for (const [itemTypeId, row] of this.refs.listingControls.itemRows) {
      if (!visibleItemTypeIds.has(itemTypeId)) {
        row.hidden = true;
      }
    }

    for (const item of shelf.sellItems) {
      const row = this.refs.listingControls.itemRows.get(item.itemTypeId);
      const button = this.refs.listingControls.itemButtons.get(item.itemTypeId);
      const label = this.refs.listingControls.itemLabels.get(item.itemTypeId);
      const quantity = this.refs.listingControls.itemQuantities.get(item.itemTypeId);
      const display = getItemDisplay(snapshot, item, item.quantity);
      const actionVisible = shouldShowItemInActionList(snapshot, item, item.quantity);
      row.hidden = item.kind !== this.selectedSellTab || !actionVisible;
      row.classList.toggle('is-locked', display.locked);
      row.classList.toggle('is-unknown', display.unknown);
      row.classList.toggle('is-empty', display.empty);
      label.textContent = `${display.label} `;
      quantity.textContent = `(${display.quantity})`;
      button.disabled = !actionVisible;
      button.setAttribute('aria-disabled', actionVisible ? 'false' : 'true');
      button.setAttribute(
        'aria-pressed',
        selectedSlot.itemTypeId === item.itemTypeId ? 'true' : 'false',
      );
    }
  }

  renderProceeds() {
    const proceedsGold = this.lastPlayerShopSnapshot.proceedsGold ?? 0;

    if (proceedsGold <= 0) {
      this.refs.proceedsRow.value.textContent = this.lastPlayerShopSnapshot.connected
        ? 'none'
        : 'offline';
      return;
    }

    const button = this.refs.proceedsRow.button;
    button.textContent = `claim (${proceedsGold} gold)`;
    button.disabled = !this.lastPlayerShopSnapshot.connected;
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');

    if (button.parentElement !== this.refs.proceedsRow.value) {
      this.refs.proceedsRow.value.replaceChildren(button);
    }
  }

  renderMarketRows() {
    const rows = this.lastPlayerShopSnapshot.listings ?? [];
    const rowKeys = new Set(rows.map((listing) => listing.listingKey));

    for (const [listingKey, row] of this.refs.marketRowByListingKey) {
      if (!rowKeys.has(listingKey)) {
        row.remove();
        this.refs.marketRowByListingKey.delete(listingKey);
      }
    }

    if (!this.lastPlayerShopSnapshot.connected) {
      this.refs.marketRows.textContent = 'offline';
      return;
    }

    if (rows.length === 0) {
      this.refs.marketRows.textContent = 'empty';
      return;
    }

    if (this.refs.marketRows.textContent === 'empty' || this.refs.marketRows.textContent === 'offline') {
      this.refs.marketRows.textContent = '';
    }

    for (const listing of rows) {
      let row = this.refs.marketRowByListingKey.get(listing.listingKey);

      if (!row) {
        row = this.createMarketRow();
        this.refs.marketRowByListingKey.set(listing.listingKey, row);
        this.refs.marketRows.append(row);
      }

      row.querySelector('.row_key').textContent =
        `${listing.username}: ${listing.itemLabel} (${listing.quantity})`;
      const button = row.querySelector('button');
      button.textContent = `buy (${listing.priceGold} gold)`;
      button.disabled = (this.lastGameplaySnapshot?.gold?.current ?? 0) < listing.priceGold;
      button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
      button.onclick = () => this.onBuyListing(listing);
    }
  }

  createMarketRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__market-row';

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    const button = document.createElement('button');
    button.className = 'style-button shop-page__buy-slot-button';
    button.type = 'button';

    value.append(button);
    row.append(label, value);
    return row;
  }

  ensureRows(rowCount) {
    while (this.refs.rows.length < rowCount) {
      const row = this.createSlotRow(this.refs.rows.length + 1);
      this.refs.rows.push(row);
      this.root.insertBefore(row.row, this.refs.proceedsRow.row);
    }
  }

  ensureSellTabButtons(sellKinds) {
    for (const sellKind of sellKinds) {
      if (this.refs.listingControls.tabButtons.has(sellKind.kind)) {
        continue;
      }

      const button = document.createElement('button');
      button.className = 'style-button shop-page__sell-tab-button';
      button.type = 'button';
      button.textContent = sellKind.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectSellTab(sellKind.kind));
      this.refs.listingControls.tabButtons.set(sellKind.kind, button);
      this.refs.listingTabs.append(button);
    }
  }

  ensureSellItemButtons(sellItems) {
    for (const item of sellItems) {
      if (this.refs.listingControls.itemButtons.has(item.itemTypeId)) {
        continue;
      }

      const row = document.createElement('div');
      row.className = 'shop-page__player-listing-item-row';

      const button = document.createElement('button');
      button.className = 'shop-page__sell-item-button';
      button.type = 'button';
      button.addEventListener('click', () => this.onSetListing(item.itemTypeId));

      const label = document.createElement('span');
      label.className = 'row_key';

      const quantity = document.createElement('span');
      quantity.className = 'row_val';

      button.append(label, quantity);
      row.append(button);
      this.refs.listingControls.itemRows.set(item.itemTypeId, row);
      this.refs.listingControls.itemButtons.set(item.itemTypeId, button);
      this.refs.listingControls.itemLabels.set(item.itemTypeId, label);
      this.refs.listingControls.itemQuantities.set(item.itemTypeId, quantity);
      this.refs.listingControls.itemList.append(row);
    }
  }

  syncOwnListings(snapshot) {
    const ownListings = snapshot?.ownListings ?? [];

    for (const listing of ownListings) {
      this.gameplayFacade.applyPlayerShopMarketSlotQuantity(
        listing.slotNumber,
        listing.quantity,
      );
    }

    this.lastGameplaySnapshot = this.gameplayFacade.getSnapshot();
  }

  getSelectedSlot(shelf) {
    return shelf?.slots.find((slot) => slot.slotNumber === shelf.selectedSlotNumber) ?? null;
  }

  formatPlayerSlotValue(slot, shelf, snapshot) {
    if (!slot.itemLabel) {
      return 'empty';
    }

    const listingItem =
      shelf?.sellItems.find((item) => item.itemTypeId === slot.itemTypeId) ?? null;
    const displayItem = listingItem ?? {
      itemTypeId: slot.itemTypeId,
      key: slot.itemKey,
      kind: slot.itemKind,
      label: slot.itemLabel,
    };
    const display = getItemDisplay(snapshot, displayItem, slot.quantity);

    return `${display.label} (${display.quantity}) ${slot.priceGold} gold`;
  }

  readPositiveInteger(value) {
    const parsed = Math.floor(Number(value));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  setListingStatus(status) {
    if (this.refs.listingControls?.status) {
      this.refs.listingControls.status.textContent = status;
    }
  }

  setMarketStatus(status) {
    if (this.refs.marketStatus) {
      this.refs.marketStatus.textContent = status;
    }
  }

  applyPopupVisibility() {
    if (this.refs.listingPopup) {
      this.refs.listingPopup.hidden = !this.listingPopupVisible;
      this.refs.listingPopup.setAttribute(
        'aria-hidden',
        this.listingPopupVisible ? 'false' : 'true',
      );
    }

    if (this.refs.marketPopup) {
      this.refs.marketPopup.hidden = !this.marketPopupVisible;
      this.refs.marketPopup.setAttribute(
        'aria-hidden',
        this.marketPopupVisible ? 'false' : 'true',
      );
    }
  }
}
