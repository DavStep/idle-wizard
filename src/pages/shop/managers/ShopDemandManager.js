import { getItemDisplay } from '../../shared/itemResearchStatus.js';
import { setItemIconLabel } from '../../shared/itemIconLabel.js';
import {
  getNextNpcDemandWaveInfo,
  getNpcMarketDemandCap,
  normalizeCount,
} from '../../../gameplay/shop/managers/npcMarketPricing.js';

const DEMAND_TABS = [
  { kind: 'seed', label: 'seed' },
  { kind: 'herb', label: 'herb' },
  { kind: 'potion', label: 'potion' },
];
const TOUCH_LIKE_PRESS_START_DEDUPE_MS = 80;

export class ShopDemandManager {
  constructor({ gameplayFacade, now = () => Date.now() } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.refs = {};
    this.unsubscribe = null;
    this.clockTimer = null;
    this.visible = false;
    this.selectedTab = 'seed';
    this.previousFocus = null;
    this.lastSnapshot = null;
    this.handledShowPressStart = false;
    this.lastTouchLikePressStartTimeStamp = Number.NEGATIVE_INFINITY;
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

  mount({ buttonParent, popupParent } = {}) {
    if (!buttonParent || !popupParent || !this.gameplayFacade) {
      return null;
    }

    if (this.refs.button) {
      return this.refs.button;
    }

    this.refs.button = this.createButton();
    this.refs.popup = this.createPopup();

    buttonParent.append(this.refs.button);
    popupParent.append(this.refs.popup);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => {
      this.lastSnapshot = snapshot;
      this.render();
    });
    this.lastSnapshot = this.gameplayFacade.getSnapshot();

    this.render();
    this.applyVisibility();
    return this.refs.button;
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.stopClock();
    document.removeEventListener('keydown', this.handleKeydown);
    this.refs.popup?.removeEventListener('click', this.handleRootClick);
    this.refs.button?.remove();
    this.refs.popup?.remove();
    this.refs = {};
    this.visible = false;
    this.selectedTab = 'seed';
    this.previousFocus = null;
    this.lastSnapshot = null;
  }

  createButton() {
    const button = document.createElement('button');
    button.className = 'style-button shop-page__demand-button';
    button.type = 'button';
    button.textContent = 'demand';
    button.setAttribute('aria-label', 'show npc demand');
    button.addEventListener('pointerdown', (event) => this.onShowPressStart(event));
    button.addEventListener('touchstart', (event) => this.onShowPressStart(event), {
      passive: false,
    });
    button.addEventListener('click', () => {
      if (this.handledShowPressStart) {
        this.handledShowPressStart = false;
        return;
      }

      this.show();
    });
    return button;
  }

  createPopup() {
    const popup = document.createElement('section');
    popup.className = 'shop-page__demand-popup';
    popup.addEventListener('click', this.handleRootClick);

    const panel = document.createElement('section');
    panel.className = 'shop-page__demand-panel';
    panel.setAttribute('aria-label', 'NPC demand');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    panel.tabIndex = -1;

    const dialog = document.createElement('section');
    dialog.className = 'shop-page__demand-dialog style-dialog';

    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'demand';

    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'shop-page__demand-rows';
    this.refs.summary = document.createElement('div');
    this.refs.summary.className = 'shop-page__demand-summary';
    this.refs.tabs = this.createTabs();

    dialog.append(title, this.refs.summary, this.refs.rows);
    panel.append(dialog, this.refs.tabs);
    popup.append(panel);
    this.refs.dialog = panel;
    return popup;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'shop-page__demand-tabs';
    tabs.setAttribute('aria-label', 'Demand item type');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabButtons = new Map();

    for (const tab of DEMAND_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button shop-page__demand-tab-button';
      button.type = 'button';
      button.textContent = tab.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.onSelectTab(tab.kind));
      this.refs.tabButtons.set(tab.kind, button);
      tabs.append(button);
    }

