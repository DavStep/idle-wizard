const LEADERBOARD_TABS = [
  {
    id: 'totalGeneratedGold',
    label: 'total generated gold',
    valueKey: 'totalGeneratedGold',
  },
  {
    id: 'income',
    label: 'income',
    valueKey: 'income',
  },
];

export class WorkshopLeaderboardManager {
  constructor({ gameplayFacade, leaderboardFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.leaderboardFacade = leaderboardFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = LEADERBOARD_TABS[0].id;
    this.lastSnapshot = {};
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

    const panel = document.createElement('section');
    panel.className = 'workshop-page__leaderboard-panel';
    panel.setAttribute('aria-label', 'Leaderboard');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'workshop-page__leaderboard-dialog style-dialog';

    this.refs.dialog = panel;
    this.refs.title = this.createTitle();
    this.refs.tabs = this.createTabs();
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__leaderboard-rows';
    dialog.append(this.refs.title, this.refs.rows);
    panel.append(dialog, this.refs.tabs);
    popup.append(panel);

    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'leaderboard';
    return title;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__leaderboard-tabs';
    tabs.setAttribute('aria-label', 'Leaderboard type');
    tabs.setAttribute('role', 'tablist');

    this.refs.tabButtons = new Map();

    for (const tab of LEADERBOARD_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__leaderboard-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.id));
      this.refs.tabButtons.set(tab.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  onSelectTab(tabId) {
    if (this.selectedTabId === tabId) {
      return;
    }

    this.selectedTabId = tabId;
    this.render(this.lastSnapshot);
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
    this.selectedTabId = LEADERBOARD_TABS[0].id;
    this.lastSnapshot = {};
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    this.updateTabs();

    const activeTab = this.getActiveTab();
    const users = this.getTopUsers(this.lastSnapshot, activeTab);

    if (!users.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__leaderboard-empty';
      empty.textContent = 'no users yet';
      this.refs.rows.replaceChildren(empty);
      return;
    }

    const header = this.createRow('user', activeTab.label, { header: true });
    const rows = users.map((user) =>
      this.createRow(user.name, this.formatValue(user[activeTab.valueKey])),
    );
    this.refs.rows.replaceChildren(header, ...rows);
  }

  updateTabs() {
    for (const tab of LEADERBOARD_TABS) {
      const selected = this.selectedTabId === tab.id;
      const button = this.refs.tabButtons?.get(tab.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }
  }

  getActiveTab() {
    return LEADERBOARD_TABS.find((tab) => tab.id === this.selectedTabId) ?? LEADERBOARD_TABS[0];
  }

  getTopUsers(snapshot, tab) {
    const leaderboard = snapshot?.leaderboard ?? snapshot ?? {};
    const users =
      tab.id === 'income'
        ? leaderboard.topIncomeUsers ?? leaderboard.topUsers
        : leaderboard.topGeneratedGoldUsers ?? leaderboard.topUsers;

    if (!Array.isArray(users)) {
      return [];
    }

    return users
      .filter((user) => user && typeof user.name === 'string')
      .map((user) => ({
        name: user.name,
        income: Number.isFinite(user.income) ? user.income : 0,
        totalGeneratedGold: Number.isFinite(user.totalGeneratedGold)
          ? user.totalGeneratedGold
          : Number.isFinite(user.totalIncome)
            ? user.totalIncome
            : 0,
        totalIncome: Number.isFinite(user.totalIncome) ? user.totalIncome : 0,
      }))
      .sort((left, right) => right[tab.valueKey] - left[tab.valueKey]);
  }

  formatValue(value) {
    return String(Math.floor(value));
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
