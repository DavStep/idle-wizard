import { getItemDisplay } from '../../shared/itemResearchStatus.js';

const DISCOVERY_TABS = [
  { id: 'seeds', label: 'seeds' },
  { id: 'herbs', label: 'herbs' },
  { id: 'potions', label: 'potions' },
];

export class WorkshopDiscoveriesManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'potions';
    this.selectedPotionKey = null;
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

  mount(parent) {
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

    this.root.append(this.refs.button, this.refs.popup);
    parent.append(this.root);
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
    this.selectedPotionKey = null;
    this.renderedSignature = '';
    this.render(this.lastSnapshot);
  }

  onSelectPotion(potionKey) {
    this.selectedPotionKey = this.selectedPotionKey === potionKey ? null : potionKey;
    this.renderedSignature = '';
    this.render(this.lastSnapshot);
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
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
    this.selectedPotionKey = null;
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
    const selectedPotion = potions.find(
      (potion) => potion.key === this.selectedPotionKey && potion.discovered,
    );

    if (!potions.length) {
      this.refs.rows.replaceChildren(this.createEmptyRow());
      this.refs.detail.replaceChildren();
      return;
    }

    this.refs.rows.replaceChildren(...potions.map((potion) => this.createPotionRow(snapshot, potion)));
    this.refs.detail.replaceChildren(
      ...(selectedPotion ? [this.createPotionDetail(selectedPotion)] : []),
    );
  }

  createPotionRow(snapshot, potion) {
    const display = getItemDisplay(snapshot, potion, potion.quantity);
    const row = document.createElement(potion.discovered ? 'button' : 'div');
    row.className = 'workshop-page__row workshop-page__discovery-row';
    row.classList.toggle('is-unknown', !potion.discovered);
    row.classList.toggle('is-discovered', potion.discovered);
    row.classList.toggle('is-selected', potion.key === this.selectedPotionKey);

    if (potion.discovered) {
      row.type = 'button';
      row.addEventListener('click', () => this.onSelectPotion(potion.key));
      row.setAttribute('aria-label', `show ${potion.label} recipe`);
    }

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = potion.discovered ? potion.label : display.label;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = potion.discovered
      ? `by ${potion.discoveredByUsername || 'wizard'}`
      : 'unowned';

    row.append(key, val);
    return row;
  }

  createPotionDetail(potion) {
    const detail = document.createElement('section');
    detail.className = 'workshop-page__discovery-recipe';

    detail.append(
      this.createDetailRow('date', this.formatDate(potion.discoveredAtMs)),
      this.createDetailRow('recipe', ''),
      ...this.createIngredientRows(potion.ingredients),
    );

    return detail;
  }

  createIngredientRows(ingredients = []) {
    if (!ingredients.length) {
      return [this.createDetailText('none')];
    }

    return ingredients.map((ingredient) => {
      const quantity = Number.isFinite(ingredient.quantity) ? ingredient.quantity : 1;
      return this.createDetailText(`- ${Math.max(1, quantity)} ${ingredient.label}`);
    });
  }

  createDetailRow(label, value) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__discovery-detail-row';

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = label;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = value;

    row.append(key, val);
    return row;
  }

  createDetailText(text) {
    const row = document.createElement('div');
    row.className = 'workshop-page__discovery-ingredient-row';
    row.textContent = text;
    return row;
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
        (potion) =>
          `${potion.key}:${potion.discovered}:${potion.discoveredByUsername}:${potion.discoveredAtMs}`,
      )
      .join('|');

    return `${this.selectedTabId}:${this.selectedPotionKey ?? ''}:${potionSignature}`;
  }

  formatDate(timestampMs) {
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
      return 'unknown';
    }

    return new Date(timestampMs).toISOString().slice(0, 10);
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
