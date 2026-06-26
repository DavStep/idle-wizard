const BACKDROP_CLICK_DEDUPE_RESET_MS = 500;

export class GardenCancelDialogManager {
  constructor({ onConfirm } = {}) {
    this.onConfirm = onConfirm;
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.tileNumber = null;
    this.previousFocus = null;
    this.suppressedBackdropClick = false;
    this.suppressedBackdropClickReset = null;
    this.handlePopupClick = (event) => {
      if (event.target === this.root) {
        if (this.suppressedBackdropClick) {
          event.preventDefault();
          event.stopPropagation();
          this.clearSuppressedBackdropClick();
          return;
        }

        this.hide();
      }
    };
    this.handleKeydown = (event) => this.onKeydown(event);
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'garden-page__cancel-popup';
    this.root.addEventListener('click', this.handlePopupClick);

    const dialog = document.createElement('section');
    dialog.className = 'garden-page__cancel-dialog style-dialog';
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.id = 'garden-cancel-dialog-title';
    title.textContent = 'cancel progress?';
    dialog.setAttribute('aria-labelledby', title.id);

    const message = document.createElement('p');
    message.className = 'garden-page__cancel-message';

    const actions = document.createElement('div');
    actions.className = 'garden-page__cancel-actions';

    const keepButton = document.createElement('button');
    keepButton.className = 'style-button garden-page__cancel-keep';
    keepButton.type = 'button';
    keepButton.textContent = 'keep';
    keepButton.addEventListener('click', () => this.hide());

    const confirmButton = document.createElement('button');
    confirmButton.className = 'style-button garden-page__cancel-confirm';
    confirmButton.type = 'button';
    confirmButton.textContent = 'empty';
    confirmButton.addEventListener('click', () => this.confirm());

    actions.append(keepButton, confirmButton);
    dialog.append(title, message, actions);
    this.root.append(dialog);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    this.refs = {
      dialog,
      message,
      keepButton,
      confirmButton,
    };
    this.applyVisibility();

    return this.root;
  }

  unmount() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.removeEventListener('click', this.handlePopupClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.tileNumber = null;
    this.previousFocus = null;
    this.clearSuppressedBackdropClick();
  }

  show(tile, { suppressNextBackdropClick = false } = {}) {
    if (!tile?.process) {
      return;
    }

    this.tileNumber = tile.tileNumber;
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.updateContent(tile);
    this.applyVisibility();
    if (suppressNextBackdropClick) {
      this.suppressNextBackdropClick();
    }
    this.refs.keepButton?.focus();
  }

  sync(snapshot) {
    if (!this.visible || !this.tileNumber) {
      return;
    }

    const tile = snapshot.garden?.plot?.tiles.find(
      (candidate) => candidate.tileNumber === this.tileNumber,
    );

    if (!tile?.process) {
      this.hide({ restoreFocus: false });
      return;
    }

    this.updateContent(tile);
  }

  hide({ restoreFocus = true } = {}) {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (restoreFocus && wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.tileNumber = null;
    this.previousFocus = null;
    this.clearSuppressedBackdropClick();
  }

  confirm() {
    if (!this.tileNumber) {
      return;
    }

    this.onConfirm?.(this.tileNumber);
    this.hide({ restoreFocus: false });
  }

  updateContent(tile) {
    const seedLabel = tile.seedLabel ?? tile.selectedSeedLabel ?? 'seed';
    const message = `are you sure you want to empty plot ${tile.tileNumber}? ${seedLabel} will be returned.`;

    if (this.refs.message && this.refs.message.textContent !== message) {
      this.refs.message.textContent = message;
    }

    this.refs.dialog?.setAttribute(
      'aria-label',
      `Cancel ${seedLabel} on plot ${tile.tileNumber}`,
    );
  }

  applyVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden = !this.visible;
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  onKeydown(event) {
    if (!this.visible) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
      return;
    }

    if (event.key === 'Tab') {
      this.trapDialogTab(event);
    }
  }

  trapDialogTab(event) {
    const focusable = [this.refs.keepButton, this.refs.confirmButton].filter(
      (button) => button && !button.disabled,
    );

    if (focusable.length === 0) {
      event.preventDefault();
      this.refs.dialog?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!this.refs.dialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  suppressNextBackdropClick() {
    this.clearSuppressedBackdropClick();
    this.suppressedBackdropClick = true;
    this.suppressedBackdropClickReset = globalThis.setTimeout(() => {
      this.suppressedBackdropClick = false;
      this.suppressedBackdropClickReset = null;
    }, BACKDROP_CLICK_DEDUPE_RESET_MS);
    this.suppressedBackdropClickReset?.unref?.();
  }

  clearSuppressedBackdropClick() {
    if (this.suppressedBackdropClickReset !== null) {
      globalThis.clearTimeout(this.suppressedBackdropClickReset);
      this.suppressedBackdropClickReset = null;
    }

    this.suppressedBackdropClick = false;
  }
}
