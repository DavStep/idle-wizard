import { createStarLevelLabel, formatStarLevel } from '../../shared/starLevelLabel.js';

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
    const actionNoun = this.getActionNoun(this.currentResearch);
    this.refs.title.replaceChildren(
      ...this.createTitleParts(this.currentResearch, label),
    );
    this.refs.body.textContent = this.getCopy(this.currentResearch);
    this.refs.dialog?.setAttribute(
      'aria-label',
      `${this.formatAccessibleLabel(this.currentResearch, label)} ${actionNoun} information`,
    );
  }

  createTitleParts(research, fallbackLabel) {
    const starLevel = this.getResearchStarLevel(research);
    const label = research?.label ?? fallbackLabel;

    if (starLevel <= 0) {
      return [document.createTextNode(label)];
    }

    return [
      document.createTextNode(`${label} `),
      createStarLevelLabel(starLevel),
    ];
  }

  formatAccessibleLabel(research, fallbackLabel) {
    const starLevel = this.getResearchStarLevel(research);
    const label = research?.label ?? fallbackLabel;

    if (starLevel <= 0) {
      return label;
    }

    return `${label} ${formatStarLevel(starLevel).ariaLabel}`;
  }

  getResearchStarLevel(research) {
    const safeStarLevel = Math.floor(Number(research?.starLevel));
    return Number.isInteger(safeStarLevel) && safeStarLevel > 0 ? safeStarLevel : 0;
  }

  getCopy(research) {
    const parts = [this.getDescription(research), this.getLockReason(research)].filter(Boolean);
    return parts.join(' ');
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

  getActionNoun(research) {
    return research?.actionType === 'levelUp' ? 'level up' : 'research';
  }

  getLockReason(research) {
    if (typeof research?.lockReason !== 'string') {
      return '';
    }

    return research.lockReason.trim();
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
