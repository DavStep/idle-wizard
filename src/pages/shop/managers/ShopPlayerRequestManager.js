import {
  formatGoldPriceText,
  parsePositiveGoldPrice,
} from '../../../shared/goldPrice.js';
import { createAmountSelectionRow } from '../../shared/AmountSelectionRow.js';
import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';

const EMPTY_LOCKED_REQUEST_LABEL = 'empty request';
const EMPTY_REQUEST_ACTION_LABEL = 'request item';

export class ShopPlayerRequestManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribeGameplay = null;
    this.refs = {};
    this.selectedRequestSlotNumber = 1;
    this.selectedRequestItemTypeId = null;
    this.selectedRequestTab = 'seed';
    this.visible = false;
    this.previousFocus = null;
    this.lastGameplaySnapshot = null;
    this.handledPointerPlace = false;
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hidePopup();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hidePopup();
    };
  }

  mount(parent, popupParent = parent) {
    if (!parent || !popupParent) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__player-request style-box';
    this.root.setAttribute('aria-label', 'Player requests');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'requests';

    this.refs.rows = [];
    this.refs.actions = this.createActions();
    this.refs.popup = this.createPopup();

    this.root.append(title, this.refs.actions);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);
    if (this.gameplayFacade) {
      this.unsubscribeGameplay = this.gameplayFacade.subscribe((snapshot) => {
        this.lastGameplaySnapshot = snapshot;
        this.render();
      });
      this.lastGameplaySnapshot = this.gameplayFacade.getSnapshot();
    }
    this.render();
    this.applyPopupVisibility();

    return this.root;
  }

  unmount() {
    this.unsubscribeGameplay?.();
    this.unsubscribeGameplay = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.selectedRequestSlotNumber = 1;
    this.selectedRequestItemTypeId = null;
    this.selectedRequestTab = 'seed';
    this.visible = false;
    this.previousFocus = null;
    this.lastGameplaySnapshot = null;
    this.handledPointerPlace = false;
  }

  createRequestRow(slotNumber) {
    const row = document.createElement('div');
    row.className = 'shop-page__slot-row shop-page__player-request-row';
    row.addEventListener('click', (event) => this.onSelectRequestSlot(event, slotNumber));
    row.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      this.onSelectRequestSlot(event, slotNumber);
    });

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = `${slotNumber}.`;

    const value = document.createElement('span');
    value.className = 'row_val shop-page__slot-value';

    const itemValue = document.createElement('span');
    itemValue.className = 'shop-page__request-row-item';

    const priceValue = document.createElement('span');
    priceValue.className = 'shop-page__request-row-price';

    row.append(label, value);
    return { row, value, itemValue, priceValue };
  }

  createActions() {
    const actions = document.createElement('div');
    actions.className = 'shop-page__player-request-actions';

    this.refs.clearButton = document.createElement('button');
    this.refs.clearButton.className =
      'style-button shop-page__player-request-button shop-page__player-request-clear-button';
    this.refs.clearButton.type = 'button';
    this.refs.clearButton.textContent = 'clear';
    this.refs.clearButton.addEventListener('click', () => this.clearRequest());

    actions.append(this.refs.clearButton);
    return actions;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__request-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const panel = document.createElement('section');
    panel.className = 'shop-page__request-panel';
    panel.setAttribute('aria-label', 'Request player market item');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__request-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'request';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button shop-page__request-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hidePopup());

    this.refs.quantityField = this.createQuantityField();
    this.refs.goldField = this.createNumberField('gold each', 'Gold offered per item');
    this.refs.goldField.input.inputMode = 'decimal';
    this.refs.goldField.input.min = '0.01';
    this.refs.goldField.input.step = '0.01';
    this.refs.itemPicker = this.createItemPicker();
    this.refs.itemTabs = this.createItemTabs();

    const actionRow = document.createElement('div');
    actionRow.className = 'shop-page__request-action-row';

    this.refs.placeButton = document.createElement('button');
    this.refs.placeButton.className = 'style-button shop-page__request-place-button';
    this.refs.placeButton.type = 'button';
    this.refs.placeButton.textContent = 'place request';
    this.refs.placeButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.handledPointerPlace = true;
      this.onPlaceRequest();
    });
    this.refs.placeButton.addEventListener('click', () => {
      if (this.handledPointerPlace) {
        this.handledPointerPlace = false;
        return;
      }

      this.onPlaceRequest();
    });

    this.refs.status = document.createElement('div');
    this.refs.status.className = 'shop-page__request-status';

    actionRow.append(this.refs.placeButton);
    dialog.append(
      title,
      closeButton,
      this.refs.itemPicker.selectedRow,
      this.refs.quantityField.field,
      this.refs.goldField.field,
      actionRow,
      this.refs.itemPicker.divider,
      this.refs.itemPicker.list,
      this.refs.status,
    );
    panel.append(dialog, this.refs.itemTabs);
    popup.append(panel);
    this.refs.dialog = panel;
    return popup;
  }

  createItemPicker() {
    const selectedRow = document.createElement('div');
    selectedRow.className = 'shop-page__request-selected-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'item';

    const selectedValue = document.createElement('span');
    selectedValue.className = 'row_val shop-page__request-selected-value';

    selectedRow.append(label, selectedValue);

    const divider = document.createElement('div');
    divider.className = 'shop-page__request-choice-divider';

    const list = document.createElement('div');
    list.className = 'shop-page__sell-item-list shop-page__request-item-list';

    const empty = document.createElement('div');
    empty.className = 'shop-page__request-empty';
    empty.textContent = 'empty';
    list.append(empty);

    return {
      selectedRow,
      selectedValue,
      divider,
      list,
      empty,
      tabButtons: new Map(),
      itemRows: new Map(),
      itemButtons: new Map(),
      itemLabels: new Map(),
      itemQuantities: new Map(),
    };
  }

  createNumberField(labelText, ariaLabel) {
    const field = document.createElement('label');
    field.className = 'shop-page__request-field';

    const label = document.createElement('span');
    label.className = 'row_key';
    setResourceIconText(label, labelText);

    const input = document.createElement('input');
    input.className = 'style-input shop-page__request-input';
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '1';
    input.step = '1';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', ariaLabel);
    input.addEventListener('input', () => this.setStatus(''));

    field.append(label, input);
    return { field, input };
  }

  createQuantityField() {
    const field = document.createElement('div');
    field.className = 'shop-page__request-field shop-page__request-quantity-field';

    const label = document.createElement('span');
    label.className = 'row_key';
    setResourceIconText(label, 'quantity');

    const amountField = createAmountSelectionRow({
      ariaLabel: 'request quantity',
      className: 'shop-page__request-amount-field',
      inputClassName: 'shop-page__request-input shop-page__request-quantity-input',
      stepClassName: 'shop-page__request-quantity-step',
      valueClassName: 'shop-page__request-quantity-value',
      onInput: () => this.onRequestQuantityInput(),
      onStep: (delta) => this.onRequestQuantityStep(delta),
    });

    field.append(label, amountField.field);
    return { ...amountField, field, label };
  }

  createItemTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__request-tabs';
    tabs.setAttribute('aria-label', 'Request item type');
    tabs.setAttribute('role', 'tablist');
    return tabs;
  }

  showPopup(slotNumber = this.selectedRequestSlotNumber) {
    if (!this.canUseRequestSlot(slotNumber)) {
      return;
    }

    this.selectedRequestSlotNumber = slotNumber;
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.prefillFields();
    this.setStatus('');
    this.render();
    this.applyPopupVisibility();
    this.refs.dialog?.focus();
  }

  hidePopup() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyPopupVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
    this.setStatus('');
  }

  prefillFields() {
    if (!this.refs.quantityField) {
      return;
    }

    const request = this.getSelectedRequest();
    this.selectedRequestItemTypeId = request?.itemTypeId ?? null;
    this.selectedRequestTab = request?.itemKind ?? this.selectedRequestTab;
    this.refs.quantityField.input.value = request
      ? String(request.quantity)
      : '1';
    this.refs.quantityField.setValue(this.refs.quantityField.input.value);
    this.refs.quantityField.hideInput();
    this.refs.goldField.input.value = request
      ? String(request.priceGold)
      : '1';
  }

  onSelectRequestSlot(event, slotNumber) {
    if (event.target?.tagName === 'BUTTON' || !this.canUseRequestSlot(slotNumber)) {
      return;
    }

    this.showPopup(slotNumber);
  }

  onSelectRequestTab(kind) {
    this.selectedRequestTab = kind;
    this.render();
  }

  onSelectRequestItem(itemTypeId) {
    const item = this.getRequestItems().find(
      (candidate) => candidate.itemTypeId === itemTypeId,
    );

    if (!item) {
      return;
    }

    this.selectedRequestItemTypeId =
      this.selectedRequestItemTypeId === item.itemTypeId ? null : item.itemTypeId;
    this.selectedRequestTab = item.kind;
    this.setStatus('');
    this.render();
  }

  onRequestQuantityInput() {
    this.setStatus('');
  }

  onRequestQuantityStep(delta) {
    const quantity = this.readPositiveInteger(this.refs.quantityField?.input.value) ?? 1;
    const nextQuantity = Math.max(1, quantity + delta);

    if (nextQuantity === quantity) {
      return;
    }

    this.refs.quantityField.setValue(nextQuantity);
    this.refs.quantityField.hideInput();
    this.setStatus('');
    this.renderRequestQuantityField();
  }

  onPlaceRequest() {
    const item = this.getSelectedRequestItem();
    const quantity = this.readPositiveInteger(this.refs.quantityField?.input.value);
    const priceGold = parsePositiveGoldPrice(this.refs.goldField?.input.value);

    if (!item) {
      this.setStatus('choose item');
      return;
    }

    if (!quantity) {
      this.setStatus('bad quantity');
      return;
    }

    if (!priceGold) {
      this.setStatus('bad value');
      return;
    }

    const result = this.gameplayFacade?.setPlayerShopRequest?.(this.selectedRequestSlotNumber, {
      itemTypeId: item.itemTypeId,
      quantity,
      priceGold,
    });

    if (!result?.ok) {
      this.setStatus(this.getRequestResultStatus(result));
      return;
    }

    this.lastGameplaySnapshot = this.gameplayFacade?.getSnapshot?.() ?? this.lastGameplaySnapshot;
    this.hidePopup();
    this.render();
  }

  clearRequest() {
    const result = this.gameplayFacade?.clearPlayerShopRequest?.(
      this.selectedRequestSlotNumber,
    );

    if (!result?.ok) {
      this.setStatus(this.getRequestResultStatus(result));
      return;
    }

    this.lastGameplaySnapshot = this.gameplayFacade?.getSnapshot?.() ?? this.lastGameplaySnapshot;
    this.render();
  }

  render() {
    if (!this.root || !this.isRenderVisible()) {
      return;
    }

    const shelf = this.getRequestShelf();
    const rowCount = this.getRequestSlotCount(shelf);
    this.ensureRows(rowCount);
    this.ensureSelectedRequestSlot(shelf);
    this.renderRows(shelf, rowCount);
    this.renderActions();

    if (this.visible) {
      this.renderRequestQuantityField();
      this.renderItemPicker();
    }
  }

  isRenderVisible() {
    return this.visible || !this.root?.closest('[hidden]');
  }

  ensureRows(rowCount) {
    while (this.refs.rows.length < rowCount) {
      const row = this.createRequestRow(this.refs.rows.length + 1);
      this.refs.rows.push(row);
      this.root.insertBefore(row.row, this.refs.actions);
    }

    for (const [index, refs] of this.refs.rows.entries()) {
      refs.row.hidden = index + 1 > rowCount;
    }
  }

  ensureSelectedRequestSlot(shelf) {
    if (this.canUseRequestSlot(this.selectedRequestSlotNumber)) {
      return;
    }

    const rowCount = this.getRequestSlotCount(shelf);
    for (let slotNumber = 1; slotNumber <= rowCount; slotNumber += 1) {
      if (this.getRequestSlotSnapshot(shelf, slotNumber).unlocked) {
        this.selectedRequestSlotNumber = slotNumber;
        return;
      }
    }

    this.selectedRequestSlotNumber = 1;
  }

  renderRows(shelf, rowCount) {
    for (const [index, refs] of this.refs.rows.entries()) {
      const slotNumber = index + 1;

      if (slotNumber > rowCount) {
        continue;
      }

      const slot = this.getRequestSlotSnapshot(shelf, slotNumber);
      const request = this.getRequestFromSlot(slot);
      const unlocked = Boolean(slot.unlocked);
      const selected = slotNumber === this.selectedRequestSlotNumber;

      refs.row.classList.toggle('is-selected', selected);
      refs.row.classList.toggle('is-locked', !unlocked);
      refs.row.classList.toggle('is-empty', unlocked && !request);

      if (unlocked) {
        refs.row.classList.add('shop-page__slot-row--interactive');
        refs.row.setAttribute('role', 'button');
        refs.row.tabIndex = 0;
        refs.row.setAttribute('aria-label', `set player market request ${slotNumber}`);
        refs.row.setAttribute('aria-pressed', selected ? 'true' : 'false');
        this.renderRequestSlotValue(refs, request);
        continue;
      }

      refs.row.classList.remove('shop-page__slot-row--interactive');
      refs.row.removeAttribute('role');
      refs.row.removeAttribute('aria-label');
      refs.row.removeAttribute('tabindex');
      refs.row.removeAttribute('aria-pressed');
      refs.itemValue.textContent = EMPTY_LOCKED_REQUEST_LABEL;
      setItemIconLabel(refs.itemValue, null);
      setResourceColor(refs.itemValue, null);
      refs.priceValue.textContent = this.getLockedRequestSlotText(shelf, slotNumber);
      setResourceColorFromText(refs.priceValue, refs.priceValue.textContent);
      if (refs.priceValue.parentElement !== refs.value) {
        refs.value.replaceChildren(refs.itemValue, refs.priceValue);
      }
    }
  }

  renderRequestSlotValue(refs, request) {
    if (!request) {
      if (
        refs.itemValue.parentElement !== refs.value ||
        refs.priceValue.parentElement !== refs.value
      ) {
        refs.value.replaceChildren(refs.itemValue, refs.priceValue);
      }

      refs.itemValue.textContent = EMPTY_LOCKED_REQUEST_LABEL;
      setItemIconLabel(refs.itemValue, null);
      setResourceColor(refs.itemValue, null);
      refs.priceValue.textContent = EMPTY_REQUEST_ACTION_LABEL;
      setResourceColorFromText(refs.priceValue, refs.priceValue.textContent);
      return;
    }

    const itemText = `${request.itemLabel} (${request.quantity})`;
    const priceText = formatGoldPriceText(request.priceGold);
    if (
      refs.itemValue.parentElement !== refs.value ||
      refs.priceValue.parentElement !== refs.value
    ) {
      refs.value.replaceChildren(refs.itemValue, refs.priceValue);
    }

    refs.itemValue.textContent = itemText;
    setItemIconLabel(refs.itemValue, request.itemKind, request.itemKey);
    setResourceColor(refs.itemValue, request.itemKind);
    setResourceIconText(refs.priceValue, ` ${priceText}`);
    setResourceColor(refs.priceValue, 'gold');
  }

  renderActions() {
    const request = this.getSelectedRequest();
    const canUseSlot = this.canUseRequestSlot(this.selectedRequestSlotNumber);

    this.refs.actions.hidden = !request;
    this.refs.clearButton.hidden = !request;
    this.refs.clearButton.disabled = !canUseSlot;
    this.refs.clearButton.setAttribute(
      'aria-disabled',
      this.refs.clearButton.disabled ? 'true' : 'false',
    );
  }

  getRequestShelf() {
    const requestShelf = this.lastGameplaySnapshot?.shop?.playerRequests;

    if (requestShelf) {
      return requestShelf;
    }

    const playerShelf = this.lastGameplaySnapshot?.shop?.playerShelf;

    if (!playerShelf) {
      return null;
    }

    return {
      ...playerShelf,
      slots: playerShelf.slots?.map((slot) => ({
        slotNumber: slot.slotNumber,
        unlocked: slot.unlocked,
      })),
    };
  }

  getRequestSlotCount(shelf = this.getRequestShelf()) {
    const maxSlots = Number.isInteger(shelf?.maxSlots) ? shelf.maxSlots : null;
    const slotCount = Array.isArray(shelf?.slots) ? shelf.slots.length : 0;
    return Math.max(1, maxSlots ?? slotCount);
  }

  getRequestSlotSnapshot(shelf = this.getRequestShelf(), slotNumber) {
    const slot = shelf?.slots?.find(
      (candidate) => candidate?.slotNumber === slotNumber,
    );

    if (slot) {
      return slot;
    }

    return {
      slotNumber,
      unlocked: slotNumber === 1,
    };
  }

  getLockedRequestSlotText(shelf, slotNumber) {
    if (
      slotNumber === shelf?.nextSlotNumber &&
      shelf.nextSlotLockedByLevel &&
      shelf.nextSlotRequiresLevel
    ) {
      return `level ${shelf.nextSlotRequiresLevel}`;
    }

    return 'locked';
  }

  canUseRequestSlot(slotNumber) {
    if (!Number.isInteger(slotNumber) || slotNumber < 1) {
      return false;
    }

    return Boolean(this.getRequestSlotSnapshot(this.getRequestShelf(), slotNumber).unlocked);
  }

  getSelectedRequest() {
    return this.getRequestFromSlot(
      this.getRequestSlotSnapshot(this.getRequestShelf(), this.selectedRequestSlotNumber),
    );
  }

  getRequestFromSlot(slot) {
    if (!slot?.unlocked || !slot.itemTypeId || slot.quantity <= 0 || slot.priceGold <= 0) {
      return null;
    }

    return {
      itemTypeId: slot.itemTypeId,
      itemKey: slot.itemKey,
      itemKind: slot.itemKind,
      itemLabel: slot.itemLabel,
      quantity: slot.quantity,
      priceGold: slot.priceGold,
    };
  }

  getRequestResultStatus(result) {
    if (result?.reason === 'slot_locked') {
      return 'locked';
    }

    if (result?.reason === 'invalid_quantity') {
      return 'bad quantity';
    }

    if (result?.reason === 'invalid_price') {
      return 'bad value';
    }

    if (result?.reason === 'item_not_requestable') {
      return 'bad item';
    }

    return 'request failed';
  }

  setStatus(status) {
    if (!this.refs.status) {
      return;
    }

    setResourceIconText(this.refs.status, status);
    this.refs.status.hidden = !status;
    setResourceColorFromText(this.refs.status, status);
  }

  renderRequestQuantityField() {
    const field = this.refs.quantityField;

    if (!field) {
      return;
    }

    const quantity = this.readPositiveInteger(field.input.value) ?? 1;

    if (document.activeElement !== field.input) {
      field.setValue(quantity);
    }

    for (const [delta, button] of field.stepButtons) {
      const nextQuantity = quantity + delta;
      const disabled = nextQuantity < 1;
      button.disabled = disabled;
      button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }
  }

  readPositiveInteger(value) {
    const integer = Math.floor(Number(value));
    return Number.isInteger(integer) && integer > 0 ? integer : null;
  }

  applyPopupVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  renderItemPicker() {
    if (!this.refs.itemPicker) {
      return;
    }

    const snapshot = this.lastGameplaySnapshot;
    const sellKinds = snapshot?.shop?.playerShelf?.sellKinds ?? [
      { kind: 'seed', label: 'seeds' },
      { kind: 'herb', label: 'herbs' },
      { kind: 'potion', label: 'potions' },
    ];
    const items = this.getRequestItems();
    this.ensureRequestTabButtons(sellKinds);
    this.ensureRequestItemButtons(items);

    for (const sellKind of sellKinds) {
      const button = this.refs.itemPicker.tabButtons.get(sellKind.kind);
      const selected = this.selectedRequestTab === sellKind.kind;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.setAttribute('tabindex', selected ? '0' : '-1');
    }

    const visibleItemTypeIds = new Set(items.map((item) => item.itemTypeId));
    let visibleRows = 0;

    for (const [itemTypeId, row] of this.refs.itemPicker.itemRows) {
      if (!visibleItemTypeIds.has(itemTypeId)) {
        row.hidden = true;
      }
    }

    for (const item of items) {
      const row = this.refs.itemPicker.itemRows.get(item.itemTypeId);
      const button = this.refs.itemPicker.itemButtons.get(item.itemTypeId);
      const label = this.refs.itemPicker.itemLabels.get(item.itemTypeId);
      const quantity = this.refs.itemPicker.itemQuantities.get(item.itemTypeId);
      const display = getItemDisplay(snapshot, item, item.quantity);
      const actionVisible = shouldShowItemInActionList(snapshot, item, item.quantity);
      const visible = item.kind === this.selectedRequestTab && actionVisible;
      row.hidden = !visible;
      row.classList.toggle('is-locked', display.locked);
      row.classList.toggle('is-unknown', display.unknown);
      row.classList.toggle('is-empty', display.empty);
      label.textContent = `${display.label} `;
      setItemIconLabel(label, item.kind, item.key);
      setResourceColor(label, item.kind);
      quantity.textContent = `(${display.quantity})`;
      button.disabled = !actionVisible;
      button.setAttribute('aria-disabled', actionVisible ? 'false' : 'true');
      button.setAttribute(
        'aria-pressed',
        this.selectedRequestItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
      visibleRows += visible ? 1 : 0;
    }

    this.refs.itemPicker.empty.hidden = visibleRows > 0;
    this.renderSelectedRequestItem();
  }

  renderSelectedRequestItem() {
    const item = this.getSelectedRequestItem();
    const selectedValue = this.refs.itemPicker?.selectedValue;

    if (!selectedValue) {
      return;
    }

    if (!item) {
      selectedValue.textContent = 'none';
      setItemIconLabel(selectedValue, null);
      setResourceColorFromText(selectedValue, selectedValue.textContent);
    } else {
      selectedValue.textContent = getItemDisplay(
        this.lastGameplaySnapshot,
        item,
        item.quantity,
      ).label;
      setItemIconLabel(selectedValue, item.kind, item.key);
      setResourceColor(selectedValue, item.kind);
    }

    const canPlace = Boolean(item) && this.canUseRequestSlot(this.selectedRequestSlotNumber);
    this.refs.placeButton.disabled = !canPlace;
    this.refs.placeButton.setAttribute('aria-disabled', canPlace ? 'false' : 'true');
  }

  ensureRequestTabButtons(sellKinds) {
    for (const sellKind of sellKinds) {
      if (this.refs.itemPicker.tabButtons.has(sellKind.kind)) {
        continue;
      }

      const button = document.createElement('button');
      button.className = 'style-button shop-page__request-tab-button';
      button.type = 'button';
      button.textContent = sellKind.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectRequestTab(sellKind.kind));
      this.refs.itemPicker.tabButtons.set(sellKind.kind, button);
      this.refs.itemTabs.append(button);
    }
  }

  ensureRequestItemButtons(items) {
    for (const item of items) {
      if (this.refs.itemPicker.itemButtons.has(item.itemTypeId)) {
        continue;
      }

      const row = document.createElement('div');
      row.className = 'shop-page__player-request-item-row';

      const button = document.createElement('button');
      button.className = 'shop-page__sell-item-button';
      button.type = 'button';
      button.addEventListener('click', () => this.onSelectRequestItem(item.itemTypeId));

      const label = document.createElement('span');
      label.className = 'row_key';

      const quantity = document.createElement('span');
      quantity.className = 'row_val';

      button.append(label, quantity);
      row.append(button);
      this.refs.itemPicker.itemRows.set(item.itemTypeId, row);
      this.refs.itemPicker.itemButtons.set(item.itemTypeId, button);
      this.refs.itemPicker.itemLabels.set(item.itemTypeId, label);
      this.refs.itemPicker.itemQuantities.set(item.itemTypeId, quantity);
      this.refs.itemPicker.list.append(row);
    }
  }

  getRequestItems() {
    const snapshot = this.lastGameplaySnapshot;
    const itemsByKey = new Map();
    const addItem = (item) => {
      if (!item?.key || !item?.kind) {
        return;
      }

      itemsByKey.set(item.key, { ...itemsByKey.get(item.key), ...item });
    };

    for (const item of snapshot?.seedInventory ?? []) {
      addItem(item);
    }

    for (const item of snapshot?.garden?.herbs ?? []) {
      addItem(item);
    }

    const ownedPotions = (snapshot?.inventory ?? []).filter(
      (item) => item.kind === 'potion',
    );
    const ownedPotionsByKey = new Map(ownedPotions.map((item) => [item.key, item]));

    for (const recipe of snapshot?.brewing?.recipes ?? []) {
      const owned = ownedPotionsByKey.get(recipe.key);
      addItem({
        itemTypeId: recipe.potionTypeId,
        key: recipe.key,
        label: recipe.label,
        kind: 'potion',
        quantity: owned?.quantity ?? 0,
        researched: Boolean(recipe.unlocked),
      });
    }

    for (const item of ownedPotions) {
      addItem(item);
    }

    for (const item of snapshot?.shop?.playerShelf?.sellItems ?? []) {
      addItem(item);
    }

    return [...itemsByKey.values()];
  }

  getSelectedRequestItem() {
    if (!this.selectedRequestItemTypeId) {
      return null;
    }

    return (
      this.getRequestItems().find(
        (item) => item.itemTypeId === this.selectedRequestItemTypeId,
      ) ?? null
    );
  }
}
