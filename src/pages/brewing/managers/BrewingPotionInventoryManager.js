import {
  getItemDisplay,
  isItemResearched,
} from '../../shared/itemResearchStatus.js';
import { applyMysteryText } from '../../shared/mysteryText.js';

export class BrewingPotionInventoryManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.renderedSignature = null;
    this.handlePopupClick = (event) => {
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

    this.root = this.createOpenButton();
    this.refs.popup = this.createPopup();
    parent.append(this.root);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.refs.popup?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.renderedSignature = null;
  }

  createOpenButton() {
    const button = document.createElement('button');
    button.className = 'style-button brewing-page__potions-button';
    button.type = 'button';
    button.textContent = 'potions';
    button.setAttribute('aria-label', 'open potions');
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'brewing-page__potions-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'brewing-page__potions-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Potions');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'potions';

    const closeButton = document.createElement('button');
    closeButton.className = 'style-button brewing-page__potions-close';
    closeButton.type = 'button';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => this.hide());

    const rows = document.createElement('div');
    rows.className = 'brewing-page__potion-list';

    dialog.append(title, closeButton, rows);
    popup.append(dialog);
    this.refs.dialog = dialog;
    this.refs.rows = rows;
    return popup;
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

  render(snapshot) {
    if (!this.root) {
      return;
    }

    const potions = this.getPotionRows(snapshot);
    const signature = this.createRenderSignature(potions);

    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;

    if (potions.length === 0) {
      this.refs.rows.replaceChildren(this.createEmptyRow());
      return;
    }

    this.refs.rows.replaceChildren(
      ...potions.map((potion) => this.createPotionRow(snapshot, potion)),
    );
  }

  getPotionRows(snapshot) {
    const ownedPotions = (snapshot.inventory ?? []).filter((item) => item.kind === 'potion');
    const ownedByKey = new Map(ownedPotions.map((potion) => [potion.key, potion]));
    const recipeRows = (snapshot.brewing?.recipes ?? [])
      .map((recipe) => {
        const owned = ownedByKey.get(recipe.key);

        return {
          itemTypeId: recipe.potionTypeId,
          key: recipe.key,
          label: recipe.label,
          kind: 'potion',
          quantity: owned?.quantity ?? 0,
          researched: Boolean(recipe.unlocked),
        };
      })
      .filter((potion) => potion.researched || potion.quantity > 0);
    const recipeKeys = new Set(recipeRows.map((potion) => potion.key));
    const extraOwnedRows = ownedPotions
      .filter((potion) => !recipeKeys.has(potion.key))
      .map((potion) => ({
        ...potion,
        researched: isItemResearched(snapshot, potion),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));

    return [...recipeRows, ...extraOwnedRows];
  }

  createRenderSignature(potions) {
    if (potions.length === 0) {
      return 'empty';
    }

    return potions
      .map(
        (potion) =>
          `${potion.itemTypeId}:${potion.key}:${potion.label}:${potion.quantity}:${potion.researched}`,
      )
      .join('|');
  }

  createPotionRow(snapshot, potion) {
    const display = getItemDisplay(snapshot, potion, potion.quantity);
    const row = document.createElement('div');
    row.className = 'brewing-page__potion-row';
    row.classList.toggle('is-empty', potion.quantity <= 0);
    row.classList.toggle('is-locked', display.locked);
    row.classList.toggle('is-unknown', display.unknown);

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = display.label;
    applyMysteryText(label, potion, display.unknown);

    const quantity = document.createElement('span');
    quantity.className = 'row_val';
    quantity.textContent = display.quantity;

    row.append(label, quantity);
    return row;
  }

  createEmptyRow() {
    const row = document.createElement('div');
    row.className = 'brewing-page__potion-empty';
    row.textContent = 'no potions';
    return row;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
