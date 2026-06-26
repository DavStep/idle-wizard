const INVENTORY_ICON_URLS = Object.freeze({
  herbs: new URL('../../assets/icons/icon-herb-box.png', import.meta.url).href,
  potions: new URL('../../assets/icons/icon-potion-box.png', import.meta.url).href,
  seeds: new URL('../../assets/icons/icon-seed-box.png', import.meta.url).href,
});

export class RoomInventoryButtonManager {
  constructor({ className = '', buttons = [], onOpenInventory = null } = {}) {
    this.className = className;
    this.buttons = buttons;
    this.onOpenInventory = onOpenInventory;
    this.root = null;
    this.buttonRefs = new Map();
  }

  mount(parent) {
    if (!parent) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = ['room-inventory-buttons', this.className]
      .filter(Boolean)
      .join(' ');
    this.root.setAttribute('aria-label', 'inventory');

    for (const button of this.buttons) {
      this.root.append(this.createButton(button));
    }

    parent.append(this.root);
    return this.root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
    this.buttonRefs.clear();
  }

  createButton({ tabId, label, icon, className = '', side = 'left' }) {
    const root = document.createElement('section');
    root.className = ['room-inventory-panel-button', className]
      .filter(Boolean)
      .join(' ');
    root.dataset.panelSide = side;
    root.setAttribute('aria-label', label);

    const button = document.createElement('button');
    button.className = 'room-inventory-panel-button__open';
    button.type = 'button';
    button.dataset.inventoryTab = tabId;
    button.title = `open ${label}`;
    button.setAttribute('aria-label', `open ${label}`);
    button.setAttribute('aria-expanded', 'false');

    const portrait = document.createElement('span');
    portrait.className = 'room-inventory-panel-button__portrait';
    portrait.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.className = 'room-inventory-panel-button__icon';
    image.src = INVENTORY_ICON_URLS[icon] ?? '';
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.setAttribute('aria-hidden', 'true');

    const labelElement = document.createElement('span');
    labelElement.className = 'room-inventory-panel-button__label';
    labelElement.textContent = label;

    portrait.append(image);
    button.append(portrait, labelElement);
    button.addEventListener('click', () => this.onOpenInventory?.(tabId));
    root.append(button);
    this.buttonRefs.set(tabId, { root, button });
    return root;
  }

  setActiveTab(tabId = null) {
    for (const [candidateTabId, refs] of this.buttonRefs.entries()) {
      const active = candidateTabId === tabId;
      refs.root.classList.toggle('is-active', active);
      refs.button.setAttribute('aria-expanded', active ? 'true' : 'false');
    }
  }
}
