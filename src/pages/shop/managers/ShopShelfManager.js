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
import { setNotificationBadge } from '../../shared/notificationBadge.js';
import { formatGoldPriceText } from '../../../shared/goldPrice.js';

const EMPTY_LOCKED_STAND_LABEL = 'empty stand';
const EMPTY_UNLOCKED_STAND_LABEL = 'select';
const TOUCH_LIKE_PRESS_START_DEDUPE_MS = 80;
const TOUCH_LIKE_CLICK_DEDUPE_RESET_MS = 500;

export class ShopShelfManager {
  constructor({ gameplayFacade, getSellPriceOverride } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSellPriceOverride =
      typeof getSellPriceOverride === 'function' ? getSellPriceOverride : null;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.visible = false;
    this.previousFocus = null;
    this.handledBuyPressStart = false;
    this.handledSelectSlotPressStartSlotNumber = null;
    this.handledSellItemPressStartKey = null;
    this.handledSellItemPressStartReset = null;
    this.lastTouchLikePressStart = {
      key: null,
      timeStamp: Number.NEGATIVE_INFINITY,
    };
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
    this.root.setAttribute('aria-label', 'NPC demand market');

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
    this.clearHandledSellItemPressStartKey();
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.visible = false;
    this.previousFocus = null;
    this.handledSellItemPressStartKey = null;
    this.handledSellItemPressStartReset = null;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'npc demand market';
    return title;
  }

