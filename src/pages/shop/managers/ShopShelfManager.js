import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor, setResourceColorFromText } from '../../shared/resourceColor.js';
import { setSelectedTabState } from '../../shared/selectedTabState.js';
import { formatRemainingTime } from '../../shared/timerDisplay.js';
import {
  setTimerProgressFill,
  stopTimerProgressFill,
} from '../../shared/timerProgress.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import {
  getNextNpcDemandWaveInfo,
  normalizeCount,
} from '../../../gameplay/shop/managers/npcMarketPricing.js';

const STALL_ALLOCATION_STEP = 5;

export class ShopShelfManager {
  constructor({ gameplayFacade, getSellPriceOverride, now = () => Date.now() } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSellPriceOverride = getSellPriceOverride;
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.root = null;
    this.refs = {
      rows: [],
      tabButtons: new Map(),
      itemButtons: new Map(),
    };
    this.unsubscribe = null;
    this.visible = false;
    this.selectedSellTab = 'seed';
    this.draftSellItemTypeId = null;
    this.draftSellPercentage = 100;
    this.statusText = '';
    this.previousFocus = null;
    this.handleKeydown = (event) => {
      if (event.key === 'Escape' && this.visible) {
        event.preventDefault();
        this.hideSellPopup();
      }
    };
  }

  mount(parent, popupParent = parent) {
    if (!this.gameplayFacade || this.root) return this.root;

    this.root = document.createElement('section');
    this.root.className = 'shop-page__shelf style-box';
    this.root.setAttribute('aria-label', 'your stalls');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'your stalls';
    this.refs.help = this.createHelp();
    this.refs.popup = this.createSellPopup();
    this.root.append(title, this.refs.help.root);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyPopupVisibility();
    return this.root;
  }

