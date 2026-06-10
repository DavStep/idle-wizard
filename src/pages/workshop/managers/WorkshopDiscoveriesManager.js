import { MYSTERY_TEXT_LABEL } from '../../shared/mysteryText.js';

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
    this.refs.rows.classList.toggle('is-recipe-list', this.selectedTabId === 'potions');

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

    this.refs.rows.replaceChildren(
      ...potions.map((potion) => this.createPotionRecipeRow(potion)),
    );
    this.refs.detail.replaceChildren();
  }

  createPotionRecipeRow(potion) {
    const row = document.createElement('div');
    row.className = 'workshop-page__discovery-recipe-row brewing-page__recipe-row';
    row.classList.toggle('is-unknown', !potion.discovered);

    const main = document.createElement('div');
    main.className = 'brewing-page__recipe-main';

    const key = document.createElement('span');
    key.className = 'row_key brewing-page__recipe-name';
    key.textContent = potion.discovered
      ? `${potion.label}: discovered by ${potion.discoveredByUsername || 'wizard'}`
      : 'unknown potion';

    if (potion.discovered) {
      main.append(key);
    } else {
      const val = document.createElement('span');
      val.className = 'row_val workshop-page__discovery-byline';
      val.textContent = 'unowned';
      main.append(key, val);
    }
    row.append(
      main,
      this.createIngredientsList(potion.ingredients, { masked: !potion.discovered }),
      this.createRecipeMeta(potion),
    );
    return row;
  }

  createIngredientsList(ingredients = [], { masked = false } = {}) {
    const root = document.createElement('div');
    root.className = 'brewing-page__recipe-ingredients';

    const title = document.createElement('div');
    title.className = 'brewing-page__recipe-ingredients-title';
    title.textContent = 'ingredients:';
    root.append(title);

    if (!ingredients.length) {
      const empty = document.createElement('div');
      empty.className = 'brewing-page__recipe-ingredient-row';
      empty.textContent = masked ? `- 0 ${MYSTERY_TEXT_LABEL}` : 'none';
      root.append(empty);
      return root;
    }

    root.append(
      ...ingredients.map((ingredient) => this.createIngredientRow(ingredient, { masked })),
    );

    return root;
  }

  createIngredientRow(ingredient, { masked = false } = {}) {
    const row = document.createElement('div');
    row.className = 'brewing-page__recipe-ingredient-row';

    if (masked) {
      row.classList.add('is-unknown');
    }

    const quantity = Number.isFinite(ingredient.quantity) ? ingredient.quantity : 1;
    row.textContent = `- ${Math.max(1, quantity)} ${
      masked ? MYSTERY_TEXT_LABEL : ingredient.label
    }`;
    return row;
  }

  createRecipeMeta(potion) {
    const meta = document.createElement('div');
    meta.className = 'brewing-page__recipe-meta';

    const cost = document.createElement('span');
    cost.className = 'brewing-page__recipe-cost';
    cost.textContent =
      potion.discovered && Number.isFinite(potion.manaCost)
        ? `cost ${potion.manaCost} mana`
        : 'cost ? mana';

    const duration = document.createElement('span');
    duration.className = 'brewing-page__recipe-duration';
    duration.textContent = `time: ${
      potion.discovered ? this.formatDuration(potion.brewDurationMs) : '?s'
    }`;

    meta.append(cost, duration);
    return meta;
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
            potion.manaCost,
            potion.brewDurationMs,
            ingredientsSignature,
          ].join(':');
        },
      )
      .join('|');

    return `${this.selectedTabId}:${potionSignature}`;
  }

  formatDuration(durationMs) {
    if (!Number.isFinite(durationMs)) {
      return '?s';
    }

    return `${Math.ceil(durationMs / 1_000)}s`;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
