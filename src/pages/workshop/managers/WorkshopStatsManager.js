import { formatCoinPriceText } from '../../../shared/coinPrice.js';
import { setSelectedTabState } from '../../shared/selectedTabState.js';

const STATS_TABS = [
  { id: 'seeds', label: 'seeds' },
  { id: 'herbs', label: 'herbs' },
  { id: 'potions', label: 'potions' },
  { id: 'coin', label: 'coin' },
];

export class WorkshopStatsManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.selectedTabId = 'seeds';
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
    popup.className = 'workshop-page__stats-popup';
    popup.hidden = true;
    popup.addEventListener('click', this.handleRootClick);

    this.refs.panel = document.createElement('section');
    this.refs.panel.className = 'workshop-page__stats-panel';
    this.refs.panel.setAttribute('aria-label', 'stats');
    this.refs.panel.setAttribute('aria-modal', 'true');
    this.refs.panel.setAttribute('role', 'dialog');
    this.refs.panel.tabIndex = -1;

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__stats-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'stats';

    this.refs.closeButton = document.createElement('button');
    this.refs.closeButton.className = 'style-button workshop-page__stats-close';
    this.refs.closeButton.type = 'button';
    this.refs.closeButton.textContent = 'close';
    this.refs.closeButton.addEventListener('click', () => this.hide());

    this.refs.frame = document.createElement('div');
    this.refs.frame.className = 'style-dialog-scroll workshop-page__stats-frame';

    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__stats-rows';
    this.refs.frame.append(this.refs.rows);

    this.refs.tabs = this.createTabs();

    this.refs.dialog.append(title, this.refs.closeButton, this.refs.frame);
    this.refs.panel.append(this.refs.dialog, this.refs.tabs);
    popup.append(this.refs.panel);
    return popup;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__stats-tabs';
    tabs.setAttribute('aria-label', 'stats pages');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabButtons = new Map();

    for (const tab of STATS_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__stats-tab-button';
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
    this.selectedTabId = 'seeds';
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

    const stats = createWorkshopStatsSnapshot(this.currentSnapshot);
    const tab = stats.tabs.find((candidate) => candidate.id === this.selectedTabId) ??
      stats.tabs[0];
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
    for (const tab of STATS_TABS) {
      const selected = tab.id === this.selectedTabId;
      const button = this.refs.tabButtons?.get(tab.id);
      setSelectedTabState(button, selected, { tabIndex: true });
    }
  }

  createRow(row, number) {
    const root = document.createElement('div');
    root.className = 'workshop-page__stats-row';
    root.classList.toggle('is-total', row.state === 'total');
    root.classList.toggle('is-empty', row.state === 'empty');

    const numberCell = document.createElement('span');
    numberCell.className = 'workshop-page__stats-number';
    numberCell.textContent = `${number}.`;

    const name = document.createElement('span');
    name.className = 'workshop-page__stats-name';
    name.textContent = row.label;

    const status = document.createElement('span');
    status.className = 'workshop-page__stats-status';
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

export function createWorkshopStatsSnapshot(snapshot = {}) {
  const stats = snapshot.stats ?? {};
  const seeds = stats.seeds ?? {};
  const herbs = stats.herbs ?? {};
  const potions = stats.potions ?? {};
  const coin = stats.coin ?? {};
  const royalties = coin.royalties ?? {};

  return {
    tabs: [
      {
        id: 'seeds',
        label: 'seeds',
        rows: [
          createCountRow('total seeds generated', seeds.total, { total: true }),
          ...createItemCountRows(seeds.items),
        ],
      },
      {
        id: 'herbs',
        label: 'herbs',
        rows: [
          createCountRow('total herbs grown', herbs.total, { total: true }),
          ...createItemCountRows(herbs.items),
        ],
      },
      {
        id: 'potions',
        label: 'potions',
        rows: [
          createCountRow('total potions brewed', potions.total, { total: true }),
          ...createItemCountRows(potions.items),
        ],
      },
      {
        id: 'coin',
        label: 'coin',
        rows: [
          createCoinRow('npc trade', coin.npcTrade, { total: true }),
          createCoinRow('player trade', coin.playerTrade, { total: true }),
          createCoinRow('royalties', royalties.total, { total: true }),
          ...createRoyaltyRows(royalties.items),
        ],
      },
    ],
  };
}

function createItemCountRows(items = []) {
  return (Array.isArray(items) ? items : []).map((item) =>
    createCountRow(item?.label, item?.quantity),
  );
}

function createRoyaltyRows(items = []) {
  return (Array.isArray(items) ? items : []).map((item) =>
    createCoinRow(`${normalizeLabel(item?.potionLabel, 'potion')} royalties`, item?.coin),
  );
}

function createCountRow(label, value, { total = false } = {}) {
  const quantity = normalizeCount(value);

  return {
    label: normalizeLabel(label, 'unknown'),
    status: String(quantity),
    state: total ? 'total' : quantity > 0 ? 'filled' : 'empty',
  };
}

function createCoinRow(label, value, { total = false } = {}) {
  const coin = normalizeCoin(value);

  return {
    label: normalizeLabel(label, 'coin'),
    status: formatCoinPriceText(coin),
    state: total ? 'total' : coin > 0 ? 'filled' : 'empty',
  };
}

function normalizeCount(value) {
  const count = Math.floor(Number(value) || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function normalizeCoin(value) {
  const coin = Number(value) || 0;
  return Number.isFinite(coin) && coin > 0 ? coin : 0;
}

function normalizeLabel(value, fallback) {
  return (
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim() || fallback
  );
}
