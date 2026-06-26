export class BrewingRecipeChoiceDialogManager {
  constructor({ onClearRecipe, onChooseAnother } = {}) {
    this.onClearRecipe = onClearRecipe;
    this.onChooseAnother = onChooseAnother;
    this.refs = {};
    this.visible = false;
    this.cauldronIndex = 0;
    this.previousFocus = null;
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

  mount(parent) {
    if (this.refs.popup) {
      return this.refs.popup;
    }

    const popup = document.createElement('section');
    popup.className = 'brewing-page__recipe-choice-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'brewing-page__recipe-choice-dialog style-dialog';
    dialog.setAttribute('aria-label', 'selected recipe');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'selected recipe';

    const clearButton = document.createElement('button');
    clearButton.className = 'style-button brewing-page__recipe-choice-button';
    clearButton.type = 'button';
    clearButton.textContent = 'clear recipe';
    clearButton.addEventListener('click', () => {
      const cauldronIndex = this.cauldronIndex;
      this.hide();
      this.onClearRecipe?.(cauldronIndex);
    });

    const chooseButton = document.createElement('button');
    chooseButton.className = 'style-button brewing-page__recipe-choice-button';
    chooseButton.type = 'button';
    chooseButton.textContent = 'choose another recipe';
    chooseButton.addEventListener('click', () => {
      const cauldronIndex = this.cauldronIndex;
      this.hide();
      this.onChooseAnother?.(cauldronIndex);
    });

    dialog.append(title, clearButton, chooseButton);
    popup.append(dialog);
    parent.append(popup);
    document.addEventListener('keydown', this.handleKeydown);
    this.refs = { popup, dialog, clearButton, chooseButton };
    this.applyVisibility();
    return popup;
  }

  unmount() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.refs.popup?.remove();
    this.refs = {};
    this.visible = false;
    this.cauldronIndex = 0;
    this.previousFocus = null;
  }

  show(cauldronIndex = 0) {
    this.cauldronIndex = this.normalizeCauldronIndex(cauldronIndex);
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

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  normalizeCauldronIndex(cauldronIndex) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    return Number.isInteger(safeCauldronIndex) && safeCauldronIndex >= 0
      ? safeCauldronIndex
      : 0;
  }
}
