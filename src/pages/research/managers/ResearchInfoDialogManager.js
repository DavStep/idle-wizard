export class ResearchInfoDialogManager {
  constructor() {
    this.refs = {};
    this.currentResearch = null;
    this.visible = false;
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

    this.refs.popup = this.createPopup();
    parent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);
    this.render();
    this.applyVisibility();

    return this.refs.popup;
  }

  unmount() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handlePopupClick);
    this.refs.popup?.remove();
    this.refs = {};
    this.currentResearch = null;
    this.visible = false;
    this.previousFocus = null;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'research-page__info-popup';
    popup.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'research-page__info-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Research information');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'research';

    const body = document.createElement('p');
    body.className = 'research-page__info-copy';

    dialog.append(title, body);
    popup.append(dialog);
    this.refs.dialog = dialog;
    this.refs.title = title;
    this.refs.body = body;

    return popup;
  }

  show(research) {
    this.currentResearch = research;
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.render();
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

  render() {
    if (!this.refs.title || !this.refs.body) {
      return;
    }

    const label = this.currentResearch?.label ?? 'research';
    this.refs.title.textContent = label;
    this.refs.body.textContent = this.getDescription(this.currentResearch);
    this.refs.dialog?.setAttribute('aria-label', `${label} research information`);
  }

  getDescription(research) {
    if (!research) {
      return '';
    }

    if (typeof research.description === 'string' && research.description.trim()) {
      return research.description;
    }

    if (research.id?.startsWith('unlockSeed:')) {
      return `allows ${research.label} to drop from summon seed.`;
    }

    if (research.id?.startsWith('unlockRecipe:')) {
      return `allows valid cauldron ingredients to brew ${research.label}.`;
    }

    return `${research.label} records this study as complete.`;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
