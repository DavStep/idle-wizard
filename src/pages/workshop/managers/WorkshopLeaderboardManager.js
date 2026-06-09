export class WorkshopLeaderboardManager {
  constructor({ gameplayFacade, leaderboardFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.leaderboardFacade = leaderboardFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
    this.handleRootClick = (event) => {
      if (event.target === this.refs.popup) {
        this.hide();
      }
    };
    this.handleKeydown = (event) => {
      if (!this.visible || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      this.hide();
    };
  }

  mount(parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__leaderboard';

    this.refs.button = this.createButton();
    this.refs.popup = this.createPopup();

    this.root.append(this.refs.button, this.refs.popup);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    if (this.leaderboardFacade) {
      this.unsubscribe = this.leaderboardFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.leaderboardFacade.getSnapshot());
    } else if (this.gameplayFacade) {
      this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
      this.render(this.gameplayFacade.getSnapshot());
    } else {
      this.render({});
    }

    this.applyVisibility();

    return this.root;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__leaderboard-button';
    button.type = 'button';
    button.textContent = 'leaderboard';
    button.addEventListener('click', () => this.show());
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__leaderboard-popup';
    popup.addEventListener('click', this.handleRootClick);

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__leaderboard-dialog style-dialog';
    dialog.setAttribute('aria-label', 'Leaderboard');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    dialog.tabIndex = -1;

    this.refs.dialog = dialog;
    this.refs.title = this.createTitle();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__leaderboard-rows';
    dialog.append(this.refs.title, this.refs.rows);
    popup.append(dialog);

    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'leaderboard';
    return title;
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    const users = this.getTopUsers(snapshot);

    if (!users.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__leaderboard-empty';
      empty.textContent = 'no users yet';
      this.refs.rows.replaceChildren(empty);
      return;
    }

    const header = this.createRow('user', 'total income', { header: true });
    const rows = users.map((user) => this.createRow(user.name, this.formatIncome(user.totalIncome)));
    this.refs.rows.replaceChildren(header, ...rows);
  }

  getTopUsers(snapshot) {
    const users = snapshot?.topUsers ?? snapshot?.leaderboard?.topUsers;
    if (!Array.isArray(users)) {
      return [];
    }

    return users
      .filter((user) => user && typeof user.name === 'string')
      .map((user) => ({
        name: user.name,
        totalIncome: Number.isFinite(user.totalIncome) ? user.totalIncome : 0,
      }));
  }

  formatIncome(totalIncome) {
    return String(Math.floor(totalIncome));
  }

  createRow(label, value, { header = false } = {}) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row';

    if (header) {
      row.classList.add('workshop-page__leaderboard-header');
    }

    const key = document.createElement('span');
    key.className = 'row_key';
    key.textContent = label;

    const val = document.createElement('span');
    val.className = 'row_val';
    val.textContent = value;

    row.append(key, val);
    return row;
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
