export class TopPanelAuthManager {
  constructor({ authFacade, gameplayFacade, reload = () => window.location.reload() } = {}) {
    this.authFacade = authFacade;
    this.gameplayFacade = gameplayFacade;
    this.reload = reload;
    this.refs = null;
    this.unsubscribe = null;
    this.authenticated = false;
    this.busy = false;
    this.statusOverride = null;
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
    if (!this.authFacade || this.busy) {
      return;
    }

    this.setBusy(true, this.authenticated ? 'Disconnecting' : 'Connecting');
    if (this.authenticated) {
      try {
        await this.authFacade.signOut();
        this.reload();
      } catch (error) {
        this.setStatusOverride(`Login Error: ${this.getErrorText(error)}`);
        this.setBusy(false);
      }
      return;
    }

    try {
      const result = await this.authFacade.signInWithGoogle({
        pendingGameplaySave: this.gameplayFacade?.createPersistenceSave?.(),
      });

      if (result?.ok && result.reloadRequired) {
        this.reload();
        return;
      }

      if (result?.ok === false) {
        this.setStatusOverride(this.getResultStatusText(result));
      } else {
        this.statusOverride = null;
      }
    } catch (error) {
      this.setStatusOverride(`Login Error: ${this.getErrorText(error)}`);
    } finally {
      this.setBusy(false);
    }
  }

  render(snapshot) {
    const section = this.refs?.authSection;
    const button = this.refs?.authButton;
    const status = this.refs?.authStatus;
    if (!section || !button || !status) {
      return;
    }

    const oidc = snapshot?.oidc ?? {};
    const rememberedConnected = Boolean(snapshot?.hasToken && oidc.remembered);
    this.authenticated = Boolean(oidc.authenticated || rememberedConnected);
    if (!this.busy && (this.authenticated || oidc.error || oidc.cancelled)) {
      this.statusOverride = null;
    }

    if (!this.authenticated && oidc.disabledReason === 'native') {
      section.remove();
      return;
    }

    section.hidden = false;
    button.disabled = this.busy || !oidc.enabled;
    button.textContent =
      this.statusOverride && this.busy
        ? this.statusOverride
        : this.authenticated
          ? 'Disconnect Account'
          : 'Connect Account';
    button.setAttribute(
      'aria-label',
      this.authenticated ? 'disconnect google account' : 'connect google account',
    );

    const statusText = this.statusOverride ?? this.getStatusText(snapshot);
    if (status.textContent !== statusText) {
      status.textContent = statusText;
    }
  }

  getStatusText(snapshot = {}) {
    const oidc = snapshot?.oidc ?? {};
    if (oidc.cancelled) {
      return 'Login Cancelled';
    }

    if (oidc.error) {
      return this.getLoginErrorStatusText(oidc.error);
    }

    if (oidc.authenticated) {
      return oidc.displayName || oidc.email || 'Connected';
    }

    if (snapshot?.hasToken && oidc.remembered) {
      return oidc.displayName || oidc.email || 'Connected';
    }

    if (!oidc.enabled) {
      return 'Login Unavailable';
    }

    return 'Not Connected';
  }

  getErrorText(error) {
    return String(error).replace(/\s+/g, ' ').trim();
  }

  getResultStatusText(result = {}) {
    if (result.reason?.includes('cancelled')) {
      return 'Login Cancelled';
    }

    if (!result.message && this.isLoginUnavailableReason(result.reason)) {
      return 'Login Unavailable';
    }

    return this.getLoginErrorStatusText(
      result.message ?? result.reason ?? 'unknown error',
    );
  }

  getLoginErrorStatusText(error) {
    if (this.isLoginUnavailableReason(error)) {
      return 'Login Unavailable';
    }

    return `Login Error: ${this.getErrorText(error)}`;
  }

  isLoginUnavailableReason(reason) {
    return [
      'browser_not_supported',
      'invalid_client',
      'missing_client_id',
      'opt_out_or_no_session',
      'secure_http_required',
      'suppressed_by_user',
      'unregistered_origin',
      'unknown_reason',
      'web_unavailable',
    ].includes(String(reason ?? '').trim());
  }

  setBusy(busy, statusText = null) {
    this.busy = Boolean(busy);
    if (this.busy || statusText !== null) {
      this.statusOverride = statusText;
    }
    this.render(this.authFacade?.getSnapshot?.());
  }

  setStatusOverride(statusText) {
    this.statusOverride = statusText;
    this.render(this.authFacade?.getSnapshot?.());
  }
}
