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
import {
  NOTIFICATION_TONE_ORANGE,
  setNotificationBadge,
} from '../../shared/notificationBadge.js';
import { setSelectedTabState } from '../../shared/selectedTabState.js';
import { createAmountSelectionRow } from '../../shared/AmountSelectionRow.js';
import { formatCoinPriceText, normalizeCoinPrice } from '../../../shared/coinPrice.js';

const EMPTY_STAND_LABEL = 'empty stand';
const EMPTY_STAND_ACTION_LABEL = 'select';
const TOUCH_LIKE_PRESS_START_DEDUPE_MS = 80;
const TOUCH_LIKE_CLICK_DEDUPE_RESET_MS = 500;
const TOUCH_LIKE_TAP_MOVE_TOLERANCE_PX = 10;

export class ShopShelfManager {
  constructor({ gameplayFacade, getSellPriceOverride } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSellPriceOverride =
      typeof getSellPriceOverride === 'function' ? getSellPriceOverride : null;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.draftSellItemTypeId = null;
    this.draftSellQuantity = 1;
    this.statusText = '';
    this.visible = false;
    this.previousFocus = null;
    this.handledSelectSlotPressStartSlotNumber = null;
    this.handledSelectSlotPressStartReset = null;
    this.handledSellItemPressStartKey = null;
    this.handledSellItemPressStartReset = null;
    this.pendingSellItemPress = null;
    this.handlePendingSellItemPressMove = (event) =>
      this.onPendingSellItemPressMove(event);
    this.handlePendingSellItemPressEnd = (event) => this.onPendingSellItemPressEnd(event);
    this.handlePendingSellItemPressCancel = () => this.clearPendingSellItemPress();
    this.lastTouchLikePressStart = {
      key: null,
      timeStamp: Number.NEGATIVE_INFINITY,
    };
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        if (this.handledSelectSlotPressStartSlotNumber !== null) {
          event.preventDefault();
          event.stopPropagation();
          this.clearHandledSelectSlotPressStartSlotNumber();
          return;
        }

        if (this.handledSellItemPressStartKey !== null) {
          event.preventDefault();
          event.stopPropagation();
          this.clearHandledSellItemPressStartKey();
          return;
        }

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
    this.root.setAttribute('aria-label', 'your stalls');

    this.refs.title = this.createTitle();
    this.refs.timer = this.createTimer();
    this.refs.help = this.createHelp();
    this.refs.rows = [];
    this.refs.popup = this.createSellPopup();

    this.root.append(this.refs.title, this.refs.timer, this.refs.help.root);
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
    this.clearHandledSelectSlotPressStartSlotNumber();
    this.clearHandledSellItemPressStartKey();
    this.clearPendingSellItemPress();
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.draftSellItemTypeId = null;
    this.draftSellQuantity = 1;
    this.statusText = '';
    this.visible = false;
    this.previousFocus = null;
    this.handledSelectSlotPressStartSlotNumber = null;
    this.handledSelectSlotPressStartReset = null;
    this.handledSellItemPressStartKey = null;
    this.handledSellItemPressStartReset = null;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'your stalls';
    return title;
  }

  createTimer() {
    const timer = document.createElement('span');
    timer.className = 'shop-page__shelf-timer';
    timer.setAttribute('aria-label', 'time until traders arrive');
    timer.hidden = true;
    return timer;
  }

