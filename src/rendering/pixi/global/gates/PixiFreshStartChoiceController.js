export const FRESH_START_CHOICE_CONNECT_ACCOUNT = 'connect_account';
export const FRESH_START_CHOICE_START_FRESH = 'start_fresh';

export class PixiFreshStartChoiceController {
  constructor() {
    this.view = null;
    this.resolveChoice = null;
    this.keepOpenOnConnect = false;
    this.previewOpen = false;
    this.model = null;
  }

  attach(view) {
    this.view = view;
    if (this.model) {
      view.bind(this.model);
    }
    return view;
  }

  mount() {
    return this.view?.root ?? null;
  }

  choose({
    authSnapshot,
    statusText,
    busy = false,
    keepOpenOnConnect = false,
    preview = false,
  } = {}) {
    if (this.resolveChoice) {
      this.resolve(FRESH_START_CHOICE_START_FRESH);
    }
    this.keepOpenOnConnect = Boolean(keepOpenOnConnect);
    this.previewOpen = Boolean(preview);
    this.render({ authSnapshot, statusText, busy });
    return new Promise((resolve) => {
      this.resolveChoice = resolve;
    });
  }

  render({ authSnapshot, statusText, busy = false } = {}) {
    const oidc = authSnapshot?.oidc ?? {};
    this.model = {
      statusText: statusText ?? this.getStatusText({ authSnapshot, busy }),
      busy: Boolean(busy),
      connectEnabled: Boolean(oidc.enabled),
      onConnect: () => this.resolve(FRESH_START_CHOICE_CONNECT_ACCOUNT),
      onStartFresh: () => this.resolve(FRESH_START_CHOICE_START_FRESH),
    };
    this.view?.bind(this.model);
  }

  resolve(choice) {
    if (!this.resolveChoice) {
      return false;
    }
    const resolveChoice = this.resolveChoice;
    this.resolveChoice = null;
    this.previewOpen = false;
    const keepOpen =
      choice === FRESH_START_CHOICE_CONNECT_ACCOUNT && this.keepOpenOnConnect;
    if (!keepOpen) {
      this.hide();
    }
    resolveChoice(choice);
    return true;
  }

  hide({ force = false } = {}) {
    if (this.previewOpen && !force) {
      return false;
    }
    this.keepOpenOnConnect = false;
    this.model = null;
    this.view?.hide();
    return true;
  }

  unmount() {
    this.resolve(FRESH_START_CHOICE_START_FRESH);
    this.previewOpen = false;
    this.hide({ force: true });
    this.view = null;
  }

  getStatusText({ authSnapshot, busy = false } = {}) {
    const oidc = authSnapshot?.oidc ?? {};
    if (busy) return 'Connecting...';
    if (oidc.cancelled) return 'Login Cancelled';
    if (oidc.error) return this.getLoginErrorStatusText(oidc.error);
    if (oidc.authenticated || (authSnapshot?.hasToken && oidc.remembered)) {
      return oidc.displayName || oidc.email || 'Connected';
    }
    return oidc.enabled ? 'Not Connected' : 'Login Unavailable';
  }

  getLoginErrorStatusText(error) {
    return this.isLoginUnavailableReason(error)
      ? 'Login Unavailable'
      : `Login Error: ${String(error ?? '').replace(/\s+/g, ' ').trim()}`;
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
}
