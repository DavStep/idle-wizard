export class AuthSessionManager {
  constructor({ tokenStorageManager, oidcManager = null }) {
    this.tokenStorageManager = tokenStorageManager;
    this.oidcManager = oidcManager;
    this.identity = undefined;
  }

  async prepare() {
    await this.oidcManager?.prepare();
    return this.getSnapshot();
  }

  stop() {
    this.oidcManager?.stop?.();
  }

  async getConnectionToken() {
    return (await this.getConnectionAuth()).token;
  }

  async getConnectionAuth() {
    const oidcToken = await this.oidcManager?.getConnectionToken();
    if (oidcToken) {
      return {
        token: oidcToken,
        canRetryWithoutToken: false,
      };
    }

    const storedToken = this.tokenStorageManager.loadToken();
    return {
      token: storedToken,
      canRetryWithoutToken: Boolean(storedToken),
    };
  }

  acceptConnection({ identity, token }) {
    this.identity = identity;
    this.tokenStorageManager.saveToken(token);
  }

  clearSession() {
    this.identity = undefined;
    this.tokenStorageManager.clearToken();
  }

  async signInWithGoogle(options) {
    return this.oidcManager?.signIn(options) ?? { ok: false, reason: 'disabled' };
  }

  async signOut() {
    await this.oidcManager?.signOut();
    this.clearSession();
    return { ok: true };
  }

  getAccountLinkAttemptId() {
    return this.oidcManager?.getAccountLinkAttemptId?.() ?? null;
  }

  subscribe(listener) {
    if (!this.oidcManager?.subscribe) {
      listener(this.getSnapshot());
      return () => {};
    }

    return this.oidcManager.subscribe(() => listener(this.getSnapshot()));
  }

  getSnapshot() {
    const oidcSnapshot = this.oidcManager?.getSnapshot?.() ?? {
      enabled: false,
      authenticated: false,
      displayName: '',
      email: '',
      error: null,
    };

    return {
      hasToken: Boolean(this.tokenStorageManager.loadToken()) || oidcSnapshot.authenticated,
      identity: this.identity,
      oidc: oidcSnapshot,
    };
  }
}