    return tabs;
  }

  onSelectTab(kind) {
    if (this.selectedTab === kind) {
      return;
    }

    this.selectedTab = kind;
    this.render();
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.render();
    this.applyVisibility();
    this.startClock();
    this.refs.dialog?.focus();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.applyVisibility();
    this.stopClock();

    if (wasVisible && this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }

    this.previousFocus = null;
  }

  render() {
    if (!this.refs.rows || !this.visible) {
      return;
    }

    for (const tab of DEMAND_TABS) {
      const selected = this.selectedTab === tab.kind;
      const button = this.refs.tabButtons.get(tab.kind);
      button?.setAttribute('aria-selected', selected ? 'true' : 'false');
      button?.setAttribute('tabindex', selected ? '0' : '-1');
    }

    const shelf = this.lastSnapshot?.shop?.shelf;

    if (!shelf?.sellItems?.length) {
      this.renderSummary(null);
      this.renderMessage('empty');
      return;
    }

    this.renderSummary(this.getDemandContext(shelf.sellItems));
    const demandGroups = this.getDemandGroups(this.lastSnapshot, shelf.sellItems);
    const primaryRows = demandGroups.primary.map((item) => this.createDemandRow(item));
    const lockedRows = demandGroups.locked.map((item) => this.createDemandRow(item));
    const children = [...primaryRows];

    children.push(...lockedRows);

    if (children.length === 0) {
      this.renderMessage('empty');
      return;
    }

    this.refs.rows.replaceChildren(...children);
  }

  renderMessage(message) {
    const empty = document.createElement('div');
    empty.className = 'shop-page__demand-empty';
    empty.textContent = message;
    this.refs.rows.replaceChildren(empty);
  }

  getDemandGroups(snapshot, sellItems) {
    const items = sellItems.filter((item) => item.kind === this.selectedTab);
    const groups = {
      primary: [],
      locked: [],
    };

    for (const item of items) {
      const display = getItemDisplay(snapshot, item, item.quantity);
      const demandItem = {
        key: item.key,
        label: display.label,
        kind: item.kind,
        demand: this.formatDemand(item),
        locked: display.locked,
      };

      if (display.locked) {
        groups.locked.push(demandItem);
      } else {
        groups.primary.push(demandItem);
      }
    }

    return groups;
  }

  createDemandRow(item) {
    const row = document.createElement('div');
    row.className = 'shop-page__demand-row';
    row.classList.toggle('is-locked', item.locked);

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = item.label;
    setItemIconLabel(label, item.kind, item.key);

    const value = document.createElement('span');
    value.className = 'row_val';
    value.textContent = item.demand;

    row.append(label, value);
    return row;
  }

  getDemandContext(sellItems) {
    const item = sellItems.find((candidate) =>
      candidate?.kind === this.selectedTab &&
      normalizeCount(candidate.targetNeed) !== null
    );
    const targetNeed = normalizeCount(item?.targetNeed);

    if (targetNeed === null || targetNeed <= 0) {
      return null;
    }

    return getNextNpcDemandWaveInfo({
      targetNeed,
      maxNeed: this.getPositiveCount(item?.maxNeed) ?? getNpcMarketDemandCap(targetNeed),
      nowMs: this.now(),
    });
  }

  renderSummary(context) {
    if (!this.refs.summary) {
      return;
    }

    if (!context) {
      this.refs.summary.hidden = true;
      this.refs.summary.replaceChildren();
      return;
    }

    this.refs.summary.hidden = false;
    const buyersRow = this.createSummaryRow(
      context.isBigWave ? 'large crowd returns' : 'buyers return',
      this.formatDuration(context.nextWaveAtMs - this.now()),
    );
    const nextRow = this.createSummaryRow(
      'next buyers',
      `+${context.nextWaveAmount}, cap ${context.maxNeed}`,
    );

    this.refs.summary.replaceChildren(buyersRow, nextRow);
  }

  createSummaryRow(labelText, valueText) {
    const row = document.createElement('div');
    row.className = 'shop-page__demand-summary-row';

    const label = document.createElement('span');
    label.className = 'row_key';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'row_val';
    value.textContent = valueText;

    row.append(label, value);
    return row;
  }

  formatDemand(item) {
    const sellNeed = normalizeCount(item?.sellNeed);

    if (sellNeed === null) {
      return '?';
    }

    if (sellNeed <= 0) {
      return 'no buyers';
    }

    const maxNeed =
      this.getPositiveCount(item?.maxNeed) ??
      (normalizeCount(item?.targetNeed) === null
        ? null
        : getNpcMarketDemandCap(item.targetNeed));

    if (maxNeed === null) {
      return String(sellNeed);
    }

    if (sellNeed >= maxNeed) {
      return 'full demand';
    }

    return `${sellNeed} / ${maxNeed}`;
  }

  formatDuration(durationMs) {
    const totalMinutes = Math.max(1, Math.ceil(Math.max(0, durationMs) / 60_000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) {
      return `${minutes}m`;
    }

    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  startClock() {
    if (this.clockTimer !== null) {
      return;
    }

    this.clockTimer = globalThis.setInterval(() => this.render(), 30_000);
  }

  stopClock() {
    if (this.clockTimer === null) {
      return;
    }

    globalThis.clearInterval(this.clockTimer);
    this.clockTimer = null;
  }

  getPositiveCount(value) {
    const count = normalizeCount(value);
    return count === null || count <= 0 ? null : count;
  }

  onShowPressStart(event) {
    if (
      (event.type === 'pointerdown' && event.pointerType === 'mouse') ||
      this.isDuplicateTouchLikePressStart(event)
    ) {
      return;
    }

    event.preventDefault();
    this.handledShowPressStart = true;
    this.show();
  }

  applyVisibility() {
    if (!this.refs.popup) {
      return;
    }

    this.refs.popup.hidden = !this.visible;
    this.refs.popup.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  isDuplicateTouchLikePressStart(event) {
    const timeStamp = Number.isFinite(event?.timeStamp) ? event.timeStamp : Date.now();
    const isDuplicate =
      Math.abs(timeStamp - this.lastTouchLikePressStartTimeStamp) <=
      TOUCH_LIKE_PRESS_START_DEDUPE_MS;

    this.lastTouchLikePressStartTimeStamp = timeStamp;
    return isDuplicate;
  }
}
