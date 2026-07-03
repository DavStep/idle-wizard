import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { setSelectedTabState } from '../../shared/selectedTabState.js';
import {
  createStatusIcon,
  STATUS_ICON_CHECK,
  STATUS_ICON_LOCK,
} from '../../shared/statusIcon.js';
import { createStarLevelLabel } from '../../shared/starLevelLabel.js';
import { getPrestigeUnlocksSnapshot } from '../../../gameplay/prestige/prestigeUnlocks.js';

const PRESTIGE_TABS = [
  { id: 'main', label: 'main' },
  { id: 'points', label: 'points' },
];

export class PrestigePanelManager {
  static explain =
    'Shows prestige milestones and permanent point rewards so the player can reset a run when ready.';

  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.confirmingMilestone = null;
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.selectedTabId = PRESTIGE_TABS[0].id;
  }

  mount(parent) {
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'prestige-page__content';

    this.refs.panel = document.createElement('section');
    this.refs.panel.className = 'prestige-page__panel';
    this.refs.panel.setAttribute('aria-label', 'prestige');

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'prestige-page__description style-box';

    this.refs.title = this.createTitle();
    this.refs.summary = document.createElement('div');
    this.refs.summary.className = 'workshop-page__prestige-summary';

    this.refs.description = this.createDescription();
    this.refs.body = document.createElement('div');
    this.refs.body.className = 'prestige-page__body style-page-scroll';
    this.refs.body.dataset.scrollCueProgress = 'inline';
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__prestige-rows';
    this.refs.confirm = this.createConfirmPanel();
    this.refs.tabs = this.createTabs();

    this.refs.dialog.append(
      this.refs.title,
      this.refs.summary,
      this.refs.description,
    );
    this.refs.body.append(this.refs.dialog, this.refs.rows, this.refs.confirm);
    this.refs.panel.append(this.refs.body, this.refs.tabs);
    this.root.append(this.refs.panel);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'workshop-page__prestige-heading';
    title.textContent = 'prestige';
    return title;
  }

  createConfirmPanel() {
    const panel = document.createElement('div');
    panel.className = 'workshop-page__prestige-confirm style-box';
    panel.hidden = true;

    const title = document.createElement('div');
    title.className = 'workshop-page__prestige-confirm-title';
    title.textContent = 'on prestige';

    this.refs.confirmMessage = document.createElement('div');
    this.refs.confirmMessage.className = 'workshop-page__prestige-confirm-message';

    const actions = document.createElement('div');
    actions.className = 'workshop-page__prestige-confirm-actions';

    this.refs.confirmCancel = document.createElement('button');
    this.refs.confirmCancel.className =
      'style-button workshop-page__prestige-confirm-cancel';
    this.refs.confirmCancel.type = 'button';
    this.refs.confirmCancel.textContent = 'cancel';
    this.refs.confirmCancel.addEventListener('click', () => this.cancelConfirm());

    this.refs.confirmProceed = document.createElement('button');
    this.refs.confirmProceed.className =
      'style-button workshop-page__prestige-confirm-proceed';
    this.refs.confirmProceed.type = 'button';
    this.refs.confirmProceed.textContent = 'prestige';
    this.refs.confirmProceed.addEventListener('click', () => this.confirmPrestige());

    actions.append(this.refs.confirmCancel, this.refs.confirmProceed);
    panel.append(title, this.refs.confirmMessage, actions);
    return panel;
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'workshop-page__prestige-tabs';
    tabs.setAttribute('aria-label', 'prestige view');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabButtons = new Map();

    for (const tab of PRESTIGE_TABS) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__prestige-tab-button';
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

    this.selectedTabId = PRESTIGE_TABS.some((tab) => tab.id === tabId)
      ? tabId
      : PRESTIGE_TABS[0].id;
    this.confirmingMilestone = null;
    this.renderedSignature = '';
    this.render(this.lastSnapshot);
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.confirmingMilestone = null;
    this.lastSnapshot = {};
    this.renderedSignature = '';
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    this.updateSummary(this.lastSnapshot);
    this.syncTabs();

    const signature = this.createRenderSignature(this.lastSnapshot);
    if (signature !== this.renderedSignature) {
      this.renderedSignature = signature;
      this.refs.rows.replaceChildren(...this.createRows(this.lastSnapshot));
    }

    this.applyConfirm();
  }

  updateSummary(snapshot = {}) {
    const prestige = snapshot?.prestige ?? {};
    const currentLevel = Math.max(1, Math.floor(Number(prestige.currentLevel) || 1));

    if (this.selectedTabId === 'points') {
      const completedCount = this.getCompletedPrestigeCount(prestige);
      this.refs.summary.replaceChildren(
        this.createPrestigePointCount(completedCount),
        document.createTextNode(' earned'),
      );
      setResourceColor(this.refs.summary, null);
      return;
    }

    const milestone = this.getSummaryMilestone(prestige);
    const flow = document.createElement('div');
    flow.className = 'workshop-page__prestige-level-flow';
    flow.textContent = this.formatLevelFlow(
      currentLevel,
      this.getSummaryTargetLevel(milestone, currentLevel),
    );

    const receive = document.createElement('div');
    receive.className = 'workshop-page__prestige-receive';
    receive.append(
      document.createTextNode(milestone?.canComplete ? 'on prestige: ' : 'next prestige: '),
      ...this.createPrestigeTotalNodes(milestone?.nextRun),
    );

    this.refs.summary.replaceChildren(flow, receive);
    setResourceColor(this.refs.summary, null);
  }

  createRows(snapshot) {
    if (this.selectedTabId === 'points') {
      return this.createPointRewardRows(snapshot?.prestige);
    }

    const milestones = snapshot?.prestige?.milestones ?? [];
    const upcomingIndex = milestones.findIndex(
      (milestone) => !milestone.completed && !milestone.canComplete,
    );

    return milestones.map((milestone, index) =>
      this.createMilestoneRow(milestone, index === upcomingIndex),
    );
  }

  createDescription() {
    const description = document.createElement('ul');
    description.className = 'prestige-page__description-copy';
    description.replaceChildren(
      this.createDescriptionLine(
        'prestige resets the current run into a new run from the shown start level.',
      ),
      this.createDescriptionLine(
        'mana, coin, crystal, items, ordinary research, garden, brewing, and level tasks reset.',
      ),
      this.createDescriptionLine(
        'daily and weekly task progress keeps its normal reset timer.',
      ),
      this.createDescriptionLine(
        'the shown crystal, ruby, and emerald totals start the next run.',
      ),
      this.createDescriptionLine(
        'claiming a milestone also credits lower unclaimed milestones.',
      ),
      this.createDescriptionLine(
        'each completed milestone adds 1 prestige point for concrete rewards.',
      ),
    );
    return description;
  }

  createDescriptionLine(text) {
    const line = document.createElement('li');
    line.className = 'prestige-page__description-line';

    const marker = document.createElement('span');
    marker.className = 'prestige-page__description-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '-';

    const copy = document.createElement('span');
    copy.textContent = text;

    line.append(marker, copy);
    return line;
  }

  createMilestoneRow(milestone, upcoming = false) {
    const state = this.getMilestoneState(milestone, upcoming);
    const row = document.createElement('section');
    row.className = 'workshop-page__prestige-row style-box';
    row.classList.toggle('is-completed', state === 'completed');
    row.classList.toggle('is-ready', state === 'ready');
    row.classList.toggle('is-included', state === 'included');
    row.classList.toggle('is-upcoming', state === 'upcoming');
    row.classList.toggle('is-locked', state === 'locked');
    row.dataset.prestigeState = state;
    row.dataset.prestigeLevel = String(milestone.level);

    const level = document.createElement('span');
    level.className = 'workshop-page__prestige-level';
    level.textContent = `level ${milestone.level}`;

    const stateLabel = this.createMilestoneStateLabel(state);

    const body = document.createElement('div');
    body.className = 'workshop-page__prestige-milestone-body';

    const reward = document.createElement('span');
    reward.className = 'workshop-page__prestige-reward';
    setResourceIconText(reward, this.createMilestoneRewardText(milestone));
    setResourceColor(reward, null);

    const action = this.createMilestoneAction(milestone);

    const header = document.createElement('div');
    header.className = 'workshop-page__prestige-milestone-header';
    header.append(level);

    body.append(reward);
    if (action) {
      body.append(action);
    }

    const content = document.createElement('div');
    content.className = 'workshop-page__prestige-milestone-content';
    content.append(header, body);

    row.append(stateLabel, content);
    return row;
  }

  createPointRewardRows(prestige = {}) {
    const completedCount = this.getCompletedPrestigeCount(prestige);
    const pointRewards = Array.isArray(prestige.unlocks)
      ? prestige.unlocks
      : getPrestigeUnlocksSnapshot(completedCount);
    const title = document.createElement('div');
    title.className = 'workshop-page__prestige-point-title';
    title.textContent = 'point rewards';

    return [
      title,
      ...pointRewards.map((pointReward) =>
        this.createPointRewardRow(pointReward, completedCount),
      ),
    ];
  }

  createPointRewardRow(pointReward, completedCount) {
    const row = document.createElement('section');
    row.className = 'workshop-page__prestige-point-row style-box';
    row.classList.toggle('is-completed', completedCount >= pointReward.count);
    row.classList.toggle('is-next', completedCount + 1 === pointReward.count);
    row.classList.toggle('is-locked', pointReward.count > completedCount + 1);

    const count = this.createPrestigePointCount(pointReward.count);

    const reward = document.createElement('div');
    reward.className = 'workshop-page__prestige-point-reward';
    reward.replaceChildren(
      this.createPointRewardLine(pointReward.label),
      ...pointReward.rewards.map((label) => this.createPointRewardLine(label)),
    );

    const status = document.createElement('span');
    status.className = 'workshop-page__prestige-point-status';
    status.textContent = this.getPointRewardStatus(pointReward.count, completedCount);

    row.append(count, status, reward);
    return row;
  }

  createPrestigePointCount(count) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    const root = document.createElement('span');
    root.className = 'workshop-page__prestige-point-count';
    root.setAttribute(
      'aria-label',
      `${safeCount} ${this.pluralize(safeCount, 'point')}`,
    );

    const stars = document.createElement('span');
    stars.className = 'workshop-page__prestige-point-stars';
    if (safeCount > 0) {
      const starLabel = createStarLevelLabel(safeCount);
      starLabel.classList.add('workshop-page__prestige-point-star-label');
      starLabel.setAttribute('aria-hidden', 'true');
      stars.append(starLabel);
    }

    const number = document.createElement('span');
    number.className = 'workshop-page__prestige-point-number';
    number.textContent = `${safeCount} ${this.pluralize(safeCount, 'point')}`;

    root.append(stars, number);
    return root;
  }

  createPointRewardLine(label) {
    const row = document.createElement('div');
    row.className = 'workshop-page__prestige-point-reward-row';
    row.textContent = `- ${label}`;
    return row;
  }

  createMilestoneAction(milestone) {
    if (milestone.canComplete && !milestone.lowerThanHighestAvailable) {
      const button = document.createElement('button');
      button.className = 'style-button workshop-page__prestige-action';
      button.type = 'button';
      button.textContent = 'prestige';
      button.addEventListener('click', () => this.onPrestigeClick(milestone));
      return button;
    }

    return null;
  }

  getMilestoneState(milestone = {}, upcoming = false) {
    if (milestone.completed) {
      return 'completed';
    }

    if (milestone.canComplete) {
      if (milestone.lowerThanHighestAvailable) {
        return 'included';
      }

      return 'ready';
    }

    if (upcoming || milestone.unlocked) {
      return 'upcoming';
    }

    return 'locked';
  }

  getMilestoneStateLabel(state) {
    if (state === 'completed') {
      return 'complete';
    }

    return state;
  }

  createMilestoneStateLabel(state) {
    const stateLabel = document.createElement('span');
    stateLabel.className = 'workshop-page__prestige-state-label';

    if (state !== 'completed' && state !== 'locked') {
      stateLabel.textContent = this.getMilestoneStateLabel(state);
      return stateLabel;
    }

    stateLabel.classList.add(`workshop-page__prestige-state-label--${state}`);
    stateLabel.setAttribute('role', 'img');
    stateLabel.setAttribute('aria-label', this.getMilestoneStateLabel(state));

    const icon = createStatusIcon(
      'workshop-page__prestige-state-icon',
      state === 'completed' ? STATUS_ICON_CHECK : STATUS_ICON_LOCK,
    );

    if (icon) {
      stateLabel.append(icon);
    } else {
      stateLabel.textContent = this.getMilestoneStateLabel(state);
    }

    return stateLabel;
  }

  onPrestigeClick(milestone) {
    this.confirmingMilestone = milestone;
    this.applyConfirm();
    this.refs.confirm?.scrollIntoView?.({ block: 'nearest' });
  }

  completePrestige(level) {
    const result = this.gameplayFacade.completePrestigeMilestone(level);

    if (result.ok) {
      this.confirmingMilestone = null;
    }
  }

  confirmPrestige() {
    if (!this.confirmingMilestone) {
      return;
    }

    this.completePrestige(this.confirmingMilestone.level);
  }

  cancelConfirm() {
    this.confirmingMilestone = null;
    this.applyConfirm();
  }

  applyConfirm() {
    if (!this.refs.confirm) {
      return;
    }

    const milestone = this.confirmingMilestone;
    this.refs.confirm.hidden = !milestone;

    if (!milestone) {
      if (this.refs.confirm.parentElement !== this.refs.body) {
        this.refs.body.append(this.refs.confirm);
      }
      return;
    }

    this.refs.confirmMessage.replaceChildren(
      ...this.createConfirmMessageNodes(milestone),
    );
    const targetRow = this.refs.rows.querySelector(
      `[data-prestige-level="${milestone.level}"]`,
    );

    if (targetRow && targetRow.nextSibling !== this.refs.confirm) {
      targetRow.after(this.refs.confirm);
    } else if (!targetRow && this.refs.confirm.parentElement !== this.refs.body) {
      this.refs.body.append(this.refs.confirm);
    }
  }

  createConfirmMessageNodes(milestone) {
    const nodes = [];

    const flow = document.createElement('div');
    flow.className = 'workshop-page__prestige-confirm-flow';
    flow.textContent = this.formatLevelFlow(
      milestone.currentLevel,
      milestone.nextRun?.level,
    );
    nodes.push(flow);

    const receive = document.createElement('div');
    receive.className = 'workshop-page__prestige-confirm-receive';
    receive.append(
      document.createTextNode('on prestige: '),
      ...this.createPrestigeTotalNodes(milestone.nextRun),
    );
    nodes.push(receive);

    const creditedLevels = Array.isArray(milestone.creditedLevels)
      ? milestone.creditedLevels
      : [];
    if (creditedLevels.length > 1) {
      const included = document.createElement('div');
      included.className = 'workshop-page__prestige-confirm-included';
      included.textContent = `also credits levels ${creditedLevels.join(', ')}`;
      nodes.push(included);
    }

    nodes.push(this.createNextRunSummary(milestone.nextRun));
    return nodes;
  }

  createNextRunSummary(nextRun = {}) {
    const summary = document.createElement('div');
    summary.className = 'workshop-page__prestige-next-run';

    const addLine = (label, valueNode) => {
      const row = document.createElement('div');
      row.className = 'workshop-page__prestige-next-run-row';

      const labelNode = document.createElement('span');
      labelNode.className = 'workshop-page__prestige-next-run-label';
      labelNode.textContent = label;

      const value = document.createElement('span');
      value.className = 'workshop-page__prestige-next-run-value';
      value.append(valueNode);
      row.append(labelNode, value);
      summary.append(row);
    };

    addLine('start level', document.createTextNode(String(nextRun.level ?? 1)));
    addLine('mana', this.createResourceValue('mana', nextRun.mana));
    addLine('coin', this.createResourceValue('coin', nextRun.coin));
    addLine('crystal', this.createResourceValue('crystal', nextRun.crystal));
    addLine('emerald', this.createResourceValue('emerald', nextRun.emerald));
    addLine('ruby', this.createResourceValue('ruby', nextRun.ruby));

    return summary;
  }

  createResourceValue(resourceKey, amount) {
    const value = this.normalizeResourceAmount(amount);
    const node = document.createElement('span');
    setResourceIconText(node, `${value} ${resourceKey}`);
    setResourceColor(node, resourceKey);
    return node;
  }

  createMilestoneRewardText(milestone = {}) {
    const parts = [];
    const nextRun = milestone?.nextRun ?? {};

    if (Object.prototype.hasOwnProperty.call(nextRun, 'crystal')) {
      parts.push(`${this.normalizeResourceAmount(nextRun.crystal)} crystal`);
    }

    parts.push(
      `${this.normalizeResourceAmount(milestone.creditedRuby ?? milestone.rewardRuby)} ruby`,
    );
    return `reward: ${parts.join(' ')}`;
  }

  createPrestigeTotalNodes(nextRun = {}) {
    const nodes = [];

    for (const resourceKey of ['crystal', 'ruby', 'emerald']) {
      if (nodes.length > 0) {
        nodes.push(document.createTextNode(' '));
      }

      nodes.push(this.createResourceValue(resourceKey, nextRun?.[resourceKey]));
    }

    nodes.push(document.createTextNode(' total'));
    return nodes;
  }

  normalizeResourceAmount(amount) {
    return Math.max(0, Math.floor(Number(amount) || 0));
  }

  getSummaryMilestone(prestige = {}) {
    const milestones = Array.isArray(prestige.milestones) ? prestige.milestones : [];
    const highestAvailableLevel = Number(prestige.highestAvailableLevel);

    if (Number.isInteger(highestAvailableLevel)) {
      const highestAvailable = milestones.find(
        (milestone) => milestone.level === highestAvailableLevel,
      );

      if (highestAvailable) {
        return highestAvailable;
      }
    }

    return (
      milestones.find((milestone) => milestone.canComplete) ??
      milestones.find((milestone) => !milestone.completed) ??
      milestones.at(-1) ??
      null
    );
  }

  getSummaryTargetLevel(milestone, currentLevel) {
    const nextRunLevel = Math.floor(Number(milestone?.nextRun?.level));

    if (milestone?.canComplete && Number.isFinite(nextRunLevel) && nextRunLevel >= 1) {
      return nextRunLevel;
    }

    const milestoneLevel = Math.floor(Number(milestone?.level));
    return Number.isFinite(milestoneLevel) && milestoneLevel >= 1
      ? milestoneLevel
      : currentLevel;
  }

  formatLevelFlow(currentLevel, targetLevel) {
    const safeCurrent = Math.max(1, Math.floor(Number(currentLevel) || 1));
    const safeTarget = Math.max(1, Math.floor(Number(targetLevel) || safeCurrent));
    return `level ${safeCurrent} > level ${safeTarget}`;
  }

  syncTabs() {
    for (const tab of PRESTIGE_TABS) {
      const button = this.refs.tabButtons?.get(tab.id);

      if (!button) {
        continue;
      }

      setSelectedTabState(button, tab.id === this.selectedTabId);
    }
  }

  createRenderSignature(snapshot) {
    const prestige = snapshot?.prestige ?? {};
    return JSON.stringify({
      selectedTabId: this.selectedTabId,
      earnedRuby: prestige.earnedRuby,
      currentLevel: prestige.currentLevel,
      completedCount: this.getCompletedPrestigeCount(prestige),
      highestAvailableLevel: prestige.highestAvailableLevel,
      unlocks: prestige.unlocks,
      milestones: (prestige.milestones ?? []).map((milestone) => ({
        level: milestone.level,
        rewardRuby: milestone.rewardRuby,
        creditedRuby: milestone.creditedRuby,
        creditedLevels: milestone.creditedLevels,
        completed: milestone.completed,
        canComplete: milestone.canComplete,
        unlocked: milestone.unlocked,
        lowerThanHighestAvailable: milestone.lowerThanHighestAvailable,
        nextRun: milestone.nextRun,
      })),
    });
  }

  getCompletedPrestigeCount(prestige = {}) {
    return Array.isArray(prestige.completedLevels) ? prestige.completedLevels.length : 0;
  }

  getPointRewardStatus(count, completedCount) {
    if (completedCount >= count) {
      return 'unlocked';
    }

    if (completedCount + 1 === count) {
      return 'next';
    }

    return 'locked';
  }

  pluralize(count, word) {
    return count === 1 ? word : `${word}s`;
  }
}
