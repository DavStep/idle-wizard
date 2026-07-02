import { normalizePlayerCharacter } from '../../../player/playerCharacters.js';
import { normalizeTradeAllianceTagColor } from '../../../shared/tradeAllianceTagColors.js';
import { createAllianceTagSpan, normalizeAllianceTag } from '../../shared/allianceTagLabel.js';
import {
  createWorkshopLeaderboardRow,
  createWorkshopLeaderboardUserLabel,
} from './WorkshopLeaderboardRowRenderer.js';

const LEADERBOARD_SCOPES = [
  {
    id: 'singlePlayer',
    label: 'single player',
    rowLabel: 'user',
    emptyLabel: 'no users yet',
  },
  {
    id: 'alliance',
    label: 'alliance',
    rowLabel: 'alliance',
    emptyLabel: 'no alliances yet',
  },
];

const LEADERBOARD_PERIODS = [
  {
    id: 'daily',
    label: 'daily',
    valueKey: 'dailyIncome',
    userListKey: 'topDailyUsers',
    currentUserKey: 'currentDailyUser',
    allianceListKey: 'topDailyAlliances',
  },
  {
    id: 'weekly',
    label: 'weekly',
    valueKey: 'weeklyIncome',
    userListKey: 'topWeeklyUsers',
    currentUserKey: 'currentWeeklyUser',
    allianceListKey: 'topWeeklyAlliances',
  },
  {
    id: 'monthly',
    label: 'monthly',
    valueKey: 'monthlyIncome',
    userListKey: 'topMonthlyUsers',
    currentUserKey: 'currentMonthlyUser',
    allianceListKey: 'topMonthlyAlliances',
  },
  {
    id: 'allTime',
    label: 'all time',
    valueKey: 'totalIncome',
    userListKey: 'topAllTimeUsers',
    currentUserKey: 'currentAllTimeUser',
    allianceListKey: 'topAllTimeAlliances',
  },
];

const LEADERBOARD_VISIBLE_USER_LIMIT = 100;
const LEADERBOARD_VISIBLE_ALLIANCE_LIMIT = 10;
const DEFAULT_SCOPE_ID = 'singlePlayer';
const DEFAULT_PERIOD_ID = 'allTime';

export class WorkshopLeaderboardManager {
  constructor({
    gameplayFacade,
    leaderboardFacade,
    tradeAllianceFacade,
    onOpenPlayerInfo,
    onOpenAllianceInfo,
    onRequirePlayerSurfaceAccess,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.leaderboardFacade = leaderboardFacade;
    this.tradeAllianceFacade = tradeAllianceFacade;
    this.onOpenPlayerInfo = onOpenPlayerInfo;
    this.onOpenAllianceInfo = onOpenAllianceInfo;
    this.onRequirePlayerSurfaceAccess = onRequirePlayerSurfaceAccess;
    this.root = null;
    this.unsubscribeLeaderboard = null;
    this.unsubscribeGameplay = null;
    this.unsubscribeTradeAlliance = null;
    this.releaseTradeAlliancePublicData = null;
    this.refs = {};
    this.visible = false;
    this.selectedScopeId = DEFAULT_SCOPE_ID;
    this.selectedPeriodId = DEFAULT_PERIOD_ID;
    this.lastLeaderboardSnapshot = {};
    this.lastTradeAllianceSnapshot = {};
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
      this.unsubscribeLeaderboard = this.leaderboardFacade.subscribe((snapshot) => {
        this.lastLeaderboardSnapshot = snapshot ?? {};
        this.render();
      });
      this.lastLeaderboardSnapshot = this.leaderboardFacade.getSnapshot();
    } else if (this.gameplayFacade) {
      this.unsubscribeGameplay = this.gameplayFacade.subscribe((snapshot) => {
        this.lastLeaderboardSnapshot = snapshot ?? {};
        this.render();
      });
      this.lastLeaderboardSnapshot = this.gameplayFacade.getSnapshot();
    }

    if (this.tradeAllianceFacade) {
      this.unsubscribeTradeAlliance = this.tradeAllianceFacade.subscribe((snapshot) => {
        this.lastTradeAllianceSnapshot = snapshot ?? {};
        this.render();
      });
      this.lastTradeAllianceSnapshot = this.tradeAllianceFacade.getSnapshot();
    }

    this.render();

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
    this.refs.scopeTabs = this.createTabs({
      className: 'workshop-page__leaderboard-tabs workshop-page__leaderboard-scope-tabs',
      label: 'Leaderboard type',
      tabs: LEADERBOARD_SCOPES,
      refKey: 'scopeTabButtons',
      onSelect: (tabId) => this.onSelectScope(tabId),
    });
    this.refs.periodTabs = this.createTabs({
      className: 'workshop-page__leaderboard-tabs workshop-page__leaderboard-period-tabs',
      label: 'Leaderboard period',
      tabs: LEADERBOARD_PERIODS,
      refKey: 'periodTabButtons',
      onSelect: (tabId) => this.onSelectPeriod(tabId),
    });
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__leaderboard-rows';
    dialog.append(this.refs.title, this.refs.rows);
    panel.append(dialog, this.refs.scopeTabs, this.refs.periodTabs);
    popup.append(panel);

    return popup;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'leaderboard';
    return title;
  }

