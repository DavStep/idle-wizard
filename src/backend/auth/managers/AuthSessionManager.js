export class AuthSessionManager {
  constructor({ tokenStorageManager, oidcManager = null }) {
    this.tokenStorageManager = tokenStorageManager;
    this.oidcManager = oidcManager;
    this.identity = undefined;
  }

  async prepare() {
    await this.oidcManager?.prepare();
    await this.tokenStorageManager.loadConnectionAuth?.();
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

    const storedAuth =
      (await this.tokenStorageManager.loadConnectionAuth?.()) ?? {
        token: this.tokenStorageManager.loadToken(),
        fallbackTokens: [],
      };
    const fallbackTokens = storedAuth.fallbackTokens ?? [];
    const auth = {
      token: storedAuth.token,
      canRetryWithoutToken: Boolean(storedAuth.token),
    };

    if (fallbackTokens.length > 0) {
      auth.fallbackTokens = fallbackTokens;
    }

    return auth;
  }

  async acceptConnection({ identity, token }) {
    this.identity = identity;
    await this.tokenStorageManager.saveToken(token);
  }

  async clearSession() {
    this.identity = undefined;
    await this.tokenStorageManager.clearToken();
  }

  async signInWithGoogle(options) {
    return this.oidcManager?.signIn(options) ?? { ok: false, reason: 'disabled' };
  }

  async signOut() {
    await this.oidcManager?.signOut();
    await this.clearSession();
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
