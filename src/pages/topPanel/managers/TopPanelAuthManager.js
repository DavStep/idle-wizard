export class TopPanelAuthManager {
  constructor({ authFacade, gameplayFacade, reload = () => window.location.reload() } = {}) {
    this.authFacade = authFacade;
    this.gameplayFacade = gameplayFacade;
    this.reload = reload;
    this.refs = null;
    this.unsubscribe = null;
    this.authenticated = false;
    this.handleClick = () => this.onClick();
  }

  mount(refs) {
    this.refs = refs;
    if (!this.refs?.authButton || !this.authFacade) {
      this.render({ oidc: { enabled: false } });
      return;
    }

    this.refs.authButton.addEventListener('click', this.handleClick);
    this.unsubscribe = this.authFacade.subscribe((snapshot) => this.render(snapshot));
  }

  unmount() {
    this.refs?.authButton?.removeEventListener('click', this.handleClick);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.refs = null;
  }

  async onClick() {
    if (!this.authFacade) {
      return;
    }

    if (this.authenticated) {
      await this.authFacade.signOut();
      this.reload();
      return;
    }

    await this.authFacade.signInWithGoogle({
      pendingGameplaySave: this.gameplayFacade?.createPersistenceSave?.(),
    });
  }

  render(snapshot) {
    const section = this.refs?.authSection;
    const button = this.refs?.authButton;
    const status = this.refs?.authStatus;
    if (!section || !button || !status) {
      return;
    }

    const oidc = snapshot?.oidc ?? {};
    this.authenticated = Boolean(oidc.authenticated);

    if (!this.authenticated && oidc.disabledReason === 'native') {
      section.remove();
      return;
    }

    section.hidden = false;
    button.disabled = !oidc.enabled;
    button.textContent = this.authenticated ? 'disconnect account' : 'connect account';
    button.setAttribute(
      'aria-label',
      this.authenticated ? 'disconnect google account' : 'connect google account',
    );

    const statusText = this.getStatusText(oidc);
    if (status.textContent !== statusText) {
      status.textContent = statusText;
    }
  }

  getStatusText(oidc) {
    if (oidc.cancelled) {
      return 'login cancelled';
    }

    if (oidc.error) {
      return `login error: ${this.getErrorText(oidc.error)}`;
    }

    if (oidc.authenticated) {
      return oidc.displayName || oidc.email || 'connected';
    }

    if (!oidc.enabled) {
      return 'login unavailable';
    }

    return 'not connected';
  }

  getErrorText(error) {
    return String(error).replace(/\s+/g, ' ').trim();
  }
}
