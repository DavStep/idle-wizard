export class AppVisibilityManager {
  constructor({ appPlugin = null, documentRef = globalThis.document } = {}) {
    this.appPlugin = appPlugin;
    this.documentRef = documentRef;
    this.visible = true;
    this.mounted = false;
    this.listenerHandles = new Set();
    this.onHidden = null;
    this.onVisible = null;
    this.handleDocumentVisibilityChange = () => {
      this.setVisible(this.isDocumentVisible());
    };
    this.handleAppStateChange = (state = {}) => {
      this.setVisible(state.isActive !== false);
    };
  }

  mount({ onHidden, onVisible } = {}) {
    if (this.mounted) {
      return;
    }

    this.mounted = true;
    this.onHidden = typeof onHidden === 'function' ? onHidden : null;
    this.onVisible = typeof onVisible === 'function' ? onVisible : null;
    this.visible = this.isDocumentVisible();

    this.documentRef?.addEventListener?.(
      'visibilitychange',
      this.handleDocumentVisibilityChange,
    );
    this.bindAppStateListener();

    if (!this.visible) {
      this.onHidden?.();
    }
  }

  unmount() {
    this.mounted = false;
    this.onHidden = null;
    this.onVisible = null;
    this.documentRef?.removeEventListener?.(
      'visibilitychange',
      this.handleDocumentVisibilityChange,
    );

    for (const handle of this.listenerHandles) {
      void handle?.remove?.();
    }
    this.listenerHandles.clear();
  }

  bindAppStateListener() {
    if (typeof this.appPlugin?.addListener !== 'function') {
      return;
    }

    void Promise.resolve(
      this.appPlugin.addListener('appStateChange', this.handleAppStateChange),
    )
      .then((handle) => {
        if (!handle) {
          return;
        }

        if (!this.mounted) {
          void handle.remove?.();
          return;
        }

        this.listenerHandles.add(handle);
      })
      .catch(() => {});
  }

  setVisible(visible) {
    const nextVisible = Boolean(visible);
    if (nextVisible === this.visible) {
      return;
    }

    this.visible = nextVisible;

    if (nextVisible) {
      this.onVisible?.();
      return;
    }

    this.onHidden?.();
  }

  isDocumentVisible() {
    if (!this.documentRef) {
      return true;
    }

    if (this.documentRef.visibilityState === 'hidden') {
      return false;
    }

    return this.documentRef.hidden !== true;
  }
}
