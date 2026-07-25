const DEFAULT_DEPLOY_VERSION_ENDPOINT =
  `${import.meta.env.BASE_URL ?? '/'}deploy-version.json`;
const DEFAULT_DEPLOY_REFRESH_ENABLED = import.meta.env.PROD;
const DEFAULT_CURRENT_DEPLOY_VERSION =
  import.meta.env.VITE_DEPLOY_VERSION ?? null;
const BEFORE_RELOAD_TIMEOUT = Symbol('beforeReloadTimeout');

/**
 * Platform/polling controller for the retained deploy-refresh gate. Browser
 * visibility is observed as a lifecycle signal; no DOM UI is created or read.
 */
export class PixiDeployRefreshController {
  constructor({
    endpoint = DEFAULT_DEPLOY_VERSION_ENDPOINT,
    intervalMs = 60_000,
    reloadDelayMs = 250,
    enabled = DEFAULT_DEPLOY_REFRESH_ENABLED,
    currentVersion = DEFAULT_CURRENT_DEPLOY_VERSION,
    windowRef = globalThis.window,
    documentRef = globalThis.document,
    fetchVersion = null,
    reload = null,
    beforeReload = null,
    beforeReloadTimeoutMs = 2_000,
  } = {}) {
    this.endpoint = endpoint;
    this.intervalMs = intervalMs;
    this.reloadDelayMs = reloadDelayMs;
    this.enabled = enabled;
    this.windowRef = windowRef;
    this.documentRef = documentRef;
    this.fetchVersion = fetchVersion ?? (() => this.fetchEndpointVersion());
    this.reload = reload ?? (() => this.windowRef.location.reload());
    this.beforeReload = beforeReload;
    this.beforeReloadTimeoutMs = beforeReloadTimeoutMs;
    this.initialVersion = this.normalizeVersion(currentVersion);
    this.currentVersion = this.initialVersion;
    this.intervalId = null;
    this.reloadTimeoutId = null;
    this.beforeReloadTimeoutId = null;
    this.checking = false;
    this.reloading = false;
    this.view = null;
    this.handleVisibilityChange = () => {
      if (this.documentRef?.visibilityState === 'visible') {
        void this.checkNow();
      }
    };
    this.handleFocus = () => void this.checkNow();
  }

  attach(view) {
    this.view = view;
    if (this.reloading) {
      this.show();
    }
    return view;
  }

  mount() {
    if (this.enabled) {
      this.startPolling();
    }
    return this.view?.root ?? null;
  }

  startPolling() {
    if (this.intervalId !== null) {
      return;
    }
    void this.checkNow();
    this.intervalId = this.windowRef?.setInterval?.(
      () => void this.checkNow(),
      this.intervalMs,
    ) ?? null;
    this.documentRef?.addEventListener?.(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.windowRef?.addEventListener?.('focus', this.handleFocus);
  }

  stopPolling() {
    if (this.intervalId !== null) {
      this.windowRef?.clearInterval?.(this.intervalId);
      this.intervalId = null;
    }
    this.documentRef?.removeEventListener?.(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.windowRef?.removeEventListener?.('focus', this.handleFocus);
  }

  async checkNow() {
    if (!this.enabled || this.checking || this.reloading) {
      return;
    }
    this.checking = true;
    try {
      const version = this.normalizeVersion(await this.fetchVersion());
      if (!version) {
        return;
      }
      if (this.currentVersion === null) {
        this.currentVersion = version;
        return;
      }
      if (version !== this.currentVersion) {
        this.forceRefresh();
      }
    } catch {
      // A deploy probe never interrupts play until a newer build is confirmed.
    } finally {
      this.checking = false;
    }
  }

  async fetchEndpointVersion() {
    if (!this.windowRef?.fetch) {
      return null;
    }
    const response = await this.windowRef.fetch(this.createVersionUrl(), {
      cache: 'no-store',
    });
    return response.ok ? response.json() : null;
  }

  createVersionUrl() {
    const url = new URL(this.endpoint, this.windowRef.location.href);
    url.searchParams.set('_', String(Date.now()));
    return url.toString();
  }

  normalizeVersion(payload) {
    if (typeof payload === 'string') {
      return payload.trim();
    }
    if (payload && typeof payload.version === 'string') {
      return payload.version.trim();
    }
    return null;
  }

  forceRefresh() {
    if (this.reloading) {
      return;
    }
    this.reloading = true;
    this.show();
    void this.prepareReload();
  }

  async prepareReload() {
    if (!(await this.runBeforeReload())) {
      this.cancelReload();
      return;
    }
    this.scheduleReload();
  }

  async runBeforeReload() {
    if (typeof this.beforeReload !== 'function') {
      return true;
    }
    try {
      const result = this.beforeReload();
      if (!result || typeof result.then !== 'function') {
        return result !== false;
      }
      const outcome = await this.waitForBeforeReload(result);
      return outcome !== false && outcome !== BEFORE_RELOAD_TIMEOUT;
    } catch {
      return false;
    }
  }

  async waitForBeforeReload(result) {
    if (
      !Number.isFinite(this.beforeReloadTimeoutMs) ||
      this.beforeReloadTimeoutMs <= 0
    ) {
      return result;
    }
    try {
      return await Promise.race([
        result,
        new Promise((resolve) => {
          this.beforeReloadTimeoutId = this.windowRef.setTimeout(
            () => resolve(BEFORE_RELOAD_TIMEOUT),
            this.beforeReloadTimeoutMs,
          );
        }),
      ]);
    } finally {
      if (this.beforeReloadTimeoutId !== null) {
        this.windowRef.clearTimeout(this.beforeReloadTimeoutId);
        this.beforeReloadTimeoutId = null;
      }
    }
  }

  scheduleReload() {
    if (!this.reloading) {
      return;
    }
    if (this.reloadDelayMs <= 0) {
      this.reload();
      return;
    }
    this.reloadTimeoutId = this.windowRef.setTimeout(
      () => this.reload(),
      this.reloadDelayMs,
    );
  }

  cancelReload() {
    this.reloading = false;
    this.hide();
  }

  show() {
    this.view?.bind({
      title: 'new version',
      message: 'refreshing...',
    });
  }

  hide() {
    this.view?.hide();
  }

  unmount() {
    this.stopPolling();
    if (this.reloadTimeoutId !== null) {
      this.windowRef?.clearTimeout?.(this.reloadTimeoutId);
      this.reloadTimeoutId = null;
    }
    if (this.beforeReloadTimeoutId !== null) {
      this.windowRef?.clearTimeout?.(this.beforeReloadTimeoutId);
      this.beforeReloadTimeoutId = null;
    }
    this.hide();
    this.view = null;
    this.currentVersion = this.initialVersion;
    this.checking = false;
    this.reloading = false;
  }
}
