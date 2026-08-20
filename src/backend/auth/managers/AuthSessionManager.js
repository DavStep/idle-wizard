export class AuthSessionManager {
  constructor({
    tokenStorageManager,
    oidcManager = null,
    hasPendingAccountLinkSave = () => false,
  }) {
    this.tokenStorageManager = tokenStorageManager;
    this.oidcManager = oidcManager;
    this.hasPendingAccountLinkSave = hasPendingAccountLinkSave;
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
    const storedAuth =
      (await this.tokenStorageManager.loadConnectionAuth?.()) ?? {
        token: this.tokenStorageManager.loadToken(),
        fallbackTokens: [],
      };

    if (oidcToken) {
      const auth = {
        token: oidcToken,
        canRetryWithoutToken: false,
      };
      const fallbackTokens = this.hasPendingAccountLinkSave()
        ? []
        : this.uniqueTokens([
            storedAuth.token,
            ...(storedAuth.fallbackTokens ?? []),
          ]).filter((token) => token !== oidcToken);

      if (fallbackTokens.length > 0) {
        auth.fallbackTokens = fallbackTokens;
      }

      return auth;
    }

    const fallbackTokens = storedAuth.fallbackTokens ?? [];
    const rememberedAccount =
      this.oidcManager?.getSnapshot?.()?.remembered === true;
    const auth = {
      token: storedAuth.token,
      canRetryWithoutToken: Boolean(storedAuth.token) && !rememberedAccount,
    };

    if (fallbackTokens.length > 0) {
      auth.fallbackTokens = fallbackTokens;
    }

    return auth;
  }

  uniqueTokens(tokens) {
    return Array.from(
      new Set(tokens.map((token) => String(token ?? '').trim()).filter(Boolean)),
    );
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

  async tryRestoreConnectedAccount() {
    const result =
      (await this.oidcManager?.tryRestoreConnectedAccount?.()) ?? {
        ok: false,
        reason: 'disabled',
      };
    return {
      ...result,
      snapshot: this.getSnapshot(),
    };
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
    const oidcSnapshot = {
      enabled: false,
      authenticated: false,
      remembered: false,
      displayName: '',
      email: '',
      error: null,
      ...(this.oidcManager?.getSnapshot?.() ?? {}),
    };

    return {
      hasToken: Boolean(this.tokenStorageManager.loadToken()) || oidcSnapshot.authenticated,
      identity: this.identity,
      oidc: oidcSnapshot,
    };
  }
}
