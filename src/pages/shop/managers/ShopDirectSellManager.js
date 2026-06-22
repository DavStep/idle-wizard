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
import { createAmountSelectionRow } from '../../shared/AmountSelectionRow.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';

const DIRECT_SELL_TABS = [
  { kind: 'seed', label: 'seeds' },
  { kind: 'herb', label: 'herbs' },
  { kind: 'potion', label: 'potions' },
];
const DIRECT_SELL_HELP_TOOLTIP_ID = 'shop-page__direct-sell-help-tooltip';
const TOUCH_LIKE_PRESS_START_DEDUPE_MS = 80;
const TOUCH_LIKE_CLICK_DEDUPE_RESET_MS = 500;

export class ShopDirectSellManager {
  constructor({ gameplayFacade, onSellOverride, getSellQuoteOverride } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onSellOverride = typeof onSellOverride === 'function' ? onSellOverride : null;
    this.getSellQuoteOverride =
      typeof getSellQuoteOverride === 'function' ? getSellQuoteOverride : null;
    this.refs = {
      tabButtons: new Map(),
      rows: new Map(),
    };
    this.unsubscribe = null;
    this.visible = false;
    this.helpVisible = false;
    this.selectedTab = 'seed';
    this.selectedItemTypeId = null;
    this.sellQuantity = 1;
    this.sellingItemTypeId = null;
    this.handledSelectPressStartItemTypeId = null;
    this.handledSelectPressStartReset = null;
    this.lastTouchLikePressStart = {
      key: null,
      timeStamp: Number.NEGATIVE_INFINITY,
    };
    this.statusText = '';
    this.lastSnapshot = null;
    this.previousFocus = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleDocumentClick = (event) => {
      if (!this.helpVisible || this.refs.controlsRoot?.contains(event.target)) {
        return;
      }

      this.hideHelp();
    };
    this.handleKeydown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (this.visible) {
        event.preventDefault();
        this.hide();
        return;
      }

      if (!this.helpVisible) {
        return;
      }

      event.preventDefault();
      this.hideHelp();
    };
  }

  mount({ buttonParent, popupParent } = {}) {
    if (!buttonParent || !popupParent || !this.gameplayFacade) {
      return null;
    }

    if (this.refs.button) {
      return this.refs.button;
    }

    this.refs.controlsRoot = this.createControls();
    this.refs.helpPopup = this.createHelpPopup();
    this.refs.popup = this.createPopup();
    buttonParent.append(this.refs.controlsRoot);
    popupParent.append(this.refs.helpPopup.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => {
      this.lastSnapshot = snapshot;
      this.render();
    });
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.render();
    this.applyVisibility();
    return this.refs.button;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeydown);
    this.clearHandledSelectPressStartItemTypeId();
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.refs.controlsRoot?.remove();
    this.refs.helpPopup?.root?.remove();
    this.refs.popup?.remove();
    this.refs = {
      tabButtons: new Map(),
      rows: new Map(),
    };
    this.visible = false;
    this.helpVisible = false;
    this.selectedTab = 'seed';
    this.selectedItemTypeId = null;
    this.sellQuantity = 1;
    this.sellingItemTypeId = null;
    this.handledSelectPressStartItemTypeId = null;
    this.handledSelectPressStartReset = null;
    this.lastTouchLikePressStart = {
      key: null,
      timeStamp: Number.NEGATIVE_INFINITY,
    };
    this.statusText = '';
    this.lastSnapshot = null;
    this.previousFocus = null;
  }

  createControls() {
    const root = document.createElement('section');
    root.className = 'shop-page__direct-sell-box style-box';
    root.setAttribute('aria-label', 'fast sell');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'fast sell';

    this.refs.button = this.createButton();
    this.refs.help = this.createHelpControl();
    this.refs.summary = this.createSummaryRow();

    root.append(title, this.refs.summary.row, this.refs.button, this.refs.help.root);
    return root;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button shop-page__direct-sell-button';
    button.type = 'button';
    button.textContent = 'fast sell';
    button.dataset.tutorialId = 'shop:directSell';
    button.setAttribute('aria-label', 'fast sell to npc');
    button.addEventListener('click', () => this.show());
    return button;
  }

  createHelpControl() {
    const root = document.createElement('div');
    root.className = 'shop-page__direct-sell-help';

    const button = document.createElement('button');
    button.className = 'style-button shop-page__direct-sell-help-button';
    button.type = 'button';
    button.textContent = '?';
    button.setAttribute('aria-controls', DIRECT_SELL_HELP_TOOLTIP_ID);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'what is fast sell?');
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleHelp();
    });

    root.append(button);
    return { root, button };
  }

  createHelpPopup() {
    const root = document.createElement('section');
    root.className = 'shop-page__direct-sell-help-popup';
    root.hidden = true;

    const tooltip = document.createElement('div');
    tooltip.id = DIRECT_SELL_HELP_TOOLTIP_ID;
    tooltip.className = 'style-tooltip shop-page__direct-sell-help-tooltip';

    root.append(tooltip);
    return { root, tooltip };
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__direct-sell-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const panel = document.createElement('section');
    panel.className = 'shop-page__direct-sell-panel';
    panel.setAttribute('aria-label', 'fast sell to npc');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__direct-sell-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'fast sell';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button shop-page__direct-sell-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hide());

    this.refs.selectedItem = this.createSelectedItemRow();
    this.refs.quantityField = createAmountSelectionRow({
      ariaLabel: 'amount',
      className: 'shop-page__direct-sell-field',
      inputClassName: 'shop-page__direct-sell-input',
      stepClassName: 'shop-page__direct-sell-step',
      onInput: () => this.onQuantityInput(),
      onStep: (delta) => this.onQuantityStep(delta),
    });
    this.refs.quantityField.stepButtons.get(1).dataset.tutorialId =
      'shop:directSell:amount:+1';

    const actionRow = document.createElement('div');
    actionRow.className = 'shop-page__direct-sell-action-row';
    this.refs.actionRow = actionRow;

    this.refs.confirmButton = document.createElement('button');
    this.refs.confirmButton.className = 'style-button shop-page__direct-sell-confirm';
    this.refs.confirmButton.type = 'button';
    this.refs.confirmButton.dataset.tutorialId = 'shop:directSell:sell';
    this.refs.confirmButton.addEventListener('click', () => this.onConfirmSell());
    this.refs.confirmButtonLabel = document.createElement('span');
    this.refs.confirmButtonLabel.className = 'shop-page__direct-sell-confirm-label';
    this.refs.confirmButtonValue = document.createElement('span');
    this.refs.confirmButtonValue.className = 'shop-page__direct-sell-confirm-value';
    this.refs.confirmButton.append(
      this.refs.confirmButtonLabel,
      this.refs.confirmButtonValue,
    );

    this.refs.status = document.createElement('div');
    this.refs.status.className = 'shop-page__direct-sell-status';

    this.refs.divider = document.createElement('div');
    this.refs.divider.className = 'shop-page__direct-sell-divider';

    this.refs.rowsRoot = document.createElement('div');
    this.refs.rowsRoot.className = 'shop-page__direct-sell-rows';

    this.refs.tabs = this.createTabs();

    actionRow.append(this.refs.confirmButton);
    dialog.append(
      title,
      closeButton,
      this.refs.selectedItem.row,
      this.refs.quantityField.field,
      actionRow,
      this.refs.status,
      this.refs.divider,
      this.refs.rowsRoot,
    );
    panel.append(dialog, this.refs.tabs);
    popup.append(panel);
    this.refs.dialog = panel;
    return popup;
  }

  createSelectedItemRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__direct-sell-selected-row';

    const label = document.createElement('button');
    label.className = 'row_key shop-page__direct-sell-selected-label';
    label.type = 'button';
    label.addEventListener('click', () => this.clearSelectedItem());

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, label, value };
  }

  createSummaryRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__direct-sell-summary';

    const label = document.createElement('span');
    label.className = 'row_key';

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, label, value };
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__direct-sell-tabs';
    tabs.setAttribute('aria-label', 'fast sell item type');
    tabs.setAttribute('role', 'tablist');

    for (const tab of DIRECT_SELL_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button shop-page__direct-sell-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.dataset.directSellKind = tab.kind;
      button.dataset.tutorialId = `shop:directSell:tab:${tab.kind}`;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.kind));
      this.refs.tabButtons.set(tab.kind, button);
      tabs.append(button);
    }

    return tabs;
  }

  show() {
    this.previousFocus = document.activeElement;
    this.hideHelp();
    this.visible = true;
    this.statusText = '';
    this.sellQuantity = 1;
    this.applyVisibility();
    this.render();
    this.refs.dialog?.focus();
    this.refs.quantityField?.hideInput();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.statusText = '';
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  toggleHelp() {
    if (this.helpVisible) {
      this.hideHelp();
      return;
    }

    this.showHelp();
  }

  showHelp() {
    this.helpVisible = true;
    this.applyHelpVisibility();
  }

  hideHelp() {
    if (!this.helpVisible) {
      return;
    }

    this.helpVisible = false;
    this.applyHelpVisibility();
  }

  onSelectTab(kind) {
    if (this.selectedTab === kind) {
      return;
    }

    this.selectedTab = kind;
    this.statusText = '';
    this.render();
  }

  onSelectItem(itemTypeId) {
    this.selectedItemTypeId = this.selectedItemTypeId === itemTypeId ? null : itemTypeId;
    this.sellQuantity = 1;
    this.statusText = '';
    this.render();
    this.refs.quantityField?.hideInput();
  }

  clearSelectedItem() {
    if (this.selectedItemTypeId === null) {
      return;
    }

    this.selectedItemTypeId = null;
    this.sellQuantity = 1;
    this.statusText = '';
    this.render();
    this.refs.quantityField?.hideInput();
  }

  onSelectItemClick(event, itemTypeId) {
    if (
      event.type === 'click' &&
      this.handledSelectPressStartItemTypeId === itemTypeId
    ) {
      this.clearHandledSelectPressStartItemTypeId();
      return;
    }

    this.onSelectItem(itemTypeId);
  }

  onSelectItemPressStart(event, itemTypeId) {
    if (event.currentTarget?.disabled) {
      return;
    }

    event.preventDefault();
    this.setHandledSelectPressStartItemTypeId(itemTypeId);
    this.onSelectItem(itemTypeId);
  }

  onQuantityInput() {
    this.sellQuantity = this.readPositiveInteger(this.refs.quantityField?.input.value) ?? 0;
    this.statusText = '';
    this.renderDetails();
  }

  onQuantityStep(delta) {
    const item = this.getSelectedItem();
    const quantity = this.clampSellQuantity(this.sellQuantity, item) ?? 1;
    const nextQuantity = this.clampSteppedSellQuantity(quantity + delta, item);

    if (!nextQuantity || nextQuantity === quantity) {
      return;
    }

    this.sellQuantity = nextQuantity;
    this.statusText = '';
    this.renderDetails();
  }

  async onConfirmSell() {
    if (this.sellingItemTypeId !== null) {
      return;
    }

    const item = this.getSelectedItem();
    const quantity = this.clampSellQuantity(this.sellQuantity, item);

    if (!item || !quantity) {
      this.statusText = item
        ? this.getSellFailureText(this.getNoSellReason(item), null, item)
        : 'bad amount';
      this.renderDetails();
      return;
    }

    const quote = this.getSellQuote(item, quantity);

    if (!quote.ok) {
      this.statusText = this.getSellFailureText(quote.reason, quote, item);
      this.renderDetails();
      return;
    }

    const overrideResult = await this.onSellOverride?.({
      item,
      quantity,
      quote,
    });

    if (overrideResult?.handled) {
      this.lastSnapshot = this.gameplayFacade.getSnapshot();
      this.sellingItemTypeId = null;

      if (overrideResult.ok) {
        this.statusText = '';
        this.hide();
        return;
      }

      this.statusText =
        overrideResult.message ??
        this.getSellFailureText(overrideResult.reason, overrideResult, item);
      this.render();
      return;
    }

    this.sellingItemTypeId = item.itemTypeId;
    this.statusText = 'selling';
    this.render();

    const result = await this.gameplayFacade.sellNpcMarketItem(item.itemTypeId, quantity);
    this.lastSnapshot = this.gameplayFacade.getSnapshot();
    this.sellingItemTypeId = null;

    if (result.ok) {
      this.hide();
      return;
    }

    this.statusText = this.getSellFailureText(result.reason, result, item);
    this.render();
  }

  render() {
    if (!this.lastSnapshot) {
      return;
    }

    this.renderHelp();
    this.renderSummary();

    if (!this.refs.popup || !this.visible) {
      return;
    }

    for (const tab of DIRECT_SELL_TABS) {
      const selected = this.selectedTab === tab.kind;
      const button = this.refs.tabButtons.get(tab.kind);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }

    const items = this.getVisibleItems();
    const visibleItemTypeIds = new Set(items.map((item) => item.itemTypeId));

    for (const [itemTypeId, refs] of this.refs.rows) {
      refs.row.hidden = !visibleItemTypeIds.has(itemTypeId);
    }

    if (this.selectedItemTypeId !== null && !this.canKeepSelectedItem()) {
      this.selectedItemTypeId = null;
      this.sellQuantity = 1;
    }

    items.forEach((item) => this.renderRow(this.ensureRow(item.itemTypeId), item));
    this.renderDetails();
  }

  renderRow(refs, item) {
    const display = getItemDisplay(this.lastSnapshot, item, item.quantity);
    const selected = this.selectedItemTypeId === item.itemTypeId;
    const selling = this.sellingItemTypeId === item.itemTypeId;
    const canSelect = item.quantity > 0 && shouldShowItemInActionList(
      this.lastSnapshot,
      item,
      item.quantity,
    );

    refs.row.classList.toggle('is-empty', display.empty);
    refs.row.classList.toggle('is-locked', display.locked);
    refs.row.classList.toggle('is-unknown', display.unknown);
    refs.button.disabled = !canSelect || selling;
    refs.button.setAttribute('aria-disabled', refs.button.disabled ? 'true' : 'false');
    refs.button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    refs.button.dataset.directSellItemKey = item.key;
    delete refs.button.dataset.tutorialId;
    delete refs.label.dataset.tutorialId;
    refs.targetLabel.dataset.tutorialId = `shop:directSell:${item.key}`;
    refs.targetLabel.textContent = `${display.label} x${display.quantity}`;
    setItemIconLabel(refs.targetLabel, item.kind, item.key);
    setResourceColor(refs.targetLabel, item.kind);
    setResourceIconText(refs.value, this.formatSellCoin(this.getDisplayPriceCoin(item)));
    setResourceColorFromText(refs.value, refs.value.textContent);
  }

  renderDetails() {
    if (!this.refs.selectedItem) {
      return;
    }

    const item = this.getSelectedItem();
    this.refs.quantityField.field.hidden = false;
    this.refs.actionRow.hidden = false;
    this.refs.confirmButton.hidden = false;

    if (!item) {
      this.sellQuantity = 1;
      this.refs.selectedItem.label.disabled = true;
      this.refs.selectedItem.label.setAttribute('aria-disabled', 'true');
      this.refs.selectedItem.label.setAttribute('aria-pressed', 'false');
      this.refs.selectedItem.label.setAttribute('aria-label', 'no item selected');
      this.refs.selectedItem.label.textContent = 'no item selected';
      setItemIconLabel(this.refs.selectedItem.label, null);
      setResourceColor(this.refs.selectedItem.label, null);
      this.refs.selectedItem.value.textContent = '';
      setResourceColor(this.refs.selectedItem.value, null);
      this.refs.quantityField.hideInput();
      this.refs.quantityField.input.min = '1';
      this.refs.quantityField.input.max = '1';
      this.refs.quantityField.input.disabled = true;
      this.refs.quantityField.setValue(1);
      this.refs.quantityField.valueButton.disabled = true;
      this.refs.quantityField.valueButton.setAttribute('aria-disabled', 'true');
      for (const button of this.refs.quantityField.stepButtons.values()) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
      this.refs.confirmButtonLabel.textContent = 'sell x1';
      setResourceIconText(this.refs.confirmButtonValue, '');
      setResourceColor(this.refs.confirmButtonValue, null);
      this.refs.confirmButton.setAttribute('aria-label', 'select item to sell');
      this.refs.confirmButton.disabled = true;
      this.refs.confirmButton.setAttribute('aria-disabled', 'true');
      this.renderStatus('select item');
      return;
    }

    const maxQuantity = this.getMaxSellQuantity(item);
    const quantity = maxQuantity > 0
      ? this.clampSellQuantity(this.sellQuantity, item) ?? 1
      : 0;
    const displayQuote = quantity > 0
      ? this.getDisplaySellQuote(item, quantity)
      : { ok: false, reason: this.getNoSellReason(item) };
    const quote = quantity > 0
      ? this.getSellQuote(item, quantity)
      : { ok: false, reason: this.getNoSellReason(item), need: this.getSellNeed(item) };
    const selling = this.sellingItemTypeId === item.itemTypeId;
    const canSell = quote.ok && !selling;
    const display = getItemDisplay(this.lastSnapshot, item, item.quantity);

    this.sellQuantity = quantity;
    this.refs.selectedItem.label.disabled = false;
    this.refs.selectedItem.label.setAttribute('aria-disabled', 'false');
    this.refs.selectedItem.label.setAttribute('aria-pressed', 'true');
    this.refs.selectedItem.label.setAttribute('aria-label', `deselect ${display.label}`);
    this.refs.quantityField.input.min = maxQuantity > 0 ? '1' : '0';
    this.refs.quantityField.input.max = String(maxQuantity);
    this.refs.quantityField.input.disabled = maxQuantity <= 0 || selling;
    this.refs.quantityField.setValue(quantity);
    this.refs.quantityField.valueButton.disabled = maxQuantity <= 0 || selling;
    this.refs.quantityField.valueButton.setAttribute(
      'aria-disabled',
      this.refs.quantityField.valueButton.disabled ? 'true' : 'false',
    );

    for (const [delta, button] of this.refs.quantityField.stepButtons) {
      const nextQuantity = this.clampSteppedSellQuantity(quantity + delta, item);
      const disabled = selling || !nextQuantity || nextQuantity === quantity;
      button.disabled = disabled;
      button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    }

    this.refs.selectedItem.label.textContent = `${display.label} x${display.quantity}`;
    setItemIconLabel(this.refs.selectedItem.label, item.kind, item.key);
    setResourceColor(this.refs.selectedItem.label, item.kind);

    this.refs.selectedItem.value.textContent = this.formatDemandText(item);
    setResourceColor(this.refs.selectedItem.value, null);

    const totalText = displayQuote.ok
      ? formatCoinPriceText(displayQuote.totalPriceCoin)
      : '?';
    this.refs.confirmButtonLabel.textContent = selling ? 'selling' : `sell x${quantity}`;
    setResourceIconText(this.refs.confirmButtonValue, totalText);
    setResourceColor(this.refs.confirmButtonValue, displayQuote.ok ? 'coin' : null);
    this.refs.confirmButton.setAttribute(
      'aria-label',
      displayQuote.ok
        ? `${selling ? 'selling' : 'sell'} ${quantity} for ${totalText}`
        : `${selling ? 'selling' : 'sell'} ${quantity}`,
    );
    this.refs.confirmButton.disabled = !canSell;
    this.refs.confirmButton.setAttribute('aria-disabled', canSell ? 'false' : 'true');

    const status =
      this.statusText ||
      (!quote.ok ? this.getSellFailureText(quote.reason, quote, item) : '');
    this.renderStatus(status);
  }

  renderStatus(message) {
    setResourceIconText(this.refs.status, message);
    this.refs.status.hidden = !message;
    setResourceColorFromText(this.refs.status, message);
  }

  renderHelp() {
    if (!this.refs.helpPopup?.tooltip) {
      return;
    }

    const fastSellPercent = this.getFastSellPercent();
    this.refs.helpPopup.tooltip.textContent =
      fastSellPercent === null
        ? 'fast sell sells now for less than full npc price. market stands wait for the timer and pay 100%.'
        : `fast sell sells now for ${fastSellPercent}% of full npc price. market stands wait for the timer and pay 100%.`;

    if (this.helpVisible) {
      this.positionHelpPopup();
    }
  }

  renderSummary() {
    if (!this.refs.summary) {
      return;
    }

    const fastSellPercent = this.getFastSellPercent();
    this.refs.summary.label.textContent = 'instant sale';
    this.refs.summary.value.textContent =
      fastSellPercent === null ? 'lower payout' : `${fastSellPercent}% payout`;
  }

  ensureRow(itemTypeId) {
    if (!this.refs.rows.has(itemTypeId)) {
      this.refs.rows.set(itemTypeId, this.createRow(itemTypeId));
    }

    return this.refs.rows.get(itemTypeId);
  }

  createRow(itemTypeId) {
    const button = document.createElement('button');
    button.className =
      'shop-page__direct-sell-row shop-page__sell-item-row shop-page__direct-sell-item-button shop-page__sell-item-button';
    button.type = 'button';
    this.bindTouchLikePressStart(button, `direct-sell:${itemTypeId}`, (event) =>
      this.onSelectItemPressStart(event, itemTypeId),
    );
    button.addEventListener('click', (event) => this.onSelectItemClick(event, itemTypeId));

    const label = document.createElement('span');
    label.className = 'row_key';

    const targetLabel = document.createElement('span');
    targetLabel.className = 'shop-page__direct-sell-target-label';
    label.append(targetLabel);

    const value = document.createElement('span');
    value.className = 'row_val';

    button.append(label, value);
    this.refs.rowsRoot.append(button);
    return {
      row: button,
      button,
      label,
      targetLabel,
      value,
    };
  }

  getVisibleItems() {
    const items = this.lastSnapshot?.shop?.shelf?.sellItems ?? [];

    return items.filter(
      (item) =>
        item.kind === this.selectedTab &&
        shouldShowItemInActionList(this.lastSnapshot, item, item.quantity),
    );
  }

  getSelectedItem() {
    if (this.selectedItemTypeId === null) {
      return null;
    }

    return (
      (this.lastSnapshot?.shop?.shelf?.sellItems ?? []).find(
        (item) => item.itemTypeId === this.selectedItemTypeId,
      ) ?? null
    );
  }

  canKeepSelectedItem() {
    const item = this.getSelectedItem();
    return Boolean(
      item && shouldShowItemInActionList(this.lastSnapshot, item, item.quantity),
    );
  }

  getSellQuote(item, quantity) {
    const quote = this.gameplayFacade.quoteNpcMarketSell?.(item.itemTypeId, quantity);

    if (quote) {
      return quote;
    }

    const fastSellCoin = this.getFastSellCoin(item);

    return {
      ok: Number.isFinite(fastSellCoin) && fastSellCoin > 0,
      quantity,
      priceCoin: fastSellCoin,
      totalPriceCoin: fastSellCoin * quantity,
    };
  }

  readPositiveInteger(value) {
    const integer = Math.floor(Number(value));

    if (!Number.isInteger(integer) || integer <= 0) {
      return null;
    }

    return integer;
  }

  clampSellQuantity(quantity, item) {
    const safeQuantity = this.readPositiveInteger(quantity);

    if (!item || !safeQuantity) {
      return null;
    }

    const maxQuantity = this.getMaxSellQuantity(item);

    if (maxQuantity <= 0) {
      return null;
    }

    return Math.min(safeQuantity, maxQuantity);
  }

  clampSteppedSellQuantity(quantity, item) {
    const integer = Math.floor(Number(quantity));
    const maxQuantity = this.getMaxSellQuantity(item);

    if (!Number.isInteger(integer) || maxQuantity <= 0) {
      return null;
    }

    return Math.min(Math.max(1, integer), maxQuantity);
  }

  getMaxSellQuantity(item) {
    const quantity = Number.isFinite(item?.quantity) ? Math.floor(item.quantity) : 0;
    const sellNeed = this.getSellNeed(item);
    return Math.min(quantity, sellNeed ?? quantity, 10_000);
  }

  getNoSellReason(item) {
    const quantity = Number.isFinite(item?.quantity) ? Math.floor(item.quantity) : 0;

    if (quantity <= 0) {
      return 'not_enough_items';
    }

    const sellNeed = this.getSellNeed(item);

    if (sellNeed !== null && sellNeed <= 0) {
      return 'demand_too_low';
    }

    return 'invalid_quantity';
  }

  getSellNeed(item) {
    const sellNeed = Math.floor(Number(item?.sellNeed));

    if (!Number.isInteger(sellNeed) || sellNeed < 0) {
      return null;
    }

    return sellNeed;
  }

  formatDemandText(item) {
    const sellNeed = this.getSellNeed(item);

    if (sellNeed === null) {
      return 'demand ?';
    }

    if (sellNeed <= 0) {
      return 'no buyers';
    }

    return `demand ${sellNeed}`;
  }

  getFastSellCoin(item) {
    return Number.isFinite(item?.fastSellCoin) ? item.fastSellCoin : item?.sellCoin;
  }

  getDisplayPriceCoin(item) {
    const quoteOverride = this.getSellQuoteOverride?.({
      item,
      quantity: 1,
    });

    if (quoteOverride?.ok && Number.isFinite(quoteOverride.priceCoin)) {
      return quoteOverride.priceCoin;
    }

    return this.getFastSellCoin(item);
  }

  getDisplaySellQuote(item, quantity = 1) {
    const quoteOverride = this.getSellQuoteOverride?.({
      item,
      quantity,
    });

    if (quoteOverride?.ok) {
      return quoteOverride;
    }

    return this.getSellQuote(item, quantity);
  }

  getFastSellPercent() {
    const selectedPercent = Number(this.getSelectedItem()?.fastSellPercent);

    if (Number.isFinite(selectedPercent) && selectedPercent > 0) {
      return Math.max(0, Math.min(100, Math.floor(selectedPercent)));
    }

    for (const item of this.lastSnapshot?.shop?.shelf?.sellItems ?? []) {
      const percent = Number(item?.fastSellPercent);

      if (Number.isFinite(percent) && percent > 0) {
        return Math.max(0, Math.min(100, Math.floor(percent)));
      }
    }

    return null;
  }

  formatSellCoin(sellCoin) {
    if (!Number.isFinite(sellCoin)) {
      return 'offline';
    }

    return formatCoinPriceText(sellCoin);
  }

  getSellFailureText(reason, quote = null, item = null) {
    if (reason === 'not_enough_items') {
      return 'not enough items';
    }

    if (reason === 'demand_too_low') {
      const need = Math.floor(Number(quote?.need ?? this.getSellNeed(item)));

      if (!Number.isInteger(need) || need <= 0) {
        return 'no buyers';
      }

      return `only ${need} buyers`;
    }

    if (reason === 'invalid_quantity') {
      return 'bad amount';
    }

    if (reason === 'missing_price' || reason === 'missing_need' || reason === 'offline') {
      return 'offline';
    }

    return 'sell failed';
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  applyHelpVisibility() {
    if (this.refs.helpPopup?.root) {
      this.refs.helpPopup.root.hidden = !this.helpVisible;
    }

    this.refs.help?.button?.setAttribute('aria-expanded', this.helpVisible ? 'true' : 'false');

    if (this.helpVisible) {
      this.positionHelpPopup();
    }
  }

  positionHelpPopup() {
    const button = this.refs.help?.button;
    const popupRoot = this.refs.helpPopup?.root;
    const tooltip = this.refs.helpPopup?.tooltip;

    if (!button || !popupRoot || !tooltip || popupRoot.hidden) {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const popupRect = popupRoot.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const popupWidth =
      popupRoot.clientWidth || popupRoot.offsetWidth || popupRect.width || 0;
    const popupHeight =
      popupRoot.clientHeight || popupRoot.offsetHeight || popupRect.height || 0;
    const scaleX = popupWidth > 0 ? popupRect.width / popupWidth : 1;
    const scaleY = popupHeight > 0 ? popupRect.height / popupHeight : 1;
    const safeScaleX = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
    const safeScaleY = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1;
    const tooltipWidth =
      tooltip.offsetWidth || tooltip.clientWidth || tooltipRect.width / safeScaleX;
    const tooltipHeight =
      tooltip.offsetHeight || tooltip.clientHeight || tooltipRect.height / safeScaleY;
    const buttonRight = (buttonRect.right - popupRect.left) / safeScaleX;
    const buttonTop = (buttonRect.top - popupRect.top) / safeScaleY;
    const buttonBottom = (buttonRect.bottom - popupRect.top) / safeScaleY;
    const gap = 6;
    const viewportPadding = 8;
    const maxLeft = Math.max(viewportPadding, popupWidth - tooltipWidth - viewportPadding);

    let left = buttonRight - tooltipWidth;
    left = Math.min(Math.max(left, viewportPadding), maxLeft);

    let top = buttonTop - tooltipHeight - gap;

    if (top < viewportPadding) {
      top = buttonBottom + gap;
    }

    const maxTop = Math.max(viewportPadding, popupHeight - tooltipHeight - viewportPadding);
    top = Math.min(Math.max(top, viewportPadding), maxTop);

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  isMousePressStart(event) {
    return event.type === 'pointerdown' && event.pointerType === 'mouse';
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

  isDuplicateTouchLikePressStart(event, key) {
    const timeStamp = Number.isFinite(event?.timeStamp) ? event.timeStamp : Date.now();
    const isDuplicate =
      this.lastTouchLikePressStart.key === key &&
      Math.abs(timeStamp - this.lastTouchLikePressStart.timeStamp) <=
        TOUCH_LIKE_PRESS_START_DEDUPE_MS;

    this.lastTouchLikePressStart = { key, timeStamp };
    return isDuplicate;
  }

  setHandledSelectPressStartItemTypeId(itemTypeId) {
    this.clearHandledSelectPressStartItemTypeId();
    this.handledSelectPressStartItemTypeId = itemTypeId;
    this.handledSelectPressStartReset = globalThis.setTimeout(() => {
      if (this.handledSelectPressStartItemTypeId === itemTypeId) {
        this.handledSelectPressStartItemTypeId = null;
      }

      this.handledSelectPressStartReset = null;
    }, TOUCH_LIKE_CLICK_DEDUPE_RESET_MS);
    this.handledSelectPressStartReset?.unref?.();
  }

  clearHandledSelectPressStartItemTypeId() {
    if (this.handledSelectPressStartReset !== null) {
      globalThis.clearTimeout(this.handledSelectPressStartReset);
      this.handledSelectPressStartReset = null;
    }

    this.handledSelectPressStartItemTypeId = null;
  }
}
