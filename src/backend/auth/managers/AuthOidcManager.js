import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser as CapacitorBrowser } from '@capacitor/browser';
import { NativeGoogleAuthPlugin } from '../nativeGoogleAuthPlugin.js';

const DEFAULT_AUTHORITY = 'https://accounts.google.com';
const DEFAULT_SCOPE = 'openid profile email';
const DEFAULT_RESPONSE_TYPE = 'code';
const DEFAULT_MOBILE_REDIRECT_URI = 'https://davstep.github.io/idle-wizard/?native_auth=1';

export class AuthOidcManager {
  constructor({
    authority = import.meta.env.VITE_GOOGLE_AUTH_AUTHORITY ?? DEFAULT_AUTHORITY,
    clientId = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID,
    redirectUri = import.meta.env.VITE_GOOGLE_AUTH_REDIRECT_URI,
    postLogoutRedirectUri = import.meta.env.VITE_GOOGLE_AUTH_POST_LOGOUT_REDIRECT_URI,
    mobileRedirectUri = import.meta.env.VITE_GOOGLE_AUTH_MOBILE_REDIRECT_URI ??
      DEFAULT_MOBILE_REDIRECT_URI,
    responseType = import.meta.env.VITE_GOOGLE_AUTH_RESPONSE_TYPE ?? DEFAULT_RESPONSE_TYPE,
    nativeOidcEnabled = import.meta.env.VITE_ENABLE_NATIVE_OIDC !== 'false',
    nativeGoogleAuthEnabled = import.meta.env.VITE_ENABLE_NATIVE_GOOGLE_AUTH !== 'false',
    basePath = import.meta.env.BASE_URL ?? '/',
    storage = globalThis.localStorage,
    windowRef = globalThis.window,
    capacitor = globalThis.Capacitor,
    appPlugin = CapacitorApp,
    browserPlugin = CapacitorBrowser,
    nativeGoogleAuthPlugin = NativeGoogleAuthPlugin,
    createUserManager = (settings, redirectNavigator) =>
      new UserManager(settings, redirectNavigator),
  } = {}) {
    this.authority = authority;
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.postLogoutRedirectUri = postLogoutRedirectUri;
    this.mobileRedirectUri = mobileRedirectUri;
    this.responseType = responseType;
    this.nativeOidcEnabled = nativeOidcEnabled;
    this.nativeGoogleAuthEnabled = nativeGoogleAuthEnabled;
    this.basePath = basePath;
    this.storage = storage;
    this.windowRef = windowRef;
    this.capacitor = capacitor;
    this.appPlugin = appPlugin;
    this.browserPlugin = browserPlugin;
    this.nativeGoogleAuthPlugin = nativeGoogleAuthPlugin;
    this.createUserManager = createUserManager;
    this.userManager = null;
    this.user = null;
    this.error = null;
    this.cancelled = false;
    this.urlOpenListener = null;
    this.listeners = new Set();
  }

  isEnabled() {
    return Boolean(
      this.clientId &&
        this.windowRef &&
        (!this.isNativePlatform() || this.nativeOidcEnabled),
    );
  }

