export const FRESH_START_CHOICE_CONNECT_ACCOUNT = 'connect_account';
export const FRESH_START_CHOICE_START_FRESH = 'start_fresh';

export class AppFreshStartChoiceManager {
  constructor() {
    this.root = null;
    this.refs = null;
    this.resolveChoice = null;
    this.previousFocus = null;
    this.keepOpenOnConnect = false;
    this.handleConnectAccount = () =>
      this.resolve(FRESH_START_CHOICE_CONNECT_ACCOUNT);
    this.handleStartFresh = () => this.resolve(FRESH_START_CHOICE_START_FRESH);
  }

  mount(stage) {
    if (!stage) {
      throw new Error('AppFreshStartChoiceManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    const root = document.createElement('section');
    root.className = 'app-fresh-start-choice';
    root.hidden = true;
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('role', 'dialog');

    const panel = document.createElement('div');
    panel.className = 'app-fresh-start-choice__panel';
    panel.tabIndex = -1;

    const dialog = document.createElement('div');
    dialog.className = 'app-fresh-start-choice__dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'account';

    const message = document.createElement('p');
    message.className = 'app-fresh-start-choice__message';
    message.textContent = 'do you already have an account?';

    const status = document.createElement('p');
    status.className = 'app-fresh-start-choice__status';
    status.setAttribute('aria-live', 'polite');

    const actions = document.createElement('div');
    actions.className = 'app-fresh-start-choice__actions';

    const connectButton = document.createElement('button');
    connectButton.className =
      'style-button app-fresh-start-choice__button app-fresh-start-choice__button--connect';
    connectButton.type = 'button';
    connectButton.textContent = 'connect account';
    connectButton.setAttribute('aria-label', 'connect account');

    const freshButton = document.createElement('button');
    freshButton.className =
      'style-button app-fresh-start-choice__button app-fresh-start-choice__button--fresh';
    freshButton.type = 'button';
    freshButton.textContent = 'start fresh';
    freshButton.setAttribute('aria-label', 'start fresh');

    actions.append(connectButton, freshButton);
    dialog.append(title, message, status, actions);
    panel.append(dialog);
    root.append(panel);
    stage.append(root);

    connectButton.addEventListener('click', this.handleConnectAccount);
    freshButton.addEventListener('click', this.handleStartFresh);

    this.root = root;
    this.refs = {
      panel,
      status,
      connectButton,
      freshButton,
    };

    return root;
  }

  choose({ authSnapshot, statusText, busy = false, keepOpenOnConnect = false } = {}) {
    if (!this.root || !this.refs) {
      return Promise.resolve(FRESH_START_CHOICE_START_FRESH);
    }

    if (this.resolveChoice) {
      this.resolve(FRESH_START_CHOICE_START_FRESH);
    }

    this.keepOpenOnConnect = Boolean(keepOpenOnConnect);
    this.render({ authSnapshot, statusText, busy });
    const activeElement = document.activeElement;
    this.previousFocus =
      typeof activeElement?.focus === 'function' ? activeElement : null;
    this.root.hidden = false;
    this.refs.panel.focus();

    return new Promise((resolve) => {
      this.resolveChoice = resolve;
    });
  }

  unmount() {
    this.resolve(FRESH_START_CHOICE_START_FRESH);
    this.refs?.connectButton?.removeEventListener('click', this.handleConnectAccount);
    this.refs?.freshButton?.removeEventListener('click', this.handleStartFresh);
    this.root?.remove();
    this.root = null;
    this.refs = null;
    this.previousFocus = null;
  }

  resolve(choice) {
    if (!this.resolveChoice) {
      return;
    }

    const resolveChoice = this.resolveChoice;
    this.resolveChoice = null;
    const keepOpen =
      choice === FRESH_START_CHOICE_CONNECT_ACCOUNT && this.keepOpenOnConnect;

    if (!keepOpen) {
      this.hide();
    }

    resolveChoice(choice);
  }

  hide() {
    if (this.root) {
      this.root.hidden = true;
      this.root.removeAttribute('aria-busy');
    }

    this.keepOpenOnConnect = false;
    this.previousFocus?.focus?.();
    this.previousFocus = null;
  }

  render({ authSnapshot, statusText, busy = false } = {}) {
    const oidc = authSnapshot?.oidc ?? {};
    const enabled = Boolean(oidc.enabled);
    const isBusy = Boolean(busy);
    const defaultStatusText = this.getStatusText({ authSnapshot, busy: isBusy });

    if (isBusy) {
      this.root?.setAttribute('aria-busy', 'true');
    } else {
      this.root?.removeAttribute('aria-busy');
    }
    this.refs.connectButton.disabled = isBusy || !enabled;
    this.refs.freshButton.disabled = isBusy;
    this.setText(
      this.refs.connectButton,
      isBusy ? 'connecting...' : 'connect account',
    );
    this.refs.connectButton.setAttribute(
      'aria-label',
      isBusy ? 'connecting account' : 'connect account',
    );
    this.setText(
      this.refs.status,
      statusText ?? defaultStatusText,
    );
  }

  getStatusText({ authSnapshot, busy = false } = {}) {
    const oidc = authSnapshot?.oidc ?? {};
    if (busy) {
      return 'connecting...';
    }

    if (oidc.cancelled) {
      return 'login cancelled';
    }

    if (oidc.error) {
      return this.getLoginErrorStatusText(oidc.error);
    }

    if (oidc.authenticated || (authSnapshot?.hasToken && oidc.remembered)) {
      return oidc.displayName || oidc.email || 'connected';
    }

    if (!oidc.enabled) {
      return 'login unavailable';
    }

    return 'not connected';
  }

  getLoginErrorStatusText(error) {
    if (this.isLoginUnavailableReason(error)) {
      return 'login unavailable';
    }

    return `login error: ${this.getErrorText(error)}`;
  }

  getErrorText(error) {
    return String(error ?? '').replace(/\s+/g, ' ').trim();
  }

  isLoginUnavailableReason(reason) {
    return [
      'browser_not_supported',
      'invalid_client',
      'missing_client_id',
      'opt_out_or_no_session',
      'secure_http_required',
      'suppressed_by_user',
      'unregistered_origin',
      'unknown_reason',
      'web_unavailable',
    ].includes(String(reason ?? '').trim());
  }

  setText(element, text) {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }
}
