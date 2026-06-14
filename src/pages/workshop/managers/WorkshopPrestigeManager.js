import { updateScrollCueState } from '../../managers/ScrollCueManager.js';
import { setResourceColor } from '../../shared/resourceColor.js';

export class WorkshopPrestigeManager {
  constructor({ gameplayFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.root = null;
    this.unsubscribe = null;
    this.refs = {};
    this.visible = false;
    this.confirmingMilestone = null;
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.previousFocus = null;
    this.handleRowsScroll = () => this.updateScrollProgress();
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
    if (!this.gameplayFacade) {
      return null;
    }

    if (this.root) {
      return this.root;
    }

    this.root = document.createElement('section');
    this.root.className = 'workshop-page__prestige-popup';
    this.root.addEventListener('click', this.handleRootClick);

    this.refs.panel = document.createElement('section');
    this.refs.panel.className = 'workshop-page__prestige-panel';
    this.refs.panel.setAttribute('aria-label', 'Prestige');
    this.refs.panel.setAttribute('aria-modal', 'true');
    this.refs.panel.setAttribute('role', 'dialog');
    this.refs.panel.tabIndex = -1;

    this.refs.dialog = document.createElement('section');
    this.refs.dialog.className = 'workshop-page__prestige-dialog style-dialog';

    this.refs.title = this.createTitle();
    this.refs.closeButton = this.createCloseButton();
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

    this.refs.frame.append(this.refs.rows);
    this.refs.dialog.append(
      this.refs.title,
      this.refs.closeButton,
      this.refs.summary,
      this.refs.frame,
      this.refs.progress,
      this.refs.confirm,
    );
    this.refs.panel.append(this.refs.dialog);
    this.root.append(this.refs.panel);
    parent.append(this.root);
    document.addEventListener('keydown', this.handleKeydown);

    this.unsubscribe = this.gameplayFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.gameplayFacade.getSnapshot());
    this.applyVisibility();

    return this.root;
  }

  createTitle() {
    const title = document.createElement('div');
    title.className = 'style-box__title';
    title.textContent = 'prestige';
    return title;
  }

  createCloseButton() {
    const button = document.createElement('button');
    button.className = 'style-button workshop-page__prestige-close';
    button.type = 'button';
    button.textContent = 'close';
    button.addEventListener('click', () => this.hide());
    return button;
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

  toggle() {
    if (this.visible) {
      this.hide();
      return;
    }

    this.show();
  }

  show() {
    this.previousFocus = document.activeElement;
    this.visible = true;
    this.applyVisibility();
    this.refs.panel?.focus();
    this.updateScrollProgress();
  }

  hide() {
    const wasVisible = this.visible;
    this.visible = false;
    this.confirmingMilestone = null;
    this.applyConfirm();
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
    this.refs.rows?.removeEventListener('scroll', this.handleRowsScroll);
    this.root?.removeEventListener('click', this.handleRootClick);
    this.root?.remove();
    this.root = null;
    this.refs = {};
    this.visible = false;
    this.confirmingMilestone = null;
    this.lastSnapshot = {};
    this.renderedSignature = '';
    this.previousFocus = null;
  }

  render(snapshot) {
    if (!this.root) {
      return;
    }

    this.lastSnapshot = snapshot ?? {};
    this.updateSummary(this.lastSnapshot.prestige);
    this.applyConfirm();

    const signature = this.createRenderSignature(this.lastSnapshot);
    if (signature === this.renderedSignature) {
      this.updateScrollProgress();
      return;
    }

    this.renderedSignature = signature;
    this.refs.rows.replaceChildren(
      ...((this.lastSnapshot.prestige?.milestones ?? []).map((milestone) =>
        this.createMilestoneRow(milestone),
      )),
    );
    this.updateScrollProgress();
  }

  updateSummary(prestige = {}) {
    const earnedRuby = Math.max(0, Math.floor(Number(prestige.earnedRuby) || 0));
    const currentLevel = Math.max(1, Math.floor(Number(prestige.currentLevel) || 1));
    this.refs.summary.textContent = `level ${currentLevel}, ${earnedRuby} ruby next run`;
    setResourceColor(this.refs.summary, 'ruby');
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
    reward.textContent = `${milestone.rewardRuby} ruby`;
    setResourceColor(reward, 'ruby');

    const action = this.createMilestoneAction(milestone);

    row.append(level, reward, action);
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
      this.hide();
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

  createRenderSignature(snapshot) {
    const prestige = snapshot?.prestige ?? {};
    return JSON.stringify({
      earnedRuby: prestige.earnedRuby,
      currentLevel: prestige.currentLevel,
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

  applyVisibility() {
    if (!this.root) {
      return;
    }

    this.root.hidden = !this.visible;
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
