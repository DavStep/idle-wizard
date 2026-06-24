import { updateScrollCueState } from '../../managers/ScrollCueManager.js';
import { setResourceColor } from '../../shared/resourceColor.js';
import { setResourceIconText } from '../../shared/resourceIconLabel.js';
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

const PRESTIGE_POINT_STAR = '★';
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
    this.handleRowsScroll = () => this.updateScrollProgress();
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
    this.refs.dialog.className = 'prestige-page__box style-box';

    this.refs.title = this.createTitle();
    this.refs.summary = document.createElement('div');
    this.refs.summary.className = 'workshop-page__prestige-summary';
    this.refs.frame = document.createElement('div');
    this.refs.frame.className = 'workshop-page__prestige-frame';
    this.refs.rows = document.createElement('div');
    this.refs.rows.className = 'workshop-page__prestige-rows';
    this.refs.rows.addEventListener('scroll', this.handleRowsScroll);
    this.refs.progress = document.createElement('div');
    this.refs.progress.className = 'style-progress workshop-page__prestige-progress';
    this.refs.progress.setAttribute('aria-hidden', 'true');
    this.refs.progressFill = document.createElement('div');
    this.refs.progressFill.className =
      'style-progress__fill workshop-page__prestige-progress-fill';
    this.refs.progress.append(this.refs.progressFill);
    this.refs.confirm = this.createConfirmPanel();
    this.refs.tabs = this.createTabs();

    this.refs.frame.append(this.refs.rows);
    this.refs.dialog.append(
      this.refs.title,
      this.refs.summary,
      this.refs.frame,
      this.refs.progress,
      this.refs.confirm,
    );
    this.refs.panel.append(this.refs.dialog, this.refs.tabs);
    this.root.append(this.refs.panel);
    parent.append(this.root);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());

    return this.root;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'prestige';
    return title;
  }

  createConfirmPanel() {
    const panel = document.createElement('div');
    panel.className = 'workshop-page__prestige-confirm';
    panel.hidden = true;

    this.refs.confirmMessage = document.createElement('p');
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
    panel.append(this.refs.confirmMessage, actions);
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
    this.refs.rows?.removeEventListener('scroll', this.handleRowsScroll);
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
    this.applyConfirm();

    const signature = this.createRenderSignature(this.lastSnapshot);
    if (signature === this.renderedSignature) {
      this.updateScrollProgress();
      return;
    }

    this.renderedSignature = signature;
    this.refs.rows.replaceChildren(...this.createRows(this.lastSnapshot));
    this.updateScrollProgress();
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
      document.createTextNode(
        ' available. prestige adds row reward; ruby research stays bought.',
      ),
    );
    setResourceColor(this.refs.summary, null);
  }

  createRows(snapshot) {
    if (this.selectedTabId === 'points') {
      return this.createPointRows(snapshot?.prestige);
    }

    return (snapshot?.prestige?.milestones ?? []).map((milestone) =>
      this.createMilestoneRow(milestone),
    );
  }

  createMilestoneRow(milestone) {
    const row = document.createElement('div');
    row.className = 'workshop-page__prestige-row';
    row.classList.toggle('is-completed', milestone.completed);
    row.classList.toggle('is-locked', !milestone.unlocked);

    const level = document.createElement('span');
    level.className = 'workshop-page__prestige-level';
    level.textContent = `level ${milestone.level}`;

    const reward = document.createElement('span');
    reward.className = 'workshop-page__prestige-reward';
    setResourceIconText(reward, `${milestone.rewardRuby} ruby`);
    setResourceColor(reward, 'ruby');

    const action = this.createMilestoneAction(milestone);

    row.append(level, reward, action);
    return row;
  }

  createPointRows(prestige = {}) {
    const completedCount = this.getCompletedPrestigeCount(prestige);

    return PRESTIGE_POINT_REWARDS.map((pointReward) =>
      this.createPointRewardRow(pointReward, completedCount),
    );
  }

  createPointRewardRow(pointReward, completedCount) {
    const row = document.createElement('div');
    row.className = 'workshop-page__prestige-point-row';
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
    stars.setAttribute('aria-hidden', 'true');
    stars.textContent = PRESTIGE_POINT_STAR.repeat(safeCount);

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

    const status = document.createElement('span');
    status.className = 'workshop-page__prestige-status';
    status.textContent = milestone.completed ? 'complete' : 'locked';
    return status;
  }

  onPrestigeClick(milestone) {
    if (milestone.lowerThanHighestAvailable) {
      this.confirmingMilestone = milestone;
      this.applyConfirm();
      return;
    }

    this.completePrestige(milestone.level);
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
      return;
    }

    this.refs.confirmMessage.textContent =
      `higher level prestige available level ${highest}; prestige level ${milestone.level}?`;
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

  updateScrollProgress() {
    updateScrollCueState({
      scrollElement: this.refs.rows,
      cueElement: this.refs.frame,
      progressFill: this.refs.progressFill,
      inlineCue: false,
    });
  }
}
