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
const LEADERBOARD_VISIBLE_USER_LIMIT = 10;

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

  mount(parent, popupParent = parent) {
    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('div');
    this.root.className = 'workshop-page__leaderboard';

    this.refs.button = this.createButton();
    this.refs.popup = this.createPopup();

    this.root.append(this.refs.button);
    parent.append(this.root);
    popupParent.append(this.refs.popup);
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
    const currentUser = this.getCurrentUser(this.lastSnapshot, activeTab);

    if (!users.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__leaderboard-empty';
      empty.textContent = 'no users yet';
      this.refs.rows.replaceChildren(empty);
      return;
    }

    const header = this.createRow('user', activeTab.label, { header: true });
    const rows = users.map((user, index) =>
      this.createRow(this.formatUserLabel(user, index), this.formatValue(user[activeTab.valueKey])),
    );
    const currentRow = this.shouldShowCurrentUser(users, currentUser)
      ? [
          this.createRow(
            this.formatUserLabel(currentUser),
            this.formatValue(currentUser[activeTab.valueKey]),
            { current: true },
          ),
        ]
      : [];

    this.refs.rows.replaceChildren(header, ...rows, ...currentRow);
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
      .map((user) => this.normalizeUser(user))
      .filter(Boolean)
      .sort((left, right) => right[tab.valueKey] - left[tab.valueKey])
      .slice(0, LEADERBOARD_VISIBLE_USER_LIMIT);
  }

  getCurrentUser(snapshot, tab) {
    const leaderboard = snapshot?.leaderboard ?? snapshot ?? {};
    const user =
      tab.id === 'income'
        ? leaderboard.currentIncomeUser ?? leaderboard.currentUser
        : leaderboard.currentGeneratedGoldUser ?? leaderboard.currentUser;

    return this.normalizeUser(user, { includeRank: true });
  }

  formatValue(value) {
    return String(Math.floor(value));
  }

  formatUserLabel(user, index) {
    const rank = this.normalizeRank(user?.rank) ?? index + 1;

    return `${rank}. ${user.name}(${this.normalizePlayerLevel(user.playerLevel)})`;
  }

  normalizeUser(user, { includeRank = false } = {}) {
    if (!user || typeof user.name !== 'string') {
      return null;
    }

    const normalizedUser = {
      name: user.name,
      playerLevel: this.normalizePlayerLevel(user.playerLevel),
      income: Number.isFinite(user.income) ? user.income : 0,
      totalGeneratedGold: Number.isFinite(user.totalGeneratedGold)
        ? user.totalGeneratedGold
        : Number.isFinite(user.totalIncome)
          ? user.totalIncome
          : 0,
      totalIncome: Number.isFinite(user.totalIncome) ? user.totalIncome : 0,
    };

    if (includeRank) {
      normalizedUser.rank = this.normalizeRank(user.rank);
    }

    return normalizedUser;
  }

  normalizeRank(rank) {
    const safeRank = Math.floor(Number(rank));

    if (!Number.isFinite(safeRank) || safeRank < 1) {
      return null;
    }

    return safeRank;
  }

  shouldShowCurrentUser(users, currentUser) {
    const rank = this.normalizeRank(currentUser?.rank);

    return rank !== null && rank > users.length;
  }

  normalizePlayerLevel(playerLevel) {
    const safePlayerLevel = Math.floor(Number(playerLevel));

    if (!Number.isFinite(safePlayerLevel) || safePlayerLevel < 1) {
      return 1;
    }

    return safePlayerLevel;
  }

  createRow(label, value, { header = false, current = false } = {}) {
    const row = document.createElement('div');
    row.className = 'workshop-page__row';

    if (header) {
      row.classList.add('workshop-page__leaderboard-header');
    }

    if (current) {
      row.classList.add('workshop-page__leaderboard-current');
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
