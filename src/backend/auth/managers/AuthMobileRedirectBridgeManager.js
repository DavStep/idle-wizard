const DEFAULT_CALLBACK_URI = 'com.idlewizard.game://auth/callback';
const DEFAULT_ANDROID_PACKAGE = 'com.idlewizard.game';
const DEFAULT_NATIVE_MARKER_PARAM = 'native_auth';

export class AuthMobileRedirectBridgeManager {
  constructor({
    callbackUri = DEFAULT_CALLBACK_URI,
    androidPackage = DEFAULT_ANDROID_PACKAGE,
    nativeMarkerParam = DEFAULT_NATIVE_MARKER_PARAM,
    windowRef = globalThis.window,
    documentRef = globalThis.document,
    navigatorRef = globalThis.navigator,
  } = {}) {
    this.callbackUri = callbackUri;
    this.androidPackage = androidPackage;
    this.nativeMarkerParam = nativeMarkerParam;
    this.windowRef = windowRef;
    this.documentRef = documentRef;
    this.navigatorRef = navigatorRef;
  }

  redirectIfNeeded() {
    if (this.windowRef?.Capacitor?.isNativePlatform?.()) {
      return false;
    }

    const params = this.getCallbackParams();
    if (!this.shouldRedirect(params)) {
      return false;
    }

    params.delete(this.nativeMarkerParam);
    const callbackUrl = this.createCallbackUrl(params);
    this.renderBridge(callbackUrl);
    this.openCallback(callbackUrl);
    return true;
  }

  shouldRedirect(params) {
    return Boolean(
      params?.get(this.nativeMarkerParam) === '1' &&
        params.has('state') &&
        (params.has('code') ||
          params.has('id_token') ||
          params.has('access_token') ||
          params.has('error')),
    );
  }

  getCallbackParams() {
    const location = this.windowRef?.location;
    if (!location) {
      return null;
    }

    const params = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash?.replace(/^#/, '') ?? '');
    for (const [key, value] of hashParams) {
      params.set(key, value);
    }
    return params;
  }

  createCallbackUrl(params) {
    const query = params.toString();
    return query ? `${this.callbackUri}?${query}` : this.callbackUri;
  }

  createAndroidIntentUrl(callbackUrl) {
    if (!this.isAndroidBrowser()) {
      return null;
    }

    const url = new URL(callbackUrl);
    const scheme = url.protocol.replace(/:$/, '');
    const fallbackUrl = encodeURIComponent(this.windowRef.location.href);
    return (
      `intent://${url.host}${url.pathname}${url.search}` +
      `#Intent;scheme=${scheme};package=${this.androidPackage};` +
      `S.browser_fallback_url=${fallbackUrl};end`
    );
  }

  openCallback(callbackUrl) {
    const intentUrl = this.createAndroidIntentUrl(callbackUrl);
    if (intentUrl) {
      this.replaceLocation(intentUrl);
      this.windowRef.setTimeout?.(() => {
        this.replaceLocation(callbackUrl);
      }, 800);
      return;
    }

    this.replaceLocation(callbackUrl);
  }

  replaceLocation(url) {
    const location = this.windowRef?.location;
    if (typeof location?.replace === 'function') {
      location.replace(url);
      return;
    }

    if (location) {
      location.href = url;
    }
  }

  renderBridge(callbackUrl) {
    const documentRef = this.documentRef;
    const root = documentRef?.querySelector?.('#app') ?? documentRef?.body;
    if (!documentRef || !root) {
      return;
    }

    root.textContent = '';
    const bridge = documentRef.createElement('main');
    bridge.className = 'mobile-auth-bridge';

    const panel = documentRef.createElement('section');
    panel.className = 'mobile-auth-bridge__panel';

    const title = documentRef.createElement('div');
    title.className = 'mobile-auth-bridge__title';
    title.textContent = 'return to game';

    const message = documentRef.createElement('p');
    message.className = 'mobile-auth-bridge__message';
    message.textContent = 'opening idle wizard...';

    const button = documentRef.createElement('button');
    button.className = 'style-button mobile-auth-bridge__button';
    button.type = 'button';
    button.textContent = 'open game';
    button.addEventListener('click', () => this.openCallback(callbackUrl));

    panel.append(title, message, button);
    bridge.append(panel);
    root.append(bridge);
  }

  isAndroidBrowser() {
    return /Android/i.test(this.navigatorRef?.userAgent ?? '');
  }
}
