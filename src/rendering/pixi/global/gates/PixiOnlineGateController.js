export class PixiOnlineGateController {
  constructor({ reload = () => globalThis.location?.reload?.() } = {}) {
    this.reload = reload;
    this.view = null;
    this.model = null;
    this.previewModel = null;
  }

  attach(view) {
    this.view = view;
    if (this.model) {
      this.view.bind(this.model);
    }
    return view;
  }

  mount() {
    return this.view?.root ?? null;
  }

  showConnecting({ preview = false } = {}) {
    const model = {
      presentation: 'splash',
      message: 'Loading game',
      progress: true,
    };
    if (preview) {
      this.showPreview(model);
      return;
    }
    this.show(model);
  }

  showOffline(reason) {
    if (reason !== 'account_in_use') {
      this.showConnecting();
      return;
    }

    this.show({
      presentation: 'dialog',
      title: 'Account in Use',
      message:
        'Account opened on another device. Close this one to continue there.',
      progress: false,
      actionLabel: 'Play Here',
      onAction: () => this.reload(),
    });
  }

  showMaintenance({
    mode = 'drain',
    message = 'maintenance in progress',
    saving = false,
  } = {}) {
    const normalizedMessage = String(message || 'maintenance in progress').trim();
    this.show({
      presentation: 'dialog',
      title: 'maintenance',
      message: saving
        ? 'maintenance active. saving progress...'
        : mode === 'locked'
          ? normalizedMessage
          : `${normalizedMessage}. progress is saved.`,
      progress: saving,
    });
  }

  show(model) {
    this.model = model;
    this.view?.bind(this.previewModel ?? model);
  }

  showPreview(model) {
    this.previewModel = model;
    this.view?.bind(model);
  }

  hide() {
    this.model = null;
    if (this.previewModel) {
      return;
    }
    this.view?.hide();
  }

  unmount() {
    this.previewModel = null;
    this.model = null;
    this.view?.hide();
    this.view = null;
  }
}
