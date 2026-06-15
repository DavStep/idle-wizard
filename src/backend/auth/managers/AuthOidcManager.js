import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser as CapacitorBrowser } from '@capacitor/browser';
import { NativeGoogleAuthPlugin } from '../nativeGoogleAuthPlugin.js';
import { AuthGoogleTokenManager } from './AuthGoogleTokenManager.js';

const DEFAULT_AUTHORITY = 'https://accounts.google.com';
const DEFAULT_SCOPE = 'openid profile email';
const DEFAULT_RESPONSE_TYPE = 'code';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const DEFAULT_MOBILE_REDIRECT_URI = 'https://davstep.github.io/idle-wizard/?native_auth=1';
const WEB_GOOGLE_USER_STORAGE_KEY = 'idle-wizard.web-google.user';
const NATIVE_GOOGLE_USER_STORAGE_KEY = 'idle-wizard.native-google.user';
const ACTIVE_ACCOUNT_LINK_ATTEMPT_KEY = 'idle-wizard.account-link.active-attempt';
const NATIVE_GOOGLE_TOKEN_FALLBACK_TTL_MS = 55 * 60 * 1000;
const DEFAULT_SCRIPT_LOAD_TIMEOUT_MS = 10_000;
const DEFAULT_WEB_PROMPT_TIMEOUT_MS = 90_000;

