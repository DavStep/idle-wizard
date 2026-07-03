import { setSelectedTabState } from '../../shared/selectedTabState.js';

const LEDGER_TABS = [
  { id: 'firsts', label: 'firsts' },
  { id: 'chapters', label: 'chapters' },
  { id: 'longRoad', label: 'long road' },
];

const DEFAULT_RESEARCH_IDS = new Set(['unlockSeed:sageSeed']);

export class WorkshopLedgerManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'firsts';
    this.currentSnapshot = null;
    this.renderedSignature = '';
    this.previousFocus = null;
    this.handleRootClick = (event) => {
      if (event.target === this.root) {
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
    if (!this.gameplayFacade || !parent) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = this.createPopup();
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);
    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'workshop-page__ledger-popup';
    popup.hidden = true;
    popup.addEventListener('click', this.handleRootClick);

    this.refs.panel = document.createElement('section');
    this.refs.panel.className = 'workshop-page__ledger-panel';
    this.refs.panel.setAttribute('aria-label', 'ledger');
    this.refs.panel.setAttribute('aria-modal', 'true');
    this.refs.panel.setAttribute('role', 'dialog');
    this.refs.panel.tabIndex = -1;

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__ledger-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'ledger';

    this.refs.closeButton = document.createElement('button');
    this.refs.closeButton.className = 'style-button workshop-page__ledger-close';
    this.refs.closeButton.type = 'button';
    this.refs.closeButton.textContent = 'close';
    this.refs.closeButton.addEventListener('click', () => this.hide());

    this.refs.frame = document.createElement('div');
    this.refs.frame.className = 'style-dialog-scroll workshop-page__ledger-frame';

    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__ledger-rows';
    this.refs.frame.append(this.refs.rows);

    this.refs.tabs = this.createTabs();

    this.refs.dialog.append(title, this.refs.closeButton, this.refs.frame);
    this.refs.panel.append(this.refs.dialog, this.refs.tabs);
    popup.append(this.refs.panel);
    return popup;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__ledger-tabs';
    tabs.setAttribute('aria-label', 'ledger pages');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabButtons = new Map();

    for (const tab of LEDGER_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__ledger-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.selectTab(tab.id));
      this.refs.tabButtons.set(tab.id, button);
      tabs.append(button);
    }

    return tabs;
  }

  show() {
    if (!this.root) {
      return;
    }

    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.renderPopup();
    this.refs.panel?.focus();
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

  selectTab(tabId) {
    if (this.selectedTabId === tabId) {
      return;
    }

    this.selectedTabId = tabId;
    this.renderedSignature = '';
    if (this.refs.frame) {
      this.refs.frame.scrollTop = 0;
    }
    this.renderPopup();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.removeEventListener('keydown', this.handleKeydown);
    this.root?.removeEventListener('click', this.handleRootClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.currentSnapshot = null;
    this.renderedSignature = '';
    this.previousFocus = null;
    this.selectedTabId = 'firsts';
  }

  render(snapshot) {
    this.currentSnapshot = snapshot ?? {};

    if (this.visible) {
      this.renderPopup();
    }
  }

  renderPopup() {
    if (!this.refs.rows) {
      return;
    }

    this.updateTabs();

    const ledger = createWorkshopLedgerSnapshot(this.currentSnapshot);
    const tab = ledger.tabs.find((candidate) => candidate.id === this.selectedTabId) ??
      ledger.tabs[0];
    const signature = `${tab.id}:${tab.rows
      .map((row) => `${row.label}:${row.status}:${row.state}`)
      .join('|')}`;

    if (signature === this.renderedSignature) {
      return;
    }

    this.renderedSignature = signature;
    this.refs.rows.replaceChildren(
      ...tab.rows.map((row, index) => this.createRow(row, index + 1)),
    );
  }

  updateTabs() {
    for (const tab of LEDGER_TABS) {
      const selected = tab.id === this.selectedTabId;
      const button = this.refs.tabButtons?.get(tab.id);
      setSelectedTabState(button, selected, { tabIndex: true });
    }
  }

  createRow(row, number) {
    const root = document.createElement('div');
    root.className = 'workshop-page__ledger-row';
    root.classList.toggle('is-done', row.state === 'done');
    root.classList.toggle('is-locked', row.state === 'locked');
    root.classList.toggle('has-progress', row.state === 'progress');

    const numberCell = document.createElement('span');
    numberCell.className = 'workshop-page__ledger-number';
    numberCell.textContent = `${number}.`;

    const name = document.createElement('span');
    name.className = 'workshop-page__ledger-name';
    name.textContent = row.label;

    const status = document.createElement('span');
    status.className = 'workshop-page__ledger-status';
    status.textContent = row.status;

    root.append(numberCell, name, status);
    return root;
  }

  applyVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden = !this.visible;
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }
}

