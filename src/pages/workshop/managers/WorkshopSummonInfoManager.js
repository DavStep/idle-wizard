import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import { setResourceColor } from '../../shared/resourceColor.js';

export class WorkshopSummonInfoManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.lastSnapshot = {};
    this.renderedSignature = null;
    this.previousFocus = null;
    this.handleRootClick = (event) => {
      if (event.target === this.root) {
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

    this.root = document.createElement('section');
    this.root.className = 'workshop-page__summon-info-popup';
    this.root.addEventListener('click', this.handleRootClick);

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__summon-info-dialog style-dialog';
    this.refs.dialog.setAttribute('aria-label', 'Seed drop chances');
    this.refs.dialog.setAttribute('aria-modal', 'true');
    this.refs.dialog.setAttribute('role', 'dialog');
    this.refs.dialog.tabIndex = -1;

    this.refs.title = this.createTitle();
    this.refs.closeButton = this.createCloseButton();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__summon-info-rows';

    this.refs.dialog.append(this.refs.title, this.refs.closeButton, this.refs.rows);
    this.root.append(this.refs.dialog);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'drop chances';
    return title;
  }

  createCloseButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__summon-info-close';
    button.type = 'button';
    button.textContent = 'close';
    button.addEventListener('click', () => this.hide());
    return button;
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.render(this.lastSnapshot);
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
    this.root?.removeEventListener('click', this.handleRootClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.lastSnapshot = {};
    this.renderedSignature = null;
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    const rows = this.getRows(this.lastSnapshot);
    const signature = rows
      .map((row) => `${row.itemTypeId}:${row.key}:${row.label}:${row.dropChance}`)
      .join('|');

    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;
    this.refs.rows.replaceChildren(
      ...(rows.length ? rows.map((row) => this.createRow(row)) : [this.createEmptyRow()]),
    );
  }

  getRows(snapshot) {
    return Array.isArray(snapshot?.seedSummoning?.dropChances)
      ? snapshot.seedSummoning.dropChances
      : [];
  }

  createRow(seed) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row workshop-page__summon-info-row';
    setResourceColor(row, 'seed');

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = seed.label;
    setItemIconLabel(key, 'seed', seed.key);

    const value = document.createElement('span');
    value.className = 'row_val workshop-page__summon-info-value';
    value.textContent = this.formatDropChance(seed.dropChance);

    row.append(key, value);
    return row;
  }

  createEmptyRow() {
    const row = document.createElement('div');
    row.className = 'workshop-page__summon-info-empty';
    row.textContent = 'no seeds researched';
    return row;
  }

  formatDropChance(dropChance) {
    const percent = Number(dropChance) * 100;

    if (!Number.isFinite(percent) || percent <= 0) {
      return '0%';
    }

    const precision = percent < 10 ? 2 : 1;
    return `${Number(percent.toFixed(precision))}%`;
  }

  applyVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden = !this.visible;
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