export class AuthOidcManager {
  constructor({
    authority = import.meta.env.VITE_GOOGLE_AUTH_AUTHORITY ?? DEFAULT_AUTHORITY,
    clientId = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID,
    redirectUri = import.meta.env.VITE_GOOGLE_AUTH_REDIRECT_URI,
    postLogoutRedirectUri = import.meta.env.VITE_GOOGLE_AUTH_POST_LOGOUT_REDIRECT_URI,
    mobileRedirectUri = import.meta.env.VITE_GOOGLE_AUTH_MOBILE_REDIRECT_URI ??
      DEFAULT_MOBILE_REDIRECT_URI,
    responseType = import.meta.env.VITE_GOOGLE_AUTH_RESPONSE_TYPE,
    webGoogleIdentityEnabled = import.meta.env.VITE_ENABLE_WEB_GOOGLE_IDENTITY !== 'false',
    nativeOidcEnabled = import.meta.env.VITE_ENABLE_NATIVE_OIDC !== 'false',
    nativeGoogleAuthEnabled = import.meta.env.VITE_ENABLE_NATIVE_GOOGLE_AUTH !== 'false',
    googleIdentityScriptSrc = GOOGLE_IDENTITY_SCRIPT_SRC,
    scriptLoadTimeoutMs = DEFAULT_SCRIPT_LOAD_TIMEOUT_MS,
    webPromptTimeoutMs = DEFAULT_WEB_PROMPT_TIMEOUT_MS,
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
    this.webGoogleIdentityEnabled = webGoogleIdentityEnabled;
    this.nativeOidcEnabled = nativeOidcEnabled;
    this.nativeGoogleAuthEnabled = nativeGoogleAuthEnabled;
    this.googleIdentityScriptSrc = googleIdentityScriptSrc;
    this.scriptLoadTimeoutMs = scriptLoadTimeoutMs;
    this.webPromptTimeoutMs = webPromptTimeoutMs;
    this.basePath = basePath;
    this.storage = storage;
    this.windowRef = windowRef;
    this.capacitor = capacitor;
    this.appPlugin = appPlugin;
    this.browserPlugin = browserPlugin;
    this.nativeGoogleAuthPlugin = nativeGoogleAuthPlugin;
    this.createUserManager = createUserManager;
    const atobOwner = this.windowRef?.atob ? this.windowRef : globalThis;
    this.googleTokenManager = new AuthGoogleTokenManager({
      clientId: this.clientId,
      atob: (value) => atobOwner.atob(value),
    });
    this.userManager = null;
    this.user = null;
    this.error = null;
    this.cancelled = false;
    this.urlOpenListener = null;
    this.googleIdentityLoadPromise = null;
    this.webSignInPromise = null;
    this.listeners = new Set();
  }

  isEnabled() {
    if (!this.clientId || !this.windowRef) {
      return false;
    }

    if (!this.isNativePlatform()) {
      return true;
    }

    return this.shouldUseNativeGoogleAuth() || this.nativeOidcEnabled;
  }

  async prepare() {
    if (!this.isEnabled()) {
      this.publish();
      return this.getSnapshot();
    }

    if (this.shouldUseNativeGoogleAuth()) {
      this.user = (await this.consumePendingNativeUser()) ?? this.loadNativeUser();
      this.publish();
      return this.getSnapshot();
    }

    if (this.shouldUseWebGoogleIdentity()) {
      this.user = this.loadWebGoogleUser();
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

  stop() {
    const listener = this.urlOpenListener;
    this.urlOpenListener = null;

    if (!listener) {
      return;
    }

    void Promise.resolve(listener)
      .then((handle) => handle?.remove?.())
      .catch(() => {});
  }

  async getConnectionToken() {
    if (!this.isEnabled()) {
      return undefined;
    }

    if (this.shouldUseNativeGoogleAuth()) {
      return this.getNativeConnectionToken();
    }

    if (this.shouldUseWebGoogleIdentity()) {
      return this.getWebConnectionToken();
    }

    this.user = this.user ?? (await this.getUserManager().getUser());
    return this.user?.id_token;
  }

  async signIn({ pendingAccountLinkAttemptId } = {}) {
    if (!this.isEnabled()) {
      return { ok: false, reason: 'disabled' };
    }

    this.error = null;
    this.cancelled = false;
    this.saveActiveAccountLinkAttemptId(pendingAccountLinkAttemptId);
    this.publish();

    if (this.shouldUseNativeGoogleAuth()) {
      return this.signInNative({ pendingAccountLinkAttemptId });
    }

    if (this.shouldUseWebGoogleIdentity()) {
      const result = await this.signInWebGoogleIdentity({ pendingAccountLinkAttemptId });
      if (this.shouldFallbackToRedirectSignIn(result)) {
        this.saveActiveAccountLinkAttemptId(pendingAccountLinkAttemptId);
        this.error = null;
        this.cancelled = false;
        this.publish();
        return this.signInWithRedirect();
      }

      return result;
    }

    return this.signInWithRedirect();
  }

  async signInWithRedirect() {
    try {
      await this.getUserManager().signinRedirect();
      return { ok: true };
    } catch (error) {
      this.clearActiveAccountLinkAttemptId();
      this.error = error?.message ?? String(error);
      this.publish();
      return { ok: false, reason: 'redirect_failed' };
    }
  }

  shouldFallbackToRedirectSignIn(result = {}) {
    return result?.ok === false && result.reason === 'web_unavailable';
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
      this.clearNativeUser();
      this.clearActiveAccountLinkAttemptId();
      this.publish();
      return { ok: true };
    }

    if (this.shouldUseWebGoogleIdentity()) {
      this.getGoogleIdentityClient()?.accounts?.id?.disableAutoSelect?.();
      this.user = null;
      this.error = null;
      this.cancelled = false;
      this.clearWebGoogleUser();
      this.clearActiveAccountLinkAttemptId();
      this.publish();
      return { ok: true };
    }

    await this.getUserManager().removeUser();
    this.user = null;
    this.error = null;
    this.cancelled = false;
    this.clearActiveAccountLinkAttemptId();
    this.publish();
    return { ok: true };
  }

  getSnapshot() {
    return {
      enabled: this.isEnabled(),
      authenticated: this.hasFreshUserToken(this.user),
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

    if (
      this.isNativePlatform() &&
      !this.nativeOidcEnabled &&
      !this.shouldUseNativeGoogleAuth()
    ) {
      return 'native';
    }

    return null;
  }

  async signInNative({ pendingAccountLinkAttemptId } = {}) {
    try {
      const result = await this.nativeGoogleAuthPlugin.signIn({
        serverClientId: this.clientId,
      });
      if (result?.cancelled) {
        this.clearActiveAccountLinkAttemptId();
        this.error = null;
        this.cancelled = true;
        this.publish();
        return { ok: false, reason: 'native_cancelled' };
      }
      if (!result?.idToken) {
        this.clearActiveAccountLinkAttemptId();
        this.error = null;
        this.cancelled = true;
        this.publish();
        return { ok: false, reason: 'native_cancelled' };
      }
      this.user = this.createNativeUser(result, {
        accountLinkAttemptId: pendingAccountLinkAttemptId,
      });
      this.saveNativeUser(this.user);
      this.clearActiveAccountLinkAttemptId();
      await this.clearPendingNativeUser();
      this.error = null;
      this.cancelled = false;
      this.publish();
      return { ok: true, reloadRequired: true };
    } catch (error) {
      this.clearActiveAccountLinkAttemptId();
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

  async signInWebGoogleIdentity({ pendingAccountLinkAttemptId } = {}) {
    if (this.webSignInPromise) {
      return this.webSignInPromise;
    }

    this.webSignInPromise = this.runWebGoogleIdentitySignIn({
      pendingAccountLinkAttemptId,
    });
    try {
      return await this.webSignInPromise;
    } finally {
      this.webSignInPromise = null;
    }
  }

  async runWebGoogleIdentitySignIn({ pendingAccountLinkAttemptId } = {}) {
    try {
      const google = await this.loadGoogleIdentityClient();
      const identity = google?.accounts?.id;
      if (!identity?.initialize || !identity?.prompt) {
        throw new Error('Google Identity Services unavailable.');
      }

      return await new Promise((resolve) => {
        let settled = false;
        let timeoutId = null;

        const finish = (result) => {
          if (settled) {
            return;
          }
          settled = true;
          if (result?.ok === false) {
            this.clearActiveAccountLinkAttemptId();
          }
          if (timeoutId) {
            this.clearTimer(timeoutId);
          }
          this.publish();
          resolve(result);
        };

        timeoutId = this.setTimer(() => {
          this.error = 'login timed out';
          this.cancelled = false;
          finish({ ok: false, reason: 'web_timeout' });
        }, this.webPromptTimeoutMs);

        try {
          identity.initialize({
            client_id: this.clientId,
            callback: (response) => {
              try {
                if (!response?.credential) {
                  this.error = null;
                  this.cancelled = true;
                  finish({ ok: false, reason: 'web_cancelled' });
                  return;
                }

                this.user = this.createWebGoogleUser(response, {
                  accountLinkAttemptId: pendingAccountLinkAttemptId,
                });
                this.saveWebGoogleUser(this.user);
                this.clearActiveAccountLinkAttemptId();
                this.error = null;
                this.cancelled = false;
                finish({ ok: true, reloadRequired: true });
              } catch (error) {
                this.clearActiveAccountLinkAttemptId();
                this.error = error?.message ?? String(error);
                this.cancelled = false;
                finish({ ok: false, reason: 'web_failed' });
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            itp_support: true,
          });

          identity.prompt((notification) => {
            if (settled) {
              return;
            }

            if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
              this.error = this.getWebPromptError(notification);
              this.cancelled = this.isWebPromptCancelled(notification);
              finish({
                ok: false,
                reason: this.cancelled ? 'web_cancelled' : 'web_unavailable',
              });
              return;
            }

            if (
              notification?.isDismissedMoment?.() &&
              notification?.getDismissedReason?.() !== 'credential_returned'
            ) {
              this.error = null;
              this.cancelled = true;
              finish({ ok: false, reason: 'web_cancelled' });
            }
          });
        } catch (error) {
          this.clearActiveAccountLinkAttemptId();
          this.error = error?.message ?? String(error);
          this.cancelled = false;
          finish({ ok: false, reason: 'web_failed' });
        }
      });
    } catch (error) {
      this.clearActiveAccountLinkAttemptId();
      this.error = error?.message ?? String(error);
      this.cancelled = false;
      this.publish();
      return { ok: false, reason: 'web_failed' };
    }
  }

  getWebPromptError(notification) {
    if (this.isWebPromptCancelled(notification)) {
      return null;
    }

    const notDisplayedReason = notification?.getNotDisplayedReason?.();
    const skippedReason = notification?.getSkippedReason?.();
    return notDisplayedReason || skippedReason || 'google login unavailable';
  }

  isWebPromptCancelled(notification) {
    return ['user_cancel', 'tap_outside', 'cancel_called'].includes(
      notification?.getSkippedReason?.() ?? notification?.getDismissedReason?.(),
    );
  }

  async loadGoogleIdentityClient() {
    const existing = this.getGoogleIdentityClient();
    if (existing?.accounts?.id) {
      return existing;
    }

    if (this.googleIdentityLoadPromise) {
      return this.googleIdentityLoadPromise;
    }

    this.googleIdentityLoadPromise = new Promise((resolve, reject) => {
      const document = this.windowRef?.document;
      if (!document?.createElement) {
        reject(new Error('Google login needs a browser document.'));
        return;
      }

      let settled = false;
      let timeoutId = null;
      const finish = (error) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          this.clearTimer(timeoutId);
        }
        if (error) {
          reject(error);
          return;
        }
        const google = this.getGoogleIdentityClient();
        if (google?.accounts?.id) {
          resolve(google);
          return;
        }
        reject(new Error('Google Identity Services did not initialize.'));
      };

      const script =
        document.querySelector?.(`script[src="${this.googleIdentityScriptSrc}"]`) ??
        document.createElement('script');

      script.addEventListener?.('load', () => finish(), { once: true });
      script.addEventListener?.(
        'error',
        () => finish(new Error('Google login script failed to load.')),
        { once: true },
      );

      timeoutId = this.setTimer(
        () => finish(new Error('Google login script timed out.')),
        this.scriptLoadTimeoutMs,
      );

      if (!script.parentNode) {
        script.src = this.googleIdentityScriptSrc;
        script.async = true;
        script.defer = true;
        (document.head ?? document.body ?? document.documentElement).append(script);
      }
    });

    try {
      return await this.googleIdentityLoadPromise;
    } finally {
      this.googleIdentityLoadPromise = null;
    }
  }

  getGoogleIdentityClient() {
    return this.windowRef?.google;
  }

  createNativeUser(result = {}, { accountLinkAttemptId } = {}) {
    const token = result.idToken;
    const profile = this.validateNativeGoogleIdToken(token, {
      expectedNonce: result.nonce,
      result,
    });

    return this.withAccountLinkAttempt(
      {
        id_token: token,
        expires_at: this.getJwtExpiresAt(token) ?? this.getNativeGoogleFallbackExpiresAt(),
        profile: {
          sub: profile.sub ?? result.uniqueId ?? '',
          email: profile.email ?? result.email ?? '',
          name: profile.name ?? result.displayName ?? '',
          given_name: profile.given_name ?? result.givenName ?? '',
          family_name: profile.family_name ?? result.familyName ?? '',
          picture: profile.picture ?? result.profilePictureUri ?? '',
        },
      },
      accountLinkAttemptId,
    );
  }

  validateNativeGoogleIdToken(token, { expectedNonce, result } = {}) {
    try {
      return this.validateGoogleIdToken(token, { expectedNonce });
    } catch (error) {
      if (!this.canUseNativeGoogleResultFallback(error, token, result)) {
        throw error;
      }

      return {};
    }
  }

  canUseNativeGoogleResultFallback(error, token, result = {}) {
    return (
      error?.message === 'Google login returned an invalid identity token.' &&
      typeof token === 'string' &&
      token.split('.').length === 3 &&
      Boolean(result.uniqueId)
    );
  }

  getNativeGoogleFallbackExpiresAt() {
    return Date.now() + NATIVE_GOOGLE_TOKEN_FALLBACK_TTL_MS;
  }

  createWebGoogleUser(response = {}, { accountLinkAttemptId } = {}) {
    const token = response.credential;
    const profile = this.validateGoogleIdToken(token);

    return this.withAccountLinkAttempt(
      {
        id_token: token,
        expires_at: this.getJwtExpiresAt(token),
        profile: {
          sub: profile.sub ?? '',
          email: profile.email ?? '',
          name: profile.name ?? '',
          given_name: profile.given_name ?? '',
          family_name: profile.family_name ?? '',
          picture: profile.picture ?? '',
        },
        select_by: response.select_by ?? '',
      },
      accountLinkAttemptId,
    );
  }

  getNativeConnectionToken() {
    if (!this.user?.id_token) {
      return undefined;
    }

    if (this.isTokenExpired(this.user.expires_at)) {
      this.user = this.stripNativeToken(this.user);
      this.saveNativeUser(this.user);
      this.publish();
      return undefined;
    }

    return this.user.id_token;
  }

  getWebConnectionToken() {
    this.user = this.user ?? this.loadWebGoogleUser();
    if (!this.user?.id_token) {
      return undefined;
    }

    if (this.isTokenExpired(this.user.expires_at)) {
      this.user = null;
      this.clearWebGoogleUser();
      this.publish();
      return undefined;
    }

    return this.user.id_token;
  }

  async consumePendingNativeUser() {
    if (!this.nativeGoogleAuthPlugin?.consumePendingSignInResult) {
      return null;
    }

    try {
      const result = await this.nativeGoogleAuthPlugin.consumePendingSignInResult();
      if (!result?.idToken) {
        return null;
      }

      const user = this.createNativeUser(result, {
        accountLinkAttemptId: this.loadActiveAccountLinkAttemptId(),
      });
      this.saveNativeUser(user);
      this.clearActiveAccountLinkAttemptId();
      this.error = null;
      this.cancelled = false;
      return user;
    } catch {
      return null;
    }
  }

  async clearPendingNativeUser() {
    try {
      await this.nativeGoogleAuthPlugin?.consumePendingSignInResult?.();
    } catch {
      // The local copy is already saved; a stale native handoff can be overwritten later.
    }
  }

  loadNativeUser() {
    const raw = this.storage?.getItem?.(NATIVE_GOOGLE_USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.profile || typeof parsed.profile !== 'object') {
        return null;
      }

      const user = {
        id_token: parsed.id_token,
        expires_at: parsed.expires_at,
        profile: {
          sub: parsed.profile.sub ?? '',
          email: parsed.profile.email ?? '',
          name: parsed.profile.name ?? '',
          given_name: parsed.profile.given_name ?? '',
          family_name: parsed.profile.family_name ?? '',
          picture: parsed.profile.picture ?? '',
        },
        accountLinkAttemptId: parsed.accountLinkAttemptId ?? null,
      };

      if (this.isTokenExpired(user.expires_at)) {
        const userWithoutToken = this.stripNativeToken(user);
        this.saveNativeUser(userWithoutToken);
        return userWithoutToken;
      }

      return user;
    } catch {
      this.clearNativeUser();
      return null;
    }
  }

  loadWebGoogleUser() {
    const raw = this.storage?.getItem?.(WEB_GOOGLE_USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.id_token || this.isTokenExpired(parsed.expires_at)) {
        this.clearWebGoogleUser();
        return null;
      }

      return {
        id_token: parsed.id_token,
        expires_at: parsed.expires_at,
        profile: {
          sub: parsed.profile?.sub ?? '',
          email: parsed.profile?.email ?? '',
          name: parsed.profile?.name ?? '',
          given_name: parsed.profile?.given_name ?? '',
          family_name: parsed.profile?.family_name ?? '',
          picture: parsed.profile?.picture ?? '',
        },
        select_by: parsed.select_by ?? '',
        accountLinkAttemptId: parsed.accountLinkAttemptId ?? null,
      };
    } catch {
      this.clearWebGoogleUser();
      return null;
    }
  }

  saveNativeUser(user) {
    if (!user?.profile || !this.storage?.setItem) {
      return;
    }

    const persisted = {
      profile: user.profile,
    };

    if (user.id_token && !this.isTokenExpired(user.expires_at)) {
      persisted.id_token = user.id_token;
      persisted.expires_at = user.expires_at;
    }
    if (user.accountLinkAttemptId) {
      persisted.accountLinkAttemptId = user.accountLinkAttemptId;
    }

    this.storage.setItem(NATIVE_GOOGLE_USER_STORAGE_KEY, JSON.stringify(persisted));
  }

  saveWebGoogleUser(user) {
    if (!user?.id_token || this.isTokenExpired(user.expires_at) || !this.storage?.setItem) {
      return;
    }

    this.storage.setItem(
      WEB_GOOGLE_USER_STORAGE_KEY,
      JSON.stringify({
        id_token: user.id_token,
        expires_at: user.expires_at,
        profile: user.profile,
        select_by: user.select_by ?? '',
        accountLinkAttemptId: user.accountLinkAttemptId ?? null,
      }),
    );
  }

  clearNativeUser() {
    this.storage?.removeItem?.(NATIVE_GOOGLE_USER_STORAGE_KEY);
  }

  clearWebGoogleUser() {
    this.storage?.removeItem?.(WEB_GOOGLE_USER_STORAGE_KEY);
  }

  stripNativeToken(user) {
    return {
      profile: user.profile,
      accountLinkAttemptId: user.accountLinkAttemptId ?? null,
    };
  }

  withAccountLinkAttempt(user, accountLinkAttemptId) {
    if (!user || !accountLinkAttemptId) {
      return user;
    }

    return {
      ...user,
      accountLinkAttemptId,
    };
  }

  getAccountLinkAttemptId() {
    return this.user?.accountLinkAttemptId ?? null;
  }

  saveActiveAccountLinkAttemptId(attemptId) {
    if (!attemptId || !this.storage?.setItem) {
      this.clearActiveAccountLinkAttemptId();
      return;
    }

    this.storage.setItem(ACTIVE_ACCOUNT_LINK_ATTEMPT_KEY, attemptId);
  }

  loadActiveAccountLinkAttemptId() {
    return this.storage?.getItem?.(ACTIVE_ACCOUNT_LINK_ATTEMPT_KEY) ?? null;
  }

  clearActiveAccountLinkAttemptId() {
    this.storage?.removeItem?.(ACTIVE_ACCOUNT_LINK_ATTEMPT_KEY);
  }

  validateGoogleIdToken(token, { expectedNonce } = {}) {
    return this.googleTokenManager.validateIdToken(token, { expectedNonce });
  }

  decodeJwtPayload(token) {
    return this.googleTokenManager.decodeJwtPayload(token);
  }

  getJwtExpiresAt(token) {
    return this.googleTokenManager.getJwtExpiresAt(token);
  }

  decodeBase64Url(value) {
    return this.googleTokenManager.decodeBase64Url(value);
  }

  isTokenExpired(expiresAt) {
    return this.googleTokenManager.isTokenExpired(expiresAt);
  }

  hasFreshUserToken(user) {
    return this.googleTokenManager.hasFreshUserToken(user);
  }

  shouldUseNativeGoogleAuth() {
    return Boolean(
      this.getPlatform() === 'android' &&
        this.nativeGoogleAuthEnabled &&
        this.nativeGoogleAuthPlugin?.signIn,
    );
  }

  shouldUseWebGoogleIdentity() {
    return Boolean(
      this.webGoogleIdentityEnabled &&
        !this.isNativePlatform() &&
        (this.getGoogleIdentityClient()?.accounts?.id ||
          this.windowRef?.document?.createElement),
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

  setTimer(callback, delayMs) {
    return (this.windowRef?.setTimeout ?? globalThis.setTimeout)(callback, delayMs);
  }

  clearTimer(timerId) {
    (this.windowRef?.clearTimeout ?? globalThis.clearTimeout)(timerId);
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
      this.user = this.withAccountLinkAttempt(
        this.user,
        this.loadActiveAccountLinkAttemptId(),
      );
      this.clearActiveAccountLinkAttemptId();
    } catch (error) {
      this.clearActiveAccountLinkAttemptId();
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
      response_type: this.getResponseType(),
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

  getResponseType() {
    const configuredResponseType = String(this.responseType ?? DEFAULT_RESPONSE_TYPE).trim();
    return configuredResponseType === DEFAULT_RESPONSE_TYPE
      ? configuredResponseType
      : DEFAULT_RESPONSE_TYPE;
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
