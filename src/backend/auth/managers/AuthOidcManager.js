import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const DEFAULT_AUTHORITY = 'https://auth.spacetimedb.com/oidc';
const DEFAULT_SCOPE = 'openid profile email';

export class AuthOidcManager {
  constructor({
    authority = import.meta.env.VITE_SPACETIME_AUTH_AUTHORITY ?? DEFAULT_AUTHORITY,
    clientId = import.meta.env.VITE_SPACETIME_AUTH_CLIENT_ID,
    redirectUri = import.meta.env.VITE_SPACETIME_AUTH_REDIRECT_URI,
    postLogoutRedirectUri = import.meta.env.VITE_SPACETIME_AUTH_POST_LOGOUT_REDIRECT_URI,
    basePath = import.meta.env.BASE_URL ?? '/',
    storage = globalThis.localStorage,
    windowRef = globalThis.window,
    createUserManager = (settings) => new UserManager(settings),
  } = {}) {
    this.authority = authority;
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.postLogoutRedirectUri = postLogoutRedirectUri;
    this.basePath = basePath;
    this.storage = storage;
    this.windowRef = windowRef;
    this.createUserManager = createUserManager;
    this.userManager = null;
    this.user = null;
    this.error = null;
    this.listeners = new Set();
  }

  isEnabled() {
    return Boolean(this.clientId && this.windowRef);
  }

  async prepare() {
    if (!this.isEnabled()) {
      this.publish();
      return this.getSnapshot();
    }

    const manager = this.getUserManager();
    await this.handleCallbackUrl(manager);
    if (!this.error) {
      this.user = this.user ?? (await manager.getUser());
    }
    this.publish();
    return this.getSnapshot();
  }

  async getConnectionToken() {
    if (!this.isEnabled()) {
      return undefined;
    }

    this.user = this.user ?? (await this.getUserManager().getUser());
    return this.user?.id_token ?? this.user?.access_token;
  }

  async signIn() {
    if (!this.isEnabled()) {
      return { ok: false, reason: 'disabled' };
    }

    await this.getUserManager().signinRedirect();
    return { ok: true };
  }

  async signOut() {
    if (!this.isEnabled()) {
      return { ok: false, reason: 'disabled' };
    }

    await this.getUserManager().removeUser();
    this.user = null;
    this.error = null;
    this.publish();
    return { ok: true };
  }

  getSnapshot() {
    return {
      enabled: this.isEnabled(),
      authenticated: Boolean(this.user),
      displayName: this.getDisplayName(),
      email: this.user?.profile?.email ?? '',
      error: this.error,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  publish() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  getDisplayName() {
    const profile = this.user?.profile;
    return (
      profile?.preferred_username ??
      profile?.name ??
      profile?.email ??
      ''
    );
  }

  async handleCallbackUrl(manager) {
    const location = this.windowRef.location;
    const params = new URLSearchParams(location.search);
    if (!params.has('state') || (!params.has('code') && !params.has('error'))) {
      return;
    }

    try {
      this.user = await manager.signinCallback(location.href);
      this.cleanCallbackUrl();
    } catch (error) {
      this.error = error?.message ?? String(error);
    }
  }

  cleanCallbackUrl() {
    const { history, location } = this.windowRef;
    if (!history?.replaceState) {
      return;
    }

    history.replaceState(
      {},
      this.windowRef.document?.title ?? '',
      location.pathname + location.hash,
    );
  }

  getUserManager() {
    if (this.userManager) {
      return this.userManager;
    }

    const appUrl = this.getAppUrl();
    this.userManager = this.createUserManager({
      authority: this.authority,
      client_id: this.clientId,
      redirect_uri: this.redirectUri ?? appUrl,
      post_logout_redirect_uri: this.postLogoutRedirectUri ?? appUrl,
      response_type: 'code',
      scope: DEFAULT_SCOPE,
      automaticSilentRenew: true,
      redirectMethod: 'replace',
      userStore: new WebStorageStateStore({
        prefix: 'idle-wizard.oidc.',
        store: this.storage,
      }),
    });

    return this.userManager;
  }

  getAppUrl() {
    return new URL(this.basePath, this.windowRef.location.origin).toString();
  }
}
