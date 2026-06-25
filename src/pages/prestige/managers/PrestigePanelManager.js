import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
import { createStarLevelLabel } from '../../shared/starLevelLabel.js';
import {
  cauldronCapacityEndCauldronNumber,
  cauldronCapacityStartCauldronNumber,
  getCauldronCapacityPrestigeRequirement,
  getPlotCapacityPrestigeRequirement,
  plotCapacityEndPlotNumber,
  plotCapacityStartPlotNumber,
} from '../../../gameplay/research/capacityResearchIds.js';

const PRESTIGE_TABS = [
  { id: 'main', label: 'main' },
  { id: 'points', label: 'points' },
];

const PRESTIGE_POINT_REWARDS = createPrestigePointRewards();

function createPrestigePointRewards() {
  const rewardsByCount = new Map();

  const addReward = (count, label) => {
    const safeCount = Math.max(1, Math.floor(Number(count) || 1));
    const rewards = rewardsByCount.get(safeCount) ?? [];
    rewards.push(label);
    rewardsByCount.set(safeCount, rewards);
  };

  for (
    let plotNumber = plotCapacityStartPlotNumber;
    plotNumber <= plotCapacityEndPlotNumber;
    plotNumber += 1
  ) {
    addReward(
      getPlotCapacityPrestigeRequirement(plotNumber),
      `plot ${plotNumber} capacity`,
    );
  }

  for (
    let cauldronNumber = cauldronCapacityStartCauldronNumber;
    cauldronNumber <= cauldronCapacityEndCauldronNumber;
    cauldronNumber += 1
  ) {
    addReward(
      getCauldronCapacityPrestigeRequirement(cauldronNumber),
      `cauldron ${cauldronNumber} capacity`,
    );
  }

  return [...rewardsByCount.entries()]
    .sort(([left], [right]) => left - right)
    .map(([count, rewards]) => ({ count, rewards }));
}

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
    title.textContent = 'next run';

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
    const earnedRuby = Math.max(0, Math.floor(Number(prestige.earnedRuby) || 0));
    const currentRuby = Math.max(
      0,
      Math.floor(Number(snapshot?.ruby?.current ?? earnedRuby) || 0),
    );
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

    const ruby = document.createElement('span');
    ruby.className = 'workshop-page__prestige-summary-ruby';
    setResourceIconText(ruby, `${currentRuby} ruby`);
    setResourceColor(ruby, 'ruby');

    this.refs.summary.replaceChildren(
      document.createTextNode(`level ${currentLevel}, `),
      ruby,
      document.createTextNode(' available. press prestige to review next run.'),
    );
    setResourceColor(this.refs.summary, null);
  }

  createRows(snapshot) {
    if (this.selectedTabId === 'points') {
      return [this.createPointRewardBox(snapshot?.prestige)];
    }

    const milestones = snapshot?.prestige?.milestones ?? [];
    const upcomingIndex = milestones.findIndex(
      (milestone) => !milestone.completed && !milestone.canComplete,
    );

    return milestones.map((milestone, index) =>
      this.createMilestoneRow(milestone, index, index === upcomingIndex),
    );
  }

  createDescription() {
    const description = document.createElement('div');
    description.className = 'prestige-page__description-copy';
    description.textContent =
      'prestige resets the current run after milestone levels. completed milestones keep ruby and point rewards for future runs.';
    return description;
  }

  createMilestoneRow(milestone, index = 0, upcoming = false) {
    const state = this.getMilestoneState(milestone, upcoming);
    const row = document.createElement('section');
    row.className = 'workshop-page__prestige-row style-box';
    row.classList.toggle('is-completed', state === 'completed');
    row.classList.toggle('is-ready', state === 'ready');
    row.classList.toggle('is-upcoming', state === 'upcoming');
    row.classList.toggle('is-locked', state === 'locked');
    row.dataset.prestigeState = state;
    row.dataset.prestigeLevel = String(milestone.level);
    row.style.setProperty('--prestige-roadmap-offset', String(index % 4));

    const level = document.createElement('span');
    level.className = 'workshop-page__prestige-level';
    level.textContent = `level ${milestone.level}`;

    const stateLabel = document.createElement('span');
    stateLabel.className = 'workshop-page__prestige-state-label';
    stateLabel.textContent = this.getMilestoneStateLabel(state);

    const body = document.createElement('div');
    body.className = 'workshop-page__prestige-milestone-body';

    const reward = document.createElement('span');
    reward.className = 'workshop-page__prestige-reward';
    setResourceIconText(reward, `reward: ${milestone.rewardRuby} ruby`);
    setResourceColor(reward, 'ruby');

    const action = this.createMilestoneAction(milestone);

    body.append(reward);
    if (action) {
      body.append(action);
    }
    const header = document.createElement('div');
    header.className = 'workshop-page__prestige-milestone-header';
    header.append(level, stateLabel);

    row.append(header, body);
    return row;
  }

  createPointRewardBox(prestige = {}) {
    const completedCount = this.getCompletedPrestigeCount(prestige);
    const box = document.createElement('section');
    box.className = 'workshop-page__prestige-point-box style-box';

    const title = document.createElement('div');
    title.className = 'workshop-page__prestige-point-title';
    title.textContent = 'point rewards';

    const list = document.createElement('div');
    list.className = 'workshop-page__prestige-point-list';
    list.replaceChildren(
      ...PRESTIGE_POINT_REWARDS.map((pointReward) =>
        this.createPointRewardRow(pointReward, completedCount),
      ),
    );

    box.append(title, list);
    return box;
  }

  createPointRewardRow(pointReward, completedCount) {
    const row = document.createElement('div');
    row.className = 'workshop-page__prestige-point-row';
    row.classList.toggle('is-completed', completedCount >= pointReward.count);
    row.classList.toggle('is-next', completedCount + 1 === pointReward.count);
    row.classList.toggle('is-locked', pointReward.count > completedCount + 1);

    const count = this.createPrestigePointCount(pointReward.count);

    const reward = document.createElement('div');
    reward.className = 'workshop-page__prestige-point-reward';
    reward.replaceChildren(
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
    if (milestone.canComplete) {
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

  onPrestigeClick(milestone) {
    this.confirmingMilestone = milestone;
    this.applyConfirm();
    this.refs.confirm?.scrollIntoView?.({ block: 'nearest' });
  }

  completePrestige(level, confirmedLower = false) {
    const result = this.gameplayFacade.completePrestigeMilestone(level, { confirmedLower });

    if (result.ok) {
      this.confirmingMilestone = null;
      return;
    }

    if (result.reason === 'higher_prestige_available') {
      this.confirmingMilestone = result.milestone;
      this.applyConfirm();
    }
  }

  confirmPrestige() {
    if (!this.confirmingMilestone) {
      return;
    }

    this.completePrestige(this.confirmingMilestone.level, true);
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
    const highest = this.lastSnapshot.prestige?.highestAvailableLevel;
    this.refs.confirm.hidden = !milestone;

    if (!milestone) {
      if (this.refs.confirm.parentElement !== this.refs.body) {
        this.refs.body.append(this.refs.confirm);
      }
      return;
    }

    this.refs.confirmMessage.replaceChildren(
      ...this.createConfirmMessageNodes(milestone, highest),
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

  createConfirmMessageNodes(milestone, highest) {
    const nodes = [];

    if (milestone.lowerThanHighestAvailable && highest) {
      const warning = document.createElement('div');
      warning.className = 'workshop-page__prestige-confirm-warning';
      warning.textContent =
        `higher level prestige available level ${highest}; prestige level ${milestone.level}?`;
      nodes.push(warning);
    } else {
      const question = document.createElement('div');
      question.className = 'workshop-page__prestige-confirm-warning';
      question.textContent = `prestige level ${milestone.level}?`;
      nodes.push(question);
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
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    const node = document.createElement('span');
    setResourceIconText(node, `${value} ${resourceKey}`);
    setResourceColor(node, resourceKey);
    return node;
  }

  syncTabs() {
    for (const tab of PRESTIGE_TABS) {
      const button = this.refs.tabButtons?.get(tab.id);

      if (!button) {
        continue;
      }

      button.setAttribute('aria-selected', tab.id === this.selectedTabId ? 'true' : 'false');
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
      milestones: (prestige.milestones ?? []).map((milestone) => ({
        level: milestone.level,
        rewardRuby: milestone.rewardRuby,
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
