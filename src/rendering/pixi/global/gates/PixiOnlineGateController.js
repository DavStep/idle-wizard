export class PixiOnlineGateController {
  constructor({ reload = () => globalThis.location?.reload?.() } = {}) {
    this.reload = reload;
    this.view = null;
    this.model = null;
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

  showConnecting() {
    this.show({
      title: 'server required',
      message: 'connecting to server...',
      progress: true,
    });
  }

  showOffline(reason) {
    const message = getOfflineMessage(reason);
    this.show({
      title: 'server required',
      message,
      progress: message === 'connecting to server...',
      actionLabel: reason === 'account_in_use' ? 'play here' : '',
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
    this.view?.bind(model);
  }

  hide() {
    this.model = null;
    this.view?.hide();
  }

  unmount() {
    this.hide();
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
    return 'account opened on another device. close this one to continue there.';
  }
  if (
    ['connect_error', 'connect_timeout', 'disconnect', 'gameplay_save_timeout'].includes(
      reason,
    )
  ) {
    return 'connecting to server...';
  }
  return 'server unavailable';
}
