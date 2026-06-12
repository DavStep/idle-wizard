const DEFAULT_DEPLOY_VERSION_ENDPOINT = `${import.meta.env.BASE_URL ?? '/'}deploy-version.json`;
const DEFAULT_DEPLOY_REFRESH_ENABLED = import.meta.env.PROD;
const DEFAULT_CURRENT_DEPLOY_VERSION = import.meta.env.VITE_DEPLOY_VERSION ?? null;
const BEFORE_RELOAD_TIMEOUT = Symbol('beforeReloadTimeout');

export class AppDeployRefreshManager {
  constructor({
    endpoint = DEFAULT_DEPLOY_VERSION_ENDPOINT,
    intervalMs = 60_000,
    reloadDelayMs = 250,
    enabled = DEFAULT_DEPLOY_REFRESH_ENABLED,
    currentVersion = DEFAULT_CURRENT_DEPLOY_VERSION,
    windowRef = window,
    documentRef = document,
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
    this.root = null;
    this.refs = null;
    this.initialVersion = this.normalizeVersion(currentVersion);
    this.currentVersion = this.initialVersion;
    this.intervalId = null;
    this.reloadTimeoutId = null;
    this.beforeReloadTimeoutId = null;
    this.checking = false;
    this.reloading = false;
    this.handleVisibilityChange = () => {
      if (this.documentRef.visibilityState === 'visible') {
        void this.checkNow();
      }
    };
    this.handleFocus = () => {
      void this.checkNow();
    };
  }

  mount(stage) {
    if (!stage) {
      throw new Error('AppDeployRefreshManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    const root = document.createElement('section');
    root.className = 'app-deploy-refresh';
    root.hidden = true;
    root.setAttribute('aria-live', 'assertive');

    const dialog = document.createElement('div');
    dialog.className = 'app-deploy-refresh__dialog style-dialog';
    dialog.setAttribute('role', 'status');

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'new version';

    const message = document.createElement('p');
    message.className = 'app-deploy-refresh__message';
    message.textContent = 'refreshing...';

    dialog.append(title, message);
    root.append(dialog);
    stage.append(root);

    this.root = root;
    this.refs = {
      title,
      message,
    };

    if (this.enabled) {
      this.startPolling();
    }

    return root;
  }

  startPolling() {
    if (this.intervalId !== null) {
      return;
    }

    void this.checkNow();
    this.intervalId = this.windowRef.setInterval(() => {
      void this.checkNow();
    }, this.intervalMs);
    this.documentRef.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.windowRef.addEventListener('focus', this.handleFocus);
  }

  stopPolling() {
    if (this.intervalId !== null) {
      this.windowRef.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.documentRef.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.windowRef.removeEventListener('focus', this.handleFocus);
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
      // Deploy checks should never interrupt play unless a newer version is confirmed.
    } finally {
      this.checking = false;
    }
  }

  async fetchEndpointVersion() {
    if (!this.windowRef.fetch) {
      return null;
    }

    const response = await this.windowRef.fetch(this.createVersionUrl(), {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
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
    const readyToReload = await this.runBeforeReload();

    if (!readyToReload) {
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
      // A failed final save must not reload into older server progress.
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

    this.reloadTimeoutId = this.windowRef.setTimeout(() => {
      this.reload();
    }, this.reloadDelayMs);
  }

  cancelReload() {
    this.reloading = false;
    this.hide();
  }

  show() {
    if (this.root) {
      this.root.hidden = false;
    }
  }

  hide() {
    if (this.root) {
      this.root.hidden = true;
    }
  }

  unmount() {
    this.stopPolling();

    if (this.reloadTimeoutId !== null) {
      this.windowRef.clearTimeout(this.reloadTimeoutId);
      this.reloadTimeoutId = null;
    }

    if (this.beforeReloadTimeoutId !== null) {
      this.windowRef.clearTimeout(this.beforeReloadTimeoutId);
      this.beforeReloadTimeoutId = null;
    }

    this.root?.remove();
    this.root = null;
    this.refs = null;
    this.currentVersion = this.initialVersion;
    this.checking = false;
    this.reloading = false;
  }
}
