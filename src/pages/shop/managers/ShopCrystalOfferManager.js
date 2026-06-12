export const CRYSTAL_OFFERS = [
  {
    crystalCount: 1,
    bundleLabel: '1 crystal',
    priceLabel: '$4.99',
  },
  {
    crystalCount: 2,
    bundleLabel: '2 crystals',
    priceLabel: '$8.99',
  },
  {
    crystalCount: 5,
    bundleLabel: '5 crystals',
    priceLabel: '$19.99',
  },
  {
    crystalCount: 10,
    bundleLabel: '10 crystals',
    priceLabel: '$36.99',
  },
  {
    crystalCount: 20,
    bundleLabel: '20 crystals',
    priceLabel: '$69.99',
  },
  {
    crystalCount: 50,
    bundleLabel: '50 crystals',
    priceLabel: '$159.99',
  },
];

const SUPPORT_UNAVAILABLE_MESSAGE =
  'thank you for trying to support the project but the transactions are not yet available <3';

export class ShopCrystalOfferManager {
  constructor({ offers = CRYSTAL_OFFERS } = {}) {
    this.offers = offers;
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hideSupportPopup();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hideSupportPopup();
    };
  }

  mount(parent, popupParent = parent) {
    if (!parent) {
      throw new Error('ShopCrystalOfferManager requires a parent element.');
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'shop-page__crystal-offers style-box';
    this.root.setAttribute('aria-label', 'Crystal offers');
    this.root.append(this.createTitle(), this.createHeader(), this.createRows());
    this.refs.popup = this.createSupportPopup();
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);
    this.applySupportPopupVisibility();

    return this.root;
  }

  unmount() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'crystals';
    return title;
  }

  createHeader() {
    const row = document.createElement('div');
    row.className = 'shop-page__crystal-row shop-page__crystal-row--header';

    const bundle = document.createElement('span');
    bundle.textContent = 'bundle';

    const price = document.createElement('span');
    price.textContent = 'price';

    row.append(bundle, price);
    return row;
  }

  createRows() {
    const rows = document.createElement('div');
    rows.className = 'shop-page__crystal-rows';
    rows.setAttribute('role', 'list');

    for (const offer of this.offers) {
      rows.append(this.createOfferRow(offer));
    }

    return rows;
  }

  createOfferRow(offer) {
    const row = document.createElement('div');
    row.className = 'shop-page__crystal-row';
    row.setAttribute('role', 'listitem');
    row.setAttribute(
      'aria-label',
      `${offer.bundleLabel}, ${offer.priceLabel}`,
    );
    row.dataset.crystalCount = String(offer.crystalCount);

    const bundle = document.createElement('span');
    bundle.className = 'shop-page__crystal-bundle';
    bundle.textContent = offer.bundleLabel;

    const price = document.createElement('button');
    price.className = 'shop-page__crystal-price';
    price.type = 'button';
    price.textContent = offer.priceLabel;
    price.setAttribute(
      'aria-label',
      `try to buy ${offer.bundleLabel} for ${offer.priceLabel}`,
    );
    price.addEventListener('click', () => this.showSupportPopup());

    row.append(bundle, price);
    return row;
  }

  createSupportPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__crystal-support-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__crystal-support-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Crystal support unavailable');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'support';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button shop-page__crystal-support-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hideSupportPopup());

    const message = document.createElement('p');
    message.className = 'shop-page__crystal-support-message';
    message.textContent = SUPPORT_UNAVAILABLE_MESSAGE;

    dialog.append(title, closeButton, message);
    popup.append(dialog);
    this.refs.dialog = dialog;

    return popup;
  }

  showSupportPopup() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applySupportPopupVisibility();
    this.refs.dialog?.focus();
  }

  hideSupportPopup() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applySupportPopupVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  applySupportPopupVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
