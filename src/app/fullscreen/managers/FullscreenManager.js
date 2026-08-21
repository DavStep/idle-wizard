import { Capacitor } from '@capacitor/core';

const MOBILE_USER_AGENT_PATTERN =
  /Android|iPhone|iPad|iPod|IEMobile|Mobile|Silk/i;

export class FullscreenManager {
  constructor({
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    navigatorRef = globalThis.navigator,
    isNativePlatform = () => Capacitor.isNativePlatform(),
  } = {}) {
    this.documentRef = documentRef;
    this.windowRef = windowRef;
    this.navigatorRef = navigatorRef;
    this.isNativePlatform = isNativePlatform;
    this.listeners = new Set();
    this.mounted = false;
    this.handleFullscreenChange = () => this.emit();
  }

  mount() {
    if (this.mounted) {
      return false;
    }
    this.mounted = true;
    this.documentRef?.addEventListener?.(
      'fullscreenchange',
      this.handleFullscreenChange,
    );
    return true;
  }

  getSnapshot() {
    const active = Boolean(this.documentRef?.fullscreenElement);
    return {
      available: this.isAvailable({ active }),
      active,
    };
  }

  setEnabled(enabled) {
    const nextEnabled = enabled === true;
    const snapshot = this.getSnapshot();
    if (!snapshot.available) {
      return false;
    }
    if (snapshot.active === nextEnabled) {
      return true;
    }

    const operation = nextEnabled
      ? this.documentRef?.documentElement?.requestFullscreen?.()
      : this.documentRef?.exitFullscreen?.();
    if (!operation) {
      this.emit();
      return false;
    }

    void Promise.resolve(operation).then(
      () => this.emit(),
      () => this.emit(),
    );
    return true;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  isAvailable({ active = false } = {}) {
    if (
      !this.documentRef ||
      this.isNativePlatform?.() ||
      this.isStandaloneDisplay() ||
      !this.isMobileBrowser()
    ) {
      return false;
    }
    if (active) {
      return typeof this.documentRef.exitFullscreen === 'function';
    }
    return Boolean(
      this.documentRef.fullscreenEnabled !== false &&
      typeof this.documentRef.documentElement?.requestFullscreen === 'function',
    );
  }

  isStandaloneDisplay() {
    return Boolean(
      this.navigatorRef?.standalone === true ||
      this.windowRef?.matchMedia?.('(display-mode: standalone)')?.matches ||
      this.windowRef?.matchMedia?.('(display-mode: fullscreen)')?.matches,
    );
  }

  isMobileBrowser() {
    if (this.navigatorRef?.userAgentData?.mobile === true) {
      return true;
    }
    if (MOBILE_USER_AGENT_PATTERN.test(this.navigatorRef?.userAgent ?? '')) {
      return true;
    }
    return Boolean(
      (this.navigatorRef?.maxTouchPoints ?? 0) > 0 &&
      this.windowRef?.matchMedia?.('(pointer: coarse)')?.matches,
    );
  }

  emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  destroy() {
    if (this.mounted) {
      this.documentRef?.removeEventListener?.(
        'fullscreenchange',
        this.handleFullscreenChange,
      );
    }
    this.mounted = false;
    this.listeners.clear();
  }
}
