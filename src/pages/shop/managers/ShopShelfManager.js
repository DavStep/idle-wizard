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

const HOLD_DELAY_MS = 350;
const HOLD_REPEAT_MS = 100;
const HOLD_MOVE_TOLERANCE_PX = 10;
const HOLD_INITIAL_STEP_DIVISOR = 2_000;
const HOLD_INITIAL_STEP_CAP = 100;
const HOLD_RAMP_DOUBLING_REPEATS = 7;

export function getDynamicStallTransferStep(maxQuantity, repeatIndex = 0) {
  const safeMaxQuantity = Math.max(1, Math.floor(Number(maxQuantity) || 1));
  const safeRepeatIndex = Math.max(0, Math.floor(Number(repeatIndex) || 0));
  const initialStep = Math.min(
    HOLD_INITIAL_STEP_CAP,
    Math.max(1, Math.ceil(safeMaxQuantity / HOLD_INITIAL_STEP_DIVISOR)),
  );
  const rampMultiplier = Math.max(
    1,
    Math.round(
      2 ** Math.min(20, safeRepeatIndex / HOLD_RAMP_DOUBLING_REPEATS),
    ),
  );
  return Math.min(safeMaxQuantity, initialStep * rampMultiplier);
}

export class ShopShelfManager {
  constructor({ gameplayFacade, getSellPriceOverride } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.getSellPriceOverride = getSellPriceOverride;
    this.root = null;
    this.refs = { rows: [], tabButtons: new Map(), itemButtons: new Map() };
    this.unsubscribe = null;
    this.visible = false;
    this.selectedSellTab = 'seed';
    this.draftSellItemTypeId = null;
    this.draftSellQuantity = 0;
    this.statusText = '';
    this.activeHold = null;
    this.suppressRowClickSlotNumber = null;
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
    this.endHold({ commit: true });
    for (const refs of this.refs.rows) {
      stopTimerProgressFill(refs.progressFill, 0);
    }
    this.unsubscribe?.();
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = { rows: [], tabButtons: new Map(), itemButtons: new Map() };
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
      'tap a stall to load it. hold its item to return items. each stall sells every 5 seconds.';
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
    row.addEventListener('click', () => {
      if (this.suppressRowClickSlotNumber === slotNumber) {
        this.suppressRowClickSlotNumber = null;
        return;
      }
      this.openSlot(slotNumber);
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const slot = this.gameplayFacade
          .getSnapshot()
          ?.shop?.shelf?.slots?.find((candidate) => candidate.slotNumber === slotNumber);
        if (!slot?.sellItemTypeId || slot.loadedQuantity <= 0) return;
        event.preventDefault();
        this.gameplayFacade.selectShopShelfSlot(slotNumber);
        const result = this.unloadItem();
        if (result?.ok) this.gameplayFacade.commitShopShelfChanges?.();
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      this.openSlot(slotNumber);
    });

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = `${slotNumber}.`;
    const value = document.createElement('span');
    value.className = 'row_val shop-page__slot-value';
    const itemColumn = document.createElement('span');
    itemColumn.className = 'shop-page__slot-item-column';
    const itemValue = document.createElement('span');
    itemValue.className = 'shop-page__slot-item-value';
    itemValue.dataset.tutorialId = `shop:stand:${slotNumber}`;
    itemValue.addEventListener('pointerdown', (event) =>
      this.beginUnloadHold(event, slotNumber),
    );
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
    itemColumn.append(itemValue);
    statusValue.append(batchValue, batchSeparator, priceValue);
    progressRow.append(progress, timerValue);
    value.append(itemColumn, statusValue, progressRow);
    row.append(label, value);
    return {
      row,
      label,
      value,
      itemColumn,
      itemValue,
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
    const current = document.createElement('button');
    current.className = 'shop-page__sell-current';
    current.type = 'button';
    current.dataset.tutorialId = 'shop:sell:current';
    current.addEventListener('pointerdown', (event) =>
      this.beginDraftRemoveHold(event),
    );
    current.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      this.changeDraftQuantity(-1);
    });
    const currentLabel = document.createElement('span');
    currentLabel.className = 'shop-page__sell-current-label';
    currentLabel.textContent = 'current';
    const currentItem = document.createElement('span');
    currentItem.className = 'shop-page__sell-current-item';
    const currentQuantity = document.createElement('span');
    currentQuantity.className = 'shop-page__sell-current-quantity';
    current.append(currentLabel, currentItem, currentQuantity);
    const actions = document.createElement('div');
    actions.className = 'shop-page__sell-action-row';
    const markAll = document.createElement('button');
    markAll.className = 'style-button shop-page__sell-mark-all-button';
    markAll.type = 'button';
    markAll.textContent = 'mark all';
    markAll.addEventListener('click', () => this.markDraft({ all: true }));
    const mark = document.createElement('button');
    mark.className = 'style-button shop-page__sell-mark-button';
    mark.type = 'button';
    mark.dataset.tutorialId = 'shop:sell:mark';
    mark.addEventListener('click', () => this.markDraft());
    actions.append(markAll, mark);
    const status = document.createElement('div');
    status.className = 'shop-page__sell-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    selection.append(current, actions, status);
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
    this.refs.markAll = markAll;
    this.refs.mark = mark;
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
      button.addEventListener('pointerdown', (event) =>
        this.beginDraftAddHold(event, item.itemTypeId),
      );
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.selectDraftItem(item.itemTypeId, 1);
      });
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
    this.resetSellDraft();
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
    this.endHold({ commit: true });
    const wasVisible = this.visible;
    this.visible = false;
    this.applyPopupVisibility();
    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }

  beginDraftAddHold(event, itemTypeId) {
    const refs = this.refs.itemButtons.get(itemTypeId);
    if (event.button !== 0 || refs?.button.disabled) return;
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const item = shelf?.sellItems?.find((candidate) => candidate.itemTypeId === itemTypeId);
    const maxQuantity = this.getMaxDraftQuantity(shelf, item);
    event.preventDefault();
    this.beginHold(event, {
      key: `draft-add:${itemTypeId}`,
      immediate: true,
      onImmediateStep: () => this.selectDraftItem(itemTypeId, 1),
      onStep: (repeatIndex) =>
        this.selectDraftItem(
          itemTypeId,
          getDynamicStallTransferStep(maxQuantity, repeatIndex),
        ),
    });
  }

  beginDraftRemoveHold(event) {
    if (
      event.button !== 0 ||
      this.draftSellItemTypeId === null ||
      this.draftSellQuantity <= 0
    ) {
      return;
    }
    const maxQuantity = this.draftSellQuantity;
    event.preventDefault();
    this.beginHold(event, {
      key: 'draft-remove',
      immediate: true,
      onImmediateStep: () => this.changeDraftQuantity(-1),
      onStep: (repeatIndex) =>
        this.changeDraftQuantity(
          -getDynamicStallTransferStep(maxQuantity, repeatIndex),
        ),
    });
  }

  beginUnloadHold(event, slotNumber) {
    const slot = this.gameplayFacade
      .getSnapshot()
      ?.shop?.shelf?.slots?.find((candidate) => candidate.slotNumber === slotNumber);
    if (event.button !== 0 || !slot?.sellItemTypeId || slot.loadedQuantity <= 0) return;
    const maxQuantity = slot.loadedQuantity;
    this.beginHold(event, {
      key: `unload:${slotNumber}`,
      immediate: false,
      onStep: (repeatIndex) => {
        this.gameplayFacade.selectShopShelfSlot(slotNumber);
        return this.unloadItem(
          getDynamicStallTransferStep(maxQuantity, repeatIndex),
        );
      },
      commitOnEnd: true,
      onActivated: () => {
        this.suppressRowClickSlotNumber = slotNumber;
      },
    });
  }

  beginHold(
    event,
    {
      key,
      immediate,
      onStep,
      onImmediateStep = onStep,
      onActivated = null,
      commitOnEnd = false,
    },
  ) {
    this.endHold({ commit: true });
    const point = { x: event.clientX, y: event.clientY };
    const hold = {
      key,
      pointerId: event.pointerId,
      target: event.currentTarget,
      startX: point.x,
      startY: point.y,
      onStep,
      onActivated,
      didChange: false,
      activated: false,
      commitOnEnd,
      repeatIndex: 0,
      delayId: null,
      repeatId: null,
      move: null,
      end: null,
    };
    const activate = () => {
      if (this.activeHold !== hold) return;
      hold.activated = true;
      hold.onActivated?.();
      this.runHoldStep(hold);
      hold.repeatId = globalThis.setInterval(() => this.runHoldStep(hold), HOLD_REPEAT_MS);
    };
    hold.move = (moveEvent) => {
      if (moveEvent.pointerId !== hold.pointerId) return;
      if (
        Math.hypot(moveEvent.clientX - hold.startX, moveEvent.clientY - hold.startY) >
        HOLD_MOVE_TOLERANCE_PX
      ) {
        this.endHold({ commit: hold.didChange });
      }
    };
    hold.end = (endEvent) => {
      if (endEvent.pointerId === hold.pointerId) {
        this.endHold({ commit: hold.commitOnEnd && hold.didChange });
      }
    };
    this.activeHold = hold;
    hold.target.setPointerCapture?.(hold.pointerId);
    hold.target.addEventListener('pointermove', hold.move);
    hold.target.addEventListener('pointerup', hold.end);
    hold.target.addEventListener('pointercancel', hold.end);
    document.addEventListener('pointermove', hold.move);
    document.addEventListener('pointerup', hold.end);
    document.addEventListener('pointercancel', hold.end);
    if (immediate) this.runHoldStep(hold, onImmediateStep);
    hold.delayId = globalThis.setTimeout(activate, HOLD_DELAY_MS);
  }

  runHoldStep(hold, step = hold.onStep) {
    const isRepeatStep = step === hold.onStep;
    const result = step?.(hold.repeatIndex);
    if (isRepeatStep) hold.repeatIndex += 1;
    if (result?.ok) hold.didChange = true;
  }

  endHold({ commit = false } = {}) {
    const hold = this.activeHold;
    if (!hold) return;
    globalThis.clearTimeout(hold.delayId);
    globalThis.clearInterval(hold.repeatId);
    hold.target.removeEventListener('pointermove', hold.move);
    hold.target.removeEventListener('pointerup', hold.end);
    hold.target.removeEventListener('pointercancel', hold.end);
    document.removeEventListener('pointermove', hold.move);
    document.removeEventListener('pointerup', hold.end);
    document.removeEventListener('pointercancel', hold.end);
    if (hold.target.hasPointerCapture?.(hold.pointerId)) {
      hold.target.releasePointerCapture(hold.pointerId);
    }
    this.activeHold = null;
    if (commit && hold.commitOnEnd && hold.didChange) {
      this.gameplayFacade.commitShopShelfChanges?.();
    }
  }

  selectDraftItem(itemTypeId, quantity = 1) {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const item = shelf?.sellItems?.find((candidate) => candidate.itemTypeId === itemTypeId);
    if (!item) return { ok: false, reason: 'item_missing' };

    if (this.draftSellItemTypeId !== itemTypeId) {
      this.draftSellItemTypeId = itemTypeId;
      this.draftSellQuantity = 0;
    }
    this.selectedSellTab = item.kind;
    this.statusText = '';
    return this.changeDraftQuantity(quantity, shelf);
  }

  changeDraftQuantity(delta, shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf) {
    const item = shelf?.sellItems?.find(
      (candidate) => candidate.itemTypeId === this.draftSellItemTypeId,
    );
    if (!item) {
      this.resetSellDraft();
      this.renderSellDraft(shelf);
      return { ok: false, reason: 'item_missing' };
    }

    const maxQuantity = this.getMaxDraftQuantity(shelf, item);
    const nextQuantity = Math.max(
      0,
      Math.min(maxQuantity, this.draftSellQuantity + Math.floor(Number(delta) || 0)),
    );
    if (nextQuantity === this.draftSellQuantity) {
      return { ok: false, reason: nextQuantity <= 0 ? 'empty_selection' : 'selection_full' };
    }

    this.draftSellQuantity = nextQuantity;
    if (nextQuantity === 0) this.draftSellItemTypeId = null;
    this.statusText = '';
    this.renderSellDraft(shelf);
    return { ok: true, quantity: nextQuantity };
  }

  markDraft({ all = false } = {}) {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const item = shelf?.sellItems?.find(
      (candidate) => candidate.itemTypeId === this.draftSellItemTypeId,
    );
    const quantity = all
      ? this.getMaxDraftQuantity(shelf, item)
      : this.draftSellQuantity;
    if (!item || quantity <= 0) return { ok: false, reason: 'empty_selection' };

    const result = this.gameplayFacade.loadSelectedShopShelfSlotItem(
      item.itemTypeId,
      quantity,
    );
    if (result?.ok) {
      this.resetSellDraft();
    } else {
      this.statusText = this.getLoadFailureText(result?.reason);
    }
    this.render(this.gameplayFacade.getSnapshot());
    return result;
  }

  getMaxDraftQuantity(shelf, item) {
    if (!item) return 0;
    const slot = this.getSelectedSlot(shelf);
    const remainingCapacity = Math.max(0, 1_000_000 - (slot?.loadedQuantity ?? 0));
    return Math.min(Math.max(0, Math.floor(Number(item.quantity) || 0)), remainingCapacity);
  }

  resetSellDraft() {
    this.draftSellItemTypeId = null;
    this.draftSellQuantity = 0;
    this.statusText = '';
  }

  loadItem(itemTypeId, quantity = null) {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const slot = this.getSelectedSlot(shelf);
    const step =
      quantity ?? getDynamicStallTransferStep(slot?.loadedQuantity ?? 0, 0);
    return this.gameplayFacade.loadSelectedShopShelfSlotItem(itemTypeId, step, {
      save: false,
    });
  }

  unloadItem(quantity = null) {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const slot = this.getSelectedSlot(shelf);
    const step =
      quantity ?? getDynamicStallTransferStep(slot?.loadedQuantity ?? 0, 0);
    return this.gameplayFacade.unloadSelectedShopShelfSlotItem(step, { save: false });
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
      refs.row.classList.toggle('is-empty', !slot.sellItemTypeId);
      if (!slot.sellItemTypeId) {
        refs.itemValue.textContent = 'empty stand';
        refs.itemValue.removeAttribute('aria-label');
        refs.statusValue.classList.remove('is-active');
        refs.batchValue.textContent = '';
        refs.batchSeparator.textContent = '';
        refs.batchSeparator.hidden = true;
        refs.progress.hidden = true;
        refs.progress.setAttribute('aria-valuenow', '0');
        refs.timerValue.textContent = '';
        setResourceIconText(refs.priceValue, 'select');
        setResourceColor(refs.priceValue, null);
        stopTimerProgressFill(refs.progressFill, 0);
        setItemIconLabel(refs.itemValue, null);
        setResourceColor(refs.itemValue, null);
        continue;
      }

      const display = {
        label: slot.sellLabel,
        quantity: String(slot.loadedQuantity),
      };
      refs.itemValue.textContent = `${display.label} (${display.quantity})`;
      refs.itemValue.setAttribute(
        'aria-label',
        `hold to return ${display.label} from stall ${slot.slotNumber}`,
      );
      setItemIconLabel(refs.itemValue, slot.sellKind, slot.sellKey);
      setResourceColor(refs.itemValue, slot.sellKind);
      const batch = Math.min(slot.batchSize ?? 1, slot.loadedQuantity);
      const unitCoin = this.getDisplaySellCoin(slot);
      const priceText = Number.isFinite(unitCoin)
        ? formatCoinPriceText(unitCoin * batch)
        : 'offline';
      refs.statusValue.classList.add('is-active');
      refs.batchValue.textContent = `x${batch}`;
      refs.batchSeparator.textContent = '·';
      refs.batchSeparator.hidden = false;
      refs.progress.hidden = false;
      setResourceIconText(refs.priceValue, priceText);
      setResourceColorFromText(refs.priceValue, refs.priceValue.textContent);
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

  renderPopup(snapshot, shelf) {
    this.ensureSellControls(shelf);
    for (const refs of this.refs.itemButtons.values()) {
      refs.row.hidden = true;
    }
    const selectedSlot = this.getSelectedSlot(shelf);
    const draftItem = shelf.sellItems.find(
      (item) => item.itemTypeId === this.draftSellItemTypeId,
    );
    if (
      !draftItem ||
      this.draftSellQuantity > this.getMaxDraftQuantity(shelf, draftItem)
    ) {
      this.resetSellDraft();
    }

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
      refs.row.hidden = !visible;
      refs.button.disabled = Boolean(differentItemLoaded) || item.quantity <= 0;
      refs.button.setAttribute('aria-disabled', refs.button.disabled ? 'true' : 'false');
      refs.button.setAttribute(
        'aria-pressed',
        this.draftSellItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
      refs.label.textContent = `${display.label} (${display.quantity})`;
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
    const hasSelection = Boolean(item && this.draftSellQuantity > 0);

    this.refs.current.disabled = !hasSelection;
    this.refs.current.setAttribute('aria-disabled', hasSelection ? 'false' : 'true');
    this.refs.current.setAttribute('aria-pressed', hasSelection ? 'true' : 'false');
    this.refs.current.dataset.hasSelection = hasSelection ? 'true' : 'false';
    this.refs.current.setAttribute(
      'aria-label',
      hasSelection
        ? `current ${item.label}, ${this.draftSellQuantity} selected; press to remove one`
        : 'current selection empty',
    );
    this.refs.currentItem.textContent = hasSelection ? item.label : 'empty';
    setItemIconLabel(
      this.refs.currentItem,
      hasSelection ? item.kind : null,
      hasSelection ? item.key : null,
    );
    setResourceColor(this.refs.currentItem, hasSelection ? item.kind : null);
    this.refs.currentQuantity.textContent = hasSelection
      ? `x${this.draftSellQuantity}`
      : '';

    this.refs.mark.disabled = !hasSelection;
    this.refs.mark.setAttribute('aria-disabled', hasSelection ? 'false' : 'true');
    this.refs.mark.textContent = `mark x${hasSelection ? this.draftSellQuantity : 0}`;
    this.refs.markAll.disabled = !hasSelection;
    this.refs.markAll.setAttribute('aria-disabled', hasSelection ? 'false' : 'true');
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