export function createWorkshopLedgerSnapshot(snapshot = {}) {
  const currentLevel = getCurrentLevel(snapshot);
  const prestigeLevels = getPrestigeCompletedLevels(snapshot);
  const prestigeCount = prestigeLevels.length;
  const reachedLevel = Math.max(currentLevel, 1, ...prestigeLevels);
  const completedResearchCount = getCompletedResearchIds(snapshot).filter(
    (researchId) => !DEFAULT_RESEARCH_IDS.has(researchId),
  ).length;
  const worldEventsCompleted = getCompletedWorldEventCount(snapshot);

  return {
    tabs: [
      {
        id: 'firsts',
        label: 'firsts',
        rows: [
          createDoneRow('first seed summoned', hasFirstSeedSummoned(snapshot, currentLevel)),
          createDoneRow(
            'first research completed',
            hasFirstResearchCompleted(snapshot, currentLevel, prestigeCount),
          ),
          createDoneRow('first herb grown', hasFirstHerbGrown(snapshot, currentLevel, prestigeCount)),
          createDoneRow(
            'first potion bottled',
            hasFirstPotionBottled(snapshot, currentLevel, prestigeCount),
          ),
          createDoneRow('first prestige', prestigeCount > 0),
        ],
      },
      {
        id: 'chapters',
        label: 'chapters',
        rows: [
          createDoneRow('workshop settled', reachedLevel >= 2),
          createDoneRow('market opened', reachedLevel >= 2),
          createDoneRow('garden opened', reachedLevel >= 2),
          createDoneRow('research opened', reachedLevel >= 3),
          createDoneRow('brewing opened', reachedLevel >= 4),
          createDoneRow('prestige begun', reachedLevel >= 7 || prestigeCount > 0),
          createDoneRow('first world notice answered', hasWorldNoticeAnswered(snapshot)),
        ],
      },
      {
        id: 'longRoad',
        label: 'long road',
        rows: [
          createProgressRow('reach level 10', reachedLevel, 10),
          createProgressRow('reach level 20', reachedLevel, 20),
          createProgressRow('complete 5 prestiges', prestigeCount, 5),
          createProgressRow('complete 10 research studies', completedResearchCount, 10),
          createProgressRow('complete 3 world events', worldEventsCompleted, 3),
        ],
      },
    ],
  };
}

function createDoneRow(label, done) {
  return {
    label,
    status: done ? 'done' : 'locked',
    state: done ? 'done' : 'locked',
  };
}

function createProgressRow(label, value, target) {
  const safeTarget = Math.max(1, Math.floor(Number(target) || 1));
  const safeValue = Math.max(0, Math.floor(Number(value) || 0));

  if (safeValue >= safeTarget) {
    return {
      label,
      status: 'done',
      state: 'done',
    };
  }

  return {
    label,
    status: `${safeValue}/${safeTarget}`,
    state: 'progress',
  };
}

function getCurrentLevel(snapshot = {}) {
  const level =
    Number(snapshot?.tasks?.currentLevel) ||
    Number(snapshot?.playerLevel?.currentLevel) ||
    Number(snapshot?.tasks?.level?.level) ||
    1;

  return Math.max(1, Math.floor(level));
}

function getPrestigeCompletedLevels(snapshot = {}) {
  return [...new Set(snapshot?.prestige?.completedLevels ?? [])]
    .map((level) => Math.floor(Number(level)))
    .filter((level) => Number.isInteger(level) && level > 0);
}

