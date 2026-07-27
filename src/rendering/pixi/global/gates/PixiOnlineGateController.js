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
      title: 'Server Required',
      message: 'Connecting to server...',
      progress: true,
    };
    if (preview) {
      this.showPreview(model);
      return;
    }
    this.show(model);
  }

  showOffline(reason) {
    const message = getOfflineMessage(reason);
    this.show({
      title: 'Server Required',
      message,
      progress: message === 'Connecting to server...',
      actionLabel: reason === 'account_in_use' ? 'Play Here' : '',
      onAction: reason === 'account_in_use' ? () => this.reload() : null,
    });
  }

  showMaintenance({
    mode = 'drain',
    message = 'maintenance in progress',
    saving = false,
  } = {}) {
    const normalizedMessage = String(message || 'maintenance in progress').trim();
    this.show({
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

function getOfflineMessage(reason) {
  if (reason === 'bindings_missing') {
    return 'server bindings missing';
  }
  if (reason === 'server_paused') {
    return 'server paused. start the database to continue.';
  }
  if (reason === 'server_no_energy') {
    return 'server out of energy. add energy to continue.';
  }
  if (reason === 'account_in_use') {
    return 'Account opened on another device. Close this one to continue there.';
  }
  if (
    ['connect_error', 'connect_timeout', 'disconnect', 'gameplay_save_timeout'].includes(
      reason,
    )
  ) {
    return 'Connecting to server...';
  }
  return 'server unavailable';
}
