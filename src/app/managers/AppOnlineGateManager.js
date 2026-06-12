export class AppOnlineGateManager {
  constructor() {
    this.root = null;
    this.refs = null;
  }

  mount(stage) {
    if (!stage) {
      throw new Error('AppOnlineGateManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    const root = document.createElement('section');
    root.className = 'app-online-gate';
    root.hidden = true;
    root.setAttribute('aria-live', 'polite');

    const dialog = document.createElement('div');
    dialog.className = 'app-online-gate__dialog style-dialog';
    dialog.setAttribute('role', 'status');

    const title = document.createElement('div');
    title.className = 'style-box__title';

    const message = document.createElement('p');
    message.className = 'app-online-gate__message';

    const progress = document.createElement('div');
    progress.className = 'app-online-gate__progress style-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', 'server connection progress');
    progress.hidden = true;

    const progressFill = document.createElement('div');
    progressFill.className = 'app-online-gate__progress-fill style-progress__fill';

    const progressText = document.createElement('span');
    progressText.className = 'style-progress__text app-online-gate__progress-text';

    progress.append(progressFill, progressText);
    dialog.append(title, message, progress);
    root.append(dialog);
    stage.append(root);

    this.root = root;
    this.refs = {
      title,
      message,
      progress,
    };

    return root;
  }

  showConnecting() {
    this.show({
      title: 'server required',
      message: 'connecting to server...',
      progress: true,
    });
  }

  showOffline(reason) {
    const message =
      reason === 'bindings_missing'
        ? 'server bindings missing'
        : reason === 'connect_error' ||
            reason === 'disconnect' ||
            reason === 'gameplay_save_timeout'
          ? 'connecting to server...'
        : 'server unavailable';

    this.show({
      title: 'server required',
      message,
      progress: message === 'connecting to server...',
    });
  }

  hide() {
    if (this.root) {
      this.root.hidden = true;
    }
  }

  unmount() {
    this.root?.remove();
    this.root = null;
    this.refs = null;
  }

  show({ title, message, progress = false }) {
    if (!this.root || !this.refs) {
      return;
    }

    this.setText(this.refs.title, title);
    this.setText(this.refs.message, message);
    this.refs.progress.hidden = !progress;
    this.refs.progress.classList.toggle('is-indeterminate', progress);

    if (progress) {
      this.refs.progress.setAttribute('aria-valuetext', message);
    } else {
      this.refs.progress.removeAttribute('aria-valuetext');
    }

    this.root.hidden = false;
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }
}