  createSlotRow(slotNumber) {
    const row = document.createElement('div');
    row.className = 'shop-page__slot-row';
    row.dataset.shopSlotNumber = String(slotNumber);

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = `${slotNumber}.`;

    const value = document.createElement('span');
    value.className = 'row_val shop-page__slot-value';

    const itemValue = document.createElement('span');
    itemValue.className = 'shop-page__slot-item-value';
    itemValue.dataset.tutorialId = `shop:stand:${slotNumber}`;
    this.bindTouchLikePressStart(itemValue, `select-slot:${slotNumber}`, (event) =>
      this.onSelectSlotPressStart(event, slotNumber),
    );
    itemValue.addEventListener('click', (event) => this.onSelectSlot(event, slotNumber));
    itemValue.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      this.onSelectSlot(event, slotNumber);
    });

    const priceValue = document.createElement('span');
    priceValue.className = 'shop-page__slot-price-value';

    const timerValue = document.createElement('span');
    timerValue.className = 'shop-page__slot-timer-value';

    const emptyRule = document.createElement('span');
    emptyRule.className = 'shop-page__slot-empty-rule';
    emptyRule.setAttribute('aria-hidden', 'true');

    const unlockButton = document.createElement('button');
    unlockButton.className = 'shop-page__slot-unlock-button';
    unlockButton.type = 'button';
    this.bindTouchLikePressStart(unlockButton, `unlock-slot:${slotNumber}`, (event) =>
      this.onBuySlotPressStart(event, slotNumber),
    );
    unlockButton.addEventListener('click', (event) => {
      event.stopPropagation();

      if (this.handledBuyPressStart) {
        this.handledBuyPressStart = false;
        return;
      }

      this.buyLockedSlotIfAvailable(slotNumber);
    });
    unlockButton.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      if (this.buyLockedSlotIfAvailable(slotNumber)) {
        event.preventDefault();
      }
    });

    const unlockLabel = document.createElement('span');
    unlockLabel.className = 'row_key';
    unlockLabel.textContent = `${slotNumber}.`;

    const unlockValue = document.createElement('span');
    unlockValue.className = 'row_val shop-page__slot-value';

    const unlockItemValue = document.createElement('span');
    unlockItemValue.className = 'shop-page__slot-item-value';
    unlockItemValue.dataset.tutorialId = `shop:stand:${slotNumber}`;

    const unlockAction = document.createElement('span');
    unlockAction.className = 'shop-page__slot-price-value shop-page__slot-unlock-action';

    unlockValue.append(unlockItemValue, unlockAction);
    unlockButton.append(unlockLabel, unlockValue);

    row.append(label, value);
    return {
      row,
      label,
      value,
      unlockButton,
      unlockItemValue,
      unlockAction,
      itemValue,
      priceValue,
      timerValue,
      emptyRule,
    };
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
    this.bindTouchLikePressStart(emptyButton, 'sell-item:empty', (event) =>
      this.onClearSellItemPressStart(event),
    );
    emptyButton.addEventListener('click', (event) => this.onClearSellItemClick(event));

    const emptyLabel = document.createElement('span');
    emptyLabel.className = 'row_key';
    emptyLabel.dataset.tutorialId = 'shop:sell:empty';
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
    if (
      event.type === 'click' &&
      this.handledSelectSlotPressStartSlotNumber === slotNumber
    ) {
      this.handledSelectSlotPressStartSlotNumber = null;
      return;
    }

    if (event.target?.tagName === 'BUTTON') {
      return;
    }

    const snapshot = this.gameplayFacade.getSnapshot();
    const shelf = snapshot.shop.shelf;
    const slot = shelf.slots.find((candidate) => candidate.slotNumber === slotNumber);
    if (!slot?.unlocked) {
      return;
    }

    const result = this.gameplayFacade.selectShopShelfSlot(slotNumber);
    if (!result.ok) {
      this.render(this.gameplayFacade.getSnapshot());
      return;
    }

    const nextSnapshot = this.gameplayFacade.getSnapshot();
    const selectedSlot = nextSnapshot.shop.shelf.slots.find(
      (slot) => slot.slotNumber === result.slotNumber,
    );

    if (selectedSlot?.sellKind) {
      this.selectedSellTab = selectedSlot.sellKind;
    }

    this.render(nextSnapshot);
    this.showSellPopup();
  }

  onSelectSlotPressStart(event, slotNumber) {
    if (this.isMousePressStart(event)) {
      return;
    }

    event.preventDefault();
    this.handledSelectSlotPressStartSlotNumber = slotNumber;
    this.onSelectSlot(event, slotNumber);
  }

  onBuySlot() {
    this.gameplayFacade.buyShopShelfSlot();
    this.render(this.gameplayFacade.getSnapshot());
  }

  onBuySlotPressStart(event, slotNumber) {
    if (this.isMousePressStart(event) || event.currentTarget?.disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.handledBuyPressStart = true;
    this.buyLockedSlotIfAvailable(slotNumber);
  }

  buyLockedSlotIfAvailable(slotNumber) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const shelf = snapshot?.shop?.shelf;
    const slot = shelf?.slots?.find((candidate) => candidate.slotNumber === slotNumber);

    if (!this.canBuyLockedSlot(snapshot, shelf, slot, slotNumber)) {
      return false;
    }

    this.onBuySlot();
    return true;
  }

  onSelectSellTab(kind) {
    this.selectedSellTab = kind;
    this.render(this.gameplayFacade.getSnapshot());
  }

  bindTouchLikePressStart(target, key, handler) {
    target.addEventListener('pointerdown', (event) =>
      this.onTouchLikePressStart(event, key, handler),
    );
    target.addEventListener(
      'touchstart',
      (event) => this.onTouchLikePressStart(event, key, handler),
      { passive: false },
    );
  }

  onTouchLikePressStart(event, key, handler) {
    if (this.isMousePressStart(event) || this.isDuplicateTouchLikePressStart(event, key)) {
      return;
    }

    handler(event);
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

  onClearSellItemClick(event) {
    if (event.type === 'click' && this.handledSellItemPressStartKey === 'sell-item:empty') {
      this.clearHandledSellItemPressStartKey();
      return;
    }

    this.onClearSellItem();
  }

  onClearSellItemPressStart(event) {
    if (event.currentTarget?.disabled) {
      return;
    }

    event.preventDefault();
    this.setHandledSellItemPressStartKey('sell-item:empty');
    this.onClearSellItem();
  }

  onSetSellItemClick(event, itemTypeId) {
    const handledKey = `sell-item:${itemTypeId}`;
    if (event.type === 'click' && this.handledSellItemPressStartKey === handledKey) {
      this.clearHandledSellItemPressStartKey();
      return;
    }

    this.onSetSellItem(itemTypeId);
  }

  onSetSellItemPressStart(event, itemTypeId) {
    const handledKey = `sell-item:${itemTypeId}`;
    if (event.currentTarget?.disabled) {
      return;
    }

    event.preventDefault();
    this.setHandledSellItemPressStartKey(handledKey);
    this.onSetSellItem(itemTypeId);
  }

  showSellPopup() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyPopupVisibility();
    this.render(this.gameplayFacade.getSnapshot());
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
    if (!this.root || !snapshot?.shop?.shelf || !this.isRenderVisible()) {
      return;
    }

    const shelf = snapshot.shop.shelf;
    this.ensureRows(shelf.maxSlots);

    if (this.visible) {
      this.ensureSellTabButtons(shelf.sellKinds);
      this.ensureSellItemButtons(shelf.sellItems);
      this.renderSellControls(snapshot, shelf);
    }

    const hasSellableItem = shelf.sellItems.some(
      (item) => item.quantity > 0 && this.canSelectSellItem(snapshot, item),
    );

    this.refs.rows.forEach((refs, index) => {
      const { row, value, unlockButton } = refs;
      const slotNumber = index + 1;
      const cost = shelf.slotCosts[index];
      const slot = shelf.slots[index];
      const selected = slotNumber === shelf.selectedSlotNumber;

      row.classList.remove('is-selected');
      row.classList.toggle('is-locked', !slot.unlocked);
      row.classList.toggle('is-empty', slot.unlocked && this.isSlotEmpty(slot));

      if (slot.unlocked) {
        if (refs.label?.parentElement !== row || value.parentElement !== row) {
          row.replaceChildren(refs.label, value);
        }
        row.classList.add('shop-page__slot-row--interactive');
        row.classList.remove('is-unlockable');
        row.removeAttribute('role');
        row.removeAttribute('aria-label');
        row.removeAttribute('tabindex');
        refs.itemValue.setAttribute('role', 'button');
        refs.itemValue.tabIndex = 0;
        refs.itemValue.setAttribute('aria-label', `select npc market stand ${slotNumber}`);
        refs.itemValue.setAttribute('aria-pressed', selected ? 'true' : 'false');
        setNotificationBadge(row, !slot.sellItemTypeId && hasSellableItem);
        setNotificationBadge(unlockButton, false);
        this.renderSlotSellValue(refs, slot, shelf, snapshot);
        return;
      }

      if (slotNumber === shelf.nextSlotNumber) {
        if (unlockButton.parentElement !== row) {
          row.replaceChildren(unlockButton);
        }
        row.classList.remove('shop-page__slot-row--interactive');
        row.removeAttribute('role');
        row.removeAttribute('aria-label');
        row.removeAttribute('tabindex');
        refs.itemValue.removeAttribute('role');
        refs.itemValue.removeAttribute('aria-label');
        refs.itemValue.removeAttribute('tabindex');
        refs.itemValue.removeAttribute('aria-pressed');
        const canBuySlot = this.canBuyLockedSlot(snapshot, shelf, slot, slotNumber);
        row.classList.toggle('is-unlockable', canBuySlot);
        const actionText = this.formatLockedSlotAction(shelf, cost);
        setResourceIconText(refs.unlockAction, actionText);
        setResourceColorFromText(refs.unlockAction, refs.unlockAction.textContent);
        unlockButton.disabled = !canBuySlot;
        unlockButton.setAttribute('aria-disabled', unlockButton.disabled ? 'true' : 'false');
        unlockButton.setAttribute(
          'aria-label',
          `unlock npc market stand ${slotNumber} for ${actionText}`,
        );
        if (canBuySlot) {
          unlockButton.removeAttribute('tabindex');
        } else {
          unlockButton.tabIndex = -1;
        }
        setNotificationBadge(row, false);
        setNotificationBadge(unlockButton, !unlockButton.disabled);
        this.setText(refs.unlockItemValue, EMPTY_LOCKED_STAND_LABEL);
        setItemIconLabel(refs.unlockItemValue, null);
        setResourceColor(refs.unlockItemValue, null);

        return;
      }

      if (refs.label?.parentElement !== row || value.parentElement !== row) {
        row.replaceChildren(refs.label, value);
      }
      row.classList.remove('shop-page__slot-row--interactive');
      row.classList.remove('is-unlockable');
      row.removeAttribute('role');
      row.removeAttribute('aria-label');
      row.removeAttribute('tabindex');
      refs.itemValue.removeAttribute('role');
      refs.itemValue.removeAttribute('aria-label');
      refs.itemValue.removeAttribute('tabindex');
      refs.itemValue.removeAttribute('aria-pressed');
      setNotificationBadge(row, false);
      setNotificationBadge(unlockButton, false);
      this.setText(refs.itemValue, EMPTY_LOCKED_STAND_LABEL);
      setItemIconLabel(refs.itemValue, null);
      setResourceColor(refs.itemValue, null);
      this.setText(refs.priceValue, 'locked');
      setResourceColorFromText(refs.priceValue, refs.priceValue.textContent);
      if (refs.priceValue.parentElement !== value) {
        value.replaceChildren(refs.itemValue, refs.priceValue);
      }
    });
  }

  isRenderVisible() {
    return this.visible || !this.root?.closest('[hidden]');
  }

  renderSlotSellValue(refs, slot, shelf, snapshot) {
    const parts = this.getSlotSellParts(slot, shelf, snapshot);

    if (!parts.itemText) {
      if (
        refs.itemValue.parentElement !== refs.value ||
        refs.priceValue.parentElement !== refs.value
      ) {
        refs.value.replaceChildren(refs.itemValue, refs.priceValue);
      }

      this.setText(refs.itemValue, EMPTY_UNLOCKED_STAND_LABEL);
      setItemIconLabel(refs.itemValue, null);
      setResourceColorFromText(refs.itemValue, refs.itemValue.textContent);
      setResourceColor(refs.priceValue, null);
      if (refs.emptyRule.parentElement !== refs.priceValue) {
        refs.priceValue.replaceChildren(refs.emptyRule);
      }
      this.setText(refs.timerValue, '');
      return;
    }

    if (
      refs.itemValue.parentElement !== refs.value ||
      refs.priceValue.parentElement !== refs.value ||
      refs.timerValue.parentElement !== refs.value
    ) {
      refs.value.replaceChildren(refs.itemValue, refs.priceValue, refs.timerValue);
    }

    this.setText(refs.itemValue, parts.itemText);
    setItemIconLabel(refs.itemValue, parts.itemKind, parts.itemKey);
    this.applySlotItemColor(refs.itemValue, parts);

    setResourceIconText(refs.priceValue, parts.priceText ? ` ${parts.priceText}` : '');
    setResourceColor(refs.priceValue, parts.priceResource ?? null);
    this.setText(refs.timerValue, parts.timerText);
  }

  formatLockedSlotAction(shelf, cost) {
    if (shelf.nextSlotLockedByLevel) {
      return `level ${shelf.nextSlotRequiresLevel}`;
    }

    return cost === 0 ? 'free' : `buy (${formatGoldPriceText(cost)})`;
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
      setNotificationBadge(
        button,
        shelf.sellItems.some(
          (item) =>
            item.kind === sellKind.kind &&
            item.quantity > 0 &&
            this.canSelectSellItem(snapshot, item),
        ),
      );
    }

    this.refs.sellControls.emptyButton.setAttribute(
      'aria-pressed',
      this.isSlotEmpty(selectedSlot) ? 'true' : 'false',
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
      const canSelectItem = this.canSelectSellItem(snapshot, item);
      row.hidden = item.kind !== this.selectedSellTab || !actionVisible;
      row.classList.toggle('is-locked', display.locked);
      row.classList.toggle('is-unknown', display.unknown);
      row.classList.toggle('is-empty', display.empty);
      this.setText(label, `${display.label} (${display.quantity}) `);
      setItemIconLabel(label, item.kind, item.key);
      setResourceColor(label, item.kind);
      setResourceIconText(quantity, this.formatSellGold(this.getDisplaySellGold(item)));
      setResourceColorFromText(quantity, quantity.textContent);
      button.disabled = !canSelectItem;
      button.setAttribute('aria-disabled', canSelectItem ? 'false' : 'true');
      button.setAttribute(
        'aria-pressed',
        selectedSlot.sellItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
      setNotificationBadge(button, canSelectItem && item.quantity > 0);
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
      this.bindTouchLikePressStart(button, `sell-item:${item.itemTypeId}`, (event) =>
        this.onSetSellItemPressStart(event, item.itemTypeId),
      );
      button.addEventListener('click', (event) =>
        this.onSetSellItemClick(event, item.itemTypeId),
      );

      const label = document.createElement('span');
      label.className = 'row_key';
      label.dataset.tutorialId = `shop:sell:${item.key}`;

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

    const sellItem = this.getSellItem(shelf, slot);
    const quantity = Number.isFinite(slot.sellQuantity) ? slot.sellQuantity : sellItem?.quantity;
    const displayItem = sellItem ?? {
      itemTypeId: slot.sellItemTypeId,
      key: slot.sellKey,
      kind: slot.sellKind,
      label: slot.sellLabel,
    };
    const sellGold = this.getDisplaySellGold(displayItem, slot.sellGold ?? sellItem?.sellGold);
    const display = displayItem.key
      ? getItemDisplay(snapshot, displayItem, quantity ?? 0)
      : { label: slot.sellLabel, quantity: String(quantity) };
    const itemText = `${display.label} (${display.quantity})`;

    if (!Number.isFinite(sellGold)) {
      return {
        itemKey: displayItem.key,
        itemText,
        itemKind: displayItem.kind,
        priceText: 'offline',
        priceResource: null,
        timerText: this.formatBulkSellTimer(slot, shelf),
      };
    }

    return {
      itemKey: displayItem.key,
      itemText,
      itemKind: displayItem.kind,
      priceText: this.formatSellGold(sellGold),
      priceResource: 'gold',
      timerText: this.formatBulkSellTimer(slot, shelf),
    };
  }

  formatBulkSellTimer(slot, shelf) {
    const autoSellSeconds = Number(shelf.autoSellSeconds);
    if (!Number.isFinite(autoSellSeconds) || autoSellSeconds <= 0) {
      return '';
    }

    const progressSeconds = Number.isFinite(slot.sellProgressSeconds)
      ? Math.max(0, slot.sellProgressSeconds)
      : 0;
    const remainingSeconds = Math.max(0, autoSellSeconds - progressSeconds);

    if (remainingSeconds <= 0) {
      return 'ready';
    }

    return this.formatTimer(remainingSeconds);
  }

  formatTimer(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0));
    const hours = Math.floor(safeSeconds / 3_600);
    const minutes = Math.floor((safeSeconds % 3_600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    if (minutes > 0) {
      return `${minutes}m`;
    }

    return `${safeSeconds}s`;
  }

  applySlotItemColor(element, parts) {
    if (parts.itemKind === 'seed' || parts.itemKind === 'herb') {
      setResourceColor(element, parts.itemKind);
      return;
    }

    setResourceColorFromText(element, parts.itemText);
  }

  isSlotEmpty(slot) {
    return !slot.sellItemTypeId && !slot.sellKey && !slot.sellLabel;
  }

  getSellItem(shelf, slotOrItemTypeId) {
    const itemTypeId =
      typeof slotOrItemTypeId === 'object'
        ? slotOrItemTypeId?.sellItemTypeId
        : slotOrItemTypeId;
    const itemKey = typeof slotOrItemTypeId === 'object' ? slotOrItemTypeId?.sellKey : null;

    return (
      shelf.sellItems.find(
        (item) =>
          (itemTypeId && item.itemTypeId === itemTypeId) ||
          (itemKey && item.key === itemKey),
      ) ?? null
    );
  }

  formatSellGold(sellGold) {
    if (!Number.isFinite(sellGold)) {
      return '? gold';
    }

    return formatGoldPriceText(sellGold);
  }

  getDisplaySellGold(item, fallbackSellGold = item?.sellGold) {
    if (Number.isFinite(fallbackSellGold) && fallbackSellGold > 0) {
      return fallbackSellGold;
    }

    const overrideSellGold = this.getSellPriceOverride?.({
      item,
    });

    if (Number.isFinite(overrideSellGold) && overrideSellGold > 0) {
      return overrideSellGold;
    }

    return fallbackSellGold;
  }

  canSelectSellItem(snapshot, item) {
    return (
      shouldShowItemInActionList(snapshot, item, item.quantity) &&
      Number.isFinite(item.sellGold) &&
      item.sellGold > 0
    );
  }

  canBuyLockedSlot(snapshot, shelf, slot, slotNumber) {
    const cost = this.getLockedSlotCost(shelf, slotNumber);

    return (
      slot &&
      !slot.unlocked &&
      slotNumber === shelf?.nextSlotNumber &&
      shelf.nextSlotLockedByLevel !== true &&
      Number.isFinite(cost) &&
      (snapshot?.gold?.current ?? 0) >= cost
    );
  }

  getLockedSlotCost(shelf, slotNumber) {
    return Number.isFinite(shelf?.nextSlotCost)
      ? shelf.nextSlotCost
      : shelf?.slotCosts?.[slotNumber - 1];
  }

  isDuplicateTouchLikePressStart(event, key) {
    const timeStamp = Number.isFinite(event?.timeStamp) ? event.timeStamp : Date.now();
    const isDuplicate =
      this.lastTouchLikePressStart.key === key &&
      Math.abs(timeStamp - this.lastTouchLikePressStart.timeStamp) <=
        TOUCH_LIKE_PRESS_START_DEDUPE_MS;

    this.lastTouchLikePressStart = { key, timeStamp };
    return isDuplicate;
  }

  setHandledSellItemPressStartKey(key) {
    this.clearHandledSellItemPressStartKey();
    this.handledSellItemPressStartKey = key;
    this.handledSellItemPressStartReset = globalThis.setTimeout(() => {
      if (this.handledSellItemPressStartKey === key) {
        this.handledSellItemPressStartKey = null;
      }

      this.handledSellItemPressStartReset = null;
    }, TOUCH_LIKE_CLICK_DEDUPE_RESET_MS);
    this.handledSellItemPressStartReset?.unref?.();
  }

  clearHandledSellItemPressStartKey() {
    if (this.handledSellItemPressStartReset !== null) {
      globalThis.clearTimeout(this.handledSellItemPressStartReset);
      this.handledSellItemPressStartReset = null;
    }

    this.handledSellItemPressStartKey = null;
  }

  applyPopupVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  setText(node, value) {
    if (node && node.textContent !== value) {
      node.textContent = value;
    }
  }

  isMousePressStart(event) {
    return event.type === 'pointerdown' && event.pointerType === 'mouse';
  }
}
