import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { App as CapacitorApp } from '@capacitor/app';

const DEFAULT_AUTHORITY = 'https://auth.spacetimedb.com/oidc';
const DEFAULT_SCOPE = 'openid profile email';
const DEFAULT_MOBILE_REDIRECT_URI = 'com.idlewizard.game://auth/callback';

export class AuthOidcManager {
  constructor({
    authority = import.meta.env.VITE_SPACETIME_AUTH_AUTHORITY ?? DEFAULT_AUTHORITY,
    clientId = import.meta.env.VITE_SPACETIME_AUTH_CLIENT_ID,
    redirectUri = import.meta.env.VITE_SPACETIME_AUTH_REDIRECT_URI,
    postLogoutRedirectUri = import.meta.env.VITE_SPACETIME_AUTH_POST_LOGOUT_REDIRECT_URI,
    mobileRedirectUri = import.meta.env.VITE_SPACETIME_AUTH_MOBILE_REDIRECT_URI ??
      DEFAULT_MOBILE_REDIRECT_URI,
    basePath = import.meta.env.BASE_URL ?? '/',
    storage = globalThis.localStorage,
    windowRef = globalThis.window,
    capacitor = globalThis.Capacitor,
    appPlugin = CapacitorApp,
    createUserManager = (settings) => new UserManager(settings),
  } = {}) {
    this.authority = authority;
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.postLogoutRedirectUri = postLogoutRedirectUri;
    this.mobileRedirectUri = mobileRedirectUri;
    this.basePath = basePath;
    this.storage = storage;
    this.windowRef = windowRef;
    this.capacitor = capacitor;
    this.appPlugin = appPlugin;
    this.createUserManager = createUserManager;
    this.userManager = null;
    this.user = null;
    this.error = null;
    this.urlOpenListener = null;
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
    this.watchNativeCallbackUrls();
    await this.handleNativeLaunchUrl(manager);
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

    this.error = null;
    this.publish();

    try {
      await this.getUserManager().signinRedirect();
      return { ok: true };
    } catch (error) {
      this.error = error?.message ?? String(error);
      this.publish();
      return { ok: false, reason: 'redirect_failed' };
    }
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
    const handled = await this.handleCallbackHref(manager, location.href);
    if (handled) {
      this.cleanCallbackUrl();
    }
  }

  async handleNativeLaunchUrl(manager) {
    if (!this.isNativePlatform() || !this.appPlugin?.getLaunchUrl) {
      return;
    }

    const launchUrl = await this.appPlugin.getLaunchUrl();
    await this.handleCallbackHref(manager, launchUrl?.url);
  }

  watchNativeCallbackUrls() {
    if (
      this.urlOpenListener ||
      !this.isNativePlatform() ||
      !this.appPlugin?.addListener
    ) {
      return;
    }

    this.urlOpenListener = this.appPlugin.addListener('appUrlOpen', (event) => {
      void this.handleNativeCallbackUrl(event?.url);
    });
  }

  async handleNativeCallbackUrl(url) {
    const manager = this.getUserManager();
    const handled = await this.handleCallbackHref(manager, url);
    if (handled && !this.error) {
      this.user = this.user ?? (await manager.getUser());
    }
    this.publish();
  }

  async handleCallbackHref(manager, href) {
    if (!href) {
      return false;
    }

    const params = this.getCallbackParams(href);
    if (!params?.has('state') || (!params.has('code') && !params.has('error'))) {
      return false;
    }

    try {
      this.user = await manager.signinCallback(href);
    } catch (error) {
      this.error = error?.message ?? String(error);
    }

    return true;
  }

  getCallbackParams(href) {
    try {
      return new URL(href).searchParams;
    } catch {
      return null;
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
    const redirectUri = this.getRedirectUri(appUrl);
    const postLogoutRedirectUri = this.getPostLogoutRedirectUri(appUrl);
    this.userManager = this.createUserManager({
      authority: this.authority,
      client_id: this.clientId,
      redirect_uri: redirectUri,
      post_logout_redirect_uri: postLogoutRedirectUri,
      response_type: 'code',
      scope: DEFAULT_SCOPE,
      automaticSilentRenew: true,
      redirectMethod: 'replace',
      stateStore: new WebStorageStateStore({
        prefix: 'idle-wizard.oidc.state.',
        store: this.storage,
      }),
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

  getRedirectUri(appUrl) {
    return this.redirectUri ?? (this.isNativePlatform() ? this.mobileRedirectUri : appUrl);
  }

  getPostLogoutRedirectUri(appUrl) {
    return this.postLogoutRedirectUri ?? this.getRedirectUri(appUrl);
  }

  isNativePlatform() {
    const getPlatform = this.capacitor?.getPlatform;
    if (typeof getPlatform === 'function') {
      return ['android', 'ios'].includes(getPlatform());
    }

    const isNativePlatform = this.capacitor?.isNativePlatform;
    return typeof isNativePlatform === 'function' && isNativePlatform();
  }
}
