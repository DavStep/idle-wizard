import {
  formatGoldPriceText,
  parsePositiveGoldPrice,
} from '../../../shared/goldPrice.js';
import { setResourceColorFromText } from '../../shared/resourceColor.js';

export class ShopPlayerRequestManager {
  constructor() {
    this.root = null;
    this.refs = {};
    this.request = null;
    this.visible = false;
    this.previousFocus = null;
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

    this.refs.row = this.createRequestRow();
    this.refs.actions = this.createActions();
    this.refs.popup = this.createPopup();

    this.root.append(title, this.refs.row.row, this.refs.actions);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);
    this.render();
    this.applyPopupVisibility();

    return this.root;
  }

  unmount() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.request = null;
    this.visible = false;
    this.previousFocus = null;
    this.handledPointerPlace = false;
  }

  createRequestRow() {
    const row = document.createElement('div');
    row.className = 'shop-page__player-request-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = 'request';

    const value = document.createElement('span');
    value.className = 'row_val';

    row.append(label, value);
    return { row, value };
  }

  createActions() {
    const actions = document.createElement('div');
    actions.className = 'shop-page__player-request-actions';

    this.refs.requestButton = document.createElement('button');
    this.refs.requestButton.className = 'style-button shop-page__player-request-button';
    this.refs.requestButton.type = 'button';
    this.refs.requestButton.textContent = 'request';
    this.refs.requestButton.addEventListener('click', () => this.showPopup());

    this.refs.clearButton = document.createElement('button');
    this.refs.clearButton.className = 'style-button shop-page__player-request-button';
    this.refs.clearButton.type = 'button';
    this.refs.clearButton.textContent = 'clear';
    this.refs.clearButton.addEventListener('click', () => this.clearRequest());

    actions.append(this.refs.requestButton, this.refs.clearButton);
    return actions;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__request-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__request-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Request player market item');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'request';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button shop-page__request-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hidePopup());

    this.refs.itemField = this.createTextField('item', 'Item requested');
    this.refs.quantityField = this.createNumberField('quantity', 'Request quantity');
    this.refs.goldField = this.createNumberField('gold each', 'Gold offered per item');
    this.refs.goldField.input.inputMode = 'decimal';
    this.refs.goldField.input.min = '0.01';
    this.refs.goldField.input.step = '0.01';

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
      this.refs.itemField.field,
      this.refs.quantityField.field,
      this.refs.goldField.field,
      actionRow,
      this.refs.status,
    );
    popup.append(dialog);
    this.refs.dialog = dialog;
    return popup;
  }

  createTextField(labelText, ariaLabel) {
    const field = document.createElement('label');
    field.className = 'shop-page__request-field';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

    const input = document.createElement('input');
    input.className = 'style-input shop-page__request-input';
    input.type = 'text';
    input.maxLength = 40;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', ariaLabel);
    input.addEventListener('input', () => this.setStatus(''));

    field.append(label, input);
    return { field, input };
  }

  createNumberField(labelText, ariaLabel) {
    const field = document.createElement('label');
    field.className = 'shop-page__request-field';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

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

  showPopup() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.prefillFields();
    this.setStatus('');
    this.applyPopupVisibility();
    this.refs.itemField?.input.focus({ preventScroll: true });
    this.refs.itemField?.input.select();
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
    if (!this.refs.itemField) {
      return;
    }

    this.refs.itemField.input.value = this.request?.itemLabel ?? '';
    this.refs.quantityField.input.value = this.request
      ? String(this.request.quantity)
      : '1';
    this.refs.goldField.input.value = this.request
      ? String(this.request.priceGold)
      : '1';
  }

  onPlaceRequest() {
    const itemLabel = this.refs.itemField?.input.value.trim();
    const quantity = this.readPositiveInteger(this.refs.quantityField?.input.value);
    const priceGold = parsePositiveGoldPrice(this.refs.goldField?.input.value);

    if (!itemLabel) {
      this.setStatus('bad item');
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

    this.request = {
      itemLabel,
      quantity,
      priceGold,
    };
    this.hidePopup();
    this.render();
  }

  clearRequest() {
    this.request = null;
    this.render();
  }

  render() {
    if (!this.refs.row) {
      return;
    }

    if (!this.request) {
      this.refs.row.value.textContent = 'none';
      this.refs.row.row.classList.add('is-empty');
      this.refs.requestButton.textContent = 'request';
      this.refs.clearButton.hidden = true;
      setResourceColorFromText(this.refs.row.value, this.refs.row.value.textContent);
      return;
    }

    const text = `${this.request.itemLabel} (${this.request.quantity}) ${formatGoldPriceText(
      this.request.priceGold,
    )}`;
    this.refs.row.value.textContent = text;
    this.refs.row.row.classList.remove('is-empty');
    this.refs.requestButton.textContent = 'change';
    this.refs.clearButton.hidden = false;
    setResourceColorFromText(this.refs.row.value, text);
  }

  setStatus(status) {
    if (!this.refs.status) {
      return;
    }

    this.refs.status.textContent = status;
    this.refs.status.hidden = !status;
    setResourceColorFromText(this.refs.status, status);
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
}