function getCompletedResearchIds(snapshot = {}) {
  const ids = new Set(snapshot?.research?.completedResearchIds ?? []);

  for (const tab of snapshot?.research?.tabs ?? []) {
    for (const box of tab.boxes ?? []) {
      collectCompletedResearchIds(ids, box.researches);
    }
  }

  for (const box of snapshot?.research?.boxes ?? []) {
    collectCompletedResearchIds(ids, box.researches);
  }

  return [...ids].filter((id) => typeof id === 'string' && id.length > 0);
}

function collectCompletedResearchIds(ids, researches = []) {
  for (const research of researches ?? []) {
    if (research?.completed && typeof research.id === 'string') {
      ids.add(research.id);
    }
  }
}

function hasFirstSeedSummoned(snapshot = {}, currentLevel = getCurrentLevel(snapshot)) {
  return (
    currentLevel >= 2 ||
    hasOwnedItem(snapshot?.seedInventory) ||
    hasOwnedItem((snapshot?.inventory ?? []).filter((item) => item.kind === 'seed')) ||
    hasTaskProgressForKind(snapshot, 'seed')
  );
}

function hasFirstResearchCompleted(
  snapshot = {},
  currentLevel = getCurrentLevel(snapshot),
  prestigeCount = getPrestigeCompletedLevels(snapshot).length,
) {
  return (
    prestigeCount > 0 ||
    currentLevel >= 4 ||
    getCompletedResearchIds(snapshot).some((researchId) => !DEFAULT_RESEARCH_IDS.has(researchId))
  );
}

function hasFirstHerbGrown(
  snapshot = {},
  currentLevel = getCurrentLevel(snapshot),
  prestigeCount = getPrestigeCompletedLevels(snapshot).length,
) {
  return (
    prestigeCount > 0 ||
    currentLevel >= 5 ||
    hasOwnedItem(snapshot?.garden?.herbs) ||
    hasOwnedItem((snapshot?.inventory ?? []).filter((item) => item.kind === 'herb')) ||
    hasTaskProgressForKind(snapshot, 'herb')
  );
}

function hasFirstPotionBottled(
  snapshot = {},
  currentLevel = getCurrentLevel(snapshot),
  prestigeCount = getPrestigeCompletedLevels(snapshot).length,
) {
  return (
    prestigeCount > 0 ||
    currentLevel >= 6 ||
    hasOwnedItem((snapshot?.inventory ?? []).filter((item) => item.kind === 'potion')) ||
    hasTaskProgressForKind(snapshot, 'potion')
  );
}

function hasOwnedItem(items = []) {
  return (Array.isArray(items) ? items : []).some(
    (item) => Math.floor(Number(item?.quantity) || 0) > 0,
  );
}

function hasTaskProgressForKind(snapshot = {}, kind) {
  return (snapshot?.tasks?.level?.tasks ?? []).some(
    (task) =>
      task?.itemKind === kind &&
      (Math.floor(Number(task.progressQuantity) || 0) > 0 || task.completed === true),
  );
}

function hasWorldNoticeAnswered(snapshot = {}) {
  const current = snapshot?.worldNotice?.current;
  const archive = Array.isArray(snapshot?.worldNotice?.archive)
    ? snapshot.worldNotice.archive
    : [];

  return (
    Math.floor(Number(current?.completedRequests) || 0) > 0 ||
    Math.floor(Number(current?.leaderboard?.currentPoints) || 0) > 0 ||
    archive.some((entry) => Math.floor(Number(entry?.contributionPoints) || 0) > 0)
  );
}

function getCompletedWorldEventCount(snapshot = {}) {
  const archive = Array.isArray(snapshot?.worldNotice?.archive)
    ? snapshot.worldNotice.archive
    : [];
  const completedPeriodKeys = new Set(
    archive
      .filter((entry) => entry?.responseTier === 'strong')
      .map((entry) => entry.periodKey || `${entry.eventId ?? ''}:${entry.headline ?? ''}`),
  );
  const current = snapshot?.worldNotice?.current;

  if (current?.responseTier === 'strong') {
    completedPeriodKeys.add(current.periodKey || current.eventId || 'current');
  }

  return completedPeriodKeys.size;
}