  unmount() {
    for (const refs of this.refs.rows) {
      stopTimerProgressFill(refs.progressFill, 0);
    }
    this.unsubscribe?.();
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {
      rows: [],
      tabButtons: new Map(),
      itemButtons: new Map(),
    };
    this.unsubscribe = null;
    this.visible = false;
    this.resetSellDraft();
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
    tooltip.textContent =
      'tap a stall to choose an item and mark a share. future marking loads newly produced copies.';
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
    row.className = 'shop-page__slot-row shop-page__slot-row--interactive';
    row.dataset.shopSlotNumber = String(slotNumber);
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.addEventListener('click', () => this.openSlot(slotNumber));
    row.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      this.openSlot(slotNumber);
    });

    const label = document.createElement('span');
    label.className = 'row_key shop-page__slot-title';
    label.dataset.slotNumber = String(slotNumber);
    label.textContent = `stall ${slotNumber} `;
    const capacityValue = document.createElement('span');
    capacityValue.className = 'shop-page__slot-capacity-value';
    capacityValue.setAttribute('aria-hidden', 'true');
    const value = document.createElement('span');
    value.className = 'row_val shop-page__slot-value';
    const itemColumn = document.createElement('span');
    itemColumn.className = 'shop-page__slot-item-column';
    const itemValue = document.createElement('span');
    itemValue.className = 'shop-page__slot-item-value';
    itemValue.dataset.tutorialId = `shop:stand:${slotNumber}`;
    const quantityValue = document.createElement('span');
    quantityValue.className = 'shop-page__slot-quantity-value';
    const statusValue = document.createElement('span');
    statusValue.className = 'shop-page__slot-status-value';
    const batchValue = document.createElement('span');
    batchValue.className = 'shop-page__slot-batch-value';
    const batchSeparator = document.createElement('span');
    batchSeparator.className = 'shop-page__slot-status-separator';
    batchSeparator.textContent = '·';
    batchSeparator.setAttribute('aria-hidden', 'true');
    const progressRow = document.createElement('span');
    progressRow.className = 'shop-page__slot-progress-row';
    const progress = document.createElement('span');
    progress.className =
      'style-progress style-progress--timer shop-page__slot-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', `stall ${slotNumber} sale progress`);
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', '100');
    const progressFill = document.createElement('span');
    progressFill.className = 'style-progress__fill shop-page__slot-progress-fill';
    progress.append(progressFill);
    const timerValue = document.createElement('span');
    timerValue.className = 'shop-page__slot-timer-value';
    const priceValue = document.createElement('span');
    priceValue.className = 'shop-page__slot-price-value';
    itemColumn.append(itemValue, quantityValue);
    statusValue.append(batchValue, batchSeparator, priceValue);
    progressRow.append(progress, timerValue);
    value.append(itemColumn, statusValue, progressRow);
    row.append(label, value, capacityValue);
    return {
      row,
      label,
      capacityValue,
      value,
      itemColumn,
      itemValue,
      quantityValue,
      statusValue,
      batchValue,
      batchSeparator,
      progressRow,
      progress,
      progressFill,
      timerValue,
      priceValue,
    };
  }

  createSellPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__sell-popup';
    popup.addEventListener('click', (event) => {
      if (event.target === popup) this.hideSellPopup();
    });
    const panel = document.createElement('section');
    panel.className = 'shop-page__sell-panel';
    panel.setAttribute('aria-label', 'load stall');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;
    const dialog = document.createElement('section');
    dialog.className = 'shop-page__sell-dialog style-dialog';
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'load stall';
    const close = document.createElement('button');
    close.className = 'style-button shop-page__sell-close';
    close.type = 'button';
    close.textContent = 'close';
    close.addEventListener('click', () => this.hideSellPopup());
    const selection = document.createElement('section');
    selection.className = 'shop-page__sell-selection';
    selection.setAttribute('aria-label', 'current selection');
    const current = document.createElement('div');
    current.className = 'shop-page__sell-current';
    current.setAttribute('role', 'status');
    current.dataset.tutorialId = 'shop:sell:current';
    const currentLabel = document.createElement('span');
    currentLabel.className = 'shop-page__sell-current-label';
    currentLabel.textContent = 'current';
    const currentItem = document.createElement('span');
    currentItem.className = 'shop-page__sell-current-item';
    const currentQuantity = document.createElement('span');
    currentQuantity.className = 'shop-page__sell-current-quantity';
    current.append(currentLabel, currentItem, currentQuantity);
    const allocation = document.createElement('div');
    allocation.className = 'shop-page__sell-allocation';
    const allocationControl = document.createElement('div');
    allocationControl.className = 'shop-page__sell-allocation-control';
    const allocationProgress = document.createElement('span');
    allocationProgress.className =
      'style-progress shop-page__sell-allocation-progress';
    allocationProgress.setAttribute('aria-hidden', 'true');
    const allocationProgressFill = document.createElement('span');
    allocationProgressFill.className =
      'style-progress__fill is-smooth-progress-fill shop-page__sell-allocation-progress-fill';
    allocationProgress.append(allocationProgressFill);
    const allocationRange = document.createElement('input');
    allocationRange.className = 'shop-page__sell-allocation-range';
    allocationRange.type = 'range';
    allocationRange.min = '0';
    allocationRange.max = '100';
    allocationRange.step = String(STALL_ALLOCATION_STEP);
    allocationRange.value = '100';
    allocationRange.dataset.tutorialId = 'shop:sell:percentage';
    allocationRange.setAttribute('aria-label', 'share of current stock to mark');
    allocationRange.addEventListener('input', () => {
      this.selectDraftPercentage(Number(allocationRange.value));
    });
    allocationRange.addEventListener('keydown', (event) => {
      const direction = {
        ArrowDown: -1,
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: 1,
      }[event.key];
      if (!direction) return;
      event.preventDefault();
      this.selectDraftPercentage(
        Math.max(
          0,
          Math.min(100, this.draftSellPercentage + direction * STALL_ALLOCATION_STEP),
        ),
      );
    });
    allocationControl.append(allocationProgress, allocationRange);
    allocation.append(allocationControl);
    const actions = document.createElement('div');
    actions.className = 'shop-page__sell-action-row';
    const mark = document.createElement('button');
    mark.className = 'style-button shop-page__sell-mark-button';
    mark.type = 'button';
    mark.dataset.tutorialId = 'shop:sell:mark';
    mark.addEventListener('click', () => this.markDraft());
    const clear = document.createElement('button');
    clear.className = 'style-button shop-page__sell-clear-button';
    clear.type = 'button';
    clear.textContent = 'clear';
    clear.addEventListener('click', () => this.clearDraft());
    const future = document.createElement('button');
    future.className = 'style-button shop-page__sell-future-button';
    future.type = 'button';
    future.dataset.tutorialId = 'shop:sell:future';
    future.textContent = 'mark future';
    future.addEventListener('click', () => this.toggleFutureDraft());
    actions.append(mark, clear, future);
    const status = document.createElement('div');
    status.className = 'shop-page__sell-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    selection.append(current, allocation, actions, status);
    const divider = document.createElement('div');
    divider.className = 'shop-page__sell-divider';
    const itemList = document.createElement('div');
    itemList.className = 'shop-page__sell-item-list';
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__sell-tabs';
    tabs.setAttribute('role', 'tablist');
    dialog.append(title, close, selection, divider, itemList);
    panel.append(dialog, tabs);
    popup.append(panel);
    this.refs.dialog = panel;
    this.refs.selection = selection;
    this.refs.current = current;
    this.refs.currentItem = currentItem;
    this.refs.currentQuantity = currentQuantity;
    this.refs.allocation = allocation;
    this.refs.allocationProgressFill = allocationProgressFill;
    this.refs.allocationRange = allocationRange;
    this.refs.mark = mark;
    this.refs.clear = clear;
    this.refs.future = future;
    this.refs.status = status;
    this.refs.itemList = itemList;
    this.refs.tabs = tabs;
    return popup;
  }

  ensureRows(count) {
    while (this.refs.rows.length < count) {
      const refs = this.createSlotRow(this.refs.rows.length + 1);
      this.refs.rows.push(refs);
      this.root.append(refs.row);
    }
  }

  ensureSellControls(shelf) {
    for (const kind of shelf.sellKinds) {
      if (this.refs.tabButtons.has(kind.kind)) continue;
      const button = document.createElement('button');
      button.className = 'style-button shop-page__sell-tab-button';
      button.type = 'button';
      button.textContent = kind.label;
      button.setAttribute('role', 'tab');
      button.dataset.tutorialId = `shop:sell:tab:${kind.kind}`;
      button.addEventListener('click', () => {
        this.selectedSellTab = kind.kind;
        this.render(this.gameplayFacade.getSnapshot());
      });
      this.refs.tabButtons.set(kind.kind, button);
      this.refs.tabs.append(button);
    }

    for (const item of shelf.sellItems) {
      if (this.refs.itemButtons.has(item.itemTypeId)) continue;
      const row = document.createElement('div');
      row.className = 'shop-page__sell-item-row';
      const button = document.createElement('button');
      button.className = 'shop-page__sell-item-button';
      button.type = 'button';
      button.dataset.shopSellItemKey = item.key;
      button.dataset.tutorialId = `shop:sell:${item.key}`;
      button.addEventListener('click', () => this.selectDraftItem(item.itemTypeId));
      const label = document.createElement('span');
      label.className = 'row_key';
      const quantity = document.createElement('span');
      quantity.className = 'row_val';
      button.append(label, quantity);
      row.append(button);
      this.refs.itemButtons.set(item.itemTypeId, { row, button, label, quantity });
      this.refs.itemList.append(row);
    }
  }

  openSlot(slotNumber) {
    const result = this.gameplayFacade.selectShopShelfSlot(slotNumber);
    if (!result.ok) return;
    const slot = this.getSelectedSlot(this.gameplayFacade.getSnapshot()?.shop?.shelf);
    if (slot?.sellKind) this.selectedSellTab = slot.sellKind;
    if (!slot?.sellKind && slot?.futureItemKind) this.selectedSellTab = slot.futureItemKind;
    this.resetSellDraft(slot);
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyPopupVisibility();
    this.render(this.gameplayFacade.getSnapshot());
    this.refs.dialog?.focus();
  }

  showSellPopup() {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const slotNumber = shelf?.selectedSlotNumber ?? shelf?.slots?.[0]?.slotNumber;
    if (slotNumber) this.openSlot(slotNumber);
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

  selectDraftItem(itemTypeId) {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const item = shelf?.sellItems?.find((candidate) => candidate.itemTypeId === itemTypeId);
    if (!item) return { ok: false, reason: 'item_missing' };

    this.draftSellItemTypeId = itemTypeId;
    this.draftSellPercentage = 100;
    this.selectedSellTab = item.kind;
    this.statusText = '';
    this.renderSellDraft(shelf);
    return { ok: true, itemTypeId };
  }

  selectDraftPercentage(percentage) {
    if (this.draftSellItemTypeId === null) return { ok: false, reason: 'empty_selection' };
    if (
      !Number.isInteger(percentage) ||
      percentage < 0 ||
      percentage > 100 ||
      percentage % STALL_ALLOCATION_STEP !== 0
    ) {
      return { ok: false, reason: 'invalid_percentage' };
    }

    this.draftSellPercentage = percentage;
    this.statusText = '';
    this.renderSellDraft(this.gameplayFacade.getSnapshot()?.shop?.shelf);
    return { ok: true, percentage };
  }

  markDraft() {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const item = shelf?.sellItems?.find(
      (candidate) => candidate.itemTypeId === this.draftSellItemTypeId,
    );
    if (!item) return { ok: false, reason: 'empty_selection' };

    const result = this.gameplayFacade.setSelectedShopShelfSlotAllocation(
      item.itemTypeId,
      this.draftSellPercentage,
    );
    if (!result?.ok) {
      this.statusText = this.getLoadFailureText(result?.reason);
      this.renderSellDraft(this.gameplayFacade.getSnapshot()?.shop?.shelf);
      return result;
    }
    this.hideSellPopup();
    return result;
  }

  clearDraft() {
    const result = this.gameplayFacade.clearSelectedShopShelfSlot();
    if (!result?.ok) {
      this.statusText = this.getLoadFailureText(result?.reason);
      this.renderSellDraft(this.gameplayFacade.getSnapshot()?.shop?.shelf);
      return result;
    }

    this.hideSellPopup();
    return result;
  }

  toggleFutureDraft() {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const slot = this.getSelectedSlot(shelf);
    const item = shelf?.sellItems?.find(
      (candidate) => candidate.itemTypeId === this.draftSellItemTypeId,
    );
    if (!item) return { ok: false, reason: 'empty_selection' };
    const enabled = slot?.futureItemTypeId !== item.itemTypeId;
    const result = this.gameplayFacade.setSelectedShopShelfFutureItem(
      item.itemTypeId,
      enabled,
    );
    if (!result?.ok) {
      this.statusText = this.getLoadFailureText(result?.reason);
      this.renderSellDraft(this.gameplayFacade.getSnapshot()?.shop?.shelf);
      return result;
    }
    this.hideSellPopup();
    return result;
  }

  getAllocationTotal(shelf, item) {
    if (!item) return 0;
    const slot = this.getSelectedSlot(shelf);
    const loadedQuantity = slot?.sellItemTypeId === item.itemTypeId
      ? slot.loadedQuantity
      : 0;
    return Math.max(0, Math.floor(Number(item.quantity) || 0)) + loadedQuantity;
  }

  getDraftTargetQuantity(shelf, item) {
    return Math.floor(
      (this.getAllocationTotal(shelf, item) * this.draftSellPercentage) / 100,
    );
  }

  resetSellDraft(slot = null) {
    this.draftSellItemTypeId = slot?.sellItemTypeId ?? slot?.futureItemTypeId ?? null;
    const totalQuantity =
      Math.max(0, Number(slot?.loadedQuantity) || 0) +
      Math.max(0, Number(
        this.gameplayFacade
          .getSnapshot()
          ?.shop?.shelf?.sellItems?.find(
            (item) => item.itemTypeId === this.draftSellItemTypeId,
          )?.quantity,
      ) || 0);
    const currentPercentage = totalQuantity > 0
      ? ((slot?.loadedQuantity ?? 0) / totalQuantity) * 100
      : 0;
    this.draftSellPercentage = Math.max(
      0,
      Math.min(
        100,
        Math.round(currentPercentage / STALL_ALLOCATION_STEP) * STALL_ALLOCATION_STEP,
      ),
    );
    this.statusText = '';
  }

  render(snapshot = this.gameplayFacade.getSnapshot()) {
    if (!this.root || !snapshot?.shop?.shelf) return;
    const shelf = snapshot.shop.shelf;
    this.ensureRows(shelf.maxSlots);

    for (const [index, refs] of this.refs.rows.entries()) {
      const slot = shelf.slots[index];
      if (!slot) {
        refs.row.hidden = true;
        continue;
      }
      refs.row.hidden = false;
      refs.row.setAttribute('aria-label', `open stall ${slot.slotNumber}`);
      refs.row.classList.toggle(
        'is-empty',
        !slot.sellItemTypeId && !slot.futureItemTypeId,
      );
      if (!slot.sellItemTypeId) {
        const waitingForFuture = Boolean(slot.futureItemTypeId);
        setTextContentIfChanged(
          refs.itemValue,
          waitingForFuture ? `waiting for ${slot.futureItemLabel}` : 'empty stand',
        );
        refs.itemValue.setAttribute(
          'aria-label',
          waitingForFuture
            ? `open stall ${slot.slotNumber}, waiting for future ${slot.futureItemLabel}`
            : `open empty stall ${slot.slotNumber}`,
        );
        refs.statusValue.classList.remove('is-active');
        refs.batchValue.textContent = '';
        refs.batchSeparator.textContent = '';
        refs.batchSeparator.hidden = true;
        refs.progressRow.classList.remove('is-paused');
        refs.progress.hidden = true;
        refs.progress.setAttribute('aria-valuenow', '0');
        refs.timerValue.textContent = '';
        setResourceIconText(refs.priceValue, waitingForFuture ? 'future' : 'select');
        setResourceColor(refs.priceValue, null);
        stopTimerProgressFill(refs.progressFill, 0);
        setItemIconLabel(
          refs.itemValue,
          waitingForFuture ? slot.futureItemKind : null,
          waitingForFuture ? slot.futureItemKey : null,
        );
        refs.quantityValue.hidden = true;
        refs.quantityValue.textContent = '';
        refs.capacityValue.textContent = '★'.repeat(
          Math.max(1, Math.floor(Number(slot.batchSize) || 1)),
        );
        setResourceColor(
          refs.itemValue,
          waitingForFuture ? slot.futureItemKind : null,
        );
        continue;
      }

      const display = {
        label: slot.sellLabel,
        quantity: String(slot.loadedQuantity),
      };
      setTextContentIfChanged(refs.itemValue, display.label);
      refs.itemValue.setAttribute(
        'aria-label',
        `open stall ${slot.slotNumber}, ${display.quantity} ${display.label} marked${
          slot.futureItemTypeId ? ', future marking on' : ''
        }`,
      );
      setItemIconLabel(refs.itemValue, slot.sellKind, slot.sellKey);
      refs.quantityValue.hidden = false;
      refs.quantityValue.textContent = ` ${display.quantity}`;
      setResourceColor(refs.itemValue, slot.sellKind);
      const batch = Math.min(slot.batchSize ?? 1, slot.loadedQuantity);
      refs.capacityValue.textContent = '★'.repeat(Math.max(1, batch));
      const unitCoin = this.getDisplaySellCoin(slot);
      const priceText = Number.isFinite(unitCoin)
        ? formatCoinPriceText(unitCoin * batch)
        : 'offline';
      refs.statusValue.classList.add('is-active');
      refs.batchValue.textContent = `x${batch}`;
      refs.batchSeparator.textContent = '·';
      refs.batchSeparator.hidden = false;
      setResourceIconText(refs.priceValue, priceText);
      setResourceColorFromText(refs.priceValue, refs.priceValue.textContent);
      const pauseText = this.getStallPauseText(slot);
      refs.progressRow.classList.toggle('is-paused', Boolean(pauseText));
      if (pauseText) {
        refs.progress.hidden = true;
        refs.progress.setAttribute('aria-valuenow', '0');
        refs.timerValue.textContent = pauseText;
        stopTimerProgressFill(refs.progressFill, 0);
        continue;
      }

      refs.progress.hidden = false;
      setTimerProgressFill(
        refs.progressFill,
        this.getStallTimer(slot, shelf.autoSellSeconds),
        {
          onUpdate: ({ remainingMs, percent }) => {
            refs.timerValue.textContent = formatRemainingTime(remainingMs);
            refs.progress.setAttribute('aria-valuenow', String(percent));
          },
        },
      );
    }

    if (this.visible) this.renderPopup(snapshot, shelf);
  }

  getStallPauseText(slot) {
    if (slot?.tradedHere === false) {
      const marketName = String(slot.requiredMarket?.name ?? '').trim().toLowerCase();
      return marketName ? `prestige for ${marketName}` : 'prestige for higher market';
    }

    const sellNeed = normalizeCount(slot?.sellNeed);
    if (sellNeed === null || sellNeed > 0) return '';

    const nextWave = getNextNpcDemandWaveInfo({
      targetNeed: slot?.targetNeed,
      maxNeed: slot?.maxNeed,
      nowMs: this.now(),
    });
    if (!nextWave) return 'no demand';

    return `no demand · merchants in ${formatRemainingTime(
      nextWave.nextWaveAtMs - this.now(),
    )}`;
  }

  renderPopup(snapshot, shelf) {
    this.ensureSellControls(shelf);
    for (const refs of this.refs.itemButtons.values()) {
      refs.row.hidden = true;
    }
    const selectedSlot = this.getSelectedSlot(shelf);
    const draftItem = shelf.sellItems.find(
      (item) => item.itemTypeId === this.draftSellItemTypeId,
    );
    if (!draftItem && this.draftSellItemTypeId !== null) this.resetSellDraft();

    for (const kind of shelf.sellKinds) {
      setSelectedTabState(
        this.refs.tabButtons.get(kind.kind),
        this.selectedSellTab === kind.kind,
        { tabIndex: true },
      );
    }

    for (const item of shelf.sellItems) {
      const refs = this.refs.itemButtons.get(item.itemTypeId);
      const display = getItemDisplay(snapshot, item, item.quantity);
      const visible =
        item.kind === this.selectedSellTab &&
        shouldShowItemInActionList(snapshot, item, item.quantity);
      const differentItemLoaded =
        selectedSlot?.sellItemTypeId && selectedSlot.sellItemTypeId !== item.itemTypeId;
      const differentFutureItem =
        selectedSlot?.futureItemTypeId &&
        selectedSlot.futureItemTypeId !== item.itemTypeId;
      refs.row.hidden = !visible;
      refs.button.disabled = Boolean(differentItemLoaded || differentFutureItem);
      refs.button.setAttribute('aria-disabled', refs.button.disabled ? 'true' : 'false');
      refs.button.setAttribute(
        'aria-pressed',
        this.draftSellItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
      setTextContentIfChanged(refs.label, `${display.label} (${display.quantity})`);
      setItemIconLabel(refs.label, item.kind, item.key);
      setResourceColor(refs.label, item.kind);
      setResourceIconText(refs.quantity, this.formatSellCoin(this.getDisplaySellCoin(item)));
      setResourceColorFromText(refs.quantity, refs.quantity.textContent);
    }

    this.renderSellDraft(shelf);
  }

  renderSellDraft(shelf) {
    if (!this.refs.current) return;
    const item = shelf?.sellItems?.find(
      (candidate) => candidate.itemTypeId === this.draftSellItemTypeId,
    );
    const hasSelection = Boolean(item);
    const slot = this.getSelectedSlot(shelf);
    const targetQuantity = hasSelection ? this.getDraftTargetQuantity(shelf, item) : 0;
    const loadedQuantity = slot?.sellItemTypeId === item?.itemTypeId
      ? slot.loadedQuantity
      : 0;
    const futureEnabled = Boolean(
      hasSelection && slot?.futureItemTypeId === item.itemTypeId,
    );

    this.refs.current.dataset.hasSelection = hasSelection ? 'true' : 'false';
    this.refs.current.setAttribute(
      'aria-label',
      hasSelection
        ? `current ${item.label}, ${this.draftSellPercentage} percent, ${targetQuantity} marked`
        : 'current selection empty',
    );
    setTextContentIfChanged(this.refs.currentItem, hasSelection ? item.label : 'empty');
    setItemIconLabel(
      this.refs.currentItem,
      hasSelection ? item.kind : null,
      hasSelection ? item.key : null,
    );
    setResourceColor(this.refs.currentItem, hasSelection ? item.kind : null);
    this.refs.currentQuantity.textContent = hasSelection ? `x${targetQuantity}` : '';

    this.refs.allocationRange.disabled = !hasSelection;
    this.refs.allocationRange.value = String(this.draftSellPercentage);
    this.refs.allocationProgressFill.style.setProperty(
      '--style-progress-fill-scale',
      String(this.draftSellPercentage / 100),
    );
    this.refs.allocationRange.setAttribute(
      'aria-valuetext',
      hasSelection
        ? `${this.draftSellPercentage} percent, ${targetQuantity} items`
        : 'no item selected',
    );
    const allocationChanges = hasSelection && targetQuantity !== loadedQuantity;
    this.refs.mark.disabled = !allocationChanges;
    this.refs.mark.setAttribute('aria-disabled', allocationChanges ? 'false' : 'true');
    this.refs.mark.textContent = `mark x${targetQuantity}`;
    const canClear = Boolean(slot?.sellItemTypeId || slot?.futureItemTypeId);
    this.refs.clear.disabled = !canClear;
    this.refs.clear.setAttribute('aria-disabled', canClear ? 'false' : 'true');
    this.refs.future.disabled = !hasSelection;
    this.refs.future.setAttribute('aria-disabled', hasSelection ? 'false' : 'true');
    this.refs.future.setAttribute('aria-pressed', futureEnabled ? 'true' : 'false');
    this.refs.future.textContent = futureEnabled ? 'stop future' : 'mark future';
    this.refs.status.textContent = this.statusText;
    this.refs.status.hidden = !this.statusText;

    for (const [itemTypeId, refs] of this.refs.itemButtons) {
      refs.button.setAttribute(
        'aria-pressed',
        hasSelection && itemTypeId === item.itemTypeId ? 'true' : 'false',
      );
    }
  }

  getSelectedSlot(shelf) {
    return shelf?.slots?.find((slot) => slot.slotNumber === shelf.selectedSlotNumber) ?? null;
  }

  getStallTimer(slot, cycleSeconds) {
    const cycle = Math.max(1, Number(cycleSeconds) || 5);
    const progress = Math.max(0, Number(slot.sellProgressSeconds) || 0) % cycle;
    return {
      progress: progress / cycle,
      remainingMs: (cycle - progress) * 1_000,
      totalMs: cycle * 1_000,
    };
  }

  getDisplaySellCoin(item) {
    if (Number.isFinite(item?.sellCoin) && item.sellCoin > 0) return item.sellCoin;
    return this.getSellPriceOverride?.({ item }) ?? null;
  }

  formatSellCoin(coin) {
    return Number.isFinite(coin) ? formatCoinPriceText(coin) : '? coin';
  }

  getLoadFailureText(reason) {
    if (reason === 'stall_full') return 'stall full';
    if (reason === 'not_enough_items') return 'not enough items';
    if (reason === 'different_item_loaded') return 'return the current item first';
    if (reason === 'market_locked') return 'not traded here';
    return 'could not mark items';
  }

  applyPopupVisibility() {
    if (!this.refs.popup) return;
    this.refs.popup.hidden = !this.visible;
    this.refs.popup.classList.toggle('is-visible', this.visible);
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}

function setTextContentIfChanged(element, text) {
  const value = String(text ?? '');
  if (element.textContent !== value) {
    element.textContent = value;
  }
}
