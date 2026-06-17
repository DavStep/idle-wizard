import {
  getItemDisplay,
  shouldShowItemInActionList,
} from '../../shared/itemResearchStatus.js';
import {
  appendTextWithSeedIcons,
  setItemIconLabel,
} from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import {
  setResourceColor,
  setResourceColorFromText,
} from '../../shared/resourceColor.js';
import {
  NOTIFICATION_TONE_ORANGE,
  setNotificationBadge,
} from '../../shared/notificationBadge.js';
import { createAmountSelectionRow } from '../../shared/AmountSelectionRow.js';
import { createPlayerInfoLink } from '../../shared/playerInfoLink.js';
import {
  formatGoldPrice,
  formatGoldPriceText,
  multiplyGoldPrice,
  parsePositiveGoldPrice,
} from '../../../shared/goldPrice.js';

const EMPTY_LOCKED_STAND_LABEL = 'empty stand';
const EMPTY_STAND_ACTION_LABEL = 'select';
const MARKET_BROWSE_TABS = [
  { id: 'selling', label: 'selling' },
  { id: 'buying', label: 'buying' },
];

export class ShopPlayerShelfManager {
  constructor({ gameplayFacade, playerShopFacade, onOpenPlayerInfo } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.playerShopFacade = playerShopFacade;
    this.onOpenPlayerInfo = onOpenPlayerInfo;
    this.root = null;
    this.unsubscribeGameplay = null;
    this.unsubscribePlayerShop = null;
    this.refs = {};
    this.selectedSellTab = 'seed';
    this.listingPopupVisible = false;
    this.marketPopupVisible = false;
    this.selectedMarketBrowseTab = 'selling';
    this.draftListingItemTypeId = null;
    this.draftListingSlotNumber = null;
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

  mount(parent, popupParent = parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__player-shelf style-box';
    this.root.setAttribute('aria-label', 'Player market');

    this.refs.title = this.createTitle();
    this.refs.rows = [];
    this.refs.actions = this.createActions();
    this.refs.otherShopsButton = this.createOtherShopsButton();
    this.refs.proceedsButton = this.createProceedsButton();
    this.refs.listingPopup = this.createListingPopup();
    this.refs.marketPopup = this.createMarketPopup();

    this.refs.actions.append(this.refs.otherShopsButton, this.refs.proceedsButton);
    this.root.append(this.refs.title, this.refs.actions);
    parent.append(this.root);
    popupParent.append(this.refs.listingPopup, this.refs.marketPopup);
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
    this.selectedMarketBrowseTab = 'selling';
    this.draftListingItemTypeId = null;
    this.draftListingSlotNumber = null;
    this.previousFocus = null;
    this.lastGameplaySnapshot = null;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'player market';
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
    label.textContent = `${slotNumber}.`;

    const value = document.createElement('span');
    value.className = 'row_val shop-page__slot-value';

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

  createActions() {
    const actions = document.createElement('div');
    actions.className = 'shop-page__player-shop-actions';
    return actions;
  }

  getActionsRoot() {
    return this.refs.actions ?? null;
  }

  createOtherShopsButton() {
    const button = document.createElement('button');
    button.className = 'style-button shop-page__other-shops-button';
    button.type = 'button';
    button.textContent = 'browse market';
    button.addEventListener('click', () => this.showMarketPopup());
    return button;
  }

  createProceedsButton() {
    const button = document.createElement('button');
    button.className = 'style-button shop-page__other-shops-button shop-page__claim-proceeds-button';
    button.type = 'button';
    button.hidden = true;
    button.addEventListener('click', () => this.onClaimProceeds());
    return button;
  }

  createListingControls() {
    const root = document.createElement('section');
    root.className = 'shop-page__sell-controls shop-page__player-listing-controls';
    root.setAttribute('aria-label', 'List item for sale');

    const listingSpace = document.createElement('section');
    listingSpace.className = 'shop-page__player-listing-space';

    const selectedItem = document.createElement('div');
    selectedItem.className = 'shop-page__player-listing-selected-item';

    const fields = document.createElement('div');
    fields.className = 'shop-page__player-listing-fields';

    const quantityField = this.createNumberField('quantity', 'quantity', 'Listing quantity');
    const priceField = this.createNumberField('gold each', 'gold each', 'Listing gold value per item');
    priceField.input.inputMode = 'decimal';
    priceField.input.min = '0.01';
    priceField.input.step = '0.01';
    this.refs.quantityInput = quantityField.input;
    this.refs.priceInput = priceField.input;
    fields.append(quantityField.field, priceField.field);

    const actionRow = document.createElement('div');
    actionRow.className = 'shop-page__player-listing-action-row';

    const placeButton = document.createElement('button');
    placeButton.className = 'style-button shop-page__player-listing-place-button';
    placeButton.type = 'button';
    placeButton.textContent = 'place';
    placeButton.addEventListener('click', () => this.onPlaceListing());

    actionRow.append(placeButton);
    listingSpace.append(selectedItem, fields, actionRow);

    const choiceDivider = document.createElement('div');
    choiceDivider.className = 'shop-page__player-listing-choice-divider';

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

    root.append(listingSpace, choiceDivider, itemList, status);
    return {
      root,
      emptyButton,
      selectedItem,
      itemList,
      placeButton,
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
    setResourceIconText(label, labelText);

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

    const panel = document.createElement('section');
    panel.className = 'shop-page__market-popup-panel';
    panel.setAttribute('aria-label', 'Browse player market');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__market-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'player market';

    const rows = document.createElement('div');
    rows.className = 'shop-page__market-rows';

    const message = document.createElement('div');
    message.className = 'shop-page__market-message';
    rows.append(message);

    const status = document.createElement('div');
    status.className = 'shop-page__player-shop-status';

    this.refs.marketBrowseTabButtons = new Map();
    const tabs = this.createMarketBrowseTabs();
    dialog.append(title, rows, status);
    panel.append(dialog, tabs);
    popup.append(panel);
    this.refs.marketRows = rows;
    this.refs.marketMessage = message;
    this.refs.marketStatus = status;
    this.refs.marketDialog = panel;
    this.refs.marketBrowseTabs = tabs;
    this.refs.marketGroupBySellerKey = new Map();
    this.refs.marketRowByListingKey = new Map();

    return popup;
  }

  createMarketBrowseTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__market-popup-tabs';
    tabs.setAttribute('aria-label', 'Browse market type');
    tabs.setAttribute('role', 'tablist');

    for (const tab of MARKET_BROWSE_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button shop-page__market-popup-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectMarketBrowseTab(tab.id));
      this.refs.marketBrowseTabButtons.set(tab.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  onSelectSlot(event, slotNumber) {
    if (event.target?.closest?.('button')) {
      return;
    }

    const shelf = this.lastGameplaySnapshot?.shop?.playerShelf;
    const slot = shelf?.slots?.find((candidate) => candidate.slotNumber === slotNumber);
    if (!slot?.unlocked) {
      if (this.canBuyLockedSlot(shelf, slot, slotNumber)) {
        this.onBuySlot();
      }
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
    this.prepareListingDraft(selectedSlot);
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

  onSelectMarketBrowseTab(tabId) {
    if (
      this.selectedMarketBrowseTab === tabId ||
      !MARKET_BROWSE_TABS.some((tab) => tab.id === tabId)
    ) {
      return;
    }

    this.selectedMarketBrowseTab = tabId;
    this.setMarketStatus('');
    this.renderMarketRows();
  }

  onSelectListingItem(itemTypeId) {
    const item = this.lastGameplaySnapshot?.shop?.playerShelf?.sellItems.find(
      (sellItem) => sellItem.itemTypeId === itemTypeId,
    );

    if (!item) {
      return;
    }

    this.draftListingItemTypeId = itemTypeId;
    this.setListingStatus('');
    this.render();
  }

  async onPlaceListing() {
    const shelf = this.lastGameplaySnapshot?.shop?.playerShelf;
    const selectedSlot = this.getSelectedSlot(shelf);
    const itemTypeId = this.draftListingItemTypeId;
    const item = shelf?.sellItems.find((sellItem) => sellItem.itemTypeId === itemTypeId);
    const quantity = this.readPositiveInteger(this.refs.quantityInput?.value);
    const priceGold = parsePositiveGoldPrice(this.refs.priceInput?.value);

    if (!selectedSlot || !item) {
      this.setListingStatus('choose item');
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
    this.draftListingItemTypeId = result.item.itemTypeId;
    this.draftListingSlotNumber = result.slotNumber;
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
      this.draftListingItemTypeId = null;
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

  async onBuyListing(listing, quantity = 1) {
    if (!this.lastPlayerShopSnapshot.connected) {
      this.setMarketStatus('offline');
      return;
    }

    const buyQuantity = this.clampListingQuantity(quantity, listing.quantity);

    if (!buyQuantity) {
      this.setMarketStatus('bad quantity');
      return;
    }

    const totalPriceGold = multiplyGoldPrice(listing.priceGold, buyQuantity);

    if (totalPriceGold === null || (this.lastGameplaySnapshot?.gold?.current ?? 0) < totalPriceGold) {
      this.setMarketStatus('not enough gold');
      return;
    }

    this.setMarketStatus('buying');
    const buyResult = await this.playerShopFacade?.buyListing({
      listingKey: listing.listingKey,
      quantity: buyQuantity,
    });

    if (!buyResult?.ok) {
      this.setMarketStatus('buy failed');
      return;
    }

    const result = this.gameplayFacade.buyPlayerShopListingItem({
      itemKey: listing.itemKey,
      quantity: buyQuantity,
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

  onMarketQuantityInput(row, listing) {
    this.setMarketStatus('');
    this.renderMarketRowBuyState(row, listing);
  }

  onMarketQuantityStep(row, listing, delta) {
    const quantity = this.clampListingQuantity(row.quantityInput.value, listing.quantity) ?? 1;
    const nextQuantity = this.clampSteppedListingQuantity(quantity + delta, listing.quantity);

    if (!nextQuantity || nextQuantity === quantity) {
      return;
    }

    row.quantityField.setValue(nextQuantity);
    row.quantityField.hideInput();
    this.setMarketStatus('');
    this.renderMarketRowBuyState(row, listing);
  }

  showListingPopup() {
    this.previousFocus = document.activeElement;
    this.listingPopupVisible = true;
    this.applyPopupVisibility();
    this.render();
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
    this.render();
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

    if (!this.root || !shelf || !this.isRenderVisible()) {
      return;
    }

    this.ensureRows(shelf.maxSlots);
    this.renderRows(shelf);

    if (this.listingPopupVisible) {
      this.ensureSellTabButtons(shelf.sellKinds);
      this.ensureSellItemButtons(shelf.sellItems);
      this.renderListingControls(shelf, this.lastGameplaySnapshot);
    }

    this.renderProceeds();
    if (this.marketPopupVisible) {
      this.renderMarketRows();
    }

    setNotificationBadge(this.refs.otherShopsButton, this.hasAffordableMarketListing());
  }

  isRenderVisible() {
    return (
      this.listingPopupVisible ||
      this.marketPopupVisible ||
      !this.root?.closest('[hidden]')
    );
  }

  renderRows(shelf) {
    const hasListableItem = shelf.sellItems.some(
      (item) =>
        item.quantity > 0 &&
        shouldShowItemInActionList(this.lastGameplaySnapshot, item, item.quantity),
    );

    this.refs.rows.forEach((refs, index) => {
      const { row, value, button } = refs;
      const slotNumber = index + 1;
      const cost = shelf.slotCosts[index];
      const slot = shelf.slots[index];
      const selected = slotNumber === shelf.selectedSlotNumber;

      row.classList.toggle('is-selected', selected);
      row.classList.toggle('is-locked', !slot.unlocked);
      row.classList.toggle('is-empty', slot.unlocked && !slot.itemTypeId);

      if (slot.unlocked) {
        row.classList.add('shop-page__slot-row--interactive');
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.setAttribute('aria-label', `select player market stand ${slotNumber}`);
        row.setAttribute('aria-pressed', selected ? 'true' : 'false');
        setNotificationBadge(
          row,
          this.lastPlayerShopSnapshot.connected && !slot.itemTypeId && hasListableItem,
          NOTIFICATION_TONE_ORANGE,
        );
        setNotificationBadge(button, false);
        this.renderPlayerSlotValue(refs, slot, shelf, this.lastGameplaySnapshot);
        return;
      }

      if (slotNumber === shelf.nextSlotNumber) {
        row.classList.remove('shop-page__slot-row--interactive');
        row.removeAttribute('role');
        row.removeAttribute('aria-label');
        row.removeAttribute('tabindex');
        row.removeAttribute('aria-pressed');
        setResourceIconText(button, this.formatLockedSlotAction(shelf, cost));
        setResourceColorFromText(button, button.textContent);
        button.disabled = shelf.nextSlotLockedByLevel || this.lastGameplaySnapshot.gold.current < cost;
        button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
        setNotificationBadge(row, false);
        setNotificationBadge(button, !button.disabled);
        this.setText(refs.itemValue, EMPTY_LOCKED_STAND_LABEL);
        setItemIconLabel(refs.itemValue, null);
        setResourceColor(refs.itemValue, null);

        if (button.parentElement !== value) {
          refs.priceValue.replaceChildren(button);
        }
        if (refs.priceValue.parentElement !== value) {
          value.replaceChildren(refs.itemValue, refs.priceValue);
        }

        return;
      }

      row.classList.remove('shop-page__slot-row--interactive');
      row.removeAttribute('role');
      row.removeAttribute('aria-label');
      row.removeAttribute('tabindex');
      row.removeAttribute('aria-pressed');
      setNotificationBadge(row, false);
      setNotificationBadge(button, false);
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

  renderPlayerSlotValue(refs, slot, shelf, snapshot) {
    const parts = this.getPlayerSlotParts(slot, shelf, snapshot);

    if (!parts.itemText) {
      if (
        refs.itemValue.parentElement !== refs.value ||
        refs.priceValue.parentElement !== refs.value
      ) {
        refs.value.replaceChildren(refs.itemValue, refs.priceValue);
      }

      this.setText(refs.itemValue, EMPTY_LOCKED_STAND_LABEL);
      setItemIconLabel(refs.itemValue, null);
      setResourceColor(refs.itemValue, null);
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
    this.applyPlayerSlotItemColor(refs.itemValue, parts);

    setResourceIconText(refs.priceValue, parts.priceText ? ` ${parts.priceText}` : '');
    setResourceColor(refs.priceValue, parts.priceText ? 'gold' : null);
  }

  formatLockedSlotAction(shelf, cost) {
    if (shelf.nextSlotLockedByLevel) {
      return `level ${shelf.nextSlotRequiresLevel}`;
    }

    return cost === 0 ? 'free' : `buy (${formatGoldPriceText(cost)})`;
  }

  canBuyLockedSlot(shelf, slot, slotNumber) {
    return (
      slot &&
      !slot.unlocked &&
      slotNumber === shelf?.nextSlotNumber &&
      shelf.nextSlotLockedByLevel !== true &&
      Number.isFinite(shelf.nextSlotCost) &&
      (this.lastGameplaySnapshot?.gold?.current ?? 0) >= shelf.nextSlotCost
    );
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
      setNotificationBadge(
        button,
        shelf.sellItems.some(
          (item) =>
            item.kind === sellKind.kind &&
            item.quantity > 0 &&
            shouldShowItemInActionList(snapshot, item, item.quantity),
        ),
      );
    }

    this.refs.listingControls.emptyButton.setAttribute(
      'aria-pressed',
      this.draftListingItemTypeId ? 'false' : 'true',
    );

    const visibleItemTypeIds = new Set(shelf.sellItems.map((item) => item.itemTypeId));
    const draftItem = shelf.sellItems.find(
      (item) => item.itemTypeId === this.draftListingItemTypeId,
    );

    this.setText(
      this.refs.listingControls.selectedItem,
      draftItem ? getItemDisplay(snapshot, draftItem, draftItem.quantity).label : 'none',
    );
    setResourceColor(this.refs.listingControls.selectedItem, draftItem?.kind);

    const canPlace = Boolean(draftItem) && this.lastPlayerShopSnapshot.connected;
    this.refs.listingControls.placeButton.disabled = !canPlace;
    this.refs.listingControls.placeButton.setAttribute(
      'aria-disabled',
      canPlace ? 'false' : 'true',
    );
    setNotificationBadge(this.refs.listingControls.placeButton, false);

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
      this.setText(label, `${display.label} `);
      setItemIconLabel(label, item.kind, item.key);
      setResourceColor(label, item.kind);
      this.setText(quantity, `(${display.quantity})`);
      button.disabled = !actionVisible;
      button.setAttribute('aria-disabled', actionVisible ? 'false' : 'true');
      button.setAttribute(
        'aria-pressed',
        this.draftListingItemTypeId === item.itemTypeId ? 'true' : 'false',
      );
      setNotificationBadge(button, actionVisible && item.quantity > 0);
    }
  }

  renderProceeds() {
    const proceedsGold = this.lastPlayerShopSnapshot.proceedsGold ?? 0;
    const button = this.refs.proceedsButton;

    if (proceedsGold <= 0) {
      button.hidden = true;
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      setNotificationBadge(button, false);
      return;
    }

    button.hidden = false;
    setResourceIconText(button, `claim (${formatGoldPriceText(proceedsGold)})`);
    setResourceColorFromText(button, button.textContent);
    button.disabled = !this.lastPlayerShopSnapshot.connected;
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
    setNotificationBadge(button, !button.disabled);
  }

  renderMarketRows() {
    this.renderMarketBrowseTabs();
    const rows = this.selectedMarketBrowseTab === 'selling'
      ? this.lastPlayerShopSnapshot.listings ?? []
      : [];
    const rowKeys = new Set(rows.map((listing) => listing.listingKey));
    const groupKeys = new Set(rows.map((listing) => this.getMarketSellerKey(listing)));

    for (const [listingKey, row] of this.refs.marketRowByListingKey) {
      if (!rowKeys.has(listingKey)) {
        row.row.remove();
        this.refs.marketRowByListingKey.delete(listingKey);
      }
    }

    for (const [sellerKey, group] of this.refs.marketGroupBySellerKey) {
      if (!groupKeys.has(sellerKey)) {
        group.root.remove();
        this.refs.marketGroupBySellerKey.delete(sellerKey);
      }
    }

    if (!this.lastPlayerShopSnapshot.connected) {
      this.setMarketMessage('offline');
      return;
    }

    if (rows.length === 0) {
      this.setMarketMessage(this.selectedMarketBrowseTab === 'buying' ? 'no buy requests' : 'empty');
      return;
    }

    this.setMarketMessage('');
    const groups = this.groupMarketListings(rows);
    let previousGroupNode = this.refs.marketMessage;

    for (const group of groups) {
      const groupNode = this.ensureMarketGroup(group);
      const desiredNext = previousGroupNode.nextSibling;

      if (groupNode.root !== desiredNext) {
        this.refs.marketRows.insertBefore(groupNode.root, desiredNext);
      }

      this.renderMarketGroupRows(groupNode, group.listings);
      previousGroupNode = groupNode.root;
    }
  }

  renderMarketBrowseTabs() {
    if (!this.refs.marketBrowseTabs) {
      return;
    }

    for (const tab of MARKET_BROWSE_TABS) {
      const button = this.refs.marketBrowseTabButtons.get(tab.id);
      const selected = this.selectedMarketBrowseTab === tab.id;
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }
  }

  renderMarketGroupRows(group, listings) {
    let previousRowNode = null;

    for (const listing of listings) {
      const row = this.ensureMarketRow(listing);
      const desiredNext = previousRowNode
        ? previousRowNode.nextSibling
        : group.list.firstChild;

      if (row.row.parentElement !== group.list || row.row !== desiredNext) {
        group.list.insertBefore(row.row, desiredNext);
      }

      this.renderMarketRow(row, listing);
      previousRowNode = row.row;
    }
  }

  ensureMarketGroup(group) {
    let groupNode = this.refs.marketGroupBySellerKey.get(group.sellerKey);

    if (!groupNode) {
      groupNode = this.createMarketGroup();
      this.refs.marketGroupBySellerKey.set(group.sellerKey, groupNode);
    }

    groupNode.name.replaceChildren(
      createPlayerInfoLink(
        {
          identity: group.sellerIdentity,
          username: group.username,
        },
        {
          onOpenPlayerInfo: this.onOpenPlayerInfo,
          text: group.username,
          className: 'shop-page__market-seller-link',
        },
      ),
    );

    return groupNode;
  }

  createMarketGroup() {
    const root = document.createElement('section');
    root.className = 'shop-page__market-seller';

    const name = document.createElement('div');
    name.className = 'shop-page__market-seller-name';

    const list = document.createElement('div');
    list.className = 'shop-page__market-seller-list';

    root.append(name, list);
    return { root, name, list };
  }

  ensureMarketRow(listing) {
    let row = this.refs.marketRowByListingKey.get(listing.listingKey);

    if (!row) {
      row = this.createMarketRow();
      this.refs.marketRowByListingKey.set(listing.listingKey, row);
    }

    return row;
  }

  createMarketRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__market-row';

    const label = document.createElement('span');
    label.className = 'row_key';

    const controls = document.createElement('span');
    controls.className = 'row_val shop-page__market-row-controls';

    let rowState = null;
    const quantityField = createAmountSelectionRow({
      ariaLabel: 'buy quantity',
      className: 'shop-page__market-amount-field',
      inputClassName: 'shop-page__market-quantity-input',
      stepClassName: 'shop-page__market-quantity-step',
      valueClassName: 'shop-page__market-quantity-value',
      onInput: () => {
        if (row._marketListing && rowState) {
          this.onMarketQuantityInput(rowState, row._marketListing);
        }
      },
      onStep: (delta) => {
        if (row._marketListing && rowState) {
          this.onMarketQuantityStep(rowState, row._marketListing, delta);
        }
      },
    });

    const button = document.createElement('button');
    button.className = 'style-button shop-page__market-buy-button';
    button.type = 'button';

    controls.append(quantityField.field, button);
    row.append(label, controls);

    rowState = { row, label, quantityField, quantityInput: quantityField.input, button };
    row._marketRow = rowState;
    return rowState;
  }

  renderMarketRow(row, listing) {
    const quantity = Math.max(0, Math.floor(Number(listing.quantity) || 0));
    const label = `- ${listing.itemLabel} (${quantity})`;

    if (row.label.textContent !== label) {
      appendTextWithSeedIcons(row.label, label);
    }
    setResourceColor(row.label, listing.itemKind);

    row.row._marketListing = listing;
    row.quantityInput.max = String(Math.max(1, quantity));

    if (document.activeElement !== row.quantityInput) {
      const currentQuantity = this.clampListingQuantity(row.quantityInput.value, quantity) || 1;
      row.quantityField.setValue(currentQuantity);
    }

    this.renderMarketRowBuyState(row, listing);
  }

  renderMarketRowBuyState(row, listing) {
    const quantity = this.clampListingQuantity(row.quantityInput.value, listing.quantity);
    const totalPriceGold = quantity
      ? multiplyGoldPrice(listing.priceGold, quantity)
      : listing.priceGold;
    const label = `buy (${formatGoldPriceText(totalPriceGold)})`;
    const disabled =
      !quantity ||
      totalPriceGold === null ||
      (this.lastGameplaySnapshot?.gold?.current ?? 0) < totalPriceGold;

    if (row.button.textContent !== label) {
      setResourceIconText(row.button, label);
      setResourceColorFromText(row.button, label);
    }

    row.button.disabled = disabled;
    row.button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    setNotificationBadge(row.button, !disabled);
    row.button.onclick = () => this.onBuyListing(listing, row.quantityInput.value);

    const currentQuantity = quantity ?? 1;
    for (const [delta, stepButton] of row.quantityField.stepButtons) {
      const nextQuantity = this.clampSteppedListingQuantity(
        currentQuantity + delta,
        listing.quantity,
      );
      const stepDisabled = !nextQuantity || nextQuantity === currentQuantity;
      stepButton.disabled = stepDisabled;
      stepButton.setAttribute('aria-disabled', stepDisabled ? 'true' : 'false');
    }
  }

  hasAffordableMarketListing() {
    if (!this.lastPlayerShopSnapshot.connected) {
      return false;
    }

    const gold = this.lastGameplaySnapshot?.gold?.current ?? 0;
    return (this.lastPlayerShopSnapshot.listings ?? []).some(
      (listing) => gold >= (listing.priceGold ?? Infinity),
    );
  }

  groupMarketListings(rows) {
    const groups = new Map();

    for (const listing of rows) {
      const sellerKey = this.getMarketSellerKey(listing);
      let group = groups.get(sellerKey);

      if (!group) {
        group = {
          sellerKey,
          username: listing.username || 'wizard',
          sellerIdentity: listing.sellerIdentity,
          listings: [],
        };
        groups.set(sellerKey, group);
      }

      group.listings.push(listing);
    }

    return [...groups.values()];
  }

  getMarketSellerKey(listing) {
    return listing.sellerIdentity || listing.username || 'unknown';
  }

  setMarketMessage(message) {
    if (!this.refs.marketMessage) {
      return;
    }

    this.refs.marketMessage.hidden = !message;

    if (this.refs.marketMessage.textContent !== message) {
      this.refs.marketMessage.textContent = message;
    }
  }

  clampListingQuantity(value, maxQuantity) {
    const parsed = this.readPositiveInteger(value);
    const max = Math.max(0, Math.floor(Number(maxQuantity) || 0));

    if (!parsed || max <= 0) {
      return null;
    }

    return Math.min(parsed, max);
  }

  clampSteppedListingQuantity(value, maxQuantity) {
    const integer = Math.floor(Number(value));
    const max = Math.max(0, Math.floor(Number(maxQuantity) || 0));

    if (!Number.isInteger(integer) || max <= 0) {
      return null;
    }

    return Math.min(Math.max(1, integer), max);
  }

  ensureRows(rowCount) {
    while (this.refs.rows.length < rowCount) {
      const row = this.createSlotRow(this.refs.rows.length + 1);
      this.refs.rows.push(row);
      this.root.insertBefore(row.row, this.refs.actions);
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
      button.addEventListener('click', () => this.onSelectListingItem(item.itemTypeId));

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

  prepareListingDraft(selectedSlot) {
    this.draftListingSlotNumber = selectedSlot?.slotNumber ?? null;
    this.draftListingItemTypeId = selectedSlot?.itemTypeId ?? null;

    if (this.refs.quantityInput) {
      this.refs.quantityInput.value = String(selectedSlot?.quantity || 1);
    }

    if (this.refs.priceInput) {
      this.refs.priceInput.value = formatGoldPrice(selectedSlot?.priceGold || 1);
    }

    this.setListingStatus('');
  }

  formatPlayerSlotValue(slot, shelf, snapshot) {
    const parts = this.getPlayerSlotParts(slot, shelf, snapshot);
    return [parts.itemText, parts.priceText].filter(Boolean).join(' ');
  }

  getPlayerSlotParts(slot, shelf, snapshot) {
    if (!slot.itemLabel) {
      return { itemText: '', itemKind: null, priceText: '' };
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

    return {
      itemKey: displayItem.key,
      itemText: `${display.label} (${display.quantity})`,
      itemKind: displayItem.kind,
      priceText: formatGoldPriceText(slot.priceGold),
    };
  }

  applyPlayerSlotItemColor(element, parts) {
    if (parts.itemKind === 'seed' || parts.itemKind === 'herb') {
      setResourceColor(element, parts.itemKind);
      return;
    }

    setResourceColorFromText(element, parts.itemText);
  }

  readPositiveInteger(value) {
    const parsed = Math.floor(Number(value));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  setListingStatus(status) {
    if (this.refs.listingControls?.status) {
      setResourceIconText(this.refs.listingControls.status, status);
    }
  }

  setMarketStatus(status) {
    if (this.refs.marketStatus) {
      setResourceIconText(this.refs.marketStatus, status);
    }
  }

  setText(node, value) {
    if (node && node.textContent !== value) {
      node.textContent = value;
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