  createHelp() {
    const root = document.createElement('div');
    root.className = 'shop-page__shelf-help';
    const button = document.createElement('button');
    button.className = 'style-button shop-page__shelf-help-button';
    button.type = 'button';
    button.textContent = '[i]';
    button.setAttribute('aria-label', 'how stalls work');
    button.setAttribute('aria-expanded', 'false');
    const tooltip = document.createElement('div');
    tooltip.className = 'style-tooltip shop-page__shelf-help-tooltip';
    tooltip.textContent = 'traders buy from stalls at full price. each market rank adds one stall.';
    tooltip.hidden = true;
    tooltip.setAttribute('role', 'tooltip');
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      tooltip.hidden = !tooltip.hidden;
      button.setAttribute('aria-expanded', tooltip.hidden ? 'false' : 'true');
    });
    root.append(button, tooltip);
    return { root, button, tooltip };
  }

  createSlotRow(slotNumber) {
    const row = document.createElement('div');
    row.className = 'shop-page__slot-row';
    row.dataset.shopSlotNumber = String(slotNumber);
    this.bindTouchLikePressStart(row, `select-slot:${slotNumber}`, (event) =>
      this.onSelectSlotPressStart(event, slotNumber),
    );
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
    label.textContent = `${slotNumber}.`;

    const value = document.createElement('span');
    value.className = 'row_val shop-page__slot-value';

    const itemValue = document.createElement('span');
    itemValue.className = 'shop-page__slot-item-value';
    itemValue.dataset.tutorialId = `shop:stand:${slotNumber}`;

    const priceValue = document.createElement('span');
    priceValue.className = 'shop-page__slot-price-value';

    const unlockButton = document.createElement('button');
    unlockButton.className = 'shop-page__slot-unlock-button';
    unlockButton.type = 'button';
    unlockButton.addEventListener('click', (event) => {
      event.stopPropagation();

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
    };
  }

  createSelectedSellItemRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__sell-selected-row';

    const label = document.createElement('button');
    label.className = 'row_key shop-page__sell-selected-label';
    label.type = 'button';
    label.addEventListener('click', () => this.clearDraftSellItem());

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, label, value };
  }

  createSellControls() {
    const root = document.createElement('section');
    root.className = 'shop-page__sell-controls';
    root.setAttribute('aria-label', 'Select item to sell');

    const selectedItem = this.createSelectedSellItemRow();
    const quantityField = createAmountSelectionRow({
      ariaLabel: 'mark amount',
      className: 'shop-page__sell-field',
      inputClassName: 'shop-page__sell-input',
      stepClassName: 'shop-page__sell-step',
      onInput: () => this.onMarkQuantityInput(),
      onStep: (delta) => this.onMarkQuantityStep(delta),
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'shop-page__sell-action-row';

    const markButton = document.createElement('button');
    markButton.className = 'style-button shop-page__sell-mark-button';
    markButton.type = 'button';
    markButton.addEventListener('click', () => this.onMarkSellAmount());

    const markAllButton = document.createElement('button');
    markAllButton.className = 'style-button shop-page__sell-mark-all-button';
    markAllButton.type = 'button';
    markAllButton.textContent = 'mark all';
    markAllButton.addEventListener('click', () => this.onMarkSellAll());

    actionRow.append(markAllButton, markButton);

    const status = document.createElement('div');
    status.className = 'shop-page__sell-status';

    const divider = document.createElement('div');
    divider.className = 'shop-page__sell-divider';

    const itemList = document.createElement('div');
    itemList.className = 'shop-page__sell-item-list';

    const emptyRow = document.createElement('div');
    emptyRow.className = 'shop-page__sell-item-row';

    const emptyButton = document.createElement('button');
    emptyButton.className = 'shop-page__sell-item-button';
    emptyButton.type = 'button';
    this.bindTouchLikeValidatedPress(emptyButton, 'sell-item:empty', (event) =>
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

    root.append(selectedItem.row, quantityField.field, actionRow, status, divider, itemList);
    return {
      root,
      selectedItem,
      quantityField,
      actionRow,
      markButton,
      markAllButton,
      status,
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
      event.preventDefault();
      event.stopPropagation();
      this.clearHandledSelectSlotPressStartSlotNumber();
      return;
    }

    if (event.target?.closest?.('button')) {
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
    if (this.isMousePressStart(event) || event.target?.closest?.('button')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.setHandledSelectSlotPressStartSlotNumber(slotNumber);
    this.onSelectSlot(event, slotNumber);
  }

  onBuySlot() {
    this.gameplayFacade.buyShopShelfSlot();
    this.render(this.gameplayFacade.getSnapshot());
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

  bindTouchLikeValidatedPress(target, key, handler) {
    target.addEventListener('pointerdown', (event) =>
      this.onTouchLikeValidatedPressStart(event, key, handler),
    );
    target.addEventListener(
      'touchstart',
      (event) => this.onTouchLikeValidatedPressStart(event, key, handler),
      { passive: true },
    );
  }

  onTouchLikePressStart(event, key, handler) {
    if (this.isMousePressStart(event)) {
      return;
    }

    if (this.isDuplicateTouchLikePressStart(event, key)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    handler(event);
  }

  onTouchLikeValidatedPressStart(event, key, handler) {
    if (
      this.isMousePressStart(event) ||
      this.isDisabledControl(event.currentTarget) ||
      this.isDuplicateTouchLikePressStart(event, key)
    ) {
      return;
    }

    const point = this.getTouchLikePoint(event);
    if (!point) {
      return;
    }

    this.clearPendingSellItemPress();
    this.pendingSellItemPress = {
      key,
      handler,
      target: event.currentTarget,
      pointerId: event.pointerId,
      startX: point.clientX,
      startY: point.clientY,
      moved: false,
      type: event.type === 'pointerdown' ? 'pointer' : 'touch',
    };
    this.addPendingSellItemPressListeners(this.pendingSellItemPress.type);
  }

  onSetSellItem(itemTypeId) {
    const snapshot = this.gameplayFacade.getSnapshot();
    const item = this.getSellItem(snapshot.shop.shelf, itemTypeId);

    if (item) {
      this.draftSellItemTypeId = itemTypeId;
      this.draftSellQuantity = this.getDefaultMarkQuantity(item);
      this.statusText = '';
      this.selectedSellTab = item.kind;
    }

    this.render(snapshot);
  }

  onClearSellItem() {
    const result = this.gameplayFacade.clearSelectedShopShelfSlotSellItem();

    if (result.ok) {
      this.draftSellItemTypeId = null;
      this.draftSellQuantity = 1;
      this.statusText = '';
      this.hideSellPopup();
    }

    this.render(this.gameplayFacade.getSnapshot());
  }

  clearDraftSellItem() {
    if (this.draftSellItemTypeId === null) {
      return;
    }

    this.draftSellItemTypeId = null;
    this.draftSellQuantity = 1;
    this.statusText = '';
    this.render(this.gameplayFacade.getSnapshot());
    this.refs.sellControls?.quantityField?.hideInput();
  }

  onMarkQuantityInput() {
    this.draftSellQuantity =
      this.readPositiveInteger(this.refs.sellControls?.quantityField?.input.value) ?? 0;
    this.statusText = '';
    this.renderSellDraftDetails(this.gameplayFacade.getSnapshot().shop.shelf);
  }

  onMarkQuantityStep(delta) {
    const item = this.getDraftSellItem(this.gameplayFacade.getSnapshot().shop.shelf);
    const quantity = this.clampMarkQuantity(this.draftSellQuantity, item) ?? 1;
    const nextQuantity = this.clampSteppedMarkQuantity(quantity + delta, item);

    if (!nextQuantity || nextQuantity === quantity) {
      return;
    }

    this.draftSellQuantity = nextQuantity;
    this.statusText = '';
    this.renderSellDraftDetails(this.gameplayFacade.getSnapshot().shop.shelf);
  }

  onMarkSellAmount() {
    const snapshot = this.gameplayFacade.getSnapshot();
    const item = this.getDraftSellItem(snapshot.shop.shelf);
    const quantity = this.clampMarkQuantity(this.draftSellQuantity, item);

    if (!item || !quantity) {
      this.statusText = item ? 'bad amount' : 'select item';
      this.renderSellDraftDetails(snapshot.shop.shelf);
      return;
    }

    this.markSellItem(item, {
      sellLimitMode: 'amount',
      sellQuantityLimit: quantity,
    });
  }

  onMarkSellAll() {
    const snapshot = this.gameplayFacade.getSnapshot();
    const item = this.getDraftSellItem(snapshot.shop.shelf);

    if (!item) {
      this.statusText = 'select item';
      this.renderSellDraftDetails(snapshot.shop.shelf);
      return;
    }

    this.markSellItem(item, {
      sellLimitMode: 'all',
    });
  }

  markSellItem(item, sellLimit) {
    const result = this.gameplayFacade.setSelectedShopShelfSlotSellItem(
      item.itemTypeId,
      sellLimit,
    );

    if (result.ok) {
      this.selectedSellTab = item.kind;
      this.statusText = '';
      this.hideSellPopup();
      this.render(this.gameplayFacade.getSnapshot());
      return;
    }

    this.statusText = this.getMarkFailureText(result.reason);
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
    event.preventDefault();
    this.setHandledSellItemPressStartKey(handledKey);
    this.onSetSellItem(itemTypeId);
  }

  showSellPopup() {
    this.previousFocus = document.activeElement;
    this.syncDraftFromSelectedSlot();
    this.statusText = '';
    this.visible = true;
    this.applyPopupVisibility();
    this.render(this.gameplayFacade.getSnapshot());
    this.refs.dialog?.focus();
    this.refs.sellControls?.quantityField?.hideInput();
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
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.setAttribute('aria-label', `select trader market stand ${slotNumber}`);
        row.setAttribute('aria-pressed', selected ? 'true' : 'false');
        refs.itemValue.removeAttribute('role');
        refs.itemValue.removeAttribute('aria-label');
        refs.itemValue.removeAttribute('tabindex');
        refs.itemValue.removeAttribute('aria-pressed');
        setNotificationBadge(
          row,
          !slot.sellItemTypeId && hasSellableItem,
          NOTIFICATION_TONE_ORANGE,
        );
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
          `unlock trader market stand ${slotNumber} for ${actionText}`,
        );
        if (canBuySlot) {
          unlockButton.removeAttribute('tabindex');
        } else {
          unlockButton.tabIndex = -1;
        }
        setNotificationBadge(row, false);
        setNotificationBadge(unlockButton, !unlockButton.disabled);
        this.setText(refs.unlockItemValue, EMPTY_STAND_LABEL);
        setItemIconLabel(refs.unlockItemValue, null);
        setResourceColor(refs.unlockItemValue, null);
        refs.unlockItemValue.classList.remove('is-empty');

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
      this.setText(refs.itemValue, EMPTY_STAND_LABEL);
      setItemIconLabel(refs.itemValue, null);
      setResourceColor(refs.itemValue, null);
      refs.itemValue.classList.remove('is-empty');
      this.setText(refs.priceValue, 'locked');
      setResourceColorFromText(refs.priceValue, refs.priceValue.textContent);
      if (refs.priceValue.parentElement !== value) {
        value.replaceChildren(refs.itemValue, refs.priceValue);
      }
    });

    this.renderShelfTimer(shelf);
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

      this.setText(refs.itemValue, EMPTY_STAND_LABEL);
      setItemIconLabel(refs.itemValue, null);
      setResourceColor(refs.itemValue, null);
      refs.itemValue.classList.remove('is-empty');
      this.setText(refs.priceValue, EMPTY_STAND_ACTION_LABEL);
      setResourceColorFromText(refs.priceValue, refs.priceValue.textContent);
      return;
    }

    if (
      refs.itemValue.parentElement !== refs.value ||
      refs.priceValue.parentElement !== refs.value
    ) {
      refs.value.replaceChildren(refs.itemValue, refs.priceValue);
    }

    this.setText(refs.itemValue, parts.itemText);
    setItemIconLabel(refs.itemValue, parts.itemKind, parts.itemKey);
    refs.itemValue.classList.toggle('is-empty', parts.itemEmpty);
    this.applySlotItemColor(refs.itemValue, parts);

    setResourceIconText(refs.priceValue, parts.priceText ? ` ${parts.priceText}` : '');
    setResourceColor(refs.priceValue, parts.priceResource ?? null);
  }

  renderShelfTimer(shelf) {
    const timerText = this.formatShelfTimer(shelf);

    this.refs.timer.hidden = !timerText;
    this.setText(this.refs.timer, timerText ? `traders arrive in ${timerText}` : '');
  }

  formatLockedSlotAction(shelf, cost) {
    if (shelf.nextSlotLockedByLevel) {
      return `level ${shelf.nextSlotRequiresLevel}`;
    }

    return cost === 0 ? 'free' : `buy (${formatCoinPriceText(cost)})`;
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
      setSelectedTabState(button, selected, { tabIndex: true });
      setNotificationBadge(
        button,
        shelf.sellItems.some(
          (item) =>
            item.kind === sellKind.kind &&
            item.quantity > 0 &&
            this.canSelectSellItem(snapshot, item),
        ),
        NOTIFICATION_TONE_ORANGE,
      );
    }

    this.refs.sellControls.emptyButton.setAttribute(
      'aria-pressed',
      this.isSlotEmpty(selectedSlot) && this.draftSellItemTypeId === null
        ? 'true'
        : 'false',
    );

    this.ensureDraftStillVisible(shelf);
    this.renderSellDraftDetails(shelf);

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
      setResourceIconText(quantity, this.formatSellCoin(this.getDisplaySellCoin(item)));
      setResourceColorFromText(quantity, quantity.textContent);
      button.disabled = !canSelectItem;
      button.setAttribute('aria-disabled', canSelectItem ? 'false' : 'true');
      button.setAttribute(
        'aria-pressed',
        this.draftSellItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
      setNotificationBadge(
        button,
        canSelectItem && item.quantity > 0,
        NOTIFICATION_TONE_ORANGE,
      );
    }

    this.refs.sellControls.itemList.hidden = false;
  }

  renderSellDraftDetails(shelf) {
    const controls = this.refs.sellControls;
    if (!controls?.selectedItem) {
      return;
    }

    const item = this.getDraftSellItem(shelf);
    const selectedSlot = shelf.slots.find(
      (slot) => slot.slotNumber === shelf.selectedSlotNumber,
    );
    controls.quantityField.field.hidden = false;
    controls.actionRow.hidden = false;

    if (!item) {
      this.draftSellQuantity = 1;
      controls.selectedItem.label.disabled = true;
      controls.selectedItem.label.setAttribute('aria-disabled', 'true');
      controls.selectedItem.label.setAttribute('aria-pressed', 'false');
      controls.selectedItem.label.setAttribute('aria-label', 'no item selected');
      controls.selectedItem.label.textContent = 'no item selected';
      setItemIconLabel(controls.selectedItem.label, null);
      setResourceColor(controls.selectedItem.label, null);
      controls.selectedItem.value.textContent = '';
      setResourceColor(controls.selectedItem.value, null);
      controls.quantityField.hideInput();
      controls.quantityField.input.min = '1';
      controls.quantityField.input.max = '1';
      controls.quantityField.input.disabled = true;
      controls.quantityField.setValue(1);
      controls.quantityField.valueButton.disabled = true;
      controls.quantityField.valueButton.setAttribute('aria-disabled', 'true');
      for (const button of controls.quantityField.stepButtons.values()) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
      controls.markButton.textContent = 'mark x1';
      controls.markButton.setAttribute('aria-label', 'select item to mark');
      controls.markButton.disabled = true;
      controls.markButton.setAttribute('aria-disabled', 'true');
      controls.markAllButton.disabled = true;
      controls.markAllButton.setAttribute('aria-disabled', 'true');
      controls.markAllButton.setAttribute('aria-pressed', 'false');
      this.renderStatus('select item');
      return;
    }

    const selectedSameItem = selectedSlot?.sellItemTypeId === item.itemTypeId;
    const selectedAll = selectedSameItem && selectedSlot.sellLimitMode !== 'amount';
    const selectedAmount = selectedSameItem && selectedSlot.sellLimitMode === 'amount';
    const selectedLimit = Math.max(0, Math.floor(Number(selectedSlot?.sellQuantityLimit) || 0));
    const maxQuantity = this.getMaxMarkQuantity(item);
    const quantity =
      selectedAmount && selectedLimit <= 0 && this.draftSellQuantity <= 0
        ? 0
        : maxQuantity > 0
          ? this.clampMarkQuantity(this.draftSellQuantity, item) ?? maxQuantity
          : 0;
    const display = getItemDisplay(this.gameplayFacade.getSnapshot(), item, item.quantity);

    this.draftSellQuantity = quantity;
    controls.selectedItem.label.disabled = false;
    controls.selectedItem.label.setAttribute('aria-disabled', 'false');
    controls.selectedItem.label.setAttribute('aria-pressed', 'true');
    controls.selectedItem.label.setAttribute('aria-label', `deselect ${display.label}`);
    controls.selectedItem.label.textContent = `${display.label} x${display.quantity}`;
    setItemIconLabel(controls.selectedItem.label, item.kind, item.key);
    setResourceColor(controls.selectedItem.label, item.kind);
    controls.selectedItem.value.textContent = selectedAll
      ? 'all'
      : selectedAmount
        ? `marked ${selectedLimit}`
        : '';
    setResourceColor(controls.selectedItem.value, null);

    controls.quantityField.input.min = maxQuantity > 0 ? '1' : '0';
    controls.quantityField.input.max = String(maxQuantity);
    controls.quantityField.input.disabled = maxQuantity <= 0;
    controls.quantityField.setValue(quantity);
    controls.quantityField.valueButton.disabled = maxQuantity <= 0;
    controls.quantityField.valueButton.setAttribute(
      'aria-disabled',
      controls.quantityField.valueButton.disabled ? 'true' : 'false',
    );

    for (const [delta, button] of controls.quantityField.stepButtons) {
      const nextQuantity = this.clampSteppedMarkQuantity(quantity + delta, item);
      const disabled = !nextQuantity || nextQuantity === quantity;
      button.disabled = disabled;
      button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }

    controls.markButton.textContent = `mark x${quantity || 0}`;
    controls.markButton.setAttribute('aria-label', `mark ${quantity || 0}`);
    controls.markButton.disabled = quantity <= 0;
    controls.markButton.setAttribute(
      'aria-disabled',
      controls.markButton.disabled ? 'true' : 'false',
    );
    controls.markButton.setAttribute(
      'aria-pressed',
      selectedAmount && selectedLimit === quantity ? 'true' : 'false',
    );
    controls.markAllButton.disabled = false;
    controls.markAllButton.setAttribute('aria-disabled', 'false');
    controls.markAllButton.setAttribute('aria-pressed', selectedAll ? 'true' : 'false');
    this.renderStatus(this.statusText);
  }

  renderStatus(message) {
    const status = this.refs.sellControls?.status;
    if (!status) {
      return;
    }

    setResourceIconText(status, message);
    status.hidden = !message;
    setResourceColorFromText(status, message);
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
      this.bindTouchLikeValidatedPress(button, `sell-item:${item.itemTypeId}`, (event) =>
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
    const quantity = this.getSlotDisplaySellQuantity(slot, sellItem);
    const displayItem = sellItem ?? {
      itemTypeId: slot.sellItemTypeId,
      key: slot.sellKey,
      kind: slot.sellKind,
      label: slot.sellLabel,
    };
    const fallbackSellCoin = slot.sellCoin ?? sellItem?.sellCoin;
    const sellCoin = this.getDisplaySellCoin(displayItem, fallbackSellCoin);
    const amountMode = slot.sellLimitMode === 'amount';
    const totalSellCoin = this.getDisplayTotalSellCoin(sellCoin, quantity, {
      useUnitForZeroQuantity:
        !amountMode && Number(quantity) <= 0 && Number.isFinite(sellCoin),
    });
    const display = displayItem.key
      ? getItemDisplay(snapshot, displayItem, quantity ?? 0)
      : { label: slot.sellLabel, quantity: String(quantity) };
    const itemText = `${display.label} (${display.quantity})`;

    if (slot.tradedHere === false || sellItem?.tradedHere === false) {
      return {
        itemKey: displayItem.key,
        itemText,
        itemKind: displayItem.kind,
        itemEmpty: display.empty,
        priceText: 'not traded here',
        priceResource: null,
      };
    }

    if (amountMode && quantity <= 0) {
      return {
        itemKey: displayItem.key,
        itemText,
        itemKind: displayItem.kind,
        itemEmpty: true,
        priceText: 'done',
        priceResource: null,
      };
    }

    if (!Number.isFinite(totalSellCoin)) {
      return {
        itemKey: displayItem.key,
        itemText,
        itemKind: displayItem.kind,
        itemEmpty: display.empty,
        priceText: 'offline',
        priceResource: null,
      };
    }

    return {
      itemKey: displayItem.key,
      itemText,
      itemKind: displayItem.kind,
      itemEmpty: display.empty,
      priceText: this.formatSellCoin(totalSellCoin),
      priceResource: 'coin',
    };
  }

  formatShelfTimer(shelf) {
    const activeSlot = shelf.slots?.find((slot) => this.isActiveSellSlot(slot));

    if (!activeSlot) {
      return '';
    }

    return this.formatBulkSellTimer(shelf, activeSlot);
  }

  formatBulkSellTimer(shelf, fallbackSlot = null) {
    const autoSellSeconds = Number(shelf.autoSellSeconds);
    if (!Number.isFinite(autoSellSeconds) || autoSellSeconds <= 0) {
      return '';
    }

    let progressSeconds = 0;
    if (Number.isFinite(shelf.sellProgressSeconds)) {
      progressSeconds = Math.max(0, shelf.sellProgressSeconds);
    } else if (Number.isFinite(fallbackSlot?.sellProgressSeconds)) {
      progressSeconds = Math.max(0, fallbackSlot.sellProgressSeconds);
    }

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
    if (parts.itemKind === 'seed' || parts.itemKind === 'herb' || parts.itemKind === 'potion') {
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

  getDraftSellItem(shelf) {
    if (this.draftSellItemTypeId === null) {
      return null;
    }

    return this.getSellItem(shelf, this.draftSellItemTypeId);
  }

  syncDraftFromSelectedSlot() {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const selectedSlot = shelf?.slots?.find(
      (slot) => slot.slotNumber === shelf.selectedSlotNumber,
    );

    if (!selectedSlot?.sellItemTypeId) {
      this.draftSellItemTypeId = null;
      this.draftSellQuantity = 1;
      return;
    }

    const item = this.getSellItem(shelf, selectedSlot.sellItemTypeId);
    this.draftSellItemTypeId = selectedSlot.sellItemTypeId;
    this.draftSellQuantity =
      selectedSlot.sellLimitMode === 'amount'
        ? Math.max(0, Math.floor(Number(selectedSlot.sellQuantityLimit) || 0))
        : this.getDefaultMarkQuantity(item);
  }

  ensureDraftStillVisible(shelf) {
    if (this.draftSellItemTypeId === null) {
      return;
    }

    if (this.getDraftSellItem(shelf)) {
      return;
    }

    this.draftSellItemTypeId = null;
    this.draftSellQuantity = 1;
  }

  getDefaultMarkQuantity(item) {
    const maxQuantity = this.getMaxMarkQuantity(item);
    return maxQuantity > 0 ? maxQuantity : 1;
  }

  readPositiveInteger(value) {
    const integer = Math.floor(Number(value));

    if (!Number.isInteger(integer) || integer <= 0) {
      return null;
    }

    return integer;
  }

  clampMarkQuantity(quantity, item) {
    const safeQuantity = this.readPositiveInteger(quantity);

    if (!item || !safeQuantity) {
      return null;
    }

    const maxQuantity = this.getMaxMarkQuantity(item);

    if (maxQuantity <= 0) {
      return null;
    }

    return Math.min(safeQuantity, maxQuantity);
  }

  clampSteppedMarkQuantity(quantity, item) {
    const integer = Math.floor(Number(quantity));
    const maxQuantity = this.getMaxMarkQuantity(item);

    if (!Number.isInteger(integer) || maxQuantity <= 0) {
      return null;
    }

    return Math.min(Math.max(1, integer), maxQuantity);
  }

  getMaxMarkQuantity(item) {
    const quantity = Number.isFinite(item?.quantity) ? Math.floor(item.quantity) : 0;
    return Math.min(Math.max(0, quantity), 10_000);
  }

  getSlotDisplaySellQuantity(slot, sellItem) {
    if (slot.sellLimitMode === 'amount') {
      return Math.max(0, Math.floor(Number(slot.sellQuantityLimit) || 0));
    }

    return Number.isFinite(slot.sellQuantity) ? slot.sellQuantity : sellItem?.quantity;
  }

  isActiveSellSlot(slot) {
    return Boolean(
      slot?.unlocked &&
        slot.sellItemTypeId &&
        slot.tradedHere !== false &&
        (slot.sellLimitMode !== 'amount' ||
          Math.max(0, Math.floor(Number(slot.sellQuantityLimit) || 0)) > 0),
    );
  }

  getMarkFailureText(reason) {
    if (reason === 'market_locked') {
      return 'not traded here';
    }
    if (reason === 'invalid_quantity') {
      return 'bad amount';
    }

    if (reason === 'not_enough_items') {
      return 'not enough items';
    }

    if (reason === 'item_not_sellable') {
      return 'cannot sell';
    }

    if (reason === 'no_selected_slot') {
      return 'no stand';
    }

    return 'mark failed';
  }

  formatSellCoin(sellCoin) {
    if (!Number.isFinite(sellCoin)) {
      return '? coin';
    }

    return formatCoinPriceText(sellCoin);
  }

  getDisplaySellCoin(item, fallbackSellCoin = item?.sellCoin) {
    if (Number.isFinite(fallbackSellCoin) && fallbackSellCoin > 0) {
      return fallbackSellCoin;
    }

    const overrideSellCoin = this.getSellPriceOverride?.({
      item,
    });

    if (Number.isFinite(overrideSellCoin) && overrideSellCoin > 0) {
      return overrideSellCoin;
    }

    return fallbackSellCoin;
  }

  getDisplayTotalSellCoin(sellCoin, quantity, { useUnitForZeroQuantity = false } = {}) {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity)));

    if (!Number.isFinite(sellCoin) || sellCoin <= 0 || !Number.isFinite(safeQuantity)) {
      return null;
    }

    const totalQuantity = safeQuantity > 0 || !useUnitForZeroQuantity ? safeQuantity : 1;
    return normalizeCoinPrice(sellCoin * totalQuantity);
  }

  canSelectSellItem(snapshot, item) {
    return (
      item.tradedHere !== false &&
      shouldShowItemInActionList(snapshot, item, item.quantity) &&
      Number.isFinite(item.sellCoin) &&
      item.sellCoin > 0
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
      (snapshot?.coin?.current ?? 0) >= cost
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

  addPendingSellItemPressListeners(type) {
    const document = this.root?.ownerDocument ?? globalThis.document;
    if (!document) {
      return;
    }

    if (type === 'pointer') {
      document.addEventListener('pointermove', this.handlePendingSellItemPressMove, {
        passive: true,
      });
      document.addEventListener('pointerup', this.handlePendingSellItemPressEnd, true);
      document.addEventListener(
        'pointercancel',
        this.handlePendingSellItemPressCancel,
        true,
      );
      return;
    }

    document.addEventListener('touchmove', this.handlePendingSellItemPressMove, {
      passive: true,
    });
    document.addEventListener('touchend', this.handlePendingSellItemPressEnd, true);
    document.addEventListener('touchcancel', this.handlePendingSellItemPressCancel, true);
  }

  removePendingSellItemPressListeners(type) {
    const document = this.root?.ownerDocument ?? globalThis.document;
    if (!document) {
      return;
    }

    if (type === 'pointer') {
      document.removeEventListener('pointermove', this.handlePendingSellItemPressMove);
      document.removeEventListener('pointerup', this.handlePendingSellItemPressEnd, true);
      document.removeEventListener(
        'pointercancel',
        this.handlePendingSellItemPressCancel,
        true,
      );
      return;
    }

    document.removeEventListener('touchmove', this.handlePendingSellItemPressMove);
    document.removeEventListener('touchend', this.handlePendingSellItemPressEnd, true);
    document.removeEventListener(
      'touchcancel',
      this.handlePendingSellItemPressCancel,
      true,
    );
  }

  onPendingSellItemPressMove(event) {
    const pending = this.pendingSellItemPress;
    if (!pending || !this.eventMatchesPendingSellItemPress(event, pending)) {
      return;
    }

    const point = this.getTouchLikePoint(event);
    if (!point) {
      return;
    }

    if (
      Math.hypot(point.clientX - pending.startX, point.clientY - pending.startY) >
      TOUCH_LIKE_TAP_MOVE_TOLERANCE_PX
    ) {
      pending.moved = true;
    }
  }

  onPendingSellItemPressEnd(event) {
    const pending = this.pendingSellItemPress;
    if (!pending || !this.eventMatchesPendingSellItemPress(event, pending)) {
      return;
    }

    this.clearPendingSellItemPress();

    if (
      pending.moved ||
      this.isDisabledControl(pending.target) ||
      !pending.target.contains(event.target)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pending.handler(event);
  }

  clearPendingSellItemPress() {
    if (!this.pendingSellItemPress) {
      return;
    }

    const type = this.pendingSellItemPress.type;
    this.pendingSellItemPress = null;
    this.removePendingSellItemPressListeners(type);
  }

  eventMatchesPendingSellItemPress(event, pending) {
    return (
      pending.type !== 'pointer' ||
      event.pointerId === undefined ||
      pending.pointerId === undefined ||
      event.pointerId === pending.pointerId
    );
  }

  getTouchLikePoint(event) {
    const touch = event.changedTouches?.[0] ?? event.touches?.[0];
    if (touch) {
      return {
        clientX: touch.clientX,
        clientY: touch.clientY,
      };
    }

    if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      return {
        clientX: event.clientX,
        clientY: event.clientY,
      };
    }

    return null;
  }

  isDisabledControl(control) {
    return control?.disabled || control?.getAttribute?.('aria-disabled') === 'true';
  }

  setHandledSelectSlotPressStartSlotNumber(slotNumber) {
    this.clearHandledSelectSlotPressStartSlotNumber();
    this.handledSelectSlotPressStartSlotNumber = slotNumber;
    this.handledSelectSlotPressStartReset = globalThis.setTimeout(() => {
      if (this.handledSelectSlotPressStartSlotNumber === slotNumber) {
        this.handledSelectSlotPressStartSlotNumber = null;
      }

      this.handledSelectSlotPressStartReset = null;
    }, TOUCH_LIKE_CLICK_DEDUPE_RESET_MS);
    this.handledSelectSlotPressStartReset?.unref?.();
  }

  clearHandledSelectSlotPressStartSlotNumber() {
    if (this.handledSelectSlotPressStartReset !== null) {
      globalThis.clearTimeout(this.handledSelectSlotPressStartReset);
      this.handledSelectSlotPressStartReset = null;
    }

    this.handledSelectSlotPressStartSlotNumber = null;
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