  createTabs({ className, label, tabs: tabList, refKey, onSelect }) {
    const tabs = document.createElement('div');
    tabs.className = className;
    tabs.setAttribute('aria-label', label);
    tabs.setAttribute('role', 'tablist');

    this.refs[refKey] = new Map();

    for (const tab of tabList) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__leaderboard-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => onSelect(tab.id));
      this.refs[refKey].set(tab.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  onSelectScope(scopeId) {
    if (this.selectedScopeId === scopeId) {
      return;
    }

    this.selectedScopeId = scopeId;
    this.render();
  }

  onSelectPeriod(periodId) {
    if (this.selectedPeriodId === periodId) {
      return;
    }

    this.selectedPeriodId = periodId;
    this.render();
  }

  show() {
    if (!this.isButtonAvailable()) {
      return { ok: false, reason: 'unavailable', dialogId: 'leaderboard' };
    }

    return this.requirePlayerSurfaceAccess(() => this.showUnlocked(), {
      dialogId: 'leaderboard',
    });
  }

  showUnlocked() {
    if (!this.releaseTradeAlliancePublicData) {
      this.releaseTradeAlliancePublicData =
        this.tradeAllianceFacade?.retainPublicData?.() ?? null;
    }
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.dialog?.focus();
    return { ok: true, dialogId: 'leaderboard', pageId: 'workshop' };
  }

  requirePlayerSurfaceAccess(open, meta) {
    if (typeof this.onRequirePlayerSurfaceAccess === 'function') {
      return this.onRequirePlayerSurfaceAccess(open, meta);
    }

    return open();
  }

  isButtonAvailable() {
    return (
      this.root &&
      !this.root.hidden &&
      this.refs.button?.disabled !== true &&
      this.refs.button?.getAttribute('aria-disabled') !== 'true'
    );
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();
    this.releaseTradeAlliancePublicData?.();
    this.releaseTradeAlliancePublicData = null;

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  unmount() {
    this.releaseTradeAlliancePublicData?.();
    this.releaseTradeAlliancePublicData = null;
    this.unsubscribeLeaderboard?.();
    this.unsubscribeGameplay?.();
    this.unsubscribeTradeAlliance?.();
    this.unsubscribeLeaderboard = null;
    this.unsubscribeGameplay = null;
    this.unsubscribeTradeAlliance = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.selectedScopeId = DEFAULT_SCOPE_ID;
    this.selectedPeriodId = DEFAULT_PERIOD_ID;
    this.lastLeaderboardSnapshot = {};
    this.lastTradeAllianceSnapshot = {};
    this.previousFocus = null;
  }

  render() {
    if (!this.root) {
      return;
    }

    this.updateTabs();

    const activeScope = this.getActiveScope();
    const activePeriod = this.getActivePeriod();
    const isAllianceScope = activeScope.id === 'alliance';
    const rows = isAllianceScope
      ? this.getTopAlliances(this.lastTradeAllianceSnapshot, activePeriod)
      : this.getTopUsers(this.lastLeaderboardSnapshot, activePeriod);
    const currentUser = isAllianceScope
      ? null
      : this.getCurrentUser(this.lastLeaderboardSnapshot, activePeriod);

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'workshop-page__leaderboard-empty';
      empty.textContent = activeScope.emptyLabel;
      this.refs.rows.replaceChildren(empty);
      return;
    }

    const header = this.createRow(activeScope.rowLabel, activePeriod.label, {
      header: true,
    });
    const bodyRows = rows.map((row, index) =>
      this.createRow(
        isAllianceScope
          ? this.createAllianceLabel(row, index)
          : this.createUserLabel(row, index),
        this.formatValue(row[activePeriod.valueKey]),
        {
          current: !isAllianceScope
            ? this.isCurrentUserRow(row, currentUser, index)
            : false,
          onActivate: isAllianceScope ? () => this.openAllianceInfo(row) : null,
        },
      ),
    );
    const currentRow = this.shouldShowCurrentUser(rows, currentUser)
      ? [
          this.createRow(
            this.createUserLabel(currentUser),
            this.formatValue(currentUser[activePeriod.valueKey]),
            { current: true },
          ),
        ]
      : [];

    this.refs.rows.replaceChildren(header, ...bodyRows, ...currentRow);
  }

  updateTabs() {
    for (const tab of LEADERBOARD_SCOPES) {
      const selected = this.selectedScopeId === tab.id;
      const button = this.refs.scopeTabButtons?.get(tab.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }

    for (const tab of LEADERBOARD_PERIODS) {
      const selected = this.selectedPeriodId === tab.id;
      const button = this.refs.periodTabButtons?.get(tab.id);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }
  }

  getActiveScope() {
    return (
      LEADERBOARD_SCOPES.find((scope) => scope.id === this.selectedScopeId) ??
      LEADERBOARD_SCOPES[0]
    );
  }

  getActivePeriod() {
    return (
      LEADERBOARD_PERIODS.find((period) => period.id === this.selectedPeriodId) ??
      LEADERBOARD_PERIODS.find((period) => period.id === DEFAULT_PERIOD_ID) ??
      LEADERBOARD_PERIODS[0]
    );
  }

  getTopUsers(snapshot, period) {
    const leaderboard = snapshot?.leaderboard ?? snapshot ?? {};
    const users = this.getUserRowsForPeriod(leaderboard, period);

    if (!Array.isArray(users)) {
      return [];
    }

    return users
      .map((user) => this.normalizeUser(user))
      .filter(Boolean)
      .sort((left, right) => right[period.valueKey] - left[period.valueKey])
      .slice(0, LEADERBOARD_VISIBLE_USER_LIMIT);
  }

  getCurrentUser(snapshot, period) {
    const leaderboard = snapshot?.leaderboard ?? snapshot ?? {};
    const user =
      leaderboard[period.currentUserKey] ??
      (period.id === 'allTime'
        ? leaderboard.currentGeneratedCoinUser ?? leaderboard.currentUser
        : null);

    return this.normalizeUser(user, { includeRank: true });
  }

  getTopAlliances(snapshot, period) {
    const alliances = this.getAllianceRowsForPeriod(snapshot, period);

    return alliances
      .map((alliance) => this.normalizeAlliance(alliance))
      .filter(Boolean)
      .sort((left, right) => right[period.valueKey] - left[period.valueKey])
      .slice(0, LEADERBOARD_VISIBLE_ALLIANCE_LIMIT)
      .map((alliance, index) => ({
        ...alliance,
        rank: alliance.rank ?? index + 1,
      }));
  }

  getUserRowsForPeriod(leaderboard, period) {
    if (Array.isArray(leaderboard?.[period.userListKey])) {
      return leaderboard[period.userListKey];
    }

    if (period.id === 'allTime') {
      return (
        leaderboard.topAllTimeUsers ??
        leaderboard.topGeneratedCoinUsers ??
        leaderboard.topUsers ??
        []
      );
    }

    return [];
  }

  getAllianceRowsForPeriod(snapshot, period) {
    if (Array.isArray(snapshot?.[period.allianceListKey])) {
      return snapshot[period.allianceListKey];
    }

    if (Array.isArray(snapshot?.alliances)) {
      return snapshot.alliances;
    }

    if (period.id === 'weekly' && Array.isArray(snapshot?.topAlliances)) {
      return snapshot.topAlliances;
    }

    return [];
  }

  formatValue(value) {
    return String(Math.floor(value));
  }

  formatUserLabel(user, index) {
    const rank = this.normalizeRank(user?.rank) ?? index + 1;
    const allianceTag = user.allianceTag ? `[${user.allianceTag}] ` : '';

    return `${rank}. ${allianceTag}${user.name} (${this.normalizePlayerLevel(user.playerLevel)})`;
  }

  formatAllianceLabel(alliance, index) {
    const rank = this.normalizeRank(alliance?.rank) ?? index + 1;

    return `${rank}. ${alliance.name} [${alliance.tag}]`;
  }

  normalizeUser(user, { includeRank = false } = {}) {
    if (!user || typeof user.name !== 'string') {
      return null;
    }

    const normalizedUser = {
      name: user.name,
      identity: user.identity,
      allianceTag: this.normalizeAllianceTag(user.allianceTag ?? user.alliance_tag),
      allianceTagColor: normalizeTradeAllianceTagColor(
        user.allianceTagColor ?? user.alliance_tag_color,
      ),
      character: normalizePlayerCharacter(user.character),
      playerLevel: this.normalizePlayerLevel(user.playerLevel),
      income: this.normalizeMetric(user.income),
      dailyIncome: this.normalizeMetric(user.dailyIncome),
      weeklyIncome: this.normalizeMetric(user.weeklyIncome, user.seasonIncome),
      monthlyIncome: this.normalizeMetric(user.monthlyIncome),
      totalGeneratedCoin: this.normalizeMetric(user.totalIncome, user.totalGeneratedCoin),
      totalIncome: this.normalizeMetric(user.totalIncome, user.totalGeneratedCoin),
      prestigeCount: this.normalizeMetric(user.prestigeCount),
    };

    if (includeRank) {
      normalizedUser.rank = this.normalizeRank(user.rank);
    }

    return normalizedUser;
  }

  normalizeAlliance(alliance) {
    if (!alliance || typeof alliance.name !== 'string') {
      return null;
    }

    return {
      allianceId: alliance.allianceId,
      name: alliance.name,
      tag: typeof alliance.tag === 'string' ? alliance.tag : '',
      tagColor: normalizeTradeAllianceTagColor(alliance.tagColor ?? alliance.tag_color),
      description: typeof alliance.description === 'string' ? alliance.description : '',
      notice: typeof alliance.notice === 'string' ? alliance.notice : '',
      joinMode: typeof alliance.joinMode === 'string' ? alliance.joinMode : '',
      memberCount: this.normalizeMetric(alliance.memberCount),
      dailyIncome: this.normalizeMetric(alliance.dailyIncome),
      weeklyIncome: this.normalizeMetric(alliance.weeklyIncome, alliance.seasonIncome),
      monthlyIncome: this.normalizeMetric(alliance.monthlyIncome),
      seasonIncome: this.normalizeMetric(alliance.seasonIncome, alliance.weeklyIncome),
      totalIncome: this.normalizeMetric(alliance.totalIncome),
      rank: this.normalizeRank(alliance.rank),
    };
  }

  normalizeMetric(...values) {
    for (const value of values) {
      if (typeof value === 'bigint') {
        return Number(value);
      }

      if (Number.isFinite(value)) {
        return value;
      }
    }

    return 0;
  }

  normalizeRank(rank) {
    const safeRank = Math.floor(Number(rank));

    if (!Number.isFinite(safeRank) || safeRank < 1) {
      return null;
    }

    return safeRank;
  }

  normalizeAllianceTag(tag) {
    return normalizeAllianceTag(tag);
  }

  shouldShowCurrentUser(users, currentUser) {
    const rank = this.normalizeRank(currentUser?.rank);

    return rank !== null && rank > users.length;
  }

  isCurrentUserRow(row, currentUser, index) {
    if (!currentUser) {
      return false;
    }

    const rowIdentity = String(row?.identity ?? '');
    const currentIdentity = String(currentUser?.identity ?? '');

    if (rowIdentity && currentIdentity) {
      return rowIdentity === currentIdentity;
    }

    const currentRank = this.normalizeRank(currentUser?.rank);
    const rowRank = this.normalizeRank(row?.rank) ?? index + 1;

    return currentRank !== null && currentRank === rowRank;
  }

  normalizePlayerLevel(playerLevel) {
    const safePlayerLevel = Math.floor(Number(playerLevel));

    if (!Number.isFinite(safePlayerLevel) || safePlayerLevel < 1) {
      return 1;
    }

    return safePlayerLevel;
  }

  createRow(label, value, { header = false, current = false, onActivate = null } = {}) {
    return createWorkshopLeaderboardRow(label, value, {
      header,
      current,
      onActivate,
    });
  }

  createUserLabel(user, index) {
    return createWorkshopLeaderboardUserLabel(user, {
      index,
      onOpenPlayerInfo: this.onOpenPlayerInfo,
      playerInfo: {
        totalProducedCoin: user.totalIncome,
        prestigeCount: user.prestigeCount,
      },
    });
  }

  createAllianceLabel(alliance, index) {
    const rank = this.normalizeRank(alliance?.rank) ?? index + 1;
    const tag = createAllianceTagSpan(alliance?.tag, alliance?.tagColor);
    return [
      document.createTextNode(`${rank}. ${alliance.name}`),
      ...(tag ? [document.createTextNode(' '), tag] : []),
    ];
  }

  openAllianceInfo(alliance) {
    this.onOpenAllianceInfo?.({
      allianceId: alliance?.allianceId,
      name: alliance?.name,
      tag: alliance?.tag,
      tagColor: alliance?.tagColor,
      description: alliance?.description,
      notice: alliance?.notice,
      joinMode: alliance?.joinMode,
      memberCount: alliance?.memberCount,
      seasonIncome: alliance?.seasonIncome,
      weeklyIncome: alliance?.weeklyIncome,
      totalIncome: alliance?.totalIncome,
    });
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}
