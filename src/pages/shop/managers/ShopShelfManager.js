import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setResourceColor, setResourceColorFromText } from '../../shared/resourceColor.js';
import { setSelectedTabState } from '../../shared/selectedTabState.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';

const HOLD_DELAY_MS = 350;
const HOLD_REPEAT_MS = 100;
const HOLD_MOVE_TOLERANCE_PX = 10;

export function getDynamicStallTransferStep(quantity) {
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  return Math.min(500, Math.max(1, Math.ceil(safeQuantity * 0.05)));
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
    this.unsubscribe?.();
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = { rows: [], tabButtons: new Map(), itemButtons: new Map() };
    this.unsubscribe = null;
    this.visible = false;
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
    const itemValue = document.createElement('span');
    itemValue.className = 'shop-page__slot-item-value';
    itemValue.dataset.tutorialId = `shop:stand:${slotNumber}`;
    itemValue.addEventListener('pointerdown', (event) =>
      this.beginUnloadHold(event, slotNumber),
    );
    const statusValue = document.createElement('span');
    statusValue.className = 'shop-page__slot-price-value';
    value.append(itemValue, statusValue);
    row.append(label, value);
    return { row, label, value, itemValue, statusValue };
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
    const summary = document.createElement('div');
    summary.className = 'shop-page__sell-selected-row';
    summary.setAttribute('aria-live', 'polite');
    const instructions = document.createElement('div');
    instructions.className = 'shop-page__sell-status';
    instructions.textContent = 'tap to load 1. hold to load faster.';
    const divider = document.createElement('div');
    divider.className = 'shop-page__sell-divider';
    const itemList = document.createElement('div');
    itemList.className = 'shop-page__sell-item-list';
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__sell-tabs';
    tabs.setAttribute('role', 'tablist');
    dialog.append(title, close, summary, instructions, divider, itemList);
    panel.append(dialog, tabs);
    popup.append(panel);
    this.refs.dialog = panel;
    this.refs.summary = summary;
    this.refs.instructions = instructions;
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
        this.beginLoadHold(event, item.itemTypeId),
      );
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.loadItem(item.itemTypeId);
        this.gameplayFacade.commitShopShelfChanges?.();
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

  beginLoadHold(event, itemTypeId) {
    const refs = this.refs.itemButtons.get(itemTypeId);
    if (event.button !== 0 || refs?.button.disabled) return;
    event.preventDefault();
    this.beginHold(event, {
      key: `load:${itemTypeId}`,
      immediate: true,
      onStep: () => this.loadItem(itemTypeId),
    });
  }

  beginUnloadHold(event, slotNumber) {
    const slot = this.gameplayFacade
      .getSnapshot()
      ?.shop?.shelf?.slots?.find((candidate) => candidate.slotNumber === slotNumber);
    if (event.button !== 0 || !slot?.sellItemTypeId || slot.loadedQuantity <= 0) return;
    this.beginHold(event, {
      key: `unload:${slotNumber}`,
      immediate: false,
      onStep: () => {
        this.gameplayFacade.selectShopShelfSlot(slotNumber);
        return this.unloadItem();
      },
      onActivated: () => {
        this.suppressRowClickSlotNumber = slotNumber;
      },
    });
  }

  beginHold(event, { key, immediate, onStep, onActivated = null }) {
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
      if (endEvent.pointerId === hold.pointerId) this.endHold({ commit: hold.didChange });
    };
    this.activeHold = hold;
    hold.target.setPointerCapture?.(hold.pointerId);
    hold.target.addEventListener('pointermove', hold.move);
    hold.target.addEventListener('pointerup', hold.end);
    hold.target.addEventListener('pointercancel', hold.end);
    document.addEventListener('pointermove', hold.move);
    document.addEventListener('pointerup', hold.end);
    document.addEventListener('pointercancel', hold.end);
    if (immediate) this.runHoldStep(hold);
    hold.delayId = globalThis.setTimeout(activate, HOLD_DELAY_MS);
  }

  runHoldStep(hold) {
    const result = hold.onStep?.();
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
    if (commit && hold.didChange) this.gameplayFacade.commitShopShelfChanges?.();
  }

  loadItem(itemTypeId) {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const slot = this.getSelectedSlot(shelf);
    const step = getDynamicStallTransferStep(slot?.loadedQuantity ?? 0);
    return this.gameplayFacade.loadSelectedShopShelfSlotItem(itemTypeId, step, {
      save: false,
    });
  }

  unloadItem() {
    const shelf = this.gameplayFacade.getSnapshot()?.shop?.shelf;
    const slot = this.getSelectedSlot(shelf);
    const step = getDynamicStallTransferStep(slot?.loadedQuantity ?? 0);
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
        refs.statusValue.textContent = 'select';
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
      const remaining = this.getRemainingSeconds(slot, shelf.autoSellSeconds);
      const batch = Math.min(slot.batchSize ?? 1, slot.loadedQuantity);
      const unitCoin = this.getDisplaySellCoin(slot);
      const priceText = Number.isFinite(unitCoin)
        ? formatCoinPriceText(unitCoin * batch)
        : 'offline';
      setResourceIconText(refs.statusValue, `x${batch} · ${remaining}s · ${priceText}`);
      setResourceColorFromText(refs.statusValue, refs.statusValue.textContent);
    }

    if (this.visible) this.renderPopup(snapshot, shelf);
  }

  renderPopup(snapshot, shelf) {
    this.ensureSellControls(shelf);
    for (const refs of this.refs.itemButtons.values()) {
      refs.row.hidden = true;
    }
    const selectedSlot = this.getSelectedSlot(shelf);
    this.refs.summary.textContent = selectedSlot?.sellItemTypeId
      ? `stall ${selectedSlot.slotNumber}: ${selectedSlot.sellLabel} x${selectedSlot.loadedQuantity}`
      : `stall ${shelf.selectedSlotNumber}: empty`;
    this.refs.instructions.textContent = selectedSlot?.sellItemTypeId
      ? 'hold the same item to load faster. hold the stall item to return it.'
      : 'tap to load 1. hold to load faster.';

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
        selectedSlot?.sellItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
      refs.label.textContent = `${display.label} (${display.quantity})`;
      setItemIconLabel(refs.label, item.kind, item.key);
      setResourceColor(refs.label, item.kind);
      setResourceIconText(refs.quantity, this.formatSellCoin(this.getDisplaySellCoin(item)));
      setResourceColorFromText(refs.quantity, refs.quantity.textContent);
    }
  }

  getSelectedSlot(shelf) {
    return shelf?.slots?.find((slot) => slot.slotNumber === shelf.selectedSlotNumber) ?? null;
  }

  getRemainingSeconds(slot, cycleSeconds) {
    const cycle = Math.max(1, Number(cycleSeconds) || 5);
    const progress = Math.max(0, Number(slot.sellProgressSeconds) || 0) % cycle;
    return Math.max(1, Math.ceil(cycle - progress));
  }

  getDisplaySellCoin(item) {
    if (Number.isFinite(item?.sellCoin) && item.sellCoin > 0) return item.sellCoin;
    return this.getSellPriceOverride?.({ item }) ?? null;
  }

  formatSellCoin(coin) {
    return Number.isFinite(coin) ? formatCoinPriceText(coin) : '? coin';
  }

  applyPopupVisibility() {
    if (!this.refs.popup) return;
    this.refs.popup.hidden = !this.visible;
    this.refs.popup.classList.toggle('is-visible', this.visible);
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
