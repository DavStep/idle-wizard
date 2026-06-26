import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { createPlayerInfoLink } from '../../shared/playerInfoLink.js';
import { formatCoinPriceText } from '../../../shared/coinPrice.js';

const DISCOVERY_TABS = [
  { id: 'seeds', label: 'seeds' },
  { id: 'herbs', label: 'herbs' },
  { id: 'potions', label: 'potions' },
];

export class WorkshopDiscoveriesManager {
  constructor({ gameplayFacade, onOpenPlayerInfo } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.onOpenPlayerInfo = onOpenPlayerInfo;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'potions';
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.previousFocus = null;
    this.handleRootClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
    };
  }

  mount(parent, popupParent = parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__discoveries';

    this.refs.button = this.createButton();
    this.refs.popup = this.createPopup();

    this.root.append(this.refs.button);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__discoveries-button';
    button.type = 'button';
    button.textContent = 'discoveries';
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__discoveries-popup';
    popup.addEventListener('click', this.handleRootClick);

    const panel = document.createElement('section');
    panel.className = 'workshop-page__discoveries-panel';
    panel.setAttribute('aria-label', 'Discoveries');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__discoveries-dialog style-dialog';

    this.refs.dialog = panel;
    this.refs.title = this.createTitle();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__discoveries-rows';
    this.refs.detail = document.createElement('div');
    this.refs.detail.className = 'workshop-page__discovery-detail';
    this.refs.tabs = this.createTabs();

    dialog.append(this.refs.title, this.refs.rows, this.refs.detail);
    panel.append(dialog, this.refs.tabs);
    popup.append(panel);
    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'discoveries';
    return title;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__discoveries-tabs';
    tabs.setAttribute('aria-label', 'Discovery type');
    tabs.setAttribute('role', 'tablist');

    this.refs.tabButtons = new Map();

    for (const tab of DISCOVERY_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__discoveries-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.id));
      this.refs.tabButtons.set(tab.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  onSelectTab(tabId) {
    if (this.selectedTabId === tabId) {
      return;
    }

    this.selectedTabId = tabId;
    this.renderedSignature = '';
    this.render(this.lastSnapshot);
  }

  show() {
    if (!this.isButtonAvailable()) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
  }

  isButtonAvailable() {
    return (
      this.root &&
      !this.root.hidden &&
      this.refs.button?.disabled !== true &&
      this.refs.button?.getAttribute('aria-disabled') !== 'true'
    );
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handleRootClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'potions';
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    this.updateTabs();
    this.refs.rows.classList.toggle('is-potion-list', this.selectedTabId === 'potions');

    const signature = this.createRenderSignature(this.lastSnapshot);
    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;

    if (this.selectedTabId === 'potions') {
      this.renderPotionRows(this.lastSnapshot);
      return;
    }

    this.refs.rows.replaceChildren(this.createEmptyRow());
    this.refs.detail.replaceChildren();
  }

  updateTabs() {
    for (const tab of DISCOVERY_TABS) {
      const selected = this.selectedTabId === tab.id;
      const button = this.refs.tabButtons?.get(tab.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }
  }

  renderPotionRows(snapshot) {
    const potions = snapshot.discoveries?.potions ?? [];

    if (!potions.length) {
      this.refs.rows.replaceChildren(this.createEmptyRow());
      this.refs.detail.replaceChildren();
      return;
    }

    this.refs.rows.replaceChildren(this.createPotionDiscoveryBox(potions));
    this.refs.detail.replaceChildren();
  }

  createPotionDiscoveryBox(potions = []) {
    const box = document.createElement('section');
    box.className = 'workshop-page__discovery-potion-box style-box';
    box.setAttribute('aria-label', 'potion discoveries');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'potion discoveries';

    box.append(
      title,
      ...potions.map((potion) => this.createPotionDiscoveryRow(potion)),
    );
    return box;
  }

  createPotionDiscoveryRow(potion) {
    const row = document.createElement('div');
    row.className = 'workshop-page__discovery-potion-row research-page__row';
    row.classList.toggle('is-unavailable', !potion.discovered);

    const key = document.createElement('span');
    key.className =
      'row_key workshop-page__discovery-potion-label research-page__research-label';

    const name = document.createElement('span');
    name.className =
      'workshop-page__discovery-potion-name research-page__research-name';
    this.setPotionRecipeName(name, potion);
    key.append(name);

    const val = potion.discovered
      ? this.createRoyaltyValue(potion)
      : this.createUndiscoveredValue();

    row.append(key, val);
    return row;
  }

  setPotionRecipeName(element, potion) {
    if (!potion.discovered) {
      element.textContent = 'unknown potion';
      setItemIconLabel(element, 'potion', 'unknownPotion');
      return;
    }

    element.textContent = potion.label;
    setItemIconLabel(element, 'potion', potion.key);
    element.append(
      ': discovered by ',
      createPlayerInfoLink(
        {
          identity: potion.discoveredByIdentity,
          username: potion.discoveredByUsername || 'wizard',
        },
        {
          onOpenPlayerInfo: this.onOpenPlayerInfo,
          text: potion.discoveredByUsername || 'wizard',
          className: 'workshop-page__discovery-player-link',
        },
      ),
    );
  }

  createRoyaltyValue(potion) {
    const value = document.createElement('span');
    value.className =
      'row_val workshop-page__discovery-royalties research-page__research-value';
    const royaltyCoin = Number(potion.royaltyCoin);
    setResourceIconText(
      value,
      `royalties ${formatCoinPriceText(Number.isFinite(royaltyCoin) ? royaltyCoin : 0)}`,
    );
    return value;
  }

  createUndiscoveredValue() {
    const value = document.createElement('span');
    value.className =
      'row_val workshop-page__discovery-royalties research-page__research-value';
    value.textContent = 'unowned';
    return value;
  }

  createEmptyRow() {
    const row = document.createElement('div');
    row.className = 'workshop-page__discoveries-empty';
    row.textContent = 'empty';
    return row;
  }

  createRenderSignature(snapshot) {
    const potions = snapshot.discoveries?.potions ?? [];
    const potionSignature = potions
      .map(
        (potion) => {
          const ingredientsSignature = (potion.ingredients ?? [])
            .map(
              (ingredient) =>
                `${ingredient.key}:${ingredient.label}:${ingredient.quantity ?? 1}`,
            )
            .join(',');
          return [
            potion.key,
            potion.discovered,
            potion.discoveredByUsername,
            potion.discoveredByIdentity,
            potion.royaltyCoin,
            ingredientsSignature,
          ].join(':');
        },
      )
      .join('|');

    return `${this.selectedTabId}:${potionSignature}`;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
