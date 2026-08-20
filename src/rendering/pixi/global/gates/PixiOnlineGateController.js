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

  showConnecting({
    preview = false,
    progressValue,
    status = '',
    reason = '',
  } = {}) {
    const model = {
      presentation: 'splash',
      message: status || getConnectingStatus(reason),
      progress: true,
    };
    if (Number.isFinite(progressValue)) {
      model.progressValue = progressValue;
    }
    if (preview) {
      this.showPreview(model);
      return;
    }
    this.show(model);
  }

  showOffline(reason) {
    if (reason !== 'account_in_use') {
      this.show({
        presentation: 'splash',
        message: getOfflineIssueStatus(reason),
        progress: false,
      });
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
    preview = false,
  } = {}) {
    const normalizedMessage = String(message || 'maintenance in progress').trim();
    const displayMessage = normalizedMessage.replace(/^[a-z]/, (letter) =>
      letter.toUpperCase(),
    );
    const sentence = /[.!?]$/.test(displayMessage)
      ? displayMessage
      : `${displayMessage}.`;
    const model = {
      presentation: 'dialog',
      title: 'Maintenance',
      message: saving
        ? `${sentence} Saving progress...`
        : mode === 'locked'
          ? displayMessage
          : `${sentence} Progress is saved.`,
      progress: saving,
    };
    if (preview) {
      this.showPreview(model);
      return;
    }
    this.show(model);
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

export function getConnectingStatus(reason) {
  return reason === 'connect_timeout'
    ? 'Connection timed out. Retrying...'
    : reason === 'disconnect'
      ? 'Connection lost. Retrying...'
      : reason === 'gameplay_save_timeout'
        ? 'Player data took too long. Retrying...'
        : reason === 'connect_error'
          ? 'Connection failed. Retrying...'
          : 'Connecting user...';
}

export function getOfflineIssueStatus(reason) {
  return reason === 'bindings_missing'
    ? 'Issue: Server bindings are missing.'
    : reason === 'server_paused'
      ? 'Issue: Server is paused.'
      : reason === 'server_no_energy'
        ? 'Issue: Server is out of energy.'
        : reason === 'gameplay_save_ready_error'
          ? 'Issue: Player data could not be loaded.'
          : 'Issue: Server is unavailable.';
}