  async prepare() {
    if (!this.isEnabled()) {
      this.publish();
      return this.getSnapshot();
    }

    if (this.shouldUseNativeGoogleAuth()) {
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

    if (this.shouldUseNativeGoogleAuth()) {
      return this.user?.id_token;
    }

    this.user = this.user ?? (await this.getUserManager().getUser());
    return this.user?.id_token ?? this.user?.access_token;
  }

  async signIn() {
    if (!this.isEnabled()) {
      return { ok: false, reason: 'disabled' };
    }

    this.error = null;
    this.cancelled = false;
    this.publish();

    if (this.shouldUseNativeGoogleAuth()) {
      return this.signInNative();
    }

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

    if (this.shouldUseNativeGoogleAuth()) {
      await this.nativeGoogleAuthPlugin?.signOut?.();
      this.user = null;
      this.error = null;
      this.cancelled = false;
      this.publish();
      return { ok: true };
    }

    await this.getUserManager().removeUser();
    this.user = null;
    this.error = null;
    this.cancelled = false;
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
      cancelled: this.cancelled,
      disabledReason: this.getDisabledReason(),
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

  getDisabledReason() {
    if (!this.clientId || !this.windowRef) {
      return 'config';
    }

    if (this.isNativePlatform() && !this.nativeOidcEnabled) {
      return 'native';
    }

    return null;
  }

  async signInNative() {
    try {
      const result = await this.nativeGoogleAuthPlugin.signIn({
        serverClientId: this.clientId,
      });
      if (result?.cancelled) {
        this.error = null;
        this.cancelled = true;
        this.publish();
        return { ok: false, reason: 'native_cancelled' };
      }
      if (!result?.idToken) {
        this.error = null;
        this.cancelled = true;
        this.publish();
        return { ok: false, reason: 'native_cancelled' };
      }
      this.user = this.createNativeUser(result);
      this.error = null;
      this.cancelled = false;
      this.publish();
      return { ok: true };
    } catch (error) {
      if (this.isNativeGoogleAuthCancellation(error)) {
        this.error = null;
        this.cancelled = true;
        this.publish();
        return { ok: false, reason: 'native_cancelled' };
      }
      this.error = error?.message ?? String(error);
      this.cancelled = false;
      this.publish();
      return { ok: false, reason: 'native_failed' };
    }
  }

  createNativeUser(result = {}) {
    return {
      id_token: result.idToken,
      profile: {
        sub: result.uniqueId ?? '',
        email: result.email ?? '',
        name: result.displayName ?? '',
        given_name: result.givenName ?? '',
        family_name: result.familyName ?? '',
        picture: result.profilePictureUri ?? '',
      },
    };
  }

  shouldUseNativeGoogleAuth() {
    return Boolean(
      this.getPlatform() === 'android' &&
        this.nativeGoogleAuthEnabled &&
        this.nativeGoogleAuthPlugin?.signIn,
    );
  }

  isNativeGoogleAuthCancellation(error) {
    const code = error?.code ?? '';
    const message = error?.message ?? String(error);
    return (
      code === 'cancelled' ||
      message.includes('GetCredentialCancellationException')
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
    const handled = await this.handleCallbackHref(manager, launchUrl?.url);
    if (handled) {
      await this.closeNativeBrowser();
    }
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
    if (handled) {
      await this.closeNativeBrowser();
    }
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
    if (
      !params?.has('state') ||
      (!params.has('code') &&
        !params.has('id_token') &&
        !params.has('access_token') &&
        !params.has('error'))
    ) {
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
      const url = new URL(href);
      const params = new URLSearchParams(url.search);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      for (const [key, value] of hashParams) {
        params.set(key, value);
      }
      return params;
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
      location.pathname,
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
      response_type: this.responseType,
      scope: DEFAULT_SCOPE,
      prompt: 'select_account',
      automaticSilentRenew: false,
      redirectMethod: 'replace',
      stateStore: new WebStorageStateStore({
        prefix: 'idle-wizard.oidc.state.',
        store: this.storage,
      }),
      userStore: new WebStorageStateStore({
        prefix: 'idle-wizard.oidc.',
        store: this.storage,
      }),
    }, this.getRedirectNavigator());

    return this.userManager;
  }

  getRedirectNavigator() {
    if (!this.isNativePlatform() || !this.browserPlugin?.open) {
      return undefined;
    }

    return new NativeBrowserRedirectNavigator({
      browserPlugin: this.browserPlugin,
    });
  }

  async closeNativeBrowser() {
    if (!this.isNativePlatform() || !this.browserPlugin?.close) {
      return;
    }

    try {
      await this.browserPlugin.close();
    } catch {
      // The browser may already be closed after Android returns to the app.
    }
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
    const platform = this.getPlatform();
    if (platform) {
      return ['android', 'ios'].includes(platform);
    }

    const isNativePlatform = this.capacitor?.isNativePlatform;
    return typeof isNativePlatform === 'function' && isNativePlatform();
  }

  getPlatform() {
    const getPlatform = this.capacitor?.getPlatform;
    if (typeof getPlatform === 'function') {
      return getPlatform();
    }

    return null;
  }
}

class NativeBrowserRedirectNavigator {
  constructor({ browserPlugin }) {
    this.browserPlugin = browserPlugin;
  }

  async prepare() {
    return {
      navigate: async ({ url }) => {
        await this.browserPlugin.open({
          url,
          presentationStyle: 'fullscreen',
        });
        return new Promise(() => {});
      },
      close: () => {
        void this.browserPlugin.close?.();
      },
    };
  }

  async callback() {
    return undefined;
  }
}
