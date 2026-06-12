import { updateScrollCueState } from '../../managers/ScrollCueManager.js';

export class WorkshopLogDialogManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.lastEntrySignature = null;
    this.handleRootClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleRowsScroll = () => this.updateScrollProgress();
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
    this.root.className = 'workshop-page__logs';

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
    button.className = 'style-button workshop-page__logs-button';
    button.type = 'button';
    button.textContent = 'logs';
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__logs-popup';
    popup.addEventListener('click', this.handleRootClick);

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__logs-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Logs');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    this.refs.dialog = dialog;
    this.refs.title = this.createTitle();
    this.refs.frame = document.createElement('div');
    this.refs.frame.className = 'workshop-page__logs-frame';
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__logs-rows';
    this.refs.rows.addEventListener('scroll', this.handleRowsScroll);
    this.refs.progress = document.createElement('div');
    this.refs.progress.className = 'style-progress workshop-page__logs-progress';
    this.refs.progress.setAttribute('aria-hidden', 'true');
    this.refs.progressFill = document.createElement('div');
    this.refs.progressFill.className =
      'style-progress__fill workshop-page__logs-progress-fill';
    this.refs.progress.append(this.refs.progressFill);
    this.refs.frame.append(this.refs.rows);
    dialog.append(this.refs.title, this.refs.frame, this.refs.progress);
    popup.append(dialog);

    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'logs';
    return title;
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
    this.scrollToTop();
    this.updateScrollProgress();
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
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.lastEntrySignature = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    const entries = Array.isArray(snapshot?.logs?.entries) ? snapshot.logs.entries : [];
    const entrySignature = entries.map((entry) => `${entry.id}:${entry.message}`).join('|');

    if (entrySignature === this.lastEntrySignature) {
      this.updateScrollProgress();
      return;
    }

    this.lastEntrySignature = entrySignature;

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__logs-empty';
      empty.textContent = 'no logs yet';
      this.refs.rows.replaceChildren(empty);
      this.scrollToTop();
      this.updateScrollProgress();
      return;
    }

    const previousScrollTop = this.refs.rows.scrollTop;
    const previousScrollHeight = this.refs.rows.scrollHeight;
    const shouldPinToTop = !this.visible || this.isAtTop();
    const newestFirstEntries = [...entries].sort((left, right) =>
      this.compareNewestFirst(left, right),
    );

    this.refs.rows.replaceChildren(...newestFirstEntries.map((entry) => this.createEntry(entry)));

    if (shouldPinToTop) {
      this.scrollToTop();
    } else {
      this.preserveScrollPosition(previousScrollTop, previousScrollHeight);
    }

    this.updateScrollProgress();
  }

  compareNewestFirst(left, right) {
    const leftCreatedAt = Number.isFinite(left.createdAt) ? left.createdAt : 0;
    const rightCreatedAt = Number.isFinite(right.createdAt) ? right.createdAt : 0;

    if (rightCreatedAt !== leftCreatedAt) {
      return rightCreatedAt - leftCreatedAt;
    }

    return (right.id ?? 0) - (left.id ?? 0);
  }

  createEntry(entry) {
    const row = document.createElement('div');
    row.className = 'workshop-page__log-entry';
    row.textContent = entry.message;
    return row;
  }

  scrollToTop() {
    if (!this.refs.rows) {
      return;
    }

    this.refs.rows.scrollTop = 0;
  }

  isAtTop() {
    return !this.refs.rows || this.refs.rows.scrollTop <= 1;
  }

  preserveScrollPosition(previousScrollTop, previousScrollHeight) {
    if (!this.refs.rows) {
      return;
    }

    const heightDelta = this.refs.rows.scrollHeight - previousScrollHeight;
    this.refs.rows.scrollTop = previousScrollTop + Math.max(heightDelta, 0);
  }

  updateScrollProgress() {
    updateScrollCueState({
      scrollElement: this.refs.rows,
      cueElement: this.refs.frame,
      progressFill: this.refs.progressFill,
      inlineCue: false,
    });
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
