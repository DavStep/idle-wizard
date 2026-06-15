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

    this.setBusy(true, this.authenticated ? 'disconnecting' : 'connecting');
    if (this.authenticated) {
      try {
        await this.authFacade.signOut();
        this.reload();
      } catch (error) {
        this.setStatusOverride(`login error: ${this.getErrorText(error)}`);
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
      this.setStatusOverride(`login error: ${this.getErrorText(error)}`);
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
    this.authenticated = Boolean(oidc.authenticated);
    if (!this.busy && (oidc.authenticated || oidc.error || oidc.cancelled)) {
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
          ? 'disconnect account'
          : 'connect account';
    button.setAttribute(
      'aria-label',
      this.authenticated ? 'disconnect google account' : 'connect google account',
    );

    const statusText = this.statusOverride ?? this.getStatusText(oidc);
    if (status.textContent !== statusText) {
      status.textContent = statusText;
    }
  }

  getStatusText(oidc) {
    if (oidc.cancelled) {
      return 'login cancelled';
    }

    if (oidc.error) {
      return this.getLoginErrorStatusText(oidc.error);
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

  getResultStatusText(result = {}) {
    if (result.reason?.includes('cancelled')) {
      return 'login cancelled';
    }

    if (!result.message && this.isLoginUnavailableReason(result.reason)) {
      return 'login unavailable';
    }

    return this.getLoginErrorStatusText(
      result.message ?? result.reason ?? 'unknown error',
    );
  }

  getLoginErrorStatusText(error) {
    if (this.isLoginUnavailableReason(error)) {
      return 'login unavailable';
    }

    return `login error: ${this.getErrorText(error)}`;
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
