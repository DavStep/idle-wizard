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

    dialog.append(title, message);
    root.append(dialog);
    stage.append(root);

    this.root = root;
    this.refs = {
      title,
      message,
    };

    return root;
  }

  showConnecting() {
    this.show({
      title: 'server required',
      message: 'connecting to server...',
    });
  }

  showOffline(reason) {
    const message =
      reason === 'bindings_missing'
        ? 'server bindings missing'
        : 'server unavailable';

    this.show({
      title: 'server required',
      message,
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

  show({ title, message }) {
    if (!this.root || !this.refs) {
      return;
    }

    this.setText(this.refs.title, title);
    this.setText(this.refs.message, message);
    this.root.hidden = false;
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }
}
