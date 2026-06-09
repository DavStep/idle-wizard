export class TopPanelUsernameEditManager {
  constructor({ playerFacade } = {}) {
    this.playerFacade = playerFacade;
    this.refs = null;
    this.unsubscribe = null;
    this.visible = false;
    this.previousFocus = null;
    this.handleUsernameClick = () => this.show();
    this.handleCancelClick = () => this.hide();
    this.handleOverlayClick = (event) => {
      if (event.target === this.refs?.usernameEditor) {
        this.hide();
      }
    };
    this.handleSubmit = (event) => {
      event.preventDefault();
      this.save();
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
    };
  }

  mount(refs) {
    this.refs = refs;
    this.refs.usernameButton.addEventListener('click', this.handleUsernameClick);
    this.refs.usernameCancelButton.addEventListener('click', this.handleCancelClick);
    this.refs.usernameEditor.addEventListener('click', this.handleOverlayClick);
    this.refs.usernameForm.addEventListener('submit', this.handleSubmit);
    document.addEventListener('keydown', this.handleKeydown);

    if (this.playerFacade) {
      this.unsubscribe = this.playerFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.playerFacade.getSnapshot());
    }

    this.applyVisibility();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.refs) {
      this.refs.usernameButton.removeEventListener('click', this.handleUsernameClick);
      this.refs.usernameCancelButton.removeEventListener('click', this.handleCancelClick);
      this.refs.usernameEditor.removeEventListener('click', this.handleOverlayClick);
      this.refs.usernameForm.removeEventListener('submit', this.handleSubmit);
    }

    document.removeEventListener('keydown', this.handleKeydown);
    this.refs = null;
    this.visible = false;
    this.previousFocus = null;
  }

  show() {
    if (!this.refs) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.refs.usernameInput.value = this.refs.usernameButton.textContent;
    this.applyVisibility();
    this.refs.usernameInput.focus();
    this.refs.usernameInput.select();
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

  save() {
    const username = this.refs.usernameInput.value;
    this.playerFacade?.setUsername(username);
    this.hide();
  }

  render(snapshot) {
    if (!this.refs || !snapshot) {
      return;
    }

    this.refs.usernameButton.textContent = snapshot.username;
  }

  applyVisibility() {
    if (!this.refs) {
      return;
    }

    this.refs.usernameEditor.hidden = !this.visible;
    this.refs.usernameEditor.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
