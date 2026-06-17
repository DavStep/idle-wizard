const POINTER_ATLAS_URL = new URL('../assets/pointer.atlas', import.meta.url).href;
const POINTER_IMAGE_URL = new URL('../assets/pointer.png', import.meta.url).href;
const POINTER_SKEL_URL = new URL('../assets/pointer.skel', import.meta.url).href;
const POINTER_IMAGE_NAME = 'pointer.png';
const POINTER_ANIMATION_NAME = 'click1';

let spinePlayerModulePromise = null;
let supportsSpineRuntime = null;

export class TutorialPointerSpineManager {
  constructor() {
    this.host = null;
    this.root = null;
    this.player = null;
    this.loadPromise = null;
    this.visible = false;
  }

  mount({ host, root } = {}) {
    this.host = host ?? null;
    this.root = root ?? null;
    this.setReady(false);
  }

  unmount() {
    this.visible = false;
    this.disposePlayer();
    this.host = null;
    this.root = null;
  }

  show() {
    this.visible = true;

    if (!this.canUseRuntime()) {
      return;
    }

    if (this.player) {
      this.setReady(true);
      this.player.play?.();
      this.player.startRendering?.();
      return;
    }

    void this.ensurePlayer();
  }

  hide({ fallbackOnly = false } = {}) {
    this.visible = false;
    this.player?.stopRendering?.();

    if (fallbackOnly) {
      this.setReady(false);
    }
  }

  canUseRuntime() {
    if (!this.host || !this.root) {
      return false;
    }

    const view = this.host.ownerDocument?.defaultView ?? globalThis.window;
    const userAgent = view?.navigator?.userAgent ?? '';

    if (/jsdom/i.test(userAgent)) {
      return false;
    }

    if (supportsSpineRuntime !== null) {
      return supportsSpineRuntime;
    }

    const canvas = this.host.ownerDocument?.createElement?.('canvas');

    if (!canvas || typeof canvas.getContext !== 'function') {
      supportsSpineRuntime = false;
      return supportsSpineRuntime;
    }

    try {
      supportsSpineRuntime = Boolean(
        canvas.getContext('webgl', { alpha: true }) ||
          canvas.getContext('experimental-webgl'),
      );
    } catch {
      supportsSpineRuntime = false;
    }

    return supportsSpineRuntime;
  }

  async ensurePlayer() {
    if (this.player || this.loadPromise || !this.canUseRuntime()) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadPlayer().finally(() => {
      this.loadPromise = null;
    });

    return this.loadPromise;
  }

  async loadPlayer() {
    const SpinePlayer = await loadSpinePlayerClass();

    if (!SpinePlayer || !this.host || !this.root) {
      this.setReady(false);
      return;
    }

    const player = new SpinePlayer(this.host, {
      skeleton: POINTER_SKEL_URL,
      atlas: POINTER_ATLAS_URL,
      rawDataURIs: {
        [POINTER_IMAGE_NAME]: POINTER_IMAGE_URL,
      },
      animation: POINTER_ANIMATION_NAME,
      showControls: false,
      showLoading: false,
      interactive: false,
      alpha: true,
      backgroundColor: '00000000',
      viewport: {
        padLeft: 0,
        padRight: 0,
        padTop: 0,
        padBottom: 0,
        transitionTime: 0,
      },
      success: (nextPlayer) => {
        if (this.player !== nextPlayer) {
          nextPlayer.dispose?.();
          return;
        }

        nextPlayer.setAnimation?.(POINTER_ANIMATION_NAME, true);
        nextPlayer.play?.();
        nextPlayer.dom?.setAttribute?.('aria-hidden', 'true');
        nextPlayer.dom?.style?.setProperty?.('pointer-events', 'none');
        this.setReady(true);

        if (!this.visible) {
          nextPlayer.stopRendering?.();
        }
      },
      error: (nextPlayer) => {
        if (this.player !== nextPlayer) {
          return;
        }

        this.disposePlayer();
        this.setReady(false);
      },
    });

    this.player = player;
    player.dom?.setAttribute?.('aria-hidden', 'true');
    player.dom?.style?.setProperty?.('pointer-events', 'none');

    if (!this.visible) {
      player.stopRendering?.();
    }
  }

  disposePlayer() {
    this.player?.dispose?.();
    this.player = null;
  }

  setReady(ready) {
    this.root?.classList?.toggle('has-spine', Boolean(ready));
  }
}

async function loadSpinePlayerClass() {
  if (!spinePlayerModulePromise) {
    spinePlayerModulePromise = import('@esotericsoftware/spine-player');
  }

  try {
    const module = await spinePlayerModulePromise;
    return module?.SpinePlayer ?? null;
  } catch {
    spinePlayerModulePromise = null;
    return null;
  }
}
