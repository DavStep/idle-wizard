export class TopPanelAuthManager {
  constructor({ authFacade, reload = () => window.location.reload() } = {}) {
    this.authFacade = authFacade;
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

    await this.authFacade.signInWithGoogle();
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
    section.hidden = !oidc.enabled;
    button.disabled = !oidc.enabled;
    button.textContent = this.authenticated ? 'logout' : 'login with google';
    button.setAttribute(
      'aria-label',
      this.authenticated ? 'logout from google' : 'login with google',
    );

    const statusText = this.getStatusText(oidc);
    if (status.textContent !== statusText) {
      status.textContent = statusText;
    }
  }

  getStatusText(oidc) {
    if (oidc.error) {
      return 'login error';
    }

    if (oidc.authenticated) {
      return oidc.displayName || oidc.email || 'connected';
    }

    return 'guest';
  }
}
